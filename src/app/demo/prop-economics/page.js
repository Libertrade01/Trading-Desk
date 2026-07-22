"use client";

import PropEconomics from "@/components/PropEconomics";
import { getDemoBundle } from "@/lib/demo-data";

export default function DemoPropEconomicsPage() {
  const demoBundle = getDemoBundle();

  return <PropEconomics demoMode initialLedger={demoBundle.propLedger} />;
}
