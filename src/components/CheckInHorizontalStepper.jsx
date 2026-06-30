"use client";

import { CHECKIN_RAIL_SECTIONS } from "./CheckInRail";

export default function CheckInHorizontalStepper({ activeIndex, onSelect }) {
  return (
    <nav className="checkin-h-stepper" aria-label="Check-in progress">
      <ol className="checkin-h-stepper-list">
        {CHECKIN_RAIL_SECTIONS.map((section, i) => {
          const active = i === activeIndex;
          const done = i < activeIndex;
          return (
            <li key={section.id} className="checkin-h-stepper-item">
              <button
                type="button"
                className={`checkin-h-stepper-btn${active ? " checkin-h-stepper-btn--active" : ""}${done ? " checkin-h-stepper-btn--done" : ""}`}
                onClick={() => onSelect(i)}
                aria-current={active ? "step" : undefined}
              >
                <span className="checkin-h-stepper-num" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="checkin-h-stepper-label">{section.stepLabel}</span>
              </button>
              {i < CHECKIN_RAIL_SECTIONS.length - 1 && (
                <span className="checkin-h-stepper-line" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
