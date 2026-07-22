"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { storage } from "../lib/supabase";
import {
  computeReadinessScore,
  readinessStatus,
  DEFAULT_PREMARKET_FORM,
  isSleepDebtSevere,
  parseSleepDebtMinutes,
  requiresSleepDebtStandDown,
  SLEEP_DEBT_SEVERE_CAUTION_MINS,
  PROTECTIVE_DAY_COPY,
  PROTECTIVE_DAY_THRESHOLD,
  founderMeditationMissStreak,
  requiresFounderMeditationStandDown,
} from "../lib/premarket-scoring";
import MarketEventNudge from "./MarketEventNudge";
import CheckInRail, { CHECKIN_RAIL_SECTIONS } from "./CheckInRail";
import CheckInHorizontalStepper from "./CheckInHorizontalStepper";
import WorkflowPageLayout from "./WorkflowPageLayout";
import SliderField from "./SliderField";
import HabitTileField from "./HabitTileField";
import { todayKey, offsetDateKey } from "../lib/today-key";
import { previousTradingDateKeys } from "../lib/trading-day-range";
import { notifySessionSaved } from "../lib/session-events";
import {
  loadTraderProfile,
  PROFILE_UPDATED_EVENT,
  migratePremarketDeskChecks,
  deskCheckValue,
  setDeskCheck,
} from "../lib/trader-profile";

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

function ProtectiveDayBanner({ recoveryDay, meditationDay, acknowledged, onAcknowledge }) {
  const effectiveAcknowledged = meditationDay ? false : acknowledged;
  const title = meditationDay
    ? PROTECTIVE_DAY_COPY.meditationTitle
    : recoveryDay
      ? PROTECTIVE_DAY_COPY.recoveryTitle
      : PROTECTIVE_DAY_COPY.scoreTitle;
  const body = meditationDay
    ? PROTECTIVE_DAY_COPY.meditationBody
    : recoveryDay
      ? PROTECTIVE_DAY_COPY.recoveryBody
      : PROTECTIVE_DAY_COPY.scoreBody;
  const ackLabel = recoveryDay ? PROTECTIVE_DAY_COPY.recoveryAckLabel : PROTECTIVE_DAY_COPY.scoreAckLabel;

  return (
    <div
      className={`checkin-protective-bar${effectiveAcknowledged ? " checkin-protective-bar--acknowledged" : ""}`}
      role={recoveryDay || meditationDay ? "alert" : "status"}
    >
      <span className="checkin-protective-bar-badge">{title}</span>
      {!effectiveAcknowledged && <p className="checkin-protective-bar-text">{body}</p>}
      {meditationDay ? (
        <span className="checkin-protective-bar-ack">Complete Meditation below to clear Defence Day.</span>
      ) : (
        <label className={`checkin-protective-bar-ack${acknowledged ? " checkin-protective-bar-ack--done" : ""}`}>
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => onAcknowledge(e.target.checked)}
          />
          <span>{acknowledged ? PROTECTIVE_DAY_COPY.scoreAckDone : ackLabel}</span>
        </label>
      )}
    </div>
  );
}

export default function PreMarketCheckIn({
  onBack,
  demoMode = false,
  initialForm = null,
  demoProfile = null,
}) {
  const [form, setForm] = useState(() =>
    demoMode && initialForm
      ? { ...DEFAULT_PREMARKET_FORM, ...initialForm }
      : DEFAULT_PREMARKET_FORM
  );
  const [profile, setProfile] = useState(demoMode ? demoProfile : null);
  const [yesterdaySleepDebtMinutes, setYesterdaySleepDebtMinutes] = useState(null);
  const [previousMeditationValues, setPreviousMeditationValues] = useState([]);
  const [loading, setLoading] = useState(!demoMode);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  const usesWearable = profile?.usesWearable ?? false;

  const scores = useMemo(
    () => computeReadinessScore(form, { usesWearable }),
    [form, usesWearable]
  );
  const status = useMemo(() => readinessStatus(scores.composite), [scores.composite]);

  const sleepDebtMinutes = parseSleepDebtMinutes(form.sleepDebtMinutes);
  const sleepDebtSevere = usesWearable && isSleepDebtSevere(sleepDebtMinutes);
  const recoveryDay =
    usesWearable && requiresSleepDebtStandDown(sleepDebtMinutes, yesterdaySleepDebtMinutes);
  const founderProfile = profile?.profileKind === "founder";
  const meditationStandDownRequired =
    founderProfile && requiresFounderMeditationStandDown(form.meditation, previousMeditationValues);
  const meditationMissStreak = founderProfile
    ? founderMeditationMissStreak(form.meditation, previousMeditationValues)
    : 0;
  const showProtectiveBanner =
    meditationStandDownRequired || recoveryDay || scores.composite < PROTECTIVE_DAY_THRESHOLD;

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
    if (demoMode) {
      const traderProfile = demoProfile || null;
      setProfile(traderProfile);
      if (initialForm) {
        setForm(
          migratePremarketDeskChecks(
            { ...DEFAULT_PREMARKET_FORM, ...initialForm },
            traderProfile
          )
        );
      }
      setLoading(false);
      return undefined;
    }
    (async () => {
      const dateKey = todayKey();
      const yesterdayKey = offsetDateKey(dateKey, -1);
      const meditationHistoryKeys = previousTradingDateKeys(dateKey, 2);
      const [data, yesterdayData, traderProfile, ...meditationHistory] = await Promise.all([
        loadData(`premarket-checkin-${dateKey}`, null),
        loadData(`premarket-checkin-${yesterdayKey}`, null),
        loadTraderProfile(),
        ...meditationHistoryKeys.map((key) => loadData(`premarket-checkin-${key}`, null)),
      ]);
      setProfile(traderProfile);
      if (data) {
        setForm(migratePremarketDeskChecks({ ...DEFAULT_PREMARKET_FORM, ...data }, traderProfile));
      }
      if (
        yesterdayData?.sleepDebtMinutes != null
        && yesterdayData.sleepDebtMinutes !== ""
      ) {
        setYesterdaySleepDebtMinutes(parseSleepDebtMinutes(yesterdayData.sleepDebtMinutes));
      } else {
        setYesterdaySleepDebtMinutes(null);
      }
      setPreviousMeditationValues(
        meditationHistory.map((entry) => entry?.savedAt ? entry.meditation === true : null),
      );
      setLoading(false);
    })();
  }, [demoMode, demoProfile, initialForm]);

  useEffect(() => {
    if (demoMode) return undefined;
    const refreshProfile = () => {
      loadTraderProfile({ force: true }).then(setProfile).catch(() => {});
    };
    window.addEventListener(PROFILE_UPDATED_EVENT, refreshProfile);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, refreshProfile);
  }, [demoMode]);

  const buildSavePayload = useCallback((formData, scoreData, statusData) => ({
    date: todayKey(),
    ...formData,
    readinessScore: scoreData.composite,
    readinessStatus: meditationStandDownRequired ? "Defence day - meditation required" : statusData.label,
    readinessTone: meditationStandDownRequired ? "red" : statusData.tone,
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
    sleepDebtSevere: usesWearable && isSleepDebtSevere(formData.sleepDebtMinutes),
    sleepDebtStandDownRequired:
      usesWearable
      && requiresSleepDebtStandDown(formData.sleepDebtMinutes, yesterdaySleepDebtMinutes),
    meditationMissStreak,
    meditationStandDownRequired,
    automaticNoTradeRequired: meditationStandDownRequired,
    savedAt: new Date().toISOString(),
  }), [
    usesWearable,
    yesterdaySleepDebtMinutes,
    meditationMissStreak,
    meditationStandDownRequired,
  ]);

  const persistCheckin = useCallback(async (formData, scoreData, statusData) => {
    if (demoMode) return buildSavePayload(formData, scoreData, statusData);
    const payload = buildSavePayload(formData, scoreData, statusData);
    if (payload.standDownAcknowledged && !formData.standDownAcknowledgedAt) {
      payload.standDownAcknowledgedAt = new Date().toISOString();
    }
    await saveData(`premarket-checkin-${todayKey()}`, payload);
    notifySessionSaved();
    return payload;
  }, [buildSavePayload, demoMode]);

  const handleSave = async () => {
    if (demoMode) return;
    await persistCheckin(form, scores, status);
    setSaved(true);
    onBack();
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
    if (demoMode) return;
    await persistCheckin(nextForm, scores, status);
    if (checked) setSaved(true);
  };

  const goPrev = () => setActiveSection((i) => Math.max(0, i - 1));
  const goNext = () => setActiveSection((i) => Math.min(CHECKIN_RAIL_SECTIONS.length - 1, i + 1));

  const section = CHECKIN_RAIL_SECTIONS[activeSection];
  const isLastSection = activeSection === CHECKIN_RAIL_SECTIONS.length - 1;
  const nextSection = !isLastSection ? CHECKIN_RAIL_SECTIONS[activeSection + 1] : null;

  if (loading || !profile) {
    return <div className="pm-loading home-page--loop workflow-page--loop">Loading...</div>;
  }

  return (
    <WorkflowPageLayout>
      <div className="pm-topbar">
        <span>{headerDate()}</span>
      </div>

      <div className="pm-checkin-layout pm-checkin-layout--loop">
        <div className="pm-checkin-intro">
          <header className="pm-checkin-header">
            <h1 className="hybrid-page-title">Check-in<span className="hybrid-page-title-stop" aria-hidden="true" /></h1>
            <p className="pm-subtitle">
              Rate your readiness before you risk your capital.
            </p>
          </header>

          <CheckInHorizontalStepper activeIndex={activeSection} onSelect={setActiveSection} />
        </div>

        <div className="pm-checkin-stage">
            {showProtectiveBanner && (
              <ProtectiveDayBanner
                recoveryDay={recoveryDay}
                meditationDay={meditationStandDownRequired}
                acknowledged={form.standDownAcknowledged}
                onAcknowledge={handleProtectiveAcknowledge}
              />
            )}

            <div className="pm-section-panel checkin-section-panel">
              <div className="pm-section-panel-head checkin-section-panel-head">
                <div>
                  <h2 className="pm-section-title hybrid-section-title">{sectionTitle(section.id)}</h2>
                  <p className="pm-section-desc">{sectionDesc(section.id)}</p>
                </div>
                <div className="checkin-section-nav" aria-label="Section navigation">
                  <button
                    type="button"
                    className="checkin-section-nav-btn"
                    onClick={goPrev}
                    disabled={activeSection === 0}
                    aria-label="Previous section"
                  >
                    ‹
                  </button>
                  <span className="checkin-section-nav-count">
                    {activeSection + 1} of {CHECKIN_RAIL_SECTIONS.length}
                  </span>
                  <button
                    type="button"
                    className="checkin-section-nav-btn"
                    onClick={goNext}
                    disabled={isLastSection}
                    aria-label="Next section"
                  >
                    ›
                  </button>
                </div>
              </div>

              <div className="pm-section-panel-body">
              {section.id === "physical" && (
                <>
                  <div className={`pm-sleep-row${usesWearable ? "" : " pm-sleep-row--solo"}`}>
                    <div className="pm-field">
                      <div className="pm-field-label hybrid-label">Sleep (hours)</div>
                      <div className="checkin-input-suffix-wrap">
                        <input
                          type="number"
                          min={0}
                          max={14}
                          step={0.5}
                          value={form.sleepHours}
                          onChange={(e) => set("sleepHours", e.target.value)}
                          className="pm-number-input checkin-input-with-suffix"
                        />
                        <span className="checkin-input-suffix">hrs</span>
                      </div>
                    </div>
                    {usesWearable && (
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
                    )}
                  </div>
                  {usesWearable && sleepDebtSevere && !recoveryDay && (
                    <div className="pm-sleep-debt-caution" role="status">
                      <strong>Severe caution</strong> — sleep debt is {sleepDebtMinutes} min (≥{" "}
                      {SLEEP_DEBT_SEVERE_CAUTION_MINS}). {PROTECTIVE_DAY_COPY.sleepDebtCaution}
                    </div>
                  )}
                  {usesWearable && recoveryDay && (
                    <div className="pm-sleep-debt-caution pm-sleep-debt-caution--recovery" role="alert">
                      <strong>{PROTECTIVE_DAY_COPY.sleepDebtMandatory}</strong> — sleep debt has been ≥{" "}
                      {SLEEP_DEBT_SEVERE_CAUTION_MINS} min for two consecutive days.
                    </div>
                  )}
                  <SliderField
                    label="Sleep recovery"
                    minLabel="Depleted"
                    maxLabel="Recovered"
                    value={form.sleepQuality}
                    onChange={(v) => set("sleepQuality", v)}
                  />
                  <SliderField
                    label="Energy"
                    minLabel="Drained"
                    maxLabel="Sharp"
                    value={form.energy}
                    onChange={(v) => set("energy", v)}
                  />
                  {usesWearable && (
                    <div className="pm-field">
                      <div className="pm-field-label hybrid-label">Recovery (HRV)</div>
                      <div className="pm-field-hint">Wearable recovery score (0–100%)</div>
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
                  )}
                  <div className="pm-habit-group">
                    <div className="pm-field-label hybrid-label">Habits</div>
                    <div className="pm-habit-tile-row pm-habit-tile-row--habits">
                      <HabitTileField
                        label="Hydrated"
                        value={form.hydrated}
                        onChange={(v) => set("hydrated", v)}
                      />
                      <HabitTileField
                        label="Movement"
                        value={form.movement}
                        onChange={(v) => set("movement", v)}
                      />
                      <HabitTileField
                        label={founderProfile ? "Meditation" : "Breathwork"}
                        value={form.meditation}
                        onChange={(v) => set("meditation", v)}
                      />
                    </div>
                  </div>
                </>
              )}

              {section.id === "mental" && (
                <>
                  <SliderField
                    label="Headspace"
                    minLabel="Scattered"
                    maxLabel="Steady"
                    value={form.emotionalState}
                    onChange={(v) => set("emotionalState", v)}
                  />
                  <SliderField
                    label="Trigger discipline"
                    hint="Patience to wait for playbook setups"
                    minLabel="Itchy"
                    maxLabel="Disciplined"
                    value={form.patience}
                    onChange={(v) => set("patience", v)}
                  />
                  <SliderField
                    label="Tilt risk"
                    hint="Built-up revenge"
                    minLabel="None"
                    maxLabel="High"
                    value={form.revengeRisk}
                    onChange={(v) => set("revengeRisk", v)}
                    inverted
                  />
                  <SliderField
                    label="Chase risk"
                    hint="FOMO"
                    minLabel="None"
                    maxLabel="High"
                    value={form.fomoRisk}
                    onChange={(v) => set("fomoRisk", v)}
                    inverted
                  />
                  <SliderField
                    label="Conviction"
                    hint="In today's read of the market"
                    minLabel="Doubtful"
                    maxLabel="Convicted"
                    value={form.confidence}
                    onChange={(v) => set("confidence", v)}
                  />
                </>
              )}

              {section.id === "external" && (
                <>
                  <SliderField
                    label="Attention"
                    hint="General focus"
                    minLabel="Drifted"
                    maxLabel="Locked"
                    value={form.generalFocusLevel}
                    onChange={(v) => set("generalFocusLevel", v)}
                  />
                  <SliderField
                    label="Life noise"
                    hint="External distractions"
                    minLabel="Quiet"
                    maxLabel="Loud"
                    value={form.externalDistractions}
                    onChange={(v) => set("externalDistractions", v)}
                    inverted
                  />
                  <SliderField
                    label="Need to perform"
                    hint="Financial pressure"
                    minLabel="None"
                    maxLabel="High"
                    value={form.financialPressure}
                    onChange={(v) => set("financialPressure", v)}
                    inverted
                  />
                </>
              )}

              {section.id === "preparation" && (
                <>
                  <MarketEventNudge />
                  <div className="pm-habit-tile-row pm-habit-tile-row--prep">
                    <HabitTileField label="Econ Event Calendar/News" value={form.reviewedNews} onChange={(v) => set("reviewedNews", v)} />
                    <HabitTileField label="Key Levels Marked" value={form.reviewedKeyLevels} onChange={(v) => set("reviewedKeyLevels", v)} />
                    <HabitTileField label="Session Plan Outlined" value={form.dailyPlanWritten} onChange={(v) => set("dailyPlanWritten", v)} />
                  </div>
                </>
              )}
            </div>
            </div>

            {section.id !== "preparation" && nextSection && (
              <div className="checkin-section-actions">
                <button
                  type="button"
                  className="pm-btn-primary-sm"
                  onClick={goNext}
                  aria-label={`Go to ${nextSection.label}`}
                >
                  {nextSection.label}
                  <span className="checkin-btn-arrow" aria-hidden="true">→</span>
                </button>
              </div>
            )}

            {section.id === "preparation" && (
            <div className="pm-checkin-finish checkin-finish-card">
              <div className="pm-checkin-finish-reminders" aria-label="Check-in reminders">
                <span className="pm-checkin-finish-label hybrid-label">Final checks (not scored)</span>
                <div className="pm-habit-tile-row pm-habit-tile-row--desk">
                  {(profile?.finishChecklist || []).map((item) => (
                    <HabitTileField
                      key={item.id}
                      label={item.label}
                      value={deskCheckValue(form, item.id)}
                      onChange={(v) => {
                        setSaved(false);
                        setForm((f) => setDeskCheck(f, item.id, v));
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="checkin-finish-actions">
                <div className="checkin-finish-actions-right">
                  {demoMode ? (
                    <p className="demo-readonly-hint">Demo sample — create an account to save your own check-in.</p>
                  ) : null}
                  <button
                    type="button"
                    className="pm-btn-primary-sm"
                    onClick={handleSave}
                    disabled={demoMode}
                    title={demoMode ? "Create an account to save" : undefined}
                  >
                    Save check-in
                  </button>
                </div>
              </div>
            </div>
            )}
        </div>

        <CheckInRail
          activeIndex={activeSection}
          onSelect={setActiveSection}
          composite={scores.composite}
          dimensions={railDimensions}
          cautionActive={meditationStandDownRequired || (showProtectiveBanner && !form.standDownAcknowledged)}
        />
      </div>
    </WorkflowPageLayout>
  );
}

function sectionTitle(id) {
  switch (id) {
    case "physical":
      return "Body";
    case "mental":
      return "Mind";
    case "external":
      return "External";
    case "preparation":
      return "Pre-open Prep";
    default:
      return "";
  }
}

function sectionDesc(id) {
  switch (id) {
    case "physical":
      return "Fuel and recovery for the session.";
    case "mental":
      return "Emotional readiness for the session.";
    case "external":
      return "Outside pressure and noise.";
    case "preparation":
      return "News, Levels, Plan.";
    default:
      return "";
  }
}
