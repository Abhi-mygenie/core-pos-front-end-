# MyGenie Core POS Frontend - PRD

## Original Problem Statement
Pull project from `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch: `piyush_QA`), build and run as React frontend, then document and fix reported bugs.

## Architecture
- **Type**: React Frontend SPA
- **Build Tool**: CRACO v7.1.0
- **React**: v19.0.0
- **Styling**: Tailwind CSS v3.4.17 + Radix UI
- **Router**: React Router DOM v7.5.1
- **Backend**: External APIs at `https://preprod.mygenie.online/`

## What's Been Implemented

### 2026-04-20 — Session 1: Deployment
- Cloned `piyush_QA` branch, configured 17 env variables
- Installed dependencies via `yarn`, started app successfully

### 2026-04-20 — Session 2: QA Documentation
- Full QA documentation for BUG-009 through BUG-015 in `/app/memory/BUG_TEMPLATE.md`

### 2026-04-20 — Session 3: Bug Fixes

#### BUG-009 — Rounding Logic Fixed
- **Files**: `CollectPaymentPanel.jsx`, `orderTransform.js`
- **Change**: `fractional > 0.10 → ceil, else floor`

#### BUG-010 — Discount/Tip Validation Added
- **Files**: `CollectPaymentPanel.jsx`
- **Change**: JS-enforced max 100% for percent discount, reject negatives

#### BUG-012 — Delivery Address Print Payload Fixed
- **Files**: `OrderEntry.jsx` (3 print paths), `orderTransform.js` (`buildBillPrintPayload`)
- **Change**: `selectedAddress` from OrderEntry state injected into print overrides; `buildBillPrintPayload` reads `overrides.deliveryAddress` for all 5 delivery fields (`deliveryCustName`, `deliveryAddressType`, `deliveryCustAddress`, `deliveryCustPincode`, `deliveryCustPhone`), falling back to `order.deliveryAddress`
- **Note**: Backend still drops `delivery_address` at storage (BUG-007). This fix uses the live `selectedAddress` state, bypassing the backend gap for printing.

#### BUG-013 — Service Charge Gated by Order Type
- **Files**: `CollectPaymentPanel.jsx`, `OrderEntry.jsx`
- **Change**: `scApplicable = dineIn || walkIn || isRoom`; SC=0 for takeaway/delivery

#### BUG-014 — Closed (Confirmed Working)
- GST on tip confirmed working by user at runtime

#### BUG-015 — Feature Flags Gate Coupon/Loyalty/Wallet
- **Files**: `CollectPaymentPanel.jsx`
- **Change**: Gated by `restaurantSettings.isCoupon/.isLoyalty/.isCustomerWallet` from profile API

## Backlog — Next Sprint

| Bug | Status | Notes |
|-----|--------|-------|
| BUG-011 | Backend bug | HTTP 500 `BadMethodCallException` — backend `OrderController` missing method for non-dine-in orders on `waiter-dinein-order-status-update` endpoint. Frontend code is correct. |
| BUG-012 | Partially open | Print payload FIXED. Backend persistence of `delivery_address` still pending (BUG-007 Entry #6). UI address on re-edit still depends on backend fix. |
| BUG-001 | Open | Prepaid auto-print missing tip/discount |
| BUG-002 | Open | Postpaid collect-bill auto-print not triggered |
| BUG-003 | Open | Credit walk-in name auto-fills "Walk-In" |
| BUG-004 | Open | Split bill total wrong |
