"use client";

import { useMemo } from "react";
import {
  getMarketEventsForDate,
  formatEventTimeET,
} from "../lib/market-events";

const KIND_LABELS = {
  fomc: "FOMC",
  prefomc: "PRE FOMC",
  cpi: "CPI",
  opex: "OPEX",
  roll: "ROLL",
  expiry: "EXPIRY",
};

export default function HomeEventBanner({ date = new Date() }) {
  const events = useMemo(() => getMarketEventsForDate(date), [date]);

  if (!events.length) return null;

  const topSeverity = events.some((e) => e.severity === "high") ? "high" : "medium";

  return (
    <div className="home-events-alerts" aria-label="Today's market events">
      {events.map((event) => {
        const timeLabel = formatEventTimeET(event.timeET);
        const kind = KIND_LABELS[event.kind] || event.kind.toUpperCase();
        const parts = [event.label];
        if (event.reminder) parts.push(event.reminder);
        if (timeLabel) parts.push(timeLabel);
        return (
          <div
            key={`${event.kind}-${event.label}`}
            className={`home-events-alert home-events-alert--${event.severity} home-events-alert--banner-${topSeverity}`}
          >
            <span className="home-events-alert-kind">{kind}</span>
            <span className="home-events-alert-sep">·</span>
            <span className="home-events-alert-text">{parts.join(" · ")}</span>
          </div>
        );
      })}
    </div>
  );
}
