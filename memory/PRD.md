# Core POS Frontend - Project Documentation

> Last Updated: 2026-04-01
> Repository: https://github.com/Abhi-mygenie/core-pos-front-end-.git

## Overview
A React-based Point of Sale (POS) frontend for restaurant management, connecting to the MyGenie backend at `preprod.mygenie.online`.

## Tech Stack
- **Frontend**: React 19, React Router DOM 7
- **Styling**: Tailwind CSS 3, Radix UI components
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Build Tool**: Create React App with CRACO
- **Real-time**: Socket.IO (Phase 3)

## Project Structure
```
/app/frontend/src/
├── api/
│   ├── services/      # API service layer (auth, order, product, socket, etc.)
│   ├── transforms/    # API response transformers
│   ├── axios.js       # Axios instance with interceptors
│   └── constants.js   # API endpoints, status mappings, socket config
├── components/
│   ├── cards/         # TableCard, OrderCard, DineInCard, DeliveryCard
│   ├── layout/        # Header, Sidebar
│   ├── modals/        # RoomCheckInModal
│   ├── order-entry/   # OrderEntry, CartPanel, various modals
│   ├── panels/        # SettingsPanel, MenuManagementPanel
│   ├── reports/       # Report components
│   ├── sections/      # TableSection
│   └── ui/            # Base UI components (shadcn/ui)
├── contexts/          # AuthContext, OrderContext, MenuContext, SocketContext, etc.
├── hooks/             # Custom hooks
├── pages/             # LoginPage, DashboardPage, Reports pages
└── utils/             # Helper functions
```

## Key Features Implemented

### Authentication & Authorization
- Login with email/password via `/api/v1/auth/vendoremployee/login`
- 50 role-based permissions (Owner, Manager, Waiter, Cashier, KDS Operator)
- Token-based auth with localStorage persistence

### Dashboard
- Multi-channel support: Dine-In, TakeAway, Delivery, Room
- Table grid view with status indicators
- Order list view with detailed cards
- Real-time connectivity indicator
- Search across tables, orders, customers

### Order Management
- Place orders: `POST /api/v2/vendoremployee/pos/place-order`
- Update orders: `PUT /api/v2/vendoremployee/pos/update-place-order`
- Payment collection: `POST /api/v2/vendoremployee/order-bill-payment`
- Item customization (variations, addons, notes)

### Table Operations
- Shift table: Move order to different table
- Merge table: Combine multiple table bills
- Transfer food: Move items between tables
- Cancel item (full/partial)
- Cancel order

### Room Management (Phase 2A/2B)
- Room check-in with guest details
- Transfer table orders to rooms
- Associated orders tracking
- Room checkout flow

### Reports (Phase 4A/5A)
- Audit Report: 8 tabs (All, Paid, Cancelled, Credit, Hold, Merged, Room Transfer, Aggregator)
- Order Summary: Daily aggregations with breakdown by payment, channel, platform
- Gap detection for missing orders
- CSV/PDF export

### ⭐ Real-time Updates (Phase 3) — NEW
- **Socket.IO Integration**: Connects to `wss://presocket.mygenie.online`
- **Channels**: `new_order_{restaurantId}`, `update_table_{restaurantId}`, `aggregator_order_{restaurantId}`
- **Events Handled**:
  | Event | Channel | API Call | Action |
  |-------|---------|----------|--------|
  | `new-order` | new_order | No | Add order to context (full data in payload) |
  | `scan-new-order` | new_order | Yes | Fetch + add (needs Accept/Reject) |
  | `update-order` | new_order | Yes | Fetch + update/add |
  | `update-food-status` | new_order | Yes | Fetch + update |
  | `update-order-status` | new_order | Yes/No | Remove if paid/cancelled, else fetch |
  | `delivery-assign-order` | new_order | Yes | Fetch + update (driver assigned) |
  | `update-table` | update_table | No | Update table engage status |
  | `aggrigator-order-update` | aggregator_order | Yes | Fetch via urbanpiper API + update |
- **Connection Indicator**: Header shows Wifi icon (green/yellow/red)
- **Auto-reconnect**: 5 attempts with exponential backoff
- **Debounce**: 500ms per event type + order ID

## Files Modified (Phase 3)
| File | Changes |
|------|---------|
| `api/services/socketService.js` | NEW - Socket connection & event handling |
| `api/services/orderService.js` | Added `getSingleOrder()`, `getAggregatorOrderDetails()` |
| `api/constants.js` | Added `SOCKET_CONFIG`, `AGGREGATOR_ORDER_DETAILS` endpoint |
| `contexts/SocketContext.jsx` | NEW - Socket state provider |
| `contexts/OrderContext.jsx` | Added `addOrder()`, `updateSingleOrder()`, `removeOrder()`, `hasOrder()` |
| `contexts/TableContext.jsx` | Added `updateTableStatus()` |
| `contexts/AppProviders.jsx` | Added `SocketProvider` |
| `contexts/index.js` | Export `SocketProvider`, `useSocket` |
| `components/layout/Header.jsx` | Socket connection indicator (replaces isOnline) |
| `components/layout/Sidebar.jsx` | Disconnect socket on logout |
| `pages/DashboardPage.jsx` | Removed isOnline prop |

## API Endpoints
| Feature | Endpoint |
|---------|----------|
| Login | `POST /api/v1/auth/vendoremployee/login` |
| Profile | `GET /api/v2/vendoremployee/vendor-profile/profile` |
| Tables | `GET /api/v1/vendoremployee/all-table-list` |
| Products | `GET /api/v1/vendoremployee/get-products-list` |
| Categories | `GET /api/v1/vendoremployee/get-categories` |
| Running Orders | `GET /api/v1/vendoremployee/pos/employee-orders-list` |
| Place Order | `POST /api/v2/vendoremployee/pos/place-order` |
| Collect Payment | `POST /api/v2/vendoremployee/order-bill-payment` |

## Environment Variables
```
REACT_APP_API_BASE_URL=https://preprod.mygenie.online
```

## Status
- ✅ Cloned from GitHub
- ✅ Dependencies installed
- ✅ Frontend running on port 3000
- ✅ **Phase 3: Socket.IO Integration COMPLETE** (2026-04-01)
- ⚠️ SSL handshake issue with Cloudflare (infrastructure)

## Pending Work / Backlog

### P0 (High Priority)
- [ ] Test Socket.IO connection with live preprod backend
- [ ] Backend clarification: Status 4, 9 definitions
- [ ] Cancel Order Modal (Phase 1C)
- [ ] Add Out of Menu Item UI (Phase 1C)

### P1 (Medium Priority)  
- [ ] Report API gaps: Add `channel` + `platform` fields (GAP-001/002)
- [ ] Fix `paid-paylater-order-list` wrong data (ISSUE-001)
- [ ] Restaurant logo URL 404 issue (B5)

### P2 (Low Priority)
- [ ] Multiple menu support (Buffet/HappyHour)
- [ ] KDS/station-level status tracking
- [ ] Product `veg` field audit (B7)

## Documentation
Located in `/app/docs/`:
- `API_MAPPING.md` - Complete API field mappings
- `BACKEND_CLARIFICATIONS.md` - Backend Q&A and gaps
- `CHANGELOG.md` - Feature changelog
- `CHANGE_MANAGEMENT.md` - Detailed change tracking
- `ROLES_DEFINITION.md` - RBAC permissions
- `ORDER_REPORT_CLARIFICATIONS.md` - Report-specific gaps
