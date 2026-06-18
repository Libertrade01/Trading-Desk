"use client";

import { useParams, useRouter } from "next/navigation";
import HistoryDayDetail from "@/components/HistoryDayDetail";

export default function HistoryDayPage() {
  const router = useRouter();
  const params = useParams();
  const date = params.date;

  return (
    <HistoryDayDetail
      date={date}
      onBack={() => router.push("/history")}
      onDeleted={() => router.push("/history")}
    />
  );
}
