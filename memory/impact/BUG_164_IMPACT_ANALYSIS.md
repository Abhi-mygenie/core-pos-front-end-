# BUG-164 — Impact Analysis (Gate 2)

**Date:** 2026-07-24
**Code Reality:** PARTIAL — FE guard exists (checks `res.data?.errors?.[0]` on 200 response). Backend now returns proper 409.
**Risk:** LOW

---

## Backend Validation (2026-07-24)

| Test | Previous | Now |
|---|---|---|
| `POST /expense/category` with duplicate name | HTTP 201 + `{errors: [{code: "duplicate"}]}` in body | **HTTP 409** + `{errors: [{code: "duplicate", message: "This category already exists..."}]}` ✅ |

## Current FE Guard (BUG-164 fix in ExpenseSetupPanel.jsx)

```js
// BUG-164: addCategory() checks res.data?.errors?.[0] — catches the old 200-with-error-body
const res = await createEmptyCategory(name);
if (res.data?.errors?.[0]) { toast destructive; return; }
```

This guard was a workaround for the backend returning 201 with errors in the body. Now that backend returns 409, the Axios interceptor will throw, and the `catch` block fires naturally.

## Affected Files

| # | File | Change | Risk |
|---|------|--------|------|
| 1 | `components/expense/ExpenseSetupPanel.jsx` | Simplify `addCategory()`: remove `res.data?.errors?.[0]` workaround. The 409 will trigger `catch` block. Surface `err.readableMessage` in toast. | LOW — ~3 lines cleanup |

**Files WILL NOT touch:** expenseService.js, constants.js, expenseTransform.js

## Scope Lock

- **1 file, ~3 lines** (remove workaround, rely on HTTP 409 catch)
- No UI change — same toast message, same UX

---

**Next:** Gate 3 → Implementation (can bundle with BUG-165 + BUG-203 cleanup)
