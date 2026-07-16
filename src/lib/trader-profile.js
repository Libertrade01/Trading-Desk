import { BEHAVIORAL_FLAG_CATEGORIES } from "./postmarket-defaults";
import { VALID_SETUPS } from "./setup-options";
import { normalizeKeyLevelQuickAdds } from "./daily-plan-defaults";
import { storage } from "./supabase";
import { WEARABLE_CONSENT_VERSION } from "./legal";

export const TRADER_PROFILE_KEY = "trader-profile";
export const PROFILE_UPDATED_EVENT = "trader-profile-updated";

export const WELCOME_HINT_STORAGE_KEY = "libertrade-show-welcome-hint";

export const DEFAULT_COMMITMENT =
  "I agree to follow my plan and commit to process over P&L.";

export const DEFAULT_CLOSEOUT_HABITS = [
  {
    id: "setup-screenshots",
    fieldKey: "setupsScreenshottedSaved",
    statusLabel: "Setups",
    label: "Today's A+ setup screenshots saved (taken or missed)",
    enabled: true,
  },
  {
    id: "trade-replay",
    fieldKey: "replaySequenceReviewed",
    statusLabel: "Replay",
    label: "One trade sequence reviewed in REPLAY.",
    enabled: true,
  },
];

const FOUNDER_COMMITMENTS = [
  "I believe in myself and I respect myself enough to follow my plan. Following my plans allows me and my family to live our dream.",
  "I will not place any risk when I am not in a self-regulated state.",
];

const DEFAULT_BIAS_ITEMS = [
  { label: "Value area marked", fieldKey: "biasMarkedValueArea" },
  { label: "Nodes / LVNs marked", fieldKey: "biasMarkedNodesLvns" },
  { label: "Weekly profile marked", fieldKey: "biasMarkedWeeklyProfile" },
];

const DEFAULT_FINISH_CHECKLIST = [
  "Account(s) Ready",
  "CPU OK",
  "Risk Bracket Set",
];

const LEGACY_FINISH_CHECKLIST_LABELS = new Set([
  "unlock accounts",
  "check cpu",
  "select risk bracket order",
]);

function newId() {
  return crypto.randomUUID();
}

function defaultBehavioralFlags() {
  return { builtin: {}, custom: [] };
}

function defaultBiasItems() {
  return DEFAULT_BIAS_ITEMS.map((item) => ({
    id: newId(),
    label: item.label,
    fieldKey: item.fieldKey,
  }));
}

function defaultSetups(names) {
  return names.map((name) => ({ id: newId(), name }));
}

function defaultCommitments(texts) {
  return texts.map((text) => ({ id: newId(), text }));
}

function defaultFinishChecklist(labels = DEFAULT_FINISH_CHECKLIST) {
  return labels.map((label) => ({ id: newId(), label }));
}

function defaultCloseoutHabits() {
  return DEFAULT_CLOSEOUT_HABITS.map((habit) => ({ ...habit }));
}

function migrateFinishChecklist(items) {
  if (!Array.isArray(items) || !items.length) {
    return defaultFinishChecklist();
  }

  const labels = items.map((item) => String(item?.label ?? "").trim().toLowerCase());
  const isLegacyDefault =
    labels.every((label) => LEGACY_FINISH_CHECKLIST_LABELS.has(label))
    && labels.some((label) => label === "unlock accounts");

  if (isLegacyDefault) {
    return defaultFinishChecklist();
  }

  return items.map((item, i) => {
    const next = normalizeChecklistItem(item, i, "Desk item");
    if (next.label.trim().toLowerCase() === "cpu ok") {
      return { ...next, label: "CPU OK" };
    }
    return next;
  });
}

function normalizePreferredName(value) {
  const name = String(value ?? "").trim();
  if (!name) return "";
  return name.slice(0, 32);
}

function normalizePlanRail(value) {
  if (value == null || value === "") return "";
  return String(value).trim();
}

function normalizePlanRails(raw = {}) {
  return {
    defaultMaxDailyLoss: normalizePlanRail(raw.defaultMaxDailyLoss),
    defaultMaxTrades: normalizePlanRail(raw.defaultMaxTrades),
    defaultPositionSize: normalizePlanRail(raw.defaultPositionSize),
  };
}

export function applyPlanRailDefaults(form, profile) {
  const rails = normalizePlanRails(profile);
  const next = { ...form };

  if (!String(next.maxDailyLoss ?? "").trim() && rails.defaultMaxDailyLoss) {
    next.maxDailyLoss = rails.defaultMaxDailyLoss;
  }
  if (!String(next.maxTrades ?? "").trim() && rails.defaultMaxTrades) {
    next.maxTrades = rails.defaultMaxTrades;
  }
  if (!String(next.positionSize ?? "").trim() && rails.defaultPositionSize) {
    next.positionSize = rails.defaultPositionSize;
  }

  return next;
}

export function parsePlanRailMoney(raw) {
  const cleaned = String(raw ?? "").replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function normalizeStreakTargetDays(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(365, Math.round(n));
}

function normalizeConsentTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function wearableConsentPatch(enabled, now = new Date()) {
  if (!enabled) {
    return {
      usesWearable: false,
      wearableConsentAt: null,
      wearableConsentVersion: null,
    };
  }
  return {
    usesWearable: true,
    wearableConsentAt: now.toISOString(),
    wearableConsentVersion: WEARABLE_CONSENT_VERSION,
  };
}

export function createCustomerDefaultProfile() {
  return normalizeTraderProfile({
    profileKind: "customer",
    onboardingCompletedAt: null,
    setups: defaultSetups(["My setup"]),
    commitments: defaultCommitments([DEFAULT_COMMITMENT]),
    biasChecklistEnabled: false,
    biasChecklistItems: defaultBiasItems(),
    streakTargetDays: 20,
    riskStreakEnabled: true,
    playbookStreakEnabled: true,
    usesWearable: false,
    showColdTurkeyBlocker: false,
    finishChecklist: defaultFinishChecklist(),
    closeoutHabits: defaultCloseoutHabits(),
    behavioralFlags: defaultBehavioralFlags(),
    ...normalizePlanRails({}),
  });
}

export function createFounderDefaultProfile() {
  return normalizeTraderProfile({
    profileKind: "founder",
    onboardingCompletedAt: new Date().toISOString(),
    setups: defaultSetups(VALID_SETUPS),
    commitments: defaultCommitments(FOUNDER_COMMITMENTS),
    biasChecklistEnabled: true,
    biasChecklistItems: defaultBiasItems(),
    streakTargetDays: 20,
    riskStreakEnabled: true,
    playbookStreakEnabled: true,
    usesWearable: true,
    showColdTurkeyBlocker: true,
    finishChecklist: defaultFinishChecklist(),
    closeoutHabits: defaultCloseoutHabits(),
    behavioralFlags: defaultBehavioralFlags(),
    ...normalizePlanRails({}),
  });
}

function normalizeSetup(raw, index = 0) {
  return {
    id: raw?.id || newId(),
    name: String(raw?.name ?? `Setup ${index + 1}`).trim(),
  };
}

function normalizeCommitment(raw, index = 0) {
  return {
    id: raw?.id || newId(),
    text: String(raw?.text ?? DEFAULT_COMMITMENT).trim() || DEFAULT_COMMITMENT,
  };
}

function normalizeChecklistItem(raw, index = 0, fallbackLabel = "Item") {
  return {
    id: raw?.id || newId(),
    label: String(raw?.label ?? fallbackLabel).trim() || fallbackLabel,
    ...(raw?.fieldKey ? { fieldKey: String(raw.fieldKey) } : {}),
  };
}

function normalizeCloseoutHabit(raw, index = 0) {
  const fallback = DEFAULT_CLOSEOUT_HABITS[index] || DEFAULT_CLOSEOUT_HABITS[0];
  const id = String(raw?.id || fallback.id || newId());
  return {
    id,
    fieldKey: String(raw?.fieldKey || fallback.fieldKey || `closeoutHabit_${id}`),
    statusLabel: String(raw?.statusLabel || fallback.statusLabel || "Habit"),
    label: String(raw?.label ?? fallback.label).trim() || fallback.label,
    enabled: raw?.enabled !== false,
  };
}

function normalizeBehavioralFlags(raw) {
  const builtin =
    raw?.builtin && typeof raw.builtin === "object" ? { ...raw.builtin } : {};
  const custom = Array.isArray(raw?.custom)
    ? raw.custom.map((flag, i) => ({
        id: flag?.id || newId(),
        categoryId: flag?.categoryId || "custom",
        label: String(flag?.label ?? "").trim(),
        hint: String(flag?.hint ?? "").trim(),
      }))
    : [];
  return { builtin, custom };
}

export function normalizeTraderProfile(raw = {}) {
  let setups = Array.isArray(raw.setups)
    ? raw.setups.map((s, i) => normalizeSetup(s, i))
    : defaultSetups(["My setup"]);
  if (!setups.length) setups = defaultSetups(["My setup"]);

  let commitments = Array.isArray(raw.commitments)
    ? raw.commitments.map((c, i) => normalizeCommitment(c, i))
    : defaultCommitments([DEFAULT_COMMITMENT]);
  if (!commitments.length) commitments = defaultCommitments([DEFAULT_COMMITMENT]);

  let biasChecklistItems = Array.isArray(raw.biasChecklistItems)
    ? raw.biasChecklistItems.map((item, i) => normalizeChecklistItem(item, i))
    : defaultBiasItems();
  if (!biasChecklistItems.length) biasChecklistItems = defaultBiasItems();

  let finishChecklist = Array.isArray(raw.finishChecklist)
    ? migrateFinishChecklist(raw.finishChecklist)
    : defaultFinishChecklist();
  if (!finishChecklist.length) finishChecklist = defaultFinishChecklist();

  let closeoutHabits = Array.isArray(raw.closeoutHabits)
    ? raw.closeoutHabits.map((item, i) => normalizeCloseoutHabit(item, i))
    : defaultCloseoutHabits();
  if (!closeoutHabits.length) closeoutHabits = defaultCloseoutHabits();

  const streakTargetDays = normalizeStreakTargetDays(raw.streakTargetDays);
  const profileKind = raw.profileKind === "founder" ? "founder" : "customer";
  const wearableConsentAt = normalizeConsentTimestamp(raw.wearableConsentAt);
  const wearableConsentVersion = raw.wearableConsentVersion
    ? String(raw.wearableConsentVersion)
    : null;
  const hasCurrentWearableConsent =
    !!wearableConsentAt && wearableConsentVersion === WEARABLE_CONSENT_VERSION;

  return {
    profileKind,
    preferredName: normalizePreferredName(raw.preferredName),
    onboardingCompletedAt:
      raw.onboardingCompletedAt != null && raw.onboardingCompletedAt !== ""
        ? String(raw.onboardingCompletedAt)
        : null,
    setups,
    commitments,
    biasChecklistEnabled: !!raw.biasChecklistEnabled,
    biasChecklistItems,
    streakTargetDays,
    riskStreakEnabled: raw.riskStreakEnabled !== false,
    playbookStreakEnabled: raw.playbookStreakEnabled !== false,
    usesWearable:
      !!raw.usesWearable && (profileKind === "founder" || hasCurrentWearableConsent),
    wearableConsentAt,
    wearableConsentVersion,
    showColdTurkeyBlocker:
      profileKind === "founder" ? !!raw.showColdTurkeyBlocker : false,
    finishChecklist,
    closeoutHabits,
    keyLevelQuickAdds: normalizeKeyLevelQuickAdds(raw.keyLevelQuickAdds),
    behavioralFlags: normalizeBehavioralFlags(raw.behavioralFlags),
    ...normalizePlanRails(raw),
    updatedAt: raw.updatedAt ?? null,
  };
}

export function validateTraderProfileInput(form) {
  const profile = normalizeTraderProfile(form);

  const namedSetups = profile.setups.filter((s) => s.name.trim());
  if (!namedSetups.length) {
    return { ok: false, message: "Add at least one playbook setup with a name." };
  }

  const namedCommitments = profile.commitments.filter((c) => c.text.trim());
  if (!namedCommitments.length) {
    return { ok: false, message: "Add at least one session plan commitment." };
  }
  if (namedCommitments.length > 3) {
    return { ok: false, message: "Maximum 3 commitments." };
  }

  if (profile.setups.length > 8) {
    return { ok: false, message: "Maximum 8 playbook setups." };
  }

  if (profile.biasChecklistEnabled) {
    const items = profile.biasChecklistItems.filter((item) => item.label.trim());
    if (!items.length) {
      return { ok: false, message: "Add at least one charting checklist item or disable the checklist." };
    }
    if (profile.biasChecklistItems.length > 8) {
      return { ok: false, message: "Maximum 8 charting checklist items." };
    }
  }

  const finishItems = profile.finishChecklist.filter((item) => item.label.trim());
  if (!finishItems.length) {
    return { ok: false, message: "Add at least one check-in desk item." };
  }

  return {
    ok: true,
    profile: {
      ...profile,
      setups: namedSetups,
      commitments: namedCommitments.slice(0, 3),
      biasChecklistItems: profile.biasChecklistEnabled
        ? profile.biasChecklistItems.filter((item) => item.label.trim()).slice(0, 8)
        : profile.biasChecklistItems,
      finishChecklist: finishItems.slice(0, 6),
      closeoutHabits: profile.closeoutHabits.slice(0, 6),
      keyLevelQuickAdds: normalizeKeyLevelQuickAdds(profile.keyLevelQuickAdds),
    },
  };
}

let profileCache = null;
let profileLoadPromise = null;

export function clearTraderProfileCache() {
  profileCache = null;
  profileLoadPromise = null;
}

function dispatchProfileUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT));
  }
}

export async function loadTraderProfile({ force = false } = {}) {
  if (!force && profileCache) return profileCache;
  if (!force && profileLoadPromise) return profileLoadPromise;

  profileLoadPromise = (async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        profileCache = normalizeTraderProfile(data);
        return profileCache;
      }
    } catch {
      /* fall through to local fallback */
    }

    try {
      const row = await storage.get(TRADER_PROFILE_KEY);
      if (row?.value) {
        profileCache = normalizeTraderProfile(JSON.parse(row.value));
        return profileCache;
      }
    } catch {
      /* fall through */
    }

    profileCache = createCustomerDefaultProfile();
    return profileCache;
  })();

  try {
    return await profileLoadPromise;
  } finally {
    profileLoadPromise = null;
  }
}

export async function saveTraderProfile(profile) {
  const next = normalizeTraderProfile(profile);
  try {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (res.ok) {
      const saved = normalizeTraderProfile(await res.json());
      profileCache = saved;
      dispatchProfileUpdated();
      return saved;
    }
  } catch {
    /* fall through to local save */
  }

  try {
    await storage.set(TRADER_PROFILE_KEY, JSON.stringify(next));
    profileCache = next;
    dispatchProfileUpdated();
    return next;
  } catch (err) {
    throw new Error(err.message || "Failed to save trader profile");
  }
}

export async function ensureFounderProfile() {
  const current = await loadTraderProfile({ force: true });
  if (current.profileKind === "founder" && current.onboardingCompletedAt) {
    return current;
  }
  const next = createFounderDefaultProfile();
  return saveTraderProfile(next);
}

export function isOnboardingComplete(profile) {
  return !!profile?.onboardingCompletedAt;
}

export async function completeOnboarding(profilePatch = {}) {
  const current = profileCache || (await loadTraderProfile());
  const merged = normalizeTraderProfile({
    ...current,
    ...profilePatch,
    onboardingCompletedAt: new Date().toISOString(),
  });
  const saved = await saveTraderProfile(merged);
  if (typeof window !== "undefined") {
    sessionStorage.setItem(WELCOME_HINT_STORAGE_KEY, "1");
  }
  return saved;
}

export function getPlaybookSetupNames(profile) {
  const source = profile || profileCache;
  const names = source?.setups?.map((s) => s.name.trim()).filter(Boolean);
  return names?.length ? names : ["My setup"];
}

export function getVisibleCloseoutHabits(profile) {
  const source = profile?.closeoutHabits?.length ? profile.closeoutHabits : defaultCloseoutHabits();
  return source.filter((habit) => habit.enabled !== false && habit.label.trim());
}

export function getEnabledBiasItems(profile) {
  if (!profile?.biasChecklistEnabled) return [];
  return (profile.biasChecklistItems || [])
    .filter((item) => item.label?.trim())
    .map((item) => ({
      id: item.id,
      label: item.label,
      fieldKey: item.fieldKey || `biasCheck_${item.id}`,
    }));
}

export function riskRailsReady(form, profile) {
  if (!form.maxDailyLossSetInBroker) return false;
  if (profile?.showColdTurkeyBlocker && !form.coldTurkeyBlockerSet) return false;
  return true;
}

export function biasChecklistReady(form, profile) {
  const items = getEnabledBiasItems(profile);
  if (!items.length) return true;
  return items.every((item) => !!form[item.fieldKey]);
}

export function commitmentsReady(form, profile) {
  const list = profile?.commitments || [];
  if (!list.length) return true;
  return list.every((commitment) => !!form.commitmentAccepted?.[commitment.id]);
}

export function migratePlanCommitments(form, profile) {
  const next = { ...form, commitmentAccepted: { ...(form.commitmentAccepted || {}) } };
  const commitments = profile?.commitments || [];

  if (commitments[0] && form.selfCommitmentAccepted && !next.commitmentAccepted[commitments[0].id]) {
    next.commitmentAccepted[commitments[0].id] = true;
  }
  if (commitments[1] && form.selfRegulatedCommitmentAccepted && !next.commitmentAccepted[commitments[1].id]) {
    next.commitmentAccepted[commitments[1].id] = true;
  }

  return next;
}

const LEGACY_DESK_MAP = [
  { legacyKey: "unlockAccounts", match: /unlock|account/i },
  { legacyKey: "checkCpu", match: /cpu/i },
  { legacyKey: "selectRiskBracketOrder", match: /risk bracket/i },
];

export function migratePremarketDeskChecks(form, profile) {
  const next = {
    ...form,
    deskChecks: { ...(form.deskChecks || {}) },
  };

  for (const item of profile?.finishChecklist || []) {
    if (next.deskChecks[item.id] != null) continue;
    const legacy = LEGACY_DESK_MAP.find(({ match }) => match.test(item.label));
    if (legacy && form[legacy.legacyKey]) {
      next.deskChecks[item.id] = true;
    }
  }

  return next;
}

export function deskCheckValue(form, itemId) {
  return !!form.deskChecks?.[itemId];
}

export function setDeskCheck(form, itemId, value) {
  return {
    ...form,
    deskChecks: { ...(form.deskChecks || {}), [itemId]: value },
  };
}

function isBuiltinFlagVisible(profile, key) {
  return profile?.behavioralFlags?.builtin?.[key] !== false;
}

export function getVisibleBehavioralFlagCategories(profile) {
  const customByCategory = {};
  for (const flag of profile?.behavioralFlags?.custom || []) {
    if (!flag.label?.trim()) continue;
    const categoryId = flag.categoryId || "custom";
    if (!customByCategory[categoryId]) customByCategory[categoryId] = [];
    customByCategory[categoryId].push({
      key: `custom-${flag.id}`,
      customId: flag.id,
      label: flag.label,
      hint: flag.hint || "",
    });
  }

  return BEHAVIORAL_FLAG_CATEGORIES.map((category) => {
    const builtinFlags = category.flags
      .filter((flag) => isBuiltinFlagVisible(profile, flag.key))
      .map((flag) => ({ ...flag }));
    const customFlags = customByCategory[category.id] || [];
    const flags = [...builtinFlags, ...customFlags];
    return flags.length ? { ...category, flags } : null;
  }).filter(Boolean);
}

export function countVisibleBehavioralFlags(form, profile) {
  let count = 0;
  for (const category of getVisibleBehavioralFlagCategories(profile)) {
    for (const flag of category.flags) {
      if (flag.customId) {
        if (form.customBehavioralFlags?.[flag.customId]) count += 1;
      } else if (form[flag.key]) {
        count += 1;
      }
    }
  }
  return count;
}
