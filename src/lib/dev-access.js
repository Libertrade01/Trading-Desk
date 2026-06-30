/** Dev-only tools — single allowlisted account. */
export const DEV_USER_EMAIL = "mike-hermes-agent@agentmail.to";

export function isDevUser(userOrEmail) {
  const email =
    typeof userOrEmail === "string" ? userOrEmail : userOrEmail?.email;
  if (!email) return false;
  return email.trim().toLowerCase() === DEV_USER_EMAIL.toLowerCase();
}
