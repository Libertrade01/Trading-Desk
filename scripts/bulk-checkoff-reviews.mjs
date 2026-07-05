#!/usr/bin/env node
/**
 * Bulk mark REPLAY + DATABASE journal checkoffs complete for saved close loops.
 *
 * Usage:
 *   node scripts/bulk-checkoff-reviews.mjs [--dry-run] [--through YYYY-MM-DD] [--email user@example.com]
 *
 * Defaults:
 *   --through today (local calendar)
 *   --email FOUNDER_EMAIL from .env.local
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const POST_PREFIX = "postmarket-review-";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function loadEnv() {
  const out = {};
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    let val = trimmed.slice(eq + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[trimmed.slice(0, eq)] = val;
  }
  return out;
}

function parseArgs(argv) {
  const opts = { dryRun: false, through: null, email: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--through") opts.through = argv[++i];
    else if (arg === "--email") opts.email = argv[++i];
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: node scripts/bulk-checkoff-reviews.mjs [--dry-run] [--through YYYY-MM-DD] [--email user@example.com]`);
      process.exit(0);
    }
  }
  return opts;
}

function todayKeyLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseStorageValue(raw) {
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? JSON.parse(parsed) : parsed;
  } catch {
    return null;
  }
}

function hasJournalReviewPending(post) {
  if (!post?.savedAt) return false;
  if (post.noTradeToday) return false;
  return !post.replaySequenceReviewed || !post.setupsScreenshottedSaved;
}

function pendingSummary(post) {
  const parts = [];
  if (!post.replaySequenceReviewed) parts.push("Replay");
  if (!post.setupsScreenshottedSaved) parts.push("Database");
  return parts.join(" · ") || "none";
}

function dateFromPostKey(key) {
  if (!key?.startsWith(POST_PREFIX)) return null;
  const date = key.slice(POST_PREFIX.length);
  return DATE_RE.test(date) ? date : null;
}

const env = loadEnv();
const opts = parseArgs(process.argv.slice(2));
const throughDate = opts.through || todayKeyLocal();
const email = (opts.email || env.FOUNDER_EMAIL || "").trim().toLowerCase();

if (!DATE_RE.test(throughDate)) {
  console.error(`Invalid --through date: ${throughDate}`);
  process.exit(1);
}

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

if (!email) {
  console.error("Pass --email or set FOUNDER_EMAIL in .env.local");
  process.exit(1);
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: userList, error: userError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (userError) {
  console.error("Failed to list users:", userError.message);
  process.exit(1);
}

const user = (userList?.users || []).find((u) => u.email?.trim().toLowerCase() === email);
if (!user) {
  console.error(`No auth user found for email: ${email}`);
  process.exit(1);
}

console.log(`User: ${user.email} (${user.id})`);
console.log(`Through date: ${throughDate}`);
console.log(`Mode: ${opts.dryRun ? "DRY RUN (no writes)" : "APPLY"}`);
console.log("");

const { data: rows, error: fetchError } = await admin
  .from("app_data")
  .select("id, key, value, updated_at")
  .eq("user_id", user.id)
  .like("key", `${POST_PREFIX}%`);

if (fetchError) {
  console.error("Failed to fetch app_data:", fetchError.message);
  process.exit(1);
}

const pending = [];
for (const row of rows || []) {
  const date = dateFromPostKey(row.key);
  if (!date || date > throughDate) continue;

  const post = parseStorageValue(row.value);
  if (!post || !hasJournalReviewPending(post)) continue;

  pending.push({
    id: row.id,
    key: row.key,
    date,
    post,
    summary: pendingSummary(post),
  });
}

pending.sort((a, b) => a.date.localeCompare(b.date));

if (!pending.length) {
  console.log("No pending replay/database checkoffs found through", throughDate);
  process.exit(0);
}

console.log(`Found ${pending.length} session(s) with pending checkoffs:\n`);
for (const item of pending) {
  console.log(`  ${item.date}  —  ${item.summary}`);
}
console.log("");

if (opts.dryRun) {
  console.log("Dry run complete. Re-run without --dry-run to apply updates.");
  process.exit(0);
}

const now = new Date().toISOString();
let updated = 0;
const updatedDates = [];

for (const item of pending) {
  const nextPost = {
    ...item.post,
    replaySequenceReviewed: true,
    setupsScreenshottedSaved: true,
  };
  const value = JSON.stringify(nextPost);

  const { error: updateError } = await admin
    .from("app_data")
    .update({ value, updated_at: now })
    .eq("id", item.id)
    .eq("user_id", user.id);

  if (updateError) {
    console.error(`Failed to update ${item.date}:`, updateError.message);
    process.exit(1);
  }

  updated += 1;
  updatedDates.push(item.date);
}

console.log(`Updated ${updated} session(s):`);
for (const date of updatedDates) {
  console.log(`  ✓ ${date}`);
}

// Verify no pending remain through throughDate
const stillPending = [];
for (const row of rows || []) {
  const date = dateFromPostKey(row.key);
  if (!date || date > throughDate) continue;
  const post = parseStorageValue(row.value);
  if (!post?.savedAt || post.noTradeToday) continue;
  const wasPending = pending.some((p) => p.id === row.id);
  const current = wasPending
    ? { ...post, replaySequenceReviewed: true, setupsScreenshottedSaved: true }
    : post;
  if (hasJournalReviewPending(current)) stillPending.push(date);
}

if (stillPending.length) {
  console.warn("\nWarning: still pending after update:", stillPending.join(", "));
  process.exit(1);
}

console.log("\nVerification passed — no replay/database checkoffs remain through", throughDate);
