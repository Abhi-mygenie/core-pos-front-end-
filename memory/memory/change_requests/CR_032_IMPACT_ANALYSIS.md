# CR-032 — Impact Analysis (Gate 2)

**Date:** 2026-06-11 · **Status:** ANALYSIS COMPLETE — ready for Gate 3 (one info ask to backend re `pending`)

## 1. The Three Classifiers Today
1. `PaymentsMockup.classifyPaymentMethod` (most complete: razorpay→Card/UPI, partial, zomato_gold, null-skips)
2. `SalesMockup` inline pmKey chain (no razorpay rule, no null-skip, raw pass-through)
3. `insightsService` Dashboard inline chain (adds 'Room Transfer' bucket, raw `partial`)
Plus `AllOrdersReportPage` A0a `cash_on_delivery` mask and `extractPaymentMethods` guard.

## 2. Proposed Change Shape
- Promote `classifyPaymentMethod` to `frontend/src/utils/paymentClassifier.js` as the single source; add explicit entries: `pending → null (unpaid marker)`, `cash_on_delivery → Cash (explicit, not substring)`, `transfertoroom → 'Room Transfer'` (align Payments 'TAB' grouping with Dashboard — owner choice: TAB vs Room Transfer as separate buckets), `zomato_gold → 'Zomato Gold'`.
- Zero-amount paid orders: separate decision — exclude from AOV/order-count or badge them (owner OD; May palmhouse = 17 orders).

## 3. Affected Files
`PaymentsMockup.jsx` (import swap), `SalesMockup.jsx` (replace inline chain), `insightsService.js` (dashboard chain), `constants.js` or new util, optional: `AllOrdersReportPage.jsx` mask alignment.

## 4. Number Shifts
- Sales/Dashboard buckets re-label (raw `partial` → 'Partial', `pending` rows excluded from mix if ever paid-gated).
- TAB-vs-RoomTransfer bucket unification will move `transferToRoom` revenue between buckets on one of the screens (currently Payments groups it under TAB, Dashboard under 'Room Transfer') — pick one.

## 5. Regression Risk
- MEDIUM-LOW. Pure presentation/classification; revenue gates untouched. Export sheets (Payments daily breakdown columns are dynamic by method name) adapt automatically.
- Frozen screens S7/S8 — freeze-log entries.

## 6. Test Strategy
Replication `sales.pm` vs `dashboard.pm` per month must converge to identical bucket sets post-change (modulo room scope, CR-029). Verify 'pending' orders (13 at palmhouse) appear in NO paid bucket.
