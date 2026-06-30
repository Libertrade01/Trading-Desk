"use client";

import {
  IconArrowRight,
  IconBook,
  IconCalendar,
  IconRecovery,
  IconShield,
  IconShieldCheck,
  IconUser,
} from "./onboarding-icons";

const SETUP_TILES = [
  { id: "day", label: "Trading day", Icon: IconCalendar },
  { id: "account", label: "Account", Icon: IconUser },
  { id: "playbook", label: "Playbook", Icon: IconBook },
  { id: "risk", label: "Risk limits", Icon: IconShield },
  { id: "recovery", label: "Recovery rules", Icon: IconRecovery },
];

export default function OnboardingWelcome({
  onContinue,
  saving = false,
  error = "",
  isFounder = false,
  onFounderTemplate,
}) {
  return (
    <div className="onboarding-welcome-main">
      <div className="onboarding-welcome-brand auth-brand">
        Liber<span>trade</span> Loop
      </div>

      <p className="onboarding-welcome-eyebrow hybrid-eyebrow">Set up your loop · about 3 minutes</p>

      <h1 className="onboarding-welcome-title">Build your daily trading loop.</h1>

      <p className="onboarding-welcome-lead">
        Prepare, trade your plan, manage risk, and close the loop after each session with a clear review.
      </p>

      <p className="onboarding-welcome-section-label">What you&apos;ll set up</p>

      <div className="onboarding-setup-flow" aria-label="Setup steps">
        <div className="onboarding-setup-row" role="list">
          {SETUP_TILES.slice(0, 3).map(({ id, label, Icon }) => (
            <div key={id} className="onboarding-setup-chip" role="listitem">
              <span className="onboarding-setup-chip-icon">
                <Icon />
              </span>
              <span className="onboarding-setup-chip-label">{label}</span>
            </div>
          ))}
        </div>
        <div className="onboarding-setup-row onboarding-setup-row--center" role="list">
          {SETUP_TILES.slice(3).map(({ id, label, Icon }) => (
            <div key={id} className="onboarding-setup-chip" role="listitem">
              <span className="onboarding-setup-chip-icon">
                <Icon />
              </span>
              <span className="onboarding-setup-chip-label">{label}</span>
            </div>
          ))}
        </div>
      </div>

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
