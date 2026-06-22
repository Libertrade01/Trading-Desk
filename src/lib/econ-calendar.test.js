import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computedEconEventsForDate,
  getEconEventsForDate,
  isWithinUSEconHours,
  hasMorningHighImpact,
  mergeEconEvents,
  crossCheckEconWithApi,
} from "./econ-calendar.js";
import {
  normalizeSiftingEconomicEvent,
  scheduledAtToET,
} from "./econ-calendar-api.js";

describe("US econ calendar computed releases", () => {
  it("NFP on first Friday of month", () => {
    const events = computedEconEventsForDate("2026-06-05");
    assert.ok(events.some((e) => e.kind === "nfp" && e.severity === "high"));
  });

  it("jobless claims every Thursday", () => {
    const events = computedEconEventsForDate("2026-06-18");
    assert.ok(events.some((e) => e.kind === "claims" && e.severity === "medium"));
  });

  it("ISM on first and third business days", () => {
    const mfg = getEconEventsForDate("2026-06-01");
    assert.ok(mfg.some((e) => e.label.includes("ISM Manufacturing")));

    const svc = getEconEventsForDate("2026-06-03");
    assert.ok(svc.some((e) => e.label.includes("ISM Services")));
  });

  it("filters releases outside US session hours", () => {
    assert.equal(isWithinUSEconHours("08:30"), true);
    assert.equal(isWithinUSEconHours("10:00"), true);
    assert.equal(isWithinUSEconHours("07:00"), false);
    assert.equal(isWithinUSEconHours("16:30"), false);
  });

  it("detects morning high-impact stand-down window", () => {
    const events = getEconEventsForDate("2026-06-05");
    assert.equal(hasMorningHighImpact(events), true);
  });

  it("flags schedule conflicts instead of auto-picking API", () => {
    const base = getEconEventsForDate("2026-06-05");
    const merged = mergeEconEvents(base, [
      {
        date: "2026-06-05",
        kind: "nfp",
        label: "US Nonfarm Payrolls",
        timeET: "09:00",
        severity: "high",
        source: "econ-api",
      },
    ]);
    const nfp = merged.find((e) => e.kind === "nfp");
    assert.equal(merged.filter((e) => e.kind === "nfp").length, 1);
    assert.equal(nfp.source, "econ-conflict");
    assert.ok(nfp.conflict);
    assert.equal(nfp.conflict.curated.timeET, "08:30");
    assert.equal(nfp.conflict.api.timeET, "09:00");
  });

  it("flags cross-date reschedule conflicts on both sides", () => {
    const curated = getEconEventsForDate("2026-06-05");
    const mergedCuratedDay = mergeEconEvents(curated, [], {
      allApiEvents: [
        {
          date: "2026-06-06",
          kind: "nfp",
          label: "US Nonfarm Payrolls",
          timeET: "08:30",
          severity: "high",
          source: "econ-api",
        },
      ],
      curatedRangeEvents: curated,
    });
    assert.equal(mergedCuratedDay[0].source, "econ-conflict");

    const mergedApiDay = mergeEconEvents([], [
      {
        date: "2026-06-06",
        kind: "nfp",
        label: "US Nonfarm Payrolls",
        timeET: "08:30",
        severity: "high",
        source: "econ-api",
      },
    ], {
      allApiEvents: [
        {
          date: "2026-06-06",
          kind: "nfp",
          label: "US Nonfarm Payrolls",
          timeET: "08:30",
          severity: "high",
          source: "econ-api",
        },
      ],
      curatedRangeEvents: curated,
    });
    assert.equal(mergedApiDay[0].source, "econ-conflict");
  });

  it("cross-checks API against curated and keeps API-only extras", () => {
    const curated = getEconEventsForDate("2026-06-18");
    const result = crossCheckEconWithApi(curated, [
      {
        date: "2026-06-18",
        kind: "claims",
        label: "US Initial Jobless Claims",
        timeET: "08:30",
        severity: "medium",
        source: "econ-api",
      },
      {
        date: "2026-06-18",
        kind: "cpi",
        label: "US Consumer Price Index",
        timeET: "08:30",
        severity: "high",
        source: "econ-api",
      },
    ]);
    assert.equal(result.matched, 1);
    assert.equal(result.curatedOnly, 0);
    assert.equal(result.apiOnly, 1);
    assert.equal(result.apiExtraEvents[0].kind, "cpi");
    assert.equal(result.merged.filter((e) => e.kind === "claims").length, 1);
    assert.equal(result.merged.some((e) => e.kind === "cpi"), true);
  });
});

describe("Sifting.io economic calendar", () => {
  it("converts scheduled_at UTC to Eastern date and time", () => {
    const { date, timeET } = scheduledAtToET("2026-05-13T12:30:00Z");
    assert.equal(date, "2026-05-13");
    assert.equal(timeET, "08:30");
  });

  it("normalizes high-impact Sifting events", () => {
    const event = normalizeSiftingEconomicEvent({
      event_id: "us_cpi",
      name: "US Consumer Price Index",
      country: "US",
      impact: "high",
      scheduled_at: "2026-05-13T12:30:00Z",
    });
    assert.equal(event.kind, "cpi");
    assert.equal(event.severity, "high");
    assert.equal(event.date, "2026-05-13");
    assert.equal(event.timeET, "08:30");
  });

  it("drops low-impact Sifting events", () => {
    const event = normalizeSiftingEconomicEvent({
      event_id: "us_something",
      name: "Minor indicator",
      country: "US",
      impact: "low",
      scheduled_at: "2026-05-13T14:00:00Z",
    });
    assert.equal(event, null);
  });
});
