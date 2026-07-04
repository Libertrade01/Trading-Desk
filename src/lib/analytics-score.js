/** Derive a 0–100 performance score and status from range stats. */

export function calcPerformanceScore(stats) {
  if (!stats || !stats.total) return null;

  const wrScore = Math.min(35, (stats.winRate / 55) * 35);
  const pf = Math.min(stats.profitFactor >= 999 ? 3 : stats.profitFactor, 3);
  const pfScore = (pf / 3) * 35;

  let expScore = 0;
  if (stats.expectancy > 0) {
    const scale = Math.max(stats.avgWin || 1, 1);
    expScore = Math.min(20, (stats.expectancy / scale) * 20 + 8);
  } else if (stats.expectancy < 0) {
    const scale = Math.max(stats.avgLoss || 1, 1);
    expScore = Math.max(0, 8 + (stats.expectancy / scale) * 8);
  } else {
    expScore = 8;
  }

  const pnlScore = stats.totalPnl > 0 ? 10 : stats.totalPnl === 0 ? 5 : 0;

  return Math.round(Math.min(100, Math.max(0, wrScore + pfScore + expScore + pnlScore)));
}

export function performanceScoreMeta(score) {
  if (score == null) {
    return {
      label: "No Data",
      tone: "muted",
      desc: "Import trades or widen the date range to score performance.",
    };
  }
  if (score >= 75) {
    return {
      label: "Strong",
      tone: "pos",
      desc: "Edge is showing — protect it with consistent risk and selection.",
    };
  }
  if (score >= 55) {
    return {
      label: "On Track",
      tone: "pos",
      desc: "Solid baseline. Tighten execution and cut low-quality setups.",
    };
  }
  if (score >= 40) {
    return {
      label: "Needs Work",
      tone: "amber",
      desc: "Focus on consistency, risk management and trade selection.",
    };
  }
  return {
    label: "Off Track",
    tone: "neg",
    desc: "Review process, size, and setups before adding risk.",
  };
}
