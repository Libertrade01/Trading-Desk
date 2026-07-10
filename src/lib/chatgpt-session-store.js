import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Shared session store for Login with ChatGPT (Vercel-safe).
 * Implements KeyValueStore for createChatGPTHandler().
 */
export const supabaseSessionStore = {
  async get(id) {
    const admin = getAdminClient();
    if (!admin) return undefined;

    const { data, error } = await admin
      .from("chatgpt_sessions")
      .select("data, expires_at")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return undefined;

    if (new Date(data.expires_at).getTime() <= Date.now()) {
      await this.delete(id);
      return undefined;
    }

    return data.data;
  },

  async set(id, value, options = {}) {
    const admin = getAdminClient();
    if (!admin) return;

    const ttlMs = options.ttlMs ?? 30 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();

    const { error } = await admin.from("chatgpt_sessions").upsert(
      {
        id,
        data: value,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error("chatgpt_sessions/set:", error.message);
    }
  },

  async delete(id) {
    const admin = getAdminClient();
    if (!admin) return;

    const { error } = await admin.from("chatgpt_sessions").delete().eq("id", id);
    if (error) {
      console.error("chatgpt_sessions/delete:", error.message);
    }
  },
};

/**
 * Shared KV store for ChatGPT handler rate limits (Vercel-safe).
 */
export const supabaseChatgptKvStore = {
  async get(key) {
    const admin = getAdminClient();
    if (!admin) return undefined;

    const { data, error } = await admin
      .from("chatgpt_kv")
      .select("value, expires_at")
      .eq("key", key)
      .maybeSingle();

    if (error || !data) return undefined;

    if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
      await this.delete(key);
      return undefined;
    }

    return data.value;
  },

  async set(key, value, options = {}) {
    const admin = getAdminClient();
    if (!admin) return;

    const expiresAt = options.ttlMs
      ? new Date(Date.now() + options.ttlMs).toISOString()
      : null;

    const { error } = await admin.from("chatgpt_kv").upsert(
      {
        key,
        value,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) {
      console.error("chatgpt_kv/set:", error.message);
    }
  },

  async delete(key) {
    const admin = getAdminClient();
    if (!admin) return;

    const { error } = await admin.from("chatgpt_kv").delete().eq("key", key);
    if (error) {
      console.error("chatgpt_kv/delete:", error.message);
    }
  },
};
