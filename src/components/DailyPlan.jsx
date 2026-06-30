"use client";

import { useState, useEffect, useCallback } from "react";
import { storage } from "../lib/supabase";
import {
  BIAS_OPTIONS,
  VOLATILITY_OPTIONS,
  LEVEL_TYPE_OPTIONS,
  DEFAULT_DAILY_PLAN,
  newKeyLevel,
  newSetup,
} from "../lib/daily-plan-defaults";
import {
  loadRecoveryState,
  getRecoveryStatus,
  formatRecoveryProgress,
  formatRecoveryUsd,
  validatePlanMaxDailyLoss,
} from "../lib/dll-recovery";
import { loadDllSettings, DEFAULT_DLL_SETTINGS } from "../lib/dll-recovery-settings";
import { notifySessionSaved } from "../lib/session-events";
import { todayKey } from "../lib/today-key";
import {
  loadTraderProfile,
  PROFILE_UPDATED_EVENT,
  getPlaybookSetupNames,
  getEnabledBiasItems,
  riskRailsReady,
  biasChecklistReady,
  commitmentsReady,
  migratePlanCommitments,
  applyPlanRailDefaults,
  parsePlanRailMoney,
} from "../lib/trader-profile";
import DailyPlanStepper, { PLAN_STEPS } from "./DailyPlanStepper";

async function loadData(key, fallback) {
  try {
    const r = await storage.get(key);
    return r ? JSON.parse(r.value) : fallback;
  } catch {
    return fallback;
  }
}

async function saveData(key, value) {
  try {
    await storage.set(key, JSON.stringify(value));
  } catch (e) {
    console.error("Save:", e);
  }
}

function headerDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();
}

function sectionDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).toUpperCase();
}

function TrashButton({ onClick }) {
  return (
    <button type="button" className="pm-icon-btn" onClick={onClick} aria-label="Remove">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 4h10M5.5 4V3a1 1 0 011-1h3a1 1 0 011 1v1M6 7v4M10 7v4M4 4l.5 9a1 1 0 001 1h5a1 1 0 001-1L12 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
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

function PlanProgressMetrics({ form, profile }) {
  const biasItems = getEnabledBiasItems(profile);
  const chartMarks = biasItems.filter((item) => form[item.fieldKey]).length;
  const chartTotal = biasItems.length || 0;
  const riskTotal = profile?.showColdTurkeyBlocker ? 2 : 1;
  const riskRails =
    (form.maxDailyLossSetInBroker ? 1 : 0) +
    (profile?.showColdTurkeyBlocker && form.coldTurkeyBlockerSet ? 1 : 0);
  const commitmentTotal = profile?.commitments?.length || 0;
  const commitments = commitmentTotal
    ? Object.values(form.commitmentAccepted || {}).filter(Boolean).length
    : 0;

  return (
    <aside className="pm-plan-metrics" aria-label="Plan completion">
      {chartTotal > 0 && (
        <div className="pm-plan-metrics-row">
          <span className="pm-plan-metrics-label hybrid-label-sm">Chart annotations</span>
          <span className="pm-plan-metrics-value">
            <span className={chartMarks === chartTotal ? "pos" : ""}>{chartMarks}</span>
            <span className="pm-plan-metrics-muted"> / {chartTotal}</span>
          </span>
        </div>
      )}
      <div className="pm-plan-metrics-row">
        <span className="pm-plan-metrics-label hybrid-label-sm">Risk rails</span>
        <span className="pm-plan-metrics-value">
          <span className={riskRails === riskTotal ? "pos" : ""}>{riskRails}</span>
          <span className="pm-plan-metrics-muted"> / {riskTotal}</span>
        </span>
      </div>
      {commitmentTotal > 0 && (
        <div className="pm-plan-metrics-row">
          <span className="pm-plan-metrics-label hybrid-label-sm">Commitments</span>
          <span className="pm-plan-metrics-value">
            <span className={commitments === commitmentTotal ? "pos" : commitments > 0 ? "" : "neg"}>
              {commitments}
            </span>
            <span className="pm-plan-metrics-muted"> / {commitmentTotal}</span>
          </span>
        </div>
      )}
    </aside>
  );
}

const RISK_RAILS_MESSAGE = "I can not trade until risk rails are in place";
const BIAS_CHECKLIST_MESSAGE = "Complete the chart annotation checklist before saving the plan.";
const COMMITMENT_MESSAGE = "Confirm all commitments before saving the plan.";
const BIAS_GUIDANCE =
  "This is the bias of my plan — where is price in relation to these levels? Where is volume building and where does price not want to go?";

export default function DailyPlan({ onBack }) {
  const [form, setForm] = useState(DEFAULT_DAILY_PLAN);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState(null);
  const [dllSettings, setDllSettings] = useState(DEFAULT_DLL_SETTINGS);
  const [activeStep, setActiveStep] = useState(0);

  const set = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }, []);

  const step = PLAN_STEPS[activeStep];
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === PLAN_STEPS.length - 1;

  useEffect(() => {
    (async () => {
      const [data, recoveryState, settings, traderProfile] = await Promise.all([
        loadData(`daily-plan-${todayKey()}`, null),
        loadRecoveryState(),
        loadDllSettings(),
        loadTraderProfile(),
      ]);
      setProfile(traderProfile);
      setDllSettings(settings);
      const status = getRecoveryStatus(recoveryState, settings);
      setRecoveryStatus(status);

      let next = migratePlanCommitments(
        { ...DEFAULT_DAILY_PLAN, ...(data || {}) },
        traderProfile
      );
      if (
        status.active &&
        (!next.maxDailyLoss || !next.dllRecoveryApplied)
      ) {
        next = {
          ...next,
          maxDailyLoss: String(status.effectiveMaxDailyLoss),
          dllRecoveryApplied: false,
        };
      } else {
        next = applyPlanRailDefaults(next, traderProfile);
      }
      setForm(next);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const refreshProfile = () => {
      loadTraderProfile({ force: true }).then(setProfile).catch(() => {});
    };
    window.addEventListener(PROFILE_UPDATED_EVENT, refreshProfile);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, refreshProfile);
  }, []);

  const persistPlan = useCallback(async (formData, recoveryActive = recoveryStatus?.active) => {
    await saveData(`daily-plan-${todayKey()}`, {
      date: todayKey(),
      ...formData,
      dllRecoveryApplied: recoveryActive ? true : formData.dllRecoveryApplied,
      savedAt: new Date().toISOString(),
    });
    notifySessionSaved();
  }, [recoveryStatus]);

  const handleSave = async () => {
    if (!riskRailsReady(form, profile)) {
      window.alert(RISK_RAILS_MESSAGE);
      return false;
    }
    if (!biasChecklistReady(form, profile)) {
      window.alert(BIAS_CHECKLIST_MESSAGE);
      return false;
    }
    if (!commitmentsReady(form, profile)) {
      window.alert(COMMITMENT_MESSAGE);
      return false;
    }

    const recoveryState = await loadRecoveryState();
    const settings = await loadDllSettings();
    setDllSettings(settings);
    const status = getRecoveryStatus(recoveryState, settings);
    setRecoveryStatus(status);
    const dllCheck = validatePlanMaxDailyLoss(form.maxDailyLoss, recoveryState, settings);
    if (!dllCheck.ok) {
      window.alert(dllCheck.message);
      return false;
    }

    await persistPlan(form, status.active);
    setSaved(true);
    return true;
  };

  const handleReturn = async () => {
    const ok = await handleSave();
    if (ok) onBack();
  };

  const handleReset = () => {
    setForm(DEFAULT_DAILY_PLAN);
    setSaved(false);
    setActiveStep(0);
  };

  const addLevel = () => set("keyLevels", [...form.keyLevels, newKeyLevel()]);
  const updateLevel = (id, patch) =>
    set("keyLevels", form.keyLevels.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLevel = (id) => set("keyLevels", form.keyLevels.filter((l) => l.id !== id));

  const addSetup = () => set("setups", [...form.setups, newSetup()]);
  const updateSetup = (id, patch) =>
    set("setups", form.setups.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeSetup = (id) => set("setups", form.setups.filter((s) => s.id !== id));

  if (loading || !profile) return <div className="pm-loading">Loading...</div>;

  const playbookSetups = getPlaybookSetupNames(profile);
  const biasItems = getEnabledBiasItems(profile);
  const commitmentList = profile.commitments || [];

  return (
    <div className="premarket-page hybrid-page">
      <div className="pm-topbar">
        <span>{headerDate()}</span>
      </div>

      <div className="pm-plan-layout">
        <div className="pm-plan-main">
          <div className="pm-plan-header-row">
            <div className="pm-header">
              <div className="pm-eyebrow hybrid-eyebrow">Session plan · {sectionDate()}</div>
              <h1 className="hybrid-page-title">THE PLAN.</h1>
              <p className="pm-subtitle">Lock in bias, levels, and risk before the open.</p>
            </div>
            <PlanProgressMetrics form={form} profile={profile} />
          </div>

          {recoveryStatus?.active && (
            <div className="pm-closeout-context-strip pm-closeout-context-strip--recovery">
              <span className="hybrid-label-sm">Drawdown Recovery</span>
              <p>
                Use max daily loss of {formatRecoveryUsd(recoveryStatus.effectiveMaxDailyLoss)} today (recovery cap).
                {formatRecoveryProgress(recoveryStatus)
                  ? ` ${formatRecoveryProgress(recoveryStatus)}.`
                  : ""}
              </p>
            </div>
          )}

          <DailyPlanStepper activeIndex={activeStep} onSelect={setActiveStep} />

          <div className="pm-plan-stage">
            <div className="pm-section-panel">
              <div className="pm-section-panel-head">
                <div>
                  <h2 className="pm-section-title hybrid-section-title">{step.label}</h2>
                  <p className="pm-section-desc">{step.desc}</p>
                </div>
                <span className="pm-section-step hybrid-label-sm">
                  {activeStep + 1} of {PLAN_STEPS.length}
                </span>
              </div>

              <div className="pm-section-panel-body">
                {step.id === "bias" && (
                  <>
                    {biasItems.length > 0 && (
                      <div className="pm-field">
                        <div className="pm-field-label hybrid-label">Profiles</div>
                        <p className="pm-field-hint pm-bias-guidance">{BIAS_GUIDANCE}</p>
                        <div className="pm-bias-checklist">
                          {biasItems.map((item) => (
                            <label key={item.id} className="pm-commitment-check">
                              <input
                                type="checkbox"
                                checked={!!form[item.fieldKey]}
                                onChange={(e) => set(item.fieldKey, e.target.checked)}
                              />
                              <span className="pm-commitment-text">{item.label}</span>
                            </label>
                          ))}
                        </div>
                        <p className="pm-commitment-hint">All items required to save today&apos;s plan.</p>
                      </div>
                    )}
                    <div className="pm-field">
                      <div className="pm-field-label hybrid-label">Directional bias</div>
                      <select value={form.directionalBias} onChange={(e) => set("directionalBias", e.target.value)} className="pm-select">
                        {BIAS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="pm-field">
                      <div className="pm-field-label hybrid-label">Why this bias</div>
                      <textarea
                        value={form.whyBias}
                        onChange={(e) => set("whyBias", e.target.value)}
                        className="pm-textarea"
                        placeholder="Overnight action, key levels, news, ranges..."
                        rows={4}
                      />
                    </div>
                  </>
                )}

                {step.id === "levels" && (
                  <>
                    {form.keyLevels.length === 0 ? (
                      <div className="pm-empty">No levels yet. Add the prices that bracket your day.</div>
                    ) : (
                      <div className="pm-level-compact-list">
                        <div className="pm-level-compact-head hybrid-label-sm" aria-hidden="true">
                          <span>Label</span>
                          <span>Price</span>
                          <span>Type</span>
                          <span />
                        </div>
                        {form.keyLevels.map((level) => (
                          <div key={level.id} className="pm-level-compact-row">
                            <input
                              type="text"
                              value={level.label}
                              onChange={(e) => updateLevel(level.id, { label: e.target.value })}
                              className="pm-text-input"
                              placeholder="ONH"
                              aria-label="Level label"
                            />
                            <input
                              type="text"
                              value={level.price}
                              onChange={(e) => updateLevel(level.id, { price: e.target.value })}
                              className="pm-text-input pm-level-compact-price"
                              placeholder="0"
                              aria-label="Level price"
                            />
                            <select
                              value={level.type}
                              onChange={(e) => updateLevel(level.id, { type: e.target.value })}
                              className="pm-select"
                              aria-label="Level type"
                            >
                              {LEVEL_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <TrashButton onClick={() => removeLevel(level.id)} />
                          </div>
                        ))}
                      </div>
                    )}
                    <button type="button" className="pm-add-btn" onClick={addLevel}>+ Add level</button>
                  </>
                )}

                {step.id === "setups" && (
                  <>
                    <ul className="pm-valid-setups pm-valid-setups--inline">
                      {playbookSetups.map((setup) => (
                        <li key={setup}>{setup}</li>
                      ))}
                    </ul>
                    {form.setups.length === 0 ? (
                      <div className="pm-empty">No setups yet. Define what you&apos;re hunting today.</div>
                    ) : (
                      form.setups.map((setup) => (
                        <div key={setup.id} className="pm-setup-card">
                          <TrashButton onClick={() => removeSetup(setup.id)} />
                          <div className="pm-field">
                            <div className="pm-field-label hybrid-label">Setup name</div>
                            <input
                              type="text"
                              value={setup.name}
                              onChange={(e) => updateSetup(setup.id, { name: e.target.value })}
                              className="pm-text-input"
                              placeholder="VWAP rejection short"
                            />
                          </div>
                          <div className="pm-field">
                            <div className="pm-field-label hybrid-label">Conditions</div>
                            <textarea
                              value={setup.conditions}
                              onChange={(e) => updateSetup(setup.id, { conditions: e.target.value })}
                              className="pm-textarea"
                              placeholder="What needs to be true to take this trade"
                              rows={3}
                            />
                          </div>
                          <div className="pm-field-grid">
                            <div>
                              <div className="pm-field-label hybrid-label">Target</div>
                              <input
                                type="text"
                                value={setup.target}
                                onChange={(e) => updateSetup(setup.id, { target: e.target.value })}
                                className="pm-text-input"
                                placeholder="VWAP - 1.5 std"
                              />
                            </div>
                            <div>
                              <div className="pm-field-label hybrid-label">Stop</div>
                              <input
                                type="text"
                                value={setup.stop}
                                onChange={(e) => updateSetup(setup.id, { stop: e.target.value })}
                                className="pm-text-input"
                                placeholder="Above prior swing high"
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <button type="button" className="pm-add-btn" onClick={addSetup}>+ Add setup</button>
                  </>
                )}

                {step.id === "risk" && (
                  <>
                    <div className="pm-field pm-risk-dd-field">
                      <div className="pm-field-label hybrid-label">DD from high water mark (%)</div>
                      <input
                        type="text"
                        value={form.ddFromHighWaterMark}
                        onChange={(e) => set("ddFromHighWaterMark", e.target.value)}
                        className="pm-text-input"
                        placeholder="This determines risk and sizing"
                      />
                    </div>
                    <div className="pm-field">
                      <div className="pm-field-label hybrid-label">Expected volatility</div>
                      <select value={form.expectedVolatility} onChange={(e) => set("expectedVolatility", e.target.value)} className="pm-select">
                        {VOLATILITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="pm-field-grid">
                      <div>
                        <div className="pm-field-label hybrid-label">Max daily loss ($)</div>
                        <input type="text" value={form.maxDailyLoss} onChange={(e) => set("maxDailyLoss", e.target.value)} className="pm-text-input" placeholder="Must be set from broker" />
                        <p className="pm-field-hint">
                          {recoveryStatus?.active
                            ? `Recovery limit: ${formatRecoveryUsd(recoveryStatus.effectiveMaxDailyLoss)} max — plan won't save above this.`
                            : `Full-size limit: ${formatRecoveryUsd(dllSettings.fullDll)} max — plan won't save above this.`}
                        </p>
                      </div>
                      <div>
                        <div className="pm-field-label hybrid-label">Max trades</div>
                        <input type="text" value={form.maxTrades} onChange={(e) => set("maxTrades", e.target.value)} className="pm-text-input" />
                      </div>
                      <div>
                        <div className="pm-field-label hybrid-label">Position size ($ or contracts)</div>
                        <input type="text" value={form.positionSize} onChange={(e) => set("positionSize", e.target.value)} className="pm-text-input" placeholder="$500 or 2 MNQ" />
                      </div>
                      <div>
                        <div className="pm-field-label hybrid-label">Stop trading at</div>
                        <input type="text" value={form.stopTradingAt} onChange={(e) => set("stopTradingAt", e.target.value)} className="pm-text-input" placeholder="11:00 AM ET, or after 2 losses" />
                      </div>
                    </div>
                    <div className="pm-risk-rails">
                      <ToggleField
                        label="Max Daily Loss Set in Broker"
                        value={form.maxDailyLossSetInBroker}
                        onChange={(v) => set("maxDailyLossSetInBroker", v)}
                      />
                      {profile.showColdTurkeyBlocker && (
                        <ToggleField
                          label="Cold Turkey Blocker Set"
                          value={form.coldTurkeyBlockerSet}
                          onChange={(v) => set("coldTurkeyBlockerSet", v)}
                        />
                      )}
                    </div>
                  </>
                )}

                {step.id === "focus" && (
                  <>
                    <div className="pm-field">
                      <div className="pm-field-label hybrid-label">Session rules</div>
                      <textarea
                        value={form.sessionRules}
                        onChange={(e) => set("sessionRules", e.target.value)}
                        className="pm-textarea"
                        placeholder="No trades in the first 5 minutes. No averaging losers. Take partials at 1R."
                        rows={3}
                      />
                    </div>
                    <div className="pm-field">
                      <div className="pm-field-label hybrid-label">The one thing</div>
                      <textarea
                        value={form.oneThing}
                        onChange={(e) => set("oneThing", e.target.value)}
                        className="pm-textarea"
                        placeholder="If today goes wrong, what's the most likely reason — and how do you guard against it?"
                        rows={3}
                      />
                    </div>
                    {commitmentList.length > 0 && (
                      <section
                        className={`pm-commitment pm-commitment--in-panel${commitmentsReady(form, profile) ? " pm-commitment--checked" : ""}`}
                      >
                        <div className="pm-commitment-eyebrow hybrid-eyebrow">Commitment</div>
                        {commitmentList.map((commitment) => (
                          <label key={commitment.id} className="pm-commitment-check">
                            <input
                              type="checkbox"
                              checked={!!form.commitmentAccepted?.[commitment.id]}
                              onChange={(e) =>
                                set("commitmentAccepted", {
                                  ...(form.commitmentAccepted || {}),
                                  [commitment.id]: e.target.checked,
                                })
                              }
                            />
                            <span className="pm-commitment-text">{commitment.text}</span>
                          </label>
                        ))}
                        <p className="pm-commitment-hint">All required to save today&apos;s plan.</p>
                      </section>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="pm-section-nav">
              <button
                type="button"
                className="pm-btn-link"
                onClick={() => setActiveStep((i) => Math.max(0, i - 1))}
                disabled={isFirstStep}
              >
                Previous
              </button>
              {!isLastStep ? (
                <button
                  type="button"
                  className="pm-btn-primary-sm"
                  onClick={() => setActiveStep((i) => Math.min(PLAN_STEPS.length - 1, i + 1))}
                >
                  Next — {PLAN_STEPS[activeStep + 1].label}
                </button>
              ) : (
                <span className="pm-closeout-nav-spacer" aria-hidden="true" />
              )}
            </div>

            {isLastStep && (
              <div className="pm-closeout-finish">
                <div className="pm-closeout-finish-actions">
                  <button type="button" className="pm-btn-link" onClick={handleReset}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.5 8a5.5 5.5 0 019.3-4M13.5 8a5.5 5.5 0 01-9.3 4" strokeLinecap="round"/><path d="M2.5 3.5V8h4.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Reset
                  </button>
                  <div className="pm-closeout-finish-actions-right">
                    <button type="button" className="pm-btn-link" onClick={handleSave}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2.5h10v11H3z"/><path d="M5 2.5V6h6V2.5"/></svg>
                      {saved ? "Updated" : "Update plan"}
                    </button>
                    <button type="button" className="pm-btn-save-review" onClick={handleReturn}>
                      Save &amp; return
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
