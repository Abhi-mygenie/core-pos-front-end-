# CR-093 — Consumption Report: Impact Analysis (Gate 2)
**Date:** 2026-07-23
**Role:** PLANNING (Gate 2)
**Status:** IMPACT ANALYSIS COMPLETE — awaiting owner OQ responses before Gate 3

---

## 1. API Reality Check

### Endpoint
`POST /api/v2/vendoremployee/report/daily-consumption-report`
Already in `constants.js:196` as `DAILY_CONSUMPTION_REPORT` ✅

### Live Response (palmhouse, Jul 2026)
```
stock_summary: 34 rows  (aggregate per ingredient)
stock_details: 987 rows (per-order line items)
```

### `stock_summary` available fields:
| Field | Available | Notes |
|---|---|---|
| ingredient_id | ✅ | — |
| ingredient_name | ✅ | — |
| category_id | ✅ | — |
| category_name | ✅ | — |
| total_consumed | ✅ | string e.g. "270 ml" |
| opening_stock | ✅ | string e.g. "1.05 ltr" |
| closing_stock | ✅ | string e.g. "780 ml" |
| cost_per_unit | ❌ | NOT in response |
| total_cost | ❌ | NOT in response |
| recipe_cost | ❌ | NOT in response |
| margin | ❌ | NOT in response |

### `stock_details` available fields:
consumption_date, order_id, food_id, food_item, order_type, brand_name, ingredient_id, ingredient_name, category_id, category_name, quantity_deducted

---

## 2. Filter Support (curl-verified)

| Filter param | Works? | Notes |
|---|---|---|
| `start_date` + `end_date` | ✅ YES | Works correctly |
| `category_id` | ✅ YES | Tested — returns only matching category |
| `ingredient_id` | ❌ NO | Backend ignores — returns all rows |

---

## 3. Backend Blockers

### BLOCKER-1 (MEDIUM): Cost / Margin fields missing
`cost_per_unit`, `total_cost`, `recipe_cost`, `margin` not returned by DCR endpoint.
No `include_cost=true` workaround exists.
→ Requires backend to add cost fields to response.

### BLOCKER-2 (LOW): ingredient_id filter not working
`ingredient_id` param sent but backend returns all rows.
→ FE workaround: client-side filter on the JS response. No blocking.

---

## 4. Navigation / Placement

Owner instruction: **"comes in Insights at last after Expenses"**

Current Insights sidebar tail (Sidebar.jsx lines 194-195):
```jsx
{ id: "insights-expenses-group", label: "Expenses", isGroup: true },
{ id: "insights-expense-report", label: "Expense Report", path: "/reports-module/expense-report" },
// ← INSERT NEW GROUP HERE
```

Proposed addition:
```jsx
{ id: "insights-inventory-group", label: "Inventory", isGroup: true },
{ id: "insights-consumption", label: "Consumption Report", path: "/reports-module/consumption-report" },
```

Route: `/reports-module/consumption-report`

---

## 5. Files Impact

| File | Change | Lines |
|---|---|---|
| `src/components/layout/Sidebar.jsx` | +2 rows after Expenses group | ~2 |
| `src/App.js` | +1 route entry | ~2 |
| `src/api/constants.js` | Already has endpoint ✅ | 0 |
| `src/api/services/inventoryService.js` | +1 function `getConsumptionReport(params)` | ~6 |
| `src/pages/reports-module/ConsumptionReportPage.jsx` | NEW — full screen | ~200-250 lines |

**Total estimate:** ~260-270 lines, 5 files (4 existing + 1 new)

---

## 6. Screen Design (from API data)

### Layout
- S7 header (matches PLReportPage, DailySalesMockup pattern)
- Filter bar: date range (From/To) + Category dropdown + Ingredient search
- KPI strip: Total Ingredients | Total Consumption Entries | (Avg Cost — pending backend)
- Table: Ingredient | Category | Opening | Consumed | Closing | (Cost/Unit | Total Cost — ⚠ pending backend)
- Expandable row drill → stock_details per ingredient (orders that consumed it)
- Export: Excel

### Table mode proposed
- **Summary tab** (default): 1 row per ingredient from `stock_summary`
- **Detail tab**: flat table from `stock_details` (per order, filterable by date/category)

---

## 7. Owner Decisions — LOCKED (2026-07-23)

| OQ | Decision | Notes |
|---|---|---|
| OQ-1 | **a** — Build without cost columns now; raise backend brief | Backend brief filed: BACKEND_BLOCKERS_BRIEF_2026_07_22.html |
| OQ-2 | **a** — Client-side ingredient filter; also file to backend | Backend brief filed: BACKEND_BLOCKERS_BRIEF_2026_07_22.html |
| OQ-3 | **b** — Summary + expandable drill-down to order level | Click row → shows stock_details per ingredient |
| OQ-4 | **b** — Excel + PDF export | Both export types required |
| OQ-5 | **Daily Report section, below P&L** | NOT in Insights; in Daily Report sidebar group after profit-loss |

**Gate 3 unlocked. Implementation Plan at:** `/app/memory/plans/CR-093_IMPLEMENTATION_PLAN.md`

---

## 7-B. Open Questions for Owner (archived — all answered)

**OQ-1 — Cost fields (BLOCKING for full spec):**
`cost_per_unit`, `total_cost`, `recipe_cost`, `margin` are NOT in the API.
Options:
- a) Build WITHOUT cost columns now, raise backend brief → add cost later (ship faster)
- b) WAIT for backend to add cost fields before building
- c) Derive cost from last vendor purchase rate (FE-side join, complex)

Owner must choose a/b/c before Gate 3.

**OQ-2 — Ingredient filter (backend broken):**
`ingredient_id` filter doesn't work on backend. FE can filter client-side.
- a) Client-side filter only (ship immediately, good enough for 34-500 rows)
- b) Backend brief + wait
→ Recommend: a (client-side filter is fast enough for expected dataset size)

**OQ-3 — Table layout:**
- a) Summary only (1 row per ingredient, simpler, faster)
- b) Summary + expandable rows → order-level drill (richer, ~30% more work)
- c) Two tabs — Summary | Details

**OQ-4 — Export:**
- a) Excel only
- b) Excel + PDF
- c) No export for now

**OQ-5 — Sidebar label:**
New group after Expenses — what label?
- a) "Inventory" (clear, matches module name)
- b) "Stock Reports"
- c) No group header, just add "Consumption Report" as standalone item after Expense Report

---

## 8. Risk Assessment

| Category | Risk | Notes |
|---|---|---|
| Backend blocker (cost fields) | MEDIUM | Partial build possible without cost; full spec blocked |
| Ingredient filter FE workaround | LOW | Client-side filter trivial |
| New page (no existing file conflicts) | LOW | No hotspot files touched |
| Sidebar entry (2 lines) | LOW | Pattern well-established |
| App.js route (2 lines) | LOW | Pattern well-established |

**Overall risk: LOW-MEDIUM** (LOW if OQ-1 answered as 'a', MEDIUM if waiting for backend cost fields)

---

## 9. Retroactive Candidates
NONE

---

## 10. Recommendation

**Build Phase 1 without cost/margin columns** (OQ-1 option a):
- Ship the screen with: ingredient, category, opening stock, consumed qty, closing stock
- Show `—` for cost columns with tooltip "Coming soon — backend update pending"
- Raise backend brief for cost fields in parallel
- Phase 2 adds cost/margin once backend delivers

This unblocks the screen immediately while keeping scope honest.

---

## Evidence
- API response: `/app/memory/evidence/CR-093/dcr_palmhouse_full.json`
- HTML Mock: `/app/frontend/public/cr093_mock.html`
