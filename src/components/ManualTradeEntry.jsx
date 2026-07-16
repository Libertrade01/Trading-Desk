"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createManualTrade,
  manualTradeFromDb,
  validateManualTrades,
} from "../lib/manual-trades";
import { parseNaiveInTimezone, partsInTimezone, TRADE_DISPLAY_TIMEZONE } from "../lib/trade-time";
import { buildSetupOptions } from "../lib/setup-options";

function clockValue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = partsInTimezone(date, TRADE_DISPLAY_TIMEZONE);
  return parts ? `${parts.hour}:${parts.minute}` : "";
}

function editableTradeFromDb(row) {
  const trade = manualTradeFromDb(row);
  return {
    ...trade,
    entryTime: clockValue(trade.entryTime),
    exitTime: clockValue(trade.exitTime),
  };
}

function toIso(dateKey, clock) {
  const parsed = parseNaiveInTimezone(`${dateKey} ${clock}:00`, TRADE_DISPLAY_TIMEZONE);
  return parsed?.toISOString() || "";
}

function netPnl(row) {
  const gross = Number(row.grossPnl);
  const commission = Number(row.commission || 0);
  if (!Number.isFinite(gross) || !Number.isFinite(commission)) return null;
  return Math.round((gross - commission) * 100) / 100;
}

function money(value) {
  if (value == null) return "—";
  return `${value < 0 ? "-" : "+"}$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function ManualTradeEntry({
  dateKey,
  dayTrades,
  accounts,
  setupNames,
  onSaved,
}) {
  const manualRows = useMemo(
    () => (dayTrades || []).filter((trade) => trade.platform === "manual"),
    [dayTrades],
  );
  const [rows, setRows] = useState(() =>
    manualRows.length ? manualRows.map(editableTradeFromDb) : [createManualTrade()],
  );
  const [accountId, setAccountId] = useState(
    () => accounts.find((account) => account.forImport)?.id || accounts[0]?.id || "",
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty && manualRows.length) setRows(manualRows.map(editableTradeFromDb));
  }, [manualRows, dirty]);

  const setupOptions = useMemo(() => buildSetupOptions(setupNames), [setupNames]);
  const activeAccount = accounts.find((account) => account.id === accountId) || accounts[0] || null;
  const otherSourceCount = (dayTrades || []).filter(
    (trade) => trade.platform !== "manual" && (!activeAccount || trade.account_name === activeAccount.name),
  ).length;

  const patchRow = (clientId, patch) => {
    setRows((current) => current.map((row) => (row.clientId === clientId ? { ...row, ...patch } : row)));
    setDirty(true);
    setMessage("");
  };

  const addRow = () => {
    const previous = rows.at(-1);
    setRows((current) => [
      ...current,
      createManualTrade({
        instrument: previous?.instrument || "",
        direction: previous?.direction || "long",
        quantity: previous?.quantity || "1",
        setup: previous?.setup || "",
      }),
    ]);
    setDirty(true);
  };

  const removeRow = (clientId) => {
    if (rows.length === 1) {
      setRows([createManualTrade()]);
    } else {
      setRows((current) => current.filter((row) => row.clientId !== clientId));
    }
    setDirty(true);
  };

  const save = async () => {
    setMessage("");
    let payloadRows;
    try {
      payloadRows = rows.map((row) => ({
        ...row,
        entryTime: toIso(dateKey, row.entryTime),
        exitTime: toIso(dateKey, row.exitTime),
      }));
      validateManualTrades(payloadRows);
    } catch (error) {
      setMessage(error.message);
      return;
    }

    if (
      otherSourceCount > 0 &&
      !window.confirm(
        `This account already has ${otherSourceCount} imported trade${otherSourceCount === 1 ? "" : "s"} for today. Saving manual trades will replace them to prevent double-counting. Continue?`,
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/trades/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateKey, account: activeAccount, trades: payloadRows }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Manual trades could not be saved.");
      setMessage(`${data.count} trade${data.count === 1 ? "" : "s"} saved to Stats.`);
      setDirty(false);
      await onSaved?.();
    } catch (error) {
      setMessage(error.message || "Manual trades could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pm-manual-entry">
      <div className="pm-manual-head">
        <div>
          <strong>Enter each completed trade</strong>
          <p>Times are entered in New York time. Net P&amp;L and R-multiple inputs are calculated from these records.</p>
        </div>
        {accounts.length > 1 && (
          <label className="pm-manual-account">
            <span>Account</span>
            <select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="pm-manual-list">
        {rows.map((row, index) => {
          const net = netPnl(row);
          return (
            <article className="pm-manual-trade" key={row.clientId}>
              <header>
                <div><span>Trade {index + 1}</span>{row.instrument && <strong>{row.instrument}</strong>}</div>
                <div className="pm-manual-trade-actions">
                  <span className={net > 0 ? "pos" : net < 0 ? "neg" : ""}>{money(net)}</span>
                  <button type="button" onClick={() => removeRow(row.clientId)} aria-label={`Remove trade ${index + 1}`}>Remove</button>
                </div>
              </header>
              <div className="pm-manual-grid">
                <label><span>Instrument *</span><input value={row.instrument} onChange={(e) => patchRow(row.clientId, { instrument: e.target.value.toUpperCase() })} placeholder="NQ" /></label>
                <label><span>Direction *</span><select value={row.direction} onChange={(e) => patchRow(row.clientId, { direction: e.target.value })}><option value="long">Long</option><option value="short">Short</option></select></label>
                <label><span>Quantity *</span><input type="number" min="0" step="any" value={row.quantity} onChange={(e) => patchRow(row.clientId, { quantity: e.target.value })} /></label>
                <label><span>Setup *</span><select value={row.setup} onChange={(e) => patchRow(row.clientId, { setup: e.target.value })}>{setupOptions.map((option) => <option key={option.value || "none"} value={option.value}>{option.value || "Choose setup"}</option>)}</select></label>
                <label><span>Entry time (ET) *</span><input type="time" value={row.entryTime} onChange={(e) => patchRow(row.clientId, { entryTime: e.target.value })} /></label>
                <label><span>Exit time (ET) *</span><input type="time" value={row.exitTime} onChange={(e) => patchRow(row.clientId, { exitTime: e.target.value })} /></label>
                <label><span>Entry price *</span><input type="number" step="any" value={row.entryPrice} onChange={(e) => patchRow(row.clientId, { entryPrice: e.target.value })} /></label>
                <label><span>Initial stop price *</span><input type="number" step="any" value={row.stopPrice} onChange={(e) => patchRow(row.clientId, { stopPrice: e.target.value })} /></label>
                <label><span>Exit price *</span><input type="number" step="any" value={row.exitPrice} onChange={(e) => patchRow(row.clientId, { exitPrice: e.target.value })} /></label>
                <label><span>Gross P&amp;L *</span><input type="number" step="any" value={row.grossPnl} onChange={(e) => patchRow(row.clientId, { grossPnl: e.target.value })} placeholder="0.00" /></label>
                <label><span>Commission</span><input type="number" min="0" step="any" value={row.commission} onChange={(e) => patchRow(row.clientId, { commission: e.target.value })} placeholder="0.00" /></label>
              </div>
            </article>
          );
        })}
      </div>

      <div className="pm-manual-footer">
        <button type="button" className="pm-btn-outline" onClick={addRow}>+ Add another trade</button>
        <div>
          {message && <p className={message.includes("saved to Stats") ? "success" : "error"}>{message}</p>}
          <button type="button" className="pm-btn-primary-sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save trades"}</button>
        </div>
      </div>
    </div>
  );
}
