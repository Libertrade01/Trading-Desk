import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lastNTradingDaysRange } from "./trading-day-range.js";

describe("trading-day-range", () => {
  it("lastNTradingDaysRange counts Mon-Fri only", () => {
    const range = lastNTradingDaysRange(5, new Date("2026-07-08T12:00:00"));
    assert.equal(range.dateTo, "2026-07-08");
    assert.equal(range.dateFrom, "2026-07-02");
  });

  it("lastNTradingDaysRange ends on Friday when reference is Saturday", () => {
    const range = lastNTradingDaysRange(5, new Date("2026-07-11T12:00:00"));
    assert.equal(range.dateTo, "2026-07-10");
    assert.equal(range.dateFrom, "2026-07-06");
  });

  it("lastNTradingDaysRange spans 10 weekdays", () => {
    const range = lastNTradingDaysRange(10, new Date("2026-07-08T12:00:00"));
    assert.equal(range.dateTo, "2026-07-08");
    assert.equal(range.dateFrom, "2026-06-25");
  });
});
