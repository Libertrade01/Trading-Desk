import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computedEconEventsForDate,
  getEconEventsForDate,
  isWithinUSEconHours,
  hasMorningHighImpact,
  mergeEconEvents,
} from "./econ-calendar.js";
import { getMarketEventsForDate } from "./market-events.js";

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

  it("merges into getMarketEventsForDate", () => {
    const events = getMarketEventsForDate("2026-06-05");
    assert.ok(events.some((e) => e.kind === "nfp"));
    assert.ok(events.some((e) => e.kind === "claims"));
  });

  it("dedupes API extras against curated events", () => {
    const base = getEconEventsForDate("2026-06-05");
    const merged = mergeEconEvents(base, [
      {
        date: "2026-06-05",
        kind: "nfp",
        label: "Nonfarm payrolls",
        timeET: "08:30",
        severity: "high",
        source: "econ-api",
      },
    ]);
    assert.equal(merged.filter((e) => e.kind === "nfp").length, 1);
  });
});
