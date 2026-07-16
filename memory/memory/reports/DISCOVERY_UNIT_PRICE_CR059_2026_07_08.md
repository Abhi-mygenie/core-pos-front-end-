# Discovery Report — Unit Price API (C1–C5)

**ID:** CR-059-UNITPRICE-DISCOVERY
**Date:** 2026-07-08
**Role:** INVESTIGATION (Role 6)
**Steps used:** 10/10
**Triggered by:** Owner question — "how will unit price work?"

---

## 1. Summary

Full C1–C5 API contract mapped and verified on preprod.mygenie.online (cafe103 account).
All 5 endpoints are live, functional, and well-behaved.
`quantity` field is stored but does NOT affect `unit_price_amount`.
FE auto-calculation: `amount = entered_qty × unit_price_amount (= price)`.

---

## 2. Complete API Contract

### C1 — List Items WITH Unit Prices
```
GET /api/v2/vendoremployee/expense/stock-unit-prices
Auth: Bearer token

Response:
{
  "data": [
    {
      "id": 25,                          ← unit price record ID (use for C4/C5)
      "stock_id": 4271,                  ← stock item ID
      "expense_name": "100 delivery",    ← item title (denormalised)
      "quantity": 1,                     ← stored quantity (see section 4)
      "price": "50.00",                  ← string — parse as float in FE
      "created_at": "2026-07-07 11:43:07",
      "updated_at": "2026-07-07 11:43:07"
    }
  ],
  "total": 1
}
```
**Use:** Populate the "priced items" table in ExpenseSetupPanel.

---

### C2 — List Items WITHOUT Unit Prices
```
GET /api/v2/vendoremployee/expense/expenses-without-unit-prices
Auth: Bearer token

Response:
{
  "data": [
    { "id": 1118, "stock_title": "10000", "created_at": "..." }
  ],
  "total": 324
}
```
**Note:** Only 3 fields returned (id, stock_title, created_at). No category_name.
**Use:** Populate the "Add price to item" picker/combobox.

---

### C3 — Add Unit Price to an Item
```
POST /api/v2/vendoremployee/expense/stock-unit-price
Auth: Bearer token
Content-Type: application/json

Body (all 3 fields required):
{
  "stock_id": 4271,   ← item ID from expenses-list or C2
  "quantity": 1,      ← batch/default qty (see section 4)
  "price": 50         ← number or string, price per unit
}

Validation errors (empty body):
{ "errors": ["The stock id field is required.",
             "The quantity field is required.",
             "The price field is required."] }

Success response:
{
  "id": 25,           ← unit price record ID (save for C4/C5)
  "stock_id": 4271,
  "quantity": 1,
  "price": "50.00",   ← returned as string
  "created_at": "..."
}
```
**Side effect:** `expenses-list` item immediately shows `unit_price: true, unit_price_amount: 50`.

---

### C4 — Edit Unit Price
```
PUT /api/v2/vendoremployee/expense/stock-unit-price/{id}
  id = unit price record ID (from C1.data[n].id or C3 response.id)
Auth: Bearer token
Content-Type: application/json

Body:
{
  "stock_id": 4271,
  "quantity": 2,
  "price": 75
}

Success response:
{
  "id": 25,
  "stock_id": 4271,
  "quantity": 2,
  "price": "75.00",
  "updated_at": "..."
}
```
**Side effect:** `expenses-list` item immediately reflects new `unit_price_amount`.

---

### C5 — Delete Unit Price
```
DELETE /api/v2/vendoremployee/expense/stock-unit-price/{id}
  id = unit price record ID
Auth: Bearer token

Success response:
{ "message": "Unit price deleted successfully" }
```
**Side effect:** `expenses-list` item reverts to `unit_price: false, unit_price_amount: null`.

---

## 3. Data Flow

```
Setup Panel
  User clicks "Add Price" on item row
    → GET C2 (items without prices) → populate picker
    → User selects item, enters qty + price
    → POST C3 → { stock_id, quantity, price }
    → fetchAll() → expenses-list reflects unit_price: true

  User clicks "Edit Price" on priced item
    → PUT C4 /stock-unit-price/{unit_price_record_id}
    → Need: unit_price_record_id from C1 data (NOT the stock_id)

  User clicks "Remove Price"
    → DELETE C5 /stock-unit-price/{unit_price_record_id}

Entry Panel (auto-calculate)
  User selects item → check unit_price flag
    → unit_price: true  → show qty input, amount = entered_qty × unit_price_amount
    → unit_price: false → show amount input directly (free-form)
```

---

## 4. The `quantity` Field — Confirmed Behaviour

**Tested combinations:**
| quantity | price | unit_price_amount in expenses-list |
|----------|-------|-----------------------------------|
| 1 | 50 | **50** |
| 2 | 75 | **75** |
| 5 | 100 | **100** |

**Conclusion:** `unit_price_amount` = `price` always. `quantity` does NOT affect `unit_price_amount`.

**Most likely role of `quantity`:**
> "Default quantity" pre-fill hint for the entry form.
> When a user selects this item in daily entry, the qty field pre-fills to `quantity` value.
> Business example: "Sugar" has quantity=5, price=200 → default qty fills to 5 when selected.

**FE auto-calculation (confirmed correct):**
```
amount = entered_qty × unit_price_amount
```

---

## 5. Key Implementation Notes

| # | Note |
|---|---|
| N1 | `price` is returned as a **string** in all C-series responses — always `parseFloat()` in FE |
| N2 | C1 response includes `expense_name` (denormalised item title) — no need for separate join |
| N3 | C4/C5 use **unit price record ID** (from C1 or C3 response) — NOT the stock_id |
| N4 | C2 response has only 3 fields (id, stock_title, created_at) — no category_name |
| N5 | `quantity` default is likely `1` for most items (price per single unit) |
| N6 | Setting a unit price immediately activates auto-calc in entry panel (no cache refresh needed — `expenses-list` reflects instantly) |

---

## 6. FE Impact — What Needs to Be Built

### ExpenseSetupPanel.jsx (existing file)
Currently: Unit price column shows `true/false` badge only — no action wired.

**Required additions:**
1. **"Add Price" button** on rows where `unit_price: false` → opens dialog/inline form
   - Fields: qty (number, default 1), price (number)
   - API: POST C3
2. **Edit price** on rows where `unit_price: true` → opens same dialog pre-filled
   - Need: store `unit_price_record_id` per item (from C1 response, NOT from expenses-list)
   - API: PUT C4
3. **Remove price** button → confirmation → DELETE C5

**Data model change needed:**
- Currently `allItems` state only has `{ id, title, categoryId, categoryName, unit_price, unit_price_amount }`
- Need to add `unitPriceRecordId` — fetched from C1 (`GET stock-unit-prices`) and cross-referenced by `stock_id`

### expenseService.js (existing file)
Need to wire C3, C4, C5 (functions exist in service but may not be implemented — verify).

---

## 7. Recommended Next Steps

| Step | Action | Gate needed |
|------|--------|-------------|
| 1 | Planning: Impact Analysis (Gate 2) for unit price UI | YES — PLANNING role |
| 2 | Planning: Implementation Plan (Gate 3) | YES |
| 3 | Gate 4 GO from owner | YES |
| 4 | Implement: Add/Edit/Remove price dialog in ExpenseSetupPanel | BUG FIX or IMPLEMENTATION role |
| 5 | Implement: `quantity` pre-fill in ExpenseEntryPanel | same session |

**Planning skip eligible?** NO — involves 2+ files, new dialog component, new API calls, cross-reference data model change.

---

## 8. Evidence Artifacts

```
/app/memory/evidence/CR-059/unit-price-discovery/api_probes.json   ← all curl results
/app/memory/evidence/CR-059/.token                                  ← auth token
```
