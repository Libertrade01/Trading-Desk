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
  const res = await fetch(`/api/trades/${tradeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update trade");
  }
  return res.json();
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
  const res = await fetch(`/api/trades/${tradeId}/notes`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to save trade notes");
  }
}

export async function deleteTrade(tradeId) {
  const res = await fetch(`/api/trades/${tradeId}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete trade");
  }
}
