"use client";

import { useState, useEffect, useMemo } from "react";
import {
  loadSessionDay,
  loadAllSessions,
  todayKey,
  isStepComplete,
  formatTimeEyebrow,
  formatHomeBarDate,
  formatPosterDate,
  formatShortHistoryDate,
  formatUsd,
  isWeekend,
  getMarketStatus,
} from "../lib/history-data";
import HomeEventBanner from "./HomeEventBanner";

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
          stroke="var(--green)"
          strokeWidth="2.5"
        />
      </svg>
    </div>
  );
}

function countStreak(sessions, field) {
  const done = new Set(
    sessions.filter((s) => isStepComplete(s[field])).map((s) => s.date)
  );
  let streak = 0;
  const d = new Date(`${todayKey()}T12:00:00`);
  for (let i = 0; i < 365; i++) {
    const key = d.toISOString().split("T")[0];
    if (done.has(key)) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    } else if (i === 0) {
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function stepComplete(stepId, preComplete, planComplete, postComplete) {
  if (stepId === "premarket") return preComplete;
  if (stepId === "dailyplan") return planComplete;
  return postComplete;
}

function formatDisplayPnl(value) {
  if (value == null) return "—";
  const abs = Math.abs(Math.round(value));
  const sign = value < 0 ? "−" : value > 0 ? "+" : "";
  return `${sign}${abs}`;
}

function heroCopy(allComplete, completedCount, weekend, timeEyebrow) {
  if (allComplete) {
    return {
      eyebrow: "3 / 3 complete",
      eyebrowMuted: false,
      title: "Day complete.",
      sub: "Process over outcomes.",
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
    title: "Ready when you are.",
    sub: "Pre-market, plan, and review still open.",
  };
}

export default function HomeDashboard({ onNavigate, onOpenHistoryDay }) {
  const [today, setToday] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [todaySession, all] = await Promise.all([
        loadSessionDay(todayKey()),
        loadAllSessions(),
      ]);
      setToday(todaySession);
      setSessions(all);
      setLoading(false);
    })();
  }, []);

  const preComplete = isStepComplete(today?.pre);
  const planComplete = isStepComplete(today?.plan);
  const postComplete = isStepComplete(today?.post);
  const allComplete = preComplete && planComplete && postComplete;
  const completedCount = [preComplete, planComplete, postComplete].filter(Boolean).length;
  const weekend = isWeekend();
  const marketStatus = getMarketStatus();
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

  const preStreak = useMemo(() => countStreak(sessions, "pre"), [sessions]);
  const recent = sessions.slice(0, 3);

  const showReadinessStat =
    allComplete && (today?.readinessScore != null || preComplete);
  const showPnlStat =
    allComplete && (today?.netPnl != null || postComplete);

  const handleShare = async () => {
    const text = [
      `Libertrade · ${formatPosterDate()}`,
      `Readiness ${today?.readinessScore ?? "—"}`,
      today?.netPnl != null
        ? `Net P&L ${formatUsd(today.netPnl, { signed: true })}`
        : "",
      "Pre-market · Plan · Post-market complete.",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* cancelled */
    }
  };

  if (loading) return <div className="pm-loading">Loading...</div>;

  return (
    <div className="home-dashboard home-dashboard--hybrid">
      <div className="home-hybrid-stripe" aria-hidden="true" />

      <div className="home-hybrid-bar">
        <span className="home-hybrid-date">{formatHomeBarDate()}</span>
        <span className={`home-hybrid-live${marketStatus.live ? "" : " home-hybrid-live--off"}`}>
          {marketStatus.label}
        </span>
      </div>

      <div className="home-dashboard-inner">
        <div className="home-hybrid-body">
          <header className="home-hybrid-hero">
            <div className="home-hybrid-hero-copy">
              <div
                className={`home-hybrid-eyebrow hybrid-eyebrow${hero.eyebrowMuted ? " home-hybrid-eyebrow--muted hybrid-eyebrow--muted" : ""}`}
              >
                {hero.eyebrow}
              </div>
              <h1 className="home-hybrid-title hybrid-title">{hero.title}</h1>
              <p className="home-hybrid-sub">{hero.sub}</p>
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
                  <span className="home-hybrid-edit-sep">·</span>
                  <button type="button" onClick={handleShare}>
                    Share
                  </button>
                </div>
              )}
            </div>

            {allComplete && (showReadinessStat || showPnlStat) && (
              <div className="home-hybrid-float-stats">
                {showReadinessStat && (
                  <div>
                    <div
                      className={`home-hybrid-stat-num${today?.readinessScore != null ? " positive" : ""}`}
                    >
                      {today?.readinessScore != null ? today.readinessScore : "—"}
                    </div>
                    <div className="home-hybrid-stat-cap">Readiness</div>
                  </div>
                )}
                {showPnlStat && (
                  <div>
                    <div
                      className={`home-hybrid-stat-num ${pnlTone}${pnlSmaller ? " sm" : ""}`}
                    >
                      {today?.netPnl != null
                        ? formatDisplayPnl(today.netPnl)
                        : "—"}
                    </div>
                    <div className="home-hybrid-stat-cap">Net P&amp;L</div>
                  </div>
                )}
              </div>
            )}
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
                return (
                  <button
                    key={step.id}
                    type="button"
                    className={`home-hybrid-step${complete ? " done" : ""}${isNext ? " next" : ""}`}
                    onClick={() => onNavigate(step.id)}
                  >
                    <span className="home-hybrid-step-icon" aria-hidden="true">
                      {complete ? "✓" : isNext ? "→" : ""}
                    </span>
                    <span className="home-hybrid-step-label">{step.label}</span>
                    {isNext && <span className="home-hybrid-step-badge">Next</span>}
                  </button>
                );
              })}
            </section>
          )}

          <HomeEventBanner />

          {allComplete && (
            <section className="home-hybrid-calm-block">
              <div>
                <h3 className="home-hybrid-block-label">Readiness trend</h3>
                <ReadinessTrend sessions={sessions} />
              </div>
              <div>
                <div className="home-hybrid-block-head">
                  <h3 className="home-hybrid-block-label">Streak &amp; recent</h3>
                  <button
                    type="button"
                    className="home-hybrid-block-link"
                    onClick={() => onNavigate("history")}
                  >
                    History →
                  </button>
                </div>
                {preStreak > 0 && (
                  <p className="home-hybrid-streak-line">
                    Pre-market · <strong>{preStreak} day streak</strong>
                    {today?.readinessScore != null && (
                      <>
                        {" "}
                        · <strong className="home-hybrid-streak-ready">{today.readinessScore}</strong>{" "}
                        <span className="home-hybrid-streak-ready-cap">ready today</span>
                      </>
                    )}
                  </p>
                )}
                {recent.length === 0 ? (
                  <p className="home-panel-empty">No sessions yet.</p>
                ) : (
                  recent.map((s) => {
                    const pnlCls =
                      s.netPnl > 0 ? "positive" : s.netPnl < 0 ? "negative" : "neutral";
                    const readyCls =
                      s.readinessScore != null ? "scored" : "muted";
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
                        <span className={`home-hybrid-recent-pnl ${pnlCls}`}>
                          {s.netPnl != null
                            ? formatUsd(s.netPnl, { signed: true })
                            : "—"}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
