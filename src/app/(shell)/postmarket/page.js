"use client";

import { useRouter } from "next/navigation";
import PostMarketReview from "@/components/PostMarketReview";

export default function PostMarketPage() {
  const router = useRouter();

  return <PostMarketReview onBack={() => router.push("/")} />;
}
