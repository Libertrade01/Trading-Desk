"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchAnalyticsTrades,
  fetchCloseLoopSummaries,
  fetchReadinessScores,
  filterTradesByAccounts,
} from "../../lib/analytics-data";
import {
  resolveDateRangePreset,
  loadPlaybookTrackingStartDate,
  filterTradesForPlaybookAdherence,
} from "../../lib/analytics-date-range";
import { getChartConfigs } from "../../lib/analytics-charts";
import { calcStats } from "../../lib/analytics-stats";
import { calcSessionSummaryStats } from "../../lib/session-summary-stats";
import { countUntaggedTrades } from "../../lib/setup-adherence";
import { loadTraderSettings, saveTraderSettings } from "../../lib/trader-settings";
import AnalyticsChart from "./AnalyticsChart";
import AnalyticsCsvImporter from "./AnalyticsCsvImporter";
import AnalyticsSlidePanel from "./AnalyticsSlidePanel";
import AnalyticsToolbar from "./AnalyticsToolbar";
import AnalyticsTradeLogPanel from "./AnalyticsTradeLogPanel";
import AnalyticsUntaggedBanner from "./AnalyticsUntaggedBanner";
import AnalyticsWorkflowNotice from "./AnalyticsWorkflowNotice";
import DailyPnlTable from "./DailyPnlTable";
import MetricCards from "./MetricCards";
import OutcomesDonut from "./OutcomesDonut";
import PerformanceScoreCard from "./PerformanceScoreCard";
import RecentTradesTable from "./RecentTradesTable";
import SessionAnalyticsGrid from "./SessionAnalyticsGrid";
import SessionSummaryPanel from "./SessionSummaryPanel";
import TradeDetailPanel from "./TradeDetailPanel";

export default function AnalyticsDashboard({
  demoMode = false,
  demoBundle = null,
}) {
  const router = useRouter();
  const isDemo = demoMode && !!demoBundle;
  const [loading, setLoading] = useState(!isDemo);
  const [error, setError] = useState(null);
  const [trades, setTrades] = useState(isDemo ? demoBundle.trades : []);
  const [readinessScores, setReadinessScores] = useState(isDemo ? demoBundle.readinessScores : []);
  const [sessionSummaries, setSessionSummaries] = useState([]);
  const [settings, setSettings] = useState(isDemo ? demoBundle.settings : null);
  const [activePreset, setActivePreset] = useState(isDemo ? "all" : "10d");
  const [dateFrom, setDateFrom] = useState(isDemo ? demoBundle.startDate : null);
  const [dateTo, setDateTo] = useState(isDemo ? demoBundle.endDate : null);
  const [playbookTrackingStart, setPlaybookTrackingStart] = useState(
    isDemo ? demoBundle.playbookTrackingStart : null
  );
  const [listPanel, setListPanel] = useState(null);
  const [selectedTradeId, setSelectedTradeId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const applyDemoRange = useCallback((from, to) => {
    if (!demoBundle) return;
    const nextTrades = demoBundle.trades.filter((t) => {
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      return true;
    });
    const nextReadiness = demoBundle.readinessScores.filter((row) => {
      if (from && row.date < from) return false;
      if (to && row.date > to) return false;
      return true;
    });
    setTrades(nextTrades);
    setReadinessScores(nextReadiness);
    setLoading(false);
  }, [demoBundle]);

  const load = useCallback(async (from, to) => {
    if (isDemo) {
      applyDemoRange(from, to);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [traderSettings, rawTrades, rawSummaries, rawReadinessScores] = await Promise.all([
        loadTraderSettings(),
        fetchAnalyticsTrades({ dateFrom: from, dateTo: to }),
        fetchCloseLoopSummaries({ dateFrom: from, dateTo: to }),
        fetchReadinessScores({ dateFrom: from, dateTo: to }),
      ]);
      setSettings(traderSettings);
      const filteredTrades = filterTradesByAccounts(rawTrades, traderSettings.accounts);
      setTrades(filteredTrades);
      setReadinessScores(rawReadinessScores);
      const detailedDates = new Set(filteredTrades.map((trade) => String(trade.date).slice(0, 10)));
      setSessionSummaries(rawSummaries.filter((summary) => !detailedDates.has(summary.date)));
    } catch (e) {
      setError(e.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [isDemo, applyDemoRange]);

  useEffect(() => {
    if (isDemo) return;
    let cancelled = false;
    loadPlaybookTrackingStartDate()
      .then((start) => {
        if (!cancelled) setPlaybookTrackingStart(start);
      })
      .catch(() => {
        if (!cancelled) setPlaybookTrackingStart(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isDemo]);

  useEffect(() => {
    if (isDemo) {
      applyDemoRange(demoBundle.startDate, demoBundle.endDate);
      return;
    }
    const { dateFrom: from, dateTo: to } = resolveDateRangePreset("10d");
    setDateFrom(from);
    setDateTo(to);
    load(from, to);
  }, [load, isDemo, demoBundle, applyDemoRange]);

  const applyPreset = (preset) => {
    setActivePreset(preset);
    if (isDemo && preset === "all") {
      setDateFrom(demoBundle.startDate);
      setDateTo(demoBundle.endDate);
      load(demoBundle.startDate, demoBundle.endDate);
      return;
    }
    const range = resolveDateRangePreset(preset);
    const from = range.dateFrom || (isDemo ? demoBundle.startDate : null);
    const to = range.dateTo || (isDemo ? demoBundle.endDate : null);
    setDateFrom(from);
    setDateTo(to);
    load(from, to);
  };

  const applyCustomRange = (from, to) => {
    setActivePreset("");
    setDateFrom(from);
    setDateTo(to);
    load(from, to);
  };

  const toggleAccount = async (id) => {
    if (isDemo || !settings) return;
    const accounts = settings.accounts.map((a) =>
      a.id === id ? { ...a, active: a.active === false } : a
    );
    await saveTraderSettings({ ...settings, accounts });
    setSettings({ ...settings, accounts });
    load(dateFrom, dateTo);
  };

  const stats = useMemo(() => calcStats(trades, settings), [trades, settings]);
  const summaryStats = useMemo(() => calcSessionSummaryStats(sessionSummaries), [sessionSummaries]);
  const playbookTrades = useMemo(
    () => filterTradesForPlaybookAdherence(trades, playbookTrackingStart),
    [trades, playbookTrackingStart]
  );
  const untaggedCount = useMemo(() => countUntaggedTrades(playbookTrades), [playbookTrades]);
  const charts = useMemo(() => getChartConfigs(trades, readinessScores), [trades, readinessScores]);
  const selectedTrade = useMemo(
    () => trades.find((t) => t.id === selectedTradeId) || null,
    [trades, selectedTradeId]
  );

  const outcomes = useMemo(() => {
    if (!stats) return { winners: 0, breakeven: 0, losers: 0 };
    return {
      winners: stats.winners,
      breakeven: stats.beCount,
      losers: stats.losers,
    };
  }, [stats]);

  const handleTradeUpdated = useCallback((updated) => {
    setTrades((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }, []);

  const handleTradeDeleted = useCallback((tradeId) => {
    setTrades((prev) => prev.filter((t) => t.id !== tradeId));
    setSelectedTradeId(null);
  }, []);

  const openUntaggedTrade = useCallback(() => {
    const untagged = playbookTrades.find((t) => !t.setup || !String(t.setup).trim());
    if (untagged) setSelectedTradeId(untagged.id);
  }, [playbookTrades]);

  const handleTradesImported = useCallback(async (importedTrades) => {
    const dates = importedTrades.map((trade) => trade.date).filter(Boolean).sort();
    if (!dates.length) {
      await load(dateFrom, dateTo);
      return;
    }
    const from = dates[0];
    const to = dates[dates.length - 1];
    setActivePreset("");
    setDateFrom(from);
    setDateTo(to);
    await load(from, to);
  }, [dateFrom, dateTo, load]);

  if (loading && !trades.length) {
    return <div className="analytics-loading">Loading analytics…</div>;
  }

  if (error) {
    return (
      <div className="analytics-error">
        <p>{error}</p>
        <button
          type="button"
          className="an-btn-outline"
          onClick={() => load(dateFrom, dateTo)}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <AnalyticsToolbar
        activePreset={activePreset}
        dateFrom={dateFrom}
        dateTo={dateTo}
        accounts={settings?.accounts || []}
        onPresetChange={applyPreset}
        onCustomRangeChange={applyCustomRange}
        onToggleAccount={toggleAccount}
        onOpenTradeLog={() => setListPanel("trade-log")}
        onImport={isDemo ? null : () => setImportOpen(true)}
        readOnly={isDemo}
      />

      <div className="analytics-dashboard__body">
        {!isDemo && <AnalyticsWorkflowNotice />}
        <SessionSummaryPanel stats={summaryStats} />
        {!isDemo && (
          <AnalyticsUntaggedBanner untaggedCount={untaggedCount} onTagTrade={openUntaggedTrade} />
        )}

        <div className="an-layout">
          <MetricCards
            stats={stats}
            trailing={
              <OutcomesDonut
                compact
                winners={outcomes.winners}
                breakeven={outcomes.breakeven}
                losers={outcomes.losers}
              />
            }
          />

          <div className="an-hero-row">
            <PerformanceScoreCard stats={stats} />
            <section className="an-card an-equity-card an-hero-equity">
              <div className="an-card-head">
                <div className="an-card-title">Equity Curve</div>
                <div className="an-mini-select">Cumulative P&amp;L</div>
              </div>
              <div className="an-chart-frame an-chart-frame--hero">
                {charts.pnl ? (
                  <AnalyticsChart config={charts.pnl} height={240} />
                ) : (
                  <div className="analytics-empty">No data</div>
                )}
              </div>
            </section>
          </div>

          <div className="an-charts-row">
            <section className="an-card an-daily-card">
              <div className="an-card-head">
                <div className="an-card-title">Daily P&amp;L</div>
                <button
                  type="button"
                  className="an-link-all"
                  onClick={() => setListPanel("daily-pnl")}
                >
                  View All
                </button>
              </div>
              <div className="an-bar-chart">
                {charts.daily ? (
                  <AnalyticsChart config={charts.daily} height={200} />
                ) : (
                  <div className="analytics-empty">No data</div>
                )}
              </div>
            </section>

            <SessionAnalyticsGrid trades={trades} variant="time-only" />
          </div>

          <div className="an-bottom-insight-row">
            <section className="an-card an-trades-card an-trades-card--wide">
              <div className="an-card-head">
                <div className="an-card-title">Recent Trades</div>
                <button
                  type="button"
                  className="an-link-all"
                  onClick={() => setListPanel("recent-trades")}
                >
                  View All
                </button>
              </div>
              <RecentTradesTable
                trades={trades}
                limit={8}
                compact
                onTradeSelect={(t) => setSelectedTradeId(t.id)}
              />
            </section>

            <section className="an-card an-readiness-pnl-card">
              <div className="an-card-head">
                <div>
                  <div className="an-card-title">Readiness vs P&amp;L</div>
                  <p className="an-card-subtitle">One dot per session day</p>
                </div>
                <div className="an-readiness-legend">
                  <span><i className="pos" /> Profit</span>
                  <span><i className="neg" /> Loss</span>
                </div>
              </div>
              <div className="an-readiness-pnl-chart">
                {charts.readinessPnl ? (
                  <AnalyticsChart config={charts.readinessPnl} height="100%" />
                ) : (
                  <div className="analytics-empty">No readiness + P&amp;L overlap yet</div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <AnalyticsSlidePanel
        open={listPanel === "daily-pnl"}
        title="Daily P&L"
        onClose={() => setListPanel(null)}
      >
        <DailyPnlTable
          trades={trades}
          limit={null}
          onRowClick={
            isDemo
              ? null
              : (date) => {
                  setListPanel(null);
                  router.push(`/history/${date}`);
                }
          }
        />
      </AnalyticsSlidePanel>

      <AnalyticsSlidePanel
        open={listPanel === "recent-trades"}
        title="Recent Trades"
        onClose={() => setListPanel(null)}
      >
        <RecentTradesTable
          trades={trades}
          limit={null}
          onTradeSelect={(t) => {
            setListPanel(null);
            setSelectedTradeId(t.id);
          }}
        />
      </AnalyticsSlidePanel>

      <AnalyticsSlidePanel
        open={listPanel === "trade-log"}
        title="Trade Log"
        onClose={() => setListPanel(null)}
        width="min(720px, 94vw)"
      >
        <AnalyticsTradeLogPanel
          trades={trades}
          onTradeSelect={(t) => {
            setListPanel(null);
            setSelectedTradeId(t.id);
          }}
        />
      </AnalyticsSlidePanel>

      <TradeDetailPanel
        trade={selectedTrade}
        onClose={() => setSelectedTradeId(null)}
        onUpdated={isDemo ? undefined : handleTradeUpdated}
        onDeleted={isDemo ? undefined : handleTradeDeleted}
        readOnly={isDemo}
      />
      {!isDemo && (
        <AnalyticsCsvImporter
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImported={handleTradesImported}
        />
      )}
    </div>
  );
}
