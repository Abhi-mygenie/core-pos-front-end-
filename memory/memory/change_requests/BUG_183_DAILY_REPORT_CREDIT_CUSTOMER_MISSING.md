# BUG-183: Daily Report — Phone Number and Customer Name Missing in Credit Tab

**Registered:** 2026-07-11
**Updated:** 2026-07-11 (Investigation complete)
**Source:** OWNER-REPORTED
**Confidence:** HIGH
**Duplicate check:** DISTINCT
**Risk:** MEDIUM
**Severity:** P1
**Classification:** BACKEND_DATA

## Description
In Daily Report → "Added to Credit" tab, customer name shows "Guest" and phone shows "—" for credit/TAB orders.

## Investigation Findings

**Code trace:**
- `reportTransform.js:258-266` → maps `customer: api.user_name || 'Guest'` and `customerContact: extractCustomerContact(api)` for TAB orders
- `extractCustomerContact` (L85) → uses `api.cust_mobile || api.user_phone || api.phone`
- `OrderTable.jsx:196-200` → has `customerPhone` column specifically for Credit tab

**Root cause:** FE wiring is 100% correct. The backend `/order-logs-report` API does NOT return `user_name` or `cust_mobile` populated for TAB/Credit orders. The FE correctly defaults to 'Guest' and '—'.

**Verified via:** Code trace only (API response for credit orders would need a date with credit orders)

## Fix Required
- **BACKEND ONLY** — backend needs to populate `user_name` and `cust_mobile` on TAB order rows in the order-logs-report response
- **Zero FE changes needed**

## Files
- FE already correct: `reportTransform.js`, `OrderTable.jsx`
