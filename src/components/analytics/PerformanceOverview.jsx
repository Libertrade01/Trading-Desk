"use client";

import AnalyticsStat from "./AnalyticsStat";
import { fmtR, formatPnl } from "../../lib/analytics-stats";

function toneFromSigned(n, threshold = 0) {
  if (n == null || Number.isNaN(n)) return "neutral";
  if (n > threshold) return "positive";
  if (n < -threshold) return "negative";
  return "neutral";
}

export default function PerformanceOverview({ stats, trades, beThreshold = 30 }) {
  if (!stats) {
    return <div className="analytics-empty">No trades in selected range</div>;
  }

  const winners = trades.filter((t) => t.net_pnl > beThreshold).length;
  const losers = trades.filter((t) => t.net_pnl < -beThreshold).length;
  const bes = stats.beCount;
  const total = stats.total;
  const wPct = total ? Math.round((winners / total) * 100) : 0;
  const lPct = total ? Math.round((losers / total) * 100) : 0;
  const bePct = total ? Math.round((bes / total) * 100) : 0;

  const pfVal = stats.profitFactor >= 999 ? "∞" : stats.profitFactor.toFixed(2);

  const hero = [
    { label: "Net P&L", value: formatPnl(stats.totalPnl), tone: toneFromSigned(stats.totalPnl) },
    { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%`, tone: stats.winRate >= 50 ? "positive" : "negative" },
    { label: "Expectancy", value: formatPnl(stats.expectancy), tone: toneFromSigned(stats.expectancy) },
    {
      label: "Profit Factor",
      value: pfVal,
      tone: stats.profitFactor >= 1.5 ? "positive" : stats.profitFactor >= 1 ? "neutral" : "negative",
    },
  ];

  const secondary = [
    { label: "Avg P&L", value: formatPnl(stats.avgPnl), tone: toneFromSigned(stats.avgPnl) },
    { label: "WR w/o BE", value: `${stats.winRateNoBE.toFixed(1)}%`, tone: stats.winRateNoBE >= 50 ? "positive" : "negative" },
    { label: "Avg Win", value: formatPnl(stats.avgWin, { signed: false }), tone: "positive" },
    { label: "Avg Loss", value: formatPnl(stats.avgLoss, { signed: false }), tone: "negative" },
    { label: "Biggest Win", value: formatPnl(stats.biggestWin, { signed: false }), tone: "positive" },
    { label: "Biggest Loss", value: formatPnl(stats.biggestLoss, { signed: false }), tone: "negative" },
    { label: "Max Consec DD", value: formatPnl(stats.maxDD, { signed: false }), tone: "negative" },
    { label: "Avg Hold (min)", value: stats.avgHold.toFixed(1), tone: "neutral" },
    { label: "Total Trades", value: stats.total, tone: "neutral" },
    { label: "Trading Days", value: new Set(trades.map((t) => t.date)).size, tone: "neutral" },
  ];

  if (stats.rCount > 0) {
    secondary.push(
      { label: "Avg R", value: fmtR(stats.avgR), tone: toneFromSigned(stats.avgR) },
      { label: "Expectancy (R)", value: fmtR(stats.expectancyR), tone: toneFromSigned(stats.expectancyR) }
    );
  }

  return (
    <div className="performance-overview">
      <div className="an-stats-hero">
        {hero.map((h) => (
          <AnalyticsStat key={h.label} label={h.label} value={h.value} tone={h.tone} className="an-stat--hero" />
        ))}
      </div>

      <div className="an-wlbe">
        <div className="an-wlbe__bar">
          <div className="an-wlbe__seg-win" style={{ width: `${wPct}%` }} />
          <div className="an-wlbe__seg-be" style={{ width: `${bePct}%` }} />
          <div className="an-wlbe__seg-loss" style={{ width: `${lPct}%` }} />
        </div>
        <div className="an-wlbe__legend">
          <div>
            <div className="an-wlbe__item-label">Winners</div>
            <div className="an-wlbe__item-val" style={{ color: "var(--green)" }}>
              {winners} <span style={{ fontSize: 11, opacity: 0.7 }}>{wPct}%</span>
            </div>
          </div>
          <div>
            <div className="an-wlbe__item-label">Breakeven</div>
            <div className="an-wlbe__item-val" style={{ color: "var(--text-dim, var(--text))" }}>
              {bes} <span style={{ fontSize: 11, color: "var(--muted)" }}>{bePct}%</span>
            </div>
          </div>
          <div>
            <div className="an-wlbe__item-label">Losers</div>
            <div className="an-wlbe__item-val" style={{ color: "var(--red)" }}>
              {losers} <span style={{ fontSize: 11, opacity: 0.7 }}>{lPct}%</span>
            </div>
          </div>
        </div>
      </div>

      <details className="an-stats-more">
        <summary className="an-stats-more__toggle">More metrics</summary>
        <div className="analytics-stat-grid">
          {secondary.map((s) => (
            <div key={s.label} className="analytics-mini-stat">
              <div className="analytics-mini-stat__label">{s.label}</div>
              <div className={`analytics-mini-stat__value ${s.tone}`}>{s.value}</div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
