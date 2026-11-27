# BUG-659 — Investigation Report

**Date:** 2026-11-07
**Investigator:** Agent (Investigation Role)
**Reported by:** Owner
**Order reference:** #001423 (order_id 1537857), Restaurant Mantri (RID 675)

---

## 1. Summary

**Root cause:** Three manual/re-print code paths — `PrintBillButton` (RePrintButton.jsx), `OrderCard.handlePrintBill`, and `TableCard.handlePrintBill` — all call `printOrder()` with minimal overrides that LACK `discountPercent`, `roundoff`, and `discountAmount`. This causes `buildBillPrintPayload` to enter its "default branch" which:

1. **OMITS** `discount_percentage` entirely (conditional spread, no fallback to stored order)
2. **OMITS** `roundoff` entirely (conditional spread, no fallback to stored order)
3. Falls `discount_amount` back to `order.discount` (from backend's `restaurant_discount_amount`), which was `null` in the `get-single-order-new` API response — resulting in `discount_amount: 0`

**Classification:** FE_BUG
**Confidence:** HIGH (traced through code + confirmed with user payload evidence + curl probes)
**Steps used:** 5/10

---

## 2. Bug Description

When a **prepaid order** is placed with a discount percentage and round-off:
- The **auto-generated bill** correctly includes `roundoff`, `discount_percentage`, and `discount_amount` in the `order-temp-store` API payload.
- When the bill is **manually reprinted** (via "Print Bill" on the order entry page, dashboard OrderCard, or dashboard TableCard), these keys are missing or zeroed.

Similarly, for a **postpaid order** with round-off applied, generating the bill from the dashboard or order page also omits `roundoff`.

---

## 3. Evidence — User-Provided Payloads

### Auto-generated bill (CORRECT — at order placement):

| Field | Value |
|-------|-------|
| `discount_amount` | 119.05 |
| `discount_percentage` | 50 |
| `roundoff` | 0.5 |
| `payment_amount` | 138 |
| `gst_tax` | 6.54 |
| `cgst_amount` | 3.27 |
| `sgst_amount` | 3.27 |

### Manual Print Bill (BROKEN — from order entry page):

| Field | Value |
|-------|-------|
| `discount_amount` | **0** ← should be 119.05 |
| `discount_percentage` | **ABSENT** ← should be 50 |
| `roundoff` | **ABSENT** ← should be ~0.50 |
| `payment_amount` | 138.01 ← should be 138 |
| `gst_tax` | 6.56 ← should be 6.54 |
| `cgst_amount` | 3.28 |
| `sgst_amount` | 3.28 |

---

## 4. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|-------|--------|---------|
| H1 | PrintBillButton does not pass discount/roundoff overrides | Code trace: RePrintButton.jsx L115-118 | 1 | **CONFIRMED** | Overrides object only has `serviceChargeTaxPct` + `deliveryChargeGstPct` |
| H2 | `buildBillPrintPayload` has no fallback for `discount_percentage` and `roundoff` from stored order | Code trace: orderTransform.js L2171-2173 | 1 | **CONFIRMED** | Both use conditional spreads gated on `overrides.discountPercent > 0` and `overrides.roundoff !== 0` — no order-field fallback |
| H3 | Backend `get-single-order-new` was not returning discount/roundoff fields | Curl probe: POST get-single-order-new for order 1537857 | 1 | **CONFIRMED (pre-fix)** | All discount fields returned `null`, `round_up: null`, `order_details[].discount_on_food: null` |
| H4 | `employee-orders-list` has the data that `get-single-order-new` was missing | Curl probe: GET employee-orders-list | 1 | **CONFIRMED** | `restaurant_discount_amount: 119.05`, `discount_value: 50.00`, per-item `discount_on_food: 61.91/57.14` — all present |
| H5 | Same bug exists in OrderCard and TableCard print paths | Code trace: OrderCard.jsx L257, TableCard.jsx L232 | 1 | **CONFIRMED** | Identical minimal overrides pattern |

---

## 5. Data Flow Trace

### Working Path (Auto-print on prepaid order — CollectPaymentPanel → OrderEntry):

```
CollectPaymentPanel.handleConfirm()
  → builds paymentData with roundOff, discounts.orderDiscountPercent, discounts.manual+preset
  → OrderEntry.onPaymentComplete (L2243) → autoPrintNewOrderIfEnabled (L2268)
  → builds autoPrintOverrides with:
      discountPercent: paymentData.discounts.orderDiscountPercent  (L2326)
      roundoff:        paymentData.roundOff                        (L2327)
      discountAmount:  computed from paymentData.discounts          (L2316-2320)
  → printOrder(..., autoPrintOverrides) (L2355)
  → buildBillPrintPayload(order, scPct, overrides) — hasFinancialOverrides=TRUE (L1901)
  → Payload includes discount_percentage, roundoff, discount_amount ✅
```

### Broken Path (Manual Print Bill — PrintBillButton):

```
PrintBillButton.handlePrintBill() (RePrintButton.jsx L105)
  → printOrder(orderId, 'bill', null, order, scPctForPrint, {
      serviceChargeTaxPct: ...,     ← ONLY these two fields
      deliveryChargeGstPct: ...,
    }) (L115-118)
  → buildBillPrintPayload(order, scPct, overrides) — hasFinancialOverrides=FALSE (L1901)
  → MANUAL PRINT PATH (L1983-2033):
      discount_amount:    falls back to order.discount = 0 ❌
      discount_percentage: overrides.discountPercent undefined → OMITTED ❌
      roundoff:            overrides.roundoff undefined → OMITTED ❌
```

### BREAK POINTS:

| # | Location | Issue |
|---|----------|-------|
| 1 | `RePrintButton.jsx:115-118` | Missing override keys (`discountPercent`, `roundoff`, `discountAmount`) |
| 2 | `OrderCard.jsx:257-260` | Same missing overrides |
| 3 | `TableCard.jsx:232-235` | Same missing overrides |
| 4 | `orderTransform.js:2169` | `discount_amount` fallback `order.discount` = 0 (backend returned null) |
| 5 | `orderTransform.js:2171` | `discount_percentage` conditional spread with no fallback |
| 6 | `orderTransform.js:2172-2173` | `roundoff` conditional spread with no fallback |

---

## 6. Relationship to CR-513

CR-513 (GATE_5A_IMPLEMENTED, awaiting QA) added `discount_percentage` + `roundoff` to the **6 live Collect-Bill paths** (P1-P4). It deliberately EXCLUDED manual reprint paths (P5-P7) as "Option A scope."

CR-513 Impact Analysis §2b explicitly documented:
> "P5-P7 send 0 (absent-equivalent; backend treats absent as 0)"
> "`discount_percentage` cannot be reliably derived FE-side"
> "`roundoff` is not exposed at all in running/single-order APIs"

**This bug is the deferred P5 scope from CR-513's Option C follow-up.**

---

## 7. API Probe — `get-single-order-new` vs `employee-orders-list`

### Pre-Backend-Fix (2026-11-07 initial probe):

| Field | `employee-orders-list` | `get-single-order-new` |
|-------|:-----:|:-----:|
| `restaurant_discount_amount` | **119.05** ✅ | null ❌ |
| `discount_value` | **50.00** ✅ | null ❌ |
| `discount_type` | None | None |
| `order_discount` | **119.05** ✅ | null ❌ |
| `round_up` | None | None |
| `gst_tax` | **5.96** ✅ | null ❌ |
| `order_details` count | **2 items** ✅ | **2 items** ✅ |
| Per-item `discount_on_food` | **61.91/57.14** ✅ | null/null ❌ |
| Per-item `gst_tax_amount` | **3.10/2.86** ✅ | null/null ❌ |

**Finding:** `get-single-order-new` was missing 6+ financial fields that `employee-orders-list` had for the SAME order.

### Post-Backend-Fix (2026-11-07, after backend deployed fix):

| Field | `employee-orders-list` | `get-single-order-new` (FIXED) | Match? |
|-------|:-----:|:-----:|:-----:|
| `restaurant_discount_amount` | 119.05 | **119.05** | ✅ |
| `discount_value` | 50.00 | **50.00** | ✅ |
| `discount_type` | None | **Percent** | ✅ GSN better (new field!) |
| `order_discount_type` | None | **Percent** | ✅ GSN better (new field!) |
| `order_discount` | 119.05 | **119.05** | ✅ |
| `round_up` | None | **0.49** | ✅ GSN better (new field!) |
| `gst_tax` | 5.96 | **6.56** | ⚠️ Different semantics (see §8) |
| `order_details` count | 2 | **2** | ✅ |
| Per-item `discount_on_food` | 61.91/57.14 | **61.91/57.14** | ✅ |
| Per-item `gst_tax_amount` | 3.10/2.86 | **3.10/2.86** | ✅ |
| `coupon_discount` | 0 | null | ✅ (equivalent) |

**Backend fix VERIFIED:** All previously-null fields are now populated with correct values. Three fields (`discount_type`, `order_discount_type`, `round_up`) are NEW — not even available in `employee-orders-list`.

---

## 8. Amount Verification

### Discount Amount ✅

```
Per-item discount:  food 1 = 61.91, food 2 = 57.14
Sum:                61.91 + 57.14 = 119.05
Backend field:      restaurant_discount_amount = 119.05 ✅
Auto-print payload: discount_amount = 119.05 ✅
```

### Discount Percentage ✅

```
Backend field:   discount_value = 50.00, discount_type = Percent
Verification:    50% of order_sub_total_amount(238.10) = 119.05 = restaurant_discount_amount ✅
Auto-print:      discount_percentage = 50 ✅
```

### Round-Up ⚠️ (1-paise pre-existing divergence)

```
Backend stores:     round_up = 0.49, order_amount = 138.01
FE auto-print sent: roundoff = 0.50, payment_amount = 138

ROOT CAUSE OF 1-PAISE DIFFERENCE:
  Frontend (CollectPaymentPanel):
    • Applies discount-ratio to GST → computes GST = 6.54
    • Raw total = 130.96 + 6.54 = 137.50
    • ceil(137.50) = 138  →  roundoff = 0.50

  Backend:
    • Computes GST as straight 5% on post-discount items → GST = 5.96
    • Plus SC GST 5% on 11.91 = 0.60 → total GST = 6.56
    • Raw total = 130.96 + 6.56 = 137.52
    • ceil(137.52) = 138  →  round_up = 0.48 (stored as 0.49)

  The 2-paise GST difference (6.54 FE vs 6.56 backend) is a pre-existing
  FE↔backend computation divergence in how discount is applied to GST.
  This is NOT a new bug from the backend fix.
```

### GST ⚠️ (Different semantics between APIs)

```
employee-orders-list gst_tax:    5.96  (items-only GST, excludes SC GST)
get-single-order-new gst_tax:    6.56  (items + SC GST)
FE auto-print gst_tax:           6.54  (FE discount-ratio method)

All three are "correct" under their own computation method.
```

---

## 9. Affected Code Paths

### Broken (P5 — manual reprint, this bug):

| # | File | Line | Function | Overrides passed |
|---|------|------|----------|-----------------|
| P5a | `RePrintButton.jsx` | 115-118 | `PrintBillButton.handlePrintBill` | Only `serviceChargeTaxPct` + `deliveryChargeGstPct` |
| P5b | `OrderCard.jsx` | 257-260 | `handlePrintBill` | Identical minimal overrides |
| P5c | `TableCard.jsx` | 232-235 | `handlePrintBill` | Identical minimal overrides |

### Also affected (P6 — report reprints):

| # | File | Line | Function |
|---|------|------|----------|
| P6a | `AllOrdersReportPage.jsx` | 821-857 | `handlePrintBillFromAudit` |
| P6b | `OrderReportBetaPage.jsx` | 333-356 | reprint callback |

### Working (P1-P4 — auto-print, for comparison):

| # | File | Line | Function |
|---|------|------|----------|
| W1 | `OrderEntry.jsx` | 2321-2340 | `autoPrintNewOrderIfEnabled` (prepaid) |
| W2 | `OrderEntry.jsx` | 2609-2628 | postpaid collect-bill auto-print |
| W3 | `CollectPaymentPanel.jsx` | 1314-1370 | `handlePrintBill` (manual from Collect Bill) |
| W4-W6 | `OrderEntry.jsx` | L1716/L1757/L1835 | QSR auto-print ×3 |

---

## 10. Backend Fix Verification

**Status: VERIFIED ✅**

`get-single-order-new` now returns all fields needed for the FE fix:

| Field | Needed for | Value | Status |
|-------|-----------|-------|--------|
| `restaurant_discount_amount` | `discount_amount` in print payload | 119.05 | ✅ Correct |
| `discount_value` | `discount_percentage` (when type=Percent) | 50.00 | ✅ Correct |
| `discount_type` | Distinguishing percent vs flat | Percent | ✅ Correct (NEW field!) |
| `round_up` | `roundoff` in print payload | 0.49 | ⚠️ 1-paise off from FE (0.50), pre-existing |
| Per-item `discount_on_food` | Fallback discount computation | 61.91/57.14 | ✅ Correct |
| Per-item `gst_tax_amount` | Tax computation | 3.10/2.86 | ✅ Correct |

---

## 11. Recommendations

### FE Fix Required

Now that backend returns the fields, the FE needs to:

1. **`fromAPI.order` transform** (orderTransform.js ~L196-245): Map the new backend fields to the order object:
   - `discount_type` → new field (e.g., `order.discountType`)
   - `round_up` → new field (e.g., `order.roundUp`)
   - `discount_value` already mapped? Verify.

2. **`buildBillPrintPayload` default branch** (orderTransform.js L2169-2173): Add fallbacks using the newly-available order fields when overrides are absent:
   - `discount_amount`: already falls back to `order.discount` → now correctly returns 119.05 (was null before fix)
   - `discount_percentage`: add fallback to `order.discountValue` when `order.discountType === 'Percent'`
   - `roundoff`: add fallback to `order.roundUp`

3. **Optional: Fix default branch GST** (L1983-2033): Apply per-item `discount_on_food` reduction to tax computation so manual reprint GST matches auto-print GST.

### Scope

| Component | Change needed |
|-----------|--------------|
| `orderTransform.js` (R5) | Map new fields in `fromAPI.order` + add fallbacks in `buildBillPrintPayload` |
| `RePrintButton.jsx` | No change needed (fix is in builder) |
| `OrderCard.jsx` | No change needed |
| `TableCard.jsx` | No change needed |

**Risk:** CRITICAL (financial, print, R5 hotspot). Full gate cycle recommended.

---

## 12. Evidence Artifacts

All saved to `/app/memory/evidence/BUG-BILL-REPRINT/`:

| File | Description |
|------|-------------|
| `user_payloads_comparison.json` | Auto vs manual payload side-by-side |
| `employee_orders_list_probe.json` | employee-orders-list field values for order 1537857 |
| `employee_orders_list_vs_get_single_order_probe.json` | Pre-fix comparison of both APIs |
| `get_single_order_POST_FIX_probe.json` | Post-fix get-single-order-new response |
| `post_fix_verification_2026_11_07.json` | Full post-fix verification with match analysis |
| `paid_order_list_probe.json` | paid-order-list probe (backend field availability) |
| `get_single_order_1537857_probe.json` | Pre-fix get-single-order-new for order 1537857 |

---

**Investigation complete.**
**Root cause: FE_BUG — 3 manual-print paths pass minimal overrides; backend now returns the needed fields.**
**Backend fix: VERIFIED ✅ — all discount/roundoff fields populated correctly (1-paise roundoff divergence is pre-existing).**
**Next: FE implementation to read new backend fields and wire them into the default print path.**
