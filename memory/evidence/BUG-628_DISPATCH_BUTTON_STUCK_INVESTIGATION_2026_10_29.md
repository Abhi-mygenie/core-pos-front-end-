# BUG-628 — Investigation Report
## Delivery Dispatch: Button Stays "Dispatch" After Manual Dispatch (No Rider)

**ID:** BUG-628
**Date:** 2026-10-29
**Steps used:** 8/10
**Confidence:** HIGH — full chain traced with code + socket event analysis
**Classification:** FE_BUG (rendering gate logic)

---

## 1. Summary

**Root cause:** After manual dispatch (no rider), the socket arrives with `order_dispatch_status: 'Yes'` and `delivery_man_id: null`. The order transform correctly computes `riderStatus = 'dispatched'`. But `TableCard.jsx` has two gate conditions that prevent the UI from advancing:

1. **L579:** `!hasRiderAssigned` is `true` (no rider) → Dispatch button keeps rendering
2. **L691:** `(!isDelivery || hasRiderAssigned)` gate blocks "On The Way" from rendering when there's no rider

**Scope:** Manual dispatch only (no rider assigned). The rider-assigned flow is unaffected and must NOT be changed.

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Steps | Result |
|---|---|---|---|---|
| 1 | Backend doesn't send socket after dispatch | Traced API: sends `order_status:'serve'` + `order_dispatch_status:'Yes'` → backend emits `update-order-status` | 1 | ELIMINATED — socket fires correctly |
| 2 | Socket handler doesn't process the event | Read `handleUpdateOrderStatus` in socketHandlers.js | 1 | ELIMINATED — transforms order, calls `updateOrder()` |
| 3 | Transform doesn't map dispatch status | Read orderTransform.js L341-346 | 1 | ELIMINATED — `riderStatus = 'dispatched'` via Rule 3 (L344) |
| 4 | TableCard doesn't check riderStatus for manual dispatch | Read TableCard.jsx L578-595, L691 | 2 | **CONFIRMED** — two gate conditions fail for no-rider dispatch |
| 5 | "On The Way" label exists but is disabled | Read L691-703 | 1 | **CONFIRMED** — `disabled` prop + `opacity-50 cursor-default` |

---

## 3. Data Flow Trace

```
User clicks Dispatch
  │
  ▼
deliveryService.js dispatchOrder():
  PUT /order-status-update { order_id, order_status:'serve', order_dispatch_status:'Yes' }
  │
  ▼
Backend processes → emits socket event: update-order-status
  Payload: { orders: [{ ...order, order_dispatch_status:'Yes', delivery_man_id: null }] }
  │
  ▼
socketHandlers.js handleUpdateOrderStatus():
  Transforms via orderFromAPI.order() → calls updateOrder()
  │
  ▼
orderTransform.js L341-346:
  delivery_man_id: null
  order_dispatch_status: 'Yes'
  → riderStatus = 'dispatched' (Rule 3: no rider + dispatched = 'dispatched') ✅
  → deliveryManId = null ✅
  │
  ▼
TableCard.jsx re-renders with updated order:
  isDelivery = true
  hasRiderAssigned = !!(order.deliveryManId) = false  ← no rider
  riderStatus = 'dispatched'

  L579: !hasRiderAssigned = true → Dispatch button STILL SHOWS ❌
  L691: (!isDelivery || hasRiderAssigned) = (false || false) = false → "On The Way" BLOCKED ❌

  BREAK POINT: Both conditions fail for manual dispatch (no rider)
```

---

## 4. Expected Behavior (Owner-Confirmed)

**Manual dispatch only (no rider assigned):**

| Before Dispatch | After Dispatch (socket arrives) |
|---|---|
| Button: **Dispatch** | Button: **On The Way** |
| onClick: calls dispatch API | onClick: **prints the bill** (handlePrintBill) |
| | Clickable, not disabled |

**Rider-assigned flow: UNCHANGED.** When `hasRiderAssigned = true`, the existing flow (riderAssigned → waiting → riderStatus='dispatched' → disabled "On the way..") remains as-is.

---

## 5. Fix Location

**File:** `src/components/cards/TableCard.jsx`

### Fix A — L579: Hide Dispatch button after manual dispatch

```
BEFORE: !hasRiderAssigned ? (
AFTER:  !hasRiderAssigned && table.order?.riderStatus !== 'dispatched' ? (
```

This stops the Dispatch button from rendering once `riderStatus` becomes `'dispatched'`.

### Fix B — L691: Allow "On The Way" to render for manual dispatch + make clickable

The gate `(!isDelivery || hasRiderAssigned)` needs to also pass when `riderStatus === 'dispatched'` without a rider:

```
BEFORE: {(!isDelivery || hasRiderAssigned) && (isDelivery && table.order?.riderStatus === 'dispatched' ? (
           <TextButton disabled className="opacity-50 cursor-default">On the way..</TextButton>

AFTER:  {(!isDelivery || hasRiderAssigned || (!hasRiderAssigned && table.order?.riderStatus === 'dispatched')) && (isDelivery && table.order?.riderStatus === 'dispatched' ? (
           // No rider branch: clickable "On The Way" → prints bill
           !hasRiderAssigned ? (
             <TextButton onClick={handlePrintBill}>On The Way</TextButton>
           ) : (
             // Rider branch: existing disabled label (unchanged)
             <TextButton disabled className="opacity-50 cursor-default">On the way..</TextButton>
           )
```

### Same fix needed at L669-684 (second rendering branch, same pattern)

---

## 6. Scope

- **1 file:** `TableCard.jsx`
- **2 rendering branches:** L578-595 (fOrderStatus=2, first button group) + L669-684 (second button group)
- **Risk:** MEDIUM — touches delivery card button logic, but isolated to manual-dispatch-no-rider branch
- **Rider flow:** UNTOUCHED — only the `!hasRiderAssigned` branch is modified

---

## 7. Recommendations

- Classification: **FE_BUG**
- Fix scope: 1 file, ~4 line changes across 2 branches
- Planning skip eligible: YES (≤10 lines, 1 file, not financial)
- **Owner must approve skip** before direct implementation

---

```
Investigation complete: BUG-628
Root cause: TableCard L579 + L691 gate conditions don't account for manual dispatch (riderStatus='dispatched' + hasRiderAssigned=false)
Confidence: HIGH (full chain traced)
Steps: 8/10
FE fix: YES — 1 file, ~4 lines
Backend ask: NO
Planning skip eligible: YES (owner approve)
```
