export const BEHAVIORAL_FLAG_CATEGORIES = [
  {
    id: "risk",
    label: "Risk violations",
    flags: [
      { key: "overtraded", label: "Overtraded", hint: "Took more trades than planned" },
      { key: "oversized", label: "Oversized", hint: "Position size above plan" },
      { key: "movedStops", label: "Moved stops", hint: "Widened or pulled stops" },
      { key: "tradedAfterDll", label: "Traded after DLL", hint: "Kept trading after hitting daily loss limit" },
    ],
  },
  {
    id: "emotional",
    label: "Emotional trading",
    flags: [
      { key: "revengeTraded", label: "Revenge traded", hint: "Re-entered to get even" },
      { key: "fomoEntry", label: "FOMO entry", hint: "Chased price / fear of missing out" },
      { key: "tradedToFixTheDay", label: "Traded to fix the day", hint: "Traded to recover the day's P&L" },
    ],
  },
  {
    id: "execution",
    label: "Execution quality",
    flags: [
      { key: "hesitatedOnAPlusSetup", label: "Hesitated on A+ setup", hint: "Passed on or delayed an A+ entry" },
      { key: "enteredLate", label: "Entered late", hint: "Got in after the ideal entry" },
      { key: "enteredEarly", label: "Entered early", hint: "Got in before the ideal entry or confirmation" },
      { key: "exitedFromEmotion", label: "Exited from emotion", hint: "Closed from fear, hope, or impatience" },
    ],
  },
  {
    id: "process",
    label: "Process drift",
    flags: [
      { key: "ignoredPoorState", label: "Ignored poor state", hint: "Traded despite bad mental or physical state" },
      { key: "distractedDuringSession", label: "Distracted during session", hint: "Lost focus during the session" },
    ],
  },
];

export const BEHAVIORAL_FLAGS = BEHAVIORAL_FLAG_CATEGORIES.flatMap((c) => c.flags);

const LEGACY_FLAG_KEYS = {
  fomoEntries: "fomoEntry",
  hesitatedOnSetup: "hesitatedOnAPlusSetup",
};

/** Map saved reviews that used older flag keys. */
export function normalizePostmarketFlags(data) {
  if (!data) return {};
  const next = { ...data };
  Object.entries(LEGACY_FLAG_KEYS).forEach(([oldKey, newKey]) => {
    if (next[oldKey] && !next[newKey]) {
      next[newKey] = next[oldKey];
    }
  });
  return next;
}

export function getRaisedBehavioralFlags(form) {
  const normalized = normalizePostmarketFlags(form);
  return BEHAVIORAL_FLAGS.filter((f) => normalized[f.key]);
}

export function countBehavioralFlags(form) {
  return getRaisedBehavioralFlags(form).length;
}

export const DEFAULT_POSTMARKET = {
  noTradeToday: false,
  trades: "",
  wins: "",
  losses: "",
  grossPnl: "",
  bestWinner: "",
  worstLoss: "",
  commissionsFees: "",
  followedPlan: 7,
  setupQuality: 7,
  riskDiscipline: 7,
  executionQuality: 7,
  overtraded: false,
  oversized: false,
  movedStops: false,
  tradedAfterDll: false,
  revengeTraded: false,
  fomoEntry: false,
  tradedToFixTheDay: false,
  hesitatedOnAPlusSetup: false,
  enteredLate: false,
  enteredEarly: false,
  exitedFromEmotion: false,
  ignoredPoorState: false,
  distractedDuringSession: false,
  customBehavioralFlags: {},
  emotionalState: 6,
  satisfaction: 6,
  frustration: 4,
  /** null = unanswered; true/false drive risk adherence streak on save */
  riskPlanFollowed: null,
  readVsReality: "",
  wentWell: "",
  wentWrong: "",
  oneLesson: "",
  replaySequenceReviewed: false,
  setupsScreenshottedSaved: false,
  lastImportFile: "",
  lastImportAt: null,
};

/** Optional journal follow-ups — close loop can save with these still pending. */
export const JOURNAL_REVIEW_CHECKLIST = [
  {
    key: "replaySequenceReviewed",
    statusLabel: "Replay",
    label: "At least 1 trade sequence watched back on REPLAY mode",
  },
  {
    key: "setupsScreenshottedSaved",
    statusLabel: "Database",
    label: "Clean trade setups screenshotted and saved to database (taken and missed opportunities)",
  },
];

export function getJournalReviewPendingItems(formOrPost = {}) {
  // No-trade days (holiday, rest, Preservation Mode) do not require replay/database follow-up.
  if (formOrPost?.noTradeToday) return [];
  return JOURNAL_REVIEW_CHECKLIST.filter((item) => !formOrPost?.[item.key]);
}

export function hasJournalReviewPending(formOrPost = {}) {
  return getJournalReviewPendingItems(formOrPost).length > 0;
}

/** True when close loop was saved as an explicit no-trade day. */
export function isNoTradeDay(sessionOrPost = {}) {
  const post = sessionOrPost?.post ?? sessionOrPost;
  return !!(post?.noTradeToday && post?.savedAt);
}

/** e.g. "Replay pending · Database pending" */
export function formatJournalReviewPendingSummary(formOrPost = {}, { separator = " · " } = {}) {
  const pending = getJournalReviewPendingItems(formOrPost);
  if (!pending.length) return null;
  return pending.map((item) => `${item.statusLabel} pending`).join(separator);
}

/** Close loop saved but journal follow-up checkboxes still open. */
export function isJournalFollowUpSession(session) {
  return !!(session?.post?.savedAt && hasJournalReviewPending(session.post));
}

/** Prior trading days (before `beforeDateKey`) with open journal follow-ups, newest first. */
export function findJournalReviewCarryoverSessions(sessions, beforeDateKey) {
  if (!beforeDateKey) return [];
  return (sessions || [])
    .filter((s) => s.date < beforeDateKey && isJournalFollowUpSession(s))
    .sort((a, b) => b.date.localeCompare(a.date));
}
