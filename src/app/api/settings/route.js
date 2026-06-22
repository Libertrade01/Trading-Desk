import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TRADER_SETTINGS_KEY } from "@/lib/trader-settings";
import { upsertUserAppData } from "@/lib/app-data-server";

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

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
  }

  const value = JSON.stringify({
    ...body,
    updatedAt: new Date().toISOString(),
  });

  try {
    await upsertUserAppData(supabase, user.id, TRADER_SETTINGS_KEY, value);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("settings/put:", err);
    return NextResponse.json(
      { error: err.message || "Save failed" },
      { status: 500 }
    );
  }
}
