"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { storage } from "../lib/supabase";
import {
  computeReadinessScore,
  readinessStatus,
  sliderValueColor,
  DEFAULT_PREMARKET_FORM,
} from "../lib/premarket-scoring";
import MarketEventNudge from "./MarketEventNudge";
import ReadinessScoreWidget from "./ReadinessScoreWidget";

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

function todayKey() {
  return new Date().toISOString().split("T")[0];
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

function DimBar({ label, value }) {
  const tone = value >= 70 ? "var(--green)" : value >= 50 ? "var(--amber)" : "var(--red)";
  return (
    <div className="pm-dim-bar">
      <div className="pm-dim-bar-header">
        <span>{label}</span>
        <span style={{ color: tone }}>{value}</span>
      </div>
      <div className="pm-dim-bar-track">
        <div className="pm-dim-bar-fill" style={{ width: `${value}%`, background: tone }} />
      </div>
    </div>
  );
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

export default function PreMarketCheckIn({ onBack }) {
  const [form, setForm] = useState(DEFAULT_PREMARKET_FORM);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const scores = useMemo(() => computeReadinessScore(form), [form]);
  const status = useMemo(() => readinessStatus(scores.composite), [scores.composite]);

  const set = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }, []);

  useEffect(() => {
    (async () => {
      const data = await loadData(`premarket-checkin-${todayKey()}`, null);
      if (data) setForm({ ...DEFAULT_PREMARKET_FORM, ...data });
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
    savedAt: new Date().toISOString(),
  }), []);

  const persistCheckin = useCallback(async (formData, scoreData, statusData) => {
    const payload = buildSavePayload(formData, scoreData, statusData);
    if (payload.standDownAcknowledged && !formData.standDownAcknowledgedAt) {
      payload.standDownAcknowledgedAt = new Date().toISOString();
    }
    await saveData(`premarket-checkin-${todayKey()}`, payload);
    return payload;
  }, [buildSavePayload]);

  const handleSave = async () => {
    await persistCheckin(form, scores, status);
    setSaved(true);
  };

  const handleStandDownAcknowledge = async (checked) => {
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
    setSaved(false);
  };

  if (loading) {
    return <div className="pm-loading">Loading...</div>;
  }

  return (
    <div className="premarket-page hybrid-page">
      <div className="pm-topbar">
        <span>{headerDate()}</span>
      </div>

      <div className="premarket-grid">
        <div className="pm-header">
          <div className="pm-eyebrow hybrid-eyebrow">Pre-market · {sectionDate()}</div>
          <h1 className="hybrid-page-title">CHECK IN.</h1>
          <p className="pm-subtitle">
            Be honest before the open. Your score updates as you go.
          </p>
        </div>

        <div className="premarket-form">
          {/* 01 Physical */}
          <section className="pm-card">
            <div className="pm-section-head">
              <span className="pm-section-num">01</span>
              <div>
                <h2 className="pm-section-title hybrid-section-title">Physical state</h2>
                <p className="pm-section-desc">The body the brain rents.</p>
              </div>
            </div>
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
          </section>

          {/* 02 Mental */}
          <section className="pm-card">
            <div className="pm-section-head">
              <span className="pm-section-num">02</span>
              <div>
                <h2 className="pm-section-title hybrid-section-title">Mental state</h2>
                <p className="pm-section-desc">How you arrive on the desk today.</p>
              </div>
            </div>
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
          </section>

          {/* 03 External */}
          <section className="pm-card">
            <div className="pm-section-head">
              <span className="pm-section-num">03</span>
              <div>
                <h2 className="pm-section-title hybrid-section-title">External</h2>
                <p className="pm-section-desc">What the world is throwing at you.</p>
              </div>
            </div>
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
          </section>

          {/* 04 Preparation */}
          <section className="pm-card">
            <div className="pm-section-head">
              <span className="pm-section-num">04</span>
              <div>
                <h2 className="pm-section-title hybrid-section-title">Preparation</h2>
                <p className="pm-section-desc">The work you did before market open.</p>
              </div>
            </div>
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
          </section>

          {/* Mantra */}
          <section className="pm-card pm-mantra-card">
            <h2 className="pm-mantra-title hybrid-section-title">My mantra for today</h2>
            <p className="pm-section-desc">One line to anchor your session. It rides on your scorecard.</p>
            <input
              type="text"
              value={form.mantra}
              onChange={(e) => set("mantra", e.target.value)}
              className="pm-text-input pm-mantra-input"
              placeholder="Wait for A+, Area then Execution."
            />
          </section>

          {/* Reminders — separate block, not scored */}
          <section className="pm-reminders-panel" aria-label="Pre-market reminders">
            <div className="pm-reminders-head">
              <div className="pm-reminders-eyebrow hybrid-eyebrow">Reminders</div>
              <p className="pm-reminders-hint">Desk setup before the open. Not scored.</p>
            </div>
            <div className="pm-reminders-list">
              <ToggleField label="Unlock Accounts" value={form.unlockAccounts} onChange={(v) => set("unlockAccounts", v)} />
              <ToggleField label="Check CPU" value={form.checkCpu} onChange={(v) => set("checkCpu", v)} />
              <ToggleField label="Select Risk Bracket Order" value={form.selectRiskBracketOrder} onChange={(v) => set("selectRiskBracketOrder", v)} />
            </div>
          </section>

          <div className="pm-footer">
            <div className="pm-actions-row">
              <button type="button" className="pm-btn-link" onClick={handleReset}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.5 8a5.5 5.5 0 019.3-4M13.5 8a5.5 5.5 0 01-9.3 4" strokeLinecap="round"/><path d="M2.5 3.5V8h4.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Reset
              </button>
              <button type="button" className="pm-btn-link" onClick={handleSave}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2.5h10v11H3z"/><path d="M5 2.5V6h6V2.5"/></svg>
                {saved ? "Updated" : "Update check-in"}
              </button>
            </div>
            <button type="button" className="pm-btn-return" onClick={() => { handleSave(); onBack(); }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Return to dashboard
            </button>
          </div>
        </div>

        <aside className="premarket-score-panel">
          <div className="pm-score-stack">
            <div className="pm-score-card">
              <ReadinessScoreWidget
                score={scores.composite}
                statusLabel={status.label}
                statusTone={status.tone}
                variant="full"
              />
              <div className="pm-dim-bars">
                <DimBar label="Physical" value={scores.physical} />
                <DimBar label="Mental" value={scores.emotional} />
                <DimBar label="External" value={scores.external} />
                <DimBar label="Preparation" value={scores.preparation} />
              </div>
              <p className="pm-score-footnote">
                Your score updates as you fill in the form. Weighted: physical 22% · mental 38% · prep 25% · external 15%.
              </p>
            </div>

            {scores.composite < 50 && (
              <div className={`pm-standdown-card${form.standDownAcknowledged ? " pm-standdown-card--acknowledged" : ""}`}>
                <div className="pm-standdown-header">
                  <div className="pm-standdown-icon">
                    {form.standDownAcknowledged ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 2l7 4v6c0 5-3 9-7 10C8 21 5 17 5 12V6l7-4z" />
                        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 2l7 4v6c0 5-3 9-7 10C8 21 5 17 5 12V6l7-4z" />
                      </svg>
                    )}
                  </div>
                  <h3 className="pm-standdown-title">Stand-down day?</h3>
                </div>
                {!form.standDownAcknowledged && (
                  <p className="pm-standdown-text">
                    Your score is signaling caution. If you trade today, trade small. If you don&apos;t trade, that&apos;s a win — and it gets recognized.
                  </p>
                )}
                <label className={`pm-standdown-check${form.standDownAcknowledged ? " pm-standdown-check--acknowledged" : ""}`}>
                  <input
                    type="checkbox"
                    checked={form.standDownAcknowledged}
                    onChange={(e) => handleStandDownAcknowledge(e.target.checked)}
                  />
                  <span>
                    {form.standDownAcknowledged
                      ? "Stand-down acknowledged. Honor it."
                      : "I acknowledge today is a stand-down day."}
                  </span>
                </label>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
