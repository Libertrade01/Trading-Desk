import { getSupabaseBrowserClient } from "./supabase/client";
import { getCurrentUserId } from "./user-storage";

export { getSupabaseBrowserClient };

/** @deprecated Prefer getSupabaseBrowserClient() — kept for existing imports */
export const supabase = getSupabaseBrowserClient();

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
      .maybeSingle();
    if (error || !data) return null;
    return { key, value: data.value };
  },

  async set(key, value) {
    const userId = await getCurrentUserId();
    const { data, error } = await getSupabaseBrowserClient()
      .from("app_data")
      .upsert(
        { user_id: userId, key, value, updated_at: new Date().toISOString() },
        { onConflict: "user_id,key" }
      )
      .select()
      .single();
    if (error) {
      console.error("Storage set error:", error);
      return null;
    }
    return { key, value: data.value };
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
