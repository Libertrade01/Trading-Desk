"use client";

import { useRouter } from "next/navigation";
import DailyPlan from "@/components/DailyPlan";

export default function PlanPage() {
  const router = useRouter();

  return <DailyPlan onBack={() => router.push("/home")} />;
}
