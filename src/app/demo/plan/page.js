"use client";

import { useRouter } from "next/navigation";
import DailyPlan from "@/components/DailyPlan";
import { getDemoBundle } from "@/lib/demo-data";

export default function DemoPlanPage() {
  const router = useRouter();
  const demoBundle = getDemoBundle();

  return (
    <DailyPlan
      demoMode
      initialForm={demoBundle.todayPlan}
      demoProfile={demoBundle.traderProfile}
      onBack={() => router.push("/demo")}
    />
  );
}
