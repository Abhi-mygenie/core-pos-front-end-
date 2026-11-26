# Edit Order with fOS=7 — Banner Reappearance Analysis

**Date:** 2026-11-16
**Context:** Follow-up to INV-ORDER-CONFIRM-BYPASS-2026-11-16

---

## Question: If edit order comes with fOS=7, will the banner reappear?

## Answer: YES — if backend sends `update-order` with fOS=7 AND `order_from='web'`, the ScanOrderPopOut WILL reappear.

---

## Code Trace (Verified)

### Step 1: `update-order` socket arrives with fOS=7

```
socketHandlers.js L239 → handleOrderDataEvent(message, context, 'update-order')
```

### Step 2: Terminal status check (L310-322)

```javascript
const isTerminal       = (order.status === 'cancelled' || order.status === 'paid');
// fOS=7 → status='pending' → NOT terminal
const isPayLaterSettle = (order.fOrderStatus === 9) && (eventName === 'update-order-paid');
// fOS=7 ≠ 9 → false
const isHoldClear      = (order.fOrderStatus === 9) && !isPayLaterSettle;
// fOS=7 ≠ 9 → false
const shouldRemove     = isTerminal || isHoldClear || isPayLaterSettle || isPayLaterComplete;
// ALL false → shouldRemove = false
```

**Result:** Order is NOT removed → `updateOrder()` called → order stays on dashboard with fOS=7.

### Step 3: ScanOrderPopOut evaluates (L59)

```javascript
export const isUnconfirmedScanOrder = (order) =>
  Boolean(order) && order.fOrderStatus === 7 && !order.scheduled && order.isWebOrder;
```

**If `order_from='web'`** in the update-order payload → `orderFromAPI.order()` at `orderTransform.js:262-263` sets:
```javascript
orderFrom: normaliseOrderFrom(api.order_from),   // → 'web'
isWebOrder: normaliseOrderFrom(api.order_from) === 'web',  // → true
```

**Predicate:** `fOS===7 ✅ && !scheduled ✅ && isWebOrder ✅` → **POPUP REAPPEARS**

---

## BUT — Does This Actually Happen in Practice?

**Current backend behavior: NO.** Here's why:

1. Customer places order via QR → backend sets fOS=7, emits `scan-new-order`
2. Staff confirms → backend changes fOS to `def_ord_status` (typically 1)
3. Customer edits order via QR → backend sends `update-order` with **current fOS=1** (not 7)
4. Backend does NOT re-set fOS to 7 for edits to already-confirmed orders

**The backend preserves the order's current lifecycle status on edits.** The `update-place-order` endpoint modifies items but does NOT re-trigger the YTC gate.

---

## Edge Cases Where fOS=7 COULD Appear on update-order

| Scenario | Possible? | Would trigger popup? |
|----------|-----------|---------------------|
| Customer edits order BEFORE staff confirms (still fOS=7) | YES | YES — popup already showing, order updates in-place |
| Backend bug re-sets fOS to 7 on edit | UNLIKELY but possible | YES — popup reappears |
| Two customers ordering on same table, second order arrives as update-order with fOS=7 | NO — separate order IDs | N/A — would be `scan-new-order`, not `update-order` |
| Staff edits via POS (update-place-order) while order is still fOS=7 | YES | YES — order stays fOS=7 until explicitly confirmed |

---

## Summary

| Condition | Banner reappears? |
|-----------|-------------------|
| `update-order` with fOS=7 + `order_from='web'` | **YES** ✅ |
| `update-order` with fOS=7 + `order_from='pos'` | **NO** (isWebOrder=false) |
| `update-order` with fOS=1 + `order_from='web'` | **NO** (fOS≠7) |
| `update-order` with fOS=1 + `order_from='pos'` | **NO** |

The popup gate is: **fOrderStatus === 7 AND isWebOrder === true AND !scheduled**. ALL three must be true.

In practice, `update-order` with fOS=7 only happens when the customer edits their order BEFORE staff has confirmed it — the popup is already showing in that case, and the order details update within the existing popup.
