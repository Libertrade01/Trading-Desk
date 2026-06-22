import { supabase } from "./supabase";
import { getCurrentUserId } from "./user-storage";
import { withUserTradesQuery } from "./trades-query";

export async function fetchAnalyticsTrades({ dateFrom, dateTo, accountType } = {}) {
  const userId = await getCurrentUserId();
  let query = withUserTradesQuery(supabase.from("trades").select("*"), userId);
  if (dateFrom) query = query.gte("date", dateFrom);
  if (dateTo) query = query.lte("date", dateTo);
  if (accountType && accountType !== "all") {
    query = query.eq("account_type", accountType);
  }
  const { data, error } = await query.order("entry_time", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchTradingDays({ dateFrom, dateTo } = {}) {
  const userId = await getCurrentUserId();
  let query = supabase.from("trading_days").select("*").eq("user_id", userId);
  if (dateFrom) query = query.gte("date", dateFrom);
  if (dateTo) query = query.lte("date", dateTo);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/** Filter trades to active accounts by name (matches analytics chip behaviour). */
export function filterTradesByAccounts(trades, accounts) {
  const active = (accounts || []).filter((a) => a.active !== false);
  if (!active.length || active.length === accounts.length) return trades;
  const names = new Set(active.map((a) => a.name));
  return trades.filter((t) => !t.account_name || names.has(t.account_name));
}
