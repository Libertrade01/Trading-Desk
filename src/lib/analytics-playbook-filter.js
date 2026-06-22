export const PLAYBOOK_TRACKING_START_KEY = "analytics-playbook-tracking-start";

/** Trades within toolbar range, on or after playbook tracking start. */
export function filterTradesForPlaybookAdherence(trades, trackingStart) {
  if (!trackingStart) return [];
  return (trades || []).filter((t) => t.date >= trackingStart);
}
