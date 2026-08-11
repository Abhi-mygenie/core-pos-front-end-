# QA Handover — BUG-175 + BUG-176

**Date:** 2026-07-11
**Items:** BUG-175, BUG-176
**Files changed:** `ExpenseEntryPanel.jsx`, `expenseService.js`
**Self-test:** All edits verified (see below)
**Compile:** PASS — webpack compiled with 1 warning (pre-existing, no new)
**Registry sync:** YES — BUG-175 + BUG-176 → IMPLEMENTED
**EXIT GATE:** 5/5 PASS

---

## 1. Inherited from Plan — Self-Test Results

### BUG-175

| Edit | File | Change | Self-Test |
|---|---|---|---|
| 1 | `ExpenseEntryPanel.jsx` | `amount = String(price)` — no qty multiply | ✅ L185: `onChange(idx, "amount", String(price))` |
| 2 | `ExpenseEntryPanel.jsx` | `handleQtyChange` removed | ✅ `grep handleQtyChange` → 0 hits |
| 3 | `ExpenseEntryPanel.jsx` | qty input removed from Case A block | ✅ L231-247: only unit select in `unitPrice > 0` block |

### BUG-176

| Edit | File | Change | Self-Test |
|---|---|---|---|
| 1 | `ExpenseEntryPanel.jsx` | `physical_quantity: ""` in EMPTY_LINE | ✅ L34 confirmed |
| 2 | `ExpenseEntryPanel.jsx` | Case B block: qty + unit + physical_qty | ✅ L249-289 present, `(!line.unitPrice \|\| line.unitPrice <= 0)` condition |
| 3 | `ExpenseEntryPanel.jsx` | `physical_quantity` in handleSave details | ✅ L482 confirmed |
| 4 | `ExpenseEntryPanel.jsx` | `physical_quantity` in startEdit editRow | ✅ L507 confirmed |
| 5 | `expenseService.js` | `l.physical_quantity \|\| 0` in addExpenseEntry | ✅ L144 confirmed |
| 6 | `expenseService.js` | `data.physical_quantity \|\| 0` in editExpenseEntry | ✅ L162 confirmed |

---

## 2. Test Cases for QA

### BUG-175

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | Case A: qty input gone | Go to `/expenses`. Select an item that has a unit price set. | No qty input visible. Only unit select + read-only amount. |
| T2 | Case A: unit select visible | Same as T1. | Unit dropdown visible and selectable. |
| T3 | Case A: amount auto-filled | Same as T1. | Amount = unit_price_amount (flat, not × qty). |
| T4 | Case A: amount read-only | Same as T1. Try to type in amount field. | Amount field is non-editable (grayed background). |
| T5 | Case B unaffected | Select item with no unit price. | Only amount (editable) + payment visible. No qty/unit/physical_qty (BUG-176 handles this separately). |

Note: T1–T4 require a unit price to be set on at least one item. Until CR-066 UI is built, set a test unit price via API: `POST /api/v2/vendoremployee/expense/stock-unit-price { stock_id: <id>, quantity: 1, price: 50 }`.

### BUG-176

| # | Test | Steps | Expected |
|---|---|---|---|
| T6 | Case B: 3 optional fields shown | Select item with no unit price. | Qty input, Unit select, Phys. Qty input all visible. |
| T7 | Optional fields not required | Leave qty/unit/physical_qty blank. Enter amount + payment. Save. | Saves successfully. |
| T8 | Values passed to API | Enter qty=3, unit=kg, physical_qty=2. Save. Check Network tab. | POST body includes `quantity:3, unit:"kg", physical_quantity:2`. |
| T9 | physical_qty preserved on edit | Find a transaction with physical_quantity > 0. Click edit, change only the amount. Save. | PUT body includes original `physical_quantity` value (not 0). |
| T10 | Case A unaffected | Select priced item. | Only unit select visible (qty hidden, Case A correct per BUG-175). |
| T11 | Reset clears all fields | Add line with qty/unit/physical_qty. Click Reset. | All three fields clear to empty. |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | Expense save for manual item (no unit price, no qty/unit) | Core flow — amount + payment only |
| R2 | Edit existing expense transaction | `startEdit` + `editExpenseEntry` touched |
| R3 | Delete expense transaction | Untouched, verify no regression |
| R4 | Add expense line (Add Another Line) | `addLine()` uses EMPTY_LINE — verify new field doesn't break |

---

## 4. Registry Sync Confirmation

- Registry synced: YES
- BUG-175: IMPLEMENTED, pos_5_0
- BUG-176: IMPLEMENTED, pos_5_0
- EXIT GATE: ALL 5 PASSED

---

## 5. Credentials + Environment

- Account: `owner@cafe103.com` / `Qplazm@10`
- URL: `https://react-pos-staging.preview.emergentagent.com`
- Expense Entry route: `/expenses`
- To set test unit price for T1–T4: `POST https://preprod.mygenie.online/api/v2/vendoremployee/expense/stock-unit-price` `{ stock_id: <any valid id>, quantity: 1, price: 50 }`
- Remember to delete test unit price after: `DELETE /stock-unit-price/<id>`
