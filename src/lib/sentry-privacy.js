const SENSITIVE_KEY = /^(authorization|cookie|set-cookie|password|passwd|token|access_token|refresh_token|api[-_]?key|email|name|journal|thesis|notes?|message|prompt|response|trade|pnl)$/i;

function stripQuery(value) {
  if (!value || typeof value !== "string") return value;
  try {
    const url = new URL(value, "https://libertrade.app");
    return `${url.origin === "https://libertrade.app" ? "" : url.origin}${url.pathname}`;
  } catch {
    return value.split("?")[0];
  }
}

function scrubObject(value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 4) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => scrubObject(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) => {
      if (SENSITIVE_KEY.test(key)) return [];
      if (typeof item === "string" && item.length > 500) return [[key, `${item.slice(0, 500)}…`]];
      return [[key, scrubObject(item, depth + 1)]];
    }),
  );
}

export function privacySafeEvent(event) {
  const safe = { ...event };
  delete safe.user;
  delete safe.extra;
  delete safe.breadcrumbs;

  if (safe.request) {
    safe.request = {
      method: safe.request.method,
      url: stripQuery(safe.request.url),
    };
  }

  if (safe.contexts) safe.contexts = scrubObject(safe.contexts);
  if (safe.tags) safe.tags = scrubObject(safe.tags);
  return safe;
}

export const privacySafeSentryOptions = {
  sendDefaultPii: false,
  tracesSampleRate: 0,
  maxBreadcrumbs: 0,
  attachStacktrace: true,
  beforeBreadcrumb: () => null,
  beforeSend: privacySafeEvent,
  integrations(defaultIntegrations) {
    return defaultIntegrations.filter((integration) => integration.name !== "VercelAI");
  },
};
