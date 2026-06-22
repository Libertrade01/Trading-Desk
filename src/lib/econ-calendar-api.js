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
  /flash.*pmi/i,
  /pmi/i,
  /consumer sentiment/i,
  /uom/i,
  /michigan/i,
  /inflation expectations/i,
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
  if (l.includes("cpi") || l.includes("consumer price index")) return "cpi";
  if (l.includes("fomc") || l.includes("fed interest") || l.includes("federal funds")) return "fomc";
  if (l.includes("ism")) return "ism";
  if (l.includes("pmi")) return "pmi";
  if (l.includes("consumer sentiment") || l.includes("uom") || l.includes("michigan")) return "econ";
  return "econ";
}

function inferKindFromEventId(eventId, label) {
  const id = (eventId || "").toLowerCase();
  if (id.includes("nonfarm") || id.includes("nfp")) return "nfp";
  if (id.includes("jobless") || id.includes("claims")) return "claims";
  if (id.includes("cpi")) return "cpi";
  if (id.includes("fomc")) return "fomc";
  if (id.includes("ppi")) return "ppi";
  if (id.includes("pce")) return "pce";
  if (id.includes("gdp")) return "gdp";
  if (id.includes("retail")) return "retail";
  if (id.includes("ism")) return "ism";
  if (id.includes("pmi")) return "pmi";
  return inferKind(label);
}

/** Convert Sifting RFC3339 UTC timestamp to US/Eastern date + HH:MM. */
export function scheduledAtToET(scheduledAt) {
  if (!scheduledAt) return { date: null, timeET: null };

  const d = new Date(scheduledAt);
  if (Number.isNaN(d.getTime())) return { date: null, timeET: null };

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );

  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const timeET = normalizeTimeET(`${parts.hour}:${parts.minute}`);
  return { date, timeET };
}

export function normalizeSiftingEconomicEvent(row) {
  const country = (row.country || "").toUpperCase();
  if (country && country !== "US") return null;

  const label = row.name || "";
  if (!label) return null;

  const severity = inferSeverity(label, row.impact);
  if (!severity) return null;

  const { date, timeET } = scheduledAtToET(row.scheduled_at);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  return normalizeEconEvent({
    date,
    kind: inferKindFromEventId(row.event_id, label),
    label,
    timeET,
    severity,
    reminder: null,
    source: "econ-api",
  });
}

export async function fetchSiftingEconomicCalendar(from, to, apiKey) {
  if (!apiKey) return [];

  const url = new URL("https://api.sifting.io/v1/fnd/economic-calendar");
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("country", "US");
  url.searchParams.set("limit", "500");

  const res = await fetch(url.toString(), {
    headers: { "X-API-Key": apiKey },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Sifting economic calendar failed: ${res.status}`);
  }

  const data = await res.json();
  if (!Array.isArray(data?.events)) return [];

  return data.events.map(normalizeSiftingEconomicEvent).filter(Boolean);
}

/** Fetch US economic calendar from Sifting.io. */
export async function fetchEconomicCalendar(from, to, apiKey) {
  return fetchSiftingEconomicCalendar(from, to, apiKey);
}
