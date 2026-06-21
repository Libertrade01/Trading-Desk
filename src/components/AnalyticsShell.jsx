"use client";

import { useState } from "react";
import AnalyticsDashboard from "./analytics/AnalyticsDashboard";

export default function AnalyticsShell() {
  const [view, setView] = useState("dashboard");

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
        <iframe
          className="embed-frame analytics-reports-frame"
          src="/analytics.html?embed=1&view=reports"
          title="Analytics Reports"
        />
      )}
    </div>
  );
}
