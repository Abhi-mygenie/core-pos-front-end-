# POS3.0 — BUG-108 Coupon V2/V3 + Backend Mapper QA Report

**Date:** 2026-05-26
**Sprint:** BUG-108 Coupon + Loyalty (final QA wave)
**Author:** QA + Documentation Agent (read-only)
**Status sticker:** `bug_108_coupon_v2_v3_qa_code_verified_live_blocked_by_test_data_2026_05_26`

> ⚠️ **Important context — discovered during this run.**
> The two reconciliation docs referenced in the QA brief
> (`POS3_0_BUG_108_COUPON_LOYALTY_FINAL_RECONCILIATION_2026_05_26.md`
> and `POS3_0_BUG_108_COUPON_LOYALTY_OPEN_GAPS_REGISTER_2026_05_26.md`)
> **do not exist** in
> `/app/memory/change_requests/final_sprint_reconciliation/`. No dated
> `2026_05_26` reconciliation files are present. This QA report therefore
> derives prior state from the latest 2026-05-25 / 2026-05-24 docs and
> from current source code as final implementation truth. The two
> missing reconciliation docs are listed as new open gaps (NG-01).

---

## 1. Final QA Status

| Stream | Status |
|---|---|
| Build | **PASS** |
| Code inspection (V1A/V1B/V2/V3-A/V3-B/V3-C wiring) | **PASS** |
| V1B owner-smoke matrix (live) | **BLOCKED_BY_TEST_DATA** |
| V2 item/category live matrix | **BLOCKED_BY_TEST_DATA** |
| V3-A time-window live matrix | **BLOCKED_BY_TEST_DATA** |
| V3-B BOGO/BXG live matrix | **BLOCKED_BY_TEST_DATA** |
| V3-C Every-Nth live matrix | **BLOCKED_BY_TEST_DATA** |
| Loyalty regression spot-check (code) | **PASS** |
| QSR / Room / Manual-discount / Wallet regression (code) | **PASS** |
| Backend mapper audit (I-1 … I-5) | **BLOCKED_BY_TEST_DATA / NOT_RUN** (separate report) |

**Overall:** Code-side implementation is complete and consistent with
the CR-001C-C handoff contract; live behaviour cannot be validated until
the data prerequisites in §17 are met.

---

## 2. Environment Tested

| Item | Value |
|---|---|
| POS Frontend repo | `/app/frontend` (cloned from `core-pos-front-end-`, branch `27-may`) |
| POS Frontend preview URL | `https://eec48600-5785-4cd7-87de-1e6cda0df846.preview.emergentagent.com` |
| CRM base URL (preprod) | `https://crm.mygenie.online/api` |
| POS Backend base URL (preprod) | `https://preprod.mygenie.online/` |
| Socket URL | `https://presocket.mygenie.online` |
| Node | v20.20.2 |
| Yarn | 1.22.22 |
| react-scripts | 5.0.1 (CRACO) |

CRM live check (unauthenticated):
```
GET https://crm.mygenie.online/api/pos/coupons/available  → HTTP 401
```
Confirms the endpoint exists and is protected by `X-API-Key`. No
authenticated probe was run because no preprod API key is provided.

---

## 3. Branch / Commit Inspected

- Branch: `27-may`
- Snapshot date in working tree: 2026-05-26
- Coupon-relevant files audited:
  - `src/api/services/couponService.js`
  - `src/api/transforms/couponTransform.js`
  - `src/api/services/loyaltyService.js`
  - `src/api/transforms/orderTransform.js`
  - `src/api/constants.js`
  - `src/components/order-entry/CollectPaymentPanel.jsx`
  - `src/components/order-entry/CartPanel.jsx`
  - `src/components/order-entry/OrderEntry.jsx`
  - `src/utils/BUG108_FLAGS.js`

---

## 4. Build Result

```
cd /app/frontend && CI=false yarn build
…
Compiled with warnings.
[eslint]
src/components/order-entry/OrderEntry.jsx
  Line 1301:6:  React Hook useCallback has an unnecessary dependency: 'printOrder' …
…
File sizes after gzip:
  483.61 kB  build/static/js/main.23e8b977.js
   16.76 kB  build/static/css/main.79800b7f.css
Done in 25.32s.
```

**Verdict:** **PASS.** Single pre-existing ESLint warning is in `OrderEntry.jsx`
on the `printOrder` dep and is unrelated to coupon/loyalty work.

---

## 5. Test Data Used

**None.** No restaurant API key, no test customer, no coupon fixtures were
supplied for this run. All live test rows below are therefore
`BLOCKED_BY_TEST_DATA`.

Required test-data inventory listed in §17.

---

## 6. Coupon Codes Tested (Live)

**None.** No live `/validate` or `/orders` calls were issued.

---

## 7. Order IDs Created (Live)

**None.** No preprod orders were created during this QA run.

---

## 8. CRM Usage Records Verified

**None.** Cannot confirm `coupon_usage.recorded=true`, `idempotent_replay`,
`discount_mismatch`, or `applied_applications` against CRM without a
preprod API key.

---

## 9. V1B Test Matrix Result

> Code is implemented (CollectPaymentPanel L270-L805 + L1289-L1395 main
> panel and L1888-L1990 room-service inline mirror). Owner-smoke can
> only confirm code paths fire correctly — live execution requires a
> seeded V1 coupon + a CRM customer. All scenarios below are
> `BLOCKED_BY_TEST_DATA` for live execution. Code-side completeness is
> **PASS** for every row.

| # | Scenario | Live Result | Code Result | Code Location |
|---|---|---|---|---|
| V1B-01 | Coupon dropdown appears on focus | BLOCKED_BY_TEST_DATA | PASS | CollectPaymentPanel L1295, L1320 |
| V1B-02 | Empty state ("No coupons available…") | BLOCKED_BY_TEST_DATA | PASS | L1372, `coupon-empty-hint` testid |
| V1B-03 | Prefix filtering on typed code | BLOCKED_BY_TEST_DATA | PASS | L876-L890 debounce + filter |
| V1B-04 | Debounced auto-apply | BLOCKED_BY_TEST_DATA | PASS | L872-L890 (couponDebounceRef, 350ms) |
| V1B-05 | Highest `expectedDiscount` auto-selected | BLOCKED_BY_TEST_DATA | PASS | L879-L886 sort desc on `expectedDiscount`; auto-pick best |
| V1B-06 | Unknown code → `INVALID_CODE` error | BLOCKED_BY_TEST_DATA | PASS | L806 mapping in `errorCodeToCopy` |
| V1B-07 | Remove coupon (X chip) | BLOCKED_BY_TEST_DATA | PASS | L1387-L1389 `remove-coupon-btn` testid |
| V1B-08 | Loyalty + coupon stacking conflict | BLOCKED_BY_TEST_DATA | PASS | L741 (`stackableWithLoyalty===false`) + auto-remove L786-L802 |
| V1B-09 | Applied chip with `−₹X` | BLOCKED_BY_TEST_DATA | PASS | L1384-L1389 `applied-coupon-chip` testid |
| V1B-10 | Manual discount ↔ coupon mutex | BLOCKED_BY_TEST_DATA | PASS | L1232/L1264 `disabled={selectedCoupon!==null}` + L1278 helper |
| V1B-11 | Coupon instruction text (CRM `pos_instruction`) | BLOCKED_BY_TEST_DATA | PASS | L1383 `coupon-pos-instruction-text` testid |
| V1B-12 | Coupon error display | BLOCKED_BY_TEST_DATA | PASS | L1382 `coupon-error-text` testid |
| V1B-13 | Cancel-warning toast (when coupon committed) | NOT_RUN | NOT_APPLICABLE | Coupon reversal deferred to CRM Phase 2 |
| V1B-14 | Print/bill coupon line | BLOCKED_BY_TEST_DATA | PASS (frontend send) | L1086-L1090 print payload `couponCode`/`couponDiscount`; print-template render is **backend (mapper I-3)** |

---

## 10. V2 Item / Category Test Matrix Result

| # | Scenario | Live Result | Code Result | Code Location |
|---|---|---|---|---|
| V2-01 | `requiresCartValidation=true` flagged from `/available` | BLOCKED_BY_TEST_DATA | PASS | couponTransform L55 |
| V2-02 | `eligibleMatchHint{type:food_ids}` filtering | BLOCKED_BY_TEST_DATA | PASS | CollectPaymentPanel L745-L747 |
| V2-03 | `eligibleMatchHint{type:category_names}` filtering | BLOCKED_BY_TEST_DATA | PASS | L748-L750 |
| V2-04 | items[] sent on `/validate` for item-scope coupon | BLOCKED_BY_TEST_DATA | PASS | L843-L857 (`needsItems`, `posCartItem` map) |
| V2-05 | items[] sent on `/validate` for category-scope coupon | BLOCKED_BY_TEST_DATA | PASS | Same as V2-04; `category_name` populated via `getCategoryById` |
| V2-06 | `MISSING_ITEMS_FOR_ITEM_COUPON` error copy | BLOCKED_BY_TEST_DATA | PASS | L817 `errorCodeToCopy` |
| V2-07 | `NO_ELIGIBLE_ITEMS_IN_CART` error copy | BLOCKED_BY_TEST_DATA | PASS | L818 |
| V2-08 | `MISSING_ITEMS_FOR_CATEGORY_COUPON` | BLOCKED_BY_TEST_DATA | PASS | L820 |
| V2-09 | `NO_ELIGIBLE_CATEGORY_IN_CART` | BLOCKED_BY_TEST_DATA | PASS | L821 |
| V2-10 | POSCartItem field shape (`food_id`, `quantity`, `unit_price`, `category_name`) | BLOCKED_BY_TEST_DATA | PASS | couponTransform L173-L181 |
| V2-11 | Final-order commit forwards `items[]` for CRM revalidation | BLOCKED_BY_TEST_DATA | PASS for Flow 3/Flow 4 frontend send (`cart`); backend forwarding = mapper I-4 |
| V2-12 | Coupon usage recorded (`coupon_usage.recorded=true`) | BLOCKED_BY_TEST_DATA | NOT_APPLICABLE (backend/CRM concern) |

---

## 11. V3-A Time-Window Test Matrix Result

| # | Scenario | Live Result | Code Result | Code Location |
|---|---|---|---|---|
| V3A-01 | Inside-window coupon validates and applies | BLOCKED_BY_TEST_DATA | PASS | couponService.validateCoupon |
| V3A-02 | Outside-window coupon greyed in dropdown | BLOCKED_BY_TEST_DATA | PASS | L1348-L1365 (`inWindow` opacity 0.5) |
| V3A-03 | `next_window_start` displayed | BLOCKED_BY_TEST_DATA | PASS | L1363 `coupon-outside-window-hint` testid |
| V3A-04 | Outside-window selection blocked from auto-apply | BLOCKED_BY_TEST_DATA | PASS | L781, L879 (`withinWindowNow!==false` guard) |
| V3A-05 | Force-validate of outside-window coupon → `OUTSIDE_TIME_WINDOW` error rendered | BLOCKED_BY_TEST_DATA | PASS | L815 mapping; copy "Coupon not active right now" |
| V3A-06 | Final-order commit inside valid window | BLOCKED_BY_TEST_DATA | PASS for frontend send | Server clock authority — backend/CRM concern |
| V3A-07 | Overnight (e.g. 22:00–02:00) windows handled | BLOCKED_BY_TEST_DATA | PASS (no special handling needed; CRM authoritative) |

---

## 12. V3-B BOGO / BXG Test Matrix Result

| # | Scenario | Live Result | Code Result | Code Location |
|---|---|---|---|---|
| V3B-01 | BOGO offer surfaced in `/available` with `kind:'bogo'` | BLOCKED_BY_TEST_DATA | PASS | couponTransform L59-L66 |
| V3B-02 | BUY hint matches cart line filter | BLOCKED_BY_TEST_DATA | PASS | CollectPaymentPanel L751-L755 |
| V3B-03 | `MISSING_ITEMS_FOR_BXGY_COUPON` error copy | BLOCKED_BY_TEST_DATA | PASS | L822 |
| V3B-04 | `BUY_REQUIREMENT_NOT_MET` + `pos_instruction` rendered | BLOCKED_BY_TEST_DATA | PASS | L823 + L1383 instruction render |
| V3B-05 | `GET_REQUIREMENT_NOT_MET` | BLOCKED_BY_TEST_DATA | PASS | L824 |
| V3B-06 | `NO_ELIGIBLE_BUY_ITEMS_IN_CART` | BLOCKED_BY_TEST_DATA | PASS | L825 |
| V3B-07 | `NO_ELIGIBLE_GET_ITEMS_IN_CART` (POS must NOT auto-add) | BLOCKED_BY_TEST_DATA | PASS | L826; no auto-add code exists |
| V3B-08 | `BXGY_CONFIG_INVALID` | BLOCKED_BY_TEST_DATA | PASS | L827 |
| V3B-09 | `UNSUPPORTED_BENEFIT_TYPE` | BLOCKED_BY_TEST_DATA | PASS | L828 |
| V3B-10 | `benefit_items` displayed below applied chip | BLOCKED_BY_TEST_DATA | PASS | L1390-L1395 (main); L1979-L1985 (inline mirror) |
| V3B-11 | `applied_applications` available on `selectedCoupon` | BLOCKED_BY_TEST_DATA | PASS | couponTransform L105; not yet displayed in UI (see NG-02) |
| V3B-12 | `same_item_required`, `buy_quantity`, `get_quantity` preserved | BLOCKED_BY_TEST_DATA | PASS | couponTransform L59-L66 |
| V3B-13 | CRM-supplied `computed_discount` used (POS never recomputes) | BLOCKED_BY_TEST_DATA | PASS | CollectPaymentPanel L541 (`selectedCoupon.computedDiscount`) |
| V3B-14 | Final-order commit records coupon usage | BLOCKED_BY_TEST_DATA | NOT_APPLICABLE (mapper I-1, I-2, I-4) |

---

## 13. V3-C Every-Nth Test Matrix Result

| # | Scenario | Live Result | Code Result | Code Location |
|---|---|---|---|---|
| V3C-01 | Nth offer surfaced in `/available` with `kind:'nth_item'` | BLOCKED_BY_TEST_DATA | PASS | couponTransform L66-L68 |
| V3C-02 | Eligibility hint filter (food_ids / category_names) | BLOCKED_BY_TEST_DATA | PASS | CollectPaymentPanel L757-L762 |
| V3C-03 | `MISSING_ITEMS_FOR_EVERY_NTH_COUPON` copy | BLOCKED_BY_TEST_DATA | PASS | L829 |
| V3C-04 | `NTH_REQUIREMENT_NOT_MET` + `pos_instruction` | BLOCKED_BY_TEST_DATA | PASS | L830 |
| V3C-05 | `NO_ELIGIBLE_NTH_ITEMS_IN_CART` | BLOCKED_BY_TEST_DATA | PASS | L831 |
| V3C-06 | `EVERY_NTH_CONFIG_INVALID` | BLOCKED_BY_TEST_DATA | PASS | L832 |
| V3C-07 | `UNSUPPORTED_NTH_BENEFIT_TYPE` | BLOCKED_BY_TEST_DATA | PASS | L833 |
| V3C-08 | `nth_item_number`, `nth_discount_type`, `nth_discount_value` preserved | BLOCKED_BY_TEST_DATA | PASS | couponTransform L109-L111 |
| V3C-09 | `benefit_items` displayed | BLOCKED_BY_TEST_DATA | PASS | L1390-L1395 |
| V3C-10 | `applied_applications` available | BLOCKED_BY_TEST_DATA | PASS | couponTransform L105; UI surface deferred (NG-02) |
| V3C-11 | CRM-supplied discount used; POS never recomputes | BLOCKED_BY_TEST_DATA | PASS | CollectPaymentPanel L541 |
| V3C-12 | Final-order commit records nth usage | BLOCKED_BY_TEST_DATA | NOT_APPLICABLE (mapper I-1, I-2, I-4) |

---

## 14. Loyalty Regression Spot-Check Result

| # | Scenario | Result | Evidence |
|---|---|---|---|
| L-01 | Flow 3 (prepaid place+pay) sends `used_loyalty_point` + `loyalty_points_used` | PASS (code) | `orderTransform.js` L1178-L1183 (both fields conditional on `BUG108_FLAGS.loyaltyRatioLive=true`) |
| L-02 | Flow 4 (collect-bill existing order) sends `used_loyalty_point` + `loyalty_points_used` | PASS (code) | `orderTransform.js` L1395-L1400 |
| L-03 | No direct POS-Frontend call to `/pos/loyalty/redeem` | PASS (code) | `loyaltyService.redeemLoyalty()` short-circuits when `BUG108_FLAGS.loyaltyRedeemLive=false` (currently `false`, line 38 in `BUG108_FLAGS.js`). No call site issues `LOYALTY_REDEEM` from frontend. |
| L-04 | Loyalty + coupon stacking guard | PASS (code) | CollectPaymentPanel L741 reactive filter + L786-L802 auto-remove + L820 STACKING_NOT_ALLOWED copy |
| L-05 | Flow 1/Flow 2 (unpaid place / update) zero coupon fields | PASS (code) | orderTransform L907-L910, L1028-L1031 |

**Verdict:** Loyalty regression — **PASS** at code level. No live preprod
regression run was needed because no loyalty-touching code paths were
modified during the V2/V3 implementation (couponLive removal is
loyalty-orthogonal).

---

## 15. QSR / Room / Manual / Wallet Regression Result

| # | Scenario | Result | Evidence |
|---|---|---|---|
| R-01 | QSR fresh Place+Pay shows NO coupon UI | PASS (code) | `CartPanel.jsx` L391-L393 — `couponDiscount: 0`, `couponTitle: ''`, `couponType: ''` hardcoded in QSR billing section. `QsrBillingSection` (L244-L640) contains no coupon input. |
| R-02 | Full Billing route still supports coupon | PASS (code) | CollectPaymentPanel L1289-L1395; gated by `customer && restaurantSettings?.isCoupon` |
| R-03 | Room-service inline mirror behaves like main panel | PASS (code) | CollectPaymentPanel L1888-L1990 — full coupon block including dropdown, error, instruction, applied chip, benefit_items |
| R-04 | Manual discount works when coupon absent | PASS (code) | L1232, L1264 — manual discount inputs gated by `selectedCoupon !== null` |
| R-05 | Wallet deferred/disabled | PASS (code) | `BUG108_FLAGS.walletDebitLive=false` (line 39); `walletDisabledHelper` copy in place; orderTransform `use_wallet_balance` force-zero |
| R-06 | No deprecated `/api/pos/coupons/apply` usage | PASS (code) | `grep -rn '/coupons/apply' /app/frontend/src` returns **zero matches** |
| R-07 | `couponLive` flag removed | PASS (code) | `BUG108_FLAGS.js` line 35 — comment "REMOVED at V1 closure"; no flag reference remains in code |
| R-08 | Build passes | PASS | §4 |

---

## 16. Failures

**None** observed at the code / build level.

Live execution failures **cannot be ruled out** because no live test was
run. The risk-flagged items that are most likely to surface in live QA
are:

| Risk | Probable owner | Note |
|---|---|---|
| Mapper I-1 strip of `coupon_title`/`coupon_type` | POS Backend (Laravel) | No code visible in repo; must be audited against the POS Backend repo separately |
| Mapper I-2 V3 `coupon_type` value mapping (CRM accepts `order`/`item`/`category`, frontend emits `couponType` from `selectedCoupon.couponType` which is V1 `coupon_type` field — V3 selection may set `coupon_type: 'item'` or `'order'`; CRM tolerates omission) | POS Backend + CRM | Verify in live order log |
| Mapper I-3 print template coupon line | POS Backend bill print | Frontend send confirmed; render needs human bill verification |
| Mapper I-4 items[] forwarded | POS Backend | Confirm Laravel mapper keeps `cart` array unstripped to CRM `items` |
| Mapper I-5 `loyalty_idempotency_key` generation | POS Backend | Frontend currently does NOT inject; relies on POS Backend per Phase C handoff |

These are documented in the companion file
`POS3_0_BUG_108_BACKEND_MAPPER_AUDIT_REPORT_2026_05_26.md`.

---

## 17. Blockers

**B-1 (BLOCKED_BY_TEST_DATA):** No preprod restaurant API key
(`X-API-Key`) provided. Without it no `/pos/coupons/available`,
`/pos/coupons/validate`, or `/api/pos/orders` call can be issued
against `https://crm.mygenie.online/api`. CRM endpoint confirmed live
(`HTTP 401` on unauthenticated GET).

**B-2 (BLOCKED_BY_TEST_DATA):** No seeded coupons exist (none documented)
for the test restaurant covering:
- V1 simple-order flat
- V1 simple-order percentage with `max_discount`
- V2 item-scope (with at least 2 eligible food_ids)
- V2 category-scope (with at least 1 eligible category_name)
- V3-A time-window inside-now + outside-now (or one window crossing
  the QA wall-clock)
- V3-B BOGO (same-item) + BXG (different item)
- V3-C Every-Nth (item-level + category-level)
- Coupon with `stackable_with_loyalty=false`

**B-3 (BLOCKED_BY_TEST_DATA):** No test customer with sufficient
loyalty-eligible spend and at least one `specific_users` coupon
assignment.

**B-4 (NOT_RUN):** No access to POS Backend (Laravel) source tree or
preprod request logs for `POST /api/pos/orders` → CRM `/api/pos/orders`
to confirm field-level pass-through behaviour (mapper items I-1, I-2,
I-3, I-4, I-5).

**B-5 (Owner approval required):** Even if test data appears, owner must
approve live preprod creation of throw-away orders (per QA brief
"do not run destructive cleanup unless explicitly approved").

---

## 18. Screenshots / Log Paths

| Artifact | Path |
|---|---|
| Build log | `/tmp/build.log` (truncated in §4) |
| Frontend supervisor log | `/var/log/supervisor/frontend.*.log` (live during QA — confirmed clean) |
| MyGenie POS login screenshot | preview URL screenshot taken at deployment step (login page renders correctly) |

No live coupon-flow screenshots were captured because no preprod
credentials / test data are available.

---

## 19. Final Verdict

**`bug_108_coupon_v2_v3_code_implementation_verified_live_qa_blocked_by_test_data_2026_05_26`**

- Code completeness for Coupon V1A, V1B, V2 (item+category),
  V3-A (time-window), V3-B (BOGO/BXG), V3-C (Every-Nth) — **VERIFIED**
  against CR-001C-C handoff contract.
- Build — **PASS**.
- Loyalty + QSR/Room/Manual/Wallet regressions — **PASS** at code level.
- Backend mapper items I-1 … I-5 — **NOT_RUN** (separate audit doc).
- Live owner-smoke for V1B / V2 / V3-A / V3-B / V3-C — **BLOCKED_BY_TEST_DATA**.

**No code changes were performed in this QA run.**
**No file under `/app/memory/final/` was modified.**

---

## 20. Recommended Next Action

1. **Owner unblocks preprod test data** — provide:
   - test restaurant `X-API-Key`
   - test customer id with at least 1 coupon assignment
   - one coupon per type (V1 flat/%, V2 item, V2 category,
     V3-A inside-window, V3-A outside-window, V3-B BOGO,
     V3-B BXG different item, V3-C every-Nth)
   - one coupon with `stackable_with_loyalty=false`
2. **POS Backend / CRM team performs mapper audit** for I-1 … I-5 against
   POS Backend source + preprod request logs. The five items are
   listed in `POS3_0_BUG_108_BACKEND_MAPPER_AUDIT_REPORT_2026_05_26.md`.
3. **Re-run this QA** after items 1 + 2 are satisfied, updating each
   `BLOCKED_BY_TEST_DATA` row to `PASS` / `FAIL` with concrete order IDs
   and CRM `coupon_usage` rows.
4. **No code fixes are needed at this time** — code-side completeness is
   already verified. Defer any further frontend work until live QA
   surfaces an actual defect.
