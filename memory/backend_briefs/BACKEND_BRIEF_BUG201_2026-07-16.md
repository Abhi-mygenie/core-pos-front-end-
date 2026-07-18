# BACKEND_BRIEF_BUG201_2026-07-16 — Expense Deletion Safety (Item + Category)

**Date:** 2026-07-16
**Owner:** Product Owner (backend request approved)
**Related bug:** BUG-201 Phase 1
**Priority/Risk:** P1 / HIGH (data-loss prevention)
**Classification:** CONTRACT_MISMATCH + missing endpoints (new business rules)

---

## 1. Summary

The Expense module currently allows **silent, irreversible cascade deletion** of transaction data:

- **Item delete** (`DELETE /expense/expenses/{id}`) → item removed AND all its expense transactions are cascade-deleted by the backend. UI has no way to warn the user, and no way to enforce a safer workflow.
- **Category delete** (`DELETE /expense/category/{id}`) → currently moves items to "uncategorized" (misc). Owner wants this changed so a category cannot be deleted while it still contains items.

Frontend needs backend support to implement the new business rules below.

### Frontend impact if not fixed
- Users unintentionally destroy months of expense records with a single click.
- Finance reports become non-reproducible (past periods change silently).
- POS legal/audit posture weakens (no data-integrity guardrail).

---

## 2. New Business Rules (Owner Ruling — 2026-07-16)

### Rule R-201-A — Delete Item requires prior transaction deletion
> An expense item may **only** be deleted after **all its transactions have been deleted**.
> If any transaction still references the item, the delete request must fail.

### Rule R-201-B — Delete Category requires items to be moved out first
> A category may **only** be deleted when it contains **zero items**.
> If any item still references the category, the delete request must fail.
> (Users must move or delete items via the existing item-management UI before deleting the category.)

Combined, these two rules **remove all cascade behavior** from the delete path — no more silent transaction loss.

---

## 3. Backend Changes Requested

### 3.1 Modify `DELETE /expense/expenses/{id}` — Item Delete

**Current behavior:** deletes item + cascade-deletes all linked transactions.
**New behavior:** if the item has ≥1 linked transaction, return an error; do NOT delete.

| Aspect | Value |
|---|---|
| Method | DELETE (unchanged) |
| URL | `/expense/expenses/{id}` (unchanged) |
| Success (200) | `{ "message": "Item deleted successfully" }` |
| **Blocked (409 Conflict)** | `{ "code": "ITEM_HAS_TRANSACTIONS", "message": "Cannot delete item. It has N linked expense transactions. Delete the transactions first.", "transaction_count": N, "total_amount": <numeric>, "date_range": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" } }` |
| Not found (404) | `{ "message": "Item not found" }` |
| Auth | Same as today |

**Notes for backend:**
- Return HTTP 409 (not 400/422) — matches REST convention for state-conflict.
- Include `transaction_count`, `total_amount`, and optional `date_range` so the frontend can show a helpful message ("You have 42 transactions worth ₹18,500 between 2026-04-01 and 2026-07-15 — delete those first").
- Do **not** cascade-delete under any circumstance.

### 3.2 Modify `DELETE /expense/category/{id}` — Category Delete

**Current behavior:** deletes category, moves all items to uncategorized/misc.
**New behavior:** if the category has ≥1 item, return an error; do NOT delete or move.

| Aspect | Value |
|---|---|
| Method | DELETE (unchanged) |
| URL | `/expense/category/{id}` (unchanged) |
| Success (200) | `{ "message": "Category deleted successfully" }` |
| **Blocked (409 Conflict)** | `{ "code": "CATEGORY_HAS_ITEMS", "message": "Cannot delete category. It has N items. Move or delete the items first.", "item_count": N }` |
| Not found (404) | `{ "message": "Category not found" }` |
| Auth | Same as today |

**Notes for backend:**
- Drop the current "move to uncategorized" side-effect entirely.
- Return item count so frontend can display it in the error toast/dialog.

### 3.3 (Optional but highly recommended) — Pre-check endpoints

To give the user upfront awareness (before they even click Delete), please expose read-only pre-check endpoints so the UI can display counts on the button or in a tooltip.

**3.3.a — Item impact preview**
| Aspect | Value |
|---|---|
| Method | GET |
| URL | `/expense/expenses/{id}/impact` |
| Response (200) | `{ "transaction_count": N, "total_amount": <numeric>, "date_range": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" } }` |
| Notes | Should return `{ "transaction_count": 0, "total_amount": 0 }` for items with no transactions (never 404). |

**3.3.b — Category impact preview**
| Aspect | Value |
|---|---|
| Method | GET |
| URL | `/expense/category/{id}/impact` |
| Response (200) | `{ "item_count": N, "items": [{ "id": <int>, "title": "<string>" }] }` |
| Notes | `items` list is optional but useful so UI can show "This category contains: Coffee, Sugar, Tea, …" |

If (3.3) is out of scope for this sprint, frontend will fall back to relying only on the 409 error from (3.1)/(3.2) — acceptable but slightly worse UX.

---

## 4. Reproduction (current problematic behavior)

### Item cascade
```bash
# 1. Get an item that has transactions (e.g., item_id=5)
curl -H "Authorization: Bearer $TOKEN"      "https://preprod.mygenie.online/expenses-report?from=01/01/2026&to=16/07/2026"
# → shows N transactions with expense_id=5

# 2. Delete the item
curl -X DELETE -H "Authorization: Bearer $TOKEN"      "https://preprod.mygenie.online/expense/expenses/5"
# → 200 OK, item deleted

# 3. Re-fetch report
curl -H "Authorization: Bearer $TOKEN"      "https://preprod.mygenie.online/expenses-report?from=01/01/2026&to=16/07/2026"
# → N transactions ARE GONE. Historical data destroyed. ❌
```

### Category cascade (softer, but still an implicit move)
```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN"      "https://preprod.mygenie.online/expense/category/3"
# → 200, category deleted, items silently moved to uncategorized
```

---

## 5. Payload / Response Contract Examples (post-change)

### Success — item delete with no transactions
```http
DELETE /expense/expenses/12
Authorization: Bearer ***

HTTP/1.1 200 OK
{ "message": "Item deleted successfully" }
```

### Blocked — item delete with transactions
```http
DELETE /expense/expenses/5
Authorization: Bearer ***

HTTP/1.1 409 Conflict
{
  "code": "ITEM_HAS_TRANSACTIONS",
  "message": "Cannot delete item. It has 42 linked expense transactions. Delete the transactions first.",
  "transaction_count": 42,
  "total_amount": 18500.00,
  "date_range": { "from": "2026-04-01", "to": "2026-07-15" }
}
```

### Blocked — category delete with items
```http
DELETE /expense/category/3
Authorization: Bearer ***

HTTP/1.1 409 Conflict
{
  "code": "CATEGORY_HAS_ITEMS",
  "message": "Cannot delete category. It has 7 items. Move or delete the items first.",
  "item_count": 7
}
```

---

## 6. Evidence

- Owner verbal ruling: 2026-07-16 (Batch A planning session)
- Related intake: `/app/memory/change_requests/BUG_201_EXPENSE_DELETION_SAFETY.md`
- Impact analysis: `/app/memory/impact/BATCH_A_EXPENSE_BUGS_IMPACT_ANALYSIS.md`
- Prior related briefs: `BACKEND_BRIEF_EXPENSE_MODULE_2026_07_11.md` (BUG-160 category delete mechanics)

---

## 7. Frontend Workaround (interim)

**Available:** NO safe workaround for the item-cascade case.
**Interim behavior FE will ship on current backend:** Generic warning dialog ("This item may have linked expense transactions. Deletion is permanent and cannot be undone.") — Phase 1 fallback. This does NOT prevent data loss; it only informs the user.

**Once backend delivers changes above:** FE will:
1. Consume 409 → parse `transaction_count` / `item_count` → show a clear, non-destructive dialog with counts and a helpful instruction ("Delete these 42 transactions first, then try again").
2. If 3.3 pre-check endpoints ship: preview counts on hover/click so the user knows before initiating delete.
3. Remove all cascade-related UI language and safety warnings — they become unnecessary once backend enforces the rules.

---

## 8. Acceptance Criteria for Backend Delivery

- [ ] `DELETE /expense/expenses/{id}` returns 409 with the specified payload when transactions exist; 200 when clean.
- [ ] `DELETE /expense/category/{id}` returns 409 with the specified payload when items exist; 200 when clean.
- [ ] Cascade behavior removed on both endpoints — no transaction or item is deleted/moved as a side-effect.
- [ ] (Optional but preferred) 3.3.a and 3.3.b pre-check GET endpoints implemented.
- [ ] `test_credentials.md`-accessible test data seeded on preprod so FE can end-to-end verify both 200 and 409 paths.

---

## 9. Priority

**P1** — blocks BUG-201 Phase 1 implementation on the frontend side.
Please confirm ETA so FE can schedule implementation window accordingly.

---

## 10. Contact

Frontend planning agent (this doc author).
Preprod URL: `https://preprod.mygenie.online`
Test account: `owner@18march.com` (see `test_credentials.md`).
