# BUG-201 — Expense Deletion Safety: Cascade Warning + Role Gating

**ID:** BUG-201
**Date:** 2026-07-16
**Source:** OWNER-REPORTED (business case review)
**Classification:** BUG (UX safety gap — data loss risk)
**Severity:** P1 (silent data destruction without user consent)
**Risk:** HIGH (data loss — expense transactions silently deleted when item removed)
**Duplicate Check:** DISTINCT — BUG-152 (endpoint fix), BUG-160 (category delete mechanics) are technical fixes; this is a business-safety gap
**Sprint:** POS 5.0

---

## Summary

Three types of deletion exist in the Expense module. Two of them have silent cascading effects that can destroy transaction data without warning. Owner requires explicit confirmation flows and future role gating.

---

## Three Deletion Types — Current Behavior vs Required

### Type 1: Expense Transaction Delete (daily entry row)
- **Current:** `window.confirm("Delete Expense?")` → `DELETE /delete-expense/{id}` → single transaction removed
- **Impact:** Low — deletes one transaction only, no cascade
- **Status:** Acceptable UX (basic confirm exists via BUG-152 fix)
- **Future:** Role-gate (only authorized roles can delete transactions)

### Type 2: Category Delete (from Expense Setup)
- **Current:** `deleteExpenseCategory(id)` → `DELETE /expense/category/{id}` → category removed, items moved to uncategorized
- **Impact:** Medium — items survive but lose categorization
- **Owner ruling:** "That is fine" — acceptable behavior
- **Status:** Acceptable. Add informational warning: "X items will be moved to uncategorized."
- **Future:** Role-gate

### Type 3: Item Delete (from Expense Setup) — THE PROBLEM
- **Current:** `DELETE /expense/expenses/{itemId}` → item removed → **related expense transactions also get deleted by backend cascade**
- **Impact:** HIGH — past expense records destroyed silently. No warning. No recovery.
- **Owner requirement:**
  1. Show warning: "This item has X expense transactions totaling ₹Y. Deleting it will permanently remove all related expense records."
  2. Require explicit confirmation (not just `window.confirm` — a proper dialog with item name, transaction count, total amount)
  3. (Future/Note) Gate by role — only specific roles can delete items

---

## Current Code (ExpenseSetupPanel.jsx)

The delete handler for items currently does:
```
deleteItem(itemId) → window.confirm("Delete?") → expenseService.deleteExpenseItem(id)
                     ^^^^^^^^^^^^^^^^^^^^^^^^
                     Generic confirm — no mention of cascade
```

No check for related transactions before deletion. No count/amount display.

---

## Required Changes

### Phase 1 — Cascade Warning (P1, implement now)

**Item Delete:**
1. Before delete, query backend for related transaction count + total amount for the item
   - May need: `GET /expenses-report?item_id=X` or count from current report data
   - OR: backend could return `{ transaction_count, total_amount }` on a pre-delete check endpoint
2. If transactions exist → show destructive confirmation dialog:
   ```
   ⚠ Delete "Electricity Bill"?
   
   This item has 12 expense transactions totaling ₹18,500.
   Deleting will permanently remove the item AND all related expense records.
   
   [Cancel]  [Delete Item + 12 Transactions]
   ```
3. If no transactions → standard confirm: "Delete item 'X'? This cannot be undone."

**Category Delete:**
1. Show informational warning: "Category 'Staff Salary' has 5 items. Items will be moved to uncategorized."
2. Standard confirm (not destructive — no data loss)

### Phase 2 — Role Gating (P2, deferred — note only)

- Gate all 3 delete types behind `AuthContext.hasPermission('expense.delete')` or similar
- Part of CR-071 (App-Wide Role Gating) scope — **DO NOT implement now**
- Add code comment: `// TODO CR-071: gate behind expense.delete permission`

---

## Blast Radius

- **Files:** 1-2 (`ExpenseSetupPanel.jsx` + possibly `expenseService.js` for pre-delete check)
- **Scope:** SMALL-MEDIUM (~30-50 lines — dialog + pre-check)
- **Hotspots:** NONE
- **Financial:** YES — prevents accidental deletion of expense transaction records

## Open Questions

- **OQ-1:** Does backend have a pre-delete check endpoint that returns transaction count for an item? If not, can we count from client-side report data (less reliable) or need a backend brief?
- **OQ-2:** When an item is deleted and transactions cascade-delete, does the backend also adjust daily/monthly totals? Or do aggregation endpoints auto-exclude?

## Evidence

- Owner verbal report: 2026-07-16
- Current code: `ExpenseSetupPanel.jsx` delete handler uses generic `window.confirm`
- BUG-152 fixed the endpoint mechanics — this bug addresses the UX safety layer

## Next

Planning Gate 2 → Impact Analysis (Phase 1 only — cascade warning dialog)
Phase 2 (role gating) deferred to CR-071 backlog
