"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("checking");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    function markReady() {
      if (mounted) setStatus("ready");
    }

    function cleanUrl() {
      router.replace("/reset-password", { scroll: false });
    }

    async function hasSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return Boolean(session);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        markReady();
        cleanUrl();
      }
    });

    (async () => {
      if (await hasSession()) {
        markReady();
        cleanUrl();
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeError && mounted) {
          markReady();
          cleanUrl();
          return;
        }
      }

      const tokenHash = params.get("token_hash");
      const type = params.get("type");
      if (tokenHash && type === "recovery") {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (!verifyError && mounted) {
          markReady();
          cleanUrl();
          return;
        }
      }

      const hash = window.location.hash.slice(1);
      if (hash) {
        const hashParams = new URLSearchParams(hash);
        if (
          hashParams.get("type") === "recovery" ||
          hashParams.get("access_token")
        ) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (mounted && (await hasSession())) {
            markReady();
            cleanUrl();
            return;
          }
        }
      }

      if (mounted) setStatus("invalid");
    })();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Could not update password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "checking") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            Liber<span>trade</span>
          </div>
          <p className="auth-sub">Reset your password</p>
          <p className="auth-sub">Verifying reset link…</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            Liber<span>trade</span>
          </div>
          <p className="auth-sub">Reset your password</p>
          <p className="auth-error">
            This link is invalid or has expired. Request a new reset email.
          </p>
          <p className="auth-footer">
            <Link href="/forgot-password">Send reset link</Link>
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
        <p className="auth-sub">Choose a new password</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">
            New password
            <input
              className="pm-text-input auth-input"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
