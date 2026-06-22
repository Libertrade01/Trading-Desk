import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  deleteTradeForUser,
  updateTradeForUser,
} from "@/lib/trades-server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid trade id" }, { status: 400 });
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

  const { id: _id, user_id: _userId, ...updates } = body;
  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  try {
    const data = await updateTradeForUser(supabase, user.id, id, updates);
    return NextResponse.json(data);
  } catch (err) {
    console.error("trades/patch:", err);
    const status = err.message === "Trade not found" ? 404 : 500;
    return NextResponse.json(
      { error: err.message || "Update failed" },
      { status }
    );
  }
}

export async function DELETE(_request, { params }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid trade id" }, { status: 400 });
  }

  try {
    await deleteTradeForUser(supabase, user.id, id);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("trades/delete:", err);
    const status = err.message === "Trade not found" ? 404 : 500;
    return NextResponse.json(
      { error: err.message || "Delete failed" },
      { status }
    );
  }
}
