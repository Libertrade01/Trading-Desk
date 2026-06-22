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

  const event = {
    date: raw.date,
    kind: raw.kind || "econ",
    label: raw.label,
    timeET,
    severity,
    reminder: raw.reminder || null,
    source: raw.source || "econ-api",
  };
  if (raw.conflict) event.conflict = raw.conflict;
  return event;
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

const ECON_MATCH_KINDS = new Set([
  "nfp",
  "claims",
  "ppi",
  "pce",
  "gdp",
  "retail",
  "ism",
  "cpi",
  "fomc",
  "pmi",
]);

/** Kinds that can appear more than once on the same day (e.g. Final GDP + GDP price index). */
const MULTI_RELEASE_KINDS = new Set(["gdp", "pce", "ism", "pmi", "econ"]);

/** Stable key for matching curated vs API releases. */
export function econMatchKey(event) {
  const kind = event?.kind || "econ";
  if (MULTI_RELEASE_KINDS.has(kind)) {
    return `${event.date}|${kind}|${(event.label || "").toLowerCase()}`;
  }
  if (ECON_MATCH_KINDS.has(kind)) {
    return `${event.date}|${kind}`;
  }
  return `${event.date}|${kind}|${(event.label || "").toLowerCase()}`;
}

function addDaysToDateKey(dateKey, days) {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** All pre-programmed econ events between two YYYY-MM-DD keys (inclusive). */
export function getCuratedEconEventsForRange(fromKey, toKey) {
  const events = [];
  let current = fromKey;
  while (current <= toKey) {
    events.push(...getEconEventsForDate(current));
    current = addDaysToDateKey(current, 1);
  }
  return events;
}

function sortEconEvents(events) {
  return [...events].sort((a, b) => {
    const sev = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
    if (sev !== 0) return sev;
    if (a.timeET && b.timeET) return a.timeET.localeCompare(b.timeET);
    return a.label.localeCompare(b.label);
  });
}

function conflictSnapshot(event) {
  return {
    date: event.date,
    label: event.label,
    timeET: event.timeET ?? null,
    severity: event.severity,
  };
}

export function hasScheduleConflict(curated, api) {
  return (
    curated.date !== api.date ||
    (curated.timeET || null) !== (api.timeET || null) ||
    curated.severity !== api.severity
  );
}

function buildConflictEvent(displayEvent, curated, api) {
  const base = normalizeEconEvent(displayEvent);
  if (!base) return null;
  return {
    ...base,
    source: "econ-conflict",
    conflict: {
      curated: conflictSnapshot(curated),
      api: conflictSnapshot(api),
    },
  };
}

/**
 * Merge curated + API econ events for one day.
 * When schedules disagree, flag a conflict — never auto-pick a winner.
 */
export function mergeEconEvents(
  curatedEvents,
  apiEventsForDay,
  { allApiEvents = null, curatedRangeEvents = null } = {},
) {
  const curated = (curatedEvents || []).map(normalizeEconEvent).filter(Boolean);
  const apiToday = (apiEventsForDay || []).map((e) => normalizeEconEvent(e)).filter(Boolean);
  const apiPool = (allApiEvents || apiToday).map((e) => normalizeEconEvent(e)).filter(Boolean);
  const curatedPool = (curatedRangeEvents || curated).map(normalizeEconEvent).filter(Boolean);

  if (!apiToday.length && !apiPool.some((e) => curated.some((c) => c.kind === e.kind))) {
    return sortEconEvents(curated);
  }

  const apiTodayByKey = new Map(apiToday.map((event) => [econMatchKey(event), event]));
  const usedApiKeys = new Set();
  const merged = [];

  for (const event of curated) {
    if (!isEconEvent(event)) {
      merged.push(event);
      continue;
    }

    const key = econMatchKey(event);
    const apiSameDay = apiTodayByKey.get(key);
    const apiSameKindOtherDay =
      ECON_MATCH_KINDS.has(event.kind) &&
      !MULTI_RELEASE_KINDS.has(event.kind) &&
      apiPool.find((apiEvent) => apiEvent.kind === event.kind && apiEvent.date !== event.date);

    if (apiSameDay && hasScheduleConflict(event, apiSameDay)) {
      const flagged = buildConflictEvent(event, event, apiSameDay);
      if (flagged) merged.push(flagged);
      usedApiKeys.add(key);
    } else if (apiSameDay) {
      merged.push(event);
      usedApiKeys.add(key);
    } else if (apiSameKindOtherDay) {
      const flagged = buildConflictEvent(event, event, apiSameKindOtherDay);
      if (flagged) merged.push(flagged);
    } else {
      merged.push(event);
    }
  }

  for (const apiEvent of apiToday) {
    const key = econMatchKey(apiEvent);
    if (usedApiKeys.has(key)) continue;

    const curatedSameDay = curated.find((event) => econMatchKey(event) === key);
    const curatedSameKind = ECON_MATCH_KINDS.has(apiEvent.kind) && !MULTI_RELEASE_KINDS.has(apiEvent.kind)
      ? curatedPool.find((event) => event.kind === apiEvent.kind)
      : curatedSameDay;

    if (curatedSameKind && hasScheduleConflict(curatedSameKind, apiEvent)) {
      const flagged = buildConflictEvent(apiEvent, curatedSameKind, apiEvent);
      if (flagged) merged.push(flagged);
    } else if (!curatedSameDay) {
      merged.push(apiEvent);
    }
  }

  return sortEconEvents(merged);
}

/** Collect conflict records from merged events. */
export function collectEconConflicts(events) {
  return (events || [])
    .filter((event) => event?.conflict)
    .map((event) => ({
      date: event.date,
      kind: event.kind,
      curated: event.conflict.curated,
      api: event.conflict.api,
    }));
}

/**
 * Cross-check API events against curated rules/static data.
 * Conflicts are flagged for manual review, not auto-resolved.
 */
export function crossCheckEconWithApi(curatedEvents, apiEvents) {
  const curated = (curatedEvents || []).map(normalizeEconEvent).filter(Boolean);
  const api = (apiEvents || []).map((e) => normalizeEconEvent(e)).filter(Boolean);

  const dateKeys = new Set([
    ...curated.map((event) => event.date),
    ...api.map((event) => event.date),
  ]);

  const merged = [];
  for (const dateKey of dateKeys) {
    merged.push(
      ...mergeEconEvents(
        curated.filter((event) => event.date === dateKey),
        api.filter((event) => event.date === dateKey),
        { allApiEvents: api, curatedRangeEvents: curated },
      ),
    );
  }

  const conflicts = collectEconConflicts(merged);
  const matchedKeys = new Set(
    api
      .filter((apiEvent) =>
        curated.some(
          (curatedEvent) =>
            econMatchKey(curatedEvent) === econMatchKey(apiEvent) &&
            !hasScheduleConflict(curatedEvent, apiEvent),
        ),
      )
      .map(econMatchKey),
  );

  const apiExtraEvents = api.filter((apiEvent) => {
    const hasCuratedKind = ECON_MATCH_KINDS.has(apiEvent.kind)
      ? curated.some((curatedEvent) => curatedEvent.kind === apiEvent.kind)
      : curated.some((curatedEvent) => econMatchKey(curatedEvent) === econMatchKey(apiEvent));
    return !hasCuratedKind;
  });

  const curatedOnlyEvents = curated.filter((event) => {
    const hasApiKind = ECON_MATCH_KINDS.has(event.kind)
      ? api.some((apiEvent) => apiEvent.kind === event.kind)
      : api.some((apiEvent) => econMatchKey(apiEvent) === econMatchKey(event));
    return !hasApiKind;
  });

  return {
    curatedCount: curated.length,
    apiCount: api.length,
    matched: matchedKeys.size,
    curatedOnly: curatedOnlyEvents.length,
    apiOnly: apiExtraEvents.length,
    conflictCount: conflicts.length,
    conflicts,
    curatedOnlyEvents,
    apiExtraEvents,
    merged: sortEconEvents(merged),
  };
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
    ["nfp", "claims", "ppi", "pce", "gdp", "retail", "ism", "cpi", "fomc", "pmi"].includes(event?.kind)
  );
}
