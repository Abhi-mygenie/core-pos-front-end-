# CR-405 Phase B V2 — Implementation Plan (Gate 3 Rewrite)

**ID:** CR-405 Phase B V2
**Title:** Shift Dine-in to Room — V2 Whole Order Transfer
**Date:** 2026-11-17
**Gate:** 3 — Line-by-line Implementation Plan
**Based on:** `impact/CR-405_IMPACT_ANALYSIS_REV2_V2_SWITCH_2026_11_17.md` §2
**Supersedes:** `plans/CR-405_IMPLEMENTATION_PLAN.md` Phase B section (V1 contract)
**ODs applied:** OD-RT-01 (V2), OD-RT-02 (settles at transfer), OD-RT-03 (empty rooms OK), OD-RT-04 (V1 was intentional, now V2)

---

## Code Reality Re-verification (all lines confirmed at HEAD 2026-11-17)

| # | File | Line | Current content | Status |
|---|------|------|----------------|--------|
| 1 | `api/constants.js` | L97 | `ORDER_SHIFTED_ROOM: '/api/v1/vendoremployee/order/order-shifted-room',  // CR-405-B: v1 = new contract` | EXACT |
| 2 | `orderTransform.js` | L1818-1826 | `transferToRoom: (table, paymentData, _roomId) => ({ source_order_id: ..., target_order_id: ..., transfer_note: 'Yes' })` | EXACT |
| 3 | `CollectPaymentPanel.jsx` | L259-260 | `occupiedRoomsCached = (tables \|\| []).filter(t => t.isRoom && t.isOccupied)` | EXACT |
| 4 | `CollectPaymentPanel.jsx` | L537 | `const rooms = (fresh \|\| []).filter(t => t.isRoom && t.isOccupied);` | EXACT |
| 5 | `CollectPaymentPanel.jsx` | L1357-1361 | `paymentData.isTransferToRoom = true; paymentData.roomId = selectedRoom.tableId; paymentData.roomOrderId = selectedRoom.orderId;` | EXACT |
| 6 | `OrderEntry.jsx` | L2407-2409 | `const payload = orderToAPI.transferToRoom(effectiveTable, paymentData, paymentData.roomId); const res = await api.post(API_ENDPOINTS.ORDER_SHIFTED_ROOM, payload);` | EXACT |

---

## Scope Lock

**Files WILL change:**
| File | Hotspot? |
|------|----------|
| `api/constants.js` | NO |
| `api/transforms/orderTransform.js` | YES (R5) |
| `components/order-entry/CollectPaymentPanel.jsx` | YES (R5) |
| `__tests__/api/transforms/orderTransform.cr405b.test.js` | NO (test) |

**Files will NOT touch:**
- `OrderEntry.jsx` — post-shift handling (removeOrder, updateTableStatus, navigateAfterOrderAction) already correct for both V1 and V2
- `FolioCheckoutPanel.jsx` — Phase A/C only
- `pmsService.js` — Phase D only
- `CheckInPage.jsx` — Phase D only

---

## Edit Sites

### E-B1 — `api/constants.js` L97: v1 → v2

```javascript
// BEFORE (L97):
  ORDER_SHIFTED_ROOM: '/api/v1/vendoremployee/order/order-shifted-room',  // CR-405-B: v1 = new contract (source_order_id + target_order_id)

// AFTER:
  ORDER_SHIFTED_ROOM: '/api/v2/vendoremployee/order/order-shifted-room',  // CR-405-B-V2: v2 = whole order transfer (order_id + room_id + payment)
```

---

### E-B2 — `orderTransform.js` L1816-1826: rewrite transferToRoom to V2 contract

```javascript
// BEFORE (L1816-1826):
  // Moves active F&B lines from target (dine-in/walk-in) onto source (open room order).
  // Does NOT settle — settlement happens separately on the source room order.
  // v1 = { source_order_id, target_order_id, transfer_note } only.
  // v2 (old contract) required order_id + payment_mode — no longer used.
  transferToRoom: (table, paymentData, _roomId) => ({
    source_order_id: String(paymentData.roomOrderId || ''), // room order (receives items)
    target_order_id: String(table.orderId),                  // dine-in order (loses items)
    transfer_note:   'Yes',
  }),

// AFTER:
  // CR-405-B-V2: Whole order transfer — moves the entire dine-in/walk-in order
  // to a room. V2 settles at transfer (OD-RT-02). Room must be assigned/checked-in
  // but does not need an existing food order (OD-RT-03).
  // v2 = { order_id, payment_mode, payment_amount, payment_status, room_id }
  transferToRoom: (table, paymentData, roomId) => ({
    order_id:       String(table.orderId),                    // dine-in order being transferred
    payment_mode:   'ROOM',                                   // fixed — room billing
    payment_amount: String(paymentData.finalTotal || 0),      // order total
    payment_status: 'unpaid',                                 // OD-RT-02: settles at transfer
    room_id:        String(roomId || paymentData.roomId || ''), // room table ID (from all-table-list)
  }),
```

---

### E-B3 — `CollectPaymentPanel.jsx` L1357-1361: remove roomOrderId (V2 doesn't use source_order_id)

```javascript
// BEFORE (L1357-1361):
    // Transfer to Room — attach room selection
    if (paymentMethod === 'transferToRoom' && selectedRoom) {
      paymentData.isTransferToRoom = true;
      paymentData.roomId      = selectedRoom.tableId;   // kept for legacy compat
      paymentData.roomOrderId = selectedRoom.orderId;   // CR-405-B: source_order_id for v1 contract
    }

// AFTER:
    // Transfer to Room — attach room selection (CR-405-B-V2: whole order transfer)
    if (paymentMethod === 'transferToRoom' && selectedRoom) {
      paymentData.isTransferToRoom = true;
      paymentData.roomId = selectedRoom.tableId;         // CR-405-B-V2: room_id for v2 contract (table ID)
    }
```

**Note:** `roomOrderId` removed — V2 uses `room_id` (table ID) not `source_order_id` (order ID). The `selectedRoom.tableId` is already set correctly.

---

### E-B4 — `__tests__/api/transforms/orderTransform.cr405b.test.js`: rewrite tests for V2

```javascript
// FULL REWRITE — replace entire file content:

/**
 * CR-405-B-V2 — order-shifted-room v2 contract: transferToRoom payload rewrite
 *
 * V2 contract: { order_id, payment_mode, payment_amount, payment_status, room_id }
 * Whole order transfer — moves entire dine-in order to room.
 * Settles at transfer (OD-RT-02). Room needs check-in, not existing order (OD-RT-03).
 */

import { toAPI } from '../../../api/transforms/orderTransform';

const table    = { orderId: '1232900', tableId: 5, tableNumber: 'T2', tableSection: 'Floor', isRoom: false };
const pd       = { isTransferToRoom: true, roomId: 8522, finalTotal: 474.50 };
const pdNoTotal = { isTransferToRoom: true, roomId: 8522 };

describe('transferToRoom — CR-405-B-V2: v2 contract', () => {

  // VB2-2: payload contains V2 fields only
  it('VB2-2: payload has order_id, payment_mode, payment_amount, payment_status, room_id', () => {
    const payload = toAPI.transferToRoom(table, pd, pd.roomId);
    expect(payload).toEqual({
      order_id:       '1232900',
      payment_mode:   'ROOM',
      payment_amount: '474.5',
      payment_status: 'unpaid',
      room_id:        '8522',
    });
  });

  // VB2-3: NO V1 fields in payload
  it('VB2-3: payload has NO source_order_id, target_order_id, transfer_note', () => {
    const payload = toAPI.transferToRoom(table, pd, pd.roomId);
    expect(payload.source_order_id).toBeUndefined();
    expect(payload.target_order_id).toBeUndefined();
    expect(payload.transfer_note).toBeUndefined();
  });

  // order_id from table.orderId (stringified)
  it('order_id = String(table.orderId)', () => {
    const t = { orderId: 1232900 }; // numeric → string
    const payload = toAPI.transferToRoom(t, pd, pd.roomId);
    expect(payload.order_id).toBe('1232900');
    expect(typeof payload.order_id).toBe('string');
  });

  // payment_mode is always 'ROOM'
  it('payment_mode is always "ROOM"', () => {
    const payload = toAPI.transferToRoom(table, pd, pd.roomId);
    expect(payload.payment_mode).toBe('ROOM');
  });

  // payment_amount from paymentData.finalTotal (stringified)
  it('payment_amount = String(paymentData.finalTotal)', () => {
    const payload = toAPI.transferToRoom(table, pd, pd.roomId);
    expect(payload.payment_amount).toBe('474.5');
  });

  // payment_amount defaults to '0' when finalTotal missing
  it('payment_amount defaults to "0" when finalTotal missing', () => {
    const payload = toAPI.transferToRoom(table, pdNoTotal, pdNoTotal.roomId);
    expect(payload.payment_amount).toBe('0');
  });

  // payment_status is always 'unpaid'
  it('payment_status is always "unpaid"', () => {
    const payload = toAPI.transferToRoom(table, pd, pd.roomId);
    expect(payload.payment_status).toBe('unpaid');
  });

  // room_id from roomId arg (stringified), fallback to paymentData.roomId
  it('room_id from roomId arg, falls back to paymentData.roomId', () => {
    const payload1 = toAPI.transferToRoom(table, pd, 8522);
    expect(payload1.room_id).toBe('8522');

    const payload2 = toAPI.transferToRoom(table, pd, null);
    expect(payload2.room_id).toBe('8522'); // fallback to pd.roomId
  });
});
```

---

## Verification Matrix

| # | Test | Expected | Automated? |
|---|------|----------|:---:|
| VB2-1 | `constants.js` ORDER_SHIFTED_ROOM | `/api/v2/.../order-shifted-room` | NO (code) |
| VB2-2 | `transferToRoom(table, pd)` returns V2 shape | `{order_id, payment_mode:'ROOM', payment_amount, payment_status:'unpaid', room_id}` | YES (unit) |
| VB2-3 | V2 payload has NO V1 fields | No `source_order_id`, `target_order_id`, `transfer_note` | YES (unit) |
| VB2-4 | `paymentData.roomOrderId` removed from CPP | Not set in L1357 block | NO (code) |
| VB2-5 | End-to-end: To Room → select room → Transfer → HTTP 200 | Dine-in order moved; source table freed | NO (browser) |
| VB2-6 | Compile + existing tests | `yarn build` exit 0, unit tests pass | YES |
| VB2-R1 | Non-room payment flow unaffected | `transferToRoom` only called when `isTransferToRoom=true` | YES (code) |

---

## Post-Code Registry Checklist

```
□ 1. registry.json: CR-405 → phase B status updated to V2
□ 2. CR_REGISTRY.md: row updated
□ 3. FILE_OWNERSHIP.md: 3 files listed with CR-405-B-V2 marker + date
□ 4. Code markers: // CR-405-B-V2 in every modified location
□ 5. Compile check: yarn build exits 0, 0 new warnings
```

---

## Execution Sequence

```
1. Entry verify: constants.js L97 + orderTransform.js L1818 + CPP L1357 exact
2. Apply E-B1 (constants.js: v1 → v2)
3. Apply E-B2 (orderTransform.js: rewrite transferToRoom to V2 contract)
4. Apply E-B3 (CollectPaymentPanel.jsx: remove roomOrderId)
5. Apply E-B4 (rewrite unit tests for V2)
6. Run unit tests: npx craco test --watchAll=false --testPathPattern=cr405b
7. Compile check: yarn build
8. Registry checklist
9. Checkpoint B-V2: ✅
```

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| V2 rejects `payment_status:'unpaid'` | Curl probe confirmed in investigation: V2 accepts this field. If rejected at runtime, change to `'paid'`. |
| `payment_amount: '0'` on zero-total edge case | V2 probe showed backend validates amount — test with real order. |
| Reverse flow (CR-163 splitRoomOrder) breaks | BQ-405-V2-01 sent to Gyan. Post-implementation probe required. |
| Old unit tests fail | E-B4 rewrites all tests for V2 contract. |

---

```
Plan ready: CR-405 Phase B V2
3 code files + 1 test file
Hotspots: orderTransform.js (R5) + CollectPaymentPanel.jsx (R5)
All ODs: LOCKED (OD-RT-01…04)
Awaiting Gate 4 GO.
```
