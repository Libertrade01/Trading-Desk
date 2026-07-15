"use client";

import { IconArrowRight } from "./onboarding-icons";

export function OnboardingBrand() {
  return (
    <img
      className="onboarding-page-brand"
      src="/brand/primary-wordmark-login-v3.png"
      alt="Libertrade LOOP"
    />
  );
}

export function OnboardingStepHeader({ title, lead }) {
  return (
    <header className="onboarding-step-header">
      <h1 className="onboarding-step-title">{title}</h1>
      {lead ? <p className="onboarding-step-lead">{lead}</p> : null}
    </header>
  );
}

export function OnboardingSectionProgress({ currentStep, totalSteps, sectionLabel }) {
  return (
    <div className="onboarding-progress-block" aria-label={`Setup step ${currentStep} of ${totalSteps}: ${sectionLabel}`}>
      <div className="onboarding-progress-meta">
        <span>SETUP WIZARD</span>
        <span>STEP {currentStep} OF {totalSteps} &nbsp;·&nbsp; {sectionLabel}</span>
      </div>
      <div className="onboarding-progress" aria-hidden="true">
        {Array.from({ length: totalSteps }, (_, index) => (
          <span
            key={index}
            className={`onboarding-progress-dot${index < currentStep ? " active" : ""}${index === currentStep - 1 ? " current" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}

export function OnboardingStepNav({
  showBack,
  onBack,
  onPrimary,
  primaryLabel,
  saving,
  secondaryAction,
}) {
  return (
    <div className="onboarding-flow-nav">
      {showBack ? (
        <button type="button" className="onboarding-flow-back" onClick={onBack} disabled={saving}>
          Back
        </button>
      ) : (
        <span className="onboarding-flow-nav-spacer" aria-hidden="true" />
      )}
      <div className="onboarding-flow-nav-actions">
        {secondaryAction}
        <button
          type="button"
          className="onboarding-welcome-cta onboarding-flow-cta"
          onClick={onPrimary}
          disabled={saving}
        >
          <span className="onboarding-welcome-cta-label">{primaryLabel}</span>
          {!saving && primaryLabel !== "Saving…" ? (
            <span className="onboarding-welcome-cta-arrow" aria-hidden="true">
              <IconArrowRight />
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}

export default function OnboardingFlowLayout({ children }) {
  return (
    <div className="premarket-page hybrid-page onboarding-page onboarding-page--flow">
      <OnboardingBrand />
      <div className="onboarding-welcome-glow" aria-hidden="true" />
      <div className="onboarding-welcome-layout">
        <div className="onboarding-flow-main">{children}</div>
      </div>
    </div>
  );
}
