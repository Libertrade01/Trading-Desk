"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { storage } from "../lib/supabase";
import { BEHAVIORAL_FLAGS, DEFAULT_POSTMARKET } from "../lib/postmarket-defaults";
import {
  processRTraderCSV,
  tradesForDate,
  computePerformanceFromTrades,
  computePerformanceFromDbTrades,
  fetchTradesForDate,
  importTradesToSupabase,
  getMissingCommissionSymbols,
} from "../lib/rtrader-import";
import RTraderImportPreview from "./RTraderImportPreview";

async function loadData(key, fallback) {
  try {
    const r = await storage.get(key);
    return r ? JSON.parse(r.value) : fallback;
  } catch {
    return fallback;
  }
}

async function saveData(key, value) {
  try {
    await storage.set(key, JSON.stringify(value));
  } catch (e) {
    console.error("Save:", e);
  }
}

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

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

function SliderField({ label, hint, minLabel, maxLabel, value, onChange }) {
  const tone = value >= 7 ? "var(--green)" : value >= 5 ? "var(--amber)" : "var(--red)";
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

function SessionSummary({ form, netPnl, winRate }) {
  const flagsRaised = BEHAVIORAL_FLAGS.filter((f) => form[f.key]).length;
  const pnlTone = netPnl > 0 ? "var(--green)" : netPnl < 0 ? "var(--red)" : "var(--text)";

  return (
    <div className="pm-score-card">
      <div className="pm-score-label hybrid-label-sm">Session summary</div>
      <div className="pm-summary-net">
        <div className="pm-summary-net-label">Net P&amp;L</div>
        <div className="pm-summary-net-value" style={{ color: pnlTone }}>
          {netPnl !== "" && netPnl != null ? formatUsd(netPnl) : "—"}
        </div>
      </div>
      <div className="pm-summary-grid">
        <div><span>Trades</span><strong>{form.trades || "0"}</strong></div>
        <div><span>Win rate</span><strong>{winRate}</strong></div>
        <div><span>Wins</span><strong className="pos">{form.wins || "0"}</strong></div>
        <div><span>Losses</span><strong className="neg">{form.losses || "0"}</strong></div>
      </div>
      <div className="pm-summary-flags">
        <div className="pm-summary-flags-label">Behavioral flags</div>
        <div className="pm-summary-flags-count">
          <span style={{ color: flagsRaised ? "var(--amber)" : "var(--green)" }}>{flagsRaised}</span>
          <span className="pm-summary-flags-of"> of 6 raised</span>
        </div>
      </div>
    </div>
  );
}

export default function PostMarketReview({ onBack }) {
  const [form, setForm] = useState(DEFAULT_POSTMARKET);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importMsg, setImportMsg] = useState("");
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

  useEffect(() => {
    (async () => {
      const dateKey = todayKey();
      const [savedReview, dbTrades] = await Promise.all([
        loadData(`postmarket-review-${dateKey}`, null),
        fetchTradesForDate(dateKey),
      ]);

      let next = { ...DEFAULT_POSTMARKET, ...(savedReview || {}) };

      if (dbTrades.length && !next.trades) {
        next = { ...next, ...computePerformanceFromDbTrades(dbTrades) };
      }

      setForm(next);
      setLoading(false);
    })();
  }, []);

  const persistReview = useCallback(async (formData) => {
    const gross = parseFloat(formData.grossPnl);
    const comm = parseFloat(formData.commissionsFees);
    const computedNet = !Number.isNaN(gross)
      ? round2(gross - (Number.isNaN(comm) ? 0 : comm))
      : null;

    await saveData(`postmarket-review-${todayKey()}`, {
      date: todayKey(),
      ...formData,
      netPnl: computedNet,
      winRate,
      behavioralFlagsRaised: BEHAVIORAL_FLAGS.filter((f) => formData[f.key]).length,
      savedAt: new Date().toISOString(),
    });
  }, [winRate]);

  const handleSave = async () => {
    await persistReview(form);
    setSaved(true);
  };

  const handleReset = () => {
    setForm(DEFAULT_POSTMARKET);
    setImportPreview(null);
    setImportMsg("");
    setSaved(false);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const text = await file.text();
      const { trades, openPosition, account } = processRTraderCSV(text);
      const missingSymbols = getMissingCommissionSymbols(trades, account?.commissions || {});
      setImportPreview({ trades, openPosition, filename: file.name, account, missingSymbols });
      setImportMsg("");
    } catch (err) {
      setImportMsg(`Error: ${err.message}`);
      setImportPreview(null);
    }
  };

  const handleImportConfirm = async (trades, accountType) => {
    const count = await importTradesToSupabase(trades, importPreview?.account, accountType);
    const todayTrades = tradesForDate(trades, todayKey());
    const perf = computePerformanceFromTrades(todayTrades);
    setForm((f) => ({
      ...f,
      ...perf,
      lastImportFile: importPreview?.filename || "",
      lastImportAt: new Date().toISOString(),
      noTradeToday: todayTrades.length === 0 ? f.noTradeToday : false,
    }));
    setImportMsg(`Imported ${count} trades · ${todayTrades.length} for today`);
    setImportPreview(null);
    setSaved(false);
  };

  if (loading) return <div className="pm-loading">Loading...</div>;

  return (
    <div className="premarket-page hybrid-page">
      <div className="pm-topbar">
        <span>{headerDate()}</span>
        <span className="pm-live"><span className="pm-live-dot" />Live</span>
      </div>

      <div className="premarket-grid postmarket-grid">
        <div className="pm-header">
          <div className="pm-eyebrow hybrid-eyebrow">Post-market · {sectionDate()}</div>
          <h1 className="hybrid-page-title">CLOSE OUT.</h1>
          <p className="pm-subtitle">Close the loop. What happened vs what you planned.</p>
        </div>

        <div className="premarket-form">
          {/* Import */}
          <section className="pm-card pm-import-card">
            <div className="pm-import-row">
              <div className="pm-import-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="pm-import-body">
                <div className="pm-import-title">Import from rTrader</div>
                <div className="pm-import-desc">Performance Summary or Trades export — auto-detects.</div>
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
              <button type="button" className="pm-upload-btn" onClick={() => fileRef.current?.click()}>
                ↑ Import
              </button>
              <input ref={fileRef} type="file" accept=".csv" hidden onChange={handleFile} />
            </div>
          </section>

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

          {/* No trade */}
          <section className="pm-card pm-no-trade-card">
            <label className="pm-no-trade-check">
              <input type="checkbox" checked={form.noTradeToday} onChange={(e) => set("noTradeToday", e.target.checked)} />
              <div>
                <div className="pm-field-label hybrid-label">I didn&apos;t trade today</div>
                <div className="pm-field-hint">Honoring a low-readiness day or sitting out by choice. Counts as a stand-down when paired with low/mid morning readiness.</div>
              </div>
            </label>
          </section>

          {/* 01 Performance */}
          <section className="pm-card">
            <div className="pm-section-head">
              <span className="pm-section-num">01</span>
              <div>
                <h2 className="pm-section-title hybrid-section-title">Performance</h2>
                <p className="pm-section-desc">The numbers from the session.</p>
              </div>
            </div>
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
          </section>

          {/* 02 Process */}
          <section className="pm-card">
            <div className="pm-section-head">
              <span className="pm-section-num">02</span>
              <div>
                <h2 className="pm-section-title hybrid-section-title">Process adherence</h2>
                <p className="pm-section-desc">How well you executed your plan.</p>
              </div>
            </div>
            <SliderField label="Followed plan" minLabel="Not at all" maxLabel="Fully" value={form.followedPlan} onChange={(v) => set("followedPlan", v)} />
            <SliderField label="Setup quality" hint="Were the setups you took A+?" minLabel="Marginal" maxLabel="A+" value={form.setupQuality} onChange={(v) => set("setupQuality", v)} />
            <SliderField label="Risk discipline" hint="Stops respected, sizing right" minLabel="Loose" maxLabel="Tight" value={form.riskDiscipline} onChange={(v) => set("riskDiscipline", v)} />
            <SliderField label="Execution quality" hint="Entries, exits, fills" minLabel="Sloppy" maxLabel="Sharp" value={form.executionQuality} onChange={(v) => set("executionQuality", v)} />
          </section>

          {/* 03 Behavioral flags */}
          <section className="pm-card">
            <div className="pm-section-head">
              <span className="pm-section-num">03</span>
              <div>
                <h2 className="pm-section-title hybrid-section-title">Behavioral flags</h2>
                <p className="pm-section-desc">Honest answers help. Pattern recognition over time only works if you&apos;re truthful.</p>
              </div>
            </div>
            <div className="pm-flags-grid">
              {BEHAVIORAL_FLAGS.map((flag) => (
                <div key={flag.key} className="pm-flag-item">
                  <ToggleField label={flag.label} hint={flag.hint} value={form[flag.key]} onChange={(v) => set(flag.key, v)} />
                </div>
              ))}
            </div>
          </section>

          {/* 04 After the close */}
          <section className="pm-card">
            <div className="pm-section-head">
              <span className="pm-section-num">04</span>
              <div>
                <h2 className="pm-section-title hybrid-section-title">After the close</h2>
                <p className="pm-section-desc">How you feel right now.</p>
              </div>
            </div>
            <SliderField label="Emotional state" minLabel="Off" maxLabel="Centered" value={form.emotionalState} onChange={(v) => set("emotionalState", v)} />
            <SliderField label="Satisfaction" hint="With process, not P&L" minLabel="Low" maxLabel="High" value={form.satisfaction} onChange={(v) => set("satisfaction", v)} />
            <SliderField label="Frustration" minLabel="None" maxLabel="High" value={form.frustration} onChange={(v) => set("frustration", v)} />
          </section>

          {/* Journal */}
          <section className="pm-card">
            <h2 className="pm-mantra-title hybrid-section-title">Journal</h2>
            <p className="pm-section-desc">Three short prompts. Don&apos;t overthink them.</p>
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
          </section>

          <div className="pm-footer pm-footer-postmarket">
            <button type="button" className="pm-btn-link" onClick={handleReset}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.5 8a5.5 5.5 0 019.3-4M13.5 8a5.5 5.5 0 01-9.3 4" strokeLinecap="round"/><path d="M2.5 3.5V8h4.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Reset
            </button>
            <button type="button" className="pm-btn-save-review" onClick={handleSave}>
              {saved ? "✓ Saved" : "Save review"}
            </button>
          </div>

          <button type="button" className="pm-btn-return" onClick={() => { handleSave(); onBack(); }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Return to dashboard
          </button>
        </div>

        <aside className="premarket-score-panel">
          <SessionSummary form={form} netPnl={netPnl} winRate={winRate} />
        </aside>
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
