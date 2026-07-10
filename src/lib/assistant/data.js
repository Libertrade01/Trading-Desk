const KEY_PREFIXES = {
  readiness: "premarket-checkin-",
  plan: "daily-plan-",
  journal: "postmarket-review-",
};

function parseAppDataValue(raw) {
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? JSON.parse(parsed) : parsed;
  } catch {
    return null;
  }
}

function extractDateFromKey(key, prefix) {
  if (!key?.startsWith(prefix)) return null;
  const date = key.slice(prefix.length);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

export { KEY_PREFIXES };

export async function loadAppDataForDate(supabase, userId, prefix, date) {
  const { getUserAppData } = await import("@/lib/app-data-server");
  const row = await getUserAppData(supabase, userId, `${prefix}${date}`);
  if (!row?.value) return null;
  return parseAppDataValue(row.value);
}

export async function listSessionDatesForUser(supabase, userId, { from, to } = {}) {
  const { data, error } = await supabase
    .from("app_data")
    .select("key")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  const dates = new Set();
  for (const row of data || []) {
    for (const prefix of Object.values(KEY_PREFIXES)) {
      const date = extractDateFromKey(row.key, prefix);
      if (!date) continue;
      if (from && date < from) continue;
      if (to && date > to) continue;
      dates.add(date);
    }
  }

  return [...dates].sort().reverse();
}

export async function loadTradesForUser(supabase, userId, { from, to, limit = 100 } = {}) {
  const { withUserTradesQuery } = await import("@/lib/trades-query");
  let query = withUserTradesQuery(supabase.from("trades").select("*"), userId);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  const { data, error } = await query.order("entry_time", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}
