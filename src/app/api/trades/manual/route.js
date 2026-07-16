import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateManualTrades } from "@/lib/manual-trades";
import { withUserTradesQuery } from "@/lib/trades-query";
import { easternDateFromInstant } from "@/lib/trade-time";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

  const date = String(body?.date || "");
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "Invalid trading date" }, { status: 400 });
  }

  const accountName = String(body?.account?.name || "Default Account").trim().slice(0, 100);
  const accountType = String(body?.account?.account_type || "").trim().slice(0, 40) || null;

  let trades;
  try {
    trades = validateManualTrades(body?.trades);
    if (trades.some((trade) => easternDateFromInstant(new Date(trade.entryTime)) !== date)) {
      throw new Error("Every trade entry time must fall on the selected trading day.");
    }
    if (trades.some((trade) => !trade.setup)) {
      throw new Error("Choose a setup for every trade, including Improvised or Invalid when appropriate.");
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = trades.map((trade) => ({
    user_id: user.id,
    broker_trade_id: `manual:${crypto.randomUUID()}`,
    entry_time: trade.entryTime,
    exit_time: trade.exitTime,
    date,
    instrument: trade.instrument,
    direction: trade.direction,
    quantity: trade.quantity,
    entry_price: trade.entryPrice,
    exit_price: trade.exitPrice,
    gross_pnl: trade.grossPnl,
    commission: trade.commission,
    net_pnl: trade.netPnl,
    platform: "manual",
    account_name: accountName,
    account_type: accountType,
    stop_loss_points: trade.stopLossPoints,
    setup: trade.setup,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("trades")
    .insert(rows)
    .select("id");
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const insertedIds = (inserted || []).map((row) => row.id);
  let deleteQuery = withUserTradesQuery(
    supabase.from("trades").delete().eq("date", date).eq("account_name", accountName),
    user.id,
  );
  if (insertedIds.length) deleteQuery = deleteQuery.not("id", "in", `(${insertedIds.join(",")})`);
  const { error: deleteError } = await deleteQuery;

  if (deleteError) {
    await withUserTradesQuery(supabase.from("trades").delete().in("id", insertedIds), user.id);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ count: rows.length });
}
