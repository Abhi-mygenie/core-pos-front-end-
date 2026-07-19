# BUG-138: Discount Payload — `order_discount` and `self_discount` Wrong Values

## Registered: 2026-06-18
**Sprint:** pos_5_0
**Priority:** P0 (money-impacting — backend stores wrong discount values)
**Risk:** CRITICAL (financial logic, discount fields affect order totals)
**Status:** INTAKE COMPLETE
**Source:** OWNER-REPORTED (with old vs new POS curl comparison)
**Confidence:** CONFIRMED (code-traced + old POS payload comparison)

---

## 1. Description

Two discount payload fields are incorrect when placing/collecting orders:
1. **`self_discount`** — hardcoded to `0` in all payment paths. Old POS sends the actual discount ₹ amount (manual + preset).
2. **`order_discount`** — currently uses `discounts.total` which includes coupon/loyalty/wallet amounts. Old POS sends only manual + preset discount. Coupon/loyalty/wallet have their own separate fields.

## 2. Root Cause (from Investigation)

### 2a. `self_discount: 0` — PLAN_GAP from CR-025
- CR-025 zeroed `self_discount` per owner directive OD-025-1: "Send as 0"
- Old POS clearly sends `self_discount` = non-coupon/non-loyalty/non-wallet discount amount
- Backend expects this field to carry the discount value

### 2b. `order_discount: discounts.total` — PLAN_GAP
- Previous fix (17-june session) changed from `discounts.manual` to `discounts.total`
- `discounts.total` = `manual + preset + coupon + loyalty + wallet` (Full Mode)
- But coupon, loyalty, wallet have their **own separate payload fields**: `coupon_discount`, `used_loyalty_point`, `use_wallet_balance`
- Using `discounts.total` double-counts these when applied
- Old POS sends `order_discount` = manual + preset only

### 2c. QSR flow
- QSR `totalDiscount` (CartPanel L395) = `manual + preset` only (no coupon/loyalty/wallet support)
- So QSR path is coincidentally correct with `discounts.total`, but the formula should still be explicit

## 3. Evidence — Old vs New POS Comparison

| Field | Old POS (prepaid) | New POS (prepaid) | Correct Value |
|-------|-------------------|-------------------|---------------|
| `self_discount` | 5.6 | 0 | 5.6 (manual + preset) |
| `order_discount` | 5.6 | 0 | 5.6 (manual + preset) |
| `comm_discount` | 5.6 | 5.6 | 5.6 ✅ |
| `coupon_discount` | 0 | 0 | 0 ✅ (separate field) |
| `discount_value` | 10 | 10 | 10 ✅ |
| `order_discount_type` | Percent | Percent | Percent ✅ |

## 4. Duplicate Check

- **RELATED to CR-025** (discount payload fix — zeroed self_discount, changed order_discount to discounts.manual)
- **RELATED to 17-june session fix** (changed order_discount from discounts.manual to discounts.total)
- DISTINCT new bug — both prior fixes were incomplete

## 5. Blast Radius

- Files affected: 1 (`orderTransform.js`)
- Lines to change: 6 (2 fields × 3 payment paths)
- Hotspot: YES — `orderTransform.js` is a frozen financial file (R5, R6)
- Scope: SMALL (but CRITICAL risk due to financial nature)

## 6. Affected Paths

| Flow | Transform Function | Line (order_discount) | Line (self_discount) |
|------|--------------------|-----------------------|----------------------|
| Flow 3 — Prepaid (incl. QSR fresh) | `placeOrderWithPayment` | L1330 | L1313, L1323 |
| Flow 4 — Postpaid (incl. QSR placed) | `collectBillExisting` | L1602 | L1594 |
| Flow 5 — TransferToRoom | `transferToRoom` | L1673 | L1674 |
| Flow 1 — placeOrder (postpaid) | `placeOrder` | L1034 (hardcoded 0 ✅) | L1026 (hardcoded 0 ✅) |
| Flow 2 — updateOrder | `updateOrder` | L1155 (hardcoded 0 ✅) | L1147 (hardcoded 0 ✅) |

Note: Flows 1 & 2 correctly send 0 (no discount applied yet at placement/update time).
