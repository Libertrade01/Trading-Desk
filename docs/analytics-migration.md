# Analytics Migration Status

Track progress retiring `public/analytics.html` in favour of the React `/analytics` shell.

**Last updated:** 2026-06-20 (Phase 6a + 5f session)

---

## Architecture target

| Layer | Target |
|-------|--------|
| `/analytics` Dashboard tab | React only |
| `/analytics` Reports tab | React weekly reports (agent analysis **deferred** - out of scope for now) |
| Trade editing / full log | React slide panels → full Trade Log |
| Standalone `/analytics.html` | ✅ Redirects to `/analytics` (legacy file removed) |

---

## Phase checklist

### Phase 1–3 - Dashboard foundation ✅ DONE (shipped `c59e548`)

- [x] Remove legacy chrome from embed
- [x] Stat module cleanup (hero stats, W/L bar, tables)
- [x] React dashboard route + `AnalyticsShell`
- [x] Shared libs: `analytics-stats`, `analytics-data`, `analytics-charts`, `analytics-date-range`
- [x] Session grid (time + day charts only)

### Phase 4 - Close dead ends ✅ DONE

| ID | Item | Status | Notes |
|----|------|--------|-------|
| 4a | In-app View All (Daily P&L + Recent Trades) | ✅ | `AnalyticsSlidePanel` |
| 4b | Trade detail drawer (setup/mgmt edit) | ✅ | `TradeDetailPanel` + `analytics-trades.js` |
| 4b-alt | Post-Market copy → point to in-app tagging | ✅ | Updated error message |
| 4c | Untagged trades banner + Tag now CTA | ✅ | `AnalyticsUntaggedBanner` |
| 4d | Toolbar cross-links (Home, History) | ✅ | `AnalyticsToolbar` |
| 4e | Playbook tracking start UI + reset | ✅ | Footer on Playbook panel |
| 4f | Daily P&L row → History day | ✅ | `/history/{date}` |

### Phase 5 - Process metrics ✅ DONE (uncommitted)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| 5a | Process overview card (Post-Market sliders) | ✅ | `ProcessOverviewPanel` + `analytics-process.js` |
| 5b | Playbook + risk streak widget | ✅ | `ProcessStreaksPanel` |
| 5c | Per-setup breakdown (PAF, BAR, …) | ✅ | `summarizeSetupByTag` |
| 5d | Management quality summary | ✅ | `aggregateManagementQuality` |
| 5e | History day playbook adherence | ✅ | `HistoryDayDetail` post section |
| 5f | Timezone alignment (Lima vs UTC today) | ✅ | `src/lib/today-key.js` - Lima calendar; wired into history-data, analytics-date-range, desk flows |

### Phase 6 - Retire legacy dashboard ⏳ PARTIAL

| ID | Item | Status | Notes |
|----|------|--------|-------|
| 6a | React Trade Log (search, filters, pagination) | ✅ | Delete + notes in `TradeDetailPanel`; direction/result/setup/mgmt filters |
| 6b | React Reports MVP | ✅ | `AnalyticsReports` + `WeeklyReportView` - weekly + trading_days |
| 6b+ | Agent analysis (AI weekly reports) | ⏸️ | **Deferred** - not pursuing for now; remains in legacy only |
| 6c | Process charts (optional) | ⬜ | Post-loss recovery, trade # in session |
| 6d | Tag Manager decision | ⏸️ | **Deprecated** - custom tags not needed; tables remain in DB unused |
| 6e | Redirect `/analytics.html` → `/analytics` | ✅ | `next.config.js` redirects; `public/analytics.html` removed |

### Phase 7 - Plan ↔ execution loop ⬜ NOT STARTED

- [ ] Plan vs actual (Daily Plan setups vs trade tags)
- [ ] Unified process score (Home + Analytics)
- [ ] Readiness vs playbook vs P&L correlation

---

## Legacy-only features (retired)

| Feature | Status |
|---------|--------|
| Full trade panel + pagination | ✅ React trade log |
| Trade detail (notes, delete, setup/mgmt) | ✅ `TradeDetailPanel` |
| Tag Manager + custom trade tags | ⏸️ Deprecated |
| Daily P&L panel | ✅ Dashboard + History |
| Reports (weekly) | ✅ React Reports tab |
| Agent analysis (weekly AI) | ⏸️ Deferred |
| P&L by trade # in session | ⬜ 6c optional |
| Post-loss recovery | ⬜ 6c optional |
| Google standalone auth | Removed with `analytics.html` |

---

## React files (analytics)

```
src/components/AnalyticsShell.jsx
src/components/analytics/
  AnalyticsDashboard.jsx      - main dashboard + panel state
  AnalyticsToolbar.jsx
  AnalyticsSlidePanel.jsx     - Phase 4 drawers
  TradeDetailPanel.jsx        - Phase 4b trade edit
  AnalyticsUntaggedBanner.jsx - Phase 4c
  PerformanceOverview.jsx
  PlaybookAdherencePanel.jsx
  DailyPnlTable.jsx
  RecentTradesTable.jsx
  SessionAnalyticsGrid.jsx
  ProcessOverviewPanel.jsx     - Phase 5a
  ProcessStreaksPanel.jsx      - Phase 5b
  AnalyticsReports.jsx         - Phase 6b shell
  WeeklyReportView.jsx         - Phase 6b week report
src/lib/
  analytics-stats.js
  analytics-data.js
  analytics-charts.js
  analytics-date-range.js
  analytics-process.js        - Phase 5 process metrics
  analytics-trades.js        - trade update/delete/notes
  analytics-reports.js        - Phase 6b week helpers
  today-key.js                  - Lima todayKey (Phase 5f)
```

---

## Next steps

1. **Commit** Phase 5 + 6 work locally
2. **6c** - Optional process charts (post-loss recovery, trade # in session)
3. **5f tail** - Lima `todayKey` in `legacy/TradeDeskApp.jsx` + `market-events.js` (optional)

---

## Git / deploy notes

- Playbook tracking start stored in `localStorage` key `analytics-playbook-tracking-start`
- `/analytics.html` → `/analytics` permanent redirect in `next.config.js` (`?view=reports` preserved)
- `public/analytics.html` removed (recoverable from git history)
- Tag Manager deprecated - no React port; Supabase `trade_tags` / `trade_tag_links` tables untouched
