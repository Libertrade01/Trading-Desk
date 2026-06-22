/**
 * Feature flags for split Vercel deploys (founder vs customer SaaS).
 * Defaults to true locally for backward compatibility.
 *
 * Customer deploy: set NEXT_PUBLIC_FEATURE_WIKI=false and
 * NEXT_PUBLIC_FEATURE_LEGACY_DESK=false in Vercel env.
 */

function parseFlag(value, defaultValue = true) {
  if (value === undefined || value === "") return defaultValue;
  return value === "true" || value === "1";
}

export const FEATURE_WIKI = parseFlag(
  process.env.NEXT_PUBLIC_FEATURE_WIKI,
  true
);

export const FEATURE_LEGACY_DESK = parseFlag(
  process.env.NEXT_PUBLIC_FEATURE_LEGACY_DESK,
  true
);

/** Nav item ids gated by feature flags */
export const FEATURE_GATED_NAV = {
  wiki: FEATURE_WIKI,
  desk: FEATURE_LEGACY_DESK,
};

/** Route prefixes blocked when the corresponding flag is off */
export const FEATURE_GATED_ROUTES = {
  "/wiki": FEATURE_WIKI,
  "/desk": FEATURE_LEGACY_DESK,
};

export function isRouteEnabled(pathname) {
  for (const [prefix, enabled] of Object.entries(FEATURE_GATED_ROUTES)) {
    if (!enabled && (pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return false;
    }
  }
  return true;
}

export function filterNavItems(items) {
  return items.filter((item) => {
    if (item.type === "label") return true;
    const enabled = FEATURE_GATED_NAV[item.id];
    return enabled !== false;
  });
}
