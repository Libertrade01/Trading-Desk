import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  displayStartForHoliday,
  displayEndForHoliday,
  formatHolidayDateLabel,
  formatHolidayDisplayLabel,
  holidayEventsForDate,
  getMarketEventsForDate,
} from "./market-events.js";

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

  it("Day after Thanksgiving 2026 (Friday half day): shows Mon Nov 24 through Fri Nov 27", () => {
    const halfDay = "2026-11-27";
    const label = formatHolidayDisplayLabel(halfDay, "Day after Thanksgiving");
    assert.equal(displayStartForHoliday(halfDay), "2026-11-24");
    assert.equal(displayEndForHoliday(halfDay), "2026-11-27");

    const active = holidayEventsForDate("2026-11-24");
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
