# BUG-335 — PG Payment Method Triggers Immediate OrderEntry Close (Payment Not Collected Yet)

**Type:** Bug
**ID:** BUG-335
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)
**Source Investigation:** INV-PG-001

---

## Description

When a restaurant has a PG (Payment Gateway) type such as "razorpay" configured as a dynamic payment method, selecting it in CollectPaymentPanel and clicking "Collect Bill" immediately fires the standard payment collection flow — marking the order as paid and closing OrderEntry — even though the customer has not yet received or acted on the payment link.

There is no "Send Payment Link" intercept for PG payment methods. The PG method is treated identically to Cash/Card/UPI, which is incorrect because PG payments are asynchronous (link sent → customer pays → webhook confirms).

Additionally, `WhatsAppPaymentModal` is not available inside OrderEntry/CollectPaymentPanel at all — staff cannot send a PG link from the collect bill screen.

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Area | Order Entry → CollectPaymentPanel → PG Dynamic Payment Method |
| Priority | P1 |
| Severity | HIGH — order is marked paid before customer actually pays; financial data integrity risk |
| Risk | HIGH (payment flow; financial; order status mutation) |
| Fast Lane | NO — touches payment collection flow; full gate required |

## Evidence

- Source: OWNER-REPORTED (confirmed by INV-PG-001)
- Steps to reproduce:
  1. Open OrderEntry on an order
  2. Go to CollectPaymentPanel
  3. Select "razorpay" or any PG dynamic payment method
  4. Click "Collect Bill"
  5. Order is immediately marked paid; OrderEntry closes → Dashboard
  6. Customer has not been sent a link / has not paid
- Confidence: CONFIRMED (code trace)

## Code Reality

```bash
# CollectPaymentPanel.jsx — dynamic payment types (line 101-103):
  const dynamicPaymentTypes = getDynamicPaymentTypes(restaurantPaymentTypes || [])
  # PG type (e.g. "razorpay") appears as a button here

# handlePayment() — NO special PG handling:
  → builds paymentData { method: "razorpay", ... }
  → onPaymentComplete(paymentData)        ← goes to OrderEntry
    → navigateAfterOrderAction()
      → onClose()                         ← OrderEntry CLOSES ← BUG

# WhatsAppPaymentModal — only in OrderCard (Dashboard), NEVER in OrderEntry
  components/cards/OrderCard.jsx          ← present
  components/order-entry/CollectPaymentPanel.jsx ← ABSENT
  components/order-entry/OrderEntry.jsx   ← ABSENT
```

- **Code reality: FULL** — bug confirmed; PG has no intercept; WhatsApp modal not in OrderEntry

## Blast Radius

- `CollectPaymentPanel.jsx` — add PG method detection + intercept
- `OrderEntry.jsx` — add `WhatsAppPaymentModal` + state for PG flow
- Estimated scope: MEDIUM (2 files, ~30-50 lines)

## Expected Behavior

1. Staff selects PG/Razorpay payment method in CollectPaymentPanel
2. Clicking "Pay/Collect" opens `WhatsAppPaymentModal` (enter customer phone)
3. Staff sends the PG link → modal closes
4. **OrderEntry stays open** — order is NOT marked paid yet
5. A "Payment link sent — awaiting customer payment" indicator shows
6. OrderEntry only closes when backend confirms payment via socket/webhook

## Owner Decisions Needed

1. In CollectPaymentPanel: should "Collect" button become "Send Payment Link" for PG methods, or show both options?
2. After link is sent — should staff stay on the order screen or return to Dashboard?

## Duplicate Check

DISTINCT

---

**Next:** Planning Gate 2 — owner decisions (OQ-1, OQ-2) must be resolved before implementation plan
