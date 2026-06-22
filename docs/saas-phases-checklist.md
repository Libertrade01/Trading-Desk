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
- [x] Import flow e2e (authenticated) — manual ✓
- [x] Delete session day e2e — manual ✓
- [x] Trade edit/delete from analytics e2e — manual ✓
- [x] Settings save e2e on second browser profile — manual ✓
- [x] Unit tests: `analytics-playbook-filter.test.js` (playbook filter + key)
- [x] API route integration tests — covered by manual e2e above (no automated harness yet)
- [x] Re-run `node scripts/check-rls.mjs` — passed (no risky policies; anon 0 rows on core tables)

---

## Phase 3 — TraderProfile (personalization)

**Agreed product rules (2026-06-18):**

| Area | Rule |
|------|------|
| **Setups (playbook)** | Min **1** setup required; user can **add unlimited**; **editable anytime** (name, conditions, etc.) |
| **Commitments** | Start with **1 placeholder**; user can add up to **3 total**; all editable; **all must be checked** to save daily plan |
| **Default commitment copy** | e.g. *“I believe in myself and agree to follow my plan.”* |
| **Behavioral flags** | Built-in flags are **show/hide** per user; user can **add custom flags** (same **4 categories**) |
| **Bias checklist** | **Optional** (not required to save plan); founder example shown as template; items **editable / add more** |
| **Process streaks** | User can **toggle on/off** (Risk streak, Playbook streak independently); **configurable target** (founder default **/21**) |
| **Global (not per-user)** | `Improvised`, `Invalid / Not a Setup` — meta-tags for adherence |

**Default new signup template:**
- 1 placeholder setup (e.g. “My setup” — user renames)
- 1 placeholder commitment: *“I believe in myself and agree to follow my plan.”*
- All behavioral flags visible (or sensible default subset TBD)
- Bias checklist off by default; optional section with empty/placeholder items
- Streaks: both on; target **21** (user-configurable in My process)
- Empty accounts + trader-settings defaults (already exist)

**Founder template (`midefi@protonmail.com` / founder flag):**
- Seed current hardcoded playbook: PAF, BAR, LVN continuation, VWAP in trend
- Current commitment texts (both) + bias checklist (value area, nodes/LVNs, weekly profile)
- Streak target **21** (already hardcoded today)
- One-time migration from today’s hardcoded strings

**Setup delete (Q3 explained):** If a user removes a setup from their playbook but old trades were tagged with that name, those trades still show the old label in history — we **keep the tag on past trades** (no re-tagging); only **future** import/plan dropdowns change. Deleting a setup is allowed; historical analytics stay honest.

**Streak target /21:** Product default (founder preference). Common “21-day habit” idea is popular but not fixed in research (habit formation varies widely; ~66 days median in some studies). **21 stays the default** because it’s achievable on the UI; users can change target in My process. Copy in onboarding: *“Many traders use 21 as a first milestone — change anytime.”*

**UI:** Settings → **“My process”** — edit setups, commitments, flags, bias conditions, streak toggles + target, journal prompts, default plan rails (see below)

### Additional configurability (beyond core profile)

**Include in Phase 3 (profile + onboarding):**

| Item | Rule |
|------|------|
| **Default daily plan rails** | Profile defaults for max daily loss, max trades, position size — pre-fill Daily Plan; user still confirms each day |
| **Post-market journal prompts** | 3 editable prompts (default: What went well / wrong / one lesson) |
| **Instruments / commissions seed** | Onboarding asks “What do you trade?” — seeds commission table symbols (MNQ, NQ, ES, …); full edit stays in Settings |

**Phase 3.5 or later (Settings, not onboarding):**

| Item | Notes |
|------|--------|
| **Pre-market field visibility** | Show/hide blocks (HRV, sleep debt, etc.) for users without wearables |
| **Readiness stand-down threshold** | e.g. sleep-debt minutes before stand-down (default 60) |
| **Workflow strictness** | Which steps count toward “day complete” (future; all 3 today) |
| **Weekly review prompts** | Optional focus / prompt customization |

**Keep global (not per-user):** Improvised + Invalid setup tags; readiness **weights** (38% mental, etc.); bias/volatility dropdown label lists; import platform (rTrader only for now).

**Already in Settings (onboarding = light touch only):** Accounts, default risk, timezone, DLL/recovery — deep tuning after first session, not signup wizard.

### 3.1 Data model
- [ ] Per-user profile JSON blob (or `trader_profiles` table) — versioned schema
- [ ] `onboardingCompletedAt` flag (or profile field)
- [ ] Load profile on auth; merge with defaults if missing
- [ ] Founder seed / migration on first login

### 3.2 Setups
- [ ] Replace `VALID_SETUPS` in `setup-options.js` with profile-driven list
- [ ] Daily plan + import + analytics read from profile
- [ ] Enforce min 1 setup; allow add/edit/delete; past trades keep old setup label

### 3.3 Commitments
- [ ] Replace hardcoded `COMMITMENT_TEXT` in `DailyPlan.jsx`
- [ ] Max 3; min 1; default placeholder: *“I believe in myself and agree to follow my plan.”*
- [ ] Save plan requires **all** profile commitments checked

### 3.4 Behavioral flags
- [ ] Profile stores: built-in flag visibility + custom flags in **same 4 categories**
- [ ] Post-market + weekly review read from profile
- [ ] Show/hide UI in My process

### 3.5 Bias checklist (optional)
- [ ] Profile: `biasChecklistEnabled` + editable items (founder example as seed)
- [ ] Daily plan: skip bias checklist gate when disabled
- [ ] When enabled: require all checked items before save (like today)

### 3.6 Process streaks
- [ ] Profile: `riskStreakEnabled`, `playbookStreakEnabled`, `streakTargetDays` (default 21)
- [ ] Home + Analytics read target from profile (replace hardcoded `21`)
- [ ] Hide streak widgets when toggled off

### 3.7 Journal prompts & plan defaults
- [ ] Profile: 3 post-market journal prompt strings (editable)
- [ ] Profile: default max daily loss, max trades, position size (optional empty)
- [ ] Daily Plan pre-fills from profile; user overrides per day

### 3.8 My process UI (Settings)
- [ ] Single “My process” area: setups, commitments, flags, bias, streaks, journal prompts, plan defaults
- [ ] Instruments / commission seed link or subsection

### 3.9 Wire-up
- [ ] Remove playbook/commitment/flag strings from component hardcode
- [ ] Playbook adherence + import validation use profile setups
- [ ] **Exit (3a):** New user sees placeholders; founder sees full process; no founder strings in customer code paths

---

## Phase 3b — First-signup onboarding (pleasant wizard)

**Goal:** Guided first login — short, skippable where noted, land on Home with **“Start pre-market”** (not an empty confusing desk).

**Principles:** One decision per screen; ~3–5 minutes; progressive disclosure; full My process available in Settings anytime.

### Onboarding flow (7 steps)

| Step | Screen | Required? |
|------|--------|-------------|
| 1 | **Welcome** — “Your trading process desk. Not a broker.” Daily loop: pre → plan → trade → post | — |
| 2 | **Trading day** — timezone (browser default); “When does your trading day roll over?” | Yes |
| 3 | **One account** — name + type (eval / funded / cash); multi-account later in Settings | Yes |
| 4 | **Your playbook** — min 1 setup (placeholder name); optional “Add another” | Yes |
| 5 | **Your commitment** — pre-filled placeholder; edit; add up to 2 more (max 3) | Yes |
| 6 | **Process streaks** — Risk + Playbook on, target `/21`; toggles + number; habit copy | Defaults OK |
| 7 | **Optional extras** — “Chart prep checklist?” (bias off by default); flags customizable later → **Skip to Home** | Skip OK |

**After onboarding:**
- [ ] Home CTA: **Start pre-market** (clear next step)
- [ ] One-time hint: “Customize your full process in Settings → My process”
- [ ] No forced import or forced pre-market on day 1
- [ ] Middleware/route: redirect to `/onboarding` until `onboardingCompletedAt` set

**Founder path:**
- [ ] Skip wizard OR one-click **“Use Libertrade template”** (full playbook, 2 commitments, bias checklist, /21)

**Not in onboarding v1** (Settings after first session): full commission matrix, DLL recovery tuning, all behavioral flags, analytics/import, Stripe.

### 3b.1 Implementation
- [ ] `/onboarding` route — multi-step wizard UI (match hybrid design system)
- [ ] `PUT /api/profile` or extend settings API — save profile + mark onboarding complete
- [ ] Signup callback / first login redirect logic
- [ ] Re-use same profile schema as Phase 3a (wizard = guided editor)

### 3b.2 Verification
- [ ] New user: complete wizard → Home → pre-market works with their setup name
- [ ] Skip optional step → bias off, streaks default
- [ ] Founder: template seed OR skip
- [ ] Returning user: never see wizard again
- [ ] **Exit (3b):** Stranger signup feels intentional; not overwhelmed

**Phase 3 full exit:** 3a + 3b done — personalized process + pleasant first run.

---

## Phase 4 — Customer billing & polish

- [ ] Stripe + webhooks (signup assumes profile + onboarding from Phase 3b already done)
- [ ] Customer branding (PWA manifest, support email)
- [ ] **Exit:** Stranger can subscribe, log in, complete onboarding, use their desk

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

**Phase 2 complete** ✓ — manual e2e verified. Optional: deploy `weekly-review` edge function with `FOUNDER_EMAIL` secrets.

**Next: Phase 3** — 3a My process + profile wiring, then 3b onboarding wizard. Spec locked in checklist above.
