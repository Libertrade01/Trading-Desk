"use client";

const STAGES = [
  { key: "pre", label: "Pre" },
  { key: "plan", label: "Plan" },
  { key: "post", label: "Post" },
];

export default function HistoryStagePipeline({ session, compact = false }) {
  const active = {
    pre: session?.hasPre,
    plan: session?.hasPlan,
    post: session?.hasPost,
  };

  return (
    <div className={`history-stage-pipeline${compact ? " history-stage-pipeline--compact" : ""}`}>
      {STAGES.map((stage, i) => (
        <div key={stage.key} className="history-stage-pipeline__item">
          <span
            className={`history-stage-pipeline__dot${active[stage.key] ? " active" : ""}`}
            title={`${stage.label}${active[stage.key] ? " complete" : " missing"}`}
          />
          {!compact && (
            <span className={`history-stage-pipeline__label${active[stage.key] ? " active" : ""}`}>
              {stage.label}
            </span>
          )}
          {i < STAGES.length - 1 && <span className="history-stage-pipeline__line" aria-hidden="true" />}
        </div>
      ))}
    </div>
  );
}
