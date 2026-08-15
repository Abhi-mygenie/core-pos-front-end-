# CR-131 — Impact Analysis (Gate 2, Revised)

**ID:** CR-131
**Title:** Customer Intelligence (Beta) + Guest vs Registered (Beta) — CRM-enriched report screens
**Date:** 2026-08-06 (revised — original scope was incorrect)
**Author:** PLANNING agent
**Stage:** Gate 2 — Impact Analysis
**Risk:** MEDIUM (new screens, CRM API integration, non-hotspot files)
**Fast Lane eligible:** NO (new files, MEDIUM risk)

---

## Scope Revision Note

Original Impact Analysis (2026-08-05) proposed a single new CRM report screen as a greenfield build.
Owner clarified 2026-08-06: the ask is TWO new beta screens with CRM-enriched data, and the
existing screens (`CustomersRfmMockup.jsx`, `CustomersMixMockup.jsx`) must NOT be touched.
This document supersedes the previous Impact Analysis entirely.

---

## Code Reality

**NONE for new screens** — `CustomerIntelligenceBeta.jsx` and `GuestVsRegisteredBeta.jsx` do not exist.
**PARTIAL for CRM infrastructure** — `crmApi`, `crmAxios`, `X-API-Key` auth are fully wired.
**NONE for CRM report service** — `crmReportService.js` does not exist (to be created).

---

## Conflict Pre-Check

| File | Last Modified By | Risk |
|---|---|---|
| `Sidebar.jsx` | CR-041/CR-093 agents | LOW — additive sidebar entries |
| `App.js` | CR-093 (2026-07-23) | LOW — route additions are additive |
| `api/constants.js` | CR-094 (2026-07-23) | LOW — additive endpoint constants |
| `CustomersRfmMockup.jsx` | CR-011 Phase 3 | **NOT TOUCHED** |
| `CustomersMixMockup.jsx` | CR-011 Phase 3 | **NOT TOUCHED** |

No active conflicts.

---

## Owner Decisions (locked 2026-08-06)

| # | Decision | Value |
|---|---|---|
| OD-1 | Screen names | "Customer Intelligence (Beta)" + "Guest vs Registered (Beta)" |
| OD-2 | Old screens | UNTOUCHED — new screens are additive siblings |
| OD-3 | Tier naming | **Platinum** (not VIP — matches CRM contract) |
| OD-4 | Date range picker | **None** — CRM endpoints use fixed windows (all-time / 30d / 7d) |
| OD-5 | Coupon data | Out of scope for these screens. Separate decision deferred. |
| OD-6 | WhatsApp action | Include on win-back list — phone number available in churn-risk response |
| OD-7 | Phase 2 items | Deferred — deeper funnel, per-customer drill, revenue-intelligence |

---

## CRM Endpoints Confirmed (CR-078 Phase 1 contract)

| Endpoint | Method | What | Cache |
|---|---|---|---|
| `GET /api/pos/reports/summary` | GET | snapshot: customers, lifecycle, tiers, revenue, loyalty | 5 min |
| `GET /api/pos/reports/top-customers?limit=N&sort_by=total_spent\|total_visits\|total_points` | GET | ranked list, up to 100 | 5 min |
| `GET /api/pos/reports/churn-risk?band=high\|medium&limit=N` | GET | win-back list, up to 200 | **No cache** |

**Auth:** same `X-API-Key` via existing `crmAxios` — zero new auth setup.
**Backward compat:** purely additive. All existing endpoints untouched.

---

## Confirmed Response Fields

### /summary
- `customers.total`, `customers.active_30d`, `customers.new_7d`
- `lifecycle.new`, `.active`, `.at_risk`, `.dormant`, `.churned`
- `tiers.bronze`, `.silver`, `.gold`, `.platinum`
- `revenue.total`, `.total_orders`, `.avg_order_value`, `.revenue_30d`, `.avg_order_value_30d`
- `loyalty.orders_with_redemption_pct`, `.points_outstanding`
- `as_of` (ISO 8601 UTC timestamp)

### /top-customers
- Per customer: `customer_id`, `name`, `phone`, `tier`, `total_visits`, `total_spent`, `avg_order_value`, `last_visit_days_ago` (nullable)

### /churn-risk
- `data.count` (full pool before limit), `data.band`, `data.customers[]`
- Per customer: `customer_id`, `name`, `phone`, `tier`, `last_visit_days_ago` (nullable), `total_spent`, `total_visits`

### Fields NOT available in Phase 1 (do not design for)
- wallet_balance per customer
- points_value (₹) per customer
- is_b2b flag
- registered_at / member since
- revenue per tier
- new registrations per day (only new_7d aggregate)
- date range filter on any endpoint

---

## Data Flow Trace

### Screen 1 — Customer Intelligence (Beta)
```
CustomerIntelligenceBeta.jsx
  → page load → crmReportService.getSummary()
      → crmApi.get('/api/pos/reports/summary')
      → cache 5 min in crmReportCache (separate from insightsCache)
      → renders: KPI strip, lifecycle funnel, tier distribution, revenue snapshot

  → top-customers tab → crmReportService.getTopCustomers({ sort_by, limit })
      → crmApi.get('/api/pos/reports/top-customers?...')
      → sort toggle wired to sort_by param: total_spent | total_visits | total_points

  → win-back tab → crmReportService.getChurnRisk({ band, limit })
      → crmApi.get('/api/pos/reports/churn-risk?band=high&limit=50')
      → NO cache — always fresh
      → WhatsApp button: opens wa.me/91{phone} (existing pattern from CR-017)
      → data.count shown in tab badge (not customers.length)
```

### Screen 2 — Guest vs Registered (Beta)
```
GuestVsRegisteredBeta.jsx
  → page load → crmReportService.getSummary() (shared with Screen 1 if cached)
      → lifecycle funnel from summary.lifecycle
      → AOV trend: avg_order_value vs avg_order_value_30d
      → loyalty dial: loyalty.orders_with_redemption_pct
      → points outstanding + ₹ liability

  → win-back sections → crmReportService.getChurnRisk({ band: 'high' })
                      → crmReportService.getChurnRisk({ band: 'medium' })
      → side-by-side action lists with WhatsApp
```

---

## Affected Files

| File | Change Type | Risk |
|---|---|---|
| `pages/reports-module/CustomerIntelligenceBeta.jsx` | **NEW** | MEDIUM |
| `pages/reports-module/GuestVsRegisteredBeta.jsx` | **NEW** | MEDIUM |
| `api/services/crmReportService.js` | **NEW** — 3 CRM report fetch functions | LOW |
| `api/constants.js` | MODIFY — add 3 CRM report endpoint constants | LOW |
| `components/layout/Sidebar.jsx` | MODIFY — add 2 new sidebar entries under Customers | LOW |
| `App.js` | MODIFY — add 2 routes | LOW |

**Files WILL NOT touch:**
- `CustomersRfmMockup.jsx` — existing screen, untouched
- `CustomersMixMockup.jsx` — existing screen, untouched
- `insightsService.js` — no changes
- `crmAxios.js` — no changes (auth already handles X-API-Key)
- Any R5 hotspot files
- Any file under `/app/memory/final/`

---

## Risk Assessment

| Area | Risk | Detail |
|---|---|---|
| CRM 401 mid-session | MITIGATED | BUG-300 already implemented silent refresh on crmAxios |
| Cache TTL mismatch | LOW | crmReportCache must be separate from insightsCache with 5-min TTL for /summary, no-cache for /churn-risk |
| `data.count` vs `customers.length` | LOW | Win-back KPI badge must read `data.count` (full pool), not `customers.length` (limited by limit param) |
| `last_visit_days_ago` null | LOW | Must null-check — customer may have never ordered |
| Lifecycle day labels | LOW | Must NOT hardcode 30/60/90 day numbers in UI labels — thresholds are tenant-configurable |
| Phase 2 designs | NONE | Phase 2 features clearly deferred, no placeholders that imply functionality |

---

## Design Mockups (approved 2026-08-06)

- `/app/frontend/public/customer-intelligence-beta.html`
- `/app/frontend/public/guest-vs-registered-beta.html`

Both available at preview URL for owner reference.

---

## Verification Matrix (seeds Gate 3)

| # | Check | Method |
|---|---|---|
| V1 | `/summary` renders 4 KPI cards with correct field names | grep + browser |
| V2 | Lifecycle bars: 5 stages, no hardcoded day numbers in labels | grep for "30 days\|60 days\|90 days" — 0 hits in JSX |
| V3 | Tier badges say Platinum not VIP | grep "VIP" in new files — 0 hits |
| V4 | Sort toggle wires to sort_by param | browser: toggle By Visits → network tab shows sort_by=total_visits |
| V5 | Win-back tab badge shows data.count not customers.length | code review |
| V6 | WhatsApp button present on win-back rows | browser |
| V7 | No date picker on either screen | visual |
| V8 | Old screens (CustomersRfmMockup, CustomersMixMockup) compile + render unchanged | regression |
| V9 | crmReportCache uses 5-min TTL for summary, no-cache for churn-risk | code review |
| V10 | Compile: webpack 0 new warnings | yarn start logs |

---

## Owner Decisions Outstanding

None — all decisions locked above.

---

## Next Steps

Gate 3: Implementation Plan → Gate 4 GO → Implementation
