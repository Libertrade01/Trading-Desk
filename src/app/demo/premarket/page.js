"use client";

import { useRouter } from "next/navigation";
import PreMarketCheckIn from "@/components/PreMarketCheckIn";
import { getDemoBundle } from "@/lib/demo-data";

export default function DemoPremarketPage() {
  const router = useRouter();
  const demoBundle = getDemoBundle();

  return (
    <PreMarketCheckIn
      demoMode
      initialForm={demoBundle.todayPremarket}
      demoProfile={demoBundle.traderProfile}
      onBack={() => router.push("/demo")}
    />
  );
}
