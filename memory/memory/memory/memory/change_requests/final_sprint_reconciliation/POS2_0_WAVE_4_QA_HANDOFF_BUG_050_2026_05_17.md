# POS2.0 Wave 4 QA Handoff — BUG-050 Bucket — 2026-05-17

## 1. Scope

This handoff covers **BUG-050 only** (Wave 4 bucket 1). BUG-057 and BUG-059 are in subsequent buckets and will receive their own QA handoffs.

## 2. What Was Changed (1 file)

`frontend/src/api/transforms/orderTransform.js`:
- `fromAPI.order` now exposes `discount` (sourced from `restaurant_discount_amount` with `discount_value` fallback).
- `buildBillPrintPayload` default branch (no overrides) now cascades `order.discount` into both the `overrideDiscount` recompute variable and the emitted `discount_amount` field.
- Override branch (CollectPaymentPanel + OrderEntry auto-print) is unchanged.

## 3. Affected User-Facing Surfaces

| Surface | Behavior Before | Behavior After |
|---|---|---|
| Collect Bill "Print Bill" (CollectPaymentPanel) | Correct (uses live overrides) | **Unchanged** |
| OrderEntry "Print Bill" pill (PrintBillButton) | Default branch — discount=0 | **Now includes stored discount** |
| Dashboard OrderCard printer icon | Default branch — discount=0 | **Now includes stored discount** |
| Dashboard TableCard printer icon | Default branch — discount=0 | **Now includes stored discount** |
| OrderEntry auto-print after place+pay | Correct (uses live overrides) | **Unchanged** |

## 4. Test Cases

### 4.1 P0 — Parity test (must pass)

**Steps:**
1. Place a dine-in order with 3 items totalling ₹500 (item base).
2. Open Collect Bill panel → apply manual ₹50 discount → pay (Cash).
3. Capture the printed bill — record `discount_amount`, `order_subtotal`, `gst_tax`, `cgst_amount`, `sgst_amount`, `payment_amount`.
4. From dashboard, locate the now-paid order — click the printer icon on the OrderCard or TableCard.
5. Capture this dashboard reprint bill — record the same fields.
6. **Pass if** all 6 fields match to the rupee between the two prints.

### 4.2 P0 — No-discount regression (must pass)

**Steps:**
1. Place + pay a dine-in order with NO discount.
2. Reprint from dashboard.
3. **Pass if** the dashboard reprint is identical to today's behavior (sanity check: discount_amount = 0, all other fields unchanged from your latest reference build).

### 4.3 P1 — Tip + discount combo

**Steps:**
1. Place an order, apply ₹50 discount + ₹20 tip at Collect Bill, pay.
2. Reprint from dashboard.
3. **Pass if** Tip line + discount line both appear correctly; SC (if applicable) is computed on post-discount subtotal.

### 4.4 P1 — Cancellation + discount

**Steps:**
1. Place a 4-item dine-in order → cancel 1 item → apply discount → pay.
2. Reprint from dashboard.
3. **Pass if** cancelled item is NOT on the printed bill, discount appears, totals match Collect Bill.

### 4.5 P1 — Walk-in / Takeaway / Delivery channel coverage

**Steps:**
1. Repeat 4.1 for each channel.
2. **Pass if:**
   - Walk-in: SC present (if profile enables it).
   - Takeaway: **no SC line** (BUG-023 gate).
   - Delivery: **no SC line**, `delivery_charge_gst_amount` present in print payload (BUG-083).

### 4.6 P2 — Coupon / loyalty / wallet (regression)

**Steps:**
1. Place an order with a coupon-driven discount path, pay, reprint from dashboard.
2. **Pass if** coupon code + amount are correct (these already cascade via override branch on Collect Bill; dashboard default branch still emits coupon_code='' / 0 — not changed in this bucket).

> Note: Coupon / loyalty / wallet cascade on dashboard reprint is **out of scope** for BUG-050. The Phase 4 owner decision was "match Collect Bill discount_amount" — manual + preset + coupon discounts are grouped into `discount_amount` on Collect Bill, but the dashboard order context does not currently expose them as separate stored fields. If owner wants full cascade for coupon/loyalty/wallet, that's a follow-up CR.

## 5. Automated Validation Already Performed

- ESLint: clean.
- Jest full suite: 34 suites, 496 tests — all pass.
- Webpack compile: green.
- Dev server: HTTP 200 (local + external preview).

## 6. Frozen Business Rules Verified

PAY-001/002/004/007/008, TAX-001/002/003/005/008, SC-001/002/003/006, TIP-001/002, ROUND-002, TOTALS-001/002, DEL-004/005, AD-101, REQ3, BUG-018/021 — all preserved (see Implementation Report §6).

## 7. Known Constraints

1. **Discount source is the order-level total only** — does not split into manual + coupon + preset on the dashboard reprint. The Collect Bill path does this via live UI overrides; dashboard reprint cannot reconstruct the split from stored data without backend providing the breakdown. This matches owner Option A intent (parity on the `discount_amount` total field).

2. **Loyalty / wallet amounts** — still default to 0 on the dashboard reprint default branch (out of scope for BUG-050; tracked for a follow-up CR if needed).

3. **BUG-057 / BUG-059 not yet started** — Wave 4 is incomplete until those two buckets land.

## 8. Repo State

- Branch: `17-may`
- Base commit (no commits made by this agent): `e0293f8c22339ae60eab8ff7e08dbc31cca0b29a`
- Diff: +21 / -2 lines in one file.

---

*— End of Wave 4 BUG-050 QA Handoff —*
