import { supabase } from "./supabase";
import { getCurrentUserId } from "./user-storage";
import { withUserTradesQuery } from "./trades-query";

async function assertTradeOwned(tradeId, userId) {
  const { data, error } = await withUserTradesQuery(
    supabase.from("trades").select("id").eq("id", tradeId),
    userId
  ).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Trade not found");
}

export async function updateTrade(tradeId, updates) {
  const userId = await getCurrentUserId();
  const { data, error } = await withUserTradesQuery(
    supabase.from("trades").update(updates).eq("id", tradeId),
    userId
  )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchTradeNotes(tradeId) {
  const userId = await getCurrentUserId();
  await assertTradeOwned(tradeId, userId);
  const { data, error } = await supabase
    .from("trade_notes")
    .select("notes")
    .eq("trade_id", tradeId)
    .maybeSingle();
  if (error) throw error;
  return data?.notes || "";
}

export async function saveTradeNotes(tradeId, notes) {
  const userId = await getCurrentUserId();
  await assertTradeOwned(tradeId, userId);
  const { error } = await supabase.from("trade_notes").upsert(
    { trade_id: tradeId, notes, updated_at: new Date().toISOString() },
    { onConflict: "trade_id" }
  );
  if (error) throw error;
}

export async function deleteTrade(tradeId) {
  const userId = await getCurrentUserId();
  await assertTradeOwned(tradeId, userId);
  await supabase.from("trade_tag_links").delete().eq("trade_id", tradeId);
  await supabase.from("trade_notes").delete().eq("trade_id", tradeId);
  const { error } = await withUserTradesQuery(
    supabase.from("trades").delete().eq("id", tradeId),
    userId
  );
  if (error) throw error;
}
