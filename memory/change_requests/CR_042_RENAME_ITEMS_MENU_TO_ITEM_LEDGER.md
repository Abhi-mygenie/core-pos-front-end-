# CR-042 — Rename "Items & Menu" to "Item Ledger" in Sidebar (Insights)

**Status:** REGISTERED — INTAKE COMPLETE
**Created:** 2026-06-12
**Type:** CR (Change Request)
**Area:** Sidebar Navigation (Insights section)
**Priority:** P3 (cosmetic — label rename for naming consistency with "Order Ledger")
**Sprint:** POS 4.0

---

## 1. Requirement

Under the **Insights** section in the sidebar, rename:

| Current Label | New Label |
|---------------|-----------|
| Items & Menu | **Item Ledger** |

Rationale: Aligns naming convention with "Order Ledger" already present in the same section. Both are ledger-style detailed data screens.

---

## 2. Scope (preliminary)

- **Sidebar.jsx** — label string change
- **Report page header** — if the page title echoes "Items & Menu", rename to "Item Ledger" there too (likely `ItemSalesHybridMockup.jsx` or similar)
- **Exports (Excel/PDF)** — if sheet titles or headers say "Items & Menu" or "Item Sales", may need renaming to "Item Ledger" for consistency

---

## 3. Impact

- **Files:** 1–3 files (Sidebar label + page header + possibly export titles)
- **Regression risk:** LOW — label-only change
- **Money/payload impact:** NONE

---

## 4. Gate Status

| Gate | Status |
|------|--------|
| 0 — Registration | ✅ COMPLETE |
| 1 — Intake | ✅ COMPLETE (this document) |
| 2 — Impact Analysis | PENDING |
| 3 — Implementation Plan | PENDING |
| 4 — Code Gate | PENDING |
| 5 — Implementation + QA | PENDING |
| 6 — Owner Smoke | PENDING |

---

*CR-042 Intake — 2026-06-12*
