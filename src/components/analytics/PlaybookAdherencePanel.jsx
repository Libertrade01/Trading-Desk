"use client";

import { playbookAdherenceLabel } from "../../lib/setup-adherence";
import AnalyticsStat from "./AnalyticsStat";

export default function PlaybookAdherencePanel({
  summary,
  trackingStart,
  setupBreakdown = [],
  onTrackingReset,
}) {
  if (!summary?.total) {
    return (
      <div>
        <div className="analytics-empty">
          No trades in the selected range since playbook tracking began
          {trackingStart ? ` (${trackingStart})` : ""}.
        </div>
        {trackingStart ? (
          <p className="an-playbook-tracking-note">
            Tracking since {trackingStart}
            {onTrackingReset ? (
              <>
                {" · "}
                <button type="button" className="analytics-link-btn" onClick={onTrackingReset}>
                  Reset anchor
                </button>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    );
  }

  const label = playbookAdherenceLabel(summary);
  const tone = label?.tone === "green" ? "positive" : label?.tone === "red" ? "negative" : "neutral";
  const statusColor =
    label?.tone === "green" ? "var(--green)" : label?.tone === "red" ? "var(--red)" : "var(--amber)";

  return (
    <div>
      <div className="an-playbook-hero">
        <AnalyticsStat
          label="Playbook"
          value={`${summary.playbookRate}%`}
          tone={tone}
          className="an-stat--hero"
        />
        <div className="an-playbook-status" style={{ color: statusColor }}>
          {label?.text}
        </div>
      </div>
      {setupBreakdown.length > 0 && (
        <details className="an-stats-more" open>
          <summary className="an-stats-more__toggle">By setup</summary>
          <div className="an-playbook-rows">
            {setupBreakdown.map((row) => (
              <div key={row.name} className="an-playbook-row">
                <span>{row.label}</span>
                <span className="an-stat__value an-stat__value--sm" style={{ color: row.color }}>
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
      {trackingStart ? (
        <p className="an-playbook-tracking-note">
          Tracking since {trackingStart}
          {onTrackingReset ? (
            <>
              {" · "}
              <button type="button" className="analytics-link-btn" onClick={onTrackingReset}>
                Reset anchor
              </button>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
