# BACKEND_BRIEF_BUG202_2026-07-16 — Expense Item Update Endpoint (Rename + Change Category)

**Date:** 2026-07-16
**Owner:** Product Owner (feature approved 2026-07-16)
**Related bug:** BUG-202 (NEW — Edit Item feature in Expense Setup)
**Priority/Risk:** P1 / HIGH (currently no way to fix a mis-named or mis-categorized item without destroying its transactions)
**Classification:** MISSING_ENDPOINT + potential CONTRACT_MISMATCH

---

## 1. Summary

The Expense Module has no way to **update** an existing item's name or category. The only current workaround is DELETE + POST re-create (implemented in the drag-and-drop handler, `ExpenseSetupPanel.jsx:281–313`), which:
- Generates a **new item_id** (breaks any FK references)
- Would cascade-destroy all historical transactions tied to the old item_id (per current backend delete semantics — see BACKEND_BRIEF_BUG201)
- Is an unsafe pattern for a routine user action

Frontend needs a proper item-update endpoint. Curl-verify (2026-07-16) confirmed:
- `PUT /expense/expenses/{id}` currently routes to the **category update** handler when a category-shape body is sent.
- Sending an item-shape body returns HTTP 302 (silent middleware bailout, not a clean error).
- `PATCH` explicitly rejected: `"Supported methods: PUT, DELETE"`.

**There is no dedicated item-update endpoint today.** This brief requests one.

### Frontend impact if not fixed
- No item rename possible (typos are permanent).
- No item re-categorization possible (once misfiled, cascading data loss is the only workaround).
- Users cannot correct BUG-199's historical damage (items stuck in "misc").

---

## 2. Requested Endpoint

### 2.1 New endpoint

| Aspect | Value |
|---|---|
| **Method** | `PUT` |
| **URL** | `/api/v2/vendoremployee/expense/stock-items/{id}` *(preferred — namespaced under stock-items)* **OR** `/api/v2/vendoremployee/expense/expenses/{id}` with body-shape discrimination *(if backend team prefers to keep current URL)* |
| **Auth** | Same as existing expense endpoints (Bearer token). |
| **Path param** | `{id}` — the expense stock item ID (i.e., `expense.id` in the `store-expense-details` response). |

### 2.2 Request payload

```json
{
  "title": "New Item Name",       // optional — omit to keep current
  "category_id": 42                // optional — omit to keep current
}
```

**Semantics:**
- Both fields are optional. Send only the fields being changed.
- `title`: item's display name. Rename allowed if not duplicate within the same category.
- `category_id`: reassign the item to a different category. Must reference an existing category.
- Both may be sent in a single request (rename + re-categorize atomically).

### 2.3 Response payloads

**Success — 200 OK**
```json
{
  "message": "Item updated successfully",
  "expense": {
    "id": 4586,
    "name": "New Item Name",
    "category_id": 42,
    "category_name": "grocery"
  }
}
```

**Duplicate name within target category — 409 Conflict**
```json
{
  "code": "DUPLICATE_ITEM_NAME",
  "message": "An item named 'X' already exists in category 'grocery'."
}
```
(Backend already has this check implicitly via the DnD flow — please enforce it here too so FE gets a clean 409 instead of a silent success.)

**Category not found — 404 Not Found**
```json
{
  "code": "CATEGORY_NOT_FOUND",
  "message": "Category not found."
}
```

**Item not found — 404 Not Found**
```json
{
  "code": "ITEM_NOT_FOUND",
  "message": "Item not found."
}
```

**Validation error — 422 Unprocessable Entity**
```json
{
  "errors": {
    "title": ["The title must be at least 1 character."],
    "category_id": ["The category_id must be an integer."]
  }
}
```

---

## 3. Historical-Data Semantics (owner-approved)

The FE plans to consume this endpoint under the following semantics — please confirm backend matches these expectations:

### 3.1 Rename propagation (name field)
- **Expected:** Backend stores `name` on the item master. When reports query transactions via JOIN, they display the current name.
- **Result:** Renaming an item **retroactively** updates the display name in all past reports.
- **Rationale:** Matches curl-verified read model — transactions carry `expense: {id, name}` where `name` appears to be joined at read-time.

### 3.2 Category change (category_id field)
- **Expected:** Each transaction row already carries its own `category_id` snapshot (verified in curl 2026-07-16). Changing the item master's `category_id` does **NOT** back-fill historical transactions.
- **Result:** Reassigning an item's category applies to **future** transactions only. Past transactions remain in their original category buckets.
- **Rationale:** Preserves accounting audit trail; matches how per-transaction `category_id` is set on the transaction row at creation time.

**If either 3.1 or 3.2 above doesn't match backend behavior, please flag in the response so FE can adjust UX copy accordingly.**

---

## 4. Reproduction of the current gap

### Try to rename an item via the existing route
```bash
curl -X PUT   "https://preprod.mygenie.online/api/v2/vendoremployee/expense/expenses/4589"      -H "Authorization: Bearer $TOKEN"      -H "Content-Type: application/json"      -d '{"title":"RENAMED","category_id":42}'
# HTTP/1.1 302 Found  (silent redirect to preprod root)
# Route exists but body-shape mismatch — currently only category-shape body succeeds
```

### Try PATCH
```bash
curl -X PATCH "https://preprod.mygenie.online/api/v2/vendoremployee/expense/expenses/4589"      -H "Authorization: Bearer $TOKEN"      -H "Content-Type: application/json"      -d '{"title":"RENAMED"}'
# HTTP/1.1 405 Method Not Allowed
# "Supported methods: PUT, DELETE"
```

### Current unsafe workaround (DnD, `ExpenseSetupPanel.jsx:281–313`)
```
DELETE /expense/expenses/{old_id}      → item deleted + all its transactions cascade-deleted
POST   /expense/store_expense          → new item created with new id (name + target category)
```
Once BACKEND_BRIEF_BUG201 changes DELETE semantics (transactions must be deleted first), this workaround will fail with 409 whenever the item has transactions — leaving users with **no path** to correct a mis-filed item until this brief is delivered.

---

## 5. Priority + Sequencing

**P1** — this brief is a **precondition** for both:
1. **BUG-202** (Edit Item UI feature) — cannot ship without this endpoint.
2. **The safe rollout of BACKEND_BRIEF_BUG201** — once BUG-201's non-cascade delete lands, the DnD "delete + re-create" trick breaks. If BUG-202's endpoint is not ready by then, users lose the ability to re-categorize items via drag-and-drop.

**Recommended delivery order:**
1. Deliver **this brief (BUG-202)** endpoint first.
2. Update FE to use the new endpoint (DnD handler + new Edit Item UI).
3. Then deliver **BUG-201** (non-cascade DELETE).
4. FE removes the DELETE+POST workaround entirely once step 3 lands.

Delivering in reverse order (BUG-201 first) will trap users in a broken state.

---

## 6. Evidence

- Curl session log: `/app/memory/evidence/BATCH_A/CURL_VERIFY_FINDINGS.md`
- Raw curl artifacts: `/app/memory/evidence/BATCH_A/b6_put.txt`, `/app/memory/evidence/BATCH_A/b6_put_name.txt`
- Related brief: `/app/memory/backend_briefs/BACKEND_BRIEF_BUG201_2026-07-16.md`
- Impact analysis: `/app/memory/impact/BATCH_A_EXPENSE_BUGS_IMPACT_ANALYSIS.md`

---

## 7. Frontend Workaround (interim)

**Available:** NO safe workaround.
**FE interim posture:** Ship BUG-199 fix and CR-074-A immediately (they don't need this endpoint). Hold BUG-202 Edit Item feature until backend delivers this brief. Existing DnD "re-categorize" flow remains functional (with its cascade caveat) until BUG-201 backend changes land.

---

## 8. Acceptance Criteria for Backend Delivery

- [ ] `PUT` endpoint accepts `{ title, category_id }` (both optional).
- [ ] 200 response on success with updated item echoed.
- [ ] 409 on duplicate title within target category.
- [ ] 404 on missing item or missing category.
- [ ] 422 on validation errors (title empty, category_id non-int, etc.).
- [ ] Rename propagates to historical report reads (via JOIN or equivalent).
- [ ] Category change does NOT rewrite historical transaction `category_id` values.
- [ ] Preprod test data seeded so FE can end-to-end verify all response codes.

---

## 9. Contact

Frontend planning agent (this doc author).
Preprod URL: `https://preprod.mygenie.online`
Test account: `owner@18march.com` (see `test_credentials.md`).
