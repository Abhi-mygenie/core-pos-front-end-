# CR-087 — Gate 3 Implementation Plan
## New Expense Payment Fields: `payment_made_to` + `payment_ref_id`

**Date:** 2026-07-22
**Planning Role:** GATE 3 — Implementation Plan (Gate 2 already complete)
**Code Reality:** NONE — zero existing FE code for these fields
**Risk Classification:** MEDIUM — component state, table columns, non-financial fields
**Gate 2 Source:** `/app/memory/impact/LEARNING_SUMMARY_OQ_CLOSURE_2026_07_22.md`

---

## Conflict Pre-Check

| File | Last Modified By | Open Conflicts? |
|---|---|---|
| `api/transforms/expenseTransform.js` | BUG-202-fwd-compat IMPL agent | NONE |
| `components/expense/ExpenseEntryPanel.jsx` | CR-083 agent (split payment) | NONE |
| `pages/reports-module/ExpenseReportPage.jsx` | BUG-205 agent (Qty+Unit cols) | NONE |

---

## Scope Lock

**Files I WILL change:**
1. `api/transforms/expenseTransform.js`
2. `components/expense/ExpenseEntryPanel.jsx`
3. `pages/reports-module/ExpenseReportPage.jsx`

**Files I will NOT touch:**
- `api/services/expenseService.js` — existing `addExpenseEntry` + `editExpenseEntry` are pass-through; no new endpoints needed
- `api/services/expenseReportService.js` — `aggregateExpenses` preserves all transaction fields; no change needed
- `ExpenseSetupPanel.jsx` — separate panel, not in scope
- Any other file

---

## Edit-by-Edit Plan

### EDIT 1 — `expenseTransform.js`: `fromAPI.expenseReport` — add new fields to transaction map

**File:** `api/transforms/expenseTransform.js`
**Line range:** 111–126 (transaction `map((t) => ({...}))`)

**Current (lines 122-126):**
```js
        // CR-061 V3 — G4 + G5 fields (safe fallback if absent)
        employeeName:  t.employee_name    ?? '',
        notes:         t.notes            ?? '',
      })),
    };
```

**New:**
```js
        // CR-061 V3 — G4 + G5 fields (safe fallback if absent)
        employeeName:   t.employee_name    ?? '',
        notes:          t.notes            ?? '',
        // CR-087: payment context fields (safe fallback — backend delivers both as "" when absent)
        paymentMadeTo:  t.payment_made_to  ?? '',
        paymentRefId:   t.payment_ref_id   ?? '',
      })),
    };
```

**Risk:** LOW. Fallback to `''` — backward compatible if API doesn't return field yet.
**Verification:** After implementation, `fromAPI.expenseReport(mockRes)` returns objects with `paymentMadeTo` + `paymentRefId`.

---

### EDIT 2 — `expenseTransform.js`: `toAPI.addExpenseEntry` — add fields to detail lines

**File:** `api/transforms/expenseTransform.js`
**Lines:** 254-256

**Current:**
```js
      physical_quantity: 0,           // deprecated — always 0
      notes: l.notes ?? '',           // BUG-177: notes field
    })),
```

**New:**
```js
      physical_quantity: 0,           // deprecated — always 0
      notes:            l.notes            ?? '',   // BUG-177
      payment_made_to:  l.payment_made_to  ?? '',   // CR-087
      payment_ref_id:   l.payment_ref_id   ?? '',   // CR-087
    })),
```

**Risk:** LOW. Empty string default — backend already accepts both.
**Verification:** Network payload for POST /store-expense-details includes both fields.

---

### EDIT 3 — `expenseTransform.js`: `toAPI.editExpenseEntry` — add fields

**File:** `api/transforms/expenseTransform.js`
**Lines:** 270-272

**Current:**
```js
    physical_quantity: 0,               // deprecated — always 0
    notes: data.notes ?? '',            // BUG-177: notes field
  }),
```

**New:**
```js
    physical_quantity: 0,               // deprecated — always 0
    notes:            data.notes            ?? '',   // BUG-177
    payment_made_to:  data.payment_made_to  ?? '',   // CR-087
    payment_ref_id:   data.payment_ref_id   ?? '',   // CR-087
  }),
```

**Risk:** LOW.
**Verification:** Network payload for PUT /edit-expense/{id} includes both fields.

---

### EDIT 4 — `ExpenseEntryPanel.jsx`: `EMPTY_LINE` — add default values

**File:** `components/expense/ExpenseEntryPanel.jsx`
**Line:** 37-38 (between `notes` and `splitPayments`)

**Current:**
```js
  notes: "",           // BUG-177: notes field — backend accepts and stores
  splitPayments: null, // CR-083: null=single payment, [{method,amount}]=split mode
```

**New:**
```js
  notes: "",             // BUG-177: notes field — backend accepts and stores
  payment_made_to: "",   // CR-087: who payment was made to (optional free-text)
  payment_ref_id: "",    // CR-087: payment reference ID (optional free-text)
  splitPayments: null,   // CR-083: null=single payment, [{method,amount}]=split mode
```

**Risk:** LOW.

---

### EDIT 5 — `ExpenseEntryPanel.jsx`: `EntryLine` Row 2 layout — Notes → 3-column row

**File:** `components/expense/ExpenseEntryPanel.jsx`
**Lines:** 438-448

**Current:**
```jsx
      {/* BUG-177: Notes input — full width row below */}
      <div className="w-full">
        <input
          value={line.notes}
          onChange={e => handleField("notes", e.target.value)}
          placeholder="Notes (optional)"
          className={inputCls}
          style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
          data-testid={`expense-notes-input-${idx}`}
        />
      </div>
```

**New:**
```jsx
      {/* CR-087: Row 2 — Notes (smaller) + Payment Made To + Payment Ref ID */}
      <div className="flex gap-2">
        <input
          value={line.notes}
          onChange={e => handleField("notes", e.target.value)}
          placeholder="Notes (optional)"
          className={inputCls + " flex-1 min-w-0"}
          style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
          data-testid={`expense-notes-input-${idx}`}
        />
        <input
          value={line.payment_made_to}
          onChange={e => handleField("payment_made_to", e.target.value)}
          placeholder="Paid to (optional)"
          className={inputCls + " flex-1 min-w-0"}
          style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
          data-testid={`expense-payment-made-to-input-${idx}`}
        />
        <input
          value={line.payment_ref_id}
          onChange={e => handleField("payment_ref_id", e.target.value)}
          placeholder="Ref ID (optional)"
          className={inputCls + " flex-1 min-w-0"}
          style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
          data-testid={`expense-payment-ref-id-input-${idx}`}
        />
      </div>
```

**Risk:** MEDIUM. Layout change only. `handleField` already works for any field name (generic handler).
**Verification:** Screenshot — Row 2 shows 3 equal-width inputs.

---

### EDIT 6 — `ExpenseEntryPanel.jsx`: `handleSave` → `details` array — add new fields to `base`

**File:** `components/expense/ExpenseEntryPanel.jsx`
**Lines:** 652-659

**Current:**
```js
        const base = {
          expense: l.itemName,
          quantity: parseFloat(l.quantity || 0),
          unit: l.unit || "",
          physical_quantity: parseFloat(l.physical_quantity || 0), // BUG-176
          notes: l.notes || "",  // BUG-177
          category_id: l.categoryId ? parseInt(l.categoryId, 10) : null, // BUG-199
        };
```

**New:**
```js
        const base = {
          expense: l.itemName,
          quantity: parseFloat(l.quantity || 0),
          unit: l.unit || "",
          physical_quantity: parseFloat(l.physical_quantity || 0), // BUG-176
          notes: l.notes || "",               // BUG-177
          category_id: l.categoryId ? parseInt(l.categoryId, 10) : null, // BUG-199
          payment_made_to: l.payment_made_to || "",  // CR-087
          payment_ref_id:  l.payment_ref_id  || "",  // CR-087
        };
```

**Risk:** LOW. `toAPI.addExpenseEntry` already accepts these (Edit 2 above).
**Note:** `toAPI.addExpenseEntry` is called by `expenseService.addExpenseEntry` which just passes `details` to the API. No intermediate transform strips fields.

---

### EDIT 7 — `ExpenseEntryPanel.jsx`: `startEdit` — populate `editRow` with new fields

**File:** `components/expense/ExpenseEntryPanel.jsx`
**Lines:** 696-699 (the `notes` + `category_id` lines in `setEditRow({...})`)

**Current:**
```js
      notes: tx.notes || "",  // BUG-177
      category_id: tx.categoryId ?? null,  // BUG-199
```

**New:**
```js
      notes:            tx.notes           || "",  // BUG-177
      category_id:      tx.categoryId      ?? null,  // BUG-199
      payment_made_to:  tx.paymentMadeTo   || "",  // CR-087
      payment_ref_id:   tx.paymentRefId    || "",  // CR-087
```

**Risk:** LOW. These are display fields — no validation impact.

---

### EDIT 8 — `ExpenseEntryPanel.jsx`: Table `<thead>` — add 2 column headers

**File:** `components/expense/ExpenseEntryPanel.jsx`
**Line:** ~879 (after Notes `<th>`, before Actions `<th>`)

**Current:**
```jsx
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Notes</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Actions</th>
```

**New:**
```jsx
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Notes</th>
                    {/* CR-087 */}
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Paid To</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Ref ID</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Actions</th>
```

**Risk:** LOW. Table now 12 columns (was 10).

---

### EDIT 9 — `ExpenseEntryPanel.jsx`: Edit mode row — add 2 editable cells

**File:** `components/expense/ExpenseEntryPanel.jsx`
**Lines:** ~932-936 (Notes edit cell, before Actions edit cell)

**Current:**
```jsx
                          {/* BUG-177: Notes (editable in edit) */}
                          <td className="px-4 py-2">
                            <input value={editRow.notes} onChange={e => setEditRow(r => ({ ...r, notes: e.target.value }))}
                              placeholder="Notes" className={inputCls + " w-28"} style={inputStyle}
                              data-testid={`expense-edit-notes-${tx.id}`} />
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center justify-center gap-1">
```

**New:**
```jsx
                          {/* BUG-177: Notes (editable in edit) */}
                          <td className="px-4 py-2">
                            <input value={editRow.notes || ""} onChange={e => setEditRow(r => ({ ...r, notes: e.target.value }))}
                              placeholder="Notes" className={inputCls + " w-28"} style={inputStyle}
                              data-testid={`expense-edit-notes-${tx.id}`} />
                          </td>
                          {/* CR-087: Payment Made To (editable in edit) */}
                          <td className="px-4 py-2">
                            <input value={editRow.payment_made_to || ""} onChange={e => setEditRow(r => ({ ...r, payment_made_to: e.target.value }))}
                              placeholder="Paid to" className={inputCls + " w-28"} style={inputStyle}
                              data-testid={`expense-edit-payment-made-to-${tx.id}`} />
                          </td>
                          {/* CR-087: Payment Ref ID (editable in edit) */}
                          <td className="px-4 py-2">
                            <input value={editRow.payment_ref_id || ""} onChange={e => setEditRow(r => ({ ...r, payment_ref_id: e.target.value }))}
                              placeholder="Ref ID" className={inputCls + " w-24"} style={inputStyle}
                              data-testid={`expense-edit-payment-ref-id-${tx.id}`} />
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center justify-center gap-1">
```

**Risk:** MEDIUM. Two new editable cells. Controlled inputs — safe.

---

### EDIT 10 — `ExpenseEntryPanel.jsx`: View mode row — add 2 read-only cells

**File:** `components/expense/ExpenseEntryPanel.jsx`
**Lines:** ~968-969 (after Notes view cell, before Actions view cell)

**Current:**
```jsx
                          {/* BUG-177: Notes column */}
                          <td className="px-4 py-2.5 text-xs max-w-[150px] truncate" style={{ color: COLORS.grayText }} data-testid={`expense-notes-${tx.id}`}>{tx.notes || "—"}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-center gap-1">
```

**New:**
```jsx
                          {/* BUG-177: Notes column */}
                          <td className="px-4 py-2.5 text-xs max-w-[150px] truncate" style={{ color: COLORS.grayText }} data-testid={`expense-notes-${tx.id}`}>{tx.notes || "—"}</td>
                          {/* CR-087 */}
                          <td className="px-4 py-2.5 text-xs max-w-[120px] truncate" style={{ color: COLORS.grayText }} data-testid={`expense-payment-made-to-${tx.id}`}>{tx.paymentMadeTo || "—"}</td>
                          <td className="px-4 py-2.5 text-xs max-w-[100px] truncate" style={{ color: COLORS.grayText }} data-testid={`expense-payment-ref-id-${tx.id}`}>{tx.paymentRefId || "—"}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-center gap-1">
```

**Risk:** LOW. Read-only cells.

---

### EDIT 11 — `ExpenseEntryPanel.jsx`: `<tfoot>` colSpan update

**File:** `components/expense/ExpenseEntryPanel.jsx`
**Line:** ~995 (last `<td colSpan={4} />`)

Table goes from 10 → 12 columns.
Before amount: colSpan={5} (unchanged).
After amount: was colSpan={4}, now colSpan={6}.

**Current:**
```jsx
                    <td colSpan={5} className="px-4 py-3 text-sm font-semibold" style={{ color: COLORS.darkText }}>Total</td>
                    <td className="px-4 py-3 text-right text-sm font-bold" style={{ color: COLORS.primaryOrange }} data-testid="expense-total-amount">
                      {fmt(totalAmount || kpis.total)}
                    </td>
                    <td colSpan={4} />
```

**New:**
```jsx
                    <td colSpan={5} className="px-4 py-3 text-sm font-semibold" style={{ color: COLORS.darkText }}>Total</td>
                    <td className="px-4 py-3 text-right text-sm font-bold" style={{ color: COLORS.primaryOrange }} data-testid="expense-total-amount">
                      {fmt(totalAmount || kpis.total)}
                    </td>
                    <td colSpan={6} />  {/* CR-087: +2 cols */}
```

**Risk:** LOW. Arithmetic: 5 + 1 + 6 = 12 ✅

---

### EDIT 12 — `ExpenseReportPage.jsx`: Table `<thead>` — add 2 headers

**File:** `pages/reports-module/ExpenseReportPage.jsx`
**Lines:** 421-422 (after Notes `<th>`, closing `</tr>`)

**Current:**
```jsx
                          <th className="px-5 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase">Notes</th>
                        </tr>
```

**New:**
```jsx
                          <th className="px-5 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase">Notes</th>
                          {/* CR-087 */}
                          <th className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase">Paid To</th>
                          <th className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase">Ref ID</th>
                        </tr>
```

**Risk:** LOW. Table goes from 9 → 11 columns.

---

### EDIT 13 — `ExpenseReportPage.jsx`: Table row cells — add 2 read-only cells

**File:** `pages/reports-module/ExpenseReportPage.jsx`
**Line:** 441 (after Notes cell, before closing `</tr>`)

**Current:**
```jsx
                              <td className="px-5 py-3 text-sm text-zinc-400 max-w-[200px] truncate" data-testid={`expense-report-row-notes-${t.id}`}>{t.notes || '\u2014'}</td>
                            </tr>
```

**New:**
```jsx
                              <td className="px-5 py-3 text-sm text-zinc-400 max-w-[200px] truncate" data-testid={`expense-report-row-notes-${t.id}`}>{t.notes || '\u2014'}</td>
                              {/* CR-087 */}
                              <td className="px-4 py-3 text-sm text-zinc-400 max-w-[150px] truncate" data-testid={`expense-report-row-payment-made-to-${t.id}`}>{t.paymentMadeTo || '\u2014'}</td>
                              <td className="px-4 py-3 text-sm text-zinc-400 max-w-[120px] truncate" data-testid={`expense-report-row-payment-ref-id-${t.id}`}>{t.paymentRefId || '\u2014'}</td>
                            </tr>
```

**Risk:** LOW.

---

### EDIT 14 — `ExpenseReportPage.jsx`: `<tfoot>` colSpan update

**File:** `pages/reports-module/ExpenseReportPage.jsx`
**Line:** 451 (`<td colSpan={3} />`)

Table goes from 9 → 11 columns.
Before amount: colSpan={5}. After amount: was colSpan={3}, now colSpan={5}.
Arithmetic: 5 + 1 + 5 = 11 ✅

**Current:**
```jsx
                            <td className="px-5 py-3 text-sm font-bold text-zinc-900" colSpan={5}>{debouncedSearch.trim() ? 'FILTERED TOTAL' : 'PAGE TOTAL'}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-zinc-900 tabular-nums">{fmtINR(filteredTransactions.reduce((s, t) => s + t.amount, 0))}</td>
                            <td colSpan={3} />
```

**New:**
```jsx
                            <td className="px-5 py-3 text-sm font-bold text-zinc-900" colSpan={5}>{debouncedSearch.trim() ? 'FILTERED TOTAL' : 'PAGE TOTAL'}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-zinc-900 tabular-nums">{fmtINR(filteredTransactions.reduce((s, t) => s + t.amount, 0))}</td>
                            <td colSpan={5} />  {/* CR-087: +2 cols */}
```

**Risk:** LOW.

---

### EDIT 15 — `ExpenseReportPage.jsx`: Search filter — extend to include new fields

**File:** `pages/reports-module/ExpenseReportPage.jsx`
**Line:** ~146-148

**Current:**
```js
      (t.notes        || '').toLowerCase().includes(term) ||
      (t.employeeName || '').toLowerCase().includes(term)
```

**New:**
```js
      (t.notes          || '').toLowerCase().includes(term) ||
      (t.employeeName   || '').toLowerCase().includes(term) ||
      (t.paymentMadeTo  || '').toLowerCase().includes(term) ||  // CR-087
      (t.paymentRefId   || '').toLowerCase().includes(term)     // CR-087
```

**Risk:** LOW. Extends search only.

---

## Verification Matrix

| Edit | File | Change | How to Verify | Auto? |
|---|---|---|---|---|
| 1 | `expenseTransform.js` | `fromAPI.expenseReport` maps `paymentMadeTo` + `paymentRefId` | Load expense report page → open Network → check API response fields → confirm transform output in React DevTools state | NO (browser) |
| 2 | `expenseTransform.js` | `toAPI.addExpenseEntry` sends new fields | Add expense → Network tab → POST /store-expense-details payload includes `payment_made_to` + `payment_ref_id` | NO (browser) |
| 3 | `expenseTransform.js` | `toAPI.editExpenseEntry` sends new fields | Edit expense → Network tab → PUT /edit-expense/{id} payload includes both | NO (browser) |
| 4 | `ExpenseEntryPanel.jsx` | `EMPTY_LINE` defaults | `grep EMPTY_LINE` → file contains `payment_made_to: ""` + `payment_ref_id: ""` | YES (grep) |
| 5 | `ExpenseEntryPanel.jsx` | Row 2 is 3-column | Screenshot of Add Expense form → Row 2 shows 3 side-by-side inputs | NO (screenshot) |
| 6 | `ExpenseEntryPanel.jsx` | `handleSave` base includes new fields | See Edit 2 verification — payload check covers this | NO |
| 7 | `ExpenseEntryPanel.jsx` | `startEdit` populates new fields | Click edit on a transaction with `paymentMadeTo` data → fields pre-populated in row | NO |
| 8 | `ExpenseEntryPanel.jsx` | `<thead>` has `Paid To` + `Ref ID` | Screenshot → table shows "Paid To" + "Ref ID" headers | NO (screenshot) |
| 9 | `ExpenseEntryPanel.jsx` | Edit mode has 2 new inputs | Click edit on row → `data-testid="expense-edit-payment-made-to-{id}"` present in DOM | NO |
| 10 | `ExpenseEntryPanel.jsx` | View mode has 2 new cells | `data-testid="expense-payment-made-to-{id}"` present in DOM | NO |
| 11 | `ExpenseEntryPanel.jsx` | `tfoot` colSpan = 6 | `grep "colSpan={6}"` in file | YES (grep) |
| 12 | `ExpenseReportPage.jsx` | `<thead>` has `Paid To` + `Ref ID` | Screenshot → report table shows both headers | NO (screenshot) |
| 13 | `ExpenseReportPage.jsx` | Row cells for new fields | `data-testid="expense-report-row-payment-made-to-{id}"` in DOM | NO |
| 14 | `ExpenseReportPage.jsx` | `tfoot` colSpan = 5 | `grep "colSpan={5}"` in tfoot area | YES (grep) |
| 15 | `ExpenseReportPage.jsx` | Search includes new fields | Type a known `payment_made_to` value → row appears | NO |

---

## Backend Flag Check (per OQ-4 / OQ-5)

| Endpoint | Field | Confirmed? | Action |
|---|---|---|---|
| `POST /store-expense-details` | `payment_made_to` | ✅ YES (Gate 2 live probe) | None |
| `POST /store-expense-details` | `payment_ref_id` | ✅ YES (Gate 2 live probe) | None |
| `GET /expenses-report` | `payment_made_to` | ⚠️ NOT VERIFIED for report endpoint specifically | **Verify via Network tab during QA. If absent → file BACKEND_BRIEF_CR087_REPORT_FIELDS** |
| `GET /expenses-report` | `payment_ref_id` | ⚠️ NOT VERIFIED for report endpoint specifically | Same as above |

> **QA NOTE:** `/expenses-list` confirmed these fields. `/expenses-report` may lag behind. FE transform uses `?? ''` fallback — UI will show `—` gracefully if absent. Backend team should be notified if missing.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Report endpoint doesn't return new fields | MEDIUM | LOW — shows `—` gracefully due to `?? ''` fallback in transform | File BACKEND_BRIEF if confirmed during QA |
| ColSpan arithmetic wrong → table footer misaligned | LOW | LOW — visual only | Verified by arithmetic in plan (see Edit 11, 14) |
| `handleField` doesn't handle `payment_made_to` | LOW | NONE — it's a generic `(field, value)` handler | Confirmed in code — it dispatches `setLines(prev => prev.map((l, i) => i === idx ? {...l, [field]: value} : l))` |

---

## Execution Sequence

```
1. Edit expenseTransform.js (Edits 1, 2, 3) — transform layer first
2. Edit ExpenseEntryPanel.jsx (Edits 4, 5, 6, 7, 8, 9, 10, 11) — form + table
3. Edit ExpenseReportPage.jsx (Edits 12, 13, 14, 15) — report table
4. Compile check: webpack 0 new warnings
5. Screenshot: Row 2 form layout + transaction table headers
6. Network check: POST /store-expense-details payload
7. Write QA handover
```

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-087 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: CR-087 row → status: IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add expenseTransform.js, ExpenseEntryPanel.jsx, ExpenseReportPage.jsx with CR-087 date
- [ ] Code markers: // CR-087 in all 3 modified files ← already in plan above
- [ ] Compile: 0 new warnings
```

---

## Handover to Implementation Agent

```
CR-087 Implementation Plan complete.
15 edits across 3 files.
Code reality: NONE.
Scope: expenseTransform.js / ExpenseEntryPanel.jsx / ExpenseReportPage.jsx.
Files will NOT touch: expenseService.js, expenseReportService.js, ExpenseSetupPanel.jsx.
Verification matrix: 15 checks (3 grep-verifiable, 12 browser/screenshot).
Owner decisions: NONE — all OQs closed (see LEARNING_SUMMARY_OQ_CLOSURE_2026_07_22.md).
Backend flag: /expenses-report field presence unverified — QA must check Network tab.
Awaiting Gate 4 GO.
```
