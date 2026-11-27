# INV — Inventory FE Rules R2 & R3 Gap Analysis
**Date:** 2026-09-24
**Role:** INVESTIGATION (Role 6)
**Source:** inv_changes.md (backend curl probe doc, restaurant 835, all 11 probes PASS)
**Steps used:** 10/10
**Confidence:** HIGH (code traced, no live probe needed)

---

## Summary

Of the 7 FE rules in inv_changes.md, **5 are already implemented** and **2 are missing**:

| Rule | Description | Status |
|------|-------------|--------|
| R1 | Lock unit field on intake screens | ✅ IMPLEMENTED |
| R2 | Show on-hand with `display_qty_text` | ❌ MISSING |
| R3 | Zero-stock gate UI before unit/conversion edit | ❌ MISSING |
| R4 | Weight orders → `item_unit=Kg` | ✅ IMPLEMENTED |
| R5 | Bar orders → `item_unit=ml` | ✅ IMPLEMENTED |
| R6 | Produce via `add-sub-recipe-stock` | ✅ IMPLEMENTED |
| R7 | Typo `converion_factor` preserved | ✅ IMPLEMENTED |

---

## R2 — `display_qty_text` NOT MAPPED

**Root cause:** `inventoryTransform.js:fromAPI.stockItems` never maps `display_qty_text` from API.

```
grep result: 0 hits for display_qty_text / displayQtyText in entire src/
```

**Break point:**
```
API: current_stocks[].display_qty_text = "9 pkt 400 gm"
Transform: inventoryTransform.fromAPI.stockItems → field never mapped (BREAK)
State: item.displayQtyText = undefined
UI: CurrentStockPanel shows {item.displayQty} + {item.displayUnit} → "9 pkt" (sub-unit lost)
```

**Files to fix:**
- `src/api/transforms/inventoryTransform.js` — add `displayQtyText: item.display_qty_text || ''` in both `ingredients()` and `stockItems()`
- `src/components/inventory/CurrentStockPanel.jsx` — replace `{item.displayQty || item.quantity} {item.displayUnit || item.unit}` with `{item.displayQtyText || ...fallback}`
- `src/components/inventory/SubRecipeStockPanel.jsx` — same
- `src/components/inventory/StockAuditPanel.jsx` — on-hand display
- `src/components/panels/menu/PurchaseEntryPanel.jsx` (if on-hand shown there)

**Risk:** MEDIUM (display-only, no API payload change, no financial logic)
**Planning skip:** NO — 4–5 files

---

## R3 — Zero-Stock Gate UI MISSING

**Root cause:** `InventorySetupPanel.jsx:saveEdit()` calls `updateIngredient()` with no prior stock check. Edit row shows `unit` and `conversionFactor` as free inputs regardless of stock level.

**Break point:**
```
User: edits unit/conversionFactor on ingredient with stock > 0
UI: saveEdit() → API PUT → 422 UNIT_CHANGE_REQUIRES_ZERO_STOCK / CONVERSION_CHANGE_REQUIRES_ZERO_STOCK
UI: toast.error(err.readableMessage) — reactive only
Required: proactive disable of Save + inline warning when stock > 0 AND unit/factor changed
```

**Files to fix:**
- `src/components/inventory/InventorySetupPanel.jsx` — in `startEdit()`, capture original unit + factor; in edit row, compare `editIng.unit !== originalUnit || editIng.conversionFactor !== originalFactor`; if stock > 0 and changed → show warning label + disable Save

**Risk:** MEDIUM (single file, non-financial, state change logic ~15 lines)
**Planning skip:** Owner decision (1 file, borderline)

---

## Recommendation

Next: **INTAKE** both as a single BUG (or two separate LOW/MEDIUM bugs).
Suggested ID: BUG-455 (R2 display_qty_text) + BUG-456 (R3 zero-stock gate)
