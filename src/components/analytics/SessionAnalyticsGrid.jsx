"use client";

import { useMemo } from "react";
import { getChartConfigs } from "../../lib/analytics-charts";
import AnalyticsChart from "./AnalyticsChart";

function TimeChartCard({ charts, className = "an-card an-time-card" }) {
  return (
    <section className={className}>
      <div className="an-card-head">
        <div className="an-card-title">Performance by Time · NY</div>
        <div className="an-time-legend">
          <span className="an-time-legend-swatch" aria-hidden="true" />
          Avg P&amp;L
        </div>
      </div>
      <div className="an-time-chart">
        {charts.baskets ? (
          <AnalyticsChart config={charts.baskets} height={200} />
        ) : (
          <div className="analytics-empty">No data</div>
        )}
      </div>
    </section>
  );
}

function DayChartCard({ charts }) {
  return (
    <section className="an-card an-session-card">
      <div className="an-card-title">Performance by Day</div>
      {charts.dow ? (
        <AnalyticsChart config={charts.dow} height={200} />
      ) : (
        <div className="analytics-empty">No data</div>
      )}
    </section>
  );
}

/** Performance-by-time / day cards for the analytics layout. */
export default function SessionAnalyticsGrid({ trades, variant = "full" }) {
  const charts = useMemo(() => getChartConfigs(trades), [trades]);

  if (variant === "time-only") {
    return <TimeChartCard charts={charts} />;
  }

  if (variant === "day-only") {
    return <DayChartCard charts={charts} />;
  }

  return (
    <div className="an-session-grid">
      <TimeChartCard charts={charts} className="an-card an-session-card" />
      <DayChartCard charts={charts} />
    </div>
  );
}
