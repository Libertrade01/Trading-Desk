"use client";

const LOOP_STEPS = [
  { id: "checkin", label: "Check-in" },
  { id: "plan", label: "Session plan" },
  { id: "playbook", label: "Trade playbook" },
  { id: "closeout", label: "Close the loop" },
];

const RAIL_ROWS = [
  { id: "loss", label: "Max loss", key: "maxLoss" },
  { id: "trades", label: "Max trades", key: "maxTrades" },
  { id: "size", label: "Position size", key: "positionSize" },
  { id: "recovery", label: "Recovery mode", key: "recovery" },
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

function PreviewCardBody({
  stepId,
  statusCtx,
  railValues,
  tradingDayTimezone,
  accountName,
}) {
  return (
    <>
      <p className="onboarding-preview-eyebrow hybrid-eyebrow">Today&apos;s loop</p>
      <ol className="onboarding-preview-loop">
        {LOOP_STEPS.map((item, index) => (
          <li key={item.id} className="onboarding-preview-loop-item">
            <span className="onboarding-preview-loop-label">{item.label}</span>
            <span className="onboarding-preview-loop-status">
              {loopStatus(stepId, index, statusCtx)}
            </span>
          </li>
        ))}
      </ol>

      <div className="onboarding-preview-divider" aria-hidden="true" />

      <p className="onboarding-preview-eyebrow hybrid-eyebrow">Risk rails</p>
      <ul className="onboarding-preview-rails">
        {RAIL_ROWS.map((row) => (
          <li key={row.id}>
            <span>{row.label}</span>
            <span>{railValues[row.key]}</span>
          </li>
        ))}
      </ul>

      {tradingDayTimezone && stepId !== "welcome" ? (
        <p className="onboarding-preview-foot">
          {accountName.trim() ? `${accountName.trim()} · ` : "Account · "}
          Trading day configured
        </p>
      ) : null}
    </>
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
  const basicsStarted = stepId !== "welcome";
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
  const isHero = variant === "hero";

  return (
    <aside
      className={`onboarding-preview${isHero ? " onboarding-preview--hero" : ""}`}
      aria-label="Preview of your daily loop"
    >
      <div
        className={`onboarding-preview-card${isHero ? " onboarding-preview-card--hero" : " onboarding-preview-card--compact"}`}
      >
        <PreviewCardBody
          stepId={stepId}
          statusCtx={statusCtx}
          railValues={railValues}
          tradingDayTimezone={tradingDayTimezone}
          accountName={accountName}
        />
      </div>
    </aside>
  );
}
