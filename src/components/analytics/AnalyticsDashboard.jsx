"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAnalyticsTrades, filterTradesByAccounts } from "../../lib/analytics-data";
import { aggregateProcessMetrics, loadPostReviewsInRange } from "../../lib/analytics-process";
import { countPlaybookStreak, countProcessStreak, loadAllSessions } from "../../lib/history-data";
import {
  resolveDateRangePreset,
  loadPlaybookTrackingStartDate,
  filterTradesForPlaybookAdherence,
  resetPlaybookTrackingStartDate,
} from "../../lib/analytics-date-range";
import { getChartConfigs } from "../../lib/analytics-charts";
import { calcStats } from "../../lib/analytics-stats";
import {
  summarizeSetupAdherence,
  summarizeSetupByTag,
  countUntaggedTrades,
} from "../../lib/setup-adherence";
import { loadTraderSettings, saveTraderSettings } from "../../lib/trader-settings";
import AnalyticsCard from "./AnalyticsCard";
import AnalyticsChart from "./AnalyticsChart";
import AnalyticsSlidePanel from "./AnalyticsSlidePanel";
import AnalyticsToolbar from "./AnalyticsToolbar";
import AnalyticsTradeLogPanel from "./AnalyticsTradeLogPanel";
import AnalyticsUntaggedBanner from "./AnalyticsUntaggedBanner";
import AnalyticsWorkflowNotice from "./AnalyticsWorkflowNotice";
import DailyPnlTable from "./DailyPnlTable";
import MetricCards from "./MetricCards";
import OutcomesDonut from "./OutcomesDonut";
import PerformanceScoreCard from "./PerformanceScoreCard";
import PlaybookAdherencePanel from "./PlaybookAdherencePanel";
import ProcessOverviewPanel from "./ProcessOverviewPanel";
import ProcessStreaksPanel from "./ProcessStreaksPanel";
import RecentTradesTable from "./RecentTradesTable";
import SessionAnalyticsGrid from "./SessionAnalyticsGrid";
import TradeDetailPanel from "./TradeDetailPanel";

export default function AnalyticsDashboard() {
  const router = useRouter();
  const insightsRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trades, setTrades] = useState([]);
  const [settings, setSettings] = useState(null);
  const [activePreset, setActivePreset] = useState("10d");
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [accountType, setAccountType] = useState("all");
  const [playbookTrackingStart, setPlaybookTrackingStart] = useState(null);
  const [listPanel, setListPanel] = useState(null);
  const [selectedTradeId, setSelectedTradeId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [processMetrics, setProcessMetrics] = useState(null);

  const load = useCallback(async (from, to, type) => {
    setLoading(true);
    setError(null);
    try {
      const [traderSettings, rawTrades] = await Promise.all([
        loadTraderSettings(),
        fetchAnalyticsTrades({ dateFrom: from, dateTo: to, accountType: type }),
      ]);
      setSettings(traderSettings);
      setTrades(filterTradesByAccounts(rawTrades, traderSettings.accounts));
    } catch (e) {
      setError(e.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    loadAllSessions().then(setSessions).catch(() => setSessions([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const reviews = await loadPostReviewsInRange(dateFrom, dateTo);
        if (cancelled) return;
        setProcessMetrics(aggregateProcessMetrics(reviews));
      } catch {
        if (!cancelled) {
          setProcessMetrics(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo]);

  useEffect(() => {
    const { dateFrom: from, dateTo: to } = resolveDateRangePreset("10d");
    setDateFrom(from);
    setDateTo(to);
    load(from, to, "all");
  }, [load]);

  const applyPreset = (preset) => {
    setActivePreset(preset);
    const range = resolveDateRangePreset(preset);
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
    load(range.dateFrom, range.dateTo, accountType);
  };

  const applyCustomRange = (from, to) => {
    setActivePreset("");
    setDateFrom(from);
    setDateTo(to);
    load(from, to, accountType);
  };

  const toggleAccount = async (id) => {
    if (!settings) return;
    const accounts = settings.accounts.map((a) =>
      a.id === id ? { ...a, active: a.active === false } : a
    );
    await saveTraderSettings({ ...settings, accounts });
    setSettings({ ...settings, accounts });
    load(dateFrom, dateTo, accountType);
  };

  const handleTrackingReset = async () => {
    if (
      !window.confirm(
        "Reset playbook tracking to today? Trades before the new date will be excluded from playbook adherence."
      )
    ) {
      return;
    }
    const start = await resetPlaybookTrackingStartDate();
    setPlaybookTrackingStart(start);
  };

  const stats = useMemo(() => calcStats(trades, settings), [trades, settings]);
  const playbookTrades = useMemo(
    () => filterTradesForPlaybookAdherence(trades, playbookTrackingStart),
    [trades, playbookTrackingStart]
  );
  const playbook = useMemo(() => summarizeSetupAdherence(playbookTrades), [playbookTrades]);
  const setupBreakdown = useMemo(() => summarizeSetupByTag(playbookTrades), [playbookTrades]);
  const untaggedCount = useMemo(() => countUntaggedTrades(playbookTrades), [playbookTrades]);
  const riskStreak = useMemo(() => countProcessStreak(sessions), [sessions]);
  const playbookStreak = useMemo(() => countPlaybookStreak(sessions), [sessions]);
  const charts = useMemo(() => getChartConfigs(trades), [trades]);
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

  const scrollToInsights = useCallback(() => {
    insightsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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
          onClick={() => load(dateFrom, dateTo, accountType)}
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
        accountType={accountType}
        accounts={settings?.accounts || []}
        onPresetChange={applyPreset}
        onCustomRangeChange={applyCustomRange}
        onAccountTypeChange={(type) => {
          setAccountType(type);
          load(dateFrom, dateTo, type);
        }}
        onToggleAccount={toggleAccount}
        onOpenTradeLog={() => setListPanel("trade-log")}
      />

      <div className="analytics-dashboard__body">
        <AnalyticsWorkflowNotice />
        <AnalyticsUntaggedBanner untaggedCount={untaggedCount} onTagTrade={openUntaggedTrade} />

        <div className="an-layout">
          <aside className="an-left-col">
            <PerformanceScoreCard stats={stats} onViewInsights={scrollToInsights} />
            <OutcomesDonut
              winners={outcomes.winners}
              breakeven={outcomes.breakeven}
              losers={outcomes.losers}
            />
          </aside>

          <main className="an-main-col">
            <MetricCards stats={stats} />

            <section className="an-card an-equity-card">
              <div className="an-card-head">
                <div className="an-card-title">Equity Curve</div>
                <div className="an-mini-select">Cumulative P&amp;L</div>
              </div>
              <div className="an-chart-frame">
                {charts.pnl ? (
                  <AnalyticsChart config={charts.pnl} height={280} />
                ) : (
                  <div className="analytics-empty">No data</div>
                )}
              </div>
            </section>

            <div className="an-bottom-row">
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

              <section className="an-card an-trades-card">
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
                  limit={6}
                  compact
                  onTradeSelect={(t) => setSelectedTradeId(t.id)}
                />
              </section>
            </div>
          </main>
        </div>

        <div className="an-insights" id="analytics-insights" ref={insightsRef}>
          <div className="an-dual-grid">
            <AnalyticsCard title="Process Streaks">
              <ProcessStreaksPanel riskStreak={riskStreak} playbookStreak={playbookStreak} />
            </AnalyticsCard>

            <AnalyticsCard title="Playbook Adherence">
              <PlaybookAdherencePanel
                summary={playbook}
                trackingStart={playbookTrackingStart}
                setupBreakdown={setupBreakdown}
                onTrackingReset={handleTrackingReset}
              />
            </AnalyticsCard>
          </div>

          <AnalyticsCard title="Process Overview">
            <ProcessOverviewPanel metrics={processMetrics} />
          </AnalyticsCard>

          <SessionAnalyticsGrid trades={trades} variant="day-only" />
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
          onRowClick={(date) => {
            setListPanel(null);
            router.push(`/history/${date}`);
          }}
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
        onUpdated={handleTradeUpdated}
        onDeleted={handleTradeDeleted}
      />
    </div>
  );
}
