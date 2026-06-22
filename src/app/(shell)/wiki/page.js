import { redirect } from "next/navigation";
import { canAccessWiki } from "@/lib/features";
import { createClient } from "@/lib/supabase/server";
import { isFounderUser } from "@/lib/founder-migration";

export default async function WikiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!canAccessWiki({ isFounder: isFounderUser(user) })) {
    redirect("/");
  }

  return (
    <iframe className="embed-frame" src="https://trade-wiki.vercel.app" title="Wiki" />
  );
}
