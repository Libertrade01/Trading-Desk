/**
 * Reliable app_data write — select-then-update/insert (avoids partial-index upsert issues).
 */
export async function upsertUserAppData(supabase, userId, key, value) {
  const now = new Date().toISOString();

  const { data: rows, error: selectError } = await supabase
    .from("app_data")
    .select("id")
    .eq("user_id", userId)
    .eq("key", key)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (selectError) {
    throw new Error(selectError.message || "Failed to read app_data");
  }

  const existing = rows?.[0];

  if (existing?.id) {
    const { error } = await supabase
      .from("app_data")
      .update({ value, updated_at: now })
      .eq("id", existing.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message || "Failed to update app_data");
    return;
  }

  const { error } = await supabase.from("app_data").insert({
    user_id: userId,
    key,
    value,
    updated_at: now,
  });
  if (error) throw new Error(error.message || "Failed to insert app_data");
}
