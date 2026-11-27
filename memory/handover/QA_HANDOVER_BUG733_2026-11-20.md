# QA HANDOVER — BUG-733 — 2026-11-20

**From:** IMPLEMENTATION · **Item:** BUG-733 (P0, nov_cr_batch) · **Risk:** LOW
**Change:** native `<input type="date">` → shadcn-style `DatePicker` on Order Report Beta + Credit sheet. OD-733-01=(a).

## 1. Inherited from Plan — Verification Matrix (self-test results)
| # | File | Verification | Self-Test |
|---|------|-------------|:---:|
| 1 | OrderReportBetaPage.jsx | import DatePicker, webpack 0 new warnings | ✅ webpack "Compiled successfully" |
| 2 | OrderReportBetaPage.jsx:553 | From = DatePicker, re-query on Apply | ⬜ browser (QA) |
| 3 | OrderReportBetaPage.jsx:556 | To = DatePicker, future dates disabled | ⬜ browser (QA) |
| 4 | OrderReportBetaPage | `from-date`/`to-date` wrapper testids present | ✅ code-verified |
| 5 | CreditCustomerDetailSheet.jsx | From/To = DatePicker, empty shows "Select date" | ⬜ browser (QA) |
| 6 | CreditCustomerDetailSheet.jsx | empty→all rows; pick range→filter; Clear→reset | ⬜ browser (QA) |
| 7 | CreditCustomerDetailSheet.jsx | chevron-on-empty = no-op, no `NaN-NaN-NaN` | ✅ unit (test 1/2) |
| 8 | DatePicker.jsx | empty guard no-op; shift ±1 day when set | ✅ unit 5/5 PASS |
| 9 | Both screens | no overflow / dropdown clipping @1366 + @390 (Credit dropdown inside Sheet) | ⬜ browser (QA) |
| 10 | Regression | Apply→`getOrderReportBetaCombined`; Credit statement cbs still get `{dateFrom,dateTo}` | ⬜ browser (QA) |

Unit: `src/__tests__/components/reports/DatePicker.bug733.test.jsx` — **5/5 PASS**. Webpack: compiled clean, 0 new warnings.

## 2. Browser test cases (QA to execute — needs preprod login)
1. Orders (Beta) → From/To now shadcn pickers, default "Today"; pick past From → Apply → table re-queries for that range.
2. Future date disabled in both pickers.
3. Credit → open a customer's credit sheet → Date Range shows two pickers ("Select date" when empty) + Clear.
4. With empty pickers → all credit rows shown; set From+To → rows filter; Clear → all rows return.
5. Click ‹/› on an EMPTY Credit picker → nothing happens (no invalid date, no console error).
6. Layout @1366×768 and @390×844 — no wrap/overflow; Credit dropdown not clipped by the Sheet.

## 3. Regression
- Order Beta Apply + Excel/PDF export unaffected (only the editing control changed; `appliedFrom/appliedTo` untouched).
- Other DatePicker consumers (AllOrders/RoomOrders/OrderSummary) unaffected by the guard (always seeded, never empty) — spot-check one still shifts days.

## 4. Registry Sync Confirmation
Registry synced: YES · Item: BUG-733 · Sprint: nov_cr_batch · Status: GATE_5A_IMPLEMENTED · EXIT GATE 5/5.

## 5. Credentials + Environment
Preprod login required for browser cases (Order Beta + a credit customer with orders). Frontend compiles + serves locally.
