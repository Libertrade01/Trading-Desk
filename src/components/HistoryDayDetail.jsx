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
  formatUsd,
  biasTag,
  volTag,
  sessionOpenVsValueTag,
  getRiskPlanFollowed,
} from "../lib/history-data";
import { playbookAdherenceLabel } from "../lib/setup-adherence";
import HistoryDaySummary from "./history/HistoryDaySummary";
import {
  loadRecoveryState,
  buildRecoveryDayAnnotations,
  getRecoveryDayLabel,
} from "../lib/dll-recovery";
import { loadDllSettings } from "../lib/dll-recovery-settings";

function StatGrid({ title, items }) {
  return (
    <div className="history-stat-block">
      <div className="history-stat-title hybrid-label-sm">{title}</div>
      <div className="history-stat-grid">
        {items.map((item) => (
          <div key={item.label} className="history-stat-item">
            <span>{item.label}</span>
            <strong>{item.value ?? "—"}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionCard({ num, title, subtitle, children, action }) {
  return (
    <section className="history-section-card">
      <div className="history-section-head">
        {num ? <span className="history-section-num">{num}</span> : null}
        <div className="history-section-head__text">
          <h2 className="history-section-title hybrid-section-title">{title}</h2>
          {subtitle && <p className="history-section-sub">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function yesNo(val) {
  if (val === true) return "Yes";
  if (val === false) return "—";
  return val ?? "—";
}

function HistoryJournalChecklist({ date, post, onPostUpdated }) {
  const [flags, setFlags] = useState(() => ({
    replaySequenceReviewed: !!post?.replaySequenceReviewed,
    setupsScreenshottedSaved: !!post?.setupsScreenshottedSaved,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setFlags({
      replaySequenceReviewed: !!post?.replaySequenceReviewed,
      setupsScreenshottedSaved: !!post?.setupsScreenshottedSaved,
    });
    setError(null);
  }, [post, date]);

  const canEdit = hasJournalReviewPending(post);
  const dirty = JOURNAL_REVIEW_CHECKLIST.some((item) => flags[item.key] !== !!post?.[item.key]);

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
    <div className="history-journal-checklist">
      <div className="history-journal-checklist-head">
        <div className="history-notes-label hybrid-label-sm">Review checklist</div>
        {formatJournalReviewPendingSummary(canEdit ? flags : post) ? (
          <span className="history-journal-pending-summary">
            {formatJournalReviewPendingSummary(canEdit ? flags : post)}
          </span>
        ) : (
          <span className="history-journal-pending-summary history-journal-pending-summary--done">Complete</span>
        )}
      </div>
      {canEdit ? (
        <>
          <div className="pm-journal-checklist history-journal-checklist-edit" role="group" aria-label="End-of-day review checklist">
            {JOURNAL_REVIEW_CHECKLIST.map((item) => {
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
            <div className="history-journal-checklist-actions">
              <button type="button" className="history-journal-save-btn" onClick={saveFollowUp} disabled={saving}>
                {saving ? "Saving…" : "Save checklist"}
              </button>
              {error && <p className="history-journal-save-error">{error}</p>}
            </div>
          )}
        </>
      ) : (
        <ul>
          {JOURNAL_REVIEW_CHECKLIST.map((item) => (
            <li key={item.key} className={post[item.key] ? "done" : "pending"}>
              <span className="history-journal-item-label">{item.label}</span>
              <span className="history-journal-item-status">
                {post[item.key] ? "Done" : `${item.statusLabel} pending`}
              </span>
            </li>
          ))}
        </ul>
      )}
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

  if (loading) return <div className="pm-loading">Loading...</div>;

  if (!session) {
    return (
      <div className="history-detail-page hybrid-page">
        <div className="history-detail-top">
          <button type="button" className="pm-back" onClick={onBack}>← Back to history</button>
          <h1 className="history-detail-title hybrid-title">{formatDetailTitle(date)}</h1>
          <p className="history-missing">Could not load this session. Sign in and try again.</p>
        </div>
      </div>
    );
  }

  const { pre, plan, post } = session;
  const pnlTone = session.netPnl > 0 ? "pos" : session.netPnl < 0 ? "neg" : "dim";
  const riskPlanFollowed = getRiskPlanFollowed(post);
  const playbookLabel = session.playbookAdherence
    ? playbookAdherenceLabel(session.playbookAdherence)
    : null;

  return (
    <div className="history-detail-page hybrid-page">
      <div className="history-detail-top">
        <button type="button" className="pm-back" onClick={onBack}>← Back to history</button>
        <h1 className="history-detail-title hybrid-title">{formatDetailTitle(date)}</h1>
        <HistoryDaySummary session={session} recoveryLabel={recoveryLabel} />
      </div>

      <div className="history-detail-grid">
        <SectionCard num="01" title="Check-in" subtitle="The state you arrived in.">
          {!pre ? (
            <p className="history-missing">No check-in saved for this day.</p>
          ) : (
            <div className="history-stat-groups">
              <StatGrid
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
                  { label: "Hydrated", value: yesNo(pre.hydrated) },
                  { label: "Movement", value: yesNo(pre.movement) },
                ]}
              />
              <StatGrid
                title="Mental"
                items={[
                  { label: "State", value: pre.emotionalState },
                  { label: "Confidence", value: pre.confidence },
                  { label: "Patience", value: pre.patience },
                  { label: "FOMO", value: pre.fomoRisk },
                  { label: "Revenge", value: pre.revengeRisk },
                ]}
              />
              <StatGrid
                title="External"
                items={[
                  { label: "Distractions", value: pre.externalDistractions },
                  { label: "Pressure", value: pre.financialPressure },
                  { label: "Focus", value: pre.generalFocusLevel },
                ]}
              />
              <StatGrid
                title="Preparation"
                items={[
                  { label: "Reviewed levels", value: yesNo(pre.reviewedKeyLevels) },
                  { label: "Reviewed news", value: yesNo(pre.reviewedNews) },
                  { label: "Session Plan Outlined", value: yesNo(pre.dailyPlanWritten) },
                  { label: "Routine", value: yesNo(pre.followedRoutine) },
                  { label: "Breathwork", value: yesNo(pre.meditation) },
                ]}
              />
              {pre.mantra && (
                <div className="history-mantra-block">
                  <div className="history-notes-label hybrid-label-sm">Mantra</div>
                  <p>{pre.mantra}</p>
                </div>
              )}
              {(pre.unlockAccounts || pre.checkCpu || pre.selectRiskBracketOrder) && (
                <div className="history-reminders-block">
                  <div className="history-notes-label hybrid-label-sm">Reminders</div>
                  <ul className="history-reminders-list">
                    {pre.unlockAccounts && <li>Unlock Accounts</li>}
                    {pre.checkCpu && <li>Check CPU</li>}
                    {pre.selectRiskBracketOrder && <li>Select Risk Bracket Order</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard num="02" title="Session Plan" subtitle="What you said you'd do.">
          {!plan ? (
            <p className="history-missing">No session plan saved for this day.</p>
          ) : (
            <>
              <div className="history-plan-tags">
                {biasTag(plan.directionalBias) && (
                  <span className="history-plan-tag">{biasTag(plan.directionalBias)}</span>
                )}
                {volTag(plan.expectedVolatility) && (
                  <span className="history-plan-tag">{volTag(plan.expectedVolatility)}</span>
                )}
                {sessionOpenVsValueTag(plan.sessionOpenVsValue) && (
                  <span className="history-plan-tag">{sessionOpenVsValueTag(plan.sessionOpenVsValue)}</span>
                )}
                {plan.positionSize && (
                  <span className="history-plan-tag">{plan.positionSize.toUpperCase()}</span>
                )}
              </div>
              {plan.whyBias && (
                <div className="history-text-block">
                  <div className="history-notes-label hybrid-label-sm">Thesis</div>
                  <p>{plan.whyBias}</p>
                </div>
              )}
              {plan.keyLevels?.length > 0 && (
                <div className="history-levels-table-wrap">
                  <table className="history-levels-table">
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
                          <td>{level.label || "—"}</td>
                          <td>{level.price || "—"}</td>
                          <td>{(level.type || "—").toUpperCase()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {plan.setups?.length > 0 && (
                <div className="history-setups">
                  {plan.setups.map((setup) => (
                    <div key={setup.id || setup.name} className="history-setup-card">
                      <div className="history-setup-name">{setup.name || "Setup"}</div>
                      {setup.conditions && <p className="history-setup-desc">{setup.conditions}</p>}
                      <div className="history-setup-meta">
                        {setup.target && <span><em>Target</em> {setup.target}</span>}
                        {setup.stop && <span><em>Stop placement</em> {setup.stop}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="history-risk-row">
                {plan.ddFromHighWaterMark && (
                  <div className="history-risk-chip">
                    <span>DD from HWM</span>
                    <strong>{plan.ddFromHighWaterMark}%</strong>
                  </div>
                )}
                {plan.maxDailyLoss && (
                  <div className="history-risk-chip">
                    <span>Max loss</span>
                    <strong>{plan.maxDailyLoss}</strong>
                  </div>
                )}
                {plan.maxTrades && (
                  <div className="history-risk-chip">
                    <span>Max trades</span>
                    <strong>{plan.maxTrades}</strong>
                  </div>
                )}
                {plan.stopTradingAt && (
                  <div className="history-risk-chip">
                    <span>Stop at</span>
                    <strong>{plan.stopTradingAt}</strong>
                  </div>
                )}
                {plan.maxDailyLossSetInBroker && (
                  <div className="history-risk-chip">
                    <span>Max loss in broker</span>
                    <strong>Yes</strong>
                  </div>
                )}
                {plan.coldTurkeyBlockerSet && (
                  <div className="history-risk-chip">
                    <span>Cold turkey blocker</span>
                    <strong>Set</strong>
                  </div>
                )}
              </div>
              {plan.sessionRules && (
                <div className="history-text-block">
                  <div className="history-notes-label hybrid-label-sm">Session rules</div>
                  <p>{plan.sessionRules}</p>
                </div>
              )}
              {plan.oneThing && (
                <div className="history-text-block">
                  <div className="history-notes-label hybrid-label-sm">The one thing</div>
                  <p>{plan.oneThing}</p>
                </div>
              )}
              {(plan.selfCommitmentAccepted || plan.selfRegulatedCommitmentAccepted) && (
                <div className="history-commitment">
                  <div className="history-notes-label hybrid-label-sm">Commitment</div>
                  {plan.selfCommitmentAccepted && (
                    <p className="history-commitment-text">
                      I believe in myself and I respect myself enough to follow my plan. Following my plans allows me and my family to live our dream.
                    </p>
                  )}
                  {plan.selfRegulatedCommitmentAccepted && (
                    <p className="history-commitment-text">
                      I will not place any risk when I am not in a self-regulated state.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </SectionCard>
      </div>

      <SectionCard num="03" title="Close loop" subtitle="How it actually went.">
        {!post ? (
          <p className="history-missing">No close loop saved for this day.</p>
        ) : (
          <>
            <div className="history-post-metrics">
              <div className="history-post-metric history-post-metric--pnl">
                <span>Net P&amp;L</span>
                <strong className={pnlTone}>{session.netPnl != null ? formatUsd(session.netPnl, { signed: true }) : "—"}</strong>
              </div>
              <div className="history-post-metric">
                <span>Trades</span>
                <strong>{post.trades || "0"}</strong>
              </div>
              <div className="history-post-metric">
                <span>Wins</span>
                <strong className="pos">{post.wins || "0"}</strong>
              </div>
              <div className="history-post-metric">
                <span>Losses</span>
                <strong className="neg">{post.losses || "0"}</strong>
              </div>
            </div>

            {session.playbookAdherence?.total > 0 && playbookLabel && (
              <div className="history-process-row">
                <div className="history-process-title hybrid-label-sm">Playbook adherence</div>
                <div className="history-playbook-adherence">
                  <strong
                    style={{
                      color:
                        playbookLabel.tone === "green"
                          ? "var(--green)"
                          : playbookLabel.tone === "red"
                            ? "var(--red)"
                            : "var(--amber)",
                    }}
                  >
                    {session.playbookAdherence.playbookRate}%
                  </strong>
                  <span>{playbookLabel.text}</span>
                </div>
              </div>
            )}

            <div className="history-process-row">
              <div className="history-process-title hybrid-label-sm">Process adherence (1–10)</div>
              <div className="history-process-grid">
                <div><span>Followed plan</span><strong>{post.followedPlan}</strong></div>
                <div><span>Setup quality</span><strong>{post.setupQuality}</strong></div>
                <div><span>Risk discipline</span><strong>{post.riskDiscipline}</strong></div>
                <div><span>Execution</span><strong>{post.executionQuality}</strong></div>
                <div>
                  <span>Risk plan followed</span>
                  <strong>
                    {riskPlanFollowed === true
                      ? "Yes"
                      : riskPlanFollowed === false
                        ? "No"
                        : "—"}
                  </strong>
                </div>
              </div>
            </div>

            <div className={`history-flags-block${raisedFlags.length ? "" : " history-flags-block--clean"}`}>
              <div className="history-flags-title hybrid-label-sm">
                {raisedFlags.length
                  ? `${raisedFlags.length} behavioral flag${raisedFlags.length === 1 ? "" : "s"} raised`
                  : "No behavioral flags raised"}
              </div>
              {raisedFlags.length > 0 && (
                <div className="history-flag-pills">
                  {raisedFlags.map((f) => (
                    <span key={f.key} className="history-flag-pill">{f.label}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="history-process-row">
              <div className="history-process-title hybrid-label-sm">Post session</div>
              <div className="history-process-grid">
                <div><span>Emotional</span><strong>{post.emotionalState}</strong></div>
                <div><span>Satisfaction</span><strong>{post.satisfaction}</strong></div>
                <div><span>Frustration</span><strong>{post.frustration}</strong></div>
              </div>
            </div>

            <div className="history-journal-grid">
              <div className="history-journal-card history-journal-card--wide">
                <div className="history-notes-label hybrid-label-sm">Plan vs Reality</div>
                <p>{post.readVsReality || "—"}</p>
              </div>
              <div className="history-journal-card">
                <div className="history-notes-label hybrid-label-sm">What went well</div>
                <p>{post.wentWell || "—"}</p>
              </div>
              <div className="history-journal-card">
                <div className="history-notes-label hybrid-label-sm">What went wrong</div>
                <p>{post.wentWrong || "—"}</p>
              </div>
              <div className="history-journal-card">
                <div className="history-notes-label hybrid-label-sm">One lesson</div>
                <p>{post.oneLesson || "—"}</p>
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

      <div className="history-delete-bar">
        <p>Removing this day deletes all of its data — check-in, session plan, close loop, and imported trades — and cannot be undone.</p>
        <button type="button" className="history-delete-btn" onClick={handleDelete} disabled={deleting}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 4h10M6 4V2.5h4V4M5.5 4v9h5V4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {deleting ? "Deleting..." : "Delete this day"}
        </button>
      </div>
    </div>
  );
}
