"use client";

import Link from "next/link";
import { RANGE_PRESETS } from "../../lib/analytics-date-range";

export default function AnalyticsToolbar({
  activePreset,
  dateFrom,
  dateTo,
  accountType,
  accounts,
  onPresetChange,
  onCustomRangeChange,
  onAccountTypeChange,
  onToggleAccount,
  onOpenTradeLog,
}) {
  const showChips = accounts.length > 1 || (accounts.length === 1 && accounts[0].id !== "default");

  return (
    <div className="analytics-toolbar">
      <div className="analytics-toolbar__ranges">
        <span className="analytics-toolbar__label">Range</span>
        <select
          className="analytics-date-input analytics-range-select"
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
        <span className="analytics-toolbar__sep">|</span>
        <input
          type="date"
          className="analytics-date-input"
          value={dateFrom || ""}
          onChange={(e) => onCustomRangeChange(e.target.value || null, dateTo)}
        />
        <span className="analytics-toolbar__arrow">→</span>
        <input
          type="date"
          className="analytics-date-input"
          value={dateTo || ""}
          onChange={(e) => onCustomRangeChange(dateFrom, e.target.value || null)}
        />
      </div>

      <div className="analytics-toolbar__filters">
        {showChips && (
          <div className="analytics-account-chips">
            {accounts.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`analytics-account-chip${a.active !== false ? " active" : ""}`}
                onClick={() => onToggleAccount(a.id)}
              >
                {a.name}
              </button>
            ))}
          </div>
        )}
        <select
          className="analytics-date-input"
          value={accountType}
          onChange={(e) => onAccountTypeChange(e.target.value)}
        >
          <option value="all">All</option>
          <option value="eval">Eval</option>
          <option value="funded">Funded</option>
          <option value="cash">Cash</option>
        </select>
        <nav className="analytics-toolbar__nav" aria-label="Workflow">
          <Link href="/home" className="analytics-nav-link">
            Home
          </Link>
          <Link href="/history" className="analytics-nav-link">
            History
          </Link>
        </nav>
        {onOpenTradeLog ? (
          <button type="button" className="analytics-link-btn" onClick={onOpenTradeLog}>
            Trade log
          </button>
        ) : null}
        <Link href="/postmarket" className="desk-nav-link">
          Import
        </Link>
        <Link href="/settings" className="analytics-settings-link" title="Settings">
          ⚙
        </Link>
      </div>
    </div>
  );
}
