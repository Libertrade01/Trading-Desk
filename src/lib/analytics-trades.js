import { supabase } from "./supabase";

export async function updateTrade(tradeId, updates) {
  const { data, error } = await supabase
    .from("trades")
    .update(updates)
    .eq("id", tradeId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchTradeNotes(tradeId) {
  const { data, error } = await supabase
    .from("trade_notes")
    .select("notes")
    .eq("trade_id", tradeId)
    .maybeSingle();
  if (error) throw error;
  return data?.notes || "";
}

export async function saveTradeNotes(tradeId, notes) {
  const { error } = await supabase.from("trade_notes").upsert(
    { trade_id: tradeId, notes, updated_at: new Date().toISOString() },
    { onConflict: "trade_id" }
  );
  if (error) throw error;
}

export async function deleteTrade(tradeId) {
  await supabase.from("trade_tag_links").delete().eq("trade_id", tradeId);
  await supabase.from("trade_notes").delete().eq("trade_id", tradeId);
  const { error } = await supabase.from("trades").delete().eq("id", tradeId);
  if (error) throw error;
}
