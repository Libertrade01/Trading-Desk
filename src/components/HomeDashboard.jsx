"use client";

import { useState, useEffect, useMemo } from "react";
import {
  loadSessionDay,
  loadAllSessions,
  todayKey,
  isStepComplete,
  formatTimeEyebrow,
  formatHeaderDate,
  formatHistoryRowDate,
  formatUsd,
  isWeekend,
  getMarketStatus,
} from "../lib/history-data";

const WORKFLOW_STEPS = [
  { id: "premarket", label: "Pre-Market" },
  { id: "dailyplan", label: "Daily Plan" },
  { id: "postmarket", label: "Post-Market" },
];

function TaskPill({ complete }) {
  return (
    <span className={`home-task-pill${complete ? " done" : " open"}`}>
      {complete ? "Done" : "Open"}
    </span>
  );
}

function buildProgressSubline(preComplete, planComplete, postComplete) {
  const done = [];
  const open = [];
  if (preComplete) done.push("Pre-market");
  else open.push("Pre-market");
  if (planComplete) done.push("Plan");
  else open.push("Plan");
  if (postComplete) done.push("Review");
  else open.push("Review");

  const parts = [];
  if (done.length) parts.push(`${done.join(", ")} done`);
  if (open.length) parts.push(`${open.join(" and ")} still open`);
  return parts.join(" · ");
}

function RecentStepPills({ pre, plan, post }) {
  return (
    <span className="home-recent-pills">
      <span className={`home-recent-pill${pre ? " done" : ""}`}>Pre</span>
      <span className={`home-recent-pill${plan ? " done" : ""}`}>Plan</span>
      <span className={`home-recent-pill${post ? " done" : ""}`}>Rev</span>
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

  const lastPoint = points[points.length - 1];

  const chart = useMemo(() => {
    if (points.length === 0) return null;
    const w = 280;
    const h = 80;
    const pad = 8;
    const coords = points.map((s, i) => {
      const x =
        points.length === 1
          ? w / 2
          : pad + (i / (points.length - 1)) * (w - pad * 2);
      const y = pad + (1 - s.readinessScore / 100) * (h - pad * 2);
      return { x, y, session: s };
    });
    const line = points.length >= 2 ? coords.map((p) => `${p.x},${p.y}`).join(" ") : null;
    return { w, h, coords, line };
  }, [points]);

  const subline =
    points.length === 0
      ? "No scored sessions yet"
      : points.length < 3
        ? `Last score · ${lastPoint.readinessScore}`
        : `Last ${points.length} sessions`;

  return (
    <section className="home-panel home-trend-panel">
      <div className="home-panel-head">
        <div>
          <h3 className="home-panel-title">Readiness trend</h3>
          <p className="home-panel-sub">{subline}</p>
        </div>
        <button type="button" className="home-panel-link" onClick={onHistory}>History →</button>
      </div>
      {points.length === 0 ? (
        <p className="home-panel-empty">Complete pre-market check-ins to see your trend.</p>
      ) : points.length < 3 ? (
        <div className="home-trend-compact">
          <div className="home-trend-hero-score">{lastPoint.readinessScore}</div>
          <div className="home-trend-compact-meta">
            <span>{formatHistoryRowDate(lastPoint.date).replace(/, \d{4}$/, "")}</span>
            {points.length === 2 && (
              <span className="home-trend-compact-note">Add one more session for a trend line.</span>
            )}
          </div>
        </div>
      ) : (
        <div className="home-trend-chart-wrap">
          <svg viewBox={`0 0 ${chart.w} ${chart.h}`} className="home-trend-chart" preserveAspectRatio="none">
            {chart.line && (
              <polyline points={chart.line} fill="none" stroke="var(--green)" strokeWidth="2" />
            )}
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

function stepComplete(stepId, preComplete, planComplete, postComplete) {
  if (stepId === "premarket") return preComplete;
  if (stepId === "dailyplan") return planComplete;
  return postComplete;
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

  const nextStep = useMemo(() => {
    if (allComplete) return null;
    return WORKFLOW_STEPS.find(
      (s) => !stepComplete(s.id, preComplete, planComplete, postComplete)
    );
  }, [allComplete, preComplete, planComplete, postComplete]);

  const greetingEyebrow = formatTimeEyebrow();
  const greetingHeadline = allComplete
    ? "You did the work today."
    : completedCount === 0
      ? weekend
        ? "No session today."
        : "Today's workflow"
      : `${completedCount} of 3 complete`;
  const greetingSub = allComplete
    ? "All required tasks logged."
    : completedCount === 0
      ? weekend
        ? "Review recent sessions or prep for the week ahead."
        : null
      : buildProgressSubline(preComplete, planComplete, postComplete);

  const greetingTitleClass = allComplete
    ? " home-greeting-title--complete"
    : completedCount > 0
      ? " home-greeting-title--progress"
      : weekend
        ? ""
        : " home-greeting-title--progress";

  const pnlTone = today?.netPnl > 0 ? "positive" : today?.netPnl < 0 ? "negative" : "neutral";

  const preStreak = useMemo(() => countStreak(sessions, "pre"), [sessions]);
  const preTotal = sessions.filter((s) => isStepComplete(s.pre)).length;
  const planTotal = sessions.filter((s) => isStepComplete(s.plan)).length;
  const postTotal = sessions.filter((s) => isStepComplete(s.post)).length;
  const standDownTotal = sessions.filter(
    (s) => s.pre?.readinessScore != null && s.pre.readinessScore < 50
  ).length;

  const dashStats = useMemo(() => {
    const items = [];

    if (!allComplete && nextStep) {
      items.push({
        key: "next",
        label: "Next step",
        value: nextStep.label,
        clickable: true,
        onClick: () => onNavigate(nextStep.id),
      });
    }

    if (preComplete || allComplete) {
      items.push({
        key: "readiness",
        label: "Readiness",
        value:
          today?.readinessScore != null
            ? String(today.readinessScore)
            : preComplete
              ? "Logged"
              : "Not logged",
        tone: today?.readinessScore != null ? "positive" : "muted",
      });
    }

    if (postComplete || today?.netPnl != null || allComplete) {
      items.push({
        key: "pnl",
        label: "Net P&L today",
        value:
          today?.netPnl != null
            ? formatUsd(today.netPnl, { signed: true })
            : "No trades today",
        tone: today?.netPnl != null ? pnlTone : "muted",
      });
    }

    if (preStreak > 0 && (completedCount === 0 || allComplete)) {
      items.push({
        key: "streak",
        label: "Pre-market streak",
        value: `${preStreak} days`,
        tone: "neutral",
      });
    }

    return items;
  }, [
    allComplete,
    nextStep,
    preComplete,
    postComplete,
    today,
    pnlTone,
    preStreak,
    completedCount,
    onNavigate,
  ]);

  const recent = sessions.slice(0, 7);

  const handleShare = async () => {
    const text = [
      `Libertrade · ${formatHeaderDate()}`,
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
        <span className={`pm-live${marketStatus.live ? "" : " pm-live--off"}`}>
          <span className={`pm-live-dot${marketStatus.live ? "" : " pm-live-dot--off"}`} />
          {marketStatus.label}
        </span>
      </div>

      <div className="home-dashboard-inner">
        <header className="home-greeting">
          <div className="home-greeting-eyebrow">{greetingEyebrow}</div>
          <h1 className={`home-greeting-title${greetingTitleClass}`}>{greetingHeadline}</h1>
          {greetingSub && <p className="home-greeting-sub">{greetingSub}</p>}
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
              <section className="home-workflow-section">
                <div className="home-hero-card home-hero-card--tasks">
                  <ul className="home-task-list">
                    {WORKFLOW_STEPS.map((step) => {
                      const complete = stepComplete(step.id, preComplete, planComplete, postComplete);
                      const isNext = nextStep?.id === step.id;
                      const score = step.id === "premarket" && complete ? today?.readinessScore : null;
                      return (
                        <li key={step.id}>
                          <button
                            type="button"
                            className={`home-task-row${isNext ? " home-task-row--next" : ""}`}
                            onClick={() => onNavigate(step.id)}
                          >
                            <TaskPill complete={complete} />
                            <span className="home-task-label">{step.label}</span>
                            <span className="home-task-score">{score != null ? score : ""}</span>
                            <span className="home-task-chevron" aria-hidden="true">›</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            )}

            {dashStats.length > 0 && (
              <div className="home-dash-row">
                {dashStats.map((stat) => (
                  <div
                    key={stat.key}
                    className={`home-dash-stat${stat.clickable ? " home-dash-stat--clickable" : ""}`}
                    onClick={stat.clickable ? stat.onClick : undefined}
                    onKeyDown={
                      stat.clickable
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") stat.onClick();
                          }
                        : undefined
                    }
                    role={stat.clickable ? "button" : undefined}
                    tabIndex={stat.clickable ? 0 : undefined}
                  >
                    <div className="home-dash-stat-label">{stat.label}</div>
                    <div className={`home-dash-stat-value ${stat.tone || "neutral"}`}>{stat.value}</div>
                  </div>
                ))}
              </div>
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
                <span className="home-panel-meta">Milestone progress</span>
              </div>
              <ul className="home-streak-list">
                <li>
                  <span className="home-streak-name">Pre-market</span>
                  <span className="home-streak-stat">{preStreak} / 7 days</span>
                  <div className="home-streak-bar">
                    <div className="home-streak-bar-fill" style={{ width: `${Math.min(100, (preStreak / 7) * 100)}%` }} />
                  </div>
                </li>
                <li>
                  <span className="home-streak-name">Post-market</span>
                  <span className="home-streak-stat">{postTotal} / 30 days</span>
                  <div className="home-streak-bar">
                    <div className="home-streak-bar-fill" style={{ width: `${Math.min(100, (postTotal / 30) * 100)}%` }} />
                  </div>
                </li>
                <li>
                  <span className="home-streak-name">Plan</span>
                  <span className="home-streak-stat">{planTotal} / 30 days</span>
                  <div className="home-streak-bar">
                    <div className="home-streak-bar-fill" style={{ width: `${Math.min(100, (planTotal / 30) * 100)}%` }} />
                  </div>
                </li>
                <li className="home-streak-list-item--muted">
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
              <p className="home-recent-legend">Pre · Plan · Rev = workflow steps completed</p>
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
                          <RecentStepPills
                            pre={isStepComplete(s.pre)}
                            plan={isStepComplete(s.plan)}
                            post={isStepComplete(s.post)}
                          />
                          <span className="home-recent-score">
                            {s.readinessScore ?? "—"}
                          </span>
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
