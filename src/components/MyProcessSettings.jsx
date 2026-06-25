"use client";

import { useState, useEffect, useCallback } from "react";
import { BEHAVIORAL_FLAG_CATEGORIES } from "../lib/postmarket-defaults";
import {
  loadTraderProfile,
  saveTraderProfile,
  validateTraderProfileInput,
} from "../lib/trader-profile";

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

export default function MyProcessSettings({ standalone = false }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

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

  if (loading) return <div className="pm-loading">Loading process…</div>;
  if (!profile) return null;

  const isFounder = profile.profileKind === "founder";

  return (
    <section className="pm-card">
      {!standalone && (
        <div className="pm-section-head">
          <span className="pm-section-num">01</span>
          <div>
            <h2 className="pm-section-title hybrid-section-title">My process</h2>
            <p className="pm-section-desc">
              Playbook setups, commitments, check-in desk list, and close-out flags — tailored to how you trade.
            </p>
          </div>
        </div>
      )}

      <div className="pm-field">
        <div className="pm-field-label hybrid-label">Playbook setups</div>
        <p className="pm-field-hint">Shown in session plan and used for import tagging. Improvised and Invalid stay global.</p>
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
                placeholder={index === 0 ? "e.g. VWAP rejection" : "Setup name"}
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
      </div>

      <div className="pm-field">
        <div className="pm-field-label hybrid-label">Session plan commitments</div>
        <p className="pm-field-hint">Traders confirm each line before saving the daily plan.</p>
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

      <div className="pm-field">
        <ToggleField
          label="Chart marks checklist"
          hint="Required items on the session plan bias step."
          value={profile.biasChecklistEnabled}
          onChange={(v) => patch({ biasChecklistEnabled: v })}
        />
        {profile.biasChecklistEnabled && (
          <div className="settings-list settings-list--nested">
            {profile.biasChecklistItems.map((item) => (
              <ListRow key={item.id} canRemove={false}>
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
                />
              </ListRow>
            ))}
          </div>
        )}
      </div>

      <div className="pm-field-grid">
        <div>
          <div className="pm-field-label hybrid-label">Streak target (days)</div>
          <input
            type="number"
            min={1}
            max={365}
            value={profile.streakTargetDays}
            onChange={(e) => patch({ streakTargetDays: Number(e.target.value) || 21 })}
            className="pm-number-input"
          />
        </div>
      </div>
      <div className="pm-toggle-row">
        <ToggleField
          label="Risk adherence streak"
          value={profile.riskStreakEnabled}
          onChange={(v) => patch({ riskStreakEnabled: v })}
        />
        <ToggleField
          label="Playbook streak"
          value={profile.playbookStreakEnabled}
          onChange={(v) => patch({ playbookStreakEnabled: v })}
        />
        <ToggleField
          label="I use a wearable"
          hint="Shows HRV and sleep debt in check-in."
          value={profile.usesWearable}
          onChange={(v) => patch({ usesWearable: v })}
        />
      </div>

      {isFounder && (
        <div className="pm-risk-rails">
          <ToggleField
            label="Cold turkey blocker"
            hint="Founder-only risk rail on the session plan."
            value={profile.showColdTurkeyBlocker}
            onChange={(v) => patch({ showColdTurkeyBlocker: v })}
          />
        </div>
      )}

      <div className="pm-field">
        <div className="pm-field-label hybrid-label">Check-in desk setup</div>
        <p className="pm-field-hint">Final checklist before the open — not scored.</p>
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
                placeholder="e.g. Unlock accounts"
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
            + Add desk item
          </button>
        )}
      </div>

      <div className="pm-field">
        <div className="pm-field-label hybrid-label">Close-out behavioral flags</div>
        <p className="pm-field-hint">Choose which flags appear in close out. Journal prompts stay standard.</p>
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

      <div className="settings-process-save">
        <button type="button" className="pm-btn-save-review" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : saved ? "✓ Process saved" : "Save my process"}
        </button>
      </div>
    </section>
  );
}
