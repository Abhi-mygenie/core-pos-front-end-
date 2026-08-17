# CR-043 — Credit Per-Customer Totals in Reports + Portfolio Export Optimization

**Status:** REGISTERED — INTAKE COMPLETE
**Created:** 2026-06-12
**Type:** CR (Change Request)
**Area:** Credit Management / Reports / Portfolio Export
**Priority:** P2 (performance optimization + data enrichment)
**Sprint:** POS 4.0

---

## 1. Requirement

Backend now ships **per-customer** `total_credit` / `total_debit` on each customer object in the `tap-waiter-list` response. This data was previously only available via individual `tap-customer-record-list` calls (one per customer).

New opportunities:

### A. Portfolio Summary Export Optimization
Currently: `handlePortfolioExport` in `CreditManagementPanel.jsx` (L282-301) makes **N individual API calls** to `getTabCustomerRecords` (batched 5 at a time) just to get per-customer `totalCredit`/`totalPaid`. For 41 customers = 9 batch rounds.

Now possible: Read `total_credit`/`total_debit` directly from the list response. **Eliminates all N API calls.** Export becomes instant.

### B. Reports Enrichment (scope TBD)
Per-customer credit totals can enrich:
- **Insights Dashboard** — show Total Credit / Total Paid breakdown (not just Outstanding)
- **Settlement Report** — cross-reference credit settled vs outstanding
- **Order Ledger** — credit customer context on TAB orders

### C. CR-026 §3 Closure
CR-026 raised a backend ask: *"tap-waiter-list must return totals at top level"*. Backend has shipped this. CR-039 wires the portfolio-level summary. CR-043 uses the per-customer fields.

---

## 2. Data Available (from API screenshot)

Per customer object:
```json
{
  "id": 2579,
  "name": "parth",
  "total_credit": "415.00",
  "total_debit": "0.00",
  "balance": "415.00"
}
```
Values are comma-formatted strings (e.g., `"3,000.00"`).

---

## 3. Gate Status

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

*CR-043 Intake — 2026-06-12*
