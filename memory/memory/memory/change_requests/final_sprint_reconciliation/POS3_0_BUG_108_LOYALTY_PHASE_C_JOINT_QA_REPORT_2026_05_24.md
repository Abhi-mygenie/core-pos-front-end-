# POS 3.0 BUG-108 — Loyalty Phase C Joint QA Report

**Date:** 2026-05-24
**Persona:** Senior CRM/POS BUG-108 Loyalty Phase C Joint QA Agent
**Mode:** QA only — no code changes, no data mutation

---

## 1. QA Status

```
bug_108_loyalty_phase_c_joint_qa_passed_with_deferred_live_redemption
```

Build passes. All static/API checks pass. CRM max-redeemable endpoint verified. Error codes verified. Live UI flow (Collect Bill with customer + items) deferred to owner smoke — requires live order creation which is a data mutation outside this QA scope.

---

## 2. Docs Read

1. Frozen plan (661 lines)
2. CRM API verification report
3. POS implementation handoff
4. POS implementation report
5. POS QA handoff

---

## 3. Environment / Test Data

| Field | Value |
|-------|-------|
| App URL | `https://insights-phase.preview.emergentagent.com` |
| Restaurant | kunafamahal (689) |
| Login | `owner@kunafamahal.com` / `Qplazm@10` |
| Customer | abhishek jain (Gold, 4588 pts) |
| Customer ID | `5ebde664-c7b7-46b7-85ab-f5c5319161b9` |
| CRM Base | `https://insights-phase.preview.emergentagent.com/api` |
| Restaurant cap | ₹664, min: 100 pts |

---

## 4. Build Result

| Item | Value |
|------|-------|
| Command | `cd /app/frontend && CI=false yarn build` |
| Exit code | 0 |
| Duration | 18.42s |
| Main bundle | 475.32 kB gzipped |
| Warnings | 1 (pre-existing `react-hooks/exhaustive-deps` — unrelated) |
| Errors | 0 |
| Frontend supervisor | RUNNING, webpack compiled successfully |

---

## 5. CRM `/pos/max-redeemable` Verification

| Test | Request | Response | Verdict |
|------|---------|----------|---------|
| Happy path (Gold, bill ₹1000) | `customer_id + bill_amount:1000` | `max_points:664, discount:664.0, tier:Gold, available:4588, ratio:1.0, min:100, enabled:true` | **PASS** |
| Bill-cap (Gold, bill ₹349) | `bill_amount:349` | `max_points:349, discount:349.0` | **PASS** (previously verified) |
| cust_mobile fallback | `cust_mobile:7505242126` | Identical to customer_id response | **PASS** (previously verified) |
| Non-mutating | Called 3 times | `available_points=4588` unchanged | **PASS** |

All 7 response fields verified present: `max_points_redeemable`, `max_discount_value`, `ratio_per_point`, `tier`, `available_points`, `min_redemption_points`, `loyalty_enabled`.

---

## 6. POS UI Verification

| Check | Method | Result |
|-------|--------|--------|
| Login works | Playwright | **PASS** — loading screen shows, dashboard renders |
| No crash on load | Playwright + console | **PASS** — no loyalty errors in console |
| "Loyalty" permission available | Console log | **PASS** — `Loyalty` in permissions array |
| Collect Bill loyalty display | **DEFERRED** | Requires new order creation (data mutation) — deferred to owner smoke |
| "No points" text eliminated (code) | Static grep | **PASS** — "No points" literal no longer in main loyalty section |
| Bill Summary loyalty line (code) | Static grep | **PASS** — uses `maxRedeemable?.maxPointsRedeemable` |

---

## 7. Payload Verification

| Check | Method | Result |
|-------|--------|--------|
| `paymentData.discounts.loyaltyPoints` = `maxRedeemable.maxDiscountValue` | Code inspection | **PASS** |
| `paymentData.discounts.loyaltyPointsRedeemed` = `maxRedeemable.maxPointsRedeemable` | Code inspection | **PASS** |
| `paymentData.discounts.loyaltyRedemptionId` = `null` | Code inspection | **PASS** |
| `orderTransform` `used_loyalty_point` gate = `loyaltyRatioLive ? value : 0` | Code inspection | **PASS** |
| `orderTransform` `loyalty_redemption_id` = `null` always | Code inspection | **PASS** |
| `orderTransform` `loyalty_dicount_amount` gate = `loyaltyRatioLive ? value : 0` | Code inspection | **PASS** |
| No direct redeem call in handlePayment | Code grep (0 hits) | **PASS** |
| Live payload capture | **DEFERRED** | Requires billing (data mutation) |

---

## 8. CRM Redemption-on-Final-Payload Verification

**DEFERRED** — actual CRM redemption happens in POS Backend (`preprod.mygenie.online`) when it processes the bill-payment payload. This is outside POS Frontend scope and requires a real billing flow. Owner confirmed this as a business rule.

---

## 9. Error-Code Verification

| Error code | CRM API test | POS code handles | Verdict |
|-----------|-------------|-----------------|---------|
| (happy path) | **PASS** — 664/664.0/Gold/4588 | `maxDiscountValue > 0` → show discount | **PASS** |
| `BELOW_MIN_REDEMPTION` | **PASS** — 0-pt customer returns code | `isBelowMin` → "Earn X more", disabled | **PASS** |
| `CUSTOMER_NOT_FOUND` | **PASS** — invalid ID returns code | `errCode === 'CUSTOMER_NOT_FOUND'` → hide | **PASS** |
| `INVALID_REQUEST` | **PASS** — no customer_id returns code | `errCode === 'INVALID_REQUEST'` → hide | **PASS** |
| `LOYALTY_DISABLED` | **DEFERRED** — cannot toggle restaurant config | Code handles: `errCode === 'LOYALTY_DISABLED'` → hide | **CODE PASS** |
| `SETTINGS_MISSING` | **DEFERRED** — cannot remove settings | Code handles: `errCode === 'SETTINGS_MISSING'` → hide | **CODE PASS** |
| 401 (bad auth) | **PASS** — returns 401 | Service returns safe empty result | **PASS** |
| Network error | POS service returns `{ error: { code: 'NETWORK_ERROR' } }` | Code handles gracefully | **CODE PASS** |

---

## 10. Regression Verification

| Surface | Method | Result |
|---------|--------|--------|
| Coupon flag (`couponLive=false`) | Code grep | **PASS** — unchanged |
| Wallet flag (`walletDebitLive=false`) | Code grep | **PASS** — unchanged |
| Manual discount | Code grep (16 refs) | **PASS** — unchanged |
| Coupon payload force-zero | Code grep | **PASS** — `couponLive ? value : 0` |
| Wallet payload force-zero | Code grep | **PASS** — `walletDebitLive ? value : 0` |
| Place Order/Prepaid/Update loyalty = 0 | Code grep | **PASS** — hardcoded 0 at L908, L1026, L1153 |
| Phase B `loyaltyPreviewLive=true` | Code grep | **PASS** — still true |
| Tax engine | Code inspection | **PASS** — `subtotalAfterDiscount` feeds GST/VAT unchanged |
| Service charge | Code inspection | **PASS** — unchanged |
| Reverse API | Code grep (0 hits) | **PASS** — not built |

---

## 11. QA Checklist Results

| # | Check | Method | Verdict |
|---|-------|--------|---------|
| 1 | `CI=false yarn build` passes | Build | **PASS** |
| 2 | Build has no errors | Build | **PASS** |
| 3 | `getMaxRedeemable()` exists | Grep | **PASS** |
| 4 | POS calls `/pos/max-redeemable` | Grep | **PASS** |
| 5 | Direct `/pos/loyalty/redeem` not called | Grep (0 hits) | **PASS** |
| 6 | Old state machine removed | Grep (0 hits) | **PASS** |
| 7 | `used_loyalty_point` mapped | Code | **PASS** |
| 8 | `loyalty_dicount_amount` mapped | Code | **PASS** |
| 9 | Coupon unchanged | Code | **PASS** |
| 10 | Wallet unchanged | Code | **PASS** |
| 11 | Reverse not built | Grep (0 hits) | **PASS** |
| 12 | Max-redeemable Gold customer | CRM API | **PASS** |
| 13 | `max_discount_value` present | CRM API | **PASS** |
| 14 | `max_points_redeemable` present | CRM API | **PASS** |
| 15 | `tier` present | CRM API | **PASS** |
| 16 | `available_points` present | CRM API | **PASS** |
| 17 | `ratio_per_point` present | CRM API | **PASS** |
| 18 | `loyalty_enabled` present | CRM API | **PASS** |
| 19 | `min_redemption_points` present | CRM API | **PASS** |
| 20 | Non-mutating | CRM API (3 calls) | **PASS** |
| 21 | Collect Bill loyalty display | Live UI | **DEFERRED** |
| 22 | Tier shown | Live UI | **DEFERRED** |
| 23 | Available points shown | Live UI | **DEFERRED** |
| 24 | Redeemable points shown | Live UI | **DEFERRED** |
| 25 | Discount amount shown | Live UI | **DEFERRED** |
| 26 | No "No points" text | Code + Live UI | **CODE PASS** / Live DEFERRED |
| 27 | No unnecessary helper copy | Code | **PASS** |
| 28 | Bill Summary correct | Code | **PASS** |
| 29 | Total reflects discount | Code | **PASS** |
| 30 | BELOW_MIN_REDEMPTION | CRM API | **PASS** |
| 31 | LOYALTY_DISABLED | Code | **CODE PASS** / Live DEFERRED |
| 32 | SETTINGS_MISSING | Code | **CODE PASS** / Live DEFERRED |
| 33 | CUSTOMER_NOT_FOUND | CRM API | **PASS** |
| 34 | INVALID_REQUEST | CRM API | **PASS** |
| 35 | Network error handled | Code | **CODE PASS** |
| 36-37 | Final bill/payment payload | Live | **DEFERRED** |
| 38 | `used_loyalty_point` = CRM value | Code | **PASS** |
| 39 | `loyalty_dicount_amount` = CRM value | Code | **PASS** |
| 40 | Customer ID in request | Code + API | **PASS** |
| 41 | No direct redeem call | Code (0 hits) | **PASS** |
| 42-45 | CRM order ingestion / earn-on-net / dedup | Backend | **DEFERRED** |
| 46 | Manual discount unchanged | Code | **PASS** |
| 47 | Coupon unchanged | Code | **PASS** |
| 48 | Wallet unchanged | Code | **PASS** |
| 49 | Tax unchanged | Code | **PASS** |
| 50 | SC/delivery unchanged | Code | **PASS** |
| 51 | Room-service mirror | Code | **PASS** (inline mirror rewritten with max-redeemable) |
| 52 | Phase B preview usable | Code | **PASS** (`loyaltyPreviewLive=true`) |

**Summary: 40 PASS, 0 FAIL, 12 DEFERRED**

---

## 12. Defects Found

**NONE.** Zero P0/P1/P2/P3 defects found across static, API, and code-level verification.

---

## 13. Deferred Items

| # | Item | Reason | Owner smoke? |
|---|------|--------|-------------|
| 1 | Live Collect Bill loyalty display (checks 21-25) | Requires new order creation (data mutation) | YES |
| 2 | Live payload capture (checks 36-37) | Requires bill payment (data mutation) | YES |
| 3 | CRM redemption-on-final-payload (checks 42-45) | POS Backend scope | YES |
| 4 | LOYALTY_DISABLED / SETTINGS_MISSING live (checks 31-32) | Cannot toggle restaurant config | Owner/CRM team |

---

## 14. Owner Smoke Recommendation

**Proceed to owner smoke.** All verifiable checks pass. The 12 deferred items require live order creation and billing, which should be tested by the owner on preprod.

**Owner smoke steps:**
1. Login as `owner@kunafamahal.com` / `Qplazm@10`
2. Create Walk-In order → search customer `7505242126` (abhishek jain Gold)
3. Add item(s) — e.g., any ₹349 item
4. Open Collect Bill
5. Verify: Loyalty card shows "Gold (4588 pts) ₹349 discount" (auto-checked)
6. Verify: Bill Summary shows "Loyalty Points (349 pts) -₹349"
7. Verify: Total reduced by loyalty discount
8. Optionally: uncheck loyalty → discount removed → re-check → discount re-applied
9. Pay (if safe on preprod) → verify payload in browser Network tab includes `used_loyalty_point=349`
10. Verify "No points" text does NOT appear

---

## 15. Confirmations

| # | Confirmation | Status |
|---|-------------|--------|
| 1 | No reverse built | Confirmed (0 grep hits) |
| 2 | Coupon/wallet untouched | Confirmed (flags false, force-zero intact) |
| 3 | No direct redeem call | Confirmed (0 grep hits in CollectPaymentPanel) |
| 4 | `/app/memory/final/` untouched | Confirmed |
| 5 | Baseline docs untouched | Confirmed |
| 6 | No code edited in this QA pass | Confirmed |
| 7 | No data mutated | Confirmed |

---

**End of Joint QA Report.**
