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
