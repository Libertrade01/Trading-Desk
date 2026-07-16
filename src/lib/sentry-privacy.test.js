import test from "node:test";
import assert from "node:assert/strict";
import { privacySafeEvent, privacySafeSentryOptions } from "./sentry-privacy.js";

test("Sentry events remove user content and request secrets", () => {
  const safe = privacySafeEvent({
    user: { id: "user-id", email: "person@example.com" },
    extra: { journal: "private entry" },
    breadcrumbs: [{ message: "private click" }],
    request: {
      method: "POST",
      url: "https://libertrade.app/api/trades?email=person@example.com",
      headers: { authorization: "Bearer secret" },
      data: { thesis: "private thesis" },
    },
    contexts: { response: { status_code: 500, data: "private" }, runtime: { name: "node" } },
    tags: { route: "/api/trades", email: "person@example.com" },
  });

  assert.equal(safe.user, undefined);
  assert.equal(safe.extra, undefined);
  assert.equal(safe.breadcrumbs, undefined);
  assert.deepEqual(safe.request, { method: "POST", url: "/api/trades" });
  assert.deepEqual(safe.contexts, { runtime: {} });
  assert.deepEqual(safe.tags, { route: "/api/trades" });
});

test("Sentry monitoring starts without tracing, replay or breadcrumbs", () => {
  assert.equal(privacySafeSentryOptions.sendDefaultPii, false);
  assert.equal(privacySafeSentryOptions.tracesSampleRate, 0);
  assert.equal(privacySafeSentryOptions.maxBreadcrumbs, 0);
  assert.equal(privacySafeSentryOptions.beforeBreadcrumb(), null);
  assert.deepEqual(
    privacySafeSentryOptions.integrations([{ name: "VercelAI" }, { name: "Http" }]),
    [{ name: "Http" }],
  );
});
