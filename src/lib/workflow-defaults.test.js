import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_POSTMARKET } from "./postmarket-defaults.js";
import {
  computeReadinessScore,
  DEFAULT_PREMARKET_FORM,
  founderMeditationMissStreak,
  requiresFounderMeditationStandDown,
} from "./premarket-scoring.js";

test("fresh close loop defaults to CSV import", () => {
  assert.equal(DEFAULT_POSTMARKET.performanceEntryMode, "csv");
});

test("fresh non-wearable check-in begins at 51 without Preservation Mode", () => {
  const score = computeReadinessScore(DEFAULT_PREMARKET_FORM, { usesWearable: false });
  assert.equal(score.composite, 51);
  assert.equal(DEFAULT_PREMARKET_FORM.emotionalState, 5);
  assert.equal(DEFAULT_PREMARKET_FORM.confidence, 5);
  assert.equal(DEFAULT_PREMARKET_FORM.patience, 5);
  assert.equal(DEFAULT_PREMARKET_FORM.fomoRisk, 5);
  assert.equal(DEFAULT_PREMARKET_FORM.revengeRisk, 5);
  assert.equal(DEFAULT_PREMARKET_FORM.sleepQuality, 6);
  assert.equal(DEFAULT_PREMARKET_FORM.energy, 6);
  assert.equal(DEFAULT_PREMARKET_FORM.hydrated, false);
  assert.equal(DEFAULT_PREMARKET_FORM.externalDistractions, 5);
  assert.equal(DEFAULT_PREMARKET_FORM.financialPressure, 5);
  assert.equal(DEFAULT_PREMARKET_FORM.generalFocusLevel, 5);
});

test("founder meditation rule activates on the third consecutive missed check-in", () => {
  assert.equal(founderMeditationMissStreak(false, [false, false]), 3);
  assert.equal(requiresFounderMeditationStandDown(false, [false, false]), true);
  assert.equal(requiresFounderMeditationStandDown(true, [false, false]), false);
  assert.equal(requiresFounderMeditationStandDown(false, [false, null, false]), false);
});
