"use client";

import { useState, useEffect, useCallback } from "react";
import {
  loadDllSettings,
  saveDllSettings,
  validateDllSettingsInput,
  DEFAULT_DLL_SETTINGS,
} from "../lib/dll-recovery-settings";
import {
  loadTraderSettings,
  saveTraderSettings,
  validateTraderSettingsInput,
  createDefaultAccount,
  DEFAULT_TRADER_SETTINGS,
  COMMISSION_SYMBOLS,
} from "../lib/trader-settings";
import { formatRecoveryUsd } from "../lib/dll-recovery";
import { ACCOUNT_TYPE_OPTIONS } from "../lib/trade-import-options";

function headerDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();
}

function ToggleField({ label, hint, value, onChange }) {
  return (
    <div className="pm-toggle-field">
      <div>
        <div className="pm-field-label hybrid-label">{label}</div>
        {hint && <div className="pm-field-hint">{hint}</div>}
      </div>
      <button
        type="button"
        className={`pm-toggle${value ? " on" : ""}`}
        onClick={() => onChange(!value)}
        aria-pressed={value}
      >
        <span className="pm-toggle-knob" />
      </button>
    </div>
  );
}

function AccountCard({
  account,
  index,
  expanded,
  onToggle,
  onChange,
  onDelete,
  onSetImport,
  canDelete,
}) {
  const setField = (key, value) => onChange(index, { [key]: value });
  const setCommission = (symbol, value) => {
    onChange(index, {
      commissions: { ...account.commissions, [symbol]: value },
    });
  };
  const addSymbol = () => {
    let key = "NEW";
    let i = 1;
    while (account.commissions[key] != null) key = `NEW${i++}`;
    onChange(index, {
      commissions: { ...account.commissions, [key]: "0.00" },
    });
  };
  const renameSymbol = (oldSym, newSym) => {
    const next = { ...account.commissions };
    const rate = next[oldSym];
    delete next[oldSym];
    if (newSym.trim()) next[newSym.trim().toUpperCase()] = rate;
    onChange(index, { commissions: next });
  };
  const removeSymbol = (sym) => {
    const next = { ...account.commissions };
    delete next[sym];
    onChange(index, { commissions: next });
  };

  return (
    <div className={`settings-account-card${expanded ? " expanded" : ""}`}>
      <button type="button" className="settings-account-head" onClick={onToggle}>
        <span className="settings-account-name">{account.name || "Untitled account"}</span>
        <span className="settings-account-meta">
          {account.forImport ? "Import default" : account.account_type}
        </span>
      </button>

      {expanded && (
        <div className="settings-account-body">
          <label className="settings-import-radio">
            <input
              type="radio"
              name="import-account"
              checked={!!account.forImport}
              onChange={() => onSetImport(index)}
            />
            <span>Use for rTrader imports (commissions &amp; account type)</span>
          </label>

          <div className="pm-field-grid">
            <div>
              <div className="pm-field-label hybrid-label">Account name</div>
              <input
                type="text"
                value={account.name}
                onChange={(e) => setField("name", e.target.value)}
                className="pm-text-input"
                placeholder="50K Eval"
              />
            </div>
            <div>
              <div className="pm-field-label hybrid-label">Account type</div>
              <select
                value={account.account_type}
                onChange={(e) => setField("account_type", e.target.value)}
                className="pm-select"
              >
                {ACCOUNT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="pm-field-label hybrid-label">Starting balance ($)</div>
              <input
                type="text"
                value={account.starting_balance}
                onChange={(e) => setField("starting_balance", e.target.value)}
                className="pm-text-input"
                placeholder="50000"
              />
            </div>
            <div>
              <div className="pm-field-label hybrid-label">Breakeven threshold ($)</div>
              <input
                type="text"
                value={account.be_threshold}
                onChange={(e) => setField("be_threshold", e.target.value)}
                className="pm-text-input"
                placeholder="30"
              />
              <p className="pm-field-hint">Trades within ±this amount count as breakeven in Analytics.</p>
            </div>
          </div>

          <div className="settings-comm-block">
            <div className="pm-field-label hybrid-label">Commission rates ($ per contract, per side)</div>
            <div className="settings-comm-rows">
              {Object.entries(account.commissions || {}).map(([sym, rate]) => (
                <div key={sym} className="settings-comm-row">
                  <input
                    type="text"
                    value={sym}
                    onChange={(e) => renameSymbol(sym, e.target.value)}
                    className="pm-text-input settings-comm-sym"
                    placeholder="MNQ"
                  />
                  <span className="settings-comm-sep">$</span>
                  <input
                    type="text"
                    value={rate}
                    onChange={(e) => setCommission(sym, e.target.value)}
                    className="pm-text-input settings-comm-rate"
                    placeholder="0.50"
                  />
                  <button
                    type="button"
                    className="settings-comm-remove"
                    onClick={() => removeSymbol(sym)}
                    aria-label={`Remove ${sym}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="pm-add-btn settings-comm-add" onClick={addSymbol}>
              + Add symbol
            </button>
            <p className="pm-field-hint">
              Common: {COMMISSION_SYMBOLS.join(", ")}. Missing symbols import with $0 commission.
            </p>
          </div>

          {canDelete && (
            <button type="button" className="settings-account-delete" onClick={() => onDelete(index)}>
              Delete account
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const [dllForm, setDllForm] = useState({
    fullDll: String(DEFAULT_DLL_SETTINGS.fullDll),
    halfDll: String(DEFAULT_DLL_SETTINGS.halfDll),
    recoveryEnabled: DEFAULT_DLL_SETTINGS.recoveryEnabled,
  });
  const [defaultRisk, setDefaultRisk] = useState(String(DEFAULT_TRADER_SETTINGS.defaultRisk));
  const [accounts, setAccounts] = useState([]);
  const [expandedAccount, setExpandedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const markDirty = useCallback(() => setSaved(false), []);

  const setDll = useCallback((key, value) => {
    setDllForm((f) => ({ ...f, [key]: value }));
    markDirty();
  }, [markDirty]);

  useEffect(() => {
    (async () => {
      const [dll, trader] = await Promise.all([loadDllSettings(), loadTraderSettings()]);
      setDllForm({
        fullDll: String(dll.fullDll),
        halfDll: String(dll.halfDll),
        recoveryEnabled: dll.recoveryEnabled,
      });
      setDefaultRisk(String(trader.defaultRisk));
      setAccounts(trader.accounts);
      setExpandedAccount(trader.accounts[0]?.id ?? null);
      setLoading(false);
    })();
  }, []);

  const updateAccount = (index, patch) => {
    setAccounts((rows) =>
      rows.map((a, i) => (i === index ? { ...a, ...patch } : a))
    );
    markDirty();
  };

  const setImportAccount = (index) => {
    setAccounts((rows) =>
      rows.map((a, i) => ({ ...a, forImport: i === index }))
    );
    markDirty();
  };

  const addAccount = () => {
    const next = createDefaultAccount({
      name: "",
      forImport: accounts.length === 0,
      active: true,
    });
    setAccounts((rows) => [...rows, next]);
    setExpandedAccount(next.id);
    markDirty();
  };

  const deleteAccount = (index) => {
    if (accounts.length <= 1) return;
    if (!window.confirm("Delete this account?")) return;
    const removed = accounts[index];
    setAccounts((rows) => {
      const next = rows.filter((_, i) => i !== index);
      if (removed.forImport && next.length) next[0].forImport = true;
      return next;
    });
    if (expandedAccount === removed.id) setExpandedAccount(null);
    markDirty();
  };

  const handleSave = async () => {
    const dllCheck = validateDllSettingsInput(dllForm);
    if (!dllCheck.ok) {
      window.alert(dllCheck.message);
      return;
    }

    const traderCheck = validateTraderSettingsInput({
      defaultRisk,
      accounts: accounts.map((a) => ({
        ...a,
        starting_balance: parseFloat(a.starting_balance) || 0,
        be_threshold: parseFloat(a.be_threshold) || 30,
      })),
    });
    if (!traderCheck.ok) {
      window.alert(traderCheck.message);
      return;
    }

    await Promise.all([
      saveDllSettings(dllCheck.settings),
      saveTraderSettings(traderCheck.settings),
    ]);

    setDllForm({
      fullDll: String(dllCheck.settings.fullDll),
      halfDll: String(dllCheck.settings.halfDll),
      recoveryEnabled: dllCheck.settings.recoveryEnabled,
    });
    setDefaultRisk(String(traderCheck.settings.defaultRisk));
    setAccounts(traderCheck.settings.accounts);
    setSaved(true);
  };

  if (loading) return <div className="pm-loading">Loading...</div>;

  return (
    <div className="premarket-page hybrid-page settings-page">
      <div className="pm-topbar">
        <span>{headerDate()}</span>
      </div>

      <div className="daily-plan-content settings-content">
        <div className="pm-eyebrow hybrid-eyebrow">Settings</div>
        <h1 className="hybrid-page-title">YOUR RULES.</h1>
        <p className="pm-subtitle">
          Risk limits, import defaults, and accounts — synced to your desk.
        </p>

        {/* 01 — highest-level risk rules */}
        <section className="pm-card">
          <div className="pm-section-head">
            <span className="pm-section-num">01</span>
            <div>
              <h2 className="pm-section-title hybrid-section-title">Daily loss &amp; recovery</h2>
              <p className="pm-section-desc">
                Governs daily plan limits and automatic half-size recovery after a full DLL hit.
              </p>
            </div>
          </div>

          <div className="pm-field-grid">
            <div>
              <div className="pm-field-label hybrid-label">Full-size DLL ($)</div>
              <input
                type="text"
                value={dllForm.fullDll}
                onChange={(e) => setDll("fullDll", e.target.value)}
                className="pm-text-input"
                placeholder="750"
              />
              <p className="pm-field-hint">
                Enters recovery when net P&amp;L ≤ −
                {formatRecoveryUsd(Number(dllForm.fullDll) || DEFAULT_DLL_SETTINGS.fullDll)}.
              </p>
            </div>
            <div>
              <div className="pm-field-label hybrid-label">Recovery DLL ($)</div>
              <input
                type="text"
                value={dllForm.halfDll}
                onChange={(e) => setDll("halfDll", e.target.value)}
                className="pm-text-input"
                placeholder="400"
              />
              <p className="pm-field-hint">Max daily loss while in recovery. Daily plan blocks above this.</p>
            </div>
          </div>

          <div className="pm-risk-rails">
            <ToggleField
              label="Automatic recovery"
              hint="Hitting full DLL enters recovery; exit automatically after 50% of drawdown is recovered."
              value={dllForm.recoveryEnabled}
              onChange={(v) => setDll("recoveryEnabled", v)}
            />
          </div>
        </section>

        {/* 02 — per-trade import default */}
        <section className="pm-card">
          <div className="pm-section-head">
            <span className="pm-section-num">02</span>
            <div>
              <h2 className="pm-section-title hybrid-section-title">Import defaults</h2>
              <p className="pm-section-desc">
                Pre-fills stop distance when tagging rTrader imports in post-market.
              </p>
            </div>
          </div>

          <div className="pm-field">
            <div className="pm-field-label hybrid-label">Default risk (stop points)</div>
            <input
              type="text"
              value={defaultRisk}
              onChange={(e) => {
                setDefaultRisk(e.target.value);
                markDirty();
              }}
              className="pm-text-input settings-default-risk-input"
              placeholder="15"
            />
            <p className="pm-field-hint">
              Applied to every trade on import. You can still edit per trade in the preview.
            </p>
          </div>
        </section>

        {/* 03 — accounts & commissions */}
        <section className="pm-card">
          <div className="pm-section-head">
            <span className="pm-section-num">03</span>
            <div>
              <h2 className="pm-section-title hybrid-section-title">Trading accounts</h2>
              <p className="pm-section-desc">
                Commission rates and the account used for imports. Analytics uses these for net P&amp;L.
              </p>
            </div>
          </div>

          <div className="settings-accounts-list">
            {accounts.map((account, index) => (
              <AccountCard
                key={account.id}
                account={account}
                index={index}
                expanded={expandedAccount === account.id}
                onToggle={() =>
                  setExpandedAccount((id) => (id === account.id ? null : account.id))
                }
                onChange={updateAccount}
                onDelete={deleteAccount}
                onSetImport={setImportAccount}
                canDelete={accounts.length > 1}
              />
            ))}
          </div>

          <button type="button" className="pm-add-btn" onClick={addAccount}>
            + Add account
          </button>
        </section>

        <div className="pm-footer pm-footer-postmarket">
          <button type="button" className="pm-btn-save-review" onClick={handleSave}>
            {saved ? "✓ Saved" : "Save settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
