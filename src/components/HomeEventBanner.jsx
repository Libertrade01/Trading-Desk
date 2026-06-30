"use client";

import { useMemo } from "react";
import {
  getMarketEventsForDate,
  formatEventTimeET,
} from "../lib/market-events";
import { todayKey } from "../lib/today-key";

const KIND_LABELS = {
  fomc: "FOMC",
  prefomc: "PRE FOMC",
  cpi: "CPI",
  opex: "OPEX",
  roll: "ROLL",
  expiry: "EXPIRY",
  eom: "EOM",
  eoq: "EOQ",
  holiday: "HOLIDAY",
  halfday: "HALF DAY",
};

function ribbonHint(event, timeLabel) {
  if (timeLabel) return timeLabel;
  if (!event.reminder) return null;
  const short = event.reminder.split(/[.—–]/)[0]?.trim();
  return short && short.length <= 40 ? short : null;
}

function mergePeriodRebalanceRows(events) {
  const eom = events.find((event) => event.kind === "eom");
  const eoq = events.find((event) => event.kind === "eoq");
  if (!eom || !eoq) return events;

  const rest = events.filter((event) => event.kind !== "eom" && event.kind !== "eoq");
  const insertAt = events.findIndex((event) => event.kind === "eom" || event.kind === "eoq");

  const hints = [ribbonHint(eom, null), ribbonHint(eoq, null)].filter(Boolean);
  const merged = {
    kind: "eom-eoq",
    kinds: ["eom", "eoq"],
    label: "End of month/End of quarter",
    timeET: null,
    reminder: hints.length ? hints.join(" · ") : null,
    source: "computed",
  };

  return [...rest.slice(0, insertAt), merged, ...rest.slice(insertAt)];
}

export default function HomeEventBanner({ dateKey = todayKey() }) {
  const events = useMemo(() => {
    const rows = getMarketEventsForDate(dateKey);
    return mergePeriodRebalanceRows(rows);
  }, [dateKey]);

  if (!events.length) return null;

  return (
    <div className="home-ribbons" aria-label="Today's market events">
      {events.map((event) => {
        const timeLabel = formatEventTimeET(event.closeET || event.timeET);
        const hint = event.kinds ? event.reminder : ribbonHint(event, timeLabel);
        const ribbonKey = event.kinds
          ? event.kinds.join("-")
          : `${event.kind}-${event.label}-${event.timeET || ""}`;

        return (
          <div key={ribbonKey} className="home-ribbon">
            {event.kinds ? (
              <span className="home-ribbon-tag">EOM/EOQ</span>
            ) : (
              <span className="home-ribbon-tag">{KIND_LABELS[event.kind] || event.kind.toUpperCase()}</span>
            )}
            <span className="home-ribbon-text">{event.label}</span>
            {hint && <span className="home-ribbon-hint">{hint}</span>}
          </div>
        );
      })}
    </div>
  );
}
