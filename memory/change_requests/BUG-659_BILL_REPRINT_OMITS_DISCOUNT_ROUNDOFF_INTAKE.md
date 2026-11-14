# BUG-659 — Bill Reprint Omits Discount, Discount Percentage, and Roundoff

**ID:** BUG-659
**Type:** BUG
**Severity:** P0 — CRITICAL
**Risk:** CRITICAL (financial, print, R5 hotspot)
**Area:** Payments / Coupons / Credit
**Sprint:** nov_cr_batch
**Date:** 2026-11-08
**Reported by:** Owner
**Source:** OWNER-REPORTED
**Confidence:** CONFIRMED (reproduced with curl probes + user payload evidence)

---

## Description

When a **prepaid order** is placed with a discount percentage and round-off:
- The **auto-generated bill** (at order placement via CollectPaymentPanel) correctly includes `roundoff`, `discount_percentage`, and `discount_amount` in the `order-temp-store` API payload.
- When the bill is **manually reprinted** (via "Print Bill" on the order entry page, dashboard OrderCard, or dashboard TableCard), these keys are missing or zeroed:
  - `discount_amount`: **0** (should be 119.05)
  - `discount_percentage`: **ABSENT** (should be 50)
  - `roundoff`: **ABSENT** (should be ~0.50)

Similarly, for a **postpaid order** with round-off applied, generating the bill from the dashboard or order page also omits `roundoff`.

**Order reference:** #001423 (order_id 1537857), Restaurant Mantri (RID 675)

---

## Root Cause (from Investigation)

Three manual/re-print code paths — `PrintBillButton` (RePrintButton.jsx), `OrderCard.handlePrintBill`, and `TableCard.handlePrintBill` — all call `printOrder()` with minimal overrides that LACK `discountPercent`, `roundoff`, and `discountAmount`. This causes `buildBillPrintPayload` to enter its "default branch" which:

1. **OMITS** `discount_percentage` entirely (conditional spread, no fallback to stored order)
2. **OMITS** `roundoff` entirely (conditional spread, no fallback to stored order)
3. Falls `discount_amount` back to `order.discount` (from backend's `restaurant_discount_amount`), which was `null` in the `get-single-order-new` API response — resulting in `discount_amount: 0`

**Classification:** FE_BUG
**Confidence:** HIGH
**Investigation steps used:** 5/10

---

## Evidence

- **User payloads comparison:** `/app/memory/evidence/BUG-659/user_payloads_comparison.json`
- **Post-fix API verification:** `/app/memory/evidence/BUG-659/post_fix_verification_2026_11_07.json`
- **Pre-fix API probe:** `/app/memory/evidence/BUG-659/get_single_order_1537857_probe.json`
- **Post-fix API probe:** `/app/memory/evidence/BUG-659/get_single_order_POST_FIX_probe.json`
- **Employee orders list probe:** `/app/memory/evidence/BUG-659/employee_orders_list_probe.json`
- **Full investigation report:** `/app/memory/evidence/BUG-659/INVESTIGATION_REPORT.md`
- Steps to reproduce: Place prepaid order with 50% discount + roundoff → auto-bill correct → reprint via Print Bill button → discount/roundoff missing
- **Source:** OWNER-REPORTED
- **Confidence:** CONFIRMED (owner reproduced + agent curl-verified + code-traced)

---

## Duplicate Check

**RELATED — NOT DUPLICATE**

| Related ID | Relationship | Why DISTINCT |
|---|---|---|
| **CR-513** | This bug IS the deferred P5 scope from CR-513's Option C follow-up | CR-513 deliberately EXCLUDED manual reprint paths (P5-P7). BUG-659 covers exactly that gap. |
| **BUG-592** | Partially overlapping symptom (discount display on reprint) | BUG-592 fixed discount showing as % instead of ₹ (removed `discount_value` fallback). BUG-659 is about discount/roundoff being entirely absent from reprint payload. |
| **BUG-536** | Different symptom (SC GST, not discount/roundoff) | BUG-536 was about service charge GST missing, not discount. |

---

## Backend Fix Status

**Backend fix VERIFIED ✅ (2026-11-07):** `get-single-order-new` API now returns all fields needed for the FE fix:
- `restaurant_discount_amount` = 119.05 ✅
- `discount_value` = 50.00 ✅
- `discount_type` = "Percent" ✅ (NEW field)
- `round_up` = 0.49 ✅ (NEW field, 1-paise pre-existing divergence from FE 0.50)
- Per-item `discount_on_food` = 61.91/57.14 ✅
- Per-item `gst_tax_amount` = 3.10/2.86 ✅

---

## Affected Code Paths

### Broken (P5 — manual reprint, this bug):

| # | File | Line | Function |
|---|------|------|----------|
| P5a | `RePrintButton.jsx` | 115-118 | `PrintBillButton.handlePrintBill` |
| P5b | `OrderCard.jsx` | 257-260 | `handlePrintBill` |
| P5c | `TableCard.jsx` | 232-235 | `handlePrintBill` |

### Also affected (P6 — report reprints):

| # | File | Line | Function |
|---|------|------|----------|
| P6a | `AllOrdersReportPage.jsx` | 821-857 | `handlePrintBillFromAudit` |
| P6b | `OrderReportBetaPage.jsx` | 333-356 | reprint callback |

---

## Blast Radius

- **Primary fix file:** `orderTransform.js` (R5 hotspot)
- **Blast radius estimate:** ~1 R5 file for fix, 5+ consumer paths benefit
- **Hotspot files touched:** YES — `orderTransform.js` (R5)
- **Estimated scope:** SMALL-to-MEDIUM (1 file for fix, but touches financial print pipeline)
- **Pattern references:** `grep -rn "buildBillPrintPayload\|printOrder" /app/frontend/src/` → 20+ references

---

## Risk Classification

- **Risk:** CRITICAL
- **Reason:** Financial (wrong amounts on printed bills), print semantics, R5 hotspot (orderTransform.js), customer-facing
- **Process required:** Full gate cycle — NO Fast Lane
- **Fast Lane eligible:** NO

---

## Scope Recommendation (from Investigation §11)

1. **`fromAPI.order` transform** (orderTransform.js ~L196-245): Map new backend fields (`discount_type`, `round_up`, `discount_value`)
2. **`buildBillPrintPayload` default branch** (orderTransform.js L2169-2173): Add fallbacks for `discount_percentage` and `roundoff` from stored order
3. **Optional:** Fix GST in default branch using per-item `discount_on_food`

**Dependency:** CR-513 QA should complete first (same file, same function)

---

## Open Questions

None — Investigation resolved all unknowns. Backend fields are confirmed available.

---

## Next

Planning agent for Gates 2-3.
