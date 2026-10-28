# BUG-619 — Intake: Double Discount on Role-Based Preset Apply

**Date:** 2026-10-26  
**Reported by:** Owner — owner@mantri.com, order 001405  
**Source:** OWNER-REPORTED  
**Duplicate check:** DISTINCT — no prior registration. Related: BUG-614 (preset Apply fix, nov_cr_batch) — **this bug is a regression introduced by BUG-614 QA session TDZ fix + socket re-seed (BUG-595)**. Related: BUG-538 (role-base discount gate). Not a duplicate.  
**Code Reality:** FULL — bug exists in current codebase at CPP L369-376 (missing `setSelectedDiscountType(null)`) and L681-709 (double-count in render)

---

## Description

When a cashier applies a **preset role-based discount** (e.g. "Family — 50%") on a placed order, the total discount becomes **100%** (two 50% discounts stacked), making the grand total ₹0 or negative in the UI, and sending a double-discount payload to the backend on settlement.

**Reproduction (Mantri — owner@mantri.com):**
1. Open any placed dine-in order in OrderEntry
2. Open Collect Payment Panel (Collect Bill)
3. Select "Family — 50%" from the discount dropdown
4. Click **Apply** → button turns to Unapply ✅
5. Observe grand total: **₹0** (should be 50% of order total) ← WRONG
6. Proceed to settle → backend receives `self_discount = 2 × 50% = 100%`

---

## Severity & Risk

- **Severity:** P0 — CRITICAL (financial; direct money impact on every preset-discount order since BUG-614 QA fix on 2026-10-26)
- **Risk:** HIGH — discount is a financial operation; CPP is R5 hotspot
- **Fast Lane eligible:** NO — CPP is R5 hotspot; owner approval required before Gate 4 GO
- **SLA:** Fix same sprint; cannot defer

---

## Root Cause (from investigation INV-3ISSUES-2026-10-26.md)

**Break point:** CPP `useEffect` at L369-376 (BUG-595 socket re-seed) does NOT call `setSelectedDiscountType(null)` when seeding state from `initialDiscount`.

**Sequence:**
```
1. User selects "Family 50%" → selectedDiscountType = {discountPercent:50}, discountType=null, discountValue=''
2. User clicks Apply → applyOrderDiscount({discountAmount:50, discountType:'percent'})
3. Socket fires → liveOrder.orderDiscountJson = {discount:50, discountType:'percent'}
4. useEffect L369-376 fires:
     setDiscountType('percent')     ← discountType = 'percent'
     setDiscountValue('50')         ← discountValue = '50'
     setIsDiscountApplied(true)
     ← setSelectedDiscountType(null) MISSING → selectedDiscountType still = {discountPercent:50}
5. Render:
     presetDiscount  = 50% of total  (from selectedDiscountType.discountPercent=50)
     manualDiscount  = 50% of total  (from discountType='percent' + discountValue='50')
     totalDiscount   = 100%          ← DOUBLE DISCOUNT
6. Payment payload: discounts.manual=50% + discounts.preset=50% → self_discount=100%
```

---

## Evidence

- **Source files:** `src/components/order-entry/CollectPaymentPanel.jsx`
  - L369-376: seeding useEffect — missing `setSelectedDiscountType(null)`
  - L681-687: `presetDiscount` and `manualDiscount` computed independently (both non-zero)
  - L709: `totalDiscount = manualDiscount + presetDiscount + ...`
  - L1197-1198: payment payload `discounts.manual` + `discounts.preset` both non-zero
- **Confidence:** CONFIRMED (code trace + logical proof)
- **Steps to reproduce:** Mantri account with `roleBaseDiscount=Yes` + preset category "Family 50%"

---

## Blast Radius

- **Primary file:** `src/components/order-entry/CollectPaymentPanel.jsx` (R5 hotspot)
- **Lines affected:** L369-376 (fix site) — additive 1 line
- **Downstream:** `orderTransform.collectBillExisting` reads `discounts.manual + discounts.preset` — will be correct after fix
- **Scope:** SMALL (1 file, 1 line)
- **Hotspot files touched:** YES — CPP (R5)

---

## Proposed Fix (Gate 3 — pending owner Gate 4 GO)

Add `setSelectedDiscountType(null)` to the seeding useEffect:

```js
// CPP L369-376 — add 1 line (marked BUG-619):
useEffect(() => {
  if (!initialDiscount) return;
  setDiscountType(initialDiscount.discountType);
  setDiscountValue(String(initialDiscount.discount));
  setDiscountFor(initialDiscount.discountNote || '');
  setIsDiscountApplied(true);
  setSelectedDiscountType(null); // BUG-619: clear preset so socket re-seed doesn't double-count presetDiscount + manualDiscount
}, [initialDiscount?.discount, initialDiscount?.discountType]);
```

**After fix:** `selectedDiscountType=null → presetDiscount=0`. `discountType='percent', discountValue='50' → manualDiscount=50%`. `totalDiscount=50%` ✅

---

## Open Questions

None — root cause confirmed, fix clear, no owner decisions needed.

## Gate Status

- Gate 0 (Intake): **COMPLETE** (this document)
- Gate 2 (Impact Analysis): Not started
- Gate 3 (Implementation Plan): Not started
- Gate 4 GO: **Owner approval required** (R5 hotspot + financial)
