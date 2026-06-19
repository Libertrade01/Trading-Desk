"use client";

import { useState, useEffect, useCallback } from "react";
import { storage } from "../lib/supabase";
import {
  BIAS_OPTIONS,
  VOLATILITY_OPTIONS,
  LEVEL_TYPE_OPTIONS,
  VALID_SETUPS,
  DEFAULT_DAILY_PLAN,
  newKeyLevel,
  newSetup,
} from "../lib/daily-plan-defaults";

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

const RISK_RAILS_MESSAGE = "I can not trade until risk rails are in place";
const BIAS_CHECKLIST_MESSAGE =
  "Complete the chart marks checklist (value area, nodes/LVNs, weekly profile) before saving the plan.";
const COMMITMENT_MESSAGE = "Confirm both commitments before saving the plan.";
const COMMITMENT_TEXT =
  "I believe in myself and I respect myself enough to follow my plan. Following my plans allows me and my family to live our dream.";
const COMMITMENT_TEXT_2 =
  "I will not place any risk when I am not in a self-regulated state.";
const BIAS_GUIDANCE =
  "This is the bias of my plan — where is price in relation to these levels? Where is volume building and where does price not want to go?";

function riskRailsReady(form) {
  return form.maxDailyLossSetInBroker && form.coldTurkeyBlockerSet;
}

function biasChecklistReady(form) {
  return (
    form.biasMarkedValueArea &&
    form.biasMarkedNodesLvns &&
    form.biasMarkedWeeklyProfile
  );
}

function commitmentsReady(form) {
  return form.selfCommitmentAccepted && form.selfRegulatedCommitmentAccepted;
}

export default function DailyPlan({ onBack }) {
  const [form, setForm] = useState(DEFAULT_DAILY_PLAN);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const set = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }, []);

  useEffect(() => {
    (async () => {
      const data = await loadData(`daily-plan-${todayKey()}`, null);
      if (data) setForm({ ...DEFAULT_DAILY_PLAN, ...data });
      setLoading(false);
    })();
  }, []);

  const persistPlan = useCallback(async (formData) => {
    await saveData(`daily-plan-${todayKey()}`, {
      date: todayKey(),
      ...formData,
      savedAt: new Date().toISOString(),
    });
  }, []);

  const handleSave = async () => {
    if (!riskRailsReady(form)) {
      window.alert(RISK_RAILS_MESSAGE);
      return false;
    }
    if (!biasChecklistReady(form)) {
      window.alert(BIAS_CHECKLIST_MESSAGE);
      return false;
    }
    if (!commitmentsReady(form)) {
      window.alert(COMMITMENT_MESSAGE);
      return false;
    }
    await persistPlan(form);
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
  };

  const addLevel = () => set("keyLevels", [...form.keyLevels, newKeyLevel()]);
  const updateLevel = (id, patch) =>
    set("keyLevels", form.keyLevels.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLevel = (id) => set("keyLevels", form.keyLevels.filter((l) => l.id !== id));

  const addSetup = () => set("setups", [...form.setups, newSetup()]);
  const updateSetup = (id, patch) =>
    set("setups", form.setups.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeSetup = (id) => set("setups", form.setups.filter((s) => s.id !== id));

  if (loading) return <div className="pm-loading">Loading...</div>;

  return (
    <div className="premarket-page hybrid-page">
      <div className="pm-topbar">
        <span>{headerDate()}</span>
      </div>

      <div className="daily-plan-content">
        <div className="pm-eyebrow hybrid-eyebrow">Daily plan · {sectionDate()}</div>
        <h1 className="hybrid-page-title">THE PLAN.</h1>
        <p className="pm-subtitle">
          Lock in bias, levels, and risk before the open.
        </p>

        {/* 01 Bias & context */}
        <section className="pm-card">
          <div className="pm-section-head">
            <span className="pm-section-num">01</span>
            <div>
              <h2 className="pm-section-title hybrid-section-title">Bias &amp; context</h2>
              <p className="pm-section-desc">What you think the market is likely to do today, and how confident you are.</p>
            </div>
          </div>
          <div className="pm-field">
            <div className="pm-field-label hybrid-label">Profiles</div>
            <p className="pm-field-hint pm-bias-guidance">{BIAS_GUIDANCE}</p>
            <div className="pm-bias-checklist">
              <label className="pm-commitment-check">
                <input
                  type="checkbox"
                  checked={form.biasMarkedValueArea}
                  onChange={(e) => set("biasMarkedValueArea", e.target.checked)}
                />
                <span className="pm-commitment-text">Mark previous day Value Area</span>
              </label>
              <label className="pm-commitment-check">
                <input
                  type="checkbox"
                  checked={form.biasMarkedNodesLvns}
                  onChange={(e) => set("biasMarkedNodesLvns", e.target.checked)}
                />
                <span className="pm-commitment-text">Mark prominent nodes and LVNs</span>
              </label>
              <label className="pm-commitment-check">
                <input
                  type="checkbox"
                  checked={form.biasMarkedWeeklyProfile}
                  onChange={(e) => set("biasMarkedWeeklyProfile", e.target.checked)}
                />
                <span className="pm-commitment-text">Mark weekly profile levels</span>
              </label>
            </div>
            <p className="pm-commitment-hint">All three required to save today&apos;s plan.</p>
          </div>
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
        </section>

        {/* 02 Key levels */}
        <section className="pm-card">
          <div className="pm-section-head">
            <span className="pm-section-num">02</span>
            <div>
              <h2 className="pm-section-title hybrid-section-title">Key levels</h2>
              <p className="pm-section-desc">The prices that matter today. Mark them now so you don&apos;t have to remember in the heat of the moment.</p>
            </div>
          </div>
          {form.keyLevels.length === 0 ? (
            <div className="pm-empty">No levels yet. Add the prices that bracket your day.</div>
          ) : (
            form.keyLevels.map((level) => (
              <div key={level.id} className="pm-level-row">
                <div>
                  <div className="pm-field-label hybrid-label">Label</div>
                  <input
                    type="text"
                    value={level.label}
                    onChange={(e) => updateLevel(level.id, { label: e.target.value })}
                    className="pm-text-input"
                    placeholder="Yesterday's high"
                  />
                </div>
                <div>
                  <div className="pm-field-label hybrid-label">Price</div>
                  <input
                    type="text"
                    value={level.price}
                    onChange={(e) => updateLevel(level.id, { price: e.target.value })}
                    className="pm-text-input"
                    placeholder="0"
                  />
                </div>
                <div>
                  <div className="pm-field-label hybrid-label">Type</div>
                  <select
                    value={level.type}
                    onChange={(e) => updateLevel(level.id, { type: e.target.value })}
                    className="pm-select"
                  >
                    {LEVEL_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <TrashButton onClick={() => removeLevel(level.id)} />
              </div>
            ))
          )}
          <button type="button" className="pm-add-btn" onClick={addLevel}>+ Add level</button>
        </section>

        {/* 03 Setups */}
        <section className="pm-card">
          <div className="pm-section-head">
            <span className="pm-section-num">03</span>
            <div>
              <h2 className="pm-section-title hybrid-section-title">Setups</h2>
              <p className="pm-section-desc">The specific patterns you&apos;ll trade. If a setup isn&apos;t here, you don&apos;t take it.</p>
              <ul className="pm-valid-setups">
                {VALID_SETUPS.map((setup) => (
                  <li key={setup}>{setup}</li>
                ))}
              </ul>
            </div>
          </div>
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
        </section>

        {/* 04 Risk parameters */}
        <section className="pm-card">
          <div className="pm-section-head">
            <span className="pm-section-num">04</span>
            <div>
              <h2 className="pm-section-title hybrid-section-title">Risk parameters</h2>
              <p className="pm-section-desc">Pre-committing to limits before you&apos;re emotional about them.</p>
            </div>
          </div>
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
            </div>
            <div>
              <div className="pm-field-label hybrid-label">Max trades</div>
              <input type="text" value={form.maxTrades} onChange={(e) => set("maxTrades", e.target.value)} className="pm-text-input" />
            </div>
            <div>
              <div className="pm-field-label hybrid-label">Position size</div>
              <input type="text" value={form.positionSize} onChange={(e) => set("positionSize", e.target.value)} className="pm-text-input" placeholder="2 MNQ" />
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
            <ToggleField
              label="Cold Turkey Blocker Set"
              value={form.coldTurkeyBlockerSet}
              onChange={(v) => set("coldTurkeyBlockerSet", v)}
            />
          </div>
        </section>

        {/* 05 Session rules & focus */}
        <section className="pm-card">
          <div className="pm-section-head">
            <span className="pm-section-num">05</span>
            <div>
              <h2 className="pm-section-title hybrid-section-title">Session rules &amp; focus</h2>
              <p className="pm-section-desc">The intent for today, in your own words.</p>
            </div>
          </div>
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
        </section>

        <section
          className={`pm-commitment${commitmentsReady(form) ? " pm-commitment--checked" : ""}`}
        >
          <div className="pm-commitment-eyebrow hybrid-eyebrow">Commitment</div>
          <label className="pm-commitment-check">
            <input
              type="checkbox"
              checked={form.selfCommitmentAccepted}
              onChange={(e) => set("selfCommitmentAccepted", e.target.checked)}
            />
            <span className="pm-commitment-text">{COMMITMENT_TEXT}</span>
          </label>
          <label className="pm-commitment-check">
            <input
              type="checkbox"
              checked={form.selfRegulatedCommitmentAccepted}
              onChange={(e) => set("selfRegulatedCommitmentAccepted", e.target.checked)}
            />
            <span className="pm-commitment-text">{COMMITMENT_TEXT_2}</span>
          </label>
          <p className="pm-commitment-hint">Both required to save today&apos;s plan.</p>
        </section>

        <div className="pm-footer">
          <div className="pm-actions-row">
            <button type="button" className="pm-btn-link" onClick={handleReset}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.5 8a5.5 5.5 0 019.3-4M13.5 8a5.5 5.5 0 01-9.3 4" strokeLinecap="round"/><path d="M2.5 3.5V8h4.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Reset
            </button>
            <button type="button" className="pm-btn-link" onClick={handleSave}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2.5h10v11H3z"/><path d="M5 2.5V6h6V2.5"/></svg>
              {saved ? "Updated" : "Update plan"}
            </button>
          </div>
          <button type="button" className="pm-btn-return" onClick={handleReturn}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Return to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
