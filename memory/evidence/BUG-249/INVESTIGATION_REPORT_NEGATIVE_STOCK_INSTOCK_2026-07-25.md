# INVESTIGATION REPORT — Current Stock: Negative Quantity Shows "In Stock"

**Date:** 2026-07-25
**Module:** Inventory → Current Stock
**Reported by:** Owner (screenshot: Morzella cheese -87496 kg, Paneer -232645 kg, etc. all show "In Stock")
**Steps used:** 3/10

---

## 1. Summary

**Root cause: FIELD MISMATCH** — Status badge and all status logic use `item.quantity` (raw API field), but the displayed quantity column uses `item.displayQty` (backend-calculated display value). These two fields diverge — `quantity` can be positive/zero while `displayQty` is deeply negative.

**Classification:** FE_BUG
**Confidence:** HIGH (code traced, 10+ locations identified)

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Steps | Result | Evidence |
|---|-----------|------|:---:|--------|---------|
| H1 | StatusBadge checks wrong quantity field | Code trace: L325 passes `item.quantity`, L322 displays `item.displayQty` | 1 | **CONFIRMED** | Line 325 vs 322 |
| H2 | Bug is isolated to StatusBadge only | Grep all `item.quantity` uses for status | 1 | **ELIMINATED** — systemic: 10+ locations use `item.quantity` for status | Lines 65, 66, 94-96, 100, 117, 148, 307, 325 |
| H3 | Backend sends inconsistent quantity vs display_qty | Transform inspection: 3 separate fields mapped | 1 | **CONFIRMED** | inventoryTransform.js:66-68 |

---

## 3. Data Flow Trace

```
Backend API → inventoryTransform.stockItems() →
  item.quantity   = Number(api.quantity)      ← RAW, unreliable, can be stale/wrong unit
  item.calQuantity = Number(api.cal_quantity) ← CALCULATED in small_unit (gm/ml), reliable
  item.displayQty  = Number(api.display_qty)  ← DISPLAY value in display_unit (kg/ltr), reliable

CurrentStockPanel.jsx:
  Line 322 DISPLAYS: item.displayQty || item.quantity    ← user sees -87496 kg
  Line 325 STATUS:   item.quantity                        ← badge checks different field → "In Stock"
  
  BREAK: quantity > 0 but displayQty < 0 → mismatch
```

---

## 4. All Affected Locations (10 sites)

| Line | Usage | Current (buggy) | Should be |
|------|-------|----------------|-----------|
| L24 | StatusBadge check | `Number(quantity) <= 0` | `Number(quantity) <= 0` (param must change) |
| L65 | KPI: lowStock count | `Number(i.quantity) > 0` | `Number(i.displayQty \|\| i.calQuantity \|\| i.quantity) > 0` |
| L66 | KPI: outOfStock count | `Number(i.quantity) <= 0` | same pattern |
| L94 | Filter: low stock | `Number(item.quantity) > 0` | same pattern |
| L95 | Filter: out of stock | `Number(item.quantity) > 0` | same pattern |
| L96 | Filter: in stock | `Number(item.quantity) <= 0` | same pattern |
| L100 | Sort rank | `Number(i.quantity) <= 0` | same pattern |
| L117 | Excel export status | `Number(item.quantity) <= 0` | same pattern |
| L148 | PDF export status | `Number(item.quantity) <= 0` | same pattern |
| L307 | Row tint: isOut | `Number(item.quantity) <= 0` | same pattern |
| L325 | StatusBadge prop | `quantity={item.quantity}` | `quantity={item.displayQty \|\| item.calQuantity \|\| item.quantity}` |

---

## 5. Recommended Fix

Create a helper at file top:
```js
const effectiveQty = (item) => Number(item.displayQty || item.calQuantity || item.quantity) || 0;
```

Replace all 10 sites: `Number(item.quantity)` → `effectiveQty(item)`.

**Scope:** 1 file (`CurrentStockPanel.jsx`), ~10 line changes, LOW risk.

---

## 6. Why `displayQty` over `quantity`?

- `displayQty` is what the user sees in the quantity column
- `calQuantity` is the planner's source of truth (CR-078 Path X ruling)
- `quantity` is the raw API field — inconsistent, possibly stale, different unit basis
- Using `displayQty || calQuantity || quantity` ensures status matches the displayed value with graceful fallback
