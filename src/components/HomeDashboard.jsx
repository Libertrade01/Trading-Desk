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
import HomeEventBanner from "./HomeEventBanner";

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

function buildProgressSubline(preComplete, planComplete, postComplete, eyebrow) {
  const done = [preComplete, planComplete, postComplete].filter(Boolean).length;
  const parts = [`${done}/3 tasks`];
  if (eyebrow) parts.push(eyebrow.toLowerCase());
  return parts.join(" · ");
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
    const h = 48;
    const pad = 6;
    const coords = points.map((s, i) => {
      const x =
        points.length === 1
          ? w / 2
          : pad + (i / (points.length - 1)) * (w - pad * 2);
      const y = pad + (1 - s.readinessScore / 100) * (h - pad * 2);
      return { x, y, session: s };
    });
    const line = points.length >= 2 ? coords.map((p) => `${p.x},${p.y}`).join(" ") : null;
    const gridLines = [0.25, 0.5, 0.75].map((pct) => pad + pct * (h - pad * 2));
    return { w, h, coords, line, gridLines, pad };
  }, [points]);

  const subline =
    points.length === 0
      ? "No scored sessions"
      : points.length < 3
        ? `Last · ${lastPoint.readinessScore}`
        : `${points.length} sessions`;

  return (
    <section className="home-terminal-box home-trend-panel">
      <div className="home-panel-head">
        <div>
          <h3 className="home-panel-title">Readiness / {points.length || 0} sessions</h3>
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
              <span className="home-trend-compact-note">One more for trend line.</span>
            )}
          </div>
        </div>
      ) : (
        <div className="home-trend-chart-wrap home-trend-chart-wrap--terminal">
          <svg viewBox={`0 0 ${chart.w} ${chart.h}`} className="home-trend-chart" preserveAspectRatio="none">
            {chart.gridLines.map((y, i) => (
              <line
                key={i}
                x1={chart.pad}
                y1={y}
                x2={chart.w - chart.pad}
                y2={y}
                stroke="var(--border)"
                strokeWidth="1"
              />
            ))}
            {chart.line && (
              <polyline points={chart.line} fill="none" stroke="var(--green)" strokeWidth="2" />
            )}
          </svg>
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

function formatTerminalPnl(value) {
  if (value == null) return "—";
  const abs = Math.abs(Math.round(value));
  const sign = value < 0 ? "−" : value > 0 ? "+" : "";
  return `${sign}${abs}`;
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
    ? "TODAY_COMPLETE"
    : completedCount === 0
      ? weekend
        ? "NO_SESSION"
        : "TODAY_WORKFLOW"
      : `${completedCount}/3 COMPLETE`;
  const greetingSub = allComplete
    ? buildProgressSubline(preComplete, planComplete, postComplete, greetingEyebrow)
    : completedCount === 0
      ? weekend
        ? "Review recent sessions or prep for the week ahead."
        : `${completedCount}/3 tasks · ${greetingEyebrow.toLowerCase()}`
      : buildProgressSubline(preComplete, planComplete, postComplete, greetingEyebrow);

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
              : "—",
        tone: today?.readinessScore != null ? "positive" : "muted",
      });
    }

    if (postComplete || today?.netPnl != null || allComplete) {
      items.push({
        key: "pnl",
        label: "Net P&L",
        value:
          today?.netPnl != null
            ? formatTerminalPnl(today.netPnl)
            : "No trades",
        tone: today?.netPnl != null ? pnlTone : "muted",
      });
    }

    if (preStreak > 0 && (completedCount === 0 || allComplete)) {
      items.push({
        key: "streak",
        label: "Streak",
        value: `${preStreak}d`,
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

  const recent = sessions.slice(0, 5);

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
    <div className="home-dashboard home-dashboard--terminal">
      <div className="pm-topbar">
        <span>{formatHeaderDate()}</span>
        <span className={`pm-live${marketStatus.live ? "" : " pm-live--off"}`}>
          <span className={`pm-live-dot${marketStatus.live ? "" : " pm-live-dot--off"}`} />
          {marketStatus.label}
        </span>
      </div>

      <div className="home-dashboard-inner">
        <header className="home-terminal-head">
          <div>
            <h1 className="home-terminal-title">{greetingHeadline}</h1>
            {greetingSub && <p className="home-terminal-sub">{greetingSub}</p>}
          </div>
        </header>

        <HomeEventBanner />

        <div className="home-dashboard-grid">
          <div className="home-main-col">
            {!allComplete && (
              <section className="home-terminal-box home-workflow-section">
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
              </section>
            )}

            {dashStats.length > 0 && (
              <div className="home-stat-grid">
                {dashStats.map((stat) => (
                  <div
                    key={stat.key}
                    className={`home-stat-cell${stat.clickable ? " home-stat-cell--clickable" : ""}`}
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
                    <div className="home-stat-cell-label">{stat.label}</div>
                    <div className={`home-stat-cell-value ${stat.tone || "neutral"}`}>{stat.value}</div>
                  </div>
                ))}
              </div>
            )}

            {allComplete && (
              <>
                <div className="home-status-bar">
                  <span className="home-status-bar-key">STATUS</span>
                  <span className="home-status-bar-sep">·</span>
                  <span>Process over outcomes</span>
                  <span className="home-status-bar-sep">·</span>
                  <button type="button" className="home-status-bar-action" onClick={handleShare}>
                    Share available
                  </button>
                </div>
                <div className="home-edit-footer">
                  <button type="button" onClick={() => onNavigate("premarket")}>Edit pre-market</button>
                  <span className="home-edit-footer-sep">·</span>
                  <button type="button" onClick={() => onNavigate("dailyplan")}>Edit plan</button>
                  <span className="home-edit-footer-sep">·</span>
                  <button type="button" onClick={() => onNavigate("postmarket")}>Edit review</button>
                </div>
              </>
            )}

            <ReadinessTrend sessions={sessions} onHistory={() => onNavigate("history")} />
          </div>

          <aside className="home-side-col">
            <section className="home-terminal-box home-habits-panel">
              <h3 className="home-panel-title">Habits</h3>
              <div className="home-habit-row">
                <span className="home-habit-label">Pre {preStreak}/7</span>
                <div className="home-habit-bar">
                  <div className="home-habit-bar-fill" style={{ width: `${Math.min(100, (preStreak / 7) * 100)}%` }} />
                </div>
              </div>
              <div className="home-habit-row">
                <span className="home-habit-label">Plan {planTotal}/30</span>
                <div className="home-habit-bar">
                  <div className="home-habit-bar-fill" style={{ width: `${Math.min(100, (planTotal / 30) * 100)}%` }} />
                </div>
              </div>
              <div className="home-habit-row">
                <span className="home-habit-label">Post {postTotal}/30</span>
                <div className="home-habit-bar">
                  <div className="home-habit-bar-fill" style={{ width: `${Math.min(100, (postTotal / 30) * 100)}%` }} />
                </div>
              </div>
              {standDownTotal > 0 && (
                <div className="home-habit-meta">Stand-downs · {standDownTotal} total</div>
              )}

              <div className="home-habit-recent">
                {recent.length === 0 ? (
                  <p className="home-panel-empty">No sessions yet.</p>
                ) : (
                  <ul className="home-habit-recent-list">
                    {recent.map((s) => {
                      const pnlCls = s.netPnl > 0 ? "pos" : s.netPnl < 0 ? "neg" : "dim";
                      const shortDate = formatHistoryRowDate(s.date).replace(/, \d{4}$/, "");
                      return (
                        <li key={s.date}>
                          <button
                            type="button"
                            className="home-habit-recent-row"
                            onClick={() => onOpenHistoryDay(s.date)}
                          >
                            <span>{shortDate}</span>
                            <strong>{s.readinessScore ?? "—"}</strong>
                            <span className={`home-habit-recent-pnl ${pnlCls}`}>
                              {s.netPnl != null ? formatTerminalPnl(s.netPnl) : "—"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
