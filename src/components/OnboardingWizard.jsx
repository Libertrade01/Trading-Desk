"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  loadTraderSettings,
  saveTraderSettings,
  createDefaultAccount,
  DEFAULT_TRADER_SETTINGS,
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
  DEFAULT_COMMITMENT,
  WELCOME_HINT_STORAGE_KEY,
  parsePlanRailMoney,
} from "../lib/trader-profile";
import { ACCOUNT_TYPE_OPTIONS } from "../lib/trade-import-options";
import { getCurrentUser } from "../lib/user-storage";
import OnboardingLoopPreview from "./OnboardingLoopPreview";
import OnboardingWelcome from "./OnboardingWelcome";
import OnboardingFlowLayout, {
  OnboardingSectionProgress,
  OnboardingStepHeader,
  OnboardingStepNav,
} from "./OnboardingFlowLayout";
import { ONBOARDING_STEP_COPY } from "../lib/onboarding-step-copy";
import BrandWordmark from "./BrandWordmark";

const STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "account", label: "Account" },
  { id: "playbook", label: "Playbook" },
  { id: "commitment", label: "Commitment" },
  { id: "plan-rails", label: "Daily risk" },
  { id: "drawdown-recovery", label: "Drawdown Recovery" },
  { id: "streaks", label: "Setup streaks" },
  { id: "extras", label: "Extras" },
];

const ONBOARDING_SECTIONS = [
  { id: "basics", label: "Basics", steps: ["account"] },
  { id: "process", label: "Your process", steps: ["playbook", "commitment"] },
  { id: "risk", label: "Risk rails", steps: ["plan-rails", "drawdown-recovery"] },
  { id: "finish", label: "Finish", steps: ["streaks", "extras"] },
];

function resolveOnboardingSection(stepId) {
  if (stepId === "welcome") return null;
  const index = ONBOARDING_SECTIONS.findIndex((section) => section.steps.includes(stepId));
  if (index < 0) return null;
  return { ...ONBOARDING_SECTIONS[index], index };
}

const BROWSER_LOCAL_TRADING_DAY = "local";

const previewProps = ({
  step,
  accountName,
  setups,
  defaultMaxDailyLoss,
  defaultMaxTrades,
  defaultPositionSize,
  drawdownRecoveryEnabled,
}) => ({
  variant: "hero",
  stepId: step.id,
  tradingDayTimezone: BROWSER_LOCAL_TRADING_DAY,
  accountName,
  setups,
  defaultMaxDailyLoss,
  defaultMaxTrades,
  defaultPositionSize,
  drawdownRecoveryEnabled,
});

function primaryCtaLabel(step, { saving, isLast }) {
  if (saving) return "Saving…";
  if (step.id === "welcome") return "Build my loop";
  if (isLast) return "Finish setup";
  return "Continue";
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

export default function OnboardingWizard() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [error, setError] = useState("");

  const [accountName, setAccountName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [accountType, setAccountType] = useState("funded");
  const [setups, setSetups] = useState([{ id: crypto.randomUUID(), name: "" }]);
  const [commitments, setCommitments] = useState([
    { id: crypto.randomUUID(), text: DEFAULT_COMMITMENT },
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
          router.replace("/home");
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
  const activeSection = resolveOnboardingSection(step.id);
  const ctaLabel = primaryCtaLabel(step, { saving, isLast });

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

      router.replace("/home");
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
        tradingDayTimezone: BROWSER_LOCAL_TRADING_DAY,
        accounts: [account],
      });

      const base = createCustomerDefaultProfile();
      const fullSizeDll = parsePlanRailMoney(defaultMaxDailyLoss);
      await completeOnboarding({
        ...base,
        preferredName: preferredName.trim(),
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

      router.replace("/home");
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

  if (loading) return <div className="pm-loading onboarding-page onboarding-page--flow">Loading...</div>;

  if (step.id === "welcome") {
    return (
      <div className="premarket-page hybrid-page onboarding-page onboarding-page--flow">
        <BrandWordmark className="onboarding-page-brand" size="sidebar" />
        <div className="onboarding-welcome-glow" aria-hidden="true" />
        <div className="onboarding-welcome-layout">
          <OnboardingWelcome
            onContinue={goNext}
            saving={saving}
            error={error}
            isFounder={isFounder}
            onFounderTemplate={handleFounderTemplate}
          />
          <OnboardingLoopPreview
            variant="hero"
            stepId={step.id}
            tradingDayTimezone={BROWSER_LOCAL_TRADING_DAY}
            accountName={accountName}
            setups={setups}
            defaultMaxDailyLoss={defaultMaxDailyLoss}
            defaultMaxTrades={defaultMaxTrades}
            defaultPositionSize={defaultPositionSize}
            drawdownRecoveryEnabled={drawdownRecoveryEnabled}
          />
        </div>
      </div>
    );
  }

  const stepCopy = ONBOARDING_STEP_COPY[step.id];
  const loopPreview = (
    <OnboardingLoopPreview
      {...previewProps({
        step,
        accountName,
        setups,
        defaultMaxDailyLoss,
        defaultMaxTrades,
        defaultPositionSize,
        drawdownRecoveryEnabled,
      })}
    />
  );

  return (
    <OnboardingFlowLayout preview={loopPreview}>
      {activeSection && (
        <OnboardingSectionProgress
          sections={ONBOARDING_SECTIONS}
          activeIndex={activeSection.index}
        />
      )}

      {stepCopy && (
        <OnboardingStepHeader
          title={stepCopy.title}
          lead={stepCopy.lead}
        />
      )}

        {step.id === "account" && (
          <>
            <div className="pm-field">
              <div className="pm-field-label hybrid-label">What should we call you?</div>
              <input
                type="text"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                className="pm-text-input"
                placeholder="Mike"
                autoComplete="nickname"
              />
              <p className="pm-field-hint">Optional — used in your Home greeting.</p>
            </div>
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
            <div className="onboarding-flow-panel">
              <p className="onboarding-body-copy">
                Add at least one setup now, or add more anytime later. Improvised and Invalid are included
                automatically for trades that weren&apos;t a real setup.
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
                    placeholder={index === 0 ? "e.g. Break and Retest" : "Another setup"}
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
            <p className="onboarding-body-copy onboarding-body-copy--compact">
              recovery mode feature
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
                <p className="pm-field-hint">Also sets your full-size cap when recovery mode is on.</p>
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
                <div className="pm-field-label hybrid-label">Usual position size ($ or contracts)</div>
                <input
                  type="text"
                  value={defaultPositionSize}
                  onChange={(e) => setDefaultPositionSize(e.target.value)}
                  className="pm-text-input"
                  placeholder="e.g. $200 or 8 micros"
                />
              </div>
            </div>
          </>
        )}

        {step.id === "drawdown-recovery" && (
          <>
            <div className="onboarding-flow-panel">
              <p className="onboarding-body-copy">
                When a session hits your loss threshold, recovery mode activates. Your next session plan caps at
                a lower max daily loss until you&apos;ve recovered enough to return to full size.
              </p>
              <ul className="onboarding-feature-list">
                <li>Triggers on a full daily loss or a custom drawdown amount</li>
                <li>Exits on a drawdown % or a fixed dollar amount recovered</li>
                <li>Session plan won&apos;t save above your recovery cap while active</li>
              </ul>
            </div>
            <ToggleField
              label="Enable recovery mode"
              hint="Default rules work for most traders. Fine-tune activation and exit rules anytime."
              value={drawdownRecoveryEnabled}
              onChange={setDrawdownRecoveryEnabled}
            />
          </>
        )}

        {step.id === "streaks" && (
          <>
            <div className="onboarding-flow-panel">
              <ul className="onboarding-feature-list">
                <li>
                  <strong>Risk streak</strong> — extends when close loop shows you stayed inside your risk limits.
                </li>
                <li>
                  <strong>Playbook streak</strong> — extends when every trade is tagged to a real setup.
                </li>
              </ul>
            </div>
            <p className="onboarding-body-copy onboarding-body-copy--compact onboarding-flow-panel-note">
              Set your target below. Turn either streak off if you don&apos;t want it tracked.
            </p>
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

        {step.id === "extras" && (
          <>
            <ToggleField
              label="Chart annotation checklist"
              hint="Examples: value area marked, nodes/LVNs, weekly profile. Edit the list anytime."
              value={biasChecklistEnabled}
              onChange={setBiasChecklistEnabled}
            />
          </>
        )}

        {error && <p className="onboarding-error">{error}</p>}

        <OnboardingStepNav
          showBack={!isFirst}
          onBack={() => {
            setError("");
            setStepIndex((i) => Math.max(0, i - 1));
          }}
          onPrimary={goNext}
          primaryLabel={ctaLabel}
          saving={saving}
          secondaryAction={
            step.id === "extras" ? (
              <button
                type="button"
                className="onboarding-flow-skip"
                onClick={handleFinish}
                disabled={saving}
              >
                Skip to Home
              </button>
            ) : null
          }
        />
    </OnboardingFlowLayout>
  );
}
