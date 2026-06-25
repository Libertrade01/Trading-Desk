"use client";

import { useRouter } from "next/navigation";
import HomeDashboard from "@/components/HomeDashboard";

const SECTION_ROUTES = {
  home: "/",
  premarket: "/premarket",
  dailyplan: "/plan",
  postmarket: "/postmarket",
  process: "/settings?section=process",
};

export default function HomePage() {
  const router = useRouter();

  return (
    <HomeDashboard
      onNavigate={(id) => router.push(SECTION_ROUTES[id] || "/")}
      onOpenHistoryDay={(date) => router.push(`/history/${date}`)}
      onOpenWeeklyReview={() => router.push("/weekly-review")}
    />
  );
}
