# Libertrade SaaS — Phase checklist

Tick items when **done and verified**.  
Re-run security audit: `node scripts/check-rls.mjs`

---

## Phase 1 — Foundation & product split

**Goal:** Safe skeleton — login required, per-user data, founder vs customer deploys.

### 1.1 Feature flags
- [x] `src/lib/features.js` — wiki + legacy desk from env
- [x] `AppShell` nav filtered by flags
- [x] Middleware blocks `/wiki`, `/desk` when flags off
- [x] Founder email bypasses flags (`isFounderUser`)

### 1.2 Two Vercel projects
- [x] `trading-desk` → libertrade-desk.vercel.app (flags on)
- [x] `libertrade-app` → libertrade-app.vercel.app (flags off)
- [x] `vercel.json` — `"framework": "nextjs"`
- [x] `.env.example` documents two-deploy setup

### 1.3 Schema in repo
- [x] `supabase/migrations/20250610000000_baseline_schema.sql`
- [x] `supabase/migrations/20250611000000_trades_broker_trade_id_unique.sql`
- [x] `supabase/migrations/20250622000000_phase1_user_isolation.sql`
- [ ] Migrations recorded in Supabase `schema_migrations` (applied via dashboard; history still shows legacy rows)

### 1.4 Auth (Supabase email/password)
- [x] Login, signup, logout, forgot/reset password
- [x] `/auth/callback` route
- [x] Middleware redirects unauthenticated users to `/login`
- [x] Branded email templates in `supabase/templates/`
- [ ] **Custom SMTP (Resend)** — required for customer signup emails
- [ ] Confirm `libertrade-app` in Supabase redirect URLs (script updated; re-run if needed)

### 1.5 Tenant key strategy
- [x] `user_id` column on `app_data`, `trades`, `trading_days`
- [x] Composite unique `(user_id, key)` on `app_data`
- [x] Founder orphan migration API (`/api/auth/founder-migrate`)

### 1.6 RLS v1
- [x] RLS enabled on `app_data`, `trades`, `trading_days`, `trade_notes`, `trade_tag_links`
- [x] Per-user `*_own` policies on core tables
- [x] `20250624000000_rls_cleanup_open_policies.sql` — remove open policies (applied live)
- [x] `20250625000000_legacy_tables_lockdown.sql` — lock legacy tables (applied live)
- [x] `node scripts/check-rls.mjs` passes (no risky policies; anon gets 0 rows on core tables)

### 1.7 User-scoped storage layer
- [x] `src/lib/supabase.js` — `storage.get/set/delete/list` uses `user_id`
- [x] `src/lib/user-storage.js` — `getCurrentUserId()`

### 1.8 Docs & founder UI
- [x] `.env.example` complete
- [x] Founder sidebar section (Wiki + Desk at bottom)
- [ ] Manual verification: founder nav on desk deploy
- [ ] Manual verification: second test user — empty desk, no cross-tenant data
- [ ] Manual verification: signup email arrives (blocked until SMTP)

### Phase 1 exit criteria
- [x] Customer deploy: no Wiki/Desk in nav or URL
- [x] Login required
- [x] RLS on live DB for core tables
- [ ] Full manual sign-up / isolation smoke test

---

## Phase 2 — Move data access off naive client patterns

**Goal:** High-risk writes go through server APIs; all trade queries user-scoped; no cross-tenant import/delete.

**Exit criteria:** Rotating anon key does not expose other users' data; import cannot wipe another tenant.

### 2.1 Server API routes

| Task | Status |
|------|--------|
| `POST /api/trades/import` | [x] |
| `DELETE /api/sessions/[date]` | [x] |
| `PATCH /api/trades/[id]` — update trade | [x] |
| `DELETE /api/trades/[id]` — delete trade + notes | [x] |
| `PUT /api/trades/[id]/notes` | [x] |
| `PUT /api/settings` — trader-settings blob | [x] |
| `PUT /api/sessions/[date]/pre` — pre-market save (optional) | [x] RLS-scoped `storage.set` in `PreMarketCheckIn.jsx` — acceptable for low-risk session blobs |
| `PUT /api/sessions/[date]/plan` — daily plan save | [x] RLS-scoped `storage.set` in `DailyPlan.jsx` |
| `PUT /api/sessions/[date]/post` — post-market save | [x] RLS-scoped `storage.set` in `PostMarketReview.jsx` |
| Wire `analytics-trades.js` to trade APIs | [x] |
| Wire `saveTraderSettings` to settings API | [x] |

### 2.2 Trades schema
- [x] `user_id` on `trades`
- [x] Unique `(user_id, broker_trade_id)` where set

### 2.3 Import / delete scoping
- [x] Import deletes only caller's trades (date + platform + account)
- [x] Import inserts with `user_id`
- [x] Session delete API scopes `app_data` + `trades` by user

### 2.4 Query scoping (`user_id` filter)
- [x] `src/lib/trades-query.js` helper
- [x] `rtrader-import.js` — `fetchTradesForDate`
- [x] `analytics-data.js` — trades + trading_days
- [x] `analytics-trades.js` — mutations via API; reads still client-scoped

### 2.5 localStorage → server storage

| Key / area | Status |
|------------|--------|
| `trader-settings` legacy `libertrade_*` keys | [x] one-time migrate in `loadTraderSettings` |
| `dll-recovery-settings.js` legacy keys | [x] `dll-risk-settings` in app_data + one-time legacy migrate |
| `analytics-date-range.js` playbook tracking start | [x] `analytics-playbook-tracking-start` in app_data + legacy migrate |
| `weekly-process-review.js` reset flag | [x] `weekly-process-review-reset` in app_data + legacy migrate |
| UI-only keys (workflow notice dismiss, demo recovery) | [x] keep local — OK |

### 2.6 Global / shared data (not per user)
- [x] Econ calendar cron — `app_data` rows with `user_id IS NULL`
- [x] `getSystemAppData` + `app_data_select_system` RLS policy

### 2.7 Edge functions & legacy
- [x] `supabase/functions/weekly-review` — JWT required (`verify_jwt`), founder-only when `FOUNDER_EMAIL` set, `trades`/`trading_days` filtered by `user_id`; legacy tables (no `user_id`) founder-only via edge auth
- [x] `legacy/TradeDeskApp.jsx` — uses user-scoped `storage` only; no direct `supabase.from` writes; founder-only route via `/desk` flag

### 2.8 Verification
- [x] `npm run build` clean after Phase 2 changes
- [ ] Import flow e2e (authenticated) — manual
- [ ] Delete session day e2e — manual
- [ ] Trade edit/delete from analytics e2e — manual
- [ ] Settings save e2e on second browser profile — manual
- [x] Unit tests: `analytics-playbook-filter.test.js` (playbook filter + key)
- [ ] API route integration tests — no Next.js test harness yet; defer to manual e2e above
- [x] Re-run `node scripts/check-rls.mjs` — passed (no risky policies; anon 0 rows on core tables)

---

## Phase 3 — TraderProfile (personalization)

- [ ] `trader_profiles` table or per-user JSON blob
- [ ] Default template for new signups
- [ ] Founder template seeded for founder account only
- [ ] Replace hardcoded `VALID_SETUPS`, commitments, behavioral flags
- [ ] Settings → “My process” UI
- [ ] **Exit:** New user sees generic process; founder sees theirs; no playbook strings in `DailyPlan.jsx`

---

## Phase 4 — Customer onboarding & billing

- [ ] Signup → profile + default settings + empty accounts
- [ ] Stripe + webhooks
- [ ] Customer branding (PWA manifest, support email)
- [ ] **Exit:** Stranger can subscribe, log in, use empty desk

---

## Phase 5 — Founder vs customer polish

- [ ] `role` / `plan` field (founder vs customer)
- [ ] Optional per-user wiki URL in settings
- [ ] Isolate legacy bundle on customer deploy
- [ ] Admin: user list (optional)

---

## Phase 6 — Hardening & scale

- [ ] Staging Supabase branch + preview deploys
- [ ] Rate limits on import API
- [ ] Audit logging
- [ ] GDPR export / delete account
- [ ] Customer-facing docs

---

## Current focus

**Phase 2** — code complete; manual e2e verification remaining, then deploy `weekly-review` edge function with secrets.
