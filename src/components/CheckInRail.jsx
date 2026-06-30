"use client";

import { readinessScoreColor } from "../lib/premarket-scoring";

const SECTIONS = [
  { id: "physical", label: "Physical", stepLabel: "Physical" },
  { id: "mental", label: "Mental", stepLabel: "Mental" },
  { id: "external", label: "External", stepLabel: "External" },
  { id: "preparation", label: "Prep", stepLabel: "Prep" },
];

export default function CheckInRail({
  activeIndex,
  onSelect,
  composite,
  dimensions,
  cautionActive,
}) {
  const scoreColor = readinessScoreColor(composite);

  return (
    <nav className="checkin-rail" aria-label="Check-in sections">
      <div className="checkin-rail-score">
        <span className="checkin-rail-score-label">Score</span>
        <span
          className={`checkin-rail-score-value${cautionActive ? " checkin-rail-score-value--caution" : ""}`}
          style={{ color: scoreColor }}
          aria-label={`Readiness ${composite} out of 100`}
        >
          {composite}
        </span>
        <span className="checkin-rail-score-denom">/100</span>
      </div>

      <ol className="checkin-rail-steps">
        {SECTIONS.map((section, i) => {
          const active = i === activeIndex;
          const done = i < activeIndex;
          const dimValue = dimensions?.[section.id];
          const showScore = active || done;
          return (
            <li
              key={section.id}
              className={`checkin-rail-step-item${active ? " checkin-rail-step-item--active" : ""}${done ? " checkin-rail-step-item--done" : ""}`}
            >
              <button
                type="button"
                className={`checkin-rail-step${active ? " checkin-rail-step--active" : ""}`}
                onClick={() => onSelect(i)}
                aria-current={active ? "step" : undefined}
                aria-label={`${section.label}${showScore ? `, ${dimValue} out of 100` : ""}`}
              >
                <span className="checkin-rail-step-num" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="checkin-rail-step-label">{section.label}</span>
                <span
                  className={`checkin-rail-step-score${showScore ? "" : " checkin-rail-step-score--pending"}`}
                  style={showScore ? { color: readinessScoreColor(dimValue) } : undefined}
                >
                  {showScore ? dimValue : "--"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { SECTIONS as CHECKIN_RAIL_SECTIONS };
