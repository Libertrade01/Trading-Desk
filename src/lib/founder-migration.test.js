import test from "node:test";
import assert from "node:assert/strict";
import { isEligibleFounder } from "./founder-migration.js";

test("production founder migration fails closed when FOUNDER_EMAIL is missing", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousFounderEmail = process.env.FOUNDER_EMAIL;
  process.env.NODE_ENV = "production";
  delete process.env.FOUNDER_EMAIL;

  try {
    const eligible = await isEligibleFounder({ email: "first@example.com" }, null);
    assert.equal(eligible, false);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousFounderEmail === undefined) delete process.env.FOUNDER_EMAIL;
    else process.env.FOUNDER_EMAIL = previousFounderEmail;
  }
});

test("configured founder email is matched case-insensitively", async () => {
  const previousFounderEmail = process.env.FOUNDER_EMAIL;
  process.env.FOUNDER_EMAIL = "Founder@Libertrade.app";

  try {
    assert.equal(
      await isEligibleFounder({ email: "founder@libertrade.app" }, null),
      true
    );
    assert.equal(
      await isEligibleFounder({ email: "customer@example.com" }, null),
      false
    );
  } finally {
    if (previousFounderEmail === undefined) delete process.env.FOUNDER_EMAIL;
    else process.env.FOUNDER_EMAIL = previousFounderEmail;
  }
});
