"use client";

import { useMemo } from "react";
import { formatPnl } from "../../lib/analytics-stats";
import { formatLimaTime } from "../../lib/trade-time";

/** Compact clock (HH:MM) from formatLimaTime's "MM-DD HH:MM" output. */
function formatTradeClock(value) {
  const full = formatLimaTime(value);
  if (!full || full === "—") return "—";
  const parts = full.split(" ");
  return parts[parts.length - 1] || full;
}

export default function RecentTradesTable({ trades, limit = 6, onTradeSelect, compact = false }) {
  const rows = useMemo(() => {
    const sorted = [...trades].sort((a, b) =>
      (b.entry_time || "").localeCompare(a.entry_time || "")
    );
    return limit != null ? sorted.slice(0, limit) : sorted;
  }, [trades, limit]);

  if (!rows.length) {
    return <div className="analytics-empty">No trades yet</div>;
  }

  return (
    <table className={`an-trades-table${compact ? " an-trades-table--compact" : ""}`}>
      <thead>
        <tr>
          <th>Time</th>
          <th>Symbol</th>
          <th>Dir</th>
          <th>Qty</th>
          <th>Net P&amp;L</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((t) => {
          const pnl = t.net_pnl || 0;
          const dir = (t.direction || "").toLowerCase();
          const isLong = dir === "long";
          return (
            <tr
              key={t.id}
              className={onTradeSelect ? "an-trades-table__row--clickable" : undefined}
              onClick={onTradeSelect ? () => onTradeSelect(t) : undefined}
            >
              <td className="time">
                {compact
                  ? formatTradeClock(t.entry_time)
                  : formatLimaTime(t.entry_time) || "—"}
              </td>
              <td className="symbol">{t.instrument || "—"}</td>
              <td>
                <span className={`an-dir ${isLong ? "long" : "short"}`}>
                  {isLong ? "Long" : dir === "short" ? "Short" : dir || "—"}
                </span>
              </td>
              <td className="qty">{t.quantity ?? ""}</td>
              <td className={`pnl ${pnl > 0 ? "pos" : pnl < 0 ? "neg" : ""}`}>
                {formatPnl(pnl)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
