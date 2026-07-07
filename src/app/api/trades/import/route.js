import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeTradesImport } from "@/lib/rtrader-import";

export async function POST(request) {
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

  const { trades, account } = body;
  if (!Array.isArray(trades)) {
    return NextResponse.json({ error: "trades must be an array" }, { status: 400 });
  }

  try {
    const count = await executeTradesImport(
      supabase,
      user.id,
      trades,
      account
    );
    return NextResponse.json({ count });
  } catch (err) {
    console.error("trades/import:", err);
    return NextResponse.json(
      { error: err.message || "Import failed" },
      { status: 500 }
    );
  }
}
