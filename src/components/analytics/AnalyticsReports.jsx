"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAnalyticsTrades, fetchTradingDays } from "../../lib/analytics-data";
import {
  aggregatePnlByDate,
  fmtWeekLabel,
  formatWeekPnlShort,
  getRecentWeeks,
  weekPnlForRange,
} from "../../lib/analytics-reports";
import { loadTraderSettings } from "../../lib/trader-settings";
import WeeklyReportView from "./WeeklyReportView";

export default function AnalyticsReports() {
  const weeks = useMemo(() => getRecentWeeks(8), []);
  const [selected, setSelected] = useState(() => weeks[0]);
  const [settings, setSettings] = useState(null);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [weekLoading, setWeekLoading] = useState(true);
  const [weekPnlMap, setWeekPnlMap] = useState({});
  const [tradingDayDates, setTradingDayDates] = useState(new Set());
  const [days, setDays] = useState([]);
  const [trades, setTrades] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSidebarLoading(true);
      try {
        const earliest = weeks[weeks.length - 1].start;
        const [traderSettings, allTrades, allDays] = await Promise.all([
          loadTraderSettings(),
          fetchAnalyticsTrades({ dateFrom: earliest }),
          fetchTradingDays({ dateFrom: earliest }),
        ]);
        if (cancelled) return;
        setSettings(traderSettings);
        const pnlByDate = aggregatePnlByDate(allTrades);
        const map = {};
        weeks.forEach((w) => {
          map[`${w.start}:${w.end}`] = weekPnlForRange(pnlByDate, w.start, w.end);
        });
        setWeekPnlMap(map);
        setTradingDayDates(new Set((allDays || []).map((d) => d.date)));
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load reports");
      } finally {
        if (!cancelled) setSidebarLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [weeks]);

  const loadWeek = useCallback(async (week) => {
    setWeekLoading(true);
    setError(null);
    try {
      const [weekDays, weekTrades] = await Promise.all([
        fetchTradingDays({ dateFrom: week.start, dateTo: week.end }),
        fetchAnalyticsTrades({ dateFrom: week.start, dateTo: week.end }),
      ]);
      setDays((weekDays || []).sort((a, b) => a.date.localeCompare(b.date)));
      setTrades(weekTrades || []);
    } catch (e) {
      setError(e.message || "Failed to load week report");
      setDays([]);
      setTrades([]);
    } finally {
      setWeekLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeek(selected);
  }, [selected, loadWeek]);

  const selectWeek = (week) => setSelected(week);

  return (
    <div className="analytics-reports">
      <aside className="analytics-reports__sidebar">
        <div className="analytics-reports__sidebar-head">Recent Weeks</div>
        {sidebarLoading ? (
          <div className="analytics-reports__sidebar-loading">Loading…</div>
        ) : (
          <ul className="analytics-reports__week-list">
            {weeks.map((w) => {
              const key = `${w.start}:${w.end}`;
              const pnl = weekPnlMap[key] ?? 0;
              const hasData =
                pnl !== 0 ||
                [...tradingDayDates].some((d) => d >= w.start && d <= w.end);
              const active = selected.start === w.start && selected.end === w.end;
              const pnlClass = pnl > 0 ? "positive" : pnl < 0 ? "negative" : "neutral";
              return (
                <li key={key}>
                  <button
                    type="button"
                    className={`analytics-reports__week${active ? " active" : ""}`}
                    onClick={() => selectWeek(w)}
                  >
                    <span className="analytics-reports__week-label">{fmtWeekLabel(w.start, w.end)}</span>
                    <span className={`analytics-reports__week-pnl ${pnlClass}`}>
                      {hasData ? formatWeekPnlShort(pnl) : "—"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <main className="analytics-reports__main">
        {error ? (
          <div className="analytics-error">
            <p>{error}</p>
            <button type="button" className="desk-nav-link" onClick={() => loadWeek(selected)}>
              Retry
            </button>
          </div>
        ) : weekLoading ? (
          <div className="analytics-loading">Loading report…</div>
        ) : (
          <WeeklyReportView
            start={selected.start}
            end={selected.end}
            days={days}
            trades={trades}
            settings={settings}
          />
        )}
      </main>
    </div>
  );
}
