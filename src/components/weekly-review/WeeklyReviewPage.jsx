"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getRecentProcessWeeks,
  formatProcessWeekLabel,
  loadWeeklyProcessReview,
  saveReview,
  isReviewComplete,
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

function ScoreTile({ label, value, sub, tone }) {
  return (
    <div className={`wpr-score-tile${tone ? ` wpr-score-tile--${tone}` : ""}`}>
      <div className="wpr-score-tile__value">{value}</div>
      <div className="wpr-score-tile__label">{label}</div>
      {sub && <div className="wpr-score-tile__sub">{sub}</div>}
    </div>
  );
}

function FindingCard({ finding }) {
  return (
    <div className={`wpr-finding wpr-finding--${finding.severity}`}>
      <div className="wpr-finding__title">{finding.title}</div>
      <div className="wpr-finding__detail">{finding.detail}</div>
    </div>
  );
}

function StageDot({ done, label }) {
  return (
    <span
      className={`wpr-stage-dot${done ? " done" : ""}`}
      title={label}
      aria-label={`${label}: ${done ? "done" : "missing"}`}
    >
      {label.charAt(0).toUpperCase()}
    </span>
  );
}

function WeeklyReviewContent({ data, manual, onManualChange, onSave, saving }) {
  const { summary, priorSummary, findings, days, priorFocusItems } = data;
  const complete = isReviewComplete(manual);

  const readinessDelta = useMemo(() => {
    if (summary.avgReadiness == null || priorSummary?.avgReadiness == null) return null;
    return summary.avgReadiness - priorSummary.avgReadiness;
  }, [summary, priorSummary]);

  const workflowLabel =
    summary.tradingDays > 0
      ? `${summary.fullLoopDays}/${summary.tradingDays}`
      : "—";

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

      <section className="wpr-section">
        <h2 className="wpr-section-title">Scorecard</h2>
        <div className="wpr-scorecard">
          <ScoreTile
            label="Workflow"
            value={workflowLabel}
            sub={summary.workflowPct != null ? `${summary.workflowPct}% complete` : "No trading days"}
            tone={summary.workflowPct === 100 ? "green" : summary.workflowPct != null && summary.workflowPct < 100 ? "amber" : undefined}
          />
          <ScoreTile
            label="Avg readiness"
            value={summary.avgReadiness ?? "—"}
            sub={
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
          <ScoreTile
            label="Playbook"
            value={summary.avgPlaybookPct != null ? `${summary.avgPlaybookPct}%` : "—"}
            sub="Setup adherence"
            tone={
              summary.avgPlaybookPct != null && summary.avgPlaybookPct < 80
                ? "amber"
                : summary.avgPlaybookPct != null
                  ? "green"
                  : undefined
            }
          />
          <ScoreTile
            label="Risk plan"
            value={
              summary.riskPlanAnswered > 0
                ? `${summary.riskPlanFollowed}/${summary.riskPlanAnswered}`
                : "—"
            }
            sub="Days followed"
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

      {findings.length > 0 && (
        <section className="wpr-section">
          <h2 className="wpr-section-title">Flags</h2>
          <div className="wpr-findings">
            {findings.map((f, i) => (
              <FindingCard key={`${f.severity}-${f.title}-${i}`} finding={f} />
            ))}
          </div>
        </section>
      )}

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

      <section className="wpr-section">
        <h2 className="wpr-section-title">Day by day</h2>
        <div className="wpr-day-table-wrap">
          <table className="wpr-day-table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Ready</th>
                <th>Workflow</th>
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
                  <td>
                    {row.hasActivity ? (
                      <span className="wpr-day-stages">
                        <StageDot done={row.hasPre} label="pre" />
                        <StageDot done={row.hasPlan} label="plan" />
                        <StageDot done={row.hasPost} label="post" />
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
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
  const weeks = useMemo(() => getRecentProcessWeeks(8), []);
  const [selectedWeek, setSelectedWeek] = useState(() => weeks[0]);
  const [data, setData] = useState(null);
  const [manual, setManual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    loadWeek(selectedWeek);
  }, [selectedWeek, loadWeek]);

  const handleSave = async () => {
    if (!manual || !selectedWeek) return;
    setSaving(true);
    const saved = await saveReview(selectedWeek.end, manual);
    setManual(saved);
    setSaving(false);
  };

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

      <div className="wpr-layout">
        <aside className="wpr-sidebar" aria-label="Week list">
          <div className="wpr-sidebar-label hybrid-eyebrow">Weeks</div>
          {weeks.map((w) => (
            <button
              key={w.end}
              type="button"
              className={`wpr-week-item${selectedWeek.end === w.end ? " active" : ""}`}
              onClick={() => setSelectedWeek(w)}
            >
              {formatProcessWeekLabel(w.start, w.end)}
            </button>
          ))}
        </aside>

        <div className="wpr-mobile-week">
          <label className="wpr-mobile-week-label hybrid-label" htmlFor="wpr-week-select">
            Week
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
                {formatProcessWeekLabel(w.start, w.end)}
              </option>
            ))}
          </select>
        </div>

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
