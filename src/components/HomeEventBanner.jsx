"use client";

import { useMemo } from "react";
import {
  getMarketEventsForDate,
  formatEventTimeET,
  toDateKey,
} from "../lib/market-events";

const KIND_LABELS = {
  fomc: "FOMC",
  cpi: "CPI",
  opex: "OPEX",
  roll: "Roll",
  expiry: "Expiry",
};

export default function HomeEventBanner({ date = new Date() }) {
  const events = useMemo(() => getMarketEventsForDate(date), [date]);

  if (!events.length) return null;

  const dateKey = toDateKey(date);
  const topSeverity = events.some((e) => e.severity === "high") ? "high" : "medium";

  return (
    <section className={`home-events-banner home-events-banner--${topSeverity}`} aria-label="Today's market events">
      <div className="home-events-banner-head">
        <span className="home-events-banner-eyebrow">Today&apos;s events</span>
        <span className="home-events-banner-date">{dateKey}</span>
      </div>
      <ul className="home-events-list">
        {events.map((event) => {
          const timeLabel = formatEventTimeET(event.timeET);
          const kind = KIND_LABELS[event.kind] || event.kind;
          return (
            <li key={`${event.kind}-${event.label}`} className={`home-events-item home-events-item--${event.severity}`}>
              <div className="home-events-item-top">
                <span className="home-events-kind">{kind}</span>
                <span className="home-events-label">{event.label}</span>
                {timeLabel && <span className="home-events-time">{timeLabel}</span>}
              </div>
              {event.reminder && <p className="home-events-reminder">{event.reminder}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
