export const BIAS_OPTIONS = [
  "Long bias",
  "Short bias",
  "Neutral / two-way",
  "Wait and see",
];

export const VOLATILITY_OPTIONS = ["Low", "Normal", "High", "Extreme"];

export const LEVEL_TYPE_OPTIONS = [
  "Support",
  "Resistance",
  "Pivot",
  "Magnet",
  "Other",
];

export const DEFAULT_DAILY_PLAN = {
  directionalBias: "Neutral / two-way",
  expectedVolatility: "Normal",
  whyBias: "",
  keyLevels: [],
  setups: [],
  maxDailyLoss: "",
  maxTrades: "",
  positionSize: "",
  stopTradingAt: "",
  sessionRules: "",
  oneThing: "",
};

export function newKeyLevel() {
  return {
    id: crypto.randomUUID(),
    label: "",
    price: "",
    type: "Support",
  };
}

export function newSetup() {
  return {
    id: crypto.randomUUID(),
    name: "",
    conditions: "",
    target: "",
    stop: "",
  };
}
