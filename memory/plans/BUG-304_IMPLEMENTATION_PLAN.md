# BUG-304 — Gate 3 Implementation Plan
**Date:** 2026-08-11
**Based on:** `impact/BUG-304_IMPACT_ANALYSIS.md` (Gate 2 complete, all ODs locked)
**Owner Gate 4 GO:** OD-1/2/3/4 confirmed by owner 2026-08-11
**Risk:** HIGH (R5 hotspot files + R6 financial computation)

---

## Scope Lock

**WILL change:**
- `src/components/order-entry/CollectPaymentPanel.jsx` — E1 (taxTotals) + E2 (discountRatio + GST + VAT)
- `src/components/order-entry/CartPanel.jsx` — E3 (taxTotals) + E4 (discountRatio + GST + VAT)

**WILL NOT touch:**
- `src/api/transforms/orderTransform.js` — OD-4 PARKED → BUG-304-B separate sprint
- Any other file — no route, context, API, or registry-schema change

---

## Entry Verification (confirmed 2026-08-11)

| File | Expected current state | Verified |
|---|---|---|
| `CollectPaymentPanel.jsx` taxTotals | `let sgst=0, cgst=0, vat=0` — 3 buckets, `billableItems.forEach(...)` | ✅ |
| `CollectPaymentPanel.jsx:605` | `const discountRatio = itemTotal > 0 ? totalDiscount / itemTotal : 0;` | ✅ |
| `CollectPaymentPanel.jsx:609` | `const itemGstPostDiscount = (taxTotals.sgst + taxTotals.cgst) * (1 - discountRatio);` | ✅ |
| `CollectPaymentPanel.jsx:650` | `const vat = taxTotals.vat * (1 - discountRatio);` | ✅ |
| `CartPanel.jsx` taxTotals | Same 3-bucket pattern, single-line return | ✅ |
| `CartPanel.jsx:425` | `const discountRatio = itemTotal > 0 ? totalDiscount / itemTotal : 0;` | ✅ |
| `CartPanel.jsx:426` | `const itemGstPostDiscount = (taxTotals.sgst + taxTotals.cgst) * (1 - discountRatio);` | ✅ |
| `CartPanel.jsx:433` | `const vatAmount = taxTotals.vat * (1 - discountRatio);` | ✅ |

---

## Execution Sequence

### E1 — `CollectPaymentPanel.jsx`: Extend `taxTotals` useMemo to split by discountability

**Location:** The `taxTotals` useMemo block, which starts with `// Item GST proration via...` comment

**Current code:**
```javascript
  // Item GST proration via `discountRatio` still uses billableItems-derived totals.)
  const taxTotals = useMemo(() => {
    let sgst = 0, cgst = 0, vat = 0;
    billableItems.forEach(item => {
      const tax = item.tax;
      if (!tax || tax.percentage === 0) return;
      const linePrice = getItemLinePrice(item);
      let taxAmt;
      if (tax.isInclusive) {
        taxAmt = linePrice - (linePrice / (1 + tax.percentage / 100));
      } else {
        taxAmt = linePrice * (tax.percentage / 100);
      }
      // Split into SGST + CGST for GST type (India dine-in)
      if ((tax.type || 'GST').toUpperCase() === 'GST') {
        sgst += taxAmt / 2;
        cgst += taxAmt / 2;
      } else if ((tax.type || '').toUpperCase() === 'VAT') {
        // VAT items: full taxAmt accumulates into single VAT bucket
        // (no SGST/CGST half-split). See VAT_FIX_IMPLEMENTATION_HANDOVER.md.
        vat += taxAmt;
      }
    });
    return {
      sgst: Math.round(sgst * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      vat:  Math.round(vat  * 100) / 100,
    };
  }, [billableItems]);
```

**New code:**
```javascript
  // BUG-304: taxTotals now splits discountable vs non-discountable GST/VAT so
  // itemGstPostDiscount only reduces the discountable portion.
  const taxTotals = useMemo(() => {
    let sgst = 0, cgst = 0, vat = 0;
    let dSgst = 0, dCgst = 0, dVat = 0; // BUG-304: discountable-only buckets
    billableItems.forEach(item => {
      const tax = item.tax;
      if (!tax || tax.percentage === 0) return;
      const linePrice = getItemLinePrice(item);
      const isDiscountable = item.giveDiscount !== false; // BUG-304
      let taxAmt;
      if (tax.isInclusive) {
        taxAmt = linePrice - (linePrice / (1 + tax.percentage / 100));
      } else {
        taxAmt = linePrice * (tax.percentage / 100);
      }
      // Split into SGST + CGST for GST type (India dine-in)
      if ((tax.type || 'GST').toUpperCase() === 'GST') {
        sgst += taxAmt / 2; cgst += taxAmt / 2;
        if (isDiscountable) { dSgst += taxAmt / 2; dCgst += taxAmt / 2; } // BUG-304
      } else if ((tax.type || '').toUpperCase() === 'VAT') {
        // VAT items: full taxAmt accumulates into single VAT bucket
        // (no SGST/CGST half-split). See VAT_FIX_IMPLEMENTATION_HANDOVER.md.
        vat += taxAmt;
        if (isDiscountable) { dVat += taxAmt; } // BUG-304
      }
    });
    return {
      sgst: Math.round(sgst * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      vat:  Math.round(vat  * 100) / 100,
      dSgst: Math.round(dSgst * 100) / 100, // BUG-304: discountable portion
      dCgst: Math.round(dCgst * 100) / 100,
      dVat:  Math.round(dVat  * 100) / 100,
    };
  }, [billableItems]);
```

---

### E2 — `CollectPaymentPanel.jsx`: Fix `discountRatio`, `itemGstPostDiscount`, and `vat`

**Current code:**
```javascript
  const discountRatio = itemTotal > 0 ? totalDiscount / itemTotal : 0;
  const scTaxRate     = (restaurant?.serviceChargeTaxPct  || 0) / 100;
  const delTaxRate    = (restaurant?.deliveryChargeGstPct || 0) / 100;

  const itemGstPostDiscount = (taxTotals.sgst + taxTotals.cgst) * (1 - discountRatio);
```

**New code:**
```javascript
  // BUG-304: use discountableTotal as denominator; only discount-eligible items' GST reduced
  const discountableRatio = discountableTotal > 0 ? totalDiscount / discountableTotal : 0;
  const scTaxRate         = (restaurant?.serviceChargeTaxPct  || 0) / 100;
  const delTaxRate        = (restaurant?.deliveryChargeGstPct || 0) / 100;

  // BUG-304: discountable items' GST reduced by ratio; non-discountable GST unchanged
  const itemGstPostDiscount =
    (taxTotals.dSgst + taxTotals.dCgst) * (1 - discountableRatio)   // discountable portion ↓
    + (taxTotals.sgst - taxTotals.dSgst) + (taxTotals.cgst - taxTotals.dCgst); // non-discountable unchanged
```

**And separately, the `vat` line (~line 650):**

**Current code:**
```javascript
  const vat = taxTotals.vat * (1 - discountRatio);
```

**New code:**
```javascript
  // BUG-304: same split for VAT (OD-2 confirmed)
  const vat = taxTotals.dVat * (1 - discountableRatio) + (taxTotals.vat - taxTotals.dVat);
```

> **Note on `_cr013` parity check:** The CR-013 parity guardrail at line ~623 checks `_cr013ComponentSum === _cr013Composite`. These two variables are computed as `itemGstPostDiscount + components` and `totalGst` — they are structurally equal by construction, so the check still passes (diff always 0). No change needed to the guardrail.

---

### E3 — `CartPanel.jsx`: Extend `taxTotals` useMemo (same pattern as E1)

**Current code:**
```javascript
  const taxTotals = useMemo(() => {
    let sgst = 0, cgst = 0, vat = 0;
    billableItems.forEach(item => {
      const tax = item.tax;
      if (!tax || tax.percentage === 0) return;
      const linePrice = getItemLinePrice(item);
      let taxAmt;
      if (tax.isInclusive) {
        taxAmt = linePrice - (linePrice / (1 + tax.percentage / 100));
      } else {
        taxAmt = linePrice * (tax.percentage / 100);
      }
      if ((tax.type || 'GST').toUpperCase() === 'GST') {
        sgst += taxAmt / 2;
        cgst += taxAmt / 2;
      } else if ((tax.type || '').toUpperCase() === 'VAT') {
        vat += taxAmt;
      }
    });
    return { sgst: Math.round(sgst * 100) / 100, cgst: Math.round(cgst * 100) / 100, vat: Math.round(vat * 100) / 100 };
  }, [billableItems]);
```

**New code:**
```javascript
  // BUG-304: split discountable vs non-discountable GST/VAT (mirrors CPP E1)
  const taxTotals = useMemo(() => {
    let sgst = 0, cgst = 0, vat = 0;
    let dSgst = 0, dCgst = 0, dVat = 0; // BUG-304: discountable-only buckets
    billableItems.forEach(item => {
      const tax = item.tax;
      if (!tax || tax.percentage === 0) return;
      const linePrice = getItemLinePrice(item);
      const isDiscountable = item.giveDiscount !== false; // BUG-304
      let taxAmt;
      if (tax.isInclusive) {
        taxAmt = linePrice - (linePrice / (1 + tax.percentage / 100));
      } else {
        taxAmt = linePrice * (tax.percentage / 100);
      }
      if ((tax.type || 'GST').toUpperCase() === 'GST') {
        sgst += taxAmt / 2; cgst += taxAmt / 2;
        if (isDiscountable) { dSgst += taxAmt / 2; dCgst += taxAmt / 2; } // BUG-304
      } else if ((tax.type || '').toUpperCase() === 'VAT') {
        vat += taxAmt;
        if (isDiscountable) { dVat += taxAmt; } // BUG-304
      }
    });
    return {
      sgst: Math.round(sgst * 100) / 100, cgst: Math.round(cgst * 100) / 100, vat: Math.round(vat * 100) / 100,
      dSgst: Math.round(dSgst * 100) / 100, dCgst: Math.round(dCgst * 100) / 100, dVat: Math.round(dVat * 100) / 100, // BUG-304
    };
  }, [billableItems]);
```

---

### E4 — `CartPanel.jsx`: Fix `discountRatio`, `itemGstPostDiscount`, `vatAmount`

**Current code:**
```javascript
  // GST on components
  const discountRatio = itemTotal > 0 ? totalDiscount / itemTotal : 0;
  const itemGstPostDiscount = (taxTotals.sgst + taxTotals.cgst) * (1 - discountRatio);
  const scGst = serviceCharge * scTaxRate;
  const tipGst = tip * scTaxRate;
  const deliveryGst = deliveryCharge * delTaxRate;
  const totalGst = itemGstPostDiscount + scGst + tipGst + deliveryGst;
  const sgst = Math.round((totalGst / 2) * 100) / 100;
  const cgst = Math.round((totalGst / 2) * 100) / 100;
  const vatAmount = taxTotals.vat * (1 - discountRatio);
```

**New code:**
```javascript
  // GST on components
  // BUG-304: use discountableTotal as denominator; only discount-eligible items' GST/VAT reduced
  const discountableRatio = discountableTotal > 0 ? totalDiscount / discountableTotal : 0;
  const itemGstPostDiscount =
    (taxTotals.dSgst + taxTotals.dCgst) * (1 - discountableRatio)
    + (taxTotals.sgst - taxTotals.dSgst) + (taxTotals.cgst - taxTotals.dCgst); // BUG-304
  const scGst = serviceCharge * scTaxRate;
  const tipGst = tip * scTaxRate;
  const deliveryGst = deliveryCharge * delTaxRate;
  const totalGst = itemGstPostDiscount + scGst + tipGst + deliveryGst;
  const sgst = Math.round((totalGst / 2) * 100) / 100;
  const cgst = Math.round((totalGst / 2) * 100) / 100;
  const vatAmount = taxTotals.dVat * (1 - discountableRatio) + (taxTotals.vat - taxTotals.dVat); // BUG-304
```

---

## Verification Matrix

| # | Edit | File | What to verify | Method |
|---|---|---|---|---|
| V1 | E1 | CPP | `taxTotals` returns 6 keys: sgst, cgst, vat, dSgst, dCgst, dVat | Code inspection |
| V2 | E2 | CPP | `discountableRatio` defined (not `discountRatio`) | Code inspection |
| V3 | E2 | CPP | `itemGstPostDiscount` uses `dSgst+dCgst` (not `sgst+cgst`) | Code inspection |
| V4 | E2 | CPP | `vat` uses `dVat` (not `taxTotals.vat`) + adds non-discountable portion | Code inspection |
| V5 | E3 | CartPanel | Same 6-key taxTotals return | Code inspection |
| V6 | E4 | CartPanel | `discountableRatio` + corrected `itemGstPostDiscount` + `vatAmount` | Code inspection |
| V7 | All | Both | Compile: webpack 0 new warnings | `tail frontend.out.log` |
| V8 | Scenario: all discountable | Browser | Discount applied, all items giveDiscount=true → GST unchanged vs pre-fix | DevTools |
| V9 | Scenario: mixed cart | Browser | Item A (discountable) + Item B (non-discountable) + 20% discount → Item B GST unchanged | DevTools |
| V10 | Scenario: no discount | Browser | discount=0 → discountableRatio=0 → GST unchanged | DevTools |
| V11 | CR-013 guardrail | CPP | `_cr013Diff` still 0 (component sum = composite by construction) | DevTools console |

---

## Regression Risk Assessment

| Scenario | Risk | Why |
|---|---|---|
| All items discountable (most common) | **NONE** — `dSgst = sgst`, `dCgst = cgst`, `dVat = vat` → formula reduces to original | Mathematical identity |
| No discount applied | **NONE** — `discountableRatio = 0` → formula reduces to original | Zero ratio |
| Mixed cart, no non-discountable GST items (e.g., 0% tax on non-discountable item) | **NONE** — `dGst = total GST`, non-discountable delta = 0 | |
| Mixed cart WITH non-discountable items AND discount | **INTENTIONAL CHANGE** — GST is now correct | This is the bug fix |
| SC/Tip/Delivery GST | **NONE** — these use `scTaxRate`/`delTaxRate` unchanged | Not touched |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-304 → status: IMPLEMENTED — AWAITING QA, sprint_key: pos_5_1
- [ ] BUG_TRACKER.md: row updated to IMPLEMENTED — AWAITING QA
- [ ] FILE_OWNERSHIP.md: CollectPaymentPanel.jsx entry + CartPanel.jsx entry for BUG-304
- [ ] Code markers: // BUG-304 in every changed block (already in plan above)
- [ ] Compile: webpack 0 new warnings
```

---

## QA Handover (pre-seeded)

### Test cases for QA agent:

| # | Test | Setup | Expected |
|---|---|---|---|
| T1 | All-discountable cart, 20% discount | Cart: 2 items both giveDiscount=true | GST = sum(item_gst) × 0.80 |
| T2 | Mixed cart, 20% discount | Item A (₹100, 18%, discountable) + Item B (₹50, 12%, non-discountable) | GST = 18×0.8 + 6 = ₹20.40 |
| T3 | No discount, mixed cart | Same items, discount=0 | GST = ₹18 + ₹6 = ₹24 (unchanged) |
| T4 | 100% non-discountable cart | All items giveDiscount=false, discount applied | GST unchanged = full pre-discount GST |
| T5 | QSR CartPanel same T2 scenario | CartPanel (QSR mode), mixed cart | Same result as T2 |
| T6 | VAT items (OD-2) | Item with VAT (not GST), mixed discountability | Non-discountable VAT unchanged |
| T7 | Flat ₹ discount (not %) | manualDiscount flat amount on mixed cart | Same formula applies |
| T8 | Preset discount type | selectedDiscountType applied on mixed cart | Same formula applies |
| R1 | Regression: no non-discountable items | Standard order, all items eligible | Identical GST to pre-fix |
| R2 | Regression: SC/Tip/Delivery GST | Order with service charge + GST | SC/tip/delivery GST unchanged |

---

**Gate 3 COMPLETE.**
Implementation agent to execute E1→E4 in order. All entry conditions verified. No gate 4 question remaining — owner GO confirmed.
