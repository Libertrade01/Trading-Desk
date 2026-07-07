import { storage } from "./supabase";

export const DLL_SETTINGS_KEY = "dll-risk-settings";
export const DR_SETUP_HINT_DISMISS_KEY = "libertrade-dismiss-dr-setup-hint";

export const ACTIVATION_MODES = {
  FULL_DLL: "full_dll",
  DRAWDOWN_AMOUNT: "drawdown_amount",
};

export const EXIT_MODES = {
  PERCENT: "percent",
  FIXED_AMOUNT: "fixed_amount",
};

export const ACTIVATION_MODE_OPTIONS = [
  {
    value: ACTIVATION_MODES.FULL_DLL,
    label: "Full daily loss (DLL)",
    hint: "Enter Recovery Mode when a single day hits your full-size max loss.",
  },
  {
    value: ACTIVATION_MODES.DRAWDOWN_AMOUNT,
    label: "Drawdown amount ($)",
    hint: "Enter recovery when a single day loses at least this dollar amount.",
  },
];

export const EXIT_MODE_OPTIONS = [
  {
    value: EXIT_MODES.PERCENT,
    label: "Percent of drawdown",
    hint: "After recovering a percentage of cumulative drawdown.",
  },
  {
    value: EXIT_MODES.FIXED_AMOUNT,
    label: "Fixed dollar amount",
    hint: "Exit after earning back a set dollar amount. Extra loss days add to the target.",
  },
];

export const DEFAULT_DLL_SETTINGS = {
  fullDll: 750,
  halfDll: 400,
  recoveryEnabled: true,
  activationMode: ACTIVATION_MODES.FULL_DLL,
  activationDrawdown: 750,
  exitMode: EXIT_MODES.PERCENT,
  exitRecoveryPercent: 50,
  exitRecoveryAmount: 400,
  drawdownRecoveryConfigured: false,
};

const LEGACY_KEYS = {
  fullDll: "libertrade_full_dll",
  halfDll: "libertrade_half_dll",
  recoveryEnabled: "libertrade_dll_recovery_enabled",
};

function readLegacyNumber(key, fallback) {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function readLegacyLocalStorage() {
  if (typeof window === "undefined") return null;

  const fullDll = readLegacyNumber(LEGACY_KEYS.fullDll, null);
  const halfDll = readLegacyNumber(LEGACY_KEYS.halfDll, null);
  const recoveryRaw = localStorage.getItem(LEGACY_KEYS.recoveryEnabled);

  if (fullDll == null && halfDll == null && recoveryRaw == null) return null;

  return normalizeDllSettings({
    fullDll: fullDll ?? DEFAULT_DLL_SETTINGS.fullDll,
    halfDll: halfDll ?? DEFAULT_DLL_SETTINGS.halfDll,
    recoveryEnabled:
      recoveryRaw == null
        ? DEFAULT_DLL_SETTINGS.recoveryEnabled
        : recoveryRaw === "true",
    drawdownRecoveryConfigured: true,
  });
}

function clearLegacyLocalStorage() {
  if (typeof window === "undefined") return;
  Object.values(LEGACY_KEYS).forEach((key) => localStorage.removeItem(key));
}

function parseMoney(raw) {
  const n = Number(String(raw ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function parsePercent(raw) {
  const n = Number(String(raw ?? "").replace(/[%\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

export function normalizeDllSettings(raw = {}) {
  const fullDll = Number(raw.fullDll);
  const halfDll = Number(raw.halfDll);
  const activationDrawdown = Number(raw.activationDrawdown);
  const exitRecoveryPercent = Number(raw.exitRecoveryPercent);
  const exitRecoveryAmount = Number(raw.exitRecoveryAmount);

  const activationMode =
    raw.activationMode === ACTIVATION_MODES.DRAWDOWN_AMOUNT
      ? ACTIVATION_MODES.DRAWDOWN_AMOUNT
      : ACTIVATION_MODES.FULL_DLL;

  const exitMode =
    raw.exitMode === EXIT_MODES.FIXED_AMOUNT ? EXIT_MODES.FIXED_AMOUNT : EXIT_MODES.PERCENT;

  const normalizedFull =
    Number.isFinite(fullDll) && fullDll > 0
      ? Math.round(fullDll)
      : DEFAULT_DLL_SETTINGS.fullDll;
  const normalizedHalf =
    Number.isFinite(halfDll) && halfDll > 0
      ? Math.round(halfDll)
      : DEFAULT_DLL_SETTINGS.halfDll;
  const normalizedActivation =
    Number.isFinite(activationDrawdown) && activationDrawdown > 0
      ? Math.round(activationDrawdown)
      : normalizedFull;
  const normalizedExitPercent =
    Number.isFinite(exitRecoveryPercent) && exitRecoveryPercent >= 1 && exitRecoveryPercent <= 100
      ? Math.round(exitRecoveryPercent)
      : DEFAULT_DLL_SETTINGS.exitRecoveryPercent;
  const normalizedExitAmount =
    Number.isFinite(exitRecoveryAmount) && exitRecoveryAmount > 0
      ? Math.round(exitRecoveryAmount)
      : DEFAULT_DLL_SETTINGS.exitRecoveryAmount;

  const configured =
    raw.drawdownRecoveryConfigured === true ||
    raw.updatedAt != null ||
    raw.configuredAt != null;

  return {
    fullDll: normalizedFull,
    halfDll: normalizedHalf,
    recoveryEnabled:
      raw.recoveryEnabled == null
        ? DEFAULT_DLL_SETTINGS.recoveryEnabled
        : !!raw.recoveryEnabled,
    activationMode,
    activationDrawdown: normalizedActivation,
    exitMode,
    exitRecoveryPercent: normalizedExitPercent,
    exitRecoveryAmount: normalizedExitAmount,
    drawdownRecoveryConfigured: configured,
  };
}

export function shouldShowDrawdownRecoverySetupHint(settings = DEFAULT_DLL_SETTINGS) {
  const normalized = normalizeDllSettings(settings);
  if (normalized.drawdownRecoveryConfigured) return false;
  if (normalized.recoveryEnabled) return false;
  if (typeof window !== "undefined" && localStorage.getItem(DR_SETUP_HINT_DISMISS_KEY) === "1") {
    return false;
  }
  return true;
}

export function dismissDrawdownRecoverySetupHint() {
  if (typeof window === "undefined") return;
  localStorage.setItem(DR_SETUP_HINT_DISMISS_KEY, "1");
}

export function getActivationThreshold(settings = DEFAULT_DLL_SETTINGS) {
  const normalized = normalizeDllSettings(settings);
  if (normalized.activationMode === ACTIVATION_MODES.DRAWDOWN_AMOUNT) {
    return normalized.activationDrawdown;
  }
  return normalized.fullDll;
}

export async function loadDllSettings() {
  try {
    const r = await storage.get(DLL_SETTINGS_KEY);
    if (r?.value) {
      return normalizeDllSettings(JSON.parse(r.value));
    }
  } catch {
    /* fall through */
  }

  const legacy = readLegacyLocalStorage();
  if (legacy) {
    try {
      await saveDllSettings(legacy);
      clearLegacyLocalStorage();
    } catch {
      /* unauthenticated — keep legacy values for this session */
    }
    return legacy;
  }

  return { ...DEFAULT_DLL_SETTINGS };
}

export async function saveDllSettings(settings, { markConfigured = true } = {}) {
  const next = normalizeDllSettings({
    ...settings,
    drawdownRecoveryConfigured: markConfigured ? true : settings.drawdownRecoveryConfigured,
  });
  await storage.set(
    DLL_SETTINGS_KEY,
    JSON.stringify({ ...next, updatedAt: new Date().toISOString() })
  );
  return next;
}

export function validateDllSettingsInput(form) {
  const fullDll = parseMoney(form.fullDll);
  const halfDll = parseMoney(form.halfDll);
  const activationDrawdown = parseMoney(form.activationDrawdown);
  const exitRecoveryPercent = parsePercent(form.exitRecoveryPercent);
  const exitRecoveryAmount = parseMoney(form.exitRecoveryAmount);

  if (!Number.isFinite(fullDll) || fullDll <= 0) {
    return { ok: false, message: "Full-size max daily loss must be a positive dollar amount." };
  }
  if (!Number.isFinite(halfDll) || halfDll <= 0) {
    return { ok: false, message: "Recovery max daily loss must be a positive dollar amount." };
  }
  if (halfDll >= fullDll) {
    return {
      ok: false,
      message: "Recovery max daily loss must be less than full-size max daily loss.",
    };
  }

  const activationMode =
    form.activationMode === ACTIVATION_MODES.DRAWDOWN_AMOUNT
      ? ACTIVATION_MODES.DRAWDOWN_AMOUNT
      : ACTIVATION_MODES.FULL_DLL;

  if (activationMode === ACTIVATION_MODES.DRAWDOWN_AMOUNT) {
    if (!Number.isFinite(activationDrawdown) || activationDrawdown <= 0) {
      return {
        ok: false,
        message: "Activation drawdown must be a positive dollar amount.",
      };
    }
  }

  const exitMode =
    form.exitMode === EXIT_MODES.FIXED_AMOUNT ? EXIT_MODES.FIXED_AMOUNT : EXIT_MODES.PERCENT;

  if (exitMode === EXIT_MODES.PERCENT) {
    if (!Number.isFinite(exitRecoveryPercent) || exitRecoveryPercent < 1 || exitRecoveryPercent > 100) {
      return {
        ok: false,
        message: "Exit rule must be between 1% and 100% of cumulative drawdown recovered.",
      };
    }
  } else if (!Number.isFinite(exitRecoveryAmount) || exitRecoveryAmount <= 0) {
    return {
      ok: false,
      message: "Exit recovery amount must be a positive dollar amount.",
    };
  }

  return {
    ok: true,
    settings: normalizeDllSettings({
      fullDll: Math.round(fullDll),
      halfDll: Math.round(halfDll),
      recoveryEnabled: !!form.recoveryEnabled,
      activationMode,
      activationDrawdown:
        activationMode === ACTIVATION_MODES.DRAWDOWN_AMOUNT
          ? Math.round(activationDrawdown)
          : Math.round(fullDll),
      exitMode,
      exitRecoveryPercent: Math.round(exitRecoveryPercent),
      exitRecoveryAmount: Math.round(exitRecoveryAmount),
      drawdownRecoveryConfigured: true,
    }),
  };
}
