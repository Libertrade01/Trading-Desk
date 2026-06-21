"use client";

import { useMemo, useState } from "react";
import { playbookAdherenceLabel } from "../../lib/setup-adherence";
import AnalyticsStat from "./AnalyticsStat";
import AnalyticsTable from "./AnalyticsTable";
import { formatPnl } from "../../lib/analytics-stats";
import { formatLimaTime } from "../../lib/trade-time";

const SETUP_FILTER_OPTIONS = [
  { value: "", label: "All setups" },
  { value: "untagged", label: "Untagged" },
  { value: "Peak and Fail (PAF)", label: "PAF" },
  { value: "Break and Retest (BAR)", label: "BAR" },
  { value: "LVN continuation", label: "LVN" },
  { value: "VWAP in trend", label: "VWAP" },
  { value: "Improvised", label: "Improvised" },
  { value: "Invalid / Not a Setup", label: "Invalid" },
];

export default function AnalyticsTradeLogPanel({ trades, onTradeSelect }) {
  const [query, setQuery] = useState("");
  const [setupFilter, setSetupFilter] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...trades]
      .sort((a, b) => (b.entry_time || "").localeCompare(a.entry_time || ""))
      .filter((t) => {
        if (setupFilter === "untagged") {
          if (t.setup && String(t.setup).trim()) return false;
        } else if (setupFilter && (t.setup || "") !== setupFilter) {
          return false;
        }
        if (!q) return true;
        const hay = [
          t.instrument,
          t.direction,
          t.setup,
          t.management,
          t.date,
          t.account_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .map((t) => {
        const pnl = t.net_pnl || 0;
        const pnlColor = pnl > 0 ? "var(--green)" : pnl < 0 ? "var(--red)" : "var(--muted)";
        return {
          id: t.id,
          trade: t,
          cells: {
            date: t.date || "—",
            time: formatLimaTime(t.entry_time) || "—",
            symbol: t.instrument || "—",
            setup: t.setup || "—",
            pnl: formatPnl(pnl),
          },
          cellStyle: {
            pnl: { fontWeight: 500, color: pnlColor, textAlign: "right" },
            setup: { color: t.setup ? "var(--text)" : "var(--muted)" },
            symbol: { color: "#6a7080" },
          },
        };
      });
  }, [trades, query, setupFilter]);

  return (
    <div className="analytics-trade-log">
      <div className="analytics-trade-log__filters">
        <input
          type="search"
          className="analytics-date-input analytics-trade-log__search"
          placeholder="Search symbol, setup, date…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="analytics-date-input analytics-trade-log__setup"
          value={setupFilter}
          onChange={(e) => setSetupFilter(e.target.value)}
        >
          {SETUP_FILTER_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {rows.length ? (
        <AnalyticsTable
          columns={[
            { key: "date", label: "Date", width: "88px" },
            { key: "time", label: "Time", width: "72px" },
            { key: "symbol", label: "Symbol", width: "1fr" },
            { key: "setup", label: "Setup", width: "100px" },
            { key: "pnl", label: "P&L", width: "80px", align: "right" },
          ]}
          rows={rows}
          onRowClick={onTradeSelect ? (row) => onTradeSelect(row.trade) : undefined}
        />
      ) : (
        <div className="analytics-empty">No trades match filters</div>
      )}
    </div>
  );
}
