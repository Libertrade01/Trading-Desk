import { storage } from "./supabase";

export const DLL_SETTINGS_KEY = "dll-risk-settings";

export const DEFAULT_DLL_SETTINGS = {
  fullDll: 750,
  halfDll: 400,
  recoveryEnabled: true,
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

function readLegacyBool(key, fallback) {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (raw == null) return fallback;
  return raw === "true";
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

export function normalizeDllSettings(raw = {}) {
  const fullDll = Number(raw.fullDll);
  const halfDll = Number(raw.halfDll);

  return {
    fullDll: Number.isFinite(fullDll) && fullDll > 0
      ? Math.round(fullDll)
      : DEFAULT_DLL_SETTINGS.fullDll,
    halfDll: Number.isFinite(halfDll) && halfDll > 0
      ? Math.round(halfDll)
      : DEFAULT_DLL_SETTINGS.halfDll,
    recoveryEnabled:
      raw.recoveryEnabled == null
        ? DEFAULT_DLL_SETTINGS.recoveryEnabled
        : !!raw.recoveryEnabled,
  };
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
  const fullDll = Number(String(form.fullDll).replace(/[$,\s]/g, ""));
  const halfDll = Number(String(form.halfDll).replace(/[$,\s]/g, ""));

  if (!Number.isFinite(fullDll) || fullDll <= 0) {
    return { ok: false, message: "Full-size DLL must be a positive dollar amount." };
  }
  if (!Number.isFinite(halfDll) || halfDll <= 0) {
    return { ok: false, message: "Recovery (half) DLL must be a positive dollar amount." };
  }
  if (halfDll >= fullDll) {
    return {
      ok: false,
      message: "Recovery DLL must be less than full-size DLL.",
    };
  }

  return {
    ok: true,
    settings: {
      fullDll: Math.round(fullDll),
      halfDll: Math.round(halfDll),
      recoveryEnabled: !!form.recoveryEnabled,
    },
  };
}
