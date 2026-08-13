# BUG-203 — Unit Price Edit/Add Gaps Across All Expense Contexts

**Registered:** 2026-07-17
**Updated:** 2026-07-17 (scope expanded — 3 sub-issues absorbed)
**Source:** OWNER-REPORTED (smoke observations during CR-074-B + BUG-203 implementation)
**Confidence:** CONFIRMED (agent verified all 3 in code)

---

## Classification
- **Type:** BUG (missing capability across multiple edit contexts)
- **Severity:** P1 (upgraded from P2 — affects 3 of 4 edit surfaces)
- **Risk:** MEDIUM — 2-call workaround pattern already proven in Stock Master inline edit
- **Fast Lane eligible:** NO (3 files, financial data, multiple contexts)

## Duplicate Check
- **Result:** DISTINCT (expanded scope — absorbs 3 related sub-issues under one ID)
- **Related:** BUG-202, CR-064, CR-066, BUG-204

---

## Sub-Issues (all under BUG-203)

### Sub-A: Stock Master inline edit — unit price field [IMPLEMENTED]
- Pencil-edit row has ₹ price input + 2-call save (PUT name+cat → editUnitPrice/addUnitPrice)
- Validation: price required if item is already priced
- **Status:** ✅ DONE (shipped 2026-07-17, iteration_30 pass)

### Sub-B: Bulk Editor — new item row cannot set unit price
- **Current:** New rows (`_isNew`) show "—" in Unit Price column, no input
- **Root cause:** `{!row._isNew ? <input/> : <span>—</span>}` blocks input for new rows. Save handler (`createCategoryWithItems`) doesn't chain `addUnitPrice` after item creation.
- **Fix needed:** Show price input for new rows. After successful `createCategoryWithItems` → get returned stockId → call `addUnitPrice(stockId, 1, price)` if price was entered.
- **File:** `ExpenseBulkEditor.jsx` — new row price input + save handler chain
- **Status:** ❌ NOT DONE

### Sub-C: Bulk Editor — editing existing item price silently fails
- **Current:** Price input IS shown for existing rows, but save handler uses `addUnitPrice` without knowing if the item already has a price row. If item already priced → `addUnitPrice` may fail (duplicate) → error is silently swallowed → price change lost.
- **Root cause:** Bulk Editor doesn't receive `pricedItems` prop (the stockId→unitPriceRowId lookup). Can't distinguish "add new price" vs "edit existing price".
- **Fix needed:** Pass `pricedItems` from parent (`ExpenseSetupPanel.jsx`). In save handler: if `pricedItems` has a row for this stockId → call `editUnitPrice(rowId, newPrice)`. Else → call `addUnitPrice(stockId, 1, newPrice)`.
- **Files:** `ExpenseSetupPanel.jsx` (pass prop), `ExpenseBulkEditor.jsx` (use prop in save)
- **Status:** ❌ NOT DONE

### Sub-D: Edit existing expense — amount editable for priced items (should be qty)
- **Current:** Transaction edit row (L733-735) shows a plain editable `<input type="number">` for amount on ALL items, including priced items. User can type any amount — no auto-calc, no qty input.
- **Root cause:** Edit row rendering ignores `editRow.unitPrice`. The `startEdit` function (BUG-204 Edit 5) cross-references unitPrice from stock master, but the edit row UI doesn't use it.
- **Expected:** For priced items → show qty input (editable) + amount as read-only auto-calc (same UX as Add form BUG-204). For non-priced → keep amount editable.
- **File:** `ExpenseEntryPanel.jsx` — edit row rendering (L725-764)
- **Status:** ❌ NOT DONE

---

## Owner Decisions (locked 2026-07-17)
- **OQ-1 → (c) VALIDATE.** Price required for priced items in inline edit — show validation error if empty.
- **OQ-2 → (a) YES.** Bulk Editor included in scope.

## Evidence
- Sub-B screenshot: new row shows "—" in Unit Price column, not editable
- Sub-C code trace: `ExpenseBulkEditor.jsx` save handler L434-445 — `addUnitPrice` called without checking if price row exists
- Sub-D screenshot: edit row shows editable amount input for "salary" (priced item at ₹2000)
- PUT probe: `/app/memory/evidence/BUG-203/put_probe_with_unit_price.json`

## Blast Radius
- **MEDIUM** — 3 files: `ExpenseBulkEditor.jsx`, `ExpenseSetupPanel.jsx` (prop pass), `ExpenseEntryPanel.jsx` (edit row)
- **Hotspot files:** NO
- **Backend dependency:** NO for Sub-B/C/D (2-call workaround, services exist). Backend §3.4 brief filed for future single-call.

## Files to Change

| File | Sub-Issue | Change |
|---|---|---|
| `ExpenseBulkEditor.jsx` | Sub-B | Enable price input for new rows + chain addUnitPrice after creation |
| `ExpenseBulkEditor.jsx` | Sub-C | Use pricedItems lookup for edit vs add price decision |
| `ExpenseSetupPanel.jsx` | Sub-C | Pass `pricedItems` as prop to BulkEditor |
| `ExpenseEntryPanel.jsx` | Sub-D | Edit row: show qty + auto-calc for priced items |

## Next
Planning Gate 2 → Gate 3 for Sub-B, Sub-C, Sub-D. Sub-A already shipped.
