import { createClient } from "./supabase/client";

/**
 * Returns the authenticated user's id or throws if not signed in.
 * Client-side helper for scoping storage and inserts.
 */
export async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await createClient().auth.getUser();
  if (error || !user) {
    throw new Error("Not authenticated");
  }
  return user.id;
}

/**
 * Returns the authenticated user or null (no throw).
 */
export async function getCurrentUser() {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  return user;
}
