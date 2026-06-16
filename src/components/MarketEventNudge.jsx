"use client";

import { useMemo } from "react";
import {
  getMarketEventsForDate,
  formatEventTimeET,
} from "../lib/market-events";

export default function MarketEventNudge({ date = new Date() }) {
  const events = useMemo(() => getMarketEventsForDate(date), [date]);

  if (!events.length) return null;

  const isHighImpact = events.some((e) => e.severity === "high");
  const headline = events.map((e) => e.label).join(" · ");
  const schedule = events
    .map((e) => {
      const time = formatEventTimeET(e.timeET);
      return time ? `${e.label} (${time})` : e.label;
    })
    .join(" · ");

  return (
    <div className={`pm-market-event-nudge${isHighImpact ? "" : " pm-market-event-nudge--medium"}`}>
      <div className="pm-market-event-nudge-label">
        {isHighImpact ? "High-impact day" : "Market event day"}
      </div>
      <p className="pm-market-event-nudge-title">{headline}</p>
      <p className="pm-market-event-nudge-sub">
        Review catalysts before toggling prep complete. {schedule}
      </p>
    </div>
  );
}
