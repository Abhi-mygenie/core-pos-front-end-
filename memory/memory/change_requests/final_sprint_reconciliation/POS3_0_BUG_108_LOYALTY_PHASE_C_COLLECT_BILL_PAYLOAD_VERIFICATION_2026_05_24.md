# POS 3.0 BUG-108 — Loyalty Phase C Collect Bill Payload Verification

**Date:** 2026-05-24
**Persona:** Senior POS3.0 BUG-108 Loyalty Phase C Collect Bill Payload Verification Agent
**Mode:** Verification only — no code changes, no data mutation

---

## 1. Status

```
bug_108_loyalty_phase_c_collect_bill_payload_verified_ready_for_joint_qa
```

Payload matches CRM max-redeemable. Loyalty fields present and correct. No direct redeem call. No blocking gaps.

---

## 2. Docs Read

1. Frozen plan (§4, §6, §7)
2. POS implementation report (§4, §8)
3. POS QA handoff
4. CRM verification report

---

## 3. Payload Sample Reviewed

Owner-provided Bill Payment payload for order 868911, restaurant 689 (Kunafa Mahal), customer abhishek jain (Gold, 4588 pts).

3 items: ₹349 + ₹389 + ₹389 = **₹1127 item total**.

---

## 4. Payload Path Classification

**Bill Payment** (`POST /api/v2/vendoremployee/order/order-bill-payment`)

Evidence: contains `order_id`, `payment_mode`, `payment_amount`, `payment_status`, `food_detail[]`, `waiter_id`, `restaurant_name` — all Bill Payment transform fields from `orderTransform.collectBillExisting()`.

---

## 5. Loyalty Fields Found

| Field | Value in payload | Expected per frozen plan | Verdict |
|-------|-----------------|------------------------|---------|
| `used_loyalty_point` | **1127** | `max_points_redeemable` from CRM | **PASS** ✅ |
| `loyalty_redemption_id` | **null** | `null` (POS Backend generates) | **PASS** ✅ |
| `use_wallet_balance` | **0** | 0 (wallet disabled) | **PASS** ✅ |
| `discount_value` | **1127** | Total discount including loyalty | **PASS** ✅ |
| `self_discount` | **0** | No manual discount | **PASS** ✅ |
| `coupon_discount` | **0** | Coupon disabled | **PASS** ✅ |
| `comm_discount` | **0** | No preset discount | **PASS** ✅ |

**Note on `loyalty_dicount_amount`:** This field is in the **PRINT** payload (orderTransform L1773), NOT the Bill Payment payload. This is by design — the Bill Payment transform includes `used_loyalty_point` (int points) and the Print transform includes `loyalty_dicount_amount` (rupee value). The owner's payload is the Bill Payment path, so absence of `loyalty_dicount_amount` is expected.

---

## 6. Max-Redeemable Match Check

CRM `/pos/max-redeemable` response for `bill_amount=1127` (verified live):

```json
{
  "max_points_redeemable": 1127,
  "max_discount_value": 1127.0,
  "ratio_per_point": 1.0,
  "tier": "Gold",
  "available_points": 4588,
  "min_redemption_points": 100,
  "loyalty_enabled": true
}
```

| Payload field | Payload value | CRM value | Match? |
|--------------|---------------|-----------|--------|
| `used_loyalty_point` | 1127 | `max_points_redeemable: 1127` | **EXACT MATCH** ✅ |
| `discount_value` | 1127 | `max_discount_value: 1127.0` | **MATCH** (total discount = loyalty only) ✅ |
| `payment_amount` | 0 | 1127 - 1127 = 0 | **CORRECT** (full loyalty coverage) ✅ |

---

## 7. Customer Identity Field Check

| Field | Value | Purpose |
|-------|-------|---------|
| `name` | `""` | TAB contact (empty for cash — expected) |
| `mobile` | `""` | TAB contact (empty for cash — expected) |
| `order_id` | `"868911"` | Order reference — POS Backend resolves customer from order context |

**Customer identity is NOT explicitly in the Bill Payment payload** — it's in the order record on POS Backend. The order was created with customer abhishek jain attached. POS Backend resolves customer_id from the order_id.

This is the existing POS architecture — bill payment payloads reference orders, not customers directly.

---

## 8. Bill Amount / Net Amount Check

| Field | Value | Derivation |
|-------|-------|------------|
| `order_sub_total_amount` | 1127 | Item total (349 + 389 + 389) |
| `used_loyalty_point` | 1127 | CRM max-redeemable (bill-amount capped) |
| `discount_value` | 1127 | Total discount = loyalty only |
| `order_sub_total_without_tax` | 0 | Subtotal after discount = 1127 - 1127 = 0 |
| `total_gst_tax_amount` | 0 | Tax on 0 subtotal = 0 |
| `payment_amount` | 0 | Grand total after all deductions |
| `grant_amount` | 0 | Same |

**Earn-on-net calculation:** CRM can compute `order_amount - redeemed_value = 1127 - 1127 = 0`. No earn on a fully-loyalty-covered bill. This is correct.

**Note:** The new CRM endpoint (`loyalty-trigger-fix`) does NOT have the ₹664 absolute cap that the old endpoint (`crm-may-branch`) had. This allows full ₹1127 redemption. This is a CRM-side configuration decision, not a POS issue.

---

## 9. CRM Redemption Helper Readiness

| Data needed by CRM | Available? | Source |
|--------------------|-----------|--------|
| Customer ID | YES | POS Backend resolves from `order_id` |
| Points to deduct | YES | `used_loyalty_point: 1127` |
| Order reference | YES | `order_id: "868911"` |
| Restaurant context | YES | POS Backend knows from auth/order |
| Rupee discount amount | DERIVABLE | `used_loyalty_point * ratio_per_point` = 1127 * 1.0 = 1127 |

**CRM has enough data to process redemption.** The rupee amount can be derived from points × ratio (CRM knows the ratio). `used_loyalty_point` is the primary field.

---

## 10. Old Direct Redeem Field Check

| Old field | Present? | Verdict |
|-----------|----------|---------|
| `transaction_id` from `/pos/loyalty/redeem` | **NO** | ✅ Correct — removed |
| Orphan-debit localStorage keys | **NO** | ✅ Correct — removed |
| `redeemState` / `redemption` fields | **NO** | ✅ Correct — removed |
| Any `idempotency_key` from POS | **NO** | ✅ Correct — POS Backend handles |

---

## 11. Gate / Flag Check

| Gate | Current state | Effect on payload | Verdict |
|------|--------------|-------------------|---------|
| `loyaltyRatioLive` | `true` | `used_loyalty_point = value` (not force-zeroed) | **PASS** ✅ |
| `loyaltyRedeemLive` | `false` | **No longer in payload gate** — removed from AND | **PASS** ✅ |
| Payload gate in orderTransform L1358 | `loyaltyRatioLive ? (discounts.loyaltyPointsRedeemed \|\| 0) : 0` | Sends CRM value when true | **PASS** ✅ |

**No old gates blocking the payload.** The `loyaltyRedeemLive` flag was removed from the payload AND gate per frozen plan §7.4.

---

## 12. Mapping / Spelling Check

| Field | Spelling | Contract | Verdict |
|-------|---------|----------|---------|
| `used_loyalty_point` | Correct | Existing POS backend contract | **PASS** ✅ |
| `loyalty_dicount_amount` (PRINT only) | Missing 's' in 'discount' — **intentional** per frozen plan §15.3 | Existing POS backend contract | **PASS** ✅ |
| `loyalty_redemption_id` | Correct | New field, null from POS Frontend | **PASS** ✅ |

---

## 13. Missing Fields / Gaps

| # | Potential gap | Severity | Assessment |
|---|-------------|----------|------------|
| 1 | `loyalty_dicount_amount` not in bill payment payload | **NON-BLOCKING** | By design — field is in PRINT payload only (orderTransform L1773). CRM can derive rupee amount from `used_loyalty_point * ratio`. |
| 2 | Customer ID not explicit in bill payment | **NON-BLOCKING** | Existing architecture — POS Backend resolves from order_id. Same for all bill payments, not loyalty-specific. |
| 3 | No `loyalty_idempotency_key` from POS Frontend | **NON-BLOCKING** | Frozen plan says POS Backend handles idempotency. |

**Zero blocking gaps.**

---

## 14. Required Fixes

**NONE.** The payload is correctly formed and matches the CRM max-redeemable response exactly.

---

## 15. Joint QA Recommendation

**PROCEED.** The payload verification confirms:
- `used_loyalty_point` matches CRM `max_points_redeemable` exactly (1127 = 1127)
- `loyalty_redemption_id` is null per frozen plan
- No old direct-redeem artifacts
- No blocked gates
- Bill total correctly reflects loyalty discount
- CRM has sufficient data for redemption

---

## 16. Confirmations

| # | Confirmation | Status |
|---|-------------|--------|
| 1 | No code changed | Confirmed |
| 2 | No backend changed | Confirmed |
| 3 | No frontend changed | Confirmed |
| 4 | No data mutated | Confirmed |
| 5 | No mutating API called | Confirmed — only non-mutating max-redeemable verification |
| 6 | No direct redeem API called | Confirmed |
| 7 | `/app/memory/final/` untouched | Confirmed |
| 8 | Baseline docs untouched | Confirmed |

---

**End of Collect Bill Payload Verification.**
