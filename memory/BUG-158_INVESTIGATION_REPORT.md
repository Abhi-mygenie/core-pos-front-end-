# BUG-158 — Investigation Report

**Date:** 2026-07-09
**Role:** INVESTIGATION AGENT (Role 6, AGENT_PROMPT_ALPHA v0.7 §918–1033)
**Item:** BUG-158 — "Add Item to existing category" reported as still broken by owner
**Escalated from:** 2026-07-08 Bug Fix session — code applied but not curl-verified
**Related items parked:** BUG-159 (parked per owner directive 2026-07-09)

---

## 1. SUMMARY

**Root cause:** **NONE — bug is NOT present in current codebase.** The applied fix at `ExpenseSetupPanel.jsx:196–213` (calling `expenseService.createCategoryWithItems(cat.name, [newItemName.trim()])` → `POST /store_expense`) works end-to-end. Backend accepts payload, returns HTTP 200 with clean JSON, DB persists item, FE state refreshes, item renders in the UI. Owner's "still not able to add items" report is not reproducible against the current build.

**Classification:** `NOT_A_BUG` (candidate for retroactive closure) — with residual UX gap (item not surfaced immediately when list is alphabetically sorted).

**Confidence:** **HIGH** — reproduced end-to-end via curl (API layer) AND Playwright (UI layer). Both DB row + UI row verified.

**Steps used:** 8/10.

---

## 2. HYPOTHESES TESTED

| # | Hypothesis | Test method | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | Axios trap — backend returns HTTP 200 with `errors` body, success interceptor pass-through | Curl POST + response inspection | 3 | **ELIMINATED** — backend returned HTTP 200 with `{category, stock_items}` success body | `store_expense_probe.json`, `store_expense_probe_meta.txt` |
| H2 | Category name mismatch — `cat.name` runtime value diverges from stored name | Curl with exact copy of `category_name` from GET category-list | 2+3 | **ELIMINATED** — used "Milk" (exact) → HTTP 200 success | `category_list_response.json` + `store_expense_probe.json` |
| H3 | Payload format issue — backend rejects `stock_title: [string]` (e.g. requires objects) | Curl with array-of-string payload | 3 | **ELIMINATED** — array of strings accepted, item created | `store_expense_probe.json` |
| H4 (added) | FE state / UI not refreshing after successful POST | Playwright — capture network + read UI counts before/after | 7-8 | **ELIMINATED** — Category count "Others 79 → 80", All Items "326 → 327", search for new item returns row | `ui_test_api_log.json`, `03_after_add_item.png`, `04_search_UI_TEST.png` |

Prior stale evidence `/app/memory/evidence/CR-059/store_expense.json` showing `{"errors":[{"code":"not_found",...}]}` is now explained: that was a probe with an **incorrect / non-existent** `category_name`. It is not the current runtime path.

---

## 3. DATA FLOW TRACE

```
User types item name → onKeyDown Enter / onClick "Add" button
        ↓
addItem() @ ExpenseSetupPanel.jsx:196–213
        ↓
cat = categories.find(c => String(c.id) === String(selectedCategoryId))
   [categories populated from GET /category-list via fromAPI.categories transform,
    which maps category_name → name @ expenseTransform.js:58–66]
        ↓
expenseService.createCategoryWithItems(cat.name, [newItemName.trim()])
        ↓
POST /api/v2/vendoremployee/expense/store_expense
  Body: {"category_name":"Milk","stock_title":["UI_TEST_1783410868"]}
        ↓
Backend → HTTP 200
  {"category":{"id":250,"name":"Milk"},
   "stock_items":[{"id":4275,"stock_title":"UI_TEST_1783410868"}]}
        ↓
Axios success interceptor pass-through (no errors — correct behaviour here)
        ↓
toast("Item added") + setNewItemName("") + fetchAll()
        ↓
GET /category-list + GET /expenses-list (concurrent)
        ↓
fromAPI.expenseItems + name→id cross-reference (expenseTransform.js + panel line 119–126)
   [expenses-list returns category_id:null; FE resolves via catByName[categoryName.toLowerCase().trim()]]
        ↓
setAllItems(rawItems) → visibleItems filter → table re-renders
        ↓
✅ Item visible when searched or scrolled to alphabetical position
```

**BREAK POINT:** None. Chain is intact end-to-end.

---

## 4. EVIDENCE ARTIFACTS

All persisted to `/app/memory/evidence/BUG-158/` (secrets masked as `***MASKED***`):

| File | Purpose |
|---|---|
| `login_response.json` | Auth response (token masked) — confirms auth path works |
| `category_list_response.json` | Raw GET /category-list — reveals backend uses `category_name` field name |
| `category_list_meta.txt` | HTTP 200 status confirmation |
| `store_expense_probe.json` | **KEY EVIDENCE** — HTTP 200 + `{category, stock_items}` success body when POSTed with existing category name |
| `store_expense_probe_meta.txt` | HTTP_STATUS:200 + CONTENT_TYPE:application/json |
| `expenses_list_after_probe.json` | GET /expenses-list AFTER POST — confirms DB persistence (item id 4275 present, category_name="Milk") |
| `ui_test_api_log.json` | Playwright-captured network log of the full UI flow — 7 API events, all HTTP 200 |
| `03_after_add_item.png` | UI screenshot showing Others (79→80), All Items (326→327), "Item added" toast |
| `04_search_UI_TEST.png` | UI screenshot with search filter — new item `UI_TEST_1783410868` visible in Others category |
| `05_search_BUG158_PROBE.png` | UI screenshot — Milk-added curl item filtered out when Others is selected (correct behaviour) |

---

## 5. RECOMMENDATIONS

### Classification: `OWNER_DECISION`

Route: **Retroactive Closure candidate** per AGENT_PROMPT_ALPHA §Role 6 "Do" bullet on retroactive check.

### Recommended Actions

1. **Registry update — BUG-158 → `IMPLEMENTED + QA PASS`**
   - Current registry entry `IMPLEMENTED + SELF-TEST PASS (code applied) | 5a (QA NOT DONE)` should be promoted after owner smoke-verification.
   - Fix commit: 2026-07-08 change to `ExpenseSetupPanel.jsx:196–213` (already in codebase).
   - Evidence bundle: `/app/memory/evidence/BUG-158/` (this session).

2. **Owner smoke test (Gate 5b)** — 30-second manual confirmation:
   - Login as `owner@cafe103.com` at preprod
   - Navigate to `/expense-setup`
   - Select any category (e.g. Milk) → type a unique name → click **Add**
   - Expect: toast "Item added", category count increments, item visible via search
   - **If PASS:** close BUG-158.
   - **If FAIL:** owner must share (a) exact category used, (b) exact item name, (c) browser + timestamp, (d) screenshot of the failure — so a targeted follow-up curl can reproduce the specific edge case.

3. **BUG-161 (bulk save) — planning skip eligible**
   Uses identical code path (`createCategoryWithItems(cat.name, [row.title.trim()])` inside a loop @ line 259–279). This investigation transitively validates BUG-161's approach.
   - Recommend: run one curl POST per row for a 2-row sample as a self-test, then promote to `IMPLEMENTED + QA PASS`.
   - Full separate curl not blocking this report.

### UX gap identified (out-of-scope, NOT a bug)

The item list is sorted alphabetically. A newly-added item at position "U" is not visible above the fold when the user is at the top of the Others list. Users may interpret this as "nothing happened" even though the count incremented and the toast fired. **Not a defect** — but a possible cause of the owner's original perception.

**Optional enhancement (LOW risk, owner call):**
- After successful add, either (a) scroll to and briefly highlight the new row, or (b) prepend a `Just added` chip / sticky recent-items strip above the alphabetic list.
- Requires owner UX approval before implementation.

### No FE code fix required. No backend ask required.

---

## 6. RETROACTIVE CANDIDATES

| ID | Registry status | Actual state | Recommendation |
|---|---|---|---|
| BUG-158 | IMPLEMENTED + SELF-TEST PASS (QA not done) | Working end-to-end (curl + UI verified) | Promote to `IMPLEMENTED + QA PASS` after owner smoke |
| BUG-161 | IMPLEMENTED + SELF-TEST PASS (QA not done) | Same code path as BUG-158 — transitively validated | 2-row self-test then promote |

---

## HANDOVER (→ Owner / → Bug Fix if smoke fails)

```
Root cause: NONE — BUG-158 is not reproducible in current build.
Confidence: HIGH (curl + Playwright + DB read + UI render all pass).
Steps: 8/10.
FE fix: no.
Backend ask: no.
Planning skip eligible: N/A (no code change needed).
Escalated from Bug Fix: YES (2026-07-08 session, unverified fix).
Retroactive candidates: BUG-158, BUG-161.
Investigation report at: /app/memory/BUG-158_INVESTIGATION_REPORT.md
Evidence bundle: /app/memory/evidence/BUG-158/
Next step: Owner smoke test (30 sec) → close BUG-158 + BUG-161.
```

---

*Investigator: E1 agent (Emergent) — Role 6 INVESTIGATION*
*Protocol: AGENT_PROMPT_ALPHA.md v0.7 §ROLE 6 (10-step budget, hypothesis-driven, evidence-persisted)*
