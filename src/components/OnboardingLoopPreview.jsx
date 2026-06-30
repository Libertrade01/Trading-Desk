"use client";

import {
  IconClock,
  IconEye,
  IconHash,
  IconLayers,
  IconRefresh,
  IconShield,
  IconTrendDown,
} from "./onboarding-icons";

const LOOP_STEPS = [
  {
    id: "checkin",
    label: "Check-in",
    description: "Center your focus and set your intention.",
  },
  {
    id: "plan",
    label: "Session plan",
    description: "Define your plan and key levels.",
  },
  {
    id: "playbook",
    label: "Trade playbook",
    description: "Execute your plan with discipline.",
  },
  {
    id: "closeout",
    label: "Close the loop",
    description: "Review, reflect, and capture lessons.",
  },
];

const RAIL_ROWS = [
  { id: "loss", label: "Max loss", Icon: IconTrendDown, key: "maxLoss" },
  { id: "trades", label: "Max trades", Icon: IconHash, key: "maxTrades" },
  { id: "size", label: "Position size", Icon: IconLayers, key: "positionSize" },
  { id: "recovery", label: "Recovery mode", Icon: IconRefresh, key: "recovery" },
];

function formatRail(value, fallback = "Not set") {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || fallback;
}

function loopStatus(stepId, index, { basicsStarted, processStarted, setupCount }) {
  if (stepId === "welcome") return "Not started";
  if (index === 0) return basicsStarted ? "Ready" : "Not started";
  if (index === 1) return processStarted ? "Ready" : "Not started";
  if (index === 2) return setupCount > 0 ? "Ready" : "Not started";
  return "Not started";
}

function railsAllUnset({
  defaultMaxDailyLoss,
  defaultMaxTrades,
  defaultPositionSize,
  recoveryLabel,
}) {
  return (
    !defaultMaxDailyLoss.trim() &&
    !defaultMaxTrades.trim() &&
    !defaultPositionSize.trim() &&
    recoveryLabel === "Not set"
  );
}

export default function OnboardingLoopPreview({
  variant = "hero",
  stepId,
  tradingDayTimezone,
  accountName,
  setups,
  defaultMaxDailyLoss,
  defaultMaxTrades,
  defaultPositionSize,
  drawdownRecoveryEnabled,
}) {
  const setupCount = setups.filter((s) => s.name.trim()).length;
  const basicsStarted = stepId !== "welcome" && stepId !== "timezone";
  const processStarted = ["commitment", "plan-rails", "drawdown-recovery", "streaks", "extras"].includes(
    stepId,
  );
  const riskConfigured = ["drawdown-recovery", "streaks", "extras"].includes(stepId);

  const recoveryLabel = (() => {
    if (!riskConfigured) return "Not set";
    return drawdownRecoveryEnabled ? "On" : "Off";
  })();

  const railValues = {
    maxLoss: formatRail(defaultMaxDailyLoss),
    maxTrades: formatRail(defaultMaxTrades),
    positionSize: formatRail(defaultPositionSize),
    recovery: recoveryLabel,
  };

  const statusCtx = { basicsStarted, processStarted, setupCount };
  const sectionRailsUnset = railsAllUnset({
    defaultMaxDailyLoss,
    defaultMaxTrades,
    defaultPositionSize,
    recoveryLabel,
  });

  if (variant === "compact") {
    return (
      <aside className="onboarding-preview" aria-label="Preview of your daily loop">
        <div className="onboarding-preview-card onboarding-preview-card--compact">
          <div className="onboarding-preview-brand">
            Liber<span>trade</span> Loop
          </div>
          <div className="onboarding-preview-eyebrow hybrid-eyebrow">Today&apos;s loop</div>
          <ol className="onboarding-preview-loop">
            {LOOP_STEPS.map((item, index) => (
              <li key={item.id} className="onboarding-preview-loop-item">
                <span className="onboarding-preview-loop-num">{index + 1}</span>
                <span className="onboarding-preview-loop-label">{item.label}</span>
                <span className="onboarding-preview-loop-status">
                  {loopStatus(stepId, index, statusCtx)}
                </span>
              </li>
            ))}
          </ol>
          <div className="onboarding-preview-divider" />
          <div className="onboarding-preview-eyebrow hybrid-eyebrow">Risk rails</div>
          <ul className="onboarding-preview-rails">
            {RAIL_ROWS.map((row) => (
              <li key={row.id}>
                <span>{row.label}</span>
                <span>{railValues[row.key]}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    );
  }

  return (
    <aside className="onboarding-preview onboarding-preview--hero" aria-label="Preview of your daily loop">
      <div className="onboarding-preview-card onboarding-preview-card--hero">
        <div className="onboarding-preview-card-head">
          <div className="onboarding-preview-brand onboarding-preview-brand--card">
            Liber<span>trade</span> Loop
          </div>
          <span className="onboarding-preview-badge">
            <IconEye />
            Preview
          </span>
        </div>

        <section className="onboarding-preview-module">
          <div className="onboarding-preview-module-head">
            <h3 className="onboarding-preview-module-title">
              <IconClock />
              Today&apos;s Loop
            </h3>
            <span className="onboarding-preview-module-meta">4 steps</span>
          </div>

          <ol className="onboarding-preview-timeline">
            {LOOP_STEPS.map((item, index) => {
              const status = loopStatus(stepId, index, statusCtx);
              const isFirst = index === 0;
              const isLast = index === LOOP_STEPS.length - 1;
              return (
                <li
                  key={item.id}
                  className={`onboarding-preview-timeline-item${isLast ? " onboarding-preview-timeline-item--last" : ""}`}
                >
                  <div className="onboarding-preview-timeline-rail" aria-hidden="true">
                    <span
                      className={`onboarding-preview-step-dot${isFirst ? " onboarding-preview-step-dot--active" : ""}`}
                    >
                      {index + 1}
                    </span>
                    {!isLast ? <span className="onboarding-preview-step-line" /> : null}
                  </div>
                  <div className="onboarding-preview-timeline-body">
                    <div className="onboarding-preview-timeline-row">
                      <span className="onboarding-preview-timeline-label">{item.label}</span>
                      <span className="onboarding-preview-status-pill">{status}</span>
                    </div>
                    <p className="onboarding-preview-timeline-desc">{item.description}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="onboarding-preview-module onboarding-preview-module--rails">
          <div className="onboarding-preview-module-head">
            <h3 className="onboarding-preview-module-title">
              <IconShield />
              Risk Rails
            </h3>
            {sectionRailsUnset ? (
              <span className="onboarding-preview-status-pill">Not set</span>
            ) : null}
          </div>

          <ul className="onboarding-preview-rail-rows">
            {RAIL_ROWS.map((row) => {
              const Icon = row.Icon;
              const value = railValues[row.key];
              return (
                <li key={row.id} className="onboarding-preview-rail-row">
                  <span className="onboarding-preview-rail-row-left">
                    <span className="onboarding-preview-rail-icon">
                      <Icon />
                    </span>
                    {row.label}
                  </span>
                  <span className="onboarding-preview-rail-value">{value}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {tradingDayTimezone && stepId !== "welcome" ? (
          <p className="onboarding-preview-foot">
            {accountName.trim() ? `${accountName.trim()} · ` : "Account · "}
            Trading day configured
          </p>
        ) : null}
      </div>
    </aside>
  );
}
