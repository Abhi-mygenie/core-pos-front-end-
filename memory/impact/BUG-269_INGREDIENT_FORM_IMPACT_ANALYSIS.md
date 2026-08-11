# Impact Analysis — BUG-269 (Ingredient Form: 3 UX Bugs)

**ID:** BUG-269
**Gate:** 2 (Impact Analysis)
**Date:** 2026-07-28
**Code Reality:** PARTIAL (hasConversion check exists but is incomplete; auto-select and read-only logic missing)
**Conflict Pre-Check:** No active items touch these files/lines. CLEAR.
**Risk:** MEDIUM

---

## Scope

Fix 3 related UX bugs in the Ingredient Add/Edit inline form:
- A: Don't send `converion_factor` + `consumption_unit` when `unit === smallUnit`
- B: Auto-select small unit when base unit changes (kg→gm, ltr→ml)
- C: Lock alert unit to always = smallUnit (read-only)

---

## Data Flow Traces

### Sub-Issue A — Conversion Sent Incorrectly

```
Current:
  User form state: { unit: "piece", smallUnit: "piece", conversionFactor: "1" }
  → toAPI.addIngredient() / toAPI.updateIngredient()
    → hasConversion = "piece" && "1" && (1 > 0) → TRUE
    → payload includes: { converion_factor: "1", consumption_unit: "piece" }
  → Backend validates: consumption_unit === unit → 422 CONVERSION_UNIT_SAME_AS_PURCHASE
  BREAK POINT: hasConversion missing unit !== smallUnit guard

After fix:
  → hasConversion = "piece" && "1" && (1 > 0) && ("piece" !== "piece") → FALSE
  → payload does NOT include converion_factor/consumption_unit
  → Backend accepts
```

### Sub-Issue B — No Small Unit Auto-Select

```
Current:
  User selects unit="kg" via <select onChange>
  → setNewIng(p => ({ ...p, unit: "kg" }))
  → smallUnit stays "" — no mapping logic
  BREAK POINT: onChange handler doesn't derive smallUnit from unit

After fix:
  User selects unit="kg" via <select onChange>
  → onChange: derive smallUnit = UNIT_MAP["kg"] = "gm"
  → setNewIng(p => ({ ...p, unit: "kg", smallUnit: "gm", minUnitAlert: "gm" }))
```

**Unit mapping (from API unit list + domain knowledge):**
| Base Unit | Small Unit | Conversion hint |
|-----------|-----------|-----------------|
| kg | gm | 1 kg = 1000 gm |
| ltr | ml | 1 ltr = 1000 ml |
| litre | ml | 1 litre = 1000 ml |
| All others | (no auto-select — user picks or leaves empty) | — |

### Sub-Issue C — Alert Unit Not Read-Only

```
Current:
  Alert unit = <select> with ALL units as options
  → User can pick any unit (e.g., alert in "kg" while small unit is "gm")
  → Backend stores min_unit_alert as whatever user picked
  → Alert calculation may use wrong unit
  BREAK POINT: dropdown should be locked to smallUnit

After fix:
  Alert unit = read-only <span> showing current smallUnit value
  → When smallUnit changes (via auto-select or manual), minUnitAlert auto-follows
  → User cannot pick a mismatched unit
```

---

## Affected Files

| File | Change | Lines Est. | Risk |
|------|--------|:---:|:---:|
| `inventoryTransform.js` | Add `data.unit !== data.smallUnit` to `hasConversion` check in both `addIngredient()` (L130) and `updateIngredient()` (L148) | ~2 | LOW |
| `InventorySetupPanel.jsx` | Add UNIT_MAP constant. Update unit `onChange` in ADD form (L305) and EDIT form (L362) to auto-set smallUnit + minUnitAlert. Replace alert unit `<select>` with read-only `<span>` in ADD form (L327-331) and EDIT form (L384-388). | ~25 | LOW |

## Files NOT Touched
- `inventoryService.js` (no API changes)
- `purchasePlanner.js` (consumes data, doesn't write)
- `AutoShoppingList.jsx`, `SmartPurchasePanel.jsx` (unrelated)
- Sidebar, App.js, routes

---

## Risk Register
- **LOW:** No API contract changes — same fields, just smarter conditional logic
- **LOW:** No financial logic touched
- **MEDIUM (mitigated):** InventorySetupPanel is complex (802 lines) but changes are isolated to form field handlers — no structural changes
