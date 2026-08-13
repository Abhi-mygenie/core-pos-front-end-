# BUG-240 — Impact Analysis (Gate 2)

**Date:** 2026-07-24
**Code Reality:** PARTIAL — `fmtQty` helper in AutoShoppingList already converts gm→kg and ml→ltr when ≥1000. Planner already outputs `display_unit`. But `on_hand` uses `calQuantity` (small unit) so negative/small values show as gm/ml.
**Conflict Pre-Check:** BUG-236 targets AutoShoppingList (overflow-hidden, different area). CR-100 targets SmartPurchasePanel (BACKEND-BLOCKED). No active conflict on the lines we touch.
**Risk:** LOW

---

## Data Flow Trace

```
Backend: GET /stock-inventory → item:
  quantity: 4.604           (purchase unit, kg)
  cal_quantity: 4604.00     (small unit, gm)
  display_qty: 4.60         (display, kg)
  display_unit: kg
  unit: gm, small_unit: gm

  ↓ fromAPI.stockItems() → calQuantity=4604, displayQty=4.6, displayUnit='kg'

  ↓ purchasePlanner.js computePlan():
    L121: onHand = Number(item.calQuantity) = 4604   ← small unit
    L126: unit = item.smallUnit || item.unit = 'gm'
    L131: display_unit = item.displayUnit = 'kg'     ← already available!
    L132: on_hand = 4604                              ← small unit value

  ↓ AutoShoppingList.jsx:
    L135: fmtQty(r.on_hand, r.unit) = fmtQty(4604, 'gm')
    fmtQty: 4604 >= 1000 → "4.6 kg"                  ← ALREADY CONVERTS for large values!
    But: fmtQty(0, 'gm') → "0.00 gm"                 ← small values show gm
    And: fmtQty(-5, 'gm') → "-5.00 gm"               ← negative shows gm

Current Stock: shows displayQty || quantity = "4.60" + displayUnit = "kg"
```

**Partial finding:** `fmtQty` already handles the large-value case. The gap is only for:
- Zero/small values: `0.00 gm` vs `0.00 kg`
- Negative on-hand: `-5.00 gm` vs `-0.01 kg`

## Affected Files

| # | File | Line(s) | Change | Risk |
|---|------|---------|--------|------|
| 1 | `utils/purchasePlanner.js` | L132, L156 | Add `display_on_hand: Number(item.displayQty) || (onHand / (WEIGHT_UNITS[displayUnit] || 1))` | LOW |
| 2 | `components/inventory/smart/AutoShoppingList.jsx` | L135 | Use `fmtQty(r.display_on_hand ?? r.on_hand, r.display_unit || r.unit)` | LOW |

**Files WILL NOT touch:** SmartPurchasePanel.jsx, inventoryTransform.js, CurrentStockPanel.jsx

## Scope Lock
- **2 files, ~5 lines**
- Math stays in small units (calQuantity) — only UI rendering uses display fields

---

**Next:** Awaiting owner review of IA. If no blockers → Gate 3 Plan.
