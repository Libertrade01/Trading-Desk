import { withUserTradesQuery } from "./trades-query";

async function assertTradeOwnedForUser(supabase, userId, tradeId) {
  const { data, error } = await withUserTradesQuery(
    supabase.from("trades").select("id").eq("id", tradeId),
    userId
  ).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Trade not found");
}

export async function updateTradeForUser(supabase, userId, tradeId, updates) {
  const { data, error } = await withUserTradesQuery(
    supabase.from("trades").update(updates).eq("id", tradeId),
    userId
  )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteTradeForUser(supabase, userId, tradeId) {
  await assertTradeOwnedForUser(supabase, userId, tradeId);
  const tradeIdText = String(tradeId);

  const { error: tagError } = await supabase
    .from("trade_tag_links")
    .delete()
    .eq("trade_id", tradeIdText);
  if (tagError) throw new Error(tagError.message);

  const { error: notesError } = await supabase
    .from("trade_notes")
    .delete()
    .eq("trade_id", tradeIdText);
  if (notesError) throw new Error(notesError.message);

  const { error } = await withUserTradesQuery(
    supabase.from("trades").delete().eq("id", tradeId),
    userId
  );
  if (error) throw new Error(error.message);
}

export async function saveTradeNotesForUser(supabase, userId, tradeId, notes) {
  await assertTradeOwnedForUser(supabase, userId, tradeId);
  const tradeIdText = String(tradeId);
  const { error } = await supabase.from("trade_notes").upsert(
    { trade_id: tradeIdText, notes, updated_at: new Date().toISOString() },
    { onConflict: "trade_id" }
  );
  if (error) throw new Error(error.message);
}
