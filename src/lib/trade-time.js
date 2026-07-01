/** Trade times are always shown in US Eastern (NYSE session clock). */
export const TRADE_DISPLAY_TIMEZONE = "America/New_York";

const ET = TRADE_DISPLAY_TIMEZONE;

const formatterCache = new Map();

function getFormatter(timeZone) {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

/** Calendar + clock parts for an instant in a given IANA timezone. */
export function partsInTimezone(date, timeZone = ET) {
  if (!date || Number.isNaN(date.getTime())) return null;
  if (timeZone === "UTC") {
    return {
      year: String(date.getUTCFullYear()),
      month: String(date.getUTCMonth() + 1).padStart(2, "0"),
      day: String(date.getUTCDate()).padStart(2, "0"),
      hour: String(date.getUTCHours()).padStart(2, "0"),
      minute: String(date.getUTCMinutes()).padStart(2, "0"),
      second: String(date.getUTCSeconds()).padStart(2, "0"),
    };
  }
  return Object.fromEntries(
    getFormatter(timeZone).formatToParts(date).map((p) => [p.type, p.value]),
  );
}

/** @deprecated alias */
export function easternPartsFromUTC(date) {
  return partsInTimezone(date, ET);
}

const NAIVE_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Parse naive YYYY-MM-DD HH:MM[:SS] as wall clock in the given IANA zone → UTC Date.
 * Use "UTC" when rTrader exports a UTC column.
 */
export function parseNaiveInTimezone(naiveStr, timeZone = "UTC") {
  if (!naiveStr) return null;
  const m = String(naiveStr).trim().match(NAIVE_RE);
  if (!m) return null;

  const [, ys, mos, ds, hs, mis, ss = "00"] = m;
  if (timeZone === "UTC") {
    return new Date(Date.UTC(+ys, +mos - 1, +ds, +hs, +mis, +ss));
  }

  const y = +ys;
  const mo = +mos;
  const d = +ds;
  const h = +hs;
  const mi = +mis;
  const s = +ss;

  let utcMs = Date.UTC(y, mo - 1, d, h, mi, s);
  for (let i = 0; i < 4; i++) {
    const p = partsInTimezone(new Date(utcMs), timeZone);
    if (!p) return null;
    if (
      p.year === ys &&
      p.month === mos &&
      p.day === ds &&
      p.hour === hs &&
      p.minute === mis &&
      p.second === ss
    ) {
      return new Date(utcMs);
    }
    const actualPseudo = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    const targetPseudo = Date.UTC(y, mo - 1, d, h, mi, s);
    utcMs += targetPseudo - actualPseudo;
  }
  return new Date(utcMs);
}

/** Parse naive US Eastern wall time → UTC Date. */
export function parseEasternNaiveToUTC(naiveStr) {
  return parseNaiveInTimezone(naiveStr, ET);
}

export function easternDateFromInstant(date) {
  const p = partsInTimezone(date, ET);
  if (!p) return null;
  return `${p.year}-${p.month}-${p.day}`;
}

export function sessionDateFromNaive(naiveStr, sourceTimeZone = "UTC") {
  const instant = parseNaiveInTimezone(naiveStr, sourceTimeZone);
  return instant ? easternDateFromInstant(instant) : String(naiveStr).substring(0, 10);
}

/** @deprecated use sessionDateFromNaive */
export function easternDateFromNaive(naiveStr) {
  return sessionDateFromNaive(naiveStr, ET);
}

function parseStoredInstant(value, sourceTimeZone = "UTC") {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (s.includes("+") || s.endsWith("Z")) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return parseNaiveInTimezone(s, sourceTimeZone);
}

/** YYYY-MM-DD HH:MM in US Eastern from UTC ISO or naive CSV string + source zone. */
export function toNYTimeStr(value, { sourceTimeZone = "UTC" } = {}) {
  const d = parseStoredInstant(value, sourceTimeZone);
  if (!d) return "—";
  const p = partsInTimezone(d, ET);
  if (!p) return "—";
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

/** MM-DD HH:MM in US Eastern — import preview and analytics. */
export function formatLimaTime(value, { sourceTimeZone = "UTC" } = {}) {
  const d = parseStoredInstant(value, sourceTimeZone);
  if (!d) return "—";
  const p = partsInTimezone(d, ET);
  if (!p) return "—";
  return `${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

/** Minutes since midnight US Eastern — session basket charts. */
export function easternMinutesFromInstant(date) {
  const p = partsInTimezone(date, ET);
  if (!p) return 0;
  return +p.hour * 60 + +p.minute;
}
