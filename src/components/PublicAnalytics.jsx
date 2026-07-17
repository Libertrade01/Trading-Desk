"use client";

import { Analytics } from "@vercel/analytics/next";
import { isPublicAnalyticsUrl } from "../lib/public-analytics";

export default function PublicAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        return isPublicAnalyticsUrl(event.url) ? event : null;
      }}
    />
  );
}
