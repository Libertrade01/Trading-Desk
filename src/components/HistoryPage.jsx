"use client";

import { useState, useEffect } from "react";
import { loadAllSessions, formatHistoryRowDate, formatUsd } from "../lib/history-data";

function headerDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();
}

function StageTag({ label, active }) {
  return (
    <span className={`history-stage-tag${active ? " active" : ""}`}>{label}</span>
  );
}

export default function HistoryPage({ onSelectDay }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const rows = await loadAllSessions();
      setSessions(rows);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="pm-loading">Loading...</div>;

  return (
    <div className="history-page hybrid-page">
      <div className="pm-topbar">
        <span>{headerDate()}</span>
        <span className="pm-live"><span className="pm-live-dot" />Live</span>
      </div>

      <div className="history-content">
        <div className="history-eyebrow hybrid-eyebrow">
          {sessions.length} session{sessions.length === 1 ? "" : "s"} logged
        </div>
        <h1 className="history-title hybrid-title">History</h1>
        <p className="history-subtitle">Walk back through your sessions. Pattern recognition compounds.</p>

        {sessions.length === 0 ? (
          <div className="history-empty">No sessions logged yet. Complete Pre-Market, Daily Plan, or Post-Market to build your history.</div>
        ) : (
          <div className="history-list">
            {sessions.map((session) => {
              const pnlTone = session.netPnl > 0 ? "pos" : session.netPnl < 0 ? "neg" : "dim";
              return (
                <button
                  key={session.date}
                  type="button"
                  className="history-row"
                  onClick={() => onSelectDay(session.date)}
                >
                  <span className="history-row-dot" />
                  <span className="history-row-date">{formatHistoryRowDate(session.date)}</span>
                  <span className="history-row-readiness">
                    <span className="history-row-label hybrid-label-sm">Readiness</span>
                    <span className="history-row-value">
                      {session.readinessScore != null ? (
                        <>
                          <strong>{session.readinessScore}</strong>
                          {" "}
                          {session.readinessLabel}
                        </>
                      ) : "—"}
                    </span>
                  </span>
                  <span className="history-row-pnl">
                    <span className="history-row-label hybrid-label-sm">P&amp;L</span>
                    <span className={`history-row-value ${pnlTone}`}>
                      {session.netPnl != null ? formatUsd(session.netPnl, { signed: true }) : "—"}
                    </span>
                  </span>
                  <span className="history-row-stages">
                    <StageTag label="Pre" active={session.hasPre} />
                    <StageTag label="Plan" active={session.hasPlan} />
                    <StageTag label="Post" active={session.hasPost} />
                  </span>
                  <span className="history-row-arrow" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M5 11l6-5-6-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
