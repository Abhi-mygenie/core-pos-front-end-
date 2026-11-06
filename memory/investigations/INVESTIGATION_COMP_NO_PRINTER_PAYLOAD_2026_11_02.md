# Investigation Report — Complimentary "No" in Printer Payload

**Role:** INVESTIGATION
**Item:** Runtime complimentary marking passes `is_complementary: "No"` in printer payload
**Steps Used:** 10/10
**Confidence:** HIGH

---

## 1. Summary

**Root cause:** `updateOrder` (L1184, L1191) does NOT call `expandCompItems()` before `buildCartItem()`. When a cashier marks an item as partially complimentary (`compQty > 0 && compQty < qty`) and then triggers an update-order (e.g., adding more items to the table), the partial-comp item is NOT split into two lines. Instead, `buildCartItem` sees `isComplementaryRuntime: false` (because partial comp sets it false) and outputs `is_complementary: "No"`.

**Classification:** CODE_ERROR — the `expandCompItems` call was added to `placeOrder` (L1054), `placeOrderWithPayment` (L1293), and `collectBillExisting` (L1547), but was **missed** in `updateOrder` (L1184, L1191).

---

## 2. Data Flow Trace

```
User marks item as comp (MarkCompModal)
  → handleMarkComp sets: compQty=1, isComplementaryRuntime = (1 >= qty)
    → Full comp (qty=1): isComplementaryRuntime = true  ✅
    → Partial comp (qty=2, compQty=1): isComplementaryRuntime = false  ← needs expandCompItems

Place Order path (L1054):
  expandCompItems(unplacedItems).map(buildCartItem)  ✅ splits partial comp

Collect Bill path (L1547):
  expandCompItems(placedSourceItems).map(buildCartItem)  ✅ splits partial comp

Update Order path (L1184):
  newItems.map(buildCartItem)  ❌ NO expandCompItems
  allCartItems.map(buildCartItem)  ❌ NO expandCompItems
  → buildCartItem sees isComplementaryRuntime=false → is_complementary: "No"

BREAK POINT: updateOrder L1184 and L1191 — missing expandCompItems()
```

---

## 3. Code Locations

| # | File | Line | What | Status |
|---|------|------|------|--------|
| 1 | `orderTransform.js` | L1054 | `placeOrder` — uses `expandCompItems` | ✅ Correct |
| 2 | `orderTransform.js` | L1062 | `placeOrder` totals — uses `expandCompItems` | ✅ Correct |
| 3 | `orderTransform.js` | L1293 | `placeOrderWithPayment` — uses `expandCompItems` | ✅ Correct |
| 4 | `orderTransform.js` | L1547 | `collectBillExisting` — uses `expandCompItems` | ✅ Correct |
| 5 | `orderTransform.js` | **L1184** | `updateOrder` cart — **MISSING expandCompItems** | ❌ BUG |
| 6 | `orderTransform.js` | **L1191** | `updateOrder` allBuilt — **MISSING expandCompItems** | ❌ BUG |

---

## 4. When This Broke

The `expandCompItems` function was added in **BUG-298/BUG-299** (qty-aware complementary). It was correctly added to 3 of the 4 transform paths but **missed** in `updateOrder`. This means partial comp on update-order has **never worked** since BUG-298/299 was implemented.

For **full comp** (compQty === qty), the issue does NOT occur because `isComplementaryRuntime` is set to `true` directly — no splitting needed. The bug only manifests for **partial comp** on the update-order path.

However, if the user is seeing `is_complementary: "No"` even for full comp, the issue might be different — it could be that:
1. The item's `compQty` or `isComplementaryRuntime` is not persisted across re-renders
2. Socket re-hydration overwrites the frontend state with backend values (which don't have the comp flag yet)

---

## 5. Recommendations

**FIX (1 file, 2 lines):**
```
L1184: expandCompItems(newItems).map(buildCartItem)
L1191: expandCompItems(allActiveItems).map(buildCartItem)
```

**Risk:** LOW — additive, same pattern as the other 3 paths.
**Planning skip eligible:** YES (≤10 lines, 1 file, not hotspot in the financial sense, follows existing pattern exactly).

---

## 6. Retroactive Candidates
NONE.
