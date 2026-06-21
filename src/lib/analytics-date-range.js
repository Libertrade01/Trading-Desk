/** Date range presets aligned with analytics.html filter bar. */

function limaTodayParts() {
  const now = new Date();
  const lima = new Date(now.toLocaleString("en-US", { timeZone: "America/Lima" }));
  const y = lima.getFullYear();
  const m = String(lima.getMonth() + 1).padStart(2, "0");
  const d = String(lima.getDate()).padStart(2, "0");
  return { today: `${y}-${m}-${d}`, lima, now };
}

function limaStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function resolveDateRangePreset(preset) {
  const { today, lima, now } = limaTodayParts();
  const dow = lima.getDay();

  if (preset === "week") {
    const monday = new Date(lima);
    monday.setDate(lima.getDate() - (dow === 0 ? 6 : dow - 1));
    return { dateFrom: limaStr(monday), dateTo: today };
  }
  if (preset === "lastweek") {
    const lastMon = new Date(lima);
    lastMon.setDate(lima.getDate() - (dow === 0 ? 13 : dow + 6));
    const lastFri = new Date(lastMon);
    lastFri.setDate(lastMon.getDate() + 4);
    return { dateFrom: limaStr(lastMon), dateTo: limaStr(lastFri) };
  }
  if (preset === "month") {
    const dateFrom = `${lima.getFullYear()}-${String(lima.getMonth() + 1).padStart(2, "0")}-01`;
    return { dateFrom, dateTo: today };
  }
  if (preset === "5d") {
    const d5 = new Date(lima);
    d5.setDate(lima.getDate() - 4);
    return { dateFrom: limaStr(d5), dateTo: today };
  }
  if (preset === "10d") {
    const d10 = new Date(lima);
    d10.setDate(lima.getDate() - 9);
    return { dateFrom: limaStr(d10), dateTo: today };
  }
  if (preset === "20d") {
    const d20 = new Date(lima);
    d20.setDate(lima.getDate() - 19);
    return { dateFrom: limaStr(d20), dateTo: today };
  }
  if (preset === "all") {
    return { dateFrom: null, dateTo: null };
  }
  return { dateFrom: null, dateTo: today };
}

export const RANGE_PRESETS = [
  { id: "week", label: "This Week" },
  { id: "lastweek", label: "Last Week" },
  { id: "month", label: "This Month" },
  { id: "5d", label: "5D" },
  { id: "10d", label: "10D" },
  { id: "20d", label: "20D" },
  { id: "all", label: "All Time" },
];

export { limaTodayParts };
