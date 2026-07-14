"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAgeBand } from "../../lib/age-eligibility";

export default function SignupPage() {
  const router = useRouter();
  const [preferredName, setPreferredName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [showAgeDialog, setShowAgeDialog] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!preferredName.trim()) {
      setError("Enter the first name or nickname you want to see on Home.");
      return;
    }
    const ageBand = getAgeBand(dateOfBirth);
    if (!ageBand) {
      setError("Enter a valid date of birth.");
      return;
    }
    if (ageBand === "under-14") {
      setShowAgeDialog(true);
      return;
    }
    if (!legalAccepted) {
      setError("Accept the Beta Terms and Privacy Notice to create an account.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredName: preferredName.trim(),
          dateOfBirth,
          email: email.trim(),
          password,
          legalAccepted,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.code === "AGE_RESTRICTED") setShowAgeDialog(true);
        else setError(result.error || "Sign up failed. Please try again.");
        return;
      }
      if (result.hasSession) {
        router.replace("/home");
        router.refresh();
        return;
      }
      setPendingConfirmation(true);
    } catch {
      setError("Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (pendingConfirmation) {
    return (
      <div className="auth-page auth-page--hero">
        <div className="auth-card auth-card--hero auth-card--signup">
          <div className="auth-brand auth-brand--hero">
            <img src="/brand/primary-wordmark-login-v3.png" alt="Libertrade Loop" />
          </div>
          <p className="auth-sub">One last step</p>
          <p className="auth-success auth-success--hero">
            We sent a confirmation link to <strong>{email}</strong>. Open it to
            activate your account and start setting up your LOOP.
          </p>
          <p className="auth-footer">
            <Link href="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page auth-page--hero">
      <div className="auth-card auth-card--hero auth-card--signup">
        <div className="auth-brand auth-brand--hero">
          <img src="/brand/primary-wordmark-login-v3.png" alt="Libertrade Loop" />
        </div>
        <p className="auth-sub">Start building your trading process</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">
            First name or nickname
            <input
              className="pm-text-input auth-input"
              type="text"
              autoComplete="nickname"
              required
              maxLength={32}
              placeholder="What should we call you?"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
            />
          </label>
          <label className="auth-label">
            Date of birth
            <input
              className="pm-text-input auth-input"
              type="date"
              autoComplete="bday"
              required
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
            <span className="auth-field-note">Used to confirm eligibility. We retain only your age group, not your birth date.</span>
          </label>
          <label className="auth-label">
            Email
            <input
              className="pm-text-input auth-input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="auth-label">
            Password
            <input
              className="pm-text-input auth-input"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="auth-legal-check">
            <input
              type="checkbox"
              required
              checked={legalAccepted}
              onChange={(e) => setLegalAccepted(e.target.checked)}
            />
            <span>I agree to the <Link href="/terms" target="_blank">Beta Terms</Link> and acknowledge the <Link href="/privacy" target="_blank">Privacy Notice</Link>.</span>
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
      {showAgeDialog && (
        <div className="auth-dialog-backdrop" role="presentation">
          <div className="auth-age-dialog" role="alertdialog" aria-modal="true" aria-labelledby="age-dialog-title" aria-describedby="age-dialog-copy">
            <span className="auth-age-dialog__eyebrow">AGE REQUIREMENT</span>
            <h1 id="age-dialog-title">You must be at least 14 to use Libertrade.</h1>
            <p id="age-dialog-copy">This age requirement helps us protect younger users&apos; privacy and meet child-data protection requirements.</p>
            <button type="button" onClick={() => setShowAgeDialog(false)}>Return to sign up</button>
          </div>
        </div>
      )}
    </div>
  );
}
