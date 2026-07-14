# BUG-189: Delivery — Accept Order Option Missing for Rider Login

**Registered:** 2026-07-11
**Updated:** 2026-07-11 (Investigation complete)
**Source:** OWNER-REPORTED
**Confidence:** MEDIUM
**Duplicate check:** DISTINCT
**Risk:** HIGH
**Severity:** P1
**Classification:** NEEDS RIDER CREDENTIALS TO CONFIRM

## Description
When logged in as a delivery rider, order card shows "Waiting.." but no Accept button.

## Investigation Findings

**The delivery flow IS fully built in the code:**
- `OrderCard.jsx:44` — `onAccept` prop exists
- `OrderCard.jsx:82` — `isDelivery = orderType === "delivery"` flag
- `OrderCard.jsx:86` — `deliveryAssign = restaurant?.features?.deliveryAssign` controls Dispatch vs Assign Rider
- `OrderCard.jsx:139-149` — `handleAcceptClick` → calls `onAccept(order)` (confirms order)
- `OrderCard.jsx:258-268` — `handleDispatch` → calls `dispatchOrder(orderId, roleName)`
- `orderTransform.js:307-329` — full rider status mapping (dispatched, riderAssigned, etc.)
- `ScanOrderPopOut.jsx` — Accept flow for web/scan orders

**Delivery employees (API verified):** 5 employees returned but NO role field populated. All show as generic employees.

**"Waiting.." is a status label, not a broken button.** The order is waiting for dispatch/assignment action.

**Most likely issue:** When logged in as a rider (not Owner), the rider's role/permissions may not include the permission that enables the Accept/Dispatch button. Or the order's status doesn't match the condition that shows the button.

## What's Needed
- **Rider login credentials** to test what a rider actually sees
- Check if rider role has the correct permissions
- Check what order status the rider needs to see Accept vs Waiting

## Files
- `OrderCard.jsx` (has the flow), `DashboardPage.jsx` (connects onAccept)
