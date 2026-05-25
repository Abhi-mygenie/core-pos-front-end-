# POS3.0 BUG-097 Bucket 4.5 Implementation Report — 2026-05-20 (v2)

> **Purpose**: Record Bucket 4.5 corrective patch — Gap 1+2+3 combined fix.
> **Date**: 2026-05-20
> **Version**: 2.0 — includes Gap 1 (socket payload) + Gap 2 (optimistic update) + Gap 3 (Serve fall-through)
> **Status**: IMPLEMENTED — pending owner review

---

## 1. Scope

Combined corrective patch fixing all 3 gaps in the assignment-state chain:

| Gap | Issue | Fix |
|-----|-------|-----|
| 1 | `handleDeliveryAssignOrder` ignores socket payload, makes redundant GET API | Use `payload.orders[0]` directly; GET only as fallback |
| 2 | `onAssigned` not wired — no optimistic context update | Wire in OrderCard + TableCard with rider field merge |
| 3 | fOrderStatus 2 falls through to Serve for delivery+assigned | Restructured branching (applied in prior v1 patch) |

---

## 2. Files Changed

### 2A. `src/api/socket/socketEvents.js` (2 lines)

- Moved `SOCKET_EVENTS.DELIVERY_ASSIGN_ORDER` from `EVENTS_REQUIRING_ORDER_API` → `EVENTS_WITH_PAYLOAD`
- Socket now classified as payload-backed (no GET API needed)

### 2B. `src/api/socket/socketHandlers.js` (~40 lines replaced)

Rewrote `handleDeliveryAssignOrder`:

**Before**: Ignored payload → called `fetchOrderWithRetry(orderId)` → GET API → `updateOrder()`

**After**:
```
if (payload.orders[0] exists) {
  order = orderFromAPI.order(payload.orders[0])  // direct transform
  updateOrder(order)                              // immediate context update
} else {
  // fallback: GET API (legacy safety net)
  order = await fetchOrderWithRetry(orderId)
  updateOrder(order)
}
// release setOrderEngaged via double-rAF
```

Added `setOrderEngaged` to context destructure for engage release (matches pattern of all other v2 handlers).

### 2C. `src/components/cards/OrderCard.jsx` (3 edits)

1. **L8**: Added `useOrders` to context import
2. **L71**: Destructured `updateOrder` from `useOrders()`
3. **L980-993**: Wired `onAssigned` on `<AssignRiderModal>`:
```jsx
onAssigned={(picked) => {
  if (picked) {
    updateOrder(orderId, {
      ...order,
      deliveryManId: picked.id,
      rider: picked.fullName,
      riderPhone: picked.phone || '',
      deliveryManStatus: 'No',
      riderStatus: 'riderAssigned',
    });
  }
}}
```

### 2D. `src/components/cards/TableCard.jsx` (2 edits)

1. **L66**: Added `updateOrder` to existing `useOrders()` destructure
2. **L591-610**: Wired `onAssigned` on `<AssignRiderModal>`:
```jsx
onAssigned={(picked) => {
  if (picked && table.orderId) {
    const existing = getOrderById(table.orderId);
    if (existing) {
      updateOrder(table.orderId, {
        ...existing,
        deliveryManId: picked.id,
        rider: picked.fullName,
        riderPhone: picked.phone || '',
        deliveryManStatus: 'No',
        riderStatus: 'riderAssigned',
      });
    }
  }
}}
```

---

## 3. Optimistic Update — Field Merge Contract

Per owner guardrail, only assignment-related fields are merged:

| Field | Value Set | Source |
|-------|-----------|--------|
| `deliveryManId` | `picked.id` | Selected rider from modal |
| `rider` | `picked.fullName` | Rider name from employee list |
| `riderPhone` | `picked.phone` | Rider phone from employee list |
| `deliveryManStatus` | `'No'` | Pending accept (backend convention) |
| `riderStatus` | `'riderAssigned'` | Computed status per transform L306 |

All other order fields preserved via spread (`...order` / `...existing`). Socket `delivery-assign-order` overwrites with authoritative data within seconds.

---

## 4. Complete Event Flow After Fix

```
User clicks "Assign Rider" in modal
  ↓
AssignRiderModal.handleConfirm()
  ↓
POST /api/v2/vendoremployee/order/delivery-order-assign  →  succeeds
  ↓
onAssigned(picked) fires  →  optimistic updateOrder()    ← GAP 2 FIX
  ↓                           (card immediately shows
  ↓                            "Reassign" + rider name)
  ↓
toast shown, modal closes
  ↓
~100-500ms later: socket "delivery-assign-order" arrives
  ↓
handleDeliveryAssignOrder:
  payload.orders[0] present  →  orderFromAPI.order()      ← GAP 1 FIX
  ↓                              (no GET API call)
  updateOrder()  →  authoritative data replaces optimistic
  ↓
Card shows final correct state
  ↓
fOrderStatus 2 + isDelivery + hasRiderAssigned
  → "Reassign" button (not Serve)                          ← GAP 3 FIX
```

---

## 5. Build Verification

```
$ CI=false yarn build
File sizes after gzip:
  441.01 kB (+188 B)  build/static/js/main.b6f94e33.js
  16.68 kB             build/static/css/main.7689dfef.css
Done in 19.96s.
```

Build: **PASS** (0 errors, +188 bytes from new code).
Dev server hot reload: **PASS** (`webpack compiled with 1 warning` — pre-existing, unrelated).

---

## 6. What Was NOT Changed

| Item | Status |
|------|--------|
| `AssignRiderModal.jsx` | NO CHANGE — `onAssigned` already supported |
| `deliveryService.js` | NO CHANGE |
| `orderTransform.js` | NO CHANGE |
| Non-delivery order behavior | NOT TOUCHED |
| `DeliveryCard.jsx` | NOT TOUCHED |
| `/app/memory/final/` | NOT UPDATED |
| Baseline docs | NOT UPDATED |
| Rider accept/reject socket | NOT IMPLEMENTED (Bucket 5) |

---

## Document Metadata

| Field | Value |
|-------|-------|
| Version | 2.0 |
| Created | 2026-05-20 |
| Files changed | 4 (`socketEvents.js`, `socketHandlers.js`, `OrderCard.jsx`, `TableCard.jsx`) |
| Build status | PASS |
| Dev server | PASS |
