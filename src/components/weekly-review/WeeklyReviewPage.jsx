"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getCurrentProcessWeek,
  formatProcessWeekLabel,
  listBrowsableProcessWeeks,
  loadWeeklyProcessReview,
  saveReview,
  isReviewComplete,
  buildWeekComparison,
  formatPriorWeekDelta,
} from "../../lib/weekly-process-review";
import { BEHAVIORAL_FLAG_CATEGORIES } from "../../lib/postmarket-defaults";

function headerDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();
}

function formatScoreDelta(text) {
  if (!text || text.startsWith("Same")) return null;
  return text.replace(" vs prior week", " vs last week");
}

function WprScoreStat({ label, value, delta, tone }) {
  const deltaText = formatScoreDelta(delta);
  const valueTone = tone === "green" ? "pos" : tone === "red" ? "neg" : "";

  return (
    <div className="wpr-score-stat">
      <div className="wpr-score-stat__label">{label}</div>
      <div className={`wpr-score-stat__value${valueTone ? ` wpr-score-stat__value--${valueTone}` : ""}`}>
        {value}
      </div>
      {deltaText ? (
        <div
          className={`wpr-score-stat__delta${
            deltaText.startsWith("+")
              ? " wpr-score-stat__delta--up"
              : deltaText.startsWith("-")
                ? " wpr-score-stat__delta--down"
                : ""
          }`}
        >
          {deltaText}
        </div>
      ) : (
        <div className="wpr-score-stat__delta wpr-score-stat__delta--flat" aria-hidden="true">
          &nbsp;
        </div>
      )}
    </div>
  );
}

function FindingCard({ finding }) {
  return (
    <div className={`wpr-flag wpr-flag--${finding.severity}`}>
      <span className="wpr-flag__marker" aria-hidden="true" />
      <div className="wpr-flag__body">
        <div className="wpr-flag__title">{finding.title}</div>
        <div className="wpr-flag__detail">{finding.detail}</div>
      </div>
    </div>
  );
}

function deltaTone(deltaText, invertGood = false) {
  if (!deltaText || deltaText.startsWith("Same")) return undefined;
  const improved = deltaText.startsWith("+") ? !invertGood : invertGood;
  return improved ? "green" : "red";
}

function WeekComparisonTable({ summary, priorSummary }) {
  const rows = useMemo(
    () => buildWeekComparison(summary, priorSummary),
    [summary, priorSummary]
  );
  if (!rows.length) return null;

  return (
    <section className="wpr-section">
      <h2 className="wpr-section-title">Vs last week</h2>
      <p className="wpr-section-hint">Process scores compared to the prior Mon–Fri week.</p>
      <div className="wpr-compare-wrap">
        <table className="wpr-compare-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>This week</th>
              <th>Prior</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{row.current}</td>
                <td>{row.prior}</td>
                <td className={`wpr-compare-delta wpr-compare-delta--${deltaTone(row.delta, row.invertGood) || "neutral"}`}>
                  {row.delta || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WeeklyReviewContent({ data, manual, onManualChange, onSave, saving }) {
  const { summary, priorSummary, findings, days, priorFocusItems } = data;
  const complete = isReviewComplete(manual);

  const readinessDelta = useMemo(() => {
    if (summary.avgReadiness == null || priorSummary?.avgReadiness == null) return null;
    return summary.avgReadiness - priorSummary.avgReadiness;
  }, [summary, priorSummary]);

  const playbookDelta = formatPriorWeekDelta(summary.avgPlaybookPct, priorSummary?.avgPlaybookPct, { suffix: " pts" });
  const riskDelta = formatPriorWeekDelta(summary.riskPlanFollowed, priorSummary?.riskPlanFollowed, { suffix: " days" });

  return (
    <div className="wpr-main">
      <div className="wpr-main-head">
        <div className="wpr-main-eyebrow hybrid-eyebrow">{data.weekLabel}</div>
        <h1 className="wpr-main-title hybrid-title">Weekly Process Review</h1>
        <div className={`wpr-status-badge wpr-status-badge--${complete ? "complete" : "draft"}`}>
          {complete ? "Complete" : "Draft"}
        </div>
      </div>

      <section className="wpr-section">
        <label className="wpr-field-label hybrid-label" htmlFor="wpr-week-line">
          Week in one line
        </label>
        <input
          id="wpr-week-line"
          type="text"
          className="wpr-input"
          placeholder="Summarize the week in a single sentence…"
          value={manual.weekInOneLine}
          onChange={(e) => onManualChange({ ...manual, weekInOneLine: e.target.value })}
        />
      </section>

      <section className="wpr-section wpr-section--scorecard">
        <div className="wpr-score-hero">
          <WprScoreStat
            label="Avg readiness"
            value={summary.avgReadiness ?? "—"}
            delta={
              readinessDelta != null
                ? `${readinessDelta > 0 ? "+" : ""}${readinessDelta} vs prior week`
                : undefined
            }
            tone={
              summary.avgReadiness != null && summary.avgReadiness < 50
                ? "red"
                : summary.avgReadiness != null && summary.avgReadiness < 60
                  ? "amber"
                  : summary.avgReadiness != null
                    ? "green"
                    : undefined
            }
          />
          <WprScoreStat
            label="Playbook"
            value={summary.avgPlaybookPct != null ? `${summary.avgPlaybookPct}%` : "—"}
            delta={playbookDelta}
            tone={
              summary.avgPlaybookPct != null && summary.avgPlaybookPct < 80
                ? "amber"
                : summary.avgPlaybookPct != null
                  ? "green"
                  : undefined
            }
          />
          <WprScoreStat
            label="Risk plan"
            value={
              summary.riskPlanAnswered > 0
                ? `${summary.riskPlanFollowed}/${summary.riskPlanAnswered}`
                : "—"
            }
            delta={riskDelta}
            tone={
              summary.riskPlanAnswered > 0 &&
              summary.riskPlanFollowed === summary.riskPlanAnswered
                ? "green"
                : summary.riskPlanAnswered > summary.riskPlanFollowed
                  ? "red"
                  : undefined
            }
          />
        </div>
      </section>

      <section className="wpr-section">
        <h2 className="wpr-section-title">Behavioral breakdown</h2>
        <div className="wpr-behavior-grid">
          {BEHAVIORAL_FLAG_CATEGORIES.map((cat) => (
            <div key={cat.id} className="wpr-behavior-card">
              <div className="wpr-behavior-card__label">{cat.label}</div>
              <div className="wpr-behavior-card__count">
                {summary.categoryCounts[cat.id] || 0}
              </div>
            </div>
          ))}
        </div>
      </section>

      {findings.length > 0 && (
        <section className="wpr-section wpr-section--flags">
          <div className="wpr-flags-head">
            <h2 className="wpr-section-title">Flags</h2>
            <span className="wpr-flags-count">{findings.length}</span>
          </div>
          <div className="wpr-flags-list">
            {findings.map((f, i) => (
              <FindingCard key={`${f.severity}-${f.title}-${i}`} finding={f} />
            ))}
          </div>
        </section>
      )}

      <section className="wpr-section">
        <h2 className="wpr-section-title">Day by day</h2>
        <div className="wpr-day-table-wrap">
          <table className="wpr-day-table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Ready</th>
                <th>Flags</th>
                <th>Playbook</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {days.map((row) => (
                <tr key={row.date} className={row.hasActivity ? "" : "wpr-day-table__empty"}>
                  <td className="wpr-day-table__day">{row.dateLabel}</td>
                  <td>{row.readiness ?? "—"}</td>
                  <td className="wpr-day-table__flags">
                    {row.flagLabels.length ? row.flagLabels.join(", ") : "—"}
                  </td>
                  <td>{row.playbookPct != null ? `${row.playbookPct}%` : "—"}</td>
                  <td>{row.riskPlan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {priorSummary && <WeekComparisonTable summary={summary} priorSummary={priorSummary} />}

      {priorFocusItems.length > 0 && (
        <section className="wpr-section">
          <h2 className="wpr-section-title">Last week&apos;s focus — did you honor it?</h2>
          <div className="wpr-retro-list">
            {priorFocusItems.map((item, i) => (
              <div key={i} className="wpr-retro-row">
                <span className="wpr-retro-text">{item}</span>
                <div className="wpr-retro-btns">
                  <button
                    type="button"
                    className={`wpr-retro-btn${manual.focusRetrospective[item] === true ? " active yes" : ""}`}
                    onClick={() =>
                      onManualChange({
                        ...manual,
                        focusRetrospective: { ...manual.focusRetrospective, [item]: true },
                      })
                    }
                  >
                    Y
                  </button>
                  <button
                    type="button"
                    className={`wpr-retro-btn${manual.focusRetrospective[item] === false ? " active no" : ""}`}
                    onClick={() =>
                      onManualChange({
                        ...manual,
                        focusRetrospective: { ...manual.focusRetrospective, [item]: false },
                      })
                    }
                  >
                    N
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="wpr-section">
        <h2 className="wpr-section-title">Reflection</h2>
        <div className="wpr-reflections">
          <div className="wpr-field">
            <label className="wpr-field-label hybrid-label" htmlFor="wpr-pattern">
              What pattern showed up more than once?
            </label>
            <textarea
              id="wpr-pattern"
              className="wpr-textarea"
              rows={3}
              value={manual.reflections.pattern}
              onChange={(e) =>
                onManualChange({
                  ...manual,
                  reflections: { ...manual.reflections, pattern: e.target.value },
                })
              }
            />
          </div>
          <div className="wpr-field">
            <label className="wpr-field-label hybrid-label" htmlFor="wpr-broken">
              Which day broke the week, and what triggered it?
            </label>
            <textarea
              id="wpr-broken"
              className="wpr-textarea"
              rows={3}
              value={manual.reflections.brokenDay}
              onChange={(e) =>
                onManualChange({
                  ...manual,
                  reflections: { ...manual.reflections, brokenDay: e.target.value },
                })
              }
            />
          </div>
          <div className="wpr-field">
            <label className="wpr-field-label hybrid-label" htmlFor="wpr-diff">
              What will you do differently before the first trade next week?
            </label>
            <textarea
              id="wpr-diff"
              className="wpr-textarea"
              rows={3}
              value={manual.reflections.differently}
              onChange={(e) =>
                onManualChange({
                  ...manual,
                  reflections: { ...manual.reflections, differently: e.target.value },
                })
              }
            />
          </div>
        </div>
      </section>

      <section className="wpr-section">
        <h2 className="wpr-section-title">Focus next week</h2>
        <p className="wpr-section-hint">Exactly two focus items for the coming week.</p>
        <div className="wpr-focus-fields">
          <input
            type="text"
            className="wpr-input"
            placeholder="Focus item 1"
            value={manual.focusItems[0]}
            onChange={(e) => {
              const next = [...manual.focusItems];
              next[0] = e.target.value;
              onManualChange({ ...manual, focusItems: next });
            }}
          />
          <input
            type="text"
            className="wpr-input"
            placeholder="Focus item 2"
            value={manual.focusItems[1]}
            onChange={(e) => {
              const next = [...manual.focusItems];
              next[1] = e.target.value;
              onManualChange({ ...manual, focusItems: next });
            }}
          />
        </div>
      </section>

      <div className="wpr-save-bar">
        <button
          type="button"
          className="wpr-save-btn"
          disabled={saving}
          onClick={onSave}
        >
          {saving ? "Saving…" : complete ? "Save review" : "Save draft"}
        </button>
        {!complete && (
          <p className="wpr-save-hint">
            Complete when week in one line and both focus items are filled.
          </p>
        )}
      </div>
    </div>
  );
}

export default function WeeklyReviewPage() {
  const currentWeek = useMemo(() => getCurrentProcessWeek(), []);
  const [weeks, setWeeks] = useState([{ ...currentWeek, isCurrent: true }]);
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [data, setData] = useState(null);
  const [manual, setManual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refreshWeekList = useCallback(async () => {
    const list = await listBrowsableProcessWeeks();
    setWeeks(list);
    return list;
  }, []);

  const loadWeek = useCallback(async (week) => {
    if (!week?.start || !week?.end) return;
    setLoading(true);
    try {
      const result = await loadWeeklyProcessReview(week.start, week.end);
      setData(result);
      setManual(result.manual);
    } catch (err) {
      console.error("Weekly review load failed:", err);
      setData(null);
      setManual(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshWeekList();
  }, [refreshWeekList]);

  useEffect(() => {
    loadWeek(selectedWeek);
  }, [selectedWeek, loadWeek]);

  const handleSave = async () => {
    if (!manual || !selectedWeek) return;
    setSaving(true);
    const saved = await saveReview(selectedWeek.end, manual);
    setManual(saved);
    await refreshWeekList();
    setSaving(false);
  };

  const showWeekPicker = weeks.length > 1;

  if (loading) {
    return <div className="pm-loading">Loading...</div>;
  }

  if (!data || !manual) {
    return (
      <div className="wpr-page hybrid-page">
        <div className="pm-topbar">
          <span>{headerDate()}</span>
        </div>
        <div className="wpr-main">
          <p className="wpr-section-hint">Could not load this week. Check your connection and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wpr-page hybrid-page">
      <div className="pm-topbar">
        <span>{headerDate()}</span>
      </div>

      <div className={`wpr-layout${showWeekPicker ? "" : " wpr-layout--single"}`}>
        {showWeekPicker && (
          <aside className="wpr-sidebar" aria-label="Week list">
            <div className="wpr-sidebar-label hybrid-eyebrow">Reviews</div>
            {weeks.map((w) => (
              <button
                key={w.end}
                type="button"
                className={`wpr-week-item${selectedWeek.end === w.end ? " active" : ""}`}
                onClick={() => setSelectedWeek(w)}
              >
                <span className="wpr-week-item__label">
                  {w.isCurrent ? "This week · " : ""}
                  {formatProcessWeekLabel(w.start, w.end)}
                </span>
              </button>
            ))}
          </aside>
        )}

        {showWeekPicker && (
          <div className="wpr-mobile-week">
            <label className="wpr-mobile-week-label hybrid-label" htmlFor="wpr-week-select">
              Review
            </label>
            <select
              id="wpr-week-select"
              className="wpr-week-select"
              value={selectedWeek.end}
              onChange={(e) => {
                const w = weeks.find((wk) => wk.end === e.target.value);
                if (w) setSelectedWeek(w);
              }}
            >
              {weeks.map((w) => (
                <option key={w.end} value={w.end}>
                  {w.isCurrent ? "This week · " : ""}
                  {formatProcessWeekLabel(w.start, w.end)}
                </option>
              ))}
            </select>
          </div>
        )}

        <WeeklyReviewContent
          data={data}
          manual={manual}
          onManualChange={setManual}
          onSave={handleSave}
          saving={saving}
        />
      </div>
    </div>
  );
}
