"use client";

import { formatUsd } from "../../lib/history-data";
import HistoryStagePipeline from "./HistoryStagePipeline";

export default function HistoryDaySummary({ session, recoveryLabel }) {
  const pnlTone = session.netPnl > 0 ? "pos" : session.netPnl < 0 ? "neg" : "dim";
  const pre = session.pre;
  const readinessTone = session.readinessTone || "good";

  return (
    <div className="history-day-summary">
      <div className="history-day-summary__main">
        <div className="history-day-summary__score">
          <span className={`history-split-row__ready history-split-row__ready--${readinessTone}`}>
            {session.readinessScore != null ? session.readinessScore : "—"}
          </span>
        </div>

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

      {(pre?.standDownAcknowledged || pre?.sleepDebtStandDownRequired || recoveryLabel) && (
        <div className="history-day-summary__alerts">
          {recoveryLabel && (
            <span className="history-day-summary__alert history-day-summary__alert--recovery">
              {recoveryLabel}
            </span>
          )}
          {pre?.standDownAcknowledged && (
            <span className="history-day-summary__alert">Protective day acknowledged</span>
          )}
          {pre?.sleepDebtStandDownRequired && (
            <span className="history-day-summary__alert history-day-summary__alert--severe">
              Recovery day
            </span>
          )}
        </div>
      )}
    </div>
  );
}
