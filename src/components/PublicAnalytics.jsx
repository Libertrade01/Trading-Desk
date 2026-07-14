"use client";

import { Analytics } from "@vercel/analytics/next";

const PUBLIC_ANALYTICS_PATHS = new Set([
  "/",
  "/cookies",
  "/login",
  "/privacy",
  "/signup",
  "/terms",
]);

export default function PublicAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        try {
          const pathname = new URL(event.url).pathname;
          return PUBLIC_ANALYTICS_PATHS.has(pathname) ? event : null;
        } catch {
          return null;
        }
      }}
    />
  );
}
