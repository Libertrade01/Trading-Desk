import { supabase } from "./supabase";

export async function fetchAnalyticsTrades({ dateFrom, dateTo, accountType } = {}) {
  let query = supabase.from("trades").select("*");
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
  let query = supabase.from("trading_days").select("*");
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
