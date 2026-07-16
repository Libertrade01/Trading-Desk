import { formatPnl } from "../../lib/analytics-stats";

export default function SessionSummaryPanel({ stats }) {
  if (!stats) return null;
  const cards = [
    { label: "Net P&L", value: formatPnl(stats.totalPnl), tone: stats.totalPnl > 0 ? "pos" : stats.totalPnl < 0 ? "neg" : "" },
    { label: "Trades", value: stats.totalTrades, sub: `${stats.sessions} summary-only session${stats.sessions === 1 ? "" : "s"}` },
    { label: "Win rate", value: `${stats.winRate.toFixed(1)}%`, sub: `${stats.winners}W · ${stats.losers}L` },
    { label: "Avg P&L", value: formatPnl(stats.avgPnl), tone: stats.avgPnl > 0 ? "pos" : stats.avgPnl < 0 ? "neg" : "" },
    { label: "Largest winner", value: stats.largestWinner == null ? "—" : formatPnl(stats.largestWinner), tone: "pos" },
    { label: "Largest loss", value: stats.largestLoss == null ? "—" : formatPnl(stats.largestLoss), tone: "neg" },
  ];

  return (
    <section className="an-card an-summary-only-card">
      <div className="an-summary-only-head">
        <div>
          <span className="hybrid-label-sm">Session summaries</span>
          <h2>Performance recorded without trade detail</h2>
        </div>
        <span className="an-summary-only-badge">Limited analytics</span>
      </div>
      <p className="an-summary-only-copy">
        These totals come from completed LOOP summaries. Import a CSV or enter individual trades to unlock time, setup, holding-period and recent-trade analytics.
      </p>
      <div className="an-summary-only-grid">
        {cards.map((card) => (
          <div key={card.label}>
            <span>{card.label}</span>
            <strong className={card.tone || ""}>{card.value}</strong>
            {card.sub && <small>{card.sub}</small>}
          </div>
        ))}
      </div>
    </section>
  );
}
