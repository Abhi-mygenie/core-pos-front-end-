# Session Handover — 2026-08-06 CR-131 Design + CRM Contract Review

**Date:** 2026-08-06
**Role:** PLANNING / INVESTIGATION (brainstorm + design session)
**Item:** CR-131
**Status:** Gate 2 Impact Analysis revised — design approved — awaiting Gate 3 Implementation Plan

---

## Summary (1 line)
CR-131 scope confirmed as two new CRM-enriched beta screens; CRM Phase 1 contract (CR-078) reviewed, design mockups approved, all owner decisions locked.

---

## What Happened This Session

### 1. CR-131 scope clarified
Original scope (simple "Source: POS Data" badge) was incorrect. Owner confirmed: **two new screens** alongside existing ones (old screens untouched).

### 2. CRM API contract received (CR-078 Phase 1)
Three new CRM endpoints confirmed live + self-tested by CRM team:
- `GET /api/pos/reports/summary` — restaurant snapshot
- `GET /api/pos/reports/top-customers?sort_by=…&limit=N` — ranked customers
- `GET /api/pos/reports/churn-risk?band=high|medium&limit=N` — win-back list

Auth: same X-API-Key as all existing CRM calls. Zero new keys.

### 3. Key findings from POS cross-reference
- Auth is already 100% wired (BUG-300 shipped)
- Tier naming: **Platinum** (not VIP — CRM contract uses bronze/silver/gold/platinum)
- CRM endpoints have NO date range filter — fixed windows (all-time / 30d / 7d)
- `data.count` ≠ `customers.length` on churn-risk — count is full pool before limit
- Lifecycle thresholds (31/60/90 days) are tenant-configurable — never hardcode in UI
- Coupon data: CRM Phase 1 has none; POS has it via insights-discounts but out of scope here
- Phase 2 endpoints deferred: `/revenue-intelligence`, `/customer-intelligence/{id}`, `sort_by=value_score`

### 4. Design mockups finalized
Two standalone HTML mockups created and approved by owner:
- `/app/frontend/public/customer-intelligence-beta.html`
- `/app/frontend/public/guest-vs-registered-beta.html`

### 5. Owner decisions locked
See `impact/CR-131_IMPACT_ANALYSIS.md` §Owner Decisions — all 7 decisions recorded.

---

## Docs Updated This Session
- `memory/impact/CR-131_IMPACT_ANALYSIS.md` — REVISED (supersedes old version)
- `memory/control/registry.json` — CR-131 status, scope, decisions, files updated
- `memory/control/CR_REGISTRY.md` — CR-131 row added
- `memory/evidence/CR-131/crm_api_probe_2026_08_06.md` — CRM endpoint probe results
- `memory/handover/SESSION_HANDOVER_2026_08_06_CR131_DESIGN.md` — this file

---

## Files to be Created (Implementation)

| File | Type |
|---|---|
| `pages/reports-module/CustomerIntelligenceBeta.jsx` | NEW |
| `pages/reports-module/GuestVsRegisteredBeta.jsx` | NEW |
| `api/services/crmReportService.js` | NEW — 3 fetch functions |
| `api/constants.js` | MODIFY — 3 endpoint constants |
| `components/layout/Sidebar.jsx` | MODIFY — 2 sidebar entries |
| `App.js` | MODIFY — 2 routes |

**WILL NOT touch:** `CustomersRfmMockup.jsx`, `CustomersMixMockup.jsx`, `crmAxios.js`, `insightsService.js`

---

## Critical Implementation Notes for Next Agent

1. **`crmReportCache`** — create separate from `insightsCache`. 5-min TTL for `/summary`, no cache for `/churn-risk`.
2. **`data.count` for win-back badge** — not `customers.length`. If `count=2081` and `limit=50`, show "2,081 total" not "50".
3. **No day numbers in lifecycle labels** — say "At Risk", "Dormant", never "31-60 days". Thresholds are tenant-configurable.
4. **Tier: Platinum** — not VIP. Bronze/Silver/Gold/Platinum.
5. **`last_visit_days_ago` is nullable** — null if customer never ordered. Guard everywhere.
6. **WhatsApp button** — `wa.me/91{phone}` pattern (same as CR-017).
7. **No date picker on either screen** — note in UI that CRM uses fixed windows.

---

## Next Steps

**Role:** PLANNING (Gate 3 — Implementation Plan)
**Item:** CR-131
**Action:** Write `memory/plans/CR-131_IMPLEMENTATION_PLAN.md`

Refer to `impact/CR-131_IMPACT_ANALYSIS.md` for exact scope, files, field list, and verification matrix.
