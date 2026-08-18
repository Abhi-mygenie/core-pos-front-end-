# INVESTIGATION REPORT — PG Link: Modal + Order Entry Close Behavior & Reports Payment Link

**ID:** INV-PG-001
**Date:** 2026-08-17
**Role:** INVESTIGATION
**Status:** COMPLETE — root cause confirmed for both issues
**No code written this session.**

---

## Scope

1. When sending a PG (Payment Gateway) link, the modal closes and the order entry window also closes — it should NOT close since PG payment is still pending
2. From daily reports, staff should be able to send a payment link — this feature is completely absent from reports

---

## Issue 1 — PG Link Sent: OrderEntry Closes When It Shouldn't

### Data Flow Traced

**Where WhatsAppPaymentModal exists:**
```
components/cards/OrderCard.jsx          ← Dashboard order cards (ONLY location)
  onClose={() => setShowWhatsAppModal(false)  ← only closes the modal itself
```

**`WhatsAppPaymentModal` is NOT in:**
- `components/order-entry/CollectPaymentPanel.jsx` — absent
- `components/order-entry/OrderEntry.jsx` — absent

**Dynamic payment types in CollectPaymentPanel:**
```js
// CollectPaymentPanel.jsx lines 101-103:
const dynamicPaymentTypes = useMemo(() =>
  getDynamicPaymentTypes(restaurantPaymentTypes || []),
  [restaurantPaymentTypes]
);

// paymentMethods.js — getDynamicPaymentTypes():
// Returns API payment types that aren't primary (cash/upi/card/partial/room)
// → e.g. "razorpay", "dineout", "zomato_gold", any custom PG type
// These appear as buttons/dropdown in CollectPaymentPanel Row 2
```

**What happens when staff selects PG and clicks "Collect Bill":**
```
CollectPaymentPanel → handlePayment()
  → builds paymentData { method: "razorpay", finalTotal: X, ... }
  → onPaymentComplete(paymentData)          ← called on OrderEntry
    → navigateAfterOrderAction()
      → onClose()                           ← OrderEntry closes, Dashboard shown
```

The PG payment type is treated **identically to Cash/Card/UPI** — it goes through the full collect-bill API call and immediately closes OrderEntry. No special PG handling, no payment link step, no waiting for customer to actually pay.

### Root Cause

**Two separate gaps:**

**Gap A — Missing PG-specific flow in CollectPaymentPanel:**
When a restaurant has "razorpay" (or any PG) as a dynamic payment type, selecting it in CollectPaymentPanel and clicking "Collect" immediately fires the standard `handlePayment()` → posts to collect-bill API → `navigateAfterOrderAction()` → closes OrderEntry. **There is no "Send Payment Link" intercept** for PG methods.

**Gap B — WhatsAppPaymentModal not in OrderEntry context:**
`WhatsAppPaymentModal` exists only on Dashboard's `OrderCard`. If staff goes into OrderEntry → CollectPaymentPanel to send a PG link, the modal is not available there. The only path to send a PG link is from the Dashboard order card button — which requires closing OrderEntry first, going back to Dashboard, finding the order card, and clicking the WhatsApp button.

### Result

The user's experience:
1. Staff opens OrderEntry → CollectPaymentPanel
2. Selects PG/Razorpay dynamic payment method
3. Clicks "Collect Bill"
4. **Order is immediately marked paid** (customer hasn't paid yet)
5. **OrderEntry closes** → Dashboard
6. **The modal** (CollectPaymentPanel acting as the "payment modal") **closes** — but it shouldn't: PG payment is still pending

### Recommendation — Issue 1

**Option A (Recommended): PG payment method intercept in CollectPaymentPanel**

When `paymentMethod` matches a PG-type dynamic method (e.g., `isDynamic === true` and name contains "razorpay" or is flagged as `isPG`):
1. Instead of calling `handlePayment()` → collect-bill API, open `WhatsAppPaymentModal`
2. After link is sent → close the WhatsApp modal only → **OrderEntry stays open**
3. Show a "Payment Link Sent — waiting for confirmation" state on the CollectPaymentPanel
4. Only close OrderEntry when backend confirms payment (via socket `update-order-status` → paid)

**Option B: Never close OrderEntry on PG payment**

When `paymentMethod === 'razorpay'` (or any dynamic PG type), after posting the payment:
- Do NOT call `navigateAfterOrderAction()`
- Instead, show a "Pending confirmation" banner on the order
- Staff manually close when ready

**Risk:** HIGH — touches payment flow. Full gate process required.

---

## Issue 2 — Send Payment Link from Daily Reports

### Data Flow Traced

**`AllOrdersReportPage.jsx` — per-row actions (CR-003):**
```js
// OrderTable.jsx renderActionsCell() — supported actions:
  - Collect Bill button  (Hold tab)
  - Mark Unpaid button  (Paid tab)
  - Change Method       (Paid tab)
  - Print               (Paid tab)
  // → NO "Send Payment Link" button
```

**Report pages checked:**
```
pages/reports-module/OrderReportBetaPage.jsx  → NO payment link
pages/AllOrdersReportPage.jsx                 → NO payment link
components/reports/OrderTable.jsx             → NO payment link in renderActionsCell
```

**Available infrastructure (unused in reports):**
```
components/cards/WhatsAppPaymentModal.jsx     → exists, works, only in OrderCard
api/services/paymentLinkService.js            → sendPaymentLink() works
API_ENDPOINTS.PAYMENT_LINK                    → '/api/v1/razor-pay/payment-link' exists
```

### Root Cause

`WhatsAppPaymentModal` and `paymentLinkService.sendPaymentLink()` are implemented and working — but **only wired into `OrderCard` on the Dashboard**. The daily reports (`AllOrdersReportPage`, `OrderReportBetaPage`) have per-row action buttons but no "Send Payment Link" action.

**Code reality: NONE** — no payment link action exists in any report page.

### Recommendation — Issue 2

Add "Send Payment Link" as a row action in `AllOrdersReportPage.jsx` / `OrderTable.jsx`:

**Eligibility rule** (mirrors OrderCard's `showWhatsAppPayment`):
```js
// OrderCard.jsx line 137:
const showWhatsAppPayment = ![3, 6, 10].includes(fOrderStatus);
// Show for: new / preparing / ready / pending / running orders
// Hide for: cancelled (3), paid (6), fos=10
```

**Implementation:**
1. Add `WhatsAppPaymentModal` import to `AllOrdersReportPage.jsx` (or `OrderTable.jsx`)
2. Add a "Send Link" button to `renderActionsCell()` for eligible orders (unpaid/pending)
3. Wire `WhatsAppPaymentModal` state (showModal / selectedOrder) to this button
4. Reuse exact same `sendPaymentLink` service call — no new API needed

**Scope:** MEDIUM — 2-3 files, ~40-60 lines. No new API, no new service, no new component needed (reuse `WhatsAppPaymentModal`).

---

## Summary Table

| Issue | Root Cause | File(s) | Risk | Scope |
|-------|-----------|---------|------|-------|
| 1: PG link closes OrderEntry | No PG-specific intercept in CollectPaymentPanel; PG goes through standard collect-bill flow + navigateAfterOrderAction | `CollectPaymentPanel.jsx` + `OrderEntry.jsx` | HIGH | MEDIUM-LARGE |
| 2: No payment link in reports | `WhatsAppPaymentModal` never wired to reports pages; only in `OrderCard` | `AllOrdersReportPage.jsx` + `OrderTable.jsx` | LOW-MEDIUM | MEDIUM |

---

## Open Questions for Owner

| # | Question | Issue |
|---|----------|-------|
| OQ-1 | When PG method selected in CollectPaymentPanel — should "Collect" button be replaced by "Send Payment Link" button, or should both options exist? | 1 |
| OQ-2 | After PG link is sent from within OrderEntry — should staff stay on that order screen or return to Dashboard? | 1 |
| OQ-3 | In reports, should the "Send Payment Link" button appear for ALL unpaid orders, or only those with a customer phone number? | 2 |
| OQ-4 | In reports, should the button open the WhatsApp modal (enter phone), or auto-send if phone is already on the order? | 2 |

---

*Investigation complete. No code written.*
