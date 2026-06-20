import { storage, supabase } from "./supabase";
import { computeReadinessScore, readinessStatus } from "./premarket-scoring";
import { computePerformanceFromDbTrades, fetchTradesForDate } from "./rtrader-import";
import { summarizeSetupAdherence } from "./setup-adherence";

const KEYS = {
  pre: "premarket-checkin-",
  plan: "daily-plan-",
  post: "postmarket-review-",
};

async function loadJson(key) {
  try {
    const r = await storage.get(key);
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
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
  if (post?.netPnl != null && post.netPnl !== "") return Number(post.netPnl);
  if (post) {
    const gross = parseFloat(post.grossPnl);
    const comm = parseFloat(post.commissionsFees);
    if (!Number.isNaN(gross)) {
      return Math.round((gross - (Number.isNaN(comm) ? 0 : comm)) * 100) / 100;
    }
  }
  if (trades?.length) {
    return computePerformanceFromDbTrades(trades).netPnl;
  }
  return null;
}

export async function loadSessionDay(dateKey) {
  const [pre, plan, post, trades] = await Promise.all([
    loadJson(`${KEYS.pre}${dateKey}`),
    loadJson(`${KEYS.plan}${dateKey}`),
    loadJson(`${KEYS.post}${dateKey}`),
    fetchTradesForDate(dateKey),
  ]);

  const readinessScore = pre?.readinessScore ?? (pre ? computeReadinessScore(pre).composite : null);
  const readiness = readinessScore != null ? readinessStatus(readinessScore) : null;

  return {
    date: dateKey,
    pre,
    plan,
    post,
    trades,
    playbookAdherence: trades.length ? summarizeSetupAdherence(trades) : null,
    hasPre: !!pre,
    hasPlan: !!plan,
    hasPost: !!post,
    readinessScore,
    readinessLabel: readiness?.label || null,
    readinessTone: readiness?.tone || null,
    netPnl: resolveNetPnl(post, trades),
  };
}

export async function loadAllSessions() {
  const dates = await fetchSessionDates();
  return Promise.all(dates.map(loadSessionDay));
}

export async function deleteSessionDay(dateKey) {
  await Promise.all([
    storage.delete(`${KEYS.pre}${dateKey}`),
    storage.delete(`${KEYS.plan}${dateKey}`),
    storage.delete(`${KEYS.post}${dateKey}`),
  ]);
  await supabase.from("trades").delete().eq("date", dateKey);
}

export function todayKey() {
  return new Date().toISOString().split("T")[0];
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
  const d = new Date(`${asOfDateKey}T12:00:00`);

  for (let i = 0; i < 365; i++) {
    const key = d.toISOString().split("T")[0];

    if (!isTradingDay(d)) {
      d.setDate(d.getDate() - 1);
      continue;
    }

    const status = getProcessStreakDayStatus(byDate.get(key));
    const isAnchor = key === asOfDateKey;

    if (status === "followed") {
      streak += 1;
      d.setDate(d.getDate() - 1);
    } else if (status === "broken") {
      break;
    } else if (status === "unknown") {
      d.setDate(d.getDate() - 1);
    } else if (isAnchor) {
      d.setDate(d.getDate() - 1);
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
  const d = new Date(`${asOfDateKey}T12:00:00`);

  for (let i = 0; i < 365; i++) {
    const key = d.toISOString().split("T")[0];

    if (!isTradingDay(d)) {
      d.setDate(d.getDate() - 1);
      continue;
    }

    const status = getPlaybookStreakDayStatus(byDate.get(key));
    const isAnchor = key === asOfDateKey;

    if (status === "followed") {
      streak += 1;
      d.setDate(d.getDate() - 1);
    } else if (status === "broken") {
      break;
    } else if (status === "pending" && isAnchor) {
      d.setDate(d.getDate() - 1);
    } else if (status === "skip") {
      d.setDate(d.getDate() - 1);
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
  if (status === "unanswered" || status === "unknown") {
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
