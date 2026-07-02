"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  loadSessionDay,
  loadRecentSessions,
  loadJournalReviewCarryoverSessions,
  todayKey,
  isStepComplete,
  countProcessStreakAsOf,
  countPlaybookStreakAsOf,
  getProcessStreakDisplayForDay,
  formatTimeEyebrow,
  formatShortHistoryDate,
  formatUsd,
  isWeekend,
} from "../lib/history-data";
import HomeEventBanner from "./HomeEventBanner";
import { getMarketEventsForDate } from "../lib/market-events";
import { getCurrentUser } from "../lib/user-storage";
import { playbookAdherenceLabel } from "../lib/setup-adherence";
import {
  loadRecoveryState,
  getRecoveryStatus,
  formatRecoveryUsd,
} from "../lib/dll-recovery";
import {
  loadDllSettings,
  shouldShowDrawdownRecoverySetupHint,
  dismissDrawdownRecoverySetupHint,
} from "../lib/dll-recovery-settings";
import {
  loadHomeFocusItems,
  loadSavedReview,
  getProcessWeekRange,
  shouldShowWeeklyReviewPrompt,
} from "../lib/weekly-process-review";
import { loadTraderSettings } from "../lib/trader-settings";
import { loadTraderProfile, PROFILE_UPDATED_EVENT, WELCOME_HINT_STORAGE_KEY } from "../lib/trader-profile";
import { SESSION_SAVED_EVENT, TRADES_CHANGED_EVENT } from "../lib/session-events";
import {
  formatJournalReviewPendingSummary,
  hasJournalReviewPending,
} from "../lib/postmarket-defaults";

const WORKFLOW_STEPS = [
  { id: "premarket", label: "Check-in" },
  { id: "dailyplan", label: "Session Plan" },
  { id: "postmarket", label: "Close loop" },
];

function buildProgressSubline(preComplete, planComplete, postComplete) {
  const parts = [];
  if (preComplete) parts.push("Check-in done");
  const open = [];
  if (!planComplete) open.push("Session plan");
  if (!postComplete) open.push("Close loop");
  if (open.length) parts.push(`${open.join(" + ")} open`);
  return parts.join(" · ") || "All steps open";
}

function ReadinessTrend({ sessions, embedded = false, split = false }) {
  const points = useMemo(() => {
    return sessions
      .filter((s) => s.readinessScore != null)
      .slice(0, 4)
      .reverse();
  }, [sessions]);

  const chart = useMemo(() => {
    if (points.length < 3) return null;
    const w = split ? 260 : 280;
    const h = split ? 120 : 56;
    const padX = 8;
    const padY = 8;
    const scores = points.map((p) => p.readinessScore);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const spread = Math.max(maxScore - minScore, 10);
    const yMin = Math.max(0, minScore - spread * 0.2);
    const yMax = Math.min(100, maxScore + spread * 0.2);
    const yRange = yMax - yMin || 1;
    const coords = points.map((s, i) => {
      const x = padX + (i / (points.length - 1)) * (w - padX * 2);
      const y = padY + (1 - (s.readinessScore - yMin) / yRange) * (h - padY * 2);
      return { x, y, score: s.readinessScore };
    });
    const line = coords.map((p) => `${p.x},${p.y}`).join(" ");
    return { w, h, line, coords, yMin: Math.round(yMin), yMax: Math.round(yMax) };
  }, [points, split]);

  if (points.length === 0) {
    if (embedded) return null;
    return (
      <p className="home-panel-empty">
        Complete check-ins to see your trend.
      </p>
    );
  }

  if (points.length < 3) {
    const last = points[points.length - 1];
    return (
      <div
        className={`home-trend-compact${embedded ? " home-trend-compact--embedded" : ""}${split ? " home-trend-compact--split" : ""}`}
      >
        <div className="home-hybrid-stat-num">{last.readinessScore}</div>
        <p className="home-trend-compact-note">
          {points.length === 1 ? "First scored session" : "One more for trend line"}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`home-trend-chart-wrap${embedded ? " home-trend-chart-wrap--embedded" : ""}${split ? " home-trend-chart-wrap--split" : ""}`}
    >
      <div className="home-trend-chart-range" aria-hidden="true">
        <span>{chart.yMax}</span>
        <span>{chart.yMin}</span>
      </div>
      <svg
        viewBox={`0 0 ${chart.w} ${chart.h}`}
        className="home-trend-chart"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <polyline
          points={chart.line}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {chart.coords.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="2"
            fill="var(--brand)"
            stroke="var(--bg)"
            strokeWidth="1"
          />
        ))}
      </svg>
    </div>
  );
}

function greetingFromEmail(email) {
  if (!email) return null;
  const local = email.split("@")[0] || "";
  const name = local.split(/[._-]/)[0];
  if (!name) return null;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatTimeGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatHeaderDateLong(date = new Date()) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function StreakMetric({ label, value, target, loading }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="home-metric-streak">
      <div className="home-metric-streak-head">
        <span className="home-metric-streak-label">{label}</span>
        <span className="home-metric-streak-value">
          {loading ? "—" : value}
          <span className="home-metric-streak-goal">/{target}</span>
        </span>
      </div>
      <div className="home-metric-streak-track" aria-hidden="true">
        <div className="home-metric-streak-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function HomeMarketContextFlags({ dateKey, className = "" }) {
  const events = useMemo(() => getMarketEventsForDate(dateKey), [dateKey]);
  if (!events.length) return null;

  return (
    <div className={`home-page-market-flags${className ? ` ${className}` : ""}`} aria-label="Market context">
      <HomeEventBanner dateKey={dateKey} />
    </div>
  );
}

function HomeWorkflowSteps({
  today,
  preComplete,
  planComplete,
  postComplete,
  nextStep,
  completedCount,
  onNavigate,
  embedded = false,
}) {
  const journalFollowUp = formatJournalReviewPendingSummary(today?.post);

  return (
    <div
      className={`home-workflow-steps${embedded ? " home-workflow-steps--embedded" : ""}`}
      aria-label="Today's workflow"
    >
      {WORKFLOW_STEPS.map((step, index) => {
        const complete = stepComplete(step.id, preComplete, planComplete, postComplete);
        const isNext = nextStep?.id === step.id;
        const started = stepStarted(step.id, today);
        const showEdit = !isNext && started && !complete;
        const followUp =
          step.id === "postmarket" && postComplete && journalFollowUp ? journalFollowUp : null;
        const stepNum = index + 1;
        return (
          <div
            key={step.id}
            className={`home-workflow-step${complete ? " done" : ""}${isNext ? " next" : ""}${started && !complete ? " partial" : ""}${followUp ? " follow-up" : ""}`}
          >
            <button
              type="button"
              className="home-workflow-step-hit"
              onClick={() => onNavigate(step.id)}
            >
              <span className="home-workflow-step-num" aria-hidden="true">
                {complete ? "✓" : stepNum}
              </span>
              <span className="home-workflow-step-label-wrap">
                <span className="home-workflow-step-label">{step.label}</span>
                {followUp ? (
                  <span className="home-workflow-step-followup">{followUp}</span>
                ) : null}
              </span>
            </button>
            {isNext && (
              <button
                type="button"
                className="home-workflow-step-action primary"
                onClick={() => onNavigate(step.id)}
              >
                {completedCount === 0 ? "Start" : "Next"}
                <span className="home-workflow-step-action-arrow" aria-hidden="true">
                  →
                </span>
              </button>
            )}
            {showEdit && (
              <button
                type="button"
                className="home-workflow-step-action"
                onClick={() => onNavigate(step.id)}
              >
                Edit
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HomeHeroActivePanel({
  allComplete = false,
  completedCount,
  today,
  processStreak,
  playbookStreak,
  streakTargetDays,
  showRiskStreak,
  showPlaybookStreak,
  loadingPanels,
  showHeroReadiness,
  showReadinessStat,
  showPlaybookStat,
  showPnlStat,
  todayPlaybookLabel,
  pnlTone,
  preComplete,
  planComplete,
  postComplete,
  nextStep,
  onNavigate,
}) {
  const workflowCount = allComplete ? 3 : completedCount;
  let primaryLabel = "Today's workflow";
  let primaryValue = `${workflowCount} / 3`;
  let primaryClass = "";

  if (!allComplete && showHeroReadiness && today?.readinessScore != null) {
    primaryLabel = "Ready";
    primaryValue = String(today.readinessScore);
    primaryClass =
      today.readinessScore >= 70 ? "positive" : today.readinessScore >= 50 ? "neutral" : "negative";
  }

  const showStreaks = showRiskStreak || showPlaybookStreak;
  const showDoneStats =
    allComplete && (showReadinessStat || showPlaybookStat || showPnlStat);

  return (
    <div className={`home-hero-panel${allComplete ? " home-hero-panel--done" : ""}`}>
      <div
        className={`home-hero-metrics${showStreaks || showDoneStats ? "" : " home-hero-metrics--solo"}${allComplete ? " home-hero-metrics--done" : ""}`}
      >
        <div className="home-hero-workflow-progress home-metric-stat home-metric-stat--primary">
          <span className="home-metric-stat-label">{primaryLabel}</span>
          {primaryLabel === "Today's workflow" ? (
            <span className="home-metric-stat-value home-metric-stat-value--split">
              <span className="home-metric-stat-value-main">{workflowCount}</span>
              <span className="home-metric-stat-value-denom"> / 3</span>
            </span>
          ) : (
            <span className={`home-metric-stat-value ${primaryClass}`}>{primaryValue}</span>
          )}
        </div>
        {(showStreaks || showDoneStats) && (
          <div className="home-hero-secondary-metrics">
            {showStreaks && (
              <div className="home-hero-streaks">
                {showRiskStreak && (
                  <StreakMetric
                    label="Risk streak"
                    value={processStreak}
                    target={streakTargetDays}
                    loading={loadingPanels}
                  />
                )}
                {showPlaybookStreak && (
                  <StreakMetric
                    label="Playbook streak"
                    value={playbookStreak}
                    target={streakTargetDays}
                    loading={loadingPanels}
                  />
                )}
              </div>
            )}
            {showDoneStats && (
              <div className="home-hero-done-stats">
                {showReadinessStat && today?.readinessScore != null && (
                  <div className="home-metric-stat">
                    <span className="home-metric-stat-label">Ready</span>
                    <span className="home-metric-stat-value positive">{today.readinessScore}</span>
                  </div>
                )}
                {showPlaybookStat && (
                  <div className="home-metric-stat">
                    <span className="home-metric-stat-label">Playbook setups</span>
                    <span
                      className={`home-metric-stat-value ${
                        todayPlaybookLabel.tone === "green"
                          ? "positive"
                          : todayPlaybookLabel.tone === "amber"
                            ? "neutral"
                            : "negative"
                      }`}
                    >
                      {today.playbookAdherence.playbookRate}%
                    </span>
                  </div>
                )}
                {showPnlStat && today?.netPnl != null && (
                  <div className="home-metric-stat home-metric-stat--pnl">
                    <span className="home-metric-stat-label">Net P&amp;L</span>
                    <span
                      className={`home-metric-stat-value home-metric-stat-value--pnl ${
                        pnlTone === "positive" ? "positive" : pnlTone === "negative" ? "negative" : "neutral"
                      }`}
                    >
                      {formatUsd(today.netPnl, { signed: true })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {!allComplete && (
        <HomeWorkflowSteps
          today={today}
          preComplete={preComplete}
          planComplete={planComplete}
          postComplete={postComplete}
          nextStep={nextStep}
          completedCount={workflowCount}
          onNavigate={onNavigate}
          embedded
        />
      )}
    </div>
  );
}

function HomeQuickActionTiles({ onNavigate, onOpenWeeklyReview }) {
  const actions = [
    {
      id: "postmarket",
      label: "New Note",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 19h14a2 2 0 0 0 2-2V7l-4-4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M15 3v4h4M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      onClick: () => onNavigate("postmarket"),
    },
    {
      id: "analytics",
      label: "View Analytics",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 19V5M20 19H4M8 17V11M12 17V7M16 17v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      onClick: () => onNavigate("analytics"),
    },
    {
      id: "weeklyreview",
      label: "Weekly Review",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      onClick: () => onOpenWeeklyReview?.(),
    },
  ];

  return (
    <section className="home-loop-card home-quick-actions home-quick-actions--tiles" aria-label="Quick actions">
      <h2 className="home-loop-card-title">Quick actions</h2>
      <div className="home-quick-actions-tiles">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className="home-quick-action-tile"
            onClick={action.onClick}
          >
            <span className="home-quick-action-tile-icon">{action.icon}</span>
            <span className="home-quick-action-tile-label">{action.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function HomeWeeklyOverview({ rows, loading, onOpenWeeklyReview }) {
  const displayRows =
    rows.length > 0
      ? rows
      : [
          { focus: null, grade: null, notes: null },
          { focus: null, grade: null, notes: null },
        ];

  return (
    <section className="home-loop-card home-weekly-overview" aria-label="Weekly overview">
      <div className="home-loop-card-head">
        <h2 className="home-loop-card-title">Weekly overview</h2>
        {onOpenWeeklyReview && (
          <button type="button" className="home-loop-card-link" onClick={onOpenWeeklyReview}>
            View Review
          </button>
        )}
      </div>
      <div className="home-weekly-overview-table-wrap">
        <table className="home-weekly-overview-table">
          <thead>
            <tr>
              <th scope="col">Focus</th>
              <th scope="col">Grade</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => (
              <tr key={i}>
                <td>{loading ? "—" : row.focus || "—"}</td>
                <td>{loading ? "—" : row.grade || "—"}</td>
                <td>{loading ? "—" : row.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HomeHeroQuote() {
  return (
    <blockquote className="home-hero-quote">
      <span className="home-hero-quote-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M7 7.5c0-2.2 1.5-3.5 3.5-3.5 2 0 3.5 1.2 3.5 3.3 0 2.4-1.8 4.2-4.2 5.5L9 14c2.4-.8 5-2.8 5-6.5C14 4.6 11.8 3 9.5 3 6.6 3 4.5 5 4.5 7.5H7zm9 0c0-2.2 1.5-3.5 3.5-3.5 2 0 3.5 1.2 3.5 3.3 0 2.4-1.8 4.2-4.2 5.5L18 14c2.4-.8 5-2.8 5-6.5C23 4.6 20.8 3 18.5 3 15.6 3 13.5 5 13.5 7.5H16z"
            fill="currentColor"
          />
        </svg>
      </span>
      <p>
        Process first. Results follow. Stay consistent. Compounding is built in the loop.
      </p>
    </blockquote>
  );
}

function stepComplete(stepId, preComplete, planComplete, postComplete) {
  if (stepId === "premarket") return preComplete;
  if (stepId === "dailyplan") return planComplete;
  return postComplete;
}

function stepData(stepId, today) {
  if (stepId === "premarket") return today?.pre;
  if (stepId === "dailyplan") return today?.plan;
  return today?.post;
}

function stepStarted(stepId, today) {
  return !!stepData(stepId, today);
}

function WeekFocusStrip({ items, loading, showReviewPrompt, onOpenWeeklyReview, allComplete }) {
  if (items.length > 0) {
    return (
      <section
        className={`home-week-focus${allComplete ? " home-week-focus--complete" : ""}`}
        aria-label="This week's focus"
      >
        <h2 className="home-week-focus-label">This week&apos;s focus</h2>
        <ul className="home-week-focus-list">
          {items.map((item, i) => (
            <li key={i} className="home-week-focus-item">
              <span className="home-week-focus-bar" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (showReviewPrompt && onOpenWeeklyReview) {
    return (
      <section className={`home-week-focus home-week-focus--prompt${allComplete ? " home-week-focus--complete" : ""}`}>
        <button
          type="button"
          className="home-review-prompt home-review-prompt--focus"
          onClick={onOpenWeeklyReview}
        >
          <span className="home-review-prompt-label">Set this week&apos;s focus</span>
          <span className="home-review-prompt-action">Weekly review →</span>
        </button>
      </section>
    );
  }

  return (
    <section
      className={`home-week-focus home-week-focus--empty${loading ? " home-week-focus--loading" : ""}`}
      aria-label="This week's focus"
    >
      <span className="home-week-focus-orb" aria-hidden="true" />
      <h2 className="home-week-focus-label">This week&apos;s focus</h2>
      <div className="home-week-focus-item home-week-focus-item--placeholder">
        <span className="home-week-focus-bar" aria-hidden="true" />
        <p className="home-week-focus-placeholder">
          This will fill in after your first weekly review.
        </p>
      </div>
    </section>
  );
}

function DrawdownRecoverySetupHint({ dllSettings, onOpenSettings, onDismiss }) {
  if (!shouldShowDrawdownRecoverySetupHint(dllSettings)) return null;

  return (
    <div className="home-dr-setup-hint" role="note">
      <p>
        <strong>Drawdown Recovery</strong> is off and not configured yet. After a loss day, it
        automatically downshifts you to half size until you&apos;ve recovered enough drawdown.{" "}
        <button type="button" className="home-welcome-hint-link" onClick={onOpenSettings}>
          Set it up in Settings → Risk
        </button>
        .
      </p>
      <button
        type="button"
        className="home-welcome-hint-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

function HomeJournalFollowUpNudge({
  today,
  carryover,
  todayDateKey,
  onNavigate,
  onOpenHistoryDay,
}) {
  const [expanded, setExpanded] = useState(false);

  const items = useMemo(() => {
    const list = [];
    if (today?.post?.savedAt && hasJournalReviewPending(today.post)) {
      list.push({ key: "today", kind: "today", date: todayDateKey, post: today.post });
    }
    for (const session of carryover) {
      list.push({ key: session.date, kind: "session", date: session.date, post: session.post });
    }
    return list;
  }, [today, carryover, todayDateKey]);

  if (!items.length) return null;

  const count = items.length;
  const summary =
    count === 1
      ? "1 session needs replay or database review."
      : `${count} sessions need replay or database review.`;

  return (
    <div className="home-journal-nudge" aria-live="polite">
      <div className="home-journal-nudge-line">
        <p className="home-journal-nudge-summary">{summary}</p>
        <button
          type="button"
          className="home-journal-nudge-toggle"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
        >
          {expanded ? "Hide items" : "Show items"}
        </button>
      </div>
      {expanded && (
        <ul className="home-journal-nudge-list">
          {items.map((item) => (
            <li key={item.key} className="home-journal-nudge-item">
              <div className="home-journal-nudge-item-main">
                <span className="home-journal-nudge-date">
                  {item.kind === "today" ? "Today" : formatShortHistoryDate(item.date)}
                </span>
                <span className="home-journal-nudge-pending">
                  {formatJournalReviewPendingSummary(item.post)}
                </span>
              </div>
              <button
                type="button"
                className="home-journal-nudge-action"
                onClick={() => {
                  if (item.kind === "today") onNavigate("postmarket");
                  else if (onOpenHistoryDay) onOpenHistoryDay(item.date);
                  else onNavigate("history");
                }}
              >
                {item.kind === "today" ? "Finish in close loop" : "Open session"}
                <span aria-hidden="true"> →</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecoveryBanner({ recoveryStatus }) {
  if (!recoveryStatus?.active) return null;

  return (
    <div className="dll-recovery-banner" role="status" aria-label="Drawdown Recovery active">
      <div className="dll-recovery-banner-eyebrow hybrid-eyebrow">Drawdown Recovery</div>
      <div className="dll-recovery-banner-stats">
        <div className="dll-recovery-banner-stat">
          <span className="dll-recovery-banner-stat-label">Today max</span>
          <span className="dll-recovery-banner-stat-value dll-recovery-banner-stat-value--accent">
            {formatRecoveryUsd(recoveryStatus.effectiveMaxDailyLoss)}
          </span>
        </div>
        <div className="dll-recovery-banner-stat dll-recovery-banner-stat--divider">
          <span className="dll-recovery-banner-stat-label">Drawdown</span>
          <span className="dll-recovery-banner-stat-value">
            {formatRecoveryUsd(recoveryStatus.cumulativeDrawdown)}
          </span>
        </div>
        <div className="dll-recovery-banner-stat dll-recovery-banner-stat--divider">
          <span className="dll-recovery-banner-stat-label">Recovered</span>
          <span className="dll-recovery-banner-stat-value">
            {formatRecoveryUsd(recoveryStatus.recoveredSoFar)}
            <span className="dll-recovery-banner-stat-sub">
              / {formatRecoveryUsd(recoveryStatus.recoveryTarget)}
            </span>
          </span>
        </div>
      </div>
      <div className="dll-recovery-banner-progress">
        <div
          className="dll-recovery-banner-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={recoveryStatus.recoveryTarget}
          aria-valuenow={recoveryStatus.recoveredSoFar}
          aria-label="Recovery progress"
        >
          <div
            className="dll-recovery-banner-fill"
            style={{ width: `${recoveryStatus.progressPct}%` }}
          />
        </div>
        <div className="dll-recovery-banner-progress-meta">
          <span>
            {formatRecoveryUsd(recoveryStatus.recoveredSoFar)} of{" "}
            {formatRecoveryUsd(recoveryStatus.recoveryTarget)} recovered
          </span>
          <span>{recoveryStatus.progressPct}%</span>
        </div>
      </div>
    </div>
  );
}

function RecentSessionsPanel({
  sessions,
  recent,
  todayDateKey,
  loadingPanels,
  onNavigate,
  onOpenHistoryDay,
}) {
  return (
    <section className="home-loop-card home-recent-panel" aria-label="Recent sessions">
      <div className="home-loop-card-head">
        <div>
          <h2 className="home-loop-card-title">Recent sessions</h2>
          <p className="home-loop-card-desc">Readiness trend and your last few days.</p>
        </div>
        <button
          type="button"
          className="home-loop-card-link"
          onClick={() => onNavigate("history")}
        >
          History →
        </button>
      </div>
      <div className="home-loop-card-body">
        {loadingPanels ? (
          <p className="home-panel-loading-text">Loading sessions…</p>
        ) : recent.length === 0 ? (
          <p className="home-panel-empty">No sessions yet.</p>
        ) : (
          <div className="home-recent-split">
            <div className="home-recent-split-chart">
              <ReadinessTrend sessions={sessions} embedded split />
            </div>
            <div className="home-recent-split-table">
              <div className="home-hybrid-recent-head" aria-hidden="true">
                <span className="home-hybrid-recent-date">Date</span>
                <span className="home-hybrid-recent-col-ready">Ready</span>
                <span className="home-hybrid-recent-col-risk">Risk</span>
                <span className="home-hybrid-recent-col-pnl">P&amp;L</span>
              </div>
              {recent.map((s) => {
                const pnlCls =
                  s.netPnl > 0 ? "positive" : s.netPnl < 0 ? "negative" : "neutral";
                const readyCls = s.readinessScore != null ? "scored" : "muted";
                const proc = getProcessStreakDisplayForDay(s, sessions);
                const procCls =
                  proc.type === "followed"
                    ? "positive"
                    : proc.type === "broken"
                      ? "broken"
                      : "muted";
                const isToday = s.date === todayDateKey;
                return (
                  <button
                    key={s.date}
                    type="button"
                    className={`home-hybrid-recent-row${isToday ? " home-hybrid-recent-row--today" : ""}`}
                    onClick={() => onOpenHistoryDay(s.date)}
                  >
                    <span className="home-hybrid-recent-date">
                      {formatShortHistoryDate(s.date)}
                      {isToday && <span className="home-hybrid-recent-today-tag">Today</span>}
                    </span>
                    <span className={`home-hybrid-recent-ready ${readyCls}`}>
                      {s.readinessScore != null ? s.readinessScore : "—"}
                    </span>
                    <span className={`home-hybrid-recent-proc ${procCls}`}>
                      {proc.type === "unanswered" ? "—" : proc.streak}
                    </span>
                    <span className={`home-hybrid-recent-pnl ${pnlCls}`}>
                      {s.netPnl != null ? formatUsd(s.netPnl, { signed: true }) : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function HomeMetricsCard({
  allComplete,
  today,
  processStreak,
  playbookStreak,
  streakTargetDays,
  showRiskStreak,
  showPlaybookStreak,
  loadingPanels,
  showReadinessStat,
  showPnlStat,
  showPlaybookStat,
  todayPlaybookLabel,
  pnlTone,
}) {
  if (!allComplete) return null;

  return (
    <section className="home-loop-card home-metrics-card" aria-label="Process metrics">
      <div className="home-metrics-grid">
        {showRiskStreak && (
          <StreakMetric
            label="Risk streak"
            value={processStreak}
            target={streakTargetDays}
            loading={loadingPanels}
          />
        )}
        {showPlaybookStreak && (
          <StreakMetric
            label="Playbook streak"
            value={playbookStreak}
            target={streakTargetDays}
            loading={loadingPanels}
          />
        )}
        {showReadinessStat && today?.readinessScore != null && (
          <div className="home-metric-stat">
            <span className="home-metric-stat-label">Ready</span>
            <span className="home-metric-stat-value positive">{today.readinessScore}</span>
          </div>
        )}
        {showPlaybookStat && (
          <div className="home-metric-stat">
            <span className="home-metric-stat-label">Playbook setups</span>
            <span
              className={`home-metric-stat-value ${
                todayPlaybookLabel.tone === "green"
                  ? "positive"
                  : todayPlaybookLabel.tone === "amber"
                    ? "neutral"
                    : "negative"
              }`}
            >
              {today.playbookAdherence.playbookRate}%
            </span>
          </div>
        )}
      </div>
      {showPnlStat && today?.netPnl != null && (
        <div className="home-metrics-pnl">
          <span className="home-metric-stat-label">Net P&amp;L</span>
          <span
            className={`home-metrics-pnl-value ${
              pnlTone === "positive" ? "positive" : pnlTone === "negative" ? "negative" : "neutral"
            }`}
          >
            {formatUsd(today.netPnl, { signed: true })}
          </span>
        </div>
      )}
    </section>
  );
}

function dateFromKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`);
}

function heroCopy(allComplete, completedCount, weekend, timeEyebrow) {
  if (allComplete) {
    return {
      eyebrow: "3 of 3 complete",
      eyebrowMuted: false,
      title: "Day done.",
      sub: "You executed the plan. Review, refine, repeat.",
      poster: true,
    };
  }
  if (completedCount > 0) {
    return {
      eyebrow: `${completedCount} of 3 complete`,
      eyebrowMuted: false,
      title: `${timeEyebrow} underway.`,
      sub: null,
    };
  }
  if (weekend) {
    return {
      eyebrow: "Weekend",
      eyebrowMuted: true,
      title: "Markets closed.",
      sub: "Review recent sessions or prep for the week ahead.",
    };
  }
  return {
    eyebrow: "0 of 3 complete",
    eyebrowMuted: false,
    title: "Ready when you are.",
    sub: "Check-in, session plan, and close loop still open.",
  };
}

async function loadWeeklyOverviewRows() {
  const prior = getProcessWeekRange(-1);
  const current = getProcessWeekRange(0);
  const [priorReview, currentReview] = await Promise.all([
    loadSavedReview(prior.end),
    loadSavedReview(current.end),
  ]);
  const focusItems = priorReview.focusItems.map((f) => f.trim()).filter(Boolean);
  const reflectionNote =
    (currentReview.reflections?.pattern || "").trim() ||
    (currentReview.weekInOneLine || "").trim() ||
    null;

  if (!focusItems.length) {
    return [
      { focus: null, grade: null, notes: null },
      { focus: null, grade: null, notes: null },
    ];
  }

  const rows = focusItems.map((focus, i) => {
    const retro = currentReview.focusRetrospective?.[focus];
    const grade = retro === true ? "Yes" : retro === false ? "No" : null;
    return {
      focus,
      grade,
      notes: i === 0 ? reflectionNote : null,
    };
  });

  while (rows.length < 2) {
    rows.push({ focus: null, grade: null, notes: null });
  }
  return rows.slice(0, 2);
}

function mergeTodaySession(sessions, todaySession) {
  if (!todaySession?.date) return sessions;
  const next = sessions.filter((s) => s.date !== todaySession.date);
  next.unshift(todaySession);
  return next;
}

export default function HomeDashboard({ onNavigate, onOpenHistoryDay, onOpenWeeklyReview }) {
  const [dateKey, setDateKey] = useState(() => todayKey());
  const effectiveDate = useMemo(() => dateFromKey(dateKey), [dateKey]);

  const [today, setToday] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPanels, setLoadingPanels] = useState(true);
  const [recoveryStatus, setRecoveryStatus] = useState(null);
  const [dllSettings, setDllSettings] = useState(null);
  const [showDrSetupHint, setShowDrSetupHint] = useState(false);
  const [weekFocus, setWeekFocus] = useState({ items: [], complete: false });
  const [weeklyOverviewRows, setWeeklyOverviewRows] = useState([]);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [profile, setProfile] = useState(null);
  const [showWelcomeHint, setShowWelcomeHint] = useState(false);
  const [userName, setUserName] = useState(null);
  const [journalCarryover, setJournalCarryover] = useState([]);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(WELCOME_HINT_STORAGE_KEY) === "1") {
      sessionStorage.removeItem(WELCOME_HINT_STORAGE_KEY);
      setShowWelcomeHint(true);
    }
  }, []);

  useEffect(() => {
    loadTraderProfile().then(setProfile).catch(() => {});
    getCurrentUser()
      .then((user) => setUserName(greetingFromEmail(user?.email)))
      .catch(() => {});
    const refreshProfile = () => {
      loadTraderProfile({ force: true }).then(setProfile).catch(() => {});
    };
    window.addEventListener(PROFILE_UPDATED_EVENT, refreshProfile);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, refreshProfile);
  }, []);

  const reloadPanels = useCallback(async (todaySession, key = todayKey()) => {
    setLoadingPanels(true);
    try {
      const [recent, focus, showPrompt, recoveryState, dllSettings, overviewRows, carryover] =
        await Promise.all([
        loadRecentSessions({ asOfDateKey: key, limit: 35, lookbackDays: 90 }),
        loadHomeFocusItems(key),
        shouldShowWeeklyReviewPrompt(key),
        loadRecoveryState(),
        loadDllSettings(),
        loadWeeklyOverviewRows(),
        loadJournalReviewCarryoverSessions(key),
      ]);
      setSessions(mergeTodaySession(recent, todaySession));
      setJournalCarryover(carryover);
      setWeekFocus(focus);
      setWeeklyOverviewRows(overviewRows);
      setShowReviewPrompt(showPrompt);
      setRecoveryStatus(getRecoveryStatus(recoveryState, dllSettings));
      setDllSettings(dllSettings);
      setShowDrSetupHint(shouldShowDrawdownRecoverySetupHint(dllSettings));
    } finally {
      setLoadingPanels(false);
    }
  }, []);

  const loadDashboard = useCallback(async ({ refreshTodayOnly = false } = {}) => {
    const key = todayKey();
    setDateKey(key);

    const loadToday = async () => {
      await loadTraderSettings();
      return loadSessionDay(key, { postFromApi: true });
    };

    if (refreshTodayOnly) {
      const todaySession = await loadToday();
      setToday(todaySession);
      await reloadPanels(todaySession, key);
      return;
    }

    setLoading(true);
    setLoadingPanels(true);

    const todaySession = await loadToday();
    setToday(todaySession);
    setSessions((prev) => mergeTodaySession(prev, todaySession));
    setLoading(false);

    await reloadPanels(todaySession, key);
  }, [reloadPanels]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadDashboard().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadDashboard]);

  useEffect(() => {
    let timer;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        loadDashboard({ refreshTodayOnly: true }).catch(() => {});
      }, 200);
    };
    window.addEventListener(SESSION_SAVED_EVENT, refresh);
    window.addEventListener(TRADES_CHANGED_EVENT, refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(SESSION_SAVED_EVENT, refresh);
      window.removeEventListener(TRADES_CHANGED_EVENT, refresh);
    };
  }, [loadDashboard]);

  const preComplete = isStepComplete(today?.pre);
  const planComplete = isStepComplete(today?.plan);
  const postComplete = isStepComplete(today?.post);
  const allComplete = preComplete && planComplete && postComplete;
  const completedCount = [preComplete, planComplete, postComplete].filter(Boolean).length;
  const weekend = isWeekend(effectiveDate);
  const timeEyebrow = formatTimeEyebrow();

  const nextStep = useMemo(() => {
    if (allComplete) return null;
    return WORKFLOW_STEPS.find(
      (s) => !stepComplete(s.id, preComplete, planComplete, postComplete)
    );
  }, [allComplete, preComplete, planComplete, postComplete]);

  const hero = heroCopy(allComplete, completedCount, weekend, timeEyebrow);
  if (!allComplete && completedCount > 0) {
    hero.sub = buildProgressSubline(preComplete, planComplete, postComplete);
  }

  const pnlTone =
    today?.netPnl > 0 ? "positive" : today?.netPnl < 0 ? "negative" : "neutral";

  const sessionsForStreaks = useMemo(() => {
    if (!today?.date) return sessions;
    return mergeTodaySession(sessions, today);
  }, [sessions, today]);

  const processStreak = useMemo(
    () => countProcessStreakAsOf(sessionsForStreaks, dateKey),
    [sessionsForStreaks, dateKey]
  );
  const playbookStreak = useMemo(
    () => countPlaybookStreakAsOf(sessionsForStreaks, dateKey),
    [sessionsForStreaks, dateKey]
  );
  const todayPlaybookLabel = useMemo(
    () => playbookAdherenceLabel(today?.playbookAdherence),
    [today?.playbookAdherence]
  );
  const recent = sessions.slice(0, 3);

  const morningUnderway = !allComplete && completedCount > 0;
  const showHeroReadiness =
    morningUnderway && today?.readinessScore != null;

  const showReadinessStat =
    allComplete && (today?.readinessScore != null || preComplete);
  const showPnlStat =
    allComplete && (today?.netPnl != null || postComplete);
  const showPlaybookStat =
    today?.playbookAdherence?.total > 0 && todayPlaybookLabel;

  const greeting = formatTimeGreeting();
  const displayName = profile?.preferredName?.trim() || userName;
  const greetingLine = displayName ? `${greeting}, ${displayName}.` : `${greeting}.`;

  if (loading) return <div className="pm-loading home-page--loop">Loading...</div>;

  return (
    <div className="premarket-page hybrid-page home-page--loop">
      <div className="home-page-glow" aria-hidden="true" />

      <div className="home-page-inner home-page-inner--workflow">
        <header className="home-page-header">
          <div className="home-page-header-main">
            <h1 className="home-page-greeting">{greetingLine}</h1>
            <p className="home-page-date">{formatHeaderDateLong(effectiveDate)}</p>
            <HomeJournalFollowUpNudge
              today={today}
              carryover={journalCarryover}
              todayDateKey={dateKey}
              onNavigate={onNavigate}
              onOpenHistoryDay={onOpenHistoryDay}
            />
            <HomeMarketContextFlags dateKey={dateKey} className="home-page-market-flags--header" />
          </div>
        </header>

        {showWelcomeHint && (
          <div className="home-welcome-hint">
            <p>
              You&apos;re set up. Start with check-in, then customize your full process anytime in{" "}
              <button type="button" className="home-welcome-hint-link" onClick={() => onNavigate("process")}>
                My process
              </button>
              {" "}or Settings.
            </p>
            <button
              type="button"
              className="home-welcome-hint-dismiss"
              onClick={() => setShowWelcomeHint(false)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {showDrSetupHint && (
          <DrawdownRecoverySetupHint
            dllSettings={dllSettings}
            onOpenSettings={() => onNavigate("settings-risk")}
            onDismiss={() => {
              dismissDrawdownRecoverySetupHint();
              setShowDrSetupHint(false);
            }}
          />
        )}

        <RecoveryBanner recoveryStatus={recoveryStatus} />

        <div className="home-page-dashboard home-page-dashboard--workflow">
          <div className="home-page-main">
            <section className="home-loop-card home-hero-card home-page-hero home-hero-card--active">
              <div className="home-hero-card-inner">
                <p
                  className={`home-hero-eyebrow${hero.eyebrowMuted ? " home-hero-eyebrow--muted" : ""}`}
                >
                  {hero.eyebrow}
                </p>
                <h2 className="home-hero-title">{hero.title}</h2>
                {hero.sub && <p className="home-hero-lead">{hero.sub}</p>}
                {!allComplete && today?.playbookAdherence?.total > 0 && todayPlaybookLabel && (
                  <p className="home-hero-lead home-hero-lead--playbook">{todayPlaybookLabel.text}</p>
                )}
                <div className="home-hero-week-focus">
                  <WeekFocusStrip
                    items={weekFocus.items}
                    loading={loadingPanels}
                    showReviewPrompt={showReviewPrompt}
                    onOpenWeeklyReview={onOpenWeeklyReview}
                    allComplete={allComplete}
                  />
                </div>
                <HomeHeroActivePanel
                  allComplete={allComplete}
                  completedCount={completedCount}
                  today={today}
                  processStreak={processStreak}
                  playbookStreak={playbookStreak}
                  streakTargetDays={profile?.streakTargetDays ?? 21}
                  showRiskStreak={profile?.riskStreakEnabled !== false}
                  showPlaybookStreak={profile?.playbookStreakEnabled !== false}
                  loadingPanels={loadingPanels}
                  showHeroReadiness={showHeroReadiness}
                  showReadinessStat={showReadinessStat}
                  showPlaybookStat={showPlaybookStat}
                  showPnlStat={showPnlStat}
                  todayPlaybookLabel={todayPlaybookLabel}
                  pnlTone={pnlTone}
                  preComplete={preComplete}
                  planComplete={planComplete}
                  postComplete={postComplete}
                  nextStep={nextStep}
                  onNavigate={onNavigate}
                />
              </div>
            </section>

            {allComplete && (
              <RecentSessionsPanel
                sessions={sessions}
                recent={recent}
                todayDateKey={dateKey}
                loadingPanels={loadingPanels}
                onNavigate={onNavigate}
                onOpenHistoryDay={onOpenHistoryDay}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
