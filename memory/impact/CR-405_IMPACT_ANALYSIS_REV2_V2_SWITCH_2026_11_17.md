# CR-405 — Impact Analysis Rev 2 (Gate 2 Revision — V2 Switch + Phase C)

**ID:** CR-405
**Title:** Room Folio — Discount at Checkout + Check-in, Partial Room Payments, Shift Dine-in to Room
**Date:** 2026-11-17 (Rev 2)
**Supersedes:** `impact/CR-405_IMPACT_ANALYSIS.md` (2026-10-01, V1 contract)
**Triggered by:** Owner decision OD-RT-01 (2026-11-17) — switch Phase B from V1 to V2 (whole order transfer)
**Investigation:** `investigations/INV-ROOM-TRANSFER-2026-11-16.md` (9/10 steps, HIGH confidence)
**Code Reality:** PARTIAL — Phases A+D implemented and QA-passed; Phase B implemented (V1, needs V2 rewrite); Phase C not started
**Conflict Pre-Check:** See §1
**Risk:** HIGH (settlement flow change + R5 hotspot files)

---

## 0. Phase Status Summary

| Phase | Scope | Status | Action in this IA |
|-------|-------|--------|-------------------|
| **A** | Checkout room discount (`room_discount_apply_to`) | ✅ GATE_5B_QA_PASSED | No change needed |
| **B** | Shift dine-in to room (`order-shifted-room`) | ✅ IMPLEMENTED (V1) → **REWRITE for V2** | V2 switch (this IA) |
| **C** | `partial_payments_room` multi-leg room payment | ❌ NOT STARTED | New IA (this doc) |
| **D** | Check-in discount bake | ✅ IMPLEMENTED | No change needed |

**This revision covers Phase B (V2 switch) and Phase C (new) only.**

---

## 1. Conflict Pre-Check (at HEAD 2026-11-17)

| File | Last touched by | Open conflict? |
|------|-----------------|----------------|
| `api/constants.js` | CR-405-B 2026-10-01 (L97 v1 URL) | NONE — same CR, same line |
| `api/transforms/orderTransform.js` | BUG-664 2026-11-10 (L313) | NONE — different zone (L1820 vs L313) |
| `components/order-entry/CollectPaymentPanel.jsx` | BUG-660 2026-11-09 (L541-692) | NONE — different zone (L259/1357 vs L541) |
| `components/order-entry/OrderEntry.jsx` | BUG-662 2026-11-09 (L1679) | NONE — different zone (L2407 vs L1679) |
| `components/pms/frontdesk/FolioCheckoutPanel.jsx` | BUG-665 2026-11-10 (L852) | NONE — different zone (Phase C = handlePaid area) |

**No blocking conflicts.**

---

## 1b. Interaction Risk: Reverse Flow (CR-163 — Move Items OUT of Room)

### Current reverse flow (CR-163, GATE_5B_QA_PASS)

CR-163 `SplitRoomItemsModal` lets staff select items from a room order and move them to a dine-in table. It uses **completely different endpoints** from `order-shifted-room`:

| Flow | Endpoint | What it does |
|------|----------|-------------|
| **To Room (CR-405)** | `POST order-shifted-room` (V1 or V2) | Moves order/items INTO a room |
| **Out of Room (CR-163)** | `POST split-room-order` | Splits selected items OUT of a room order to a table |
| **Table switch (CR-163 Path B)** | `POST order-table-switch` | Moves a split order to a dynamically created table |

The two flows are **endpoint-independent** — changing `order-shifted-room` from V1 to V2 does not affect `split-room-order`.

### V2 interaction question (OPEN — needs backend confirmation)

With **V1**, items were added to the room's existing order → `splitRoomOrder(orderId)` operates on that same room order. The room order contains both original room items + transferred dine-in items. Splitting works because all items live on one order.

With **V2**, the whole dine-in order re-associates to the room. **Two possible backend behaviors:**

| Scenario | What happens to transferred order | Can CR-163 split items? |
|----------|----------------------------------|------------------------|
| **A: Merge** | V2 merges dine-in items INTO the room's existing order (like V1 but automated) | YES — same order, `splitRoomOrder` works unchanged |
| **B: Associate** | V2 keeps the dine-in order as a separate "associated order" linked to the room (like current `associatedOrders` in folio) | MAYBE — `splitRoomOrder` would need the transferred order's ID, not the room order's ID. The `SplitRoomItemsModal` currently uses `effectiveTable.orderId` (the room order). If transferred items live on a different order, they won't appear in `cartItems`. |

**Scenario B is the higher risk.** If V2 keeps transferred orders separate:
- `SplitRoomItemsModal` would not see transferred items (they're on a different orderId)
- Staff could only split items from the room's own order, not from transferred ones
- Moving transferred items back would need a different mechanism

### Recommendation

**Add to backend brief (BQ-405-V2-01):** After a V2 `order-shifted-room` transfer, does the dine-in order get merged INTO the room order (single orderId), or does it remain a separate associated order linked to the room? This determines whether CR-163's reverse flow works unchanged.

**Gate 3 plan MUST include a probe:** After implementing V2, test `splitRoomOrder` on items that were transferred via V2 to confirm the reverse flow still works.

---

## 2. Phase B Revised — V2 Switch (Whole Order Transfer)

### 2.1 Owner Decisions (all locked 2026-11-17)

| OD | Decision | Impact |
|----|----------|--------|
| OD-RT-01 | **Switch to V2 (whole order transfer)** | V2 is the go-forward path |
| OD-RT-02 | **V2 settles at transfer** | `payment_amount` + `payment_status` are required; order gets marked with payment info at transfer |
| OD-RT-03 | **Empty rooms (check-in, no food order) supported** | Room filter must change from `isOccupied` to rooms with active check-in |
| OD-RT-04 | V1 switch was intentional at the time, but owner now wants V2 | Historical context only |

### 2.2 V1 → V2 Contract Comparison

| Aspect | V1 (current) | V2 (target) |
|--------|-------------|-------------|
| **Endpoint** | `/api/v1/.../order-shifted-room` | `/api/v2/.../order-shifted-room` |
| **What moves** | Individual items between two orders | Whole order re-associated to room |
| **Payload** | `{source_order_id, target_order_id, transfer_note}` | `{order_id, payment_mode, payment_amount, payment_status, room_id}` |
| **Room requirement** | Room must have an **existing order** (`source_order_id` needed) | Room must be **assigned/checked-in** (no order needed) |
| **Settlement** | Does NOT settle — separate step on room order | Settles at transfer (`payment_amount` + `payment_status` required) |
| **Room ID type** | Room's `orderId` (from running orders) | Room's `tableId` (from table list, `rtype=RM`) |

### 2.3 Current Code (V1) — Lines to Change

| # | File | Line(s) | Current V1 Code |
|---|------|---------|----------------|
| 1 | `api/constants.js` | L97 | `ORDER_SHIFTED_ROOM: '/api/v1/vendoremployee/order/order-shifted-room'` |
| 2 | `orderTransform.js` | L1820-1824 | `transferToRoom: (table, paymentData, _roomId) => ({ source_order_id, target_order_id, transfer_note })` |
| 3 | `CollectPaymentPanel.jsx` | L259-260 | `occupiedRoomsCached = tables.filter(t => t.isRoom && t.isOccupied)` |
| 4 | `CollectPaymentPanel.jsx` | L537 | `freshRooms = fresh.filter(t => t.isRoom && t.isOccupied)` |
| 5 | `CollectPaymentPanel.jsx` | L1357-1361 | `paymentData.roomId = selectedRoom.tableId; paymentData.roomOrderId = selectedRoom.orderId` |
| 6 | `OrderEntry.jsx` | L2407-2409 | `payload = orderToAPI.transferToRoom(effectiveTable, paymentData, paymentData.roomId); await api.post(API_ENDPOINTS.ORDER_SHIFTED_ROOM, payload)` |

### 2.4 Data Flow — V2 Target

```
User clicks "To Room" → setPaymentMethod("transferToRoom")
  → Fetches rooms (needs rooms with CHECK-IN, not just orders)
  → V2 CHANGE: filter by isRoom && (isOccupied || isAssigned/checked-in)
  → User selects room → setSelectedRoom(room)

CollectPaymentPanel.jsx L1357:
  → paymentData.isTransferToRoom = true
  → paymentData.roomId = selectedRoom.tableId     // ← V2 uses tableId (same as before)
  → paymentData.roomOrderId = NO LONGER NEEDED     // ← V2 doesn't use source_order_id

OrderEntry.jsx L2407:
  → payload = orderToAPI.transferToRoom(effectiveTable, paymentData)
  → V2 payload: {
      order_id: String(table.orderId),          // dine-in order being transferred
      payment_mode: 'ROOM',
      payment_amount: String(paymentData.finalTotal || 0),
      payment_status: 'unpaid',                 // or based on actual payment state
      room_id: String(paymentData.roomId),      // room table ID
    }
  → POST /api/v2/.../order-shifted-room
```

### 2.5 Edit Sites (Phase B V2)

| Edit | File | Location | Change |
|------|------|----------|--------|
| E-B1 | `api/constants.js` | L97 | `/api/v1/` → `/api/v2/` |
| E-B2 | `orderTransform.js` | L1818-1826 | Rewrite `transferToRoom` to emit V2 contract: `{order_id, payment_mode, payment_amount, payment_status, room_id}` |
| E-B3a | `CollectPaymentPanel.jsx` | L259-260 | `occupiedRoomsCached` filter: add rooms with check-in but no order (V2 supports them). Needs `isAssigned` or fallback to `isOccupied` for now until `all-table-list` returns check-in status. **NOTE:** `all-table-list` API returns `engage:1/0` for tables — `engage:1` = room has active check-in. `tableTransform` maps this to `isOccupied`. So `isOccupied` already covers rooms with check-in regardless of food order existence. **No filter change needed** — V2 probes show room must be "assigned" (checked-in), which `engage:1` / `isOccupied:true` already covers. |
| E-B3b | `CollectPaymentPanel.jsx` | L1357-1361 | Remove `roomOrderId` line (V2 doesn't use `source_order_id`). Keep `roomId = selectedRoom.tableId`. |
| E-B4 | `OrderEntry.jsx` | L2407-2409 | No change needed — same call pattern: `orderToAPI.transferToRoom(effectiveTable, paymentData, paymentData.roomId)` → `api.post(API_ENDPOINTS.ORDER_SHIFTED_ROOM, payload)`. The payload shape change is in the transform (E-B2). Post-shift handling (removeOrder + updateTableStatus) stays. |

**Files WILL change:** `constants.js` (E-B1), `orderTransform.js` (E-B2), `CollectPaymentPanel.jsx` (E-B3b)
**Files will NOT touch:** `OrderEntry.jsx` (post-shift handler already correct), `FolioCheckoutPanel.jsx`, `CheckInPage.jsx`, `pmsService.js`

### 2.6 Risk Assessment (Phase B V2)

| Risk | Severity | Mitigation |
|------|----------|------------|
| V2 settles at transfer — `payment_status:'unpaid'` may not be accepted | HIGH | Probe V2 with `payment_status:'unpaid'` on preprod BEFORE coding. If rejected, ask backend for allowed values. |
| `payment_amount` wrong (should be finalTotal of dine-in order) | MEDIUM | Use `paymentData.finalTotal` (already computed by CPP). Unit test with known amounts. |
| Rooms without orders now appear in list — user might select empty room | LOW | V2 handles this natively ("Room is not assigned yet" only for rooms without check-in). `isOccupied` filter already covers checked-in rooms. |
| Reverting to V2 URL while some old tests expect V1 shape | LOW | Update unit tests for new V2 contract shape. |

### 2.7 Verification Matrix (Phase B V2)

| # | Test | Expected | Automated? |
|---|------|----------|:---:|
| VB2-1 | `constants.js` ORDER_SHIFTED_ROOM | `/api/v2/.../order-shifted-room` | NO (code) |
| VB2-2 | `transferToRoom(table, pd)` returns V2 shape | `{order_id, payment_mode:'ROOM', payment_amount, payment_status, room_id}` | YES (unit) |
| VB2-3 | V2 payload has NO V1 fields | No `source_order_id`, `target_order_id`, `transfer_note` | YES (unit) |
| VB2-4 | `paymentData.roomOrderId` removed | Not set in CPP L1357 block | NO (code) |
| VB2-5 | End-to-end: To Room → select room → Transfer → HTTP 200 | Dine-in order moved to room; source table freed | NO (browser) |
| VB2-6 | Room with check-in but no food order visible in list | Room pill appears; V2 accepts transfer | NO (browser) |
| VB2-R1 | Non-room payment flow unaffected | `transferToRoom` only called when `isTransferToRoom=true` | YES (code review) |

---

## 3. Phase C — `partial_payments_room` (Multi-leg Room Payment)

### 3.1 Code Reality: NONE

```bash
grep -rn "partial_payments_room\|splitPaymentsRoom" /app/frontend/src/ → 0 hits
```

The `collectBillExisting` transform (orderTransform.js) emits `partial_payments` for F&B split but has no `partial_payments_room` support.

### 3.2 API Contract (handover_5 §4.5, curl-verified)

```json
// Optional key on order-bill-payment (V2):
"partial_payments_room": [
  { "payment_mode": "cash", "payment_amount": 500, "transaction_id": "" },
  { "payment_mode": "upi",  "payment_amount": 350, "transaction_id": "TXN123" }
]
```

**Behaviour:**
- Present + at least 1 leg > 0 → separate `restaurant_room_payments` rows; `balance_payment_mode = 'partial'`
- Absent → single legacy checkout row (backward-compatible)
- Independent from `partial_payments` (F&B legs)
- Leg sum should = post-discount room due. Backend does NOT 422 on sum mismatch.
- Proof: Order 1232910 → `partial_payments_room` cash 570 + upi 380 → `balance_payment_mode=partial` ✅

### 3.3 Data Flow

```
FolioCheckoutPanel.jsx → handlePaid(paymentData)
  → orderToAPI.collectBillExisting(..., paymentData, {...})
  → Builds payload with payment fields

Currently:
  - F&B split: paymentData.splitPayments → payload.partial_payments (exists)
  - Room split: NOT IMPLEMENTED

Needed:
  - paymentData.splitPaymentsRoom → payload.partial_payments_room (new)
```

### 3.4 Edit Sites (Phase C)

| Edit | File | Location | Change |
|------|------|----------|--------|
| E-C1 | `FolioCheckoutPanel.jsx` | After roomDiscount state block | Add `splitPaymentsRoom` state: `useState([])`. Add room split UI toggle + payment leg inputs in RoomSection or a separate section. |
| E-C2 | `FolioCheckoutPanel.jsx` | `handlePaid` (after CR-405-A room discount injection) | Pass `splitPaymentsRoom` into paymentData: `paymentData.splitPaymentsRoom = splitPaymentsRoom.filter(l => l.amount > 0)` |
| E-C3 | `orderTransform.js` | `collectBillExisting` after existing `partial_payments` block (~L1730-1736) | Destructure `splitPaymentsRoom = []` from paymentData. Emit `partial_payments_room` array when legs present. |

**Files WILL change:** `FolioCheckoutPanel.jsx` (E-C1, E-C2), `orderTransform.js` (E-C3)
**Files will NOT touch:** `CollectPaymentPanel.jsx` (room split is Front Desk only), `PmsCheckoutDrawer.jsx`, `CheckInPage.jsx`

### 3.5 Relationship to FU-385-D

OD-405-04 (locked): Phase C stays in CR-405, sequenced last. `partial_payments_room` is the backend mechanism FU-385-D will need. When FU-385-D reaches implementation, it inherits this CR's room split UI. FU-385-D's remaining scope is removing the CSS hide rule (`.frontdesk-bill [data-testid="payment-split-btn"] { display:none }` from `frontdesk.css`) and testing the full split flow. See OG-PMS-048.

### 3.6 Owner Decisions for Phase C

All original ODs (OD-405-01…06) remain locked. No new ODs surfaced.

**Open design question (non-blocking, can be decided at Gate 3):**
- **Q-C1:** Room split UI — add leg inputs directly in FolioCheckoutPanel's RoomSection? Or a separate modal? Recommendation: inline leg inputs (same pattern as F&B split in CollectPaymentPanel), max 3 legs.

### 3.7 Risk Assessment (Phase C)

| Risk | Severity | Mitigation |
|------|----------|------------|
| `partial_payments_room` leg sum ≠ room due → backend accepts silently | MEDIUM | FE-side validation: sum of legs must equal room balance before sending |
| Interaction with Phase A room discount | LOW | Room discount reduces the balance; split legs should sum to post-discount balance. Test: apply discount → split room payment → verify amounts. |
| `orderTransform.js` R5 hotspot | MEDIUM | E-C3 is additive (new block after existing code). No existing lines modified. |

### 3.8 Verification Matrix (Phase C)

| # | Test | Expected | Automated? |
|---|------|----------|:---:|
| VC-1 | Room settle with 2-leg room payment | `partial_payments_room` in payload with 2 entries | YES (unit) |
| VC-2 | Room settle without room split | No `partial_payments_room` key in payload | YES (unit) |
| VC-3 | `balance_payment_mode` after multi-leg | `'partial'` on the order | NO (curl) |
| VC-4 | Room discount + room split combined | Legs sum to post-discount room balance | NO (browser) |
| VC-5 | Non-room order settle | No `partial_payments_room` key | YES (unit) |

---

## 4. Full Blast Radius Summary (Phases B-V2 + C)

| File | R5? | Phase | Est. Lines |
|------|-----|-------|-----------|
| `api/constants.js` | NO | B | 1 |
| `api/transforms/orderTransform.js` | YES | B, C | ~15 |
| `components/order-entry/CollectPaymentPanel.jsx` | YES | B | ~3 |
| `components/pms/frontdesk/FolioCheckoutPanel.jsx` | NO | C | ~30 |

**Total: 4 files, ~49 lines. Hotspots: `orderTransform.js` (R5) + `CollectPaymentPanel.jsx` (R5).**

---

## 5. Recommended Execution Order

```
Phase B V2 switch (independently closable):
  1. E-B1: constants.js v1 → v2
  2. E-B2: rewrite transferToRoom to V2 contract
  3. E-B3b: remove roomOrderId from CPP
  4. Unit tests for new V2 payload shape
  5. Compile + self-test
  → Gate 5a checkpoint B-V2

Phase C (independently closable, after B-V2):
  6. E-C1: FolioCheckoutPanel room split state + UI
  7. E-C2: Pass splitPaymentsRoom in handlePaid
  8. E-C3: orderTransform emit partial_payments_room
  9. Unit tests for partial_payments_room
  10. Compile + self-test
  → Gate 5a checkpoint C
```

---

## 6. Gate Status

```
Impact Analysis Rev 2: CR-405 (Phases B-V2 + C)
Code Reality: PARTIAL — A+D done, B needs V2 rewrite, C not started
Conflict Pre-Check: NONE
ODs: ALL LOCKED (OD-405-01…06 + OD-RT-01…04)
Files WILL change: 4 (see §4)
Files will NOT touch: OrderEntry.jsx, CheckInPage.jsx, pmsService.js, PmsCheckoutDrawer.jsx
Next: Gate 3 GO → Implementation Plan (Phase B-V2 first, then Phase C)
```
