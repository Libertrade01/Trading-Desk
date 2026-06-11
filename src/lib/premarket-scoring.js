/**
 * Pre-Market ReadinessScore
 *
 * Composite (0–100):
 *   Emotional 35% · Physical 25% · Preparation 25% · External 15%
 *
 * Each dimension is 0–100, built from weighted sub-fields (1–10 sliders → ×10).
 * Risk sliders (FOMO, revenge, distractions, pressure) are inverted: higher input = lower score.
 */

export const DIMENSION_WEIGHTS = {
  emotional: 0.35,
  physical: 0.25,
  preparation: 0.25,
  external: 0.15,
};

export const EMOTIONAL_FIELD_WEIGHTS = {
  emotionalState: 0.25,
  confidence: 0.25,
  patience: 0.25,
  fomoRisk: 0.15,
  revengeRisk: 0.10,
};

export const PHYSICAL_FIELD_WEIGHTS = {
  sleepHours: 0.20,
  sleepQuality: 0.30,
  energy: 0.25,
  hydrated: 0.10,
  caffeinated: 0.05,
  movement: 0.10,
};

export const EXTERNAL_FIELD_WEIGHTS = {
  marketEnvironment: 0.40,
  externalDistractions: 0.30,
  financialPressure: 0.30,
};

export const PREPARATION_FIELD_WEIGHTS = {
  reviewedKeyLevels: 0.20,
  reviewedNews: 0.20,
  dailyPlanWritten: 0.25,
  followedRoutine: 0.25,
  meditation: 0.10,
};

export const MARKET_ENVIRONMENT_OPTIONS = [
  { value: "Low volatility", score: 90 },
  { value: "Normal conditions", score: 80 },
  { value: "Elevated volatility", score: 70 },
  { value: "High volatility", score: 85 },
  { value: "Extreme volatility", score: 50 },
];

const MARKET_ENV_SCORES = Object.fromEntries(
  MARKET_ENVIRONMENT_OPTIONS.map((o) => [o.value, o.score])
);

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

export function toggleToScore(on) {
  return on ? 100 : 0;
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

export function scorePhysical(fields) {
  const scores = {
    sleepHours: sleepHoursToScore(fields.sleepHours),
    sleepQuality: sliderToScore(fields.sleepQuality),
    energy: sliderToScore(fields.energy),
    hydrated: toggleToScore(fields.hydrated),
    caffeinated: toggleToScore(fields.caffeinated),
    movement: toggleToScore(fields.movement),
  };
  return { score: weightedSum(scores, PHYSICAL_FIELD_WEIGHTS), fields: scores };
}

export function scoreExternal(fields) {
  const scores = {
    marketEnvironment: MARKET_ENV_SCORES[fields.marketEnvironment] ?? 75,
    externalDistractions: riskSliderToScore(fields.externalDistractions),
    financialPressure: riskSliderToScore(fields.financialPressure),
  };
  return { score: weightedSum(scores, EXTERNAL_FIELD_WEIGHTS), fields: scores };
}

export function scorePreparation(fields) {
  const scores = {
    reviewedKeyLevels: toggleToScore(fields.reviewedKeyLevels),
    reviewedNews: toggleToScore(fields.reviewedNews),
    dailyPlanWritten: toggleToScore(fields.dailyPlanWritten),
    followedRoutine: toggleToScore(fields.followedRoutine),
    meditation: toggleToScore(fields.meditation),
  };
  return { score: weightedSum(scores, PREPARATION_FIELD_WEIGHTS), fields: scores };
}

export function computeReadinessScore(form) {
  const emotional = scoreEmotional(form);
  const physical = scorePhysical(form);
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

export function readinessStatus(score) {
  if (score >= 70) return { label: "Ready to trade", tone: "good" };
  if (score >= 50) return { label: "Scale back", tone: "amber" };
  return { label: "Stand down", tone: "red" };
}

export function sliderValueColor(value, inverted = false) {
  const score = inverted ? riskSliderToScore(value) : sliderToScore(value);
  if (score >= 70) return "var(--green)";
  if (score >= 45) return "var(--amber)";
  return "var(--red)";
}

export const DEFAULT_PREMARKET_FORM = {
  emotionalState: 5,
  confidence: 5,
  patience: 7,
  fomoRisk: 3,
  revengeRisk: 2,
  sleepHours: 7,
  sleepQuality: 7,
  energy: 5,
  hydrated: true,
  caffeinated: true,
  movement: false,
  marketEnvironment: "High volatility",
  externalDistractions: 3,
  financialPressure: 3,
  reviewedKeyLevels: true,
  reviewedNews: true,
  dailyPlanWritten: true,
  followedRoutine: true,
  meditation: false,
  customPrepItem: "",
  customPrepChecked: false,
  mantra: "Wait for A+, Area then Execution.",
  standDownAcknowledged: false,
  standDownAcknowledgedAt: null,
};
