import { calendarDateParts } from "./today-key.js";

function calendarStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isWeekday(cal) {
  const day = cal.getDay();
  return day >= 1 && day <= 5;
}

/** Last N Mon–Fri sessions ending on the most recent weekday (today, or Friday on weekends). */
export function lastNTradingDaysRange(n, referenceDate = new Date()) {
  const { cal } = calendarDateParts(referenceDate);
  const cur = new Date(cal);

  while (!isWeekday(cur)) {
    cur.setDate(cur.getDate() - 1);
  }
  const dateTo = calendarStr(cur);

  let found = 1;
  let dateFrom = dateTo;

  while (found < n) {
    cur.setDate(cur.getDate() - 1);
    if (isWeekday(cur)) {
      found += 1;
      dateFrom = calendarStr(cur);
    }
  }

  return { dateFrom, dateTo };
}

/** Previous Mon-Fri date keys, newest first, excluding the supplied date. */
export function previousTradingDateKeys(dateKey, count = 1) {
  const cur = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(cur.getTime()) || count <= 0) return [];

  const keys = [];
  while (keys.length < count) {
    cur.setDate(cur.getDate() - 1);
    if (isWeekday(cur)) keys.push(calendarStr(cur));
  }
  return keys;
}
