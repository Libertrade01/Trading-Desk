"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loadMarketEventsForDate,
  formatEventTimeET,
} from "../lib/market-events";
import {
  summarizeEconEvents,
  isEconEvent,
} from "../lib/econ-calendar";
import { todayKey } from "../lib/today-key";

export default function MarketEventNudge({ dateKey = todayKey() }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await loadMarketEventsForDate(dateKey);
      if (!cancelled) setEvents(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  const visible = useMemo(
    () => events.filter((e) => e.severity === "high" || e.severity === "medium"),
    [events],
  );

  const isHighImpact = visible.some((e) => e.severity === "high");
  const econSummary = useMemo(() => summarizeEconEvents(visible.filter(isEconEvent)), [visible]);

  if (!visible.length) return null;

  const headline = visible.map((e) => e.label).join(" · ");
  const schedule = visible
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
        Review catalysts before toggling prep complete.
        {econSummary.total > 0 && ` ${econSummary.high} high · ${econSummary.medium} medium US releases.`}{" "}
        {schedule}
      </p>
    </div>
  );
}
