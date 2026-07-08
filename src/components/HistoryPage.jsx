"use client";

import { useState, useEffect, useMemo } from "react";
import { loadAllSessions, formatUsd } from "../lib/history-data";
import {
  loadRecoveryState,
  buildRecoveryDayAnnotations,
  getRecoveryDayLabel,
} from "../lib/dll-recovery";
import { loadDllSettings } from "../lib/dll-recovery-settings";
import HistoryStagePipeline from "./history/HistoryStagePipeline";
import HistoryJournalIndicators from "./history/HistoryJournalIndicators";
import HistoryCalendar, {
  getWeekStartMonday,
  sessionsInWeek,
  formatWeekListHead,
  formatListRowDate,
} from "./history/HistoryCalendar";

function headerDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function parseViewMonth(dateKey) {
  const d = new Date(`${dateKey}T12:00:00`);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export default function HistoryPage({ onSelectDay }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [rows, recoveryState, settings] = await Promise.all([
          loadAllSessions(),
          loadRecoveryState(),
          loadDllSettings(),
        ]);
        if (cancelled) return;
        const annotations = buildRecoveryDayAnnotations(recoveryState.days, settings);
        const enriched = rows.map((session) => ({
          ...session,
          recoveryLabel: getRecoveryDayLabel(annotations[session.date]),
        }));
        setSessions(enriched);
        if (enriched.length > 0) {
          const anchor = enriched[0].date;
          setSelectedDate(anchor);
          setViewMonth(parseViewMonth(anchor));
        }
      } catch (err) {
        console.error("HistoryPage load:", err);
        if (!cancelled) setSessions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const sessionsByDate = useMemo(
    () => new Map(sessions.map((session) => [session.date, session])),
    [sessions]
  );

  const weekStart = selectedDate ? getWeekStartMonday(selectedDate) : null;
  const filteredSessions = useMemo(
    () => (weekStart ? sessionsInWeek(sessions, weekStart) : sessions),
    [sessions, weekStart]
  );

  const handleSelectDate = (dateKey) => {
    setSelectedDate(dateKey);
    const next = parseViewMonth(dateKey);
    setViewMonth((prev) =>
      prev.year === next.year && prev.month === next.month ? prev : next
    );
  };

  const handlePrevMonth = () => {
    setViewMonth((prev) => {
      const d = new Date(prev.year, prev.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const handleNextMonth = () => {
    setViewMonth((prev) => {
      const d = new Date(prev.year, prev.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  if (loading) return <div className="pm-loading workflow-page--loop">Loading...</div>;

  return (
    <div className="history-page history-page--split hybrid-page workflow-page--loop">
      <div className="workflow-page-inner">
        <div className="pm-topbar">
          <span>{headerDate()}</span>
        </div>

        <div className="history-content history-content--split">
          <header className="pm-header">
            <h1 className="hybrid-page-title">
              Past Sessions
              <span className="hybrid-page-title-stop" aria-hidden="true" />
            </h1>
            <p className="pm-subtitle">Past sessions by date. Select any day to open the full record.</p>
          </header>

        {sessions.length === 0 ? (
          <div className="history-empty">
            No sessions logged yet. Complete Check-in, Session Plan, or Close loop to build your history.
          </div>
        ) : (
          <div className="history-split">
            <HistoryCalendar
              viewYear={viewMonth.year}
              viewMonth={viewMonth.month}
              sessionsByDate={sessionsByDate}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
            />

            <div className="history-split-list">
              <div className="history-split-list__head">
                {weekStart
                  ? formatWeekListHead(weekStart, filteredSessions.length)
                  : `${filteredSessions.length} session${filteredSessions.length === 1 ? "" : "s"}`}
              </div>

              {filteredSessions.length === 0 ? (
                <div className="history-split-list__empty">No sessions this week.</div>
              ) : (
                <div className="history-split-rows">
                  {filteredSessions.map((session) => {
                    const pnlTone = session.netPnl > 0 ? "pos" : session.netPnl < 0 ? "neg" : "dim";
                    const readinessTone = session.readinessTone || "good";

                    return (
                      <button
                        key={session.date}
                        type="button"
                        className="history-split-row"
                        onClick={() => onSelectDay(session.date)}
                      >
                        <div className="history-split-row__primary">
                          <span className="history-split-row__date">{formatListRowDate(session.date)}</span>
                          {session.recoveryLabel && (
                            <span className="history-row-recovery-badge">{session.recoveryLabel}</span>
                          )}
                          <HistoryJournalIndicators session={session} />
                        </div>

                        <div className="history-split-row__metrics">
                          <HistoryStagePipeline session={session} compact />
                          <span className={`history-split-row__ready history-split-row__ready--${readinessTone}`}>
                            {session.readinessScore != null ? session.readinessScore : "—"}
                          </span>
                          <span className={`history-split-row__pnl ${pnlTone}`}>
                            {session.netPnl != null ? formatUsd(session.netPnl, { signed: true }) : "—"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
