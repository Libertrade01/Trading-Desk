"use client";

import { useState, useEffect, useMemo } from "react";
import { formatLimaTime } from "../lib/trade-time";
import { RTRADER_IMPORT_TIMEZONE_OPTIONS } from "../lib/rtrader-timezone";
import { normalizeTradeTimestamps } from "../lib/rtrader-import";
import {
  MGMT_OPTIONS,
  POST_EXIT_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
} from "../lib/trade-import-options";
import { buildSetupOptions } from "../lib/setup-options";
import { loadTraderProfile, getPlaybookSetupNames } from "../lib/trader-profile";
import { loadTraderSettings, saveTraderSettings } from "../lib/trader-settings";
import {
  summarizeSetupAdherence,
  validateImportSetupTags,
  formatPlaybookBreakdown,
} from "../lib/setup-adherence";

function formatMoney(n, { signed = false } = {}) {
  const abs = Math.abs(n).toFixed(2);
  if (signed) return `${n >= 0 ? "+" : "-"}$${abs}`;
  return `$${abs}`;
}

function initTrades(trades, defaultRisk) {
  return trades.map((t) => ({
    ...t,
    stop_loss_points: t.stop_loss_points ?? defaultRisk,
    setup: t.setup ?? null,
    management: t.management ?? null,
    sequence_id: t.sequence_id ?? null,
    post_exit_outcome: t.post_exit_outcome ?? null,
  }));
}

export default function RTraderImportPreview({
  open,
  onClose,
  trades: incomingTrades = [],
  openPosition = 0,
  missingSymbols = [],
  filename = "",
  account,
  sourceTimeZone = "UTC",
  timeColumnHeader = "",
  onConfirm,
}) {
  const [pendingTrades, setPendingTrades] = useState([]);
  const [defaultRisk, setDefaultRisk] = useState("15");
  const [accountType, setAccountType] = useState(account?.account_type || "eval");
  const [importTimeZone, setImportTimeZone] = useState(sourceTimeZone);
  const [importing, setImporting] = useState(false);
  const [setupOptions, setSetupOptions] = useState(() => buildSetupOptions());

  useEffect(() => {
    if (!open || !incomingTrades.length) return;
    let cancelled = false;
    (async () => {
      const [settings] = await Promise.all([
        loadTraderSettings(),
        loadTraderProfile(),
      ]);
      if (cancelled) return;
      const risk = settings.defaultRisk;
      setDefaultRisk(String(risk));
      setSetupOptions(buildSetupOptions(getPlaybookSetupNames()));
      setPendingTrades(initTrades(incomingTrades, risk));
      setAccountType(account?.account_type || "eval");
      setImportTimeZone(sourceTimeZone);
      setImporting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, incomingTrades, account, sourceTimeZone]);

  const totals = useMemo(() => {
    const totalRaw = pendingTrades.reduce((s, t) => s + t.raw_pnl, 0);
    const totalComm = pendingTrades.reduce((s, t) => s + t.commission, 0);
    const totalNet = pendingTrades.reduce((s, t) => s + t.net_pnl, 0);
    const winners = pendingTrades.filter((t) => t.net_pnl > 0).length;
    const setupSummary = summarizeSetupAdherence(pendingTrades);
    const importCheck = validateImportSetupTags(pendingTrades);
    return { totalRaw, totalComm, totalNet, winners, setupSummary, importCheck };
  }, [pendingTrades]);

  const updateTrade = (idx, patch) => {
    setPendingTrades((rows) => rows.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  };

  const applyDefaultRiskToAll = async (val) => {
    const parsed = parseFloat(val);
    setDefaultRisk(val);
    if (Number.isNaN(parsed) || parsed <= 0) return;
    const settings = await loadTraderSettings();
    await saveTraderSettings({ ...settings, defaultRisk: parsed });
    setPendingTrades((rows) => rows.map((t) => ({ ...t, stop_loss_points: parsed })));
  };

  const handleConfirm = async () => {
    if (!pendingTrades.length || importing) return;
    const check = validateImportSetupTags(pendingTrades);
    if (!check.ok) {
      window.alert(check.message);
      return;
    }
    setImporting(true);
    try {
      const finalized = normalizeTradeTimestamps(pendingTrades, importTimeZone);
      await onConfirm(finalized, accountType);
      onClose();
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="import-modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="import-modal" role="dialog" aria-modal="true" aria-labelledby="import-modal-title">
        <div className="import-modal-header">
          <span className="import-modal-title" id="import-modal-title">Import Preview — rTrader CSV</span>
          <button type="button" className="import-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="import-modal-summary">
          <div className="import-summary-cell">
            <div className="import-ms-label">File</div>
            <div className="import-ms-text">{filename || "—"}</div>
          </div>
          <div className="import-summary-cell">
            <div className="import-ms-label">Account</div>
            <div className="import-ms-text">{account?.name || "Default Account"}</div>
          </div>
          <div className="import-summary-cell">
            <div className="import-ms-label">Trades Found</div>
            <div className="import-ms-val">{pendingTrades.length}</div>
          </div>
          <div className="import-summary-cell">
            <div className="import-ms-label">Total Commission</div>
            <div className="import-ms-val import-warn">-{formatMoney(totals.totalComm)}</div>
          </div>
          <div className="import-summary-cell">
            <div className="import-ms-label">CSV Timezone</div>
            <div className="import-ms-text" title={timeColumnHeader || undefined}>
              {timeColumnHeader || "Update Time"}
            </div>
          </div>
          <div className="import-summary-cell">
            <div className="import-ms-label">Net P&amp;L</div>
            <div className="import-ms-val" style={{ color: totals.totalNet >= 0 ? "var(--green)" : "var(--red)" }}>
              {formatMoney(totals.totalNet, { signed: true })}
            </div>
          </div>
        </div>

        {openPosition !== 0 && (
          <div className="import-commission-missing">
            ⚠ Open position detected ({openPosition} contracts). This session may have unclosed trades.
          </div>
        )}
        {missingSymbols.length > 0 && (
          <div className="import-commission-missing">
            ⚠ No commission rate set for: {missingSymbols.join(", ")}. Commission calculated as $0 for these symbols. Update rates in Settings.
          </div>
        )}

        {pendingTrades.length > 0 && (
          <div className={`import-setup-summary${totals.importCheck.ok ? "" : " import-setup-summary--blocked"}`}>
            <strong>Setup tags:</strong> {formatPlaybookBreakdown(totals.setupSummary) || "—"}
            {!totals.importCheck.ok && (
              <span className="import-setup-summary-warn"> · Tag every trade before importing</span>
            )}
          </div>
        )}

        <div className="import-modal-body">
          <table className="import-preview-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Entry Time (ET)</th>
                <th>Exit Time (ET)</th>
                <th>Symbol</th>
                <th>Direction</th>
                <th>Qty</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>Raw P&amp;L</th>
                <th>Commission</th>
                <th>Net P&amp;L</th>
                <th>Risk (pts)</th>
                <th>Setup</th>
                <th>Mgmt</th>
                <th>Seq</th>
                <th>Post-Exit</th>
              </tr>
            </thead>
            <tbody>
              {pendingTrades.map((t, i) => {
                const pnlCls = t.net_pnl > 0 ? "pos" : t.net_pnl < 0 ? "neg" : "dim";
                const rawCls = t.raw_pnl > 0 ? "pos" : t.raw_pnl < 0 ? "neg" : "dim";
                const dirColor = t.direction === "LONG" ? "var(--green)" : "var(--red)";
                const untagged = !t.setup;
                return (
                  <tr key={`${t.entry_time}-${t.symbol}-${i}`} className={untagged ? "import-row--untagged" : ""}>
                    <td className="dim">{i + 1}</td>
                    <td>{formatLimaTime(t.entry_time, { sourceTimeZone: importTimeZone })}</td>
                    <td>{formatLimaTime(t.exit_time, { sourceTimeZone: importTimeZone })}</td>
                    <td>{t.symbol}</td>
                    <td style={{ color: dirColor }}>{t.direction}</td>
                    <td>{t.qty}</td>
                    <td className="dim">{t.entry_price.toFixed(4)}</td>
                    <td className="dim">{t.exit_price.toFixed(4)}</td>
                    <td className={rawCls}>{formatMoney(t.raw_pnl, { signed: true })}</td>
                    <td className="warn">-{formatMoney(t.commission)}</td>
                    <td className={pnlCls} style={{ fontWeight: 500 }}>{formatMoney(t.net_pnl, { signed: true })}</td>
                    <td>
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        value={t.stop_loss_points ?? ""}
                        placeholder="-"
                        className="import-cell-input import-cell-input--risk"
                        onChange={(e) => updateTrade(i, {
                          stop_loss_points: e.target.value ? parseFloat(e.target.value) : null,
                        })}
                      />
                    </td>
                    <td>
                      <select
                        className="import-cell-select import-cell-select--setup"
                        value={t.setup || ""}
                        onChange={(e) => updateTrade(i, { setup: e.target.value || null })}
                      >
                        {setupOptions.map((o) => (
                          <option key={o.value || "empty"} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="import-cell-select import-cell-select--mgmt"
                        value={t.management || ""}
                        onChange={(e) => updateTrade(i, { management: e.target.value || null })}
                      >
                        {MGMT_OPTIONS.map((o) => (
                          <option key={o.value || "empty"} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={t.sequence_id ?? ""}
                        placeholder="—"
                        className="import-cell-input import-cell-input--seq"
                        onChange={(e) => updateTrade(i, {
                          sequence_id: e.target.value ? parseInt(e.target.value, 10) : null,
                        })}
                      />
                    </td>
                    <td>
                      <select
                        className="import-cell-select import-cell-select--post"
                        value={t.post_exit_outcome || ""}
                        onChange={(e) => updateTrade(i, { post_exit_outcome: e.target.value || null })}
                      >
                        {POST_EXIT_OPTIONS.map((o) => (
                          <option key={o.value || "empty"} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="import-modal-footer">
          <div className="import-footer-note">
            {pendingTrades.length} trades · {totals.winners} winners · {formatPlaybookBreakdown(totals.setupSummary)}
          </div>
          <div className="import-footer-actions">
            <div className="import-footer-field">
              <span className="import-footer-label">CSV timezone</span>
              <select
                className="import-footer-select"
                value={importTimeZone}
                onChange={(e) => setImportTimeZone(e.target.value)}
                title="Timezone of timestamps in your rTrader export"
              >
                {RTRADER_IMPORT_TIMEZONE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="import-footer-field">
              <span className="import-footer-label">Account Type</span>
              <select
                className="import-footer-select"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
              >
                {ACCOUNT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="import-footer-field">
              <span className="import-footer-label">Default Risk (pts)</span>
              <input
                type="number"
                step="0.25"
                min="0"
                placeholder="15"
                className="import-footer-risk"
                value={defaultRisk}
                onChange={(e) => applyDefaultRiskToAll(e.target.value)}
              />
            </div>
            <button type="button" className="import-btn-secondary" onClick={onClose} disabled={importing}>Cancel</button>
            <button type="button" className="import-btn-primary" onClick={handleConfirm} disabled={importing || !pendingTrades.length || !totals.importCheck.ok}>
              {importing ? "Importing..." : "Confirm & Import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
