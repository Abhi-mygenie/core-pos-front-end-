# Core POS Frontend - Project Documentation

> Last Updated: 2026-03-31
> Repository: https://github.com/Abhi-mygenie/core-pos-front-end-.git

## Overview
A React-based Point of Sale (POS) frontend for restaurant management, connecting to the MyGenie backend at `preprod.mygenie.online`.

## Tech Stack
- **Frontend**: React 19, React Router DOM 7
- **Styling**: Tailwind CSS 3, Radix UI components
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Build Tool**: Create React App with CRACO

## Project Structure
```
/app/frontend/src/
├── api/
│   ├── services/      # API service layer (auth, order, product, etc.)
│   ├── transforms/    # API response transformers
│   ├── axios.js       # Axios instance with interceptors
│   └── constants.js   # API endpoints & status mappings
├── components/
│   ├── cards/         # TableCard, OrderCard, DineInCard, DeliveryCard
│   ├── layout/        # Header, Sidebar
│   ├── modals/        # RoomCheckInModal
│   ├── order-entry/   # OrderEntry, CartPanel, various modals
│   ├── panels/        # SettingsPanel, MenuManagementPanel
│   ├── reports/       # Report components
│   ├── sections/      # TableSection
│   └── ui/            # Base UI components (shadcn/ui)
├── contexts/          # AuthContext, OrderContext, MenuContext, etc.
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
- ⚠️ SSL handshake issue with Cloudflare (infrastructure)

## Documentation
Located in `/app/docs/`:
- `API_MAPPING.md` - Complete API field mappings
- `BACKEND_CLARIFICATIONS.md` - Backend Q&A and gaps
- `CHANGELOG.md` - Feature changelog
- `CHANGE_MANAGEMENT.md` - Detailed change tracking
- `ROLES_DEFINITION.md` - RBAC permissions
- `ORDER_REPORT_CLARIFICATIONS.md` - Report-specific gaps
