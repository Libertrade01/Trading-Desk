export const DEFAULT_TRADING_DAY_TIMEZONE = "America/Lima";

export const TRADING_DAY_TIMEZONE_OPTIONS = [
  { id: "America/Lima", label: "Lima (UTC−5)" },
  { id: "America/New_York", label: "New York (US Eastern)" },
  { id: "America/Chicago", label: "Chicago (US Central)" },
  { id: "Europe/London", label: "London" },
  { id: "local", label: "Browser local time" },
];

const ALLOWED_TIMEZONES = new Set(TRADING_DAY_TIMEZONE_OPTIONS.map((o) => o.id));

let cachedTimezone = DEFAULT_TRADING_DAY_TIMEZONE;

export function isValidTradingDayTimezone(tz) {
  return ALLOWED_TIMEZONES.has(tz);
}

export function setTradingDayTimezone(tz) {
  if (isValidTradingDayTimezone(tz)) {
    cachedTimezone = tz;
  }
}

export function getTradingDayTimezone() {
  return cachedTimezone;
}

function calendarInstant(date, timeZone = cachedTimezone) {
  if (timeZone === "local") return new Date(date);
  return new Date(date.toLocaleString("en-US", { timeZone }));
}

function formatDateKey(cal) {
  const y = cal.getFullYear();
  const m = String(cal.getMonth() + 1).padStart(2, "0");
  const d = String(cal.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Calendar parts for the configured trading-day timezone. */
export function calendarDateParts(date = new Date(), timeZone = cachedTimezone) {
  const cal = calendarInstant(date, timeZone);
  return { cal, today: formatDateKey(cal) };
}

/** YYYY-MM-DD for the configured trading-day calendar. */
export function todayKey() {
  return calendarDateParts().today;
}

/** @deprecated Use calendarDateParts — kept for existing imports. */
export function limaDateParts(date = new Date()) {
  return calendarDateParts(date);
}
