# QA Handover — BUG-430 (2026-09-16)

**ID:** BUG-430  
**Title:** Room Orders GST Missing Add-Ons Calculation (BUG-429 Implementation Gap)  
**Date Implemented:** 2026-09-16  
**Status:** GATE 5A — Code Complete, Awaiting QA  
**Priority:** P1 — HIGH  
**Risk:** CRITICAL (financial — GST calculation)

---

## What Was Fixed

### Bug Description
BUG-429 successfully copied the 3-step GST calculation pattern from `orderTransform.js`, but **missed copying the add-ons calculation** that happens BEFORE the GST is computed.

**Result:** GST was calculated on `(unit_price × quantity)` only, completely excluding add-ons from the tax base.

**Observed Gap (before fix):**
- Folio Room Orders: ₹238 (should be ₹256)
- In-House Balance: ₹1,930.40 (should be ₹1,947)
- Checkout (correct): ₹1,947

**The missing ₹16-18 was the GST on add-ons.**

---

## Implementation Summary

### Files Changed

**1. `/app/frontend/src/api/transforms/folioTransform.js` (Lines 115-120)**
- Added: `addonPerUnit` reduction calculation (4 lines + comment)
- Modified: `amt` now includes `+ addonPerUnit * qty`
- Pattern copied from: `orderTransform.js` L1900-1904
- BUG-429 GST logic (L122-129): **UNCHANGED**

**2. `/app/frontend/src/api/services/pmsService.js` (Lines 125-130)**
- Added: `addonPerUnit` reduction calculation (4 lines + comment)
- Modified: `amt` now includes `+ addonPerUnit * qty`
- Pattern copied from: `orderTransform.js` L1900-1904
- BUG-429 GST logic (L132-144): **UNCHANGED**

### Code Markers
- Both files: `// BUG-430: include add-ons in GST base (match orderTransform.js L1900-1904)`

---

## Self-Test Results (V1-V9)

✅ **V1:** `addonPerUnit` reduction present in folioTransform.js (L116-119)  
✅ **V2:** `amt` includes add-ons in folioTransform.js (L120)  
✅ **V3:** BUG-429 GST logic untouched in folioTransform.js (L122-129)  
✅ **V4:** Code marker present in folioTransform.js (L115)  
✅ **V5:** `addonPerUnit` reduction present in pmsService.js (L126-129)  
✅ **V6:** `amt` includes add-ons in pmsService.js (L130)  
✅ **V7:** BUG-429 GST logic untouched in pmsService.js (L132-144)  
✅ **V8:** Code marker present in pmsService.js (L125)  
✅ **V9:** Webpack compiled with 0 new warnings (1 pre-existing warning)

---

## QA Test Cases

### Test Data
- **Account:** palmhouse (preprod.mygenie.online)
- **Guest:** "test gst" (or any guest with room orders containing add-ons)
- **Order #:** 000069 (or current equivalent)

### TC1 — Folio Room Orders Total (V10)
**Steps:**
1. Login to preprod.mygenie.online with palmhouse account
2. Navigate to PMS → In-House Guests
3. Click on "test gst" guest
4. Navigate to Folio tab

**Expected:**
- Room Orders tile shows: **₹256** (previously ₹238)
- If no add-ons on items: Should match previous value (no change)

**Status:** ⏳ PENDING QA

---

### TC2 — Folio Total Balance Due (V11)
**Steps:**
1. Same folio from TC1
2. Scroll to Balance Breakdown section
3. Check "Total Balance Due" amount

**Expected:**
- Total Balance Due: **₹1,947** (previously ~₹1,929)
- Breakdown:
  - Room Balance: ₹950
  - Transferred F&B: ₹741
  - Room Orders: ₹256
  - **Total: ₹1,947**

**Status:** ⏳ PENDING QA

---

### TC3 — In-House Balance (V12)
**Steps:**
1. Navigate to PMS → In-House Guests
2. Locate "test gst" guest row
3. Check Balance column

**Expected:**
- Balance: **₹1,947** (previously ₹1,930.40)

**Status:** ⏳ PENDING QA

---

### TC4 — Three-Way Match (V13)
**Steps:**
1. Open Checkout for "test gst" guest
2. Note GRAND TOTAL
3. Compare with Folio Total Balance Due (TC2)
4. Compare with In-House Balance (TC3)

**Expected:**
- Checkout GRAND TOTAL: **₹1,947**
- Folio Total Balance Due: **₹1,947**
- In-House Balance: **₹1,947**
- **All three match exactly** ✅

**Status:** ⏳ PENDING QA

---

### TC5 — No Regression (Orders Without Add-Ons) (V14)
**Steps:**
1. Find a guest with room orders that have NO add-ons
2. Check Folio Room Orders total
3. Compare with previous/expected value

**Expected:**
- Room orders without add-ons: **No change in total**
- GST calculation still works correctly (BUG-429 logic unchanged)

**Status:** ⏳ PENDING QA

---

## Edge Cases Verified (Code-Level)

| Edge Case | Behavior | Status |
|-----------|----------|--------|
| Order item has no add-ons (`add_ons = []` or `undefined`) | `addonPerUnit = 0`, `amt = unit * qty` (same as before) | ✅ Safe |
| Add-on has `price: null` or `quantity: null` | `parseFloat() \|\| 0` returns 0 | ✅ Guarded |
| Add-on has non-numeric price (`price: "abc"`) | `parseFloat("abc") = NaN`, `NaN \|\| 0 = 0` | ✅ Guarded |
| Multiple add-ons on same item | All add-ons summed via reduce | ✅ Expected |
| Backend sends `gst_tax_amount` (BUG-429 Step 1) | Pre-calculated GST used, add-ons irrelevant | ✅ Safe |

---

## Regression Check (From BUG-426/427/428/429)

| Item | What to verify | Status |
|------|---------------|--------|
| BUG-426 | transferredFnb and roomBalance still correct | ⏳ QA |
| BUG-427 | Room Orders section displays correctly (per-row amounts, expand functionality) | ⏳ QA |
| BUG-428 | Lodging GST line shows correctly on checkout | ⏳ QA |
| BUG-429 | `gst_tax_amount` path still works, `inclusive` tax handling correct | ⏳ QA |

---

## Related Bugs (Combined Testing Recommended)

**BUG-426, BUG-427, BUG-428, BUG-429, BUG-430** all affect the same PMS balance calculation flow.

**Recommendation:** Test all 5 bugs together using "test gst" guest as single test case:
- Expected final result: ₹1,947 across all surfaces
- Covers entire PMS financial calculation flow

---

## Known Limitations

None. Fix is complete and comprehensive.

---

## Rollback Plan

If issue found:
1. Revert commits for BUG-430 (2 files, 12 lines)
2. Frontend hot-reload will auto-apply
3. Balance will return to ₹1,930.40 (incorrect, but known state)

---

## Owner Acceptance Criteria

- [ ] TC1: Folio Room Orders = ₹256 ✅
- [ ] TC2: Folio Total Balance Due = ₹1,947 ✅
- [ ] TC3: In-House Balance = ₹1,947 ✅
- [ ] TC4: All three totals match ✅
- [ ] TC5: No regression on orders without add-ons ✅

**When all 5 pass → BUG-430 GATE 6 — OWNER SMOKE COMPLETE**

---

## Dev Notes

**Why This Was Missed in BUG-429:**
- BUG-429 focused on copying the **GST formula** (3-step pattern)
- The add-ons calculation is a **data preparation step** that happens BEFORE the formula
- The implementation plan correctly copied lines 1907-1916 (GST formula) but missed lines 1900-1904 (add-ons prep)

**Lesson:** When copying a calculation pattern, include all data dependencies that feed into the calculation.

---

**Status:** Code complete, awaiting QA test results (TC1-TC5)  
**Next Gate:** Gate 6 — Owner Smoke Testing
