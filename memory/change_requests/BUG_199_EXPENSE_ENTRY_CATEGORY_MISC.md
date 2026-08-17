# BUG-199 — Expense Entry: New Item Always Goes to "misc" Category

**ID:** BUG-199
**Date:** 2026-07-16
**Source:** OWNER-REPORTED + AGENT-INVESTIGATED
**Classification:** BUG
**Severity:** P1 (core CRUD broken — item category not persisted)
**Risk:** MEDIUM (no financial logic, additive field)
**Duplicate Check:** DISTINCT
**Sprint:** POS 5.0

---

## Summary

When adding an expense and creating a new item inline from the Add Expenses form (not from master list), the item always goes into "misc" category regardless of which category the user selects.

## Root Cause

**Classification:** CODE_GAP
**Confidence:** HIGH (deterministic — 2 code locations confirmed)

`categoryId` is captured in React component state (`line.categoryId`) when user selects a category from the dropdown, but is **never serialized** into the API payload at TWO levels:

1. `ExpenseEntryPanel.jsx` L489-497 — `handleSave()` builds details array without `categoryId`
2. `expenseService.js` L138-145 — `addExpenseEntry()` payload mapping omits `category_id`

Backend receives no category → defaults new item to "misc".

## Evidence

```
handleSave() L489-497:
  details = lines.map(l => ({
      expense: l.itemName,
      amount, payment_method, quantity, unit, physical_quantity, notes
      ❌ categoryId: MISSING
  }))

addExpenseEntry() L138-145:
  details: lines.map(l => ({
      expense, amount, payment_method, quantity, unit, physical_quantity
      ❌ category_id: MISSING
  }))
```

- Screenshot evidence: owner provided — all items in "misc" despite category selection

## Blast Radius

- **Files:** 2 (`ExpenseEntryPanel.jsx`, `expenseService.js`)
- **Scope:** SMALL (~2 lines)
- **Hotspots:** NONE
- **Financial:** NO

## Fix

1. `ExpenseEntryPanel.jsx` L489-497: add `category_id: l.categoryId || null`
2. `expenseService.js` L138-145: add `category_id: l.category_id || null`

**CURL VERIFY:** Confirm backend `/store-expense-details` accepts `category_id` at detail-line level.

## Next

Planning Gate 2 (or direct bug fix — ≤5 lines, 2 files, not hotspot, not financial → Fast Lane eligible with owner approval)
