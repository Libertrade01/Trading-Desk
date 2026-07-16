"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="auth-page">
          <section className="auth-card" role="alert">
            <div className="auth-brand">Libertrade <span>LOOP</span></div>
            <h1>Something went wrong.</h1>
            <p>The error has been recorded. Please try again, or contact support if it continues.</p>
            <button type="button" className="auth-submit" onClick={reset}>Try again</button>
          </section>
        </main>
      </body>
    </html>
  );
}
