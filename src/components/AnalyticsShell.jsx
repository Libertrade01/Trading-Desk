"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import AnalyticsDashboard from "./analytics/AnalyticsDashboard";
import AnalyticsReports from "./analytics/AnalyticsReports";

export default function AnalyticsShell() {
  const searchParams = useSearchParams();
  const [view, setView] = useState("dashboard");

  useEffect(() => {
    if (searchParams.get("view") === "reports") {
      setView("reports");
    }
  }, [searchParams]);

  return (
    <div className="analytics-shell">
      <div className="analytics-shell__tabs">
        <button
          type="button"
          className={`analytics-shell__tab${view === "dashboard" ? " active" : ""}`}
          onClick={() => setView("dashboard")}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={`analytics-shell__tab${view === "reports" ? " active" : ""}`}
          onClick={() => setView("reports")}
        >
          Reports
        </button>
      </div>

      {view === "dashboard" ? (
        <AnalyticsDashboard />
      ) : (
        <AnalyticsReports />
      )}
    </div>
  );
}
