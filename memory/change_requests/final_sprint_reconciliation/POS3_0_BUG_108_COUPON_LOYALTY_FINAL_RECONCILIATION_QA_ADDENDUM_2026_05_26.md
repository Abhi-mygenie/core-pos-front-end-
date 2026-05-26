# POS3.0 — BUG-108 Coupon + Loyalty Final Reconciliation — QA Addendum

**Date:** 2026-05-26
**Sprint:** BUG-108 Coupon + Loyalty (final QA wave)
**Author:** QA + Documentation Agent (read-only)
**Status sticker:** `bug_108_coupon_loyalty_final_reconciliation_qa_addendum_2026_05_26`

> **Purpose.** Augment the BUG-108 final reconciliation with the
> results of the 2026-05-26 QA + Backend Mapper audit run. This is an
> **addendum** because the original
> `POS3_0_BUG_108_COUPON_LOYALTY_FINAL_RECONCILIATION_2026_05_26.md`
> referenced in the QA brief was not present in the workspace at the
> start of this run (see NG-01 in the open gaps register).

---

## 1. Sources Used for Reconciliation

| # | Doc | Used For |
|---|---|---|
| 1 | `/app/memory/crm/crm_1_0/handoff/CR_001C_C_COUPON_POS_API_HANDOFF_SUMMARY.md` | CRM API contract truth (V1 + V2 + V3-A + V3-B + V3-C). |
| 2 | `POS3_0_BUG_108_COUPON_V1B_STEP1_QA_HANDOFF_2026_05_25.md` | V1B test matrix definitions. |
| 3 | `POS3_0_BUG_108_COUPON_V1B_IMPLEMENTATION_STATUS_VERIFICATION_2026_05_25.md` | V1B implementation status. |
| 4 | `POS3_0_BUG_108_COUPON_V2_ITEM_CATEGORY_API_CAPABILITY_DISCOVERY_2026_05_25.md` | V2 API capability + posCartItem contract. |
| 5 | `POS3_0_BUG_108_COUPON_V3BC_DISCOVERY_AND_API_MAPPING_2026_05_25.md` | V3-B / V3-C discovery + mapping. |
| 6 | `POS3_0_BUG_108_COUPON_CRM_CONTRACT_FREEZE_V1_2026_05_25.md` | V1 contract freeze. |
| 7 | Current source code under `/app/frontend/src/` | Final implementation truth. |

`/app/memory/final/` was treated as read-only baseline. No file under it
was modified.

---

## 2. Reconciliation Outcome

| Stream | Previous status (per QA brief) | Current verified status |
|---|---|---|
| Coupon V1A | implemented + QA passed | **CONFIRMED — code verified 2026-05-26** |
| Coupon V1B | implemented; QA absent | **CONFIRMED — code verified 2026-05-26; live owner-smoke BLOCKED_BY_TEST_DATA** |
| Coupon V1 closure (`couponLive` removed) | done | **CONFIRMED — `BUG108_FLAGS.js` line 35** |
| Coupon V2 item/category | implemented in code; QA absent | **CONFIRMED — code verified; live BLOCKED_BY_TEST_DATA** |
| Coupon V3-A time-window | implemented in code; QA absent | **CONFIRMED — code verified; live BLOCKED_BY_TEST_DATA** |
| Coupon V3-B BOGO/BXG | implemented in code; QA absent | **CONFIRMED — code verified; live BLOCKED_BY_TEST_DATA** |
| Coupon V3-C Every-Nth | implemented in code; QA absent | **CONFIRMED — code verified; live BLOCKED_BY_TEST_DATA** |
| Loyalty Phase B / C | QA passed + owner-payload verified | **CONFIRMED unchanged; code spot-check PASS** |
| Wallet | deferred | **CONFIRMED — `walletDebitLive=false`** |
| QSR coupon UI | deferred; Full Billing route only | **CONFIRMED — `QsrBillingSection` has no coupon input** |
| Room / Hotel coupon | inline mirror | **CONFIRMED — `CollectPaymentPanel.jsx` L1888-L1990** |
| Coupon reversal | deferred to CRM Phase 2 | **CONFIRMED unchanged** |
| Backend mapper audit | unverified | **UNCHANGED — still NOT_RUN; 5 items (I-1 … I-5) blocked by backend repo access + test data** |

**Net change vs. previous reconciliation:** no regressions found, no
new in-code failures, no flag flips. Five items moved from "QA absent"
to "code-verified, live BLOCKED_BY_TEST_DATA". The backend mapper
audit is still pending.

---

## 3. Reconciliation Doc Linkages

| Output of this run | Path |
|---|---|
| QA report (this run) | `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_COUPON_V2_V3_QA_REPORT_2026_05_26.md` |
| Backend mapper audit (this run) | `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_BACKEND_MAPPER_AUDIT_REPORT_2026_05_26.md` |
| Open gaps register (this run — new inaugural copy) | `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_COUPON_LOYALTY_OPEN_GAPS_REGISTER_2026_05_26.md` |
| Reconciliation addendum (this doc) | `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_COUPON_LOYALTY_FINAL_RECONCILIATION_QA_ADDENDUM_2026_05_26.md` |

---

## 4. Decisions Re-Affirmed

- **POS Frontend implementation for Coupon V1A / V1B / V2 / V3-A / V3-B / V3-C is final.**
  No code changes recommended unless live QA produces a defect.
- **`couponLive` flag is permanently removed.** Coupon UI is gated only
  by `restaurantSettings.isCoupon`. Confirmed in `BUG108_FLAGS.js` line 35.
- **`loyaltyRedeemLive` remains `false`.** Direct POS-Frontend
  `/pos/loyalty/redeem` call is dead code. POS Backend owns the actual
  CRM redeem call (Phase C contract). `loyaltyService.buildRedeemIdempotencyKey`
  is retained as dead code for safety.
- **`walletDebitLive` remains `false`.** Wallet is out of BUG-108 scope.
- **QSR fresh Place+Pay never exposes coupon UI.** Confirmed in
  `CartPanel.jsx#QsrBillingSection`. Cashiers wanting coupons on QSR
  must use Full Billing.
- **Room-service coupon parity is provided by the inline mirror** in
  `CollectPaymentPanel.jsx` (not by a separate component).
- **POS Frontend has no remaining work on backend mapper items I-1 … I-5.**
  Frontend payload contract verified against CR-001C-C handoff.

---

## 5. Open Items Carried Forward

See gaps register §F for exact counts. Top 5 to action next:

1. Owner provisions preprod test data (API key + V1/V2/V3 coupons +
   stackable / non-stackable variants + customer with assigned
   coupons). Closes A-12 … A-16.
2. POS Backend team provides mapper source / request-log capture.
   Closes D-01, D-04, D-05, B-06.
3. Print-agent team captures one preprod bill PDF with a coupon
   applied. Closes D-03.
4. Live commit of V3-B + V3-C orders confirms `coupon_type` mapping.
   Closes D-02.
5. (Optional) UX surfaces `applied_applications` count in the
   `selectedCoupon` chip. Closes NG-02.

---

## 6. Final Verdict

`bug_108_coupon_loyalty_sprint_final_reconciliation_qa_addendum_code_verified_live_blocked_by_test_data_2026_05_26`

- POS Frontend code is sprint-complete for Coupon V1A → V3-C and Loyalty
  Phase B/C.
- Build passes.
- No regressions detected.
- Live owner-smoke for V1B + V2 + V3-A/B/C, and backend mapper audit,
  remain blocked on test-data / backend-source-access prerequisites
  (see QA report §17 and gaps register §F).

**No code was changed.** **No file under `/app/memory/final/` was changed.**
