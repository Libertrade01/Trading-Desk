import { easternMinutesFromInstant } from "./trade-time";
import { buildDailyPnlByDate } from "./analytics-stats";

const CHART_FONT = { family: "'DM Sans', sans-serif", size: 11, weight: "500" };
const GRID_COLOR = "rgba(255,255,255,0.05)";
const ZERO_GRID = "rgba(255,255,255,0.12)";
const TICK_COLOR = "rgba(237,241,247,0.28)";
const POS_FILL = "rgba(80,160,255,0.38)";
const POS_STROKE = "rgba(80,160,255,0.72)";
const NEG_FILL = "rgba(240,113,103,0.38)";
const NEG_STROKE = "rgba(240,113,103,0.72)";
const POS_LINE = "#50a0ff";
const NEG_LINE = "#f07167";

function barColors(values) {
  return {
    backgroundColor: values.map((v) =>
      v == null ? "transparent" : v >= 0 ? POS_FILL : NEG_FILL
    ),
    borderColor: values.map((v) =>
      v == null ? "transparent" : v >= 0 ? POS_STROKE : NEG_STROKE
    ),
  };
}

function baseBarOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: TICK_COLOR, font: CHART_FONT, maxRotation: 0 },
        border: { display: false },
      },
      y: {
        grid: {
          color: (ctx) => (ctx.tick.value === 0 ? ZERO_GRID : GRID_COLOR),
        },
        ticks: {
          color: TICK_COLOR,
          font: CHART_FONT,
          callback: (v) => `$${v}`,
        },
        border: { display: false },
      },
    },
  };
}

export function buildCumulativePnlConfig(trades) {
  const sorted = [...trades].sort((a, b) => new Date(a.entry_time) - new Date(b.entry_time));
  let cum = 0;
  const labels = [];
  const data = [];

  sorted.forEach((t) => {
    cum += t.net_pnl || 0;
    const dt = new Date(t.entry_time);
    labels.push(`${dt.getMonth() + 1}/${dt.getDate()}`);
    data.push(+cum.toFixed(2));
  });

  const end = data[data.length - 1] ?? 0;

  return {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          data,
          borderColor: end >= 0 ? POS_LINE : NEG_LINE,
          segment: {
            borderColor: (ctx) => (ctx.p1.parsed.y >= 0 ? POS_LINE : NEG_LINE),
          },
          backgroundColor: end >= 0 ? "rgba(80,160,255,0.12)" : "rgba(240,113,103,0.12)",
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: end >= 0 ? POS_LINE : NEG_LINE,
          fill: true,
          tension: 0.25,
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
          ticks: { color: TICK_COLOR, font: CHART_FONT, maxTicksLimit: 8 },
          border: { display: false },
        },
        y: {
          grid: {
            color: (ctx) => (ctx.tick.value === 0 ? ZERO_GRID : GRID_COLOR),
          },
          ticks: {
            color: TICK_COLOR,
            font: CHART_FONT,
            callback: (v) => `$${v}`,
          },
          border: { display: false },
        },
      },
    },
  };
}

export function buildDailyPnlBarConfig(trades) {
  const byDate = buildDailyPnlByDate(trades);
  const dates = Object.keys(byDate).sort();
  if (!dates.length) return null;

  const labels = dates.map((d) => {
    const dt = new Date(`${d}T12:00:00`);
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  });
  const data = dates.map((d) => +byDate[d].pnl.toFixed(2));
  const colors = barColors(data);

  return {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data,
          ...colors,
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    },
    options: baseBarOptions(),
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

  const bucketData = baskets.map((b) =>
    trades.filter((t) => t.entry_time && mins(t) >= b.start && mins(t) < b.end)
  );
  const avgs = bucketData.map((bt) =>
    bt.length ? bt.reduce((s, x) => s + (x.net_pnl || 0), 0) / bt.length : null
  );
  const colors = barColors(avgs);

  return {
    type: "bar",
    data: {
      labels: baskets.map((b) => b.label),
      datasets: [
        {
          data: avgs,
          ...colors,
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: baseBarOptions(),
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
  const colors = barColors(avgs);

  return {
    type: "bar",
    data: {
      labels: days,
      datasets: [
        {
          data: avgs,
          ...colors,
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: baseBarOptions(),
  };
}

export function getChartConfigs(trades) {
  return {
    pnl: trades.length ? buildCumulativePnlConfig(trades) : null,
    daily: trades.length ? buildDailyPnlBarConfig(trades) : null,
    baskets: trades.length ? buildBasketsConfig(trades) : null,
    dow: trades.length ? buildDayOfWeekConfig(trades) : null,
  };
}
