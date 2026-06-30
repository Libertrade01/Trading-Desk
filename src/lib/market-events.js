import staticEvents2026 from "../data/market-events-2026.json";
import marketHolidays2026 from "../data/market-holidays-2026.json";

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
const QUARTER_END_MONTHS = QUARTERLY_EXPIRY_MONTHS;

export function getQuarterlyExpiryDate(year, month) {
  if (!QUARTERLY_EXPIRY_MONTHS.includes(month)) return null;
  return getThirdFriday(year, month);
}

function daysBetween(a, b) {
  const ms = parseDateKey(b).getTime() - parseDateKey(a).getTime();
  return Math.round(ms / 86400000);
}

function addDaysToDateKey(dateKey, days) {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

function staticEventsForYear(year) {
  return year === "2026" ? staticEvents2026 : [];
}

function holidaysForYear(year) {
  return year === "2026" ? marketHolidays2026 : [];
}

function isNyseFullClosure(dateKey) {
  return holidaysForYear(dateKey.slice(0, 4)).some(
    (h) => h.date === dateKey && h.closure === "full",
  );
}

/** Weekday and not a full NYSE closure (half-days still count). */
export function isNyseTradingDay(dateKey) {
  const dow = parseDateKey(dateKey).getDay();
  if (dow === 0 || dow === 6) return false;
  return !isNyseFullClosure(dateKey);
}

function lastCalendarDayOfMonthKey(year, monthIndex) {
  return toDateKey(new Date(year, monthIndex + 1, 0, 12, 0, 0));
}

/** Last N NYSE trading sessions in a calendar month (chronological). */
export function getLastNTradingDaysInMonth(year, monthIndex, n = 2) {
  const found = [];
  let key = lastCalendarDayOfMonthKey(year, monthIndex);
  let guard = 0;

  while (found.length < n && guard < 20) {
    const d = parseDateKey(key);
    if (d.getMonth() !== monthIndex) break;
    if (isNyseTradingDay(key)) found.push(key);
    key = addDaysToDateKey(key, -1);
    guard += 1;
  }

  return found.sort();
}

function periodRebalanceEventsForDate(dateKey) {
  const d = parseDateKey(dateKey);
  const year = d.getFullYear();
  const month = d.getMonth();
  const lastTwo = getLastNTradingDaysInMonth(year, month, 2);
  if (!lastTwo.includes(dateKey)) return [];

  const events = [
    {
      date: dateKey,
      kind: "eom",
      label: "End of month",
      timeET: null,
      severity: "medium",
      reminder:
        "Institutional rebalancing window — expect unusual flows and late-day volatility.",
      source: "computed",
    },
  ];

  if (QUARTER_END_MONTHS.includes(month)) {
    events.push({
      date: dateKey,
      kind: "eoq",
      label: "End of quarter",
      timeET: null,
      severity: "medium",
      reminder:
        "Quarter-end window dressing and index rebalances — respect chop, size accordingly.",
      source: "computed",
    });
  }

  return events;
}

/** First day to show a holiday ribbon (inclusive). */
export function displayStartForHoliday(holidayDateKey) {
  const d = parseDateKey(holidayDateKey);
  const dow = d.getDay();

  if (dow === 1) {
    return addDaysToDateKey(holidayDateKey, -5);
  }

  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  return addDaysToDateKey(holidayDateKey, -daysFromMonday);
}

/** Last day to show a holiday ribbon (inclusive — holiday date itself). */
export function displayEndForHoliday(holidayDateKey) {
  return holidayDateKey;
}

/** "Friday, June 19" from a holiday date key (not the viewing date). */
export function formatHolidayDateLabel(holidayDateKey) {
  return parseDateKey(holidayDateKey).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Holiday ribbon label: "Monday, January 19 — Martin Luther King Jr. Day" */
export function formatHolidayDisplayLabel(holidayDateKey, name) {
  return `${formatHolidayDateLabel(holidayDateKey)} — ${name}`;
}

function isDateInHolidayWindow(viewingDateKey, holidayDateKey) {
  const start = displayStartForHoliday(holidayDateKey);
  const end = displayEndForHoliday(holidayDateKey);
  return viewingDateKey >= start && viewingDateKey <= end;
}

export function holidayEventsForDate(dateKey) {
  const holidays = holidaysForYear(dateKey.slice(0, 4));

  return holidays
    .filter((h) => isDateInHolidayWindow(dateKey, h.date))
    .map((h) => ({
      date: dateKey,
      kind: h.kind,
      label: formatHolidayDisplayLabel(h.date, h.label),
      closure: h.closure,
      closeET: h.closeET ?? null,
      timeET: h.closeET ?? null,
      severity: h.severity,
      reminder: h.reminder,
      holidayDate: h.date,
      source: "holiday",
    }));
}

function preFomcEventsForDate(dateKey) {
  const nextKey = addDaysToDateKey(dateKey, 1);
  const fomcTomorrow = staticEventsForYear(dateKey.slice(0, 4)).find(
    (e) => e.date === nextKey && e.kind === "fomc",
  );
  if (!fomcTomorrow) return [];

  return [
    {
      date: dateKey,
      kind: "prefomc",
      label: "Pre FOMC",
      timeET: null,
      severity: "medium",
      reminder: "FOMC tomorrow — reduce size, avoid holding into statement.",
      source: "computed",
    },
  ];
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
        reminder: "Watch volume shifts.",
        source: "computed",
      });
    }
  }

  events.push(...preFomcEventsForDate(dateKey));
  events.push(...periodRebalanceEventsForDate(dateKey));

  return events;
}

function staticEventsForDate(dateKey) {
  return staticEventsForYear(dateKey.slice(0, 4))
    .filter((e) => e.date === dateKey)
    .map((e) => ({ ...e, source: "static" }));
}

export function getMarketEventsForDate(date = new Date()) {
  const dateKey = typeof date === "string" ? date : toDateKey(date);
  const merged = [
    ...staticEventsForDate(dateKey),
    ...computedEventsForDate(dateKey),
    ...holidayEventsForDate(dateKey),
  ];

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

/** Sync market events for a date (holidays, FOMC, EOM/EOQ, roll week, OPEX, etc.). */
export function loadMarketEventsForDate(date = new Date()) {
  return Promise.resolve(getMarketEventsForDate(date));
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
