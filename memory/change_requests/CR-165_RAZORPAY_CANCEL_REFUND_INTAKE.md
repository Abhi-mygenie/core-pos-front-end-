# CR-165 — Razorpay Cancel and Refund Integration
## Intake Document (v2 — Updated 2026-08-23)

**Type:** Change Request (New Integration)
**ID:** CR-165
**Date created:** 2026-08-17 | **Last updated:** 2026-08-23
**Status:** INTAKE — 3.5/4 decisions resolved. 1 sub-question deferred to next session.
**Source Investigation:** INV-BACKEND-001

---

## Description

Backend has a Razorpay cancel-and-refund endpoint. When an order paid via Razorpay PG is cancelled, the frontend must trigger a refund via this endpoint. Currently no frontend integration exists — cancellations proceed without initiating any Razorpay refund, leaving the customer charged with no refund.

---

## API Contract (CONFIRMED via live probe 2026-08-23)

```
POST https://preprod.mygenie.online/api/v1/razor-pay/cancel-and-refund-order
Content-Type: application/json
(NO Authorization header required — public endpoint, no Bearer token)

Body:
{
  "order_id": 983282,
  "restaurant_id": 699,
  "cancellation_reason": "Customer cancelled",
  "cancellation_note": "Refund through Razorpay"
}
```

### Confirmed response behaviours (live-probed 2026-08-23)

| Scenario | Response |
|---|---|
| Missing fields | `{ status: false, message: "The order id field is required." }` |
| Non-existent order | `{ status: false, message: "Order not found" }` |
| Valid Razorpay order | Refund processed — e.g. `rfnd_TTANnBPdnL11CB`, ₹20, status: "processed" |
| Backend SQL log bug | Returns `status: false` with SQL error BUT refund WAS still processed. Backend team must fix null `user_id` in `order_logs`. |

### Important: No auth header
This is the ONLY endpoint in the system that requires no Authorization header.
The existing `api` axios instance automatically appends `Bearer <token>`.
Whether to use the existing instance (token ignored by backend) or create a separate unauthenticated instance is **DEFERRED — see open question OQ-2b**.

---

## Owner Decisions

### OQ-1 — Auto or manual trigger? ✅ RESOLVED

**Answer:** BOTH.

**Trigger A — Auto (existing cancel flow):**
When cashier cancels an order from **OrderCard** (Dashboard) or **OrderEntry** screen and the order has a `razorpay_order_id` → automatically call cancel-and-refund API after cancel succeeds. No extra click needed.

**Trigger B — Manual Refund button (Order Report):**
In Daily Report → Order Report section, rows where `razorpay_order_id ≠ null` show a **[Refund]** button. Clicking it opens the cancellation modal and on confirm calls cancel-and-refund (cancels AND refunds in one action from the report).

---

### OQ-2 — Axios instance ✅ MOSTLY RESOLVED (1 sub-question deferred)

**Answer confirmed:**
- Endpoint is on `preprod.mygenie.online` (same base URL as all other APIs) ✅
- "Use as per env preprod, never use manage strictly" — confirmed, preprod URL is correct ✅
- No Authorization header needed (public endpoint, unlike all others)

**OQ-2b — DEFERRED to next session:**
Should the FE use:
- **Option A:** Existing `api` axios instance (Bearer token gets sent, backend appears to ignore it)
- **Option B:** Separate unauthenticated axios instance (clean, correct, ~5 extra lines)

Owner will answer in next session before Gate 2 can start.

---

### OQ-3 — Cancellation reason fields ✅ RESOLVED

**Answer:** Reuse the existing `CancelOrderModal.jsx` with a `mode="refund"` prop adaptation.

**What changes in refund mode:**
1. Title changes: "Cancel Order" → **"Cancel & Refund"**
2. Add a `cancellation_note` text field below the reason dropdown (API requires this field)
3. Confirm button changes: "Cancel Order" → **"Confirm & Refund via Razorpay"**
4. Add warning: *"A refund of ₹X will be initiated via Razorpay"*

**Existing modal already has:** reason dropdown, error handling, submitting state — all reusable.

Files affected: `CancelOrderModal.jsx` (minor prop adaptation).

---

### OQ-4 — How to detect Razorpay-paid orders ✅ RESOLVED (confirmed via live probe)

**Answer:** Use the `razorpay_order_id` field returned by the Order Report API.

**Live proof from `ORDER_REPORT_BETA_COMBINED` probe:**
```
{
  "order_id": 1232006,
  "payment_method": "cash",
  "razorpay_order_id": null,   ← cash order → no Refund button
  ...
}
```

**Detection logic:**
```js
if (order.razorpay_order_id) → show [Refund] button
else                          → no Refund button
```

**In the existing codebase:** `OrderLedgerMockup.jsx` already uses `razorpayOrderId` for filtering (line 372-373) — confirming this field is known and available in the order report data model.

**For auto-trigger (Trigger A):** Check `order.razorpay_order_id` or `order.paymentMethod === 'razorpay'` on the order object in `handleCancelOrder` in `OrderEntry.jsx` and `DashboardPage.jsx`.

---

## Blast Radius (updated)

**New files:**
- `api/services/razorpayRefundService.js` — `cancelAndRefund(orderId, restaurantId, reason, note)` function

**Modified files:**
- `api/constants.js` — add `RAZORPAY_CANCEL_REFUND: '/api/v1/razor-pay/cancel-and-refund-order'`
- `CancelOrderModal.jsx` — add `mode` prop, `cancellation_note` field, title/button changes
- `OrderEntry.jsx` `handleCancelOrder` — add Razorpay guard + refund call (Trigger A)
- `DashboardPage.jsx` `handleCancelOrderConfirm` — same guard + refund call (Trigger A)
- Order Report page — add `[Refund]` button for rows with `razorpay_order_id` (Trigger B)

**Estimated scope:** MEDIUM (5-6 files, ~80-120 lines)
**Risk:** HIGH (payment/financial — Razorpay refund initiation, real money)

---

## Code Reality: NONE

- `RAZORPAY_CANCEL_REFUND` constant: NOT in `constants.js` ❌
- `razorpayRefundService.js`: does not exist ❌
- `CancelOrderModal.jsx`: has no `mode` prop or `cancellation_note` field ❌
- `handleCancelOrder` in `OrderEntry.jsx` and `DashboardPage.jsx`: no Razorpay refund step ❌
- Order Report page: no Refund button ❌

---

## Backend Note (filed)

Backend SQL bug confirmed: `order_logs` table insert fails with `user_id: null` after successful refund. Refund IS processed by Razorpay but the log entry fails. Backend team must fix the `user_id` null issue in the `razorpay_cancel_refund` log handler. **This does not block FE implementation** — the refund itself works.

---

## Open Items Before Gate 2

| # | Question | Status |
|---|---|---|
| OQ-1 | Auto + manual trigger? | ✅ RESOLVED |
| OQ-2 | Preprod URL? | ✅ RESOLVED |
| OQ-2b | Axios instance: existing `api` (with token) OR separate unauthenticated? | ⏳ DEFERRED — answer in next session |
| OQ-3 | Reuse CancelOrderModal? | ✅ RESOLVED |
| OQ-4 | Detect via razorpay_order_id? | ✅ RESOLVED |

**Gate 2 can start immediately once OQ-2b is answered (1 question, 2 options, ~30 seconds to answer).**

---

## Duplicate Check
DISTINCT — no prior CR for Razorpay cancel-and-refund.

## Next Step
Answer OQ-2b → PLANNING agent writes Gate 2 Impact Analysis.
