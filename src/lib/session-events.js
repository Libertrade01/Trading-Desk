export const SESSION_SAVED_EVENT = "libertrade:session-saved";

export function notifySessionSaved() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_SAVED_EVENT));
  }
}
