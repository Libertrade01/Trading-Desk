"use client";

import { calcRecoveryStats, formatPnl } from "../../lib/analytics-stats";
import AnalyticsStat from "./AnalyticsStat";

export default function RecoveryPanel({ trades }) {
  const stats = calcRecoveryStats(trades);

  if (!trades || trades.length < 2) {
    return <div className="analytics-empty">Need more trades</div>;
  }

  const lossTone = stats.avgAfterLoss != null ? (stats.avgAfterLoss >= 0 ? "positive" : "negative") : "neutral";
  const winTone = stats.avgAfterWin != null ? (stats.avgAfterWin >= 0 ? "positive" : "negative") : "neutral";

  return (
    <div>
      <AnalyticsStat
        label="After Loss"
        value={formatPnl(stats.avgAfterLoss, { signed: true, decimals: 0 })}
        tone={lossTone}
        size="sm"
        sub={`${stats.afterLossCount} instances`}
      />
      <div className="analytics-divider" />
      <AnalyticsStat
        label="After Win"
        value={formatPnl(stats.avgAfterWin, { signed: true, decimals: 0 })}
        tone={winTone}
        size="sm"
        sub={`${stats.afterWinCount} instances`}
      />
      {stats.avgAfterLoss != null && stats.avgAfterLoss < -20 && (
        <p className="an-stat__sub" style={{ marginTop: 14 }}>
          Revenge trading tendency detected.
        </p>
      )}
      {stats.avgAfterLoss != null && stats.avgAfterLoss > 0 && (
        <p className="an-stat__sub" style={{ marginTop: 14, color: "var(--green)" }}>
          Positive recovery pattern.
        </p>
      )}
    </div>
  );
}
