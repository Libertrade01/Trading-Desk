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
  ACTIVATION_MODES,
  ACTIVATION_MODE_OPTIONS,
  EXIT_MODES,
  EXIT_MODE_OPTIONS,
  validateDllSettingsInput,
} from "../lib/dll-recovery-settings";
import {
  loadTraderProfile,
  completeOnboarding,
  createCustomerDefaultProfile,
  DEFAULT_COMMITMENT,
  wearableConsentPatch,
} from "../lib/trader-profile";
import OnboardingFlowLayout, {
  OnboardingSectionProgress,
  OnboardingStepHeader,
  OnboardingStepNav,
  OnboardingBrand,
} from "./OnboardingFlowLayout";
import { ONBOARDING_STEP_COPY } from "../lib/onboarding-step-copy";

const STEPS = [
  { id: "account", label: "Account" },
  { id: "playbook", label: "Playbook" },
  { id: "drawdown-recovery", label: "Drawdown Recovery" },
  { id: "streaks", label: "Setup streaks" },
  { id: "extras", label: "Extras" },
  { id: "commitment", label: "Commitment" },
];

const ONBOARDING_SECTIONS = [
  { id: "basics", label: "Basics", steps: ["account"] },
  { id: "process", label: "Your process", steps: ["playbook"] },
  { id: "risk", label: "Recovery", steps: ["drawdown-recovery"] },
  { id: "habits", label: "Habits", steps: ["streaks", "extras"] },
  { id: "commitment", label: "Commitment", steps: ["commitment"] },
];

function resolveOnboardingSection(stepId) {
  const index = ONBOARDING_SECTIONS.findIndex((section) => section.steps.includes(stepId));
  if (index < 0) return null;
  return { ...ONBOARDING_SECTIONS[index], index };
}

const BROWSER_LOCAL_TRADING_DAY = "local";

const ONBOARDING_ACCOUNT_TYPES = [
  { value: "funded", label: "Prop" },
  { value: "cash", label: "Cash" },
];

function primaryCtaLabel(step, { saving, isLast }) {
  if (saving) return "Saving…";
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
  const [error, setError] = useState("");

  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("funded");
  const [setups, setSetups] = useState([{ id: crypto.randomUUID(), name: "" }]);
  const [commitments, setCommitments] = useState([
    { id: crypto.randomUUID(), text: DEFAULT_COMMITMENT },
  ]);
  const [riskStreakEnabled, setRiskStreakEnabled] = useState(true);
  const [playbookStreakEnabled, setPlaybookStreakEnabled] = useState(true);
  const [streakTargetEnabled, setStreakTargetEnabled] = useState(true);
  const [streakTargetDays, setStreakTargetDays] = useState(21);
  const [biasChecklistEnabled, setBiasChecklistEnabled] = useState(false);
  const [usesWearable, setUsesWearable] = useState(false);
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

  const setDll = (key, value) => setDllForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    (async () => {
      try {
        const profile = await loadTraderProfile();
        if (profile?.onboardingCompletedAt) {
          router.replace("/home");
          return;
        }
        const dll = await loadDllSettings();
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

  useEffect(() => {
    const page = document.querySelector(".onboarding-page--flow");
    if (page) page.scrollTop = 0;
  }, [stepIndex]);

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

      const dllCheck = validateDllSettingsInput(dllForm);
      if (!dllCheck.ok) {
        setError(dllCheck.message);
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

      const currentProfile = await loadTraderProfile();
      const base = createCustomerDefaultProfile();
      await completeOnboarding({
        ...base,
        preferredName: currentProfile.preferredName,
        setups: setupNames.map((name) => ({ id: crypto.randomUUID(), name })),
        commitments: namedCommitments.slice(0, 3).map((text) => ({
          id: crypto.randomUUID(),
          text,
        })),
        biasChecklistEnabled,
        ...wearableConsentPatch(usesWearable),
        riskStreakEnabled,
        playbookStreakEnabled,
        streakTargetDays: streakTargetEnabled ? Number(streakTargetDays) || 21 : null,
      });

      await saveDllSettings(dllCheck.settings);

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
    if (step.id === "drawdown-recovery") {
      const dllCheck = validateDllSettingsInput(dllForm);
      if (!dllCheck.ok) {
        setError(dllCheck.message);
        return;
      }
    }
    setError("");
    if (isLast) {
      handleFinish();
      return;
    }
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  };

  if (loading) return <div className="pm-loading onboarding-page onboarding-page--flow">Loading...</div>;

  const stepCopy = ONBOARDING_STEP_COPY[step.id];
  return (
    <OnboardingFlowLayout>
      {activeSection && (
        <OnboardingSectionProgress
          currentStep={stepIndex + 1}
          totalSteps={STEPS.length}
          sectionLabel={activeSection.label}
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
            <div className="pm-field-grid">
              <div>
                <div className="pm-field-label hybrid-label">Account name</div>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="pm-text-input"
                  placeholder="Funded 50K"
                />
              </div>
              <div>
                <div className="pm-field-label hybrid-label">Account type</div>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="pm-select"
                >
                  {ONBOARDING_ACCOUNT_TYPES.map((o) => (
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
              hint="When enabled, set the limits, activation rule, and the point where you return to full size."
              value={dllForm.recoveryEnabled}
              onChange={(value) => setDll("recoveryEnabled", value)}
            />
            {dllForm.recoveryEnabled && (
              <div className="onboarding-recovery-config">
                <div className="onboarding-recovery-section">
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
                    </div>
                    <div>
                      <div className="pm-field-label hybrid-label">Recovery max daily loss ($)</div>
                      <input
                        type="text"
                        value={dllForm.halfDll}
                        onChange={(e) => setDll("halfDll", e.target.value)}
                        className="pm-text-input"
                        placeholder="400"
                      />
                    </div>
                  </div>
                </div>

                <div className="onboarding-recovery-section">
                  <div className="settings-field-block-label hybrid-label-sm">When should recovery mode activate?</div>
                  <select
                    className="pm-select"
                    value={dllForm.activationMode}
                    onChange={(e) => setDll("activationMode", e.target.value)}
                  >
                    {ACTIVATION_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {dllForm.activationMode === ACTIVATION_MODES.DRAWDOWN_AMOUNT && (
                    <div className="pm-field onboarding-recovery-nested">
                      <div className="pm-field-label hybrid-label">Activation drawdown ($)</div>
                      <input
                        type="text"
                        value={dllForm.activationDrawdown}
                        onChange={(e) => setDll("activationDrawdown", e.target.value)}
                        className="pm-text-input"
                        placeholder="750"
                      />
                    </div>
                  )}
                </div>

                <div className="onboarding-recovery-section">
                  <div className="settings-field-block-label hybrid-label-sm">When do you return to full size?</div>
                  <select
                    className="pm-select"
                    value={dllForm.exitMode}
                    onChange={(e) => setDll("exitMode", e.target.value)}
                  >
                    {EXIT_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {dllForm.exitMode === EXIT_MODES.PERCENT ? (
                    <div className="pm-field onboarding-recovery-nested">
                      <div className="pm-field-label hybrid-label">Recover before exiting (%)</div>
                      <input
                        type="text"
                        value={dllForm.exitRecoveryPercent}
                        onChange={(e) => setDll("exitRecoveryPercent", e.target.value)}
                        className="pm-text-input"
                        placeholder="50"
                      />
                    </div>
                  ) : (
                    <div className="pm-field onboarding-recovery-nested">
                      <div className="pm-field-label hybrid-label">Recover before exiting ($)</div>
                      <input
                        type="text"
                        value={dllForm.exitRecoveryAmount}
                        onChange={(e) => setDll("exitRecoveryAmount", e.target.value)}
                        className="pm-text-input"
                        placeholder="400"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
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
                  <strong>Playbook setup streak</strong> — extends when every trade is tagged to a real setup.
                </li>
              </ul>
            </div>
            <p className="onboarding-body-copy onboarding-body-copy--compact onboarding-flow-panel-note">
              Choose which streaks to track. Add a target if you want a visible goal.
            </p>
            <div className="pm-toggle-row">
              <ToggleField
                label="Risk adherence streak"
                value={riskStreakEnabled}
                onChange={setRiskStreakEnabled}
              />
              <ToggleField
                label="Playbook setup streak"
                value={playbookStreakEnabled}
                onChange={setPlaybookStreakEnabled}
              />
            </div>
            <div className="onboarding-streak-target">
              <ToggleField
                label="Set a streak target"
                hint="When off, Home shows the streak count only. When on, it shows progress toward a goal such as 9/21."
                value={streakTargetEnabled}
                onChange={setStreakTargetEnabled}
              />
              {streakTargetEnabled && (
                <div className="pm-field onboarding-streak-target-days">
                  <div className="pm-field-label hybrid-label">Target days</div>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={streakTargetDays}
                    onChange={(e) => setStreakTargetDays(Number(e.target.value) || 21)}
                    className="pm-number-input"
                  />
                </div>
              )}
            </div>
          </>
        )}

        {step.id === "extras" && (
          <>
            <ToggleField
              label="Do you own a wearable and want to track HRV and sleep debt?"
              hint="Optional. Enabling this adds HRV and Sleep Debt to Check-in. By enabling it, you consent to Libertrade storing and using those wellbeing readings for your readiness scores and reviews. You can turn it off in Settings."
              value={usesWearable}
              onChange={setUsesWearable}
            />
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
        />
    </OnboardingFlowLayout>
  );
}
