"use client";

import { useState, useEffect, useMemo } from "react";
import {
  loadSessionDay,
  loadAllSessions,
  todayKey,
  isStepComplete,
  countProcessStreak,
  countPlaybookStreak,
  getProcessStreakDisplayForDay,
  formatTimeEyebrow,
  formatHomeBarDate,
  formatShortHistoryDate,
  formatUsd,
  isWeekend,
} from "../lib/history-data";
import HomeEventBanner from "./HomeEventBanner";
import ReadinessScoreWidget from "./ReadinessScoreWidget";
import { playbookAdherenceLabel } from "../lib/setup-adherence";
import {
  loadRecoveryState,
  getRecoveryStatus,
  formatRecoveryUsd,
  seedRecoveryDemo,
} from "../lib/dll-recovery";
import { loadDllSettings } from "../lib/dll-recovery-settings";
import {
  loadHomeFocusItems,
  shouldShowWeeklyReviewPrompt,
} from "../lib/weekly-process-review";

/** Set localStorage to "750" to demo recovery UI; remove key to disable. */
const DEMO_RECOVERY_KEY = "libertrade_demo_recovery";

const WORKFLOW_STEPS = [
  { id: "premarket", label: "Pre-Market" },
  { id: "dailyplan", label: "Daily Plan" },
  { id: "postmarket", label: "Post-Market" },
];

function buildProgressSubline(preComplete, planComplete, postComplete) {
  const parts = [];
  if (preComplete) parts.push("Pre-market done");
  const open = [];
  if (!planComplete) open.push("Plan");
  if (!postComplete) open.push("Review");
  if (open.length) parts.push(`${open.join(" + ")} open`);
  return parts.join(" · ") || "All steps open";
}

function ReadinessTrend({ sessions }) {
  const points = useMemo(() => {
    return sessions
      .filter((s) => s.readinessScore != null)
      .slice(0, 4)
      .reverse();
  }, [sessions]);

  const chart = useMemo(() => {
    if (points.length < 3) return null;
    const w = 200;
    const h = 48;
    const pad = 4;
    const coords = points.map((s, i) => {
      const x =
        points.length === 1
          ? w / 2
          : pad + (i / (points.length - 1)) * (w - pad * 2);
      const y = pad + (1 - s.readinessScore / 100) * (h - pad * 2);
      return { x, y };
    });
    const line = coords.map((p) => `${p.x},${p.y}`).join(" ");
    return { w, h, line };
  }, [points]);

  if (points.length === 0) {
    return (
      <p className="home-panel-empty">
        Complete pre-market check-ins to see your trend.
      </p>
    );
  }

  if (points.length < 3) {
    const last = points[points.length - 1];
    return (
      <div className="home-trend-compact">
        <div className="home-hybrid-stat-num">{last.readinessScore}</div>
        <p className="home-trend-compact-note">
          {points.length === 1 ? "First scored session" : "One more for trend line"}
        </p>
      </div>
    );
  }

  return (
    <div className="home-trend-chart-wrap">
      <svg
        viewBox={`0 0 ${chart.w} ${chart.h}`}
        className="home-trend-chart"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          points={chart.line}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2.5"
        />
      </svg>
    </div>
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

function formatPosterPnl(value) {
  if (value == null) return "—";
  return String(Math.abs(Math.round(value)));
}

const RISK_STREAK_GOAL = 21;

function ProcessStreaksPanel({ riskCount, playbookCount }) {
  return (
    <div
      className="home-process-streaks"
      title="Risk: consecutive days you followed your risk plan. Playbook: consecutive days with no invalid or untagged trades."
    >
      <div className="home-process-streaks-eyebrow hybrid-eyebrow">Process streaks</div>
      <div className="home-process-streaks-pillars">
        <div className="home-process-streak-pillar">
          <div
            className="home-process-streak-num home-process-streak-num--risk"
            aria-label={`${riskCount} of ${RISK_STREAK_GOAL} day risk adherence streak`}
          >
            {riskCount}
            <span className="home-process-streak-goal">/{RISK_STREAK_GOAL}</span>
          </div>
          <div className="home-process-streak-label">Risk</div>
        </div>
        <div className="home-process-streak-pillar home-process-streak-pillar--divider">
          <div
            className="home-process-streak-num home-process-streak-num--playbook"
            aria-label={`${playbookCount} of ${RISK_STREAK_GOAL} day playbook process streak`}
          >
            {playbookCount}
            <span className="home-process-streak-goal">/{RISK_STREAK_GOAL}</span>
          </div>
          <div className="home-process-streak-label">Playbook</div>
        </div>
      </div>
    </div>
  );
}

function dateFromKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`);
}

function heroCopy(allComplete, completedCount, weekend, timeEyebrow) {
  if (allComplete) {
    return {
      eyebrow: "Complete",
      eyebrowMuted: false,
      title: "Day Done.",
      sub: null,
      poster: true,
    };
  }
  if (completedCount > 0) {
    return {
      eyebrow: `${completedCount} of 3 complete`,
      eyebrowMuted: true,
      title: `${timeEyebrow} underway.`,
      sub: null, // filled by caller with actual step state
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
    eyebrowMuted: true,
    title: "READY WHEN YOU ARE.",
    sub: "Pre-market, plan, and review still open.",
  };
}

export default function HomeDashboard({ onNavigate, onOpenHistoryDay, onOpenWeeklyReview }) {
  const effectiveDateKey = todayKey();
  const effectiveDate = useMemo(
    () => dateFromKey(effectiveDateKey),
    [effectiveDateKey]
  );

  const [today, setToday] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recoveryStatus, setRecoveryStatus] = useState(null);
  const [weekFocus, setWeekFocus] = useState({ items: [], complete: false });
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      if (typeof window !== "undefined" && !localStorage.getItem(DEMO_RECOVERY_KEY)) {
        localStorage.setItem(DEMO_RECOVERY_KEY, "750");
      }

      let recoveryState = await loadRecoveryState();
      const dllSettings = await loadDllSettings();
      if (
        typeof window !== "undefined" &&
        localStorage.getItem(DEMO_RECOVERY_KEY) === "750" &&
        !recoveryState.active
      ) {
        await seedRecoveryDemo(750);
        recoveryState = await loadRecoveryState();
      }

      const [todaySession, all, focus, showPrompt] = await Promise.all([
        loadSessionDay(effectiveDateKey),
        loadAllSessions(),
        loadHomeFocusItems(effectiveDateKey),
        shouldShowWeeklyReviewPrompt(effectiveDateKey),
      ]);
      if (cancelled) return;
      setToday(todaySession);
      setSessions(all);
      setWeekFocus(focus);
      setShowReviewPrompt(showPrompt);
      setRecoveryStatus(getRecoveryStatus(recoveryState, dllSettings));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveDateKey]);

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
  const pnlSmaller = today?.netPnl != null && today.netPnl < 0;

  const processStreak = useMemo(() => countProcessStreak(sessions), [sessions]);
  const playbookStreak = useMemo(() => countPlaybookStreak(sessions), [sessions]);
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

  if (loading) return <div className="pm-loading">Loading...</div>;

  return (
    <div className="home-dashboard home-dashboard--hybrid">
      <div className="home-hybrid-stripe" aria-hidden="true" />

      <div className="home-hybrid-bar">
        <span className="home-hybrid-date">{formatHomeBarDate(effectiveDate)}</span>
      </div>

      <div className="home-dashboard-inner">
        <div className="home-hybrid-body">
          <header
            className={`home-hybrid-hero${allComplete ? " home-hybrid-hero--complete" : ""}`}
          >
            <div className="home-hybrid-hero-copy">
              <div
                className={`home-hybrid-eyebrow hybrid-eyebrow${hero.eyebrowMuted ? " home-hybrid-eyebrow--muted hybrid-eyebrow--muted" : ""}${hero.poster ? " home-hybrid-eyebrow--poster" : ""}`}
              >
                {hero.eyebrow}
              </div>
              <h1
                className={`home-hybrid-title hybrid-title hybrid-page-title${hero.poster ? " home-hybrid-title--poster" : ""}`}
              >
                {hero.title}
              </h1>
              {allComplete && <div className="home-hybrid-rule" aria-hidden="true" />}
              {allComplete && (showReadinessStat || showPnlStat || showPlaybookStat) && (
                <div className="home-hybrid-stats-row">
                  {showReadinessStat && (
                    <div className="home-hybrid-stat">
                      <div
                        className={`home-hybrid-stat-num${today?.readinessScore != null ? " positive" : ""}`}
                      >
                        {today?.readinessScore != null ? today.readinessScore : "—"}
                      </div>
                      <div className="home-hybrid-stat-cap">Ready</div>
                    </div>
                  )}
                  {showPlaybookStat && (
                    <div className="home-hybrid-stat">
                      <div
                        className={`home-hybrid-stat-num ${
                          todayPlaybookLabel.tone === "green"
                            ? "positive"
                            : todayPlaybookLabel.tone === "amber"
                              ? "neutral"
                              : "negative"
                        }`}
                      >
                        {today.playbookAdherence.playbookRate}%
                      </div>
                      <div className="home-hybrid-stat-cap">Playbook</div>
                    </div>
                  )}
                  {showPnlStat && (
                    <div className="home-hybrid-stat">
                      <div
                        className={`home-hybrid-stat-num ${pnlTone}${pnlSmaller ? " sm" : ""}`}
                      >
                        {formatPosterPnl(today?.netPnl)}
                      </div>
                      <div className="home-hybrid-stat-cap">P&amp;L</div>
                    </div>
                  )}
                </div>
              )}
              {hero.sub && <p className="home-hybrid-sub">{hero.sub}</p>}
              {!allComplete && today?.playbookAdherence?.total > 0 && todayPlaybookLabel && (
                <p className="home-hybrid-sub home-hybrid-sub--playbook">{todayPlaybookLabel.text}</p>
              )}
              {allComplete && (
                <div className="home-hybrid-edit">
                  <button type="button" onClick={() => onNavigate("premarket")}>
                    Edit pre-market
                  </button>
                  <span className="home-hybrid-edit-sep">·</span>
                  <button type="button" onClick={() => onNavigate("dailyplan")}>
                    Edit plan
                  </button>
                  <span className="home-hybrid-edit-sep">·</span>
                  <button type="button" onClick={() => onNavigate("postmarket")}>
                    Edit review
                  </button>
                </div>
              )}
            </div>
            <aside className="home-hybrid-hero-aside">
              <ProcessStreaksPanel riskCount={processStreak} playbookCount={playbookStreak} />
              {showHeroReadiness && (
                <ReadinessScoreWidget
                  score={today.readinessScore}
                  statusLabel={today.readinessLabel}
                  statusTone={today.readinessTone}
                  variant="compact"
                  className="home-hybrid-readiness"
                />
              )}
            </aside>
          </header>

          {!allComplete && (
            <section className="home-hybrid-workflow" aria-label="Today's workflow">
              <div className="home-hybrid-workflow-head">Today&apos;s workflow</div>
              {WORKFLOW_STEPS.map((step) => {
                const complete = stepComplete(
                  step.id,
                  preComplete,
                  planComplete,
                  postComplete
                );
                const isNext = nextStep?.id === step.id;
                const started = stepStarted(step.id, today);
                const showEdit = !isNext && started;
                return (
                  <div
                    key={step.id}
                    className={`home-hybrid-step${complete ? " done" : ""}${isNext ? " next" : ""}${started && !complete ? " partial" : ""}`}
                  >
                    <button
                      type="button"
                      className="home-hybrid-step-hit"
                      onClick={() => onNavigate(step.id)}
                    >
                      <span className="home-hybrid-step-icon" aria-hidden="true">
                        {complete ? "✓" : ""}
                      </span>
                      <span className="home-hybrid-step-label">{step.label}</span>
                    </button>
                    {(isNext || showEdit) && (
                      <span className="home-hybrid-step-action">
                        {isNext ? (
                          <button
                            type="button"
                            className="home-hybrid-step-badge"
                            onClick={() => onNavigate(step.id)}
                          >
                            {completedCount === 0 ? "Start" : "Next"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="home-hybrid-step-edit"
                            onClick={() => onNavigate(step.id)}
                          >
                            Edit
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          <HomeEventBanner dateKey={effectiveDateKey} />

          {weekFocus.items.length > 0 && (
            <section className="home-week-focus" aria-label="This week's focus">
              <div className="home-week-focus-eyebrow hybrid-eyebrow">This week&apos;s focus</div>
              <ul className="home-week-focus-list">
                {weekFocus.items.map((item, i) => (
                  <li key={i} className="home-week-focus-item">{item}</li>
                ))}
              </ul>
            </section>
          )}

          {showReviewPrompt && onOpenWeeklyReview && (
            <button
              type="button"
              className="home-review-prompt"
              onClick={onOpenWeeklyReview}
            >
              <span className="home-review-prompt-label">Weekly process review</span>
              <span className="home-review-prompt-action">Review this week →</span>
            </button>
          )}

          {recoveryStatus?.active && (
            <div className="dll-recovery-banner" role="status" aria-label="DLL recovery mode">
              <div className="dll-recovery-banner-eyebrow hybrid-eyebrow">Recovery mode</div>
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
          )}

          {allComplete && (
            <section className="home-hybrid-calm-block">
              <div>
                <h3 className="home-hybrid-block-label">Readiness trend</h3>
                <ReadinessTrend sessions={sessions} />
              </div>
              <div>
                <div className="home-hybrid-block-head">
                  <h3 className="home-hybrid-block-label">Recent</h3>
                  <button
                    type="button"
                    className="home-hybrid-block-link"
                    onClick={() => onNavigate("history")}
                  >
                    History →
                  </button>
                </div>
                {recent.length === 0 ? (
                  <p className="home-panel-empty">No sessions yet.</p>
                ) : (
                  <>
                    <div className="home-hybrid-recent-head" aria-hidden="true">
                      <span className="home-hybrid-recent-date">Date</span>
                      <span className="home-hybrid-recent-col-ready">Ready</span>
                      <span className="home-hybrid-recent-col-risk">Risk</span>
                      <span className="home-hybrid-recent-col-pnl">P&amp;L</span>
                    </div>
                    {recent.map((s) => {
                      const pnlCls =
                        s.netPnl > 0 ? "positive" : s.netPnl < 0 ? "negative" : "neutral";
                      const readyCls =
                        s.readinessScore != null ? "scored" : "muted";
                      const proc = getProcessStreakDisplayForDay(s, sessions);
                      const procCls =
                        proc.type === "followed"
                          ? "positive"
                          : proc.type === "broken"
                            ? "broken"
                            : "muted";
                      return (
                        <button
                          key={s.date}
                          type="button"
                          className="home-hybrid-recent-row"
                          onClick={() => onOpenHistoryDay(s.date)}
                        >
                          <span className="home-hybrid-recent-date">
                            {formatShortHistoryDate(s.date)}
                          </span>
                          <span className={`home-hybrid-recent-ready ${readyCls}`}>
                            {s.readinessScore != null ? s.readinessScore : "—"}
                          </span>
                          <span className={`home-hybrid-recent-proc ${procCls}`}>
                            {proc.type === "unanswered" ? "—" : proc.streak}
                          </span>
                          <span className={`home-hybrid-recent-pnl ${pnlCls}`}>
                            {s.netPnl != null
                              ? formatUsd(s.netPnl, { signed: true })
                              : "—"}
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
