import test from "node:test";
import assert from "node:assert/strict";
import {
  PUBLIC_CONVERSION_EVENTS,
  isPublicAnalyticsUrl,
} from "./public-analytics.js";

test("public analytics accepts only approved public routes", () => {
  assert.equal(isPublicAnalyticsUrl("https://libertrade.app/"), true);
  assert.equal(isPublicAnalyticsUrl("https://libertrade.app/signup?source=footer"), true);
  assert.equal(isPublicAnalyticsUrl("https://libertrade.app/home"), false);
  assert.equal(isPublicAnalyticsUrl("https://libertrade.app/settings?section=process"), false);
  assert.equal(isPublicAnalyticsUrl("not a URL"), false);
});

test("public conversion events use the fixed anonymous funnel names", () => {
  assert.deepEqual(Object.values(PUBLIC_CONVERSION_EVENTS), [
    "landing_signup_clicked",
    "signup_started",
    "signup_submitted",
    "login_clicked",
  ]);
});
