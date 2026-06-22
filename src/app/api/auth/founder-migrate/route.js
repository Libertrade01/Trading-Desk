import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { migrateFounderDataForUser } from "@/lib/founder-migration";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await migrateFounderDataForUser(user);
    return NextResponse.json(result);
  } catch (err) {
    console.error("founder-migrate:", err);
    return NextResponse.json(
      { error: err.message || "Migration failed" },
      { status: 500 }
    );
  }
}
