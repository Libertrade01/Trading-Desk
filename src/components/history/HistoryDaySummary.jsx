"use client";

import { readinessScoreColor } from "../../lib/premarket-scoring";
import { formatUsd } from "../../lib/history-data";
import HistoryStagePipeline from "./HistoryStagePipeline";

function ScoreRing({ score, size = 88 }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const tone = readinessScoreColor(score);

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="history-score-ring">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={tone}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="48" textAnchor="middle" className="history-score-num" style={{ fill: tone }}>
        {score}
      </text>
      <text x="50" y="62" textAnchor="middle" className="history-score-denom">
        / 100
      </text>
    </svg>
  );
}

export default function HistoryDaySummary({ session }) {
  const pnlTone = session.netPnl > 0 ? "pos" : session.netPnl < 0 ? "neg" : "dim";
  const pre = session.pre;

  return (
    <div className="history-day-summary">
      <div className="history-day-summary__main">
        {session.readinessScore != null ? (
          <div className="history-day-summary__score">
            <ScoreRing score={session.readinessScore} />
            <div className={`history-pre-status history-pre-status--${session.readinessTone || "good"}`}>
              {session.readinessLabel}
            </div>
          </div>
        ) : (
          <div className="history-day-summary__score history-day-summary__score--empty">
            <span className="history-day-summary__no-score">No check-in</span>
          </div>
        )}

        <div className="history-day-summary__metrics">
          <div className="history-day-summary__pnl">
            <span className="history-day-summary__label">Net P&amp;L</span>
            <span className={`history-day-summary__pnl-value ${pnlTone}`}>
              {session.netPnl != null ? formatUsd(session.netPnl, { signed: true }) : "—"}
            </span>
          </div>
          <div className="history-day-summary__stages">
            <span className="history-day-summary__label">Workflow</span>
            <HistoryStagePipeline session={session} />
          </div>
        </div>
      </div>

      {(pre?.standDownAcknowledged || pre?.sleepDebtStandDownRequired) && (
        <div className="history-day-summary__alerts">
          {pre.standDownAcknowledged && (
            <span className="history-day-summary__alert">Stand-down acknowledged</span>
          )}
          {pre.sleepDebtStandDownRequired && (
            <span className="history-day-summary__alert history-day-summary__alert--severe">
              Sleep debt stand-down
            </span>
          )}
        </div>
      )}
    </div>
  );
}
