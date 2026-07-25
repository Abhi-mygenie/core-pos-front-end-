# QA Handover — BUG-163 + BUG-VQTY + BUG-ROOM-PAIDROOM
**Date:** 2026-07-11
**Implementation agent:** BUG FIX (E1 / Emergent)
**Items:** BUG-163, BUG-VQTY, BUG-ROOM-PAIDROOM
**EXIT GATE:** 5/5 PASS

---

## 1. Changes Made (Inherited from Verification Matrix)

| Edit | File | Change | Self-Test |
|------|------|--------|-----------|
| BUG-163 | `api/services/expenseService.js` L65 | Added `{ type: 'all' }` POST body to `exportStockMaster()` | ✅ Code marker present, webpack clean |
| BUG-VQTY #1 | `api/transforms/orderTransform.js` L703 | `variationAmount * (item.qty \|\| 1)` in `buildCartItem` | ✅ Code marker present |
| BUG-VQTY #2 | `api/transforms/orderTransform.js` L1492 | `variationAmount * qty` in `collectBillExisting` | ✅ Code marker present |
| BUG-ROOM-PAIDROOM | `api/transforms/orderTransform.js` L1632 | `paid_room: table?.isRoom ? 'yes' : ''` | ✅ Code marker present |

---

## 2. Test Cases

### BUG-163 — Expense Export

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T1 | Export button triggers download | Login → Expense Setup page → click Export | No error toast. Response: `{ message, download_url }`. File downloaded. |
| T2 | Export payload verification | Network tab on Export click | POST body contains `{ "type": "all" }` |
| T3 | Error toast gone | Previously: "The type field is required." toast appeared | Toast must NOT appear |

### BUG-VQTY — Variance Quantity Multiply

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T4 | Place Order: item qty=1 with variation | Add menu item with variation (e.g. Cheese ₹20), qty=1, place order | `variation_amount = 20` in payload (unchanged) |
| T5 | Place Order: item qty=3 with variation | Same item, change qty to 3, place order | `variation_amount = 60` in payload (was 20 before fix) |
| T6 | Collect Bill: item qty=3 with variation | Collect bill for order with qty=3 variation item | `variation_amount = 60` in BILL_PAYMENT payload |
| T7 | Order with NO variation | Regular item without variation, qty=2 | `variation_amount = 0` (unchanged) |
| T8 | Grand total unchanged | Place order before/after | `order_amount` grand total same — fix only changes line-level field |

### BUG-ROOM-PAIDROOM — Room Checkout Flag

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T9 | Room order → Collect Bill | Use a room table order, click Collect Bill | `paid_room: "yes"` in BILL_PAYMENT payload |
| T10 | Non-room order → Collect Bill | Use a regular dine-in table, click Collect Bill | `paid_room: ""` in BILL_PAYMENT payload (unchanged) |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|----------------|-----|
| R1 | Non-room order place + collect flow | BUG-ROOM-PAIDROOM change must not affect dine-in |
| R2 | Item with qty=1 variation same amount as before | BUG-VQTY must not regress qty=1 case |
| R3 | Expense Setup import still works | BUG-163 touches expenseService.js — verify import unaffected |

---

## 4. Registry Sync Confirmation

Registry synced: YES
Items: BUG-163, BUG-VQTY, BUG-ROOM-PAIDROOM
Sprint: pos_5_0
EXIT GATE: ALL 5 PASSED

---

## 5. Credentials + Environment

| Field | Value |
|-------|-------|
| Preprod URL | https://preprod.mygenie.online |
| Test account | owner@cafe103.com / Qplazm@10 |
| Expense Setup route | /expense-setup |
| Room table test | Use any table that has `isRoom: true` in the table list |
