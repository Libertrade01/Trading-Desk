"use client";

import { useState, useEffect, useCallback } from "react";
import { storage } from "../lib/supabase";
import {
  BIAS_OPTIONS,
  SESSION_OPEN_VS_VALUE_OPTIONS,
  VOLATILITY_OPTIONS,
  LEVEL_TYPE_OPTIONS,
  DEFAULT_DAILY_PLAN,
  DEFAULT_KEY_LEVEL_QUICK_ADDS,
  newKeyLevel,
  newSetup,
  normalizeDirectionalBias,
  normalizeSessionOpenVsValue,
  normalizeExpectedVolatility,
  normalizeKeyLevelQuickAdds,
  normalizeLevelType,
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
  saveTraderProfile,
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
import WorkflowPageLayout from "./WorkflowPageLayout";
import HabitTileField from "./HabitTileField";
import RiskRailsWarningDialog from "./RiskRailsWarningDialog";

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
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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

const BIAS_CHECKLIST_MESSAGE = "Complete the chart annotation checklist before saving the plan.";
const COMMITMENT_MESSAGE = "Confirm all commitments before saving the plan.";
const BIAS_GUIDANCE =
  "This is the bias of my plan — where is price in relation to these levels? Where is volume building and where does price not want to go?";

export default function DailyPlan({ onBack }) {
  const [form, setForm] = useState(DEFAULT_DAILY_PLAN);
  const [quickAdds, setQuickAdds] = useState(DEFAULT_KEY_LEVEL_QUICK_ADDS);
  const [editingQuickAdds, setEditingQuickAdds] = useState(false);
  const [newQuickAdd, setNewQuickAdd] = useState("");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState(null);
  const [dllSettings, setDllSettings] = useState(DEFAULT_DLL_SETTINGS);
  const [activeStep, setActiveStep] = useState(0);
  const [meditationStandDownRequired, setMeditationStandDownRequired] = useState(false);
  const [showRiskRailsWarning, setShowRiskRailsWarning] = useState(false);

  const set = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }, []);

  const step = PLAN_STEPS[activeStep];
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === PLAN_STEPS.length - 1;

  useEffect(() => {
    (async () => {
      const [data, recoveryState, settings, traderProfile, checkin] = await Promise.all([
        loadData(`daily-plan-${todayKey()}`, null),
        loadRecoveryState(),
        loadDllSettings(),
        loadTraderProfile(),
        loadData(`premarket-checkin-${todayKey()}`, null),
      ]);
      setProfile(traderProfile);
      setMeditationStandDownRequired(
        traderProfile?.profileKind === "founder"
        && checkin?.meditationStandDownRequired === true
        && checkin?.meditation !== true,
      );
      setQuickAdds(normalizeKeyLevelQuickAdds(traderProfile?.keyLevelQuickAdds));
      setDllSettings(settings);
      const status = getRecoveryStatus(recoveryState, settings);
      setRecoveryStatus(status);

      let next = migratePlanCommitments(
        { ...DEFAULT_DAILY_PLAN, ...(data || {}) },
        traderProfile
      );
      next = {
        ...next,
        directionalBias: normalizeDirectionalBias(next.directionalBias),
        sessionOpenVsValue: normalizeSessionOpenVsValue(next.sessionOpenVsValue),
        expectedVolatility: normalizeExpectedVolatility(next.expectedVolatility),
        keyLevels: (next.keyLevels || []).map((level) => ({
          ...level,
          type: normalizeLevelType(level.type),
        })),
      };
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
      loadTraderProfile({ force: true })
        .then((nextProfile) => {
          setProfile(nextProfile);
          setQuickAdds(normalizeKeyLevelQuickAdds(nextProfile?.keyLevelQuickAdds));
        })
        .catch(() => {});
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
      setShowRiskRailsWarning(true);
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
    onBack();
    return true;
  };

  const persistQuickAdds = useCallback(async (nextQuickAdds) => {
    const normalized = normalizeKeyLevelQuickAdds(nextQuickAdds);
    setQuickAdds(normalized);
    if (!profile) return;
    try {
      const saved = await saveTraderProfile({
        ...profile,
        keyLevelQuickAdds: normalized,
      });
      setProfile(saved);
    } catch {
      /* profile save best-effort */
    }
  }, [profile]);

  const addLevel = (label = "") => {
    const key = String(label).trim().toUpperCase();
    if (key && form.keyLevels.some((level) => level.label.trim().toUpperCase() === key)) {
      return;
    }
    set("keyLevels", [...form.keyLevels, newKeyLevel(key ? { label: key } : {})]);
  };

  const updateLevel = (id, patch) =>
    set("keyLevels", form.keyLevels.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLevel = (id) => set("keyLevels", form.keyLevels.filter((l) => l.id !== id));

  const addQuickAdd = () => {
    const label = newQuickAdd.trim().toUpperCase();
    if (!label) return;
    if (quickAdds.some((item) => item === label)) {
      setNewQuickAdd("");
      return;
    }
    persistQuickAdds([...quickAdds, label]);
    setNewQuickAdd("");
  };

  const updateQuickAdd = (index, value) => {
    const next = quickAdds.map((item, i) => (i === index ? value.toUpperCase() : item));
    setQuickAdds(next);
  };

  const commitQuickAdds = () => {
    persistQuickAdds(quickAdds);
  };

  const removeQuickAdd = (index) => {
    persistQuickAdds(quickAdds.filter((_, i) => i !== index));
  };

  const levelTypeClass = (type) => {
    if (type === "Support") return "sup";
    if (type === "Resistance") return "res";
    if (type === "Target") return "tgt";
    if (type === "Pivot") return "piv";
    return "other";
  };

  const addSetup = (name = "") => {
    const label = String(name).trim();
    if (label && form.setups.some((s) => s.name.trim().toLowerCase() === label.toLowerCase())) {
      return;
    }
    set("setups", [...form.setups, newSetup(label ? { name: label } : {})]);
  };

  const updateSetup = (id, patch) =>
    set("setups", form.setups.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const removeSetup = (id) => set("setups", form.setups.filter((s) => s.id !== id));

  const togglePlaybookSetup = (name) => {
    const existing = form.setups.find(
      (s) => s.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (existing) {
      removeSetup(existing.id);
      return;
    }
    addSetup(name);
  };

  const isPlaybookSetupActive = (name) =>
    form.setups.some((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase());

  if (loading || !profile) return <div className="pm-loading home-page--loop workflow-page--loop">Loading...</div>;

  const playbookSetups = getPlaybookSetupNames(profile);
  const biasItems = getEnabledBiasItems(profile);
  const isFounder = profile.profileKind === "founder";
  const commitmentList = profile.commitments || [];
  const missingMaxDailyLoss = !form.maxDailyLossSetInBroker;
  const missingColdTurkeyBlocker = profile.showColdTurkeyBlocker && !form.coldTurkeyBlockerSet;
  const riskStepIndex = PLAN_STEPS.findIndex((item) => item.id === "risk");

  if (meditationStandDownRequired) {
    return (
      <WorkflowPageLayout>
        <div className="pm-topbar"><span>{headerDate()}</span></div>
        <div className="pm-plan-layout">
          <main className="pm-plan-main">
            <div className="pm-section-panel">
              <div className="pm-section-panel-body">
                <span className="hybrid-label">Defence Day</span>
                <h1 className="hybrid-page-title">Meditation first<span className="hybrid-page-title-stop" aria-hidden="true" /></h1>
                <p className="pm-subtitle">
                  The Session Plan is locked after three consecutive missed meditation check-ins. Complete Meditation in today&apos;s Check-in to clear Defence Day.
                </p>
                <a className="pm-btn-primary-sm" href="/premarket">Return to Check-in</a>
              </div>
            </div>
          </main>
        </div>
      </WorkflowPageLayout>
    );
  }

  return (
    <WorkflowPageLayout>
      <div className="pm-topbar">
        <span>{headerDate()}</span>
      </div>

      <div className="pm-plan-layout">
        <div className="pm-plan-main">
          <div className="pm-plan-header-row">
            <div className="pm-header">
              <h1 className="hybrid-page-title">Session plan<span className="hybrid-page-title-stop" aria-hidden="true" /></h1>
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
                        <div className="pm-habit-tile-row pm-habit-tile-row--prep">
                          {biasItems.map((item) => (
                            <HabitTileField
                              key={item.id}
                              label={item.label}
                              value={!!form[item.fieldKey]}
                              onChange={(v) => set(item.fieldKey, v)}
                            />
                          ))}
                        </div>
                        <p className="pm-commitment-hint">All items required to save today&apos;s plan.</p>
                      </div>
                    )}
                    {isFounder && (
                      <div className="pm-field">
                        <div className="pm-field-label hybrid-label">Value</div>
                        <p className="pm-field-hint">Where will the session open in relation to previous day value?</p>
                        <div
                          className="pm-habit-tile-row pm-habit-tile-row--bias"
                          role="radiogroup"
                          aria-label="Session open vs previous day value"
                        >
                          {SESSION_OPEN_VS_VALUE_OPTIONS.map((option) => {
                            const selected = form.sessionOpenVsValue === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                className={`pm-habit-tile${selected ? " on" : ""}`}
                                onClick={() => set("sessionOpenVsValue", option)}
                              >
                                <span className="pm-habit-tile-mark" aria-hidden="true">
                                  {selected ? "✓" : ""}
                                </span>
                                <span className="pm-habit-tile-copy">
                                  <span className="pm-habit-tile-title">{option}</span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="pm-field">
                      <div className="pm-habit-tile-row pm-habit-tile-row--bias" role="radiogroup" aria-label="Directional bias">
                        {BIAS_OPTIONS.map((option) => {
                          const selected = form.directionalBias === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              className={`pm-habit-tile${selected ? " on" : ""}`}
                              onClick={() => set("directionalBias", option)}
                            >
                              <span className="pm-habit-tile-mark" aria-hidden="true">
                                {selected ? "✓" : ""}
                              </span>
                              <span className="pm-habit-tile-copy">
                                <span className="pm-habit-tile-title">{option}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="pm-field">
                      <div className="pm-field-label hybrid-label">Thesis</div>
                      <textarea
                        value={form.whyBias}
                        onChange={(e) => set("whyBias", e.target.value)}
                        className="pm-textarea"
                        placeholder="Why this lean, and what would make you wrong..."
                        rows={4}
                      />
                    </div>
                  </>
                )}

                {step.id === "levels" && (
                  <>
                    <div className="pm-level-quick">
                      <div className="pm-level-quick-head">
                        <div className="pm-field-label hybrid-label">Quick add</div>
                        <button
                          type="button"
                          className="pm-level-quick-edit"
                          onClick={() => {
                            if (editingQuickAdds) commitQuickAdds();
                            setEditingQuickAdds((v) => !v);
                          }}
                        >
                          {editingQuickAdds ? "Done" : "Edit list"}
                        </button>
                      </div>

                      {!editingQuickAdds ? (
                        <div className="pm-level-quick-chips">
                          {quickAdds.map((label) => {
                            const used = form.keyLevels.some(
                              (level) => level.label.trim().toUpperCase() === label
                            );
                            return (
                              <button
                                key={label}
                                type="button"
                                className={`pm-level-quick-chip${used ? " pm-level-quick-chip--used" : ""}`}
                                onClick={() => addLevel(label)}
                                disabled={used}
                              >
                                {label}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            className="pm-level-quick-chip pm-level-quick-chip--custom"
                            onClick={() => addLevel()}
                          >
                            + Custom
                          </button>
                        </div>
                      ) : (
                        <div className="pm-level-quick-editor">
                          {quickAdds.map((label, index) => (
                            <div key={`${label}-${index}`} className="pm-level-quick-editor-row">
                              <input
                                type="text"
                                value={label}
                                onChange={(e) => updateQuickAdd(index, e.target.value)}
                                onBlur={commitQuickAdds}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.currentTarget.blur();
                                  }
                                }}
                                className="pm-text-input"
                                aria-label={`Quick add label ${index + 1}`}
                              />
                              <button
                                type="button"
                                className="pm-icon-btn"
                                onClick={() => removeQuickAdd(index)}
                                aria-label={`Remove ${label}`}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <div className="pm-level-quick-editor-row">
                            <input
                              type="text"
                              value={newQuickAdd}
                              onChange={(e) => setNewQuickAdd(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addQuickAdd();
                                }
                              }}
                              className="pm-text-input"
                              placeholder="Add label (e.g. IBH)"
                              aria-label="New quick add label"
                            />
                            <button
                              type="button"
                              className="pm-btn-outline pm-level-quick-add-btn"
                              onClick={addQuickAdd}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {form.keyLevels.length === 0 ? (
                      <div className="pm-empty">No levels yet. Tap a quick add or add a custom level.</div>
                    ) : (
                      <div className="pm-level-board-list">
                        {form.keyLevels.map((level) => (
                          <div key={level.id} className="pm-level-board-item">
                            <span
                              className={`pm-level-board-dot pm-level-board-dot--${levelTypeClass(level.type)}`}
                              aria-hidden="true"
                            />
                            <input
                              type="text"
                              value={level.label}
                              onChange={(e) => updateLevel(level.id, { label: e.target.value })}
                              className="pm-text-input pm-level-board-label"
                              placeholder="Label"
                              aria-label="Level label"
                            />
                            <input
                              type="text"
                              value={level.price}
                              onChange={(e) => updateLevel(level.id, { price: e.target.value })}
                              className="pm-text-input pm-level-board-price"
                              placeholder="Price"
                              aria-label="Level price"
                            />
                            <select
                              value={level.type}
                              onChange={(e) => updateLevel(level.id, { type: e.target.value })}
                              className="pm-select pm-level-board-type"
                              aria-label="Level type"
                            >
                              {LEVEL_TYPE_OPTIONS.map((o) => (
                                <option key={o} value={o}>{o}</option>
                              ))}
                            </select>
                            <TrashButton onClick={() => removeLevel(level.id)} />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {step.id === "setups" && (
                  <>
                    <div className="pm-setup-playbook">
                      <div className="pm-field-label hybrid-label">Playbook</div>
                      <div className="pm-setup-playbook-chips">
                        {playbookSetups.map((setupName) => {
                          const active = isPlaybookSetupActive(setupName);
                          return (
                            <button
                              key={setupName}
                              type="button"
                              className={`pm-setup-playbook-chip${active ? " on" : ""}`}
                              onClick={() => togglePlaybookSetup(setupName)}
                              aria-pressed={active}
                            >
                              {setupName}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          className="pm-setup-playbook-chip pm-setup-playbook-chip--custom"
                          onClick={() => addSetup()}
                        >
                          + Custom
                        </button>
                      </div>
                    </div>

                    {form.setups.length === 0 ? (
                      <div className="pm-empty">
                        No setups active. Tap a playbook setup or add a custom one.
                      </div>
                    ) : (
                      form.setups.map((setup) => (
                        <div key={setup.id} className="pm-setup-detail">
                          <div className="pm-setup-detail-head">
                            <input
                              type="text"
                              value={setup.name}
                              onChange={(e) => updateSetup(setup.id, { name: e.target.value })}
                              className="pm-text-input pm-setup-detail-name"
                              placeholder="Setup name"
                              aria-label="Setup name"
                            />
                            <TrashButton onClick={() => removeSetup(setup.id)} />
                          </div>
                          <div className="pm-field">
                            <div className="pm-field-label hybrid-label">Entry criteria &amp; invalidation</div>
                            <textarea
                              value={setup.conditions}
                              onChange={(e) => updateSetup(setup.id, { conditions: e.target.value })}
                              className="pm-textarea"
                              placeholder="What must be true before you take it..."
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
                                placeholder="Where you're aiming..."
                              />
                            </div>
                            <div>
                              <div className="pm-field-label hybrid-label">Stop placement</div>
                              <input
                                type="text"
                                value={setup.stop}
                                onChange={(e) => updateSetup(setup.id, { stop: e.target.value })}
                                className="pm-text-input"
                                placeholder="Where you're wrong..."
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}

                {step.id === "risk" && (
                  <>
                    <div className="pm-risk-hero-grid">
                      <div className="pm-risk-hero-card">
                        <div className="pm-field-label hybrid-label">Daily loss limit</div>
                        <input
                          type="text"
                          value={form.maxDailyLoss}
                          onChange={(e) => set("maxDailyLoss", e.target.value)}
                          className="pm-text-input pm-risk-hero-input"
                          placeholder="DLL MUST BE SET IN BROKER"
                        />
                        <p className="pm-field-hint">
                          {recoveryStatus?.active
                            ? `Recovery limit: ${formatRecoveryUsd(recoveryStatus.effectiveMaxDailyLoss)} max — plan won't save above this.`
                            : `Full-size limit: ${formatRecoveryUsd(dllSettings.fullDll)} max — plan won't save above this.`}
                        </p>
                      </div>
                      <div className="pm-risk-hero-card">
                        <div className="pm-field-label hybrid-label">Size per trade</div>
                        <input
                          type="text"
                          value={form.positionSize}
                          onChange={(e) => set("positionSize", e.target.value)}
                          className="pm-text-input pm-risk-hero-input"
                          placeholder="$250"
                        />
                        <p className="pm-field-hint">Standard risk unit for the session.</p>
                      </div>
                    </div>

                    <div className="pm-field-grid">
                      <div>
                        <div className="pm-field-label hybrid-label">Drawdown from peak (%)</div>
                        <input
                          type="text"
                          value={form.ddFromHighWaterMark}
                          onChange={(e) => set("ddFromHighWaterMark", e.target.value)}
                          className="pm-text-input"
                          placeholder="This helps determine risk & sizing"
                        />
                      </div>
                      <div>
                        <div className="pm-field-label hybrid-label">Expected volatility</div>
                        <select
                          value={form.expectedVolatility}
                          onChange={(e) => set("expectedVolatility", e.target.value)}
                          className="pm-select"
                        >
                          {VOLATILITY_OPTIONS.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="pm-field-label hybrid-label">Trade cap</div>
                        <input
                          type="text"
                          value={form.maxTrades}
                          onChange={(e) => set("maxTrades", e.target.value)}
                          className="pm-text-input"
                          placeholder="Max trades today"
                        />
                      </div>
                      <div>
                        <div className="pm-field-label hybrid-label">When you stop</div>
                        <input
                          type="text"
                          value={form.stopTradingAt}
                          onChange={(e) => set("stopTradingAt", e.target.value)}
                          className="pm-text-input"
                          placeholder="Time, # of trades, DLL etc"
                        />
                      </div>
                    </div>

                    <div className="pm-risk-rails">
                      <div className="pm-field-label hybrid-label">Risk rails</div>
                      <p className="pm-field-hint">Confirm these are set before you trade.</p>
                      <div className="pm-habit-tile-row pm-habit-tile-row--risk">
                        <HabitTileField
                          label="Max DLL set in broker"
                          value={form.maxDailyLossSetInBroker}
                          onChange={(v) => set("maxDailyLossSetInBroker", v)}
                        />
                        {profile.showColdTurkeyBlocker && (
                          <HabitTileField
                            label="Cold turkey blocker set"
                            value={form.coldTurkeyBlockerSet}
                            onChange={(v) => set("coldTurkeyBlockerSet", v)}
                          />
                        )}
                      </div>
                    </div>
                  </>
                )}

                {step.id === "focus" && (
                  <>
                    <div className="pm-focus-hero">
                      <div className="pm-field-label hybrid-label">Session focus</div>
                      <textarea
                        value={form.sessionRules}
                        onChange={(e) => set("sessionRules", e.target.value)}
                        className="pm-textarea pm-focus-hero-input"
                        placeholder="Wait for the open to settle, Playbook setups only, No revenge trading."
                        rows={4}
                      />
                      <p className="pm-field-hint">The rules you&apos;ll actually follow today.</p>
                    </div>
                    <div className="pm-focus-side-card">
                      <div className="pm-field-label hybrid-label">Guardrail</div>
                      <textarea
                        value={form.oneThing}
                        onChange={(e) => set("oneThing", e.target.value)}
                        className="pm-textarea"
                        placeholder="Today's most likely sabotage and how I will protect myself against it."
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
                  Next
                </button>
              ) : (
                <div className="pm-closeout-finish-actions-right">
                  <button type="button" className="pm-btn-primary-sm" onClick={handleSave}>
                    Save plan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showRiskRailsWarning && (
        <RiskRailsWarningDialog
          missingMaxDailyLoss={missingMaxDailyLoss}
          missingColdTurkeyBlocker={missingColdTurkeyBlocker}
          onClose={() => setShowRiskRailsWarning(false)}
          onReview={() => {
            setShowRiskRailsWarning(false);
            setActiveStep(riskStepIndex);
          }}
        />
      )}
    </WorkflowPageLayout>
  );
}
