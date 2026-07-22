/**
 * Deterministic Libertrade LOOP demo fixtures for the public /demo experience.
 * Fixed end date so screenshots and portfolio demos stay stable.
 */

import { DEFAULT_DAILY_PLAN } from "./daily-plan-defaults";
import { DEFAULT_POSTMARKET } from "./postmarket-defaults";
import { DEFAULT_PREMARKET_FORM } from "./premarket-scoring";
import { VALID_SETUPS } from "./setup-options";
import { summarizeSetupAdherence } from "./setup-adherence";
import { DEFAULT_COMMITMENT, normalizeTraderProfile } from "./trader-profile";

export const DEMO_END_DATE = "2026-07-22";
export const DEMO_MONTHS = 3;
export const DEMO_ACCOUNT_NAME = "Demo Prop";
export const DEMO_PROFILE = {
  preferredName: "Alex",
  streakTargetDays: 20,
  riskStreakEnabled: true,
  playbookStreakEnabled: true,
};

/** Stable customer profile for loop pages (fixed ids so fixtures stay deterministic). */
export const DEMO_TRADER_PROFILE = normalizeTraderProfile({
  profileKind: "customer",
  preferredName: "Alex",
  onboardingCompletedAt: "2026-04-01T12:00:00.000Z",
  setups: [
    { id: "demo-setup-orb", name: "ORB continuation" },
    { id: "demo-setup-pullback", name: "Pullback to value" },
  ],
  commitments: [{ id: "demo-commit-1", text: DEFAULT_COMMITMENT }],
  biasChecklistEnabled: false,
  streakTargetDays: 20,
  riskStreakEnabled: true,
  playbookStreakEnabled: true,
  usesWearable: false,
  showColdTurkeyBlocker: false,
  finishChecklist: [
    { id: "demo-desk-accounts", label: "Account(s) Ready" },
    { id: "demo-desk-cpu", label: "CPU OK" },
    { id: "demo-desk-risk", label: "Risk Bracket Set" },
  ],
  closeoutHabits: [
    {
      id: "setups",
      fieldKey: "setupsScreenshottedSaved",
      statusLabel: "Setups",
      label: "Today's A+ setup screenshots saved (taken or missed)",
      enabled: true,
    },
    {
      id: "replay",
      fieldKey: "replaySequenceReviewed",
      statusLabel: "Replay",
      label: "One trade sequence reviewed in REPLAY.",
      enabled: true,
    },
  ],
  defaultMaxDailyLoss: "750",
  defaultMaxTrades: "4",
  defaultPositionSize: "4",
});

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

function buildTodayPremarket(todaySession) {
  const readiness = todaySession?.readinessScore ?? 62;
  return {
    ...DEFAULT_PREMARKET_FORM,
    date: DEMO_END_DATE,
    emotionalState: 6,
    confidence: 6,
    patience: 7,
    fomoRisk: 4,
    revengeRisk: 3,
    sleepHours: 7.2,
    sleepDebtMinutes: 0,
    sleepQuality: 7,
    energy: 6,
    hydrated: true,
    movement: true,
    externalDistracted: 4,
    financialPressure: 4,
    generalFocusLevel: 7,
    reviewedKeyLevels: true,
    reviewedNews: true,
    dailyPlanWritten: true,
    followedRoutine: true,
    meditation: true,
    unlockAccounts: true,
    checkCpu: true,
    selectRiskBracketOrder: true,
    deskChecks: {
      "demo-desk-accounts": true,
      "demo-desk-cpu": true,
      "demo-desk-risk": true,
    },
    mantra: "Wait for the close. Protect the account.",
    readinessScore: readiness,
    readinessStatus: readiness >= 70 ? "Ready" : readiness >= 50 ? "Neutral" : "Protective",
    readinessTone: readiness >= 70 ? "green" : readiness >= 50 ? "amber" : "red",
    savedAt: `${DEMO_END_DATE}T12:05:00.000Z`,
  };
}

function buildTodayPlan(todaySession) {
  const bearish = (todaySession?.netPnl || 0) < 0;
  return {
    ...DEFAULT_DAILY_PLAN,
    date: DEMO_END_DATE,
    directionalBias: bearish ? "Bearish" : "Bullish",
    expectedVolatility: "Normal",
    whyBias: bearish
      ? "Price rejected value high overnight and is accepting lower. Wait for failed reclaim shorts and avoid chasing early longs."
      : "Overnight inventory is long and price is holding above value. Look for pullbacks into overnight low / VAH for continuation.",
    biasMarkedValueArea: true,
    biasMarkedNodesLvns: true,
    biasMarkedWeeklyProfile: true,
    sessionOpenVsValue: "Inside Value (expect rotational)",
    keyLevels: [
      { id: "demo-lvl-vah", label: "VAH", price: "21642", type: "Resistance" },
      { id: "demo-lvl-poc", label: "POC", price: "21588", type: "Support" },
      { id: "demo-lvl-val", label: "VAL", price: "21531", type: "Support" },
    ],
    setups: [
      {
        id: "demo-plan-setup-1",
        name: "ORB continuation",
        conditions: "Hold above opening range after first reclaim",
        target: "Prior day high / next LVN",
        stop: "Below OR low",
      },
      {
        id: "demo-plan-setup-2",
        name: "Pullback to value",
        conditions: "Pullback into VAH/POC with absorption",
        target: "Session high",
        stop: "Below pullback low",
      },
    ],
    maxDailyLoss: "750",
    maxTrades: "4",
    positionSize: "4",
    stopTradingAt: "Two consecutive losers",
    maxDailyLossSetInBroker: true,
    coldTurkeyBlockerSet: false,
    sessionRules: "No trades in first 3 minutes. Stop after two losers. Size down if readiness < 55.",
    oneThing: "Wait for bar closes on price-action signals.",
    selfCommitmentAccepted: true,
    commitmentAccepted: { "demo-commit-1": true },
    savedAt: `${DEMO_END_DATE}T12:20:00.000Z`,
  };
}

function buildTodayPost(todaySession, todayTrades) {
  const dayNet = todaySession?.netPnl ?? 0;
  const wins = todayTrades.filter((t) => (t.net_pnl || 0) > 0).length;
  const losses = todayTrades.filter((t) => (t.net_pnl || 0) < 0).length;
  const commissions = Math.round(
    todayTrades.reduce((sum, t) => sum + (Number(t.commission) || 0), 0) * 100
  ) / 100;
  const gross = Math.round((dayNet + commissions) * 100) / 100;
  const best = todayTrades.reduce((max, t) => Math.max(max, t.net_pnl || 0), 0);
  const worst = todayTrades.reduce((min, t) => Math.min(min, t.net_pnl || 0), 0);

  return {
    ...DEFAULT_POSTMARKET,
    date: DEMO_END_DATE,
    noTradeToday: false,
    performanceEntryMode: "csv",
    trades: String(todayTrades.length),
    wins: String(wins),
    losses: String(losses),
    grossPnl: String(gross),
    bestWinner: String(Math.round(best * 100) / 100),
    worstLoss: String(Math.round(worst * 100) / 100),
    commissionsFees: String(commissions),
    followedPlan: dayNet > -500 ? 8 : 5,
    setupQuality: 7,
    riskDiscipline: dayNet > -500 ? 8 : 5,
    executionQuality: 7,
    overtraded: false,
    oversized: false,
    movedStops: false,
    revengeTraded: false,
    fomoEntry: dayNet < 0,
    emotionalState: dayNet >= 0 ? 7 : 5,
    satisfaction: dayNet >= 0 ? 7 : 4,
    frustration: dayNet >= 0 ? 3 : 6,
    riskPlanFollowed: dayNet > -500,
    readVsReality: dayNet >= 0
      ? "Bias held. Took the planned pullback and protected the open."
      : "Bias was fine, but I pressed after the first loser instead of stopping.",
    wentWell: "Waited for the open to settle and tagged setups before entry.",
    wentWrong: dayNet >= 0
      ? "Left a little on the table by scratching the runner early."
      : "Second trade was A- at best — should have stood down after loser #1.",
    oneLesson: "Stop after two consecutive losers. Protect the process first.",
    replaySequenceReviewed: true,
    setupsScreenshottedSaved: true,
    lastImportFile: "demo-session-export.csv",
    lastImportAt: `${DEMO_END_DATE}T19:55:00.000Z`,
    savedAt: `${DEMO_END_DATE}T20:15:00.000Z`,
  };
}

function buildPropLedger(weekdays) {
  const mid = weekdays[Math.floor(weekdays.length / 2)] || DEMO_END_DATE;
  const early = weekdays[8] || weekdays[0] || DEMO_END_DATE;
  const late = weekdays[weekdays.length - 12] || mid;
  return {
    firms: ["Lucid", "Tradeify", "Demo Prop"],
    entries: [
      {
        id: "demo-prop-1",
        date: early,
        type: "spend",
        firm: "Lucid",
        amount: 149,
        category: "eval",
        note: "50K evaluation",
      },
      {
        id: "demo-prop-2",
        date: offsetDateKey(early, 14),
        type: "spend",
        firm: "Lucid",
        amount: 99,
        category: "reset",
        note: "Reset after rule breach",
      },
      {
        id: "demo-prop-3",
        date: mid,
        type: "spend",
        firm: "Tradeify",
        amount: 179,
        category: "eval",
        note: "100K evaluation",
      },
      {
        id: "demo-prop-4",
        date: late,
        type: "payout",
        firm: "Lucid",
        amount: 1250,
        category: "payout",
        note: "First funded payout",
      },
      {
        id: "demo-prop-5",
        date: offsetDateKey(late, 10),
        type: "payout",
        firm: "Tradeify",
        amount: 800,
        category: "payout",
        note: "Partial withdrawal",
      },
      {
        id: "demo-prop-6",
        date: DEMO_END_DATE,
        type: "spend",
        firm: "Demo Prop",
        amount: 49,
        category: "data",
        note: "Data / platform fee",
      },
    ],
  };
}

let cachedBundle = null;

/** Full demo bundle: sessions, trades, readiness, settings, focus, loop forms. */
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
  const todayTrades = trades.filter((t) => t.date === DEMO_END_DATE);
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

  const todayPremarket = buildTodayPremarket(todaySession);
  const todayPlan = buildTodayPlan(todaySession);
  const todayPost = buildTodayPost(todaySession, todayTrades);

  cachedBundle = {
    endDate: DEMO_END_DATE,
    startDate: weekdays[0],
    weekdays,
    sessions,
    trades,
    readinessScores,
    todaySession,
    todayTrades,
    todayPremarket,
    todayPlan,
    todayPost,
    morningThesis: todayPlan.whyBias,
    propLedger: buildPropLedger(weekdays),
    weekFocus,
    profile: DEMO_PROFILE,
    traderProfile: DEMO_TRADER_PROFILE,
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
