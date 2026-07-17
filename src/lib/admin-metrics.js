import "server-only";
import { getSupabaseAdminClient } from "./supabase/admin";
import { buildAdminSnapshot } from "./admin-metrics-helpers";
import { loadVercelTraffic } from "./vercel-analytics";

const PAGE_SIZE = 1000;

async function listAllAuthUsers(admin) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw error;
    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return users;
}

async function listAllRows(queryPage) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await queryPage(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

export async function loadAdminMetrics() {
  const admin = getSupabaseAdminClient();
  const now = new Date();
  const oldestTradeDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [users, profiles, sessions, trades, traffic] = await Promise.all([
    listAllAuthUsers(admin),
    listAllRows((from, to) =>
      admin
        .from("app_data")
        .select("user_id,value,updated_at")
        .eq("key", "trader-profile")
        .not("user_id", "is", null)
        .order("updated_at", { ascending: false })
        .range(from, to)
    ),
    listAllRows((from, to) =>
      admin
        .from("app_data")
        .select("user_id,key,updated_at")
        .or("key.like.premarket-checkin-%,key.like.daily-plan-%,key.like.postmarket-review-%")
        .not("user_id", "is", null)
        .order("updated_at", { ascending: false })
        .range(from, to)
    ),
    listAllRows((from, to) =>
      admin
        .from("trades")
        .select("user_id,date,entry_time")
        .not("user_id", "is", null)
        .gte("entry_time", oldestTradeDate)
        .order("entry_time", { ascending: false })
        .range(from, to)
    ),
    loadVercelTraffic(now),
  ]);

  return {
    ...buildAdminSnapshot({ users, profiles, sessions, trades, now }),
    traffic,
  };
}
