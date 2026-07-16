/**
 * Pre-Market ReadinessScore
 *
 * Weighting rationale (discretionary intraday trading):
 * - Mental (emotional key): largest composite share — FOMO, revenge, patience directly predict rule breaks and DLL hits.
 * - Physical: recovery gate — poor sleep/HRV impairs impulse control; strong HRV is weighted highest here.
 * - Preparation: pre-commitment — plan + levels reduce improvised trades mid-session.
 * - External: acute stressors — financial pressure, distractions, and self-reported focus tilt sizing and attention.
 *
 * Composite (0–100):
 *   Mental 38% · Physical 22% · Preparation 25% · External 15%
 *
 * Mental sub-weights: Patience 28% · FOMO 18% · Revenge 14% · State 20% · Confidence 20%
 * Physical sub-weights: HRV 24% · Sleep quality 22% · Sleep hours 14% · Sleep debt 10% · Energy 14% · Movement 8% · Hydrated 8%
 * Preparation sub-weights: Plan written 28% · Key levels 24% · Routine 22% · News 14% · Meditation 12%
 * External sub-weights: Financial pressure 34% · Distractions 33% · Focus 33%
 */

export const DIMENSION_WEIGHTS = {
  emotional: 0.38,
  physical: 0.22,
  preparation: 0.25,
  external: 0.15,
};

export const EMOTIONAL_FIELD_WEIGHTS = {
  emotionalState: 0.20,
  confidence: 0.20,
  patience: 0.28,
  fomoRisk: 0.18,
  revengeRisk: 0.14,
};

export const PHYSICAL_FIELD_WEIGHTS = {
  sleepHours: 0.13,
  sleepQuality: 0.20,
  sleepDebt: 0.10,
  energy: 0.13,
  hydrated: 0.08,
  hrvScore: 0.22,
  movement: 0.08,
  meditation: 0.06,
};

export const SLEEP_DEBT_SEVERE_CAUTION_MINS = 60;

export function parseSleepDebtMinutes(value) {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n);
}

export function isSleepDebtSevere(value) {
  return parseSleepDebtMinutes(value) >= SLEEP_DEBT_SEVERE_CAUTION_MINS;
}

/** Sleep debt minutes → 0–100 (0 min = best) */
export function sleepDebtToScore(minutes) {
  const m = parseSleepDebtMinutes(minutes);
  if (m === 0) return 100;
  if (m < 30) return 85;
  if (m < 45) return 70;
  if (m < 60) return 55;
  if (m < 90) return 35;
  return 20;
}

/** Two consecutive trading days with sleep debt ≥ 60 min → mandatory stand-down. */
export function requiresSleepDebtStandDown(todayMinutes, yesterdayMinutes) {
  return isSleepDebtSevere(todayMinutes) && isSleepDebtSevere(yesterdayMinutes);
}

export const EXTERNAL_FIELD_WEIGHTS = {
  financialPressure: 0.34,
  externalDistractions: 0.33,
  generalFocusLevel: 0.33,
};

export const PREPARATION_FIELD_WEIGHTS = {
  reviewedNews: 0.30,
  reviewedKeyLevels: 0.35,
  dailyPlanWritten: 0.35,
};

/** Positive slider 1–10 → 10–100 */
export function sliderToScore(value) {
  const v = Number(value);
  if (Number.isNaN(v)) return 50;
  return Math.round(Math.max(1, Math.min(10, v)) * 10);
}

/** Risk slider 1–10 (1=none/good, 10=high/bad) → inverted score */
export function riskSliderToScore(value) {
  const v = Number(value);
  if (Number.isNaN(v)) return 50;
  const clamped = Math.max(1, Math.min(10, v));
  return Math.round((10 - clamped) * 10);
}

/** Sleep hours → 0–100 (7h ≈ 60, 8h ≈ 85 — matches reference defaults) */
export function sleepHoursToScore(hours) {
  const h = Number(hours);
  if (Number.isNaN(h) || h <= 0) return 20;
  if (h < 4) return 20;
  if (h < 5) return 35;
  if (h < 6) return 50;
  if (h < 7) return 55;
  if (h < 8) return 60;
  if (h < 9) return 85;
  if (h < 10) return 95;
  return 90;
}

/** HRV recovery score 0–100% maps directly to physical sub-score */
export function hrvScoreToScore(value) {
  const v = Number(value);
  if (Number.isNaN(v)) return 50;
  return Math.round(Math.max(0, Math.min(100, v)));
}

export function toggleToScore(on) {
  // An unchecked physical habit is a weak input, not proof of a total-zero physical state.
  return on ? 100 : 20;
}

/** Prep toggles off = neutral baseline (not done yet). On = complete. */
export function prepToggleToScore(on) {
  return on ? 100 : 50;
}

function weightedSum(scores, weights) {
  return Math.round(
    Object.entries(weights).reduce((sum, [key, w]) => sum + (scores[key] ?? 50) * w, 0)
  );
}

export function scoreEmotional(fields) {
  const scores = {
    emotionalState: sliderToScore(fields.emotionalState),
    confidence: sliderToScore(fields.confidence),
    patience: sliderToScore(fields.patience),
    fomoRisk: riskSliderToScore(fields.fomoRisk),
    revengeRisk: riskSliderToScore(fields.revengeRisk),
  };
  return { score: weightedSum(scores, EMOTIONAL_FIELD_WEIGHTS), fields: scores };
}

function normalizePhysicalWeights(usesWearable) {
  let weights = { ...PHYSICAL_FIELD_WEIGHTS };
  if (!usesWearable) {
    const filtered = Object.fromEntries(
      Object.entries(weights).filter(([key]) => key !== "hrvScore" && key !== "sleepDebt")
    );
    const sum = Object.values(filtered).reduce((acc, w) => acc + w, 0);
    weights = Object.fromEntries(
      Object.entries(filtered).map(([key, w]) => [key, w / sum])
    );
  }
  return weights;
}

export function scorePhysical(fields, { usesWearable = true } = {}) {
  const scores = {
    sleepHours: sleepHoursToScore(fields.sleepHours),
    sleepQuality: sliderToScore(fields.sleepQuality),
    sleepDebt: sleepDebtToScore(fields.sleepDebtMinutes),
    energy: sliderToScore(fields.energy),
    hydrated: toggleToScore(fields.hydrated),
    hrvScore: hrvScoreToScore(fields.hrvScore),
    movement: toggleToScore(fields.movement),
    meditation: toggleToScore(fields.meditation),
  };
  return {
    score: weightedSum(scores, normalizePhysicalWeights(usesWearable)),
    fields: scores,
  };
}

export function scoreExternal(fields) {
  const scores = {
    externalDistractions: riskSliderToScore(fields.externalDistractions),
    financialPressure: riskSliderToScore(fields.financialPressure),
    generalFocusLevel: sliderToScore(fields.generalFocusLevel),
  };
  return { score: weightedSum(scores, EXTERNAL_FIELD_WEIGHTS), fields: scores };
}

export function scorePreparation(fields) {
  const scores = {
    reviewedNews: prepToggleToScore(fields.reviewedNews),
    reviewedKeyLevels: prepToggleToScore(fields.reviewedKeyLevels),
    dailyPlanWritten: prepToggleToScore(fields.dailyPlanWritten),
  };
  return { score: weightedSum(scores, PREPARATION_FIELD_WEIGHTS), fields: scores };
}

export function computeReadinessScore(form, { usesWearable = true } = {}) {
  const emotional = scoreEmotional(form);
  const physical = scorePhysical(form, { usesWearable });
  const external = scoreExternal(form);
  const preparation = scorePreparation(form);

  const composite = Math.round(
    emotional.score * DIMENSION_WEIGHTS.emotional +
    physical.score * DIMENSION_WEIGHTS.physical +
    preparation.score * DIMENSION_WEIGHTS.preparation +
    external.score * DIMENSION_WEIGHTS.external
  );

  return {
    composite,
    emotional: emotional.score,
    physical: physical.score,
    external: external.score,
    preparation: preparation.score,
    breakdown: {
      emotional: emotional.fields,
      physical: physical.fields,
      external: external.fields,
      preparation: preparation.fields,
    },
  };
}

export const PROTECTIVE_DAY_THRESHOLD = 50;

export function readinessStatus(score) {
  if (score >= 70) return { label: "Ready to trade", tone: "good" };
  if (score >= PROTECTIVE_DAY_THRESHOLD) return { label: "Trade light", tone: "amber" };
  return { label: "Sit out or size down", tone: "red" };
}

/** User-facing copy for low-readiness / protective days (not "stand down"). */
export const PROTECTIVE_DAY_COPY = {
  scoreTitle: "Preservation Mode",
  scoreBody:
    "Readiness is below 50. Sit on the sideline or trade minimal size. Taking a step back is a process win. Recovery is the priority from here.",
  scoreAckLabel: "Acknowledged",
  scoreAckDone: "Preservation mode noted",
  recoveryTitle: "Preservation Mode",
  recoveryBody:
    "Sleep debt has been severe two days running. Recovery before P&L — no full-size session today.",
  recoveryAckLabel: "Acknowledged",
  sleepDebtCaution:
    "Another day at this level triggers a mandatory recovery day.",
  sleepDebtMandatory: "Mandatory recovery day",
};

export function readinessScoreColor(score) {
  if (score >= 70) return "var(--green)";
  if (score >= 50) return "var(--amber)";
  return "var(--red)";
}

export function sliderValueColor(value, inverted = false) {
  const score = inverted ? riskSliderToScore(value) : sliderToScore(value);
  if (score >= 70) return "var(--green)";
  if (score >= 45) return "var(--amber)";
  return "var(--red)";
}

/** Fresh non-wearable baseline: 51, just above Preservation Mode. */
export const DEFAULT_PREMARKET_FORM = {
  emotionalState: 5,
  confidence: 5,
  patience: 5,
  fomoRisk: 5,
  revengeRisk: 5,
  sleepHours: 9,
  sleepDebtMinutes: 0,
  sleepQuality: 6,
  energy: 6,
  hrvScore: 50,
  hydrated: false,
  movement: false,
  externalDistractions: 5,
  financialPressure: 5,
  generalFocusLevel: 5,
  reviewedKeyLevels: false,
  reviewedNews: false,
  dailyPlanWritten: false,
  followedRoutine: false,
  meditation: false,
  customPrepItem: "",
  customPrepChecked: false,
  mantra: "",
  standDownAcknowledged: false,
  standDownAcknowledgedAt: null,
  unlockAccounts: false,
  checkCpu: false,
  selectRiskBracketOrder: false,
  deskChecks: {},
};
