"use client";

export const CLOSEOUT_STEPS = [
  {
    id: "performance",
    short: "Perf",
    label: "Performance",
    desc: "The numbers from the session.",
  },
  {
    id: "process",
    short: "Process",
    label: "Process adherence",
    desc: "How well you executed your plan.",
  },
  {
    id: "flags",
    short: "Flags",
    label: "Behavioral flags",
    desc: "Honest answers help. Pattern recognition over time only works if you're truthful.",
  },
  {
    id: "close",
    short: "Close",
    label: "After the close",
    desc: "How you feel right now.",
  },
  {
    id: "journal",
    short: "Journal",
    label: "Journal",
    desc: "Three short prompts. Don't overthink them.",
  },
];

export default function PostMarketStepper({ activeIndex, onSelect }) {
  return (
    <nav className="pm-closeout-stepper" aria-label="Close-out steps">
      <ol className="pm-closeout-stepper-list">
        {CLOSEOUT_STEPS.map((step, i) => {
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
