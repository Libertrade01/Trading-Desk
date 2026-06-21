"use client";

import AnalyticsStat from "./AnalyticsStat";

function fmtScore(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(1);
}

export default function ProcessOverviewPanel({ metrics }) {
  const hasProcess = metrics?.reviewDays > 0;

  if (!hasProcess) {
    return (
      <div className="analytics-empty">
        No post-market reviews or rule data in this range — complete Post-Market to track process here.
      </div>
    );
  }

  return (
    <div className="analytics-process-overview">
      {hasProcess ? (
        <>
          <div className="analytics-process-hero">
            <AnalyticsStat
              label="Risk plan followed"
              value={metrics.riskPlanPct != null ? `${metrics.riskPlanPct}%` : "—"}
              tone={
                metrics.riskPlanPct == null
                  ? "neutral"
                  : metrics.riskPlanPct >= 80
                    ? "positive"
                    : metrics.riskPlanPct >= 50
                      ? "neutral"
                      : "negative"
              }
              className="an-stat--hero"
              sub={`${metrics.reviewDays} review day${metrics.reviewDays === 1 ? "" : "s"}`}
            />
            {metrics.behavioralFlags > 0 ? (
              <div className="an-playbook-status" style={{ color: "var(--amber)" }}>
                {metrics.behavioralFlags} behavioral flag{metrics.behavioralFlags === 1 ? "" : "s"} raised
              </div>
            ) : (
              <div className="an-playbook-status" style={{ color: "var(--green)" }}>
                No behavioral flags in range
              </div>
            )}
          </div>
          <div className="analytics-stat-grid">
            <div className="analytics-mini-stat">
              <div className="analytics-mini-stat__label">Followed plan</div>
              <div className="analytics-mini-stat__value neutral">{fmtScore(metrics.avgFollowedPlan)}</div>
            </div>
            <div className="analytics-mini-stat">
              <div className="analytics-mini-stat__label">Setup quality</div>
              <div className="analytics-mini-stat__value neutral">{fmtScore(metrics.avgSetupQuality)}</div>
            </div>
            <div className="analytics-mini-stat">
              <div className="analytics-mini-stat__label">Risk discipline</div>
              <div className="analytics-mini-stat__value neutral">{fmtScore(metrics.avgRiskDiscipline)}</div>
            </div>
            <div className="analytics-mini-stat">
              <div className="analytics-mini-stat__label">Execution</div>
              <div className="analytics-mini-stat__value neutral">{fmtScore(metrics.avgExecutionQuality)}</div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
