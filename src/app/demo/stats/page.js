"use client";

import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";
import { getDemoBundle } from "@/lib/demo-data";

export default function DemoStatsPage() {
  return <AnalyticsDashboard demoMode demoBundle={getDemoBundle()} />;
}
