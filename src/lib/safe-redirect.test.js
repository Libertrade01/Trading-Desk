import test from "node:test";
import assert from "node:assert/strict";
import { safeRedirectPath } from "./safe-redirect.js";

test("keeps normal internal destinations", () => {
  assert.equal(safeRedirectPath("/onboarding"), "/onboarding");
  assert.equal(safeRedirectPath("/history?range=week#trades"), "/history?range=week#trades");
});

test("falls back for external and protocol-relative destinations", () => {
  assert.equal(safeRedirectPath("https://example.com"), "/home");
  assert.equal(safeRedirectPath("//example.com/path"), "/home");
  assert.equal(safeRedirectPath("/\\example.com/path"), "/home");
});

test("falls back for empty, malformed, and non-string values", () => {
  assert.equal(safeRedirectPath(""), "/home");
  assert.equal(safeRedirectPath("not-a-path"), "/home");
  assert.equal(safeRedirectPath(null), "/home");
  assert.equal(safeRedirectPath("https://example.com", "/login"), "/login");
});
