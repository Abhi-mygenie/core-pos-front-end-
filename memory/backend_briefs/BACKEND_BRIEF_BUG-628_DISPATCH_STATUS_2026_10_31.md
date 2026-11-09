# BACKEND_BRIEF_BUG-628_2026-10-31

## Summary
- Issue: `order_dispatch_status` not persisted when delivery order is already at fOS=5 (served) — dispatch API returns 200 but field stays "No"
- Classification: BACKEND_BUG
- Frontend impact: Dispatch button stays visible after clicking — never transitions to "On The Way" state
- Priority/Risk: P1 / MEDIUM

## Endpoint
- Method: PUT
- URL: `/api/v1/vendoremployee/pos/order-status-update`
- Auth: Bearer token (employee login)

## Reproduction
1. Login as `owner@konaseemaruchulu.com` (restaurant with Default Order Status = "Bill")
2. Place a delivery order — it lands directly at fOS=5 (skips fOS=2)
3. Click "Dispatch" button on the delivery card
4. API returns 200, toast says "Order dispatched"
5. Socket fires `update-order-status` with fOS=5
6. **But `order_dispatch_status` is still "No"** — button stays "Dispatch"

## Payload / Response

FE sends:
```json
{
  "order_id": 1490542,
  "order_status": "serve",
  "role_name": "Owner",
  "order_dispatch_status": "Yes"
}
```

API returns: 200 OK

But subsequent GET `/api/v2/vendoremployee/get-single-order-new` shows:
```json
{
  "id": 1490542,
  "f_order_status": 5,
  "order_dispatch_status": "No",     // ← NOT UPDATED
  "delivery_man_id": null,
  "delivery_man_status": "No"
}
```

## Root Cause (hypothesis)

The `order-status-update` endpoint processes `order_status: "serve"` as the primary action. When the order is **already at fOS=5** (served), the status transition is a no-op. The backend likely skips the entire update block — including `order_dispatch_status` — because the primary transition didn't execute.

## Expected

`order_dispatch_status` should be updated to `"Yes"` **independently** of whether `order_status` actually changes fOS. The dispatch flag is a separate concern from the order lifecycle status.

## Evidence
- Order #1490542, restaurant 649 (Konaseema Ruchulu)
- Console log: socket `update-order-status` fires with fOS=5 (same as before)
- API probe after dispatch: `order_dispatch_status: "No"` confirmed
- Toast says success — API returned 200

## Frontend Workaround
- Available: NO — FE cannot force `order_dispatch_status` without backend persisting it
- The FE code (BUG-628 fix) correctly checks `riderStatus === 'dispatched'` which derives from `order_dispatch_status === 'Yes'` — but backend never sets it to 'Yes' for fOS=5 orders
