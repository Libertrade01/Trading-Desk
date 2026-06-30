"use client";

import { CHECKIN_RAIL_SECTIONS } from "./CheckInRail";

export default function CheckInHorizontalStepper({ activeIndex, onSelect }) {
  return (
    <nav className="pm-closeout-stepper" aria-label="Check-in progress">
      <ol className="pm-closeout-stepper-list">
        {CHECKIN_RAIL_SECTIONS.map((section, i) => {
          const active = i === activeIndex;
          const done = i < activeIndex;
          return (
            <li key={section.id} className="pm-closeout-stepper-item">
              <button
                type="button"
                className={`pm-closeout-stepper-btn${active ? " pm-closeout-stepper-btn--active" : ""}${done ? " pm-closeout-stepper-btn--done" : ""}`}
                onClick={() => onSelect(i)}
                aria-current={active ? "step" : undefined}
              >
                <span className="pm-closeout-stepper-track" aria-hidden="true">
                  <span className="pm-closeout-stepper-fill" />
                </span>
                <span className="pm-closeout-stepper-label">{section.stepLabel}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
