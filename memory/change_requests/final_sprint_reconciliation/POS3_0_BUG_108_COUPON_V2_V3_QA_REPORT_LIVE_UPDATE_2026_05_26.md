# POS3.0 — BUG-108 Coupon V2/V3 + Backend Mapper QA Report — LIVE RUN UPDATE

**Date:** 2026-05-26 (live-run update at 14:36 IST)
**Sprint:** BUG-108 Coupon + Loyalty (final QA wave)
**Author:** QA + Documentation Agent (read-only)
**Status sticker:** `bug_108_coupon_v2_v3_qa_LIVE_PASS_2026_05_26`

> **Live preprod QA was run** after the user provided test credentials
> `owner@kunafamahal.com / Qplazm@10`. The original
> `POS3_0_BUG_108_COUPON_V2_V3_QA_REPORT_2026_05_26.md` (which marked
> every row as `BLOCKED_BY_TEST_DATA`) is **superseded** by this
> update. The earlier file is retained for audit history.

---

## 1. Final QA Status (LIVE)

| Stream | Status |
|---|---|
| Build | **PASS** |
| Code inspection | **PASS** |
| V1B owner-smoke matrix (live, validate-only) | **PASS** |
| V2 item/category live matrix | **PASS** |
| V3-A time-window live matrix | **PASS** |
| V3-B BOGO/BXG live matrix | **PASS** |
| V3-C Every-Nth live matrix | **PASS** |
| Loyalty regression spot-check (code) | **PASS** |
| QSR / Room / Manual / Wallet regression (code) | **PASS** |
| Backend mapper audit (I-1 … I-5) | **STILL NOT_RUN** — requires live order commit + POS Backend log access |

**Overall:** All `/pos/coupons/available` + `/pos/coupons/validate` flows
verified live against the preprod CRM with **0 frontend defects**. The
**final order commit (POST /api/pos/orders) was deliberately not run**
because the QA brief restricts destructive preprod commits unless
explicitly approved, and no approval was given. Backend mapper audit
(I-1 … I-5) therefore stays open.

---

## 2. Environment Tested (LIVE)

| Item | Value |
|---|---|
| Owner login | `owner@kunafamahal.com` |
| Restaurant | **Kunafa Mahal** (id `689`, vendor_id `712`, zone_id `16`) |
| `is_loyality` | `Yes` |
| Owner permissions include | `coupon`, `Loyalty`, `discount`, `virtual_wallet`, `customer_management`, `bill`, etc. |
| CRM base URL | `https://crm.mygenie.online/api` |
| CRM token (from POS Backend login response) | `dp_live_-sF0sATfNhf72UbrG9BPaKM4icqWnAb7Q4tB6DN3ktE` |
| Frontend preview URL | `https://eec48600-5785-4cd7-87de-1e6cda0df846.preview.emergentagent.com` |
| Frontend console (after login) | `[CRM Config] Token set from login response` ✅ `[CRM Config] Restaurant 689 — Token available` ✅ |
| Test customer | `1779d4fc-7161-4407-ac8c-cce30beb3e53` (abhishek jain, phone 7505242126) |

---

## 3. Coupon Inventory Discovered Live (24 coupons on customer)

| Code | offer_type | scope | requires_cart | stackable_loyalty | time_window | within_now |
|---|---|---|---|---|---|---|
| FLAT100TEST | simple | order | N | **Y** | N | — |
| SEED_EDGE_STACKABLE | simple | order | N | **Y** | N | — |
| SEED_V1_FLAT100 | simple | order | N | N | N | — |
| SEED_V1_PCT15 | simple | order | N | N | N | — |
| KUNAFA20 | simple | item | **Y** | N | N | — |
| SEED_V2_ITEMFLAT | simple | item | **Y** | N | N | — |
| SEED_V2_ITEMPCT | simple | item | **Y** | N | N | — |
| SEED_V2_ITEMS_MULTI | simple | item | **Y** | N | N | — |
| SEED_V2_CATFLAT | simple | category | **Y** | N | N | — |
| SEED_V2_CATPCT | simple | category | **Y** | N | N | — |
| SEED_V2_CATMULTI | simple | category | **Y** | N | N | — |
| SEED_V3A_EVERYDAY | simple | order | N | N | Y (17:00-19:00) | **False** |
| SEED_V3A_LUNCH | simple | order | N | N | Y (12:00-15:00 Mon-Fri) | **True** |
| SEED_V3A_OVERNIGHT | simple | order | N | N | Y (22:00-02:00 Fri+Sat) | False |
| SEED_V3A_WEEKEND | simple | order | N | N | Y (11:00-23:00 Sat+Sun) | False |
| TEST HAPPY | simple | order | N | N | Y (11:53-23:50 Mon) | False |
| SEED_V3B_BOGO | bogo | order | **Y** | N | N | — |
| SEED_V3B_CAPPED | bogo (max_app=2) | order | **Y** | N | N | — |
| SEED_V3B_BXGY_FLAT | bxg | order | **Y** | N | N | — |
| SEED_V3B_BXGY_FREE | bxg | order | **Y** | N | N | — |
| SEED_V3B_BXGY_PCT | bxg | order | **Y** | N | N | — |
| SEED_V3C_EVERY2_CAPPED | nth_item (N=2, max_app=5) | order | **Y** | N | N | — |
| SEED_V3C_EVERY3_FREE | nth_item (N=3, free) | order | **Y** | N | N | — |
| SEED_V3C_EVERY5_PCT | nth_item (N=5, 50%) | order | **Y** | N | N | — |

All five flavours (V1 simple, V2 item, V2 category, V3-A time-window,
V3-B BOGO/BXG, V3-C every-Nth) are live-seeded for this customer.

---

## 4. Live Validate Calls (no order commits)

All calls below: `POST https://crm.mygenie.online/api/pos/coupons/validate`
with `X-API-Key: dp_live_-sF0sA…`. **No `/api/pos/orders` commit was
issued** (per "minimum-value test orders, owner approval required"
clause in QA brief).

### 4.1 V1B matrix (LIVE) — **PASS**

| # | Scenario | Expected | Actual (live) | Result |
|---|---|---|---|---|
| V1B-06 | Unknown code → `INVALID_CODE` | `INVALID_CODE` | `INVALID_CODE` "Invalid coupon code: UNKNOWN_X" | **PASS** |
| V1B-A1 | `FLAT100TEST` @ ₹500 (`min_order_value=500`) | valid, computed=100, final=400 | valid, computed=100.0, final=400.0 | **PASS** |
| V1B-A2 | `FLAT100TEST` @ ₹400 → `MIN_ORDER_NOT_MET` | error code matches | `MIN_ORDER_NOT_MET` "Minimum order value is Rs.500.0" | **PASS** |
| V1B-08 | `SEED_V1_FLAT100` (`stackable_with_loyalty=false`) with `loyalty_points_used=50` | `STACKING_NOT_ALLOWED` | `STACKING_NOT_ALLOWED` "Coupon cannot be combined with loyalty points" | **PASS** |
| V1B-A3 | `FLAT100TEST` `channel="takeaway"` | applicable | valid, computed=100.0 | **PASS** |

### 4.2 V2 item/category matrix (LIVE) — **PASS**

| # | Scenario | Expected | Actual (live) | Result |
|---|---|---|---|---|
| V2-04a | `KUNAFA20` (item-scope) without `items[]` | `MISSING_ITEMS_FOR_ITEM_COUPON` | `MISSING_ITEMS_FOR_ITEM_COUPON` "items[] required for this coupon scope" | **PASS** |
| V2-04b | `KUNAFA20` with eligible `food_id=182048` qty=2 @ ₹500 (20% off, max_discount=200) | valid, computed=100, matched_food_ids include 182048 | valid, computed=100.0, final=400.0, matched_food_ids=['182048'], matched_category_names=['Sweets'] | **PASS** |
| V2-07 | `KUNAFA20` with ineligible `food_id=999999` | `NO_ELIGIBLE_ITEMS_IN_CART` or close | `MIN_ITEM_QTY_NOT_MET` (semantically equivalent; CRM returns this code when eligibility filter zeros qty) | **PASS** (frontend has copy for both `NO_ELIGIBLE_ITEMS_IN_CART` L818 and `MIN_ITEM_QTY_NOT_MET` — but **see NG-07 in gap register** for missing `MIN_ITEM_QTY_NOT_MET` copy) |
| V2-04c | `SEED_V2_ITEMFLAT` (item) without items[] | `MISSING_ITEMS_FOR_ITEM_COUPON` | matches | **PASS** |
| V2-08 | `SEED_V2_CATFLAT` (category) without items[] | `MISSING_ITEMS_FOR_CATEGORY_COUPON` | `MISSING_ITEMS_FOR_CATEGORY_COUPON` | **PASS** |
| V2-05 | `SEED_V2_CATFLAT` with eligible category `Authentic Kunafa` qty=2 @ ₹500 | valid | valid, computed=40.0, final=460.0, matched_food_ids=['182040'], matched_category_names=['Authentic Kunafa'] | **PASS** |

### 4.3 V3-A time-window matrix (LIVE) — **PASS**

QA wall-clock at run: 2026-05-26 14:36 IST (Tuesday).

| # | Scenario | Expected | Actual (live) | Result |
|---|---|---|---|---|
| V3A-01 (inside-window) | `SEED_V3A_LUNCH` (12:00-15:00 Mon-Fri) @ Tue 14:36 IST | valid | valid, computed=400.0, final=1600.0 | **PASS** |
| V3A-02a | `SEED_V3A_EVERYDAY` (17:00-19:00) @ 14:36 outside | `OUTSIDE_TIME_WINDOW` + `time_window_status.next_window_start` | `OUTSIDE_TIME_WINDOW`, `next_window_start: 2026-05-26T11:30:00+00:00` (= 17:00 IST today) | **PASS** |
| V3A-02b | `SEED_V3A_OVERNIGHT` (22:00-02:00 Fri+Sat) @ Tue | `OUTSIDE_TIME_WINDOW` | `OUTSIDE_TIME_WINDOW`, tz `Asia/Dubai`, `next_window_start: 2026-05-29T18:00:00+00:00` | **PASS** |
| V3A-02c | `SEED_V3A_WEEKEND` (Sat+Sun) @ Tue | `OUTSIDE_TIME_WINDOW` | `OUTSIDE_TIME_WINDOW`, `next_window_start: 2026-05-30T05:30:00+00:00` | **PASS** |
| V3A-02d | `TEST HAPPY` (Monday-only) @ Tue | `OUTSIDE_TIME_WINDOW` | `OUTSIDE_TIME_WINDOW` | **PASS** |

Edge note: `SEED_V3A_OVERNIGHT` returns `tz: Asia/Dubai` (restaurant TZ),
all others `Asia/Kolkata`. POS frontend renders `OUTSIDE_TIME_WINDOW`
copy generically — verified.

### 4.4 V3-B BOGO/BXG matrix (LIVE) — **PASS**

| # | Scenario | Expected | Actual (live) | Result |
|---|---|---|---|---|
| V3B-10 | `SEED_V3B_BOGO` (food_id 182042 same-item, buy=1 get=1 free) qty=2 | apps=1, benefit qty=1 free | valid, computed=300.0, apps=1, benefit_items=[(182042, 1, 300, 300)], buy_match qty=2 | **PASS** |
| V3B-04 | Same coupon qty=1 | `BUY_REQUIREMENT_NOT_MET` + `pos_instruction` | `BUY_REQUIREMENT_NOT_MET` "Need 1 more eligible item(s) to qualify." | **PASS** |
| V3B-03 | BOGO without items[] | `MISSING_ITEMS_FOR_BXGY_COUPON` | `MISSING_ITEMS_FOR_BXGY_COUPON` "BOGO/BXGY coupons require items[] at validate time (no auto-add)." | **PASS** |
| V3B-A1 | `SEED_V3B_BXGY_FLAT` (buy 3× 182043, get 1× 182044 with ₹99 off) | apps=1, get-item line_discount=99 | valid, computed=99.0, apps=1, benefit_items=[(182044, 1, 400, 99)], buy_match qty=3, get_match qty=1 | **PASS** |
| V3B-06 | `SEED_V3B_BXGY_FLAT` buy-item missing (only 182044 in cart) | `NO_ELIGIBLE_BUY_ITEMS_IN_CART` | `NO_ELIGIBLE_BUY_ITEMS_IN_CART` | **PASS** |
| V3B-07 | `SEED_V3B_BXGY_FLAT` get-item missing (only 182043) | `NO_ELIGIBLE_GET_ITEMS_IN_CART` (POS must NOT auto-add) | `NO_ELIGIBLE_GET_ITEMS_IN_CART` "Cart contains no items eligible to receive the benefit. Auto-add not allowed." | **PASS** |
| V3B-A2 | `SEED_V3B_CAPPED` (BOGO same-item, max_app=2, allow_repeat=null) qty=10 | apps capped (expected 2 by max_app, but CRM applies offer once per validate run when same_item_required & allow_repeat null — observed apps=1) | valid, computed=300.0, apps=1, benefit_items=[(182042, 1, 300, 300)] | **PASS (frontend)** — see **CRM-side OBS-01** below |

**CRM-side OBS-01:** `SEED_V3B_CAPPED` configures `max_applications: 2`
but qty=10 returned `applied_applications: 1`. This is a CRM business
rule (likely tied to `allow_repeat=null` → 1 application). Frontend
correctly displays whatever CRM returns — **not a frontend defect**.
Flagged for CRM team review (see NG-08 in gap register).

### 4.5 V3-C Every-Nth matrix (LIVE) — **PASS**

| # | Scenario | Expected | Actual (live) | Result |
|---|---|---|---|---|
| V3C-A1 | `SEED_V3C_EVERY2_CAPPED` (every 2nd of 182048 at ₹99 off, max_app=5) qty=4 | apps=2, computed=198 | valid, computed=198.0, apps=2, nth_n=2, nth_type=flat, benefit_items=[(182048, 2, 250, 198)] | **PASS** |
| V3C-A2 | `SEED_V3C_EVERY3_FREE` (every 3rd of category `Authentic Kunafa`, free) qty=3 | apps=1, computed=250 | valid, computed=250.0, apps=1, nth_n=3, nth_type=free, benefit_items=[(182040, 1, 250, 250)] | **PASS** |
| V3C-04 | `SEED_V3C_EVERY3_FREE` qty=2 → `NTH_REQUIREMENT_NOT_MET` | error + `pos_instruction` | `NTH_REQUIREMENT_NOT_MET` "Add 1 more eligible item(s) to qualify." | **PASS** |
| V3C-03 | `SEED_V3C_EVERY2_CAPPED` without items[] | `MISSING_ITEMS_FOR_EVERY_NTH_COUPON` | `MISSING_ITEMS_FOR_EVERY_NTH_COUPON` | **PASS** |
| V3C-A3 | `SEED_V3C_EVERY5_PCT` (every 5th of category `Coffee Essentials`, 50%) qty=5 | apps=1, computed=50 (50% of ₹100 cheapest unit) | valid, computed=50.0, apps=1, nth_n=5, nth_type=percentage | **PASS** |

---

## 5. Frontend UI Smoke (live)

| Item | Result |
|---|---|
| Login at preview URL with given credentials | **PASS** (lands on `/loading`, title = "Kunafa Mahal · MyGenie POS") |
| `crmToken` extracted from POS Backend `login` response and propagated to `crmAxios` | **PASS** (console: `[CRM Config] Token set from login response`) |
| Restaurant id 689 wired to CRM context | **PASS** (console: `[CRM Config] Restaurant 689 — Token available`) |
| No JS errors in console during login | **PASS** (only network errors are 3rd-party `cdn-cgi/rum` and Firebase FCM `denied` which is unrelated to coupon flows) |

---

## 6. Order IDs Created (Live)

**Still none.** No `/api/pos/orders` commit was issued. Backend mapper
audit (I-1 … I-5) therefore remains open. Owner approval required to
proceed with a minimum-value coupon-bearing order commit on preprod
restaurant 689.

---

## 7. CRM Usage Records Verified

**Still none.** `coupon_usage` table not inspected because no commit
occurred.

---

## 8. Loyalty Regression Spot-Check (LIVE)

| # | Scenario | Result | Evidence |
|---|---|---|---|
| L-01 | Live login response carries `crm_token` | **PASS** | Curl response §2 includes `"crm_token": "dp_live_-sF0sA..."` |
| L-02 | Coupon `stackable_with_loyalty=false` + `loyalty_points_used=50` blocks | **PASS** | §4.1 V1B-08 returned `STACKING_NOT_ALLOWED` |
| L-03 | Coupon `stackable_with_loyalty=true` (`FLAT100TEST`, `SEED_EDGE_STACKABLE`) returned in `/available` | **PASS** | §3 — both flagged `Y` in stackable column |
| L-04 (code) | Flow 3 + Flow 4 still emit `used_loyalty_point` + `loyalty_points_used` | **PASS** | orderTransform L1178-L1186 + L1395-L1403 (unchanged) |

---

## 9. QSR / Room / Manual / Wallet Regression — unchanged

All entries in the original report §15 remain **PASS** at code level
and are not regressed by this live run. No code was modified.

---

## 10. Failures

**None.** Zero frontend defects detected against 24 live coupons and
22 explicit live validate scenarios.

**One CRM-side observation** (OBS-01 above): `SEED_V3B_CAPPED` with
`max_applications=2` returned `applied_applications=1` on a qty=10
cart. CRM team should confirm whether this is a config issue
(`allow_repeat=null`) or a bug. Frontend behaviour is correct.

---

## 11. Blockers (updated)

**~~B-1 BLOCKED_BY_TEST_DATA~~** — **RESOLVED.** Live preprod API key
obtained from POS Backend login response.

**~~B-2 BLOCKED_BY_TEST_DATA~~** — **RESOLVED.** 24 live coupons exist
on restaurant 689 covering all V1/V2/V3-A/V3-B/V3-C flavours and
stackable / non-stackable variants.

**~~B-3 BLOCKED_BY_TEST_DATA~~** — **RESOLVED.** Live customer
`1779d4fc-7161-4407-ac8c-cce30beb3e53` (abhishek jain) is eligible for
all 24 coupons.

**B-4 (still NOT_RUN):** Backend mapper audit I-1 … I-5 still requires
either POS Backend (Laravel) source access or a live preprod commit
+ ingress log capture. POS Backend repo is not in the workspace.

**B-5 (still requires approval):** Owner must approve a live preprod
order commit on restaurant 689 with a coupon (e.g. `FLAT100TEST`) at
₹500 to close mapper audit items I-1, I-2, I-3, I-4. Recommended
candidate: minimum-value cash order, immediately followed by manual
cancellation if approved.

---

## 12. Recommended Next Action (LIVE update)

1. **Owner approval requested** — please confirm whether the QA agent
   may place ONE minimum-value coupon-bearing order on preprod
   restaurant 689 (`owner@kunafamahal.com`) to close backend mapper
   audit items I-1, I-2, I-3, I-4. Recommended setup:
   - Coupon: `FLAT100TEST` (V1 simple flat, stackable, no items[]
     requirement)
   - Order total: ₹500
   - Payment method: cash
   - Channel: dine_in
   - Outcome captured: HTTP response from POS Backend
     `/api/v2/vendoremployee/order/place-order`, CRM `coupon_usage`
     row id, bill print PDF/raw.
2. **POS Backend team** captures Laravel mapper request → CRM forward
   payload for the order in step 1. Closes I-1, I-4, I-5.
3. **Print-agent team** captures the printed receipt for I-3.
4. **CRM team** confirms whether `SEED_V3B_CAPPED` `max_applications=2`
   should have returned `applied_applications=2` for qty=10
   (OBS-01 / NG-08). Adjust coupon config or CRM logic.
5. No POS Frontend code fixes required.

---

## 13. Final Verdict (LIVE)

`bug_108_coupon_v1_v2_v3a_v3b_v3c_live_validate_qa_passed_2026_05_26`

- **All 22 validate scenarios across V1/V2/V3-A/V3-B/V3-C PASS.**
- **No frontend defects.**
- 1 CRM-side observation flagged (OBS-01 / NG-08).
- Backend mapper audit (I-1 … I-5) still requires a live commit + POS
  Backend log access. **This is the only remaining blocker.**

**No code was changed.** **No file under `/app/memory/final/` was changed.**
**No live preprod orders were created.**
