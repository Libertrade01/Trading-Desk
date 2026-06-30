"use client";

import { useState, useEffect } from "react";
import { loadAllSessions, formatHistoryRowDate, formatUsd } from "../lib/history-data";
import {
  loadRecoveryState,
  buildRecoveryDayAnnotations,
  getRecoveryDayLabel,
} from "../lib/dll-recovery";
import { loadDllSettings } from "../lib/dll-recovery-settings";
import HistoryStagePipeline from "./history/HistoryStagePipeline";

function headerDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();
}

export default function HistoryPage({ onSelectDay }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [rows, recoveryState, settings] = await Promise.all([
        loadAllSessions(),
        loadRecoveryState(),
        loadDllSettings(),
      ]);
      const annotations = buildRecoveryDayAnnotations(recoveryState.days, settings);
      setSessions(
        rows.map((session) => ({
          ...session,
          recoveryLabel: getRecoveryDayLabel(annotations[session.date]),
        }))
      );
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="pm-loading">Loading...</div>;

  const completeCount = sessions.filter((s) => s.hasPre && s.hasPlan && s.hasPost).length;

  return (
    <div className="history-page hybrid-page">
      <div className="pm-topbar">
        <span>{headerDate()}</span>
      </div>

      <div className="history-content">
        <div className="history-eyebrow hybrid-eyebrow">
          {sessions.length} session{sessions.length === 1 ? "" : "s"}
          {sessions.length > 0 && completeCount > 0 ? ` · ${completeCount} full loop` : ""}
        </div>
        <h1 className="history-title hybrid-title">History</h1>
        <p className="history-subtitle">Walk back through your sessions. Pattern recognition compounds.</p>

        {sessions.length === 0 ? (
          <div className="history-empty">
            No sessions logged yet. Complete Check-in, Session Plan, or Close out to build your history.
          </div>
        ) : (
          <div className="history-list">
            {sessions.map((session) => {
              const pnlTone = session.netPnl > 0 ? "pos" : session.netPnl < 0 ? "neg" : "dim";
              const readinessTone = session.readinessTone || "good";

              return (
                <button
                  key={session.date}
                  type="button"
                  className="history-row"
                  onClick={() => onSelectDay(session.date)}
                >
                  <div className="history-row__primary">
                    <span className="history-row-date">{formatHistoryRowDate(session.date)}</span>
                    {session.recoveryLabel && (
                      <span className="history-row-recovery-badge">{session.recoveryLabel}</span>
                    )}
                    <HistoryStagePipeline session={session} compact />
                  </div>

                  <div className="history-row__metrics">
                    {session.readinessScore != null ? (
                      <div className={`history-row-chip history-row-chip--${readinessTone}`}>
                        <span className="history-row-chip__label">Readiness</span>
                        <span className="history-row-chip__value">{session.readinessScore}</span>
                      </div>
                    ) : (
                      <div className="history-row-chip history-row-chip--muted">
                        <span className="history-row-chip__label">Readiness</span>
                        <span className="history-row-chip__value">—</span>
                      </div>
                    )}

                    <div className={`history-row-chip history-row-chip--pnl ${pnlTone}`}>
                      <span className="history-row-chip__label">P&amp;L</span>
                      <span className="history-row-chip__value">
                        {session.netPnl != null ? formatUsd(session.netPnl, { signed: true }) : "—"}
                      </span>
                    </div>
                  </div>

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
