"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { storage } from "../lib/supabase";
import { formatUsd } from "../lib/history-data";
import { todayKey } from "../lib/today-key";
import WorkflowPageLayout from "./WorkflowPageLayout";
import styles from "./PropEconomics.module.css";

const STORAGE_KEY = "prop-ledger";
const DEFAULT_FIRMS = ["Lucid", "Tradeify"];
const SPEND_CATEGORIES = ["eval", "reset", "data", "other"];
const ADD_FIRM_VALUE = "__add_firm__";
const EMPTY_LEDGER = { firms: [...DEFAULT_FIRMS], entries: [] };

async function loadLedger() {
  try {
    const result = await storage.get(STORAGE_KEY);
    if (!result) return { ...EMPTY_LEDGER, firms: [...DEFAULT_FIRMS], entries: [] };
    const data = JSON.parse(result.value);
    return {
      firms: Array.isArray(data.firms) && data.firms.length ? data.firms : [...DEFAULT_FIRMS],
      entries: Array.isArray(data.entries) ? data.entries : [],
    };
  } catch {
    return { ...EMPTY_LEDGER, firms: [...DEFAULT_FIRMS], entries: [] };
  }
}

async function saveLedger(data) {
  try {
    await storage.set(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Prop ledger save:", error);
  }
}

function headerDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyForm(type = "spend") {
  return { date: todayKey(), type, firm: DEFAULT_FIRMS[0], amount: "", category: "eval", note: "" };
}

function formatRowDate(dateStr) {
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatAmount(number) {
  return formatUsd(number, { signed: false });
}

function computeTotals(entries) {
  let totalPayouts = 0;
  let totalSpend = 0;
  for (const entry of entries) {
    const amount = Number(entry.amount) || 0;
    if (entry.type === "payout") totalPayouts += amount;
    else totalSpend += amount;
  }
  return { totalPayouts, totalSpend, net: totalPayouts - totalSpend };
}

function buildCumulativeSeries(entries) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  let cumPayout = 0;
  let cumSpend = 0;
  return sorted.map((entry) => {
    const amount = Number(entry.amount) || 0;
    if (entry.type === "payout") cumPayout += amount;
    else cumSpend += amount;
    return { date: entry.date, cumPayout, cumSpend };
  });
}

function CumulativeChart({ entries }) {
  const series = useMemo(() => buildCumulativeSeries(entries), [entries]);
  const chart = useMemo(() => {
    if (!series.length) return null;
    const width = 900;
    const height = 300;
    const padX = 22;
    const padTop = 32;
    const padBottom = 44;
    const maxY = Math.max(...series.flatMap((point) => [point.cumPayout, point.cumSpend]), 1);
    const coordinates = (key) => series.map((point, index) => {
      const divisor = Math.max(series.length - 1, 1);
      return {
        x: padX + (index / divisor) * (width - padX * 2),
        y: padTop + (1 - point[key] / maxY) * (height - padTop - padBottom),
      };
    });
    const payoutCoords = coordinates("cumPayout");
    const spendCoords = coordinates("cumSpend");
    return {
      width,
      height,
      maxY,
      spendCoords,
      payoutLine: payoutCoords.map((point) => `${point.x},${point.y}`).join(" "),
      spendLine: spendCoords.map((point) => `${point.x},${point.y}`).join(" "),
      dates: series.map((point) => point.date),
    };
  }, [series]);

  if (!chart) {
    return <div className={styles.chartEmpty}><span>NO CAPITAL FLOW YET</span><p>Log your first evaluation fee or payout to begin the trend.</p></div>;
  }

  const firstDate = chart.dates[0];
  const lastDate = chart.dates.at(-1);

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartScale} aria-hidden="true"><span>{formatAmount(chart.maxY)}</span><span>{formatAmount(chart.maxY / 2)}</span><span>$0</span></div>
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className={styles.chart} preserveAspectRatio="none" role="img" aria-label={`Cumulative prop firm spend and payouts from ${formatRowDate(firstDate)} to ${formatRowDate(lastDate)}`}>
        <g className={styles.gridLines}><line x1="22" y1="32" x2="878" y2="32" /><line x1="22" y1="144" x2="878" y2="144" /><line x1="22" y1="256" x2="878" y2="256" /></g>
        <polyline points={chart.spendLine} className={styles.spendLine} />
        <polyline points={chart.payoutLine} className={styles.payoutLine} />
        {chart.spendCoords.map((point, index) => <circle key={`${point.x}-${index}`} cx={point.x} cy={point.y} r="4" className={styles.chartPoint} />)}
        <g className={styles.chartLabels}><text x="22" y="292">{formatRowDate(firstDate).toUpperCase()}</text><text x="878" y="292" textAnchor="end">{formatRowDate(lastDate).toUpperCase()}</text></g>
      </svg>
    </div>
  );
}

function TrashButton({ onClick, label = "Delete" }) {
  return (
    <button type="button" className={styles.trashButton} onClick={onClick} aria-label={label}>
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 4h10M5.5 4V3a1 1 0 011-1h3a1 1 0 011 1v1M6 7v4M10 7v4M4 4l.5 9a1 1 0 001 1h5a1 1 0 001-1L12 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

export default function PropEconomics() {
  const [ledger, setLedger] = useState(EMPTY_LEDGER);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [firmFilter, setFirmFilter] = useState("all");
  const [addingFirm, setAddingFirm] = useState(false);
  const [newFirmName, setNewFirmName] = useState("");

  const persist = useCallback(async (next) => { setLedger(next); await saveLedger(next); }, []);

  useEffect(() => {
    (async () => { const data = await loadLedger(); setLedger(data); setLoading(false); })();
  }, []);

  const { totalPayouts, totalSpend, net } = useMemo(() => computeTotals(ledger.entries), [ledger.entries]);
  const filterFirms = useMemo(() => {
    const firms = new Set(ledger.firms);
    for (const entry of ledger.entries) if (entry.firm) firms.add(entry.firm);
    return [...firms].sort((a, b) => a.localeCompare(b));
  }, [ledger.firms, ledger.entries]);
  const filteredEntries = useMemo(() => {
    const rows = [...ledger.entries].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    return firmFilter === "all" ? rows : rows.filter((entry) => entry.firm === firmFilter);
  }, [ledger.entries, firmFilter]);
  const firmExposure = useMemo(() => {
    const totals = new Map();
    for (const entry of ledger.entries) {
      if (entry.type !== "spend") continue;
      totals.set(entry.firm, (totals.get(entry.firm) || 0) + (Number(entry.amount) || 0));
    }
    return [...totals.entries()].map(([firm, amount]) => ({ firm, amount })).sort((a, b) => b.amount - a.amount);
  }, [ledger.entries]);

  const openForm = (type) => { setFormMode(type); setEditingId(null); setForm(emptyForm(type)); setAddingFirm(false); setNewFirmName(""); };
  const openEdit = (entry) => {
    setFormMode(entry.type); setEditingId(entry.id);
    setForm({ date: entry.date, type: entry.type, firm: entry.firm, amount: String(entry.amount), category: entry.category || "eval", note: entry.note || "" });
    setAddingFirm(false); setNewFirmName("");
  };
  const closeForm = () => { setFormMode(null); setEditingId(null); setAddingFirm(false); setNewFirmName(""); };
  const handleFirmSelect = (value) => {
    if (value === ADD_FIRM_VALUE) { setAddingFirm(true); setNewFirmName(""); return; }
    setAddingFirm(false); setForm((current) => ({ ...current, firm: value }));
  };
  const confirmAddFirm = () => {
    const name = newFirmName.trim();
    if (!name) return;
    const firms = ledger.firms.includes(name) ? ledger.firms : [...ledger.firms, name];
    setLedger({ ...ledger, firms }); setForm((current) => ({ ...current, firm: name })); setAddingFirm(false); setNewFirmName("");
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.date || !form.firm || !amount || amount <= 0) { window.alert("Enter a valid date, firm, and positive amount."); return; }
    const firms = ledger.firms.includes(form.firm) ? ledger.firms : [...ledger.firms, form.firm];
    const entry = { id: editingId || newId(), date: form.date, type: formMode, firm: form.firm, amount, category: formMode === "spend" ? form.category : "payout", note: form.note.trim() || undefined };
    const entries = editingId ? ledger.entries.map((row) => row.id === editingId ? entry : row) : [...ledger.entries, entry];
    await persist({ firms, entries }); closeForm();
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    await persist({ ...ledger, entries: ledger.entries.filter((entry) => entry.id !== id) });
    if (editingId === id) closeForm();
  };

  if (loading) return <div className="pm-loading home-page--loop workflow-page--loop">Loading...</div>;

  const breakEvenRemaining = Math.max(totalSpend - totalPayouts, 0);
  const recoveryPercent = totalSpend > 0 ? Math.min((totalPayouts / totalSpend) * 100, 100) : 0;
  const topFirm = firmExposure[0];
  const netClass = net > 0 ? styles.positive : net < 0 ? styles.negative : styles.neutral;

  return (
    <WorkflowPageLayout>
      <div className={styles.page}>
        <div className={styles.topbar}>{headerDate()}</div>
        <header className={styles.header}>
          <div><p className={styles.eyebrow}>Prop profit tracker</p><h1>Prop profits<span className={styles.titleStop} aria-hidden="true" /></h1><p className={styles.intro}>Track what you paid prop firms versus what you withdrew. Know exactly where you stand before the next evaluation.</p></div>
          <div className={styles.actions}><button type="button" className={styles.secondaryAction} onClick={() => openForm("spend")}>Log spend <span>+</span></button><button type="button" className={styles.primaryAction} onClick={() => openForm("payout")}>Log payout <span>↗</span></button></div>
        </header>

        <section className={styles.positionGrid} aria-label="Prop economics summary">
          <article className={styles.netCard}>
            <div className={styles.cardTopline}><p>NET POSITION</p><span className={styles.phasePill}>{net >= 0 ? "In profit" : "Pre-payout phase"}</span></div>
            <div className={`${styles.netAmount} ${netClass}`}>{formatUsd(net, { signed: true })}</div>
            <div className={styles.breakEvenCopy}><span>{net >= 0 ? `${formatAmount(net)} in profit` : `${formatAmount(breakEvenRemaining)} to break even`}</span><span>{Math.round(recoveryPercent)}% recovered</span></div>
            <div className={styles.progressTrack}><span style={{ width: `${Math.max(recoveryPercent, 2)}%` }} /></div>
            <p className={styles.netNote}>{net >= 0 ? "Your prop payouts have cleared your recorded costs." : `Your next ${formatAmount(breakEvenRemaining)} in payouts clears the cost of your current prop journey.`}</p>
          </article>
          <div className={styles.metricStack}>
            <article className={styles.metricCard}><p>TOTAL PAYOUTS</p><strong>{formatAmount(totalPayouts)}</strong><span>{totalPayouts > 0 ? "Recovered capital" : "No payouts logged yet"}</span></article>
            <article className={styles.metricCard}><p>TOTAL SPEND</p><strong>{formatAmount(totalSpend)}</strong><span>Across {ledger.entries.filter((entry) => entry.type === "spend").length} spend entries</span></article>
          </div>
          <article className={styles.milestoneCard}><p className={styles.eyebrow}>NEXT MILESTONE</p><div className={styles.milestoneIcon}>01</div><h2>{net >= 0 ? "Grow the edge." : "First payout."}</h2><p>{net >= 0 ? "Keep the account profitable without letting fees outrun withdrawals." : "Turn evaluation spend into recovered capital, then move the account into profit."}</p><div className={styles.milestoneMeta}><span>{net >= 0 ? "Net profit" : "Break-even target"}</span><strong>{formatAmount(net >= 0 ? net : breakEvenRemaining)}</strong></div></article>
        </section>

        {formMode && (
          <section className={styles.formPanel} aria-labelledby="prop-entry-form-title">
            <div className={styles.formHeader}><div><p className={styles.eyebrow}>LEDGER ENTRY</p><h2 id="prop-entry-form-title">{editingId ? "Edit" : "Log"} {formMode}.</h2></div><button type="button" onClick={closeForm} aria-label="Close form">×</button></div>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <label><span>Date</span><input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} required /></label>
                <label><span>Firm</span>{!addingFirm ? <select value={form.firm} onChange={(event) => handleFirmSelect(event.target.value)}>{ledger.firms.map((firm) => <option key={firm} value={firm}>{firm}</option>)}<option value={ADD_FIRM_VALUE}>Add firm...</option></select> : <div className={styles.addFirm}><input type="text" placeholder="Firm name" value={newFirmName} onChange={(event) => setNewFirmName(event.target.value)} autoFocus /><button type="button" onClick={confirmAddFirm}>Add</button></div>}</label>
                <label><span>Amount ($)</span><input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} required /></label>
                {formMode === "spend" && <label><span>Category</span><select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>{SPEND_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>}
              </div>
              <label className={styles.noteField}><span>Note</span><textarea rows={2} placeholder="Optional" value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} /></label>
              <div className={styles.formActions}><button type="submit">{editingId ? "Save changes" : "Add entry"}</button><button type="button" onClick={closeForm}>Cancel</button></div>
            </form>
          </section>
        )}

        <section className={styles.trendSection} aria-labelledby="capital-flow-heading">
          <div className={styles.sectionHeader}><div><p className={styles.eyebrow}>CAPITAL FLOW</p><h2 id="capital-flow-heading">See the economics clearly.</h2><p>Every fee and payout, mapped against your break-even point.</p></div><div className={styles.legend}><span><i className={styles.payoutKey} /> Payouts {formatAmount(totalPayouts)}</span><span><i className={styles.spendKey} /> Spend {formatAmount(totalSpend)}</span></div></div>
          <div className={styles.chartLayout}>
            <article className={styles.chartCard}><CumulativeChart entries={ledger.entries} /></article>
            <aside className={styles.exposureCard}><div><p className={styles.eyebrow}>FIRM EXPOSURE</p><h3>Where your capital sits.</h3></div>{topFirm ? <><div className={styles.firmRow}><div className={styles.firmMonogram}>{topFirm.firm.slice(0, 1).toUpperCase()}</div><div><strong>{topFirm.firm}</strong><span>{ledger.entries.filter((entry) => entry.type === "spend" && entry.firm === topFirm.firm).length} spend entries</span></div><strong>{formatAmount(topFirm.amount)}</strong></div><div className={styles.exposureBar}><span style={{ width: `${totalSpend ? (topFirm.amount / totalSpend) * 100 : 0}%` }} /></div><div className={styles.exposureMeta}><span>Share of spend</span><strong>{totalSpend ? Math.round((topFirm.amount / totalSpend) * 100) : 0}%</strong></div><p className={styles.exposureNote}>{firmExposure.length === 1 ? "All current evaluation cost is concentrated with one firm." : `${firmExposure.length} firms currently make up your recorded prop spend.`}</p></> : <p className={styles.emptyExposure}>Log spend to reveal firm exposure.</p>}</aside>
          </div>
        </section>

        <section className={styles.ledgerSection} aria-labelledby="ledger-heading">
          <div className={styles.sectionHeader}><div><p className={styles.eyebrow}>LEDGER</p><h2 id="ledger-heading">Every dollar accounted for.</h2><p>All spend and payout entries in one clean record.</p></div><div className={styles.ledgerTools}><span>{filteredEntries.length} entries</span><select id="prop-firm-filter" value={firmFilter} onChange={(event) => setFirmFilter(event.target.value)} aria-label="Filter by firm"><option value="all">All firms</option>{filterFirms.map((firm) => <option key={firm} value={firm}>{firm}</option>)}</select></div></div>
          {filteredEntries.length === 0 ? <div className={styles.emptyLedger}>{firmFilter === "all" ? "No entries yet. Log your first spend or payout above." : `No entries for ${firmFilter}.`}</div> : <div className={styles.tableWrap}><table><thead><tr><th>Date</th><th>Type</th><th>Firm</th><th>Category</th><th>Note</th><th>Amount</th><th aria-label="Actions" /></tr></thead><tbody>{filteredEntries.map((entry) => <tr key={entry.id}><td>{formatRowDate(entry.date)}</td><td><span className={`${styles.typePill} ${entry.type === "payout" ? styles.payoutPill : ""}`}>{entry.type}</span></td><td><span className={styles.firmCell}><i>{entry.firm.slice(0, 1).toUpperCase()}</i>{entry.firm}</span></td><td>{entry.type === "spend" ? entry.category : "—"}</td><td className={styles.noteCell}>{entry.note || "—"}</td><td className={entry.type === "payout" ? styles.positiveAmount : styles.negativeAmount}>{entry.type === "payout" ? "+" : "−"}{formatAmount(entry.amount)}</td><td><div className={styles.rowActions}><button type="button" onClick={() => openEdit(entry)}>Edit ↗</button><TrashButton onClick={() => handleDelete(entry.id)} /></div></td></tr>)}</tbody></table></div>}
        </section>
      </div>
    </WorkflowPageLayout>
  );
}
