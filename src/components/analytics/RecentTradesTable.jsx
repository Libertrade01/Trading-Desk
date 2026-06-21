"use client";

import { useMemo } from "react";
import { formatPnl } from "../../lib/analytics-stats";
import { formatLimaTime } from "../../lib/trade-time";
import AnalyticsTable from "./AnalyticsTable";

export default function RecentTradesTable({ trades, limit = 8, onTradeSelect }) {
  const rows = useMemo(() => {
    const sorted = [...trades].sort((a, b) => (b.entry_time || "").localeCompare(a.entry_time || ""));
    const slice = limit != null ? sorted.slice(0, limit) : sorted;
    return slice.map((t) => {
        const pnl = t.net_pnl || 0;
        const pnlColor = pnl > 0 ? "var(--green)" : pnl < 0 ? "var(--red)" : "var(--muted)";
        const dirColor = t.direction === "long" ? "var(--green)" : "var(--red)";
        return {
          id: t.id,
          trade: t,
          cells: {
            time: formatLimaTime(t.entry_time) || "—",
            symbol: t.instrument || "—",
            dir: (t.direction || "").toUpperCase(),
            qty: t.quantity ?? "",
            pnl: formatPnl(pnl),
          },
          cellStyle: {
            dir: { color: dirColor, textAlign: "center" },
            qty: { textAlign: "center" },
            pnl: { fontWeight: 500, color: pnlColor, textAlign: "right" },
            symbol: { color: "#6a7080" },
          },
        };
      });
  }, [trades, limit]);

  if (!rows.length) {
    return <div className="analytics-empty">No trades yet</div>;
  }

  return (
    <AnalyticsTable
      columns={[
        { key: "time", label: "Time", width: "90px" },
        { key: "symbol", label: "Symbol", width: "1fr" },
        { key: "dir", label: "Dir", width: "60px", align: "center" },
        { key: "qty", label: "Qty", width: "40px", align: "center" },
        { key: "pnl", label: "Net P&L", width: "80px", align: "right" },
      ]}
      rows={rows}
      onRowClick={onTradeSelect ? (row) => onTradeSelect(row.trade) : undefined}
    />
  );
}
