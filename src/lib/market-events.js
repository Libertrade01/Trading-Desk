import staticEvents2026 from "../data/market-events-2026.json";

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

/** YYYY-MM-DD in local calendar (matches todayKey() pattern). */
export function toDateKey(date = new Date()) {
  return date.toISOString().split("T")[0];
}

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`);
}

/** Third Friday of a calendar month (0-indexed month). */
export function getThirdFriday(year, month) {
  const first = new Date(year, month, 1, 12, 0, 0);
  const firstDow = first.getDay();
  const firstFriday = 1 + ((5 - firstDow + 7) % 7);
  return new Date(year, month, firstFriday + 14, 12, 0, 0);
}

export function isOpexFriday(date = new Date()) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  if (d.getDay() !== 5) return false;
  const day = d.getDate();
  return day >= 15 && day <= 21;
}

const QUARTERLY_EXPIRY_MONTHS = [2, 5, 8, 11]; // Mar, Jun, Sep, Dec

export function getQuarterlyExpiryDate(year, month) {
  if (!QUARTERLY_EXPIRY_MONTHS.includes(month)) return null;
  return getThirdFriday(year, month);
}

function daysBetween(a, b) {
  const ms = parseDateKey(b).getTime() - parseDateKey(a).getTime();
  return Math.round(ms / 86400000);
}

function computedEventsForDate(dateKey) {
  const d = parseDateKey(dateKey);
  const events = [];

  if (isOpexFriday(d)) {
    events.push({
      date: dateKey,
      kind: "opex",
      label: "OPEX Friday",
      timeET: null,
      severity: "medium",
      reminder: "Expect gamma chop and pin risk. Trade edges, not mid-range.",
      source: "computed",
    });
  }

  const expiry = getQuarterlyExpiryDate(d.getFullYear(), d.getMonth());
  if (expiry) {
    const expiryKey = toDateKey(expiry);
    const daysUntil = daysBetween(dateKey, expiryKey);

    if (daysUntil === 0) {
      events.push({
        date: dateKey,
        kind: "expiry",
        label: "Quarterly index futures expiry",
        timeET: null,
        severity: "high",
        reminder: "Front-month expires today. Confirm you are on the correct contract.",
        source: "computed",
      });
    } else if (daysUntil > 0 && daysUntil <= 7) {
      events.push({
        date: dateKey,
        kind: "roll",
        label: "Contract roll week",
        timeET: null,
        severity: "medium",
        reminder: `Roll window — ${daysUntil} day${daysUntil === 1 ? "" : "s"} to expiry. Watch volume shift on ES/MNQ.`,
        source: "computed",
      });
    }
  }

  return events;
}

function staticEventsForDate(dateKey) {
  const year = dateKey.slice(0, 4);
  const pool = year === "2026" ? staticEvents2026 : [];
  return pool
    .filter((e) => e.date === dateKey)
    .map((e) => ({ ...e, source: "static" }));
}

export function getMarketEventsForDate(date = new Date()) {
  const dateKey = typeof date === "string" ? date : toDateKey(date);
  const merged = [...staticEventsForDate(dateKey), ...computedEventsForDate(dateKey)];

  merged.sort((a, b) => {
    const sev = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
    if (sev !== 0) return sev;
    if (a.timeET && b.timeET) return a.timeET.localeCompare(b.timeET);
    if (a.timeET) return -1;
    if (b.timeET) return 1;
    return a.label.localeCompare(b.label);
  });

  return merged;
}

export function hasMarketEventsToday(date = new Date()) {
  return getMarketEventsForDate(date).length > 0;
}

export function hasHighImpactMarketEventsToday(date = new Date()) {
  return getMarketEventsForDate(date).some((e) => e.severity === "high");
}

export function formatEventTimeET(timeET) {
  if (!timeET) return null;
  const [h, m] = timeET.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix} ET`;
}
