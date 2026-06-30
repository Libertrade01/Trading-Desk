"use client";

const LOOP_STEPS = [
  { id: "checkin", label: "Check-in", locked: false },
  { id: "plan", label: "Session plan", locked: false },
  { id: "playbook", label: "Trade playbook", locked: false },
  { id: "closeout", label: "Close the loop", locked: true },
];

function formatRail(value, fallback = "Not set") {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || fallback;
}

export default function OnboardingLoopPreview({
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

  function recoveryLabel() {
    if (!riskConfigured) return "Not set";
    return drawdownRecoveryEnabled ? "On" : "Off";
  }

  function loopStatus(index) {
    if (stepId === "welcome") return "Not started";
    if (index === 0) return basicsStarted ? "Ready when you are" : "Next up";
    if (index === 1) return processStarted ? "Ready when you are" : "Waiting";
    if (index === 2) return setupCount > 0 ? "Playbook loading" : "Waiting";
    return "After the session";
  }

  return (
    <aside className="onboarding-preview" aria-label="Preview of your daily loop">
      <div className="onboarding-preview-card">
        <div className="onboarding-preview-brand">
          Liber<span>trade</span> Loop
        </div>
        <div className="onboarding-preview-eyebrow hybrid-eyebrow">Today&apos;s loop</div>

        <ol className="onboarding-preview-loop">
          {LOOP_STEPS.map((item, index) => (
            <li key={item.id} className="onboarding-preview-loop-item">
              <span className="onboarding-preview-loop-num">{index + 1}</span>
              <span className="onboarding-preview-loop-label">{item.label}</span>
              <span className="onboarding-preview-loop-status">{loopStatus(index)}</span>
            </li>
          ))}
        </ol>

        <div className="onboarding-preview-divider" />

        <div className="onboarding-preview-eyebrow hybrid-eyebrow">Risk rails</div>
        <ul className="onboarding-preview-rails">
          <li>
            <span>Max loss</span>
            <span>{formatRail(defaultMaxDailyLoss)}</span>
          </li>
          <li>
            <span>Max trades</span>
            <span>{formatRail(defaultMaxTrades)}</span>
          </li>
          <li>
            <span>Position size</span>
            <span>{formatRail(defaultPositionSize)}</span>
          </li>
          <li>
            <span>Recovery mode</span>
            <span>{recoveryLabel()}</span>
          </li>
        </ul>

        {tradingDayTimezone && stepId !== "welcome" && (
          <p className="onboarding-preview-foot">
            {accountName.trim()
              ? `${accountName.trim()} · `
              : "Account · "}
            Trading day configured
          </p>
        )}
      </div>
    </aside>
  );
}
