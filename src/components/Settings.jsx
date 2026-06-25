"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  TRADING_DAY_TIMEZONE_OPTIONS,
  DEFAULT_TRADING_DAY_TIMEZONE,
  COMMISSION_SYMBOLS,
} from "../lib/trader-settings";
import { formatRecoveryUsd } from "../lib/dll-recovery";
import { ACCOUNT_TYPE_OPTIONS } from "../lib/trade-import-options";
import MyProcessSettings from "./MyProcessSettings";

const SECTIONS = [
  {
    id: "process",
    label: "Process",
    hint: "Playbook & flags",
    title: "Your playbook",
    desc: "Setups, commitments, desk checks, streaks, and close-out flags.",
  },
  {
    id: "desk",
    label: "Desk",
    hint: "Timezone & imports",
    title: "Desk setup",
    desc: "When your trading day rolls over and how rTrader imports are pre-filled.",
  },
  {
    id: "risk",
    label: "Risk",
    hint: "Daily loss limits",
    title: "Daily loss & recovery",
    desc: "Hard limits for the session plan and automatic half-size mode after a full DLL hit.",
  },
  {
    id: "accounts",
    label: "Accounts",
    hint: "Commissions & types",
    title: "Trading accounts",
    desc: "Commission rates, account types, and which account rTrader imports attach to.",
  },
];

const VALID_SECTIONS = new Set(SECTIONS.map((s) => s.id));

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
        <span className="settings-account-chevron" aria-hidden="true">
          {expanded ? "−" : "+"}
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

function SettingsSidebar({ active, onChange }) {
  return (
    <nav className="settings-sidebar" aria-label="Settings sections">
      <div className="settings-sidebar-label hybrid-label-sm">Configure</div>
      {SECTIONS.map((section) => (
        <button
          key={section.id}
          type="button"
          className={`settings-sidebar-item${active === section.id ? " active" : ""}`}
          onClick={() => onChange(section.id)}
          aria-current={active === section.id ? "page" : undefined}
        >
          <span className="settings-sidebar-item-label">{section.label}</span>
          <span className="settings-sidebar-item-hint">{section.hint}</span>
        </button>
      ))}
    </nav>
  );
}

function SettingsInner({ initialSection = "desk" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const resolvedInitial =
    sectionParam && VALID_SECTIONS.has(sectionParam) ? sectionParam : initialSection;

  const [activeSection, setActiveSection] = useState(resolvedInitial);
  const [dllForm, setDllForm] = useState({
    fullDll: String(DEFAULT_DLL_SETTINGS.fullDll),
    halfDll: String(DEFAULT_DLL_SETTINGS.halfDll),
    recoveryEnabled: DEFAULT_DLL_SETTINGS.recoveryEnabled,
  });
  const [defaultRisk, setDefaultRisk] = useState(String(DEFAULT_TRADER_SETTINGS.defaultRisk));
  const [tradingDayTimezone, setTradingDayTimezone] = useState(DEFAULT_TRADING_DAY_TIMEZONE);
  const [accounts, setAccounts] = useState([]);
  const [expandedAccount, setExpandedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const markDirty = useCallback(() => setSaved(false), []);

  const setDll = useCallback((key, value) => {
    setDllForm((f) => ({ ...f, [key]: value }));
    markDirty();
  }, [markDirty]);

  const selectSection = useCallback(
    (id) => {
      setActiveSection(id);
      router.replace(`/settings?section=${id}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    if (sectionParam && VALID_SECTIONS.has(sectionParam) && sectionParam !== activeSection) {
      setActiveSection(sectionParam);
    }
  }, [sectionParam, activeSection]);

  useEffect(() => {
    (async () => {
      const [dll, trader] = await Promise.all([loadDllSettings(), loadTraderSettings()]);
      setDllForm({
        fullDll: String(dll.fullDll),
        halfDll: String(dll.halfDll),
        recoveryEnabled: dll.recoveryEnabled,
      });
      setDefaultRisk(String(trader.defaultRisk));
      setTradingDayTimezone(trader.tradingDayTimezone);
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
    selectSection("accounts");
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
      tradingDayTimezone,
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

    setSaving(true);
    try {
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
      setTradingDayTimezone(traderCheck.settings.tradingDayTimezone);
      setAccounts(traderCheck.settings.accounts);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="pm-loading">Loading...</div>;

  const importAccount = accounts.find((a) => a.forImport) || accounts[0];
  const meta = SECTIONS.find((s) => s.id === activeSection) || SECTIONS[0];
  const showDeskSave = activeSection !== "process";

  return (
    <div className="premarket-page hybrid-page settings-page">
      <div className="pm-topbar">
        <span>{headerDate()}</span>
      </div>

      <div className="daily-plan-content settings-content">
        <div className="pm-eyebrow hybrid-eyebrow">Settings</div>
        <h1 className="hybrid-page-title">YOUR DESK.</h1>
        <p className="pm-subtitle settings-lead">
          Process, desk rules, risk limits, and accounts — everything that shapes your trading day.
        </p>

        <div className="settings-layout">
          <SettingsSidebar active={activeSection} onChange={selectSection} />

          <div className="settings-main">
            <div className="settings-main-head">
              <h2 className="pm-section-title hybrid-section-title">{meta.title}</h2>
              <p className="pm-section-desc">{meta.desc}</p>
            </div>

            {activeSection === "process" && (
              <div className="settings-panel settings-panel--process">
                <MyProcessSettings standalone />
              </div>
            )}

            {activeSection === "desk" && (
              <section className="pm-card settings-panel">
                <div className="settings-field-block">
                  <div className="settings-field-block-label hybrid-label-sm">Trading day</div>
                  <div className="pm-field">
                    <div className="pm-field-label hybrid-label">Calendar timezone</div>
                    <select
                      value={tradingDayTimezone}
                      onChange={(e) => {
                        setTradingDayTimezone(e.target.value);
                        markDirty();
                      }}
                      className="pm-text-input settings-timezone-select"
                    >
                      {TRADING_DAY_TIMEZONE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="pm-field-hint">
                      Defines &ldquo;today&rdquo; for check-in, close out, history, and analytics. Import CSV dates are unchanged.
                    </p>
                  </div>
                </div>

                <div className="settings-field-divider" />

                <div className="settings-field-block">
                  <div className="settings-field-block-label hybrid-label-sm">Close-out imports</div>
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
                      Pre-fills stop distance on every rTrader import. You can still edit per trade in the preview.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {activeSection === "risk" && (
              <section className="pm-card settings-panel">
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
                    <p className="pm-field-hint">Max daily loss while in recovery. Session plan blocks above this.</p>
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
            )}

            {activeSection === "accounts" && (
              <section className="pm-card settings-panel">
                {importAccount && (
                  <div className="settings-accounts-summary">
                    <span className="hybrid-label-sm">Import default</span>
                    <strong>{importAccount.name || "Untitled account"}</strong>
                    <span className="settings-accounts-summary-meta">{importAccount.account_type}</span>
                  </div>
                )}

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
            )}

            {showDeskSave && (
              <div className={`settings-sticky-save${saved ? "" : " settings-sticky-save--dirty"}`}>
                <p className="settings-sticky-save-hint">
                  {saved ? "All changes saved to your desk." : "Unsaved changes — save before leaving."}
                </p>
                <button
                  type="button"
                  className="pm-btn-save-review"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving…" : saved ? "✓ Saved" : "Save settings"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Settings({ initialSection = "desk" }) {
  return (
    <Suspense fallback={<div className="pm-loading">Loading...</div>}>
      <SettingsInner initialSection={initialSection} />
    </Suspense>
  );
}
