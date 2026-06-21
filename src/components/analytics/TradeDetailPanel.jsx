"use client";

import { useState } from "react";
import { updateTrade } from "../../lib/analytics-trades";
import { calcR, formatPnl } from "../../lib/analytics-stats";
import { MGMT_OPTIONS } from "../../lib/trade-import-options";
import { VALID_SETUPS, SETUP_IMPROVISED, SETUP_INVALID } from "../../lib/setup-options";
import { formatLimaTime, toNYTimeStr } from "../../lib/trade-time";
import AnalyticsSlidePanel from "./AnalyticsSlidePanel";

function Field({ label, children }) {
  return (
    <div className="analytics-trade-field">
      <div className="analytics-trade-field__label">{label}</div>
      <div className="analytics-trade-field__value">{children}</div>
    </div>
  );
}

export default function TradeDetailPanel({ trade, onClose, onUpdated }) {
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);

  if (!trade) return null;

  const pnl = trade.net_pnl || 0;
  const pnlTone = pnl > 0 ? "positive" : pnl < 0 ? "negative" : "neutral";
  const r = calcR(trade);

  const setupOptions = [
    { value: "", label: "Untagged" },
    ...VALID_SETUPS.map((v) => ({ value: v, label: v })),
    { value: SETUP_IMPROVISED, label: SETUP_IMPROVISED },
    { value: SETUP_INVALID, label: SETUP_INVALID },
  ];

  const saveField = async (field, value) => {
    setSaving(field);
    setError(null);
    try {
      const updated = await updateTrade(trade.id, { [field]: value || null });
      onUpdated?.(updated);
    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(null);
    }
  };

  return (
    <AnalyticsSlidePanel
      open={!!trade}
      title={`${(trade.instrument || "Trade").toUpperCase()} · ${formatLimaTime(trade.entry_time)}`}
      onClose={onClose}
      width="min(480px, 92vw)"
    >
      <div className={`analytics-trade-hero an-stat__value ${pnlTone}`}>{formatPnl(pnl)}</div>

      <div className="analytics-trade-grid">
        <Field label="Date">{trade.date || "—"}</Field>
        <Field label="Direction">
          <span style={{ color: trade.direction === "long" ? "var(--green)" : "var(--red)" }}>
            {(trade.direction || "—").toUpperCase()}
          </span>
        </Field>
        <Field label="Qty">{trade.quantity ?? "—"}</Field>
        <Field label="Account">{trade.account_name || "—"}</Field>
        <Field label="Entry">{toNYTimeStr(trade.entry_time)}</Field>
        <Field label="Exit">{toNYTimeStr(trade.exit_time)}</Field>
        <Field label="Entry px">{trade.entry_price ?? "—"}</Field>
        <Field label="Exit px">{trade.exit_price ?? "—"}</Field>
        {r != null ? <Field label="R">{r.toFixed(2)}R</Field> : null}
      </div>

      <div className="analytics-divider" />

      <div className="analytics-trade-edit">
        <label className="analytics-trade-edit__label">
          Setup
          {saving === "setup" ? <span className="analytics-trade-edit__saving">Saving…</span> : null}
        </label>
        <select
          className="analytics-date-input analytics-trade-edit__select"
          value={trade.setup || ""}
          onChange={(e) => saveField("setup", e.target.value)}
        >
          {setupOptions.map((o) => (
            <option key={o.value || "empty"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <label className="analytics-trade-edit__label">
          Management
          {saving === "management" ? <span className="analytics-trade-edit__saving">Saving…</span> : null}
        </label>
        <select
          className="analytics-date-input analytics-trade-edit__select"
          value={trade.management || ""}
          onChange={(e) => saveField("management", e.target.value)}
        >
          {MGMT_OPTIONS.map((o) => (
            <option key={o.value || "empty"} value={o.value}>
              {o.label === "—" ? "None" : o.label}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="analytics-trade-edit__error">{error}</p> : null}
    </AnalyticsSlidePanel>
  );
}
