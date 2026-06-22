#!/usr/bin/env node
/** Apply SQL file to live Supabase via Management API. */
import fs from "node:fs";
import path from "node:path";

import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_REF = "uzbsuyknfnzqwdpzspfs";
const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("Usage: node scripts/apply-sql-live.mjs <path-to.sql>");
  process.exit(1);
}

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

const token = process.env.SUPABASE_ACCESS_TOKEN || loadEnvLocal().SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const query = fs.readFileSync(path.resolve(ROOT, sqlFile), "utf8");
const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query }),
});

const text = await res.text();
if (!res.ok) {
  console.error("Failed:", res.status, text.slice(0, 800));
  process.exit(1);
}
console.log("Applied:", sqlFile);
