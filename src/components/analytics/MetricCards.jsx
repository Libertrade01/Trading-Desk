"use client";

import { formatPnl } from "../../lib/analytics-stats";

function toneClass(n, threshold = 0) {
  if (n == null || Number.isNaN(n)) return "";
  if (n > threshold) return "pos";
  if (n < -threshold) return "neg";
  return "";
}

export default function MetricCards({ stats, trailing = null }) {
  if (!stats) {
    return (
      <div className={`an-metrics-row${trailing ? " an-metrics-row--five" : ""}`}>
        {["Net P&L", "Win Rate", "Expectancy", "Profit Factor"].map((label) => (
          <article key={label} className="an-card an-metric-card">
            <div className="an-metric-label">{label}</div>
            <div className="an-metric-value">—</div>
            <div className="an-metric-delta muted">No data</div>
          </article>
        ))}
        {trailing}
      </div>
    );
  }

  const pfVal = stats.profitFactor >= 999 ? "∞" : stats.profitFactor.toFixed(2);
  const cards = [
    {
      label: "Net P&L",
      value: formatPnl(stats.totalPnl),
      tone: toneClass(stats.totalPnl),
      delta: `${stats.total} trade${stats.total === 1 ? "" : "s"}`,
      deltaTone: "muted",
    },
    {
      label: "Win Rate",
      value: `${stats.winRate.toFixed(1)}%`,
      tone: "",
      delta: `${stats.winners}W · ${stats.losers}L · ${stats.beCount}BE`,
      deltaTone: "muted",
    },
    {
      label: "Expectancy",
      value: formatPnl(stats.expectancy),
      tone: toneClass(stats.expectancy),
      delta: "Per Trade",
      deltaTone: "muted",
    },
    {
      label: "Profit Factor",
      value: pfVal,
      tone: toneClass(stats.profitFactor - 1),
      delta: stats.profitFactor >= 1 ? "Above breakeven" : "Below breakeven",
      deltaTone: stats.profitFactor >= 1 ? "pos" : "neg",
    },
  ];

  return (
    <div className={`an-metrics-row${trailing ? " an-metrics-row--five" : ""}`}>
      {cards.map((card) => (
        <article key={card.label} className="an-card an-metric-card">
          <div className="an-metric-label">{card.label}</div>
          <div className={`an-metric-value ${card.tone}`.trim()}>{card.value}</div>
          <div className={`an-metric-delta ${card.deltaTone}`.trim()}>{card.delta}</div>
        </article>
      ))}
      {trailing}
    </div>
  );
}
