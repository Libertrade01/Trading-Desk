"use client";

import { useRouter } from "next/navigation";
import PostMarketReview from "@/components/PostMarketReview";
import { getDemoBundle } from "@/lib/demo-data";

export default function DemoPostmarketPage() {
  const router = useRouter();
  const demoBundle = getDemoBundle();

  return (
    <PostMarketReview
      demoMode
      initialForm={demoBundle.todayPost}
      initialTrades={demoBundle.todayTrades}
      morningThesis={demoBundle.morningThesis}
      demoProfile={demoBundle.traderProfile}
      demoSettings={demoBundle.settings}
      onBack={() => router.push("/demo")}
    />
  );
}
