# BUG-662 — Prepaid Manual Service Charge Missing from Place-Order Payload

**Type:** BUG
**Priority:** P0
**Risk:** CRITICAL (financial — money collected but not recorded; reports wrong)
**Sprint:** nov_cr_batch
**Date:** 2026-11-09
**Source:** INVESTIGATION — `investigations/INV_2026_11_09_PREPAID_SC_AND_CATEGORY_STATION.md` Issue 1
**Duplicate Check:** RELATED to BUG-028 (origin of regression, CLOSED). DISTINCT — BUG-028 fixed auto-SC being added when toggle OFF; this bug is manual SC being IGNORED when auto-SC is OFF on prepaid path.
**Code Reality:** FULL — buggy code exists at `OrderEntry.jsx` L1680-1690 and L2462-2465.

---

## Description

When a restaurant has `autoServiceCharge = "No"` (OFF), the cashier can still manually tick the Service Charge toggle during a prepaid order in `CollectPaymentPanel`. The UI correctly computes and displays the SC amount (e.g. ₹12.38 + CGST ₹0.31 + SGST ₹0.31) and includes it in the total paid by the customer (₹143.01).

**However**, the `place-order` API payload records:
- `service_tax: 0`
- `service_gst_tax_amount: 0`
- `order_amount: 130` (excludes SC)
- `payment_amount: 143.01` (includes SC)

This creates an internally inconsistent payload where the paid amount exceeds the order amount by the SC amount. Service charge is lost from all backend reports and settlement.

## Root Cause

`OrderEntry.jsx` derives `serviceChargePercentage` for prepaid paths from `restaurant.autoServiceCharge` (the restaurant-level flag) — it **ignores the cashier's per-bill toggle entirely**.

Two prepaid sites:
1. **L1679-1690 (QSR Place&Pay):** `scApplicable = localSCApplicable && !!restaurant?.autoServiceCharge`
2. **L2460-2465 (Prepaid Place+Pay):** same pattern

Then `orderTransform.js` `placeOrderWithPayment` receives `serviceChargePercentage = 0`, computes `service_tax: 0`, and **never reads `paymentData.serviceCharge`**.

**Contrast:** The postpaid collect-bill path (`collectBillExisting`, `orderTransform.js` L1696) reads `service_tax: serviceCharge` directly from `paymentData` — works correctly there.

**Origin:** BUG-028 Round 5 gated prepaid SC on the `autoServiceCharge` flag but didn't account for the manual toggle override that exists in `CollectPaymentPanel`.

## Evidence

- **Captured payload:** `evidence/INV-SC-STATION/prepaid_place_order_payload_autoSC_off_manual_on.txt`
- **Reproduction:** Playwright on preview; ruby owner; profile patched client-side `auto_service_charge="No"`; Walk-In → 1 item → Collect Bill → ticked service-charge-toggle-main → Cash → Pay → intercepted and aborted before order creation.
- **UI showed:** Service Charge @ 10% ₹12.38, CGST/SGST ₹0.31 each, Pay ₹143.01
- **Payload showed:** `service_tax:0`, `service_gst_tax_amount:0`, `order_amount:130`

## Blast Radius

- ~14 files reference `serviceChargePercentage` / `autoServiceCharge`
- **Files WILL change:** `OrderEntry.jsx` (2 sites), possibly `CollectPaymentPanel.jsx` (paymentData enrichment)
- **Hotspot files:** YES — `OrderEntry.jsx` (R5), `CollectPaymentPanel.jsx` (R5), `orderTransform.js` (R5)
- **Estimated scope:** SMALL (2-3 files, ~10-15 lines)

## Fix Direction (for Planning)

Prepaid paths must pass the cashier's toggle (e.g. `paymentData.serviceChargeEnabled` / actual SC% when `paymentData.serviceCharge > 0`) into `serviceChargePercentage` instead of reading only the restaurant-level `autoServiceCharge` flag.

## Open Questions

None — investigation fully traced and confirmed. Ready for Gate 2.

## Retroactive Candidate

BUG-028 Round 5 — regression source.
