/** Canonical app origin for auth redirects and email links. */
export function getAppUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (!vercel) return "https://libertrade-desk.vercel.app";
  if (vercel.startsWith("http")) return vercel.replace(/\/$/, "");
  return `https://${vercel}`;
}

export function getAuthCallbackUrl() {
  return `${getAppUrl()}/auth/callback`;
}

export function getResetPasswordUrl() {
  return `${getAppUrl()}/reset-password`;
}
