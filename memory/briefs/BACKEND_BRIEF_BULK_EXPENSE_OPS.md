# Backend Brief — Bulk Expense Operations (Aggregation Endpoints)

**Filed:** 2026-07-17
**Author:** IMPLEMENTATION role (CR-074-B Batch B smoke)
**Owner decision:** Defer FE optimizations (optimistic-close + concurrency bump). Wait for backend aggregation endpoints instead.
**Priority:** P2 (UX polish; current per-item parallel-3 pattern is functional, just slow at high N)

---

## Problem

CR-074-B Phase 4 shipped a bulk-select feature (checkboxes + selection banner + `[Delete Selected]` + `[Move to Category ▼]`) on the Expense Setup panel. Behind the scenes, the frontend has to fan out **one HTTP call per selected item**, because backend only exposes per-item endpoints:

| Operation | Current endpoint (per item) |
|---|---|
| Delete a stock item | `DELETE /api/v2/vendoremployee/expense/expenses/{item_id}` |
| Move / rename a stock item | `PUT /api/v2/vendoremployee/expense/expenses/{item_id}` with body `{stock_title, category_id}` |

FE parallelizes at concurrency=3 (conservative) so on preprod latency (~500 ms/call) users observe:

| Items selected | Wall-time (measured) |
|---|---|
| 3 | ~0.5–0.8 s |
| 10 | ~2.0–3.2 s |
| 20 | ~3.5–5.6 s |
| 50 | ~8.5–13 s |

The modal stays open with a spinner during this window; users have flagged it as noticeably slow past ~5 items.

## Requested backend endpoints

### 1) Bulk delete
```
DELETE /api/v2/vendoremployee/expense/expenses/bulk
Body: { "ids": [4611, 4612, 4613, ...] }
```
**Success (200):**
```json
{
  "deleted": [4611, 4612],
  "failed": [
    { "id": 4613, "code": "not_found" }
  ]
}
```
- Partial success is fine — return per-id status.
- Transactional semantics are NOT required for delete (idempotent).

### 2) Bulk move (re-assign category)
```
PUT /api/v2/vendoremployee/expense/expenses/bulk
Body: {
  "ids": [4614, 4615, 4616],
  "category_id": 42
}
```
**Success (200):**
```json
{
  "moved": [
    { "id": 4614, "stock_title": "P4_MOVE_B", "category_id": 42, "category_name": "Fish" }
  ],
  "failed": [
    { "id": 4615, "code": "duplicate_name" },
    { "id": 4616, "code": "not_found" }
  ]
}
```
- **Preserve `unit_price` row per item** (same semantics as the per-item PUT — see BUG-202 validation doc).
- **Enforce duplicate-name check** in target category server-side (backend currently does NOT — see BUG-165 flag). If the FE bulk move sees `duplicate_name` in the response it will show a "skipped" toast, same UX as today's pre-flight FE check.
- No need for transactional all-or-nothing; partial-success shape shown above is preferred.

### 3) Response conventions (both endpoints)
- HTTP 200 for the request itself (even if some IDs failed inside).
- HTTP 4xx only for malformed request (missing body, non-array ids, etc.).
- Match the existing malformed-404 convention (HTTP 201 with `errors[0].code == 'not_found'`) if that's easier — FE already handles that path in `handleDragEnd`, `saveEditItem`, and `bulkMoveConfirmed`.

## Frontend readiness

When the endpoints ship, the FE swap is a **~40-line change** in `ExpenseSetupPanel.jsx`:
- Replace `runWithConcurrency(ids, 3, worker)` with a single `expenseService.bulkDeleteExpenseItems(ids)` or `bulkMoveExpenseItems(ids, category_id)` call.
- Add the two service wrappers + one endpoint constant + one transform for the new response shape.
- Estimated wall-time after the swap: **~200 ms regardless of N**.

The FE's existing per-item revert / skip-with-toast infrastructure is already partial-success aware and needs no changes.

## Non-blockers this fix would also address

- Removes the need for FE-side pre-flight duplicate check on bulk move (backend `duplicate_name` code will drive the skip toast).
- Same aggregation pattern could also cover BUG-165 backlog (backend-enforced uniqueness on `POST /store_expense` + `PUT /expenses/{id}`).

## Code markers already in place

`ExpenseSetupPanel.jsx` — near `runWithConcurrency` and both bulk handlers:
```js
// ⚠️ BACKEND FLAG (CR-074-B Batch B, 2026-07-17):
// Bulk operations issue one HTTP call per item because backend exposes only per-item endpoints.
// See /app/memory/briefs/BACKEND_BRIEF_BULK_EXPENSE_OPS.md for requested endpoints:
//   DELETE /expenses/bulk  and  PUT /expenses/bulk
// FE swap when delivered: replace runWithConcurrency() with a single bulk service call.
```

## Owner decision log

- 2026-07-17: FE optimizations (Option A optimistic-close, Option B concurrency bump 3→6) **declined**. Current per-item parallel-3 pattern stays. Wait for backend aggregation endpoints (this brief). Ship Phase 5 first, then revisit if backend brief lands during the same sprint.
