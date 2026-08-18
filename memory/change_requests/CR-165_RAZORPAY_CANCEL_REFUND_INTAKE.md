# CR-165 — Razorpay Cancel and Refund Integration

**Type:** Change Request (New Integration — Owner Decisions Pending)
**ID:** CR-165
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — owner decisions deferred to Gate 2 (Planning)
**Source Investigation:** INV-BACKEND-001

---

## Description

Backend has provided a new Razorpay cancel-and-refund endpoint. When an order paid via Razorpay PG is cancelled, the frontend needs to trigger a refund via this endpoint. Currently no frontend integration exists — cancellations proceed without triggering any Razorpay refund, leaving the customer charged with no refund initiated.

## API Contract (Backend-Provided)

```
POST https://manage.mygenie.online/api/v1/razor-pay/cancel-and-refund-order
Content-Type: application/json

Body:
{
  "order_id": 983282,
  "restaurant_id": 699,
  "cancellation_reason": "Customer cancelled",
  "cancellation_note": "Refund through Razorpay"
}
```

**Note:** Base URL is `manage.mygenie.online` — different from the main API (`preprod.mygenie.online`). Confirmation needed on whether this uses the same axios instance.

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Order Entry → Cancellation Flow / Dashboard → Order Card Cancel |
| Priority | P1 |
| Severity | HIGH — customers are charged via Razorpay but refunds never initiated on order cancellation |
| Risk | HIGH (payment/financial — Razorpay refund initiation) |
| Fast Lane | NO — new service + conditional trigger in cancellation flow |

## Evidence

- Source: OWNER-REPORTED via INV-BACKEND-001
- API contract provided by backend team
- Current state: `api/constants.js` has `PAYMENT_LINK` for Razorpay but NO `cancel-and-refund-order` endpoint
- Cancellation flow in `OrderEntry.jsx` (`handleCancelOrder`) has no Razorpay refund step

## Code Reality

```bash
# Existing Razorpay endpoint in constants.js:
  PAYMENT_LINK: '/api/v1/razor-pay/payment-link'   ← exists (CR-017)

# New endpoint: ABSENT ❌
  RAZORPAY_CANCEL_REFUND — not in constants.js
  No service function
  No UI trigger

# Existing cancellation flow:
  OrderEntry.jsx → handleCancelOrder()
    → DELETE/POST cancel-order API
    → navigateAfterOrderAction()
    ← NO Razorpay refund step ❌

# Where PG payment method is tracked:
  Order paid with dynamic PG method (e.g. 'razorpay')
  → order has razorpay_order_id in backend (visible in OrderReportBetaPage filter)
  → Need to check this field at cancellation time to decide if refund is needed
```

- **Code reality: NONE** — no constant, no service, no UI trigger

## Blast Radius

**New files:**
- `api/services/razorpayRefundService.js` — `cancelAndRefund()` function

**Modified files:**
- `api/constants.js` — add `RAZORPAY_CANCEL_REFUND` endpoint
- Cancellation trigger point (TBD pending owner decision OQ-1):
  - Option A: `OrderEntry.jsx` `handleCancelOrder()` — conditional after cancel succeeds
  - Option B: New "Refund" button in order actions

- Estimated scope: MEDIUM (2-3 files, ~30-50 lines)

## Owner Decisions — DEFERRED TO GATE 2

| # | Question | Deferred To |
|---|----------|-------------|
| OQ-1 | Triggered automatically on cancellation of a Razorpay-paid order, or a manual "Refund" button shown after cancellation? | Gate 2 |
| OQ-2 | `manage.mygenie.online` endpoint — same axios instance (same base URL config) or needs separate axios instance? | Gate 2 |
| OQ-3 | `cancellation_reason` + `cancellation_note` — taken from the existing cancellation reason modal, or separate input? | Gate 2 |
| OQ-4 | How to detect "this was a Razorpay-paid order" at cancellation time? (check `razorpay_order_id` field on order?) | Gate 2 |

**Intake Status: COMPLETE — all decisions deferred to Gate 2**

## Duplicate Check

DISTINCT — no prior CR for Razorpay cancel-and-refund.

---

**Backend:** Endpoint confirmed and ready
**Frontend:** Code reality NONE
**Next:** Planning Gate 2 (after owner answers OQ-1 through OQ-4)
