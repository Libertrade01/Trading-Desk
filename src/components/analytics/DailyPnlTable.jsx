"use client";

import { useMemo } from "react";
import { buildDailyPnlByDate, formatDailyDateLabel, formatPnl } from "../../lib/analytics-stats";
import AnalyticsTable from "./AnalyticsTable";

export default function DailyPnlTable({ trades, limit = 8 }) {
  const rows = useMemo(() => {
    const byDate = buildDailyPnlByDate(trades);
    return Object.keys(byDate)
      .sort()
      .reverse()
      .slice(0, limit)
      .map((date) => {
        const { pnl, count, seqIds, soloCount } = byDate[date];
        const seq = (seqIds?.size || 0) + (soloCount || 0);
        const tone = pnl > 0 ? "var(--green)" : pnl < 0 ? "var(--red)" : "var(--muted)";
        return {
          id: date,
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
    />
  );
}
