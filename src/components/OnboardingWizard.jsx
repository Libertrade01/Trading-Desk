"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  loadTraderSettings,
  saveTraderSettings,
  createDefaultAccount,
  DEFAULT_TRADER_SETTINGS,
  TRADING_DAY_TIMEZONE_OPTIONS,
  DEFAULT_TRADING_DAY_TIMEZONE,
} from "../lib/trader-settings";
import {
  loadDllSettings,
  saveDllSettings,
  DEFAULT_DLL_SETTINGS,
} from "../lib/dll-recovery-settings";
import {
  loadTraderProfile,
  saveTraderProfile,
  completeOnboarding,
  createFounderDefaultProfile,
  createCustomerDefaultProfile,
  WELCOME_HINT_STORAGE_KEY,
  parsePlanRailMoney,
} from "../lib/trader-profile";
import { ACCOUNT_TYPE_OPTIONS } from "../lib/trade-import-options";
import { getCurrentUser } from "../lib/user-storage";

const STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "timezone", label: "Trading day" },
  { id: "account", label: "Account" },
  { id: "playbook", label: "Playbook" },
  { id: "commitment", label: "Commitment" },
  { id: "plan-rails", label: "Daily risk" },
  { id: "streaks", label: "Setup streaks" },
  { id: "drawdown-recovery", label: "Drawdown Recovery" },
  { id: "extras", label: "Extras" },
];

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

function detectBrowserTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TRADING_DAY_TIMEZONE_OPTIONS.some((opt) => opt.id === tz)
      ? tz
      : DEFAULT_TRADING_DAY_TIMEZONE;
  } catch {
    return DEFAULT_TRADING_DAY_TIMEZONE;
  }
}

export default function OnboardingWizard() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [error, setError] = useState("");

  const [tradingDayTimezone, setTradingDayTimezone] = useState(detectBrowserTimezone);
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("funded");
  const [setups, setSetups] = useState([{ id: crypto.randomUUID(), name: "" }]);
  const [commitments, setCommitments] = useState([
    { id: crypto.randomUUID(), text: "I respect myself enough to fully agree to follow my plan today." },
  ]);
  const [riskStreakEnabled, setRiskStreakEnabled] = useState(true);
  const [playbookStreakEnabled, setPlaybookStreakEnabled] = useState(true);
  const [streakTargetDays, setStreakTargetDays] = useState(21);
  const [biasChecklistEnabled, setBiasChecklistEnabled] = useState(false);
  const [drawdownRecoveryEnabled, setDrawdownRecoveryEnabled] = useState(
    DEFAULT_DLL_SETTINGS.recoveryEnabled
  );
  const [defaultMaxDailyLoss, setDefaultMaxDailyLoss] = useState("");
  const [defaultMaxTrades, setDefaultMaxTrades] = useState("");
  const [defaultPositionSize, setDefaultPositionSize] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/founder-migrate", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          setIsFounder(!!data.isFounder);
        }
        const profile = await loadTraderProfile();
        if (profile?.onboardingCompletedAt) {
          router.replace("/");
          return;
        }
      } catch {
        /* continue with defaults */
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const handleFounderTemplate = async () => {
    setSaving(true);
    setError("");
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not signed in");

      const founderProfile = createFounderDefaultProfile();
      await saveTraderProfile(founderProfile);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(WELCOME_HINT_STORAGE_KEY, "1");
      }

      const settings = await loadTraderSettings();
      await saveTraderSettings(settings);

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err.message || "Could not apply template");
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    setError("");
    try {
      const setupNames = setups.map((s) => s.name.trim()).filter(Boolean);
      if (!setupNames.length) {
        setError("Add at least one playbook setup.");
        setSaving(false);
        return;
      }

      const namedCommitments = commitments.map((c) => c.text.trim()).filter(Boolean);
      if (!namedCommitments.length) {
        setError("Add at least one commitment.");
        setSaving(false);
        return;
      }

      const accountLabel = accountName.trim() || "Default Account";
      const account = createDefaultAccount({
        name: accountLabel,
        account_type: accountType,
        forImport: true,
        active: true,
      });

      const currentSettings = await loadTraderSettings().catch(() => null);
      await saveTraderSettings({
        defaultRisk: currentSettings?.defaultRisk ?? DEFAULT_TRADER_SETTINGS.defaultRisk,
        tradingDayTimezone,
        accounts: [account],
      });

      const base = createCustomerDefaultProfile();
      const fullSizeDll = parsePlanRailMoney(defaultMaxDailyLoss);
      await completeOnboarding({
        ...base,
        setups: setupNames.map((name) => ({ id: crypto.randomUUID(), name })),
        commitments: namedCommitments.slice(0, 3).map((text) => ({
          id: crypto.randomUUID(),
          text,
        })),
        biasChecklistEnabled,
        riskStreakEnabled,
        playbookStreakEnabled,
        streakTargetDays: Number(streakTargetDays) || 21,
        defaultMaxDailyLoss: defaultMaxDailyLoss.trim(),
        defaultMaxTrades: defaultMaxTrades.trim(),
        defaultPositionSize: defaultPositionSize.trim(),
      });

      const dllSettings = await loadDllSettings().catch(() => ({ ...DEFAULT_DLL_SETTINGS }));
      await saveDllSettings({
        ...dllSettings,
        recoveryEnabled: drawdownRecoveryEnabled,
        ...(fullSizeDll ? { fullDll: fullSizeDll } : {}),
      });

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err.message || "Could not finish onboarding");
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (step.id === "playbook" && !setups.some((s) => s.name.trim())) {
      setError("Name at least one setup.");
      return;
    }
    if (step.id === "commitment" && !commitments.some((c) => c.text.trim())) {
      setError("Add at least one commitment.");
      return;
    }
    setError("");
    if (isLast) {
      handleFinish();
      return;
    }
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  };

  if (loading) return <div className="pm-loading onboarding-page">Loading...</div>;

  return (
    <div className="premarket-page hybrid-page onboarding-page">
      <div className="onboarding-shell">
        <div className="onboarding-progress" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`onboarding-progress-dot${i <= stepIndex ? " active" : ""}${i === stepIndex ? " current" : ""}`}
            />
          ))}
        </div>

        <div className="pm-eyebrow hybrid-eyebrow">
          {step.id === "welcome" ? "Getting started" : "Setup"} · {stepIndex + 1} of {STEPS.length}
        </div>

        {step.id === "welcome" && (
          <>
            <h1 className="hybrid-page-title">WELCOME TO LIBERTRADE PROCESS.</h1>
            <p className="pm-subtitle onboarding-lead">
              A daily trading desk for how you prepare, execute, and review — not where you place orders.
            </p>
            <div className="onboarding-welcome-card">
              <p className="onboarding-welcome-copy">
                Every session runs the same loop: <strong>check-in</strong>, <strong>session plan</strong>,{" "}
                <strong>trade your playbook</strong>, and <strong>close out</strong>. The desk tracks your
                process, risk rails, and Drawdown Recovery so good habits compound and bad days don&apos;t
                spiral.
              </p>
            </div>
            <p className="pm-field-hint onboarding-copy onboarding-setup-note">
              We&apos;ll walk through a short setup wizard next — about five minutes. You can change everything
              later in My process and Settings.
            </p>
            {isFounder && (
              <button
                type="button"
                className="pm-btn-save-review onboarding-template-btn"
                onClick={handleFounderTemplate}
                disabled={saving}
              >
                {saving ? "Applying…" : "Use Libertrade template"}
              </button>
            )}
          </>
        )}

        {step.id === "timezone" && (
          <>
            <h1 className="hybrid-page-title">TRADING DAY.</h1>
            <p className="pm-subtitle">When does your trading day roll over?</p>
            <div className="pm-field">
              <div className="pm-field-label hybrid-label">Calendar timezone</div>
              <select
                value={tradingDayTimezone}
                onChange={(e) => setTradingDayTimezone(e.target.value)}
                className="pm-text-input settings-timezone-select"
              >
                {TRADING_DAY_TIMEZONE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {step.id === "account" && (
          <>
            <h1 className="hybrid-page-title">ONE ACCOUNT.</h1>
            <p className="pm-subtitle">You can add more accounts later in Settings.</p>
            <div className="pm-field-grid">
              <div>
                <div className="pm-field-label hybrid-label">Account name</div>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="pm-text-input"
                  placeholder="50K"
                />
              </div>
              <div>
                <div className="pm-field-label hybrid-label">Account type</div>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="pm-select"
                >
                  {ACCOUNT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {step.id === "playbook" && (
          <>
            <h1 className="hybrid-page-title">START BUILDING YOUR PLAYBOOK.</h1>
            <p className="pm-subtitle onboarding-lead">
              Your setups are the strategies you trade with a plan — they show up on your session plan, close-out
              imports, and analytics so you can track playbook adherence over time.
            </p>
            <div className="onboarding-welcome-card">
              <p className="onboarding-welcome-copy">
                Add at least one setup to get started. You can name more now or add and edit them anytime in{" "}
                <strong>My process</strong> in Settings.
              </p>
              <p className="onboarding-welcome-meta">
                <strong>Improvised</strong> and <strong>Invalid</strong> are added automatically to every playbook
                for process tagging when a trade wasn&apos;t a real setup.
              </p>
            </div>
            <div className="settings-list">
              {setups.map((setup, index) => (
                <div key={setup.id} className="settings-list-row">
                  <input
                    type="text"
                    value={setup.name}
                    onChange={(e) =>
                      setSetups((rows) =>
                        rows.map((row) =>
                          row.id === setup.id ? { ...row, name: e.target.value } : row
                        )
                      )
                    }
                    className="pm-text-input"
                    placeholder={index === 0 ? "e.g. VWAP rejection" : "Another setup"}
                  />
                </div>
              ))}
            </div>
            {setups.length < 4 && (
              <button
                type="button"
                className="pm-add-btn"
                onClick={() =>
                  setSetups((rows) => [...rows, { id: crypto.randomUUID(), name: "" }])
                }
              >
                + Add another
              </button>
            )}
          </>
        )}

        {step.id === "commitment" && (
          <>
            <h1 className="hybrid-page-title">YOUR COMMITMENT.</h1>
            <p className="pm-subtitle">You&apos;ll confirm these each day on the session plan.</p>
            <div className="settings-list">
              {commitments.map((commitment) => (
                <div key={commitment.id} className="settings-list-row">
                  <textarea
                    value={commitment.text}
                    onChange={(e) =>
                      setCommitments((rows) =>
                        rows.map((row) =>
                          row.id === commitment.id ? { ...row, text: e.target.value } : row
                        )
                      )
                    }
                    className="pm-textarea"
                    rows={2}
                  />
                </div>
              ))}
            </div>
            {commitments.length < 3 && (
              <button
                type="button"
                className="pm-add-btn"
                onClick={() =>
                  setCommitments((rows) => [
                    ...rows,
                    { id: crypto.randomUUID(), text: "I will follow my plan today." },
                  ])
                }
              >
                + Add commitment
              </button>
            )}
          </>
        )}

        {step.id === "plan-rails" && (
          <>
            <h1 className="hybrid-page-title">YOUR DAILY RISK.</h1>
            <p className="pm-subtitle">
              Optional defaults for the session plan. You&apos;ll confirm or change these each morning.
            </p>
            <p className="pm-field-hint onboarding-copy">
              Full-size and recovery caps for Drawdown Recovery are set in Settings → Risk. When recovery is active, max daily loss on the plan switches automatically.
            </p>
            <div className="pm-field-grid">
              <div>
                <div className="pm-field-label hybrid-label">Usual max daily loss ($)</div>
                <input
                  type="text"
                  value={defaultMaxDailyLoss}
                  onChange={(e) => setDefaultMaxDailyLoss(e.target.value)}
                  className="pm-text-input"
                  placeholder="Optional — e.g. 750"
                />
                <p className="pm-field-hint">Also sets your full-size cap in Drawdown Recovery settings.</p>
              </div>
              <div>
                <div className="pm-field-label hybrid-label">Usual max trades</div>
                <input
                  type="text"
                  value={defaultMaxTrades}
                  onChange={(e) => setDefaultMaxTrades(e.target.value)}
                  className="pm-text-input"
                  placeholder="Optional"
                />
              </div>
              <div>
                <div className="pm-field-label hybrid-label">Usual position size</div>
                <input
                  type="text"
                  value={defaultPositionSize}
                  onChange={(e) => setDefaultPositionSize(e.target.value)}
                  className="pm-text-input"
                  placeholder="Optional — e.g. 2 MNQ"
                />
              </div>
            </div>
          </>
        )}

        {step.id === "streaks" && (
          <>
            <h1 className="hybrid-page-title">PLAYBOOK SETUP STREAKS.</h1>
            <p className="pm-subtitle onboarding-lead">
              Streaks track consecutive trading days you followed your process — shown on Home and Analytics
              toward a milestone you choose.
            </p>
            <div className="onboarding-welcome-card">
              <ul className="onboarding-feature-list">
                <li>
                  <strong>Risk adherence streak</strong> — extends when close-out shows you followed your risk plan.
                </li>
                <li>
                  <strong>Playbook streak</strong> — extends when every trade is tagged to a real setup (no invalid
                  or untagged trades).
                </li>
              </ul>
              <p className="onboarding-welcome-meta">
                Set your target below. Turn either streak off if you don&apos;t want it tracked — change anytime in{" "}
                <strong>My process</strong>.
              </p>
            </div>
            <div className="pm-toggle-row">
              <ToggleField
                label="Risk adherence streak"
                value={riskStreakEnabled}
                onChange={setRiskStreakEnabled}
              />
              <ToggleField
                label="Playbook streak"
                value={playbookStreakEnabled}
                onChange={setPlaybookStreakEnabled}
              />
            </div>
            <div className="pm-field">
              <div className="pm-field-label hybrid-label">Streak target (days)</div>
              <input
                type="number"
                min={1}
                max={365}
                value={streakTargetDays}
                onChange={(e) => setStreakTargetDays(Number(e.target.value) || 21)}
                className="pm-number-input"
              />
            </div>
          </>
        )}

        {step.id === "drawdown-recovery" && (
          <>
            <h1 className="hybrid-page-title">DRAWDOWN RECOVERY.</h1>
            <p className="pm-subtitle onboarding-lead">
              A built-in protocol for bad loss days that downshifts you to half size until you&apos;ve earned your way back.
            </p>
            <div className="onboarding-feature-card">
              <p className="onboarding-feature-copy">
                When a session hits your loss threshold, Drawdown Recovery activates. Your next session plan caps at a lower max daily loss, and the desk tracks how much of the drawdown you&apos;ve recovered before you return to full size.
              </p>
              <ul className="onboarding-feature-list">
                <li>Triggers on a full daily loss or a custom drawdown amount</li>
                <li>Exits on a drawdown % or a fixed dollar amount recovered</li>
                <li>Session plan won&apos;t save above your recovery cap while active</li>
              </ul>
            </div>
            <ToggleField
              label="Enable Drawdown Recovery"
              hint="Default rules work for most traders. Customize activation, exit, and dollar amounts in Settings → Risk."
              value={drawdownRecoveryEnabled}
              onChange={setDrawdownRecoveryEnabled}
            />
          </>
        )}

        {step.id === "extras" && (
          <>
            <h1 className="hybrid-page-title">OPTIONAL EXTRAS.</h1>
            <p className="pm-subtitle">Behavioral flags and more are in My process anytime.</p>
            <ToggleField
              label="Chart annotation checklist"
              hint="Turn on now or skip — you edit the checklist items later in My process (Settings). Examples: value area marked, nodes/LVNs, weekly profile."
              value={biasChecklistEnabled}
              onChange={setBiasChecklistEnabled}
            />
          </>
        )}

        {error && <p className="onboarding-error">{error}</p>}

        <div className="onboarding-nav">
          {!isFirst && (
            <button
              type="button"
              className="pm-btn-link"
              onClick={() => {
                setError("");
                setStepIndex((i) => Math.max(0, i - 1));
              }}
              disabled={saving}
            >
              Back
            </button>
          )}
          <div className="onboarding-nav-right">
            {step.id === "extras" && (
              <button
                type="button"
                className="pm-btn-link"
                onClick={handleFinish}
                disabled={saving}
              >
                Skip to Home
              </button>
            )}
            <button
              type="button"
              className="pm-btn-primary-sm"
              onClick={goNext}
              disabled={saving}
            >
              {saving ? "Saving…" : isLast ? "Finish" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
