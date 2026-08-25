# CR-162 — Impact Analysis (Gate 2)
## Mid-Stay Partial Payment for Room Orders

**Date:** 2026-08-25
**Role:** PLANNING (Gate 2 — Impact Analysis)
**Based on intake:** `/app/memory/change_requests/CR-162_ROOM_MID_STAY_PARTIAL_PAYMENT_INTAKE.md`

---

## Header

| Field | Value |
|---|---|
| Code Reality | PARTIAL — `receiveBalance` mapped in transform + used in reports; no write UI/service/endpoint wired |
| Conflict Pre-Check | LOW — no active CR touches roomService.js or roomInfo fields |
| Risk | HIGH — direct payment recording, affects checkout totals |
| Blast Radius | MEDIUM (4–5 files, ~60–90 lines) |
| Gate 2 Status | **COMPLETE — all blockers resolved. Ready for Gate 4 GO → Gate 3** |

---

## 1. API Validation Results (2026-08-25)

### Endpoint confirmed: `POST /api/v2/vendoremployee/pos/room-payment`

```
POST https://preprod.mygenie.online/api/v2/vendoremployee/pos/room-payment
Authorization: Bearer <token>
Content-Type: application/json

{
  "room_order_id": 1232082,       ← REQUIRED — order id from running orders
  "payment_amount": 500,          ← REQUIRED
  "payment_mode": "cash",         ← REQUIRED — cash|upi|card|online|razorpay|neft (all accepted)
  "payment_note": "optional",     ← optional
  "transaction_id": ""            ← optional
  // payment_type: omit — not required, defaults to "advance" internally
}
```

**Success response (HTTP 200):**
```json
{
  "success": true,
  "payment": {
    "id": 6,
    "room_order_id": 1232082,
    "payment_amount": 500,
    "payment_mode": "cash",
    "payment_type": "advance"
  },
  "room_payment_summary": {
    "enabled": true,
    "room_order_id": 1232082,
    "room_price": 5000,
    "legacy_advance_payment": 1000,
    "ledger_paid_amount": 1500,
    "total_paid_amount": 1500,
    "remaining_room_balance": 3500,
    "payments": [
      { "id": 5, "payment_amount": 1000, "payment_mode": "cash", "payment_type": "advance", "paid_at": "..." },
      { "id": 6, "payment_amount": 500,  "payment_mode": "cash", "payment_type": "advance", "paid_at": "..." }
    ]
  }
}
```

**Error cases confirmed:**
- Missing required fields → HTTP 422 with field errors
- Closed/cancelled room order → HTTP 422 "Room order is already closed or cancelled"

---

## 2. Running Orders Schema Update (confirmed 2026-08-25)

Backend added `room_payment_summary` to the running orders API response (`GET /api/v1/vendoremployee/pos/employee-orders-list`).

**Location: TOP LEVEL of order object** (not inside `room_info`)

```json
order = {
  "id": 1232082,
  "order_in": "RM",
  "room_info": {
    "advance_payment": "1000.00",
    "balance_payment": "4000.00",    ← STATIC — set at check-in, never updates
    "room_price": "5000.00"
  },
  "room_payment_summary": {          ← TOP LEVEL — present on ALL orders
    "enabled": true,                 ← true only for room orders with payment history
    "remaining_room_balance": 2993,  ← LIVE SOURCE OF TRUTH for outstanding balance
    "ledger_paid_amount": 2007,
    "legacy_advance_payment": 1000,
    "payments": [...]
  }
}
```

**Non-room orders** receive `room_payment_summary: { enabled: false, payments: [], ledger_paid_amount: 0, ... }` — all zeros.

**`balance_payment` in `room_info` is a static check-in snapshot.** It never changes after check-in. The live outstanding balance is `room_payment_summary.remaining_room_balance`.

---

## 3. OQ-1 — Structure Decision: RESOLVED ✅ (2026-08-25)

**Backend confirmed:** `room_payment_summary` is now nested **inside `room_info`**.
**`enabled` flag removed** — presence of `room_payment_summary` key is the gate.
**Non-room orders:** `room_info` is `null` → no `room_payment_summary` at all. ✅

**Confirmed schema in running orders (`GET /api/v1/vendoremployee/pos/employee-orders-list`):**
```json
room_info: {
  "room_price": "5000.00",
  "advance_payment": "1000.00",
  "balance_payment": "4000.00",          ← static check-in snapshot
  "room_payment_summary": {              ← NESTED ✅ — only present for room orders
    "room_order_id": 1232082,
    "room_price": 5000,
    "legacy_advance_payment": 1000,
    "ledger_paid_amount": 2007,
    "total_paid_amount": 2007,
    "remaining_room_balance": 2993,      ← LIVE SOURCE OF TRUTH
    "payments": [
      { "id": 10, "payment_amount": 1000, "payment_mode": "cash", "payment_type": "advance", "paid_at": "..." },
      { "id": 11, "payment_amount": 500,  "payment_mode": "cash", "payment_type": "advance", "paid_at": "..." }
    ]
  }
}
```

**Validation checks (all passed 2026-08-25):**

| Check | Result |
|---|---|
| `room_payment_summary` nested in `room_info` | ✅ |
| `room_payment_summary` removed from top level | ✅ (0 orders with top-level key) |
| `enabled` flag removed | ✅ |
| Non-room orders: `room_info` is null (no summary block) | ✅ (12/12 non-room orders have `room_info: null`) |
| `remaining_room_balance` reflects live payments | ✅ 2993 (5000 - 1000 advance - 1007 mid-stay) |
| `payments[]` history complete | ✅ 11 payments recorded |

---

## 4. Data Flow (final, once structure confirmed)

```
Dashboard room card (r2 — ₹3,000 outstanding)
  → Staff taps [Record Payment]
  → RecordPaymentModal opens
      Amount: [₹500      ]
      Method: [Cash ▾    ]
      Note:   [optional  ]
      [Confirm Payment]

  → POST /api/v2/vendoremployee/pos/room-payment
      { room_order_id, payment_amount, payment_mode, payment_note }

  ← Response: room_payment_summary.remaining_room_balance = 2500
  → Update room card locally using response data
  → OR wait for socket update-order to refresh running orders
  → Room card now shows ₹2,500 ✅
```

---

## 5. Blast Radius (pending structure confirmation)

| File | Change | Risk |
|---|---|---|
| `src/api/constants.js` | +`ROOM_RECORD_PAYMENT: '/api/v2/vendoremployee/pos/room-payment'` | LOW |
| `src/api/services/roomService.js` | +`recordPartialPayment({roomOrderId, amount, paymentMode, note})` | LOW |
| `src/api/transforms/orderTransform.js` | +map `room_payment_summary` inside `roomInfo` block (once backend nests it) | LOW |
| New `RecordPaymentModal.jsx` | Amount + method form, shows payment history | MEDIUM |
| `src/pages/DashboardPage.jsx` | `computeRoomCardAmount` — use `remaining_room_balance` instead of `balancePayment`. Add [Record Payment] button on room cards | MEDIUM |

**Possible additional files:**
- `src/components/order-entry/CartPanel.jsx` — room balance display uses `roomInfo.balancePayment`
- `src/pages/reports-module/RoomOrdersMockup.jsx` — already reads `receiveBalance`; may need update

---

## 6. Open Questions

| OQ | Question | Status |
|---|---|---|
| OQ-1 | Move `room_payment_summary` inside `room_info`? | ✅ **DONE** — confirmed nested 2026-08-25 |
| OQ-2 | Does `room-payment` fire `update-order` socket? | ❓ Not tested — FE will use response data for optimistic update |
| OQ-3 | Print receipt after recording payment? | ❓ Ask owner |
| OQ-4 | Where to add [Record Payment] button: room card only, or also inside OrderEntry? | ❓ Ask owner |

**Gate 3 ready. All API blockers resolved.**
