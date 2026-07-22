"use client";

import { useRouter } from "next/navigation";
import HomeDashboard from "@/components/HomeDashboard";
import { getDemoBundle } from "@/lib/demo-data";

const DEMO_ROUTES = {
  home: "/demo",
  analytics: "/demo/stats",
};

export default function DemoHomePage() {
  const router = useRouter();
  const demoBundle = getDemoBundle();

  return (
    <HomeDashboard
      demoBundle={demoBundle}
      onNavigate={(id) => {
        const route = DEMO_ROUTES[id];
        if (route) {
          router.push(route);
          return;
        }
        router.push("/signup");
      }}
      onOpenHistoryDay={() => router.push("/signup")}
      onOpenWeeklyReview={() => router.push("/signup")}
    />
  );
}
