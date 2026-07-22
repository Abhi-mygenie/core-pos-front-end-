# Session Handover — 2026-07-09 (Context Review + Handover Write)

**Date:** 2026-07-09
**Role:** INVESTIGATION / PLANNING (read-only context review — no code changes this session)
**Items completed:** None (handover write only)
**Previous handover:** `/app/memory/handover/SESSION_HANDOVER_2026_07_08_DND_FIX.md`

---

## MANDATORY: READ THIS FIRST (New Agent Boot)

Per AGENT_PROMPT_ALPHA.md §STEP -1:

**Last session (2026-07-08):** Fixed Cross-category DnD (BUG-DND-CR059) via DELETE+POST workaround. Completed Unit Price API discovery (C1–C5). Applied code fixes for BUG-158 (addItem) and BUG-161 (bulk save) but did NOT verify them via curl. User subsequently confirmed: **"I am still not able to add items."** — BUG-158 is still open.

**This session (2026-07-09):** No code written. Read all context files, reviewed evidence, identified the root cause hypothesis for BUG-158. Writing handover only.

---

## 1. CURRENT STATE SUMMARY

### Working
| Feature | Status |
|---|---|
| Cross-category Drag and Drop (DnD) | WORKING — DELETE+POST fix confirmed |
| Expense Entry Panel (add/edit/delete daily entries) | WORKING |
| Export stock master | WORKING |
| Delete items | WORKING |
| Delete categories (deletes all items first) | WORKING |
| Unit Price read display (column in table) | WORKING (display only) |

### Broken / Incomplete
| Bug ID | Feature | Status |
|---|---|---|
| BUG-158 | Add Item to existing category | BROKEN — user confirmed still failing |
| BUG-159 | Add Category | BROKEN — silent failure (HTML redirect) |
| BUG-160 | Rename Category | BROKEN — no backend endpoint (backend-blocked) |
| BUG-161 | Bulk Save new items | CODE APPLIED but NOT curl-verified |
| Unit Price UI | Add/Edit/Delete unit prices in Setup Panel | NOT STARTED (discovery done) |

---

## 2. CRITICAL INVESTIGATION NEEDED — BUG-158 (P0, DO THIS FIRST)

### Problem
`addItem()` in `ExpenseSetupPanel.jsx` (line 196–213) was changed to call:
```js
await expenseService.createCategoryWithItems(cat.name, [newItemName.trim()]);
```

This calls `POST /api/v2/vendoremployee/expense/store_expense` with:
```json
{ "category_name": "EXISTING_CAT_NAME", "stock_title": ["new item name"] }
```

The user reports this STILL fails to save items.

### Why This Matters — The Axios Trap
The Axios success interceptor in `/app/frontend/src/api/axios.js` (line 36–37):
```js
(response) => { return response; }
```
**ONLY HTTP error status codes trigger the error interceptor.**

If the backend returns HTTP 200 with a JSON body like:
```json
{ "errors": [{ "code": "not_found", "message": "Category not found for this restaurant." }] }
```
Axios resolves the promise as **success**. The UI shows a "Item added" toast. The DB is NOT updated. This is exactly the silent failure pattern already documented for BUG-159.

### Evidence Found This Session
File: `/app/memory/evidence/CR-059/store_expense.json`
```json
{
  "errors": [
    {
      "code": "not_found",
      "message": "Category not found for this restaurant."
    }
  ]
}
```
This is a stored API probe result showing that `POST store_expense` can return an HTTP 200 with an errors body. The status code is NOT known from the file — it could be HTTP 200 (silent Axios pass-through) or HTTP 422 (proper error that Axios catches).

**The DnD investigation Probe 5 confirmed POST works:**
- Used category_name "Milk" (existing) + stock_title ["TEST_DELETE_ITEM"]
- Got back `{ "category": { "id": 250, "name": "Milk" }, "stock_items": [{ "id": 4268, ... }] }`
- Item WAS added to existing category

**The inconsistency:** Probe 5 worked, but `store_expense.json` shows a "not found" error. This could mean:
1. `store_expense.json` was from a test with a **wrong/mismatched category name**
2. The backend behaves differently when the same item name already exists in the category
3. There is a case-sensitivity or whitespace issue in `cat.name` at runtime

---

## 3. FIRST STEP FOR NEXT AGENT — CURL INVESTIGATION (BEFORE ANY CODE)

Run these exact probes in order. They will definitively resolve BUG-158.

### Step A — Get auth token
```bash
API_URL="https://preprod.mygenie.online"
TOKEN=$(curl -s -X POST "$API_URL/api/v1/auth/vendoremployee/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@cafe103.com","password":"Qplazm@10"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token','NO_TOKEN'))")
echo "TOKEN: $TOKEN"
```

### Step B — Get current category list (find exact name + ID)
```bash
curl -s -X GET "$API_URL/api/v2/vendoremployee/expense/category-list" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); [print(c['id'], repr(c['name'])) for c in d.get('data',[])]"
```
> Pick ONE category name from the output. Copy the name EXACTLY including spaces.

### Step C — Test POST store_expense with existing category + new item
```bash
# Replace "EXACT_CATEGORY_NAME_HERE" with name from Step B
curl -s -X POST "$API_URL/api/v2/vendoremployee/expense/store_expense" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category_name": "EXACT_CATEGORY_NAME_HERE", "stock_title": ["CURL_TEST_ITEM_001"]}' \
  -w "\nHTTP_STATUS: %{http_code}"
```

### Step D — Verify item actually saved
```bash
curl -s -X GET "$API_URL/api/v2/vendoremployee/expense/expenses-list" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); items=[i for i in d.get('data',[]) if 'CURL_TEST' in i.get('stock_title','')]; print(items)"
```

### What to Look For
| Result | Interpretation | Action |
|---|---|---|
| HTTP 200 + `{"category": {...}, "stock_items": [...]}` + item in expenses-list | FIX IS CORRECT — browser issue only | Take screenshot, test in UI |
| HTTP 200 + `{"errors": [...]}` | Axios trap — fix needed in response interceptor | Add response body error check |
| HTTP 422 / 404 + error JSON | Category name mismatch — trace `cat.name` resolution in FE | Add `console.log(cat.name, cat.id)` before API call |
| HTML response | Validation rejection — payload issue | Inspect exact payload sent |

---

## 4. ALL ACTIVE BUG STATUS

### BUG-158 — Add Item to Category (P0)
- **File:** `ExpenseSetupPanel.jsx` line 196–213 (`addItem`)
- **Current code:** `await expenseService.createCategoryWithItems(cat.name, [newItemName.trim()])`
- **Service function:** `expenseService.createCategoryWithItems(categoryName, itemNames)` → `POST store_expense`
- **Root cause status:** UNCONFIRMED — curl investigation above required
- **Most likely fix:** Either (A) code is already correct, browser UX cache issue OR (B) Axios interceptor must check `response.data.errors` and throw, OR (C) cat.name has mismatch
- **Status:** OPEN — P0

### BUG-159 — Add Category (P1)
- **File:** `ExpenseSetupPanel.jsx` line 150–164 (`addCategory`)
- **Current code:** `await expenseService.createCategoryWithItems(newCatName.trim(), [])`
- **Problem:** Sends `stock_title: []` (empty array). Backend returns HTML redirect (Laravel validation: items required). Axios reads as HTTP 200 success. Toast fires "Category added" but nothing is created.
- **Fix options (owner decision still needed):**
  - `a` — Require first item in the "Add Category" form before saving
  - `b` — Silently send category name as stub item: `[newCatName.trim()]`
  - `c` — Wait for backend to accept empty `stock_title`
- **Recommended:** Option `a` — show a second input for first item. Clean UX.
- **Status:** BLOCKED — awaiting owner UX decision

### BUG-160 — Rename Category (P2)
- **File:** `ExpenseSetupPanel.jsx` line 167–176 (`renameCategory`)
- **Problem:** `PUT /expense/expenses/{catId}` validates that `category_name` matches existing name — it does NOT rename. No PATCH endpoint exists (returns 405). Backend must add a rename endpoint.
- **Backend gap:** Documented in `BACKEND_GAPS_BRIEF.html` as G15.
- **Status:** BACKEND-BLOCKED — no FE fix possible

### BUG-161 — Bulk Save Items (P1)
- **File:** `ExpenseSetupPanel.jsx` line 259–279 (`handleBulkSave`)
- **Current code:** Each row calls `expenseService.createCategoryWithItems(cat.name, [row.title.trim()])`
- **Status:** CODE APPLIED — NOT curl-verified. Same Axios trap risk as BUG-158. Verify after BUG-158 investigation resolves.

---

## 5. UNIT PRICE APIS — DISCOVERY COMPLETE, IMPLEMENTATION NOT STARTED

Full discovery at: `/app/memory/reports/DISCOVERY_UNIT_PRICE_CR059_2026_07_08.md`

### API Contract (fully verified on preprod)

| Endpoint | Method | Purpose |
|---|---|---|
| `/expense/stock-unit-prices` | GET | List items WITH unit prices |
| `/expense/expenses-without-unit-prices` | GET | List items WITHOUT unit prices |
| `/expense/stock-unit-price` | POST `{stock_id, quantity, price}` | Add price to item |
| `/expense/stock-unit-price/{id}` | PUT `{stock_id, quantity, price}` | Edit price (use unit_price_record_id, NOT stock_id) |
| `/expense/stock-unit-price/{id}` | DELETE | Remove price |

> **CRITICAL:** C4 and C5 use the **unit_price_record_id** (from C1 response `data[n].id`), NOT the `stock_id`.

### Service Functions
All 5 functions already exist in `expenseService.js`:
- `getUnitPrices()` ← C1
- `getItemsWithoutPrices()` ← C2
- `addUnitPrice(stockId, quantity, price)` ← C3
- `editUnitPrice(id, price)` ← C4 ← WARNING: current signature only takes `price`, missing `quantity` and `stock_id` which backend requires
- `deleteUnitPrice(id)` ← C5

### Data Model Gap
`allItems` state currently has: `{ id, title, categoryId, categoryName, unit_price, unit_price_amount }`

Need to add: `unitPriceRecordId` — must be fetched from C1 response and cross-referenced by `stock_id`.

### What Needs to Be Built
1. In `fetchAll()`: fetch `getUnitPrices()` (C1) and build a map `stockId → unitPriceRecordId`
2. In item table rows: "Add Price" button (when `unit_price: false`) / "Edit" + "Delete" (when `unit_price: true`)
3. Modal or inline form: fields `qty` (default 1) + `price`
4. Wire C3 / C4 / C5 on form submit
5. `fetchAll()` after any price change to refresh

### Gate Status
Planning (Gate 2 + 3) NOT done. Full gate cycle required before implementation.

---

## 6. BACKEND GAPS DOCUMENT

Full brief: `/app/memory/evidence/CR-059/BACKEND_GAPS_BRIEF.html`

| Gap | Description | Impact | Status |
|---|---|---|---|
| G15 (brief) | `PUT /expenses/{catId}` ignores `stock_title` | Cannot update items via PUT | FE workaround in place (DnD uses DELETE+POST; add-item uses POST store_expense) |
| G3 (brief) | No Independent Category CRUD (POST/PUT/DELETE for `/expense/category/{id}`) | Cannot create, rename, or delete categories | BACKEND-BLOCKED (BUG-159, BUG-160, Delete-Category misleading — re-verified 2026-07-09) |

> **Note (2026-07-09 audit):** Previous version of this table mis-labelled the gap IDs. Correct IDs per `BACKEND_GAPS_BRIEF.html`:
> - **G3** = No Independent Category CRUD (covers create/rename/delete of category — the category-level CRUD ask)
> - **G15** = PUT /expenses/{id} ignores stock_title (the item-management PUT ask)
> - **G1** is **RESOLVED** (delete-transaction — endpoint found at `/delete-expense/{id}` via BUG-152; do not re-send to backend).

---

## 7. FILES CHANGED IN RECENT SESSIONS

| File | Last changed | Change |
|---|---|---|
| `ExpenseSetupPanel.jsx` | 2026-07-08 | DnD fix (handleDragEnd DELETE+POST), BUG-P2 (GripVertical removed), BUG-158 (addItem → POST), BUG-161 (handleBulkSave → POST per row) |
| `expenseService.js` | 2026-07-06 | All unit price functions added (C1–C5) |
| `constants.js` | 2026-07-06 | All expense endpoints including unit price |
| `expenseTransform.js` | 2026-07-06 | fromAPI transforms |

---

## 8. REGISTRY STATUS

| Item | Registry Status | Gate |
|---|---|---|
| CR-059 | IMPLEMENTED, pos_5_0 | 5a ✅ |
| BUG-DND-CR059 | IMPLEMENTED + SELF-TEST PASS | 5a ✅ |
| BUG-158 | IMPLEMENTED + SELF-TEST PASS (code applied) | 5a (QA NOT DONE) |
| BUG-161 | IMPLEMENTED + SELF-TEST PASS (code applied) | 5a (QA NOT DONE) |
| BUG-159 | INVESTIGATION COMPLETE — Awaiting owner UX decision | Gate 3 blocked |
| BUG-160 | BACKEND-BLOCKED | — |

> Registry is in `/app/memory/control/registry.json`

---

## 9. TEST CREDENTIALS

```
Account:  owner@cafe103.com
Password: Qplazm@10
API Base: https://preprod.mygenie.online
Login:    POST /api/v1/auth/vendoremployee/login
```

Full credentials: `/app/memory/test_credentials.md`

---

## 10. NEXT AGENT — EXACT BOOT SEQUENCE

```
Role to pick: BUG FIX (Role 5) — QA reported failures (user confirmed BUG-158 still broken)

Step 1 — Environment check (STEP -1.5)
  a. tail -5 /var/log/supervisor/frontend.out.log → expect "Compiled"
  b. curl -s https://preprod.mygenie.online/api/ → expect response (not 000/timeout)
  c. Login with test credentials → expect token

Step 2 — REPRODUCE BUG-158 (MANDATORY before any fix attempt)
  Run curl probes from Section 3 of this document (A → B → C → D)
  RECORD what HTTP status code and body you receive for POST store_expense.
  Save to: /app/memory/evidence/CR-059/BUG158_INVESTIGATION_<DATE>.json

Step 3 — Based on curl result, pick fix path:
  Result A (HTTP 200 success body): code is correct → investigate UI state in browser → screenshot
  Result B (HTTP 200 errors body): fix Axios interceptor to detect errors in success body
  Result C (HTTP 4xx): category name mismatch → trace cat.name resolution in UI state
  Result D (HTML): payload format issue → check what stock_title format store_expense accepts

Step 4 — After fixing BUG-158, also verify BUG-161 (same pattern, bulk save)

Step 5 — Get owner UX decision on BUG-159 (Add Category options a/b/c)
  Then implement chosen option.

Step 6 — If time allows: Planning (Gate 2) for Unit Price UI
```

---

## 11. OWNER DECISIONS OUTSTANDING

| Decision | Context | Options |
|---|---|---|
| BUG-159 UX | Add Category form currently sends empty items array → backend rejects | `a` Require first item in form / `b` Auto-send category name as stub / `c` Wait for backend fix |
| Unit Price UI scope | Discovery complete, planning not started | Gate 2 approval needed before implementation |

---

## 12. EXIT GATE — THIS SESSION

```
☑ 1. REGISTRY SYNC: No code changes — no registry update needed
☑ 2. BUG_TRACKER.MD: No new bugs registered this session
☑ 3. FILE_OWNERSHIP.MD: No files changed this session
☑ 4. CODE MARKERS: N/A
☑ 5. COMPILE CHECK: N/A (read-only session)
EXIT GATE: N/A (documentation session only)
```

---

*Handover written by: E1 agent (Emergent) — 2026-07-09*
*Protocol: AGENT_PROMPT_ALPHA.md v0.7*
