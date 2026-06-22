/**
 * Feature flags for split Vercel deploys (founder vs customer SaaS).
 * Defaults to true locally for backward compatibility.
 *
 * Customer deploy: set NEXT_PUBLIC_FEATURE_WIKI=false and
 * NEXT_PUBLIC_FEATURE_LEGACY_DESK=false in Vercel env.
 *
 * Founder account always sees Wiki + Trade Desk regardless of flags.
 */

function parseFlag(value, defaultValue = true) {
  const normalized = value?.trim();
  if (normalized === undefined || normalized === "") return defaultValue;
  return normalized === "true" || normalized === "1";
}

export const FEATURE_WIKI = parseFlag(
  process.env.NEXT_PUBLIC_FEATURE_WIKI,
  true
);

export const FEATURE_LEGACY_DESK = parseFlag(
  process.env.NEXT_PUBLIC_FEATURE_LEGACY_DESK,
  true
);

const FOUNDER_ONLY_NAV = new Set(["wiki", "desk"]);

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

function founderBypassesRoute(pathname) {
  return pathname === "/wiki" || pathname.startsWith("/wiki/")
    || pathname === "/desk" || pathname.startsWith("/desk/");
}

export function isRouteEnabled(pathname, { isFounder = false } = {}) {
  if (isFounder && founderBypassesRoute(pathname)) {
    return true;
  }
  for (const [prefix, enabled] of Object.entries(FEATURE_GATED_ROUTES)) {
    if (!enabled && (pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return false;
    }
  }
  return true;
}

export function filterNavItems(items, { isFounder = false } = {}) {
  return items.filter((item) => {
    if (item.type === "label") return true;
    if (isFounder && FOUNDER_ONLY_NAV.has(item.id)) return true;
    const enabled = FEATURE_GATED_NAV[item.id];
    return enabled !== false;
  });
}

export function canAccessWiki({ isFounder = false } = {}) {
  return FEATURE_WIKI || isFounder;
}

export function canAccessLegacyDesk({ isFounder = false } = {}) {
  return FEATURE_LEGACY_DESK || isFounder;
}
