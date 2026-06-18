"use client";

import { useRouter } from "next/navigation";
import HistoryPage from "@/components/HistoryPage";

export default function HistoryIndexPage() {
  const router = useRouter();

  return <HistoryPage onSelectDay={(date) => router.push(`/history/${date}`)} />;
}
