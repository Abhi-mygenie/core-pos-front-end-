# Implementation Plan — BUG-270 (Update Order Missing Customer Fields)

**ID:** BUG-270
**Gate:** 3 (Implementation Plan)
**Date:** 2026-07-29
**Execution Phase:** 1 (Independent)
**Risk:** LOW
**Files:** 1 | **Lines changed:** ~3

---

## Step 0 — Starting Code State

**File:** `src/api/transforms/orderTransform.js`
**L1131 today:**
```js
      cust_name:                  customer?.name || '',
```
**L1132 today (next key):**
```js
      order_note:                 orderNotes.map(n => n.label).join(', '),
```

Compare cancelAndUpdateOrder (L1286-1291) which already has all fields — use as reference.

---

## Edits

### Edit 1 — Add cust_mobile + cust_membership_id to updateOrder payload
**File:** `src/api/transforms/orderTransform.js`
**After L1131** (`cust_name`), insert 2 lines:
```js
      cust_mobile:                customer?.phone || '',
      cust_membership_id:         customer?.id || '',
```

**Result:** L1131-1133 becomes:
```js
      cust_name:                  customer?.name || '',
      cust_mobile:                customer?.phone || '',
      cust_membership_id:         customer?.id || '',
```

---

## Verification Matrix

| # | Test | Method | Expected |
|---|------|--------|----------|
| V1 | Code: updateOrder has cust_mobile after cust_name | grep | present |
| V2 | Code: updateOrder has cust_membership_id | grep | present |
| V3 | Compile: webpack no errors | log check | compiled successfully |
| V4 | Runtime: Update order on preprod, check network payload | Playwright + DevTools | cust_mobile + cust_membership_id in request body |

## Rollback
Remove the 2 inserted lines. No other changes needed.
