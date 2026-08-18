# BUG-165 — Impact Analysis (Gate 2)

**Date:** 2026-07-24
**Code Reality:** PARTIAL — FE client-side guard exists (case-insensitive name check in `addItem()`). Backend now returns proper 422.
**Risk:** LOW

---

## Backend Validation (2026-07-24)

| Test | Previous | Now |
|---|---|---|
| `POST /store_expense` with duplicate `stock_title` | HTTP 200 — silently created duplicate item | **HTTP 422** + `{message: "Item already exists in this category.", errors: [{code: "duplicate", field: "stock_title"}]}` ✅ |

## Current FE Guard (BUG-165 fix in ExpenseSetupPanel.jsx)

```js
// BUG-165: addItem() pre-checks allItems state (case-insensitive, same categoryId)
const duplicate = allItems.find(i => i.title.toLowerCase() === newName.toLowerCase() && i.categoryId === cat.id);
if (duplicate) { toast destructive; return; }
```

This guard was a workaround for the backend allowing duplicates. Now that backend returns 422, the catch block will also fire as a second safety layer.

## Affected Files

| # | File | Change | Risk |
|---|------|--------|------|
| 1 | `components/expense/ExpenseSetupPanel.jsx` | Optional: keep client-side guard as fast UX (avoids network round-trip) + let 422 `catch` surface backend message as fallback. Surface `err.readableMessage` in existing catch. | LOW — ~2 lines |

**Files WILL NOT touch:** expenseService.js, constants.js

## Scope Lock

- **1 file, ~2 lines** (add `err.readableMessage` surfacing in catch block)
- FE guard stays as UX optimization (instant feedback without API call)
- No UI change

---

**Next:** Gate 3 → Implementation (bundle with BUG-164 + BUG-203)
