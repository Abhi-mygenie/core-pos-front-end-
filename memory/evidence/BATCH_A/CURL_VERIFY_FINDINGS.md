# BATCH_A — Curl Verification Findings (2026-07-16)

**Session:** Planning agent curl-verify preprod
**Auth:** owner@18march.com (verified working)
**Evidence dir:** `/app/memory/evidence/BATCH_A/`
**Raw artifacts:** `login.json`, `categories.json`, `b1_create.json`, `b2_cid_wide.json`, `b199_repro_nocatid.json`, `b199_repro_withcatid.json`, `b6_put.txt`, `b6_put_name.txt`

---

## Summary — 3 blockers resolved, 1 new finding

| Blocker | Status | Impact |
|---|---|---|
| **B-1** — payload key for BUG-199 | ✅ RESOLVED | Key is exactly `category_id` (snake_case, numeric) at detail-line level |
| **B-2** — query param for BUG-200 | ✅ RESOLVED | Current code is already correct (`category_id`). **BUG-200 is a downstream symptom of BUG-199, NOT a distinct bug.** |
| **B-6** — item update endpoint for BUG-202 | ⚠ PARTIAL | Laravel confirms PUT is supported on `/expense/expenses/{id}` but currently routes to the **category update** handler (semantic overload). No dedicated item-update endpoint exists. **BACKEND_BRIEF needed.** |
| **Bonus** — transaction FK model | 🆕 DISCOVERED | Transactions carry `expense: {id, name}` (item FK object). Backend joins on read — rename likely propagates automatically. Affects BUG-202 semantic ruling (B-7). |

---

## B-1 — POST /store-expense-details accepts `category_id` at line level

### Endpoint tested
`POST /api/v2/vendoremployee/expense/store-expense-details`

### Request (working)
```json
{
  "e_date": "16/07/2026",
  "total_amount": 13,
  "details": [{
    "expense": "CURL_TEST_B1_cat149",
    "amount": 13,
    "payment_method": "Cash",
    "quantity": 0,
    "unit": "",
    "physical_quantity": 0,
    "category_id": 149          ← THIS is the key
  }]
}
```

### Response
```json
{
  "id": 9844,
  "e_date": "2026-07-16",
  "total_amount": 13,
  "details": [{
    "expense": { "id": 4586, "name": "CURL_TEST_B1_cat149" },
    "category_id": 149,
    "category_name": "employee salary",
    ...
  }]
}
```

### Findings
- Correct key: `category_id` (numeric).
- Backend echoes `category_id` + `category_name` in response.
- Backend auto-creates a new expense **master item** if the name is new — item is created with the provided category.
- Response reveals `expense.id` (item FK) — item-name is NOT a snapshot; it's referenced by ID.

### BUG-199 root cause definitively confirmed
Second curl **without** `category_id`:
```json
"details": [{ "expense": "CURL_BUG199_repro_no_catid", "amount": 5, ... }]
```
Response:
```json
"expense": { "id": 4589, "name": "CURL_BUG199_repro_no_catid" },
"category_id": 273,
"category_name": "misc"       ← defaults to misc
```

**Deterministic:** omitting `category_id` on inline-created items → backend defaults to `misc` (category_id=273).

### Fix for BUG-199
Add `category_id: l.categoryId || null` at two sites (`ExpenseEntryPanel.jsx:489` and `expenseService.js:138`). No backend work needed.

---

## B-2 — Report category filter mechanics

### Endpoint tested
`GET /api/v2/vendoremployee/expense/expenses-report?from=DD/MM/YYYY&to=DD/MM/YYYY&category_id=<N>`

### Test setup
Seeded 3 test transactions:
- cat=149 (employee salary), ₹13
- cat=148 (Fish), ₹25
- cat=42 (grocery), ₹37

### Filter behavior
| Query | Result | Verdict |
|---|---|---|
| (baseline, no filter) | 3 rows / ₹75 | expected |
| `category_id=149` | 1 row / ₹13 (employee salary only) | ✅ FILTER WORKS |
| `category=149` | 3 rows / ₹75 (ignored) | filter param ignored |
| `category=Fish` | 3 rows / ₹75 (ignored) | filter param ignored |
| `category_name=Fish` | 3 rows / ₹75 (ignored) | filter param ignored |

### Findings
- Current FE code (`expenseService.js:120–125`) already sends **`category_id=<numeric>`** — this is the CORRECT param name.
- Backend filters correctly by numeric `category_id`.
- **BUG-200 as originally reported ("filter returns 0") is a downstream symptom of BUG-199**, not a distinct code bug:
  - All inline-created items historically landed in "misc" (BUG-199).
  - Filtering by "Staff Salary" (or any non-misc category) naturally returns 0 rows because there IS no data in those buckets.
  - Once BUG-199 is fixed, new transactions carry proper `category_id` → filter works.

### Fix for BUG-200
**No code change required.** Close as **DUPLICATE-OF-BUG-199** (or reclassify as "resolved by BUG-199 fix").
Optional: after BUG-199 ships, run a data-migration query on backend (owner ruling Q-2) to reassign historical misc items to correct categories, if desired.

---

## B-6 — Item update endpoint (BUG-202)

### Endpoints tested
```
PUT   /api/v2/vendoremployee/expense/expenses/{id}  ← 302 redirect (payload rejected)
PATCH /api/v2/vendoremployee/expense/expenses/{id}  ← 405 with "Supported methods: PUT, DELETE"
```

### Findings
- Laravel confirms **PUT is registered** on `/expense/expenses/{id}` — but existing behavior routes to the **category update** handler (`updateCategory` service in FE uses this route with a category-shape body).
- Sending an item-shape body (`{title, category_id}` or `{name, category_id}`) → **HTTP 302** (auth-middleware bailout / body mismatch).
- **No dedicated item-update endpoint exists.** Backend must add one.

### Fix path for BUG-202
1. **Backend must expose a new endpoint** — e.g., `PUT /expense/stock-items/{id}` or reuse `/expense/expenses/{id}` with body discrimination (item-shape vs category-shape).
2. FE waits for backend delivery.
3. **BACKEND_BRIEF_BUG202** to be written (this session).

### B-7 Semantic ruling update — Snapshot vs Retroactive
Owner previously ruled **Snapshot** (recommendation confirmed).
**But new evidence (B-1 bonus finding):** transactions carry `expense: {id, name}` — the name field in the response is populated by JOIN on read. If backend renames the item master, ALL past reports display the new name (retroactive by default for name; category is a separate `category_id` on the transaction row that was snapshotted at creation).

**Recommendation to owner (updated):**
- **Name changes:** effectively retroactive on reports (backend joins on read). Cannot easily be "snapshotted" without backend changes.
- **Category changes:** transaction row has its own `category_id` — historical transactions keep old category. Editing item's category affects **future** entries only. This matches the Snapshot model naturally.
- **Owner ruling recommended:** accept this mixed reality (name = retroactive, category = snapshot). Document clearly in UI copy: "Renaming updates all past reports. Changing category applies to new entries only."

---

## Cleanup performed
- Deleted test transactions (5 daily-expense rows attempted; backend responded 404 — the daily-expense row `id` in create-response is not the deletable transaction-line id. **Filed as latent OQ:** how to programmatically delete a single expense transaction line?).
- Deleted test items (5 items — all returned 200 "Expense deleted."). This cascade-deleted the orphaned transaction lines.
- Final report query for 2026-07-16: 0 rows / ₹0. Preprod clean.

---

## Next actions
1. Write `BACKEND_BRIEF_BUG202_2026-07-16.md` (item update endpoint contract).
2. Update the batch impact analysis (§9) to reflect resolved blockers.
3. Re-scope Batch A: drop BUG-200 from work list (auto-resolved by BUG-199).
4. Present findings + design_agent call for CR-074-B / BUG-202 UI.
