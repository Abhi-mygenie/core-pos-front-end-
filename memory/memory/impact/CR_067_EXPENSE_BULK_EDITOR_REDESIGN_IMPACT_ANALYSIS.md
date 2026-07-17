# CR-067 — Impact Analysis (Gate 2)

**ID:** CR-067
**Title:** Expense Bulk Editor — Full Parity Redesign with Menu Management Pattern
**Date:** 2026-07-11
**Agent:** PLANNING (AGENT_PROMPT_ALPHA v0.7)
**Stage:** Gate 2 — Impact Analysis
**Risk:** MEDIUM (component rewrite, no financial logic, no R5 hotspot)
**Code Reality:** PARTIAL — `ExpenseBulkEditor.jsx` exists (148 lines, simplified). Target: rebuild to match `BulkEditor.jsx` (menu) pattern.
**Sprint:** pos_5_0

---

## 1. Owner Decisions

### Locked (from session 2026-07-11)
| # | Decision | Answer |
|---|---|---|
| D1 | Redesign scope | Full parity — search, columns picker (if applicable), Excel/Import, dirty tracking, `+ Add Item` in toolbar, new rows pinned to top |
| D2 | UNIT column | Remove |
| D3 | UNIT PRICE column | Remove (defer to CR-066 tab) |

### Open Questions — OWNER MUST ANSWER BEFORE GATE 4

| # | Question | Options | Blocks |
|---|---|---|---|
| OQ-1 | For EXISTING expense items in the bulk editor: no `PUT /expense/expenses/{id}` exists (CR-065 backend-blocked). Name cannot be renamed. | **A**: Name field read-only on existing rows (only editable when adding new rows) **B**: Name editable, but save is blocked for name-changed existing rows with inline error | Save logic planning |
| OQ-2 | Category change on existing items uses DELETE+POST (same as DnD). This removes the old item's ID — any unit price set for it (via CR-066) would be lost. | **A**: Allow category change via DELETE+POST (same as DnD, accept unit price loss) **B**: Block category change for items that have a unit price set | Save logic planning |

---

## 2. Conflict Pre-Check

| File | Last modifier | Active items also touching it | Conflict? |
|---|---|---|---|
| `ExpenseBulkEditor.jsx` | CR-059 (2026-07-06) | None | NONE |
| `ExpenseSetupPanel.jsx` | BUG-159/160 (2026-07-11) | CR-064 (INTAKE), CR-065 (INTAKE, blocked), CR-066 (Gate 2) | **CONFLICT — sequence required** |

**Execution order:** CR-067 BEFORE CR-066.
Rationale: CR-066 adds a tab strip to `ExpenseSetupPanel.jsx`. CR-067 removes `handleBulkSave` and changes the props passed to `ExpenseBulkEditor`. If CR-067 runs first, CR-066 agent merges cleanly on top. Reverse order means CR-066 agent would add the tab strip into the old panel structure, then CR-067 agent would need to re-check the new tab-strip layout before modifying the bulk mode section.

**CR-064 conflict on `ExpenseSetupPanel.jsx`:** CR-064 adds unit price input to the quick-add form (the inline "Add item to [category]..." input). CR-067 does NOT touch that input. No line-level conflict. Parallel-safe.

**CR-065 conflict on `ExpenseSetupPanel.jsx`:** CR-065 adds inline edit state to item rows. CR-067 does NOT touch item rows. Parallel-safe, but CR-065 is backend-blocked — safe to ignore for now.

---

## 3. Data Flow Trace

### Current flow
```
ExpenseSetupPanel (bulkMode=true)
  → <ExpenseBulkEditor items={filtered} categories onSave={handleBulkSave} onCancel units saving />
      → rows state (title, categoryId, price, unit)
      → Save All → calls onSave(rows) → parent's handleBulkSave
          → createCategoryWithItems(catName, [title]) for ALL rows
          ← silently drops price and unit
      → + Add Row → appends empty row at BOTTOM
```

### Target flow (matching menu BulkEditor pattern)
```
ExpenseSetupPanel (bulkMode=true)
  → <ExpenseBulkEditor items={filtered} categories onRefresh={fetchAll} onClose={()=>setBulkMode(false)} />
      → rows state (title, categoryId, _isNew, _original, _saveStatus, _saveError)
      → Search bar filters visible rows
      → + Add Item → prepends new row at TOP, auto-focuses name input
      → Save N Changes (disabled when dirty=0)
          → for new rows:    createCategoryWithItems(catName, [title])
          → for cat-changed: deleteExpenseItem(id) + createCategoryWithItems(newCatName, [title])
          → for name-changed: BLOCKED if OQ-1=A (read-only) or show error if OQ-1=B
      → Excel → exportStockMaster() (existing BUG-163 fixed)
      → Import → importStockMaster(file) (existing)
      → per-row: amber highlight when dirty, ✓ on save, ✗ on error with tooltip
```

---

## 4. Affected Files

### Files WILL change

| File | Change type | Lines estimate | Hotspot? |
|---|---|---|---|
| `components/expense/ExpenseBulkEditor.jsx` | **Full rewrite** — new toolbar (search + add item + save + excel + import), dirty tracking, category grouping, new-row-pinned-to-top, internal save logic | ~400 lines (from 148) | NO |
| `components/expense/ExpenseSetupPanel.jsx` | Remove `handleBulkSave` function (~20 lines), remove `units` state/fetch (no longer passed to bulk editor), change `<ExpenseBulkEditor>` props | ~-25 lines net | NO |

### Files will NOT touch
- `pages/ExpenseSetupPage.jsx` — shell unchanged
- `api/services/expenseService.js` — all functions already exist, zero changes
- `api/transforms/expenseTransform.js` — no new transforms needed
- `api/constants.js` — no new endpoints
- Any R5 hotspot files (OrderEntry, CollectPaymentPanel, orderTransform, DashboardPage, LoadingPage)

---

## 5. Feature Scope (what "full parity" means for expense context)

| Feature | Menu BulkEditor | CR-067 Expense BulkEditor |
|---|---|---|
| Toolbar: Search | ✅ | ✅ |
| Toolbar: + Add Item (header, green) | ✅ | ✅ |
| Toolbar: Save N Changes (disabled when clean) | ✅ | ✅ |
| Toolbar: Excel dropdown (Export + Template) | ✅ | ✅ Export only (template: G4 pending backend) |
| Toolbar: Import | ✅ | ✅ |
| New rows pinned to top | ✅ | ✅ |
| New row auto-focused | ✅ | ✅ |
| Dirty tracking: amber per row | ✅ | ✅ |
| Per-row undo (reset) | ✅ | ✅ |
| Per-row save status (spinner / ✓ / ✗ + tooltip) | ✅ | ✅ |
| Category grouping for existing rows | ✅ | ✅ |
| Columns picker | ✅ (33 columns) | ❌ Not needed (2 columns only: Name + Category) |
| Tier system | ✅ | ❌ Not needed |
| Column sort | ✅ | ✅ (Name, Category) |
| Warn before leave (beforeunload) | ✅ | ✅ |
| Batch parallel save (MAX_CONCURRENT=5) | ✅ | ✅ |
| UNIT column | ✅ (Sold By Unit) | ❌ Removed per D2 |
| UNIT PRICE column | ✅ | ❌ Removed per D3 (CR-066 scope) |

**Columns in redesigned editor:** Name + Category only.

---

## 6. Risk Register

| Risk | Level | Mitigation |
|---|---|---|
| Name edit on existing items has no backend endpoint (CR-065 blocked) | MEDIUM | OQ-1 must be answered. If A: read-only field for existing rows (safe). If B: inline error on save. |
| DELETE+POST for category change loses unit price association (if CR-066 prices are set) | LOW | OQ-2 must be answered. Sequencing: CR-067 ships before CR-066 goes live — no unit prices will exist at time of CR-067 release. Flag for post-CR-066 awareness. |
| `handleBulkSave` removal from `ExpenseSetupPanel.jsx` — touching file also targeted by CR-064/066 | LOW | Declared in conflict pre-check. CR-067 runs first. |
| Full rewrite of `ExpenseBulkEditor.jsx` — regression on existing bulk create flow | MEDIUM | All existing test cases for bulk item creation must be re-run after implementation. |

---

## 7. Verification Matrix

| Edit # | File | Change | How to Verify |
|---|---|---|---|
| 1 | `ExpenseBulkEditor.jsx` | Toolbar renders: Search + Add Item + Save N + Excel + Import | Browser: `/expense-setup` → Bulk Edit → toolbar visible with all 5 elements |
| 2 | `ExpenseBulkEditor.jsx` | + Add Item prepends new row at top, auto-focuses name | Click Add Item → new row at top with cursor in name field |
| 3 | `ExpenseBulkEditor.jsx` | Save N Changes disabled when no changes | Open bulk editor → Save button shows "No Changes" disabled |
| 4 | `ExpenseBulkEditor.jsx` | Dirty row gets amber highlight | Edit any field → row turns amber |
| 5 | `ExpenseBulkEditor.jsx` | Save new row → POST /store_expense succeeds | Add item, save → row shows ✓, item appears in list |
| 6 | `ExpenseBulkEditor.jsx` | UNIT column absent | No unit column in header or rows |
| 7 | `ExpenseBulkEditor.jsx` | UNIT PRICE column absent | No price column in header or rows |
| 8 | `ExpenseBulkEditor.jsx` | Excel export calls exportStockMaster() | Click Excel → triggers download |
| 9 | `ExpenseBulkEditor.jsx` | Import calls importStockMaster(file) | Upload xlsx → items refresh |
| 10 | `ExpenseSetupPanel.jsx` | handleBulkSave removed, units state removed | No console errors, bulk editor opens normally |

---

## 8. Post-Code Registry Checklist

- [ ] `registry.json`: CR-067 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] `CR_REGISTRY.md`: row added/updated with IMPLEMENTED
- [ ] `FILE_OWNERSHIP.md`: `ExpenseBulkEditor.jsx` + `ExpenseSetupPanel.jsx` listed with CR-067 + date
- [ ] Code markers: `// CR-067` in every modified file

---

## Summary

```
Planning complete: CR-067
Stage: Impact Analysis (Gate 2)
Code reality: PARTIAL (component exists, needs full rewrite)
Risk: MEDIUM (component rewrite, no R5/R6)
Files WILL change: ExpenseBulkEditor.jsx (full rewrite ~400 lines), ExpenseSetupPanel.jsx (-25 lines)
Files WILL NOT touch: ExpenseSetupPage.jsx, expenseService.js, expenseTransform.js, all R5 hotspots
Conflicts declared: ExpenseSetupPanel.jsx conflicts with CR-064, CR-065, CR-066 — CR-067 runs FIRST
Owner decisions needed: OQ-1 (name edit on existing items), OQ-2 (category change + unit price loss)
Next: Gate 3 (Implementation Plan) after OQ-1 and OQ-2 answered
```
