# BUG-205 — Expense: Qty/Unit Columns Missing from Transaction Table + Report

**ID:** BUG-205
**Type:** BUG
**Created:** 2026-07-17
**Created by:** INTAKE AGENT (from Finding B — SESSION_HANDOVER_2026_07_17_FULL_DAY.md)
**Sprint:** pos_5_0
**Status:** INTAKE

---

## 1. Description

Both the Expense Entry daily transaction table (`/add-expenses`) and the Expense Report table (`/reports-module/expense-report`) are missing Qty and Unit columns. The backend returns `quantity` and `unit` per transaction, and the FE transform already maps them (`expenseTransform.js` L120-121: `quantity: parseFloat(t.quantity)`, `unit: t.unit`), but neither table renders these fields.

Users cannot see how many units of an item were purchased or what unit was used — they only see the final amount.

## 2. Evidence

- **Source:** AGENT-DISCOVERED (Finding B, Jul 17 full-day session)
- **Confidence:** CONFIRMED (code trace + API response verified)
- **Code locations:**
  - `ExpenseEntryPanel.jsx` L707-714: Table headers are Time, Item, Category, Amount, Payment, Added By, Notes, Actions — **no Qty, no Unit**
  - `ExpenseReportPage.jsx` L211-219: Column config is Date, Item, Category, Amount, Payment, Added By, Notes — **no Qty, no Unit**
  - `ExpenseReportPage.jsx` L411-417: HTML `<th>` headers match — no Qty, no Unit
- **Transform already maps the fields:**
  - `expenseTransform.js` L120: `quantity: parseFloat(t.quantity ?? 0)`
  - `expenseTransform.js` L121: `unit: t.unit ?? ''`
- **API returns the data:** Expense report endpoint returns `quantity`, `unit`, and `physical_quantity` per record (confirmed by sample record keys from curl)

## 3. Classification

| Field | Value |
|-------|-------|
| **Priority** | P2 (MEDIUM) — data exists but not displayed; no data loss, no financial impact |
| **Risk** | LOW — read-only display columns, no logic/API/state change |
| **Fast Lane eligible** | NO — 2 files, ~20 lines (exceeds 1-file limit) |

## 4. Blast Radius

- **Files:** 2
  - `components/expense/ExpenseEntryPanel.jsx` — add 2 `<th>` headers (after Category, before Amount) + 2 `<td>` cells in row render
  - `pages/reports-module/ExpenseReportPage.jsx` — add 2 entries in `columns` config array + 2 `<th>` headers + 2 `<td>` cells
- **Lines:** ~20 total (~10 per file)
- **Hotspot files:** NO
- **Financial logic:** NO (read-only display)
- **Scope:** SMALL

## 5. Duplicate Check

**DISTINCT**

- BUG-173 (Unit column collected but never *sent* in BulkEditor) — RETIRED/SUPERSEDED by CR-074-B. Different surface (setup panel vs transaction table/report). DISTINCT.
- BUG-181 (Added By column missing) — same pattern (missing column) but different column. RELATED but DISTINCT.
- No existing bug covers qty/unit display in transaction table or report.

## 6. Related

- BUG-181 — same pattern: column exists in data, missing from table. RELATED.
- BUG-176 — wired `quantity`/`unit`/`physical_quantity` into the Add form. The data now gets stored but never displayed back. RELATED.
- BUG-204 — qty × unitPrice auto-calc added to Add form. Qty is captured on entry but invisible in the transaction history. RELATED.
- CR-061 — Expense Report FE build. The report was built without qty/unit columns. RELATED.

## 7. Open Questions

None. Data flow is clear: API → transform → fields exist in state → not rendered.

## 8. Next

Planning Gate 2 (Impact Analysis) — straightforward, may be combined with Gate 3 in a single pass given LOW risk.
