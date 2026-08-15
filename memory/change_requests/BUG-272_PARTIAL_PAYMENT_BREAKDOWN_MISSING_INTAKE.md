# BUG-272 — Partial Payment Breakdown Missing in Order Report

**ID:** BUG-272
**Type:** BUG
**Created:** 2026-07-28
**Severity:** P2 (MEDIUM)
**Risk:** LOW
**Module:** Reports — Order Ledger / Daily Report
**Duplicate Check:** DISTINCT
**Code Reality:** NONE — `partial_payments` array from API is never parsed in reportTransform.js
**Source:** OWNER-REPORTED (with screenshot showing partial_payments data in API but not in report)
**Confidence:** CONFIRMED (grep verified 0 references to `partial_payments` in reportTransform.js)

---

## Description

For orders with partial/split payment (e.g., cash: ₹30 + upi: ₹33), the order report shows `payment_method: "partial"` but does NOT show the breakdown of individual payment legs.

The backend API (`order-logs-report`) returns `partial_payments` array:
```json
"partial_payments": [
  {"payment_mode": "cash", "amount": "30.00"},
  {"payment_mode": "upi", "amount": "33.00"}
]
```

But `reportTransform.js` never parses this array. The OrderLedgerMockup has a `partialPayment` column (L169) but the data field is never populated.

## Evidence

- Screenshot: Owner-provided showing `partial_payments` in API response
- Code: `reportTransform.js:179` — only `paymentMethod: api.payment_method` (no leg parsing)
- Code: `OrderLedgerMockup.jsx:169` — column exists but data not populated

## Blast Radius

- 2 files: `reportTransform.js` (parse partial_payments) + report page (display)
- ~20-30 lines
- Hotspot: NO
- Scope: SMALL

## Owner Decision Needed

Which report(s) should show the breakdown? Order Ledger only? Daily Report? Both?
