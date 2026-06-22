"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { storage } from "../lib/supabase";
import {
  computeReadinessScore,
  readinessStatus,
  sliderValueColor,
  DEFAULT_PREMARKET_FORM,
  isSleepDebtSevere,
  parseSleepDebtMinutes,
  requiresSleepDebtStandDown,
  SLEEP_DEBT_SEVERE_CAUTION_MINS,
  PROTECTIVE_DAY_COPY,
  PROTECTIVE_DAY_THRESHOLD,
} from "../lib/premarket-scoring";
import MarketEventNudge from "./MarketEventNudge";
import CheckInRail, { CHECKIN_RAIL_SECTIONS } from "./CheckInRail";
import { todayKey, offsetDateKey } from "../lib/today-key";
import { loadHomeFocusItems } from "../lib/weekly-process-review";
import { notifySessionSaved } from "../lib/session-events";

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
  });
}

function SliderField({ label, hint, minLabel, maxLabel, value, onChange, inverted }) {
  return (
    <div className="pm-field">
      <div className="pm-field-top">
        <div>
          <div className="pm-field-label hybrid-label">{label}</div>
          {hint && <div className="pm-field-hint">{hint}</div>}
        </div>
        <div className="pm-field-value" style={{ color: sliderValueColor(value, inverted) }}>{value}</div>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="pm-slider"
      />
      <div className="pm-slider-labels">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
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

function ProtectiveDayBanner({ recoveryDay, acknowledged, onAcknowledge }) {
  const title = recoveryDay ? PROTECTIVE_DAY_COPY.recoveryTitle : PROTECTIVE_DAY_COPY.scoreTitle;
  const body = recoveryDay ? PROTECTIVE_DAY_COPY.recoveryBody : PROTECTIVE_DAY_COPY.scoreBody;
  const ackLabel = recoveryDay ? PROTECTIVE_DAY_COPY.recoveryAckLabel : PROTECTIVE_DAY_COPY.scoreAckLabel;

  return (
    <div
      className={`pm-protective-banner${acknowledged ? " pm-protective-banner--acknowledged" : ""}`}
      role={recoveryDay ? "alert" : "status"}
    >
      <div className="pm-protective-banner-head">
        <span className="pm-protective-banner-eyebrow hybrid-eyebrow">{title}</span>
        {!acknowledged && <p className="pm-protective-banner-text">{body}</p>}
      </div>
      <label className={`pm-protective-check${acknowledged ? " pm-protective-check--done" : ""}`}>
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => onAcknowledge(e.target.checked)}
        />
        <span>{acknowledged ? PROTECTIVE_DAY_COPY.scoreAckDone : ackLabel}</span>
      </label>
    </div>
  );
}

export default function PreMarketCheckIn({ onBack }) {
  const [form, setForm] = useState(DEFAULT_PREMARKET_FORM);
  const [yesterdaySleepDebtMinutes, setYesterdaySleepDebtMinutes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [weekFocus, setWeekFocus] = useState([]);
  const [activeSection, setActiveSection] = useState(0);

  const scores = useMemo(() => computeReadinessScore(form), [form]);
  const status = useMemo(() => readinessStatus(scores.composite), [scores.composite]);

  const sleepDebtMinutes = parseSleepDebtMinutes(form.sleepDebtMinutes);
  const sleepDebtSevere = isSleepDebtSevere(sleepDebtMinutes);
  const recoveryDay = requiresSleepDebtStandDown(sleepDebtMinutes, yesterdaySleepDebtMinutes);
  const showProtectiveBanner =
    recoveryDay || scores.composite < PROTECTIVE_DAY_THRESHOLD;

  const railDimensions = useMemo(
    () => ({
      physical: scores.physical,
      mental: scores.emotional,
      external: scores.external,
      preparation: scores.preparation,
    }),
    [scores],
  );

  const set = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }, []);

  useEffect(() => {
    (async () => {
      const dateKey = todayKey();
      const yesterdayKey = offsetDateKey(dateKey, -1);
      const [data, yesterdayData, focus] = await Promise.all([
        loadData(`premarket-checkin-${dateKey}`, null),
        loadData(`premarket-checkin-${yesterdayKey}`, null),
        loadHomeFocusItems(dateKey),
      ]);
      if (data) {
        setForm({ ...DEFAULT_PREMARKET_FORM, ...data });
      }
      setWeekFocus(focus.items || []);
      if (yesterdayData?.sleepDebtMinutes != null && yesterdayData.sleepDebtMinutes !== "") {
        setYesterdaySleepDebtMinutes(parseSleepDebtMinutes(yesterdayData.sleepDebtMinutes));
      } else {
        setYesterdaySleepDebtMinutes(null);
      }
      setLoading(false);
    })();
  }, []);

  const buildSavePayload = useCallback((formData, scoreData, statusData) => ({
    date: todayKey(),
    ...formData,
    readinessScore: scoreData.composite,
    readinessStatus: statusData.label,
    readinessTone: statusData.tone,
    dimensionScores: {
      emotional: scoreData.emotional,
      physical: scoreData.physical,
      external: scoreData.external,
      preparation: scoreData.preparation,
    },
    fieldBreakdown: scoreData.breakdown,
    standDownAcknowledgedAt: formData.standDownAcknowledged
      ? (formData.standDownAcknowledgedAt || new Date().toISOString())
      : null,
    sleepDebtSevere: isSleepDebtSevere(formData.sleepDebtMinutes),
    sleepDebtStandDownRequired: requiresSleepDebtStandDown(
      formData.sleepDebtMinutes,
      yesterdaySleepDebtMinutes,
    ),
    savedAt: new Date().toISOString(),
  }), [yesterdaySleepDebtMinutes]);

  const persistCheckin = useCallback(async (formData, scoreData, statusData) => {
    const payload = buildSavePayload(formData, scoreData, statusData);
    if (payload.standDownAcknowledged && !formData.standDownAcknowledgedAt) {
      payload.standDownAcknowledgedAt = new Date().toISOString();
    }
    await saveData(`premarket-checkin-${todayKey()}`, payload);
    notifySessionSaved();
    return payload;
  }, [buildSavePayload]);

  const handleSave = async () => {
    await persistCheckin(form, scores, status);
    setSaved(true);
  };

  const handleProtectiveAcknowledge = async (checked) => {
    const acknowledgedAt = checked ? new Date().toISOString() : null;
    const nextForm = {
      ...form,
      standDownAcknowledged: checked,
      standDownAcknowledgedAt: acknowledgedAt,
    };
    setForm(nextForm);
    setSaved(false);
    await persistCheckin(nextForm, scores, status);
    if (checked) setSaved(true);
  };

  const handleReset = () => {
    setForm(DEFAULT_PREMARKET_FORM);
    setActiveSection(0);
    setSaved(false);
  };

  const goPrev = () => setActiveSection((i) => Math.max(0, i - 1));
  const goNext = () => setActiveSection((i) => Math.min(CHECKIN_RAIL_SECTIONS.length - 1, i + 1));

  const section = CHECKIN_RAIL_SECTIONS[activeSection];

  if (loading) {
    return <div className="pm-loading">Loading...</div>;
  }

  return (
    <div className="premarket-page hybrid-page">
      <div className="pm-topbar">
        <span>{headerDate()}</span>
      </div>

      <div className="pm-checkin-layout">
        <div className="pm-checkin-main">
          <div className="pm-header">
            <div className="pm-eyebrow hybrid-eyebrow">Pre-market · {sectionDate()}</div>
            <h1 className="hybrid-page-title">CHECK IN.</h1>
            <p className="pm-subtitle">
              Be honest before the open. Your score updates as you go.
            </p>
          </div>

          {weekFocus.length > 0 && (
            <div className="pm-week-focus-reminder" role="note">
              <div className="pm-week-focus-reminder-label hybrid-eyebrow">This week&apos;s focus</div>
              <ul className="pm-week-focus-reminder-list">
                {weekFocus.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="pm-checkin-workspace">
            <CheckInRail
              activeIndex={activeSection}
              onSelect={setActiveSection}
              composite={scores.composite}
              dimensions={railDimensions}
              cautionActive={showProtectiveBanner && !form.standDownAcknowledged}
            />

            <div className="pm-checkin-stage">
              <div className="pm-section-panel">
            <div className="pm-section-panel-head">
              <div>
                <h2 className="pm-section-title hybrid-section-title">{sectionTitle(section.id)}</h2>
                <p className="pm-section-desc">{sectionDesc(section.id)}</p>
              </div>
              <span className="pm-section-step hybrid-label-sm">
                {activeSection + 1} of {CHECKIN_RAIL_SECTIONS.length}
              </span>
            </div>

            <div className="pm-section-panel-body">
              {section.id === "physical" && (
                <>
                  <div className="pm-sleep-row">
                    <div className="pm-field">
                      <div className="pm-field-label hybrid-label">Sleep (hours)</div>
                      <input
                        type="number"
                        min={0}
                        max={14}
                        step={0.5}
                        value={form.sleepHours}
                        onChange={(e) => set("sleepHours", e.target.value)}
                        className="pm-number-input"
                      />
                    </div>
                    <div className="pm-field">
                      <div className="pm-field-label hybrid-label">Sleep debt (mins)</div>
                      <input
                        type="number"
                        min={0}
                        max={600}
                        step={5}
                        value={form.sleepDebtMinutes}
                        onChange={(e) => set("sleepDebtMinutes", e.target.value)}
                        className={`pm-number-input${sleepDebtSevere ? " pm-number-input--caution" : ""}`}
                      />
                    </div>
                  </div>
                  {sleepDebtSevere && !recoveryDay && (
                    <div className="pm-sleep-debt-caution" role="status">
                      <strong>Severe caution</strong> — sleep debt is {sleepDebtMinutes} min (≥{" "}
                      {SLEEP_DEBT_SEVERE_CAUTION_MINS}). {PROTECTIVE_DAY_COPY.sleepDebtCaution}
                    </div>
                  )}
                  {recoveryDay && (
                    <div className="pm-sleep-debt-caution pm-sleep-debt-caution--recovery" role="alert">
                      <strong>{PROTECTIVE_DAY_COPY.sleepDebtMandatory}</strong> — sleep debt has been ≥{" "}
                      {SLEEP_DEBT_SEVERE_CAUTION_MINS} min for two consecutive days.
                    </div>
                  )}
                  <SliderField
                    label="Sleep quality"
                    minLabel="Restless"
                    maxLabel="Restored"
                    value={form.sleepQuality}
                    onChange={(v) => set("sleepQuality", v)}
                  />
                  <SliderField
                    label="Energy"
                    hint="Right now"
                    minLabel="Drained"
                    maxLabel="Sharp"
                    value={form.energy}
                    onChange={(v) => set("energy", v)}
                  />
                  <div className="pm-field">
                    <div className="pm-field-label hybrid-label">HRV</div>
                    <div className="pm-field-hint">Recovery score from your wearable (0–100%)</div>
                    <div className="pm-hrv-input-row">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={form.hrvScore}
                        onChange={(e) => set("hrvScore", e.target.value)}
                        className="pm-number-input pm-hrv-input"
                      />
                      <span className="pm-hrv-suffix">%</span>
                    </div>
                  </div>
                  <div className="pm-toggle-row">
                    <ToggleField label="Hydrated" hint="Water in" value={form.hydrated} onChange={(v) => set("hydrated", v)} />
                    <ToggleField label="Movement" hint="Walk, stretch, or workout" value={form.movement} onChange={(v) => set("movement", v)} />
                  </div>
                </>
              )}

              {section.id === "mental" && (
                <>
                  <SliderField
                    label="Mental state"
                    hint="Calm, centered, prepared (10) → reactive, off-balance (1)"
                    minLabel="Off"
                    maxLabel="Centered"
                    value={form.emotionalState}
                    onChange={(v) => set("emotionalState", v)}
                  />
                  <SliderField
                    label="Confidence"
                    hint="In your read of conditions today"
                    minLabel="Shaky"
                    maxLabel="Confident"
                    value={form.confidence}
                    onChange={(v) => set("confidence", v)}
                  />
                  <SliderField
                    label="Patience"
                    hint="Willingness to wait for A+ setups"
                    minLabel="Itchy"
                    maxLabel="Patient"
                    value={form.patience}
                    onChange={(v) => set("patience", v)}
                  />
                  <SliderField
                    label="FOMO risk"
                    hint="How likely to chase moves"
                    minLabel="None"
                    maxLabel="High"
                    value={form.fomoRisk}
                    onChange={(v) => set("fomoRisk", v)}
                    inverted
                  />
                  <SliderField
                    label="Revenge risk"
                    hint="Pressure from a recent loss"
                    minLabel="None"
                    maxLabel="High"
                    value={form.revengeRisk}
                    onChange={(v) => set("revengeRisk", v)}
                    inverted
                  />
                </>
              )}

              {section.id === "external" && (
                <>
                  <SliderField
                    label="External distractions"
                    hint="Calls, family, errands, life noise"
                    minLabel="None"
                    maxLabel="Heavy"
                    value={form.externalDistractions}
                    onChange={(v) => set("externalDistractions", v)}
                    inverted
                  />
                  <SliderField
                    label="Financial pressure"
                    hint="How much does today need to work"
                    minLabel="None"
                    maxLabel="Severe"
                    value={form.financialPressure}
                    onChange={(v) => set("financialPressure", v)}
                    inverted
                  />
                  <SliderField
                    label="General focus level"
                    hint="How sharp and present you feel right now"
                    minLabel="Scattered"
                    maxLabel="Locked in"
                    value={form.generalFocusLevel}
                    onChange={(v) => set("generalFocusLevel", v)}
                  />
                </>
              )}

              {section.id === "preparation" && (
                <>
                  <MarketEventNudge />
                  <div className="pm-prep-grid">
                    <ToggleField label="Reviewed key levels" value={form.reviewedKeyLevels} onChange={(v) => set("reviewedKeyLevels", v)} />
                    <ToggleField label="Reviewed news / catalysts" value={form.reviewedNews} onChange={(v) => set("reviewedNews", v)} />
                    <ToggleField label="Daily plan written" value={form.dailyPlanWritten} onChange={(v) => set("dailyPlanWritten", v)} />
                    <ToggleField label="Followed routine" value={form.followedRoutine} onChange={(v) => set("followedRoutine", v)} />
                    <ToggleField label="Meditation / breathwork" value={form.meditation} onChange={(v) => set("meditation", v)} />
                  </div>
                  <div className="pm-custom-prep">
                    <label className="pm-custom-check">
                      <input
                        type="checkbox"
                        checked={form.customPrepChecked}
                        onChange={(e) => set("customPrepChecked", e.target.checked)}
                      />
                      <span>Your own prep item (optional)</span>
                    </label>
                    {form.customPrepChecked && (
                      <input
                        type="text"
                        value={form.customPrepItem}
                        onChange={(e) => set("customPrepItem", e.target.value)}
                        className="pm-text-input"
                        placeholder="Add your own prep item..."
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {showProtectiveBanner && (
            <ProtectiveDayBanner
              recoveryDay={recoveryDay}
              acknowledged={form.standDownAcknowledged}
              onAcknowledge={handleProtectiveAcknowledge}
            />
          )}

          <p className="pm-score-weight-hint">
            Weighted: physical 22% · mental 38% · prep 25% · external 15%. Status: {status.label}.
          </p>

          <div className="pm-section-nav">
            <button type="button" className="pm-btn-link" onClick={goPrev} disabled={activeSection === 0}>
              Previous
            </button>
            {activeSection < CHECKIN_RAIL_SECTIONS.length - 1 ? (
              <button type="button" className="pm-btn-primary-sm" onClick={goNext}>
                Next — {CHECKIN_RAIL_SECTIONS[activeSection + 1].label}
              </button>
            ) : (
              <button type="button" className="pm-btn-link" onClick={() => setActiveSection(0)}>
                Back to Physical
              </button>
            )}
          </div>

          <div className="pm-checkin-finish">
            <div className="pm-checkin-finish-mantra">
              <label className="pm-checkin-finish-label hybrid-label" htmlFor="pm-mantra-input">
                Mantra
              </label>
              <input
                id="pm-mantra-input"
                type="text"
                value={form.mantra}
                onChange={(e) => set("mantra", e.target.value)}
                className="pm-text-input pm-checkin-finish-mantra-input"
                placeholder="One line for today — e.g. Wait for A+"
              />
            </div>

            <div className="pm-checkin-finish-reminders" aria-label="Pre-market reminders">
              <span className="pm-checkin-finish-label hybrid-label">Desk setup</span>
              <div className="pm-checkin-reminder-grid">
                <ToggleField label="Unlock accounts" value={form.unlockAccounts} onChange={(v) => set("unlockAccounts", v)} />
                <ToggleField label="Check CPU" value={form.checkCpu} onChange={(v) => set("checkCpu", v)} />
                <ToggleField label="Risk bracket order" value={form.selectRiskBracketOrder} onChange={(v) => set("selectRiskBracketOrder", v)} />
              </div>
              <p className="pm-checkin-finish-note">Not scored — quick desk checks before the open.</p>
            </div>

            <div className="pm-checkin-finish-actions">
              <button type="button" className="pm-btn-link" onClick={handleReset}>
                Reset
              </button>
              <div className="pm-checkin-finish-actions-right">
                <button type="button" className="pm-btn-link" onClick={handleSave}>
                  {saved ? "Updated" : "Save check-in"}
                </button>
                <button type="button" className="pm-btn-primary-sm" onClick={() => { handleSave(); onBack(); }}>
                  Return to dashboard
                </button>
              </div>
            </div>
          </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function sectionTitle(id) {
  switch (id) {
    case "physical":
      return "Physical state";
    case "mental":
      return "Mental state";
    case "external":
      return "External";
    case "preparation":
      return "Preparation";
    default:
      return "";
  }
}

function sectionDesc(id) {
  switch (id) {
    case "physical":
      return "The body the brain rents.";
    case "mental":
      return "How you arrive on the desk today.";
    case "external":
      return "What the world is throwing at you.";
    case "preparation":
      return "The work you did before market open.";
    default:
      return "";
  }
}
