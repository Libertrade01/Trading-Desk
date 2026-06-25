"use client";

import { useEffect, useState } from "react";
import {
  deleteTrade,
  fetchTradeNotes,
  saveTradeNotes,
  updateTrade,
} from "../../lib/analytics-trades";
import { calcR, formatPnl } from "../../lib/analytics-stats";
import { MGMT_OPTIONS } from "../../lib/trade-import-options";
import { SETUP_IMPROVISED, SETUP_INVALID } from "../../lib/setup-options";
import { getPlaybookSetupNames } from "../../lib/trader-profile";
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

export default function TradeDetailPanel({ trade, onClose, onUpdated, onDeleted }) {
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState("");
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!trade?.id) {
      setNotes("");
      setNotesLoaded(false);
      return undefined;
    }

    let cancelled = false;
    setNotesLoaded(false);
    fetchTradeNotes(trade.id)
      .then((text) => {
        if (!cancelled) {
          setNotes(text);
          setNotesLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotes("");
          setNotesLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [trade?.id]);

  if (!trade) return null;

  const pnl = trade.net_pnl || 0;
  const pnlTone = pnl > 0 ? "positive" : pnl < 0 ? "negative" : "neutral";
  const r = calcR(trade);

  const setupOptions = [
    { value: "", label: "Untagged" },
    ...getPlaybookSetupNames().map((v) => ({ value: v, label: v })),
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

  const saveNotesField = async () => {
    setSaving("notes");
    setError(null);
    try {
      await saveTradeNotes(trade.id, notes);
    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this trade? This cannot be undone.")) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteTrade(trade.id);
      onDeleted?.(trade.id);
      onClose?.();
    } catch (e) {
      setError(e.message || "Delete failed");
      setDeleting(false);
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

        <label className="analytics-trade-edit__label">
          Notes
          {saving === "notes" ? <span className="analytics-trade-edit__saving">Saving…</span> : null}
        </label>
        <textarea
          className="analytics-trade-notes"
          placeholder="Add trade notes…"
          value={notes}
          disabled={!notesLoaded || deleting}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotesField}
        />
      </div>

      {error ? <p className="analytics-trade-edit__error">{error}</p> : null}

      <div className="analytics-trade-actions">
        <button
          type="button"
          className="analytics-trade-delete-btn"
          disabled={deleting}
          onClick={handleDelete}
        >
          {deleting ? "Deleting…" : "Delete trade"}
        </button>
      </div>
    </AnalyticsSlidePanel>
  );
}
