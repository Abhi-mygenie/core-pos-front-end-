# BACKEND BRIEF — Expense Module Endpoint Gaps

**ID:** BACKEND_BRIEF_EXPENSE_MODULE_2026_07_11
**Date:** 2026-07-11
**Classification:** CONTRACT_MISMATCH + MISSING_ENDPOINT
**Priority:** P1
**Frontend impact:** Item rename blocked in Expense Setup Bulk Editor (CR-067); CR-065 inline edit blocked.

---

## Brief 1 — PUT /expense/expenses/{id} — Item Rename Endpoint

### Summary
`PUT /api/v2/vendoremployee/expense/expenses/{id}` currently returns **HTTP 302** (redirects to homepage).
No item-rename endpoint exists. Frontend has blocked name edits in the bulk editor until this is available (OQ-1 = B).

### Required Endpoint

| Field | Value |
|---|---|
| Method | `PUT` |
| URL | `/api/v2/vendoremployee/expense/expenses/{id}` |
| Auth | Bearer token (vendoremployee) |

**Request payload:**
```json
{
  "stock_title": "New item name"
}
```

**Expected success response:**
```json
{
  "message": "Expense item updated successfully.",
  "expense": {
    "id": 1125,
    "stock_title": "New item name",
    "category_id": 249,
    "category_name": "Others"
  }
}
```

**Expected error responses:**
```json
{ "message": "Expense item not found." }          // 404
{ "errors": ["The stock_title field is required."] } // 422
{ "errors": ["An item with this name already exists in this category."] } // 422 (duplicate guard)
```

### Reproduction of current issue
```bash
curl -X PUT https://preprod.mygenie.online/api/v2/vendoremployee/expense/expenses/1125 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"stock_title":"test_rename"}'

# Current response: HTTP 302 → redirect to homepage
# Expected response: HTTP 200 → { message, expense }
```

### Frontend Impact (when delivered)
- CR-065 (Item inline edit on Setup Panel) unblocked
- CR-067 (Bulk editor) — save logic will call `PUT /expense/expenses/{id}` for name-changed rows instead of showing inline error

### Frontend workaround currently in place
CR-067 bulk editor: name field editable for all rows, but save is blocked for existing rows with inline error message: `"Rename not available — backend support pending"`. Once backend delivers this endpoint, FE will wire it in a follow-up (estimated 1-file, <20 lines).

---

## Brief 2 — POST /store_expense — Duplicate Item Guard

### Summary
`POST /api/v2/vendoremployee/expense/store_expense` does not enforce uniqueness of `stock_title` within a category. Duplicate items can be created silently.

### Required change
Return `4xx` (recommended: 422) when an item with the same `stock_title` already exists in the same category.

**Expected error response:**
```json
{
  "errors": ["An item with this name already exists in this category."]
}
```

### Frontend workaround currently in place
BUG-165: Client-side pre-check against in-memory `allItems` state (case-insensitive). Will miss duplicates added in other sessions or via import. Backend constraint is the correct fix.

---

## Context: Expense Module Endpoint Map (for reference)

| Endpoint | Status | Notes |
|---|---|---|
| `GET /expense/category-list` | ✅ Working | |
| `POST /expense/category` | ✅ Working | BUG-159 fix |
| `PUT /expense/category/{id}` | ✅ Working | BUG-160 fix |
| `DELETE /expense/category/{id}` | ✅ Working | BUG-160 fix |
| `GET /expense/expenses-list` | ✅ Working | Returns unit_price, unit_price_amount |
| `POST /expense/store_expense` | ✅ Working | Needs duplicate guard (Brief 2) |
| `PUT /expense/expenses/{id}` | ❌ **302** | **Brief 1 — needs implementation** |
| `DELETE /expense/expenses/{id}` | ✅ Working | |
| `POST /expense/bulk-export-expense` | ✅ Working | BUG-163 fix |
| `POST /expense/bulk-import-expense` | ✅ Working | |
| `POST /expense/store-expense-details` | ✅ Working | |
| `PUT /expense/edit-expense/{id}` | ✅ Working | |
| `DELETE /expense/delete-expense/{id}` | ✅ Working | |
| `GET /expense/stock-unit-prices` | ✅ Working | |
| `GET /expense/expenses-without-unit-prices` | ✅ Working | |
| `POST /expense/stock-unit-price` | ✅ Working | Requires quantity + price |
| `PUT /expense/stock-unit-price/{id}` | ✅ Working | price only |
| `DELETE /expense/stock-unit-price/{id}` | ✅ Working | |
| `GET /expense/get-unit` | ✅ Working | Returns array of unit strings |
| `GET /expense/payment-method` | ✅ Working | |

---

## Linked FE Items
- **CR-065:** Item inline edit (INTAKE, BACKEND-BLOCKED on Brief 1)
- **CR-067:** Bulk editor redesign (Brief 1 enables name save)
- **BUG-165:** Duplicate item guard (Brief 2 — backend constraint needed)
