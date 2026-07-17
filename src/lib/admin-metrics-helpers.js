const DAY_MS = 24 * 60 * 60 * 1000;

export const SESSION_KEY_PREFIXES = {
  checkins: "premarket-checkin-",
  plans: "daily-plan-",
  loops: "postmarket-review-",
};

function safeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dateKeyDaysAgo(days, now = new Date()) {
  return new Date(now.getTime() - days * DAY_MS).toISOString().slice(0, 10);
}

export function isWithinDays(value, days, now = new Date()) {
  const date = safeDate(value);
  if (!date) return false;
  return date.getTime() >= now.getTime() - days * DAY_MS;
}

export function maskEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at < 1) return "Email unavailable";
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(3, Math.min(6, local.length - visible.length)))}@${domain}`;
}

export function preferredNameForUser(user, profile) {
  return String(
    profile?.preferredName ||
      user?.user_metadata?.preferred_name ||
      user?.user_metadata?.display_name ||
      ""
  ).trim() || "Unnamed user";
}

export function parseProfileValue(value) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function sessionTypeFromKey(key) {
  for (const [type, prefix] of Object.entries(SESSION_KEY_PREFIXES)) {
    if (String(key || "").startsWith(prefix)) return type;
  }
  return null;
}

export function sessionDateFromKey(key) {
  const type = sessionTypeFromKey(key);
  if (!type) return null;
  const date = String(key).slice(SESSION_KEY_PREFIXES[type].length);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

export function buildAdminSnapshot({ users = [], profiles = [], sessions = [], trades = [], now = new Date() }) {
  const profileByUser = new Map();
  for (const row of profiles) {
    const profile = parseProfileValue(row.value);
    if (row.user_id && profile && !profileByUser.has(row.user_id)) {
      profileByUser.set(row.user_id, { profile, updatedAt: row.updated_at || null });
    }
  }

  const activityByUser = new Map();
  const firstLoopUsers = new Set();
  const sessionCounts = {
    checkins7: 0,
    checkins30: 0,
    plans7: 0,
    plans30: 0,
    loops7: 0,
    loops30: 0,
  };
  const active7 = new Set();
  const active30 = new Set();
  const since7 = dateKeyDaysAgo(7, now);
  const since30 = dateKeyDaysAgo(30, now);
  const seenSessions = new Set();

  for (const row of sessions) {
    const type = sessionTypeFromKey(row.key);
    const date = sessionDateFromKey(row.key);
    if (!type || !date || !row.user_id) continue;
    const sessionIdentity = `${row.user_id}:${row.key}`;
    if (seenSessions.has(sessionIdentity)) continue;
    seenSessions.add(sessionIdentity);
    if (type === "loops") firstLoopUsers.add(row.user_id);
    if (date >= since30) {
      sessionCounts[`${type}30`] += 1;
      active30.add(row.user_id);
    }
    if (date >= since7) {
      sessionCounts[`${type}7`] += 1;
      active7.add(row.user_id);
    }
    const current = activityByUser.get(row.user_id);
    const timestamp = row.updated_at || `${date}T00:00:00.000Z`;
    if (!current || new Date(timestamp) > new Date(current)) activityByUser.set(row.user_id, timestamp);
  }

  let trades7 = 0;
  let trades30 = 0;
  for (const trade of trades) {
    if (!trade.user_id) continue;
    const timestamp = trade.entry_time || (trade.date ? `${trade.date}T00:00:00.000Z` : null);
    if (isWithinDays(timestamp, 30, now)) {
      trades30 += 1;
      active30.add(trade.user_id);
    }
    if (isWithinDays(timestamp, 7, now)) {
      trades7 += 1;
      active7.add(trade.user_id);
    }
    const current = activityByUser.get(trade.user_id);
    if (timestamp && (!current || new Date(timestamp) > new Date(current))) {
      activityByUser.set(trade.user_id, timestamp);
    }
  }

  const confirmedUsers = users.filter((user) => user.email_confirmed_at || user.confirmed_at);
  const onboardedUsers = users.filter((user) => profileByUser.get(user.id)?.profile?.onboardingCompletedAt);

  for (const user of users) {
    if (isWithinDays(user.last_sign_in_at, 30, now)) active30.add(user.id);
    if (isWithinDays(user.last_sign_in_at, 7, now)) active7.add(user.id);
  }

  const recentUsers = [...users]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 20)
    .map((user) => {
      const profileEntry = profileByUser.get(user.id);
      const candidates = [user.last_sign_in_at, profileEntry?.updatedAt, activityByUser.get(user.id)]
        .filter(Boolean)
        .map((value) => safeDate(value))
        .filter(Boolean)
        .sort((a, b) => b - a);
      return {
        id: user.id,
        name: preferredNameForUser(user, profileEntry?.profile),
        email: maskEmail(user.email),
        createdAt: user.created_at || null,
        confirmed: Boolean(user.email_confirmed_at || user.confirmed_at),
        onboarded: Boolean(profileEntry?.profile?.onboardingCompletedAt),
        firstLoop: firstLoopUsers.has(user.id),
        lastActiveAt: candidates[0]?.toISOString() || null,
      };
    });

  return {
    generatedAt: now.toISOString(),
    accounts: {
      total: users.length,
      confirmed: confirmedUsers.length,
      signups7: users.filter((user) => isWithinDays(user.created_at, 7, now)).length,
      signups30: users.filter((user) => isWithinDays(user.created_at, 30, now)).length,
      onboarded: onboardedUsers.length,
      onboardingRate: users.length ? Math.round((onboardedUsers.length / users.length) * 100) : 0,
      firstLoop: firstLoopUsers.size,
      firstLoopRate: users.length ? Math.round((firstLoopUsers.size / users.length) * 100) : 0,
    },
    activity: {
      active7: active7.size,
      active30: active30.size,
      ...sessionCounts,
      trades7,
      trades30,
    },
    recentUsers,
  };
}

export function summarizeTrafficRows(rows = []) {
  return rows.reduce(
    (total, row) => ({
      pageviews: total.pageviews + Number(row.pageviews || 0),
      visitors: total.visitors + Number(row.visitors || 0),
    }),
    { pageviews: 0, visitors: 0 }
  );
}
