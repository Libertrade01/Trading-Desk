#!/usr/bin/env node
/**
 * Audit RLS on live Supabase (read-only). Loads SUPABASE_ACCESS_TOKEN from .env.local.
 * Does not print secrets.
 */
import fs from "node:fs";
import path from "node:path";

import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ||
  loadEnvLocal().SUPABASE_PROJECT_REF ||
  "";

function loadEnvLocal() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return {};
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    let val = t.slice(eq + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[t.slice(0, eq)] = val;
  }
  return env;
}

if (!PROJECT_REF) {
  console.error("Missing SUPABASE_PROJECT_REF in env or .env.local");
  process.exit(1);
}

async function query(sql) {
  const token = process.env.SUPABASE_ACCESS_TOKEN || loadEnvLocal().SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error("Missing SUPABASE_ACCESS_TOKEN in env or .env.local");
    process.exit(1);
  }
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query/read-only`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const text = await res.text();
  if (!res.ok) {
    console.error("Query failed:", res.status, text.slice(0, 500));
    process.exit(1);
  }
  return JSON.parse(text);
}

async function anonProbe() {
  const env = loadEnvLocal();
  let url = env.NEXT_PUBLIC_SUPABASE_URL;
  let anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    const token = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
    if (token) {
      const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const keys = await res.json();
        const anonKey = keys.find((k) => k.name === "anon" || k.type === "anon");
        if (anonKey?.api_key) {
          anon = anonKey.api_key;
          url = url || `https://${PROJECT_REF}.supabase.co`;
        }
      }
    }
  }
  if (!url || !anon) {
    return { skipped: true, reason: "no anon keys available" };
  }
  const tables = [
    "trades",
    "app_data",
    "intraday_journal",
    "weekly_reviews",
    "legal_acceptances",
  ];
  const out = {};
  for (const table of tables) {
    const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=5`, {
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
    });
    const body = await res.json().catch(() => null);
    out[table] = {
      status: res.status,
      rowCount: Array.isArray(body) ? body.length : null,
      error: body?.message || body?.error || null,
    };
  }
  return out;
}

const rlsSql = `
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND c.relname = ANY(ARRAY['app_data','trades','trading_days','trade_notes','trade_tag_links','legal_acceptances'])
ORDER BY 1;
`;

const policiesSql = `
SELECT tablename, policyname, roles::text AS roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = ANY(ARRAY['app_data','trades','trading_days','trade_notes','trade_tag_links','legal_acceptances'])
ORDER BY tablename, policyname;
`;

const riskySql = `
SELECT tablename, policyname, roles::text AS roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND roles::text NOT LIKE '%service_role%'
  AND (
    policyname ILIKE '%allow all%'
    OR policyname ILIKE 'auth all%'
    OR roles::text ILIKE '%anon%'
    OR qual = 'true'
    OR with_check = 'true'
  )
  AND tablename NOT IN ('app_data','trades','trading_days','trade_notes','trade_tag_links','legal_acceptances');
`;

const migrationsSql = `
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;
`;

const columnsSql = `
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('trades','app_data','trading_days','trade_notes','trade_tag_links','legal_acceptances')
  AND column_name IN ('user_id','id','trade_id')
ORDER BY table_name, column_name;
`;

console.log("=== RLS enabled (public tables) ===");
console.table(await query(rlsSql));

console.log("\n=== Policies ===");
console.table(await query(policiesSql));

console.log("\n=== Risky / open policies (should be empty) ===");
const risky = await query(riskySql);
console.table(risky);
if (Array.isArray(risky) && risky.length === 0) {
  console.log("(none, good)");
}

console.log("\n=== Applied migrations ===");
console.table(await query(migrationsSql));

console.log("\n=== Column types (user_id) ===");
console.table(await query(columnsSql));

console.log("\n=== Anon key probe (no user session) ===");
console.log(await anonProbe());
