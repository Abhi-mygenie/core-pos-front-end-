# POS 3.0 BUG-108 — Bill Payload Gap Fix Plan (G-1, G-2)

**Date:** 2026-05-25
**Updated:** 2026-05-25 (G-2 moved entirely to POS BE — Option B)
**Status:** `bug_108_bill_payload_gap_fix_plan_ready_for_implementation`
**Scope:** Add missing `loyalty_discount` to collect bill / place+pay payloads. `loyalty_idempotency_key` fully owned by POS BE.
**File (POS FE):** `frontend/src/api/transforms/orderTransform.js` (1 file)

---

## 1. Gaps Addressed

| # | Gap | CRM expects | POS FE sends today | POS FE fix | POS BE action |
|---|---|---|---|---|---|
| G-1 | `loyalty_discount` (₹ amount) | `loyalty_discount: 50.00` | Not sent — only `used_loyalty_point` (integer points) | Add `loyalty_discount: discounts.loyaltyPoints \|\| 0` to all flows | Forward to CRM unstripped |
| G-2 | `loyalty_idempotency_key` | `loyalty_idempotency_key: "order_868950_loyalty"` | Not sent | **No POS FE action.** POS FE does NOT send this field. | **POS BE owns entirely** — injects `"order_{id}_loyalty"` for ALL flows before forwarding to CRM |

### G-2 Decision Record (Owner, 2026-05-25)
- **Option B selected:** POS BE owns `loyalty_idempotency_key` generation for all flows.
- **Rationale:** Single owner, no split responsibility. POS BE has `order_id` available in its pipeline for both Flow 3 (from place-order response) and Flow 4 (from incoming payload). POS FE never sends this field.
- **POS FE scope:** Zero lines for G-2. Field is NOT added to any POS FE payload.

---

## 2. File-Level Change Plan (POS FE only — G-1)

### File: `frontend/src/api/transforms/orderTransform.js`

#### Edit 1 — Flow 3 (`placeOrderWithPayment`, ~L1176-1183)

**Current:**
```js
used_loyalty_point:           BUG108_FLAGS.loyaltyRatioLive
                                ? (discounts.loyaltyPointsRedeemed || 0)
                                : 0,
loyalty_points_used:          BUG108_FLAGS.loyaltyRatioLive
                                ? (discounts.loyaltyPointsRedeemed || 0)
                                : 0,
loyalty_redemption_id:        null,
```

**After:**
```js
used_loyalty_point:           BUG108_FLAGS.loyaltyRatioLive
                                ? (discounts.loyaltyPointsRedeemed || 0)
                                : 0,
loyalty_points_used:          BUG108_FLAGS.loyaltyRatioLive
                                ? (discounts.loyaltyPointsRedeemed || 0)
                                : 0,
loyalty_discount:             BUG108_FLAGS.loyaltyRatioLive
                                ? (discounts.loyaltyPoints || 0)
                                : 0,
loyalty_redemption_id:        null,
```

**Field added:** `loyalty_discount` (₹ amount from `discounts.loyaltyPoints` = `maxRedeemable.maxDiscountValue`).

#### Edit 2 — Flow 4 (`collectBillExisting`, ~L1390-1397)

**Current:**
```js
used_loyalty_point:           BUG108_FLAGS.loyaltyRatioLive
                                ? (discounts.loyaltyPointsRedeemed || 0)
                                : 0,
loyalty_points_used:          BUG108_FLAGS.loyaltyRatioLive
                                ? (discounts.loyaltyPointsRedeemed || 0)
                                : 0,
loyalty_redemption_id:        null,
```

**After:**
```js
used_loyalty_point:           BUG108_FLAGS.loyaltyRatioLive
                                ? (discounts.loyaltyPointsRedeemed || 0)
                                : 0,
loyalty_points_used:          BUG108_FLAGS.loyaltyRatioLive
                                ? (discounts.loyaltyPointsRedeemed || 0)
                                : 0,
loyalty_discount:             BUG108_FLAGS.loyaltyRatioLive
                                ? (discounts.loyaltyPoints || 0)
                                : 0,
loyalty_redemption_id:        null,
```

**Field added:** `loyalty_discount` (₹ amount).

#### Edit 3 — Flow 1 (`placeOrder`, ~L913-915) and Flow 2 (`updateOrder`, ~L1036-1038)

Unpaid order creation/update — no loyalty redemption. Add for schema parity:

```js
loyalty_discount:             0,
```

---

## 3. Data Source Mapping

| Payload field | Source in `paymentData.discounts` | Set at (CollectPaymentPanel) | Value |
|---|---|---|---|
| `loyalty_discount` | `discounts.loyaltyPoints` | L1022: `finalLoyaltyDiscount` = `maxRedeemable.maxDiscountValue` | ₹ amount (e.g., 50.00) |

---

## 4. Regression Checklist

| Test | Expected |
|---|---|
| Place order without loyalty → inspect payload | `loyalty_discount: 0` |
| Collect bill WITH loyalty → inspect payload | `loyalty_discount: <₹ amount>` (e.g., 174.5 for kunafamahal Gold) |
| Place+pay WITH loyalty → inspect payload | `loyalty_discount: <₹ amount>` |
| Existing fields `used_loyalty_point` / `loyalty_points_used` | Unchanged — still carry integer points |
| Coupon fields (`coupon_code`, `coupon_discount`, `coupon_title`, `coupon_type`) | Unchanged |
| Wallet field `use_wallet_balance` | Unchanged |
| Tax / SC / tip / round-off | Unchanged |
| `loyalty_redemption_id` | Unchanged — still `null` |

---

## 5. POS BE Coordination

| Item | Action | Owner | POS FE scope |
|---|---|---|---|
| `loyalty_discount` field pass-through | Forward to CRM `POST /api/pos/orders` unstripped | **POS BE team** | POS FE adds field (**this plan**) |
| `loyalty_idempotency_key` generation | POS BE generates `"order_{id}_loyalty"` for ALL flows and injects into CRM payload. POS FE does NOT send this field. | **POS BE team (sole owner)** | **Zero lines** |
| `loyalty_idempotency_key` — Flow 3 | POS BE has `order_id` from place-order response | **POS BE team** | N/A |
| `loyalty_idempotency_key` — Flow 4 | POS BE has `order_id` from incoming bill-payment payload | **POS BE team** | N/A |

---

## 6. Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| New `loyalty_discount` field causes POS BE to reject payload | LOW | POS BE typically ignores unknown fields. Owner confirmed mapper works. |
| `loyalty_discount` value mismatches CRM expectation | LOW | Value comes from CRM's own `/pos/max-redeemable` response — round-trip consistency |
| POS BE doesn't generate `loyalty_idempotency_key` | MEDIUM | POS BE team backlog item. CRM may log warning but order still persists (idempotency is safety-net, not gate). Joint QA to verify. |

---

## 7. Summary

| What | Lines | File | Owner |
|---|---|---|---|
| Add `loyalty_discount` to Flow 1/2/3/4 | 4 lines | `orderTransform.js` | **POS FE** |
| Generate `loyalty_idempotency_key` for all flows | 0 lines POS FE | POS BE pipeline | **POS BE** |

**Total POS FE change: 4 lines in 1 file.**

---

**End of Bill Payload Gap Fix Plan.**
