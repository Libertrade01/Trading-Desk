function numberOrNull(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function sessionNetPnl(summary) {
  const savedNet = numberOrNull(summary.netPnl);
  if (savedNet != null) return savedNet;
  const gross = numberOrNull(summary.grossPnl);
  const commissions = numberOrNull(summary.commissionsFees) || 0;
  return gross == null ? null : gross - commissions;
}

export function calcSessionSummaryStats(summaries) {
  const usable = (summaries || []).filter((summary) => {
    return numberOrNull(summary.trades) != null || sessionNetPnl(summary) != null;
  });
  if (!usable.length) return null;

  const totalTrades = usable.reduce((sum, summary) => sum + (numberOrNull(summary.trades) || 0), 0);
  const winners = usable.reduce((sum, summary) => sum + (numberOrNull(summary.wins) || 0), 0);
  const losers = usable.reduce((sum, summary) => sum + (numberOrNull(summary.losses) || 0), 0);
  const totalPnl = usable.reduce((sum, summary) => sum + (sessionNetPnl(summary) || 0), 0);
  const winnerValues = usable.map((summary) => numberOrNull(summary.bestWinner)).filter((value) => value != null);
  const lossValues = usable.map((summary) => numberOrNull(summary.worstLoss)).filter((value) => value != null);

  return {
    sessions: usable.length,
    totalTrades,
    winners,
    losers,
    totalPnl: Math.round(totalPnl * 100) / 100,
    winRate: totalTrades > 0 ? (winners / totalTrades) * 100 : 0,
    avgPnl: totalTrades > 0 ? totalPnl / totalTrades : 0,
    largestWinner: winnerValues.length ? Math.max(...winnerValues) : null,
    largestLoss: lossValues.length ? Math.min(...lossValues) : null,
  };
}
