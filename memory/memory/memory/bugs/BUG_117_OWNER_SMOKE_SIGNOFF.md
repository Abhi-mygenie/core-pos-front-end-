# BUG-117 — Owner Smoke Sign-off (Gate 6)

**Bug:** BUG-117 — Audit side-sheet GST renders negative on VAT/mixed-tax orders
**Date:** 2026-06-08
**Owner:** Approved (verbatim: "117 approved")
**Status:** CLOSED — OWNER VERIFIED

---

## Smoke Test Checklist (for Owner)

Login to preprod as `owner@lafetta.com` and verify each item below. Replies of "approved" or per-line ticks acceptable.

### A. Audit Report — Side-Sheet

| # | Order | Field | Before fix | Expected after fix | ✅ / ❌ |
|---|---|---|---|---|---|
| 1 | 012553 | GST | ₹-44 | **₹0** | |
| 1 | 012553 | VAT | ₹44 | ₹44 (unchanged) | |
| 1 | 012553 | Grand Total | ₹1,494 | ₹1,494 (unchanged) | |
| 2 | 012554 | GST | ₹0 | ₹0 (unchanged) | |
| 2 | 012554 | VAT | ₹0 | ₹0 (unchanged) | |
| 2 | 012554 | Grand Total | ₹1,400 | ₹1,400 (unchanged) | |
| 3 | 012555 | GST | ₹-26 | **₹0** | |
| 3 | 012555 | VAT | ₹26 | ₹26 (unchanged) | |
| 3 | 012555 | Grand Total | ₹1,546 | ₹1,546 (unchanged) | |

### B. Order Ledger — Tax Columns + Audit Highlight

| # | Order | Column | Before fix | Expected after fix | ✅ / ❌ |
|---|---|---|---|---|---|
| 4 | 012553 | "GST" col | ₹-44 | **₹0** | |
| 4 | 012553 | "GST (excl. VAT)" col | ₹-44 | **₹0** | |
| 4 | 012553 | "VAT" col | ₹44 | ₹44 (unchanged) | |
| 4 | 012553 | Row orange highlight | orange (RED FE-86) | clean / white | |
| 5 | 012555 | "GST" col | ₹-26 | **₹0** | |
| 5 | 012555 | Row orange highlight | orange | clean / white | |

### C. Regression — Mixed GST + VAT (bar restaurant)

If a bar order (with both GST and VAT items on the same order) is placed/available, verify GST shows the correct positive value (not 0).

### D. Daily Tax Totals

| Report | Expected behaviour |
|---|---|
| Sales report — daily tax total | Should match Σ(items.tax_amount). Was under-reporting on bar orders. |
| Food Court — per-station tax | Same — corrected on bar restaurants. |

---

## Sign-off

> **Owner please reply "approved" (or describe any deviation observed).**

When approved, this bug will be marked **CLOSED — OWNER VERIFIED** in `BUG_TRACKER.md` and `registry.json` (completeness: 7/7).

---

## Artifacts (when closed)

| # | Artifact | Path |
|---|----------|------|
| 1 | Intake (re-scoped) | `/app/memory/memory/bugs/BUG_117_AUDIT_SIDESHEET_DISCOUNT_TEXT_INTAKE.md` |
| 2 | Impact Analysis | `/app/memory/memory/bugs/BUG_117_IMPACT_ANALYSIS.md` |
| 3 | Implementation Plan | `/app/memory/memory/bugs/BUG_117_IMPLEMENTATION_PLAN.md` |
| 4 | Code Gate | `/app/memory/memory/bugs/BUG_117_CODE_GATE.md` |
| 5 | Implementation Summary | `/app/memory/memory/bugs/BUG_117_IMPLEMENTATION_SUMMARY.md` |
| 6 | Owner Smoke Sign-off | `/app/memory/memory/bugs/BUG_117_OWNER_SMOKE_SIGNOFF.md` (this file) |
