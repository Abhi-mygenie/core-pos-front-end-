# BUG-248 — Bulk Editor: 9 Columns Missing from Dirty Detection + Backend Drops 4 Fields

**ID:** BUG-248
**Type:** BUG
**Created:** 2026-07-25
**Updated:** 2026-07-25 (investigation: backend silently drops 4 fields)
**Severity:** P1 (user edits silently lost — no save button + backend drops fields)
**Risk:** LOW (FE fix) + BACKEND-BLOCKED (4 fields)
**Module:** Menu Management — Bulk Editor + Card View (`BulkEditor.jsx`, `ProductForm.jsx`)
**Duplicate Check:** DISTINCT.
**Source:** OWNER-REPORTED (session 2026-07-25)
**Confidence:** CONFIRMED (curl-verified: backend returns success but doesn't persist)

---

## Two-Part Bug

### Part A — FE: `isDirty` missing 9 fields (FE FIX READY)

`BulkEditor.jsx:258-290` — `isDirty()` checks object missing 9 column keys. Editing these columns never triggers "Save X Changes".

| # | Column Key | Label |
|---|-----------|-------|
| 1 | `packedFood` | Packaged Item |
| 2 | `isInventory` | Inventory |
| 3 | `stockOut` | Out of Stock |
| 4 | `isDisabled` | Hidden from POS |
| 5 | `taxCalc` | Tax Calc |
| 6 | `itemUnit` | Sold By (Unit) |
| 7 | `availableTimeStart` | Avail. Start |
| 8 | `availableTimeEnd` | Avail. End |
| 9 | `portionSize` | Portion Size |

**Fix:** Add 9 entries to `checks` object. ~9 lines. File: `BulkEditor.jsx`.

### Part B — BACKEND: Edit API silently drops 4 fields (BACKEND-BLOCKED)

`POST /api/v2/vendoremployee/product/foods/{id}` returns "food updated successfully" but does NOT persist:

| Field | FE Sends | Persisted? |
|-------|----------|:---:|
| `packed_food` | `"Yes"` | ❌ NO |
| `is_inventory` | `"No"` | ❌ NO |
| `stock_out` | `"Y"` | ❌ NO |
| `tax_calc` | `"Exclusive"` | ❌ NO |

**Curl-verified against preprod** (food 116799, restaurant cafe103). Backend brief filed at `BACKEND_BLOCKERS_BRIEF_2026_07_22.html`.

**Affects BOTH** Bulk Editor and Card View (ProductForm) — same endpoint.

---

## Blast Radius

- FE Part A: 1 file (`BulkEditor.jsx`), ~9 lines
- Backend Part B: backend fix needed for `/foods/{id}` endpoint

---

## Next

- Part A (FE): Proceed through gates → fix isDirty
- Part B (Backend): BLOCKED — awaiting backend fix for 4 silently-dropped fields
