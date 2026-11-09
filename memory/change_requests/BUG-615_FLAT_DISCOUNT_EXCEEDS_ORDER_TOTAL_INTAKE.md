# BUG-615 — Flat Discount Allows Amount Greater Than Order Total

**ID:** BUG-615  **Type:** BUG  **Registered:** 2026-10-26  **Sprint:** nov_cr_batch
**Severity:** P1  **Risk:** CRITICAL  **Status:** GATE_1_INTAKE_COMPLETE
**Area:** Payments / Coupons / Credit
**Source:** OWNER-REPORTED (screenshot + verbal, mantri restaurant)
**Confidence:** CONFIRMED (code-traced, root cause identified)

---

## Description

When flat (₹) discount mode is selected, the user can enter a discount amount **greater than the order total** (e.g., ₹40 discount on a ₹20 order). The bill summary display correctly caps the discount at the order total (`-₹20`, via `Math.min`), but the **input field allows typing any amount** and the **Apply button sends the uncapped raw value to the backend API**.

---

## Evidence

- **Screenshot:** Owner provided — shows ₹40 flat discount entered on ₹20 order (दही x1). Discount shows -₹20 (capped in display), Total Discount -₹20, Post-discount ₹0, Pay ₹0.
- **Restaurant:** mantri (owner@mantri.com)
- **Steps to reproduce:**
  1. Login as owner@mantri.com
  2. Add item worth ₹20 to order
  3. Open CPP, select "₹" (flat) discount
  4. Type "40" in discount input — no validation stops you
  5. Click Apply → sends ₹40 to backend API (should cap at ₹20)

---

## Root Cause (code-traced)

**File:** `src/components/order-entry/CollectPaymentPanel.jsx`

**Gap 1 — Input field (L1448-1460):**
```js
if (discountType === 'percent' && val > 100) { setDiscountValue('100'); return; }
// ← NO equivalent cap for flat discount. No max attribute for flat.
```
Percent is capped at 100, flat has no cap.

**Gap 2 — Apply validation (L373-374):**
```js
if (discountType === 'percent' && val > 100) { toast.error('Please enter valid discount'); return; }
// ← NO equivalent check: if (discountType === 'flat' && val > discountableTotal)
```

**Gap 3 — API call (L380):**
```js
await applyOrderDiscount({ orderId, discountAmount: val, ... });
// ← sends raw val (40), not Math.min(val, discountableTotal)
```

**Note:** The display layer IS correct — `manualDiscount` at L664 uses `Math.min(parseFloat(discountValue || 0), discountableTotal)`. But the input + API path bypass this cap.

---

## Duplicate Check

**DISTINCT.**
- BUG-507 (Flat discount alert missing — discountOverMax Percent-only): RELATED — BUG-507 was about room checkout FolioCheckoutPanel. Same pattern but different file/context.
- BUG-490 (Room discount cap missing): RELATED — room checkout, different flow.

---

## Code Reality

**PARTIAL** — Percent mode has both input cap (L1456) and Apply validation (L374). Flat mode has neither.

---

## Blast Radius

**SMALL** — 1 file: `CollectPaymentPanel.jsx`, 2 locations:
1. Input `onChange` handler (~L1456): +1 line cap for flat
2. `handleApplyDiscount` (~L374): +1 line validation for flat

---

## Open Decisions

- **OD-615-01:** When flat discount exceeds total, should the input be hard-capped (auto-change to max) or show a warning toast? Recommendation: hard-cap (same UX as percent → 100 cap).

---

## Gate Status

- Gate 1: **COMPLETE** (this document)
- Gate 2: Awaiting "Gate 2 GO" → Impact Analysis
