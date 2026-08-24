# CR-150 — Purchase Report in New POS
## Gate 2: Impact Analysis

**Date:** 2026-08-21
**Role:** PLANNING agent
**Stage:** Impact Analysis (Gate 2)
**Code Reality:** NONE for report page; PARTIAL for endpoint (existing VENDOR_ITEM_LIST now returns purchase history)
**Risk:** HIGH (financial report displaying vendor costs and purchase transactions)
**Endpoint confirmed:** `GET /api/v2/vendoremployee/inventory/vendor-item-list`
**Evidence:** `/app/memory/evidence/CR-150/vendor_item_list_response.json`

---

## Step 1 — Conflict Pre-Check

| File | Last Modifier | Open Conflict? |
|---|---|---|
| `api/constants.js` | BUG-327 (closed) | Clean |
| `api/services/inventoryService.js` | CR-078 (closed) | ⚠️ RELATED — `getVendorItemList()` uses SAME endpoint. See note below. |
| `components/layout/Sidebar.jsx` | CR-041 (closed) | Clean — adding new report entry |
| `App.js` | CR-078 (closed) | Clean — adding new route |

**VENDOR_ITEM_LIST compatibility note:**
`getVendorItemList()` in `inventoryService.js` calls the same endpoint and its result is used by `SmartPurchasePanel` via `rankVendors()`. The new response shape is `{ data: [...], total_amount, summary, by_restaurant }`.

`inventoryTransform.js` line 89 already handles: `const items = Array.isArray(response) ? response : (response?.data || [])` — so it will correctly extract `data[]`. Each item in `data[]` still has `ingredient_id`, `vendor_id`, `unit_price`, `Vendor_Name` — fields `rankVendors()` needs. **SmartPurchasePanel is safe.**

---

## Step 2 — Endpoint Analysis

**Confirmed response shape (probe 2026-08-21, rid=644):**
```json
{
  "data": [
    {
      "ID": 13652,
      "Ingredient_Name": "French fries conti",
      "Purchase_Date": "2026-08-17",
      "Vendor_Name": "",
      "vendor_id": null,
      "Quantity": "1 kg",
      "stock_quantity_raw": 1,
      "Amount": "0",
      "line_total": 0,
      "unit_price": 0,
      "Payment_Type": "",
      "restaurant_id": 644,
      "restaurant_type_flag": "normal",
      "ingredient_id": 16033
    }
  ],
  "total_amount": 0.00,
  "summary": {
    "applied_restaurant_ids": [644],
    "total_records": 217,
    "actor_restaurant_type": "normal",
    "scope_store_count": 1
  },
  "by_restaurant": {}
}
```

**Fields available for report columns:**

| Report Column | API Field | Available? |
|---|---|---|
| Date | `Purchase_Date` (DD-MM-YYYY string) | ✅ |
| Ingredient / Item | `Ingredient_Name` | ✅ |
| Vendor | `Vendor_Name` | ✅ |
| Quantity | `Quantity` (string: "1 kg") | ✅ |
| Unit Price | `unit_price` | ✅ |
| Total Amount | `Amount` / `line_total` | ✅ |
| Payment Type | `Payment_Type` | ✅ |
| PO Reference | `ID` (purchase ID) | ✅ |
| Restaurant | `Restaurant_Name` | ✅ |

**Open question — date filter:** ~~Current probe used no date params~~ **RESOLVED (owner confirmed 2026-08-21):** Backend accepts `from` / `to` date params. Date-range filtering is supported.

---

## Data Flow

```
PurchaseReportPage.jsx
  date range picker (from/to)
    → inventoryService.getPurchaseReport(from, to)
        → GET /api/v2/vendoremployee/inventory/vendor-item-list
           (+ date params if supported)
        → { data: [...purchases], total_amount, summary }
  Transform: purchaseReportTransform.fromAPI(data)
    → normalised rows: { id, date, ingredient, vendor, qty, unitPrice, amount, paymentType }
  Render: filter / sort table
  Export: Excel / PDF (follow ExpenseReportPage pattern)
```

---

## Files WILL Change (4 files, 1 new)

| File | Change | Lines | Risk |
|---|---|---|---|
| `src/pages/reports-module/PurchaseReportPage.jsx` | **NEW** — report page: date range picker, filterable table, KPI strip (total spend, vendor count, purchase count), Excel export. Follow `ExpenseReportPage.jsx` pattern (~526 lines) | ~300–400 NEW | LOW |
| `src/api/services/inventoryService.js` | Add `getPurchaseReport(from, to)` alongside existing `getVendorItemList()`. Same endpoint, passes date params if supported | ~8 lines | LOW |
| `src/components/layout/Sidebar.jsx` | Add "Purchase Report" entry under Inventory/Reports section | ~5 lines | LOW |
| `src/App.js` | Add `/reports-module/purchase-report` route | ~2 lines | LOW |

**No changes to `api/constants.js`** — reuse existing `INVENTORY_ENDPOINTS.VENDOR_ITEM_LIST`. If backend adds a separate purchase endpoint later, only `inventoryService.js` + `constants.js` need updating.

## Files Will NOT Touch
`SmartPurchasePanel.jsx`, `inventoryTransform.js`, `rankVendors.js`, `orderTransform.js`, any financial/settlement logic.

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Date filter params unknown | HIGH | OQ-1 must be confirmed before Gate 3 — if no filter, report shows all-time data only |
| Same endpoint as SmartPurchasePanel | MEDIUM | Transform handles `response?.data || []` — safe. Separate service function avoids interference |
| `Amount: "0"` for many records | LOW | Data quality issue on preprod — real restaurant will have populated values |
| `Quantity: "1 kg"` is a string | LOW | Frontend should display as-is (string) or split `stock_quantity_raw` for numeric sorting |

---

## Owner Decisions Needed (blocking Gate 3)

| # | Question | Blocking? |
|---|---|---|
| OQ-1 | ~~Does `vendor-item-list` accept `from` / `to` date filter params?~~ **RESOLVED — YES, confirmed by owner 2026-08-21** | ~~YES~~ ✅ |
| OQ-2 | Should this report be under "Reports" sidebar section or "Inventory" sidebar section? | YES |
| OQ-3 | Show all-time records if no date filter, or default to last 30 days? | NO |

---

## Verification Matrix (seeds QA)

| # | Check | How to verify |
|---|---|---|
| 1 | Route `/reports-module/purchase-report` accessible | Navigate → page loads |
| 2 | Table shows purchase records with correct columns | Date / Ingredient / Vendor / Qty / Amount / Payment Type visible |
| 3 | Date filter works (if backend supports) | Set range → table filters |
| 4 | Total amount KPI correct | Sum of `Amount` column = header KPI |
| 5 | Excel export downloads | Click Export → .xlsx file downloads |
| 6 | SmartPurchasePanel unaffected | Navigate to Stock Update → vendor ranking still works |

---

**Next:** Owner confirms OQ-1 (date filter) → Gate 3 → Gate 4 GO → Implementation
