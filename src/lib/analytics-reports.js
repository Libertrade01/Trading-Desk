import { limaTodayParts } from "./analytics-date-range";
import { formatPnl } from "./analytics-stats";

function limaStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const REPORT_RULE_COLS = [
  "rules_trend",
  "rules_market_cond",
  "rules_plays",
  "rules_execution",
  "rules_focus",
  "rules_consol",
  "rules_dll",
];

export function getWeekRange(offsetFromNow = 0) {
  const { lima } = limaTodayParts();
  const mon = new Date(lima);
  const dow = lima.getDay();
  mon.setDate(lima.getDate() - (dow === 0 ? 6 : dow - 1));
  mon.setDate(mon.getDate() + offsetFromNow * 7);
  const fri = new Date(mon);
  fri.setDate(fri.getDate() + 4);
  return { start: limaStr(mon), end: limaStr(fri) };
}

export function getRecentWeeks(count = 8) {
  const weeks = [];
  for (let i = 0; i >= -(count - 1); i -= 1) {
    weeks.push(getWeekRange(i));
  }
  return weeks;
}

export function fmtWeekLabel(start, end) {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (s.getMonth() === e.getMonth()) {
    return `${months[s.getMonth()]} ${s.getDate()}–${e.getDate()}`;
  }
  return `${months[s.getMonth()]} ${s.getDate()} – ${months[e.getMonth()]} ${e.getDate()}`;
}

export function dayDisciplineScore(day) {
  const followed = REPORT_RULE_COLS.filter((r) => day[r] === "Followed" || day[r] === "followed").length;
  const broke = REPORT_RULE_COLS.filter((r) => day[r] === "Broke" || day[r] === "broke").length;
  return followed + broke > 0 ? Math.round((followed / (followed + broke)) * 100) : null;
}

export function countDaySequences(tradesForDay) {
  const seqIds = new Set(tradesForDay.filter((t) => t.sequence_id != null).map((t) => t.sequence_id));
  const solo = tradesForDay.filter((t) => t.sequence_id == null).length;
  return seqIds.size + solo;
}

export function calcConsecutiveDrawdown(trades) {
  let maxDD = 0;
  let runningDD = 0;
  let maxDDTrades = 0;
  let ddStreak = 0;

  [...trades]
    .sort((a, b) => (a.entry_time || "").localeCompare(b.entry_time || ""))
    .forEach((t) => {
      if ((t.net_pnl || 0) < 0) {
        runningDD += t.net_pnl || 0;
        ddStreak += 1;
        if (runningDD < maxDD) {
          maxDD = runningDD;
          maxDDTrades = ddStreak;
        }
      } else {
        runningDD = 0;
        ddStreak = 0;
      }
    });

  return { maxDD, maxDDTrades };
}

export function aggregatePnlByDate(trades) {
  const byDate = {};
  (trades || []).forEach((t) => {
    byDate[t.date] = (byDate[t.date] || 0) + (t.net_pnl || 0);
  });
  return byDate;
}

export function weekPnlForRange(pnlByDate, start, end) {
  return Object.keys(pnlByDate)
    .filter((d) => d >= start && d <= end)
    .reduce((sum, d) => sum + pnlByDate[d], 0);
}

export function buildWeekPnlChartConfig(days, trades) {
  const labels = days.map((d) =>
    new Date(`${d.date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short" })
  );
  const values = days.map((d) =>
    trades.filter((t) => t.date === d.date).reduce((s, t) => s + (t.net_pnl || 0), 0)
  );

  return {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: values.map((v) =>
            v >= 0 ? "rgba(37,145,134,0.5)" : "rgba(138,53,53,0.5)"
          ),
          borderColor: values.map((v) =>
            v >= 0 ? "rgba(37,145,134,0.8)" : "rgba(138,53,53,0.8)"
          ),
          borderWidth: 1,
          borderRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#4a4f5e", font: { family: "DM Mono", size: 9 } },
          border: { display: false },
        },
        y: {
          grid: { color: "#22242e", lineWidth: 0.5 },
          ticks: {
            color: "#4a4f5e",
            font: { family: "DM Mono", size: 9 },
            callback: (v) => `$${v}`,
          },
          border: { display: false },
        },
      },
    },
  };
}

export function formatWeekPnlShort(value) {
  if (value === 0) return "—";
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toFixed(0)}`;
}

export function gateTone(gate) {
  if (gate === "GREEN") return "positive";
  if (gate === "AMBER") return "neutral";
  if (gate === "RED") return "negative";
  return "neutral";
}

export function scoreTone(score) {
  if (score == null) return "neutral";
  if (score >= 80) return "positive";
  if (score >= 60) return "neutral";
  return "negative";
}

export function formatReportPnl(value) {
  return formatPnl(value, { signed: true, decimals: 2 });
}
