# Impact Analysis — Expense INTAKE Batch (Gate 2)

**Date:** 2026-07-17
**Role:** PLANNING (Gate 2 — Impact Analysis Only)
**Items:** BUG-177, BUG-178, BUG-179, BUG-180, BUG-181, BUG-205, CR-062
**Sprint:** pos_5_0

---

## Code Reality Check (MANDATORY — Step 0)

### FINDING: 5 of 7 items are ALREADY IMPLEMENTED in code

| ID | Registry Status | Code Reality | Evidence | Action |
|---|---|---|---|---|
| **BUG-177** | INTAKE | **FULL** | Notes input at L354-362, wired in save payload (`expenseService.js` L143+L163, `expenseTransform.js` L255+L271), table column L713, edit mode L745-749, display L779-780. All marked `// BUG-177`. | **STOP — CLOSURE Phase B** |
| **BUG-178** | INTAKE | **FULL** | L729-730: `{editRow.expense}` renders plain text (not input). Comment: `// BUG-178: item name read-only in edit mode`. | **STOP — CLOSURE Phase B** |
| **BUG-179** | INTAKE | **FULL** | L196-224: `buildExportPayload()` builds `{ title, sheets: [{ columns, rows, totals }] }`. L236: `exportReportAsExcel(payload)`. Import at L16. Comment: `// BUG-179 + BUG-180`. | **STOP — CLOSURE Phase B** |
| **BUG-180** | INTAKE | **FULL** | L228-241: `handleDownloadAction` calls `openReportWindow()` + `exportReportAsPDF(pdfWin, payload)`. Import at L16. Comment: `// BUG-179 + BUG-180`. | **STOP — CLOSURE Phase B** |
| **BUG-181** | INTAKE | **FULL** | Header L712: "Added By". Display L777-778: `tx.employeeName`. Edit L743-744 (read-only). All marked `// BUG-181`. | **STOP — CLOSURE Phase B** |
| **BUG-205** | INTAKE | **NONE** | Transform maps `quantity` (L120) and `unit` (L121) but zero rendering code exists in either table. | **Proceed — Gate 2 below** |
| **CR-062** | INTAKE | **NONE** | Backend task. No FE aggregation endpoint code. Blocked by CR-061 owner smoke. | **BLOCKED — no action** |

**Per AGENT_PROMPT_ALPHA.md R0 / Planning Step 0:**
> "FULL: STOP. Hand to CLOSURE Phase B for retroactive registration. Do NOT re-plan implemented work."

**BUG-177, BUG-178, BUG-179, BUG-180, BUG-181** must be advanced to IMPLEMENTED in the registry. They were implemented during prior sessions but registry was never updated past INTAKE. Recommend owner batch-flip these to IMPLEMENTED → QA PASS → OWNER SMOKE queue.

---

## Gate 2: Impact Analysis — BUG-205

### Summary
Qty and Unit columns are missing from both expense tables. Transform already maps the fields. Pure display addition — no API, state, or logic changes.

### Data Flow Trace

```
API: GET /expense/expenses-report → response.report[].quantity, response.report[].unit
  ↓
Transform: expenseTransform.js L120-121
  quantity: parseFloat(t.quantity ?? 0)
  unit: t.unit ?? ''
  ↓
State: stored in aggregated.transactions[] (via ExpenseReportPage useMemo)
       stored in transactions[] (via ExpenseEntryPanel useEffect)
  ↓
Component: ExpenseEntryPanel.jsx L707-714 (table headers) + L767-780 (row cells)
           ExpenseReportPage.jsx L211-219 (columns config) + L411-417 (headers) + L428-435 (cells)
  ↓
UI: BREAK POINT — fields exist in data, never rendered
```

### Conflict Pre-Check

| File | Last Modifier | Other Open Items | Conflict? |
|---|---|---|---|
| `ExpenseEntryPanel.jsx` | BUG-204 (2026-07-17) | BUG-203 Sub-D (Gate 3, not impl) | NO — Sub-D touches edit row amount logic, BUG-205 adds display-only columns. Parallel-safe. |
| `ExpenseReportPage.jsx` | CR-061 (original build) | None open | NO |

### Risk: LOW
- Read-only display columns
- No API change, no state change, no logic change
- No financial impact
- No hotspot files (R5)

### Affected Files + Exact Locations

**File 1: `components/expense/ExpenseEntryPanel.jsx`**

| Location | Current | Change Needed |
|---|---|---|
| L709 (after Category `<th>`) | No Qty/Unit headers | Add 2 `<th>`: "Qty", "Unit" |
| L732 (edit mode, after Category `<td>`) | No Qty/Unit cells | Add 2 read-only `<td>`: `tx.quantity`, `tx.unit` |
| L774 (view mode, after Category `<td>`) | No Qty/Unit cells | Add 2 `<td>`: `tx.quantity || "—"`, `tx.unit || "—"` |
| L802 (tfoot `colSpan`) | `colSpan={3}` | Update to `colSpan={5}` (Time + Item + Category + Qty + Unit) |
| L806 (tfoot empty `colSpan`) | `colSpan={4}` | Update to `colSpan={4}` (unchanged — Payment + AddedBy + Notes + Actions) |

~10 lines added.

**File 2: `pages/reports-module/ExpenseReportPage.jsx`**

| Location | Current | Change Needed |
|---|---|---|
| L215 (columns config, after Category) | No Qty/Unit entries | Add 2 column objects: `{ key: 'quantity', label: 'Qty', ... }`, `{ key: 'unit', label: 'Unit', ... }` |
| L413 (after Category `<th>`) | No Qty/Unit headers | Add 2 `<th>`: "Qty", "Unit" |
| L431 (after Category `<td>`) | No Qty/Unit cells | Add 2 `<td>`: `t.quantity || "—"`, `t.unit || "—"` |
| L398 (comment) | `7 columns` | Update to `9 columns` |
| L422 (empty state `colSpan`) | `colSpan={7}` | Update to `colSpan={9}` |
| L444 (tfoot `colSpan` for label) | `colSpan={3}` | Update to `colSpan={5}` |
| L445 (tfoot empty `colSpan`) | `colSpan={3}` | Update to `colSpan={3}` (unchanged — Payment + AddedBy + Notes) |

~10 lines added.

### Downstream Consumers
- **Excel/PDF export** (`buildExportPayload` L196-224): Uses `columns` config array from L212-219. Adding qty/unit to the columns config will automatically include them in exports. No separate fix needed.
- **Search filter** (L148): Searches `employeeName` and text fields. Qty/Unit are numeric — no impact on search.

### Owner Decisions Needed
**None.** Data already exists, just needs display.

### Related Items Impact
- **BUG-203 Sub-D** (edit row qty/amount for priced items): Gate 3 plan exists but not implemented. BUG-205 adds Qty column in view/read-only mode. Sub-D later adds editable qty in edit mode. No conflict — parallel-safe.
- **CR-062** (backend aggregation): When this ships, the `quantity` and `unit` fields will still be in the response. No conflict.

---

## Gate 2: CR-062 — Status

**BLOCKED.** CR-062 is a backend task that depends on CR-061 owner smoke sign-off. CR-061 is IMPLEMENTED and awaiting owner smoke. No FE planning possible until:
1. Owner smokes CR-061 (expense report)
2. FE team documents exact aggregation needs
3. Backend team builds endpoint

**No action this session.**

---

## Registry Updates Required

### Immediate — Advance 5 items from INTAKE → IMPLEMENTED

| ID | Current Status | New Status | Rationale |
|---|---|---|---|
| BUG-177 | INTAKE | IMPLEMENTED | Code exists: notes field in add form, save payload, table column, edit mode |
| BUG-178 | INTAKE | IMPLEMENTED | Code exists: item name renders as plain text in edit mode |
| BUG-179 | INTAKE | IMPLEMENTED | Code exists: `buildExportPayload` + `exportReportAsExcel(payload)` |
| BUG-180 | INTAKE | IMPLEMENTED | Code exists: `openReportWindow()` + `exportReportAsPDF(pdfWin, payload)` |
| BUG-181 | INTAKE | IMPLEMENTED | Code exists: "Added By" header + `tx.employeeName` cell + edit read-only |

### BUG-205 — Advance to Gate 2 Complete

| ID | Current Status | New Status |
|---|---|---|
| BUG-205 | INTAKE | GATE 2 COMPLETE — Impact Analysis done |

### CR-062 — No change (remains BLOCKED)

---

## Blockers for Owner

1. **BUG-177/178/179/180/181:** These 5 bugs are already implemented in code but stuck at INTAKE in registry. Approve batch-flip to IMPLEMENTED? Then they join the owner smoke queue.
2. **CR-062:** Blocked by CR-061 owner smoke. No action until that clears.
3. **BUG-205:** Impact Analysis complete. Proceed to Gate 3 (Implementation Plan)?
