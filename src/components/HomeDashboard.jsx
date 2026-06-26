"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  loadSessionDay,
  loadRecentSessions,
  todayKey,
  isStepComplete,
  countProcessStreakAsOf,
  countPlaybookStreakAsOf,
  getProcessStreakDisplayForDay,
  formatTimeEyebrow,
  formatHomeBarDate,
  formatShortHistoryDate,
  formatUsd,
  isWeekend,
} from "../lib/history-data";
import HomeEventBanner from "./HomeEventBanner";
import { playbookAdherenceLabel } from "../lib/setup-adherence";
import {
  loadRecoveryState,
  getRecoveryStatus,
  formatRecoveryUsd,
} from "../lib/dll-recovery";
import { loadDllSettings } from "../lib/dll-recovery-settings";
import {
  loadHomeFocusItems,
  shouldShowWeeklyReviewPrompt,
} from "../lib/weekly-process-review";
import { loadTraderSettings } from "../lib/trader-settings";
import { loadTraderProfile, PROFILE_UPDATED_EVENT, WELCOME_HINT_STORAGE_KEY } from "../lib/trader-profile";
import { SESSION_SAVED_EVENT, TRADES_CHANGED_EVENT } from "../lib/session-events";

const WORKFLOW_STEPS = [
  { id: "premarket", label: "Check-in" },
  { id: "dailyplan", label: "Session Plan" },
  { id: "postmarket", label: "Close out" },
];

function buildProgressSubline(preComplete, planComplete, postComplete) {
  const parts = [];
  if (preComplete) parts.push("Check-in done");
  const open = [];
  if (!planComplete) open.push("Session plan");
  if (!postComplete) open.push("Close out");
  if (open.length) parts.push(`${open.join(" + ")} open`);
  return parts.join(" · ") || "All steps open";
}

function ReadinessTrend({ sessions, embedded = false }) {
  const points = useMemo(() => {
    return sessions
      .filter((s) => s.readinessScore != null)
      .slice(0, 4)
      .reverse();
  }, [sessions]);

  const chart = useMemo(() => {
    if (points.length < 3) return null;
    const w = 280;
    const h = 56;
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
  }, [points]);

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
      <div className={`home-trend-compact${embedded ? " home-trend-compact--embedded" : ""}`}>
        <div className="home-hybrid-stat-num">{last.readinessScore}</div>
        <p className="home-trend-compact-note">
          {points.length === 1 ? "First scored session" : "One more for trend line"}
        </p>
      </div>
    );
  }

  return (
    <div className={`home-trend-chart-wrap${embedded ? " home-trend-chart-wrap--embedded" : ""}`}>
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
  if (loading && items.length === 0 && !allComplete) {
    return (
      <div className="home-week-focus-strip home-week-focus-strip--loading" aria-hidden="true">
        <div className="home-week-focus-strip-skeleton" />
      </div>
    );
  }

  if (items.length > 0) {
    return (
      <div
        className={`home-week-focus-strip${allComplete ? " home-week-focus-strip--complete" : ""}`}
        role="note"
        aria-label="This week's focus"
      >
        <div className="pm-week-focus-reminder home-week-focus-reminder">
          <div className="pm-week-focus-reminder-label hybrid-eyebrow">This week&apos;s focus</div>
          <ul className="pm-week-focus-reminder-list">
            {items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (showReviewPrompt && onOpenWeeklyReview) {
    return (
      <div className={`home-week-focus-strip${allComplete ? " home-week-focus-strip--complete" : ""}`}>
        <button
          type="button"
          className="home-review-prompt home-review-prompt--focus"
          onClick={onOpenWeeklyReview}
        >
          <span className="home-review-prompt-label">Set this week&apos;s focus</span>
          <span className="home-review-prompt-action">Weekly review →</span>
        </button>
      </div>
    );
  }

  return null;
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
    <div className="pm-section-panel home-recent-panel">
      <div className="pm-section-panel-head">
        <div>
          <h2 className="pm-section-title hybrid-section-title">Recent sessions</h2>
          <p className="pm-section-desc">Readiness trend and your last few days.</p>
        </div>
        <button
          type="button"
          className="home-hybrid-block-link"
          onClick={() => onNavigate("history")}
        >
          History →
        </button>
      </div>
      <div className="pm-section-panel-body">
        {loadingPanels ? (
          <p className="home-panel-loading-text">Loading sessions…</p>
        ) : recent.length === 0 ? (
          <p className="home-panel-empty">No sessions yet.</p>
        ) : (
          <>
            <ReadinessTrend sessions={sessions} embedded />
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
          </>
        )}
      </div>
    </div>
  );
}

function HomeTodayHero({
  allComplete,
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
  showPnlStat,
  showPlaybookStat,
  todayPlaybookLabel,
  pnlTone,
}) {
  const processStats = (
    <>
      {showRiskStreak && (
        <div className="prop-economics-hero-stat">
          <span className="prop-economics-hero-cap">Risk streak</span>
          <span className="prop-economics-hero-value">
            {loadingPanels ? "—" : processStreak}
            <span className="home-today-hero-goal">/{streakTargetDays}</span>
          </span>
        </div>
      )}
      {showPlaybookStreak && (
        <div
          className={`prop-economics-hero-stat${allComplete ? "" : " prop-economics-hero-stat--subtle"}`}
        >
          <span className="prop-economics-hero-cap">Playbook streak</span>
          <span className="prop-economics-hero-value">
            {loadingPanels ? "—" : playbookStreak}
            <span className="home-today-hero-goal">/{streakTargetDays}</span>
          </span>
        </div>
      )}
      {showReadinessStat && today?.readinessScore != null && !(showHeroReadiness && !allComplete) && (
        <div className="prop-economics-hero-stat">
          <span className="prop-economics-hero-cap">Ready</span>
          <span className="prop-economics-hero-value positive">{today.readinessScore}</span>
        </div>
      )}
      {showPlaybookStat && (
        <div className="prop-economics-hero-stat">
          <span className="prop-economics-hero-cap">Playbook setups</span>
          <span
            className={`prop-economics-hero-value ${
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
    </>
  );

  if (allComplete) {
    return (
      <section
        className="prop-economics-hero home-today-hero home-today-hero--complete"
        aria-label="Today summary"
      >
        <div className="home-today-hero-process">{processStats}</div>
        {showPnlStat && today?.netPnl != null && (
          <div className="prop-economics-hero-stat home-today-hero-pnl">
            <span className="prop-economics-hero-cap">Net P&amp;L</span>
            <span
              className={`prop-economics-hero-value ${
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

  let primaryLabel = "Today's workflow";
  let primaryValue = `${completedCount} / 3`;
  let primaryClass = "";

  if (showHeroReadiness && today?.readinessScore != null) {
    primaryLabel = "Ready";
    primaryValue = String(today.readinessScore);
    primaryClass =
      today.readinessScore >= 70 ? "positive" : today.readinessScore >= 50 ? "neutral" : "negative";
  }

  return (
    <section className="prop-economics-hero home-today-hero" aria-label="Today summary">
      <div className="prop-economics-hero-net">
        <span className="prop-economics-hero-cap">{primaryLabel}</span>
        <span className={`prop-economics-hero-net-value ${primaryClass}`}>{primaryValue}</span>
      </div>
      <div className="prop-economics-hero-supporting">{processStats}</div>
    </section>
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
    eyebrowMuted: true,
    title: "READY WHEN YOU ARE.",
    sub: "Check-in, session plan, and close out still open.",
  };
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
  const [weekFocus, setWeekFocus] = useState({ items: [], complete: false });
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [profile, setProfile] = useState(null);
  const [showWelcomeHint, setShowWelcomeHint] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(WELCOME_HINT_STORAGE_KEY) === "1") {
      sessionStorage.removeItem(WELCOME_HINT_STORAGE_KEY);
      setShowWelcomeHint(true);
    }
  }, []);

  useEffect(() => {
    loadTraderProfile().then(setProfile).catch(() => {});
    const refreshProfile = () => {
      loadTraderProfile({ force: true }).then(setProfile).catch(() => {});
    };
    window.addEventListener(PROFILE_UPDATED_EVENT, refreshProfile);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, refreshProfile);
  }, []);

  const reloadPanels = useCallback(async (todaySession, key = todayKey()) => {
    setLoadingPanels(true);
    try {
      const [recent, focus, showPrompt, recoveryState, dllSettings] = await Promise.all([
        loadRecentSessions({ asOfDateKey: key, limit: 35, lookbackDays: 90 }),
        loadHomeFocusItems(key),
        shouldShowWeeklyReviewPrompt(key),
        loadRecoveryState(),
        loadDllSettings(),
      ]);
      setSessions(mergeTodaySession(recent, todaySession));
      setWeekFocus(focus);
      setShowReviewPrompt(showPrompt);
      setRecoveryStatus(getRecoveryStatus(recoveryState, dllSettings));
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

  if (loading) return <div className="pm-loading">Loading...</div>;

  return (
    <div className="premarket-page hybrid-page">
      <div className="pm-topbar">
        <span>{formatHomeBarDate(effectiveDate)}</span>
      </div>

      <div className="pm-closeout-layout">
        <div className="pm-closeout-main">
          <HomeEventBanner dateKey={dateKey} />

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

          <div className="pm-header">
            <div
              className={`pm-eyebrow hybrid-eyebrow${hero.eyebrowMuted ? " hybrid-eyebrow--muted" : ""}${hero.poster ? " home-today-eyebrow--poster" : ""}`}
            >
              {hero.eyebrow}
            </div>
            <h1 className="hybrid-page-title home-today-title--poster">{hero.title}</h1>
            {hero.sub && <p className="pm-subtitle">{hero.sub}</p>}
            {!allComplete && today?.playbookAdherence?.total > 0 && todayPlaybookLabel && (
              <p className="pm-subtitle home-hybrid-sub--playbook">{todayPlaybookLabel.text}</p>
            )}
          </div>

          <WeekFocusStrip
            items={weekFocus.items}
            loading={loadingPanels}
            showReviewPrompt={showReviewPrompt}
            onOpenWeeklyReview={onOpenWeeklyReview}
            allComplete={allComplete}
          />

          <HomeTodayHero
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
            showPnlStat={showPnlStat}
            showPlaybookStat={showPlaybookStat}
            todayPlaybookLabel={todayPlaybookLabel}
            pnlTone={pnlTone}
          />

          {allComplete && (
            <div className="home-hybrid-edit">
              <button type="button" onClick={() => onNavigate("premarket")}>
                Edit check-in
              </button>
              <span className="home-hybrid-edit-sep">·</span>
              <button type="button" onClick={() => onNavigate("dailyplan")}>
                Edit session plan
              </button>
              <span className="home-hybrid-edit-sep">·</span>
              <button type="button" onClick={() => onNavigate("postmarket")}>
                Edit close out
              </button>
            </div>
          )}

          <div className="pm-closeout-stage">
            <RecoveryBanner recoveryStatus={recoveryStatus} />

            {!allComplete && (
              <div className="pm-section-panel home-workflow-panel">
                <div className="pm-section-panel-head">
                  <div>
                    <h2 className="pm-section-title hybrid-section-title">Today&apos;s workflow</h2>
                    <p className="pm-section-desc">
                      {completedCount === 0
                        ? "Start with check-in, then session plan and close out."
                        : `${completedCount} of 3 steps complete.`}
                    </p>
                  </div>
                </div>
                <div className="pm-section-panel-body">
                  <div className="home-workflow-steps" aria-label="Today's workflow">
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
                  </div>
                </div>
              </div>
            )}

            {showReviewPrompt && onOpenWeeklyReview && weekFocus.items.length > 0 && (
              <button
                type="button"
                className="home-review-prompt"
                onClick={onOpenWeeklyReview}
              >
                <span className="home-review-prompt-label">Weekly process review</span>
                <span className="home-review-prompt-action">Review this week →</span>
              </button>
            )}

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
