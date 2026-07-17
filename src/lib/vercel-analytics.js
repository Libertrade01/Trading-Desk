import "server-only";
import { summarizeTrafficRows } from "./admin-metrics-helpers";

const PUBLIC_PATH_FILTER = ["/", "/signup", "/login", "/privacy", "/terms", "/cookies"]
  .map((path) => `requestPath eq '${path}'`)
  .join(" or ");

function analyticsConfig() {
  return {
    token: process.env.VERCEL_ANALYTICS_TOKEN || process.env.VERCEL_TOKEN,
    projectId: process.env.VERCEL_ANALYTICS_PROJECT_ID || process.env.VERCEL_PROJECT_ID,
    teamId: process.env.VERCEL_ANALYTICS_TEAM_ID || process.env.VERCEL_TEAM_ID,
  };
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

async function queryVisits(path, params, config) {
  const url = new URL(`https://api.vercel.com/v1/query/web-analytics/visits/${path}`);
  url.searchParams.set("projectId", config.projectId);
  if (config.teamId) url.searchParams.set("teamId", config.teamId);
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${config.token}` },
    next: { revalidate: 300 },
  });
  if (!response.ok) {
    throw new Error(`Vercel Analytics returned ${response.status}.`);
  }
  return response.json();
}

export async function loadVercelTraffic(now = new Date()) {
  const config = analyticsConfig();
  if (!config.token || !config.projectId) {
    return {
      status: "not_configured",
      message: "Add a server-side Vercel access token to show live page-view data here.",
      totals7: null,
      totals30: null,
      daily30: [],
      topPublicPages: [],
      topReferrers: [],
    };
  }

  const until = dateOnly(now);
  const since30 = dateOnly(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
  const since7 = dateOnly(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));

  try {
    const [daily30Response, pagesResponse, referrersResponse] = await Promise.all([
      queryVisits("aggregate", { since: since30, until, by: "day" }, config),
      queryVisits(
        "aggregate",
        { since: since30, until, by: "requestPath", limit: 8, filter: PUBLIC_PATH_FILTER },
        config
      ),
      queryVisits(
        "aggregate",
        { since: since30, until, by: "referrerHostname", limit: 8, filter: PUBLIC_PATH_FILTER },
        config
      ),
    ]);

    const daily30 = Array.isArray(daily30Response.data) ? daily30Response.data : [];
    const daily7 = daily30.filter((row) => String(row.timestamp || "").slice(0, 10) >= since7);
    return {
      status: "available",
      message: null,
      totals7: summarizeTrafficRows(daily7),
      totals30: summarizeTrafficRows(daily30),
      daily30,
      topPublicPages: Array.isArray(pagesResponse.data) ? pagesResponse.data : [],
      topReferrers: Array.isArray(referrersResponse.data) ? referrersResponse.data : [],
    };
  } catch (error) {
    console.error("admin/vercel-analytics:", error);
    return {
      status: "error",
      message: "Live traffic data is temporarily unavailable. Supabase product metrics are still current.",
      totals7: null,
      totals30: null,
      daily30: [],
      topPublicPages: [],
      topReferrers: [],
    };
  }
}
