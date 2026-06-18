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
  holiday: "HOLIDAY",
  halfday: "HALF DAY",
};

function ribbonHint(event, timeLabel) {
  if (timeLabel) return timeLabel;
  if (!event.reminder) return null;
  const short = event.reminder.split(/[.—–]/)[0]?.trim();
  return short && short.length <= 40 ? short : null;
}

export default function HomeEventBanner({ date = new Date() }) {
  const events = useMemo(() => getMarketEventsForDate(date), [date]);

  if (!events.length) return null;

  return (
    <div className="home-ribbons" aria-label="Today's market events">
      {events.map((event) => {
        const timeLabel = formatEventTimeET(event.closeET || event.timeET);
        const kind = KIND_LABELS[event.kind] || event.kind.toUpperCase();
        const hint = ribbonHint(event, timeLabel);
        return (
          <div
            key={`${event.kind}-${event.label}`}
            className="home-ribbon"
          >
            <span className="home-ribbon-tag">{kind}</span>
            <span className="home-ribbon-text">{event.label}</span>
            {hint && <span className="home-ribbon-hint">{hint}</span>}
          </div>
        );
      })}
    </div>
  );
}
