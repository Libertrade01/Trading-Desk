"use client";

import { useEffect, useMemo, useState } from "react";
import AnalyticsTable from "./AnalyticsTable";
import { formatPnl } from "../../lib/analytics-stats";
import { MGMT_OPTIONS } from "../../lib/trade-import-options";
import { formatLimaTime } from "../../lib/trade-time";

const PAGE_SIZE = 40;

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

const DIRECTION_FILTER_OPTIONS = [
  { value: "", label: "All dirs" },
  { value: "long", label: "Long" },
  { value: "short", label: "Short" },
];

const RESULT_FILTER_OPTIONS = [
  { value: "", label: "All results" },
  { value: "win", label: "Winners" },
  { value: "loss", label: "Losers" },
  { value: "be", label: "Breakeven" },
];

const MGMT_FILTER_OPTIONS = [
  { value: "", label: "All mgmt" },
  ...MGMT_OPTIONS.filter((o) => o.value).map((o) => ({ value: o.value, label: o.label })),
];

export default function AnalyticsTradeLogPanel({ trades, onTradeSelect }) {
  const [query, setQuery] = useState("");
  const [setupFilter, setSetupFilter] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [mgmtFilter, setMgmtFilter] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [query, setupFilter, directionFilter, resultFilter, mgmtFilter]);

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
        if (directionFilter && (t.direction || "").toLowerCase() !== directionFilter) {
          return false;
        }
        const pnl = t.net_pnl || 0;
        if (resultFilter === "win" && pnl <= 0) return false;
        if (resultFilter === "loss" && pnl >= 0) return false;
        if (resultFilter === "be" && pnl !== 0) return false;
        if (mgmtFilter && (t.management || "") !== mgmtFilter) return false;
        if (!q) return true;
        const hay = [t.instrument, t.direction, t.setup, t.management, t.date, t.account_name]
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
  }, [trades, query, setupFilter, directionFilter, resultFilter, mgmtFilter]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

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
          className="analytics-date-input analytics-trade-log__filter"
          value={directionFilter}
          onChange={(e) => setDirectionFilter(e.target.value)}
        >
          {DIRECTION_FILTER_OPTIONS.map((o) => (
            <option key={o.value || "all-dir"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className="analytics-date-input analytics-trade-log__filter"
          value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value)}
        >
          {RESULT_FILTER_OPTIONS.map((o) => (
            <option key={o.value || "all-result"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className="analytics-date-input analytics-trade-log__filter"
          value={setupFilter}
          onChange={(e) => setSetupFilter(e.target.value)}
        >
          {SETUP_FILTER_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className="analytics-date-input analytics-trade-log__filter"
          value={mgmtFilter}
          onChange={(e) => setMgmtFilter(e.target.value)}
        >
          {MGMT_FILTER_OPTIONS.map((o) => (
            <option key={o.value || "all-mgmt"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="analytics-trade-log__meta">
        {rows.length} trade{rows.length === 1 ? "" : "s"}
        {rows.length > PAGE_SIZE ? ` · page ${safePage + 1} of ${totalPages}` : ""}
      </div>

      {pageRows.length ? (
        <AnalyticsTable
          columns={[
            { key: "date", label: "Date", width: "88px" },
            { key: "time", label: "Time", width: "72px" },
            { key: "symbol", label: "Symbol", width: "1fr" },
            { key: "setup", label: "Setup", width: "100px" },
            { key: "pnl", label: "P&L", width: "80px", align: "right" },
          ]}
          rows={pageRows}
          onRowClick={onTradeSelect ? (row) => onTradeSelect(row.trade) : undefined}
        />
      ) : (
        <div className="analytics-empty">No trades match filters</div>
      )}

      {rows.length > PAGE_SIZE ? (
        <div className="analytics-trade-log__pager">
          <button
            type="button"
            className="analytics-link-btn"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ← Prev
          </button>
          <button
            type="button"
            className="analytics-link-btn"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Next →
          </button>
        </div>
      ) : null}
    </div>
  );
}
