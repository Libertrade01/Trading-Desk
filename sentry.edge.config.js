import * as Sentry from "@sentry/nextjs";
import { privacySafeSentryOptions } from "./src/lib/sentry-privacy";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production" && Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  ...privacySafeSentryOptions,
});
