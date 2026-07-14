const checks = [
  ["NEXT_PUBLIC_SUPABASE_URL", (value) => /^https:\/\/.+\.supabase\.co$/.test(value), "must be a Supabase HTTPS URL"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", (value) => value.length > 20, "is missing or too short"],
  ["SUPABASE_SERVICE_ROLE_KEY", (value) => value.length > 20, "is missing or too short"],
  ["NEXT_PUBLIC_APP_URL", (value) => value === "https://libertrade.app", "must equal https://libertrade.app"],
  ["AUTH_DISABLED", (value) => value === "false", "must equal false"],
  ["NEXT_PUBLIC_FEATURE_WIKI", (value) => value === "false", "must equal false on the customer app"],
  ["NEXT_PUBLIC_FEATURE_LEGACY_DESK", (value) => value === "false", "must equal false on the customer app"],
  ["CRON_SECRET", (value) => value.length >= 32, "must contain at least 32 characters"],
  ["FMP_API_KEY", (value) => value.length > 8, "is missing or too short"],
  ["LWC_SECRET", (value) => value.length >= 32, "must contain at least 32 characters"],
];

const failures = [];
for (const [name, validate, message] of checks) {
  const value = process.env[name] || "";
  if (!validate(value)) failures.push(`${name} ${message}`);
}

if (failures.length) {
  console.error("Production environment is not launch ready:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Production environment checks passed.");
