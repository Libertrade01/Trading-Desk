"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  loadDllSettings,
  saveDllSettings,
  validateDllSettingsInput,
  DEFAULT_DLL_SETTINGS,
  ACTIVATION_MODES,
  ACTIVATION_MODE_OPTIONS,
  EXIT_MODES,
  EXIT_MODE_OPTIONS,
} from "../lib/dll-recovery-settings";
import {
  loadTraderSettings,
  saveTraderSettings,
  validateTraderSettingsInput,
  createDefaultAccount,
  DEFAULT_TRADER_SETTINGS,
  TRADING_DAY_TIMEZONE_OPTIONS,
  DEFAULT_TRADING_DAY_TIMEZONE,
} from "../lib/trader-settings";
import MyProcessSettings from "./MyProcessSettings";
import WorkflowPageLayout from "./WorkflowPageLayout";
import { getCurrentUser } from "../lib/user-storage";
import { isDevUser } from "../lib/dev-access";
import { clearTraderProfileCache, loadTraderProfile, saveTraderProfile } from "../lib/trader-profile";

const SECTIONS = [
  {
    id: "process",
    label: "Process",
    hint: "Playbook & Accountability",
  },
  {
    id: "risk",
    label: "Risk",
    hint: "Drawdown Recovery",
  },
  {
    id: "desk",
    label: "General",
    hint: "Timezone & imports",
  },
  {
    id: "accounts",
    label: "Accounts",
    hint: "Commissions & types",
  },
];

const DEV_SECTION = {
  id: "dev",
  label: "Dev",
  hint: "Testing tools",
};

function getVisibleSections(showDevTools) {
  return showDevTools ? [...SECTIONS, DEV_SECTION] : SECTIONS;
}

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
          {account.forImport ? "Import default" : null}
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
            <span>Use for rTrader imports (commissions)</span>
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
              <div className="pm-field-label hybrid-label">Starting balance ($)</div>
              <input
                type="text"
                value={account.starting_balance}
                onChange={(e) => setField("starting_balance", e.target.value)}
                className="pm-text-input"
                placeholder="50000"
              />
            </div>
          </div>

          <div className="settings-comm-block">
            <ToggleField
              label="Apply commission rates"
              hint="Enable and add rates per symbol if your broker CSV does not include fees. When off, import uses gross P&L only."
              value={account.commissions_enabled !== false}
              onChange={(enabled) => setField("commissions_enabled", enabled)}
            />

            {account.commissions_enabled !== false && (
              <>
                <div className="pm-field-label hybrid-label settings-comm-rates-label">
                  Commission rates ($ per contract, per side)
                </div>
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
                  Missing symbols import with $0 commissions.
                </p>
              </>
            )}
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

function SettingsSidebar({ active, onChange, sections }) {
  return (
    <nav className="settings-sidebar" aria-label="Settings sections">
      {sections.map((section) => (
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
  const [showDevTools, setShowDevTools] = useState(false);
  const [replayLoading, setReplayLoading] = useState(false);
  const visibleSections = useMemo(
    () => getVisibleSections(showDevTools),
    [showDevTools]
  );
  const validSections = useMemo(
    () => new Set(visibleSections.map((s) => s.id)),
    [visibleSections]
  );
  const resolvedInitial =
    sectionParam && validSections.has(sectionParam) ? sectionParam : initialSection;

  const [activeSection, setActiveSection] = useState(resolvedInitial);
  const [dllForm, setDllForm] = useState({
    fullDll: String(DEFAULT_DLL_SETTINGS.fullDll),
    halfDll: String(DEFAULT_DLL_SETTINGS.halfDll),
    recoveryEnabled: DEFAULT_DLL_SETTINGS.recoveryEnabled,
    activationMode: DEFAULT_DLL_SETTINGS.activationMode,
    activationDrawdown: String(DEFAULT_DLL_SETTINGS.activationDrawdown),
    exitMode: DEFAULT_DLL_SETTINGS.exitMode,
    exitRecoveryPercent: String(DEFAULT_DLL_SETTINGS.exitRecoveryPercent),
    exitRecoveryAmount: String(DEFAULT_DLL_SETTINGS.exitRecoveryAmount),
  });
  const [defaultRisk, setDefaultRisk] = useState(String(DEFAULT_TRADER_SETTINGS.defaultRisk));
  const [beThreshold, setBeThreshold] = useState(String(DEFAULT_TRADER_SETTINGS.beThreshold));
  const [preferredName, setPreferredName] = useState("");
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
    if (sectionParam && validSections.has(sectionParam) && sectionParam !== activeSection) {
      setActiveSection(sectionParam);
    }
  }, [sectionParam, activeSection, validSections]);

  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        if (isDevUser(user)) {
          setShowDevTools(true);
          return;
        }
        const res = await fetch("/api/dev/tools");
        if (res.ok) {
          const data = await res.json();
          setShowDevTools(!!data.enabled);
        }
      } catch {
        setShowDevTools(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const [dll, trader, profile] = await Promise.all([
        loadDllSettings(),
        loadTraderSettings(),
        loadTraderProfile(),
      ]);
      setDllForm({
        fullDll: String(dll.fullDll),
        halfDll: String(dll.halfDll),
        recoveryEnabled: dll.recoveryEnabled,
        activationMode: dll.activationMode,
        activationDrawdown: String(dll.activationDrawdown),
        exitMode: dll.exitMode,
        exitRecoveryPercent: String(dll.exitRecoveryPercent),
        exitRecoveryAmount: String(dll.exitRecoveryAmount),
      });
      setDefaultRisk(String(trader.defaultRisk));
      setBeThreshold(String(trader.beThreshold));
      setPreferredName(profile?.preferredName || "");
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
      beThreshold,
      tradingDayTimezone,
      accounts: accounts.map((a) => ({
        ...a,
        starting_balance: parseFloat(a.starting_balance) || 0,
      })),
    });
    if (!traderCheck.ok) {
      window.alert(traderCheck.message);
      return;
    }

    setSaving(true);
    try {
      const profile = await loadTraderProfile();
      await Promise.all([
        saveDllSettings(dllCheck.settings),
        saveTraderSettings(traderCheck.settings),
        saveTraderProfile({ ...profile, preferredName: preferredName.trim() }),
      ]);

      setDllForm({
        fullDll: String(dllCheck.settings.fullDll),
        halfDll: String(dllCheck.settings.halfDll),
        recoveryEnabled: dllCheck.settings.recoveryEnabled,
        activationMode: dllCheck.settings.activationMode,
        activationDrawdown: String(dllCheck.settings.activationDrawdown),
        exitMode: dllCheck.settings.exitMode,
        exitRecoveryPercent: String(dllCheck.settings.exitRecoveryPercent),
        exitRecoveryAmount: String(dllCheck.settings.exitRecoveryAmount),
      });
      setDefaultRisk(String(traderCheck.settings.defaultRisk));
      setBeThreshold(String(traderCheck.settings.beThreshold));
      setPreferredName(preferredName.trim());
      setTradingDayTimezone(traderCheck.settings.tradingDayTimezone);
      setAccounts(traderCheck.settings.accounts);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const handleReplayOnboarding = async () => {
    if (
      !window.confirm(
        "Open the onboarding wizard again? Your playbook, settings, and history stay as-is."
      )
    ) {
      return;
    }

    setReplayLoading(true);
    try {
      const res = await fetch("/api/dev/replay-onboarding", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(data.error || "Could not reset onboarding");
        return;
      }
      clearTraderProfileCache();
      router.push("/onboarding");
    } finally {
      setReplayLoading(false);
    }
  };

  if (loading) return <div className="pm-loading">Loading...</div>;

  const showDeskSave = activeSection !== "process" && activeSection !== "dev";

  return (
    <WorkflowPageLayout>
      <div className="settings-page">
        <div className="pm-topbar">
          <span>{headerDate()}</span>
        </div>

        <div className="settings-content">
          <header className="settings-page-header">
            <h1 className="hybrid-page-title">
              Settings<span className="hybrid-page-title-stop" aria-hidden="true" />
            </h1>
            <p className="pm-subtitle settings-lead">
              Your playbook, risk limits, defaults, and accounts.
            </p>
          </header>

          <div className="settings-layout">
          <SettingsSidebar
            active={activeSection}
            onChange={selectSection}
            sections={visibleSections}
          />

          <div className="settings-main">
            {activeSection === "process" && (
              <div className="settings-panel settings-panel--process">
                <MyProcessSettings standalone />
              </div>
            )}

            {activeSection === "desk" && (
              <section className="pm-card settings-panel">
                <div className="settings-field-block">
                  <div className="settings-field-block-label hybrid-label-sm">Profile</div>
                  <div className="pm-field">
                    <div className="pm-field-label hybrid-label">Display name</div>
                    <input
                      type="text"
                      value={preferredName}
                      onChange={(e) => {
                        setPreferredName(e.target.value);
                        markDirty();
                      }}
                      className="pm-text-input"
                      placeholder="Mike"
                      autoComplete="nickname"
                      maxLength={32}
                    />
                    <p className="pm-field-hint">
                      Used in Home greeting.
                    </p>
                  </div>
                </div>

                <div className="settings-field-divider" />

                <div className="settings-field-block">
                  <div className="settings-field-block-label hybrid-label-sm">Trading day</div>
                  <div className="pm-field">
                    <div className="pm-field-label hybrid-label">When does your trading day start?</div>
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
                      Default is your browser&apos;s local time. This only affects when &ldquo;today&rdquo; rolls over for check-in, close loop, and history. Trade times in imports and analytics always display in US Eastern (NYSE).
                    </p>
                  </div>
                </div>
              </section>
            )}

            {activeSection === "risk" && (
              <section className="pm-card settings-panel">
                <div className="pm-risk-rails">
                  <ToggleField
                    label="Enable Drawdown Recovery Mode"
                    hint="After a loss day triggers your activation rule, the desk switches to half-size until your exit rule is met."
                    value={dllForm.recoveryEnabled}
                    onChange={(v) => setDll("recoveryEnabled", v)}
                  />
                </div>

                {dllForm.recoveryEnabled && (
                  <>
                    <div className="settings-field-divider" />

                    <div className="settings-field-block">
                      <div className="settings-field-block-label hybrid-label-sm">Daily loss limits</div>
                      <div className="pm-field-grid">
                        <div>
                          <div className="pm-field-label hybrid-label">Full-size daily loss limit ($)</div>
                          <input
                            type="text"
                            value={dllForm.fullDll}
                            onChange={(e) => setDll("fullDll", e.target.value)}
                            className="pm-text-input"
                            placeholder="750"
                          />
                          <p className="pm-field-hint">
                            Normal DLL when not in Recovery Mode.
                          </p>
                        </div>
                        <div>
                          <div className="pm-field-label hybrid-label">Recovery mode max daily loss limit ($)</div>
                          <input
                            type="text"
                            value={dllForm.halfDll}
                            onChange={(e) => setDll("halfDll", e.target.value)}
                            className="pm-text-input"
                            placeholder="400"
                          />
                          <p className="pm-field-hint">
                            DLL when in Recovery Mode. Session plan rejects if you place an amount higher than this while still recovering.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="settings-field-divider" />

                    <div className="settings-field-block">
                      <div className="settings-field-block-label hybrid-label-sm">Activation rule</div>
                      <p className="pm-field-hint settings-field-block-lead">
                        When should Drawdown Recovery activate?
                      </p>
                      <div className="settings-radio-group">
                        {ACTIVATION_MODE_OPTIONS.map((opt) => (
                          <label key={opt.value} className="settings-radio-row">
                            <input
                              type="radio"
                              name="activationMode"
                              value={opt.value}
                              checked={dllForm.activationMode === opt.value}
                              onChange={() => setDll("activationMode", opt.value)}
                            />
                            <span>
                              <span className="settings-radio-label">{opt.label}</span>
                              <span className="pm-field-hint">{opt.hint}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                      {dllForm.activationMode === ACTIVATION_MODES.DRAWDOWN_AMOUNT && (
                        <div className="pm-field settings-field-nested">
                          <div className="pm-field-label hybrid-label">Activation drawdown ($)</div>
                          <input
                            type="text"
                            value={dllForm.activationDrawdown}
                            onChange={(e) => setDll("activationDrawdown", e.target.value)}
                            className="pm-text-input"
                            placeholder="500"
                          />
                          <p className="pm-field-hint">
                            Enter recovery when a single day loses at least this amount.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="settings-field-divider" />

                    <div className="settings-field-block">
                      <div className="settings-field-block-label hybrid-label-sm">Exit rule</div>
                      <p className="pm-field-hint settings-field-block-lead">
                        When do you return to full size?
                      </p>
                      <div className="settings-radio-group">
                        {EXIT_MODE_OPTIONS.map((opt) => (
                          <label key={opt.value} className="settings-radio-row">
                            <input
                              type="radio"
                              name="exitMode"
                              value={opt.value}
                              checked={dllForm.exitMode === opt.value}
                              onChange={() => setDll("exitMode", opt.value)}
                            />
                            <span>
                              <span className="settings-radio-label">{opt.label}</span>
                              <span className="pm-field-hint">{opt.hint}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                      {dllForm.exitMode === EXIT_MODES.PERCENT ? (
                        <div className="pm-field settings-field-nested">
                          <div className="pm-field-label hybrid-label">Recover before exiting (%)</div>
                          <input
                            type="text"
                            value={dllForm.exitRecoveryPercent}
                            onChange={(e) => setDll("exitRecoveryPercent", e.target.value)}
                            className="pm-text-input settings-percent-input"
                            placeholder="50"
                          />
                        </div>
                      ) : (
                        <div className="pm-field settings-field-nested">
                          <div className="pm-field-label hybrid-label">Recover before exiting ($)</div>
                          <input
                            type="text"
                            value={dllForm.exitRecoveryAmount}
                            onChange={(e) => setDll("exitRecoveryAmount", e.target.value)}
                            className="pm-text-input"
                            placeholder="400"
                          />
                          <p className="pm-field-hint">
                            Additional loss days while in recovery add to this target.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {!dllForm.recoveryEnabled && (
                  <p className="pm-field-hint settings-field-block-lead">
                    Drawdown Recovery is off. Session plan still uses your full-size max daily loss when set.
                  </p>
                )}
              </section>
            )}

            {activeSection === "accounts" && (
              <section className="pm-card settings-panel">
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

                <div className="settings-add-account">
                  <button
                    type="button"
                    className="pm-add-btn settings-add-account-btn"
                    onClick={addAccount}
                  >
                    Add New Account
                  </button>
                  <p className="pm-field-hint settings-add-account-hint">
                    Users can filter accounts on the Stats page.
                  </p>
                </div>

                <div className="settings-field-divider" />

                <div className="settings-field-block">
                  <div className="settings-field-block-label hybrid-label-sm">Close loop imports</div>
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
                      Pre-fills stop distance on every CSV import. You can still edit per trade during import preview.
                    </p>
                  </div>
                  <div className="pm-field">
                    <div className="pm-field-label hybrid-label">Breakeven threshold ($)</div>
                    <input
                      type="text"
                      value={beThreshold}
                      onChange={(e) => {
                        setBeThreshold(e.target.value);
                        markDirty();
                      }}
                      className="pm-text-input settings-default-risk-input"
                      placeholder="30"
                    />
                    <p className="pm-field-hint">
                      Trades within ±this amount count as breakeven in Analytics.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {activeSection === "dev" && showDevTools && (
              <section className="pm-card settings-panel settings-panel--dev">
                <div className="settings-field-block">
                  <div className="settings-field-block-label hybrid-label-sm">Onboarding</div>
                  <p className="pm-field-hint settings-field-block-lead">
                    Clears your onboarding-complete flag and opens the setup wizard. Profile data,
                    settings, and history are not deleted.
                  </p>
                  <button
                    type="button"
                    className="pm-btn-save-review"
                    onClick={handleReplayOnboarding}
                    disabled={replayLoading}
                  >
                    {replayLoading ? "Resetting…" : "Replay onboarding wizard"}
                  </button>
                </div>
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
    </WorkflowPageLayout>
  );
}

export default function Settings({ initialSection = "desk" }) {
  return (
    <Suspense fallback={<div className="pm-loading">Loading...</div>}>
      <SettingsInner initialSection={initialSection} />
    </Suspense>
  );
}
