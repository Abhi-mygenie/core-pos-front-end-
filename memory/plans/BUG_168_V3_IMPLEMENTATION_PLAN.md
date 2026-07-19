# BUG-168 — Impact Analysis + Implementation Plan

**Date:** 2026-07-08
**Agent role:** PLANNING (Alpha v0.7 Role 2) — Gate 2 + Gate 3
**Item:** BUG-168 — Print Subtotal Uses FE Computation Instead of Backend Values
**Risk:** HIGH — hotspot file (`orderTransform.js`) + financial/print semantics
**Code Reality:** PARTIAL — BUG-168 v2 fix exists at L1808-1825 (to be removed as part of this plan)
**Conflict Pre-Check:** No active items in progress on the print section of `orderTransform.js`
**Prerequisite:** ✅ Backend deployed — `employee-orders-list` now returns `order_sub_total_amount` and `order_sub_total_without_tax`

---

# GATE 2: IMPACT ANALYSIS

## 1. Data Flow Trace

```
Backend API (all 3 sources now provide):
  order_sub_total_amount      → 219   (item total, includes addons + variations)
  order_sub_total_without_tax → 240.9 (subtotal = items + SC, before tax)
  total_service_tax_amount    → 21.90 (service charge)
  order_amount                → 250   (final total including tax)

  ↓ fromAPI.order() [L220-222] — CORRECT, no change needed

OrderContext stores:
  order.subtotalAmount    = 219
  order.subtotalBeforeTax = 240.9
  order.serviceTax        = 21.90
  order.amount            = 250

  ↓ Manual print caller (OrderCard/TableCard/RePrintButton)

buildBillPrintPayload(order, scPct, overrides={serviceChargeTaxPct, deliveryChargeGstPct})

  ↓ CURRENT: Falls to FE computation (WRONG)
  ↓ AFTER FIX: Uses order.subtotalAmount / order.subtotalBeforeTax / order.serviceTax directly
```

## 2. Affected File

**Single file:** `frontend/src/api/transforms/orderTransform.js`
- Function: `buildBillPrintPayload` (L1712-2135)
- Specifically: L1795-1965 (computation block + final value assignments)

## 3. Two Print Paths Through `buildBillPrintPayload`

| Path | Caller | `overrides` shape | How it works |
|------|--------|-------------------|-------------|
| **Collect Bill** (auto-print) | OrderEntry.jsx (5 call sites) | `{ orderItemTotal, orderSubtotal, gstTax, vatTax, serviceChargeAmount, paymentAmount, tip, ... }` | Uses overrides directly — **NOT changing** |
| **Manual print** (dashboard/order screen) | OrderCard, TableCard, RePrintButton, AllOrdersReportPage | `{ serviceChargeTaxPct, deliveryChargeGstPct }` (no financial overrides) | Falls to fallback — **THIS IS WHAT CHANGES** |

**Gate:** `overrides.orderItemTotal !== undefined` distinguishes the two paths.

## 4. Downstream Consumers of Output Fields

The print payload emitted by `buildBillPrintPayload` is sent to POST `/api/v1/vendoremployee/order-temp-store`. The backend print template reads these fields:

| Payload field | Source (current — wrong) | Source (after fix) |
|--------------|--------------------------|-------------------|
| `order_item_total` | `computedSubtotal` (FE loop) | `order.subtotalAmount` (backend) |
| `order_subtotal` | FE recomputation (double-counts SC) | `order.subtotalBeforeTax` (backend) |
| `serviceChargeAmount` | FE: `postDiscountSubtotal × scPct` | `order.serviceTax` (backend) |
| `gst_tax` | FE item loop + discount ratio recompute | Backend-derived: `order.amount - order.subtotalBeforeTax` |
| `cgst_amount` / `sgst_amount` | `gst_tax / 2` | Same (derived from corrected `gst_tax`) |
| `vat_tax` | FE item loop | Backend-derived (same formula, correct input) |
| `payment_amount` | `order.amount` | `order.amount` (unchanged) |

## 5. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Collect Bill path accidentally affected | LOW | HIGH | `overrides.orderItemTotal !== undefined` gate ensures Collect Bill path is untouched |
| Tax split (GST vs VAT) incorrect for mixed-tax orders | MEDIUM | MEDIUM | Keep item-level tax loop for GST/VAT split only; remove subtotal/SC computation |
| Complimentary items break | LOW | MEDIUM | Complimentary zeroing (L1743-1783) happens before this block — unaffected |
| Room orders / associated orders break | LOW | MEDIUM | Room enrichment (L1967-2042) uses `finalPaymentAmount` which still comes from `order.amount` — unaffected |

## 6. Owner Decision (from investigation)

**Tax split:** Keep item-level tax loop ONLY for GST/VAT split (Option B). This is the safest approach — the item loop already works for determining which items are GST vs VAT. We just stop using it for subtotal/SC computation.

---

# GATE 3: IMPLEMENTATION PLAN

## Execution Sequence

All edits are in **one file:** `frontend/src/api/transforms/orderTransform.js`
Execute in order (each edit depends on the previous).

---

### EDIT 1: Add `hasFinancialOverrides` gate (L1795)

**Insert BEFORE L1795** (before the computation block):

```js
    // BUG-168 FINAL (2026-07-08): When Collect Bill sends financial overrides,
    // use the existing FE computation path (unchanged). When manual print
    // (OrderCard/TableCard/RePrintButton) calls without financial overrides,
    // use backend values directly — no FE computation.
    const hasFinancialOverrides = overrides.orderItemTotal !== undefined;
```

**Why:** This single boolean gates the entire change. Collect Bill always passes `orderItemTotal`; manual print never does.

---

### EDIT 2: Guard computation block (L1795-1910)

**Wrap L1802-1910 in `if (hasFinancialOverrides)`:**

Current L1795-1910 becomes:

```js
    // --- FE computation (Collect Bill path only) ---
    let gst_tax = 0, vat_tax = 0, computedSubtotal = 0;
    let postDiscountSubtotal = 0;
    let serviceChargeAmount = 0;

    if (hasFinancialOverrides) {
      // EXISTING CODE L1802-1910 UNCHANGED — only runs for Collect Bill
      billFoodList.forEach(item => {
        ... // entire existing loop
      });
      computedSubtotal = Math.round(computedSubtotal * 100) / 100;

      ... // existing overrideDiscount, overrideTip, overrideDelivery
      ... // existing postDiscountSubtotal
      ... // existing scApplicable + serviceChargeAmount
      ... // existing CR-013 GST recomputation

      gst_tax = Math.round(gst_tax * 100) / 100;
      vat_tax = Math.round(vat_tax * 100) / 100;
    } else {
      // MANUAL PRINT PATH — backend passthrough, no FE computation
      serviceChargeAmount = order.serviceTax || 0;

      // Item-level tax loop — ONLY for GST/VAT split (not for subtotal)
      billFoodList.forEach(item => {
        if (isDetailComplimentary(item)) return;
        let taxAmt = parseFloat(item.gst_tax_amount || item.tax_amount || 0);
        if (!taxAmt && item.food_details) {
          const qty = parseFloat(item.quantity) || 1;
          const unitPrice = parseFloat(item.unit_price) || parseFloat(item.food_details?.price) || 0;
          const price = unitPrice > 0 ? unitPrice : (parseFloat(item.price) || 0);
          const lineTotal = price * qty;
          const taxPct = parseFloat(item.food_details.tax) || 0;
          if (taxPct > 0) {
            const isInclusive = (item.food_details.tax_calc || '').toLowerCase() === 'inclusive';
            taxAmt = isInclusive
              ? lineTotal * taxPct / (100 + taxPct)
              : lineTotal * taxPct / 100;
          }
        }
        const taxType = (item.food_details?.tax_type || 'GST').toUpperCase();
        if (taxType === 'VAT') vat_tax += taxAmt;
        else gst_tax += taxAmt;
      });
      gst_tax = Math.round(gst_tax * 100) / 100;
      vat_tax = Math.round(vat_tax * 100) / 100;
    }
```

**Why:** The existing computation is preserved for Collect Bill (zero regression risk). The new `else` branch for manual print only computes the GST/VAT split from items — everything else comes from backend.

---

### EDIT 3: Simplify `finalOrderItemTotal` (L1938-1940)

**Current:**
```js
    const finalOrderItemTotal = overrides.orderItemTotal !== undefined
      ? overrides.orderItemTotal
      : (order.subtotalAmount || computedSubtotal || 0);
```

**New:**
```js
    const finalOrderItemTotal = overrides.orderItemTotal !== undefined
      ? overrides.orderItemTotal
      : (order.subtotalAmount || 0);
```

**Why:** Remove `computedSubtotal` fallback. `order.subtotalAmount` is now always populated from backend. If it's 0, it genuinely means 0.

---

### EDIT 4: Simplify `finalOrderSubtotal` (L1946-1960)

**Current:**
```js
    const finalOrderSubtotal = overrides.orderSubtotal !== undefined
      ? overrides.orderSubtotal
      : (() => {
          const itemBase = order.subtotalBeforeTax || order.subtotalAmount || computedSubtotal || 0;
          const tipAmt   = overrides.tip !== undefined ? overrides.tip : (parseFloat(order.tipAmount) || 0);
          const delAmt   = overrides.deliveryCharge !== undefined
            ? (parseFloat(overrides.deliveryCharge) || 0)
            : (parseFloat(order.deliveryCharge) || 0);
          return Math.round((itemBase + serviceChargeAmount + tipAmt + delAmt) * 100) / 100;
        })();
```

**New:**
```js
    const finalOrderSubtotal = overrides.orderSubtotal !== undefined
      ? overrides.orderSubtotal
      : (order.subtotalBeforeTax || 0);
```

**Why:** `order.subtotalBeforeTax` (= `order_sub_total_without_tax` = 240.9) already includes items + SC + tip + delivery. The current code double-counts SC by adding `serviceChargeAmount` to `itemBase` which already contains it. Just use the backend value.

---

### EDIT 5: Simplify `serviceChargeAmount` reference in payload (L2078)

No change needed at L2078 — `serviceChargeAmount` is already set correctly in the `else` branch (Edit 2) as `order.serviceTax || 0`.

---

## Scope Lock

**Files WILL change:**
- `frontend/src/api/transforms/orderTransform.js` (L1795-1960)

**Files will NOT touch:**
- `OrderCard.jsx` — caller unchanged
- `TableCard.jsx` — caller unchanged
- `RePrintButton.jsx` — caller unchanged
- `OrderEntry.jsx` — Collect Bill caller unchanged
- `CollectPaymentPanel.jsx` — not in scope
- `CartPanel.jsx` — display addon qty (BUG-168 Phase 2, separate scope)
- `useOrderPollingReconciliation.js` — self-resolves, no change
- `orderService.js` — no change
- `socketHandlers.js` — no change
- `fromAPI.order` — no change

---

## Verification Matrix

| Edit # | File | Change | How to Verify | Automated? |
|--------|------|--------|--------------|:---:|
| 1 | orderTransform.js:~L1795 | Add `hasFinancialOverrides` gate | Code review — boolean is correct | N/A |
| 2 | orderTransform.js:L1802-1910 | Guard computation behind `if (hasFinancialOverrides)` | **Test A:** Place order with addons → print from OrderCard → `order_item_total` should be 219 (backend value), NOT FE-computed | NO (browser) |
| 2 | orderTransform.js:L1802-1910 | `else` branch uses `order.serviceTax` | **Test B:** Same order → `serviceChargeAmount` should be 21.90 (backend value) | NO (browser) |
| 2 | orderTransform.js:L1802-1910 | `else` branch tax loop for GST/VAT split | **Test C:** Order with VAT item → `vat_tax` populated, `gst_tax` = 0; GST item → vice versa | NO (browser) |
| 3 | orderTransform.js:L1938-1940 | Remove `computedSubtotal` fallback | **Test D:** Payload `order_item_total` = `order.subtotalAmount` from context | NO (Network tab) |
| 4 | orderTransform.js:L1946-1960 | Use `order.subtotalBeforeTax` directly | **Test E:** Payload `order_subtotal` = 240.9 (no double SC) | NO (Network tab) |
| — | OrderEntry.jsx (Collect Bill) | NOT changed | **Test F (regression):** Collect Bill auto-print → all values same as before fix | NO (browser) |
| — | Complimentary items | NOT changed | **Test G (regression):** Complimentary line shows ₹0 on printed bill | NO (browser) |
| — | Room orders | NOT changed | **Test H (regression):** Room print shows associated orders + room balance | NO (browser) |

---

## Post-Code Registry Checklist

Implementation agent MUST execute after coding:

- [ ] `registry.json`: BUG-168 → status: `IMPLEMENTED (v3 — backend passthrough)`, sprint_key updated
- [ ] `BUG_TRACKER.md`: BUG-168 row updated with v3 fix summary
- [ ] `FILE_OWNERSHIP.md`: `orderTransform.js` L1795-1960 entry updated
- [ ] Code markers: `// BUG-168 v3` comment at gate + each changed block
- [ ] Webpack: compiled with 0 new warnings

---

## Test Credentials

See `/app/memory/control/test_credentials.md`:
- `owner@18march.com` / `Qplazm@10` — 18March tenant (has addon orders: #002384, #002386)
- `Manager@hogwarts.com` / `Qplazm@10` — Hogwarts (rest 618, has variation orders: #000334)

---

## Summary

```
Plan ready at /app/memory/plans/BUG_168_V3_IMPLEMENTATION_PLAN.md
5 edits across 1 file (orderTransform.js).
Code reality: PARTIAL (BUG-168 v2 exists, will be superseded).
Scope: orderTransform.js WILL change / all other files will NOT touch.
Verification matrix: 8 checks (0 automated, 8 manual browser/network).
Owner decisions needed: NONE (tax split resolved — Option B: keep item loop for GST/VAT only).
Awaiting Gate 4 GO.
```
