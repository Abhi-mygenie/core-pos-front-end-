# BUG-205 — Implementation Plan (Gate 3)

**Date:** 2026-07-17
**Role:** PLANNING (Gate 3)
**Sprint:** pos_5_0
**Preceding:** Gate 2 Impact Analysis in `impact/EXPENSE_INTAKE_BATCH_IMPACT_ANALYSIS_2026_07_17.md`
**Code Reality:** NONE
**Risk:** LOW

---

## Scope-Lock

**Files WILL change:**
- `components/expense/ExpenseEntryPanel.jsx`
- `pages/reports-module/ExpenseReportPage.jsx`

**Files will NOT touch:**
- `api/transforms/expenseTransform.js` (already maps qty/unit — no change)
- `api/services/expenseService.js` (no API change)
- `ExpenseSetupPanel.jsx`, `ExpenseBulkEditor.jsx` (not relevant)

---

## Clubbing Assessment

| Related Item | Overlap | Club? | Reason |
|---|---|---|---|
| BUG-203 Sub-D | Same file (`ExpenseEntryPanel.jsx`) but different location (edit-row amount logic vs display columns) | **NO** | Parallel-safe. Sub-D modifies edit-row amount/qty fields. BUG-205 adds read-only columns to headers + view rows. Independent changes. |
| BUG-203 Sub-B/C | Different files (`ExpenseBulkEditor.jsx`, `ExpenseSetupPanel.jsx`) | **NO** | Zero overlap. |

**Conclusion:** BUG-205 ships standalone. ~20 lines, 6 edits, 2 files.

---

## Execution Sequence

### Edit 1 — EntryPanel: Add Qty + Unit headers

**File:** `ExpenseEntryPanel.jsx`
**Location:** L709 → insert AFTER Category `<th>`, BEFORE Amount `<th>`
**Current (L709-L710):**
```jsx
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Category</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Amount</th>
```
**New:**
```jsx
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Category</th>
                    {/* BUG-205: Qty + Unit columns */}
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Qty</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Unit</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Amount</th>
```

### Edit 2 — EntryPanel: Add Qty + Unit cells in EDIT mode

**File:** `ExpenseEntryPanel.jsx`
**Location:** L732 → insert AFTER Category `<td>`, BEFORE Amount `<td>` (edit branch)
**Current (L732-L733):**
```jsx
                          <td className="px-4 py-2" style={{ color: COLORS.grayText }}>{tx.category}</td>
                          <td className="px-4 py-2">
```
**New:**
```jsx
                          <td className="px-4 py-2" style={{ color: COLORS.grayText }}>{tx.category}</td>
                          {/* BUG-205: Qty + Unit (read-only in edit) */}
                          <td className="px-4 py-2 text-right text-xs" style={{ color: COLORS.grayText }}>{tx.quantity || "—"}</td>
                          <td className="px-4 py-2 text-xs" style={{ color: COLORS.grayText }}>{tx.unit || "—"}</td>
                          <td className="px-4 py-2">
```

### Edit 3 — EntryPanel: Add Qty + Unit cells in VIEW mode

**File:** `ExpenseEntryPanel.jsx`
**Location:** L773-L775 → insert AFTER Category `</td>`, BEFORE Amount `<td>`
**Current (L774-L775):**
```jsx
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold" style={{ color: COLORS.darkText }}>{fmt(tx.amount)}</td>
```
**New:**
```jsx
                          </td>
                          {/* BUG-205: Qty + Unit columns */}
                          <td className="px-4 py-2.5 text-right text-xs" style={{ color: COLORS.grayText }} data-testid={`expense-qty-${tx.id}`}>{tx.quantity || "—"}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: COLORS.grayText }} data-testid={`expense-unit-${tx.id}`}>{tx.unit || "—"}</td>
                          <td className="px-4 py-2.5 text-right font-semibold" style={{ color: COLORS.darkText }}>{fmt(tx.amount)}</td>
```

### Edit 4 — EntryPanel: Update tfoot colSpans

**File:** `ExpenseEntryPanel.jsx`
**Location:** L802 + L806
**Current:**
```jsx
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold" ...>Total</td>
                    ...
                    <td colSpan={4} />
```
**New:**
```jsx
                    <td colSpan={5} className="px-4 py-3 text-sm font-semibold" ...>Total</td>
                    ...
                    <td colSpan={4} />
```
(Total label spans: Time + Item + Category + Qty + Unit = 5. Remaining: Payment + AddedBy + Notes + Actions = 4, unchanged.)

### Edit 5 — ReportPage: Add Qty + Unit to columns config + headers + cells

**File:** `ExpenseReportPage.jsx`
**Location:** L215 → insert AFTER Category column object, BEFORE Amount
**Current (L215-L216):**
```jsx
          { key: 'category',      label: 'Category',  format: 'text',  width: 120 },
          { key: 'amount',        label: 'Amount',    format: 'inr',   width: 110, align: 'right' },
```
**New:**
```jsx
          { key: 'category',      label: 'Category',  format: 'text',  width: 120 },
          { key: 'quantity',      label: 'Qty',       format: 'text',  width: 70,  align: 'right' },  // BUG-205
          { key: 'unit',          label: 'Unit',      format: 'text',  width: 80 },                   // BUG-205
          { key: 'amount',        label: 'Amount',    format: 'inr',   width: 110, align: 'right' },
```

**Location:** L413 → insert AFTER Category `<th>`, BEFORE Amount `<th>`
**Current (L413-L414):**
```jsx
                          <th className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase">Category</th>
                          <th className="px-4 py-3 text-right text-[10px] font-semibold text-zinc-500 uppercase">Amount</th>
```
**New:**
```jsx
                          <th className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase">Category</th>
                          <th className="px-4 py-3 text-right text-[10px] font-semibold text-zinc-500 uppercase">Qty</th>
                          <th className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase">Unit</th>
                          <th className="px-4 py-3 text-right text-[10px] font-semibold text-zinc-500 uppercase">Amount</th>
```

**Location:** L431 → insert AFTER Category `<td>`, BEFORE Amount `<td>`
**Current (L431-L432):**
```jsx
                              <td className="px-4 py-3 text-sm text-zinc-600">{t.category}</td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-zinc-900 tabular-nums">{fmtINR(t.amount)}</td>
```
**New:**
```jsx
                              <td className="px-4 py-3 text-sm text-zinc-600">{t.category}</td>
                              <td className="px-4 py-3 text-sm text-right text-zinc-600 tabular-nums" data-testid={`expense-report-row-qty-${t.id}`}>{t.quantity || '\u2014'}</td>
                              <td className="px-4 py-3 text-sm text-zinc-600" data-testid={`expense-report-row-unit-${t.id}`}>{t.unit || '\u2014'}</td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-zinc-900 tabular-nums">{fmtINR(t.amount)}</td>
```

### Edit 6 — ReportPage: Update colSpans + comment

**File:** `ExpenseReportPage.jsx`
**Location:** L398, L422, L444
**Current:**
```
L398: {/* Transaction Table — 7 columns */}
L422: colSpan={7}
L444: colSpan={3}  (Total label)
```
**New:**
```
L398: {/* Transaction Table — 9 columns */}    // BUG-205
L422: colSpan={9}                               // BUG-205
L444: colSpan={5}                               // BUG-205: Date + Item + Category + Qty + Unit
```
(Empty tfoot `colSpan={3}` at L445 stays: Payment + AddedBy + Notes = 3.)

---

## Verification Matrix

| Edit # | File | Change | How to Verify | Automated? |
|---|---|---|---|---|
| 1 | ExpenseEntryPanel.jsx | Qty + Unit headers | Browser: /add-expenses → table shows Qty, Unit column headers | NO |
| 2 | ExpenseEntryPanel.jsx | Qty + Unit in edit row | Browser: click edit → Qty/Unit show as read-only | NO |
| 3 | ExpenseEntryPanel.jsx | Qty + Unit in view row | Browser: transaction row shows qty value + unit | NO |
| 4 | ExpenseEntryPanel.jsx | tfoot colSpan | Browser: Total row aligns correctly under Amount column | NO |
| 5 | ExpenseReportPage.jsx | Columns config + headers + cells | Browser: /reports-module/expense-report → Qty + Unit columns visible | NO |
| 6 | ExpenseReportPage.jsx | colSpans + comment | Browser: empty state + total row span correctly | NO |
| — | ExpenseReportPage.jsx | Export auto-inherits | Browser: Excel export includes Qty + Unit columns (via columns config) | NO |

---

## Post-Code Registry Checklist

- [ ] `registry.json`: BUG-205 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] `BUG_TRACKER.md`: BUG-205 row updated
- [ ] `FILE_OWNERSHIP.md`: `ExpenseEntryPanel.jsx` + `ExpenseReportPage.jsx` listed with BUG-205 + date
- [ ] Code markers: `// BUG-205` comment in every modified section
- [ ] Compile check: webpack 0 new warnings

---

## Owner Decisions Needed

**None.** All edits are mechanical column additions with no business logic.

---

## Next

Awaiting **Gate 4 GO** → Implementation.
