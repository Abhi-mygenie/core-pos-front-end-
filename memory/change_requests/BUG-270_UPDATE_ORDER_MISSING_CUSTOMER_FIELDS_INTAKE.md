# BUG-270 — Update Order Missing cust_mobile / cust_membership_id

**ID:** BUG-270
**Type:** BUG
**Created:** 2026-07-28
**Severity:** P1 (HIGH)
**Risk:** LOW
**Module:** Order Entry — Update Place Order
**Duplicate Check:** DISTINCT
**Code Reality:** CONFIRMED — `orderTransform.js:1131` only sends `cust_name` in updateOrder. `placeOrder` (L1000-1005) sends all 3.
**Source:** OWNER-REPORTED
**Confidence:** CONFIRMED (code verified + test file confirms intentional omission)

---

## Description

When updating an existing order via `update-place-order` endpoint, the payload only carries `cust_name`. It omits:
- `cust_mobile` (customer phone)
- `cust_membership_id` (CRM customer ID)

Backend now requires all 3 keys on update-place-order. The place-order flow already sends them correctly (L1000-1005).

## Evidence

- Code: `orderTransform.js:1131` — `cust_name: customer?.name || ''` (only field)
- Code: `orderTransform.js:1000-1005` — placeOrder sends all 3
- Test: `updateOrderPayload.test.js:16` — "updateOrder carries only cust_name" (was intentional, now wrong)
- Endpoint: `POST /api/v2/vendoremployee/order/update-place-order`

## Blast Radius

- 1 file: `orderTransform.js`
- 2 lines added
- Hotspot: NO (updateOrder section, not OrderEntry.jsx)
- Scope: SMALL

## Fix

Add after L1131 (`cust_name`):
```js
cust_mobile: customer?.phone || '',
cust_membership_id: customer?.id || '',
```
