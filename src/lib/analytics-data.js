import { getCurrentUserId } from "./user-storage";
import { getSupabaseBrowserClient } from "./supabase/client";
import { computeReadinessScore } from "./premarket-scoring";

const PREMARKET_PREFIX = "premarket-checkin-";

function parseStorageValue(raw) {
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? JSON.parse(parsed) : parsed;
  } catch {
    return null;
  }
}

export async function fetchAnalyticsTrades({ dateFrom, dateTo } = {}) {
  const params = new URLSearchParams();
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  const qs = params.toString();
  const res = await fetch(`/api/trades${qs ? `?${qs}` : ""}`);
  if (res.status === 401) {
    return [];
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to load trades");
  }
  const data = await res.json();
  return data.trades || [];
}

export async function fetchReadinessScores({ dateFrom, dateTo } = {}) {
  let userId;
  try {
    userId = await getCurrentUserId();
  } catch {
    return [];
  }

  let query = getSupabaseBrowserClient()
    .from("app_data")
    .select("key,value")
    .eq("user_id", userId)
    .like("key", `${PREMARKET_PREFIX}%`);
  if (dateFrom) query = query.gte("key", `${PREMARKET_PREFIX}${dateFrom}`);
  if (dateTo) query = query.lte("key", `${PREMARKET_PREFIX}${dateTo}`);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).flatMap((row) => {
    const date = row.key.replace(PREMARKET_PREFIX, "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
    const value = parseStorageValue(row.value);
    if (!value?.savedAt) return [];
    const readinessScore = value.readinessScore ?? computeReadinessScore(value).composite;
    if (readinessScore == null || Number.isNaN(Number(readinessScore))) return [];
    return [{ date, readinessScore: Number(readinessScore) }];
  });
}

export async function fetchTradingDays({ dateFrom, dateTo } = {}) {
  let userId;
  try {
    userId = await getCurrentUserId();
  } catch {
    return [];
  }
  let query = getSupabaseBrowserClient().from("trading_days").select("*").eq("user_id", userId);
  if (dateFrom) query = query.gte("date", dateFrom);
  if (dateTo) query = query.lte("date", dateTo);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchCloseLoopSummaries({ dateFrom, dateTo } = {}) {
  let userId;
  try {
    userId = await getCurrentUserId();
  } catch {
    return [];
  }

  let query = getSupabaseBrowserClient()
    .from("app_data")
    .select("key,value")
    .eq("user_id", userId)
    .like("key", "postmarket-review-%");
  if (dateFrom) query = query.gte("key", `postmarket-review-${dateFrom}`);
  if (dateTo) query = query.lte("key", `postmarket-review-${dateTo}`);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).flatMap((row) => {
    try {
      const value = JSON.parse(row.value);
      const date = row.key.replace("postmarket-review-", "");
      return value && !value.noTradeToday ? [{ ...value, date }] : [];
    } catch {
      return [];
    }
  });
}

/** Filter trades to active accounts by name (matches analytics chip behaviour). */
export function filterTradesByAccounts(trades, accounts) {
  const active = (accounts || []).filter((a) => a.active !== false);
  if (!active.length || active.length === accounts.length) return trades;
  const names = new Set(active.map((a) => a.name));
  return trades.filter((t) => !t.account_name || names.has(t.account_name));
}
