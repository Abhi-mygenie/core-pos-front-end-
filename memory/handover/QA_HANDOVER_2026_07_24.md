# QA Handover — CR-098 + CR-062 + BUG-164/165/203 (2026-07-24)

## 1. Inherited from Plan (Verification Matrix results)

| Edit | File | Verification | Self-Test Result |
|------|------|-------------|:---:|
| CR-098 E1 | orderTransform.js:118 | `itemCode` field mapped from `food_details.item_code` | ✅ Verified |
| CR-098 E2 | OrderEntry.jsx:91 | `itemCode` in adaptProduct | ✅ Verified |
| CR-098 E3 | OrderEntry.jsx:534 | Search filter matches itemCode | ✅ Verified |
| CR-098 E4 | OrderEntry.jsx:1656 | Menu pills show `[code] name` | ✅ Verified |
| CR-098 E5 | OrderCard.jsx:659 | Preparing items show `[code] name (qty)` | ✅ Verified |
| CR-098 E6 | OrderCard.jsx:734 | Served items show `[code] name (qty)` | ✅ Verified |
| CR-098 E7 | OrderCard.jsx:779 | Cancelled items show `[code] name (qty)` | ✅ Verified |
| CR-062 E1 | constants.js:448 | EXPENSE_AGGREGATION endpoint added | ✅ Verified |
| CR-062 E2 | expenseService.js:127 | getExpenseAggregation function added | ✅ Verified |
| CR-062 E3 | ExpenseReportPage.jsx | Server-side aggregation with fallback | ✅ Verified |
| BUG-164 | ExpenseSetupPanel.jsx:236 | Body-inspection workaround removed | ✅ Verified |
| BUG-165 | ExpenseSetupPanel.jsx catch | err.readableMessage already surfaced | ✅ Verified (no change needed) |
| BUG-203 E1 | expenseService.js:112 | updateExpenseItem accepts unit_price | ✅ Verified |
| BUG-203 E2 | ExpenseSetupPanel.jsx:619 | Single PUT with unit_price | ✅ Verified |

## 2. Test Cases

### CR-098: Short Code Display
| # | Test | Steps | Expected |
|---|------|-------|----------|
| T1 | Short code on Preparing items | Login → place order with items that have item_code in backend → view OrderCard | Items show `[SC01] Item Name (qty)` |
| T2 | Short code on Served items | Mark an item as served → check Served section | Shows `[SC01] Item Name (qty)` |
| T3 | Short code on Cancelled items | Cancel an item → check Cancelled section | Shows `[SC01] Item Name (qty)` with strikethrough |
| T4 | Items without short code | Place order with items that have no item_code | Shows `Item Name (qty)` — no brackets |
| T5 | Search by short code | Type a short code in OrderEntry search box | Matching items appear |
| T6 | Menu pill display | Open OrderEntry → view menu items with item_code | Pills show `[code] Name` |

### CR-062: Expense Aggregation
| # | Test | Steps | Expected |
|---|------|-------|----------|
| T7 | Expense report loads | Login → Sidebar → Expense Report → select date range | KPI cards show totals, charts render |
| T8 | Server aggregation | Open DevTools Network tab → load expense report | POST /expense-aggregation call made; response has grand_total, daily_totals, etc. |
| T9 | Fallback to client-side | (If server endpoint fails) Block POST /expense-aggregation in DevTools → reload | Report still loads with client-side math |

### BUG-164/165/203: Expense Cleanup
| # | Test | Steps | Expected |
|---|------|-------|----------|
| T10 | Duplicate category (BUG-164) | Expense Setup → add category → add same name again | Destructive toast with backend 409 message |
| T11 | Duplicate item (BUG-165) | Expense Setup → add item → add same name in same category | Destructive toast (client guard fires first; 422 catch as fallback) |
| T12 | Inline edit with price (BUG-203) | Expense Setup → edit item → change name + price → save | Single PUT call in Network tab (no separate POST set-unit-price) |

## 3. Regression Tests
| # | What to verify | Why |
|---|----------------|-----|
| R1 | Existing orders without item_code display correctly | CR-098 — backward compat |
| R2 | Expense entry (ExpenseEntryPanel) still works | BUG-164/203 changes in shared service |
| R3 | Unit Prices tab still works | BUG-203 removed 2-call from inline edit only |

## 4. Registry Sync Confirmation
  Registry synced: YES
  Items: CR-098, CR-062, BUG-164, BUG-165, BUG-203
  Sprint: pos_5_0
  EXIT GATE: ALL 5 PASSED

## 5. Credentials + Environment
  | Account | Email | Password | Use For |
  |---|---|---|---|
  | Pav (vishal) | vishal@pav.com | *** | CR-098 (OrderCard testing) |
  | Kunafa Mahal (owner) | owner@kunafamahal.com | *** | CR-062, BUG-164/165/203 (expense) |
  Preview URL: https://core-pos-preview-12.preview.emergentagent.com
