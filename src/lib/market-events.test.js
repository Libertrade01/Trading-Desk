import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  displayStartForHoliday,
  displayEndForHoliday,
  formatHolidayDateLabel,
  formatHolidayDisplayLabel,
  holidayEventsForDate,
  getMarketEventsForDate,
  getLastNTradingDaysInMonth,
  isFullClosureHolidayEvent,
} from "./market-events.js";

function hasEventKind(events, kind) {
  return events.some((e) => e.kind === kind && e.source === "computed");
}

function hasHolidayLabel(events, label) {
  return events.some((e) => e.source === "holiday" && e.label === label);
}

describe("NYSE holiday display windows", () => {
  it("formats holiday date labels from holidayDate, not viewing date", () => {
    assert.equal(formatHolidayDateLabel("2026-06-19"), "Friday, June 19");
    assert.equal(
      formatHolidayDisplayLabel("2026-01-19", "Martin Luther King Jr. Day"),
      "Monday, January 19 — Martin Luther King Jr. Day",
    );
    assert.equal(
      formatHolidayDisplayLabel("2026-06-19", "Juneteenth"),
      "Friday, June 19 — Juneteenth",
    );
    assert.equal(
      formatHolidayDisplayLabel("2026-11-27", "Day after Thanksgiving"),
      "Friday, November 27 — Day after Thanksgiving",
    );
  });

  it("Juneteenth ribbon shows Friday June 19 even when viewed earlier in the week", () => {
    const label = formatHolidayDisplayLabel("2026-06-19", "Juneteenth");
    assert.ok(hasHolidayLabel(holidayEventsForDate("2026-06-15"), label));
    assert.ok(hasHolidayLabel(holidayEventsForDate("2026-06-19"), label));
    assert.ok(!hasHolidayLabel(holidayEventsForDate("2026-06-14"), label));
  });

  it("Presidents' Day 2026 (Monday): shows Wed Feb 11 through Mon Feb 16", () => {
    const holiday = "2026-02-16";
    const label = formatHolidayDisplayLabel(holiday, "Presidents' Day");
    assert.equal(displayStartForHoliday(holiday), "2026-02-11");
    assert.equal(displayEndForHoliday(holiday), "2026-02-16");

    assert.ok(hasHolidayLabel(holidayEventsForDate("2026-02-11"), label));
    assert.ok(hasHolidayLabel(holidayEventsForDate("2026-02-16"), label));
    assert.ok(!hasHolidayLabel(holidayEventsForDate("2026-02-10"), label));
    assert.ok(!hasHolidayLabel(holidayEventsForDate("2026-02-17"), label));
  });

  it("Day after Thanksgiving 2026 (Friday half day): shows Mon Nov 23 through Fri Nov 27", () => {
    const halfDay = "2026-11-27";
    const label = formatHolidayDisplayLabel(halfDay, "Day after Thanksgiving");
    assert.equal(displayStartForHoliday(halfDay), "2026-11-23");
    assert.equal(displayEndForHoliday(halfDay), "2026-11-27");

    const active = holidayEventsForDate("2026-11-23");
    const half = active.find((e) => e.label === label);
    assert.ok(half);
    assert.equal(half.kind, "halfday");
    assert.equal(half.closeET, "13:00");

    assert.ok(hasHolidayLabel(holidayEventsForDate("2026-11-27"), label));
    assert.ok(!hasHolidayLabel(holidayEventsForDate("2026-11-28"), label));
  });

  it("merges holiday ribbons into getMarketEventsForDate", () => {
    const label = formatHolidayDisplayLabel("2026-02-16", "Presidents' Day");
    const events = getMarketEventsForDate("2026-02-16");
    assert.ok(events.some((e) => e.kind === "holiday" && e.label === label));
  });
});

describe("End of month / quarter rebalancing windows", () => {
  it("January 2026: last two trading days are Thu 29 and Fri 30", () => {
    assert.deepEqual(getLastNTradingDaysInMonth(2026, 0, 2), ["2026-01-29", "2026-01-30"]);
  });

  it("shows EOM only on the last two trading days of a non-quarter month", () => {
    assert.ok(hasEventKind(getMarketEventsForDate("2026-01-29"), "eom"));
    assert.ok(hasEventKind(getMarketEventsForDate("2026-01-30"), "eom"));
    assert.ok(!hasEventKind(getMarketEventsForDate("2026-01-28"), "eom"));
    assert.ok(!hasEventKind(getMarketEventsForDate("2026-01-29"), "eoq"));
  });

  it("shows EOM and EOQ on the last two trading days of quarter-end months", () => {
    for (const key of ["2026-03-30", "2026-03-31"]) {
      const events = getMarketEventsForDate(key);
      assert.ok(hasEventKind(events, "eom"), key);
      assert.ok(hasEventKind(events, "eoq"), key);
    }
    assert.ok(!hasEventKind(getMarketEventsForDate("2026-03-27"), "eoq"));
  });

  it("skips full NYSE closures when counting month-end trading days", () => {
    assert.deepEqual(getLastNTradingDaysInMonth(2026, 11, 2), ["2026-12-30", "2026-12-31"]);
  });
});

describe("isFullClosureHolidayEvent", () => {
  it("flags full holidays but not half days", () => {
    assert.equal(isFullClosureHolidayEvent({ kind: "holiday", closure: "full" }), true);
    assert.equal(isFullClosureHolidayEvent({ kind: "halfday", closure: "half", source: "holiday" }), false);
    assert.equal(isFullClosureHolidayEvent({ kind: "fomc", source: "static" }), false);
  });
});
