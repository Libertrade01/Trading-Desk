"use client";

import { useMemo } from "react";
import { buildDailyPnlByDate, formatDailyDateLabel, formatPnl } from "../../lib/analytics-stats";
import AnalyticsTable from "./AnalyticsTable";

export default function DailyPnlTable({ trades, limit = 8, onRowClick }) {
  const rows = useMemo(() => {
    const byDate = buildDailyPnlByDate(trades);
    const dates = Object.keys(byDate).sort().reverse();
    const sliced = limit != null ? dates.slice(0, limit) : dates;
    return sliced.map((date) => {
        const { pnl, count, seqIds, soloCount } = byDate[date];
        const seq = (seqIds?.size || 0) + (soloCount || 0);
        const tone = pnl > 0 ? "#50a0ff" : pnl < 0 ? "#f07167" : "var(--muted)";
        return {
          id: date,
          dateKey: date,
          cells: {
            date: formatDailyDateLabel(date),
            trades: count,
            seq,
            pnl: formatPnl(pnl),
          },
          cellStyle: { pnl: { fontWeight: 500, color: tone } },
        };
      });
  }, [trades, limit]);

  if (!rows.length) {
    return <div className="analytics-empty">No data</div>;
  }

  return (
    <AnalyticsTable
      columns={[
        { key: "date", label: "Date", width: "1fr" },
        { key: "trades", label: "Trd", width: "40px", align: "center" },
        { key: "seq", label: "Seq", width: "40px", align: "center" },
        { key: "pnl", label: "P&L", width: "72px", align: "right" },
      ]}
      rows={rows}
      onRowClick={onRowClick ? (row) => onRowClick(row.dateKey) : undefined}
    />
  );
}
