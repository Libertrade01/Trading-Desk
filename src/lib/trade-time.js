function getNYOffsetHours(date) {
  try {
    const d = date || new Date();
    const nyStr = new Date(d.getTime()).toLocaleString("en-US", {
      timeZone: "America/New_York",
      hour12: false,
      hour: "2-digit",
    });
    let nyHour = parseInt(nyStr, 10);
    if (nyHour === 24) nyHour = 0;
    const utcHour = d.getUTCHours();
    let actualNYOffset = nyHour - utcHour;
    if (actualNYOffset > 12) actualNYOffset -= 24;
    if (actualNYOffset < -12) actualNYOffset += 24;
    return actualNYOffset - -5;
  } catch {
    const m = (date || new Date()).getUTCMonth() + 1;
    return m >= 3 && m <= 11 ? 1 : 0;
  }
}

export function toNYTimeStr(utcStr) {
  if (!utcStr) return "—";
  const d = new Date(utcStr.replace ? utcStr.replace(" ", "T") : utcStr);
  const off = getNYOffsetHours(d);
  const ny = new Date(d.getTime() + off * 3600000);
  return ny.toISOString().replace("T", " ").substring(0, 16);
}

/** MM-DD HH:MM in NY Eastern (matches analytics import preview) */
export function formatLimaTime(utcStr) {
  return toNYTimeStr(utcStr).substring(5, 16);
}
