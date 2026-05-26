# POS3.0 — BUG-108 Coupon + Loyalty Open Gaps Register

**Date:** 2026-05-26
**Sprint:** BUG-108 Coupon + Loyalty
**Author:** QA + Documentation Agent (read-only)
**Status sticker:** `bug_108_coupon_loyalty_open_gaps_register_post_v2_v3_code_qa_2026_05_26`

> ⚠️ **Caveat.** No prior `POS3_0_BUG_108_COUPON_LOYALTY_OPEN_GAPS_REGISTER_2026_05_26.md`
> was found in `/app/memory/change_requests/final_sprint_reconciliation/`
> at the start of this run, so this is the **inaugural** version of the
> register. Previous in-flight gap status was reconstructed from the
> latest 2026-05-25 / 2026-05-24 V1B / V2 / V3-A / V3-B / V3-C
> implementation reports and from current code as the final
> implementation truth.

---

## Legend

- **CLOSED — `closed_with_evidence_<date>`** — verified PASS in live QA or
  code with concrete evidence row in this register.
- **OPEN — `open_qa_not_run_<date>`** — implemented but not QA'd live.
- **BLOCKED_BY_TEST_DATA** — implemented, ready for QA, but no preprod
  test data / API key / coupon fixture exists yet.
- **FAILED_QA** — implemented but live QA produced a defect.
- **DEFERRED** — out of BUG-108 scope by owner decision; tracked here
  for visibility only.

---

## A. Coupon Stream Gaps

| ID | Gap | Status (2026-05-26) | Evidence / Owner |
|---|---|---|---|
| **A-01** | Coupon V1A foundation (service module + transforms + constants) | **CLOSED — `closed_with_evidence_2026_05_25`** | `couponService.js`, `couponTransform.js`, `constants.js#COUPONS_AVAILABLE`/`COUPONS_VALIDATE`. Implementation report: `POS3_0_BUG_108_COUPON_V1A_FOUNDATION_IMPLEMENTATION_REPORT_2026_05_25.md`. |
| **A-02** | Coupon V1B UI wiring (dropdown, type-ahead, auto-apply, error map, applied chip, remove button, stacking guard) | **CLOSED — `closed_with_evidence_2026_05_25_code_only` / BLOCKED_BY_TEST_DATA for owner-smoke** | Code verified in `CollectPaymentPanel.jsx` L270-L805 + L1289-L1395. Live owner-smoke is still BLOCKED_BY_TEST_DATA — see QA report §9. |
| **A-03** | `couponLive` feature flag removal at V1 closure | **CLOSED — `closed_with_evidence_2026_05_25`** | `BUG108_FLAGS.js` line 35 — comment "REMOVED at V1 closure"; flag absent from runtime object. |
| **A-04** | Coupon V2 item/category implementation (eligibleMatchHint filter, posCartItem mapper, items[] payload on validate, error code copies) | **CLOSED — `closed_with_evidence_2026_05_25_code_only` / BLOCKED_BY_TEST_DATA for live QA** | `couponTransform.js` L173-L181 (`posCartItem`); `CollectPaymentPanel.jsx` L745-L750 + L843-L857. |
| **A-05** | Coupon V3-A time-window (withinWindowNow, nextWindowStart, greyed dropdown rows, OUTSIDE_TIME_WINDOW error copy, auto-apply skip when outside window) | **CLOSED — `closed_with_evidence_2026_05_25_code_only` / BLOCKED_BY_TEST_DATA for live QA** | `couponTransform.js` L70-L74; `CollectPaymentPanel.jsx` L781, L879, L1348-L1365. |
| **A-06** | Coupon V3-B BOGO / BXG (buy/get hints, error code copies, benefit_items render, applied_applications surfaced on selectedCoupon) | **CLOSED — `closed_with_evidence_2026_05_25_code_only` / BLOCKED_BY_TEST_DATA for live QA** | `couponTransform.js` L59-L66 + L104-L108; `CollectPaymentPanel.jsx` L751-L755 + L1390-L1395. |
| **A-07** | Coupon V3-C Every-Nth (nth_item_number, nth_discount_type, hint filter, error code copies, benefit_items render) | **CLOSED — `closed_with_evidence_2026_05_25_code_only` / BLOCKED_BY_TEST_DATA for live QA** | `couponTransform.js` L66-L68 + L109-L111; `CollectPaymentPanel.jsx` L757-L762 + L1390-L1395. |
| **A-08** | Room / Hotel coupon via inline mirror in room-service block | **CLOSED — `closed_with_evidence_2026_05_25_code_only` / BLOCKED_BY_TEST_DATA for live QA** | `CollectPaymentPanel.jsx` L1888-L1990 — full mirror of main panel coupon block. |
| **A-09** | QSR fresh Place+Pay does NOT expose coupon UI | **CLOSED — `closed_with_evidence_2026_05_26`** | `CartPanel.jsx#QsrBillingSection` L391-L393 hardcodes `couponDiscount: 0`, `couponTitle: ''`, `couponType: ''`. No coupon input rendered. |
| **A-10** | Full Billing route still supports coupon | **CLOSED — `closed_with_evidence_2026_05_26`** | `CartPanel.jsx` L583 `onFullBilling` button still routes to `CollectPaymentPanel` which has full coupon UI. |
| **A-11** | No deprecated `/api/pos/coupons/apply` usage | **CLOSED — `closed_with_evidence_2026_05_26`** | `grep -rn '/coupons/apply' /app/frontend/src` → 0 matches. |
| **A-12** | V1B live owner-smoke (validate-only matrix) | **CLOSED — `closed_with_evidence_2026_05_26_live`** | LIVE UPDATE QA report §4.1. 5 scenarios PASS (INVALID_CODE, MIN_ORDER_NOT_MET, STACKING_NOT_ALLOWED, valid apply, channel switch). Owner-smoke for **cancel-warning toast** + **printed-bill rendering** still requires a real committed order — covered by D-03 / D-01. |
| **A-13** | V2 live matrix (item + category) | **CLOSED — `closed_with_evidence_2026_05_26_live`** | LIVE UPDATE QA §4.2. 6 scenarios PASS on `KUNAFA20` (item) + `SEED_V2_CATFLAT` (category) + `SEED_V2_ITEMFLAT`. Includes MISSING_ITEMS_FOR_ITEM_COUPON, MISSING_ITEMS_FOR_CATEGORY_COUPON, MIN_ITEM_QTY_NOT_MET, positive eligible matches. |
| **A-14** | V3-A live matrix (inside / outside window) | **CLOSED — `closed_with_evidence_2026_05_26_live`** | LIVE UPDATE QA §4.3. 5 scenarios PASS — inside-window `SEED_V3A_LUNCH` validates; 4 outside-window coupons return `OUTSIDE_TIME_WINDOW` with correct `next_window_start`. Both `Asia/Kolkata` and `Asia/Dubai` tz handled. |
| **A-15** | V3-B live matrix (BOGO + BXG) | **CLOSED — `closed_with_evidence_2026_05_26_live`** | LIVE UPDATE QA §4.4. 7 scenarios PASS on `SEED_V3B_BOGO` + `SEED_V3B_BXGY_FLAT` + `SEED_V3B_CAPPED`. Includes BUY_REQUIREMENT_NOT_MET, NO_ELIGIBLE_BUY_ITEMS_IN_CART, NO_ELIGIBLE_GET_ITEMS_IN_CART. One CRM-side observation flagged (NG-08). |
| **A-16** | V3-C live matrix (Every-Nth) | **CLOSED — `closed_with_evidence_2026_05_26_live`** | LIVE UPDATE QA §4.5. 5 scenarios PASS on `SEED_V3C_EVERY2_CAPPED` + `SEED_V3C_EVERY3_FREE` + `SEED_V3C_EVERY5_PCT`. Includes item-level + category-level eligibility, free/flat/percentage benefits, NTH_REQUIREMENT_NOT_MET, MISSING_ITEMS_FOR_EVERY_NTH_COUPON. |
| **A-17** | Coupon reversal / refund on order cancel | **DEFERRED to CRM Phase 2** | Per QA brief and prior reconciliation. No frontend code path; documented as future work. |

---

## B. Loyalty Stream Gaps

| ID | Gap | Status (2026-05-26) | Evidence / Owner |
|---|---|---|---|
| **B-01** | Phase B owner-payload verification | **CLOSED — `closed_with_evidence_2026_05_23`** | `POS3_0_BUG_108_LOYALTY_PHASE_B_OWNER_SMOKE_PASS_REPORT_2026_05_23.md`. |
| **B-02** | Phase C max-redeemable wired to CollectPaymentPanel | **CLOSED — `closed_with_evidence_2026_05_24`** | `POS3_0_BUG_108_LOYALTY_PHASE_C_POS_MAX_REDEEMABLE_IMPLEMENTATION_REPORT_2026_05_24.md`. |
| **B-03** | Phase C all-paths payload (Flow 3 + Flow 4 emit `used_loyalty_point` + `loyalty_points_used` + `loyalty_discount`) | **CLOSED — `closed_with_evidence_2026_05_24`** | `orderTransform.js` L1178-L1186 (Flow 3) + L1395-L1403 (Flow 4). |
| **B-04** | Direct POS-Frontend `/pos/loyalty/redeem` call removed | **CLOSED — `closed_with_evidence_2026_05_24`** | `BUG108_FLAGS.loyaltyRedeemLive=false`; `loyaltyService.redeemLoyalty` throws `LOYALTY_REDEEM_DISABLED`; no production call site. |
| **B-05** | Loyalty + coupon stacking guard | **CLOSED — `closed_with_evidence_2026_05_26_code_only`** | `CollectPaymentPanel.jsx` L741 reactive filter + L786-L802 auto-remove + `STACKING_NOT_ALLOWED` copy at L814/820. |
| **B-06** | `loyalty_idempotency_key` generation in POS Backend | **OPEN — `open_blocked_by_backend_source_access_2026_05_26`** | Mapper audit I-5. POS Backend repo not in workspace. |

---

## C. Wallet Stream Gaps

| ID | Gap | Status | Evidence / Owner |
|---|---|---|---|
| **C-01** | Wallet implementation | **DEFERRED (out of BUG-108 scope)** | `BUG108_FLAGS.walletDebitLive=false`; `walletDisabledHelper` copy. Owner decision per `FINAL_OWNER_APPROVALS`. Separate CR planned. |

---

## D. Backend Mapper Stream Gaps

| ID | Gap | Status (2026-05-26) | Evidence / Owner |
|---|---|---|---|
| **D-01** (I-1) | `coupon_code`/`coupon_discount`/`coupon_title`/`coupon_type` pass-through unstripped | **OPEN — `open_blocked_by_backend_source_access_2026_05_26`** | Frontend side verified (`orderTransform.js` L1168-L1171 + L1381-L1384). POS Backend mapper not in workspace. See mapper audit doc §2. |
| **D-02** (I-2) | V3 BOGO/BXG/Every-Nth `coupon_type` omission/mapping accepted | **OPEN — `open_blocked_by_test_data_2026_05_26`** | Live commit of V3-B + V3-C orders needed; risk LOW. |
| **D-03** (I-3) | Bill print template renders coupon discount line | **OPEN — `open_blocked_by_test_data_and_backend_template_access_2026_05_26`** | Frontend print payload sends `couponCode` + `couponDiscount`; backend template rendering not verifiable from here. Risk MEDIUM. |
| **D-04** (I-4) | `items[]` / `OrderItem` schema forwarded for V2 / V3 final-commit CRM revalidation | **OPEN — `open_blocked_by_backend_source_access_2026_05_26`** | Frontend `cart[]` confirmed in payload. Laravel mapper not inspectable. |
| **D-05** (I-5) | `loyalty_idempotency_key='order_{id}_loyalty'` generated by POS Backend | **OPEN — `open_blocked_by_backend_source_access_2026_05_26`** | Frontend deliberately omits per Phase C contract. POS Backend confirmation required. Risk MEDIUM (double-deduct on retry). |

---

## E. Newly Discovered Gaps (this run)

| ID | Gap | Status | Note |
|---|---|---|---|
| **NG-01** | Two reconciliation docs referenced in QA brief do not exist | **OPEN — `open_missing_prior_docs_2026_05_26`** | `POS3_0_BUG_108_COUPON_LOYALTY_FINAL_RECONCILIATION_2026_05_26.md` and earlier `POS3_0_BUG_108_COUPON_LOYALTY_OPEN_GAPS_REGISTER_2026_05_26.md` are missing. This run authored the open-gaps register as the new inaugural copy and the reconciliation addendum to compensate. **Action:** restore or accept these new docs as the source-of-truth. |
| **NG-02** | `applied_applications` from CRM validate response is captured into `selectedCoupon.appliedApplications` (couponTransform L105) but is **not surfaced in the UI**. | **OPEN — `open_low_priority_ux_2026_05_26`** | Cashier-visible "Applied N times" line below the `benefit_items` block would improve V3-B/V3-C transparency. Low priority — does not affect billing math. **Owner:** POS Frontend / UX. |
| **NG-03** | ESLint warning on `OrderEntry.jsx` line 1301 (`useCallback` unnecessary `printOrder` dep) | **OPEN — `open_low_priority_lint_2026_05_26`** | Pre-existing; unrelated to coupon/loyalty. No runtime impact. Suggest a separate hygiene CR. |
| **NG-04** | `loyaltyService.redeemLoyalty` is now dead code (kill-switched). It still appears in the bundle. | **OPEN — `open_low_priority_dead_code_2026_05_26`** | Kept intentionally per Phase C "dead-code safety" comment. Decide at next sprint whether to remove. Low priority. |
| **NG-05** | Coupon `applied_applications` not surfaced in print payload (`PRINT_ORDER`) | **OPEN — `open_low_priority_print_2026_05_26`** | Receipt currently shows total coupon discount only. Adding "Applied 2 times" would mirror BOGO/Nth offers on the bill. **Owner:** POS Frontend + Print-agent team. |
| **NG-06** | No automated frontend test exists for coupon V1B / V2 / V3 wiring | **OPEN — `open_low_priority_test_coverage_2026_05_26`** | Jest unit tests cover transform shape, but not the CollectPaymentPanel flow. Recommend a Playwright smoke once preprod test data is available. |
| **NG-07** | Frontend error-map does not have an entry for `MIN_ITEM_QTY_NOT_MET` | **OPEN — `open_low_priority_ux_copy_2026_05_26`** | LIVE QA §4.2 V2-07 surfaced this code from CRM when an item-scope coupon has a per-item minimum qty and the cart has zero eligible units. `CollectPaymentPanel.jsx` `errorCodeToCopy` map (L805-L833) falls back to the generic "Coupon could not be applied" copy. Recommend adding "Minimum eligible item quantity not met" copy. **Owner:** POS Frontend / UX. |
| **NG-08** | CRM-side observation — `SEED_V3B_CAPPED` with `max_applications=2` returns `applied_applications=1` for qty=10 | **OPEN — `open_crm_team_investigation_2026_05_26`** | LIVE QA §4.4 OBS-01. Likely tied to `allow_repeat=null` interpretation. Frontend behaviour is correct (displays whatever CRM returns). **Owner:** CRM team. |

---

## F. Summary Counters (LIVE UPDATE 2026-05-26 14:36 IST)

| Bucket | Count |
|---|---|
| Closed gaps | **19** (A-01 … A-16 except none; B-01 … B-05) — all V1B/V2/V3 live matrices now closed |
| Open — BLOCKED_BY_TEST_DATA | **0** (all resolved) |
| Open — BLOCKED_BY_BACKEND_SOURCE_ACCESS | 4 (B-06, D-01, D-04, D-05) |
| Open — BLOCKED_BY_TEST_DATA + BACKEND | 1 (D-03) |
| Open — needs live commit + owner approval | 1 (D-02) |
| Newly discovered gaps | 8 (NG-01 … NG-08) |
| Deferred | 2 (A-17, C-01) |
| Failed QA | 0 |
| CRM-side observations (non-blocking) | 1 (NG-08) |

Total open (excluding deferred): **14** — down from 17 at start of run.

---

## G. Recommended Next Action (LIVE UPDATE 2026-05-26)

The 5 BLOCKED_BY_TEST_DATA gaps (A-12 … A-16) have been **CLOSED via
live preprod validate-only QA** using credentials `owner@kunafamahal.com`.
24 live coupons on restaurant 689 cover all V1/V2/V3-A/V3-B/V3-C
flavours. See `POS3_0_BUG_108_COUPON_V2_V3_QA_REPORT_LIVE_UPDATE_2026_05_26.md`.

Remaining steps to close the last 5 mapper-stream gaps (D-01 … D-05)
and B-06:

1. **Owner approval** to place ONE minimum-value (~₹500) coupon-bearing
   order on preprod restaurant 689 with `FLAT100TEST` and cash payment.
   Closes D-01, D-02, D-04 by inspecting CRM `coupon_usage` row +
   `discount_mismatch` flag.
2. **POS Backend team** shares the Laravel mapper request/response
   capture for that order. Closes B-06 + I-5 idempotency-key check.
3. **Print-agent team** captures the bill PDF / raw printer output.
   Closes D-03 (I-3).
4. **CRM team** investigates NG-08 (`SEED_V3B_CAPPED max_applications`
   behaviour with `allow_repeat=null`).
5. **POS Frontend team (optional, low priority)** — add NG-07
   `MIN_ITEM_QTY_NOT_MET` error-map entry and NG-02
   `applied_applications` UI surface.
