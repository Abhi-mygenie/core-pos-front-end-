# CR-477 — Impact Analysis + Implementation Plan
## Ingredient Movement Report (Dispatched / Received)

**Date:** 2026-10-28
**Stage:** Gate 2 + Gate 3 (combined — new page, no conflicts)
**Agent role:** PLANNING
**Code Reality:** NONE — endpoint not in FE, no page exists
**Conflict Pre-Check:** No conflicts — all target files are new. Modified files (constants.js, Sidebar.jsx, App.js) have no pending items on the same lines.

---

## 1. Owner Decisions (LOCKED)

| OD | Decision |
|---|---|
| OD-477-01 | Daily Report section, below Item Consumption |
| OD-477-02 | Both Excel + PDF export (standard) |
| OD-477-03 | Free text search for ingredient name |
| OD-477-04 | Last 7 days default date range |

---

## 2. Data Flow Trace

```
User navigates: Sidebar → Daily Report → Ingredient Movement
  │
  ▼
IngredientMovementReportPage.jsx (NEW)
  - Movement toggle: received / dispatched (state)
  - Date range: fromDate / toDate (state, default last 7 days)
  - Ingredient search: free text filter (state)
  │
  ▼
inventoryService.js (ADD function)
  - getIngredientMovementReport({ movement, from_date, to_date, stock_title? })
  - POST to /api/v2/vendoremployee/inventory-transfer/ingredient-movement-report
  │
  ▼
API Response (no wrapper — body IS the report):
  { movement, from_date, to_date, restaurant_id, ingredients: [...] }
  │
  ▼
Page renders:
  - Collapsed rows: stock_title | unit | total_qty | line_count
  - Expanded rows: lines[] drill-down table (from/to store, dates, qty, status)
  - Export: Excel (CSV blob) + PDF (print window)
```

---

## 3. Risk Classification

| Criterion | Assessment |
|---|---|
| Financial logic? | NO — read-only report |
| API contract change? | NO — new endpoint, not modifying existing |
| State management? | LOCAL only (page state, no context/provider) |
| Hotspot file (R5)? | NO |
| New files | ~2 (page + service function) |
| Modified files | 3 (constants.js + Sidebar.jsx + App.js — 1 line each) |

**Risk: MEDIUM** (new page with API integration, but isolated — no shared state)

---

## 4. Files Plan

### New Files

| # | File | Purpose |
|---|---|---|
| F1 | `src/pages/reports-module/IngredientMovementReportPage.jsx` | Full report page — toggle, filters, collapsible table, export |

### Modified Files

| # | File | Change | Lines |
|---|---|---|---|
| M1 | `src/api/constants.js` | Add `INGREDIENT_MOVEMENT_REPORT` endpoint | +1 line after L240 |
| M2 | `src/api/services/inventoryService.js` | Add `getIngredientMovementReport()` function | +5 lines |
| M3 | `src/components/layout/Sidebar.jsx` | Add sidebar entry below Item Consumption | +1 line after L100 |
| M4 | `src/App.js` | Add route for `/reports-module/ingredient-movement` | +2 lines (import + Route) |

---

## 5. Implementation Plan (Gate 3)

### M1 — constants.js
```js
// After L240 (ITEM_CONSUMPTION_REPORT):
INGREDIENT_MOVEMENT_REPORT: '/api/v2/vendoremployee/inventory-transfer/ingredient-movement-report', // CR-477
```

### M2 — inventoryService.js
```js
// CR-477: Ingredient Movement Report (dispatched/received)
export async function getIngredientMovementReport({ movement, from_date, to_date, stock_title }) {
  const body = { movement, from_date, to_date };
  if (stock_title) body.stock_title = stock_title;
  const res = await api.post(REPORT_ENDPOINTS.INGREDIENT_MOVEMENT_REPORT, body);
  return res.data;
}
```

### M3 — Sidebar.jsx
```js
// After L100 (item-consumption entry):
{ id: "ingredient-movement", label: "Ingredient Movement", path: "/reports-module/ingredient-movement" }, // CR-477
```

### M4 — App.js
```js
// Import:
import IngredientMovementReportPage from "./pages/reports-module/IngredientMovementReportPage"; // CR-477

// Route (inside reports-module Routes):
<Route path="ingredient-movement" element={<ProtectedRoute><IngredientMovementReportPage /></ProtectedRoute>} /> {/* CR-477 */}
```

### F1 — IngredientMovementReportPage.jsx
Pattern: Mirror `ItemConsumptionReportPage.jsx` (CR-472) structure:

**Layout:** Sidebar left + content area with header, filter bar, data table
**Header:** Back button + "Ingredient Movement" title + Export buttons (Excel/PDF)
**Filter bar:** Movement toggle (Received/Dispatched) + Date presets (Today, Last 7 Days, MTD, Custom) + Date inputs + Search input + Fetch button
**Table — collapsed:** Chevron | Ingredient | Unit | Total Qty | Transfers
**Table — expanded:** From Store | To Store | Dispatched | Received | Qty | Status badge
**Empty state:** "No Ingredient Movements Found" with reset button
**Loading state:** Skeleton rows

**Status badges** per design guidelines:
- `received` → emerald (green)
- `dispatched` → blue
- `in_transit` → amber
- `pending` → slate (grey)

**Date defaults:** Last 7 days (`today - 7` → `today`)

**Export:**
- Excel: CSV blob download (same pattern as CR-472 L142-154)
- PDF: Print window (same pattern as CR-472 L158-183)

---

## 6. Verification Matrix

| # | Check | How to Verify |
|---|---|---|
| V1 | Sidebar shows "Ingredient Movement" below "Item Consumption" | Browser: login → expand Daily Report in sidebar |
| V2 | Page loads at `/reports-module/ingredient-movement` | Browser: click sidebar link |
| V3 | Movement toggle switches between Received/Dispatched | Browser: click toggle, verify API call changes |
| V4 | Last 7 days default date range | Browser: page load → verify date inputs |
| V5 | Fetch returns data + renders collapsible rows | Browser: Palm House → verify 19 ingredients (received) |
| V6 | Click row → drill-down shows transfer lines | Browser: expand "Blue Tokai Attikan Coffee" → 8 lines |
| V7 | Free text search filters ingredients | Browser: type "Blue" → filtered results |
| V8 | Excel export downloads CSV | Browser: click Excel button |
| V9 | PDF export opens print view | Browser: click PDF button |
| V10 | Empty state when no data | Browser: dispatched for Palm House → 0 results → empty state |
| V11 | Webpack compiles clean | tail log |
| REG | Existing report pages unchanged | Navigate to Item Consumption, Consumption Report — still work |

---

## 7. Post-Code Registry Checklist

```
- [ ] registry.json: CR-477 → GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] CR_REGISTRY.md or BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: all new/modified files listed
- [ ] Code markers: // CR-477 in every new/modified file
- [ ] Compile check: webpack 0 new warnings
```

---

## Summary

```
Planning complete: CR-477
Stage: Impact Analysis + Implementation Plan (Gate 2+3)
Code reality: NONE (new page)
Risk: MEDIUM
Files WILL create: 1 (IngredientMovementReportPage.jsx)
Files WILL modify: 4 (constants.js, inventoryService.js, Sidebar.jsx, App.js)
Owner decisions: ALL LOCKED (4/4)
Fast Lane: NO (new page, multiple files)
Docs: impact/QA_BATCH_... (this doc)
Next: Gate 4 GO → Implementation
```
