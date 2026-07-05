#!/usr/bin/env node
/**
 * Local dev only: mint a one-time magic link without sending email (service role).
 * Usage: node scripts/dev-login-link.mjs [email]
 * Default email: FOUNDER_EMAIL from .env.local
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const out = {};
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return out;
}

const env = loadEnv();
const email = process.argv[2] || env.FOUNDER_EMAIL;
if (!email) {
  console.error("Pass email or set FOUNDER_EMAIL in .env.local");
  process.exit(1);
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email,
  options: { redirectTo: "http://localhost:3000/auth/callback" },
});

if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}

console.log(data.properties.action_link);
