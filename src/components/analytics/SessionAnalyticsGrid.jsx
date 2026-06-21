"use client";

import { useMemo } from "react";
import { getChartConfigs } from "../../lib/analytics-charts";
import AnalyticsCard from "./AnalyticsCard";
import AnalyticsChart from "./AnalyticsChart";
import RecoveryPanel from "./RecoveryPanel";

export default function SessionAnalyticsGrid({ trades }) {
  const charts = useMemo(() => getChartConfigs(trades), [trades]);

  return (
    <div className="an-session-grid">
      <AnalyticsCard title="Performance by Time · NY" className="an-session-card">
        <div className="an-chart-legend">
          <div className="an-chart-legend-item">
            <div className="an-chart-legend-swatch an-chart-legend-swatch--pnl" />
            P&L
          </div>
        </div>
        {charts.baskets ? <AnalyticsChart config={charts.baskets} /> : <div className="analytics-empty">No data</div>}
      </AnalyticsCard>

      <AnalyticsCard title="Performance by Day" className="an-session-card">
        {charts.dow ? <AnalyticsChart config={charts.dow} /> : <div className="analytics-empty">No data</div>}
      </AnalyticsCard>

      <AnalyticsCard title="P&L by Trade # in Session" className="an-session-card">
        {charts.seq ? <AnalyticsChart config={charts.seq} /> : <div className="analytics-empty">No data</div>}
      </AnalyticsCard>

      <AnalyticsCard title="Post-Loss Recovery" className="an-session-card">
        <RecoveryPanel trades={trades} />
      </AnalyticsCard>
    </div>
  );
}
