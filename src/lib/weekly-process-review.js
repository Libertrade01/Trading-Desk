import {
  BEHAVIORAL_FLAG_CATEGORIES,
  BEHAVIORAL_FLAGS,
  getRaisedBehavioralFlags,
  normalizePostmarketFlags,
} from "./postmarket-defaults";
import {
  isSleepDebtSevere,
  parseSleepDebtMinutes,
  SLEEP_DEBT_SEVERE_CAUTION_MINS,
} from "./premarket-scoring";
import { summarizeSetupAdherence } from "./setup-adherence";
import { calendarDateParts, offsetDateKey, todayKey } from "./today-key";
import { loadAllSessions, fetchSessionDates, getRiskPlanFollowed } from "./history-data";
import { storage } from "./supabase";

const REVIEW_KEY_PREFIX = "weekly-process-review-";
const PLAYBOOK_TARGET_PCT = 80;
const POST_SLIDER_KEYS = ["followedPlan", "setupQuality", "riskDiscipline", "executionQuality"];

function dateKeyStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Mon–Fri week containing today, offset by whole weeks (0 = current). */
export function getProcessWeekRange(offsetFromNow = 0) {
  const { cal } = calendarDateParts();
  const mon = new Date(cal);
  const dow = cal.getDay();
  mon.setDate(cal.getDate() - (dow === 0 ? 6 : dow - 1));
  mon.setDate(mon.getDate() + offsetFromNow * 7);
  const fri = new Date(mon);
  fri.setDate(fri.getDate() + 4);
  return { start: dateKeyStr(mon), end: dateKeyStr(fri) };
}

/**
 * Mon–Fri week for market calendar UI.
 * Mon–Fri → current trading week; Sat/Sun → upcoming week (matches Sunday cron refresh).
 */
export function getDisplayTradingWeekRange() {
  const { cal } = calendarDateParts();
  const dow = cal.getDay();
  const mon = new Date(cal);

  if (dow === 0) {
    mon.setDate(cal.getDate() + 1);
  } else if (dow === 6) {
    mon.setDate(cal.getDate() + 2);
  } else {
    mon.setDate(cal.getDate() - (dow - 1));
  }

  const fri = new Date(mon);
  fri.setDate(fri.getDate() + 4);
  return {
    start: dateKeyStr(mon),
    end: dateKeyStr(fri),
    isUpcoming: dow === 0 || dow === 6,
  };
}

export function getRecentProcessWeeks(count = 8) {
  const weeks = [];
  for (let i = 0; i >= -(count - 1); i -= 1) {
    weeks.push(getProcessWeekRange(i));
  }
  return weeks;
}

/** Current Mon–Fri process week. */
export function getCurrentProcessWeek() {
  return getProcessWeekRange(0);
}

/** Mon–Fri range from the Friday end date (YYYY-MM-DD). */
export function weekRangeFromEnd(weekEnd) {
  return { start: offsetDateKey(weekEnd, -4), end: weekEnd };
}

export function formatPriorWeekDelta(current, prior, { suffix = "" } = {}) {
  if (current == null || prior == null) return null;
  const delta = current - prior;
  if (delta === 0) return "Same as prior week";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta}${suffix} vs prior week`;
}

/** Rows for the week-over-week comparison table. */
export function buildWeekComparison(summary, priorSummary) {
  if (!priorSummary) return [];

  const fmtPct = (v) => (v != null ? `${v}%` : "—");
  const fmtNum = (v) => (v != null ? String(v) : "—");
  const fmtRisk = (s) =>
    s.riskPlanAnswered > 0 ? `${s.riskPlanFollowed}/${s.riskPlanAnswered}` : "—";

  const rows = [
    {
      label: "Avg readiness",
      current: fmtNum(summary.avgReadiness),
      prior: fmtNum(priorSummary.avgReadiness),
      delta: formatPriorWeekDelta(summary.avgReadiness, priorSummary.avgReadiness),
      invertGood: false,
    },
    {
      label: "Playbook",
      current: fmtPct(summary.avgPlaybookPct),
      prior: fmtPct(priorSummary.avgPlaybookPct),
      delta: formatPriorWeekDelta(summary.avgPlaybookPct, priorSummary.avgPlaybookPct, { suffix: " pts" }),
      invertGood: false,
    },
    {
      label: "Risk plan",
      current: fmtRisk(summary),
      prior: fmtRisk(priorSummary),
      delta: formatPriorWeekDelta(summary.riskPlanFollowed, priorSummary.riskPlanFollowed, { suffix: " days" }),
      invertGood: false,
    },
    {
      label: "Behavioral flags",
      current: fmtNum(summary.behavioralFlagCount),
      prior: fmtNum(priorSummary.behavioralFlagCount),
      delta: formatPriorWeekDelta(summary.behavioralFlagCount, priorSummary.behavioralFlagCount),
      invertGood: true,
    },
  ];

  return rows.filter((r) => r.current !== "—" || r.prior !== "—");
}

function isValidWeekEnd(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
}

function weekHasSessionDate(sessionDates, week) {
  return sessionDates.some((d) => d >= week.start && d <= week.end);
}

/** Current week plus recent session weeks and saved reviews (newest first). */
export async function listBrowsableProcessWeeks() {
  const current = getCurrentProcessWeek();
  const [{ keys }, sessionDates] = await Promise.all([
    storage.list(REVIEW_KEY_PREFIX),
    fetchSessionDates(),
  ]);
  const savedWeekEnds = new Set(
    (keys || [])
      .map((key) => key.slice(REVIEW_KEY_PREFIX.length))
      .filter(isValidWeekEnd)
  );
  const byEnd = new Map();

  const addWeek = (week) => {
    const isCurrent = week.end === current.end;
    if (!isCurrent && !savedWeekEnds.has(week.end) && !weekHasSessionDate(sessionDates, week)) return;
    byEnd.set(week.end, { ...week, isCurrent });
  };

  getRecentProcessWeeks(12).forEach(addWeek);
  savedWeekEnds.forEach((end) => addWeek(weekRangeFromEnd(end)));

  return Array.from(byEnd.values()).sort((a, b) => {
    if (a.isCurrent) return -1;
    if (b.isCurrent) return 1;
    return b.end.localeCompare(a.end);
  });
}

/** Remove saved reviews for weeks before weekStart (YYYY-MM-DD). */
export async function pruneProcessReviewsBefore(weekStart) {
  const { keys } = await storage.list(REVIEW_KEY_PREFIX);
  await Promise.all(
    (keys || [])
      .filter((key) => {
        const weekEnd = key.slice(REVIEW_KEY_PREFIX.length);
        return weekEnd < weekStart;
      })
      .map((key) => storage.delete(key))
  );
}

const PROCESS_REVIEW_RESET_KEY = "weekly-process-review-reset";
const LEGACY_PROCESS_REVIEW_RESET_KEY = "weekly-process-review-reset";

async function hasProcessReviewResetRun() {
  try {
    const r = await storage.get(PROCESS_REVIEW_RESET_KEY);
    if (r?.value) return true;
  } catch {
    /* fall through */
  }

  if (typeof window === "undefined") return false;
  if (!localStorage.getItem(LEGACY_PROCESS_REVIEW_RESET_KEY)) return false;

  await storage.set(PROCESS_REVIEW_RESET_KEY, "1");
  localStorage.removeItem(LEGACY_PROCESS_REVIEW_RESET_KEY);
  return true;
}

/** One-time cleanup: drop pre-current-week reviews when starting fresh. */
export async function runInitialProcessReviewReset() {
  if (await hasProcessReviewResetRun()) return;
  const { start } = getCurrentProcessWeek();
  await pruneProcessReviewsBefore(start);
  await storage.set(PROCESS_REVIEW_RESET_KEY, "1");
}

export function getWeekDayKeys(weekStart) {
  return [0, 1, 2, 3, 4].map((i) => offsetDateKey(weekStart, i));
}

export function formatProcessWeekLabel(start, end) {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (s.getMonth() === e.getMonth()) {
    return `${months[s.getMonth()]} ${s.getDate()}–${e.getDate()}`;
  }
  return `${months[s.getMonth()]} ${s.getDate()} – ${months[e.getMonth()]} ${e.getDate()}`;
}

export function reviewStorageKey(weekEnd) {
  return `${REVIEW_KEY_PREFIX}${weekEnd}`;
}

/** @deprecated Use reviewStorageKey */
export function focusStorageKey(weekEnd) {
  return reviewStorageKey(weekEnd);
}

export const EMPTY_MANUAL_REVIEW = {
  weekInOneLine: "",
  reflections: {
    pattern: "",
    brokenDay: "",
    differently: "",
  },
  focusItems: ["", ""],
  focusRetrospective: {},
  focusRetrospectiveNotes: {},
  savedAt: null,
  status: "draft",
};

export function isReviewComplete(manual) {
  if (!manual) return false;
  const line = (manual.weekInOneLine || "").trim();
  const f0 = (manual.focusItems?.[0] || "").trim();
  const f1 = (manual.focusItems?.[1] || "").trim();
  return !!(line && f0 && f1);
}

export async function loadSavedReview(weekEnd) {
  try {
    const r = await storage.get(reviewStorageKey(weekEnd));
    if (!r) return { ...EMPTY_MANUAL_REVIEW };
    const data = { ...EMPTY_MANUAL_REVIEW, ...JSON.parse(r.value) };
    data.focusItems = [
      data.focusItems?.[0] || "",
      data.focusItems?.[1] || "",
    ];
    data.focusRetrospectiveNotes = data.focusRetrospectiveNotes || {};
    data.status = isReviewComplete(data) ? "complete" : "draft";
    return data;
  } catch {
    return { ...EMPTY_MANUAL_REVIEW };
  }
}

export async function saveReview(weekEnd, manual) {
  const payload = {
    ...manual,
    focusItems: [
      (manual.focusItems?.[0] || "").trim(),
      (manual.focusItems?.[1] || "").trim(),
    ],
    savedAt: new Date().toISOString(),
    status: isReviewComplete(manual) ? "complete" : "draft",
  };
  await storage.set(reviewStorageKey(weekEnd), JSON.stringify(payload));
  return payload;
}

function avg(nums) {
  const vals = nums.filter((n) => n != null && !Number.isNaN(n));
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function isTradingDay(session) {
  // Explicit no-trade days (holiday, rest, Preservation Mode) are excluded from weekly denominators.
  if (session.post?.noTradeToday) return false;
  return (
    session.hasPost ||
    session.trades?.length > 0 ||
    (session.netPnl != null && session.netPnl !== 0)
  );
}

function formatDayShort(dateKey) {
  const d = new Date(`${dateKey}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function aggregateWeekSessions(allSessions, weekStart, weekEnd) {
  const byDate = Object.fromEntries(allSessions.map((s) => [s.date, s]));
  const dayKeys = getWeekDayKeys(weekStart);
  return dayKeys.map((date) => {
    if (byDate[date]) return byDate[date];
    return {
      date,
      pre: null,
      plan: null,
      post: null,
      trades: [],
      playbookAdherence: null,
      hasPre: false,
      hasPlan: false,
      hasPost: false,
      readinessScore: null,
      readinessLabel: null,
      readinessTone: null,
      netPnl: null,
    };
  });
}

export function buildWeeklyProcessSummary(sessions) {
  const tradingDays = sessions.filter(isTradingDay);
  const readinessScores = sessions.map((s) => s.readinessScore).filter((n) => n != null);
  const avgReadiness = avg(readinessScores);
  const lowReadinessDays = sessions.filter((s) => s.readinessScore != null && s.readinessScore < 50).length;

  let playbookTotal = 0;
  let playbookRateSum = 0;
  let riskFollowed = 0;
  let riskAnswered = 0;
  let flagCount = 0;
  const flagCounts = {};
  const categoryCounts = {};
  BEHAVIORAL_FLAG_CATEGORIES.forEach((c) => {
    categoryCounts[c.id] = 0;
  });

  const processAvgs = {
    followedPlan: [],
    setupQuality: [],
    riskDiscipline: [],
    executionQuality: [],
  };

  sessions.forEach((s) => {
    // No-trade days (holiday, rest, Preservation Mode) are excluded from weekly denominators.
    if (s.post?.noTradeToday) return;

    if (s.post) {
      const post = normalizePostmarketFlags(s.post);
      getRaisedBehavioralFlags(post).forEach((f) => {
        flagCount += 1;
        flagCounts[f.key] = (flagCounts[f.key] || 0) + 1;
        const cat = BEHAVIORAL_FLAG_CATEGORIES.find((c) => c.flags.some((x) => x.key === f.key));
        if (cat) categoryCounts[cat.id] += 1;
      });
      const risk = getRiskPlanFollowed(s.post);
      if (risk === true) {
        riskFollowed += 1;
        riskAnswered += 1;
      } else if (risk === false) {
        riskAnswered += 1;
      }
      POST_SLIDER_KEYS.forEach((k) => {
        const v = Number(s.post[k]);
        if (!Number.isNaN(v)) processAvgs[k].push(v);
      });
    }
    if (s.playbookAdherence?.total > 0) {
      playbookTotal += 1;
      playbookRateSum += s.playbookAdherence.playbookRate;
    }
  });

  const allSliderVals = POST_SLIDER_KEYS.flatMap((k) => processAvgs[k]);
  const avgPostSliders = avg(allSliderVals);

  const severeSleepDays = sessions.filter((s) =>
    isSleepDebtSevere(s.pre?.sleepDebtMinutes)
  ).length;
  const standDownDays = sessions.filter((s) => s.pre?.standDownAcknowledged).length;

  let consecutiveSevereSleep = false;
  for (let i = 1; i < sessions.length; i += 1) {
    const prev = sessions[i - 1];
    const cur = sessions[i];
    if (
      isSleepDebtSevere(prev.pre?.sleepDebtMinutes) &&
      isSleepDebtSevere(cur.pre?.sleepDebtMinutes)
    ) {
      consecutiveSevereSleep = true;
      break;
    }
  }

  return {
    sessionDays: sessions.filter((s) => {
      if (s.post?.noTradeToday) return s.hasPre || s.hasPlan;
      return s.hasPre || s.hasPlan || s.hasPost || isTradingDay(s);
    }).length,
    tradingDays: tradingDays.length,
    avgReadiness: avgReadiness != null ? Math.round(avgReadiness) : null,
    lowReadinessDays,
    avgPlaybookPct:
      playbookTotal > 0 ? Math.round(playbookRateSum / playbookTotal) : null,
    riskPlanPct: riskAnswered ? Math.round((riskFollowed / riskAnswered) * 100) : null,
    riskPlanFollowed: riskFollowed,
    riskPlanAnswered: riskAnswered,
    behavioralFlagCount: flagCount,
    categoryCounts,
    flagCounts,
    severeSleepDays,
    consecutiveSevereSleep,
    standDownDays,
    avgPostSliders,
    avgFollowedPlan: avg(processAvgs.followedPlan),
    avgSetupQuality: avg(processAvgs.setupQuality),
    avgRiskDiscipline: avg(processAvgs.riskDiscipline),
    avgExecutionQuality: avg(processAvgs.executionQuality),
  };
}

export function detectProcessFindings(summary, sessions, priorSummary = null) {
  const findings = [];
  const riskBreaks = (summary.riskPlanAnswered || 0) - (summary.riskPlanFollowed || 0);

  Object.entries(summary.flagCounts || {}).forEach(([key, count]) => {
    if (count >= 3) {
      const flag = BEHAVIORAL_FLAGS.find((f) => f.key === key);
      findings.push({
        severity: "red",
        title: flag?.label || key,
        detail: `Raised ${count} days this week — recurring pattern.`,
      });
    }
  });

  if (riskBreaks >= 2) {
    findings.push({
      severity: "red",
      title: "Risk plan broken",
      detail: `Risk plan not followed on ${riskBreaks} day${riskBreaks === 1 ? "" : "s"} this week.`,
    });
  }

  sessions.forEach((s) => {
    const traded =
      (s.post?.trades && Number(s.post.trades) > 0) ||
      (s.trades?.length > 0) ||
      (s.netPnl != null && s.netPnl !== 0);
    if (s.pre?.standDownAcknowledged && traded) {
      findings.push({
        severity: "red",
        title: "Traded on protective day",
        detail: `${formatDayShort(s.date)} — protective day acknowledged but trades were taken.`,
      });
    }
    if (s.pre?.sleepDebtStandDownRequired && traded) {
      findings.push({
        severity: "red",
        title: "Traded on recovery day",
        detail: `${formatDayShort(s.date)} — mandatory recovery day but trades were taken.`,
      });
    }
  });

  if (summary.consecutiveSevereSleep) {
    findings.push({
      severity: "red",
      title: "Consecutive severe sleep debt",
      detail: `Sleep debt ≥ ${SLEEP_DEBT_SEVERE_CAUTION_MINS} min on two consecutive days.`,
    });
  }

  if (summary.lowReadinessDays >= 2) {
    findings.push({
      severity: "amber",
      title: "Low readiness days",
      detail: `Readiness below 50 on ${summary.lowReadinessDays} days this week.`,
    });
  }

  if (summary.avgPostSliders != null && summary.avgPostSliders < 6) {
    findings.push({
      severity: "amber",
      title: "Weak close loop scores",
      detail: `Average process slider score ${summary.avgPostSliders.toFixed(1)}/10 — below target.`,
    });
  }

  if (
    summary.avgPlaybookPct != null &&
    summary.avgPlaybookPct < PLAYBOOK_TARGET_PCT &&
    summary.tradingDays > 0
  ) {
    findings.push({
      severity: "amber",
      title: "Playbook below target",
      detail: `${summary.avgPlaybookPct}% avg adherence — target is ${PLAYBOOK_TARGET_PCT}%.`,
    });
  }

  if (riskBreaks === 1) {
    findings.push({
      severity: "amber",
      title: "Risk plan broken once",
      detail: "One day this week you answered no on risk plan followed.",
    });
  }

  if (priorSummary?.avgReadiness != null && summary.avgReadiness != null) {
    const delta = summary.avgReadiness - priorSummary.avgReadiness;
    if (delta <= -10) {
      findings.push({
        severity: "amber",
        title: "Readiness declined vs last week",
        detail: `${summary.avgReadiness} now vs ${priorSummary.avgReadiness} prior week (${delta > 0 ? "+" : ""}${delta}).`,
      });
    }
  }

  if (
    summary.tradingDays > 0 &&
    summary.behavioralFlagCount === 0
  ) {
    findings.push({
      severity: "green",
      title: "No behavioral flags",
      detail: "Zero behavioral flags raised across the week.",
    });
  }

  if (summary.riskPlanAnswered > 0 && riskBreaks === 0) {
    findings.push({
      severity: "green",
      title: "Risk plan intact",
      detail: "Risk plan followed every day you completed close loop.",
    });
  }

  const order = { red: 0, amber: 1, green: 2 };
  return findings.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function buildDayProcessRows(sessions) {
  return sessions.map((s) => {
    const flags = s.post ? getRaisedBehavioralFlags(normalizePostmarketFlags(s.post)) : [];
    const traded =
      (s.post?.trades && Number(s.post.trades) > 0) ||
      (s.trades?.length > 0) ||
      (s.netPnl != null && s.netPnl !== 0);
    const playbook = s.playbookAdherence?.total
      ? s.playbookAdherence
      : s.trades?.length
        ? summarizeSetupAdherence(s.trades)
        : null;
    const risk = getRiskPlanFollowed(s.post);
    const hasActivity = s.hasPre || s.hasPlan || s.hasPost || traded;

    return {
      date: s.date,
      dateLabel: formatDayShort(s.date),
      readiness: s.readinessScore,
      hasPre: s.hasPre,
      hasPlan: s.hasPlan,
      hasPost: s.hasPost,
      traded,
      hasActivity,
      flagLabels: flags.map((f) => f.label),
      playbookPct: playbook?.total ? playbook.playbookRate : null,
      riskPlan: risk === true ? "Yes" : risk === false ? "No" : "—",
      sleepDebt: s.pre?.sleepDebtMinutes != null ? parseSleepDebtMinutes(s.pre.sleepDebtMinutes) : null,
      standDown: !!s.pre?.standDownAcknowledged,
    };
  });
}

export async function loadWeeklyProcessReview(weekStart, weekEnd) {
  const all = await loadAllSessions();
  const sessions = aggregateWeekSessions(all, weekStart, weekEnd);

  const priorStart = offsetDateKey(weekStart, -7);
  const priorEnd = offsetDateKey(weekEnd, -7);
  const priorSessions = aggregateWeekSessions(all, priorStart, priorEnd);

  const summary = buildWeeklyProcessSummary(sessions);
  const priorSummary = priorSessions.some(isTradingDay)
    ? buildWeeklyProcessSummary(priorSessions)
    : null;
  const findings = detectProcessFindings(summary, sessions, priorSummary);
  const days = buildDayProcessRows(sessions);
  const manual = await loadSavedReview(weekEnd);
  const priorManual = await loadSavedReview(priorEnd);

  return {
    weekStart,
    weekEnd,
    weekLabel: formatProcessWeekLabel(weekStart, weekEnd),
    sessions,
    summary,
    priorSummary,
    findings,
    days,
    manual,
    priorFocusItems: (priorManual.focusItems || []).filter((f) => f.trim()),
  };
}

/** Saturday after reviewed week through Friday of the focus week. */
export function focusPeriodForReview(weekEnd) {
  const focusStart = offsetDateKey(weekEnd, 0);
  const focusWeekMon = offsetDateKey(weekEnd, 3);
  const focusEnd = offsetDateKey(focusWeekMon, 4);
  return { focusStart, focusEnd };
}

export function focusAppliesForDate(weekEnd, dateKey) {
  const { focusStart, focusEnd } = focusPeriodForReview(weekEnd);
  return dateKey >= focusStart && dateKey <= focusEnd;
}

/** @deprecated Use focusPeriodForReview — kept for callers that need a week range. */
export function getFocusDisplayWeek() {
  return getProcessWeekRange(-1);
}

function fridayOnOrBefore(dateKey) {
  const d = new Date(`${dateKey}T12:00:00`);
  while (d.getDay() !== 5) d.setDate(d.getDate() - 1);
  return dateKeyStr(d);
}

/** Recent Friday week-ends that could own focus for this date (newest first). */
function candidateFocusReviewWeekEnds(dateKey, count = 6) {
  const ends = [];
  const d = new Date(`${fridayOnOrBefore(dateKey)}T12:00:00`);
  for (let i = 0; i < count; i += 1) {
    ends.push(dateKeyStr(d));
    d.setDate(d.getDate() - 7);
  }
  return ends;
}

export async function loadHomeFocusItems(dateKey = todayKey()) {
  const candidates = candidateFocusReviewWeekEnds(dateKey);
  const reviews = await Promise.all(candidates.map((weekEnd) => loadSavedReview(weekEnd)));

  for (let i = 0; i < candidates.length; i += 1) {
    const weekEnd = candidates[i];
    const review = reviews[i];
    if (!isReviewComplete(review)) continue;
    const items = review.focusItems.filter((f) => f.trim());
    if (!items.length) continue;
    if (focusAppliesForDate(weekEnd, dateKey)) {
      return { items, weekEnd, complete: true };
    }
  }

  const sessionDates = await fetchSessionDates();
  for (let i = 0; i < candidates.length; i += 1) {
    const weekEnd = candidates[i];
    if (!focusAppliesForDate(weekEnd, dateKey)) continue;
    if (isReviewComplete(reviews[i])) continue;

    const week = weekRangeFromEnd(weekEnd);
    if (weekHasSessionDate(sessionDates, week)) {
      return {
        items: [],
        weekEnd: null,
        complete: false,
        missingReviewWeek: week,
      };
    }
  }

  return { items: [], weekEnd: null, complete: false, missingReviewWeek: null };
}

export function shouldPromptWeeklyReview(dateKey = todayKey()) {
  const cal = new Date(`${dateKey}T12:00:00`);
  const dow = cal.getDay();
  if (dow !== 5 && dow !== 0) return false;
  return true;
}

export async function isCurrentWeekReviewComplete(dateKey = todayKey()) {
  const { end } = getProcessWeekRange(0);
  const review = await loadSavedReview(end);
  return isReviewComplete(review);
}

export async function shouldShowWeeklyReviewPrompt(dateKey = todayKey()) {
  if (!shouldPromptWeeklyReview(dateKey)) return false;
  if (!(await hasTradingDaysThisWeek(dateKey))) return false;
  if (await isCurrentWeekReviewComplete(dateKey)) return false;
  return true;
}

export async function hasTradingDaysThisWeek(dateKey = todayKey()) {
  const { start, end } = getProcessWeekRange(0);
  const dates = await fetchSessionDates();
  return dates.some((d) => d >= start && d <= end);
}
