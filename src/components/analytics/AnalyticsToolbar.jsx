"use client";

import Link from "next/link";
import { RANGE_PRESETS } from "../../lib/analytics-date-range";

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export default function AnalyticsToolbar({
  activePreset,
  dateFrom,
  dateTo,
  accounts,
  onPresetChange,
  onCustomRangeChange,
  onToggleAccount,
  onOpenTradeLog,
}) {
  const showChips =
    accounts.length > 1 || (accounts.length === 1 && accounts[0].id !== "default");

  return (
    <header className="an-header">
      <div className="an-header-copy">
        <h1 className="an-page-title">
          Stats
          <span className="an-title-stop" aria-hidden="true" />
        </h1>
        <p>P&amp;L, win rate, equity curve, and trade history.</p>
      </div>

      <div className="an-header-controls">
        <div className="an-range-control" aria-label="Date range">
          <span className="an-range-label">Range</span>
          <select
            className="an-range-preset"
            aria-label="Range preset"
            value={activePreset || "custom"}
            onChange={(e) => {
              const value = e.target.value;
              if (value !== "custom") onPresetChange(value);
            }}
          >
            {RANGE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
          <span className="an-range-sep" aria-hidden="true" />
          <label className="an-range-date">
            <CalendarIcon />
            <input
              type="date"
              value={dateFrom || ""}
              onChange={(e) => onCustomRangeChange(e.target.value || null, dateTo)}
              aria-label="Start date"
            />
          </label>
          <span className="an-range-arrow" aria-hidden="true">
            →
          </span>
          <label className="an-range-date">
            <CalendarIcon />
            <input
              type="date"
              value={dateTo || ""}
              onChange={(e) => onCustomRangeChange(dateFrom, e.target.value || null)}
              aria-label="End date"
            />
          </label>
        </div>

        {showChips ? (
          <div className="an-account-chips">
            {accounts.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`an-account-chip${a.active !== false ? " active" : ""}`}
                onClick={() => onToggleAccount(a.id)}
              >
                {a.name}
              </button>
            ))}
          </div>
        ) : null}

        {onOpenTradeLog ? (
          <button type="button" className="an-link-all" onClick={onOpenTradeLog}>
            Trade log
          </button>
        ) : null}

        <Link href="/postmarket" className="an-btn-import">
          <ImportIcon />
          Import
        </Link>
      </div>
    </header>
  );
}
