import { easternMinutesFromInstant } from "./trade-time";

const CHART_FONT = { family: "'DM Mono', monospace", size: 9 };
const GRID_COLOR = "#22242e";
const TICK_COLOR = "#4a4f5e";

export function buildCumulativePnlConfig(trades) {
  const sorted = [...trades].sort((a, b) => new Date(a.entry_time) - new Date(b.entry_time));
  let cum = 0;
  const labels = [];
  const data = [];
  const colors = [];

  sorted.forEach((t) => {
    cum += t.net_pnl || 0;
    const dt = new Date(t.entry_time);
    labels.push(`${dt.getMonth() + 1}/${dt.getDate()}`);
    data.push(+cum.toFixed(2));
    colors.push(cum >= 0 ? "rgba(37,145,134,0.7)" : "rgba(138,53,53,0.7)");
  });

  return {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          data,
          borderColor: colors[colors.length - 1] || "rgba(37,145,134,0.7)",
          segment: {
            borderColor: (ctx) => (ctx.p1.parsed.y >= 0 ? "rgba(37,145,134,0.7)" : "rgba(138,53,53,0.7)"),
          },
          backgroundColor: "rgba(37,145,134,0.06)",
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true,
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: TICK_COLOR, font: CHART_FONT, maxTicksLimit: 8 }, border: { display: false } },
        y: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: CHART_FONT, callback: (v) => `$${v}` }, border: { display: false } },
      },
    },
  };
}

export function buildBasketsConfig(trades) {
  const baskets = [
    { label: "09:30", start: 9 * 60 + 30, end: 10 * 60 },
    { label: "10:00", start: 10 * 60, end: 10 * 60 + 30 },
    { label: "10:30", start: 10 * 60 + 30, end: 11 * 60 },
    { label: "11:00", start: 11 * 60, end: 11 * 60 + 30 },
    { label: "11:30", start: 11 * 60 + 30, end: 12 * 60 },
    { label: "12:00+", start: 12 * 60, end: 24 * 60 },
  ];

  const mins = (t) => easternMinutesFromInstant(new Date(t.entry_time));

  const bucketData = baskets.map((b) => trades.filter((t) => t.entry_time && mins(t) >= b.start && mins(t) < b.end));
  const avgs = bucketData.map((bt) => (bt.length ? bt.reduce((s, x) => s + (x.net_pnl || 0), 0) / bt.length : null));

  return {
    type: "bar",
    data: {
      labels: baskets.map((b) => b.label),
      datasets: [
        {
          data: avgs,
          backgroundColor: avgs.map((v) =>
            v == null ? "transparent" : v >= 0 ? "rgba(37,145,134,0.35)" : "rgba(138,53,53,0.35)"
          ),
          borderColor: avgs.map((v) =>
            v == null ? "transparent" : v >= 0 ? "rgba(37,145,134,0.7)" : "rgba(138,53,53,0.7)"
          ),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: TICK_COLOR, font: CHART_FONT }, border: { display: false } },
        y: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: CHART_FONT, callback: (v) => `$${v}` }, border: { display: false } },
      },
    },
  };
}

export function buildDayOfWeekConfig(trades) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const sums = [0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0];

  trades.forEach((t) => {
    if (!t.date) return;
    const d = new Date(`${t.date}T12:00:00`).getDay();
    const idx = d === 0 ? -1 : d - 1;
    if (idx < 0 || idx > 4) return;
    sums[idx] += t.net_pnl || 0;
    counts[idx] += 1;
  });

  const avgs = sums.map((s, i) => (counts[i] ? s / counts[i] : null));

  return {
    type: "bar",
    data: {
      labels: days,
      datasets: [
        {
          data: avgs,
          backgroundColor: avgs.map((v) =>
            v == null ? "transparent" : v >= 0 ? "rgba(37,145,134,0.35)" : "rgba(138,53,53,0.35)"
          ),
          borderColor: avgs.map((v) =>
            v == null ? "transparent" : v >= 0 ? "rgba(37,145,134,0.7)" : "rgba(138,53,53,0.7)"
          ),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: TICK_COLOR, font: CHART_FONT }, border: { display: false } },
        y: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: CHART_FONT, callback: (v) => `$${v}` }, border: { display: false } },
      },
    },
  };
}

export function getChartConfigs(trades) {
  return {
    pnl: trades.length ? buildCumulativePnlConfig(trades) : null,
    baskets: trades.length ? buildBasketsConfig(trades) : null,
    dow: trades.length ? buildDayOfWeekConfig(trades) : null,
  };
}
