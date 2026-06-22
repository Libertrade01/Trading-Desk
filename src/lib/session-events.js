export const SESSION_SAVED_EVENT = "libertrade:session-saved";
export const TRADES_CHANGED_EVENT = "libertrade:trades-changed";

export function notifySessionSaved() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_SAVED_EVENT));
  }
}

export function notifyTradesChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TRADES_CHANGED_EVENT));
  }
}
