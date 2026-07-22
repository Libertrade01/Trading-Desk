"use client";

import { useRouter } from "next/navigation";
import HomeDashboard from "@/components/HomeDashboard";

const SECTION_ROUTES = {
  home: "/home",
  premarket: "/premarket",
  dailyplan: "/plan",
  postmarket: "/postmarket",
  process: "/settings?section=process",
  settings: "/settings",
  "settings-risk": "/settings?section=risk",
  analytics: "/analytics",
  weeklyreview: "/weekly-review",
};

export default function HomePage() {
  const router = useRouter();

  return (
    <HomeDashboard
      onNavigate={(id) => router.push(SECTION_ROUTES[id] || "/home")}
      onOpenHistoryDay={(date) => router.push(`/history/${date}`)}
      onOpenWeeklyReview={(weekEnd) =>
        router.push(weekEnd ? `/weekly-review?week=${encodeURIComponent(weekEnd)}` : "/weekly-review")
      }
    />
  );
}
