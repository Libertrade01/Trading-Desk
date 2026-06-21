"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAnalyticsTrades, filterTradesByAccounts } from "../../lib/analytics-data";
import { resolveDateRangePreset, getPlaybookTrackingStartDate, filterTradesForPlaybookAdherence, resetPlaybookTrackingStartDate } from "../../lib/analytics-date-range";
import { getChartConfigs } from "../../lib/analytics-charts";
import { calcStats } from "../../lib/analytics-stats";
import { summarizeSetupAdherence, summarizeSetupByTag, countUntaggedTrades } from "../../lib/setup-adherence";
import { getImportAccount, loadTraderSettings, saveTraderSettings } from "../../lib/trader-settings";
import AnalyticsCard from "./AnalyticsCard";
import AnalyticsChart from "./AnalyticsChart";
import AnalyticsSlidePanel from "./AnalyticsSlidePanel";
import AnalyticsToolbar from "./AnalyticsToolbar";
import AnalyticsTradeLogPanel from "./AnalyticsTradeLogPanel";
import AnalyticsUntaggedBanner from "./AnalyticsUntaggedBanner";
import AnalyticsWorkflowNotice from "./AnalyticsWorkflowNotice";
import DailyPnlTable from "./DailyPnlTable";
import PerformanceOverview from "./PerformanceOverview";
import PlaybookAdherencePanel from "./PlaybookAdherencePanel";
import RecentTradesTable from "./RecentTradesTable";
import SessionAnalyticsGrid from "./SessionAnalyticsGrid";
import TradeDetailPanel from "./TradeDetailPanel";

export default function AnalyticsDashboard() {
  const router = useRouter();
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
    setPlaybookTrackingStart(getPlaybookTrackingStartDate());
  }, []);

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

  const handleTrackingReset = () => {
    if (
      !window.confirm(
        "Reset playbook tracking to today? Trades before the new date will be excluded from playbook adherence."
      )
    ) {
      return;
    }
    setPlaybookTrackingStart(resetPlaybookTrackingStartDate());
  };

  const importAccount = getImportAccount(settings || {});
  const beThreshold = importAccount?.be_threshold ?? 30;
  const stats = useMemo(() => calcStats(trades, settings), [trades, settings]);
  const playbookTrades = useMemo(
    () => filterTradesForPlaybookAdherence(trades, playbookTrackingStart),
    [trades, playbookTrackingStart]
  );
  const playbook = useMemo(() => summarizeSetupAdherence(playbookTrades), [playbookTrades]);
  const setupBreakdown = useMemo(() => summarizeSetupByTag(playbookTrades), [playbookTrades]);
  const untaggedCount = useMemo(() => countUntaggedTrades(playbookTrades), [playbookTrades]);
  const charts = useMemo(() => getChartConfigs(trades), [trades]);
  const selectedTrade = useMemo(
    () => trades.find((t) => t.id === selectedTradeId) || null,
    [trades, selectedTradeId]
  );

  const handleTradeUpdated = useCallback((updated) => {
    setTrades((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }, []);

  const openUntaggedTrade = useCallback(() => {
    const untagged = playbookTrades.find((t) => !t.setup || !String(t.setup).trim());
    if (untagged) setSelectedTradeId(untagged.id);
  }, [playbookTrades]);

  if (loading && !trades.length) {
    return <div className="analytics-loading">Loading analytics…</div>;
  }

  if (error) {
    return (
      <div className="analytics-error">
        <p>{error}</p>
        <button type="button" className="desk-nav-link" onClick={() => load(dateFrom, dateTo, accountType)}>
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

        <AnalyticsCard title="Performance Overview">
          <PerformanceOverview stats={stats} trades={trades} beThreshold={beThreshold} />
        </AnalyticsCard>

        <div className="analytics-triple-grid">
          <AnalyticsCard title="Cumulative P&L" className="analytics-triple-grid__wide">
            {charts.pnl ? (
              <AnalyticsChart config={charts.pnl} height={200} />
            ) : (
              <div className="analytics-empty">No data</div>
            )}
          </AnalyticsCard>

          <AnalyticsCard
            title="Daily P&L"
            action={
              <button type="button" className="analytics-link-btn" onClick={() => setListPanel("daily-pnl")}>
                View All →
              </button>
            }
          >
            <DailyPnlTable
              trades={trades}
              onRowClick={(date) => router.push(`/history/${date}`)}
            />
          </AnalyticsCard>

          <AnalyticsCard
            title="Recent Trades"
            action={
              <button type="button" className="analytics-link-btn" onClick={() => setListPanel("recent-trades")}>
                View All →
              </button>
            }
          >
            <RecentTradesTable trades={trades} onTradeSelect={(t) => setSelectedTradeId(t.id)} />
          </AnalyticsCard>
        </div>

        <AnalyticsCard title="Playbook Adherence">
          <PlaybookAdherencePanel
            summary={playbook}
            trackingStart={playbookTrackingStart}
            setupBreakdown={setupBreakdown}
            onTrackingReset={handleTrackingReset}
          />
        </AnalyticsCard>

        <SessionAnalyticsGrid trades={trades} />
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
      />
    </div>
  );
}
