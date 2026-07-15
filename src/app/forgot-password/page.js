"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import { getAuthRecoveryUrl } from "../../lib/app-url";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: getAuthRecoveryUrl() }
      );
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setSent(true);
    } catch {
      setError("Could not send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-page auth-page--hero">
        <div className="auth-card auth-card--hero">
          <div className="auth-brand auth-brand--hero">
            <img src="/brand/primary-wordmark-login-v3.png" alt="Libertrade Loop" />
          </div>
          <p className="auth-sub">Check your inbox</p>
          <p className="auth-success auth-success--hero">
            If an account exists for <strong>{email}</strong>, we sent a password
            reset link.
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
      <div className="auth-card auth-card--hero">
        <div className="auth-brand auth-brand--hero">
          <img src="/brand/primary-wordmark-login-v3.png" alt="Libertrade Loop" />
        </div>
        <p className="auth-sub">Reset your password</p>

        <form className="auth-form" onSubmit={handleSubmit}>
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
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="auth-footer">
          <Link href="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
