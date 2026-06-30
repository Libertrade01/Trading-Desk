"use client";

import { IconArrowRight } from "./onboarding-icons";
import BrandWordmark from "./BrandWordmark";

export function OnboardingStepHeader({ title, lead }) {
  return (
    <header className="onboarding-step-header">
      <h1 className="onboarding-step-title">{title}</h1>
      {lead ? <p className="onboarding-step-lead">{lead}</p> : null}
    </header>
  );
}

export function OnboardingSectionProgress({ sections, activeIndex }) {
  return (
    <div className="onboarding-progress" aria-hidden="true">
      {sections.map((section, i) => (
        <span
          key={section.id}
          className={`onboarding-progress-dot${i <= activeIndex ? " active" : ""}${i === activeIndex ? " current" : ""}`}
          title={section.label}
        />
      ))}
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

export default function OnboardingFlowLayout({ children, preview }) {
  return (
    <div className="premarket-page hybrid-page onboarding-page onboarding-page--flow">
      <BrandWordmark className="onboarding-page-brand" size="sidebar" />
      <div className="onboarding-welcome-glow" aria-hidden="true" />
      <div className="onboarding-welcome-layout">
        <div className="onboarding-flow-main">{children}</div>
        {preview}
      </div>
    </div>
  );
}
