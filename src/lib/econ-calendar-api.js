import { normalizeEconEvent } from "./econ-calendar";

const IMPACT_MAP = {
  high: "high",
  medium: "medium",
  low: "low",
};

/** Force high impact for releases the calendar must never under-rate. */
const HIGH_IMPACT_PATTERNS = [
  /non.?farm payroll/i,
  /nonfarm payroll/i,
  /cpi/i,
  /consumer price index/i,
  /fomc/i,
  /fed interest rate/i,
  /federal funds rate/i,
  /gdp/i,
  /pce/i,
  /personal consumption/i,
];

const MEDIUM_IMPACT_PATTERNS = [
  /ppi/i,
  /producer price/i,
  /retail sales/i,
  /ism/i,
  /jobless claims/i,
  /initial claims/i,
];

function inferSeverity(eventName, apiImpact) {
  const name = eventName || "";
  if (HIGH_IMPACT_PATTERNS.some((re) => re.test(name))) return "high";
  if (MEDIUM_IMPACT_PATTERNS.some((re) => re.test(name))) return "medium";
  const mapped = IMPACT_MAP[(apiImpact || "").toLowerCase()];
  return mapped === "high" || mapped === "medium" ? mapped : null;
}

function normalizeTimeET(time) {
  if (!time) return null;
  const part = String(time).slice(0, 5);
  return /^\d{2}:\d{2}$/.test(part) ? part : null;
}

function inferKind(label) {
  const l = label.toLowerCase();
  if (l.includes("nonfarm") || l.includes("non-farm")) return "nfp";
  if (l.includes("jobless claims") || l.includes("initial claims")) return "claims";
  if (l.includes("ppi") || l.includes("producer price")) return "ppi";
  if (l.includes("retail sales")) return "retail";
  if (l.includes("gdp")) return "gdp";
  if (l.includes("pce") || l.includes("personal consumption")) return "pce";
  if (l.includes("cpi") || l.includes("consumer price")) return "cpi";
  if (l.includes("fomc") || l.includes("fed interest") || l.includes("federal funds")) return "fomc";
  if (l.includes("ism")) return "ism";
  return "econ";
}

export function normalizeFmpEconomicEvent(row) {
  const country = (row.country || row.Country || "").toUpperCase();
  if (country && country !== "US" && country !== "USA") return null;

  const label = row.event || row.Event || "";
  if (!label) return null;

  const severity = inferSeverity(label, row.impact || row.Impact);
  if (!severity) return null;

  const dateRaw = row.date || row.Date || "";
  const date = dateRaw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  return normalizeEconEvent({
    date,
    kind: inferKind(label),
    label,
    timeET: normalizeTimeET(row.time || row.Time),
    severity,
    reminder: null,
    source: "econ-api",
  });
}

export async function fetchFmpEconomicCalendar(from, to, apiKey) {
  if (!apiKey) return [];

  const url = new URL("https://financialmodelingprep.com/stable/economic-calendar");
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`FMP economic calendar failed: ${res.status}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data
    .map(normalizeFmpEconomicEvent)
    .filter(Boolean);
}

/** Try stable endpoint first, fall back to v3. */
export async function fetchEconomicCalendar(from, to, apiKey) {
  if (!apiKey) return [];

  try {
    return await fetchFmpEconomicCalendar(from, to, apiKey);
  } catch {
    const url = new URL("https://financialmodelingprep.com/api/v3/economic_calendar");
    url.searchParams.set("from", from);
    url.searchParams.set("to", to);
    url.searchParams.set("apikey", apiKey);

    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) {
      throw new Error(`FMP v3 economic calendar failed: ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .map(normalizeFmpEconomicEvent)
      .filter(Boolean);
  }
}
