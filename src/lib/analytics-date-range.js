/** Date range presets aligned with analytics.html filter bar. */

import { storage } from "./supabase";
import { calendarDateParts } from "./today-key";
import { lastNTradingDaysRange } from "./trading-day-range";
import {
  PLAYBOOK_TRACKING_START_KEY,
  filterTradesForPlaybookAdherence,
} from "./analytics-playbook-filter";

export { PLAYBOOK_TRACKING_START_KEY, filterTradesForPlaybookAdherence };

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

export { lastNTradingDaysRange } from "./trading-day-range";

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
    return lastNTradingDaysRange(5);
  }
  if (preset === "10d") {
    return lastNTradingDaysRange(10);
  }
  if (preset === "20d") {
    return lastNTradingDaysRange(20);
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

const LEGACY_PLAYBOOK_KEY = "analytics-playbook-tracking-start";

function readLegacyPlaybookStart() {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(LEGACY_PLAYBOOK_KEY);
  if (!stored) return null;
  localStorage.removeItem(LEGACY_PLAYBOOK_KEY);
  return stored;
}

async function savePlaybookTrackingStartDate(date) {
  await storage.set(PLAYBOOK_TRACKING_START_KEY, date);
  return date;
}

/** First day of playbook adherence tracking — set once, excludes legacy untagged history. */
export async function loadPlaybookTrackingStartDate() {
  try {
    const r = await storage.get(PLAYBOOK_TRACKING_START_KEY);
    if (r?.value) return r.value;
  } catch {
    /* fall through */
  }

  const legacy = readLegacyPlaybookStart();
  if (legacy) {
    await savePlaybookTrackingStartDate(legacy);
    return legacy;
  }

  const today = calendarTodayParts().today;
  await savePlaybookTrackingStartDate(today);
  return today;
}

/** Reset playbook tracking anchor to today (excludes prior history again). */
export async function resetPlaybookTrackingStartDate() {
  const today = calendarTodayParts().today;
  return savePlaybookTrackingStartDate(today);
}
