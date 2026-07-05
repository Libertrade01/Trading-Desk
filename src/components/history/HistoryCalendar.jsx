"use client";

import { useMemo } from "react";
import { offsetDateKey } from "../../lib/today-key";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`);
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getWeekStartMonday(dateKey) {
  const d = parseDateKey(dateKey);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateKey(d);
}

function pnlTone(netPnl) {
  if (netPnl == null) return null;
  if (netPnl > 0) return "pos";
  if (netPnl < 0) return "neg";
  return "flat";
}

export default function HistoryCalendar({
  viewYear,
  viewMonth,
  sessionsByDate,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}) {
  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const grid = [];

    for (let i = 0; i < startPad; i++) {
      grid.push({ type: "empty", key: `pad-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const session = sessionsByDate.get(dateKey);
      grid.push({
        type: "day",
        key: dateKey,
        dateKey,
        day,
        session,
        tone: session ? pnlTone(session.netPnl) : null,
        selected: dateKey === selectedDate,
      });
    }

    return grid;
  }, [viewYear, viewMonth, sessionsByDate, selectedDate]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <aside className="history-cal">
      <div className="history-cal__head">
        <span className="history-cal__title">{monthLabel}</span>
        <div className="history-cal__nav">
          <button type="button" className="history-cal__nav-btn" onClick={onPrevMonth} aria-label="Previous month">
            ‹
          </button>
          <button type="button" className="history-cal__nav-btn" onClick={onNextMonth} aria-label="Next month">
            ›
          </button>
        </div>
      </div>

      <div className="history-cal__grid">
        {WEEKDAYS.map((wd, i) => (
          <span key={`wd-${i}`} className="history-cal__wd">
            {wd}
          </span>
        ))}
        {cells.map((cell) => {
          if (cell.type === "empty") {
            return <span key={cell.key} className="history-cal__day history-cal__day--empty" aria-hidden="true" />;
          }

          const classes = ["history-cal__day"];
          if (cell.session) classes.push("has");
          if (cell.tone === "pos") classes.push("pos");
          if (cell.tone === "neg") classes.push("neg");
          if (cell.selected) classes.push("sel");

          return (
            <button
              key={cell.key}
              type="button"
              className={classes.join(" ")}
              onClick={() => onSelectDate(cell.dateKey)}
              aria-label={
                cell.session
                  ? `${cell.day}, session ${cell.tone === "pos" ? "win" : cell.tone === "neg" ? "loss" : "logged"}`
                  : `${cell.day}`
              }
              aria-pressed={cell.selected}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <p className="history-cal__legend" aria-label="Win day, loss day">
        <span className="history-cal__legend-dot pos" aria-hidden="true" />
        <span className="history-cal__legend-dot neg" aria-hidden="true" />
      </p>
    </aside>
  );
}

export function formatWeekListHead(weekStart, sessionCount) {
  const label = parseDateKey(weekStart).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `Week of ${label} · ${sessionCount} session${sessionCount === 1 ? "" : "s"}`;
}

export function sessionsInWeek(sessions, weekStart) {
  const weekEnd = offsetDateKey(weekStart, 6);
  return sessions
    .filter((s) => s.date >= weekStart && s.date <= weekEnd)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function formatListRowDate(dateKey) {
  return parseDateKey(dateKey).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
