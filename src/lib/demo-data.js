/**
 * Deterministic Libertrade LOOP demo fixtures for the public /demo experience.
 * Fixed end date so screenshots and portfolio demos stay stable.
 */

import { VALID_SETUPS } from "./setup-options";
import { summarizeSetupAdherence } from "./setup-adherence";

export const DEMO_END_DATE = "2026-07-22";
export const DEMO_MONTHS = 3;
export const DEMO_ACCOUNT_NAME = "Demo Prop";
export const DEMO_PROFILE = {
  preferredName: "Alex",
  streakTargetDays: 20,
  riskStreakEnabled: true,
  playbookStreakEnabled: true,
};

const DAY_PNL_PATTERN = [
  420, 1180, -210, 380, -740,
  410, 250, -180, 1120, 390,
  -220, 450, -750, 360, 980,
  -190, 400, 200, -230, 1150,
  370, -200, 430, -160, 890,
];

const READINESS_PATTERN = [
  72, 81, 58, 74, 49,
  76, 68, 61, 84, 70,
  55, 78, 47, 73, 82,
  64, 71, 66, 59, 79,
  75, 62, 77, 69, 80,
];

const ENTRY_SLOTS = [
  { hour: 9, minute: 35 },
  { hour: 10, minute: 8 },
  { hour: 10, minute: 42 },
  { hour: 11, minute: 15 },
  { hour: 11, minute: 48 },
  { hour: 12, minute: 20 },
];

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`);
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function offsetDateKey(dateKey, dayOffset) {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + dayOffset);
  return formatDateKey(d);
}

function isWeekday(dateKey) {
  const day = parseDateKey(dateKey).getDay();
  return day >= 1 && day <= 5;
}

/** Mon–Fri date keys from ~3 months before DEMO_END_DATE through DEMO_END_DATE. */
export function listDemoWeekdays(endDate = DEMO_END_DATE, months = DEMO_MONTHS) {
  const end = parseDateKey(endDate);
  const start = new Date(end);
  start.setMonth(start.getMonth() - months);
  const dates = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const key = formatDateKey(cursor);
    if (isWeekday(key)) dates.push(key);
  }
  return dates;
}

function dayPnlTarget(dateKey, index) {
  const base = DAY_PNL_PATTERN[index % DAY_PNL_PATTERN.length];
  const rand = mulberry32(hashSeed(`pnl:${dateKey}`));
  const wobble = Math.round((rand() - 0.5) * 60);
  let value = base + wobble;
  if (value > 1200) value = 1200;
  if (value < -750) value = -750;
  return value;
}

function dayReadiness(dateKey, index) {
  const base = READINESS_PATTERN[index % READINESS_PATTERN.length];
  const rand = mulberry32(hashSeed(`ready:${dateKey}`));
  return Math.max(42, Math.min(92, base + Math.round((rand() - 0.5) * 8)));
}

function easternIso(dateKey, hour, minute, second = 0) {
  const pad = (n) => String(n).padStart(2, "0");
  // Store as UTC ISO (Z). Demo fixtures assume EDT (-04:00) so clocks render via formatLimaTime.
  const utc = new Date(`${dateKey}T${pad(hour)}:${pad(minute)}:${pad(second)}-04:00`);
  return utc.toISOString();
}

function splitDayPnl(dayNet, tradeCount, rand) {
  const weights = Array.from({ length: tradeCount }, () => 0.35 + rand());
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (dayNet * w) / sum);
  const rounded = raw.map((v) => Math.round(v * 100) / 100);
  const drift = Math.round((dayNet - rounded.reduce((a, b) => a + b, 0)) * 100) / 100;
  rounded[rounded.length - 1] = Math.round((rounded[rounded.length - 1] + drift) * 100) / 100;
  return rounded;
}

function buildTrade({ dateKey, index, netPnl, rand }) {
  const slot = ENTRY_SLOTS[index % ENTRY_SLOTS.length];
  const holdMins = 4 + Math.floor(rand() * 22);
  const entryHour = slot.hour;
  const entryMinute = slot.minute + Math.floor(rand() * 6);
  const exitTotal = entryHour * 60 + entryMinute + holdMins;
  const exitHour = Math.floor(exitTotal / 60);
  const exitMinute = exitTotal % 60;
  const direction = rand() > 0.42 ? "long" : "short";
  const quantity = rand() > 0.55 ? 6 : rand() > 0.35 ? 4 : 2;
  const entryPrice = 21500 + Math.round(rand() * 180);
  const points = (netPnl / (quantity * 2)) || 0;
  const exitPrice =
    direction === "long"
      ? Math.round((entryPrice + points) * 100) / 100
      : Math.round((entryPrice - points) * 100) / 100;
  const commission = Math.round(quantity * 0.62 * 100) / 100;
  const grossPnl = Math.round((netPnl + commission) * 100) / 100;
  const setup = VALID_SETUPS[Math.floor(rand() * VALID_SETUPS.length)];
  const stopLossPoints = Math.max(4, Math.round(8 + rand() * 10));

  return {
    id: `demo-trade-${dateKey}-${index}`,
    broker_trade_id: `demo:portfolio-v1:${dateKey}:${index}`,
    entry_time: easternIso(dateKey, entryHour, entryMinute, Math.floor(rand() * 50)),
    exit_time: easternIso(dateKey, exitHour, exitMinute, Math.floor(rand() * 50)),
    date: dateKey,
    instrument: "MNQ",
    direction,
    quantity,
    entry_price: entryPrice,
    exit_price: exitPrice,
    gross_pnl: grossPnl,
    commission,
    net_pnl: netPnl,
    platform: "demo",
    account_name: DEMO_ACCOUNT_NAME,
    account_type: "prop",
    stop_loss_points: stopLossPoints,
    setup,
    management: rand() > 0.7 ? "scaled" : "held",
    sequence_id: rand() > 0.65 ? `seq-${dateKey}` : null,
    post_exit_outcome: null,
  };
}

function buildDayTrades(dateKey, dayIndex) {
  const rand = mulberry32(hashSeed(`trades:${dateKey}`));
  const tradeCount = 4 + Math.floor(rand() * 3); // 4–6
  const dayNet = dayPnlTarget(dateKey, dayIndex);
  const pnls = splitDayPnl(dayNet, tradeCount, rand);
  return pnls.map((netPnl, index) => buildTrade({ dateKey, index, netPnl, rand }));
}

function buildSession(dateKey, dayIndex, trades) {
  const readinessScore = dayReadiness(dateKey, dayIndex);
  const dayNet = trades.reduce((sum, t) => sum + (t.net_pnl || 0), 0);
  const riskFollowed = dayNet > -500;
  const pre = {
    savedAt: `${dateKey}T12:05:00.000Z`,
    readinessScore,
    sleepHours: 6.5 + (readinessScore % 5) * 0.2,
    emotionalState: Math.max(4, Math.round(readinessScore / 12)),
    confidence: Math.max(4, Math.round(readinessScore / 11)),
  };
  const plan = {
    savedAt: `${dateKey}T12:20:00.000Z`,
    directionalBias: dayNet >= 0 ? "bullish" : "bearish",
    thesis: "Follow the higher-timeframe bias and wait for A+ pullbacks.",
  };
  const post = {
    savedAt: `${dateKey}T20:15:00.000Z`,
    netPnl: Math.round(dayNet * 100) / 100,
    trades: trades.length,
    riskPlanFollowed: riskFollowed,
    followedPlan: riskFollowed ? 8 : 5,
    setupQuality: 7,
    riskDiscipline: riskFollowed ? 8 : 4,
    executionQuality: 7,
    replaySequenceReviewed: true,
    setupsScreenshottedSaved: true,
    noTradeToday: false,
  };

  return {
    date: dateKey,
    pre,
    plan,
    post,
    trades,
    playbookAdherence: summarizeSetupAdherence(trades),
    hasPre: true,
    hasPlan: true,
    hasPost: true,
    readinessScore,
    readinessLabel: readinessScore >= 70 ? "Ready" : readinessScore >= 50 ? "Neutral" : "Protective",
    readinessTone: readinessScore >= 70 ? "good" : readinessScore >= 50 ? "caution" : "standdown",
    netPnl: Math.round(dayNet * 100) / 100,
  };
}

let cachedBundle = null;

/** Full demo bundle: sessions, trades, readiness, settings, focus. */
export function getDemoBundle() {
  if (cachedBundle) return cachedBundle;

  const weekdays = listDemoWeekdays();
  const sessions = [];
  const trades = [];
  const readinessScores = [];

  weekdays.forEach((dateKey, index) => {
    const dayTrades = buildDayTrades(dateKey, index);
    trades.push(...dayTrades);
    readinessScores.push({ date: dateKey, readinessScore: dayReadiness(dateKey, index) });
    sessions.push(buildSession(dateKey, index, dayTrades));
  });

  sessions.sort((a, b) => b.date.localeCompare(a.date));
  trades.sort((a, b) => (b.entry_time || "").localeCompare(a.entry_time || ""));

  const todaySession = sessions.find((s) => s.date === DEMO_END_DATE) || sessions[0];
  const priorWeekEnd = offsetDateKey(DEMO_END_DATE, -((parseDateKey(DEMO_END_DATE).getDay() + 2) % 7) - 7);
  // Focus items come from the completed prior-week review.
  const weekFocus = {
    items: [
      "Wait for bar closes on price-action signals",
      "Stop after two consecutive losers",
    ],
    weekEnd: priorWeekEnd,
    complete: true,
    missingReviewWeek: null,
  };

  cachedBundle = {
    endDate: DEMO_END_DATE,
    startDate: weekdays[0],
    weekdays,
    sessions,
    trades,
    readinessScores,
    todaySession,
    weekFocus,
    profile: DEMO_PROFILE,
    settings: {
      accounts: [{ id: "demo", name: DEMO_ACCOUNT_NAME, active: true, account_type: "prop" }],
      beThreshold: 25,
    },
    playbookTrackingStart: weekdays[0],
  };

  return cachedBundle;
}

export function getDemoTradesInRange(dateFrom, dateTo) {
  const { trades } = getDemoBundle();
  return trades.filter((t) => {
    if (dateFrom && t.date < dateFrom) return false;
    if (dateTo && t.date > dateTo) return false;
    return true;
  });
}

export function getDemoReadinessInRange(dateFrom, dateTo) {
  const { readinessScores } = getDemoBundle();
  return readinessScores.filter((row) => {
    if (dateFrom && row.date < dateFrom) return false;
    if (dateTo && row.date > dateTo) return false;
    return true;
  });
}

export function getDemoSessions({ asOfDateKey = DEMO_END_DATE, limit = 35 } = {}) {
  const { sessions } = getDemoBundle();
  return sessions.filter((s) => s.date <= asOfDateKey).slice(0, limit);
}
