import { Suspense } from "react";
import AnalyticsShell from "@/components/AnalyticsShell";

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="analytics-loading">Loading analytics…</div>}>
      <AnalyticsShell />
    </Suspense>
  );
}
