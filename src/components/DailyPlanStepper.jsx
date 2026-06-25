"use client";

export const PLAN_STEPS = [
  {
    id: "bias",
    short: "Bias",
    label: "Bias & context",
    desc: "What you think the market is likely to do today, and how confident you are.",
  },
  {
    id: "levels",
    short: "Levels",
    label: "Key levels",
    desc: "The prices that matter today. Mark them now so you don't have to remember in the heat of the moment.",
  },
  {
    id: "setups",
    short: "Setups",
    label: "Setups",
    desc: "The specific patterns you'll trade. If a setup isn't here, you don't take it.",
  },
  {
    id: "risk",
    short: "Risk",
    label: "Risk parameters",
    desc: "Pre-committing to limits before you're emotional about them.",
  },
  {
    id: "focus",
    short: "Focus",
    label: "Session rules & focus",
    desc: "The intent for today, in your own words.",
  },
];

export default function DailyPlanStepper({ activeIndex, onSelect }) {
  return (
    <nav className="pm-closeout-stepper" aria-label="Session plan steps">
      <ol className="pm-closeout-stepper-list">
        {PLAN_STEPS.map((step, i) => {
          const active = i === activeIndex;
          const done = i < activeIndex;
          return (
            <li key={step.id} className="pm-closeout-stepper-item">
              <button
                type="button"
                className={`pm-closeout-stepper-btn${active ? " pm-closeout-stepper-btn--active" : ""}${done ? " pm-closeout-stepper-btn--done" : ""}`}
                onClick={() => onSelect(i)}
                aria-current={active ? "step" : undefined}
              >
                <span className="pm-closeout-stepper-track" aria-hidden="true">
                  <span className="pm-closeout-stepper-fill" />
                </span>
                <span className="pm-closeout-stepper-label">{step.short}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
