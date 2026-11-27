# INV-ROOM-TRANSFER — order-shifted-room V1 vs V2 Contract Investigation

**Date:** 2026-11-16
**Role:** INVESTIGATION
**Triggered by:** Owner request — investigate v1 (item transfer) vs v2 (whole order transfer) for `order-shifted-room`
**Credentials:** owner@ruby.com / RID 672 (Ruby ZAP)
**Steps used:** 9/10
**Classification:** CONTRACT_ANALYSIS
**Confidence:** HIGH (curl-probed both endpoints, code-traced FE flow, read CR-405 IA+plan)

---

## 1. Summary

Two distinct backend endpoints exist at the same path with different version prefixes. They do fundamentally different things:

| | **V1** (current FE) | **V2** (old, unused by FE) |
|---|---|---|
| **Path** | `/api/v1/vendoremployee/order/order-shifted-room` | `/api/v2/vendoremployee/order/order-shifted-room` |
| **Method** | POST | POST |
| **What it does** | Moves **individual items** from dine-in order → room order | Moves the **whole order** to a room |
| **Contract** | `{source_order_id, target_order_id, transfer_note}` | `{order_id, payment_mode, payment_amount, payment_status, room_id}` |
| **Room requirement** | Room must have an **existing order** (source_order_id) | Room must be **assigned/checked-in** (room_id = table ID) |
| **FE currently uses** | ✅ YES (since CR-405-B, Oct 2026) | ❌ NO (was used before CR-405-B) |

---

## 2. Curl Probe Evidence (all saved to `/app/memory/evidence/INV-ROOM-TRANSFER-2026-11-16/`)

### V1 — Item Transfer Contract (current FE)

**Probe:** `POST /api/v1/.../order-shifted-room` with `{source_order_id:"999999", target_order_id:"999998", transfer_note:"Yes"}`
**Response:** HTTP 404 — `{"message":"Target order not found"}`
**Meaning:** Auth passed ✅. Payload accepted ✅. Backend looked up `target_order_id=999998` → not found (fake ID). V1 validates the payload shape, then looks up both orders.

### V2 — Whole Order Transfer Contract (old, unused)

**Probe A:** `POST /api/v2/.../order-shifted-room` with V1-shaped payload `{source_order_id, target_order_id, transfer_note}`
**Response:** HTTP 403 — `{"error":[{"code":"order_id","message":"The order id field is required."}, {"code":"payment_mode","message":"..."}, {"code":"payment_amount","message":"..."}, {"code":"payment_status","message":"..."}, {"code":"room_id","message":"..."}]}`
**Meaning:** V2 completely **rejects** the V1 contract. Requires 5 different fields.

**Probe B:** `POST /api/v2/.../order-shifted-room` with `{order_id:"999999", payment_mode:"ROOM", room_id:"1"}`
**Response:** HTTP 403 — `{"error":[{"code":"payment_amount","message":"..."}, {"code":"payment_status","message":"..."}]}`
**Meaning:** V2 accepted order_id + payment_mode + room_id. Only missing: payment_amount + payment_status.

**Probe C:** `POST /api/v2/.../order-shifted-room` with `{order_id:"999999", payment_mode:"ROOM", payment_amount:"347.01", payment_status:"unpaid", room_id:"1"}`
**Response:** `{"error":"Room is not assigned yet! You can switch this order to the room"}`
**Meaning:** Full payload accepted ✅. Room validation: room_id=1 has no active check-in → rejected.

**Probe D:** Same but with `room_id:"7656"` (R-1, has active check-in with order 1578760)
**Response:** `{"error":"Invalid Order status for shifting"}`
**Meaning:** Room found and assigned ✅. But order_id=999999 doesn't exist → invalid order status.

### V2 Validated Contract (derived from probes):
```json
{
  "order_id":        "<dine-in/walkin order ID to transfer>",
  "payment_mode":    "ROOM",
  "payment_amount":  "<order total amount>",
  "payment_status":  "unpaid",
  "room_id":         "<room table ID (from all-table-list, rtype=RM)>"
}
```

---

## 3. Code Trace — Current FE Flow (V1)

### How the "To Room" button works today:

```
CollectPaymentPanel.jsx L3008
  → User clicks "To Room" button → setPaymentMethod("transferToRoom")

CollectPaymentPanel.jsx L547
  → Fetches occupiedRooms (rooms with existing orders)
  → Displays room pills (R-1, RR-1, etc.)
  → User selects a room → setSelectedRoom(room)

CollectPaymentPanel.jsx L1357-1361
  → paymentData.isTransferToRoom = true
  → paymentData.roomId = selectedRoom.tableId     // room's table ID
  → paymentData.roomOrderId = selectedRoom.orderId // room's ORDER ID ← KEY for V1

OrderEntry.jsx L2407-2409
  → const payload = orderToAPI.transferToRoom(effectiveTable, paymentData, paymentData.roomId)
  → await api.post(API_ENDPOINTS.ORDER_SHIFTED_ROOM, payload)

orderTransform.js L1820-1824 (transferToRoom)
  → Returns: {
      source_order_id: String(paymentData.roomOrderId),  // room order (RECEIVES items)
      target_order_id: String(table.orderId),              // dine-in order (LOSES items)
      transfer_note: 'Yes'
    }

Endpoint: POST /api/v1/vendoremployee/order/order-shifted-room
  → Backend moves items from target to source
  → Dine-in order gets cleared
  → Room order gets new items added
```

### V1 Requirement: Room MUST have an existing order
- `occupiedRooms` are filtered: `tables.filter(t => t.isRoom && t.isOccupied)` (L259-261)
- `selectedRoom.orderId` is required for `source_order_id`
- If room has no order → it doesn't appear in the room list → can't transfer

---

## 4. Behavioral Differences: V1 vs V2

| Aspect | V1 (item transfer) | V2 (whole order transfer) |
|--------|--------------------|--------------------------| 
| **What moves** | Individual food items from dine-in → room order | The entire order changes association from table → room |
| **Room prerequisite** | Room must have an **existing order** (checked-in guest with open order) | Room must be **assigned** (checked-in), but order not required |
| **Order IDs involved** | TWO: source (room) + target (dine-in) | ONE: the dine-in order ID + room table ID |
| **After transfer** | Dine-in order cleared/cancelled. Room order has items added to it. Two orders touched. | The single order moves to the room context. One order, re-associated. |
| **Payment fields** | NONE — V1 doesn't settle. Settlement happens separately on room order. | YES — requires `payment_mode`, `payment_amount`, `payment_status`. Implies settlement at transfer time. |
| **Room order ID needed?** | YES (`source_order_id`) — FE must know the room's order ID | NO — just `room_id` (table ID). Backend resolves the room context. |
| **Empty room (no check-in)?** | ❌ Not possible — no order to transfer into | ❌ "Room is not assigned yet" error |
| **Room with check-in but no food order?** | ❌ Not possible — `occupiedRooms` filters by `isOccupied` (needs order) | ✅ Works — just needs room to be "assigned" |

---

## 5. Why CR-405-B Switched from V2 → V1

From `impact/CR-405_IMPACT_ANALYSIS.md` Phase B:

> **Code Reality: PARTIAL (wrong payload + wrong version)**
> - `constants.js:96` — `ORDER_SHIFTED_ROOM: '/api/v2/...'` ← **wrong version**
> - **Handover_5 §6 contract (v1):** `{source_order_id, target_order_id, transfer_note}`

The backend team (handover_5 §6) specified the V1 contract as the **correct** one for the POS use case. CR-405-B implementation:
- E-B1: Changed `/api/v2/` → `/api/v1/` in constants.js
- E-B2: Added `roomOrderId = selectedRoom.orderId` in paymentData
- E-B3: Rewrote `transferToRoom` to emit `{source_order_id, target_order_id, transfer_note}` only

The switch was deliberate — V1 was the **backend-specified** contract for item-level transfer.

---

## 6. Active Environment State (Ruby ZAP, RID 672)

| Entity | Status |
|--------|--------|
| Running orders | **0** (no active dine-in orders to test with) |
| Room R-1 (id=7656) | Engaged, has order 1578760 (guest: Noname / 7776660989) |
| Room R-2 (id=7657) | Not engaged (empty) |
| Table T-2 (id=7659) | Engaged, has order 1578310 |
| Table 7 | **Not found** in current table list (may have been removed or is in a different section) |

**Note:** The user's screenshot shows table 7, order #000737 on `pos-uat.mygenie.online/dashboard`. The curl probes hit `preprod.mygenie.online`. The order/table may exist in a different environment (UAT vs preprod) or may have been settled since.

---

## 7. Key Questions for Owner

| # | Question | Context |
|---|----------|---------|
| OD-RT-01 | **Which behavior do you want?** V1 moves items (backend-specified). V2 moves the whole order (simpler contract but includes payment fields). | Determines whether to switch back to V2 or stay on V1 |
| OD-RT-02 | **Does V2 settle at transfer time?** The V2 contract includes `payment_amount` + `payment_status`. Does this mean the order gets marked as paid/settled when transferred? Or is `payment_status:"unpaid"` allowed? | If V2 settles, it changes the room billing flow |
| OD-RT-03 | **Room without order — should transfer work?** V1 requires room to have an order. V2 only requires room to be assigned. If a guest is checked in but hasn't ordered food yet, should "To Room" from a table still work? | V1 blocks this, V2 allows it |
| OD-RT-04 | **Was the V1 switch (CR-405-B) intentional by backend?** Handover_5 §6 specified V1. Was this a deliberate design choice or a temporary workaround? | Determines whether V2 is the intended long-term path |

---

## 8. Recommendations

### If owner wants V2 (whole order transfer):

**FE changes needed:**
1. `constants.js:97` — Change `/api/v1/` → `/api/v2/`
2. `orderTransform.js:1820-1824` — Rewrite `transferToRoom` to emit V2 contract:
   ```javascript
   transferToRoom: (table, paymentData, roomId) => ({
     order_id: String(table.orderId),
     payment_mode: 'ROOM',
     payment_amount: String(paymentData.finalTotal || 0),
     payment_status: 'unpaid',
     room_id: String(paymentData.roomId),
   })
   ```
3. `CollectPaymentPanel.jsx:259-261` — Room filter may need to change from `isOccupied` to `isAssigned` (if V2 supports rooms without orders)
4. `CollectPaymentPanel.jsx:1360` — `roomOrderId` no longer needed (V2 doesn't use `source_order_id`)

**Risk:** HIGH — changes settlement flow, needs backend confirmation that `payment_status:"unpaid"` is valid for V2.

### If owner wants to stay on V1 (item transfer):
No code changes needed. Current implementation is correct per CR-405-B.

### If owner wants V2 as an OPTION alongside V1:
Backend brief needed — clarify when to use each endpoint and whether both will be maintained.

---

## 9. Investigation Handover

```
Root cause: N/A — this is a contract analysis, not a bug.
V1 (current FE): POST /api/v1/.../order-shifted-room → item transfer
  Contract: {source_order_id, target_order_id, transfer_note}
  Room must have existing order. FE filters by isOccupied.

V2 (old, unused): POST /api/v2/.../order-shifted-room → whole order transfer
  Contract: {order_id, payment_mode, payment_amount, payment_status, room_id}
  Room must be assigned (checked-in). No room order needed.
  Includes payment fields — may settle at transfer time.

Both endpoints verified LIVE via curl (preprod.mygenie.online).
Classification: CONTRACT_ANALYSIS
Confidence: HIGH
Steps: 9/10
FE change scope: 4 files if switching to V2 (constants, transform, CollectPaymentPanel ×2)
Planning skip eligible: NO (R5 hotspot files + payment/settlement logic)
Retroactive candidates: NONE
Investigation report: memory/investigations/INV-ROOM-TRANSFER-2026-11-16.md
Evidence: memory/evidence/INV-ROOM-TRANSFER-2026-11-16/
```

---

## 10. Owner Decisions — ALL LOCKED (2026-11-17)

| # | Question | Answer |
|---|----------|--------|
| OD-RT-01 | Which transfer behavior? | **Switch to V2 (whole order transfer)** — V2 is the go-forward path |
| OD-RT-02 | Does V2 settle at transfer? | **Yes, V2 settles at transfer** |
| OD-RT-03 | Empty rooms (check-in, no food order)? | **Yes, transfer should work** — V2 supports this natively |
| OD-RT-04 | Was V1 switch intentional? | **Yes, V1 was intentional** at the time (backend directive), but owner now wants V2 going forward |

### Owner note on OD-RT-02:
> "How can we take order out of room? This functionality is already there, did you check?"

**Answer:** Yes — CR-163 (Move Food Items from Room Order to Table) is at GATE_5B_QA_PASS. The reverse flow (room-to-table transfer) already exists and is implemented.

### Implementation impact:
Switching to V2 requires 4 FE file changes (see §8 Recommendations, "If owner wants V2"):
1. `constants.js:97` — `/api/v1/` → `/api/v2/`
2. `orderTransform.js:1820-1824` — rewrite `transferToRoom` to V2 contract
3. `CollectPaymentPanel.jsx:259-261` — room filter: `isOccupied` → `isAssigned` (V2 supports rooms without orders)
4. `CollectPaymentPanel.jsx:1360` — `roomOrderId` no longer needed

**Risk:** HIGH — changes settlement flow. Need backend confirmation that V2 with `payment_status:"unpaid"` is valid, or if settlement is mandatory.

**All 4 ODs locked. Ready for implementation planning (Gate 3 update for V2 switch).**
