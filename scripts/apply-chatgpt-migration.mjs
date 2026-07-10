import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile(filename) {
  try {
    const text = readFileSync(resolve(root, filename), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef =
  process.env.SUPABASE_PROJECT_REF ||
  readFileSync(resolve(root, "supabase/.temp/project-ref"), "utf8").trim();
const sql = readFileSync(
  resolve(root, "supabase/migrations/20250709120000_chatgpt_sessions.sql"),
  "utf8"
);

if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN in .env.local");
  process.exit(1);
}

const response = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  }
);

const body = await response.text();
if (!response.ok) {
  console.error("Migration failed:", response.status, body);
  process.exit(1);
}

console.log("Migration applied successfully.");
if (body) console.log(body);
