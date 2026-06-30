/** Dev-only tools — allowlisted accounts (local + internal tester). */
export const DEV_USER_EMAIL = "mike-hermes-agent@agentmail.to";

function normalizeEmail(email) {
  return email?.trim().toLowerCase() ?? "";
}

export function isDevUser(userOrEmail) {
  const email = normalizeEmail(
    typeof userOrEmail === "string" ? userOrEmail : userOrEmail?.email
  );
  if (!email) return false;
  return email === DEV_USER_EMAIL.toLowerCase();
}

/** Server-side: dev tools in local development for founder account too. */
export function canUseDevTools(userOrEmail) {
  const email = normalizeEmail(
    typeof userOrEmail === "string" ? userOrEmail : userOrEmail?.email
  );
  if (!email) return false;
  if (isDevUser(email)) return true;

  if (process.env.NODE_ENV === "development") {
    const founderEmail = normalizeEmail(process.env.FOUNDER_EMAIL);
    if (founderEmail && email === founderEmail) return true;
  }

  return false;
}
