export const PUBLIC_ANALYTICS_PATHS = Object.freeze([
  "/",
  "/cookies",
  "/login",
  "/privacy",
  "/signup",
  "/terms",
]);

export const PUBLIC_CONVERSION_EVENTS = Object.freeze({
  landingSignupClicked: "landing_signup_clicked",
  signupStarted: "signup_started",
  signupSubmitted: "signup_submitted",
  loginClicked: "login_clicked",
});

const PUBLIC_ANALYTICS_PATH_SET = new Set(PUBLIC_ANALYTICS_PATHS);

export function isPublicAnalyticsUrl(url) {
  try {
    return PUBLIC_ANALYTICS_PATH_SET.has(new URL(url).pathname);
  } catch {
    return false;
  }
}
