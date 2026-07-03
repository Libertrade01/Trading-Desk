"use client";

export const PLAN_STEPS = [
  {
    id: "bias",
    short: "Bias",
    label: "Today's lean",
    desc: "Your lean for the session and the reasons behind it.",
  },
  {
    id: "levels",
    short: "Levels",
    label: "Key levels",
    desc: "Overnight highs/lows, value edges, and decision points.",
  },
  {
    id: "setups",
    short: "Setups",
    label: "Setups",
    desc: "Playbook setups we're hunting today. If it isn't here, we don't force a different trade.",
  },
  {
    id: "risk",
    short: "Risk",
    label: "Risk Plan",
    desc: "Size, loss limit, and stop rules for today.",
  },
  {
    id: "focus",
    short: "Focus",
    label: "Today's intent",
    desc: "Rules, guardrail, and the commitment to follow them.",
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
