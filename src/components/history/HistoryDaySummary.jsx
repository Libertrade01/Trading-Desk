"use client";

import { formatUsd } from "../../lib/history-data";
import HistoryStagePipeline from "./HistoryStagePipeline";

export default function HistoryDaySummary({ session, recoveryLabel }) {
  const pnlTone = session.netPnl > 0 ? "pos" : session.netPnl < 0 ? "neg" : "dim";
  const pre = session.pre;
  const post = session.post;
  const readinessTone = session.readinessTone || "good";
  const wins = post?.wins ?? null;
  const losses = post?.losses ?? null;

  return (
    <div className="history-detail-hero">
      <div className="history-detail-hero__kpis">
        <div className="history-detail-kpi">
          <span className="history-detail-kpi__label">Readiness</span>
          <span className={`history-detail-kpi__value history-detail-kpi__value--${readinessTone}`}>
            {session.readinessScore != null ? session.readinessScore : "-"}
          </span>
        </div>

        <div className="history-detail-kpi">
          <span className="history-detail-kpi__label">Net P&amp;L</span>
          <span className={`history-detail-kpi__value history-detail-kpi__value--${pnlTone}`}>
            {session.netPnl != null ? formatUsd(session.netPnl, { signed: true }) : "-"}
          </span>
        </div>

        <div className="history-detail-kpi">
          <span className="history-detail-kpi__label">Trades</span>
          <span className="history-detail-kpi__value">
            {post?.trades != null ? post.trades : "-"}
          </span>
          {wins != null && losses != null && (
            <span className="history-detail-kpi__sub">
              <span className="pos">{wins}W</span>
              <span className="history-detail-kpi__sep">/</span>
              <span className="neg">{losses}L</span>
            </span>
          )}
        </div>

        <div className="history-detail-kpi history-detail-kpi--workflow">
          <span className="history-detail-kpi__label">Workflow</span>
          <HistoryStagePipeline session={session} />
        </div>
      </div>

      {(pre?.standDownAcknowledged || pre?.sleepDebtStandDownRequired || recoveryLabel) && (
        <div className="history-detail-hero__alerts">
          {recoveryLabel && (
            <span className="history-detail-hero__alert history-detail-hero__alert--recovery">
              {recoveryLabel}
            </span>
          )}
          {pre?.standDownAcknowledged && (
            <span className="history-detail-hero__alert">Protective day acknowledged</span>
          )}
          {pre?.sleepDebtStandDownRequired && (
            <span className="history-detail-hero__alert history-detail-hero__alert--severe">
              Recovery day
            </span>
          )}
        </div>
      )}
    </div>
  );
}
