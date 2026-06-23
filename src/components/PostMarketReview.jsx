"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  BEHAVIORAL_FLAG_CATEGORIES,
  BEHAVIORAL_FLAGS,
  countBehavioralFlags,
  DEFAULT_POSTMARKET,
  normalizePostmarketFlags,
} from "../lib/postmarket-defaults";
import { notifySessionSaved, TRADES_CHANGED_EVENT } from "../lib/session-events";
import {
  processRTraderCSV,
  tradesForDate,
  computePerformanceFromTrades,
  fetchTradesForDate,
  importTradesToSupabase,
  getMissingCommissionSymbols,
  loadImportAccount,
  performanceFromDbOrImport,
} from "../lib/rtrader-import";
import {
  summarizeSetupAdherence,
  validateImportSetupTags,
  formatPlaybookBreakdown,
  playbookAdherenceLabel,
} from "../lib/setup-adherence";
import RTraderImportPreview from "./RTraderImportPreview";
import PostMarketStepper, { CLOSEOUT_STEPS } from "./PostMarketStepper";
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
import { sliderValueColor } from "../lib/premarket-scoring";

function headerDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();
}

function sectionDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).toUpperCase();
}

function SliderField({ label, hint, minLabel, maxLabel, value, onChange, inverted }) {
  const tone = sliderValueColor(value, inverted);
  return (
    <div className="pm-field">
      <div className="pm-field-top">
        <div>
          <div className="pm-field-label hybrid-label">{label}</div>
          {hint && <div className="pm-field-hint">{hint}</div>}
        </div>
        <div className="pm-field-value" style={{ color: tone }}>{value}</div>
      </div>
      <input type="range" min={1} max={10} value={value} onChange={(e) => onChange(Number(e.target.value))} className="pm-slider" />
      <div className="pm-slider-labels">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

function CloseoutMetrics({ form, netPnl, winRate, setupAdherence, adherenceLabel }) {
  const flagsRaised = countBehavioralFlags(form);
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
            <span className="pm-closeout-metrics-muted"> / {BEHAVIORAL_FLAGS.length}</span>
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

export default function PostMarketReview({ onBack }) {
  const [form, setForm] = useState(DEFAULT_POSTMARKET);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importMsg, setImportMsg] = useState("");
  const [dayTrades, setDayTrades] = useState([]);
  const [recoveryStatus, setRecoveryStatus] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const fileRef = useRef(null);

  const set = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }, []);

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

  const step = CLOSEOUT_STEPS[activeStep];
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === CLOSEOUT_STEPS.length - 1;

  const reloadDayTrades = useCallback(async (dateKey = todayKey()) => {
    const trades = await fetchTradesForDate(dateKey);
    setDayTrades(trades);
    setForm((f) => {
      const perf = performanceFromDbOrImport(f, trades);
      return perf ? { ...f, ...perf } : f;
    });
    return trades;
  }, []);

  const hydrateDay = useCallback(async () => {
    await loadTraderSettings();
    const dateKey = todayKey();
    const [reviewRes, dbTrades] = await Promise.all([
      fetch(`/api/sessions/${dateKey}/post`).then((r) =>
        r.ok ? r.json() : { review: null }
      ),
      fetchTradesForDate(dateKey),
    ]);
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

    setForm(next);

    const [recoveryState, settings] = await Promise.all([
      loadRecoveryState(),
      loadDllSettings(),
    ]);
    setRecoveryStatus(getRecoveryStatus(recoveryState, settings));
    setLoading(false);
  }, []);

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
    setLoading(true);
    hydrateDay().catch(() => setLoading(false));
  }, [hydrateDay]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        hydrateDay().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [hydrateDay]);

  useEffect(() => {
    const onTradesChanged = () => {
      hydrateDay().catch(() => {});
    };
    window.addEventListener(TRADES_CHANGED_EVENT, onTradesChanged);
    return () => window.removeEventListener(TRADES_CHANGED_EVENT, onTradesChanged);
  }, [hydrateDay]);

  const persistReview = useCallback(async (formData) => {
    await loadTraderSettings();
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
      netPnl: computedNet,
      winRate,
      behavioralFlagsRaised: countBehavioralFlags(formData),
      playbookAdherence: adherence,
      playbookProcessPass: adherence.total > 0 ? adherence.processPass : null,
      savedAt: new Date().toISOString(),
    };

    const res = await fetch(`/api/sessions/${dateKey}/post`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to save post-market review");
    }

    notifySessionSaved();
    await maybeEvaluateRecovery(computedNet, formData.noTradeToday);
  }, [winRate, dayTrades, maybeEvaluateRecovery]);

  const handleSave = async () => {
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

  const handleReset = () => {
    setForm(DEFAULT_POSTMARKET);
    setDayTrades([]);
    setImportPreview(null);
    setImportMsg("");
    setSaved(false);
    setActiveStep(0);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const text = await file.text();
      const account = await loadImportAccount();
      const { trades, openPosition } = processRTraderCSV(text, account);
      const missingSymbols = getMissingCommissionSymbols(trades, account?.commissions || {});
      setImportPreview({ trades, openPosition, filename: file.name, account, missingSymbols });
      setImportMsg("");
    } catch (err) {
      setImportMsg(`Error: ${err.message}`);
      setImportPreview(null);
    }
  };

  const handleImportConfirm = async (trades, accountType) => {
    const check = validateImportSetupTags(trades);
    if (!check.ok) {
      throw new Error(check.message);
    }

    const count = await importTradesToSupabase(trades, importPreview?.account, accountType);
    const todayTrades = tradesForDate(trades, todayKey());
    const perf = computePerformanceFromTrades(todayTrades);
    await reloadDayTrades();
    setForm((f) => ({
      ...f,
      ...perf,
      lastImportFile: importPreview?.filename || "",
      lastImportAt: new Date().toISOString(),
      noTradeToday: todayTrades.length === 0 ? f.noTradeToday : false,
    }));
    const summary = summarizeSetupAdherence(todayTrades);
    setImportMsg(`Imported ${count} trades · ${formatPlaybookBreakdown(summary)}`);
    setImportPreview(null);
    setSaved(false);
    if (todayTrades.length > 0 && perf.netPnl != null && !Number.isNaN(perf.netPnl)) {
      await maybeEvaluateRecovery(perf.netPnl, false);
    }
  };

  if (loading) return <div className="pm-loading">Loading...</div>;

  return (
    <div className="premarket-page hybrid-page">
      <div className="pm-topbar">
        <span>{headerDate()}</span>
      </div>

      <div className="pm-closeout-layout">
        <div className="pm-closeout-main">
          <div className="pm-closeout-header-row">
            <div className="pm-header">
              <div className="pm-eyebrow hybrid-eyebrow">Post-market · {sectionDate()}</div>
              <h1 className="hybrid-page-title">CLOSE OUT.</h1>
              <p className="pm-subtitle">Close the loop. What happened vs what you planned.</p>
            </div>
            <CloseoutMetrics
              form={form}
              netPnl={netPnl}
              winRate={winRate}
              setupAdherence={setupAdherence}
              adherenceLabel={adherenceLabel}
            />
          </div>

          {recoveryStatus?.active && (
            <div className="pm-closeout-context-strip pm-closeout-context-strip--recovery">
              <span className="hybrid-label-sm">DLL recovery active</span>
              <p>
                Drawdown {formatRecoveryUsd(recoveryStatus.cumulativeDrawdown)} ·{" "}
                {formatRecoveryProgress(recoveryStatus)} · max daily loss{" "}
                {formatRecoveryUsd(recoveryStatus.effectiveMaxDailyLoss)} until you recover{" "}
                {formatRecoveryUsd(recoveryStatus.remaining)} more.
              </p>
            </div>
          )}

          <div className="pm-closeout-context-strip pm-closeout-import-strip">
            <div className="pm-closeout-import-body">
              <div className="pm-closeout-import-title">Import from rTrader</div>
              <div className="pm-closeout-import-desc">Performance Summary or Trades export — auto-detects.</div>
              <button type="button" className="pm-import-help" onClick={() => setShowHelp((s) => !s)}>
                How do I get this file from rTrader?
              </button>
              {showHelp && (
                <p className="pm-import-help-text">
                  In rTrader, export your session as a CSV (Performance Summary or Trades). Upload here — trades import to Analytics and today&apos;s performance fields fill automatically.
                </p>
              )}
              {importMsg && <p className="pm-import-msg">{importMsg}</p>}
            </div>
            <button type="button" className="pm-closeout-upload-btn" onClick={() => fileRef.current?.click()}>
              Import
            </button>
            <input ref={fileRef} type="file" accept=".csv" hidden onChange={handleFile} />
          </div>

          <RTraderImportPreview
            open={!!importPreview}
            onClose={() => setImportPreview(null)}
            trades={importPreview?.trades || []}
            openPosition={importPreview?.openPosition || 0}
            missingSymbols={importPreview?.missingSymbols || []}
            filename={importPreview?.filename || ""}
            account={importPreview?.account}
            onConfirm={handleImportConfirm}
          />

          <label className="pm-closeout-context-strip pm-closeout-no-trade">
            <input type="checkbox" checked={form.noTradeToday} onChange={(e) => set("noTradeToday", e.target.checked)} />
            <div>
              <div className="pm-field-label hybrid-label">I didn&apos;t trade today</div>
              <div className="pm-field-hint">Honoring a low-readiness day or sitting out by choice. Counts as a protective day when paired with low/mid morning readiness.</div>
            </div>
          </label>

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
                    <div className="pm-perf-grid">
                      <div><div className="pm-field-label hybrid-label">Trades</div><input type="text" value={form.trades} onChange={(e) => set("trades", e.target.value)} className="pm-text-input" disabled={form.noTradeToday} /></div>
                      <div><div className="pm-field-label hybrid-label">Wins</div><input type="text" value={form.wins} onChange={(e) => set("wins", e.target.value)} className="pm-text-input" disabled={form.noTradeToday} /></div>
                      <div><div className="pm-field-label hybrid-label">Losses</div><input type="text" value={form.losses} onChange={(e) => set("losses", e.target.value)} className="pm-text-input" disabled={form.noTradeToday} /></div>
                      <div><div className="pm-field-label hybrid-label">Gross P&amp;L</div><input type="text" value={form.grossPnl} onChange={(e) => set("grossPnl", e.target.value)} className="pm-text-input" placeholder="$" disabled={form.noTradeToday} /></div>
                      <div><div className="pm-field-label hybrid-label">Best winner</div><input type="text" value={form.bestWinner} onChange={(e) => set("bestWinner", e.target.value)} className="pm-text-input" placeholder="$" disabled={form.noTradeToday} /></div>
                      <div><div className="pm-field-label hybrid-label">Worst loss</div><input type="text" value={form.worstLoss} onChange={(e) => set("worstLoss", e.target.value)} className="pm-text-input" placeholder="$" disabled={form.noTradeToday} /></div>
                      <div className="pm-perf-full"><div className="pm-field-label hybrid-label">Commissions &amp; fees</div><input type="text" value={form.commissionsFees} onChange={(e) => set("commissionsFees", e.target.value)} className="pm-text-input" placeholder="$" disabled={form.noTradeToday} /></div>
                    </div>
                    <p className="pm-perf-note">Enter your gross P&amp;L above and your total commissions &amp; fees here; your net is calculated automatically. On imported days this is filled from your CSV.</p>
                  </>
                )}

                {step.id === "process" && (
                  <>
                    <SliderField label="Followed plan" minLabel="Not at all" maxLabel="Fully" value={form.followedPlan} onChange={(v) => set("followedPlan", v)} />
                    <SliderField label="Setup quality" hint="Were the setups you took A+?" minLabel="Marginal" maxLabel="A+" value={form.setupQuality} onChange={(v) => set("setupQuality", v)} />
                    <SliderField label="Risk discipline" hint="Stops respected, sizing right" minLabel="Loose" maxLabel="Tight" value={form.riskDiscipline} onChange={(v) => set("riskDiscipline", v)} />
                    <SliderField label="Execution quality" hint="Entries, exits, fills" minLabel="Sloppy" maxLabel="Sharp" value={form.executionQuality} onChange={(v) => set("executionQuality", v)} />
                    <div className="pm-risk-block">
                      <ToggleField
                        label="Risk plan followed?"
                        hint="Be brutally honest — this is your risk adherence streak. Yes only if you followed your plan and respected every limit today. Serious traders close out clean."
                        value={form.riskPlanFollowed === true}
                        onChange={(on) => set("riskPlanFollowed", on)}
                      />
                    </div>
                  </>
                )}

                {step.id === "flags" && (
                  <div className="pm-flags-categories">
                    {BEHAVIORAL_FLAG_CATEGORIES.map((category) => (
                      <div key={category.id} className="pm-flags-category">
                        <div className="pm-flags-category-title">{category.label}</div>
                        <div className="pm-flags-grid">
                          {category.flags.map((flag) => (
                            <div key={flag.key} className="pm-flag-item">
                              <ToggleField label={flag.label} hint={flag.hint} value={form[flag.key]} onChange={(v) => set(flag.key, v)} />
                            </div>
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
                      <div className="pm-field-label hybrid-label">Read vs reality</div>
                      <div className="pm-field-hint">Your morning bias vs how the session actually played out.</div>
                      <textarea
                        value={form.readVsReality}
                        onChange={(e) => set("readVsReality", e.target.value)}
                        className="pm-textarea"
                        placeholder="What you expected going in — what happened instead — and whether your levels and setup read held up."
                        rows={3}
                      />
                    </div>
                    <div className="pm-field">
                      <div className="pm-field-label hybrid-label">What went well</div>
                      <textarea value={form.wentWell} onChange={(e) => set("wentWell", e.target.value)} className="pm-textarea" rows={3} />
                    </div>
                    <div className="pm-field">
                      <div className="pm-field-label hybrid-label">What went wrong</div>
                      <textarea value={form.wentWrong} onChange={(e) => set("wentWrong", e.target.value)} className="pm-textarea" rows={3} />
                    </div>
                    <div className="pm-field">
                      <div className="pm-field-label hybrid-label">One lesson</div>
                      <textarea value={form.oneLesson} onChange={(e) => set("oneLesson", e.target.value)} className="pm-textarea" placeholder="If today taught you one thing, what was it?" rows={3} />
                    </div>
                  </>
                )}
              </div>
            </div>

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
                  Next — {CLOSEOUT_STEPS[activeStep + 1].label}
                </button>
              ) : (
                <span className="pm-closeout-nav-spacer" aria-hidden="true" />
              )}
            </div>

            {isLastStep && (
              <div className="pm-closeout-finish">
                <div className="pm-closeout-finish-actions">
                  <button type="button" className="pm-btn-link" onClick={handleReset}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.5 8a5.5 5.5 0 019.3-4M13.5 8a5.5 5.5 0 01-9.3 4" strokeLinecap="round"/><path d="M2.5 3.5V8h4.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Reset
                  </button>
                  <div className="pm-closeout-finish-actions-right">
                    <button type="button" className="pm-btn-save-review" onClick={handleSave}>
                      {saved ? "Saved" : "Save review"}
                    </button>
                    <button
                      type="button"
                      className="pm-btn-return"
                      onClick={async () => {
                        const ok = await handleSave();
                        if (ok !== false) onBack();
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Return to dashboard
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleField({ label, hint, value, onChange }) {
  return (
    <div className="pm-toggle-field">
      <div>
        <div className="pm-field-label hybrid-label">{label}</div>
        {hint && <div className="pm-field-hint">{hint}</div>}
      </div>
      <button type="button" className={`pm-toggle${value ? " on" : ""}`} onClick={() => onChange(!value)} aria-pressed={value}>
        <span className="pm-toggle-knob" />
      </button>
    </div>
  );
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function formatUsd(n) {
  const abs = Math.abs(n).toFixed(2);
  return n >= 0 ? `$${abs}` : `-$${abs}`;
}
