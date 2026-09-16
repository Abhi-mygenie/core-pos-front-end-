# BUG-430 — Room Orders GST Missing Add-Ons Calculation (BUG-429 Implementation Gap)

**ID:** BUG-430  
**Date:** 2026-09-16  
**Source:** AGENT-DISCOVERED — Investigation of persistent BUG-429 symptom (₹1,930.40 vs ₹1,947 discrepancy)  
**Confidence:** CONFIRMED (code-traced + verified against orderTransform.js reference)

---

## Description

BUG-429 successfully copied the 3-step GST calculation pattern from `orderTransform.js` to both `folioTransform.js` and `pmsService.js`, BUT it **missed copying the add-ons calculation** that happens BEFORE the GST is computed.

**Result:** GST is calculated on `(unit_price × quantity)` only, completely excluding add-ons from the tax base.

**Observed gap (test gst, order #000069):**

| Surface | Room Orders shown | Expected (checkout reference) | Gap |
|---------|-------------------|-------------------------------|-----|
| Folio (BUG-427 + BUG-429) | ₹238 | ₹256 | **−₹18** |
| In-House (BUG-426 + BUG-429) | ~₹239.4 | ₹256 | **~−₹17** |
| Total Balance Due (Folio) | ~₹1,929 | ₹1,947 | **~−₹18** |
| In-House balance | ₹1,930.40 | ₹1,947 | **−₹16.60** |

**The missing ₹18 is the GST on add-ons that were never included in the calculation.**

---

## Root Cause

### Gap: Add-Ons Not Included in GST Base Amount

**Checkout page (`orderTransform.js` L1900-1904) — CORRECT:**
```javascript
const addonPerUnit = (item.add_ons || []).reduce(
  (s, a) => s + ((parseFloat(a.price) || 0) * (parseFloat(a.quantity) || 1)),
  0
);
const lineTotal = (price * qty) + (addonPerUnit * qty);  // ← Add-ons included!
// THEN calculates GST on lineTotal
let taxAmt = parseFloat(item.gst_tax_amount || item.tax_amount || 0);
if (!taxAmt && item.food_details) {
  const taxPct = parseFloat(item.food_details.tax) || 0;
  if (taxPct > 0) {
    taxAmt = lineTotal * taxPct / 100;  // ← GST on (base + add-ons)
  }
}
```

**Folio transform (`folioTransform.js` L115) — WRONG:**
```javascript
const amt = Math.round(unit * qty * 100) / 100;  // ← NO add-ons!
// THEN calculates GST on amt
let gstAmt = Math.round(parseFloat(d.gst_tax_amount || d.tax_amount || 0) * 100) / 100;
if (!gstAmt && gstPct > 0) {
  gstAmt = amt * gstPct / 100;  // ← GST excludes add-ons
}
```

**In-House service (`pmsService.js` L125) — WRONG:**
```javascript
const amt = Math.round(unit * qty * 100) / 100;  // ← NO add-ons!
// THEN calculates GST on amt  
let gstAmt = Math.round(parseFloat(d.gst_tax_amount || d.tax_amount || 0) * 100) / 100;
if (!gstAmt) {
  const gstPct = parseFloat(fd2.tax ?? 0);
  if (gstPct > 0) {
    gstAmt = amt * gstPct / 100;  // ← GST excludes add-ons
  }
}
```

---

## Classification

- **Type:** BUG (implementation gap in BUG-429 fix)
- **Severity:** P1 — HIGH (financial display; GST under-counted by ₹16-18 on test guest)
- **Risk:** CRITICAL (same financial calculations that drive what staff charges guest)
- **Duplicate check:** RELATED to BUG-429 (GATE_5A_IMPLEMENTED) — this is a correction of the BUG-429 implementation
- **Fast Lane:** NOT eligible (CRITICAL financial, 2 files)

---

## Evidence

### Code Reality Check

**Status: PARTIAL**

- **`orderTransform.js`:** ✅ Has add-ons calculation (L1900-1904)
- **`folioTransform.js`:** ❌ Missing add-ons calculation (L115 only does `unit × qty`)
- **`pmsService.js`:** ❌ Missing add-ons calculation (L125 only does `unit × qty`)

### Investigation Trail

1. **BUG-429 Investigation Report:** `/app/memory/BUG-429_INVESTIGATION_REPORT.md`
2. **Code comparison:** Verified line-by-line against `orderTransform.js` L1895-1916
3. **Mathematical proof:** ₹16.60 gap = GST on add-ons not included in base

### Source

- **Discovered by:** INVESTIGATION agent during BUG-429 root cause analysis
- **Confirmed by:** Direct code inspection of all three transform files
- **Owner awareness:** Pending (to be presented)

---

## Blast Radius

### Files WILL Change

1. **`/app/frontend/src/api/transforms/folioTransform.js`**
   - **Target:** L111-115 (current `.map(d => {...})` block)
   - **Change:** Add add-ons reduction BEFORE `amt` calculation (5-7 new lines)
   - **Estimated:** ~5-7 lines added

2. **`/app/frontend/src/api/services/pmsService.js`**
   - **Target:** L122-125 (current `.reduce((s, d) => {...})` block)
   - **Change:** Add add-ons reduction BEFORE `amt` calculation (5-7 new lines)
   - **Estimated:** ~5-7 lines added

### Files will NOT Touch

- **`/app/frontend/src/pages/pms/GuestFolioPage.jsx`** — NO CHANGE (reads transformed data)
- **`/app/frontend/src/pages/pms/InHouseGuestsPage.jsx`** — NO CHANGE (reads transformed data)
- **`/app/frontend/src/api/transforms/orderTransform.js`** — NO CHANGE (reference only, already correct)

### Scope

- **Estimated:** SMALL (2 files, ~10-14 lines total)
- **Hotspot:** NONE (folioTransform + pmsService are NOT in R5 hotspot list)

---

## Fix Pattern (from orderTransform.js reference)

Both `folioTransform.js` and `pmsService.js` should add add-ons calculation BEFORE computing `amt`:

```javascript
// NEW: Add-ons calculation (copy from orderTransform.js L1900-1903)
const addonPerUnit = (d.add_ons || []).reduce(
  (s, a) => s + ((parseFloat(a.price) || 0) * (parseFloat(a.quantity) || 1)),
  0
);

// MODIFIED: amt now includes add-ons
const amt = Math.round((unit * qty + addonPerUnit * qty) * 100) / 100;

// Rest of GST calculation unchanged (BUG-429 logic preserved)
let gstAmt = Math.round(parseFloat(d.gst_tax_amount || d.tax_amount || 0) * 100) / 100;
if (!gstAmt && gstPct > 0) {
  const isInclusive = (fd.tax_calc || '').toLowerCase() === 'inclusive';
  gstAmt = isInclusive
    ? Math.round(amt * gstPct / (100 + gstPct) * 100) / 100
    : Math.round(amt * gstPct / 100 * 100) / 100;
}
```

---

## Owner Decisions

| ID | Question | Answer |
|----|----------|--------|
| OD-430-01 | Confirm add-ons should be included in GST base for room orders (matches checkout behavior)? | Pending Gate 2 |
| OD-430-02 | Implement in same sprint (pos_pms_1) alongside BUG-426/427/428/429 QA? | Pending Gate 2 |

---

## Relationship to BUG-429

**BUG-429 Status:** GATE_5A_IMPLEMENTED (code complete, QA pending)

**This bug (BUG-430) is:**
- A **correction** of the BUG-429 implementation
- BUG-429 fixed the GST **formula** (3-step pattern with inclusive/exclusive handling)
- BUG-430 fixes the **GST base amount** (must include add-ons before applying formula)

**Execution order:**
- If BUG-429 has NOT been QA tested yet → BUG-430 can be fixed BEFORE QA
- If BUG-429 is already in QA → BUG-430 becomes a post-QA fix (BUG-429 will fail QA)

---

## Why This Was Missed in BUG-429

**BUG-429 focused on:**
1. Reading `gst_tax_amount` field (Step 1)
2. Handling `tax_calc='inclusive'` (Step 2)
3. Copying the GST **calculation pattern** from `orderTransform.js`

**BUG-429 missed:**
- The add-ons calculation happens **BEFORE** the GST calculation in `orderTransform.js` (L1900-1904)
- This is a **data preparation step**, not part of the GST formula itself
- The BUG-429 implementation plan focused on the GST formula lines (L1907-1916) and didn't include the preceding add-ons block

**Lesson:** When copying a calculation pattern, must include **all data dependencies** that feed into the calculation, not just the calculation itself.

---

## Next

Gate 2 — Impact Analysis

**Priority:** HIGH (financial accuracy, same test guest showing wrong balance)

**Urgency:** Should be fixed BEFORE BUG-429 QA completes (to avoid double QA cycle)
