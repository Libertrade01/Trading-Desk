import { storage } from "./supabase";
import {
  loadDllSettings,
  DEFAULT_DLL_SETTINGS,
  getActivationThreshold,
  ACTIVATION_MODES,
  EXIT_MODES,
} from "./dll-recovery-settings";

export const DLL_RECOVERY_KEY = "dll-recovery-state";

function round2(n) {
  return Math.round(n * 100) / 100;
}

function emptyState() {
  return {
    active: false,
    startedAt: null,
    cumulativeDrawdown: 0,
    recoveredSoFar: 0,
    recoveryTarget: 0,
    days: {},
    exitedAt: null,
    lastUpdated: null,
  };
}

function normalizedSettings(settings = DEFAULT_DLL_SETTINGS) {
  return { ...DEFAULT_DLL_SETTINGS, ...settings };
}

export function computeRecoveryTarget(cumulativeDrawdown, settings = DEFAULT_DLL_SETTINGS) {
  const normalized = normalizedSettings(settings);
  if (normalized.exitMode === EXIT_MODES.FIXED_AMOUNT) {
    return round2(normalized.exitRecoveryAmount);
  }
  const pct = normalized.exitRecoveryPercent ?? DEFAULT_DLL_SETTINGS.exitRecoveryPercent;
  const clamped = Math.min(100, Math.max(1, pct));
  return round2(cumulativeDrawdown * (clamped / 100));
}

export function dayActivatesRecovery(net, settings = DEFAULT_DLL_SETTINGS) {
  if (net == null || Number.isNaN(net) || net >= 0) return false;
  const threshold = getActivationThreshold(settings);
  return Math.abs(net) >= threshold;
}

function bumpRecoveryTarget(currentTarget, cumulativeDrawdown, netLoss, settings) {
  const normalized = normalizedSettings(settings);
  if (normalized.exitMode === EXIT_MODES.FIXED_AMOUNT) {
    return round2(currentTarget + Math.abs(netLoss));
  }
  return computeRecoveryTarget(cumulativeDrawdown, normalized);
}

export async function loadRecoveryState() {
  try {
    const r = await storage.get(DLL_RECOVERY_KEY);
    if (!r?.value) return emptyState();
    const parsed = JSON.parse(r.value);
    return { ...emptyState(), ...parsed, days: parsed.days || {} };
  } catch {
    return emptyState();
  }
}

export async function saveRecoveryState(state) {
  await storage.set(DLL_RECOVERY_KEY, JSON.stringify(state));
}

function recomputeFromDays(days, settings) {
  const sortedKeys = Object.keys(days).sort();

  let active = false;
  let startedAt = null;
  let cumulativeDrawdown = 0;
  let recoveredSoFar = 0;
  let recoveryTarget = 0;
  let exitedAt = null;

  for (const key of sortedKeys) {
    const net = days[key]?.netPnl;
    if (net == null || Number.isNaN(net)) continue;

    if (!active) {
      if (dayActivatesRecovery(net, settings)) {
        active = true;
        startedAt = key;
        cumulativeDrawdown = net < 0 ? round2(Math.abs(net)) : 0;
        recoveredSoFar = 0;
        recoveryTarget = computeRecoveryTarget(cumulativeDrawdown, settings);
        exitedAt = null;
      }
      continue;
    }

    if (net > 0) {
      recoveredSoFar = round2(recoveredSoFar + net);
    } else if (net < 0) {
      cumulativeDrawdown = round2(cumulativeDrawdown + Math.abs(net));
      recoveryTarget = bumpRecoveryTarget(recoveryTarget, cumulativeDrawdown, net, settings);
    }

    if (recoveryTarget > 0 && recoveredSoFar >= recoveryTarget) {
      active = false;
      exitedAt = key;
      startedAt = null;
      cumulativeDrawdown = 0;
      recoveredSoFar = 0;
      recoveryTarget = 0;
    }
  }

  return {
    active,
    startedAt,
    cumulativeDrawdown: active ? cumulativeDrawdown : 0,
    recoveredSoFar: active ? recoveredSoFar : 0,
    recoveryTarget: active ? recoveryTarget : 0,
    days,
    exitedAt: active ? null : exitedAt,
  };
}

/** Per-day Drawdown Recovery flags for history UI. */
export function buildRecoveryDayAnnotations(days, settings = DEFAULT_DLL_SETTINGS) {
  const sortedKeys = Object.keys(days || {}).sort();
  const annotations = {};

  let active = false;
  let cumulativeDrawdown = 0;
  let recoveredSoFar = 0;
  let recoveryTarget = 0;

  for (const key of sortedKeys) {
    const net = days[key]?.netPnl;
    if (net == null || Number.isNaN(net)) continue;

    if (!active) {
      if (dayActivatesRecovery(net, settings)) {
        active = true;
        cumulativeDrawdown = net < 0 ? round2(Math.abs(net)) : 0;
        recoveredSoFar = 0;
        recoveryTarget = computeRecoveryTarget(cumulativeDrawdown, settings);
        annotations[key] = {
          activatedDrawdownRecovery: true,
          inDrawdownRecovery: true,
          exitedDrawdownRecovery: false,
        };
      }
      continue;
    }

    annotations[key] = {
      activatedDrawdownRecovery: false,
      inDrawdownRecovery: true,
      exitedDrawdownRecovery: false,
    };

    if (net > 0) {
      recoveredSoFar = round2(recoveredSoFar + net);
    } else if (net < 0) {
      cumulativeDrawdown = round2(cumulativeDrawdown + Math.abs(net));
      recoveryTarget = bumpRecoveryTarget(recoveryTarget, cumulativeDrawdown, net, settings);
    }

    if (recoveryTarget > 0 && recoveredSoFar >= recoveryTarget) {
      annotations[key].exitedDrawdownRecovery = true;
      active = false;
      cumulativeDrawdown = 0;
      recoveredSoFar = 0;
      recoveryTarget = 0;
    }
  }

  return annotations;
}

export function getRecoveryDayLabel(flags) {
  if (!flags) return null;
  if (flags.activatedDrawdownRecovery) return "Drawdown Recovery triggered";
  if (flags.exitedDrawdownRecovery) return "Drawdown Recovery complete";
  if (flags.inDrawdownRecovery) return "In Drawdown Recovery";
  return null;
}

export function isRecoveryActive(state) {
  return !!state?.active;
}

export function getEffectiveMaxDailyLoss(state, settings = DEFAULT_DLL_SETTINGS) {
  return isRecoveryActive(state) ? settings.halfDll : settings.fullDll;
}

export function getRecoveryStatus(state, settings = DEFAULT_DLL_SETTINGS) {
  const normalized = normalizedSettings(settings);
  const active = isRecoveryActive(state);
  const target = state?.recoveryTarget || 0;
  const recovered = state?.recoveredSoFar || 0;
  const drawdown = state?.cumulativeDrawdown || 0;
  const progressPct =
    target > 0 ? Math.min(100, Math.round((recovered / target) * 100)) : 0;

  return {
    active,
    startedAt: state?.startedAt || null,
    cumulativeDrawdown: drawdown,
    recoveredSoFar: recovered,
    recoveryTarget: target,
    progressPct,
    remaining: active ? round2(Math.max(0, target - recovered)) : 0,
    effectiveMaxDailyLoss: getEffectiveMaxDailyLoss(state, normalized),
    fullDll: normalized.fullDll,
    halfDll: normalized.halfDll,
    recoveryEnabled: normalized.recoveryEnabled,
    activationMode: normalized.activationMode,
    activationThreshold: getActivationThreshold(normalized),
    exitMode: normalized.exitMode,
    exitRecoveryPercent: normalized.exitRecoveryPercent,
    exitRecoveryAmount: normalized.exitRecoveryAmount,
    drawdownRecoveryConfigured: normalized.drawdownRecoveryConfigured,
  };
}

export function formatRecoveryProgress(status) {
  if (!status?.active) return "";
  return `${formatRecoveryUsd(status.recoveredSoFar)} of ${formatRecoveryUsd(status.recoveryTarget)} recovered`;
}

export function formatRecoveryUsd(n) {
  if (n == null || Number.isNaN(n)) return "—";
  const abs = Math.abs(n).toFixed(0);
  return n >= 0 ? `$${abs}` : `-$${abs}`;
}

export function formatActivationRule(settings = DEFAULT_DLL_SETTINGS) {
  const normalized = normalizedSettings(settings);
  if (normalized.activationMode === ACTIVATION_MODES.DRAWDOWN_AMOUNT) {
    return `Single-day loss ≥ ${formatRecoveryUsd(normalized.activationDrawdown)}`;
  }
  return `Full daily loss (≥ ${formatRecoveryUsd(normalized.fullDll)})`;
}

export function formatExitRule(settings = DEFAULT_DLL_SETTINGS) {
  const normalized = normalizedSettings(settings);
  if (normalized.exitMode === EXIT_MODES.FIXED_AMOUNT) {
    return `Recover ${formatRecoveryUsd(normalized.exitRecoveryAmount)} (extra loss days add to target)`;
  }
  return `Recover ${normalized.exitRecoveryPercent}% of cumulative drawdown`;
}

export function parseMaxDailyLossValue(raw) {
  if (raw == null || raw === "") return null;
  const cleaned = String(raw).replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? round2(Math.abs(n)) : null;
}

/** Block save when plan max daily loss exceeds effective cap (recovery or full-size). */
export function validatePlanMaxDailyLoss(rawMaxDailyLoss, recoveryState, settings = DEFAULT_DLL_SETTINGS) {
  const parsed = parseMaxDailyLossValue(rawMaxDailyLoss);
  const status = getRecoveryStatus(recoveryState, settings);
  const limit = status.effectiveMaxDailyLoss;

  if (parsed == null) {
    return {
      ok: false,
      parsed: null,
      limit,
      inRecovery: status.active,
      message: "Enter your max daily loss from the broker before saving.",
    };
  }

  if (parsed > limit) {
    return {
      ok: false,
      parsed,
      limit,
      inRecovery: status.active,
      message: status.active
        ? `Max daily loss is ${formatRecoveryUsd(parsed)} but Drawdown Recovery allows ${formatRecoveryUsd(limit)} at most today. Set your broker limit to ${formatRecoveryUsd(limit)} or less before saving.`
        : `Max daily loss is ${formatRecoveryUsd(parsed)} but your full-size limit is ${formatRecoveryUsd(limit)}. Set your broker limit to ${formatRecoveryUsd(limit)} or less before saving.`,
    };
  }

  return { ok: true, parsed, limit, inRecovery: status.active, message: "" };
}

export async function loadRecoveryWithSettings() {
  const [state, settings] = await Promise.all([
    loadRecoveryState(),
    loadDllSettings(),
  ]);
  return {
    state,
    settings,
    status: getRecoveryStatus(state, settings),
    dayAnnotations: buildRecoveryDayAnnotations(state.days, settings),
  };
}

/** Dev/demo: seed an active recovery from a single loss day. */
export async function seedRecoveryDemo(drawdown = 750, dateKey = null) {
  const settings = await loadDllSettings();
  const lossDay =
    dateKey ||
    new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const days = { [lossDay]: { netPnl: round2(-Math.abs(drawdown)) } };
  const recomputed = recomputeFromDays(days, settings);

  const next = {
    ...recomputed,
    lastUpdated: new Date().toISOString(),
  };

  await saveRecoveryState(next);
  return getRecoveryStatus(next, settings);
}

export async function evaluateDay(dateKey, netPnl) {
  const settings = await loadDllSettings();
  const current = await loadRecoveryState();

  if (!settings.recoveryEnabled) {
    return getRecoveryStatus(current, settings);
  }
  if (netPnl == null || Number.isNaN(netPnl)) {
    return getRecoveryStatus(current, settings);
  }

  const days = { ...(current.days || {}), [dateKey]: { netPnl: round2(netPnl) } };
  const recomputed = recomputeFromDays(days, settings);

  const next = {
    ...recomputed,
    lastUpdated: new Date().toISOString(),
  };

  await saveRecoveryState(next);
  return getRecoveryStatus(next, settings);
}
