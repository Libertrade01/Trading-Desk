import econReleases2026 from "../data/econ-releases-2026.json";

export const US_ECON_HOURS = { start: "08:00", end: "16:00" };

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`);
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function timeToMinutes(timeET) {
  if (!timeET) return null;
  const [h, m] = timeET.split(":").map(Number);
  return h * 60 + m;
}

/** US cash-session data window for econ releases (8:00–16:00 ET). */
export function isWithinUSEconHours(timeET) {
  const mins = timeToMinutes(timeET);
  if (mins == null) return false;
  const start = timeToMinutes(US_ECON_HOURS.start);
  const end = timeToMinutes(US_ECON_HOURS.end);
  return mins >= start && mins <= end;
}

export function isEconSeverityAllowed(severity) {
  return severity === "high" || severity === "medium";
}

function nthBusinessDayOfMonth(year, month, n) {
  let count = 0;
  for (let day = 1; day <= 31; day += 1) {
    const d = new Date(year, month, day, 12, 0, 0);
    if (d.getMonth() !== month) break;
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) {
      count += 1;
      if (count === n) return toDateKey(d);
    }
  }
  return null;
}

function isFirstFriday(dateKey) {
  const d = parseDateKey(dateKey);
  return d.getDay() === 5 && d.getDate() <= 7;
}

function isThursday(dateKey) {
  return parseDateKey(dateKey).getDay() === 4;
}

function staticEconForYear(year) {
  return year === "2026" ? econReleases2026 : [];
}

function staticEconForDate(dateKey) {
  return staticEconForYear(dateKey.slice(0, 4))
    .filter((e) => e.date === dateKey)
    .map((e) => ({ ...e, source: "econ-static" }));
}

/** Recurring US releases derived from calendar rules. */
export function computedEconEventsForDate(dateKey) {
  const d = parseDateKey(dateKey);
  const year = d.getFullYear();
  const month = d.getMonth();
  const events = [];

  if (isFirstFriday(dateKey)) {
    events.push({
      date: dateKey,
      kind: "nfp",
      label: "Nonfarm payrolls",
      timeET: "08:30",
      severity: "high",
      reminder: "NFP at 8:30 ET — stand down until dust settles.",
      source: "econ-computed",
    });
  }

  if (isThursday(dateKey)) {
    events.push({
      date: dateKey,
      kind: "claims",
      label: "Initial jobless claims",
      timeET: "08:30",
      severity: "medium",
      reminder: "Weekly claims at 8:30 ET.",
      source: "econ-computed",
    });
  }

  const ismMfg = nthBusinessDayOfMonth(year, month, 1);
  if (ismMfg === dateKey) {
    events.push({
      date: dateKey,
      kind: "ism",
      label: "ISM Manufacturing PMI",
      timeET: "10:00",
      severity: "medium",
      reminder: "ISM Manufacturing at 10:00 ET.",
      source: "econ-computed",
    });
  }

  const ismSvc = nthBusinessDayOfMonth(year, month, 3);
  if (ismSvc === dateKey) {
    events.push({
      date: dateKey,
      kind: "ism",
      label: "ISM Services PMI",
      timeET: "10:00",
      severity: "medium",
      reminder: "ISM Services at 10:00 ET.",
      source: "econ-computed",
    });
  }

  return events;
}

export function normalizeEconEvent(raw) {
  if (!raw?.date || !raw?.label) return null;
  const severity = raw.severity === "high" || raw.severity === "medium" ? raw.severity : null;
  if (!severity) return null;
  const timeET = raw.timeET || null;
  if (timeET && !isWithinUSEconHours(timeET)) return null;

  return {
    date: raw.date,
    kind: raw.kind || "econ",
    label: raw.label,
    timeET,
    severity,
    reminder: raw.reminder || null,
    source: raw.source || "econ-api",
  };
}

export function getEconEventsForDate(dateKey) {
  const merged = [
    ...staticEconForDate(dateKey),
    ...computedEconEventsForDate(dateKey),
  ]
    .map(normalizeEconEvent)
    .filter(Boolean);

  merged.sort((a, b) => {
    const sev = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
    if (sev !== 0) return sev;
    if (a.timeET && b.timeET) return a.timeET.localeCompare(b.timeET);
    return a.label.localeCompare(b.label);
  });

  return merged;
}

function eventDedupeKey(event) {
  return `${event.date}|${event.kind}|${event.label.toLowerCase()}`;
}

/** Merge API/cache events without duplicating curated entries. */
export function mergeEconEvents(baseEvents, extraEvents) {
  const seen = new Set(baseEvents.map(eventDedupeKey));
  const merged = [...baseEvents];

  for (const raw of extraEvents || []) {
    const event = normalizeEconEvent(raw);
    if (!event) continue;
    const key = eventDedupeKey(event);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(event);
  }

  merged.sort((a, b) => {
    const sev = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
    if (sev !== 0) return sev;
    if (a.timeET && b.timeET) return a.timeET.localeCompare(b.timeET);
    return a.label.localeCompare(b.label);
  });

  return merged;
}

export function summarizeEconEvents(events) {
  const high = events.filter((e) => e.severity === "high").length;
  const medium = events.filter((e) => e.severity === "medium").length;
  return { high, medium, total: events.length };
}

/** High-impact release at or before 10:00 ET — stand-down window. */
export function hasMorningHighImpact(events) {
  return events.some((e) => {
    if (e.severity !== "high" || !e.timeET) return false;
    const mins = timeToMinutes(e.timeET);
    return mins != null && mins <= timeToMinutes("10:00");
  });
}

export function getMorningHighImpactEvents(events) {
  return events.filter((e) => {
    if (e.severity !== "high" || !e.timeET) return false;
    const mins = timeToMinutes(e.timeET);
    return mins != null && mins <= timeToMinutes("10:00");
  });
}

export function isEconEvent(event) {
  return (
    event?.source?.startsWith("econ-") ||
    ["nfp", "claims", "ppi", "pce", "gdp", "retail", "ism", "cpi", "fomc"].includes(event?.kind)
  );
}
