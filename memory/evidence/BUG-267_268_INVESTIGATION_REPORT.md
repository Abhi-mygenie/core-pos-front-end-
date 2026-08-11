# Investigation Report — Inventory Setup: Category Issues (2 items)

**Date:** 2026-07-28
**Role:** INVESTIGATION
**Steps used:** 7/10

---

## Issue 1: Category Doesn't Get Selected When Adding Ingredients

### Summary
- Root cause: INCONCLUSIVE — cannot reproduce
- Classification: NEEDS_MORE_DATA
- Confidence: LOW

### Hypotheses Tested
| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|:---:|--------|---------|
| H1 | Category dropdown is empty (no options) | Curl probe `GET /stock-item-categories` | 1 | ELIMINATED | API returns 71 categories |
| H2 | Dropdown onChange handler broken | Browser automation: select option, check value | 1 | ELIMINATED | Selected value=1060, 72 options rendered |
| H3 | ADD API rejects category | Curl probe `POST /add-inventory` with category_id | 1 | ELIMINATED | API returns `{"success":true}` |

### Data Flow Trace
```
categories loaded via fetchData() → getCategories() → fromAPI.categories()
  → 71 items with { id: number, name: string }
  → rendered as <option key={c.id} value={c.id}>{c.name}</option>
  → onChange: setNewIng(p => ({ ...p, categoryId: Number(e.target.value) }))
  → addIngredient(): validates categoryId, calls addIngredient(newIng)
  → toAPI.addIngredient(): { category_id: data.categoryId, ... }
  BREAK POINT: None found — chain works end-to-end in automation
```

### Evidence
- Browser automation: dropdown found with 72 options, selection works, value persists
- Screenshot: `/tmp/ss_add_ingredient.png` — category shows "Kunafa Base" after selection
- Curl: POST /add-inventory with category_id=1060 → `{"success":true}`

### Possible explanations (need owner input):
1. **Layout confusion:** The category dropdown is inside the ACTIONS column (last column), not a dedicated "Category" column. User may not see it.
2. **Specific browser/device issue:** Works in Chromium automation, may fail in user's browser.
3. **Race condition:** If page is still loading when user clicks Add, categories might not be populated yet.

### Recommendation
**NEEDS_MORE_DATA** — Ask owner for:
- Exact steps to reproduce (which category in sidebar, what they type, where they click)
- Browser + screen resolution
- A screen recording if possible

---

## Issue 2: SQL Error When Changing Category After Editing

### Summary
- Root cause: **BACKEND_BUG** — `inventory_audit_logs` table `id` column missing AUTO_INCREMENT / default value
- Classification: BACKEND_BUG
- Confidence: **HIGH** (reproduced via curl)

### Hypotheses Tested
| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|:---:|--------|---------|
| H1 | Frontend sends wrong payload | Code trace: updateIngredient transform | 1 | ELIMINATED | Payload is correct: `{stock_title, category_id, unit, ...}` |
| H2 | Backend audit_logs table broken | Curl probe: PUT /update-inventory/10741 | 1 | **CONFIRMED** | HTTP 500, SQL error 1364 |

### Data Flow Trace
```
saveEdit() → inventoryService.updateIngredient(editingId, editIng)
  → toAPI.updateIngredient(): { stock_title, category_id, unit, small_unit, reason: 'update', ... }
  → api.put(`/update-inventory/${id}`, payload)
  → Backend: receives valid payload → tries to INSERT into inventory_audit_logs
  BREAK POINT: INSERT fails — `id` column has no AUTO_INCREMENT or default value
  → HTTP 500 returned to frontend
  → Frontend shows error toast with SQL message
```

### Evidence Artifacts
```
Curl reproduction:
  PUT https://preprod.mygenie.online/api/v2/vendoremployee/inventory/update-inventory/10741
  Payload: {"stock_title":"Base Cream","category_id":1060,"unit":"gm","small_unit":"","minimun_stock_alert":"0","min_unit_alert":"","reason":"update"}
  Response: HTTP 500
  Error: "SQLSTATE[HY000]: General error: 1364 Field 'id' doesn't have a default value
    (SQL: insert into `inventory_audit_logs` (`inventory_id`, `restaurant_id`, `operation`,
    `reason`, `changed_data`, `created_at`) values (10741, 689, edit, update, {...}, 2026-07-28...))"
```

### Impact
- **ALL ingredient edits are broken** — every PUT to `/update-inventory/{id}` triggers the audit log insert and fails
- This blocks: category changes, name changes, unit changes, alert threshold changes — any edit operation
- Does NOT affect: adding new ingredients (POST works), deleting ingredients

### Recommendation
- **BACKEND FIX REQUIRED:** Add AUTO_INCREMENT to `inventory_audit_logs.id` column, or add default value
- **Frontend workaround:** None possible — the error is in the database schema
- **Priority:** P0 — all ingredient editing is broken

---

## Retroactive Candidates
None
