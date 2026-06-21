# Analytics Migration Status

Track progress retiring `public/analytics.html` in favour of the React `/analytics` shell.

**Last updated:** 2026-06-18 (overnight session)

---

## Architecture target

| Layer | Target |
|-------|--------|
| `/analytics` Dashboard tab | React only |
| `/analytics` Reports tab | React (currently legacy iframe) |
| Trade editing / full log | React slide panels → full Trade Log |
| Standalone `/analytics.html` | Redirect to `/analytics` when parity reached |

---

## Phase checklist

### Phase 1–3 — Dashboard foundation ✅ DONE (shipped `c59e548`)

- [x] Remove legacy chrome from embed
- [x] Stat module cleanup (hero stats, W/L bar, tables)
- [x] React dashboard route + `AnalyticsShell`
- [x] Shared libs: `analytics-stats`, `analytics-data`, `analytics-charts`, `analytics-date-range`
- [x] Session grid (time + day charts only)

### Phase 4 — Close dead ends ✅ DONE

| ID | Item | Status | Notes |
|----|------|--------|-------|
| 4a | In-app View All (Daily P&L + Recent Trades) | ✅ | `AnalyticsSlidePanel` |
| 4b | Trade detail drawer (setup/mgmt edit) | ✅ | `TradeDetailPanel` + `analytics-trades.js` |
| 4b-alt | Post-Market copy → point to in-app tagging | ✅ | Updated error message |
| 4c | Untagged trades banner + Tag now CTA | ✅ | `AnalyticsUntaggedBanner` |
| 4d | Toolbar cross-links (Home, History) | ✅ | `AnalyticsToolbar` |
| 4e | Playbook tracking start UI + reset | ✅ | Footer on Playbook panel |
| 4f | Daily P&L row → History day | ✅ | `/history/{date}` |

### Phase 5 — Process metrics ⏳ PARTIAL

| ID | Item | Status | Notes |
|----|------|--------|-------|
| 5a | Process overview card (Post-Market sliders) | ⬜ | Needs `fetchTradingDays` / review loader |
| 5b | Playbook + risk streak widget | ⬜ | Reuse `history-data.js` streak fns |
| 5c | Per-setup breakdown (PAF, BAR, …) | ✅ | `summarizeSetupByTag` |
| 5d | Management quality summary | ⬜ | Aggregate `management` field |
| 5e | History day playbook adherence | ✅ | `HistoryDayDetail` post section |
| 5f | Timezone alignment (Lima vs UTC today) | ⬜ | App-wide `todayKey` |

### Phase 6 — Retire legacy dashboard ⬜ NOT STARTED

| ID | Item | Status | Notes |
|----|------|--------|-------|
| 6a | React Trade Log (search, filters, pagination) | 🔄 | Search + setup filter + panel in toolbar; pagination TBD |
| 6b | React Reports MVP | ⬜ | Weekly + `trading_days` rules |
| 6c | Process charts (optional) | ⬜ | Post-loss recovery, trade # in session |
| 6d | Tag Manager decision | ⬜ | Deprecate or port custom tags |
| 6e | Redirect `/analytics.html` → `/analytics` | ⬜ | After 6a + 6b |

### Phase 7 — Plan ↔ execution loop ⬜ NOT STARTED

- [ ] Plan vs actual (Daily Plan setups vs trade tags)
- [ ] Unified process score (Home + Analytics)
- [ ] Readiness vs playbook vs P&L correlation

---

## Legacy-only features (still in `analytics.html`)

| Feature | Migration target |
|---------|------------------|
| Full trade panel + pagination | 6a |
| Trade detail (notes, tags, delete) | 6a (+ extend `TradeDetailPanel`) |
| Tag Manager | 6d |
| Daily P&L panel + delete day | 6a or History |
| Reports (weekly/monthly/AI) | 6b |
| P&L by trade # in session | 6c optional |
| Post-loss recovery | 6c optional |
| Google standalone auth | Remove with redirect |
| Theme toggle in legacy | N/A (app shell handles) |

---

## React files (analytics)

```
src/components/AnalyticsShell.jsx
src/components/analytics/
  AnalyticsDashboard.jsx      — main dashboard + panel state
  AnalyticsToolbar.jsx
  AnalyticsSlidePanel.jsx     — Phase 4 drawers
  TradeDetailPanel.jsx        — Phase 4b trade edit
  AnalyticsUntaggedBanner.jsx — Phase 4c
  PerformanceOverview.jsx
  PlaybookAdherencePanel.jsx
  DailyPnlTable.jsx
  RecentTradesTable.jsx
  SessionAnalyticsGrid.jsx
  … (Card, Chart, Stat, Table, WorkflowNotice)
src/lib/
  analytics-stats.js
  analytics-data.js
  analytics-charts.js
  analytics-date-range.js
  analytics-trades.js         — Supabase trade PATCH
```

---

## Tomorrow — suggested next steps

1. **Push** uncommitted Phase 4 work if not already on GitHub
2. **6a** — React Trade Log panel (search + setup filter + open `TradeDetailPanel`)
3. **5a** — Process overview card from post-market / trading_days
4. **5b** — Streak widget on dashboard
5. **6b** — Start Reports tab in React (weekly shell first)

---

## Git / deploy notes

- Playbook tracking start stored in `localStorage` key `analytics-playbook-tracking-start`
- Reports tab still iframes `analytics.html?embed=1&view=reports`
- `AnalyticsEmbed.jsx` unused by route; safe to remove after redirect
