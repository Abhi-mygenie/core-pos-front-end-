# Plan Amendment #1 — CR-078 · Phase A Utility Refactor + Data-Fetch Contract Fix

**Date:** 2026-07-19
**Trigger:** Implementation-agent §Step 0 flag → Planning-agent gap review
**Session:** Post-Phase-B session
**Amends:** `/app/memory/plans/CR-078_CR-079_IMPLEMENTATION_PLAN.md` §4.1 (Utilities) + §4.3 Edit #12 (SmartPurchasePanel data fetches)
**Author role:** PLANNING (per AGENT_PROMPT_ALPHA v0.7)

---

## 1. Root cause

During Phase C entry verification, curl-probing revealed the plan (and prior Gate 2 IA) made **7 endpoint / shape assumptions that did not match preprod reality**. Planner-side review found **8 additional foundation gaps** (payment-methods response, sub-recipe filtering, restaurant_type_flag surfacing, etc.). Total: **15 gaps** — 12 behavior-changing, 3 confirmatory.

Root cause: The Gate 2 IA was authored from mock v5 + intake docs without a live curl against `/report/daily-consumption-report`, `/vendor-item-list`, and `/stock-inventory`. First live probe happened at implementation time.

**Lesson recorded for future planners:** Any plan involving a NEW data-consumer surface MUST curl every named endpoint against preprod during Gate 2, capture full response samples in the IA doc, and reference the sample in the plan.

---

## 2. Endpoint contract corrections (live-curl validated)

### 2.1 Daily Consumption Report
```
POST /api/v2/vendoremployee/report/daily-consumption-report
Headers: Content-Type: application/json · X-localization: en · Authorization: Bearer <TOK>
Body:    { "from_date": "YYYY-MM-DD", "to_date": "YYYY-MM-DD" }

Response shape:
{
  stock_summary: [                 // ← use this array only for Smart Purchase
    {
      ingredient_id: 10747,
      ingredient_name: "Milk",
      category_id: 1061,
      category_name: "Dairy",
      total_consumed: "80 ml",     // STRING "<value> <unit>"
      closing_stock:  "920 ml",
      opening_stock:  "1 ltr"
    }, ...
  ],
  stock_details: [ ... per-order breakdown — NOT USED by Smart Purchase ],
  date_range:    { ... },
  restaurant_id: 689,
  applied_restaurant_ids: [...],
  hierarchy_scope: {...}
}
```

### 2.2 Vendor Item List
```
GET /api/v2/vendoremployee/inventory/vendor-item-list
Response wrapper: { data, total_amount, summary, by_restaurant }
Row shape (inside .data):
{
  ID:                     13815,
  restaurant_id:          689,
  ingredient_id:          10707,
  Restaurant_Name:        "Kunafa Mahal",
  restaurant_type_flag:   "normal",
  Ingredient_Name:        "Blueberry Filling",
  Purchase_Date:          "2026-07-18",       // ← use this for B5 tie-breaker
  Vendor_Name:            "",                  // may be empty
  vendor_id:              null,                // may be null
  Quantity:               "3 gm",              // STRING
  stock_quantity_raw:     3,
  Amount:                 210,
  line_total:             210,
  unit_price:             70,
  Payment_Type:           ""
}
```

### 2.3 Stock Inventory (confirming existing usage)
```
GET /api/v2/vendoremployee/inventory/stock-inventory
Response: { current_stocks: [ {id, stock_title, unit, quantity, ...} ] }
```
- `id` is the ingredient_id (NOT `ingredient_id`)
- `stock_title` is the display name (NOT `name`)
- `quantity` is a **string that parses as number** (e.g. "4.654") — DIFFERENT from DCR strings that carry unit suffix
- `is_sub_recipe: true` rows are NOT purchasable — must be filtered out of the planner

### 2.4 Payment Methods (confirming existing usage)
```
GET /api/v2/vendoremployee/expense/payment-method
Response: { Payment_method: ["UPI", "Cash", "Bank Transfer", "Cash Draw"] }
```
- Array of STRINGS, not objects
- Existing `inventoryService.getPaymentMethods()` already unwraps correctly ✅

---

## 3. Amendments

### Amendment #1 · `utils/purchasePlanner.js` — full refactor

Replace shipped Phase A stub with unit-aware planner. New public API:

| Function | Signature | Purpose |
|---|---|---|
| `parseQuantity` | `(str: string) → {value: number, unit: string}` | Split "5.703 kg" → {value: 5.703, unit: 'kg'} |
| `convertToBase` | `(value: number, unit: string) → number` | Weight → g · Volume → ml · piece → piece |
| `getHorizonDates` | `(horizonDays: number) → {from_date: string, to_date: string}` | For DCR body construction · YYYY-MM-DD |
| `computeVelocity` | `(dcrRow: object, horizonDays: number) → number` | `total_consumed / horizonDays` in base units |
| `computePlan` | `({stockInventory, dcrStockSummary, horizonDays}) → row[]` | Full planner · filters sub-recipes (G9) + zero-gap (B2) |

**Unit families supported (v1):**
- **Weight:** `g`, `gm`, `kg` → base = `g` (1 kg = 1000 g)
- **Volume:** `ml`, `ltr`, `l` → base = `ml` (1 ltr = 1000 ml)
- **Count:** `piece`, `pcs`, `pc` → base = `piece` (passthrough)
- **Unknown unit:** returns value as-is + warning marker on row · falls back to string display

**Sub-recipe filter (G9):** `is_sub_recipe === true` rows dropped from planner.

**Row shape returned by `computePlan`:**
```
{
  ingredient_id, name, unit,           // ingredient's canonical unit for user display
  on_hand,                              // number, in ingredient's unit
  velocity_per_day,                     // number, in ingredient's unit per day
  projected_need,                       // = velocity_per_day × horizonDays
  gap,                                  // = on_hand - projected_need (in ingredient unit)
  suggest_qty,                          // Math.ceil(-gap) if gap < 0
  _debug_base: { on_hand_base, projected_need_base, base_unit }  // for QA
}
```

### Amendment #2 · `utils/vendorRanking.js` — field-name fix

Change one line in `rankVendors`:
```
- const date = r.last_purchase_date ?? r.purchase_date ?? r.date ?? '';
+ const date = r.Purchase_Date ?? r.last_purchase_date ?? r.purchase_date ?? r.date ?? '';  // G7
```

### Amendment #3 · `api/constants.js` — add endpoint constants

Add new block `REPORT_ENDPOINTS`:
```js
export const REPORT_ENDPOINTS = {
  DAILY_CONSUMPTION_REPORT: '/api/v2/vendoremployee/report/daily-consumption-report',
};
```

Extend `INVENTORY_ENDPOINTS` with:
```js
VENDOR_ITEM_LIST: '/api/v2/vendoremployee/inventory/vendor-item-list',
```

### Amendment #4 · `api/services/inventoryService.js` — add 2 services

```js
export async function getDailyConsumptionReport({ from_date, to_date }) {
  // CR-078 · POST — returns { stock_summary, stock_details, ... }
  const res = await api.post(REPORT_ENDPOINTS.DAILY_CONSUMPTION_REPORT, { from_date, to_date });
  return res.data;
}

export async function getVendorItemList() {
  // CR-078 · unwrap .data.data (G6)
  const res = await api.get(INVENTORY_ENDPOINTS.VENDOR_ITEM_LIST);
  return res.data?.data || [];
}
```

Import `REPORT_ENDPOINTS` at top of service file.

### Amendment #5 · Plan §4.3 Edit #12 data-fetch section rewrite

Replace:
```
Data fetches on mount + on horizonDays change:
- 3 parallel: getStockInventory() · getDailyConsumptionReport({days: horizonDays}) · getVendorItemList()
- On response → rows = computePlan({...}).map(r => ({...r, vendor_id: rankVendors(vil, r.ingredient_id).winner.vendor_id }))
```

With:
```
Compute { from_date, to_date } via getHorizonDates(horizonDays)
Fire 4 parallel fetches:
  getStockInventory()                          → { current_stocks: [...] }
  getDailyConsumptionReport({from_date, to_date}) → { stock_summary: [...] }
  getVendorItemList()                          → [ ... ] (unwrapped)
  getPaymentMethods()                          → [ "UPI", "Cash", ... ] (already unwrapped)
On response:
  rows = computePlan({
    stockInventory:   stockRes.current_stocks,
    dcrStockSummary:  dcrRes.stock_summary,
    horizonDays,
  }).map(row => ({
    ...row,
    vendor_id: rankVendors(vil, row.ingredient_id).winner?.vendor_id ?? null
  }))
```

### Amendment #6 · Verification Matrix additions

Add to plan §6:

| # | Test | Locked rule | Expected | Auto? |
|---|---|---|---|:---:|
| 27 | `parseQuantity("5.703 kg")` | G3 | `{value: 5.703, unit: 'kg'}` | YES |
| 28 | `parseQuantity("80 ml")` | G3 | `{value: 80, unit: 'ml'}` | YES |
| 29 | `parseQuantity("5 piece")` | G3 | `{value: 5, unit: 'piece'}` | YES |
| 30 | `parseQuantity("  1.5  ltr  ")` (whitespace) | G3 | `{value: 1.5, unit: 'ltr'}` | YES |
| 31 | `parseQuantity("garbage")` | G3 | `{value: 0, unit: ''}` (safe fallback) | YES |
| 32 | `convertToBase(1, 'kg')` | G4 | `1000` (g) | YES |
| 33 | `convertToBase(1, 'ltr')` | G4 | `1000` (ml) | YES |
| 34 | `convertToBase(5, 'piece')` | G4 | `5` (passthrough) | YES |
| 35 | `convertToBase(2, 'unknown')` | G4 | `2` (safe passthrough) | YES |
| 36 | `getHorizonDates(7)` for today=2026-07-19 | G12 | `{from_date: '2026-07-13', to_date: '2026-07-19'}` | YES |
| 37 | `computePlan` filters `is_sub_recipe: true` rows | G9 | Sub-recipes absent from output | YES |
| 38 | `computeVelocity` on `{total_consumed: "5.703 kg"}` × 7d horizon | B1 + G2 + G3 + G4 | `5703 / 7 ≈ 814.71 g/day` | YES |
| 39 | Full pipeline fixture: Butter on-hand=2 kg, consumed=5.703 kg in 7d | End-to-end | Suggest_qty > 0 · gap < 0 | YES |
| 40 | `rankVendors` reads `Purchase_Date` field for tie-break | G7 | Correct winner selected | YES |

### Amendment #7 · Handover reference

`FILE_OWNERSHIP.md` inventory section (still pending — Phase G) should record:
- `utils/purchasePlanner.js` — CR-078 (author: Planning post-Amendment#1)
- `utils/vendorRanking.js` — CR-078 (author: Planning post-Amendment#2)
- New services + constants: CR-078

### Amendment #8 · Pending Owner Rulings (Phase C blockers)

- **G11 · Receive pill wiring** (unrelated to Phase A refactor — needed before Phase C or E)
- **G15 · Ad-hoc new-ingredient policy** (unrelated to Phase A refactor — needed before Phase C)

---

## 4. Impact on shipped Phases

| Phase | Files | Refactor scope |
|---|---|---|
| A · Utilities | `utils/purchasePlanner.js` | **Full rewrite** (G2, G3, G4, G8, G9, G12) |
| A · Utilities | `utils/vendorRanking.js` | **1-line change** (G7) |
| A · Utilities | `api/constants.js` | **Add 1 block + 1 entry** (G1) |
| A · Utilities | `api/services/inventoryService.js` | **Add 2 services** (G1, G6) |
| B · Renames | `CurrentStockPanel.jsx` + peers | ✅ Unaffected |
| B.5 · CR-075-A polish | Same file | ✅ Unaffected |

Nothing shipped in Phase B / B.5 needs rework.

---

## 5. Registry sync

CR-078 registry entry `status_history` gets a new row:
```
{
  from: "PLANNED (gate=3)",
  to:   "PLANNED (gate=3 · amended)",
  date: "2026-07-19",
  reason: "Implementation-agent §Step 0 flagged 7 endpoint/shape gaps at Phase C entry. Planning agent gap review found 15 total. Amendments #1-#8 written. Phase A utilities require refactor. Phase B/B.5 unaffected. See /app/memory/plans/CR-078_PLAN_AMENDMENT_01_2026-07-19.md."
}
```

---

## 6. Approval trace

Owner ruling 2026-07-19: **"amend only, walk me through the refactor first"**
→ Amendments recorded to disk (this doc) · registry synced · code refactor pending owner code-walk approval before applying.
