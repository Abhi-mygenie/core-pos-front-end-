# CR-102 — Impact Analysis (Gate 2)

**Date:** 2026-07-24
**Code Reality:** NONE — `consumption_unit` absent from all toAPI functions
**Conflict Pre-Check:** CR-100 targets `inventoryTransform.js` but is BACKEND-BLOCKED (partial payment fields). CR-084 completed. No active conflict on the lines we touch.
**Risk:** LOW (1 file, ~4 lines, no hotspot, no financial logic)

---

## Data Flow Trace

```
BACKEND CONTRACT (add_inventory_payload_frontend.md):
  Required pair: consumption_unit + converion_factor (G-020)
  Logic: 1 × unit = converion_factor × consumption_unit
  small_unit: "Legacy/display only. Do not use for conversion."

FE FORM (InventorySetupPanel.jsx):
  newIng = { name, categoryId, unit, smallUnit, conversionFactor, minQtyAlert, minUnitAlert }
  User enters: unit="bundle", smallUnit="piece", conversionFactor="10"

    ↓ inventoryService.addIngredient(newIng)
    ↓ toAPI.addIngredient(data) — inventoryTransform.js L128-137

PAYLOAD SENT:
  { unit: "bundle", small_unit: "piece", converion_factor: "10" }
  ❌ consumption_unit: MISSING

BREAK POINT: Backend G-020 expects consumption_unit alongside converion_factor
  → 422 CONSUMPTION_UNIT_REQUIRED (or factor silently ignored)
```

## Affected Files

| # | File | Line(s) | Change | Risk |
|---|------|---------|--------|------|
| 1 | `api/transforms/inventoryTransform.js` | L128-137 (addIngredient) | Add `consumption_unit: data.smallUnit \|\| ''`; conditionally send `converion_factor` only when both fields present | LOW |
| 2 | `api/transforms/inventoryTransform.js` | L141-152 (updateIngredient) | Same: add `consumption_unit`; conditional `converion_factor` | LOW |

**Files WILL NOT touch:** InventorySetupPanel.jsx (form already collects `smallUnit`), inventoryService.js, constants.js, AutoShoppingList.jsx, SmartPurchasePanel.jsx

## Downstream Consumers

- `addPurchase` toAPI (L165-176) also sends `converion_factor` per purchase item — **not in scope** for CR-102 (purchase items reference pre-existing ingredient data, don't create conversions)
- `fromAPI.ingredients()` / `fromAPI.stockItems()` already map `consumption_unit` — no change needed on read side

## Owner Decisions

None — investigation resolved: repurpose `smallUnit` → `consumption_unit` (same concept, different backend key).

## Scope Lock

- **1 file, ~4 lines**
- No UI change, no state change, no API endpoint change
- Transform-only payload fix

---

**Next:** Gate 3 (Implementation Plan)
