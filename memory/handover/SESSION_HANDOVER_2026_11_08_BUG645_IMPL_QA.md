# SESSION HANDOVER — BUG-645 Implementation + QA — 2026-11-08

**From:** Implementation agent (E1)
**Date:** 2026-11-08
**For:** Owner smoke / next agent

---

## Summary

BUG-645 GATE_5B_QA_PASS. Payment filter on Order Report Beta and Daily Orders Report now shows correct split-payment leg amounts. 3 files, 10 edits (Batch A/B/C). All 6 QA tests PASS with live data.

---

## What Was Done

**Batch A — Beta dropdown (E-2):**
- `extractFilterOptions` now walks each partial order's `payment{}` object and adds individual methods (cash/upi/card) to the dropdown where value > 0.

**Batch B — Beta filter + amounts (E-1, E-3, E-4, E-5, E-6):**
- Added `getDisplayAmount(row, paymentFilter)` helper.
- `applyFilters` uses BUG-272-style leg-matching: cash filter includes `partial` rows where `payment.cash > 0`.
- Row amount shows leg (e.g. ₹500) with `(of ₹610)` note.
- Day total and grand total sum leg amounts only.

**Batch C — Audit amounts (E-7, E-8, E-9, E-10):**
- After BUG-272 filter, partial rows annotated with `_displayAmount = cashAmount/upiAmount/cardAmount`.
- `calculateSummary` replaced with `_displayAmount`-aware inline sum.
- `OrderTable` amount cells read `_displayAmount ?? order.amount`.

---

## QA Results

| Batch | Test | Result |
|-------|------|--------|
| A | Payment dropdown includes cash/upi/card | ✅ PASS |
| B | Cash filter shows split order #023217 | ✅ PASS |
| B | Row shows ₹500 leg (not ₹610 full) | ✅ PASS |
| B | Row shows "(of ₹610)" note | ✅ PASS |
| B | Day total sums leg amounts | ✅ PASS |
| B | Partial filter regression — full amount | ✅ PASS |
| C | Audit: T-020452 shows ₹1,200 leg (of ₹2,720) | ✅ PASS (iteration_1) |
| C | Audit summary sums leg amounts (₹3,836) | ✅ PASS (iteration_1) |
| C | No filter: full amounts unchanged | ✅ PASS (iteration_1) |

Test accounts: `owner@palmhouse.com` / `Qplazm@10` (Beta), `owner@cafe103.com` / `Qplazm@10` (Audit)

---

## Files Changed

| File | Edits | Markers |
|------|-------|---------|
| `src/pages/reports-module/OrderReportBetaPage.jsx` | E-1..E-6 | 6 |
| `src/pages/AllOrdersReportPage.jsx` | E-7..E-8 | 2 |
| `src/components/reports/OrderTable.jsx` | E-9..E-10 | 1 |

---

## Registry

- `registry.json`: BUG-645 → `GATE_5B_QA_PASS`
- `BUG_TRACKER.md`: row updated
- `FILE_OWNERSHIP.md`: 3 files added
- EXIT GATE: 5/5 PASS

---

## Related

- CR-505 (Partial Payment Split + Totals widget) — GATE_1_INTAKE, can reference `_displayAmount` when implemented
- BUG-272 (original partial payment leg parsing) — the foundation this fix builds on
