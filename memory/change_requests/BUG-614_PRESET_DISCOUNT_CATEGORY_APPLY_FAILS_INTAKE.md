# BUG-614 — Preset Discount Category Apply Fails (roleBaseDiscount flow)

**ID:** BUG-614  **Type:** BUG  **Registered:** 2026-10-26  **Sprint:** nov_cr_batch
**Severity:** P1  **Risk:** HIGH  **Status:** GATE_1_INTAKE_COMPLETE
**Area:** Payments / Coupons / Credit
**Source:** OWNER-REPORTED (screenshot + verbal, mantri restaurant)
**Confidence:** CONFIRMED (code-traced, root cause identified)

---

## Description

When a preset discount category (e.g., "Family — 50%") is selected from the dropdown in CollectPaymentPanel and the user clicks **Apply**, the system shows **"Please enter discount amount"** toast error and blocks the discount. The preset discount works at payment time (sent in payload) but NOT via the Apply button used in the roleBaseDiscount flow.

---

## Evidence

- **Screenshot:** Owner provided — shows "Family — 50%" selected, "-₹10" preview shown, but toast "Please enter discount amount" on Apply click
- **Restaurant:** mantri (owner@mantri.com, roleBaseDiscount=Yes)
- **Steps to reproduce:**
  1. Login as owner@mantri.com
  2. Open any order in CPP
  3. Select "Family — 50%" from discount dropdown
  4. Click Apply → toast error "Please enter discount amount"

---

## Root Cause (code-traced)

**File:** `src/components/order-entry/CollectPaymentPanel.jsx`

When a preset is selected (L1416-1420):
```js
setSelectedDiscountType(found);   // preset object set
setDiscountType(null);            // manual type cleared
setDiscountValue("");             // manual value cleared
```

When Apply is clicked — `handleApplyDiscount()` (L371-386):
```js
const val = parseFloat(discountValue || 0);  // → 0 (discountValue is "")
if (!val || val === 0) { toast.error('Please enter discount amount'); return; }  // → BLOCKED
```

`handleApplyDiscount` only reads `discountValue` (manual input). It never checks `selectedDiscountType` or `presetDiscount`. The preset path was never wired into the Apply flow.

---

## Duplicate Check

**DISTINCT.**
- BUG-056 (Custom Discount Category Not Showing): CLOSED — was about categories not appearing in dropdown. Different issue.
- BUG-538 (Role-Based Discount Not Wired to CPP): RELATED — BUG-538 added the Apply button but only for manual % / ₹. Preset path was missed.
- BUG-595 (Role-Based Discount Socket Reactivity): RELATED — socket chain, different issue.

---

## Code Reality

**PARTIAL** — `handleApplyDiscount` exists (L371-386) but only handles manual discount. Preset discount calculation exists at L658-660 (`presetDiscount`) but is not used in the Apply flow.

---

## Blast Radius

**SMALL** — 1 file: `CollectPaymentPanel.jsx`, function `handleApplyDiscount` (~L371-386). ~10 lines to add preset path.

---

## Open Decisions

- **OD-614-01:** When preset is applied via Apply button, should the API receive the computed ₹ amount (e.g., ₹10 for 50% of ₹20) or the percentage (50)? Current manual flow sends ₹ amount with `discountType`. Recommendation: send computed ₹ amount as `discountAmount` with `discountType: 'percent'` and the category name as `discountNote`.

---

## Gate Status

- Gate 1: **COMPLETE** (this document)
- Gate 2: Awaiting "Gate 2 GO" → Impact Analysis
