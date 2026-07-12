export { VALID_SETUPS } from "./setup-options";

export const BIAS_OPTIONS = [
  "Bullish",
  "Bearish",
  "Balanced/Rotational",
  "Unsure",
];

/** Map older plan bias labels onto the current option set. */
export function normalizeDirectionalBias(value) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  if (BIAS_OPTIONS.includes(v)) return v;
  if (/long|bull/i.test(v)) return "Bullish";
  if (/short|bear/i.test(v)) return "Bearish";
  if (/neutral|two-way|balance|rotat/i.test(v)) return "Balanced/Rotational";
  if (/wait|unsure/i.test(v)) return "Unsure";
  return "";
}

export const SESSION_OPEN_VS_VALUE_OPTIONS = [
  "Inside Value (expect rotational)",
  "Outside of Value (potential for imbalance)",
  "Outside of yesterday range (high probability imbalance)",
];

/** Map stored session-open vs value labels onto the current option set. */
export function normalizeSessionOpenVsValue(value) {
  const v = String(value ?? "").trim();
  if (SESSION_OPEN_VS_VALUE_OPTIONS.includes(v)) return v;
  return "";
}

export const VOLATILITY_OPTIONS = ["Low", "Normal", "Elevated", "Extreme"];

/** Map older volatility labels onto the current option set. */
export function normalizeExpectedVolatility(value) {
  const v = String(value ?? "").trim();
  if (VOLATILITY_OPTIONS.includes(v)) return v;
  if (/^high$/i.test(v)) return "Elevated";
  return "Normal";
}

export const LEVEL_TYPE_OPTIONS = [
  "Support",
  "Resistance",
  "Target",
  "Pivot",
  "Other",
];

/** Map older level type labels onto the current option set. */
export function normalizeLevelType(value) {
  const v = String(value ?? "").trim();
  if (LEVEL_TYPE_OPTIONS.includes(v)) return v;
  if (/magnet/i.test(v)) return "Target";
  return "Other";
}

export const DEFAULT_KEY_LEVEL_QUICK_ADDS = [
  "ONL",
  "ONH",
  "PDH",
  "PDL",
  "VWAP",
  "VAH",
  "VAL",
];

/** Infer a sensible type from a common level label. */
export function inferLevelType(label) {
  const key = String(label ?? "").trim().toUpperCase();
  if (["ONH", "PDH", "VAH"].includes(key)) return "Resistance";
  if (["ONL", "PDL", "VAL"].includes(key)) return "Support";
  if (key === "VWAP") return "Pivot";
  return "Other";
}

export function normalizeKeyLevelQuickAdds(value) {
  const source = Array.isArray(value) && value.length
    ? value
    : DEFAULT_KEY_LEVEL_QUICK_ADDS;
  const seen = new Set();
  const next = [];
  for (const item of source) {
    const label = String(item ?? "").trim().toUpperCase();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    next.push(label);
    if (next.length >= 12) break;
  }
  return next.length ? next : [...DEFAULT_KEY_LEVEL_QUICK_ADDS];
}

export const DEFAULT_DAILY_PLAN = {
  directionalBias: "",
  expectedVolatility: "Normal",
  whyBias: "",
  biasMarkedValueArea: false,
  biasMarkedNodesLvns: false,
  biasMarkedWeeklyProfile: false,
  sessionOpenVsValue: "",
  keyLevels: [],
  setups: [],
  ddFromHighWaterMark: "",
  maxDailyLoss: "",
  maxTrades: "",
  positionSize: "",
  stopTradingAt: "",
  maxDailyLossSetInBroker: false,
  coldTurkeyBlockerSet: false,
  sessionRules: "",
  oneThing: "",
  selfCommitmentAccepted: false,
  selfRegulatedCommitmentAccepted: false,
  commitmentAccepted: {},
};

export function newKeyLevel(overrides = {}) {
  const label = String(overrides.label ?? "").trim();
  return {
    id: overrides.id || crypto.randomUUID(),
    label,
    price: overrides.price ?? "",
    type: overrides.type || (label ? inferLevelType(label) : "Support"),
  };
}

export function newSetup(overrides = {}) {
  return {
    id: overrides.id || crypto.randomUUID(),
    name: String(overrides.name ?? "").trim(),
    conditions: overrides.conditions ?? "",
    target: overrides.target ?? "",
    stop: overrides.stop ?? "",
  };
}
