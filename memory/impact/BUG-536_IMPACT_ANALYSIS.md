# BUG-536 — Impact Analysis (Gate 2)

**Date:** 2026-10-12
**Role:** PLANNING (Gate 2 — Impact Analysis only)
**Item:** BUG-536 — SC GST missing from manual bill print
**Risk:** CRITICAL
**Sprint:** oct_cr_batch

---

## Header

**Code Reality:** FULL — gap confirmed at HEAD. L2010 manual path has no SC GST addition.
**Conflict Pre-Check:** ONE FLAGGED — `CR-364-PRINT` (BACKEND-BLOCKED, same function). All others parallel-safe.
**Gate 2 Status:** COMPLETE — zero open owner decisions.

---

## 1. Data Flow Trace

```
Trigger: User clicks "Print Bill" on OrderCard (Dashboard)
         or RePrintButton (Order Taking page)
         ↓
OrderCard.jsx L254 / TableCard.jsx L228 / RePrintButton.jsx L116
  → printOrder(orderId, 'bill', null, orderData, serviceChargePercentage,
               { serviceChargeTaxPct: restaurant.serviceChargeTaxPct, ... })
  NOTE: does NOT pass orderItemTotal → hasFinancialOverrides = false
         ↓
orderService.js L139
  → toAPI.buildBillPrintPayload(orderData, serviceChargePercentage, overrides)
         ↓
orderTransform.js — buildBillPrintPayload (L1795)
  hasFinancialOverrides = overrides.orderItemTotal !== undefined  → FALSE
         ↓
  MANUAL PRINT PATH (L1964–2011):
    serviceChargeAmount = order.serviceTax || 0      ✅  (SC amount correct)
    forEach(billFoodList) → accumulate gst_tax        ✅
    L2010: gst_tax = Math.round(gst_tax * 100) / 100  ← BREAK POINT
           SC GST never added here                    ✗
    L2011: vat_tax = Math.round(vat_tax * 100) / 100
         ↓
  L2052: finalGstTax = overrides.gstTax ?? gst_tax   → carries under-stated gst_tax
         ↓
  payload: { gst_tax: finalGstTax, total_gst_tax_amount: finalGstTax, ... }
         ↓
POST /api/v1/vendoremployee/order-temp-store
  → bill template renders gst_tax WITHOUT SC GST    ✗
```

**BREAK POINT:** L2010 — `serviceChargeAmount * scTaxRate` is never computed or added in the manual path, unlike the collect-bill path (L1954).

**Correct collect-bill path for comparison (L1950–1954):**
```javascript
const scTaxRate = (overrides.serviceChargeTaxPct || 0) / 100;  // declared ✓
gst_tax = discountableGst * (1 - discountableRatio)
        + (gst_tax - discountableGst)
        + serviceChargeAmount * scTaxRate    // ← SC GST added ✓
        + overrideTip * scTaxRate
        + overrideDelivery * delTaxRate;
```

---

## 2. Code Reality Verification (HEAD)

**L2010 (exact text confirmed):**
```javascript
      gst_tax = Math.round(gst_tax * 100) / 100;   // ← SC GST absent above this
```

**L2011 (exact text confirmed):**
```javascript
      vat_tax = Math.round(vat_tax * 100) / 100;
```

**Fix inserts 2 lines AFTER L2010, BEFORE L2011:**
```javascript
      gst_tax = Math.round(gst_tax * 100) / 100;           // L2010 existing — item GST rounded
      const scTaxRateManual = (overrides.serviceChargeTaxPct || 0) / 100; // BUG-536 NEW
      gst_tax = Math.round((gst_tax + serviceChargeAmount * scTaxRateManual) * 100) / 100; // BUG-536 NEW
      vat_tax = Math.round(vat_tax * 100) / 100;           // L2011 existing — unchanged
```

---

## 3. Full Caller Audit

| Caller | Passes serviceChargeTaxPct? | Path taken | After fix |
|--------|----------------------------|------------|-----------|
| `OrderCard.jsx` L254 | ✅ `restaurant?.serviceChargeTaxPct \|\| 0` | MANUAL (no `orderItemTotal`) | **FIXED** — SC GST now added |
| `TableCard.jsx` L228 | ✅ same | MANUAL | **FIXED** |
| `RePrintButton.jsx` L116 | ✅ same | MANUAL | **FIXED** |
| `OrderEntry.jsx` L1061/1122/1453/2211 | ✅ same | MANUAL | **FIXED** |
| `CollectPaymentPanel.handlePrintBill` | passes full `gstTax` override (`overrides.gstTax`) | COLLECT BILL PATH (`hasFinancialOverrides=true`) | No change — collect path unaffected |
| `CartPanel.handleCollectBill` (QSR) | passes `gstTax = printGstTax` | COLLECT BILL PATH | No change |
| `FolioCheckoutPanel.printBill` | passes `{}` → `serviceChargeTaxPct` absent | MANUAL | `scTaxRateManual = 0` → `+0` → **NO REGRESSION** |
| `AllOrdersReportPage.jsx` reprints | passes `{}` | MANUAL | `scTaxRateManual = 0` → **NO REGRESSION** |
| Report-module page reprints | passes `{}` | MANUAL | `scTaxRateManual = 0` → **NO REGRESSION** |

**Safety proof for `{}` callers:** `(overrides.serviceChargeTaxPct || 0) / 100 = 0` → `gst_tax += serviceChargeAmount * 0 = +0` → identical result to today.

---

## 4. `service_gst_tax_amount` field assessment

`buildBillPrintPayload` does **NOT** output a separate `service_gst_tax_amount` field (that field lives in `placeOrder`/`updateOrder`/`collectBill` paths at L919/L1678). The fix therefore only needs to correct `gst_tax` (composite). **No additional field change required.**

---

## 5. Conflict Pre-Check

| Item | Status | Files | Overlap with BUG-536? |
|------|--------|-------|-----------------------|
| **CR-364-PRINT** | INTAKE — **BACKEND-BLOCKED** | `orderTransform.js` (+~30L in `buildBillPrintPayload` when `order.isRoom`) | ⚠️ **POTENTIAL** — same function, different region (isRoom block). When CR-364-PRINT is unblocked, agent must re-verify that BUG-536 fix lines are still in place. Execution order: **BUG-536 FIRST**, then CR-364-PRINT re-integrates on top. |
| CR-412 | GATE_1_INTAKE | `orderTransform.js` (`fromAPI.order` coupon fields) | ✅ Different function — parallel-safe |
| BUG-484 | GATE_5A_IMPLEMENTED | L1505–1509, L1637/1653/1660 | ✅ Different region — parallel-safe |
| CR-409 | GATE_5A_IMPLEMENTED | L447–453 (`fromAPI.order`) | ✅ Different function — no conflict |
| BUG-395 | GATE_5A_IMPLEMENTED | L2193–2205 (delivery address fields) | ✅ Different region in `buildBillPrintPayload` — parallel-safe |

**Last modifier of manual-print region (L1964–2011):** BUG-271 (2026-07-31) — no recent conflict.

---

## 6. Risk Classification

| Attribute | Value |
|-----------|-------|
| Risk | **CRITICAL** |
| Triggers | R5 hotspot (`orderTransform.js`) + R6 financial (tax/GST on printed bill) |
| R5? | YES — `orderTransform.js` is on the R5 list |
| R6? | YES — changes `gst_tax` value on printed bill (financial/tax semantics) |
| Planning-skip eligible? | **NO** — R5 + R6, full gate flow mandatory |
| Owner approval required? | YES — Gate 4 GO required before implementation |
| Regression checklist required? | YES — test collect-bill path unchanged, all caller paths |
| Files WILL change | `orderTransform.js` only |
| Files WILL NOT touch | `OrderCard.jsx` · `TableCard.jsx` · `RePrintButton.jsx` · `OrderEntry.jsx` · `CollectPaymentPanel.jsx` · any other file |

---

## 7. Affected Lines

| File | Lines | Change |
|------|-------|--------|
| `src/api/transforms/orderTransform.js` | After L2010, before L2011 | Insert 2 lines: `scTaxRateManual` const + `gst_tax` re-round with SC GST |

**Total:** 1 file, 2 lines added, 0 lines modified, 0 lines deleted.

---

## 8. Verification Matrix (seeds Gate 3 plan + QA handover)

| # | What to verify | How | Automated? |
|---|---------------|-----|:---:|
| V1 | Manual reprint from OrderCard includes SC GST in `gst_tax` | Curl `order-temp-store` payload after manual print on a dineIn order with SC configured; confirm `gst_tax` = item_gst + (serviceCharge × scTaxRate) | YES (curl) |
| V2 | Collect Bill print path unchanged | Curl `order-temp-store` from Collect Bill; confirm `gst_tax` identical before/after fix | YES (curl) |
| V3 | Caller passing `{}` — no regression | Print from report reprint page; confirm `gst_tax` identical to pre-fix | YES (curl) |
| V4 | `order.serviceTax = 0` order (takeaway) — no regression | Manual print on takeaway order; `scTaxRateManual * 0 = 0` | YES (curl) |
| V5 | webpack compiles 0 new warnings | `yarn build` | YES |

---

## 9. Open Owner Decisions

**None.** Fix is fully scoped. All callers audited. OD-INV-01 (from the SC-GST investigation) was locked as part of intake.

---

## 10. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-536 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
- [ ] BUG_TRACKER.md: BUG-536 row → GATE_5A_IMPLEMENTED + files changed
- [ ] FILE_OWNERSHIP.md: orderTransform.js row added — BUG-536, date, 2 lines inserted L2011-2012
- [ ] Code markers: // BUG-536 on both inserted lines
- [ ] Compile: yarn build exit 0, 0 new warnings
```

---

## 11. Summary

- **Root cause confirmed:** Manual print path (L1964–2011) reads `serviceChargeAmount` but never declares `scTaxRateManual` or adds `serviceChargeAmount * scTaxRate` to `gst_tax`. Collect-bill path does this at L1954.
- **Fix:** 2 lines after L2010. Zero change to any caller or to the collect-bill path.
- **Blast radius:** 1 file, 2 lines, R5 + R6 — CRITICAL risk.
- **No open decisions.**
- **CR-364-PRINT conflict:** logged — execution order BUG-536 first.
- **Planning-skip:** NOT eligible (R5 + R6).

**Next:** Owner "Gate 3 GO" → Implementation Plan → Gate 4 GO → Implementation.
