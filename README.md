# Libertrade LOOP

A trading performance operating system for discretionary futures traders.

LOOP guides a full daily workflow: pre-market readiness check-in, session plan, trade import, close-loop review, analytics, weekly process review, prop economics, and Loop Intelligence over the trader's own data. Built as a multi-user product with process settings and a public landing path so others can adapt the loop to their own playbook.

Live: [libertrade.app](https://libertrade.app)

## What this repo is

- Next.js app (App Router) for the LOOP daily workflow and systems on top
- Supabase-backed auth, RLS, journals, trades, readiness, plans, and reviews
- Loop Intelligence: tool-using AI assistant over scoped user data
- Production ops: Sentry, analytics, export/delete paths, cron helpers

## What this repo is not

- A generic "AI trading coach" that invents advice
- Broker execution or order routing
- The portfolio marketing site (separate repo)

## Architecture

```text
Check-in (readiness)
  -> Session plan (risk rails / commitments)
  -> Trade (import or manual)
  -> Close the loop (process honesty + flags)
  -> Analytics / Weekly review / Prop Economics
  -> Loop Intelligence (read-only tools over user data)
```

Core product rule: fetch before answering. The assistant must not invent trade or journal history.

## Stack

- Next.js / React
- Supabase (Auth, Postgres, RLS)
- Vercel
- OpenAI / Login with ChatGPT + AI SDK
- Chart.js
- Sentry

## Quick start

```bash
npm install
cp .env.example .env.local
# Fill Supabase + app URL + optional assistant secrets
# See docs/ for launch and Supabase setup notes

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy `.env.example` to `.env.local`. Important variables:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin key |
| `NEXT_PUBLIC_APP_URL` | Public app URL (auth redirects) |
| `FOUNDER_EMAIL` | Optional founder account email |
| `LWC_SECRET` | Login with ChatGPT session secret |
| `CRON_SECRET` | Protects cron routes |
| `SUPABASE_PROJECT_REF` | Optional; used by management scripts |
| `SUPABASE_ACCESS_TOKEN` | Optional; Supabase Management API |

Never commit `.env` / `.env.local`. Keep service-role keys and tokens server-side only.

## Product surfaces

| Path | Purpose |
|------|---------|
| `/` | Public landing |
| `/home` | Today desk |
| `/premarket` | Readiness check-in |
| `/plan` | Session plan |
| `/postmarket` | Close the loop |
| `/analytics` | Performance / process analytics |
| `/weekly-review` | Weekly process review |
| `/prop-economics` | Prop fees, resets, payouts |
| `/assistant` | Loop Intelligence |

## Docs

| File | Purpose |
|------|---------|
| `docs/launch-checklist.md` | Production launch checks |
| `docs/sentry-setup.md` | Error monitoring |
| `docs/saas-phases-checklist.md` | Productization phases |
| `docs/incident-response.md` | Incident notes |

## Scripts

```bash
npm run check:launch-env   # Verify production env shape
npm test                   # Unit tests
```

Management scripts under `scripts/` expect secrets from `.env.local` and, where needed, `SUPABASE_PROJECT_REF` + `SUPABASE_ACCESS_TOKEN`.
