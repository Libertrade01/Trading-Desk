"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchAnalyticsTrades, filterTradesByAccounts } from "../../lib/analytics-data";
import { resolveDateRangePreset } from "../../lib/analytics-date-range";
import { getChartConfigs } from "../../lib/analytics-charts";
import { calcStats } from "../../lib/analytics-stats";
import { summarizeSetupAdherence } from "../../lib/setup-adherence";
import { getImportAccount, loadTraderSettings, saveTraderSettings } from "../../lib/trader-settings";
import AnalyticsCard from "./AnalyticsCard";
import AnalyticsChart from "./AnalyticsChart";
import AnalyticsToolbar from "./AnalyticsToolbar";
import AnalyticsWorkflowNotice from "./AnalyticsWorkflowNotice";
import DailyPnlTable from "./DailyPnlTable";
import PerformanceOverview from "./PerformanceOverview";
import PlaybookAdherencePanel from "./PlaybookAdherencePanel";
import RecentTradesTable from "./RecentTradesTable";
import SessionAnalyticsGrid from "./SessionAnalyticsGrid";

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trades, setTrades] = useState([]);
  const [settings, setSettings] = useState(null);
  const [activePreset, setActivePreset] = useState("10d");
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [accountType, setAccountType] = useState("all");

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
    load(dateFrom, dateTo, accountType);
  };

  const importAccount = getImportAccount(settings || {});
  const beThreshold = importAccount?.be_threshold ?? 30;
  const stats = useMemo(() => calcStats(trades, settings), [trades, settings]);
  const playbook = useMemo(() => summarizeSetupAdherence(trades), [trades]);
  const charts = useMemo(() => getChartConfigs(trades), [trades]);

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
      />

      <div className="analytics-dashboard__body">
        <AnalyticsWorkflowNotice />

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
              <Link href="/analytics.html?embed=1" className="analytics-link-btn">
                View All →
              </Link>
            }
          >
            <DailyPnlTable trades={trades} />
          </AnalyticsCard>

          <AnalyticsCard
            title="Recent Trades"
            action={
              <Link href="/analytics.html?embed=1" className="analytics-link-btn">
                View All →
              </Link>
            }
          >
            <RecentTradesTable trades={trades} />
          </AnalyticsCard>
        </div>

        <AnalyticsCard title="Playbook Adherence">
          <PlaybookAdherencePanel summary={playbook} />
        </AnalyticsCard>

        <SessionAnalyticsGrid trades={trades} />
      </div>
    </div>
  );
}
