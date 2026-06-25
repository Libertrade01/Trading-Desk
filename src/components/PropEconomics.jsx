"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { storage } from "../lib/supabase";
import { formatUsd } from "../lib/history-data";
import { todayKey } from "../lib/today-key";

const STORAGE_KEY = "prop-ledger";
const DEFAULT_FIRMS = ["Lucid", "Tradeify"];
const SPEND_CATEGORIES = ["eval", "reset", "data", "other"];
const ADD_FIRM_VALUE = "__add_firm__";

const EMPTY_LEDGER = { firms: [...DEFAULT_FIRMS], entries: [] };

async function loadLedger() {
  try {
    const r = await storage.get(STORAGE_KEY);
    if (!r) return { ...EMPTY_LEDGER, firms: [...DEFAULT_FIRMS], entries: [] };
    const data = JSON.parse(r.value);
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
  } catch (e) {
    console.error("Prop ledger save:", e);
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
  return {
    date: todayKey(),
    type,
    firm: DEFAULT_FIRMS[0],
    amount: "",
    category: "eval",
    note: "",
  };
}

function formatRowDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatAmount(n) {
  return formatUsd(n, { signed: false });
}

function computeTotals(entries) {
  let totalPayouts = 0;
  let totalSpend = 0;
  for (const e of entries) {
    const amt = Number(e.amount) || 0;
    if (e.type === "payout") totalPayouts += amt;
    else totalSpend += amt;
  }
  return { totalPayouts, totalSpend, net: totalPayouts - totalSpend };
}

function buildCumulativeSeries(entries) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  let cumPayout = 0;
  let cumSpend = 0;
  return sorted.map((e) => {
    const amt = Number(e.amount) || 0;
    if (e.type === "payout") cumPayout += amt;
    else cumSpend += amt;
    return { date: e.date, cumPayout, cumSpend };
  });
}

function CumulativeChart({ entries }) {
  const series = useMemo(() => buildCumulativeSeries(entries), [entries]);

  const chart = useMemo(() => {
    if (series.length < 2) return null;
    const w = 400;
    const h = 120;
    const padX = 8;
    const padY = 12;
    const maxY = Math.max(
      ...series.flatMap((p) => [p.cumPayout, p.cumSpend]),
      1
    );
    const coords = (key) =>
      series.map((p, i) => {
        const x = padX + (i / (series.length - 1)) * (w - padX * 2);
        const y = padY + (1 - p[key] / maxY) * (h - padY * 2);
        return { x, y };
      });
    const payoutCoords = coords("cumPayout");
    const spendCoords = coords("cumSpend");
    return {
      w,
      h,
      payoutLine: payoutCoords.map((p) => `${p.x},${p.y}`).join(" "),
      spendLine: spendCoords.map((p) => `${p.x},${p.y}`).join(" "),
    };
  }, [series]);

  if (entries.length === 0) {
    return <p className="prop-chart-empty">Log spend and payouts to see cumulative trends.</p>;
  }

  if (!chart) {
    const last = series[0];
    return (
      <div className="prop-chart-compact">
        <span className="prop-chart-legend-item payout">Payouts {formatAmount(last.cumPayout)}</span>
        <span className="prop-chart-legend-item spend">Spend {formatAmount(last.cumSpend)}</span>
        <p className="prop-chart-compact-note">One more entry for trend line</p>
      </div>
    );
  }

  return (
    <div className="prop-chart-wrap">
      <div className="prop-chart-legend">
        <span className="prop-chart-legend-item payout">Cumulative payouts</span>
        <span className="prop-chart-legend-item spend">Cumulative spend</span>
      </div>
      <svg
        viewBox={`0 0 ${chart.w} ${chart.h}`}
        className="prop-chart"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline points={chart.spendLine} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
        <polyline points={chart.payoutLine} fill="none" stroke="var(--green)" strokeWidth="2.5" />
      </svg>
    </div>
  );
}

function TrashButton({ onClick, label = "Delete" }) {
  return (
    <button type="button" className="pm-icon-btn" onClick={onClick} aria-label={label}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 4h10M5.5 4V3a1 1 0 011-1h3a1 1 0 011 1v1M6 7v4M10 7v4M4 4l.5 9a1 1 0 001 1h5a1 1 0 001-1L12 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function PropEconomicsMetrics({ totalPayouts, totalSpend, net }) {
  const netClass = net > 0 ? "positive" : net < 0 ? "negative" : "neutral";

  return (
    <section className="prop-economics-hero" aria-label="Prop economics summary">
      <div className="prop-economics-hero-net">
        <span className="prop-economics-hero-cap">Net</span>
        <span className={`prop-economics-hero-net-value ${netClass}`}>
          {formatUsd(net, { signed: true })}
        </span>
      </div>
      <div className="prop-economics-hero-supporting">
        <div className="prop-economics-hero-stat">
          <span className="prop-economics-hero-cap">Total payouts</span>
          <span className={`prop-economics-hero-value${totalPayouts > 0 ? " positive" : ""}`}>
            {formatAmount(totalPayouts)}
          </span>
        </div>
        <div className="prop-economics-hero-stat prop-economics-hero-stat--subtle">
          <span className="prop-economics-hero-cap">Total spend</span>
          <span className="prop-economics-hero-value">{formatAmount(totalSpend)}</span>
        </div>
      </div>
    </section>
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

  const persist = useCallback(async (next) => {
    setLedger(next);
    await saveLedger(next);
  }, []);

  useEffect(() => {
    (async () => {
      const data = await loadLedger();
      setLedger(data);
      setLoading(false);
    })();
  }, []);

  const { totalPayouts, totalSpend, net } = useMemo(
    () => computeTotals(ledger.entries),
    [ledger.entries]
  );

  const filterFirms = useMemo(() => {
    const firms = new Set(ledger.firms);
    for (const e of ledger.entries) {
      if (e.firm) firms.add(e.firm);
    }
    return [...firms].sort((a, b) => a.localeCompare(b));
  }, [ledger.firms, ledger.entries]);

  const filteredEntries = useMemo(() => {
    const rows = [...ledger.entries].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    if (firmFilter === "all") return rows;
    return rows.filter((e) => e.firm === firmFilter);
  }, [ledger.entries, firmFilter]);

  const openForm = (type) => {
    setFormMode(type);
    setEditingId(null);
    setForm(emptyForm(type));
    setAddingFirm(false);
    setNewFirmName("");
  };

  const openEdit = (entry) => {
    setFormMode(entry.type);
    setEditingId(entry.id);
    setForm({
      date: entry.date,
      type: entry.type,
      firm: entry.firm,
      amount: String(entry.amount),
      category: entry.category || "eval",
      note: entry.note || "",
    });
    setAddingFirm(false);
    setNewFirmName("");
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingId(null);
    setAddingFirm(false);
    setNewFirmName("");
  };

  const handleFirmSelect = (value) => {
    if (value === ADD_FIRM_VALUE) {
      setAddingFirm(true);
      setNewFirmName("");
      return;
    }
    setAddingFirm(false);
    setForm((f) => ({ ...f, firm: value }));
  };

  const confirmAddFirm = () => {
    const name = newFirmName.trim();
    if (!name) return;
    const firms = ledger.firms.includes(name) ? ledger.firms : [...ledger.firms, name];
    const next = { ...ledger, firms };
    setLedger(next);
    setForm((f) => ({ ...f, firm: name }));
    setAddingFirm(false);
    setNewFirmName("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.date || !form.firm || !amount || amount <= 0) {
      window.alert("Enter a valid date, firm, and positive amount.");
      return;
    }

    let firms = ledger.firms;
    if (!firms.includes(form.firm)) {
      firms = [...firms, form.firm];
    }

    const entry = {
      id: editingId || newId(),
      date: form.date,
      type: formMode,
      firm: form.firm,
      amount,
      category: formMode === "spend" ? form.category : "payout",
      note: form.note.trim() || undefined,
    };

    const entries = editingId
      ? ledger.entries.map((row) => (row.id === editingId ? entry : row))
      : [...ledger.entries, entry];

    await persist({ firms, entries });
    closeForm();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    await persist({ ...ledger, entries: ledger.entries.filter((e) => e.id !== id) });
    if (editingId === id) closeForm();
  };

  if (loading) return <div className="pm-loading">Loading...</div>;

  return (
    <div className="premarket-page hybrid-page">
      <div className="pm-topbar">
        <span>{headerDate()}</span>
      </div>

      <div className="pm-closeout-layout">
        <div className="pm-closeout-main">
          <div className="pm-header">
            <div className="pm-eyebrow hybrid-eyebrow">Prop economics · all time</div>
            <h1 className="hybrid-page-title">THE BOTTOM LINE.</h1>
            <p className="pm-subtitle">
              Track what you paid prop firms versus what you withdrew. Know your true edge.
            </p>
          </div>

          <PropEconomicsMetrics
            totalPayouts={totalPayouts}
            totalSpend={totalSpend}
            net={net}
          />

          <div className="pm-closeout-stage">
            <div className="pm-section-panel">
              <div className="pm-section-panel-head">
                <div>
                  <h2 className="pm-section-title hybrid-section-title">Cumulative trend</h2>
                  <p className="pm-section-desc">Payouts vs spend over time.</p>
                </div>
                <div className="prop-panel-actions">
                  <button type="button" className="pm-add-btn" onClick={() => openForm("spend")}>
                    + Log spend
                  </button>
                  <button type="button" className="pm-add-btn prop-add-payout" onClick={() => openForm("payout")}>
                    + Log payout
                  </button>
                </div>
              </div>
              <div className="pm-section-panel-body">
                <CumulativeChart entries={ledger.entries} />
              </div>
            </div>

            {formMode && (
              <div className="pm-section-panel">
                <div className="pm-section-panel-head">
                  <div>
                    <h2 className="pm-section-title hybrid-section-title">
                      {editingId ? "Edit" : "Log"} {formMode === "spend" ? "spend" : "payout"}
                    </h2>
                    <p className="pm-section-desc">Add or update a ledger entry.</p>
                  </div>
                </div>
                <div className="pm-section-panel-body">
                  <form onSubmit={handleSubmit}>
                    <div className="pm-field-grid">
                      <div className="pm-field">
                        <div className="pm-field-label hybrid-label">Date</div>
                        <input
                          type="date"
                          className="pm-text-input"
                          value={form.date}
                          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="pm-field">
                        <div className="pm-field-label hybrid-label">Firm</div>
                        {!addingFirm ? (
                          <select
                            className="pm-select"
                            value={form.firm}
                            onChange={(e) => handleFirmSelect(e.target.value)}
                          >
                            {ledger.firms.map((f) => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                            <option value={ADD_FIRM_VALUE}>Add firm...</option>
                          </select>
                        ) : (
                          <div className="prop-add-firm-row">
                            <input
                              type="text"
                              className="pm-text-input"
                              placeholder="Firm name"
                              value={newFirmName}
                              onChange={(e) => setNewFirmName(e.target.value)}
                              autoFocus
                            />
                            <button type="button" className="pm-add-btn" onClick={confirmAddFirm}>Add</button>
                            <button type="button" className="pm-btn-link" onClick={() => setAddingFirm(false)}>Cancel</button>
                          </div>
                        )}
                      </div>
                      <div className="pm-field">
                        <div className="pm-field-label hybrid-label">Amount ($)</div>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          className="pm-number-input"
                          style={{ maxWidth: "100%" }}
                          value={form.amount}
                          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                          required
                        />
                      </div>
                      {formMode === "spend" && (
                        <div className="pm-field">
                          <div className="pm-field-label hybrid-label">Category</div>
                          <select
                            className="pm-select"
                            value={form.category}
                            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                          >
                            {SPEND_CATEGORIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    <div className="pm-field">
                      <div className="pm-field-label hybrid-label">Note</div>
                      <textarea
                        className="pm-textarea"
                        rows={2}
                        placeholder="Optional"
                        value={form.note}
                        onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                      />
                    </div>
                    <div className="prop-form-actions">
                      <button type="submit" className="pm-btn-return">
                        {editingId ? "Save changes" : "Add entry"}
                      </button>
                      <button type="button" className="pm-btn-link" onClick={closeForm}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="pm-section-panel">
              <div className="pm-section-panel-head">
                <div>
                  <h2 className="pm-section-title hybrid-section-title">Ledger</h2>
                  <p className="pm-section-desc">All spend and payout entries.</p>
                </div>
                <div className="prop-ledger-head-meta">
                  <div className="prop-ledger-filter">
                    <label htmlFor="prop-firm-filter" className="hybrid-label-sm prop-ledger-filter-label">
                      Firm
                    </label>
                    <select
                      id="prop-firm-filter"
                      className="pm-select prop-ledger-filter-select"
                      value={firmFilter}
                      onChange={(e) => setFirmFilter(e.target.value)}
                    >
                      <option value="all">All firms</option>
                      {filterFirms.map((firm) => (
                        <option key={firm} value={firm}>{firm}</option>
                      ))}
                    </select>
                  </div>
                  <span className="pm-section-step hybrid-label-sm">{filteredEntries.length} entries</span>
                </div>
              </div>

              <div className="pm-section-panel-body">
                {filteredEntries.length === 0 ? (
                  <p className="prop-ledger-empty">
                    {firmFilter === "all"
                      ? "No entries yet. Log your first spend or payout above."
                      : `No entries for ${firmFilter}.`}
                  </p>
                ) : (
                  <div className="prop-ledger-table-wrap">
                    <table className="prop-ledger-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Firm</th>
                          <th>Amount</th>
                          <th>Category</th>
                          <th>Note</th>
                          <th aria-label="Actions" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEntries.map((entry) => (
                          <tr key={entry.id}>
                            <td>{formatRowDate(entry.date)}</td>
                            <td>
                              <span className={`prop-type-tag ${entry.type}`}>
                                {entry.type}
                              </span>
                            </td>
                            <td>{entry.firm}</td>
                            <td className={entry.type === "payout" ? "pos" : "dim"}>
                              {entry.type === "payout" ? "+" : "−"}{formatAmount(entry.amount)}
                            </td>
                            <td>{entry.type === "spend" ? entry.category : "—"}</td>
                            <td className="prop-ledger-note">{entry.note || "—"}</td>
                            <td>
                              <div className="prop-ledger-actions">
                                <button type="button" className="pm-btn-link" onClick={() => openEdit(entry)}>Edit</button>
                                <TrashButton onClick={() => handleDelete(entry.id)} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
