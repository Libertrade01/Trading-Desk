import test from "node:test";
import assert from "node:assert/strict";
import { getAgeBand } from "./age-eligibility.js";

const TODAY = new Date("2026-07-14T12:00:00.000Z");

test("rejects users who have not reached 14", () => {
  assert.equal(getAgeBand("2012-07-15", TODAY), "under-14");
});

test("accepts a user on their fourteenth birthday", () => {
  assert.equal(getAgeBand("2012-07-14", TODAY), "14-17");
});

test("stores only the eligible age band", () => {
  assert.equal(getAgeBand("2008-07-15", TODAY), "14-17");
  assert.equal(getAgeBand("2008-07-14", TODAY), "18+");
});

test("rejects invalid and future dates", () => {
  assert.equal(getAgeBand("2026-02-30", TODAY), null);
  assert.equal(getAgeBand("2027-01-01", TODAY), null);
});
