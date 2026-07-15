import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function hasOrphanRows(admin) {
  const { count, error } = await admin
    .from("app_data")
    .select("*", { count: "exact", head: true })
    .is("user_id", null);
  if (error) throw error;
  return (count ?? 0) > 0;
}

async function anyUserScopedData(admin) {
  const { count, error } = await admin
    .from("app_data")
    .select("*", { count: "exact", head: true })
    .not("user_id", "is", null);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/**
 * Determine if this user is the configured founder (email match only).
 */
export function isFounderUser(user) {
  if (!user?.email) return false;
  const founderEmail = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
  if (!founderEmail) return false;
  return user.email.trim().toLowerCase() === founderEmail;
}

/**
 * Determine if this user may claim orphan (user_id null) rows.
 * - FOUNDER_EMAIL set → only that email
 * - FOUNDER_EMAIL unset → first eligible login when no user-scoped data exists
 */
export async function isEligibleFounder(user, admin) {
  const founderEmail = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
  if (founderEmail) {
    return user.email?.toLowerCase() === founderEmail;
  }
  // Never allow a public production account to claim legacy founder data when
  // the allowlisted founder email has been omitted from the environment.
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  const scoped = await anyUserScopedData(admin);
  return !scoped;
}

/**
 * Attach orphan rows to the founder user. Requires service role (server-only).
 */
export async function migrateFounderDataForUser(user) {
  const admin = getAdminClient();
  if (!admin) {
    return { migrated: false, reason: "no_service_role" };
  }

  const eligible = await isEligibleFounder(user, admin);
  if (!eligible) {
    return { migrated: false, reason: "not_founder" };
  }

  const orphans = await hasOrphanRows(admin);
  if (!orphans) {
    return { migrated: false, reason: "no_orphans" };
  }

  const uid = user.id;

  const tables = ["app_data", "trades", "trading_days"];
  for (const table of tables) {
    const { error } = await admin
      .from(table)
      .update({ user_id: uid })
      .is("user_id", null);
    if (error && !error.message?.includes("does not exist")) {
      throw error;
    }
  }

  return { migrated: true, userId: uid };
}
