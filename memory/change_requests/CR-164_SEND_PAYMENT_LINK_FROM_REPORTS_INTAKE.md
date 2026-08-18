# CR-164 — Send Payment Link from Daily Reports

**Type:** Change Request (New Feature)
**ID:** CR-164
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)
**Source Investigation:** INV-PG-001

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
| Risk | LOW-MEDIUM (additive feature; reuses existing service and component) |
| Fast Lane | NO — needs WhatsAppPaymentModal wired into 2-3 report files |

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

## Owner Decisions Needed

1. Which report pages should have this button: (a) AllOrdersReportPage only, (b) OrderReportBetaPage only, or (c) both?
2. Should the button auto-send if customer phone is already on the order, or always open the modal to confirm?
3. Should the button appear for ALL unpaid order statuses, or only specific ones (e.g., only when order has a Razorpay order ID)?

## Duplicate Check

DISTINCT — no prior CR for payment link in reports.

---

**Next:** Planning Gate 2 — straightforward implementation once owner decisions confirmed
