"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import { getAuthCallbackUrl } from "../../lib/app-url";

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
      // Supabase redirect allow list must include /auth/callback and /reset-password
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${getAuthCallbackUrl()}?type=recovery` }
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
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            Liber<span>trade</span>
          </div>
          <p className="auth-sub">Check your email</p>
          <p className="auth-success">
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
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          Liber<span>trade</span>
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
