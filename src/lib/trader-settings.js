import { storage } from "./supabase";

export const TRADER_SETTINGS_KEY = "trader-settings";

const LEGACY_ACCOUNTS_KEY = "libertrade_accounts";
const LEGACY_DEFAULT_RISK_KEY = "libertrade_default_risk";

export const DEFAULT_COMMISSIONS = {
  MNQ: "0.50",
  NQ: "1.75",
  MES: "0.50",
  ES: "1.75",
  GC: "2.30",
  MGC: "0.80",
};

export const COMMISSION_SYMBOLS = Object.keys(DEFAULT_COMMISSIONS);

export const DEFAULT_TRADER_SETTINGS = {
  defaultRisk: 15,
  accounts: [],
};

function newAccountId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultAccount(overrides = {}) {
  return {
    id: newAccountId(),
    name: "Default Account",
    starting_balance: 50000,
    be_threshold: 30,
    account_type: "eval",
    active: true,
    forImport: true,
    commissions: { ...DEFAULT_COMMISSIONS },
    ...overrides,
  };
}

function readLegacyDefaultRisk() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LEGACY_DEFAULT_RISK_KEY);
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readLegacyAccounts() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LEGACY_ACCOUNTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch {
    return null;
  }
}

function clearLegacyTraderStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_ACCOUNTS_KEY);
  localStorage.removeItem(LEGACY_DEFAULT_RISK_KEY);
}

function normalizeCommissions(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return { ...DEFAULT_COMMISSIONS };
  for (const [sym, rate] of Object.entries(raw)) {
    const key = String(sym).trim().toUpperCase();
    if (!key) continue;
    out[key] = String(rate);
  }
  return Object.keys(out).length ? out : { ...DEFAULT_COMMISSIONS };
}

export function normalizeAccount(raw, index = 0) {
  return {
    id: raw?.id || newAccountId(),
    name: String(raw?.name || `Account ${index + 1}`).trim() || `Account ${index + 1}`,
    starting_balance: Number.isFinite(Number(raw?.starting_balance))
      ? Number(raw.starting_balance)
      : 0,
    be_threshold: Number.isFinite(Number(raw?.be_threshold))
      ? Number(raw.be_threshold)
      : 30,
    account_type: ["eval", "funded", "cash"].includes(raw?.account_type)
      ? raw.account_type
      : "eval",
    active: raw?.active !== false,
    forImport: !!raw?.forImport,
    commissions: normalizeCommissions(raw?.commissions),
  };
}

export function normalizeTraderSettings(raw = {}) {
  let accounts = Array.isArray(raw.accounts)
    ? raw.accounts.map((a, i) => normalizeAccount(a, i))
    : [];

  if (!accounts.length) {
    accounts = [createDefaultAccount()];
  }

  if (!accounts.some((a) => a.forImport)) {
    const firstActive = accounts.find((a) => a.active) || accounts[0];
    accounts = accounts.map((a) => ({
      ...a,
      forImport: a.id === firstActive.id,
    }));
  } else if (accounts.filter((a) => a.forImport).length > 1) {
    let seen = false;
    accounts = accounts.map((a) => {
      if (a.forImport && !seen) {
        seen = true;
        return a;
      }
      return { ...a, forImport: false };
    });
  }

  const defaultRisk = Number(raw.defaultRisk);
  return {
    defaultRisk:
      Number.isFinite(defaultRisk) && defaultRisk > 0
        ? Math.round(defaultRisk * 100) / 100
        : DEFAULT_TRADER_SETTINGS.defaultRisk,
    accounts,
  };
}

export function getImportAccount(settings) {
  const normalized = normalizeTraderSettings(settings);
  return (
    normalized.accounts.find((a) => a.forImport) ||
    normalized.accounts.find((a) => a.active) ||
    normalized.accounts[0] ||
    null
  );
}

export async function loadTraderSettings() {
  try {
    const r = await storage.get(TRADER_SETTINGS_KEY);
    if (r?.value) {
      return normalizeTraderSettings(JSON.parse(r.value));
    }
  } catch {
    /* fall through */
  }

  const legacyAccounts = readLegacyAccounts();
  const legacyRisk = readLegacyDefaultRisk();
  if (legacyAccounts || legacyRisk != null) {
    const migrated = normalizeTraderSettings({
      defaultRisk: legacyRisk ?? DEFAULT_TRADER_SETTINGS.defaultRisk,
      accounts: legacyAccounts?.map((a, i) =>
        normalizeAccount(
          {
            ...a,
            forImport: i === 0 || !!a.active,
          },
          i
        )
      ),
    });
    await saveTraderSettings(migrated);
    clearLegacyTraderStorage();
    return migrated;
  }

  const defaults = normalizeTraderSettings(DEFAULT_TRADER_SETTINGS);
  await saveTraderSettings(defaults);
  return defaults;
}

export async function saveTraderSettings(settings) {
  const next = normalizeTraderSettings(settings);
  await storage.set(
    TRADER_SETTINGS_KEY,
    JSON.stringify({ ...next, updatedAt: new Date().toISOString() })
  );
  return next;
}

export function validateTraderSettingsInput(form) {
  const defaultRisk = Number(String(form.defaultRisk).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(defaultRisk) || defaultRisk <= 0) {
    return { ok: false, message: "Default risk must be a positive number (stop points)." };
  }

  const accounts = form.accounts.map((a, i) => normalizeAccount(a, i));
  if (!accounts.length) {
    return { ok: false, message: "Add at least one trading account." };
  }

  for (const a of accounts) {
    if (!a.name.trim()) {
      return { ok: false, message: "Every account needs a name." };
    }
  }

  if (!accounts.some((a) => a.forImport)) {
    return { ok: false, message: "Select one account for rTrader imports." };
  }

  return {
    ok: true,
    settings: normalizeTraderSettings({
      defaultRisk,
      accounts,
    }),
  };
}
