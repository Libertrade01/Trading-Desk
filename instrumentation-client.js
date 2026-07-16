import * as Sentry from "@sentry/nextjs";
import { privacySafeSentryOptions } from "./src/lib/sentry-privacy";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production" && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
  ...privacySafeSentryOptions,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
