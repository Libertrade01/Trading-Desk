import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withUserTradesQuery } from "@/lib/trades-query";

export async function GET(request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  let query = withUserTradesQuery(supabase.from("trades").select("*"), user.id);
  if (dateFrom) query = query.gte("date", dateFrom);
  if (dateTo) query = query.lte("date", dateTo);

  const { data, error } = await query.order("entry_time", { ascending: false });
  if (error) {
    console.error("trades/list:", error);
    return NextResponse.json({ error: error.message || "Failed to load trades" }, { status: 500 });
  }

  return NextResponse.json({ trades: data || [] });
}
