"use client";

import { useState, useEffect, useMemo } from "react";
import {
  getRaisedBehavioralFlags,
  JOURNAL_REVIEW_CHECKLIST,
  formatJournalReviewPendingSummary,
  hasJournalReviewPending,
} from "../lib/postmarket-defaults";
import { notifySessionSaved } from "../lib/session-events";
import { parseSleepDebtMinutes } from "../lib/premarket-scoring";
import {
  loadSessionDay,
  deleteSessionDay,
  formatDetailTitle,
  biasTag,
  volTag,
  sessionOpenVsValueTag,
  getRiskPlanFollowed,
} from "../lib/history-data";
import { playbookAdherenceLabel } from "../lib/setup-adherence";
import HistoryDaySummary from "./history/HistoryDaySummary";
import WorkflowPageLayout from "./WorkflowPageLayout";
import {
  loadRecoveryState,
  buildRecoveryDayAnnotations,
  getRecoveryDayLabel,
} from "../lib/dll-recovery";
import { loadDllSettings } from "../lib/dll-recovery-settings";

function emptyValue(val) {
  if (val === true) return "Yes";
  if (val === false) return "No";
  return val ?? "-";
}

function StatPanel({ title, items }) {
  const visible = items.filter((item) => item.value != null && item.value !== "-");
  if (!visible.length) return null;

  return (
    <div className="history-detail-stat-panel">
      <h3 className="history-detail-stat-panel__title">{title}</h3>
      <dl className="history-detail-stat-list">
        {visible.map((item) => (
          <div key={item.label} className="history-detail-stat-row">
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SectionCard({ num, title, subtitle, children, className = "" }) {
  return (
    <section className={`history-detail-section${className ? ` ${className}` : ""}`}>
      <header className="history-detail-section__head">
        {num ? <span className="history-detail-section__num">{num}</span> : null}
        <div>
          <h2 className="history-detail-section__title">{title}</h2>
          {subtitle ? <p className="history-detail-section__sub">{subtitle}</p> : null}
        </div>
      </header>
      <div className="history-detail-section__body">{children}</div>
    </section>
  );
}

function ProseBlock({ label, children }) {
  if (!children) return null;
  return (
    <div className="history-detail-prose">
      <div className="history-detail-prose__label">{label}</div>
      <p>{children}</p>
    </div>
  );
}

function ScoreChip({ label, value, tone }) {
  return (
    <div className={`history-detail-score${tone ? ` history-detail-score--${tone}` : ""}`}>
      <span className="history-detail-score__label">{label}</span>
      <strong className="history-detail-score__value">{value ?? "-"}</strong>
    </div>
  );
}

function HistoryJournalChecklist({ date, post, onPostUpdated }) {
  const checklist = Array.isArray(post?.closeoutHabitsSnapshot)
    ? post.closeoutHabitsSnapshot.filter((item) => item.enabled !== false)
    : JOURNAL_REVIEW_CHECKLIST;
  const [flags, setFlags] = useState(() => Object.fromEntries(
    checklist.map((item) => [item.key, !!post?.[item.key]]),
  ));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const nextChecklist = Array.isArray(post?.closeoutHabitsSnapshot)
      ? post.closeoutHabitsSnapshot.filter((item) => item.enabled !== false)
      : JOURNAL_REVIEW_CHECKLIST;
    setFlags(Object.fromEntries(nextChecklist.map((item) => [item.key, !!post?.[item.key]])));
    setError(null);
  }, [post, date]);

  const canEdit = hasJournalReviewPending(post);
  const dirty = checklist.some((item) => flags[item.key] !== !!post?.[item.key]);

  const saveFollowUp = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = { ...post, ...flags, savedAt: post.savedAt };
      const res = await fetch(`/api/sessions/${date}/post`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save checklist");
      }
      notifySessionSaved();
      onPostUpdated?.(payload);
    } catch (err) {
      setError(err.message || "Failed to save checklist");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="history-detail-checklist">
      <div className="history-detail-checklist__head">
        <div className="history-detail-prose__label">Review checklist</div>
        {formatJournalReviewPendingSummary(canEdit ? flags : post, { checklist }) ? (
          <span className="history-detail-checklist__status history-detail-checklist__status--pending">
            {formatJournalReviewPendingSummary(canEdit ? flags : post, { checklist })}
          </span>
        ) : (
          <span className="history-detail-checklist__status history-detail-checklist__status--done">Complete</span>
        )}
      </div>
      {canEdit ? (
        <>
          <div className="pm-journal-checklist history-journal-checklist-edit" role="group" aria-label="End-of-day review checklist">
            {checklist.map((item) => {
              const done = !!flags[item.key];
              return (
                <label key={item.key} className={`pm-journal-check${done ? " pm-journal-check--done" : ""}`}>
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={(e) => setFlags((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                  />
                  <span className="pm-journal-check__copy">
                    <span className="pm-journal-check__label">{item.label}</span>
                    <span className={`pm-journal-check__status${done ? " done" : " pending"}`}>
                      {done ? "Done" : "Pending"}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {dirty && (
            <div className="history-detail-checklist__actions">
              <button type="button" className="history-journal-save-btn" onClick={saveFollowUp} disabled={saving}>
                {saving ? "Saving…" : "Save checklist"}
              </button>
              {error && <p className="history-journal-save-error">{error}</p>}
            </div>
          )}
        </>
      ) : (
        <ul className="history-detail-checklist__list">
          {checklist.map((item) => (
            <li key={item.key} className={post[item.key] ? "done" : "pending"}>
              <span>{item.label}</span>
              <span>{post[item.key] ? "Done" : `${item.statusLabel} pending`}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HistoryRiskPlanEditor({ date, post, onPostUpdated }) {
  const current = getRiskPlanFollowed(post);
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setValue(getRiskPlanFollowed(post));
    setError(null);
  }, [post, date]);

  const dirty = value !== current;

  const save = async () => {
    if (value !== true && value !== false) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { ...post, riskPlanFollowed: value, savedAt: post.savedAt };
      const response = await fetch(`/api/sessions/${date}/post`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update risk-plan outcome");
      }
      notifySessionSaved();
      onPostUpdated?.(payload);
    } catch (err) {
      setError(err.message || "Failed to update risk-plan outcome");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="history-risk-editor">
      <div className="history-risk-editor__head">
        <div>
          <div className="history-detail-prose__label">Risk plan followed?</div>
          <p>Correct this answer if the completed session was recorded incorrectly.</p>
        </div>
        <span className={value === true ? "yes" : value === false ? "no" : ""}>
          {value === true ? "Streak continues" : value === false ? "Streak ends" : "Not answered"}
        </span>
      </div>
      <div className="history-risk-editor__actions" role="radiogroup" aria-label="Risk plan followed for this session">
        <button type="button" role="radio" aria-checked={value === true} className={value === true ? "active yes" : ""} onClick={() => setValue(true)}>Yes</button>
        <button type="button" role="radio" aria-checked={value === false} className={value === false ? "active no" : ""} onClick={() => setValue(false)}>No</button>
        {dirty && <button type="button" className="history-risk-editor__save" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save change"}</button>}
      </div>
      {error && <p className="history-journal-save-error">{error}</p>}
    </div>
  );
}

export default function HistoryDayDetail({ date, onBack, onDeleted }) {
  const [session, setSession] = useState(null);
  const [recoveryLabel, setRecoveryLabel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [loadedSession, recoveryState, settings] = await Promise.all([
          loadSessionDay(date),
          loadRecoveryState(),
          loadDllSettings(),
        ]);
        if (cancelled) return;
        const annotations = buildRecoveryDayAnnotations(recoveryState.days, settings);
        setSession(loadedSession);
        setRecoveryLabel(getRecoveryDayLabel(annotations[date]));
      } catch (err) {
        console.error("HistoryDayDetail load:", err);
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [date]);

  const raisedFlags = useMemo(() => {
    if (!session?.post) return [];
    return getRaisedBehavioralFlags(session.post);
  }, [session]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete all data for ${formatDetailTitle(date)}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteSessionDay(date);
      onDeleted?.();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <WorkflowPageLayout>
        <div className="history-detail-page history-detail-page--v2">
          <div className="pm-loading">Loading...</div>
        </div>
      </WorkflowPageLayout>
    );
  }

  if (!session) {
    return (
      <WorkflowPageLayout>
        <div className="history-detail-page history-detail-page--v2">
          <div className="history-detail-page__top">
            <button type="button" className="pm-back" onClick={onBack}>← Back to Past Sessions</button>
            <h1 className="history-detail-page__title hybrid-page-title">
              {formatDetailTitle(date)}
              <span className="hybrid-page-title-stop" aria-hidden="true" />
            </h1>
            <p className="history-detail-empty">Could not load this session. Sign in and try again.</p>
          </div>
        </div>
      </WorkflowPageLayout>
    );
  }

  const { pre, plan, post } = session;
  const riskPlanFollowed = getRiskPlanFollowed(post);
  const playbookLabel = session.playbookAdherence
    ? playbookAdherenceLabel(session.playbookAdherence)
    : null;

  return (
    <WorkflowPageLayout>
      <div className="history-detail-page history-detail-page--v2">
        <div className="history-detail-page__top">
          <button type="button" className="pm-back" onClick={onBack}>← Back to Past Sessions</button>
          <h1 className="history-detail-page__title hybrid-page-title">
            {formatDetailTitle(date)}
            <span className="hybrid-page-title-stop" aria-hidden="true" />
          </h1>
          <HistoryDaySummary session={session} recoveryLabel={recoveryLabel} />
        </div>

        <div className="history-detail-page__stack">
          <SectionCard num="01" title="Check-in" subtitle="The state you arrived in.">
            {!pre ? (
              <p className="history-detail-empty">No check-in saved for this day.</p>
            ) : (
              <>
                <div className="history-detail-checkin-grid">
                  <StatPanel
                    title="Physical"
                    items={[
                      { label: "Sleep", value: pre.sleepHours != null ? `${pre.sleepHours}h` : null },
                      {
                        label: "Sleep debt",
                        value:
                          pre.sleepDebtMinutes != null && pre.sleepDebtMinutes !== ""
                            ? `${parseSleepDebtMinutes(pre.sleepDebtMinutes)} min`
                            : null,
                      },
                      { label: "Sleep quality", value: pre.sleepQuality },
                      { label: "Energy", value: pre.energy },
                      { label: "HRV", value: pre.hrvScore != null && pre.hrvScore !== "" ? `${pre.hrvScore}%` : null },
                      { label: "Hydrated", value: emptyValue(pre.hydrated) },
                      { label: "Movement", value: emptyValue(pre.movement) },
                    ]}
                  />
                  <StatPanel
                    title="Mental"
                    items={[
                      { label: "State", value: pre.emotionalState },
                      { label: "Confidence", value: pre.confidence },
                      { label: "Patience", value: pre.patience },
                      { label: "FOMO", value: pre.fomoRisk },
                      { label: "Revenge", value: pre.revengeRisk },
                    ]}
                  />
                  <StatPanel
                    title="External"
                    items={[
                      { label: "Distractions", value: pre.externalDistractions },
                      { label: "Pressure", value: pre.financialPressure },
                      { label: "Focus", value: pre.generalFocusLevel },
                    ]}
                  />
                  <StatPanel
                    title="Preparation"
                    items={[
                      { label: "Reviewed levels", value: emptyValue(pre.reviewedKeyLevels) },
                      { label: "Reviewed news", value: emptyValue(pre.reviewedNews) },
                      { label: "Plan outlined", value: emptyValue(pre.dailyPlanWritten) },
                      { label: "Routine", value: emptyValue(pre.followedRoutine) },
                      { label: "Breathwork", value: emptyValue(pre.meditation) },
                    ]}
                  />
                </div>
                <ProseBlock label="Mantra">{pre.mantra}</ProseBlock>
                {(pre.unlockAccounts || pre.checkCpu || pre.selectRiskBracketOrder) && (
                  <div className="history-detail-reminders">
                    <div className="history-detail-prose__label">Reminders</div>
                    <ul>
                      {pre.unlockAccounts && <li>Unlock accounts</li>}
                      {pre.checkCpu && <li>Check CPU</li>}
                      {pre.selectRiskBracketOrder && <li>Select risk bracket order</li>}
                    </ul>
                  </div>
                )}
              </>
            )}
          </SectionCard>

          <SectionCard num="02" title="Session Plan" subtitle="What you said you'd do.">
            {!plan ? (
              <p className="history-detail-empty">No session plan saved for this day.</p>
            ) : (
              <>
                <div className="history-detail-tags">
                  {biasTag(plan.directionalBias) && <span className="history-detail-tag">{biasTag(plan.directionalBias)}</span>}
                  {volTag(plan.expectedVolatility) && <span className="history-detail-tag">{volTag(plan.expectedVolatility)}</span>}
                  {sessionOpenVsValueTag(plan.sessionOpenVsValue) && (
                    <span className="history-detail-tag">{sessionOpenVsValueTag(plan.sessionOpenVsValue)}</span>
                  )}
                  {plan.positionSize && <span className="history-detail-tag">{plan.positionSize.toUpperCase()}</span>}
                </div>

                <ProseBlock label="Thesis">{plan.whyBias}</ProseBlock>

                {plan.keyLevels?.length > 0 && (
                  <div className="history-detail-table-wrap">
                    <table className="history-detail-table">
                      <thead>
                        <tr>
                          <th>Label</th>
                          <th>Price</th>
                          <th>Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plan.keyLevels.map((level) => (
                          <tr key={level.id || `${level.label}-${level.price}`}>
                            <td>{level.label || "-"}</td>
                            <td>{level.price || "-"}</td>
                            <td>{(level.type || "-").toUpperCase()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {plan.setups?.length > 0 && (
                  <div className="history-detail-setups">
                    {plan.setups.map((setup) => (
                      <article key={setup.id || setup.name} className="history-detail-setup">
                        <h3>{setup.name || "Setup"}</h3>
                        {setup.conditions && <p>{setup.conditions}</p>}
                        <div className="history-detail-setup__meta">
                          {setup.target && <span><em>Target</em> {setup.target}</span>}
                          {setup.stop && <span><em>Stop</em> {setup.stop}</span>}
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                <div className="history-detail-limits">
                  {plan.ddFromHighWaterMark && (
                    <div className="history-detail-limit">
                      <span>DD from HWM</span>
                      <strong>{plan.ddFromHighWaterMark}%</strong>
                    </div>
                  )}
                  {plan.maxDailyLoss && (
                    <div className="history-detail-limit">
                      <span>Max loss</span>
                      <strong>{plan.maxDailyLoss}</strong>
                    </div>
                  )}
                  {plan.maxTrades && (
                    <div className="history-detail-limit">
                      <span>Max trades</span>
                      <strong>{plan.maxTrades}</strong>
                    </div>
                  )}
                  {plan.stopTradingAt && (
                    <div className="history-detail-limit">
                      <span>Stop at</span>
                      <strong>{plan.stopTradingAt}</strong>
                    </div>
                  )}
                  {plan.maxDailyLossSetInBroker && (
                    <div className="history-detail-limit">
                      <span>Max loss in broker</span>
                      <strong>Yes</strong>
                    </div>
                  )}
                  {plan.coldTurkeyBlockerSet && (
                    <div className="history-detail-limit">
                      <span>Cold turkey blocker</span>
                      <strong>Set</strong>
                    </div>
                  )}
                </div>

                <ProseBlock label="Session rules">{plan.sessionRules}</ProseBlock>
                <ProseBlock label="The one thing">{plan.oneThing}</ProseBlock>

                {(plan.selfCommitmentAccepted || plan.selfRegulatedCommitmentAccepted) && (
                  <div className="history-detail-prose history-detail-prose--commitment">
                    <div className="history-detail-prose__label">Commitment</div>
                    {plan.selfCommitmentAccepted && (
                      <p>
                        I believe in myself and I respect myself enough to follow my plan. Following my plans allows me and my family to live our dream.
                      </p>
                    )}
                    {plan.selfRegulatedCommitmentAccepted && (
                      <p>I will not place any risk when I am not in a self-regulated state.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </SectionCard>

          <SectionCard num="03" title="Close loop" subtitle="How it actually went." className="history-detail-section--close">
            {!post ? (
              <p className="history-detail-empty">No close loop saved for this day.</p>
            ) : (
              <>
                <div className="history-detail-close-summary">
                  {session.playbookAdherence?.total > 0 && playbookLabel && (
                    <div className={`history-detail-close-card history-detail-close-card--playbook history-detail-close-card--${playbookLabel.tone}`}>
                      <span className="history-detail-close-card__label">Playbook</span>
                      <strong>{session.playbookAdherence.playbookRate}%</strong>
                      <p>{playbookLabel.text}</p>
                    </div>
                  )}
                  <div className={`history-detail-close-card${raisedFlags.length ? " history-detail-close-card--flags" : " history-detail-close-card--clean"}`}>
                    <span className="history-detail-close-card__label">Behavioral flags</span>
                    <strong>{raisedFlags.length}</strong>
                    {raisedFlags.length > 0 ? (
                      <div className="history-detail-flag-list">
                        {raisedFlags.map((f) => (
                          <span key={f.key} className="history-detail-flag">{f.label}</span>
                        ))}
                      </div>
                    ) : (
                      <p>None raised</p>
                    )}
                  </div>
                </div>

                <div className="history-detail-score-group">
                  <div className="history-detail-score-group__label">Process (1-10)</div>
                  <div className="history-detail-score-row">
                    <ScoreChip label="Followed plan" value={post.followedPlan} />
                    <ScoreChip label="Setup quality" value={post.setupQuality} />
                    <ScoreChip label="Risk discipline" value={post.riskDiscipline} />
                    <ScoreChip label="Execution" value={post.executionQuality} />
                    <ScoreChip
                      label="Risk plan"
                      value={riskPlanFollowed === true ? "Yes" : riskPlanFollowed === false ? "No" : "-"}
                      tone={riskPlanFollowed === true ? "good" : riskPlanFollowed === false ? "bad" : undefined}
                    />
                  </div>
                </div>

                <HistoryRiskPlanEditor
                  date={date}
                  post={post}
                  onPostUpdated={(nextPost) => setSession((prev) => (prev ? { ...prev, post: nextPost } : prev))}
                />

                <div className="history-detail-score-group">
                  <div className="history-detail-score-group__label">Post session</div>
                  <div className="history-detail-score-row history-detail-score-row--3">
                    <ScoreChip label="Emotional" value={post.emotionalState} />
                    <ScoreChip label="Satisfaction" value={post.satisfaction} />
                    <ScoreChip label="Frustration" value={post.frustration} />
                  </div>
                </div>

                <div className="history-detail-journal">
                  <article className="history-detail-journal__main">
                    <div className="history-detail-prose__label">Plan vs reality</div>
                    <p>{post.readVsReality || "-"}</p>
                  </article>
                  <div className="history-detail-journal__side">
                    <article className="history-detail-journal__note">
                      <div className="history-detail-prose__label">What went well</div>
                      <p>{post.wentWell || "-"}</p>
                    </article>
                    <article className="history-detail-journal__note">
                      <div className="history-detail-prose__label">What went wrong</div>
                      <p>{post.wentWrong || "-"}</p>
                    </article>
                    <article className="history-detail-journal__note">
                      <div className="history-detail-prose__label">One lesson</div>
                      <p>{post.oneLesson || "-"}</p>
                    </article>
                  </div>
                </div>

                <HistoryJournalChecklist
                  date={date}
                  post={post}
                  onPostUpdated={(nextPost) => setSession((prev) => (prev ? { ...prev, post: nextPost } : prev))}
                />
              </>
            )}
          </SectionCard>

          <div className="history-detail-delete">
            <p>
              Removing this day deletes all of its data (check-in, session plan, close loop, and imported trades)
              and cannot be undone.
            </p>
            <button type="button" className="history-delete-btn" onClick={handleDelete} disabled={deleting}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 4h10M6 4V2.5h4V4M5.5 4v9h5V4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {deleting ? "Deleting..." : "Delete this day"}
            </button>
          </div>
        </div>
      </div>
    </WorkflowPageLayout>
  );
}
