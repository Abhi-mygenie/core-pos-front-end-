# BACKEND_BRIEF_BUG-184_2026-08-19

## Summary
- Issue: `order-logs-report` returns null/empty `payment_method` for CRE-Credit settled orders, causing the Payment column in Daily Report to show blank for those orders
- Classification: DATA_ISSUE (backend omits payment_method on CRE-Credit settled orders)
- Frontend impact: Daily Report All Orders tab — Payment column blank for CRE-Credit orders; they appear as orders with no payment type
- Priority/Risk: P1 / MEDIUM

## Endpoint
- Method: POST
- URL: `/api/v2/vendoremployee/report/order-logs-report`
- Auth: Bearer token (vendoremployee role)

## Problem
When an order is settled via CRE-Credit payment type:
- `payment_method` field in the response is null or empty string
- FE defaults `paymentMethod: api.payment_method || 'TAB'` (reportTransform.js:266)
- 'TAB' routes the order to the Credit tab (TAB_FILTERS.credit) — that part works
- But on the All Orders tab where the Payment column renders `order.paymentMethod`, it shows 'TAB' (or blank) instead of 'CRE-Credit' or a readable label

## Frontend Status
FE cannot fix this without knowing what value backend will return. Specifically:
- `reportTransform.js:266` needs to know the `payment_method` string backend will send
- `paymentClassifier.js` (CR-032) may need a new entry for the CRE-Credit type
- `OrderTable.jsx` renders `paymentMethod` directly — no change needed there

## Fix Required (Backend)
Return a consistent, non-null `payment_method` value for CRE-Credit settled orders. Suggested value: `"CRE-Credit"` or `"Credit"`. Coordinate with FE team on the exact string so `paymentClassifier.js` can be updated.

## Frontend Work After Backend Fix
Once backend delivers the `payment_method` value:
- Add mapping in `paymentClassifier.js` for the new value
- Verify `reportTransform.js:266` default is updated if needed
- Estimated: 1 file, ~3 lines

## Frontend Workaround
None available — need the backend `payment_method` value to proceed.
