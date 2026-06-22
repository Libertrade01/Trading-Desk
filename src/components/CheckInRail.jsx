"use client";

import { readinessScoreColor } from "../lib/premarket-scoring";

const SECTIONS = [
  { id: "physical", rail: "P", label: "Physical" },
  { id: "mental", rail: "M", label: "Mental" },
  { id: "external", rail: "E", label: "External" },
  { id: "preparation", rail: "Pr", label: "Preparation" },
];

function dimTone(value) {
  if (value == null) return "var(--muted)";
  return readinessScoreColor(value);
}

export default function CheckInRail({
  activeIndex,
  onSelect,
  composite,
  dimensions,
  scoreLive,
  cautionActive,
}) {
  const scoreColor = scoreLive ? readinessScoreColor(composite) : "var(--muted)";

  return (
    <nav className="pm-rail" aria-label="Check-in sections">
      <div className="pm-rail-score-block">
        <span className="pm-rail-score-label hybrid-label-sm">Score</span>
        <span
          className={`pm-rail-score-value${cautionActive ? " pm-rail-score-value--caution" : ""}`}
          style={{ color: scoreColor }}
          aria-label={scoreLive ? `Readiness ${composite} out of 100` : "Readiness pending — fill in your check-in"}
        >
          {composite}
        </span>
      </div>

      <div className="pm-rail-divider" aria-hidden="true" />

      <ol className="pm-rail-steps">
        {SECTIONS.map((section, i) => {
          const active = i === activeIndex;
          const dimValue = dimensions?.[section.id];
          return (
            <li key={section.id}>
              <button
                type="button"
                className={`pm-rail-step${active ? " pm-rail-step--active" : ""}`}
                onClick={() => onSelect(i)}
                aria-current={active ? "step" : undefined}
                aria-label={`${section.label}${dimValue != null ? `, ${dimValue} out of 100` : ""}`}
              >
                <span className="pm-rail-dot" aria-hidden="true" />
                <span className="pm-rail-step-key">{section.rail}</span>
                {scoreLive && dimValue != null ? (
                  <span className="pm-rail-step-score" style={{ color: dimTone(dimValue) }}>
                    {dimValue}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { SECTIONS as CHECKIN_RAIL_SECTIONS };
