# BUG-348 — Razorpay PG Paid Orders Show Wrong Actions (Unpaid/Change Method instead of Refund Only)

**Type:** BUG
**ID:** BUG-348
**Date:** 2026-08-24
**Status:** INTAKE
**Source:** OWNER-REPORTED (2026-08-24 session)
**Priority:** P1
**Risk:** HIGH — financial (marking Razorpay order as Unpaid while customer already paid = double-collection risk)

---

## Description

On the Daily Report → Order Report (`/reports/audit`) → **Paid tab**, orders paid via Razorpay PG currently show the same action buttons as cash orders: **[Change Method] [Unpaid] [Print]**.

Owner directive: Razorpay PG paid orders must show **only a [Refund] button**. No "Unpaid", no "Change Method".

**Why this is high risk:**
- "Mark Unpaid" on a Razorpay order puts it back on the dashboard for re-collection → cashier could collect again → double-charged customer
- "Change Method" on a gateway-processed payment is semantically wrong → customer paid via Razorpay, POS would reflect a different method

---

## Code Reality

```
OrderTable.jsx renderActionsCell — paid tab branch (line 337–400):

  {canMarkUnpaid && (
    <button>Unpaid</button>   ← NO razorpayOrderId guard — shows for ALL paid orders
  )}
  {canChangeMethod && (
    <PaymentMethodPicker />   ← NO razorpayOrderId guard — shows for ALL paid orders
  )}
```

`razorpayOrderId` IS available on the order object (mapped via `reportTransform.js:903+1070`).
No existing guard. **Code reality: NONE** — bug exists as shipped.

---

## Expected Behaviour

| Order type | Actions shown |
|---|---|
| Cash / UPI / Card (non-PG) | [Change Method] [Unpaid] [Print] — unchanged |
| Razorpay PG (`razorpayOrderId != null`) | **[Refund] [Print]** only — no Unpaid, no Change Method |

---

## Blast Radius

| File | Line | Change needed | Risk |
|---|---|---|---|
| `components/reports/OrderTable.jsx` | ~349 | Add `&& !order.razorpayOrderId` guard to `{canChangeMethod && ...}` | LOW |
| `components/reports/OrderTable.jsx` | ~357 | Add `&& !order.razorpayOrderId` guard to `{canMarkUnpaid && ...}` | LOW |
| `components/reports/OrderTable.jsx` | ~350+ | Add `{actionsConfig.onRefund && order.razorpayOrderId && <Refund button>}` | LOW |
| `pages/AllOrdersReportPage.jsx` | actionsConfig | Add `onRefund` key to paid tab actionsConfig | LOW |
| `pages/AllOrdersReportPage.jsx` | bottom JSX | Add `CancelOrderModal mode="refund"` + state + handler | LOW |

**Estimated scope:** SMALL (~2 files, ~20 lines)

---

## Evidence

- Source: OWNER-REPORTED with screenshot (2026-08-24)
- Screenshot: Daily Report → Paid tab — shows [Change Method][Unpaid][Print] on all paid rows
- No Refund button visible anywhere on this page

---

## Duplicate Check

DISTINCT — no prior bug about Razorpay PG row action suppression.
RELATED: CR-165 (Razorpay refund integration — Trigger B implementation)

---

## Open Questions

None — owner directive is clear: PG paid orders → Refund only (no Unpaid, no Change Method).

---

## Next

Planning Gate 2 → Gate 3 → Implementation (fast lane eligible? NO — touches financial action buttons)
