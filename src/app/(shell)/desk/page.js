import { redirect } from "next/navigation";
import { canAccessLegacyDesk } from "@/lib/features";
import { createClient } from "@/lib/supabase/server";
import { isFounderUser } from "@/lib/founder-migration";
import TradeDeskApp from "@/legacy/TradeDeskApp";

export default async function DeskPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!canAccessLegacyDesk({ isFounder: isFounderUser(user) })) {
    redirect("/");
  }

  return <TradeDeskApp />;
}
