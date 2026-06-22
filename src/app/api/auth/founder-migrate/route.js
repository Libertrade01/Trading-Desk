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

  try {
    const result = await migrateFounderDataForUser(user);
    return NextResponse.json({ ...result, isFounder });
  } catch (err) {
    console.error("founder-migrate:", err);
    return NextResponse.json(
      { error: err.message || "Migration failed", isFounder },
      { status: 500 }
    );
  }
}
