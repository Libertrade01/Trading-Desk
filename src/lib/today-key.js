/** YYYY-MM-DD in America/Lima (trading session calendar). */
export function todayKey() {
  const now = new Date();
  const lima = new Date(now.toLocaleString("en-US", { timeZone: "America/Lima" }));
  const y = lima.getFullYear();
  const m = String(lima.getMonth() + 1).padStart(2, "0");
  const d = String(lima.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Lima calendar parts for a given instant (defaults to now). */
export function limaDateParts(date = new Date()) {
  const lima = new Date(date.toLocaleString("en-US", { timeZone: "America/Lima" }));
  const y = lima.getFullYear();
  const m = String(lima.getMonth() + 1).padStart(2, "0");
  const d = String(lima.getDate()).padStart(2, "0");
  return { lima, today: `${y}-${m}-${d}` };
}
