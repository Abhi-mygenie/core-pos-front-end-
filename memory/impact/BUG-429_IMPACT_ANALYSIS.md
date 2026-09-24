# BUG-429 — Impact Analysis (Gate 2)

**ID:** BUG-429  
**Date:** 2026-09-16  
**Planning session:** 2026-09-16  
**Code Reality:** CONFIRMED GAP — both target lines exist exactly as described in intake. No partial implementation.  
**Conflict Pre-Check:** ⚠ ORDERING CONFLICT — `folioTransform.js` last touched by BUG-427 (GATE_5A_IMPLEMENTED, awaiting QA). `pmsService.js` last touched by BUG-426 (GATE_5A_IMPLEMENTED, awaiting QA). BUG-429 must be implemented **before** Gate 5b QA for BUG-426/427 — QA test cases for both require correct values (₹256 room orders, ₹1,947 grand total) which only become correct after BUG-429 is in place. Parallel-safe: BUG-429 edits the GST block only, not the structural changes added by BUG-424/426/427.

---

## Risk Classification

- **Risk:** CRITICAL  
- **Reason:** Total Balance Due on folio + In-House balance column — both financial display surfaces. Under-counting GST on room orders by ~₹18 misleads staff on actual guest outstanding.  
- **Fast Lane:** NOT eligible (CRITICAL financial, 2 files)

---

## Owner Decisions Applied

| ID | Decision | Answer |
|----|----------|--------|
| OD-429-01 | Use `gst_tax_amount \|\| tax_amount` as primary GST source (same as orderTransform.js)? | ✅ YES — matches checkout reference pattern |
| OD-429-02 | Handle `tax_calc = 'inclusive'` in fallback path? | ✅ YES — matches checkout reference pattern |

---

## Data Flow Trace

```
API:   POST SINGLE_ORDER_NEW → raw.orderDetails[] per item:
         .gst_tax_amount  — pre-computed GST stored at order time (slab-applied)
         .tax_amount      — alternate pre-computed GST field  
         .food_details.tax      — catalog GST % (may differ from slab rate)
         .food_details.tax_calc — 'Inclusive' or 'Exclusive'
         .unit_price            — pre-tax unit price

Checkout path (orderTransform.js L1907-1914) — CORRECT:
  1. Read gst_tax_amount || tax_amount → authoritative slab GST
  2. If absent: recompute from food_details.tax %
     with inclusive/exclusive branch
  → Room Orders: ₹256 ✅

Folio path (folioTransform.js L116-117) — WRONG:
  Always: gstAmt = amt * food_details.tax / 100  (exclusive only)
  Never reads gst_tax_amount / tax_amount
  Never checks tax_calc for inclusive items
  → totalAmount under-counted → Room Orders tile ₹238 ❌

In-House path (pmsService.js L126-129) — WRONG:
  Same pattern: gstAmt = amt * food_details.tax / 100
  Never reads gst_tax_amount / tax_amount
  Never checks tax_calc
  → roomOrdersTotal under-counted → balance ₹1,930.4 ❌

BREAK POINTS:
  folioTransform.js L116-117
  pmsService.js    L126-129
```

---

## Reference Pattern (orderTransform.js L1907-1914)

```js
// Step 1: authoritative pre-computed GST from backend
let taxAmt = parseFloat(item.gst_tax_amount || item.tax_amount || 0);
// Step 2: fallback — recompute from catalog % with inclusive/exclusive branch
if (!taxAmt && item.food_details) {
  const taxPct = parseFloat(item.food_details.tax) || 0;
  if (taxPct > 0) {
    const isInclusive = (item.food_details.tax_calc || '').toLowerCase() === 'inclusive';
    taxAmt = isInclusive
      ? lineTotal * taxPct / (100 + taxPct)   // extract GST from inclusive price
      : lineTotal * taxPct / 100;             // add GST on top
  }
}
```

---

## Affected Files

| File | Lines | Change | Risk |
|------|-------|--------|------|
| `src/api/transforms/folioTransform.js` | L116-117 | Replace 2-line GST compute with 3-step pattern | CRITICAL (financial) |
| `src/api/services/pmsService.js` | L126-129 | Replace 3-line GST block with 3-step pattern | CRITICAL (financial) |

**Files NOT touched:** `GuestFolioPage.jsx`, `InHouseGuestsPage.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js`

**Auto-correction cascade (no code change needed):**
- `GuestFolioPage.jsx`: reads `r.totalAmount` and `r.gstAmount` from folioTransform → auto-corrects once transform is fixed
- `InHouseGuestsPage.jsx`: reads `row.balance` from pmsService → auto-corrects once service is fixed

---

## Downstream Consumers

- `folioTransform.js` → `GuestFolioPage.jsx`: `roomOrdersTotal`, `Room Orders tile`, `Total Balance Due` — all auto-correct
- `pmsService.js` → `InHouseGuestsPage.jsx`: `row.balance`, `row.roomOrdersBalance`, Outstanding Balance KPI — all auto-correct

---

## Conflict Pre-Check Result

⚠ **ORDERING CONFLICT — MUST implement BUG-429 BEFORE QA of BUG-426 and BUG-427.**

Reason: QA test cases for BUG-426 (TC-01: In-House balance = ₹1,947) and BUG-427 (TC-01: Room Orders tile = ₹256, Total Balance Due = ₹1,947) require the correct GST values. Without BUG-429, those tests would show ₹238/₹1,930.4 and FAIL. With BUG-429 applied first, all three bugs' QA can run in one combined pass.

**Execution order: BUG-429 → Gate 5b QA (BUG-426 + BUG-427 + BUG-429 combined)**
