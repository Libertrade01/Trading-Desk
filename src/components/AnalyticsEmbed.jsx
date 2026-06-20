"use client";

import { useEffect, useMemo, useState } from "react";

export default function AnalyticsEmbed() {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const src = useMemo(() => {
    if (typeof window === "undefined") return "/analytics.html";
    return `${window.location.origin}/analytics.html?embed=1`;
  }, []);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "analytics-embed-ready") {
        setLoaded(true);
        setFailed(false);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFailed((prev) => {
        if (loaded) return prev;
        return true;
      });
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [loaded, src]);

  if (failed && !loaded) {
    return (
      <div className="analytics-embed-fallback">
        <div className="hybrid-eyebrow">Analytics</div>
        <h2 className="hybrid-section-title">Couldn&apos;t load analytics</h2>
        <p>
          This usually means the app is running on an expired preview URL, or the dev server
          isn&apos;t serving static files. Try opening analytics directly, or restart{" "}
          <code>npm run dev</code>.
        </p>
        <div className="analytics-embed-fallback-actions">
          <a className="desk-nav-link" href="/analytics.html" target="_top">
            Open Analytics
          </a>
          <a className="analytics-embed-fallback-link" href="/">
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <iframe
      className="embed-frame"
      src={src}
      title="Analytics"
    />
  );
}
