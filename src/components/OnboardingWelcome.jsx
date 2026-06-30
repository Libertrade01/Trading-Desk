"use client";

import { IconArrowRight, IconShieldCheck } from "./onboarding-icons";

export default function OnboardingWelcome({
  onContinue,
  saving = false,
  error = "",
  isFounder = false,
  onFounderTemplate,
}) {
  return (
    <div className="onboarding-welcome-main">
      <h1 className="onboarding-welcome-title">Build your daily trading loop.</h1>

      <p className="onboarding-welcome-lead">
        Prepare, trade your plan, manage risk, and close the loop after each session with a clear review.
      </p>

      {error ? <p className="onboarding-error">{error}</p> : null}

      <button
        type="button"
        className="onboarding-welcome-cta"
        onClick={onContinue}
        disabled={saving}
      >
        <span className="onboarding-welcome-cta-label">
          {saving ? "Saving…" : "Build my loop"}
        </span>
        {!saving ? (
          <span className="onboarding-welcome-cta-arrow" aria-hidden="true">
            <IconArrowRight />
          </span>
        ) : null}
      </button>

      <p className="onboarding-welcome-trust">
        <span className="onboarding-welcome-trust-icon" aria-hidden="true">
          <IconShieldCheck />
        </span>
        No broker connection needed. You can change everything later.
      </p>

      {isFounder ? (
        <button
          type="button"
          className="pm-btn-save-review onboarding-template-btn"
          onClick={onFounderTemplate}
          disabled={saving}
        >
          {saving ? "Applying…" : "Use Libertrade template"}
        </button>
      ) : null}
    </div>
  );
}
