# CR-164 — Send Payment Link from Daily Reports

**Type:** Change Request (New Feature)
**ID:** CR-164
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning) — **BLOCKED on CRM events endpoint contract**
**Source Investigation:** INV-PG-001

---

## ⚠️ FLOW CORRECTION (owner clarified 2026-08-21)

The Dashboard's current single-call flow (`POST /api/v1/razor-pay/payment-link` → POS backend creates link + sends WhatsApp) **will NOT be reused** for the Reports version.

The correct 2-step flow for Reports is:

**Step 1 — Get the payment link from POS backend**
```
POST /api/v1/razor-pay/payment-link
Body: { payment_amount, customer_name, customer_phone, restaurant_name, order_id }
Response: { payment_link: "https://rzp.io/..." }
```
Confirmed working (same endpoint as Dashboard). Returns the Razorpay URL.

**Step 2 — Fire WhatsApp message via CRM events endpoint**
Take the `payment_link` URL from Step 1 and pass it to a CRM endpoint that sends the WhatsApp message.
```
POST <REACT_APP_CRM_BASE_URL>/pos/events/???   ← CONTRACT NOT YET CONFIRMED
Auth: X-API-Key (crm_token — same as other CRM calls)
Body: { phone, payment_link, ... }   ← exact shape pending CRM contract
```

**This CRM events endpoint is NOT currently wired anywhere in the codebase.**

---

## What exists in codebase

| Piece | Status |
|---|---|
| `POST /api/v1/razor-pay/payment-link` (get link) | ✅ Exists in `paymentLinkService.js` |
| `crmAxios` instance with X-API-Key auth + 401 refresh | ✅ Exists in `api/crmAxios.js` |
| CRM events/WhatsApp send endpoint | ❌ Not in `constants.js`, no service function |

---

## Description

Staff need the ability to send a Razorpay/WhatsApp payment link directly from the **daily reports** (AllOrdersReportPage / OrderReportBetaPage) for unpaid orders. Currently this feature exists only on the Dashboard's OrderCard — it is completely absent from all report pages.

Typical use case: a manager reviewing the day's orders in reports notices an unpaid order and wants to immediately re-send the payment link to the customer — without having to navigate back to the Dashboard to find the order card.

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Reports → AllOrdersReportPage / OrderReportBetaPage → Per-Row Actions |
| Priority | P1 |
| Severity | HIGH — staff cannot act on unpaid orders from reports; must leave reports and hunt for the order card |
| Risk | MEDIUM (2-step flow; CRM event call is new integration) |
| Fast Lane | NO — new CRM service function + wiring into 2-3 report files |

## Evidence

- Source: OWNER-REPORTED (confirmed by INV-PG-001)
- Steps to reproduce: Open Reports → All Orders → find an unpaid order → no "Send Payment Link" button
- Confidence: CONFIRMED (code reality NONE in all report files)

## Code Reality

```
# Step 1 — Payment link generation: EXISTS
  api/services/paymentLinkService.js → sendPaymentLink()
  API_ENDPOINTS.PAYMENT_LINK = '/api/v1/razor-pay/payment-link'

# Step 2 — CRM WhatsApp fire: NONE
  No CRM events endpoint in constants.js
  No CRM notification/message service function
  crmAxios.js — instance ready, auth ready ✅
```

**Code reality: PARTIAL** — Step 1 exists; Step 2 is completely absent.

## Blast Radius (updated)

| File | Change |
|---|---|
| `api/constants.js` | +CRM events endpoint constant |
| `api/services/crmNotificationService.js` (NEW) | `sendPaymentLinkWhatsApp(phone, paymentLink, ...)` via crmAxios |
| `components/reports/OrderTable.jsx` | +"Send Link" button in per-row actions |
| `pages/AllOrdersReportPage.jsx` | +state + handler + modal |
| Possibly `pages/reports-module/OrderReportBetaPage.jsx` | +same pattern |

Estimated: **4-5 files, ~60-80 lines**

## Owner Decisions — OPEN (blocking Gate 2)

| # | Question | Status |
|---|---|---|
| OQ-1 | CRM events endpoint URL? (e.g. `POST /pos/events/send-payment-link`) | **OPEN — owner to confirm** |
| OQ-2 | CRM event request body shape? (phone, payment_link, template name, order_id?) | **OPEN — owner to confirm** |
| OQ-3 | Same `X-API-Key` (crm_token) auth or different? | **OPEN — assumed yes, confirm** |
| OQ-4 | Which report pages: AllOrdersReportPage only, OrderReportBetaPage only, or both? | Deferred to Gate 2 |
| OQ-5 | Show button for ALL unpaid statuses, or only orders with a Razorpay order ID? | Deferred to Gate 2 |

**Gate 2 is blocked until OQ-1 through OQ-3 are answered by owner.**

## Duplicate Check

DISTINCT — no prior CR for payment link in reports.

---

**Next:** Owner provides CRM events endpoint contract (OQ-1/2/3) → Planning Gate 2

## Evidence

- Source: OWNER-REPORTED (confirmed by INV-PG-001)
- Steps to reproduce: Open Reports → All Orders → find an unpaid order → no "Send Payment Link" button
- Confidence: CONFIRMED (code reality NONE in all report files)

## Code Reality

```bash
# Payment link infrastructure — FULLY EXISTS and works:
  components/cards/WhatsAppPaymentModal.jsx    ← complete modal component
  api/services/paymentLinkService.js           ← sendPaymentLink() works
  API_ENDPOINTS.PAYMENT_LINK                   ← '/api/v1/razor-pay/payment-link'

# Report pages — payment link action: NONE
  pages/AllOrdersReportPage.jsx                ← NO send-link button
  pages/reports-module/OrderReportBetaPage.jsx ← NO send-link button
  components/reports/OrderTable.jsx            ← renderActionsCell() has NO send-link

# Per-row actions currently in OrderTable.jsx:
  - Collect Bill (Hold tab)
  - Mark Unpaid (Paid tab)
  - Change Method (Paid tab)
  - Print (Paid tab)
  # ← "Send Payment Link" MISSING from all tabs

# Eligibility rule from OrderCard (for reference):
  const showWhatsAppPayment = ![3, 6, 10].includes(fOrderStatus);
  # Show for new/preparing/ready/pending/running; hide for cancelled/paid
```

- **Code reality: NONE** — no payment link action in any report page
- Infrastructure to reuse: `WhatsAppPaymentModal`, `sendPaymentLink`, `PAYMENT_LINK` endpoint

## Blast Radius

**Modified files:**
- `components/reports/OrderTable.jsx` — add "Send Link" button in `renderActionsCell()`
- `pages/AllOrdersReportPage.jsx` — add `WhatsAppPaymentModal` state + handler
- Possibly `pages/reports-module/OrderReportBetaPage.jsx` — same pattern

**No new files needed** — reuse existing `WhatsAppPaymentModal` component
- Estimated scope: MEDIUM (2-3 files, ~40-60 lines)

## Expected Behavior

- Per-row "Send Payment Link" button appears in reports for eligible orders (unpaid/pending)
- Click opens `WhatsAppPaymentModal` pre-populated with order amount + customer phone (if available)
- Staff confirms phone → sends → toast "Payment link sent" → modal closes → staff stays on reports
- Button hidden for cancelled and paid orders (matching Dashboard eligibility rule)

## Owner Decisions — DEFERRED TO GATE 2 (Planning)

Owner confirmed all decisions will be answered during Planning Gate 2 (Impact Analysis).

| # | Open Question | Deferred To |
|---|---------------|-------------|
| OQ-1 | Which report pages: AllOrdersReportPage only, OrderReportBetaPage only, or both? | Gate 2 |
| OQ-2 | Auto-send if customer phone exists, or always open modal to confirm? | Gate 2 |
| OQ-3 | Show button for ALL unpaid statuses, or only orders with a Razorpay order ID? | Gate 2 |

**Intake Status: COMPLETE**

## Duplicate Check

DISTINCT — no prior CR for payment link in reports.

---

**Next:** Planning Gate 2 — straightforward implementation once owner decisions confirmed
