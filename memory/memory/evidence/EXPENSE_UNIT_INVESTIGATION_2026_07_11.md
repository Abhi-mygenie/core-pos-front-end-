# Expense Module — Unit / Unit Price Investigation Report
# EXPENSE_UNIT_INVESTIGATION_2026_07_11

**Date:** 2026-07-11
**Role:** INVESTIGATION
**Triggered by:** Owner screenshot review of Expense Setup Bulk Editor
**Steps used:** 14 (extended across 2 investigation rounds — owner provided additional context mid-session)
**Confidence:** HIGH — all findings curl-verified against preprod API
**Code written:** NONE

---

## 1. Summary

| # | Finding | Classification | Confidence | Recommendation |
|---|---|---|---|---|
| G1 | Bulk editor `+ Add Row` at bottom vs `+ Add Item` in header; no toolbar parity | PLAN_GAP | HIGH | Register CR, plan redesign |
| G2 | UNIT column in bulk editor — no API at stock master level, wrong layer | PLAN_GAP | HIGH | Remove column (fast lane after owner confirm) |
| G3 | UNIT PRICE column in bulk editor — not wired, silent drop | PLAN_GAP | HIGH | Owner decision: remove or wire |
| G4 | Sample template for import — server 404, no UI button | PLAN_GAP + BACKEND_BUG | HIGH | Register CR, raise backend brief |
| G5 | Entry form Case A: qty shown when item has unit price — should be hidden | PLAN_GAP | HIGH | Register BUG |
| G6 | Entry form Case B: optional qty/unit/physical_qty hidden — should show | PLAN_GAP | HIGH | Register BUG |
| G7 | physical_quantity "deprecated" comment is wrong — field is live | CODE_ERROR | HIGH | Fix comment, make field enterable in Case B |
| G8 | unit_price_amount link (expenses-list ↔ stock-unit-price) unverified | UNKNOWN | MEDIUM | Smoke test after CR-066 implementation |

---

## 2. Three-Level Data Flow (Final Verified Map)

```
LEVEL 1 — STOCK MASTER
  Route:   GET /expenses-list
  Returns: id, stock_title, category_id, category_name, created_at,
           unit_price (object), unit_price_amount (number or null)
  Does NOT return: unit (unit-of-measurement)
  Create:  POST /store_expense { category_name, stock_title: [] }
  Does NOT accept: unit, unit_price at creation

LEVEL 2 — UNIT PRICE MASTER (CR-066 — not yet built)
  Route:   POST /stock-unit-price
  Accepts: { stock_id (required), quantity (required), price (required) }
  Returns: { id, stock_id, quantity, price }
  Does NOT store: unit-of-measurement (kg/ltr/pkt) — not a field
  Computed display only (FE): unit_price = price ÷ quantity
  e.g. qty=30, price=₹180 → ₹6 per unit
  GET:     /stock-unit-prices → { data: [{ id, stock_id, expense_name, quantity, price }] }
  Unpriced: /expenses-without-unit-prices → { data: [{ id, stock_title }] }

LEVEL 3 — EXPENSE TRANSACTION
  Route:   POST /store-expense-details
  Accepts per line: { expense, amount, payment_method, quantity, unit, physical_quantity }
  Returns: all fields echoed, physical_quantity stored and returned
  GET:     /expenses-report → per row: id, EXPENSE, Category, Amount, Payment Method,
           quantity, unit, physical_quantity, notes
  Unit-of-measurement (kg/ltr/pkt) lives HERE only.
```

---

## 3. API Probes — Evidence

### 3a. POST /stock-unit-price — quantity is mandatory

```
Request:  { stock_id:4490, price:50 }
Response: { "errors": ["The quantity field is required."] }

Request:  { stock_id:4490, price:180, quantity:30 }
Response: { id:29, stock_id:4490, quantity:30, price:"180.00", created_at:"..." }
```

### 3b. GET /stock-unit-prices — shape

```json
{
  "data": [{
    "id": 29,
    "stock_id": 4490,
    "expense_name": "Mayur",
    "quantity": 30,
    "price": "180.00"
  }],
  "total": 1
}
```

### 3c. GET /expenses-without-unit-prices — shape

```json
{
  "data": [{ "id": 1125, "stock_title": "100 delivery" }],
  "total": 375
}
```
375 of 376 items have no unit price set (CR-066 UI not yet built).

### 3d. POST /store-expense-details — all fields accepted

```
Request per line: { expense:"__probe__", amount:100, payment_method:"Cash",
                    quantity:2, unit:"kg", physical_quantity:0 }
Response: quantity:"2.00", unit:"kg", physical_quantity:"0", notes:""  ✅
```

### 3e. GET /expenses-list — unit field absent on all items

```
Sample item keys: ['id','stock_title','category_id','category_name',
                   'created_at','unit_price','unit_price_amount']
unit field: ABSENT
unit_price_amount non-null: 0 of 376 items
```

### 3f. GET /get-unit — units available

```json
{ "units": ["kg","ltr","bundle","pkt","piece","bottle","tank","tin",
            "plates","pieces","Db","gm","ml"] }
```

---

## 4. Entry Form — Current Code vs Correct Behaviour

### Case A: Item has unit price (`unitPriceAmount != null && > 0`)

| | Owner's correct flow | Current code (`ExpenseEntryPanel.jsx` L239) |
|---|---|---|
| Qty input | Hidden | **Shown** (editable) ← GAP |
| Unit select | Shown | Shown ✅ |
| Amount | Read-only, auto-filled | Read-only ✅ |
| Physical qty | Hidden | Hidden ✅ |

Fix scope: `EntryLine` component — remove qty input from the `unitPrice` conditional block.

### Case B: Item has NO unit price

| | Owner's correct flow | Current code |
|---|---|---|
| Amount | Editable | Editable ✅ |
| Qty input | Optional, shown | **Hidden** ← GAP |
| Unit select | Optional, shown | **Hidden** ← GAP |
| Physical qty | Optional, shown | **Hard-coded 0, not shown** ← GAP |

Fix scope: `EntryLine` component — always render optional qty/unit/physical_qty fields outside the `unitPrice` conditional, with lighter styling.

### physical_quantity

`expenseService.js` L145: `physical_quantity: 0, // deprecated — always 0`

This comment is **incorrect**. Backend stores, returns, and reports `physical_quantity` normally. It should be user-enterable in Case B. The comment should be removed and the field wired to `line.physical_quantity`.

---

## 5. Bulk Editor Columns — Final Verdict

| Column | API support at stock master? | Where it belongs | Action |
|---|---|---|---|
| UNIT (kg/ltr/pkt) | ❌ None. `POST /store_expense` ignores it. `GET /expenses-list` has no unit field. | Level 3 (transaction) only | **Remove** from `ExpenseBulkEditor.jsx` |
| UNIT PRICE | ❌ Bulk save calls `createCategoryWithItems()` — price silently dropped | Level 2 (CR-066 tab) | **Owner decision** — remove or wire to `addUnitPrice()` |

---

## 6. CR-066 Impact Analysis — Accuracy Check

| Point | Plan says | API confirms | Accurate? |
|---|---|---|---|
| `quantity` field in Set Price form | User-input | API requires it (`quantity` is mandatory) | ✅ Yes |
| `price` field in Set Price form | User-input | API requires it | ✅ Yes |
| unit_price = price ÷ qty | FE-computed only | API returns raw qty+price, no unit_price field | ✅ Yes |
| `fromAPI.itemsWithoutPrices()` shape | `{ id, stock_title }` | Confirmed `{ id, stock_title }` | ✅ Yes |
| No unit-of-measurement stored | Not in plan | Not accepted by API | ✅ Yes — plan is correct |

**CR-066 Impact Analysis is accurate. Ready for Gate 3 (Implementation Plan).**

---

## 7. Open Risks

| Risk | Level | Action |
|---|---|---|
| `expenses-list` may not join with `stock-unit-prices` table — `unit_price_amount` always 0 | MEDIUM | Smoke test: set one real unit price via CR-066 → check expenses-list for that item → if still 0, raise backend bug |
| Entry form Case A: with `unit_price_amount` always 0, the qty+unit block never renders today | LOW | Not a bug yet — no unit prices set. Will surface after CR-066 goes live |

---

## 8. Files That Would Change (by finding)

| Finding | File | Change type | Lines |
|---|---|---|---|
| G2 — Remove UNIT column | `ExpenseBulkEditor.jsx` | Delete column definition + render block | ~8 |
| G5+G6+G7 — Entry form Case A/B fix | `ExpenseEntryPanel.jsx` | Restructure EntryLine conditional | ~30 |
| G4 — Template download button | `ExpenseSetupPanel.jsx` | Add button in toolbar | ~10 |

No hotspot files (R5) affected. No financial/billing logic (R6) affected.

---

## 9. Recommendations to Owner

1. **Confirm removal of UNIT column** from bulk editor — no API, wrong layer. Fast lane if approved.
2. **Decide on UNIT PRICE column** in bulk editor — remove (clean, defer to CR-066 tab) or wire inline.
3. **Proceed CR-066 to Gate 3** — impact analysis is accurate, all owner decisions locked.
4. **Register entry form gaps** (G5+G6+G7) as bugs — FE-only, LOW risk, `ExpenseEntryPanel.jsx` only.
5. **Register sample template CR** (G4) — 1 FE button + backend must create the xlsx file.
6. **BUG-166 (addon_amount ×qty) — Gate 4 GO still pending** — highest priority, unrelated to this investigation.
