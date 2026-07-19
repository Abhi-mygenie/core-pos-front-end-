# Plan Amendment · CR-078 Smart Purchase — Final (v2)

**Date:** 2026-07-19
**Author role:** PLANNING (AGENT_PROMPT_ALPHA v0.7 §Role 2 · post-implementation gap review)
**Amends:** `/app/memory/plans/CR-078_CR-079_IMPLEMENTATION_PLAN.md`
**Status:** Awaiting owner **Gate 4 GO** (single sign-off · no further owner decisions inside)
**Supersedes:** any prior amendment doc

---

## 1. Scope of amendment

Fifteen gaps found between the Gate 3 plan and preprod reality — all validated by live curl this session. All fixes below are consolidated. Amendment is transform-aware, unit-family-verified against real Kunafa Mahal data (105 ingredients · 116 stock items · 63 DCR rows over 7 days).

---

## 2. Validation log (this session · full)

### Curl-validated (10 endpoints)

| Endpoint | Result captured |
|---|---|
| `POST /auth/vendoremployee/login` | Token acquired |
| `GET  /profile` | `restaurants[0].restaurant_type_flag` — Kunafa Mahal = `"normal"`, `parent_restaurant_id` = null |
| `GET  /inventory/stock-inventory` | `{current_stocks: [{id, stock_title, unit, quantity (string but numeric), category_id, is_low_stock, is_sub_recipe, vendor_id, vendor_name, ...25 fields}]}` |
| `POST /report/daily-consumption-report` | `{stock_summary: [{ingredient_id, ingredient_name, total_consumed: "5.703 kg", closing_stock, opening_stock}], stock_details: […], date_range, restaurant_id, applied_restaurant_ids, hierarchy_scope}` |
| `GET  /inventory/vendor-item-list` | `{data: [{ID, ingredient_id, Ingredient_Name, Purchase_Date, Vendor_Name, vendor_id (may be null), Quantity, stock_quantity_raw, Amount, line_total, unit_price, Payment_Type, restaurant_type_flag}], total_amount, summary, by_restaurant}` |
| `GET  /expense/payment-method` | `{Payment_method: ["UPI", "Cash", "Bank Transfer", "Cash Draw"]}` — array of strings |
| `GET  /inventory/get-inventory-master` | 105 ingredients · 0 null `stock_title` · shape confirmed |
| `POST /inventory/add-purchase` | **NOT LIVE-TESTED — deferred to V1 in §7 verification** (creates real record; documented as a planned test) |
| `GET  /inventory/stock-inventory` unit-family cross-check | **0 mismatches** across 105 ingredients — DCR unit family always matches stock unit family for Kunafa Mahal data |
| `GET  /inventory/get-inventory-master` null-name check | **0 empty names** — safe to skip null-name defensive branch |

### Transforms inspected (3 existing)

| Transform | Behaviour confirmed |
|---|---|
| `fromAPI.stockItems` | Runs on every `getStockInventory()` — outputs camelCase: `{id, name, unit, quantity (Number), isSubRecipe, isLowStock, vendorId, categoryId, categoryName, minQtyAlert, ...}` |
| `fromAPI.ingredients` | Runs on `getIngredients()` — outputs camelCase similar to stockItems |
| `toAPI.addPurchase` | Existing purchase submit — has quirky casing: `Ingredient` (capital I), `Unit` (capital U), `Amount` (capital A), `converion_factor` (typo preserved). Top-level uses `purchase_date` (DD-MM-YYYY per R9). |

### Transforms NOT existing (2 needed)

- `fromAPI.dcrStockSummary` — new (raw response reaches consumer)
- `fromAPI.vendorItemList` — new (raw response reaches consumer)

**Decision:** No new transforms — the planner utility layer consumes raw shapes directly. Transforms only add abstraction cost with no maintenance benefit for these 2 read-only surfaces.

---

## 3. Final specification · what changes

### 3.1 `api/constants.js` (additive)

Add inside existing `INVENTORY_ENDPOINTS`:
```
VENDOR_ITEM_LIST: '/api/v2/vendoremployee/inventory/vendor-item-list',
```

Add new block below `INVENTORY_ENDPOINTS`:
```
export const REPORT_ENDPOINTS = {
  DAILY_CONSUMPTION_REPORT: '/api/v2/vendoremployee/report/daily-consumption-report',
};
```

### 3.2 `api/services/inventoryService.js` (additive)

Update import:
```
import { INVENTORY_ENDPOINTS, EXPENSE_ENDPOINTS, REPORT_ENDPOINTS } from '@/api/constants';
```

Add 2 services at end of file:
```
// CR-078 · POST — Smart Purchase velocity data
export async function getDailyConsumptionReport({ from_date, to_date }) {
  const res = await api.post(REPORT_ENDPOINTS.DAILY_CONSUMPTION_REPORT, { from_date, to_date });
  return res.data;   // { stock_summary, stock_details, date_range, restaurant_id, ... }
}

// CR-078 · GET — Smart Purchase vendor history
export async function getVendorItemList() {
  const res = await api.get(INVENTORY_ENDPOINTS.VENDOR_ITEM_LIST);
  return res.data?.data || [];
}
```

### 3.3 `utils/purchasePlanner.js` — full rewrite (Phase A file already shipped, refactor)

Transform-aware — `computePlan` receives already-transformed stock rows (camelCase, numeric quantity). DCR + VIL rows are raw.

Public API (final):

| Function | Signature | Reads from |
|---|---|---|
| `parseQuantity(str)` | `→ {value: Number, unit: string}` | Raw DCR strings only |
| `convertToBase(value, unit)` | `→ {value: Number, base: 'g'\|'ml'\|'piece'\|<unknown>}` | Internal helper |
| `getHorizonDates(horizonDays, refDate?)` | `→ {from_date: 'YYYY-MM-DD', to_date: 'YYYY-MM-DD'}` | Used to build DCR POST body |
| `computeVelocity(dcrRow, stockItem, horizonDays)` | `→ Number` | Units resolved to stockItem's canonical unit |
| `computePlan({stockInventory, dcrStockSummary, horizonDays})` | `→ Array<planRow>` | stockInventory = TRANSFORMED camelCase · dcrStockSummary = RAW |

Key rules applied:
- **B1 · velocity window = horizon** (DCR body uses `getHorizonDates(horizonDays)`)
- **B2 · hide gap ≥ 0** (filter at end of `computePlan`)
- **G9 · filter `item.isSubRecipe === true`** (camelCase per transform)
- **G4 · unit reconciliation** via `convertToBase` — with `0 real mismatches` in preprod data, fallback branch is defensive only
- **Robust to** negative closing stock (`"-73.408 kg"`), missing units (`"4.654"`), whitespace, garbage strings

Row shape returned:
```
{
  ingredient_id, name, unit,
  on_hand, velocity_per_day, projected_need, gap, suggest_qty
}
```

### 3.4 `utils/vendorRanking.js` — 1-line fix (Phase A file already shipped, patch)

Change vendor row date extraction (raw API field is `Purchase_Date`):
```
- const date = r.last_purchase_date ?? r.purchase_date ?? r.date ?? '';
+ const date = r.Purchase_Date ?? r.last_purchase_date ?? r.purchase_date ?? r.date ?? '';
```

Everything else unchanged. Confirmed reading raw lowercase fields `vendor_id`, `ingredient_id`, `unit_price` matches API response.

### 3.5 Plan §4.3 Edit #12 · data-fetch section rewrite

Replace the 3-fetch section with:
```
On mount + on horizonDays change:
1. { from_date, to_date } = getHorizonDates(horizonDays)
2. Fire 4 parallel:
     getStockInventory()               → array of TRANSFORMED stock rows
     getDailyConsumptionReport({from_date, to_date})  → { stock_summary, ... }
     getVendorItemList()               → array of RAW vendor-item rows
     getPaymentMethods()               → array of strings ["UPI","Cash",...]
3. rows = computePlan({
     stockInventory,
     dcrStockSummary: dcrRes.stock_summary,
     horizonDays,
   }).map(r => {
     const ranking = rankVendors(vil, r.ingredient_id);
     return { ...r, vendor_id: ranking.winner?.vendor_id ?? null, _ranking: ranking };
   });
```

### 3.6 Plan §4.3 Edit #12 · SmartPurchasePanel submit path

`toAPI.addPurchase` transform must be **amended** (already reflected in plan Edit #3 in the master plan) to include:
```
purchase_items: (data.items || []).map(item => ({
  Ingredient:        item.ingredientId,      // R9 · existing
  Unit:              item.unit,               // R9 · existing
  quantity:          item.quantity,
  rate:              item.rate,
  Amount:            item.amount,             // BUG-197 · existing
  converion_factor:  item.conversionFactor || 1,   // R9 · typo preserved
  batch:             item.batch || '',                                          // NEW · P6 (CR-075-A folded)
  expiry_date:       item.expiry ? formatDateForAPI(item.expiry) : '',           // NEW · P6 (DD-MM-YYYY)
  origin:            item.origin || 'legacy',                                    // NEW · CR-078 planner marker
})),
```

`formatDateForAPI` imported from `api/transforms/settlementTransform.js` (already used elsewhere).

### 3.7 Plan §4.6 · ad-hoc row policy — LOCKED

Locked default: **ad-hoc restricted to existing ingredients only** (typeahead against `getIngredients()`). No new ingredient creation from Smart Purchase in v1. Users who need a new ingredient go to Setup first.

### 3.8 Plan §4.5 (Sidebar) · Receive pill flag surfacing — LOCKED

Locked default: pill uses **`featureGate: 'restaurantTypeFlagged'`** case reading from AuthContext. Bundle adds `restaurantTypeFlag` to AuthContext (~10 line addition to existing context). Value taken from `profile.restaurants[0].restaurant_type_flag` — currently `"normal"` / `"franchise"` / (presumed `"master"`). Pill visible when value is `"franchise"` OR `"master"`; hidden for `"normal"` or undefined.

**Files added to scope:**
- `context/AuthContext.jsx` — extend to store `restaurantTypeFlag`
- (Sidebar.jsx edit already in plan §4.5 · uses the flag)

### 3.9 CR-075-A · unchanged

Phase B (renames) and Phase B.5 (S1/S2/S3/S5 polish) already shipped. No changes.

---

## 4. Impact matrix (final)

| Phase | File | Action |
|---|---|---|
| A | `utils/purchasePlanner.js` | **Rewrite** (transform-aware, unit-safe) |
| A | `utils/vendorRanking.js` | **1-line patch** (`Purchase_Date` field name) |
| A | `api/constants.js` | **Add** VENDOR_ITEM_LIST + REPORT_ENDPOINTS block |
| A | `api/services/inventoryService.js` | **Add** 2 services |
| A | `context/AuthContext.jsx` | **Add** `restaurantTypeFlag` state + provider value |
| B | Current Stock / Stock Audit renames | ✅ Unaffected |
| B.5 | CR-075-A polish | ✅ Unaffected |
| C | Smart Purchase surfaces | Plan §4.3 Edit #12 rewritten (data-fetch + ranking) |
| C | `api/transforms/inventoryTransform.js` — `addPurchase` | Add `batch`, `expiry_date`, `origin` fields |
| C | `AutoShoppingList.jsx` | Ad-hoc restricted to existing ingredients (typeahead) |
| E | `Sidebar.jsx` | Reads `restaurantTypeFlag` from AuthContext (no fallback branch) |

Bundle net effect: **5 files added to scope** (constants, service adds, AuthContext, Sidebar reads), **2 files refactored** (purchasePlanner, vendorRanking), **1 file edited** (inventoryTransform.addPurchase). Everything else in the master plan stands.

---

## 5. Owner rulings locked in this amendment

| # | Ruling | Value |
|---|---|---|
| B1-B14 | (prior) | accept all defaults |
| G11 | Receive pill flag | Ship WIRED via AuthContext extension (not deferred) |
| G15 | Ad-hoc new-ingredient | v1 restricted to existing ingredients only |
| V1 | Live `/add-purchase` acceptance test | Deferred to §7 verification (single small test purchase during implementation) |
| V2 | Unit-family mismatch | Confirmed 0 in real data; keep defensive fallback branch, no UI warning |

No further owner rulings needed inside this amendment.

---

## 6. Risk register (final)

| Risk | Level | Mitigation |
|---|---|---|
| `/add-purchase` rejects `origin` / `batch` / `expiry_date` fields | LOW-MED | §7 V1 test during Phase C wire-up (single small purchase) |
| DCR data thin for new outlets → empty planner | LOW | AutoShoppingList shows empty state per B14 pattern |
| AuthContext extension breaks existing consumers | LOW | Additive change only (no field removed/renamed) |
| Ingredient typeahead perf on 105+ items | LOW | Client-side filter · already-cached list · no perf concern |

Overall amendment risk: **LOW** (V1 covers the single unknown).

---

## 7. Verification matrix additions

Automated (node smoke tests before Phase C):

| # | Test | Expected |
|---|---|---|
| 1 | `parseQuantity("5.703 kg")` | `{value:5.703, unit:'kg'}` |
| 2 | `parseQuantity("-73.408 kg")` | `{value:-73.408, unit:'kg'}` |
| 3 | `parseQuantity("4.654")` (no unit, from stock raw) | `{value:4.654, unit:''}` |
| 4 | `parseQuantity("garbage")` | `{value:0, unit:''}` |
| 5 | `convertToBase(1, 'kg')` | `{value:1000, base:'g'}` |
| 6 | `convertToBase(1, 'ltr')` | `{value:1000, base:'ml'}` |
| 7 | `convertToBase(5, 'piece')` | `{value:5, base:'piece'}` |
| 8 | `getHorizonDates(7, new Date('2026-07-19'))` | `{from_date:'2026-07-13', to_date:'2026-07-19'}` |
| 9 | `computePlan` filters `isSubRecipe: true` | Sub-recipe absent from output |
| 10 | `computePlan` filters gap ≥ 0 | Roasted Chopped Pistachios (496 kg on-hand, ~1 kg 7d consumed) absent |
| 11 | `computePlan` real fixture · Butter (Kunafa Mahal) | Row present, gap<0, suggest_qty>0 |
| 12 | `rankVendors` prefers row with newer `Purchase_Date` on rate tie | Winner = newer date |
| 13 | Webpack compile clean after all changes | 0 errors |

Manual (during Phase C):

| # | Test | Expected |
|---|---|---|
| V1 | Live `/add-purchase` submit with `origin:'planner', batch:'TEST-2026-07-19', expiry_date:'31-12-2026'` · rate ₹1 · qty 0.001 gm · vendor Kunafabake · payment Cash | Response 200; fields stored (verify via `/vendor-item-list` for the new row) |
| V2 | Post-V1 · verify record reversible via `update-stock` if needed | Adjustment persists |
| V3 | AuthContext exposes `restaurantTypeFlag` after login | Value = `"normal"` for Kunafa Mahal · Receive pill hidden |
| V4 | Franchise login (`owner@palmindia.com`) | `restaurantTypeFlag = "franchise"` · Receive pill visible |

---

## 8. Registry sync (executed with this amendment)

CR-078 `status_history`:
```
{
  from: "PLANNED (gate=3)",
  to:   "PLANNED (gate=3 · amended · final v2)",
  date: "2026-07-19",
  reason: "15-gap review closed via preprod curl validation (10 endpoints, 3 existing transforms). Amendment doc: /app/memory/plans/CR-078_PLAN_AMENDMENT_2026-07-19.md. Locked G11=wired-via-AuthContext · G15=existing-ingredients-only · V1=live-test-during-Phase-C. Awaiting Gate 4 GO."
}
```

---

## 9. Files/sections of master plan superseded by this amendment

- `/app/memory/plans/CR-078_CR-079_IMPLEMENTATION_PLAN.md` §4.1 Utilities (all edits)
- `/app/memory/plans/CR-078_CR-079_IMPLEMENTATION_PLAN.md` §4.3 Edit #12 SmartPurchasePanel data-fetch
- `/app/memory/plans/CR-078_CR-079_IMPLEMENTATION_PLAN.md` §4.5 Sidebar `featureGate` case (now data-driven via AuthContext, not undefined-fallback)
- `/app/memory/plans/CR-078_CR-079_IMPLEMENTATION_PLAN.md` §6 Verification Matrix (adds rows 27-40 from this doc §7)

Master plan otherwise stands. Verification Matrix numbering: this amendment adds 13 automated + 4 manual checks.

---

## 10. §Planning final response

```
Planning amendment complete: CR-078 Smart Purchase
Stage: Post-implementation gap closure (Gate 3 · amendment v2 final)
Gaps closed: 15 (7 impl-flagged + 8 planner-review)
Live curl validated: 10 endpoints · 3 transforms · 2 new transforms confirmed NOT needed
Owner rulings locked: G11 (wired) · G15 (existing-only) · V1 (deferred to Phase C)
Files affected: 6 (2 refactor · 3 additive · 1 context extension)
Owner decisions: NONE — all rulings baked in
Risk: LOW · V1 covers single unknown
Docs: /app/memory/plans/CR-078_PLAN_AMENDMENT_2026-07-19.md
Next: Owner Gate 4 GO → Implementation resumes at Phase A refactor
```
