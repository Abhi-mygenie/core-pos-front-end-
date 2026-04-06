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

## Current Status (Feb 2026)
- Frontend: RUNNING (localhost:3000)
- Connected to external MyGenie API (preprod environment)
- All core flows migrated to v1 endpoints
- Place Order + Update Order both use engaged table locking (await socket → redirect → release after enrichment)

## Key Features
- Login/Authentication
- Menu management (categories, products)
- Table management (table/room operations)
- Order management (place, update, cancel orders)
- Payment processing (collect bill, place+pay)
- Real-time updates via Socket.io
- Reports (paid orders, cancelled orders, credit orders, etc.)
- **Table Engaged Locking** — prevents race conditions between order placement and dashboard navigation

## Code Architecture
```
/app/frontend/src/
├── api/
│   ├── constants.js            (API Endpoints)
│   ├── axios.js                (Axios instance)
│   ├── socket/
│   │   ├── socketHandlers.js   (Socket event handlers + table engage/release logic)
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
│       ├── OrderEntry.jsx      (Main order screen — handlePlaceOrder with engaged locking)
│       ├── CollectPaymentPanel.jsx (Payment UI)
│       ├── CartPanel.jsx       (Cart UI)
│       ├── CategoryPanel.jsx   (Category sidebar)
│       └── ...                 (Modals)
├── contexts/
│   ├── OrderContext.jsx        (Order state, addOrder/updateOrder/removeOrder)
│   ├── TableContext.jsx        (Table state, engaged lock: setTableEngaged/waitForTableEngaged)
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
| Get Single Order | `POST /api/v2/vendoremployee/get-single-order-new` | POST | `application/json` | `fromAPI.order()` |

## Bugs - Fixed
- **BUG-201**: Duplicate API calls on Update Order
- **BUG-202**: Duplicate API calls on Cancel Item
- **BUG-203**: Redundant `update-table` socket handling
- **BUG-205**: Cancel order race condition (order re-added)
- **BUG-206**: Partial cancel cancels all items (wrong endpoint)
- **BUG-207**: Place Order payload & endpoint migration (8 critical bugs fixed)
- **BUG-208**: Socket returns empty `variation`/`add_ons` — backend fixed, frontend parser updated
- **BUG-209**: Placed item prices double-multiplied (socket `price` = total, display did `price * qty` again)
- **BUG-211**: Backend doesn't send `update-table engage` for new orders — workaround: frontend engages locally in `handleNewOrder`
- **BUG-213**: Collect Bill summary showed only placed items' totals, ignoring new unplaced items in cart
- **BUG-215**: TableCard stale data after Collect Bill — `DashboardPage` used `useEffect+setState` (async) to derive table data from OrderContext, causing stale intermediate renders. Converted to `useMemo` (synchronous derivation). Also changed `handleUpdateTableStatus` to flow through `TableContext` instead of local state.

## Bugs - Open / Blocked
- **NOTE-200**: StrictMode double-log — dev-only, verify in production
- **BUG-204**: Socket `new-order` missing 16 financial fields — workaround: GET single order enrichment
- **BUG-210**: No table availability pre-check before placing order (multi-device race condition) — blocked on backend team
- **BUG-212**: Addon names mismatch between product catalog API and order response API — blocked on backend team
- **BUG-214**: **CRITICAL** — Collect Bill on existing order returns "Table is already occupied". All 3 payload variations tried. Blocked on backend clarification. See BUGS.md for full details.
- **BUG-216**: Shift Table flow broken — `socketHandlers.js` has `free→engage` workaround that locks old table permanently. Fix: remove workaround, add local `setTableEngaged` in `handleCancelFood` instead.

## Key Technical Learnings

### Socket Behavior Asymmetry
| Action | `update-table engage` sent? | Frontend engage source |
|--------|---------------------------|----------------------|
| Place New Order | NO | `handleNewOrder` → `setTableEngaged(true)` locally |
| Update Order | YES (via table channel) | `handleUpdateTable` → `setTableEngaged(true)` from socket |

### Engaged Lock Release Pattern
Both `handleNewOrder` and `handleUpdateOrder` use double `requestAnimationFrame` to release the engaged lock:
```js
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    setTableEngaged(tableId, false);
  });
});
```
This guarantees React has committed state + browser has painted before the table becomes clickable.

### No Optimistic UI
After placing/updating, the cart is NOT updated locally. It is cleared and rebuilt exclusively from socket data → GET enrichment. This prevents stale/duplicate items.

## Pending User Verification
- Place Order flow with engaged locking (tested once — user confirmed redirect + lock working)
- Place+Pay, Collect Bill flows

## Backlog
- End-to-end testing of `partial_payments` mapping (P1)
- Edit placed item qty/notes (CHG-040) — awaiting endpoint from backend team
- Race condition mitigation (debounce per orderId) for concurrent multi-user scenarios
- Backend: send full 51-key payload in socket `new-order` (removes GET enrichment workaround)
- Backend: send `update-table engage` for new orders (removes frontend workaround in BUG-211)
- Backend: implement table availability pre-check (BUG-210)
