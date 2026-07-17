import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { migrateFounderDataForUser, isFounderUser } from "@/lib/founder-migration";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isFounder = isFounderUser(user);

  if (!isFounder) {
    return NextResponse.json({
      migrated: false,
      reason: "not_founder",
      isFounder: false,
    });
  }

  try {
    const result = await migrateFounderDataForUser(user);
    return NextResponse.json({ ...result, isFounder });
  } catch (err) {
    console.error("founder-migrate:", err);
    // Founder identity and navigation must not depend on the optional,
    // one-time legacy data migration succeeding.
    return NextResponse.json({
      migrated: false,
      reason: "migration_failed",
      isFounder: true,
    });
  }
}
