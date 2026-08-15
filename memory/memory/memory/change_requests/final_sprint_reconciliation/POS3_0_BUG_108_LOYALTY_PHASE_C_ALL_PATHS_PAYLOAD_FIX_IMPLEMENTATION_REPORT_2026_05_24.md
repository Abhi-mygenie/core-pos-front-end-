# POS 3.0 BUG-108 — Loyalty Phase C All-Paths Payload Fix Implementation Report

**Date:** 2026-05-24
**Status:** `bug_108_loyalty_phase_c_all_paths_payload_fix_verified_owner_confirmed`
**Frozen plan:** `POS3_0_BUG_108_LOYALTY_PHASE_C_ALL_PAYLOAD_PATHS_GAP_PLAN_2026_05_24.md`
**Reconciliation:** `POS3_0_BUG_108_LOYALTY_PHASE_C_FLOW_DECISION_RECONCILIATION_2026_05_24.md`

---

## 1. Changes Implemented

### Change A — Flow 3 (`placeOrderWithPayment`, orderTransform.js ~L1155)
**CRITICAL FIX:** Replaced hardcoded `used_loyalty_point: 0` with BUG108_FLAGS-gated CRM value.
- `used_loyalty_point`: reads `discounts.loyaltyPointsRedeemed` (from CollectPaymentPanel L790)
- `loyalty_points_used`: same value (CRM-expected field name)
- `loyalty_redemption_id: null`: POS Backend generates
- `use_wallet_balance`: gated by `walletDebitLive` (future-proof)

### Change B — Flow 4 (`collectBillExisting`, orderTransform.js ~L1371)
Added `loyalty_points_used` alongside existing `used_loyalty_point` (same gated value).

### Change C — Flow 1 (`placeOrder`, ~L909) and Flow 2 (`updateOrder`, ~L1028)
Added `loyalty_points_used: 0` for schema consistency. Values stay 0 (unpaid paths).

### Change E — QSR (`CartPanel.jsx`, ~L397-398)
Added `loyaltyPointsRedeemed: 0` and `loyaltyRedemptionId: null` to QSR paymentData for key consistency.

## 2. Files Modified

| File | Changes |
|------|---------|
| `src/api/transforms/orderTransform.js` | 4 flows updated (~9 lines net) |
| `src/components/order-entry/CartPanel.jsx` | QSR paymentData keys added (~2 lines) |

## 3. Build Result
- Frontend: webpack compiled successfully
- Errors: 0
- Warnings: 1 (pre-existing, unrelated)

## 4. Owner Payload Verification (2026-05-24)

### Postpaid Payload (Flow 4) — Order 868926 — VERIFIED ✅

| Field | Value | Verdict |
|-------|-------|---------|
| `used_loyalty_point` | 663 | PASS — CRM max_points_redeemable |
| `loyalty_points_used` | 663 | PASS — new CRM-expected key |
| `loyalty_redemption_id` | null | PASS — POS Backend generates |
| `discount_value` | 663 | PASS — total discount = loyalty |
| `order_sub_total_amount` | 663 | PASS — 299+15+349 |
| `payment_amount` | 0 | PASS — full loyalty coverage |

### Prepaid Payload (Flow 3) — Restaurant 689 — VERIFIED ✅

| Field | Before Fix | After Fix | Verdict |
|-------|-----------|-----------|---------|
| `used_loyalty_point` | 0 (hardcoded) | **1052** | PASS — was the core bug |
| `loyalty_points_used` | missing | **1052** | PASS — new field |
| `loyalty_redemption_id` | missing | **null** | PASS — new field |
| `order_amount` | 0 (incoherent) | 0 (coherent — loyalty explains it) | PASS |
| `cust_membership_id` | present | present | PASS |
| `order_sub_total_amount` | 1052 | 1052 | PASS — 299+15+349+389 |

## 5. CRM Alignment Status

| CRM Input | Status |
|-----------|--------|
| `loyalty_points_used` in payload | **DONE ✅** — all 4 flows emit it |
| `used_loyalty_point` preserved | **DONE ✅** — backward compatible |
| `loyalty_redemption_id` | **DONE ✅** — null (POS Backend fills) |
| Ratio from CRM, no hardcoding | **ALIGNED ✅** — all from `/pos/max-redeemable` |
| Customer gate on loyalty | **ALIGNED ✅** — triple-gated |
| Field rename at mapper | **POS Backend mapper** — not POS Frontend |
| `loyalty_idempotency_key` | **PENDING** — CRM decision on who generates |
| `loyalty_discount` ₹ field | **PENDING** — CRM answer on derivation |

## 6. Confirmations

| # | Confirmation | Status |
|---|-------------|--------|
| 1 | No direct `/pos/loyalty/redeem` called | Confirmed |
| 2 | No backend changed | Confirmed |
| 3 | `/app/memory/final/` untouched | Confirmed |
| 4 | Baseline docs untouched | Confirmed |
| 5 | Owner-provided payloads verified both flows | Confirmed |
