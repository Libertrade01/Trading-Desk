# Sentry production setup

Libertrade uses Sentry for production error events only. Session Replay is disabled and performance tracing is set to zero.

## Required Vercel environment variables

- `NEXT_PUBLIC_SENTRY_DSN`: public project DSN for browser reporting
- `SENTRY_DSN`: the same project DSN for server and edge reporting
- `SENTRY_AUTH_TOKEN`: build-time token limited to source-map upload access
- `SENTRY_ORG`: Sentry organization slug
- `SENTRY_PROJECT`: Sentry project slug

Configure all variables for Production only. The DSN is not a secret, but the auth token is and must never be committed.

## Sentry privacy settings

In Sentry organization or project settings:

1. Enable server-side data scrubbing and default scrubbers.
2. Prevent storage of IP addresses.
3. Add sensitive fields for `email`, `name`, `journal`, `thesis`, `notes`, `prompt`, `response`, `authorization`, `cookie`, `token` and `api_key`.
4. Keep Session Replay disabled.
5. Send issue-alert emails to the verified Sentry account email.

The SDK also removes user identity, request bodies, headers, query strings, breadcrumbs, arbitrary extra data and Vercel AI prompt/output instrumentation before transmission.

## Acceptance test

After deploying, send one deliberate test exception from an authenticated founder-only path or temporary test endpoint. Confirm:

- the event appears in the Libertrade Sentry project;
- the issue is classified as high priority and the configured email alert is active;
- the event contains no email, journal text, trade details, cookies, tokens, request body or query string;
- the temporary test path is removed immediately after verification.

Production acceptance was completed on 16 July 2026. Sentry resolved the event to the original application source, tagged it as production and stored no application user identity or sensitive request data.
