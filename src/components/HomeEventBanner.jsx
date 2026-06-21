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

const KIND_LABELS = {
  fomc: "FOMC",
  prefomc: "PRE FOMC",
  cpi: "CPI",
  nfp: "NFP",
  claims: "CLAIMS",
  ppi: "PPI",
  pce: "PCE",
  gdp: "GDP",
  retail: "RETAIL",
  ism: "ISM",
  opex: "OPEX",
  roll: "ROLL",
  expiry: "EXPIRY",
  holiday: "HOLIDAY",
  halfday: "HALF DAY",
  econ: "US DATA",
};

function ribbonHint(event, timeLabel) {
  if (timeLabel) return timeLabel;
  if (!event.reminder) return null;
  const short = event.reminder.split(/[.—–]/)[0]?.trim();
  return short && short.length <= 40 ? short : null;
}

export default function HomeEventBanner({ dateKey = todayKey() }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const rows = await loadMarketEventsForDate(dateKey);
      if (!cancelled) {
        setEvents(rows);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  const visible = useMemo(
    () => events.filter((e) => e.severity === "high" || e.severity === "medium"),
    [events],
  );
  const summary = useMemo(() => summarizeEconEvents(visible.filter(isEconEvent)), [visible]);

  if (loading || !visible.length) return null;

  return (
    <section className="home-econ-cal" aria-label="Today's market calendar">
      <div className="home-econ-cal-head">
        <div className="home-econ-cal-eyebrow hybrid-eyebrow">Market calendar</div>
        <div className="home-econ-cal-badges">
          {summary.high > 0 && (
            <span className="home-econ-cal-badge home-econ-cal-badge--high">
              {summary.high} high
            </span>
          )}
          {summary.medium > 0 && (
            <span className="home-econ-cal-badge home-econ-cal-badge--medium">
              {summary.medium} medium
            </span>
          )}
        </div>
      </div>

      <div className="home-ribbons">
        {visible.map((event) => {
          const timeLabel = formatEventTimeET(event.closeET || event.timeET);
          const kind = KIND_LABELS[event.kind] || event.kind.toUpperCase();
          const hint = ribbonHint(event, timeLabel);
          const severityClass =
            event.severity === "high"
              ? " home-ribbon--high"
              : event.severity === "medium"
                ? " home-ribbon--medium"
                : "";

          return (
            <div
              key={`${event.kind}-${event.label}-${event.timeET || ""}`}
              className={`home-ribbon${severityClass}`}
            >
              <span className="home-ribbon-tag">{kind}</span>
              <span className="home-ribbon-text">{event.label}</span>
              {hint && <span className="home-ribbon-hint">{hint}</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
