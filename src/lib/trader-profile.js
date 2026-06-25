import { BEHAVIORAL_FLAG_CATEGORIES } from "./postmarket-defaults";
import { VALID_SETUPS } from "./setup-options";
import { storage } from "./supabase";

export const TRADER_PROFILE_KEY = "trader-profile";
export const PROFILE_UPDATED_EVENT = "trader-profile-updated";

export const WELCOME_HINT_STORAGE_KEY = "libertrade-show-welcome-hint";

const DEFAULT_COMMITMENT =
  "I believe in myself and agree to follow my plan.";

const FOUNDER_COMMITMENTS = [
  "I believe in myself and I respect myself enough to follow my plan. Following my plans allows me and my family to live our dream.",
  "I will not place any risk when I am not in a self-regulated state.",
];

const DEFAULT_BIAS_ITEMS = [
  { label: "Value area marked", fieldKey: "biasMarkedValueArea" },
  { label: "Nodes / LVNs marked", fieldKey: "biasMarkedNodesLvns" },
  { label: "Weekly profile marked", fieldKey: "biasMarkedWeeklyProfile" },
];

const FOUNDER_FINISH_CHECKLIST = [
  "Unlock accounts",
  "Check CPU",
  "Select Risk Bracket Order",
];

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

function defaultFinishChecklist(labels) {
  return labels.map((label) => ({ id: newId(), label }));
}

export function createCustomerDefaultProfile() {
  return normalizeTraderProfile({
    profileKind: "customer",
    onboardingCompletedAt: null,
    setups: defaultSetups(["My setup"]),
    commitments: defaultCommitments([DEFAULT_COMMITMENT]),
    biasChecklistEnabled: false,
    biasChecklistItems: defaultBiasItems(),
    streakTargetDays: 21,
    riskStreakEnabled: true,
    playbookStreakEnabled: true,
    usesWearable: false,
    showColdTurkeyBlocker: false,
    finishChecklist: defaultFinishChecklist(["Unlock accounts"]),
    behavioralFlags: defaultBehavioralFlags(),
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
    streakTargetDays: 21,
    riskStreakEnabled: true,
    playbookStreakEnabled: true,
    usesWearable: true,
    showColdTurkeyBlocker: true,
    finishChecklist: defaultFinishChecklist(FOUNDER_FINISH_CHECKLIST),
    behavioralFlags: defaultBehavioralFlags(),
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
    ? raw.finishChecklist.map((item, i) => normalizeChecklistItem(item, i, "Desk item"))
    : defaultFinishChecklist(["Unlock accounts"]);
  if (!finishChecklist.length) finishChecklist = defaultFinishChecklist(["Unlock accounts"]);

  const streakTargetDays = Number(raw.streakTargetDays);
  const profileKind = raw.profileKind === "founder" ? "founder" : "customer";

  return {
    profileKind,
    onboardingCompletedAt:
      raw.onboardingCompletedAt != null && raw.onboardingCompletedAt !== ""
        ? String(raw.onboardingCompletedAt)
        : null,
    setups,
    commitments,
    biasChecklistEnabled: !!raw.biasChecklistEnabled,
    biasChecklistItems,
    streakTargetDays:
      Number.isFinite(streakTargetDays) && streakTargetDays >= 1
        ? Math.min(365, Math.round(streakTargetDays))
        : 21,
    riskStreakEnabled: raw.riskStreakEnabled !== false,
    playbookStreakEnabled: raw.playbookStreakEnabled !== false,
    usesWearable: !!raw.usesWearable,
    showColdTurkeyBlocker:
      profileKind === "founder" ? !!raw.showColdTurkeyBlocker : false,
    finishChecklist,
    behavioralFlags: normalizeBehavioralFlags(raw.behavioralFlags),
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
      return { ok: false, message: "Add at least one chart marks checklist item or disable the checklist." };
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
      finishChecklist: finishItems.slice(0, 6),
    },
  };
}

let profileCache = null;
let profileLoadPromise = null;

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
  { legacyKey: "unlockAccounts", match: /unlock/i },
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
