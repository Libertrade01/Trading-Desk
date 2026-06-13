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
        <div className="pm-field-label">{label}</div>
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

function riskRailsReady(form) {
  return form.maxDailyLossSetInBroker && form.coldTurkeyBlockerSet;
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

  const handleShare = async () => {
    const levels = form.keyLevels.map((l) => `${l.label || "Level"}: ${l.price} (${l.type})`).join("\n");
    const setups = form.setups.map((s) => s.name || "Setup").join(", ");
    const text = [
      `Daily Plan · ${todayKey()}`,
      `Bias: ${form.directionalBias} · Vol: ${form.expectedVolatility}`,
      form.whyBias ? `Context: ${form.whyBias}` : null,
      levels ? `Levels:\n${levels}` : null,
      setups ? `Setups: ${setups}` : null,
      form.oneThing ? `Focus: ${form.oneThing}` : null,
    ].filter(Boolean).join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: "Libertrade Daily Plan", text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      /* cancelled */
    }
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
    <div className="premarket-page">
      <div className="pm-topbar">
        <span>{headerDate()}</span>
        <span className="pm-live"><span className="pm-live-dot" />Live</span>
      </div>

      <div className="daily-plan-content">
        <button type="button" className="pm-back" onClick={onBack}>← Back to dashboard</button>

        <div className="pm-eyebrow">Daily plan · {sectionDate()}</div>
        <h1 className="pm-title">Update today&apos;s plan</h1>
        <p className="pm-subtitle">
          Pre-commit to bias, levels, setups, and risk before the bell. The market doesn&apos;t care about your plan, but you should.
        </p>

        {/* 01 Bias & context */}
        <section className="pm-card">
          <div className="pm-section-head">
            <span className="pm-section-num">01</span>
            <div>
              <h2 className="pm-section-title">Bias &amp; context</h2>
              <p className="pm-section-desc">What you think the market is likely to do today, and how confident you are.</p>
            </div>
          </div>
          <div className="pm-field">
            <div className="pm-field-label">Directional bias</div>
            <select value={form.directionalBias} onChange={(e) => set("directionalBias", e.target.value)} className="pm-select">
              {BIAS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="pm-field">
            <div className="pm-field-label">Expected volatility</div>
            <select value={form.expectedVolatility} onChange={(e) => set("expectedVolatility", e.target.value)} className="pm-select">
              {VOLATILITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="pm-field">
            <div className="pm-field-label">Why this bias</div>
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
              <h2 className="pm-section-title">Key levels</h2>
              <p className="pm-section-desc">The prices that matter today. Mark them now so you don&apos;t have to remember in the heat of the moment.</p>
            </div>
          </div>
          {form.keyLevels.length === 0 ? (
            <div className="pm-empty">No levels yet. Add the prices that bracket your day.</div>
          ) : (
            form.keyLevels.map((level) => (
              <div key={level.id} className="pm-level-row">
                <div>
                  <div className="pm-field-label">Label</div>
                  <input
                    type="text"
                    value={level.label}
                    onChange={(e) => updateLevel(level.id, { label: e.target.value })}
                    className="pm-text-input"
                    placeholder="Yesterday's high"
                  />
                </div>
                <div>
                  <div className="pm-field-label">Price</div>
                  <input
                    type="text"
                    value={level.price}
                    onChange={(e) => updateLevel(level.id, { price: e.target.value })}
                    className="pm-text-input"
                    placeholder="0"
                  />
                </div>
                <div>
                  <div className="pm-field-label">Type</div>
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
              <h2 className="pm-section-title">Setups</h2>
              <p className="pm-section-desc">The specific patterns you&apos;ll trade. If a setup isn&apos;t here, you don&apos;t take it.</p>
            </div>
          </div>
          {form.setups.length === 0 ? (
            <div className="pm-empty">No setups yet. Define what you&apos;re hunting today.</div>
          ) : (
            form.setups.map((setup) => (
              <div key={setup.id} className="pm-setup-card">
                <TrashButton onClick={() => removeSetup(setup.id)} />
                <div className="pm-field">
                  <div className="pm-field-label">Setup name</div>
                  <input
                    type="text"
                    value={setup.name}
                    onChange={(e) => updateSetup(setup.id, { name: e.target.value })}
                    className="pm-text-input"
                    placeholder="VWAP rejection short"
                  />
                </div>
                <div className="pm-field">
                  <div className="pm-field-label">Conditions</div>
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
                    <div className="pm-field-label">Target</div>
                    <input
                      type="text"
                      value={setup.target}
                      onChange={(e) => updateSetup(setup.id, { target: e.target.value })}
                      className="pm-text-input"
                      placeholder="VWAP - 1.5 std"
                    />
                  </div>
                  <div>
                    <div className="pm-field-label">Stop</div>
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
              <h2 className="pm-section-title">Risk parameters</h2>
              <p className="pm-section-desc">Pre-committing to limits before you&apos;re emotional about them.</p>
            </div>
          </div>
          <div className="pm-field pm-risk-dd-field">
            <div className="pm-field-label">DD from high water mark (%)</div>
            <input
              type="text"
              value={form.ddFromHighWaterMark}
              onChange={(e) => set("ddFromHighWaterMark", e.target.value)}
              className="pm-text-input"
              placeholder="This determines risk and sizing"
            />
          </div>
          <div className="pm-field-grid">
            <div>
              <div className="pm-field-label">Max daily loss ($)</div>
              <input type="text" value={form.maxDailyLoss} onChange={(e) => set("maxDailyLoss", e.target.value)} className="pm-text-input" />
            </div>
            <div>
              <div className="pm-field-label">Max trades</div>
              <input type="text" value={form.maxTrades} onChange={(e) => set("maxTrades", e.target.value)} className="pm-text-input" />
            </div>
            <div>
              <div className="pm-field-label">Position size</div>
              <input type="text" value={form.positionSize} onChange={(e) => set("positionSize", e.target.value)} className="pm-text-input" placeholder="2 MNQ" />
            </div>
            <div>
              <div className="pm-field-label">Stop trading at</div>
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
              <h2 className="pm-section-title">Session rules &amp; focus</h2>
              <p className="pm-section-desc">The intent for today, in your own words.</p>
            </div>
          </div>
          <div className="pm-field">
            <div className="pm-field-label">Session rules</div>
            <textarea
              value={form.sessionRules}
              onChange={(e) => set("sessionRules", e.target.value)}
              className="pm-textarea"
              placeholder="No trades in the first 5 minutes. No averaging losers. Take partials at 1R."
              rows={3}
            />
          </div>
          <div className="pm-field">
            <div className="pm-field-label">The one thing</div>
            <textarea
              value={form.oneThing}
              onChange={(e) => set("oneThing", e.target.value)}
              className="pm-textarea"
              placeholder="If today goes wrong, what's the most likely reason — and how do you guard against it?"
              rows={3}
            />
          </div>
        </section>

        <div className="pm-footer">
          <div className="pm-actions-row">
            <button type="button" className="pm-btn-link" onClick={handleReset}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.5 8a5.5 5.5 0 019.3-4M13.5 8a5.5 5.5 0 01-9.3 4" strokeLinecap="round"/><path d="M2.5 3.5V8h4.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Reset
            </button>
            <button type="button" className="pm-btn-share" onClick={handleShare}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="4" r="2"/><circle cx="4" cy="8" r="2"/><circle cx="12" cy="12" r="2"/><path d="M6 7l4-2M6 9l4 2"/></svg>
              Share
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
