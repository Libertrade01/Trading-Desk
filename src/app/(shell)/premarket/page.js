"use client";

import { useRouter } from "next/navigation";
import PreMarketCheckIn from "@/components/PreMarketCheckIn";

export default function PreMarketPage() {
  const router = useRouter();

  return <PreMarketCheckIn onBack={() => router.push("/home")} />;
}
