# Core POS Frontend - PRD

## Original Problem Statement
- Pull code from https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: April-phase-3-socket
- React app only (no backend)
- Build and run as is
- No testing agent required
- PRODUCT REQUIREMENTS: Point of Sale (POS) frontend connected to an external pre-production API and socket server, handling order updates, billing, tax calculation, table statuses, and real-time order synchronizations.

## Project Overview
**MyGenie Restaurant POS System** - A Point of Sale frontend application for restaurant management.

## Tech Stack
- React 19
- CRACO (Create React App Configuration Override)
- Tailwind CSS
- Radix UI components
- Socket.io-client for real-time updates
- Axios for API calls
- React Router v7

## Environment Configuration
```
REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
REACT_APP_SOCKET_URL=https://presocket.mygenie.online
```

## Current Status (April 6, 2026)
- Frontend: RUNNING (localhost:3000)
- Connected to external MyGenie API (preprod environment)
- All core flows migrated to v1 endpoints

## Bugs - Fixed ✅ (Recent)
- **BUG-209**: Placed item prices showed double-multiplied amounts (₹1,904 instead of ₹476 for qty=4). Root cause: socket `detail.price` returns total (unit × qty), but display code multiplied by qty again. Fixed by normalizing `fromAPI.orderItem.price` to use `unit_price`.
- **Variation format fix**: Changed from `{label, optionPrice}` to `{name: "GroupName", values: {label: ["Option1"]}}` matching backend's expected structure per user-provided working curl.

## Key Features
- Login/Authentication
- Menu management (categories, products)
- Table management (table/room operations)
- Order management (place, update, cancel orders)
- Payment processing (collect bill, place+pay)
- Real-time updates via Socket.io
- Reports (paid orders, cancelled orders, credit orders, etc.)

## Code Architecture
```
/app/frontend/src/
├── api/
│   ├── constants.js            (API Endpoints)
│   ├── axios.js                (Axios instance)
│   ├── socket/
│   │   ├── socketHandlers.js   (Socket event handlers)
│   │   ├── socketEvents.js     (Event constants)
│   │   └── useSocketEvents.js  (Socket hook)
│   ├── transforms/
│   │   ├── orderTransform.js   (Order data transforms + buildCartItem/calcOrderTotals)
│   │   ├── tableTransform.js   (Table data transforms)
│   │   └── ...                 (Other transforms)
│   └── services/
│       └── orderService.js     (API service layer)
├── components/
│   └── order-entry/
│       ├── OrderEntry.jsx      (Main order screen)
│       ├── CollectPaymentPanel.jsx (Payment UI)
│       ├── CartPanel.jsx       (Cart UI)
│       ├── CategoryPanel.jsx   (Category sidebar)
│       └── ...                 (Modals)
├── contexts/
│   ├── OrderContext.jsx
│   ├── TableContext.jsx
│   ├── MenuContext.jsx
│   └── ...
└── constants.js                (UI constants/colors)
```

## API Endpoint Mapping (Current)

| Flow | Endpoint | Method | Content-Type | Transform |
|------|----------|--------|-------------|-----------|
| Place New Order | `/api/v1/vendoremployee/order/place-order` | POST | `multipart/form-data` | `placeOrder()` |
| Update Order | `/api/v1/vendoremployee/order/update-place-order` | PUT | `application/json` | `updateOrder()` |
| Place + Pay | `/api/v1/vendoremployee/order/place-order` | POST | `multipart/form-data` | `placeOrderWithPayment()` |
| Collect Bill | `/api/v1/vendoremployee/order/place-order` | POST | `multipart/form-data` | `collectBillExisting()` |
| Cancel Item | `/api/v1/vendoremployee/order/cancel-food-item` | PUT | `application/json` | `cancelItem()` |
| Cancel Order | `/api/v2/vendoremployee/order-status-update` | PUT | `application/json` | `cancelOrder()` |
| Transfer to Room | `/api/v1/vendoremployee/order-shifted-room` | POST | `application/json` | `transferToRoom()` |

## Bugs - Fixed ✅
- **BUG-201**: Duplicate API calls on Update Order
- **BUG-202**: Duplicate API calls on Cancel Item
- **BUG-203**: Redundant `update-table` socket handling
- **BUG-205**: Cancel order race condition (order re-added)
- **BUG-206**: Partial cancel cancels all items (wrong endpoint)
- **BUG-207**: Place Order payload & endpoint migration (8 critical bugs fixed)
- **BUG-209**: Placed item prices double-multiplied (socket `price` = total, display did `price × qty` again)

## Bugs - Open / Blocked
- **NOTE-200**: StrictMode double-log — dev-only, verify in production
- **BUG-204**: `order_sub_total_without_tax` returns 0 — blocked on backend team

## Pending User Verification
- All 4 order flows need user testing against external preprod API (Place, Update, Place+Pay, Collect Bill)

## Backlog
- Edit placed item qty/notes (CHG-040) — awaiting endpoint from backend team
- Race condition mitigation (debounce per orderId) for concurrent multi-user scenarios
- Follow up on backend bug fixes documented in BUGS.md
