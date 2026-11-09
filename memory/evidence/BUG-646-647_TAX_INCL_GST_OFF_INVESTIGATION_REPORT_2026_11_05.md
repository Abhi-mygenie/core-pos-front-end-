# INVESTIGATION REPORT — BUG-TAX-INCL-GST-OFF

**Date:** 2026-11-05  
**Investigator:** E1 Agent (INVESTIGATION role)  
**Steps Used:** 8/10  
**Confidence:** HIGH (code-traced + formula-verified)

---

## 1. Summary

Root cause: **3 related FE_BUGs** in tax calculation.  
Classification: **FE_BUG** (all three)  
Confidence: **HIGH** — reproduced via code trace + math verification.  
Steps used: 8/10

| # | Bug | Classification | Root Cause (1-sentence) |
|---|-----|----------------|------------------------|
| 1 | Inclusive tax items inflate Grand Total (₹100 item @ 5% incl → shows ₹105, should be ₹100) | CODE_ERROR | `rawFinalTotal` adds full tax on top of item prices that already contain inclusive tax |
| 2 | Food items can be set as "inclusive from" | N/A | Feature description, relates to Bug 1 |
| 3 | GST OFF: UI hides GST correctly, but API payload sends `gst_tax` and inflated `order_amount` | CODE_ERROR | `buildCartItem` / `calcOrderTotals` have no `gstStatus` check; only `CollectPaymentPanel` gates on it |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|-------|--------|---------|
| H1 | Inclusive tax formula itself is wrong | Code trace CollectPaymentPanel.jsx:293-294 | 1 | ELIMINATED | Formula `linePrice - linePrice/(1+pct/100)` is mathematically correct. ₹100 @ 5% → taxAmt = 4.76 ✓ |
| H2 | Inclusive tax double-counted in Grand Total | Code trace CollectPaymentPanel.jsx:808 | 2 | **CONFIRMED** | `rawFinalTotal = subtotal + sgst + cgst + vat` — subtotal already includes inclusive tax via item prices; sgst+cgst adds it again |
| H3 | Same double-count exists in payload builder | Code trace orderTransform.js calcOrderTotals:910 | 1 | **CONFIRMED** | `rawTotal = postDiscount + SC + tip + delivery + totalTax` — same pattern; totalTax includes inclusive portion that's already in postDiscount |
| H4 | GST OFF not propagated to payload builder | Code trace orderTransform.js buildCartItem + calcOrderTotals | 2 | **CONFIRMED** | Neither function accepts or checks `gstStatus`. buildCartItem:770 always emits `gst_amount`, calcOrderTotals:843 always sums `gstTax` |
| H5 | collectBillExisting payload uses CPP values | Code trace orderTransform.js:1522 | 1 | PARTIAL | `gstTax = sgst+cgst` from paymentData (0 when GST off ✓), BUT `food_detail[].gst_amount` at L1599 is still non-zero ✗ |
| H6 | OrderEntry Collect Bill button has same bug | Code trace OrderEntry.jsx:886-925 | 1 | **CONFIRMED** | `localTax` / `unplacedTax` add inclusive tax on top AND don't check `gstStatus` |

---

## 3. Data Flow Trace

### Bug 1: Inclusive Tax Double-Count

```
API: product.food_details.tax_calc = "Inclusive"
→ Transform: orderTransform.js:124-125
    calculation: 'Inclusive', isInclusive: true
→ State: item.tax.isInclusive = true
→ Component: CollectPaymentPanel.jsx
    L253: getItemLinePrice(item) = ₹100 (price includes tax)
    L690: itemTotal = Σ getItemLinePrice = ₹100
    L293: tax.isInclusive → taxAmt = 100 − 100/1.05 = 4.76 ✓
    L300: sgst = 2.38, cgst = 2.38 ✓
    L726: subtotalAfterDiscount = 100 (includes tax already)
    L821: subtotal = 100
    L808: rawFinalTotal = 100 + 2.38 + 2.38 + 0 = 104.76  ← BREAK POINT
    After rounding: ₹105 (WRONG — should be ₹100)
```

**Same break point in orderTransform.js:**
```
    calcOrderTotals:842  subtotal = ₹100 (includes inclusive tax)
    calcOrderTotals:843  gstTax += 4.76
    calcOrderTotals:910  rawTotal = 100 + 0 + 0 + 0 + 4.76 = 104.76  ← BREAK POINT
    order_amount after rounding: ₹105
```

**Same break point in OrderEntry.jsx:**
```
    L886-892: localTax computes inclusive taxAmt (4.76) and adds it
    L924: rawLocalTotal = 100 + 0 + 0 + 4.76 = 104.76  ← BREAK POINT
    Collect Bill button shows ₹105
```

**Same break point in CartPanel.jsx (QSR path):**
```
    L389-414: taxTotals computes inclusive tax (sgst=2.38, cgst=2.38)
    L451: rawFinalTotal = subtotal + sgst + cgst + vat = 100 + 2.38 + 2.38 = 104.76  ← BREAK POINT
```

### Bug 3: GST OFF → Payload Still Sends GST

```
Restaurant Settings: restaurant.tax.gstStatus === false
→ CollectPaymentPanel.jsx:287 → `if (gstStatus === false) return;` → skips ✓ (UI correct)
→ BUT orderTransform.js:
    buildCartItem:770 → always emits gst_amount (no gstStatus check)
    calcOrderTotals:843 → always accumulates gstTax (no gstStatus check)
    calcOrderTotals:910 → rawTotal includes gstTax
→ placeOrder payload: gst_tax: 11.9, order_amount: 250 (should be 0 and 239)
→ Also: OrderEntry.jsx L886: localTax doesn't check gstStatus
→ Also: CartPanel.jsx L389: taxTotals doesn't check gstStatus
→ Also: CollectPaymentPanel.jsx L778-787: scGst/tipGst/deliveryGst still computed via scTaxRate even when gstStatus is false
```

---

## 4. Evidence Artifacts

All saved to: `/app/memory/evidence/BUG-TAX-INCL-GST-OFF/`
- Source: Owner-submitted PDF `05_11_2026 12_55 bugs-frontend.pdf`
- This investigation report

---

## 5. Recommendations

Classification: **FE_FIX**  
Planning skip eligible: **NO** — touches 4+ files, all hotspot financial logic (R5/R6).  
Recommend: **Full Planning gate cycle (Gate 2-3).**

### Scope of Fix (5 files, ~50 lines across all)

**File 1: `CollectPaymentPanel.jsx`** (CRITICAL — R5 hotspot)
- `taxTotals` useMemo (L279-317): Add inclusive tax tracking buckets (`iSgst`, `iCgst`, `iVat` + discountable variants `diSgst`, `diCgst`, `diVat`)
- `rawFinalTotal` (L808): Change from `subtotal + sgst + cgst + vat` to `subtotal + sgst + cgst − inclusiveItemGstPostDiscount + vat − inclusiveVatPostDiscount`
- `scTaxRate` / `delTaxRate` (L778-779): Gate on `gstStatus !== false`

**File 2: `orderTransform.js`** (CRITICAL — R5 hotspot)
- `buildCartItem` (L648-792): Add `_isInclusive: isInclusive` private marker
- `calcOrderTotals` (L812-935): (a) Accept `gstOff` in extras; (b) zero itemGst when gstOff; (c) zero scTaxRate/delTaxRate when gstOff; (d) track inclusive GST/VAT; (e) subtract inclusiveTaxTotal from rawTotal
- `placeOrder` / `updateOrder` / `placeOrderWithPayment`: (a) Accept `gstOff` in options; (b) strip `_isInclusive` from cart output; (c) zero per-item `gst_amount` when gstOff

**File 3: `OrderEntry.jsx`** (R5 hotspot)
- `localTax` / `unplacedTax` (L886-904): Skip inclusive items entirely (return sum + 0) and skip GST when `gstStatus === false`
- `localSCTaxRate` (L919): Gate on `gstStatus !== false`
- All 4 transform call sites: Pass `gstOff: restaurant?.tax?.gstStatus === false`

**File 4: `CartPanel.jsx`**
- `taxTotals` (L389-415): Mirror CollectPaymentPanel's inclusive + gstOff tracking
- `scGst` / `tipGst` / `deliveryGst` (L441-443): Gate on gstOff
- `rawFinalTotal` (L451): Subtract inclusive tax

**File 5: `collectBillExisting` in `orderTransform.js`** (L1498)
- `food_detail` builder (L1547-1613): Gate `gst_amount` on gstOff

### Formula Verification (pre-implementation check)

| Scenario | Current | Expected |
|----------|---------|----------|
| ₹100 inclusive 5% GST | Grand Total = 105 | Grand Total = 100 |
| ₹100 exclusive 5% GST | Grand Total = 105 | Grand Total = 105 (unchanged) |
| Mixed: ₹100 incl + ₹100 excl | Grand Total = 209.76 | Grand Total = 205 |
| ₹100 inclusive 5%, GST OFF | Grand Total = 100 (UI), payload = 105 | Grand Total = 100, payload = 100 |
| ₹100 exclusive 5%, GST OFF | Grand Total = 100 (UI), payload = 105 | Grand Total = 100, payload = 100 |

---

## 6. Retroactive Candidates
NONE
