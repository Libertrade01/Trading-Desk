import { storage } from "./supabase";
import { getSupabaseBrowserClient } from "./supabase/client";
import { getCurrentUserId } from "./user-storage";
import { computeReadinessScore, readinessStatus } from "./premarket-scoring";
import { computePerformanceFromDbTrades, fetchTradesForDate, fetchTradesGroupedByDate, performanceFromDbOrImport } from "./rtrader-import";
import { summarizeSetupAdherence } from "./setup-adherence";
import { hasJournalReviewPending } from "./postmarket-defaults";
import { todayKey, offsetDateKey } from "./today-key";

export { todayKey };

const KEYS = {
  pre: "premarket-checkin-",
  plan: "daily-plan-",
  post: "postmarket-review-",
};

async function loadJson(key) {
  try {
    const r = await storage.get(key);
    if (!r?.value) return null;
    const parsed = JSON.parse(r.value);
    return typeof parsed === "string" ? JSON.parse(parsed) : parsed;
  } catch {
    return null;
  }
}

function parseStorageValue(raw) {
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? JSON.parse(parsed) : parsed;
  } catch {
    return null;
  }
}

/** One query per prefix — replaces list + N individual gets for home/history loads. */
async function loadJsonMapByPrefix(prefix) {
  const userId = await getCurrentUserId();
  const { data, error } = await getSupabaseBrowserClient()
    .from("app_data")
    .select("key, value")
    .eq("user_id", userId)
    .like("key", `${prefix}%`);
  if (error) {
    console.error("loadJsonMapByPrefix:", prefix, error);
    return new Map();
  }
  const map = new Map();
  for (const row of data || []) {
    const val = parseStorageValue(row.value);
    if (val != null) map.set(row.key, val);
  }
  return map;
}

function collectDatesFromMaps(preMap, planMap, postMap) {
  const dates = new Set();
  for (const key of preMap.keys()) {
    const d = dateFromKey(key, KEYS.pre);
    if (d) dates.add(d);
  }
  for (const key of planMap.keys()) {
    const d = dateFromKey(key, KEYS.plan);
    if (d) dates.add(d);
  }
  for (const key of postMap.keys()) {
    const d = dateFromKey(key, KEYS.post);
    if (d) dates.add(d);
  }
  return dates;
}

function dateFromKey(key, prefix) {
  if (!key?.startsWith(prefix)) return null;
  const date = key.slice(prefix.length);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

export async function fetchSessionDates() {
  const [pre, plan, post] = await Promise.all([
    storage.list(KEYS.pre),
    storage.list(KEYS.plan),
    storage.list(KEYS.post),
  ]);

  const dates = new Set();
  for (const k of pre?.keys || []) {
    const d = dateFromKey(k, KEYS.pre);
    if (d) dates.add(d);
  }
  for (const k of plan?.keys || []) {
    const d = dateFromKey(k, KEYS.plan);
    if (d) dates.add(d);
  }
  for (const k of post?.keys || []) {
    const d = dateFromKey(k, KEYS.post);
    if (d) dates.add(d);
  }

  return [...dates].sort((a, b) => b.localeCompare(a));
}

function resolveNetPnl(post, trades) {
  const synced = performanceFromDbOrImport(post, trades);
  if (synced) return synced.netPnl;
  if (post?.netPnl != null && post.netPnl !== "") return Number(post.netPnl);
  if (post) {
    const gross = parseFloat(post.grossPnl);
    const comm = parseFloat(post.commissionsFees);
    if (!Number.isNaN(gross)) {
      return Math.round((gross - (Number.isNaN(comm) ? 0 : comm)) * 100) / 100;
    }
  }
  return null;
}

async function loadPostReview(dateKey, { preferApi = false } = {}) {
  if (preferApi) {
    try {
      const res = await fetch(`/api/sessions/${dateKey}/post`);
      if (res.ok) {
        const data = await res.json();
        if (data?.review) return data.review;
      }
    } catch {
      /* fall through to storage */
    }
  }
  return loadJson(`${KEYS.post}${dateKey}`);
}

function buildSessionRecord(dateKey, pre, plan, post, trades) {
  const readinessScore = pre?.readinessScore ?? (pre ? computeReadinessScore(pre).composite : null);
  const readiness = readinessScore != null ? readinessStatus(readinessScore) : null;

  return {
    date: dateKey,
    pre,
    plan,
    post,
    trades,
    playbookAdherence: trades.length ? summarizeSetupAdherence(trades) : null,
    hasPre: !!(pre?.savedAt),
    hasPlan: !!(plan?.savedAt),
    hasPost: !!(post?.savedAt),
    readinessScore,
    readinessLabel: readiness?.label || null,
    readinessTone: readiness?.tone || null,
    netPnl: resolveNetPnl(post, trades),
  };
}

export async function loadSessionDay(dateKey, { postFromApi = false } = {}) {
  const [pre, plan, post, trades] = await Promise.all([
    loadJson(`${KEYS.pre}${dateKey}`),
    loadJson(`${KEYS.plan}${dateKey}`),
    loadPostReview(dateKey, { preferApi: postFromApi }),
    fetchTradesForDate(dateKey),
  ]);

  return buildSessionRecord(dateKey, pre, plan, post, trades);
}

/** Lightweight list load: bulk storage reads + one trades query. */
export async function loadRecentSessions({
  asOfDateKey,
  limit = 12,
  lookbackDays = 45,
} = {}) {
  const anchor = asOfDateKey || todayKey();
  const minDate = offsetDateKey(anchor, -lookbackDays);

  const [preMap, planMap, postMap] = await Promise.all([
    loadJsonMapByPrefix(KEYS.pre),
    loadJsonMapByPrefix(KEYS.plan),
    loadJsonMapByPrefix(KEYS.post),
  ]);

  const dates = [...collectDatesFromMaps(preMap, planMap, postMap)]
    .filter((d) => d >= minDate && d <= anchor)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, limit);

  if (!dates.length) return [];

  const tradesByDate = await fetchTradesGroupedByDate(dates);

  return dates.map((dateKey) => {
    const pre = preMap.get(`${KEYS.pre}${dateKey}`) ?? null;
    const plan = planMap.get(`${KEYS.plan}${dateKey}`) ?? null;
    const post = postMap.get(`${KEYS.post}${dateKey}`) ?? null;
    const trades = tradesByDate.get(dateKey) || [];
    return buildSessionRecord(dateKey, pre, plan, post, trades);
  });
}

/** All prior days with saved close loop + open journal checkoffs (no recent-session limit). */
export async function loadJournalReviewCarryoverSessions(beforeDateKey) {
  if (!beforeDateKey) return [];

  const postMap = await loadJsonMapByPrefix(KEYS.post);
  const carryover = [];

  for (const [key, post] of postMap) {
    const date = dateFromKey(key, KEYS.post);
    if (!date || date >= beforeDateKey) continue;
    if (!post?.savedAt || !hasJournalReviewPending(post)) continue;
    carryover.push({ date, post });
  }

  return carryover.sort((a, b) => b.date.localeCompare(a.date));
}

export async function loadAllSessions({ maxDays = 90 } = {}) {
  const [preMap, planMap, postMap] = await Promise.all([
    loadJsonMapByPrefix(KEYS.pre),
    loadJsonMapByPrefix(KEYS.plan),
    loadJsonMapByPrefix(KEYS.post),
  ]);

  const dates = [...collectDatesFromMaps(preMap, planMap, postMap)]
    .sort((a, b) => b.localeCompare(a))
    .slice(0, maxDays);

  if (!dates.length) return [];

  const tradesByDate = await fetchTradesGroupedByDate(dates);
  return dates.map((dateKey) => {
    const pre = preMap.get(`${KEYS.pre}${dateKey}`) ?? null;
    const plan = planMap.get(`${KEYS.plan}${dateKey}`) ?? null;
    const post = postMap.get(`${KEYS.post}${dateKey}`) ?? null;
    const trades = tradesByDate.get(dateKey) || [];
    return buildSessionRecord(dateKey, pre, plan, post, trades);
  });
}

export async function deleteSessionDay(dateKey) {
  const res = await fetch(`/api/sessions/${dateKey}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete session");
  }
}

export function isStepComplete(data) {
  return !!(data?.savedAt);
}

/** Risk plan followed from post-market (riskPlanFollowed with legacy planProcessFollowed fallback). */
export function getRiskPlanFollowed(post) {
  if (!post) return null;
  if (post.riskPlanFollowed === true || post.riskPlanFollowed === false) {
    return post.riskPlanFollowed;
  }
  if (post.planProcessFollowed === true || post.planProcessFollowed === false) {
    return post.planProcessFollowed;
  }
  return null;
}

/**
 * Risk-adherence streak day outcome from a saved post-market review.
 * - followed: riskPlanFollowed === true (legacy: planProcessFollowed)
 * - broken: explicitly false
 * - unknown: legacy save without the field (skipped when counting, never breaks retroactively)
 * - unanswered: no saved post-market
 */
export function getProcessStreakDayStatus(session) {
  const post = session?.post;
  if (!post?.savedAt) return "unanswered";
  // No-trade days (holiday, rest, Preservation Mode) neither extend nor break streaks.
  if (post.noTradeToday) return "skip";
  const riskPlan = getRiskPlanFollowed(post);
  if (riskPlan === true) return "followed";
  if (riskPlan === false) return "broken";
  return "unknown";
}

/**
 * Consecutive trading days with risk plan followed, walking backward from asOfDateKey.
 * Anchor day unanswered: skipped (streak not extended or broken until saved).
 * Past day without post-market or unanswered: breaks streak.
 * Legacy saves (no field): skipped — no credit, no retroactive break.
 */
export function countProcessStreakAsOf(sessions, asOfDateKey) {
  const byDate = new Map(sessions.map((s) => [s.date, s]));
  let streak = 0;
  let key = asOfDateKey;

  for (let i = 0; i < 365; i++) {
    const cal = new Date(`${key}T12:00:00`);

    if (!isTradingDay(cal)) {
      key = offsetDateKey(key, -1);
      continue;
    }

    const status = getProcessStreakDayStatus(byDate.get(key));
    const isAnchor = key === asOfDateKey;

    if (status === "followed") {
      streak += 1;
      key = offsetDateKey(key, -1);
    } else if (status === "broken") {
      break;
    } else if (status === "unknown" || status === "skip") {
      key = offsetDateKey(key, -1);
    } else if (isAnchor) {
      key = offsetDateKey(key, -1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Consecutive trading days with risk plan followed, walking backward from today.
 */
export function countProcessStreak(sessions) {
  return countProcessStreakAsOf(sessions, todayKey());
}

/**
 * Playbook process day from trade tags.
 * - skip: no trades
 * - followed: no invalid / untagged (improvised allowed)
 * - broken: invalid or untagged trades
 * - pending: anchor day only — trades exist but still untagged
 */
export function getPlaybookStreakDayStatus(session) {
  const trades = session?.trades || [];
  if (!trades.length) return "skip";
  const adherence = summarizeSetupAdherence(trades);
  if (adherence.untagged > 0) return "pending";
  if (adherence.processPass) return "followed";
  return "broken";
}

export function countPlaybookStreakAsOf(sessions, asOfDateKey) {
  const byDate = new Map(sessions.map((s) => [s.date, s]));
  let streak = 0;
  let key = asOfDateKey;

  for (let i = 0; i < 365; i++) {
    const cal = new Date(`${key}T12:00:00`);

    if (!isTradingDay(cal)) {
      key = offsetDateKey(key, -1);
      continue;
    }

    const status = getPlaybookStreakDayStatus(byDate.get(key));
    const isAnchor = key === asOfDateKey;

    if (status === "followed") {
      streak += 1;
      key = offsetDateKey(key, -1);
    } else if (status === "broken") {
      break;
    } else if (status === "pending" && isAnchor) {
      key = offsetDateKey(key, -1);
    } else if (status === "skip") {
      key = offsetDateKey(key, -1);
    } else {
      break;
    }
  }

  return streak;
}

export function countPlaybookStreak(sessions) {
  return countPlaybookStreakAsOf(sessions, todayKey());
}

/**
 * Risk adherence streak display for a single history row (as of end of that trading day).
 */
export function getProcessStreakDisplayForDay(session, sessions) {
  const status = getProcessStreakDayStatus(session);
  if (status === "unanswered" || status === "unknown" || status === "skip") {
    return { type: "unanswered", streak: 0 };
  }
  if (status === "broken") {
    return { type: "broken", streak: 0 };
  }
  return {
    type: "followed",
    streak: countProcessStreakAsOf(sessions, session.date),
  };
}

export function getTimeContext() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function formatTimeEyebrow(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

export function isWeekend(date = new Date()) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isTradingDay(date = new Date()) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

/** Next Mon–Fri date key after fromDate (local calendar). */
export function nextTradingDayKey(fromDate = new Date()) {
  const d = new Date(fromDate);
  d.setHours(12, 0, 0, 0);
  do {
    d.setDate(d.getDate() + 1);
  } while (!isTradingDay(d));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatGreetingDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).toUpperCase();
}

export function formatHeaderDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();
}

/** Home dashboard top bar: Tuesday, June 2026 */
export function formatHomeBarDate(date = new Date()) {
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const year = date.getFullYear();
  return `${weekday}, ${month} ${year}`;
}

/** Poster-style date: 16 · 06 · 26 */
export function formatPosterDate(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd} · ${mm} · ${yy}`;
}

/** Compact history row: Jun 16 */
export function formatShortHistoryDate(dateKey) {
  return parseDateKey(dateKey).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`);
}

export function formatHistoryRowDate(dateKey) {
  return parseDateKey(dateKey).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDetailTitle(dateKey) {
  return parseDateKey(dateKey).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatUsd(n, { signed = false } = {}) {
  if (n == null || Number.isNaN(n)) return "—";
  const abs = Math.abs(n).toFixed(2);
  if (signed) return n >= 0 ? `+$${abs}` : `-$${abs}`;
  return n >= 0 ? `$${abs}` : `-$${abs}`;
}

export function biasTag(bias) {
  if (!bias) return null;
  if (bias.includes("Long")) return "LONG";
  if (bias.includes("Short")) return "SHORT";
  if (bias.includes("Neutral")) return "NEUTRAL";
  if (bias.includes("Wait")) return "WAIT";
  return bias.split(" ")[0].toUpperCase();
}

export function volTag(vol) {
  if (!vol) return null;
  return vol === "Normal" ? "NORMAL VOL" : `${vol.toUpperCase()} VOL`;
}
