# Investigation Report — BUG-ROOM-PAIDROOM: `paid_room` Not Set on Room Order Collect Bill

**Date:** 2026-07-07  
**Investigator:** INVESTIGATION AGENT (AGENT_PROMPT_ALPHA v0.7)  
**Classification:** `FE_BUG`  
**Severity:** P1 — Room order collect bill payload missing `paid_room: 'yes'`; backend may not correctly close the room booking side on checkout  
**Reported by:** Owner — "`paid_room = 'yes'` not passing in collect bill payload for room orders"

---

## 1. Symptom

When collecting a bill on a room order (order with `isRoom = true`), the `BILL_PAYMENT` API payload sends:

```json
{
  "paid_room": "",
  ...
}
```

Expected:
```json
{
  "paid_room": "yes",
  ...
}
```

---

## 2. Code Trace

### `paid_room` across ALL four commit flows

| Flow | Function | Line | `paid_room` value | Should be for room |
|---|---|---|---|---|
| Place Order (postpaid fresh) | `placeOrder` | L1041 | `null` | — (placement, not checkout) |
| Place + Pay (QSR fresh / prepaid) | `placeOrderWithPayment` | L1358 | `''` | — (placement, not checkout) |
| **Collect Bill (existing order)** | `collectBillExisting` | **L1632** | `''` ❌ | **`'yes'`** |
| QSR Collect Bill (placed edge) | `collectBillExisting` | **L1632** | `''` ❌ | **`'yes'`** |

### Root Cause — Single line, `collectBillExisting` L1632

```js
// /app/frontend/src/api/transforms/orderTransform.js

collectBillExisting: (table, cartItems, customer, paymentData, options = {}) => {
    ...
    // Line 1632:
    paid_room:  '',   // ❌ hardcoded — NEVER reads table.isRoom
    usage_id:   '',
```

The function receives `table` (= `effectiveTable` from OrderEntry.jsx). That `table` object **DOES carry `table.isRoom = true`** for room orders — it is set during normalization:

```js
// orderTransform.js L169 — fromAPI.order():
const isRoom = table.rtype === 'RM' || api.order_in === 'RM';
// L210:
isRoom,   // ← present on every normalized order object
```

But `collectBillExisting` ignores `table.isRoom` entirely when writing `paid_room`.

---

## 3. Data Flow — How `table.isRoom` Reaches `collectBillExisting` (Confirmed)

```
Backend API response
  └─ fromAPI.order()              // orderTransform.js L165
       └─ isRoom = rtype==='RM'   // L169 ✅ set correctly
            └─ normalized order   // L210 { isRoom: true }
                 └─ OrderEntry effectiveTable = { ...table, orderId }  // OE.jsx L237
                      └─ collectBillExisting(effectiveTable, ...)      // OE.jsx L1444 / L2112
                           └─ paid_room: ''  ← ❌ never reads table.isRoom
```

`table.isRoom` is **available** inside `collectBillExisting` — it just is never used.

---

## 4. Entry Points That Call `collectBillExisting`

Both call sites pass `effectiveTable` — which carries `isRoom`:

| Entry | OrderEntry.jsx Line | Context |
|---|---|---|
| QSR Collect Bill (already-placed edge) | L1444 | `handleQsrCollectBill` else-branch |
| Non-QSR Collect Bill (postpaid checkout) | L2112 | Collect Payment button handler |

---

## 5. `room_id` — NOT Required (Owner Confirmed)

`room_id` does **not** need to be added to the `collectBillExisting` payload. The backend already maps the room via `order_id` — the `order_id` field in the BILL_PAYMENT payload is sufficient for the backend to identify the room. Owner confirmed 2026-07-07.

---

## 6. `paymentData.roomId` — NOT Relevant Here

`paymentData.roomId` is set at CollectPaymentPanel.jsx L1108:
```js
if (paymentMethod === 'transferToRoom' && selectedRoom) {
    paymentData.roomId = selectedRoom.tableId;   // Transfer-to-Room only
}
```
This is only set for the **Transfer to Room** flow — it is NOT set for a normal room order checkout. So `paymentData` does NOT carry `roomId` in the collect-bill path. The fix must read `table.isRoom` directly inside `collectBillExisting`.

---

## 7. Root Cause Classification

**`FE_BUG` — `collectBillExisting` ignores `table.isRoom` when writing `paid_room` in the BILL_PAYMENT payload.**

`table.isRoom` is available and correct; it is simply never referenced in the payload builder.

---

## 8. Recommended Fix (for BUG FIX Agent — DO NOT implement here)

### Fix — `collectBillExisting` Line 1632 (1 line)

```js
// BEFORE (L1632):
paid_room:  '',

// AFTER:
paid_room:  table?.isRoom ? 'yes' : '',
```

`room_id` does **not** need to be added — backend resolves the room from `order_id`. Owner confirmed 2026-07-07.

---

## 9. Files to Change

| File | Line | Change |
|---|---|---|
| `/app/frontend/src/api/transforms/orderTransform.js` | L1632 | `table?.isRoom ? 'yes' : ''` |

**Total: 1 file, 1 line change.**

---

## 10. Confidence Level

**HIGH (98%)** — The `table.isRoom` flag is present on the object passed into `collectBillExisting`. The hardcoded `''` at L1632 is unconditional. The fix is a direct conditional on an already-available field. `room_id` is not required — backend resolves room from `order_id` (owner confirmed).

---

**STATUS: INVESTIGATION CLOSED — 2026-07-07**  
*Handoff to BUG FIX Agent.*
