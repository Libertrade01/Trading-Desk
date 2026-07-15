const FALLBACK_PATH = "/home";
const APP_ORIGIN = "https://libertrade.app";

/**
 * Accept only an app-relative destination. This prevents login links from
 * turning the post-auth redirect into an open redirect to another origin.
 */
export function safeRedirectPath(value, fallback = FALLBACK_PATH) {
  if (typeof value !== "string") return fallback;

  const candidate = value.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, APP_ORIGIN);
    if (parsed.origin !== APP_ORIGIN) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
