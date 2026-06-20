"use client";

import { useState, useEffect, useCallback } from "react";
import {
  loadDllSettings,
  saveDllSettings,
  validateDllSettingsInput,
  DEFAULT_DLL_SETTINGS,
} from "../lib/dll-recovery-settings";
import { formatRecoveryUsd } from "../lib/dll-recovery";

function headerDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();
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

export default function Settings() {
  const [form, setForm] = useState({
    fullDll: String(DEFAULT_DLL_SETTINGS.fullDll),
    halfDll: String(DEFAULT_DLL_SETTINGS.halfDll),
    recoveryEnabled: DEFAULT_DLL_SETTINGS.recoveryEnabled,
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const set = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }, []);

  useEffect(() => {
    (async () => {
      const settings = await loadDllSettings();
      setForm({
        fullDll: String(settings.fullDll),
        halfDll: String(settings.halfDll),
        recoveryEnabled: settings.recoveryEnabled,
      });
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    const check = validateDllSettingsInput(form);
    if (!check.ok) {
      window.alert(check.message);
      return;
    }
    await saveDllSettings(check.settings);
    setForm({
      fullDll: String(check.settings.fullDll),
      halfDll: String(check.settings.halfDll),
      recoveryEnabled: check.settings.recoveryEnabled,
    });
    setSaved(true);
  };

  if (loading) return <div className="pm-loading">Loading...</div>;

  return (
    <div className="premarket-page hybrid-page settings-page">
      <div className="pm-topbar">
        <span>{headerDate()}</span>
      </div>

      <div className="daily-plan-content settings-content">
        <div className="pm-eyebrow hybrid-eyebrow">Settings</div>
        <h1 className="hybrid-page-title">YOUR RULES.</h1>
        <p className="pm-subtitle">
          Risk limits used by daily plan validation and automatic DLL recovery.
        </p>

        <section className="pm-card">
          <div className="pm-section-head">
            <span className="pm-section-num">01</span>
            <div>
              <h2 className="pm-section-title hybrid-section-title">Daily loss limits</h2>
              <p className="pm-section-desc">
                Full-size is your normal max daily loss. Recovery uses the half limit after a full DLL hit.
              </p>
            </div>
          </div>

          <div className="pm-field-grid">
            <div>
              <div className="pm-field-label hybrid-label">Full-size DLL ($)</div>
              <input
                type="text"
                value={form.fullDll}
                onChange={(e) => set("fullDll", e.target.value)}
                className="pm-text-input"
                placeholder="750"
              />
              <p className="pm-field-hint">
                Triggers recovery when a day&apos;s net P&amp;L is at or below −{formatRecoveryUsd(Number(form.fullDll) || DEFAULT_DLL_SETTINGS.fullDll)}.
              </p>
            </div>
            <div>
              <div className="pm-field-label hybrid-label">Recovery DLL ($)</div>
              <input
                type="text"
                value={form.halfDll}
                onChange={(e) => set("halfDll", e.target.value)}
                className="pm-text-input"
                placeholder="400"
              />
              <p className="pm-field-hint">
                Max daily loss while in recovery. Daily plan won&apos;t save above this limit.
              </p>
            </div>
          </div>

          <div className="pm-risk-rails">
            <ToggleField
              label="Automatic recovery"
              hint="When enabled, hitting full DLL enters recovery mode and exits automatically after 50% of drawdown is recovered."
              value={form.recoveryEnabled}
              onChange={(v) => set("recoveryEnabled", v)}
            />
          </div>
        </section>

        <div className="pm-footer pm-footer-postmarket">
          <button type="button" className="pm-btn-save-review" onClick={handleSave}>
            {saved ? "✓ Saved" : "Save settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
