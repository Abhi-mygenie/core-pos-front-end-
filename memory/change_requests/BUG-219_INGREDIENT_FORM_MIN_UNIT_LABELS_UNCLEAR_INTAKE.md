# BUG-219 — Ingredient Form: Min Unit is Text Input, Labels for Factor/Min Q/Min U Are Unclear

**ID:** BUG-219
**Type:** BUG
**Created:** 2026-07-22
**Severity:** P2 (MEDIUM)
**Risk:** LOW
**Module:** Inventory — Ingredients Setup (InventorySetupPanel — Add & Edit forms)
**Duplicate Check:** NONE — fresh UX issue on ingredient form labels/inputs.
**Code Reality:** CONFIRMED — `InventorySetupPanel.jsx:270-290`: `conversionFactor` has placeholder "Factor...", `minUnitAlert` is a `<Input type="number">` (should be a select matching `smallUnit` options), `minQtyAlert` placeholder is unlabeled.
**Source:** OWNER-REPORTED (session 2026-07-22)
**Confidence:** CONFIRMED (code verified)

---

## Description

Three sub-issues on the Ingredient Add/Edit form:

### A — Min Unit Alert is a free-text/number input
- `minUnitAlert` field lets owner type any string/number
- It should be a **dropdown** matching the same unit options as `smallUnit` (the conversion target unit)
- Example: if `smallUnit = "grams"`, then `minUnitAlert` dropdown should also show "grams"

### B — "Factor" label is ambiguous
- The `conversionFactor` input has placeholder "Factor..." with no label above it
- Owner doesn't know what "Factor" means in context
- Should label as: **"Conv. Factor (1 [base unit] = ? [small unit])"** or similar

### C — "Min Qty" and "Min Unit" column headers/labels are confusing
- "Min Qty Alert" → should be "Min Alert (Base Unit)" or "Alert Threshold (base unit qty)"
- "Min Unit Alert" → should be "Min Alert (Small Unit)" or "Alert Threshold (small unit qty)"

---

## Evidence

- Code: `InventorySetupPanel.jsx:270-290` — add form inputs
- Code: `InventorySetupPanel.jsx:322-340` — edit form inputs (same structure)
- `minUnitAlert` uses `<Input type="number">` at line 284/336 — not a select
- `conversionFactor` placeholder is `"Factor..."` — no descriptive label

---

## Blast Radius

- 1 file: `InventorySetupPanel.jsx`
- ~20-25 lines change (label text, minUnitAlert → select, add new state for smallUnit sync)
- Hotspot: NO
- Scope: SMALL (1 file)

---

## Fix Plan (seeding — formal plan at Gate 3)

1. Change `minUnitAlert` input to `<select>` with same options as `smallUnit` dropdown (bound to the selected `smallUnit` value + unit list)
2. Add descriptive label above `conversionFactor`: "1 [unit] = ? [smallUnit]" (dynamic, updates as unit/smallUnit change)
3. Rename "Factor..." placeholder to "e.g. 1000"
4. Update column headers: "Min Alert (Base)" and "Min Alert (Small)" or cleaner equivalents
5. Apply same change to edit form

---

## Next
Planning Gate 2 → Gate 3 → Implementation
