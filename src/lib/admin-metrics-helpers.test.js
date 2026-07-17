import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAdminSnapshot,
  maskEmail,
  parseProfileValue,
  summarizeTrafficRows,
} from "./admin-metrics-helpers.js";

test("maskEmail never returns the full local part", () => {
  assert.equal(maskEmail("mikelow92@example.com"), "mi••••••@example.com");
  assert.equal(maskEmail("a@example.com"), "a•••@example.com");
});

test("parseProfileValue fails closed for malformed profile JSON", () => {
  assert.equal(parseProfileValue("{"), null);
  assert.deepEqual(parseProfileValue('{"preferredName":"Mike"}'), { preferredName: "Mike" });
});

test("buildAdminSnapshot aggregates account and workflow activity without exposing content", () => {
  const now = new Date("2026-07-17T12:00:00.000Z");
  const users = [
    {
      id: "one",
      email: "one@example.com",
      created_at: "2026-07-16T12:00:00.000Z",
      email_confirmed_at: "2026-07-16T12:05:00.000Z",
      last_sign_in_at: "2026-07-17T09:00:00.000Z",
      user_metadata: { preferred_name: "One" },
    },
    {
      id: "two",
      email: "two@example.com",
      created_at: "2026-06-01T12:00:00.000Z",
      email_confirmed_at: null,
      last_sign_in_at: null,
      user_metadata: {},
    },
  ];
  const profiles = [
    {
      user_id: "one",
      value: JSON.stringify({ preferredName: "Trader One", onboardingCompletedAt: "2026-07-16T13:00:00Z" }),
      updated_at: "2026-07-16T13:00:00Z",
    },
  ];
  const sessions = [
    { user_id: "one", key: "premarket-checkin-2026-07-17", updated_at: "2026-07-17T10:00:00Z" },
    { user_id: "one", key: "daily-plan-2026-07-17", updated_at: "2026-07-17T10:05:00Z" },
    { user_id: "one", key: "postmarket-review-2026-07-17", updated_at: "2026-07-17T11:00:00Z" },
  ];
  const trades = [{ user_id: "one", entry_time: "2026-07-17T10:30:00Z" }];

  const snapshot = buildAdminSnapshot({ users, profiles, sessions, trades, now });
  assert.deepEqual(snapshot.accounts, {
    total: 2,
    confirmed: 1,
    signups7: 1,
    signups30: 1,
    onboarded: 1,
    onboardingRate: 50,
    firstLoop: 1,
    firstLoopRate: 50,
  });
  assert.equal(snapshot.activity.active7, 1);
  assert.equal(snapshot.activity.checkins7, 1);
  assert.equal(snapshot.activity.plans7, 1);
  assert.equal(snapshot.activity.loops7, 1);
  assert.equal(snapshot.activity.trades7, 1);
  assert.equal(snapshot.recentUsers[0].email, "on•••@example.com");
  assert.equal("value" in snapshot.recentUsers[0], false);
});

test("summarizeTrafficRows totals daily Vercel aggregates", () => {
  assert.deepEqual(
    summarizeTrafficRows([
      { pageviews: 12, visitors: 8 },
      { pageviews: 5, visitors: 4 },
    ]),
    { pageviews: 17, visitors: 12 }
  );
});
