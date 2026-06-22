import { getSupabaseBrowserClient } from "./supabase/client";
import { getCurrentUserId } from "./user-storage";

export { getSupabaseBrowserClient };

/** @deprecated Prefer getSupabaseBrowserClient() — kept for existing imports */
export const supabase = getSupabaseBrowserClient();

async function upsertAppDataRow(userId, key, value) {
  const client = getSupabaseBrowserClient();
  const now = new Date().toISOString();

  const { data: rows, error: selectError } = await client
    .from("app_data")
    .select("id")
    .eq("user_id", userId)
    .eq("key", key)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (selectError) {
    throw new Error(selectError.message || "Storage read failed");
  }

  const existing = rows?.[0];

  if (existing?.id) {
    const { data, error } = await client
      .from("app_data")
      .update({ value, updated_at: now })
      .eq("id", existing.id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message || "Storage update failed");
    return { key, value: data.value };
  }

  const { data, error } = await client
    .from("app_data")
    .insert({ user_id: userId, key, value, updated_at: now })
    .select()
    .single();
  if (error) throw new Error(error.message || "Storage insert failed");
  return { key, value: data.value };
}

/** Read a shared system row (user_id null). Requires auth + app_data_select_system RLS. */
export async function getSystemAppData(key) {
  const { data, error } = await getSupabaseBrowserClient()
    .from("app_data")
    .select("value")
    .eq("key", key)
    .is("user_id", null)
    .maybeSingle();
  if (error || !data) return null;
  return { key, value: data.value };
}

export const storage = {
  async get(key) {
    const userId = await getCurrentUserId();
    const { data, error } = await getSupabaseBrowserClient()
      .from("app_data")
      .select("value")
      .eq("user_id", userId)
      .eq("key", key)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return { key, value: data.value };
  },

  async set(key, value) {
    const userId = await getCurrentUserId();
    try {
      return await upsertAppDataRow(userId, key, value);
    } catch (error) {
      console.error("Storage set error:", error);
      throw error;
    }
  },

  async delete(key) {
    const userId = await getCurrentUserId();
    const { error } = await getSupabaseBrowserClient()
      .from("app_data")
      .delete()
      .eq("user_id", userId)
      .eq("key", key);
    if (error) {
      console.error("Storage delete error:", error);
      return null;
    }
    return { key, deleted: true };
  },

  async list(prefix) {
    const userId = await getCurrentUserId();
    const { data, error } = await getSupabaseBrowserClient()
      .from("app_data")
      .select("key")
      .eq("user_id", userId)
      .like("key", `${prefix}%`);
    if (error) {
      console.error("Storage list error:", error);
      return { keys: [] };
    }
    return { keys: (data || []).map((d) => d.key) };
  },
};
