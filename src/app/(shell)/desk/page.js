import { redirect } from "next/navigation";
import { FEATURE_LEGACY_DESK } from "@/lib/features";
import TradeDeskApp from "@/legacy/TradeDeskApp";

export default function DeskPage() {
  if (!FEATURE_LEGACY_DESK) {
    redirect("/");
  }

  return <TradeDeskApp />;
}
