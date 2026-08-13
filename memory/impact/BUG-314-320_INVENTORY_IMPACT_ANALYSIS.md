# Impact Analysis — Batch 1: Inventory (BUG-314 + BUG-320)

**Gate:** 2 — Impact Analysis  
**Date:** 2026-08-13  
**Role:** PLANNING  
**Sprint:** pos_5_1  
**Status:** GATE 2 COMPLETE

---

## Header

| Field | Value |
|---|---|
| Code Reality | PARTIAL — bugs exist in live code as described, no prior fix |
| Conflict Pre-Check | **NO CONFLICTS** — see §3 |
| Items | BUG-314, BUG-320 |
| Risk (highest) | MEDIUM (BUG-314) |

---

## §1 — BUG-314: Inventory Setup — Promise.all atomic failure

### Owner Clarification (this session)
Backend **will** also fix `get-inventory-master` to return `HTTP 200 + { data: [] }` instead of 404 for empty ingredient list. The FE fix (Promise.allSettled) is still required as defensive programming and to handle the period before the backend fix ships.

### Data Flow Trace

```
GET /inventory/get-inventory-master
  → Currently: HTTP 404 (restaurant has no ingredients)
  → After backend fix: HTTP 200 + { data: [] }

InventorySetupPanel.jsx (IngredientsTab) — fetchData():
  Line 42: const [ings, cats, unitList] = await Promise.all([
  Line 43:   inventoryService.getIngredients(),   ← throws on 404
  Line 44:   inventoryService.getCategories(),    ← would succeed (200)
  Line 45:   inventoryService.getUnits(),         ← would succeed (200)
  Line 46: ]);
  → catch(err) fires → toast.error only → NO setState called
  → categories = [] → CATEGORIES (0) in sidebar
  → units = []     → unit dropdown = "Unit..." only → add form blocked

BREAK POINT: Promise.all:42 — first rejected promise propagates to catch
```

### Affected Files

| File | Lines | Change Summary | Risk |
|---|---|---|---|
| `components/inventory/InventorySetupPanel.jsx` | 42–51 | `Promise.all` → `Promise.allSettled`, 3 individual result handlers, per-API error reporting | MEDIUM |

**Files NOT touched:** inventoryService.js, inventoryTransform.js, sidebar/category JSX, unit dropdown JSX — no changes outside `fetchData()`.

### Risk Assessment

| Factor | Assessment |
|---|---|
| Financial logic | NO |
| Hotspot file (R5) | NO |
| API contract change | NO — same 3 API calls, same response shapes |
| State management | Low risk — `setIngredients`, `setCategories`, `setUnits` same as before; now called individually |
| Regression scope | Low — only `fetchData()` call path changes. All downstream consumers (catCounts, filtered, unit dropdown) unchanged |

**Risk: MEDIUM** (data loading change, but isolated to one function)

### Edit Specification

**File:** `components/inventory/InventorySetupPanel.jsx`  
**Function:** `fetchData()` — lines 42–51  

**Current:**
```js
try {
  const [ings, cats, unitList] = await Promise.all([
    inventoryService.getIngredients(),
    inventoryService.getCategories(),
    inventoryService.getUnits(),
  ]);
  setIngredients(ings);
  setCategories(cats);
  setUnits(Array.isArray(unitList) ? unitList : []);
} catch (err) {
  toast.error('Failed to load ingredients');
}
```

**Proposed:**
```js
try {
  // BUG-314: Promise.allSettled — categories+units load even if ingredients fails
  const [ingsResult, catsResult, unitsResult] = await Promise.allSettled([
    inventoryService.getIngredients(),
    inventoryService.getCategories(),
    inventoryService.getUnits(),
  ]);
  const ings     = ingsResult.status     === 'fulfilled' ? ingsResult.value     : [];
  const cats     = catsResult.status     === 'fulfilled' ? catsResult.value     : [];
  const unitList = unitsResult.status    === 'fulfilled' ? unitsResult.value    : [];
  if (ingsResult.status === 'rejected') toast.error('Could not load ingredients list');
  setIngredients(ings);
  setCategories(cats);
  setUnits(Array.isArray(unitList) ? unitList : []);
} catch (err) {
  toast.error('Failed to load inventory data');
}
```

**Lines changed:** ~10 lines (replace 10 lines in try block)

### Verification Steps

| # | Step | Method |
|---|---|---|
| V1 | With no ingredients (empty list): categories sidebar shows category count, unit dropdown shows units | Browser — login as owner@thegoankitchen.com → `/inventory-setup` |
| V2 | Add ingredient form: category dropdown populated, unit dropdown populated | Browser |
| V3 | Toast "Could not load ingredients" appears only when get-inventory-master fails | Browser — DevTools Network → block endpoint |
| V4 | With ingredients present: normal load — all 3 set correctly | Browser |

### Owner Decisions
None — fix approach confirmed.

---

## §2 — BUG-320: Sub-Recipe Stock — physical_qty extra key in payload

### Data Flow Trace

```
SubRecipeStockPanel.jsx — handleSave() line 94:
  await inventoryService.addSubRecipeStock(sub.id, {
    quantity: Number(entry.qty),
    unit,
    physicalQty: Number(entry.qty),  // ← always = quantity
    reason: reasonLabel,
    ...
  });

inventoryTransform.js — toAPI.addSubRecipeStock() line 227–235:
  return {
    sub_recipe_id: data.subRecipeId,
    quantity: data.quantity,
    unit: data.unit || '',
    physical_qty: data.physicalQty ?? 0,   // ← extra key sent to API
    waste_reason: data.reason || '',
    ...
  };

Backend POST /add-sub-recipe-stock receives:
  { physical_qty: 50, quantity: 50, sub_recipe_id: 235, unit: "gm", waste_reason: "" }
  ↑ physical_qty == quantity always — semantically wrong for sub-recipe context
```

### Why `physical_qty` is wrong here

`physical_qty` is a **Stock Audit** concept: it represents the **physically observed count** of raw ingredients on a shelf, distinct from the system-computed quantity. When a user reconciles ingredient stock, they enter "I physically counted X gm" (physical_qty) vs "system thinks Y gm".

Sub-recipe stock is **produced quantity** (how many units of sub-recipe were made). There is no physical vs. computed distinction — the entered quantity IS the produced amount. The `physicalQty` line in SubRecipeStockPanel has the comment "V4: physicalQty always equals quantity entered" confirming it was a placeholder copy from StockAuditPanel logic.

### Affected Files

| File | Lines | Change | Risk |
|---|---|---|---|
| `components/inventory/SubRecipeStockPanel.jsx` | 94 | Remove `physicalQty: Number(entry.qty),` | LOW |
| `api/transforms/inventoryTransform.js` | 232 | Remove `physical_qty: data.physicalQty ?? 0,` | LOW |

**Files NOT touched:** inventoryService.js, SubRecipeStockPage.jsx, API endpoints, StockAuditPanel (uses `physical_qty` correctly — DO NOT change).

### Risk Assessment

| Factor | Assessment |
|---|---|
| Financial logic | NO |
| Hotspot file (R5) | NO |
| API contract change | Minimal — removing an extra key the backend accepts but doesn't require for sub-recipe |
| Audit trail impact | LOW — backend MAY store physical_qty from this endpoint; removing it means backend receives only quantity. If backend uses physical_qty for audit logging, that log entry would be missing — needs backend confirmation (§ owner decision below) |
| Regression scope | SubRecipeStockPanel only — StockAuditPanel path unchanged |

**Risk: LOW**

### Edit Specification

**Edit 1 — `components/inventory/SubRecipeStockPanel.jsx:94`**
```js
// REMOVE this line:
physicalQty: Number(entry.qty), // V4: physicalQty always equals quantity entered
```

**Edit 2 — `api/transforms/inventoryTransform.js:232`**
```js
// REMOVE this line:
physical_qty: data.physicalQty ?? 0,
```

After removal, `addSubRecipeStock()` sends:
```json
{ "sub_recipe_id": 235, "quantity": 50, "unit": "gm", "waste_reason": "" }
```

### Verification Steps

| # | Step | Method |
|---|---|---|
| V1 | Sub-recipe stock add: Request payload does NOT contain physical_qty | Browser DevTools → Network → Request tab |
| V2 | Adjustment saves successfully (HTTP 200) | Browser |
| V3 | StockAuditPanel still sends physical_qty for regular ingredients (unchanged) | Browser — Stock Audit tab |

### Owner Decisions

**Q1 — Confirm removal:** Does backend use `physical_qty` from the sub-recipe stock endpoint for audit trail? If yes, removal changes audit records. (Owner note: "extra key physical_quantity is being used when updating stock that will be part of audit tab" suggests removal is correct.)

**Assumed:** YES — remove it. Backend confirmation recommended before shipping.

---

## §3 — Conflict Pre-Check

| File | Last Modifier | Open Conflicts |
|---|---|---|
| `components/inventory/InventorySetupPanel.jsx` | BUG-275 / CR-090 / BUG-269 (all IMPLEMENTED) | **NONE** |
| `api/transforms/inventoryTransform.js` | CR-100 / BUG-275 / BUG-244 (all IMPLEMENTED) | **NONE** — addSubRecipeStock() not touched by any open item |
| `components/inventory/SubRecipeStockPanel.jsx` | CR-139 (IMPLEMENTED, 2026-08-13) | **NONE** — freshly created, no other item in flight |

**Execution order:** BUG-314 and BUG-320 are independent — can be implemented in same batch.

---

## §4 — Scope Lock

| File | BUG-314 | BUG-320 |
|---|---|---|
| `InventorySetupPanel.jsx` | ✅ WILL change (fetchData) | ❌ will NOT touch |
| `inventoryTransform.js` | ❌ will NOT touch | ✅ WILL change (addSubRecipeStock) |
| `SubRecipeStockPanel.jsx` | ❌ will NOT touch | ✅ WILL change (handleSave) |
| All other files | ❌ will NOT touch | ❌ will NOT touch |

**Total:** 3 files, ~12 lines changed, 0 new files

---

## §5 — Post-Code Registry Checklist (for Implementation agent)

```
□ registry.json: BUG-314 + BUG-320 → status: IMPLEMENTED, sprint_key: pos_5_1
□ BUG_TRACKER.md: rows updated
□ FILE_OWNERSHIP.md: InventorySetupPanel.jsx + inventoryTransform.js + SubRecipeStockPanel.jsx
□ Code markers: // BUG-314 in InventorySetupPanel.jsx; // BUG-320 in inventoryTransform.js + SubRecipeStockPanel.jsx
□ Webpack: 0 new warnings after both changes
```

---

## §6 — Owner Decision Queue

| # | Item | Decision | Blocker? |
|---|---|---|---|
| OD-1 | BUG-320: Backend uses physical_qty for audit trail on sub-recipe endpoint? | Pending | Recommended — not blocking fast implementation |
| OD-2 | Backend timeline for get-inventory-master 404→200 fix? | Pending | Not blocking FE fix |
