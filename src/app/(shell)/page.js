"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HomeDashboard from "@/components/HomeDashboard";

const SECTION_ROUTES = {
  home: "/",
  premarket: "/premarket",
  dailyplan: "/plan",
  postmarket: "/postmarket",
};

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <HomeDashboard
      preview={searchParams.get("preview")}
      previewDate={searchParams.get("previewDate")}
      onNavigate={(id) => router.push(SECTION_ROUTES[id] || "/")}
      onOpenHistoryDay={(date) => router.push(`/history/${date}`)}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="pm-loading">Loading...</div>}>
      <HomePageContent />
    </Suspense>
  );
}
