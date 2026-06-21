"use client";

import { playbookAdherenceLabel } from "../../lib/setup-adherence";
import AnalyticsStat from "./AnalyticsStat";

export default function PlaybookAdherencePanel({ summary, trackingStart }) {
  if (!summary?.total) {
    return (
      <div className="analytics-empty">
        No trades in the selected range since playbook tracking began
        {trackingStart ? ` (${trackingStart})` : ""}.
      </div>
    );
  }

  const label = playbookAdherenceLabel(summary);
  const tone = label?.tone === "green" ? "positive" : label?.tone === "red" ? "negative" : "neutral";
  const statusColor =
    label?.tone === "green" ? "var(--green)" : label?.tone === "red" ? "var(--red)" : "var(--amber)";

  const rows = [
    ["Playbook", summary.playbook, "var(--green)"],
    ["Improvised", summary.improvised, "var(--amber)"],
    ["Invalid", summary.invalid, "var(--red)"],
    ["Untagged", summary.untagged, "var(--muted)"],
  ].filter((r) => r[1] > 0);

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
      {rows.length > 0 && (
        <details className="an-stats-more">
          <summary className="an-stats-more__toggle">Breakdown</summary>
          <div className="an-playbook-rows">
            {rows.map(([name, count, color]) => (
              <div key={name} className="an-playbook-row">
                <span>{name}</span>
                <span className="an-stat__value an-stat__value--sm" style={{ color }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
