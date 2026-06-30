import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertUserAppData, getUserAppData } from "@/lib/app-data-server";
import { isDevUser } from "@/lib/dev-access";
import {
  TRADER_PROFILE_KEY,
  normalizeTraderProfile,
} from "@/lib/trader-profile";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDevUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const row = await getUserAppData(supabase, user.id, TRADER_PROFILE_KEY);
    if (!row?.value) {
      return NextResponse.json({ error: "No profile found" }, { status: 404 });
    }

    const profile = normalizeTraderProfile(JSON.parse(row.value));
    const next = normalizeTraderProfile({
      ...profile,
      onboardingCompletedAt: null,
    });

    await upsertUserAppData(
      supabase,
      user.id,
      TRADER_PROFILE_KEY,
      JSON.stringify({ ...next, updatedAt: new Date().toISOString() })
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("dev/replay-onboarding:", err);
    return NextResponse.json(
      { error: err.message || "Reset failed" },
      { status: 500 }
    );
  }
}
