import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseNaiveInTimezone,
  sessionDateFromNaive,
  formatLimaTime,
  toNYTimeStr,
  easternMinutesFromInstant,
} from "./trade-time.js";
import {
  ianaFromTimeColumnHeader,
  resolveRtraderTimeColumn,
} from "./rtrader-timezone.js";

describe("trade-time (US Eastern display)", () => {
  it("parses UTC naive time and displays as Eastern", () => {
    const d = parseNaiveInTimezone("2025-07-01 13:58:00", "UTC");
    assert.equal(d.toISOString(), "2025-07-01T13:58:00.000Z");
    assert.equal(formatLimaTime("2025-07-01 13:58:00", { sourceTimeZone: "UTC" }), "07-01 09:58");
    assert.equal(toNYTimeStr("2025-07-01T13:58:00.000Z"), "2025-07-01 09:58");
  });

  it("parses US Eastern naive time to UTC", () => {
    const d = parseNaiveInTimezone("2025-07-01 09:58:00", "America/New_York");
    assert.equal(d.toISOString(), "2025-07-01T13:58:00.000Z");
  });

  it("uses Eastern session date regardless of import zone", () => {
    assert.equal(sessionDateFromNaive("2025-07-01 13:58", "UTC"), "2025-07-01");
  });

  it("computes Eastern minutes for basket charts", () => {
    const d = parseNaiveInTimezone("2025-07-01 13:58:00", "UTC");
    assert.equal(easternMinutesFromInstant(d), 9 * 60 + 58);
  });
});

describe("rtrader-timezone", () => {
  it("maps UTC column header", () => {
    assert.equal(ianaFromTimeColumnHeader("Update Time (UTC)"), "UTC");
  });

  it("maps SAPST to Lima, ESAST to São Paulo (not US Eastern)", () => {
    assert.equal(ianaFromTimeColumnHeader("Update Time (SAPST)"), "America/Lima");
    assert.equal(ianaFromTimeColumnHeader("Update Time (ESAST)"), "America/Sao_Paulo");
  });

  it("prefers explicit UTC column when present", () => {
    const headers = ["Status", "Buy/Sell", "Update Time (UTC)", "Update Time (SAPST)"];
    const col = resolveRtraderTimeColumn(headers);
    assert.equal(col.header, "Update Time (UTC)");
    assert.equal(col.sourceTimeZone, "UTC");
  });
});
