"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  countBehavioralFlags,
  DEFAULT_POSTMARKET,
  normalizePostmarketFlags,
  formatJournalReviewPendingSummary,
} from "../lib/postmarket-defaults";
import {
  loadTraderProfile,
  PROFILE_UPDATED_EVENT,
  getVisibleBehavioralFlagCategories,
  getPlaybookSetupNames,
  getVisibleCloseoutHabits,
  countVisibleBehavioralFlags,
  createCustomerDefaultProfile,
} from "../lib/trader-profile";
import { notifySessionSaved, TRADES_CHANGED_EVENT } from "../lib/session-events";
import {
  tradesForDate,
  computePerformanceFromTrades,
  fetchTradesForDate,
  importTradesToSupabase,
  getMissingCommissionSymbols,
  loadImportAccount,
  performanceFromDbOrImport,
} from "../lib/rtrader-import";
import { processBrokerCSV } from "../lib/broker-csv-import";
import {
  summarizeSetupAdherence,
  validateImportSetupTags,
  formatPlaybookBreakdown,
  playbookAdherenceLabel,
} from "../lib/setup-adherence";
import RTraderImportPreview from "./RTraderImportPreview";
import PostMarketStepper, { CLOSEOUT_STEPS } from "./PostMarketStepper";
import WorkflowPageLayout from "./WorkflowPageLayout";
import SliderField from "./SliderField";
import HabitTileField from "./HabitTileField";
import {
  evaluateDay,
  loadRecoveryState,
  getRecoveryStatus,
  formatRecoveryProgress,
  formatRecoveryUsd,
} from "../lib/dll-recovery";
import { loadDllSettings } from "../lib/dll-recovery-settings";
import { loadTraderSettings } from "../lib/trader-settings";
import { todayKey } from "../lib/today-key";
import { storage } from "../lib/supabase";
import ManualTradeEntry from "./ManualTradeEntry";

function headerDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function CloseoutMetrics({ form, netPnl, winRate, setupAdherence, adherenceLabel, profile }) {
  const flagCategories = getVisibleBehavioralFlagCategories(profile);
  const flagTotal = flagCategories.flatMap((c) => c.flags).length;
  const flagsRaised = countVisibleBehavioralFlags(form, profile);
  const pnlTone = netPnl > 0 ? "var(--green)" : netPnl < 0 ? "var(--red)" : "var(--text)";
  const adherenceTone =
    adherenceLabel?.tone === "green"
      ? "var(--green)"
      : adherenceLabel?.tone === "amber"
        ? "var(--amber)"
        : adherenceLabel?.tone === "red"
          ? "var(--red)"
          : "var(--muted)";

  return (
    <aside className="pm-closeout-metrics" aria-label="Session summary">
      <div className="pm-closeout-metrics-pnl">
        <span className="pm-closeout-metrics-label hybrid-label-sm">Net P&amp;L</span>
        <span className="pm-closeout-metrics-pnl-value" style={{ color: pnlTone }}>
          {netPnl !== "" && netPnl != null ? formatUsd(netPnl) : "—"}
        </span>
      </div>
      <div className="pm-closeout-metrics-row">
        <div>
          <span className="pm-closeout-metrics-label hybrid-label-sm">Win rate</span>
          <span className="pm-closeout-metrics-value">{winRate}</span>
        </div>
        <div>
          <span className="pm-closeout-metrics-label hybrid-label-sm">Flags</span>
          <span className="pm-closeout-metrics-value">
            <span style={{ color: flagsRaised ? "var(--amber)" : "var(--green)" }}>{flagsRaised}</span>
            <span className="pm-closeout-metrics-muted"> / {flagTotal || "—"}</span>
          </span>
        </div>
      </div>
      {setupAdherence?.total > 0 && adherenceLabel && (
        <div className="pm-closeout-metrics-playbook">
          <span className="pm-closeout-metrics-label hybrid-label-sm">Playbook</span>
          <span className="pm-closeout-metrics-value" style={{ color: adherenceTone }}>
            {adherenceLabel.text}
          </span>
        </div>
      )}
    </aside>
  );
}

export default function PostMarketReview({
  onBack,
  demoMode = false,
  initialForm = null,
  initialTrades = null,
  morningThesis: demoMorningThesis = "",
  demoProfile = null,
  demoSettings = null,
}) {
  const [form, setForm] = useState(() =>
    demoMode && initialForm
      ? { ...DEFAULT_POSTMARKET, ...initialForm }
      : DEFAULT_POSTMARKET
  );
  const [profile, setProfile] = useState(demoMode ? demoProfile : null);
  const [loading, setLoading] = useState(!demoMode);
  const [saved, setSaved] = useState(!!demoMode);
  const [showHelp, setShowHelp] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importMsg, setImportMsg] = useState(demoMode ? "Demo sample session" : "");
  const [dayTrades, setDayTrades] = useState(() =>
    demoMode && Array.isArray(initialTrades) ? initialTrades : []
  );
  const [traderSettings, setTraderSettings] = useState(demoMode ? demoSettings : null);
  const [performanceMode, setPerformanceMode] = useState("csv");
  const [csvBroker, setCsvBroker] = useState("rtrader");
  const [recoveryStatus, setRecoveryStatus] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [importDropExpanded, setImportDropExpanded] = useState(false);
  const [morningThesis, setMorningThesis] = useState(demoMode ? demoMorningThesis || "" : "");
  const [showThesis, setShowThesis] = useState(false);
  const fileRef = useRef(null);
  const dragCounter = useRef(0);

  const set = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }, []);

  const closeoutHabits = useMemo(
    () => getVisibleCloseoutHabits(profile ?? createCustomerDefaultProfile()),
    [profile],
  );

  const journalPendingSummary = useMemo(
    () => formatJournalReviewPendingSummary(form, { checklist: closeoutHabits }),
    [form, closeoutHabits],
  );

  const netPnl = useMemo(() => {
    const gross = parseFloat(form.grossPnl);
    const comm = parseFloat(form.commissionsFees);
    if (Number.isNaN(gross)) return "";
    if (Number.isNaN(comm)) return round2(gross);
    return round2(gross - comm);
  }, [form.grossPnl, form.commissionsFees]);

  const winRate = useMemo(() => {
    const t = parseInt(form.trades, 10);
    const w = parseInt(form.wins, 10);
    if (!t || Number.isNaN(t)) return "—";
    if (Number.isNaN(w)) return "—";
    return `${Math.round((w / t) * 100)}%`;
  }, [form.trades, form.wins]);

  const setupAdherence = useMemo(() => summarizeSetupAdherence(dayTrades), [dayTrades]);
  const adherenceLabel = useMemo(() => playbookAdherenceLabel(setupAdherence), [setupAdherence]);

  const hasImportedSession =
    demoMode ||
    dayTrades.some((trade) => trade.platform !== "manual") ||
    !!form.lastImportAt ||
    !!String(form.lastImportFile || "").trim();
  const importError = importMsg.startsWith("Error");
  const showImportDrop = !demoMode && (!hasImportedSession || importDropExpanded || importError);

  const step = CLOSEOUT_STEPS[activeStep];
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === CLOSEOUT_STEPS.length - 1;

  const reloadDayTrades = useCallback(async (dateKey = todayKey()) => {
    if (demoMode) {
      const trades = Array.isArray(initialTrades) ? initialTrades : [];
      setDayTrades(trades);
      setForm((f) => {
        const perf = performanceFromDbOrImport(f, trades);
        return perf ? { ...f, ...perf } : f;
      });
      return trades;
    }
    const trades = await fetchTradesForDate(dateKey);
    setDayTrades(trades);
    setForm((f) => {
      const perf = performanceFromDbOrImport(f, trades);
      return perf ? { ...f, ...perf } : f;
    });
    return trades;
  }, [demoMode, initialTrades]);

  const hydrateDay = useCallback(async () => {
    if (demoMode) {
      const trades = Array.isArray(initialTrades) ? initialTrades : [];
      const savedReview = initialForm || {};
      setProfile(demoProfile ?? createCustomerDefaultProfile());
      setTraderSettings(demoSettings);
      setDayTrades(trades);
      let next = { ...DEFAULT_POSTMARKET, ...normalizePostmarketFlags(savedReview) };
      if (next.riskPlanFollowed == null && next.planProcessFollowed != null) {
        next.riskPlanFollowed = next.planProcessFollowed;
      }
      const perf = performanceFromDbOrImport(savedReview ?? next, trades);
      if (perf) next = { ...next, ...perf };
      next.performanceEntryMode = "csv";
      setPerformanceMode("csv");
      setForm(next);
      setMorningThesis(String(demoMorningThesis || savedReview.whyBias || "").trim());
      setLoading(false);
      return;
    }
    try {
      const dateKey = todayKey();
      const [reviewRes, dbTrades, traderProfile, loadedSettings] = await Promise.all([
        fetch(`/api/sessions/${dateKey}/post`).then((r) =>
          r.ok ? r.json() : { review: null }
        ),
        fetchTradesForDate(dateKey).catch(() => []),
        loadTraderProfile(),
        loadTraderSettings(),
      ]);
      setProfile(traderProfile ?? createCustomerDefaultProfile());
      setTraderSettings(loadedSettings);
      const savedReview = reviewRes?.review ?? null;

      setDayTrades(dbTrades);

      let next = { ...DEFAULT_POSTMARKET, ...normalizePostmarketFlags(savedReview || {}) };
      if (next.riskPlanFollowed == null && next.planProcessFollowed != null) {
        next.riskPlanFollowed = next.planProcessFollowed;
      }

      const perf = performanceFromDbOrImport(savedReview ?? next, dbTrades);
      if (perf) {
        next = { ...next, ...perf };
      }

      const inferredMode = dbTrades.some((trade) => trade.platform === "manual")
        ? "manual"
        : dbTrades.length > 0 || savedReview?.lastImportAt
          ? "csv"
          : savedReview?.performanceEntryMode || "csv";
      next.performanceEntryMode = inferredMode;
      setPerformanceMode(inferredMode);

      setForm(next);

      const [recoveryState, settings] = await Promise.all([
        loadRecoveryState(),
        loadDllSettings(),
      ]);
      setRecoveryStatus(getRecoveryStatus(recoveryState, settings));
    } catch (err) {
      console.error("PostMarketReview hydrateDay:", err);
      setProfile((prev) => prev ?? createCustomerDefaultProfile());
    } finally {
      setLoading(false);
    }
  }, [demoMode, initialForm, initialTrades, demoProfile, demoSettings, demoMorningThesis]);

  useEffect(() => {
    if (demoMode) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const result = await storage.get(`daily-plan-${todayKey()}`);
        if (!result?.value || cancelled) return;
        let plan = JSON.parse(result.value);
        if (typeof plan === "string") plan = JSON.parse(plan);
        if (!cancelled) setMorningThesis(String(plan?.whyBias || "").trim());
      } catch (error) {
        console.error("PostMarketReview load thesis:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [demoMode]);

  useEffect(() => {
    if (!showThesis) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setShowThesis(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showThesis]);

  const refreshRecoveryStatus = useCallback(async () => {
    const [state, settings] = await Promise.all([
      loadRecoveryState(),
      loadDllSettings(),
    ]);
    setRecoveryStatus(getRecoveryStatus(state, settings));
  }, []);

  const maybeEvaluateRecovery = useCallback(async (computedNet, noTrade) => {
    if (noTrade || computedNet == null || Number.isNaN(computedNet)) {
      await refreshRecoveryStatus();
      return;
    }
    const status = await evaluateDay(todayKey(), computedNet);
    setRecoveryStatus(status);
  }, [refreshRecoveryStatus]);

  useEffect(() => {
    if (!demoMode) setLoading(true);
    hydrateDay();
  }, [hydrateDay, demoMode]);

  useEffect(() => {
    if (demoMode) return undefined;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        hydrateDay().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [hydrateDay, demoMode]);

  useEffect(() => {
    if (demoMode) return undefined;
    const onTradesChanged = () => {
      hydrateDay().catch(() => {});
    };
    window.addEventListener(TRADES_CHANGED_EVENT, onTradesChanged);
    return () => window.removeEventListener(TRADES_CHANGED_EVENT, onTradesChanged);
  }, [hydrateDay, demoMode]);

  const persistReview = useCallback(async (formData) => {
    await loadTraderSettings().catch(() => {});
    const dateKey = todayKey();
    const gross = parseFloat(formData.grossPnl);
    const comm = parseFloat(formData.commissionsFees);
    const computedNet = !Number.isNaN(gross)
      ? round2(gross - (Number.isNaN(comm) ? 0 : comm))
      : null;
    const adherence = summarizeSetupAdherence(dayTrades);

    const payload = {
      date: dateKey,
      ...formData,
      netPnl: formData.noTradeToday ? null : computedNet,
      winRate: formData.noTradeToday ? null : winRate,
      behavioralFlagsRaised: formData.noTradeToday
        ? 0
        : countVisibleBehavioralFlags(formData, profile),
      playbookAdherence: formData.noTradeToday
        ? { total: 0, playbook: 0, improvised: 0, invalid: 0, untagged: 0, playbookRate: null, processPass: null }
        : adherence,
      playbookProcessPass: formData.noTradeToday
        ? null
        : adherence.total > 0
          ? adherence.processPass
          : null,
      // No-trade days never require replay/database follow-up.
      replaySequenceReviewed: formData.noTradeToday ? true : !!formData.replaySequenceReviewed,
      setupsScreenshottedSaved: formData.noTradeToday ? true : !!formData.setupsScreenshottedSaved,
      riskPlanFollowed: formData.noTradeToday ? null : formData.riskPlanFollowed,
      closeoutHabitsSnapshot: closeoutHabits.map((habit) => ({
        id: habit.id,
        key: habit.fieldKey,
        statusLabel: habit.statusLabel,
        label: habit.label,
        enabled: true,
      })),
      savedAt: new Date().toISOString(),
    };

    const res = await fetch(`/api/sessions/${dateKey}/post`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to save close loop");
    }

    notifySessionSaved();
    await maybeEvaluateRecovery(computedNet, formData.noTradeToday);
  }, [winRate, dayTrades, maybeEvaluateRecovery, profile, closeoutHabits]);

  const handleSave = async () => {
    if (demoMode) return false;
    if (!form.noTradeToday && form.riskPlanFollowed == null) {
      window.alert("Choose Yes or No for Risk plan followed before closing the LOOP.");
      setActiveStep(CLOSEOUT_STEPS.findIndex((item) => item.id === "process"));
      return false;
    }
    if (!form.noTradeToday && setupAdherence.untagged > 0) {
      window.alert(
        `${setupAdherence.untagged} trade${setupAdherence.untagged === 1 ? "" : "s"} still need a setup tag. Import again with every trade tagged, or tag trades in Analytics (Trade log).`
      );
      return false;
    }
    try {
      await persistReview(form);
      setSaved(true);
      return true;
    } catch (err) {
      window.alert(err.message || "Save failed. Check you are signed in and try again.");
      return false;
    }
  };

  const processImportFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const account = await loadImportAccount();
      const { trades, openPosition, sourceTimeZone, timeColumnHeader, brokerName } = processBrokerCSV(
        text,
        account,
        csvBroker,
      );
      const missingSymbols =
        account?.commissions_enabled !== false
          ? getMissingCommissionSymbols(trades, account?.commissions || {})
          : [];
      setImportPreview({
        trades,
        openPosition,
        filename: file.name,
        account,
        missingSymbols,
        sourceTimeZone,
        timeColumnHeader,
        brokerName,
      });
      setImportMsg("");
    } catch (err) {
      setImportMsg(`Error: ${err.message}`);
      setImportPreview(null);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    await processImportFile(file);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCounter.current += 1;
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragActive(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processImportFile(file);
  };

  const openFilePicker = () => fileRef.current?.click();

  const handleImportConfirm = async (trades) => {
    const check = validateImportSetupTags(trades);
    if (!check.ok) {
      throw new Error(check.message);
    }

    const replacingManual = dayTrades.filter(
      (trade) => trade.platform === "manual" && trade.account_name === importPreview?.account?.name,
    ).length;
    if (
      replacingManual > 0 &&
      !window.confirm(
        `This CSV will replace ${replacingManual} manually entered trade${replacingManual === 1 ? "" : "s"} for this account and day. Continue?`,
      )
    ) {
      return;
    }

    const count = await importTradesToSupabase(trades, importPreview?.account);
    const todayTrades = tradesForDate(trades, todayKey());
    const perf = computePerformanceFromTrades(todayTrades);
    await reloadDayTrades();
    setForm((f) => ({
      ...f,
      ...perf,
      lastImportFile: importPreview?.filename || "",
      lastImportAt: new Date().toISOString(),
      performanceEntryMode: "csv",
      noTradeToday: todayTrades.length === 0 ? f.noTradeToday : false,
    }));
    const summary = summarizeSetupAdherence(todayTrades);
    setImportMsg(`Imported ${count} trades · ${formatPlaybookBreakdown(summary)}`);
    setImportPreview(null);
    setImportDropExpanded(false);
    setShowHelp(false);
    setSaved(false);
    setPerformanceMode("csv");
    if (todayTrades.length > 0 && perf.netPnl != null && !Number.isNaN(perf.netPnl)) {
      await maybeEvaluateRecovery(perf.netPnl, false);
    }
  };

  const handleManualTradesSaved = async () => {
    const trades = await reloadDayTrades();
    setPerformanceMode("manual");
    setForm((current) => ({
      ...current,
      performanceEntryMode: "manual",
      noTradeToday: false,
      lastImportAt: null,
      lastImportFile: "",
    }));
    notifySessionSaved();
    setSaved(false);
    return trades;
  };

  useEffect(() => {
    const refreshProfile = () => {
      loadTraderProfile({ force: true }).then(setProfile).catch(() => {});
    };
    window.addEventListener(PROFILE_UPDATED_EVENT, refreshProfile);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, refreshProfile);
  }, []);

  if (loading) return <div className="pm-loading home-page--loop workflow-page--loop">Loading...</div>;

  const activeProfile = profile ?? createCustomerDefaultProfile();

  return (
    <WorkflowPageLayout>
      <div className="pm-topbar">
        <span>{headerDate()}</span>
      </div>

      <div className="pm-closeout-layout">
        <div className="pm-closeout-main">
          <div className="pm-closeout-header-row">
            <div className="pm-header">
              <h1 className="hybrid-page-title">Close loop<span className="hybrid-page-title-stop" aria-hidden="true" /></h1>
              <p className="pm-subtitle">Close the loop. Reality vs plan.</p>
            </div>
            <CloseoutMetrics
              form={form}
              netPnl={netPnl}
              winRate={winRate}
              setupAdherence={setupAdherence}
              adherenceLabel={adherenceLabel}
              profile={activeProfile}
            />
          </div>

          {recoveryStatus?.active && (
            <div className="pm-closeout-context-strip pm-closeout-context-strip--recovery">
              <span className="hybrid-label-sm">Drawdown Recovery active</span>
              <p>
                Drawdown {formatRecoveryUsd(recoveryStatus.cumulativeDrawdown)} ·{" "}
                {formatRecoveryProgress(recoveryStatus)} · max daily loss{" "}
                {formatRecoveryUsd(recoveryStatus.effectiveMaxDailyLoss)} until you recover{" "}
                {formatRecoveryUsd(recoveryStatus.remaining)} more.
              </p>
            </div>
          )}

          {performanceMode === "csv" && (
          <div className="pm-import-card">
            <div className="pm-import-card-head pm-import-card-head--today">
              <div className="pm-import-card-head-primary">
                <span className="pm-import-card-head-title">Session import</span>
                <select
                  className="pm-import-broker-select"
                  value={csvBroker}
                  onChange={(event) => {
                    setCsvBroker(event.target.value);
                    setImportMsg("");
                  }}
                  aria-label="CSV broker"
                >
                  <option value="rtrader">R Trader</option>
                  <option value="tradovate">Tradovate</option>
                </select>
              </div>
              {showImportDrop && (
                <button type="button" className="pm-import-help" onClick={() => setShowHelp((s) => !s)}>
                  How do I get this CSV?
                </button>
              )}
            </div>
            {showImportDrop && showHelp && (
              <div className="pm-import-help-panel">
                <p className="pm-import-help-text">
                  {csvBroker === "tradovate"
                    ? "Export your completed trades from Tradovate as a CSV, then upload it here. Confirm the export timezone in the review screen before importing."
                    : "In R Trader, export your session as a Performance Summary or Trades CSV, then upload the file here."}
                </p>
              </div>
            )}
            {showImportDrop ? (
            <div
              className={`pm-import-drop${dragActive ? " pm-import-drop--active" : ""}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={openFilePicker}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openFilePicker();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Drop CSV here or click to browse"
            >
              <div className="pm-import-drop-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div className="pm-import-drop-title">Drop CSV here or click to browse</div>
              <div className="pm-import-drop-hint">
                Import fills Performance below automatically, or enter all fields manually.
              </div>
              <button
                type="button"
                className="pm-closeout-upload-btn pm-import-drop-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  openFilePicker();
                }}
              >
                Import
              </button>
              {importMsg && <p className="pm-import-msg">{importMsg}</p>}
            </div>
            ) : (
            <div className="pm-import-success" role="status">
              <div className="pm-import-success-main">
                <span className="pm-import-success-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <p className="pm-import-success-text">
                  <span className="pm-import-success-label">CSV uploaded</span>
                  {(form.lastImportFile || importMsg) && (
                    <span className="pm-import-success-meta">
                      {[form.lastImportFile, importMsg].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                className="pm-import-reupload-btn"
                onClick={() => setImportDropExpanded(true)}
                disabled={demoMode}
                title={demoMode ? "Create an account to import your own trades" : undefined}
              >
                Re-upload
              </button>
            </div>
            )}
            {showImportDrop && (
            <div className={`pm-import-no-trade${form.noTradeToday ? " pm-import-no-trade--active" : ""}`}>
              <label className="pm-closeout-no-trade-main">
                <input
                  type="checkbox"
                  checked={form.noTradeToday}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((f) => ({
                      ...f,
                      noTradeToday: checked,
                      replaySequenceReviewed: checked ? true : false,
                      setupsScreenshottedSaved: checked ? true : false,
                    }));
                    setSaved(false);
                  }}
                />
                <div>
                  <div className="pm-field-label hybrid-label">No trades today</div>
                  <div className="pm-field-hint">Preservation Mode, took a rest day, or the market was closed.</div>
                </div>
              </label>
              {form.noTradeToday && (
                <button
                  type="button"
                  className="pm-btn-primary-sm pm-closeout-no-trade-save"
                  disabled={demoMode}
                  title={demoMode ? "Create an account to save" : undefined}
                  onClick={async () => {
                    const ok = await handleSave();
                    if (ok !== false) onBack();
                  }}
                >
                  Close the LOOP
                </button>
              )}
            </div>
            )}
            <input ref={fileRef} type="file" accept=".csv" hidden onChange={handleFile} />
          </div>
          )}

          {performanceMode !== "csv" && (
            <input ref={fileRef} type="file" accept=".csv" hidden onChange={handleFile} />
          )}

          <RTraderImportPreview
            open={!!importPreview}
            onClose={() => setImportPreview(null)}
            trades={importPreview?.trades || []}
            openPosition={importPreview?.openPosition || 0}
            missingSymbols={importPreview?.missingSymbols || []}
            filename={importPreview?.filename || ""}
            account={importPreview?.account}
            sourceTimeZone={importPreview?.sourceTimeZone}
            timeColumnHeader={importPreview?.timeColumnHeader}
            brokerName={importPreview?.brokerName}
            onConfirm={handleImportConfirm}
          />

          <PostMarketStepper activeIndex={activeStep} onSelect={setActiveStep} />

          <div className="pm-closeout-stage">
            <div className="pm-section-panel">
              <div className="pm-section-panel-head">
                <div>
                  <h2 className="pm-section-title hybrid-section-title">{step.label}</h2>
                  <p className="pm-section-desc">{step.desc}</p>
                </div>
                <span className="pm-section-step hybrid-label-sm">
                  {activeStep + 1} of {CLOSEOUT_STEPS.length}
                </span>
              </div>

              <div className="pm-section-panel-body">
                {step.id === "performance" && (
                  <>
                    <div className="pm-performance-mode-grid" role="radiogroup" aria-label="Performance entry method">
                      {[
                        { id: "csv", title: "Import CSV", copy: "Fastest and most detailed", badge: "Full analytics" },
                        { id: "manual", title: "Enter trades manually", copy: "Record every completed trade", badge: "Full analytics" },
                        { id: "summary", title: "Enter day summary", copy: "Totals only, without trade detail", badge: "Limited analytics" },
                      ].map((option) => (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={performanceMode === option.id}
                          className={`pm-performance-mode${performanceMode === option.id ? " active" : ""}`}
                          key={option.id}
                          onClick={() => {
                            setPerformanceMode(option.id);
                            set("performanceEntryMode", option.id);
                          }}
                        >
                          <span className="pm-performance-mode-check" aria-hidden="true" />
                          <strong>{option.title}</strong>
                          <small>{option.copy}</small>
                          <em>{option.badge}</em>
                        </button>
                      ))}
                    </div>

                    {performanceMode !== "csv" && (
                      <div className={`pm-import-no-trade${form.noTradeToday ? " pm-import-no-trade--active" : ""}`}>
                        <label className="pm-closeout-no-trade-main">
                          <input
                            type="checkbox"
                            checked={form.noTradeToday}
                            onChange={(event) => {
                              const checked = event.target.checked;
                              setForm((current) => ({
                                ...current,
                                noTradeToday: checked,
                                replaySequenceReviewed: checked,
                                setupsScreenshottedSaved: checked,
                              }));
                            }}
                          />
                          <div>
                            <div className="pm-field-label hybrid-label">No trades today</div>
                            <div className="pm-field-hint">Preservation Mode, took a rest day, or the market was closed.</div>
                          </div>
                        </label>
                      </div>
                    )}

                    {performanceMode === "csv" && (
                      <div className="pm-performance-route-note">
                        <strong>CSV import is ready above.</strong>
                        <span>Upload your rTrader file and today&apos;s trades and performance will populate automatically.</span>
                      </div>
                    )}

                    {performanceMode === "manual" && !form.noTradeToday && (
                      <ManualTradeEntry
                        dateKey={todayKey()}
                        dayTrades={dayTrades}
                        accounts={traderSettings?.accounts || []}
                        setupNames={getPlaybookSetupNames(activeProfile)}
                        onSaved={handleManualTradesSaved}
                      />
                    )}

                    {performanceMode === "summary" && !form.noTradeToday && (
                      <>
                        <div className="pm-performance-route-note pm-performance-route-note--limited">
                          <strong>Summary mode records the day, not individual trades.</strong>
                          <span>Time, setup, holding-period and recent-trade analytics require CSV import or manual trade entry.</span>
                        </div>
                        <div className="pm-perf-split">
                          <div className="pm-perf-col">
                            <div className="pm-perf-col-head">Session Stats</div>
                            <div className="pm-perf-rows">
                              {[["Trades", "trades"], ["Wins", "wins"], ["Losses", "losses"]].map(([label, key]) => (
                                <div className="pm-perf-row" key={key}>
                                  <div className="pm-field-label hybrid-label">{label}</div>
                                  <input type="number" min="0" value={form[key]} onChange={(e) => set(key, e.target.value)} className="pm-text-input pm-perf-row-input" />
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="pm-perf-col">
                            <div className="pm-perf-col-head">Performance</div>
                            <div className="pm-perf-rows">
                              {[
                                ["Gross P&L", "grossPnl", ""],
                                ["Commissions", "commissionsFees", ""],
                                ["Largest winner", "bestWinner", "pos"],
                                ["Largest loss", "worstLoss", "neg"],
                              ].map(([label, key, tone]) => (
                                <div className="pm-perf-row" key={key}>
                                  <div className="pm-field-label hybrid-label">{label}</div>
                                  <input type="number" step="any" value={form[key]} onChange={(e) => set(key, e.target.value)} className={`pm-text-input pm-perf-row-input pm-perf-row-input--wide ${dollarInputTone(form[key], tone)}`} placeholder="$" />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {step.id === "process" && (
                  <>
                    <SliderField label="Followed plan" minLabel="Not at all" maxLabel="Fully" value={form.followedPlan} onChange={(v) => set("followedPlan", v)} />
                    <SliderField label="Setup quality" hint="Were the setups you took A+?" minLabel="Marginal" maxLabel="A+" value={form.setupQuality} onChange={(v) => set("setupQuality", v)} />
                    <SliderField label="Risk discipline" hint="Stops respected, sizing right" minLabel="Loose" maxLabel="Tight" value={form.riskDiscipline} onChange={(v) => set("riskDiscipline", v)} />
                    <SliderField label="Execution quality" hint="Entries, exits, fills" minLabel="Sloppy" maxLabel="Sharp" value={form.executionQuality} onChange={(v) => set("executionQuality", v)} />
                    <div className="pm-risk-block pm-risk-answer-inline">
                      <div className="pm-risk-answer-copy">
                        <div>
                          <div className="pm-field-label hybrid-label">Risk plan followed?</div>
                          <div className="pm-field-hint">Choose the outcome for today&apos;s Risk Adherence streak.</div>
                        </div>
                        {form.riskPlanFollowed == null && <span>Answer required</span>}
                      </div>
                      <div className="pm-risk-answer-options" role="radiogroup" aria-label="Risk plan followed">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={form.riskPlanFollowed === true}
                          className={form.riskPlanFollowed === true ? "active yes" : ""}
                          onClick={() => set("riskPlanFollowed", true)}
                          aria-label="Yes, risk plan followed"
                        >
                          Y
                        </button>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={form.riskPlanFollowed === false}
                          className={form.riskPlanFollowed === false ? "active no" : ""}
                          onClick={() => set("riskPlanFollowed", false)}
                          aria-label="No, risk plan not followed"
                        >
                          N
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {step.id === "flags" && (
                  <div className="pm-flags-categories">
                    {getVisibleBehavioralFlagCategories(activeProfile).map((category) => (
                      <div key={category.id} className="pm-flags-category">
                        <div className="pm-flags-category-title">{category.label}</div>
                        <div className="pm-habit-tile-row pm-habit-tile-row--flags">
                          {category.flags.map((flag) => (
                            <HabitTileField
                              key={flag.key}
                              label={flag.label}
                              hint={flag.hint}
                              value={
                                flag.customId
                                  ? !!form.customBehavioralFlags?.[flag.customId]
                                  : !!form[flag.key]
                              }
                              onChange={(v) => {
                                if (flag.customId) {
                                  set("customBehavioralFlags", {
                                    ...(form.customBehavioralFlags || {}),
                                    [flag.customId]: v,
                                  });
                                } else {
                                  set(flag.key, v);
                                }
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {step.id === "close" && (
                  <>
                    <SliderField label="Emotional state" minLabel="Off" maxLabel="Centered" value={form.emotionalState} onChange={(v) => set("emotionalState", v)} />
                    <SliderField label="Satisfaction" hint="With process, not P&L" minLabel="Low" maxLabel="High" value={form.satisfaction} onChange={(v) => set("satisfaction", v)} />
                    <SliderField label="Frustration" minLabel="None" maxLabel="High" value={form.frustration} onChange={(v) => set("frustration", v)} inverted />
                  </>
                )}

                {step.id === "journal" && (
                  <>
                    <div className="pm-field">
                      <div className="pm-journal-heading-row">
                        <div className="pm-field-label hybrid-label">Plan versus reality</div>
                        <button type="button" className="pm-see-thesis" onClick={() => setShowThesis(true)}>
                          See Thesis
                        </button>
                      </div>
                      <textarea
                        value={form.readVsReality}
                        onChange={(e) => set("readVsReality", e.target.value)}
                        className="pm-textarea"
                        placeholder="Your session lean and plan vs how the session actually played out."
                        rows={3}
                      />
                    </div>
                    <div className="pm-field">
                      <div className="pm-field-label hybrid-label">What i did well</div>
                      <textarea
                        value={form.wentWell}
                        onChange={(e) => set("wentWell", e.target.value)}
                        className="pm-textarea"
                        placeholder="One or two things you did well today, even on losing trades."
                        rows={3}
                      />
                    </div>
                    <div className="pm-field">
                      <div className="pm-field-label hybrid-label">what i can improve</div>
                      <textarea
                        value={form.wentWrong}
                        onChange={(e) => set("wentWrong", e.target.value)}
                        className="pm-textarea"
                        placeholder="One or two things that can be improved from today's session."
                        rows={3}
                      />
                    </div>
                    <div className="pm-field">
                      <div className="pm-field-label hybrid-label">One lesson</div>
                      <textarea value={form.oneLesson} onChange={(e) => set("oneLesson", e.target.value)} className="pm-textarea" placeholder="What from today will you carry forward." rows={3} />
                    </div>
                    <div className="pm-habit-group">
                      <div className="pm-flags-category-title">Close-out habits</div>
                      <div className="pm-habit-tile-row pm-habit-tile-row--prep" role="group" aria-label="End-of-day review checklist">
                        {closeoutHabits.map((item) => {
                          const done = !!form[item.fieldKey];
                          return (
                            <HabitTileField
                              key={item.id}
                              label={item.label}
                              hint={done ? "Done" : "Pending"}
                              value={done}
                              onChange={(v) => set(item.fieldKey, v)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {isLastStep && journalPendingSummary && saved && (
              <p className="pm-closeout-finish-note pm-closeout-finish-note--inline" role="status">
                Saved — {journalPendingSummary}. Re-open Journal to check off when complete.
              </p>
            )}

            <div className="pm-section-nav">
              <button
                type="button"
                className="pm-btn-link"
                onClick={() => setActiveStep((i) => Math.max(0, i - 1))}
                disabled={isFirstStep}
              >
                Previous
              </button>
              {!isLastStep ? (
                <button
                  type="button"
                  className="pm-btn-primary-sm"
                  onClick={() => setActiveStep((i) => Math.min(CLOSEOUT_STEPS.length - 1, i + 1))}
                >
                  Next
                </button>
              ) : (
                <div className="pm-closeout-finish-actions-right">
                  {demoMode ? (
                    <p className="demo-readonly-hint">Demo sample — create an account to close your own LOOP.</p>
                  ) : null}
                  <button
                    type="button"
                    className="pm-btn-primary-sm"
                    disabled={demoMode}
                    title={demoMode ? "Create an account to save" : undefined}
                    onClick={async () => {
                      const ok = await handleSave();
                      if (ok !== false) onBack();
                    }}
                  >
                    Save &amp; Close LOOP
                    <span className="checkin-btn-arrow" aria-hidden="true">
                      →
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showThesis && (
        <div className="pm-thesis-overlay" role="presentation" onMouseDown={() => setShowThesis(false)}>
          <section
            className="pm-thesis-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pm-thesis-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="pm-thesis-dialog-head">
              <div>
                <span className="hybrid-label-sm">This morning</span>
                <h2 id="pm-thesis-title">Your thesis</h2>
              </div>
              <button type="button" onClick={() => setShowThesis(false)} aria-label="Close thesis">&times;</button>
            </div>
            <div className="pm-thesis-dialog-body">
              {morningThesis || "No thesis was saved in this morning's session plan."}
            </div>
            <button type="button" className="pm-thesis-dialog-close" onClick={() => setShowThesis(false)}>Close</button>
          </section>
        </div>
      )}
    </WorkflowPageLayout>
  );
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function formatUsd(n) {
  const abs = Math.abs(n).toFixed(2);
  return n >= 0 ? `$${abs}` : `-$${abs}`;
}

function dollarInputTone(value, fallback = "") {
  const n = parseFloat(String(value).replace(/[$,]/g, ""));
  if (Number.isNaN(n) || n === 0) return fallback;
  return n > 0 ? "pos" : "neg";
}
