/** Date range presets aligned with analytics.html filter bar. */

import { calendarDateParts } from "./today-key";

function calendarTodayParts() {
  const { today, cal } = calendarDateParts();
  return { today, cal, now: new Date() };
}

function calendarStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function resolveDateRangePreset(preset) {
  const { today, cal } = calendarTodayParts();
  const dow = cal.getDay();

  if (preset === "week") {
    const monday = new Date(cal);
    monday.setDate(cal.getDate() - (dow === 0 ? 6 : dow - 1));
    return { dateFrom: calendarStr(monday), dateTo: today };
  }
  if (preset === "lastweek") {
    const lastMon = new Date(cal);
    lastMon.setDate(cal.getDate() - (dow === 0 ? 13 : dow + 6));
    const lastFri = new Date(lastMon);
    lastFri.setDate(lastMon.getDate() + 4);
    return { dateFrom: calendarStr(lastMon), dateTo: calendarStr(lastFri) };
  }
  if (preset === "month") {
    const dateFrom = `${cal.getFullYear()}-${String(cal.getMonth() + 1).padStart(2, "0")}-01`;
    return { dateFrom, dateTo: today };
  }
  if (preset === "5d") {
    const d5 = new Date(cal);
    d5.setDate(cal.getDate() - 4);
    return { dateFrom: calendarStr(d5), dateTo: today };
  }
  if (preset === "10d") {
    const d10 = new Date(cal);
    d10.setDate(cal.getDate() - 9);
    return { dateFrom: calendarStr(d10), dateTo: today };
  }
  if (preset === "20d") {
    const d20 = new Date(cal);
    d20.setDate(cal.getDate() - 19);
    return { dateFrom: calendarStr(d20), dateTo: today };
  }
  if (preset === "all") {
    return { dateFrom: null, dateTo: null };
  }
  return { dateFrom: null, dateTo: today };
}

export const RANGE_PRESETS = [
  { id: "week", label: "This Week" },
  { id: "lastweek", label: "Last Week" },
  { id: "month", label: "This Month" },
  { id: "5d", label: "5D" },
  { id: "10d", label: "10D" },
  { id: "20d", label: "20D" },
  { id: "all", label: "All Time" },
];

export { calendarTodayParts as limaTodayParts };

const PLAYBOOK_TRACKING_START_KEY = "analytics-playbook-tracking-start";

/** First day of playbook adherence tracking — set once, excludes legacy untagged history. */
export function getPlaybookTrackingStartDate() {
  if (typeof window === "undefined") return calendarTodayParts().today;
  let stored = localStorage.getItem(PLAYBOOK_TRACKING_START_KEY);
  if (!stored) {
    stored = calendarTodayParts().today;
    localStorage.setItem(PLAYBOOK_TRACKING_START_KEY, stored);
  }
  return stored;
}

/** Trades within toolbar range, on or after playbook tracking start. */
export function filterTradesForPlaybookAdherence(trades, trackingStart) {
  if (!trackingStart) return [];
  return (trades || []).filter((t) => t.date >= trackingStart);
}

/** Reset playbook tracking anchor to today (excludes prior history again). */
export function resetPlaybookTrackingStartDate() {
  if (typeof window === "undefined") return calendarTodayParts().today;
  const today = calendarTodayParts().today;
  localStorage.setItem(PLAYBOOK_TRACKING_START_KEY, today);
  return today;
}
