# BACKEND_BRIEF_BUG-183_2026-08-19

## Summary
- Issue: `order-logs-report` does not populate `user_name` or `cust_mobile` for TAB/credit orders, causing Daily Report Credit tab to always show "Guest" and "—" for customer name and phone
- Classification: DATA_ISSUE (backend omits customer fields on TAB-settled orders)
- Frontend impact: Credit tab in Daily Report (`/daily-report`) shows no customer info for any credit/TAB order — staff cannot identify who owes the credit
- Priority/Risk: P1 / MEDIUM

## Endpoint
- Method: POST
- URL: `/api/v2/vendoremployee/report/order-logs-report`
- Auth: Bearer token (vendoremployee role)
- Payload: `{ sort_by: "created_at", from_date: "DD/MM/YYYY", to_date: "DD/MM/YYYY" }`

## Problem
For orders where `payment_method === 'TAB'` (credit/tab orders), the API response rows have:
- `user_name`: null or empty
- `cust_mobile`: null or empty

For non-TAB orders (Cash, Card, UPI), the same fields are populated.

## Frontend Status
**Zero FE changes needed.** Frontend wiring is already correct:
- `reportTransform.js:258-266` maps `customer: api.user_name || 'Guest'`
- `reportTransform.js:84-85` maps `phone: api.cust_mobile || api.user_phone || api.phone`
- `OrderTable.jsx:196-200` has a `customerPhone` column specifically for Credit tab
- The FE correctly defaults to "Guest" and "—" when backend sends null — that is the bug

## Fix Required (Backend)
Populate `user_name` and `cust_mobile` on TAB/credit order rows in the `order-logs-report` response, sourced from the customer record linked to the order.

## Frontend Workaround
None available — data must come from backend.
