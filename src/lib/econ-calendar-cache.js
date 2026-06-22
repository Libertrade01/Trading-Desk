import { storage } from "./supabase";
import {
  mergeEconEvents,
  getEconEventsForDate,
  normalizeEconEvent,
} from "./econ-calendar";

export const ECON_CACHE_KEY = "econ-calendar-cache";

function toDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(dateKey, days) {
  const d = new Date(`${dateKey}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export async function loadEconCache() {
  try {
    const row = await storage.get(ECON_CACHE_KEY);
    if (!row?.value) return { syncedAt: null, events: [] };
    return JSON.parse(row.value);
  } catch {
    return { syncedAt: null, events: [] };
  }
}

export async function saveEconCache(payload) {
  await storage.set(ECON_CACHE_KEY, JSON.stringify(payload));
}

export async function getCachedEconEventsForDate(dateKey) {
  const cache = await loadEconCache();
  return (cache.events || [])
    .filter((e) => e.date === dateKey)
    .map(normalizeEconEvent)
    .filter(Boolean);
}

/** Full API cache payload for cross-day conflict checks. */
export async function loadCachedApiEvents() {
  const cache = await loadEconCache();
  const events = (cache.events || []).map(normalizeEconEvent).filter(Boolean);
  return {
    syncedAt: cache.syncedAt || null,
    from: cache.from || null,
    to: cache.to || null,
    events,
  };
}

export function cacheDateRange(daysAhead = 14) {
  const from = toDateKey();
  const to = addDays(from, daysAhead);
  return { from, to };
}

export async function mergeCachedEconForDate(dateKey) {
  const base = getEconEventsForDate(dateKey);
  const cached = await getCachedEconEventsForDate(dateKey);
  return mergeEconEvents(base, cached);
}
