# CR-162 — Impact Analysis (Gate 2) ✅ CLOSED
## Mid-Stay Partial Payment for Room Orders

**Date:** 2026-08-25
**Role:** PLANNING (Gate 2)
**Status:** COMPLETE — all decisions locked, all APIs validated. Ready for Gate 4 GO → Gate 3.

---

## Header

| Field | Value |
|---|---|
| Code Reality | PARTIAL — `receiveBalance` mapped in transform + read in reports; no write UI/service/endpoint wired |
| Conflict Pre-Check | LOW — no active CR touches `roomService.js`, `roomInfo` fields, or `DashboardPage` room card |
| Risk | HIGH — direct payment recording, affects room card total + checkout totals |
| Blast Radius | MEDIUM (5 files + 1 new, ~70–90 lines) |
| Gate 2 Status | ✅ CLOSED — all OQs resolved, APIs confirmed |

---

## 1. Final API Contract (fully validated 2026-08-25)

### Endpoint: `POST /api/v2/vendoremployee/pos/room-payment`

```
Required: room_order_id, payment_amount, payment_mode
Optional: payment_note, transaction_id
(payment_type: not required — omit entirely)

payment_mode accepted values: cash | upi | card | online | razorpay | neft
```

**Success (HTTP 200):**
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
    "room_order_id": 1232082,
    "room_price": 5000,
    "legacy_advance_payment": 1000,
    "ledger_paid_amount": 1500,
    "total_paid_amount": 1500,
    "remaining_room_balance": 3500,
    "payments": [
      { "id": 5, "payment_amount": 1000, "payment_mode": "cash", "payment_type": "advance", "paid_at": "2026-08-25 ..." },
      { "id": 6, "payment_amount": 500,  "payment_mode": "cash", "payment_type": "advance", "paid_at": "2026-08-25 ..." }
    ]
  }
}
```

**Errors:**
- Missing fields → HTTP 422 with field-level errors
- Closed/cancelled order → HTTP 422 "Room order is already closed or cancelled"

---

## 2. Running Orders Schema (final confirmed structure — 2026-08-25)

`room_payment_summary` is **nested inside `room_info`** (NOT top level).
No `enabled` flag — presence of `room_payment_summary` key is the gate.
Non-room orders: `room_info: null` → no `room_payment_summary` at all.

```json
"room_info": {
  "room_price": "5000.00",
  "advance_payment": "1000.00",
  "balance_payment": "4000.00",        ← static check-in snapshot — DO NOT USE for live balance
  "room_payment_summary": {            ← present ONLY when ledger payments exist
    "room_order_id": 1232082,
    "room_price": 5000,
    "legacy_advance_payment": 1000,
    "ledger_paid_amount": 2007,
    "total_paid_amount": 2007,
    "remaining_room_balance": 2993,    ← LIVE SOURCE OF TRUTH for outstanding balance
    "payments": [
      {
        "id": 10, "payment_amount": 1000, "payment_mode": "cash",
        "payment_type": "advance", "transaction_id": null,
        "payment_note": "...", "received_by": 1478, "paid_at": "2026-08-25 14:20:34"
      }
    ]
  }
}
```

**Validation results (2026-08-25):**

| Check | Result |
|---|---|
| `room_payment_summary` nested in `room_info` | ✅ |
| `room_payment_summary` absent from top level | ✅ (0 of 13 orders have it at top level) |
| `enabled` flag removed | ✅ |
| Non-room orders: `room_info: null` | ✅ (12/12 non-room orders) |
| `remaining_room_balance` live | ✅ 2993 after ₹2007 paid |
| All payment_modes accepted | ✅ cash, upi, card, online, razorpay, neft |

---

## 3. Key FE Concepts

**`balance_payment` vs `remaining_room_balance`:**

| Field | Where | What it means | Updates? |
|---|---|---|---|
| `room_info.balance_payment` | running orders | Amount owed at check-in time (snapshot) | Never — static |
| `room_info.room_payment_summary.remaining_room_balance` | running orders | Live outstanding balance after all payments | Yes — every `room-payment` call |

**FE must switch from `balancePayment` → `roomPaymentSummary.remainingRoomBalance`** in three places:
1. `computeRoomCardAmount()` — DashboardPage
2. Room balance display — CartPanel
3. The "checked-in room outstanding" section in CollectPaymentPanel (checkout total)

---

## 4. FE Transform Spec (exact mapping for Gate 3)

Add inside the existing `roomInfo` block in `orderTransform.js`:

```js
roomInfo: api.room_info ? {
  roomPrice:            parseFloat(api.room_info.room_price) || 0,
  advancePayment:       parseFloat(api.room_info.advance_payment) || 0,
  balancePayment:       parseFloat(api.room_info.balance_payment) || 0,  // kept for legacy fallback
  receiveBalance:       parseFloat(api.room_info.receive_balance) || 0,  // legacy field
  // ... existing fields ...

  // CR-162: mid-stay payment ledger
  roomPaymentSummary: api.room_info.room_payment_summary ? {
    remainingRoomBalance: parseFloat(api.room_info.room_payment_summary.remaining_room_balance) || 0,
    ledgerPaidAmount:     parseFloat(api.room_info.room_payment_summary.ledger_paid_amount) || 0,
    legacyAdvancePayment: parseFloat(api.room_info.room_payment_summary.legacy_advance_payment) || 0,
    payments: (api.room_info.room_payment_summary.payments || []).map(p => ({
      id:            p.id,
      amount:        parseFloat(p.payment_amount) || 0,
      mode:          p.payment_mode || '',
      type:          p.payment_type || 'advance',
      note:          p.payment_note || '',
      transactionId: p.transaction_id || '',
      paidAt:        p.paid_at || '',
    })),
  } : null,
} : null,
```

**Balance resolution helper (for DashboardPage + CartPanel):**
```js
// Use this pattern everywhere outstanding room balance is needed
const liveRoomBalance = order.roomInfo?.roomPaymentSummary?.remainingRoomBalance
  ?? order.roomInfo?.balancePayment   // fallback for rooms without ledger
  ?? 0;
```

---

## 5. Data Flow

```
Room card on Dashboard shows: r2 ₹3,000 outstanding

Staff taps [Record Payment]
  → RecordPaymentModal opens
      Amount:  [₹500         ]
      Method:  [Cash ▾       ]
      Note:    [optional     ]
      [Confirm Payment]

Staff confirms
  → POST /pos/room-payment { room_order_id, payment_amount: 500, payment_mode: "cash" }
  ← { success: true, room_payment_summary.remaining_room_balance: 2500 }

  FE updates room card:
    Option A (optimistic): read remaining_room_balance from response → patch local state
    Option B (socket): if backend fires update-order socket with updated room_info → auto-syncs

  Room card now shows: r2 ₹2,500 ✅
  Full payment history available in room_info.room_payment_summary.payments ✅
```

---

## 6. Scope Lock

**Files WILL change (5 + 1 new):**

| File | Change | Risk |
|---|---|---|
| `src/api/constants.js` | +`ROOM_RECORD_PAYMENT: '/api/v2/vendoremployee/pos/room-payment'` | LOW |
| `src/api/services/roomService.js` | +`recordPartialPayment({ roomOrderId, amount, paymentMode, note })` | LOW |
| `src/api/transforms/orderTransform.js` | +`roomPaymentSummary` mapping inside `roomInfo` block | LOW |
| `src/pages/DashboardPage.jsx` | `computeRoomCardAmount` — use live balance. +[Record Payment] button on room cards | MEDIUM |
| NEW `src/components/order-entry/RecordPaymentModal.jsx` | Amount + method form + payment history list | MEDIUM |
| `src/components/order-entry/CartPanel.jsx` | Room balance display — switch to `roomPaymentSummary.remainingRoomBalance` | LOW |

**Files will NOT touch:**
`CollectPaymentPanel.jsx`, `socketHandlers.js`, `AppProviders.jsx`, `RoomOrdersMockup.jsx` (report — separate concern)

---

## 7. All Decisions Locked

| OQ | Question | Decision |
|---|---|---|
| OQ-1 | `room_payment_summary` location | ✅ Nested inside `room_info` — confirmed 2026-08-25 |
| OQ-2 | Socket after `room-payment`? | FE uses response-based optimistic update. Gate 3 accounts for this. |
| OQ-3 | Print receipt after payment? | Deferred — out of scope for CR-162 v1 |
| OQ-4 | Button location | Dashboard room card (primary). OrderEntry room view (secondary — same button exposed via CartPanel or room order header) |

---

## Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: CR-162 → IMPLEMENTED, pos_6_0
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: all files + CR-162 + date
- [ ] Code markers: // CR-162 in every modified file
- [ ] Compile: 0 new warnings
```

---

## Credentials

- Test (active room): `owner@18march.com / ***` (restaurant 478, room e3, order 1232082)
- Preview: `https://core-pos-deploy-12.preview.emergentagent.com`
