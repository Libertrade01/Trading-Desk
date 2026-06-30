"use client";

import { readinessScoreColor, readinessStatus } from "../lib/premarket-scoring";

const SECTIONS = [
  { id: "physical", label: "Physical", stepLabel: "Physical" },
  { id: "mental", label: "Mental", stepLabel: "Mental" },
  { id: "external", label: "External", stepLabel: "External" },
  { id: "preparation", label: "Prep", stepLabel: "Prep" },
];

function readinessPanelCopy(score, cautionActive) {
  if (cautionActive) {
    return {
      headline: "Below 50",
      advice: "Acknowledge defense day to continue.",
    };
  }
  if (score >= 70) {
    return { headline: "Ready to trade", advice: "Proceed with your plan." };
  }
  if (score >= 50) {
    return { headline: "Trade light", advice: "Proceed with discipline." };
  }
  return { headline: "Below 50", advice: "Proceed with discipline." };
}

export default function CheckInRail({
  activeIndex,
  onSelect,
  composite,
  dimensions,
  cautionActive,
}) {
  const status = readinessStatus(composite);
  const copy = readinessPanelCopy(composite, cautionActive);

  return (
    <aside
      className={`checkin-meter-panel checkin-meter-panel--${status.tone}${cautionActive ? " checkin-meter-panel--caution" : ""}`}
      aria-label="Readiness overview"
    >
      <header className="checkin-meter-hero">
        <p className="checkin-meter-eyebrow hybrid-eyebrow">Readiness</p>
        <div className="checkin-meter-score-row">
          <span
            className="checkin-meter-score"
            aria-label={`Readiness score ${composite} out of 100, ${status.label}`}
          >
            {composite}
          </span>
          <span className="checkin-meter-score-max">/100</span>
        </div>
        <div className="checkin-meter-composite-track" aria-hidden="true">
          <span
            className="checkin-meter-composite-fill"
            style={{ width: `${composite}%` }}
          />
        </div>
        <p className={`checkin-meter-headline checkin-meter-headline--${status.tone}`}>
          {copy.headline}
        </p>
        <p className="checkin-meter-advice">{copy.advice}</p>
      </header>

      <nav aria-label="Check-in sections">
        <ul className="checkin-meter-dims">
          {SECTIONS.map((section, i) => {
            const active = i === activeIndex;
            const done = i < activeIndex;
            const dimValue = dimensions?.[section.id];
            const showScore = active || done;

            return (
              <li key={section.id} className="checkin-meter-dim-item">
                <button
                  type="button"
                  className={`checkin-meter-row${active ? " checkin-meter-row--active" : ""}${done ? " checkin-meter-row--done" : ""}${!showScore ? " checkin-meter-row--pending" : ""}`}
                  onClick={() => onSelect(i)}
                  aria-current={active ? "step" : undefined}
                  aria-label={`${section.label}${showScore ? `, ${dimValue} out of 100` : ""}`}
                >
                  <span
                    className={`checkin-meter-row-dot${active ? " checkin-meter-row-dot--active" : ""}${done ? " checkin-meter-row-dot--done" : ""}`}
                    aria-hidden="true"
                  />
                  <span className="checkin-meter-row-label">{section.label}</span>
                  <span
                    className="checkin-meter-row-score"
                    style={showScore ? { color: readinessScoreColor(dimValue) } : undefined}
                  >
                    {showScore ? dimValue : "--"}
                  </span>
                  <span className="checkin-meter-row-chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

export { SECTIONS as CHECKIN_RAIL_SECTIONS };
