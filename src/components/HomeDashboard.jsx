"use client";

import { useState, useEffect, useMemo } from "react";
import {
  loadSessionDay,
  loadAllSessions,
  todayKey,
  isStepComplete,
  getTimeContext,
  formatGreetingDate,
  formatHeaderDate,
  formatHistoryRowDate,
  formatUsd,
} from "../lib/history-data";

const WORKFLOW_STEPS = [
  { id: "premarket", label: "Pre-Market", desc: "Readiness check-in before the open" },
  { id: "dailyplan", label: "Daily Plan", desc: "Bias, levels, setups, and risk" },
  { id: "postmarket", label: "Post-Market", desc: "Import trades and close the session" },
];

function StepStatus({ complete, score }) {
  if (complete) {
    return (
      <span className="home-task-status home-task-status--done">
        {score != null ? `Complete · ${score}` : "Complete"}
      </span>
    );
  }
  return <span className="home-task-status home-task-status--pending">Not started</span>;
}

function StageDots({ pre, plan, post }) {
  return (
    <span className="home-stage-dots">
      <span className={`home-stage-dot${pre ? " on" : ""}`} title="Pre-Market">P</span>
      <span className={`home-stage-dot${plan ? " on" : ""}`} title="Daily Plan">L</span>
      <span className={`home-stage-dot${post ? " on" : ""}`} title="Post-Market">R</span>
    </span>
  );
}

function ReadinessTrend({ sessions, onHistory }) {
  const points = useMemo(() => {
    return sessions
      .filter((s) => s.readinessScore != null)
      .slice(0, 4)
      .reverse();
  }, [sessions]);

  const chart = useMemo(() => {
    if (points.length < 2) return null;
    const w = 280;
    const h = 80;
    const pad = 8;
    const min = 0;
    const max = 100;
    const coords = points.map((s, i) => {
      const x = pad + (i / (points.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (s.readinessScore - min) / (max - min)) * (h - pad * 2);
      return { x, y, session: s };
    });
    const line = coords.map((p) => `${p.x},${p.y}`).join(" ");
    return { w, h, coords, line };
  }, [points]);

  return (
    <section className="home-panel home-trend-panel">
      <div className="home-panel-head">
        <div>
          <h3 className="home-panel-title">Readiness trend</h3>
          <p className="home-panel-sub">Last {Math.max(points.length, 0)} sessions</p>
        </div>
        <button type="button" className="home-panel-link" onClick={onHistory}>History →</button>
      </div>
      {chart ? (
        <div className="home-trend-chart-wrap">
          <svg viewBox={`0 0 ${chart.w} ${chart.h}`} className="home-trend-chart" preserveAspectRatio="none">
            <polyline points={chart.line} fill="none" stroke="var(--green)" strokeWidth="2" />
            {chart.coords.map((p) => (
              <circle key={p.session.date} cx={p.x} cy={p.y} r="3" fill="var(--green)" />
            ))}
          </svg>
          <div className="home-trend-labels">
            {points.map((s) => (
              <span key={s.date}>{formatHistoryRowDate(s.date).replace(/, \d{4}$/, "")}</span>
            ))}
          </div>
        </div>
      ) : (
        <p className="home-panel-empty">Complete pre-market check-ins to see your trend.</p>
      )}
    </section>
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

  const timeCtx = getTimeContext();
  const greetingEyebrow = `${timeCtx} · ${formatGreetingDate()}`;
  const greetingHeadline = allComplete
    ? "You did the work today."
    : completedCount === 0
      ? "Start the day with intention."
      : "Keep going — finish today's workflow.";
  const greetingSub = allComplete
    ? "All required tasks logged. Optional: share your day."
    : `${completedCount} of 3 tasks complete.`;

  const preStreak = useMemo(() => countStreak(sessions, "pre"), [sessions]);
  const preTotal = sessions.filter((s) => isStepComplete(s.pre)).length;
  const planTotal = sessions.filter((s) => isStepComplete(s.plan)).length;
  const postTotal = sessions.filter((s) => isStepComplete(s.post)).length;
  const standDownTotal = sessions.filter(
    (s) => s.pre?.readinessScore != null && s.pre.readinessScore < 50
  ).length;

  const recent = sessions.slice(0, 7);

  const handleShare = async () => {
    const text = [
      `Libertrade · ${formatGreetingDate()}`,
      `Readiness ${today?.readinessScore ?? "—"}`,
      today?.netPnl != null ? `Net P&L ${formatUsd(today.netPnl, { signed: true })}` : "",
      "Pre-market · Plan · Post-market complete.",
    ].filter(Boolean).join("\n");
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* cancelled */
    }
  };

  if (loading) return <div className="pm-loading">Loading...</div>;

  return (
    <div className="home-dashboard">
      <div className="pm-topbar">
        <span>{formatHeaderDate()}</span>
        <span className="pm-live"><span className="pm-live-dot" />Live</span>
      </div>

      <div className="home-dashboard-inner">
        <header className="home-greeting">
          <div className="home-greeting-eyebrow">{greetingEyebrow}</div>
          <h1 className="home-greeting-title">{greetingHeadline}</h1>
          <p className="home-greeting-sub">{greetingSub}</p>
        </header>

        <div className="home-dashboard-grid">
          <div className="home-main-col">
            {allComplete ? (
              <section className="home-hero-card home-hero-card--complete">
                <div className="home-hero-badge">Today complete</div>
                <h2 className="home-hero-title">Great session.</h2>
                <p className="home-hero-sub">Process over outcomes.</p>
                {preStreak > 0 && (
                  <div className="home-streak-callout">
                    <span className="home-streak-num">{preStreak} days</span>
                    <span className="home-streak-text">Pre-market streak. Building the habit.</span>
                  </div>
                )}
                <div className="home-share-row">
                  <span>Share your day</span>
                  <button type="button" className="home-share-btn" onClick={handleShare}>Share day</button>
                </div>
              </section>
            ) : (
              <section className="home-hero-card home-hero-card--tasks">
                <div className="home-hero-badge home-hero-badge--progress">Today&apos;s workflow</div>
                <ul className="home-task-list">
                  {WORKFLOW_STEPS.map((step) => {
                    const complete = step.id === "premarket" ? preComplete : step.id === "dailyplan" ? planComplete : postComplete;
                    const score = step.id === "premarket" ? today?.readinessScore : null;
                    return (
                      <li key={step.id}>
                        <button type="button" className="home-task-row" onClick={() => onNavigate(step.id)}>
                          <span className={`home-task-check${complete ? " done" : ""}`} aria-hidden="true">
                            {complete ? "✓" : ""}
                          </span>
                          <span className="home-task-body">
                            <span className="home-task-label">{step.label}</span>
                            <span className="home-task-desc">{step.desc}</span>
                          </span>
                          <StepStatus complete={complete} score={score} />
                          <span className="home-task-arrow">→</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {allComplete && (
              <div className="home-edit-links">
                <button type="button" onClick={() => onNavigate("premarket")}>Edit pre-market check-in →</button>
                <button type="button" onClick={() => onNavigate("dailyplan")}>Edit plan →</button>
                <button type="button" onClick={() => onNavigate("postmarket")}>Edit post-market review →</button>
              </div>
            )}

            <ReadinessTrend sessions={sessions} onHistory={() => onNavigate("history")} />
          </div>

          <aside className="home-side-col">
            <section className="home-panel">
              <div className="home-panel-head">
                <h3 className="home-panel-title">Streaks</h3>
                <span className="home-panel-meta">{Math.min(preTotal, 3)} earned →</span>
              </div>
              <ul className="home-streak-list">
                <li>
                  <span className="home-streak-icon">◷</span>
                  <span className="home-streak-name">Pre-market</span>
                  <span className="home-streak-stat">{preTotal} total</span>
                  <span className="home-streak-next">{Math.max(0, 7 - preStreak)} to 7</span>
                </li>
                <li>
                  <span className="home-streak-icon">◷</span>
                  <span className="home-streak-name">Post-market</span>
                  <span className="home-streak-stat">{postTotal} total</span>
                  <span className="home-streak-next">{Math.max(0, 30 - postTotal)} to 30</span>
                </li>
                <li>
                  <span className="home-streak-icon">◷</span>
                  <span className="home-streak-name">Plan</span>
                  <span className="home-streak-stat">{planTotal} total</span>
                  <span className="home-streak-next">{Math.max(0, 30 - planTotal)} to 30</span>
                </li>
                <li>
                  <span className="home-streak-icon">⊘</span>
                  <span className="home-streak-name">Stand-downs</span>
                  <span className="home-streak-stat">{standDownTotal} total</span>
                </li>
              </ul>
            </section>

            <section className="home-panel">
              <div className="home-panel-head">
                <div>
                  <h3 className="home-panel-title">Recent</h3>
                  <p className="home-panel-sub">Last 7 entries</p>
                </div>
              </div>
              {recent.length === 0 ? (
                <p className="home-panel-empty">No sessions yet.</p>
              ) : (
                <ul className="home-recent-list">
                  {recent.map((s) => {
                    const pnlCls = s.netPnl > 0 ? "pos" : s.netPnl < 0 ? "neg" : "dim";
                    return (
                      <li key={s.date}>
                        <button
                          type="button"
                          className="home-recent-row"
                          onClick={() => onOpenHistoryDay(s.date)}
                        >
                          <span className="home-recent-date">{formatHistoryRowDate(s.date)}</span>
                          <StageDots
                            pre={isStepComplete(s.pre)}
                            plan={isStepComplete(s.plan)}
                            post={isStepComplete(s.post)}
                          />
                          <span className="home-recent-score">{s.readinessScore ?? "—"}</span>
                          <span className={`home-recent-pnl ${pnlCls}`}>
                            {s.netPnl != null ? formatUsd(s.netPnl, { signed: true }) : "—"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
