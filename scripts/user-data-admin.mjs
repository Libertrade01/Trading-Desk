import { createClient } from "@supabase/supabase-js";

export function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function findUserByEmail(admin, email) {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === target);
    if (match) return match;
    if (data.users.length < 1000) break;
  }
  throw new Error(`No account found for ${email}.`);
}

export async function selectByUser(admin, table, userId) {
  const { data, error } = await admin.from(table).select("*").eq("user_id", userId);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

export async function selectForTradeIds(admin, table, tradeIds) {
  if (!tradeIds.length) return [];
  const rows = [];
  for (let index = 0; index < tradeIds.length; index += 500) {
    const chunk = tradeIds.slice(index, index + 500);
    const { data, error } = await admin.from(table).select("*").in("trade_id", chunk);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
  }
  return rows;
}
