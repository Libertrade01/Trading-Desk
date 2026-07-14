"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { BEHAVIORAL_FLAG_CATEGORIES } from "../lib/postmarket-defaults";
import {
  loadTraderProfile,
  saveTraderProfile,
  validateTraderProfileInput,
  wearableConsentPatch,
} from "../lib/trader-profile";
import { SETUP_IMPROVISED, SETUP_INVALID } from "../lib/setup-options";
import HabitTileField from "./HabitTileField";

const GLOBAL_PLAYBOOK_SETUPS = [
  { id: "global-improvised", label: SETUP_IMPROVISED },
  { id: "global-invalid", label: "Invalid", fullName: SETUP_INVALID },
];

const SECTIONS = [
  { id: "setups", label: "Playbook setups" },
  { id: "chart", label: "Charting Checklist" },
  { id: "final-checks", label: "Final Check" },
  { id: "flags", label: "Accountability" },
  { id: "streaks", label: "Streaks" },
  { id: "commitments", label: "Commitments" },
  { id: "other", label: "Other" },
  { id: "cold-turkey", label: "Cold turkey", founderOnly: true },
];

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

function ListRow({ children, onRemove, canRemove }) {
  return (
    <div className="settings-list-row">
      <div className="settings-list-row-body">{children}</div>
      {canRemove && (
        <button type="button" className="pm-icon-btn settings-list-remove" onClick={onRemove} aria-label="Remove">
          ×
        </button>
      )}
    </div>
  );
}

function getSectionStatus(profile, sectionId) {
  if (!profile) return "ok";
  switch (sectionId) {
    case "setups":
      return profile.setups.some((s) => !s.name.trim()) ? "warn" : "ok";
    case "commitments":
      return profile.commitments.some((c) => !c.text.trim()) ? "warn" : "ok";
    case "chart":
      return profile.biasChecklistEnabled &&
        profile.biasChecklistItems.some((i) => !i.label.trim())
        ? "warn"
        : "ok";
    case "final-checks":
      return profile.finishChecklist.some((i) => !i.label.trim()) ? "warn" : "ok";
    case "streaks":
    case "other":
    case "cold-turkey":
      return "ok";
    case "flags":
      return profile.behavioralFlags.custom.some((f) => !f.label.trim()) ? "warn" : "ok";
    default:
      return "ok";
  }
}

export default function MyProcessSettings({ standalone = false }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("setups");

  useEffect(() => {
    loadTraderProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  const patch = useCallback((updates) => {
    setProfile((p) => ({ ...p, ...updates }));
    setSaved(false);
  }, []);

  const handleSave = async () => {
    const check = validateTraderProfileInput(profile);
    if (!check.ok) {
      window.alert(check.message);
      return;
    }
    setSaving(true);
    try {
      const next = await saveTraderProfile(check.profile);
      setProfile(next);
      setSaved(true);
    } catch (err) {
      window.alert(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const isFounder = profile?.profileKind === "founder";

  const visibleSections = useMemo(
    () => SECTIONS.filter((s) => !s.founderOnly || isFounder),
    [isFounder]
  );

  const sectionIndex = visibleSections.findIndex((s) => s.id === activeSection);
  const activeMeta = visibleSections.find((s) => s.id === activeSection) || visibleSections[0];

  useEffect(() => {
    if (!visibleSections.some((s) => s.id === activeSection)) {
      setActiveSection(visibleSections[0]?.id || "setups");
    }
  }, [visibleSections, activeSection]);

  if (loading) return <div className="pm-loading">Loading process…</div>;
  if (!profile) return null;

  const renderSection = () => {
    switch (activeSection) {
      case "setups":
        return (
          <div className="pm-field process-split-field">
            <p className="pm-field-hint process-split-lead">
              Shown in session plan and used for trade import tagging.
            </p>
            <div className="settings-list">
              {profile.setups.map((setup, index) => (
                <ListRow
                  key={setup.id}
                  canRemove={profile.setups.length > 1}
                  onRemove={() => patch({ setups: profile.setups.filter((s) => s.id !== setup.id) })}
                >
                  <input
                    type="text"
                    value={setup.name}
                    onChange={(e) => {
                      const setups = profile.setups.map((s) =>
                        s.id === setup.id ? { ...s, name: e.target.value } : s
                      );
                      patch({ setups });
                    }}
                    className="pm-text-input"
                    placeholder={index === 0 ? "Break and Retest" : "Setup name"}
                  />
                </ListRow>
              ))}
            </div>
            {profile.setups.length < 8 && (
              <button
                type="button"
                className="pm-add-btn"
                onClick={() => patch({ setups: [...profile.setups, { id: crypto.randomUUID(), name: "" }] })}
              >
                + Add setup
              </button>
            )}
            <div className="settings-global-setups" aria-label="Global setup tags">
              {GLOBAL_PLAYBOOK_SETUPS.map((setup) => (
                <div key={setup.id} className="settings-list-row settings-list-row--global">
                  <div className="settings-list-row-body">
                    <div
                      className="settings-setup-locked"
                      title={setup.fullName || setup.label}
                    >
                      {setup.label}
                    </div>
                  </div>
                  <span className="settings-setup-global-tag">Global</span>
                </div>
              ))}
            </div>
          </div>
        );

      case "commitments":
        return (
          <div className="pm-field process-split-field">
            <p className="pm-field-hint process-split-lead">
              Traders confirm each line before saving the daily plan.
            </p>
            <div className="settings-list">
              {profile.commitments.map((commitment) => (
                <ListRow
                  key={commitment.id}
                  canRemove={profile.commitments.length > 1}
                  onRemove={() =>
                    patch({ commitments: profile.commitments.filter((c) => c.id !== commitment.id) })
                  }
                >
                  <textarea
                    value={commitment.text}
                    onChange={(e) => {
                      const commitments = profile.commitments.map((c) =>
                        c.id === commitment.id ? { ...c, text: e.target.value } : c
                      );
                      patch({ commitments });
                    }}
                    className="pm-textarea"
                    rows={2}
                  />
                </ListRow>
              ))}
            </div>
            {profile.commitments.length < 3 && (
              <button
                type="button"
                className="pm-add-btn"
                onClick={() =>
                  patch({
                    commitments: [
                      ...profile.commitments,
                      { id: crypto.randomUUID(), text: "I will follow my plan today." },
                    ],
                  })
                }
              >
                + Add commitment
              </button>
            )}
          </div>
        );

      case "chart":
        return (
          <div className="pm-field process-split-field">
            <ToggleField
              label="Charting checklist"
              hint="Shown in session plan, confirm your charts are marked up before you trade."
              value={profile.biasChecklistEnabled}
              onChange={(v) => patch({ biasChecklistEnabled: v })}
            />
            {profile.biasChecklistEnabled && (
              <>
                <div className="settings-list settings-list--nested">
                  {profile.biasChecklistItems.map((item) => (
                    <ListRow
                      key={item.id}
                      canRemove={profile.biasChecklistItems.length > 1}
                      onRemove={() =>
                        patch({
                          biasChecklistItems: profile.biasChecklistItems.filter((row) => row.id !== item.id),
                        })
                      }
                    >
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => {
                          const biasChecklistItems = profile.biasChecklistItems.map((row) =>
                            row.id === item.id ? { ...row, label: e.target.value } : row
                          );
                          patch({ biasChecklistItems });
                        }}
                        className="pm-text-input"
                        placeholder="e.g. Value area marked"
                      />
                    </ListRow>
                  ))}
                </div>
                {profile.biasChecklistItems.length < 8 && (
                  <button
                    type="button"
                    className="pm-add-btn"
                    onClick={() =>
                      patch({
                        biasChecklistItems: [
                          ...profile.biasChecklistItems,
                          { id: crypto.randomUUID(), label: "" },
                        ],
                      })
                    }
                  >
                    + Add checklist item
                  </button>
                )}
              </>
            )}
          </div>
        );

      case "final-checks":
        return (
          <div className="pm-field process-split-field">
            <p className="pm-field-hint process-split-lead">
              Last checks before you are ready to start trading.
            </p>
            <div className="settings-list">
              {profile.finishChecklist.map((item) => (
                <ListRow
                  key={item.id}
                  canRemove={profile.finishChecklist.length > 1}
                  onRemove={() =>
                    patch({ finishChecklist: profile.finishChecklist.filter((r) => r.id !== item.id) })
                  }
                >
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => {
                      const finishChecklist = profile.finishChecklist.map((row) =>
                        row.id === item.id ? { ...row, label: e.target.value } : row
                      );
                      patch({ finishChecklist });
                    }}
                    className="pm-text-input"
                    placeholder="e.g. Account(s) Ready"
                  />
                </ListRow>
              ))}
            </div>
            {profile.finishChecklist.length < 6 && (
              <button
                type="button"
                className="pm-add-btn"
                onClick={() =>
                  patch({
                    finishChecklist: [
                      ...profile.finishChecklist,
                      { id: crypto.randomUUID(), label: "" },
                    ],
                  })
                }
              >
                + Add final check
              </button>
            )}
          </div>
        );

      case "streaks":
        return (
          <div className="pm-field process-split-field">
            <p className="pm-field-hint process-split-lead">
              Track risk adherence and playbook tagging on your home dashboard.
            </p>
            <div className="pm-toggle-row">
              <ToggleField
                label="Risk adherence streak"
                value={profile.riskStreakEnabled}
                onChange={(v) => patch({ riskStreakEnabled: v })}
              />
              <ToggleField
                label="Playbook setup streak"
                value={profile.playbookStreakEnabled}
                onChange={(v) => patch({ playbookStreakEnabled: v })}
              />
            </div>
            <div className="process-split-streak-target">
              <label className="pm-commitment-check process-split-streak-target-toggle">
                <input
                  type="checkbox"
                  checked={profile.streakTargetDays != null}
                  onChange={(e) => {
                    if (e.target.checked) {
                      patch({ streakTargetDays: profile.streakTargetDays ?? 21 });
                    } else {
                      patch({ streakTargetDays: null });
                    }
                  }}
                />
                <span className="pm-commitment-text">Streak target (days)</span>
              </label>
              <p className="pm-field-hint">
                When off, home shows the streak count only. When on, shows a goal like 9/21.
              </p>
              {profile.streakTargetDays != null && (
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={profile.streakTargetDays}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n >= 1) patch({ streakTargetDays: n });
                  }}
                  className="pm-number-input process-split-streak-target-input"
                  aria-label="Streak target days"
                />
              )}
            </div>
          </div>
        );

      case "other":
        return (
          <div className="pm-field process-split-field">
            <div className="pm-habit-tile-row process-split-wearable-row">
              <HabitTileField
                label="Track wearable data"
                hint="Adds HRV and Sleep Debt to Check-in. Enabling it records your consent to store and use those readings for readiness scores and reviews. Turn it off to hide the fields and stop future collection."
                value={profile.usesWearable}
                onChange={(v) => patch(wearableConsentPatch(v))}
              />
            </div>
          </div>
        );

      case "cold-turkey":
        return (
          <div className="pm-field process-split-field">
            <p className="pm-field-hint process-split-lead">Founder-only risk rail on the session plan.</p>
            <ToggleField
              label="Cold turkey blocker"
              value={profile.showColdTurkeyBlocker}
              onChange={(v) => patch({ showColdTurkeyBlocker: v })}
            />
          </div>
        );

      case "flags":
        return (
          <div className="pm-field process-split-field">
            <p className="pm-field-hint process-split-lead">
              Choose which flags appear in Close LOOP. Keep yourself accountable each session.
            </p>
            {BEHAVIORAL_FLAG_CATEGORIES.map((category) => (
              <div key={category.id} className="settings-flag-category">
                <div className="hybrid-label-sm settings-flag-category-title">{category.label}</div>
                <div className="settings-flag-grid">
                  {category.flags.map((flag) => (
                    <label key={flag.key} className="pm-commitment-check">
                      <input
                        type="checkbox"
                        checked={profile.behavioralFlags.builtin[flag.key] !== false}
                        onChange={(e) =>
                          patch({
                            behavioralFlags: {
                              ...profile.behavioralFlags,
                              builtin: {
                                ...profile.behavioralFlags.builtin,
                                [flag.key]: e.target.checked,
                              },
                            },
                          })
                        }
                      />
                      <span className="pm-commitment-text">{flag.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {profile.behavioralFlags.custom.length > 0 && (
              <div className="settings-list settings-list--nested">
                {profile.behavioralFlags.custom.map((flag) => (
                  <ListRow
                    key={flag.id}
                    canRemove
                    onRemove={() =>
                      patch({
                        behavioralFlags: {
                          ...profile.behavioralFlags,
                          custom: profile.behavioralFlags.custom.filter((f) => f.id !== flag.id),
                        },
                      })
                    }
                  >
                    <input
                      type="text"
                      value={flag.label}
                      onChange={(e) => {
                        const custom = profile.behavioralFlags.custom.map((row) =>
                          row.id === flag.id ? { ...row, label: e.target.value } : row
                        );
                        patch({ behavioralFlags: { ...profile.behavioralFlags, custom } });
                      }}
                      className="pm-text-input"
                      placeholder="Custom flag label"
                    />
                  </ListRow>
                ))}
              </div>
            )}
            <button
              type="button"
              className="pm-add-btn"
              onClick={() =>
                patch({
                  behavioralFlags: {
                    ...profile.behavioralFlags,
                    custom: [
                      ...profile.behavioralFlags.custom,
                      { id: crypto.randomUUID(), categoryId: "custom", label: "", hint: "" },
                    ],
                  },
                })
              }
            >
              + Add custom flag
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section className={`process-split-shell${standalone ? " process-split-shell--standalone" : ""}`}>
      {!standalone && (
        <div className="pm-section-head">
          <span className="pm-section-num">01</span>
          <div>
            <h2 className="pm-section-title hybrid-section-title">My process</h2>
            <p className="pm-section-desc">
              Playbook setups, commitments, check-in desk list, and close loop flags — tailored to how you trade.
            </p>
          </div>
        </div>
      )}

      <div className="process-split">
        <nav className="process-split-nav" aria-label="Process sections">
          {visibleSections.map((section) => {
            const status = getSectionStatus(profile, section.id);
            return (
              <button
                key={section.id}
                type="button"
                className={`process-split-nav-btn${activeSection === section.id ? " active" : ""}`}
                onClick={() => setActiveSection(section.id)}
                aria-current={activeSection === section.id ? "true" : undefined}
              >
                <span
                  className={`process-split-dot${status === "warn" ? " warn" : ""}`}
                  aria-hidden="true"
                />
                {section.label}
              </button>
            );
          })}
        </nav>

        <div className="process-split-body">
          <h3 className="process-split-section-title hybrid-section-title">{activeMeta.label}</h3>
          <div className="process-split-content">{renderSection()}</div>

          <div className={`settings-sticky-save${saved ? "" : " settings-sticky-save--dirty"}`}>
            <p className="settings-sticky-save-hint">
              {saved
                ? "All sections saved"
                : `Section ${sectionIndex + 1} of ${visibleSections.length} · unsaved changes`}
            </p>
            <button type="button" className="pm-btn-save-review" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : saved ? "✓ Process saved" : "Save my process"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
