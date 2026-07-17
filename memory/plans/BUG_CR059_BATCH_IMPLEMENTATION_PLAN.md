# Gate 3 — Implementation Plan: BUG-150 / BUG-151 / BUG-152 / BUG-153
**Date:** 2026-07-07
**Sprint:** pos_5_0
**Batch:** CR-059 Post-Implementation Bug Sprint
**Stage:** Gate 3 (Implementation Plan)
**Pre-req:** Gate 2 approved ✓ (batch impact analysis completed above)

---

## Pre-Implementation Checklist

- [ ] Read FILE_OWNERSHIP.md — all 4 target files are CR-059 owned ✓
- [ ] Compile check before: `webpack compiled with 1 warning` (pre-existing) ✓
- [ ] Token is live: obtain fresh Bearer token from preprod before curl tests ✓
- [ ] No hotspot files in change set ✓
- [ ] No financial logic affected ✓

---

## Edit 1 — BUG-150: Fix DnD Placeholder + Hover Feedback
**File:** `components/expense/ExpenseSetupPanel.jsx`
**Lines:** ~485 (placeholder wrapper) + ~455 (category Droppable style)
**Risk:** LOW

### What to change

**Change A — Remove `display:none` from placeholder:**
```jsx
// BEFORE
<div style={{ display: 'none' }}>{provided.placeholder}</div>

// AFTER
<div style={{ height: 0, overflow: 'hidden' }}>{provided.placeholder}</div>
```
Rationale: `height:0 + overflow:hidden` hides the visual but lets `@hello-pangea/dnd` measure the container. `display:none` removes the element from layout entirely, breaking hit-area calculation.

**Change B — Strengthen hover feedback on category Droppable:**
```jsx
// BEFORE (only background + dashed outline)
style={{
  borderRadius: 8,
  background: snapshot.isDraggingOver ? `${COLORS.primaryOrange}22` : 'transparent',
  outline: snapshot.isDraggingOver ? `2px dashed ${COLORS.primaryOrange}` : 'none',
  transition: 'background 0.15s ease',
}}

// AFTER (add "Drop here" label + stronger ring + scale hint)
style={{
  borderRadius: 8,
  background: snapshot.isDraggingOver ? `${COLORS.primaryOrange}18` : 'transparent',
  outline: snapshot.isDraggingOver ? `2px solid ${COLORS.primaryOrange}` : 'none',
  transform: snapshot.isDraggingOver ? 'scale(1.01)' : 'scale(1)',
  transition: 'all 0.12s ease',
  position: 'relative',
}}
```
And inside the Droppable div, after `<CategoryRow .../>`:
```jsx
{snapshot.isDraggingOver && (
  <div style={{
    fontSize: 10, color: COLORS.primaryOrange,
    textAlign: 'center', paddingBottom: 2, fontWeight: 600,
    letterSpacing: 0.3,
  }}>
    Drop here
  </div>
)}
```

### Test
1. Drag an item row → hover over a different category on the left
2. Category should highlight (solid orange border, "Drop here" text visible)
3. Release → item moves to new category, toast appears

---

## Edit 2 — BUG-151: Fix `exp_name` Key in editExpenseEntry
**File:** `api/services/expenseService.js`
**Line:** 127
**Risk:** LOW (1 line)

### What to change

```js
// BEFORE
exp_name: data.exp_name,

// AFTER
exp_name: data.expense ?? data.exp_name,
```

Rationale: `editRow` stores the expense name as `expense` (set in `startEdit`). The API expects `exp_name`. This single fallback maps both.

### Test
1. Click pencil (edit) on a transaction row → item field shows ItemCombobox ✓
2. Change item from dropdown → click Save
3. No 500 error, row updates, toast "Updated"

---

## Edit 3 — BUG-152: Add DELETE_EXPENSE Constant + Fix deleteExpenseEntry
**Files:** `api/constants.js` (1 line) + `api/services/expenseService.js` (1 line)
**Risk:** MEDIUM (new API behaviour — deletes will now succeed)

### What to change

**File A — `api/constants.js`:**
```js
// BEFORE (no DELETE_EXPENSE key)
EDIT_EXPENSE: '/api/v2/vendoremployee/expense/edit-expense',      // PUT /{id}

// AFTER
EDIT_EXPENSE: '/api/v2/vendoremployee/expense/edit-expense',      // PUT /{id}
DELETE_EXPENSE: '/api/v2/vendoremployee/expense/delete-expense',  // DELETE /{id} — BUG-152
```

**File B — `api/services/expenseService.js`:**
```js
// BEFORE
export const deleteExpenseEntry = (id) =>
  api.delete(`${EXPENSE_ENDPOINTS.EDIT_EXPENSE}/${id}`);

// AFTER
export const deleteExpenseEntry = (id) =>
  api.delete(`${EXPENSE_ENDPOINTS.DELETE_EXPENSE}/${id}`);
```

### Test
```bash
# Manual curl test before frontend
curl -X DELETE https://preprod.mygenie.online/api/v2/vendoremployee/expense/delete-expense/{id}
# Expected: {"message":"Expense deleted successfully."}
```
1. Click delete on a transaction row → confirm dialog ✓
2. Confirm → transaction removed from table, toast "Deleted"
3. Refresh page → transaction gone

---

## Edit 4 — BUG-153: Category Optional + Auto-fill + Item Hints
**File:** `components/expense/ExpenseEntryPanel.jsx`
**Lines:** ~159-166, ~177, ~200-203, ~211, ~413, ~416-420
**Risk:** LOW

### What to change

**Change A — `handleItemSelect`: auto-fill categoryId from selected item**
```js
// BEFORE
const handleItemSelect = (title, item) => {
  onChange(idx, "itemName", title);
  if (item?.unitPriceAmount) { ... }
};

// AFTER
const handleItemSelect = (title, item) => {
  onChange(idx, "itemName", title);
  // Auto-fill category from item if not already set
  if (item?.categoryId && !line.categoryId) {
    onChange(idx, "categoryId", String(item.categoryId));
  }
  if (item?.unitPriceAmount) { ... }
};
```

**Change B — Remove category from validator**
```js
// BEFORE
const hasErrors = lines.some(l => !l.categoryId || !l.itemName || !l.amount || !l.paymentMethod);
if (hasErrors) {
  setShowErrors(true);
  const missingCat = lines.some(l => !l.categoryId);
  toast({ title: "Missing fields", description: missingCat ? "Category is required..." : "..." });

// AFTER
const hasErrors = lines.some(l => !l.itemName || !l.amount || !l.paymentMethod);
if (hasErrors) {
  setShowErrors(true);
  toast({ title: "Missing fields", description: "Item name, amount and payment method are required." });
```

**Change C — Remove catError display from EntryLine**
```jsx
// BEFORE
const catError = showError && !line.categoryId;
// ...
style={{ borderColor: catError ? COLORS.errorText : COLORS.borderGray, ...}}
// ...
{catError && <p className="text-xs mt-0.5" style={{ color: COLORS.errorText }}>Required</p>}

// AFTER — remove catError entirely, keep border normal
const catError = false; // category is now optional — BUG-153
```

**Change D — Update ItemCombobox placeholder**
```jsx
// BEFORE
placeholder={line.categoryId ? "Select or type item" : "Select category first"}

// AFTER
placeholder="Type or search expense item..."
```

**Change E — Show category hint in ItemCombobox items**
The `ItemCombobox` component already receives `categoryName` prop. Check if it renders category hint in dropdown items. If not, update the dropdown item render to show `item.categoryName` as a subtle badge.

*Note: If ItemCombobox already shows categoryName, this change may be zero-effort.*

### Test
1. Open `/expenses` → click + to add expense line
2. WITHOUT selecting category: type "del" in item field → see suggestions with category hints
3. Select "100 delivery" → category auto-fills to "Others"
4. Fill amount + payment → Save → no "Category required" error
5. Also: save without any category selected → succeeds if item + amount + payment filled

---

## Verification Matrix

| # | Bug | Test | Pass Criteria |
|---|---|---|---|
| V1 | BUG-150 | Drag item → hover category | Solid orange border + "Drop here" text visible on hovered category |
| V2 | BUG-150 | Drag item → drop on different category | Item moves to new category; toast "Item moved"; fetch refreshes correctly |
| V3 | BUG-150 | Drag item → drop on SAME category | No API call; no toast; item stays |
| V4 | BUG-150 | Drag item → drop outside all categories | Item animates back (destination = null guard) |
| V5 | BUG-151 | Edit transaction → change item → save | No 500 error; row updates with new item name; toast "Updated" |
| V6 | BUG-152 | Delete transaction → confirm | Row removed from table; toast "Deleted"; fresh fetch confirms gone |
| V7 | BUG-153 | Type in item field without category | All master items shown; each shows category hint |
| V8 | BUG-153 | Select item from dropdown | Category auto-fills; no "Category required" error on submit |
| V9 | BUG-153 | Submit with no category | Saves successfully (if item + amount + payment filled) |
| V10 | Regression | Add expense normally with category | Full normal flow unaffected |
| V11 | Regression | `/expense-setup` loads, CRUD works | Items/categories unaffected by DnD placeholder change |

---

## Post-Code Registry Checklist (EXIT GATE)

- [ ] BUG-150: mark IMPLEMENTED in registry.json + BUG_TRACKER.md
- [ ] BUG-151: mark IMPLEMENTED
- [ ] BUG-152: mark IMPLEMENTED
- [ ] BUG-153: mark IMPLEMENTED
- [ ] `// BUG-150`, `// BUG-151`, `// BUG-152`, `// BUG-153` markers in modified lines
- [ ] Compile check: `webpack compiled with 1 warning` (no new warnings)
- [ ] FILE_OWNERSHIP.md: add bug-fix row for each

---

## Owner Approval Required

```
Planning complete: BUG-150, BUG-151, BUG-152, BUG-153
Stage: Impact Analysis (Gate 2) + Implementation Plan (Gate 3) — BOTH COMPLETE
Code reality: PARTIAL (all 4 bugs confirmed broken, clear fix paths found)
Risk: BUG-150: LOW | BUG-151: LOW | BUG-152: MEDIUM (delete now active) | BUG-153: LOW

Files WILL change (4 files):
  1. components/expense/ExpenseSetupPanel.jsx   ← BUG-150 (DnD placeholder + hover)
  2. api/services/expenseService.js             ← BUG-151 (exp_name key) + BUG-152 (delete endpoint)
  3. api/constants.js                           ← BUG-152 (DELETE_EXPENSE constant)
  4. components/expense/ExpenseEntryPanel.jsx   ← BUG-153 (category optional + auto-fill + hints)

Files WILL NOT touch:
  All order/payment/settlement/menu/socket/hotspot files

Owner decisions needed: NONE (defaults cover D1 + D2)
Docs: Gate 2 → BUG_CR059_BATCH_IMPACT_ANALYSIS.md | Gate 3 → this file
Next: Gate 4 GO → Implementation Agent
```
