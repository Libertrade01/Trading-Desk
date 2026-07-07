import { normalizeTraderSettings } from "./trader-settings";

const POINT_VALUES_R = { NQ: 20, MNQ: 2, ES: 50, MES: 5, GC: 10, MGC: 1 };

export function calcR(trade) {
  const sl = parseFloat(trade.stop_loss_points);
  const sym = ((trade.instrument || trade.symbol) || "").toUpperCase().replace(/[^A-Z]/g, "");
  const pv = POINT_VALUES_R[sym] || null;
  const qty = parseFloat(trade.quantity || trade.qty) || 1;
  if (!sl || !pv) return null;
  return (trade.net_pnl || 0) / (sl * pv * qty);
}

export function fmtR(r) {
  if (r === null || r === undefined || Number.isNaN(r)) return "—";
  return `${r >= 0 ? "+" : ""}${r.toFixed(2)}R`;
}

export function calcStats(trades, settings) {
  if (!trades?.length) return null;

  const pnls = trades.map((t) => t.net_pnl || 0);
  const beThreshold = normalizeTraderSettings(settings || {}).beThreshold;

  const bes = trades.filter((t) => Math.abs(t.net_pnl) <= beThreshold);
  const nonBe = trades.filter((t) => Math.abs(t.net_pnl) > beThreshold);
  const winners = nonBe.filter((t) => t.net_pnl > 0);
  const losers = nonBe.filter((t) => t.net_pnl < 0);

  const totalPnl = pnls.reduce((a, b) => a + b, 0);
  const grossW = winners.length ? winners.reduce((s, t) => s + t.net_pnl, 0) : 0;
  const grossL = losers.length ? Math.abs(losers.reduce((s, t) => s + t.net_pnl, 0)) : 0;

  let maxDD = 0;
  let curDD = 0;
  pnls.forEach((p) => {
    if (p < 0) {
      curDD += p;
      maxDD = Math.min(maxDD, curDD);
    } else {
      curDD = 0;
    }
  });

  let totalMins = 0;
  let holdCount = 0;
  trades.forEach((t) => {
    if (t.entry_time && t.exit_time) {
      const diff = (new Date(t.exit_time) - new Date(t.entry_time)) / 60000;
      if (diff > 0 && diff < 1440) {
        totalMins += diff;
        holdCount += 1;
      }
    }
  });

  const avgWin = winners.length ? grossW / winners.length : 0;
  const avgLoss = losers.length ? grossL / losers.length : 0;
  const winRateVal = trades.length ? winners.length / trades.length : 0;
  const expectancy = avgWin * winRateVal - avgLoss * (1 - winRateVal);

  const rValues = trades.map((t) => calcR(t)).filter((r) => r !== null);
  const rWinners = rValues.filter((r) => r > 0);
  const rLosers = rValues.filter((r) => r < 0);
  const avgR = rValues.length ? rValues.reduce((s, r) => s + r, 0) / rValues.length : null;
  const avgRWin = rWinners.length ? rWinners.reduce((s, r) => s + r, 0) / rWinners.length : null;
  const avgRLoss = rLosers.length ? rLosers.reduce((s, r) => s + r, 0) / rLosers.length : null;
  const expectancyR =
    avgRWin !== null && avgRLoss !== null
      ? avgRWin * winRateVal + avgRLoss * (1 - winRateVal)
      : null;

  return {
    total: trades.length,
    totalPnl,
    winRate: trades.length ? (winners.length / trades.length) * 100 : 0,
    winRateNoBE: nonBe.length ? (winners.length / nonBe.length) * 100 : 0,
    avgPnl: totalPnl / trades.length,
    profitFactor: grossL > 0 ? grossW / grossL : grossW > 0 ? 999 : 0,
    biggestWin: winners.length ? Math.max(...winners.map((t) => t.net_pnl)) : 0,
    biggestLoss: losers.length ? Math.min(...losers.map((t) => t.net_pnl)) : 0,
    maxDD,
    avgHold: holdCount ? totalMins / holdCount : 0,
    beCount: bes.length,
    avgWin,
    avgLoss,
    expectancy,
    avgR,
    avgRWin,
    avgRLoss,
    expectancyR,
    rCount: rValues.length,
    winners: winners.length,
    losers: losers.length,
    beThreshold,
  };
}

export function buildDailyPnlByDate(trades) {
  const byDate = {};
  trades.forEach((t) => {
    if (!byDate[t.date]) {
      byDate[t.date] = { pnl: 0, count: 0, seqIds: new Set(), soloCount: 0 };
    }
    byDate[t.date].pnl += t.net_pnl || 0;
    byDate[t.date].count += 1;
    if (t.sequence_id != null) byDate[t.date].seqIds.add(t.sequence_id);
    else byDate[t.date].soloCount += 1;
  });
  return byDate;
}

export function formatPnl(value, { signed = true, decimals = 2 } = {}) {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = signed ? (value >= 0 ? "+" : "-") : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(decimals)}`;
}

export function formatDailyDateLabel(dateKey) {
  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dateObj = new Date(`${dateKey}T12:00:00`);
  return `${dayNames[dateObj.getDay()]} ${dateObj.getDate()} ${monthNames[dateObj.getMonth()]}`;
}

export function pnlTone(value) {
  if (value == null || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}
