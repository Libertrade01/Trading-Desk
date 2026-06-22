import { redirect } from "next/navigation";
import { FEATURE_WIKI } from "@/lib/features";

export default function WikiPage() {
  if (!FEATURE_WIKI) {
    redirect("/");
  }

  return (
    <iframe className="embed-frame" src="https://trade-wiki.vercel.app" title="Wiki" />
  );
}
