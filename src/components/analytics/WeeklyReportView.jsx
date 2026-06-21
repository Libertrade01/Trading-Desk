"use client";

import { useMemo } from "react";
import { calcStats, formatDailyDateLabel, formatPnl, pnlTone } from "../../lib/analytics-stats";
import {
  buildWeekPnlChartConfig,
  calcConsecutiveDrawdown,
  countDaySequences,
  dayDisciplineScore,
  fmtWeekLabel,
  formatReportPnl,
  gateTone,
  scoreTone,
} from "../../lib/analytics-reports";
import AnalyticsChart from "./AnalyticsChart";

function StatCard({ label, value, sub, tone = "neutral", accent }) {
  const toneClass = tone === "positive" ? "positive" : tone === "negative" ? "negative" : "neutral";
  return (
    <div className={`analytics-rpt-stat analytics-rpt-stat--${toneClass}`}>
      {accent ? <div className="analytics-rpt-stat__accent" style={{ background: accent }} /> : null}
      <div className="analytics-rpt-stat__label">{label}</div>
      <div className={`analytics-rpt-stat__value analytics-rpt-stat__value--${toneClass}`}>{value}</div>
      {sub ? <div className="analytics-rpt-stat__sub">{sub}</div> : null}
    </div>
  );
}

export default function WeeklyReportView({ start, end, days, trades, settings }) {
  const weekLabel = fmtWeekLabel(start, end);
  const stats = useMemo(() => calcStats(trades, settings), [trades, settings]);
  const { maxDD, maxDDTrades } = useMemo(() => calcConsecutiveDrawdown(trades), [trades]);
  const chartConfig = useMemo(
    () => (days.length ? buildWeekPnlChartConfig(days, trades) : null),
    [days, trades]
  );

  const winTrades = stats?.winners ?? 0;
  const lossTrades = stats?.losers ?? 0;
  const beCount = stats?.beCount ?? 0;

  const bigWinTrade = useMemo(() => {
    const wins = trades.filter((t) => (t.net_pnl || 0) > (stats?.beThreshold ?? 30));
    return wins.length ? wins.reduce((a, b) => ((b.net_pnl || 0) > (a.net_pnl || 0) ? b : a)) : null;
  }, [trades, stats]);

  const bigLossTrade = useMemo(() => {
    const losses = trades.filter((t) => (t.net_pnl || 0) < -(stats?.beThreshold ?? 30));
    return losses.length ? losses.reduce((a, b) => ((b.net_pnl || 0) < (a.net_pnl || 0) ? b : a)) : null;
  }, [trades, stats]);

  const fmtTradeDate = (trade) => {
    if (!trade) return "—";
    const key = (trade.date || trade.entry_time || "").substring(0, 10);
    return key ? formatDailyDateLabel(key) : "—";
  };

  if (!stats && !days.length) {
    return (
      <div className="analytics-rpt-empty">
        No trading data for {weekLabel}.
      </div>
    );
  }

  const totalPnl = stats?.totalPnl ?? 0;
  const pf = stats?.profitFactor ?? 0;

  return (
    <div className="analytics-rpt">
      <header className="analytics-rpt__header">
        <div>
          <h2 className="analytics-rpt__title">{weekLabel}</h2>
          <p className="analytics-rpt__meta">
            Weekly report · {days.length} trading day{days.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className={`analytics-rpt__headline analytics-rpt__headline--${pnlTone(totalPnl)}`}>
          {formatReportPnl(totalPnl)}
        </div>
      </header>

      <section className="analytics-rpt-section">
        <h3 className="analytics-rpt-section__title">Performance</h3>
        <div className="analytics-rpt-stat-grid analytics-rpt-stat-grid--5">
          <StatCard
            label="Net P&L"
            value={formatReportPnl(totalPnl)}
            sub="week total"
            tone={pnlTone(totalPnl)}
            accent={totalPnl > 0 ? "var(--green)" : totalPnl < 0 ? "var(--red)" : "var(--muted)"}
          />
          <StatCard
            label="Profit Factor"
            value={pf >= 999 ? "∞" : `${pf.toFixed(2)}×`}
            sub="gross W / gross L"
            tone={pf >= 1.5 ? "positive" : pf >= 1 ? "neutral" : "negative"}
            accent="var(--blue)"
          />
          <StatCard
            label="Biggest Win"
            value={formatPnl(stats?.biggestWin ?? 0, { signed: false, decimals: 0 })}
            sub={fmtTradeDate(bigWinTrade)}
            tone="positive"
            accent="var(--green)"
          />
          <StatCard
            label="Biggest Loss"
            value={formatPnl(Math.abs(stats?.biggestLoss ?? 0), { signed: false, decimals: 0 })}
            sub={fmtTradeDate(bigLossTrade)}
            tone="negative"
            accent="var(--red)"
          />
          <StatCard
            label="Max Consec. DD"
            value={maxDD < 0 ? formatPnl(Math.abs(maxDD), { signed: false, decimals: 0 }) : "—"}
            sub={
              maxDDTrades > 0
                ? `${maxDDTrades} consecutive loss${maxDDTrades === 1 ? "" : "es"}`
                : "no streak"
            }
            tone={maxDD < 0 ? "neutral" : "neutral"}
            accent="var(--amber)"
          />
        </div>

        <div className="analytics-rpt-breakdown">
          <div className="analytics-rpt-breakdown__total">
            <span className="analytics-rpt-breakdown__count">{stats?.total ?? 0}</span>
            <span className="analytics-rpt-breakdown__label">trades</span>
          </div>
          <div className="analytics-rpt-breakdown__bar-wrap">
            <div className="analytics-rpt-breakdown__bar">
              {winTrades ? (
                <div className="analytics-rpt-breakdown__seg analytics-rpt-breakdown__seg--win" style={{ flex: winTrades }} />
              ) : null}
              {lossTrades ? (
                <div className="analytics-rpt-breakdown__seg analytics-rpt-breakdown__seg--loss" style={{ flex: lossTrades }} />
              ) : null}
              {beCount ? (
                <div className="analytics-rpt-breakdown__seg analytics-rpt-breakdown__seg--be" style={{ flex: beCount }} />
              ) : null}
            </div>
            <div className="analytics-rpt-breakdown__legend">
              <span className="positive">{winTrades}W</span>
              <span className="negative">{lossTrades}L</span>
              <span className="muted">{beCount} BE</span>
            </div>
          </div>
          <div className="analytics-rpt-breakdown__metrics">
            <div>
              <div className="analytics-rpt-metric__label">Win %</div>
              <div className="analytics-rpt-metric__value">{Math.round(stats?.winRate ?? 0)}%</div>
            </div>
            <div>
              <div className="analytics-rpt-metric__label">Win % ex-BE</div>
              <div className={`analytics-rpt-metric__value ${(stats?.winRateNoBE ?? 0) >= 50 ? "positive" : "negative"}`}>
                {Math.round(stats?.winRateNoBE ?? 0)}%
              </div>
            </div>
            <div>
              <div className="analytics-rpt-metric__label">Avg Win</div>
              <div className="analytics-rpt-metric__value positive">
                {formatPnl(stats?.avgWin ?? 0, { signed: false, decimals: 0 })}
              </div>
            </div>
            <div>
              <div className="analytics-rpt-metric__label">Avg Loss</div>
              <div className="analytics-rpt-metric__value negative">
                {formatPnl(stats?.avgLoss ?? 0, { signed: false, decimals: 0 })}
              </div>
            </div>
            <div>
              <div className="analytics-rpt-metric__label">Expectancy</div>
              <div className={`analytics-rpt-metric__value ${pnlTone(stats?.expectancy ?? 0)}`}>
                {formatReportPnl(stats?.expectancy ?? 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="analytics-rpt-daily">
          <div className="analytics-rpt-daily__chart">
            {chartConfig ? <AnalyticsChart config={chartConfig} height={220} /> : <div className="analytics-empty">No chart data</div>}
          </div>
          <div className="analytics-rpt-daily__table-wrap">
            <table className="an-table analytics-rpt-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Gate</th>
                  <th>Trades</th>
                  <th>Seq</th>
                  <th>Discipline</th>
                  <th className="an-table__num">Net P&L</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => {
                  const dayTrades = trades.filter((t) => t.date === d.date);
                  const dayPnl = dayTrades.reduce((s, t) => s + (t.net_pnl || 0), 0);
                  const score = dayDisciplineScore(d);
                  return (
                    <tr key={d.date}>
                      <td>{formatDailyDateLabel(d.date)}</td>
                      <td className={`analytics-rpt-gate analytics-rpt-gate--${gateTone(d.gate)}`}>
                        {d.gate || "—"}
                      </td>
                      <td>{dayTrades.length || "—"}</td>
                      <td className="muted">{countDaySequences(dayTrades) || "—"}</td>
                      <td className={scoreTone(score)}>
                        {score != null ? `${score}%` : "—"}
                      </td>
                      <td className={`an-table__num ${pnlTone(dayPnl)}`}>{formatReportPnl(dayPnl)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
