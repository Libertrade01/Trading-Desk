"use client";

import styles from "./RiskRailsWarningDialog.module.css";

export default function RiskRailsWarningDialog({
  missingMaxDailyLoss,
  missingColdTurkeyBlocker,
  onReview,
  onClose,
}) {
  return (
    <div className={styles.backdrop} role="presentation">
      <section
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="risk-rails-warning-title"
        aria-describedby="risk-rails-warning-copy"
      >
        <div className={styles.icon} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 3.25 19 6v5.1c0 4.4-2.8 8.1-7 9.65-4.2-1.55-7-5.25-7-9.65V6l7-2.75Z" />
            <path d="M12 8v4.5M12 16h.01" />
          </svg>
        </div>

        <p className={styles.eyebrow}>RISK RAILS REQUIRED</p>
        <h1 id="risk-rails-warning-title">Set your risk limits before saving.</h1>
        <p id="risk-rails-warning-copy" className={styles.intro}>
          Your session plan cannot be saved until today&apos;s required risk controls are set and confirmed.
        </p>

        <div className={styles.missingPanel}>
          <span>Still to confirm</span>
          <ul>
            {missingMaxDailyLoss && <li>Max daily loss limit set in broker</li>}
            {missingColdTurkeyBlocker && <li>Cold turkey blocker set</li>}
          </ul>
        </div>

        <div className={styles.walkthrough}>
          <p>How to complete this</p>
          <ol>
            <li>Open the risk settings in your broker or trading platform.</li>
            <li>Set your maximum daily loss limit for today&apos;s session.</li>
            <li>Return to Risk Plan and confirm the matching risk rail.</li>
          </ol>
        </div>

        <p className={styles.note}>This is a process safeguard, not a system error.</p>

        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onClose}>Not now</button>
          <button type="button" className={styles.primary} onClick={onReview}>Go to Risk Plan <span aria-hidden="true">→</span></button>
        </div>
      </section>
    </div>
  );
}
