import { NextResponse } from "next/server";
import { KEY_PREFIXES } from "@/lib/assistant/data";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [tradesResult, appDataResult] = await Promise.all([
    supabase
      .from("trades")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("app_data")
      .select("key")
      .eq("user_id", user.id),
  ]);

  if (tradesResult.error || appDataResult.error) {
    return NextResponse.json(
      { error: tradesResult.error?.message || appDataResult.error?.message },
      { status: 500 }
    );
  }

  const keys = (appDataResult.data || []).map((row) => row.key);
  const countPrefix = (prefix) => keys.filter((key) => key.startsWith(prefix)).length;

  return NextResponse.json({
    trades: tradesResult.count || 0,
    checkIns: countPrefix(KEY_PREFIXES.readiness),
    plans: countPrefix(KEY_PREFIXES.plan),
    journals: countPrefix(KEY_PREFIXES.journal),
  });
}
