# BUG-226 — Impact Analysis
**Gate:** 2
**Produced:** 2026-07-22
**Agent Role:** PLANNING

---

## Header

| Field | Value |
|---|---|
| ID | BUG-226 |
| Title | Conversion Factor Not Saved on Add or Edit Ingredient |
| Priority | P1 |
| Code Reality | **CONFIRMED** — `inventoryTransform.js:128-136` ADD payload missing `converion_factor`; `inventoryTransform.js:146` EDIT uses `\|\| 1` which overrides user-entered `0` |
| Conflict Pre-Check | `inventoryTransform.js` also touched by CR-091 (Purchase Transaction ID). **PARALLEL-SAFE** — CR-091 modifies `toAPI.addPurchase()`, BUG-226 modifies `toAPI.addIngredient()` + `toAPI.updateIngredient()`. Different functions. Execution order: independent. |

---

## Data Flow Trace

```
InventorySetupPanel.jsx:104
  → inventoryService.addIngredient(newIng)   ← newIng has .conversionFactor
      → inventoryTransform.toAPI.addIngredient(data)
            CURRENT payload: { category_id, stock_title, unit, small_unit,
                               minimun_stock_alert, min_unit_alert }
            MISSING: converion_factor ← BUG ROOT

InventorySetupPanel.jsx:125 (edit save)
  → inventoryService.updateIngredient(id, editData)
      → inventoryTransform.toAPI.updateIngredient(data)
            CURRENT: converion_factor: String(data.conversionFactor || 1)
            ISSUE: `|| 1` — if user enters 0 or clears field → sends '1' (wrong)
```

---

## Exact Lines to Change

### Fix A — ADD path (line 128-136)
**File:** `api/transforms/inventoryTransform.js`
**Current (line 128-136):**
```js
addIngredient(data) {
  return [{
    category_id: data.categoryId,
    stock_title: data.name,
    unit: data.unit,
    small_unit: data.smallUnit || '',
    minimun_stock_alert: String(data.minQtyAlert || 0),
    min_unit_alert: String(data.minUnitAlert || 0),
  }];
},
```
**Add after `min_unit_alert` line:**
```js
converion_factor: String(data.conversionFactor || 1), // R9 typo preserved — BUG-226
```

### Fix B — EDIT path (line 146)
**File:** `api/transforms/inventoryTransform.js`
**Current:** `converion_factor: String(data.conversionFactor || 1),`
**Decision required — see Owner Decision Queue below.**

---

## Risk Classification: **HIGH → LOW after fix**
- Blast radius: 1 file (`inventoryTransform.js`), ~2-3 lines
- Regression risk: LOW — addIngredient only adds a previously missing field; updateIngredient changes a fallback value
- Hotspot: R9 typo `converion_factor` MUST be preserved exactly (backend contract)
- No downstream consumers affected (conversion factor is display-only, not computed in frontend)

---

## Owner Decision Queue

**Q1 (BUG-226):** When a user clears the Conversion Factor field on an Edit, what should be saved?
- **Option A:** Save `'1'` (current `|| 1` behaviour — treat blank as 1:1 ratio)
- **Option B:** Save `''` (blank — backend treats null/blank as "no conversion factor")
- Context: `ghee dosa` on preprod has `converion_factor: null` — backend accepts null. But API requires string values per R9.
- **Recommend A** (keep `|| 1`) — a conversion factor of 0 is mathematically invalid. `1` is the safe default. Blank field = user hasn't configured conversion = 1:1 is correct.
- **Impact on Fix A (ADD):** Use same `|| 1` default in ADD payload.

**Awaiting owner decision on Q1 before Gate 3.**

---

## Downstream Consumers (none affected)
- `InventorySetupPanel.jsx` displays `conversionFactor` from `fromAPI.ingredients()` — read path not changed
- `SmartPurchasePanel.jsx` does not use `conversionFactor`
- No computation depends on `converion_factor` in frontend

---

## Effort Estimate
- Files: 1 (`inventoryTransform.js`)
- Lines: ~2-3 added/changed
- Test: Add ingredient with CF=500 → verify field saved → edit ingredient → verify CF shows 500
- Risk: LOW
