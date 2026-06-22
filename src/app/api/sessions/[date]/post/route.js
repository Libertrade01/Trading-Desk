import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertUserAppData } from "@/lib/app-data-server";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(_request, { params }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date } = await params;
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const key = `postmarket-review-${date}`;
  const { data, error } = await supabase
    .from("app_data")
    .select("value")
    .eq("user_id", user.id)
    .eq("key", key)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("sessions/post/get:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.value) {
    return NextResponse.json({ review: null });
  }

  try {
    return NextResponse.json({ review: JSON.parse(data.value) });
  } catch {
    return NextResponse.json({ error: "Corrupt review data" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date } = await params;
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
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

  const key = `postmarket-review-${date}`;
  const value = JSON.stringify(body);

  try {
    await upsertUserAppData(supabase, user.id, key, value);
    return NextResponse.json({ ok: true, date, key });
  } catch (err) {
    console.error("sessions/post/put:", err);
    return NextResponse.json(
      { error: err.message || "Save failed" },
      { status: 500 }
    );
  }
}
