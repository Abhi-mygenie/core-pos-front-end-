# BUG-DELETE-CATEGORY — Investigation Report

**Date:** 2026-07-09
**Role:** INVESTIGATION AGENT (Role 6, AGENT_PROMPT_ALPHA v0.7 §918–1033)
**Item:** Delete Category behaviour in Expense Setup panel — owner reported toast says "Category removed" but suspects it isn't actually removed
**Trigger:** Owner screenshot 2026-07-09 showing "Category removed" toast + questions:
  1. Which API is used?
  2. If category has items, do items get removed?
  3. Does the category actually get removed?

---

## 1. SUMMARY

**Root cause (HIGH confidence):** The FE `deleteCategory()` handler at `ExpenseSetupPanel.jsx:179–193` **never calls a delete-category API**. It iterates over the category's items and issues `DELETE /expense/expenses/{item_id}` for each one, then unconditionally fires the toast "Category removed" — but the category itself remains on the backend. The backend has **no delete-category route at all** (verified via probes returning HTTP 404 NotFoundHttpException on 3 plausible URL patterns). This is the missing DELETE ask under **backend gap G3** in `BACKEND_GAPS_BRIEF.html`.

**Answers to owner's three questions:**

| Q | Answer |
|---|---|
| Which API is used? | **`DELETE /api/v2/vendoremployee/expense/expenses/{item_id}`** — called once per item in the category. **No** category-level delete API is called (none exists on backend). |
| If category has items, do items get removed? | **YES.** All items in the category are hard-deleted from the DB (irreversible). Concurrent `Promise.all` of item deletes. |
| Does the category actually get removed? | **NO.** Category persists on backend. `GET /category-list` continues to return it (with `0` item count after the sweep). Toast text is misleading. |

**Classification:** `FE_BUG` (misleading UX) + `BACKEND_GAP` (no delete-category endpoint exists — cannot be fixed FE-only).

**Confidence:** **HIGH** — reproduced end-to-end via code trace + curl endpoint probes + Playwright UI test with network capture.

**Steps used:** 8/10.

---

## 2. HYPOTHESES TESTED

| # | Hypothesis | Test method | Result | Evidence |
|---|---|---|---|---|
| H1 | FE only deletes items; category persists on backend | Playwright: click Delete → capture network → GET /category-list after | **CONFIRMED** — only `DELETE /expenses/{1130}` fired; `/category-list` still returns id 267 "Delivery" | `ui_delete_api_log.json` (11 events, no delete-cat call) |
| H2 | Backend has NO delete-category route at all | Curl probe 3 plausible URLs against fake id 999999 | **CONFIRMED** — all return HTTP 404 `NotFoundHttpException` | Inline curl output (see §4) |
| H3 | Backend cascade-deletes category when last item removed | Playwright: delete only item of `Delivery` (id 267); check /category-list | **ELIMINATED** — Delivery still present with count 0 after sweep + hard reload | `ui_delete_api_log.json` category-list responses |
| H4 | `DELETE_CATEGORY` constant exists but unused | grep `EXPENSE_ENDPOINTS` in constants.js | **CONFIRMED absent** — no `DELETE_CATEGORY` key defined | `constants.js:326–353` |

**Side finding (unrelated to this bug but relevant to parked BUG-159):** POST `/store_expense` with a **new** `category_name` returns `{"errors":[{"code":"not_found","message":"Category not found for this restaurant."}]}`. The endpoint is "add items to existing category" only — it does NOT create categories. There is currently NO category-create endpoint in `EXPENSE_ENDPOINTS`. This deepens BUG-159's diagnosis.

---

## 3. DATA FLOW TRACE

```
User clicks trash icon on category row (e.g. "Delivery" id 267)
        ↓
setDeletingCatId(267)  →  AlertDialog opens ("Delete Category? All items in this category will also be removed…")
        ↓
User clicks red "Delete" button
        ↓
deleteCategory() @ ExpenseSetupPanel.jsx:179
        ↓
catItems = allItems.filter(i => String(i.categoryId) === "267")   // [1 item: id 1130]
        ↓
await Promise.all(catItems.map(i => expenseService.deleteExpenseItem(i.id)))
        ↓
DELETE /api/v2/vendoremployee/expense/expenses/1130 → 200 {"message":"Expense deleted."}
        ↓
toast("Category removed")     ← ❌ MISLEADING — category was never deleted
        ↓
setDeletingCatId(null); setSelectedCategoryId(null-if-was-267)
        ↓
fetchAll()  →  GET /category-list  →  {"id":267,"category_name":"Delivery"} STILL PRESENT
```

**BREAK POINT:** Line 184–185 in `deleteCategory`. The function completes item deletion successfully, then falsely claims the category was removed. The category-level API call that should follow is never issued because:
1. FE has no service function for it (`expenseService.js` has no `deleteCategory`)
2. `EXPENSE_ENDPOINTS` has no `DELETE_CATEGORY` constant
3. Backend has no matching route

**Empty-category behaviour:** If `catItems = []`, `Promise.all([])` resolves immediately (no API call). Toast still fires. Absolutely nothing happens on backend. Same misleading outcome, worse UX (user thinks the empty category is gone; it isn't).

---

## 4. EVIDENCE ARTIFACTS

All persisted to `/app/memory/evidence/BUG-DELETE-CAT/` (auth tokens masked as `***MASKED***`).

| File | Purpose |
|---|---|
| `login_raw.json` | Auth response (tokens masked). Confirms auth works. |
| `category_list_before.json` | Baseline: 8 categories present |
| `create_test_cat.json` | Side-finding evidence — POST /store_expense with NEW category fails with `not_found` (this API only ADDS items to existing categories) |
| `category_list_after_create.json` | Still 8 categories — confirms `store_expense` cannot create categories |
| `ui_delete_api_log.json` | **KEY EVIDENCE** — full Playwright network capture during actual UI delete flow. Only 1 DELETE call (for item 1130). `/category-list` before/after both contain id 267 "Delivery". |

### Endpoint probe results (inline evidence for H2)

```
DELETE /api/v2/vendoremployee/expense/categories/999999      → HTTP 404 NotFoundHttpException
DELETE /api/v2/vendoremployee/expense/category/999999        → HTTP 404 NotFoundHttpException
DELETE /api/v2/vendoremployee/expense/delete-category/999999 → HTTP 404 NotFoundHttpException
DELETE /api/v2/vendoremployee/expense/expenses/999999        → HTTP 201 {"errors":[{"code":"not_found","message":"Expense not found."}]}
                                                              (this is the ITEM delete path — DELETE_ITEM)
```

### UI observations (Playwright screenshots captured in-session)

1. Confirmation dialog **"Delete Category? All items in this category will also be removed. This cannot be undone."** — misleading in the same way as the toast.
2. After confirming: All Items count 327 → 326 (item hard-deleted), Categories header still (8), Delivery still visible with count "0", toast "Category removed" fires.
3. After hard browser reload: Categories still 8, Delivery still visible.

---

## 5. RECOMMENDATIONS

### Classification: **BACKEND_ASK + FE_FIX (dependent)**

This cannot be fully fixed FE-only. Backend must expose a category-delete endpoint. FE fix follows once backend delivers.

### Immediate FE-only mitigations (owner decision)

| Option | Action | Pros | Cons |
|---|---|---|---|
| **A** | Change toast/dialog text to reflect reality: **"All items removed. Category kept (backend limitation)."** | 30-second edit; no destructive lie; users understand outcome | Empty categories accumulate over time |
| **B** | Disable the trash icon on categories entirely until backend delivers | Prevents the misleading action | Removes a feature users expect |
| **C** | Keep current behaviour but add a warning in dialog | Small change; owner-visible | Still misleading toast; not recommended |
| **D** | Do nothing; wait for backend | Zero risk | User perception issue remains |

**Recommended: Option A** — cheapest, honest, unblocks user understanding immediately. Register as new BUG (P1/MEDIUM risk) once owner confirms. Fast-lane candidate (1 file, ~4 text edits).

### Backend ask (already documented as G3 — do not create a new gap ID)

The delete-category endpoint is already documented under **Gap G3** in `BACKEND_GAPS_BRIEF.html` ("No Independent Category CRUD"). G3 asks backend to add all 3 endpoints together:

```
Gap G3 — No Independent Category CRUD (existing gap, re-verified 2026-07-09)
Missing endpoints:
  POST   /api/v2/vendoremployee/expense/category         — create empty category
  PUT    /api/v2/vendoremployee/expense/category/{id}    — rename category
  DELETE /api/v2/vendoremployee/expense/category/{id}    — delete category
                                                            (should cascade items OR reject if non-empty)
Impact: Blocks BUG-158 (Add Item — worked around), BUG-159 (Add Category — parked),
        BUG-160 (Rename — no workaround), and this Delete Category misleading flow.
Priority: P1 (feature broken)
Note:   This report contributed 2026-07-09 re-verification evidence (4 probes) to G3.
        Backend has been asked twice: 2026-07-06 (original G3), 2026-07-08 (BUG-159
        HTML-redirect finding merged into G3). Still open.
```

Additional context for G1 (Delete Transaction): the endpoint `/delete-expense/{id}` **exists and works** — that's the transaction-delete route, wired via BUG-152. It does NOT delete categories or stock items. Do not confuse the two.

### Once backend delivers

- Add `DELETE_CATEGORY: '/api/v2/vendoremployee/expense/category'` constant
- Add `expenseService.deleteCategory(catId)` service function
- Rewrite `deleteCategory()` handler to: `await deleteCategory(deletingCatId)` (backend cascades items)
- Restore accurate toast "Category removed" text
- Piggy-back on **BUG-162** optimistic-update work: on success, `setCategories(prev => prev.filter(c => c.id !== deletingCatId))` + `setAllItems(prev => prev.filter(i => i.categoryId !== deletingCatId))`

### Not required now

- No FE code changes without owner GO
- No new intake/registry entry from Role 6 (Investigation does not register — INTAKE agent does; owner's next step should trigger it)

---

## 6. RETROACTIVE CANDIDATES

None. This is a fresh finding with no matching registry entry.

**Adjacent open items to reference in the new intake:**

| ID | Relation |
|---|---|
| BUG-160 | Category **rename** is broken — same backend gap **G3** (no rename endpoint) — same class of gap: category-level operations are missing |
| BUG-159 | Add **Category** is broken — same backend gap **G3** (no create endpoint / HTML redirect on empty stock_title) — same class of gap |
| BUG-162 | Optimistic-update refactor will cover the eventual fixed deleteCategory handler |

---

## HANDOVER (→ INTAKE for new BUG registration, then Planning after backend delivers)

```
Root cause: FE deleteCategory() never calls a category-delete API; backend has no
            such route. Toast/dialog text falsely claim "Category removed" while
            only the items are deleted.
Confidence: HIGH (curl + Playwright + code trace).
Steps: 8/10.
FE fix: PARTIAL — text-only mitigation available (Option A above, ~4 lines).
        Full fix requires backend endpoint (Gap G3 — already filed, re-verified 2026-07-09).
Backend ask: YES — reinforce G3 in BACKEND_GAPS_BRIEF.html (already documented; this
             investigation adds fresh evidence but does NOT create a new gap ID).
Planning skip eligible: For Option A (text-only): YES, Fast Lane candidate.
                         For full fix: NO — needs backend first.
Escalated from Bug Fix: NO (fresh owner report).
Retroactive candidates: NONE.
Investigation report: /app/memory/BUG-DELETE-CAT_INVESTIGATION_REPORT.md
Evidence bundle: /app/memory/evidence/BUG-DELETE-CAT/
Next: INTAKE agent to register new BUG (title suggestion below).
```

### Suggested intake IDs & titles

- **BUG-163** — "CR-059 Setup — Delete Category is misleading. FE only deletes items; category persists on backend. Toast+dialog text falsely claim 'Category removed'. Backend gap G3 (already open) — no delete-category route."
- **Backend Gap:** Reinforce **G3** (existing, re-verified 2026-07-09) — no new gap ID needed. All 3 category CRUD endpoints (POST, PUT, DELETE) are already asked under G3.

---

*Investigator: E1 agent (Emergent) — Role 6 INVESTIGATION*
*Protocol: AGENT_PROMPT_ALPHA.md v0.7 §ROLE 6 (10-step budget, hypothesis-driven, evidence persisted, no code touched)*
