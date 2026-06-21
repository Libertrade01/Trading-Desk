import { storage } from "./supabase";
import { BEHAVIORAL_FLAGS, normalizePostmarketFlags } from "./postmarket-defaults";
import { getRiskPlanFollowed } from "./history-data";

const POST_PREFIX = "postmarket-review-";

const RULE_COLS = [
  "rules_trend",
  "rules_market_cond",
  "rules_top_bottom",
  "rules_plays",
  "rules_execution",
  "rules_focus",
  "rules_consol",
  "rules_dll",
  "rules_cooloff",
];

async function loadPostReview(dateKey) {
  try {
    const r = await storage.get(`${POST_PREFIX}${dateKey}`);
    if (!r) return null;
    const post = JSON.parse(r.value);
    return post?.savedAt ? { date: dateKey, ...post } : null;
  } catch {
    return null;
  }
}

export async function loadPostReviewsInRange(dateFrom, dateTo) {
  const listed = await storage.list(POST_PREFIX);
  const dates = (listed?.keys || [])
    .map((k) => k.slice(POST_PREFIX.length))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .filter((d) => (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo));

  const reviews = await Promise.all(dates.map(loadPostReview));
  return reviews.filter(Boolean);
}

function avgField(reviews, field) {
  const vals = reviews.map((r) => Number(r[field])).filter((n) => !Number.isNaN(n));
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export function aggregateProcessMetrics(reviews) {
  if (!reviews?.length) return null;

  const riskPlanDays = reviews.filter((r) => getRiskPlanFollowed(r) === true).length;
  const riskPlanAnswered = reviews.filter((r) => getRiskPlanFollowed(r) !== null).length;

  let behavioralFlags = 0;
  reviews.forEach((r) => {
    const normalized = normalizePostmarketFlags(r);
    BEHAVIORAL_FLAGS.forEach((f) => {
      if (normalized[f.key]) behavioralFlags += 1;
    });
  });

  return {
    reviewDays: reviews.length,
    avgFollowedPlan: avgField(reviews, "followedPlan"),
    avgSetupQuality: avgField(reviews, "setupQuality"),
    avgRiskDiscipline: avgField(reviews, "riskDiscipline"),
    avgExecutionQuality: avgField(reviews, "executionQuality"),
    riskPlanPct: riskPlanAnswered ? Math.round((riskPlanDays / riskPlanAnswered) * 100) : null,
    behavioralFlags,
  };
}

export function aggregateManagementQuality(trades) {
  const tagged = (trades || []).filter((t) => t.management);
  if (!tagged.length) return null;

  const counts = {};
  tagged.forEach((t) => {
    counts[t.management] = (counts[t.management] || 0) + 1;
  });

  const managedWell = counts["Managed Well"] || 0;
  const early =
    (counts["Closed Early"] || 0) + (counts["Exited Early — Ran (2R+)"] || 0);

  return {
    total: tagged.length,
    managedWellPct: Math.round((managedWell / tagged.length) * 100),
    earlyPct: Math.round((early / tagged.length) * 100),
    latePct: Math.round(((counts["Closed Late"] || 0) / tagged.length) * 100),
  };
}

export function computeRuleDisciplinePct(tradingDays) {
  if (!tradingDays?.length) return null;
  const totalSlots = tradingDays.length * RULE_COLS.length;
  let broken = 0;
  tradingDays.forEach((d) => {
    RULE_COLS.forEach((col) => {
      const v = d[col];
      if (v === "Broke" || v === "broke") broken += 1;
    });
  });
  return totalSlots ? Math.round(((totalSlots - broken) / totalSlots) * 100) : null;
}
