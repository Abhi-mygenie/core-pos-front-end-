# POS 3.0 BUG-108 — Loyalty Phase C All-Paths Payload Fix Implementation Report

**Date:** 2026-05-24
**Status:** `bug_108_loyalty_phase_c_all_paths_payload_fix_implemented`
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

## 4. Pending CRM Decisions
- `loyalty_idempotency_key`: not implemented — pending CRM decision on who generates
- `loyalty_discount` ₹ field: not implemented — pending CRM answer on derivation
