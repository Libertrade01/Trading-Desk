import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertUserAppData, getUserAppData } from "@/lib/app-data-server";
import { isFounderUser } from "@/lib/founder-migration";
import {
  TRADER_PROFILE_KEY,
  normalizeTraderProfile,
  createFounderDefaultProfile,
  createCustomerDefaultProfile,
  validateTraderProfileInput,
} from "@/lib/trader-profile";

async function readProfile(supabase, userId) {
  const row = await getUserAppData(supabase, userId, TRADER_PROFILE_KEY);
  if (!row?.value) return null;
  try {
    return normalizeTraderProfile(JSON.parse(row.value));
  } catch {
    return null;
  }
}

async function writeProfile(supabase, userId, profile) {
  const value = JSON.stringify({
    ...profile,
    updatedAt: new Date().toISOString(),
  });
  await upsertUserAppData(supabase, userId, TRADER_PROFILE_KEY, value);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let profile = await readProfile(supabase, user.id);
    if (!profile) {
      profile = isFounderUser(user)
        ? createFounderDefaultProfile()
        : createCustomerDefaultProfile();
      await writeProfile(supabase, user.id, profile);
    }
    return NextResponse.json(profile);
  } catch (err) {
    console.error("profile/get:", err);
    return NextResponse.json(
      { error: err.message || "Load failed" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateTraderProfileInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  const next = normalizeTraderProfile({
    ...validation.profile,
    profileKind: isFounderUser(user) ? validation.profile.profileKind : "customer",
    showColdTurkeyBlocker: isFounderUser(user)
      ? validation.profile.showColdTurkeyBlocker
      : false,
  });

  try {
    await writeProfile(supabase, user.id, next);
    return NextResponse.json(next);
  } catch (err) {
    console.error("profile/put:", err);
    return NextResponse.json(
      { error: err.message || "Save failed" },
      { status: 500 }
    );
  }
}
