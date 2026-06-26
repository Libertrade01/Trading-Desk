import { storage } from "./supabase";

export const DLL_SETTINGS_KEY = "dll-risk-settings";

export const ACTIVATION_MODES = {
  FULL_DLL: "full_dll",
  DRAWDOWN_AMOUNT: "drawdown_amount",
};

export const ACTIVATION_MODE_OPTIONS = [
  {
    value: ACTIVATION_MODES.FULL_DLL,
    label: "Full daily loss (DLL)",
    hint: "Enter recovery when a single day hits your full-size max loss.",
  },
  {
    value: ACTIVATION_MODES.DRAWDOWN_AMOUNT,
    label: "Drawdown amount ($)",
    hint: "Enter recovery when a single day loses at least this dollar amount.",
  },
];

export const DEFAULT_DLL_SETTINGS = {
  fullDll: 750,
  halfDll: 400,
  recoveryEnabled: true,
  activationMode: ACTIVATION_MODES.FULL_DLL,
  activationDrawdown: 750,
  exitRecoveryPercent: 50,
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

  const activationMode =
    raw.activationMode === ACTIVATION_MODES.DRAWDOWN_AMOUNT
      ? ACTIVATION_MODES.DRAWDOWN_AMOUNT
      : ACTIVATION_MODES.FULL_DLL;

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
  const normalizedExit =
    Number.isFinite(exitRecoveryPercent) && exitRecoveryPercent >= 1 && exitRecoveryPercent <= 100
      ? Math.round(exitRecoveryPercent)
      : DEFAULT_DLL_SETTINGS.exitRecoveryPercent;

  return {
    fullDll: normalizedFull,
    halfDll: normalizedHalf,
    recoveryEnabled:
      raw.recoveryEnabled == null
        ? DEFAULT_DLL_SETTINGS.recoveryEnabled
        : !!raw.recoveryEnabled,
    activationMode,
    activationDrawdown: normalizedActivation,
    exitRecoveryPercent: normalizedExit,
  };
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
    await saveDllSettings(legacy);
    clearLegacyLocalStorage();
    return legacy;
  }

  return { ...DEFAULT_DLL_SETTINGS };
}

export async function saveDllSettings(settings) {
  const next = normalizeDllSettings(settings);
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

  if (!Number.isFinite(exitRecoveryPercent) || exitRecoveryPercent < 1 || exitRecoveryPercent > 100) {
    return {
      ok: false,
      message: "Exit rule must be between 1% and 100% of cumulative drawdown recovered.",
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
      exitRecoveryPercent: Math.round(exitRecoveryPercent),
    }),
  };
}
