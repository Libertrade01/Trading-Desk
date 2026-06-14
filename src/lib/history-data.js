import { storage, supabase } from "./supabase";
import { computeReadinessScore, readinessStatus } from "./premarket-scoring";
import { computePerformanceFromDbTrades, fetchTradesForDate } from "./rtrader-import";

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

/** Rough session indicator for home top bar (weekends always off). */
export function getMarketStatus(date = new Date()) {
  if (isWeekend(date)) return { label: "Off hours", live: false };
  const hour = date.getHours();
  if (hour >= 9 && hour < 17) return { label: "Live", live: true };
  return { label: "Off hours", live: false };
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
