# Libertrade beta incident response

Primary contact: `support@libertrade.app`

## When an alert arrives

1. Open the Sentry issue and confirm whether the error is current, repeated and production-only.
2. Check the affected route and deployment in Vercel logs. Use Supabase logs only when the failure touches authentication or stored data.
3. Do not copy journal text, trade data, credentials or user exports into tickets or chat.
4. If confidentiality, integrity or account isolation may be affected, disable the affected feature or roll back the latest Vercel deployment immediately.
5. Reproduce with a disposable account, apply the smallest safe fix, run tests and the production build, then verify production.
6. Record the alert time, impact, decision, deployment or rollback, verification and closure time in a private incident log.

## User and regulatory communication

- For ordinary availability bugs, acknowledge affected users through `support@libertrade.app` when appropriate.
- If personal data may have been disclosed, altered, lost or made unavailable, preserve evidence and obtain appropriate data-protection advice promptly. Assess notification duties and deadlines rather than assuming every technical error is a reportable breach.
- Never send account data to a different email address without verifying account ownership.

## Initial Sentry policy

- Error events only; performance tracing sample rate is zero.
- Session Replay is not installed or enabled.
- Default PII collection is disabled.
- User identity, request bodies, cookies, authorization headers, query strings, breadcrumbs, AI prompts/outputs and arbitrary extra context are removed before transmission.
- Sentry organization settings should additionally enable default data scrubbing and prevent storage of IP addresses.
