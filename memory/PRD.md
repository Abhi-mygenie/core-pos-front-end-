# Core POS Frontend - Project Documentation

## Original Problem Statement
1. Pull code from default branch of https://github.com/Abhi-mygenie/core-pos-front-end-.git
2. It's just frontend code
3. Run as-is, don't run testing agent

## Project Overview
- **Type**: Frontend-only React application (Restaurant POS System)
- **Brand**: MyGenie POS
- **Tech Stack**: React 19, Craco, Tailwind CSS, Radix UI, DnD Kit
- **API Base**: `https://preprod.mygenie.online`

---

## Architecture

### Data Flow
```
Login → loadInitialData(token) → 5 API Calls (ONCE)
    ├── GET /all-table-list      → tables[], rooms[]
    ├── GET /get-categories      → categories[]
    ├── GET /get-products-list   → products[]
    ├── GET /cancellation-reasons → cancellationReasons[]
    └── POST /station-order-list → orders[] (split by type)

InitialDataContext (Single Source of Truth)
    ├── DashboardPage (tables, rooms, orders)
    ├── MenuManagementPanel (categories, products)
    ├── OrderEntry (categories, products)
    ├── TableManagementForm (tables, rooms)
    └── CancellationReasonsForm (cancellationReasons)
```

### Key Contexts
- **AuthContext**: Login, logout, token management
- **InitialDataContext**: All preloaded data, loading states, retry logic
- **TableOrderContext**: Order state management (being migrated to use real API data)

---

## What's Been Implemented

### Date: March 2026

#### 1. Initial Setup
- Cloned repository from GitHub
- Installed dependencies, configured React frontend
- Frontend running on port 3000

#### 2. API Single-Load Architecture
- All APIs called ONCE at login (not on each component mount)
- Client-side filtering for Menu Management, Order Entry
- Removed all fallback/duplicate API calls
- Auto-load on page refresh (if token exists)

#### 3. Error Handling & UX
- **Retry Mechanism**: Max 3 retries with 2-second delay
- **401 Handling**: Clears token, redirects to login (no retry)
- **Loading UI**: Shows detailed progress ("12 Tables loaded", "7 Categories loaded")
- **Skip auto-load on login page**: Prevents unnecessary API calls

#### 4. Logout Improvements
- `resetData()` called on logout to clear all cached data
- Prevents data leakage between user sessions

#### 5. Orders API Integration
- **Endpoint**: POST `/api/v1/vendoremployee/station-order-list`
- **Body**: `role_name: "KDS"` (form-data)
- **Transform**: API orders → UI format with status mapping
- **Split**: Orders split by type (delivery, takeAway, dineIn)

#### 6. Status Mapping
| Code | Status Key | UI Label |
|------|------------|----------|
| 1 | preparing | Preparing |
| 2 | ready | Ready |
| 3 | cancelled | Cancelled |
| 5 | served | Served |
| 6 | paid | Paid |
| 7 | pending | Yet to Confirm |

#### 7. Table View Integration
- Tables now display real dine-in order data
- Shows: Customer name, amount, time, waiter, order status
- Status derived from order: pending→yetToConfirm, preparing→occupied, ready→billReady

#### 8. Order View Integration
- Delivery and TakeAway sections use real API orders
- Search works with real order data

---

## Files Created/Modified

### New Files
- `/constants/orderStatus.js` - Status mapping constants
- `/utils/orderTransformer.js` - API → UI order transformer

### Modified Files
- `/services/api.js` - Added orderAPI, debug logging
- `/context/InitialDataContext.jsx` - Orders loading, retry logic, auto-load
- `/context/AuthContext.jsx` - Token handling
- `/pages/DashboardPage.jsx` - Real orders integration
- `/pages/LoginPage.jsx` - Fixed token path (result.data.token)
- `/components/cards/TableCard.jsx` - Real order data display
- `/components/cards/DeliveryCard.jsx` - Order card display
- `/components/common/InitialLoadingOverlay.jsx` - Detailed loading stats
- `/components/layout/Sidebar.jsx` - resetData on logout
- `/components/menu/MenuManagementPanel.jsx` - Client-side filtering
- `/components/order-entry/OrderEntry.jsx` - Preloaded data only
- `/components/settings/TableManagementForm.jsx` - Preloaded data only
- `/components/settings/CancellationReasonsForm.jsx` - Preloaded data only

---

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/auth/vendoremployee/login` | POST | Login, get token |
| `/api/v2/vendoremployee/vendor-profile/profile` | GET | User/Restaurant profile |
| `/api/v1/vendoremployee/all-table-list` | GET | Tables & Rooms |
| `/api/v1/vendoremployee/get-categories` | GET | Menu categories |
| `/api/v1/vendoremployee/get-products-list` | GET | Menu products |
| `/api/v1/vendoremployee/cancellation-reasons` | GET | Cancellation reasons |
| `/api/v1/vendoremployee/station-order-list` | POST | Running orders |

---

## Pending / Backlog

### P0 - Critical
- [ ] Test complete order flow with real data
- [ ] Verify all order types display correctly

### P1 - High Priority
- [ ] Manual refresh button for orders
- [ ] Order status update API integration
- [ ] Rider info for delivery orders
- [ ] OTP field for ready orders

### P2 - Medium Priority
- [ ] Auto-refresh polling for orders
- [ ] WebSocket real-time updates
- [ ] Swiggy/Zomato source integration
- [ ] Multi-station support

### P3 - Low Priority
- [ ] Remove/wrap debug console.logs for production
- [ ] Split large components (MenuManagementPanel 1162 lines)
- [ ] Move hardcoded URLs to env variables

---

## User Personas

1. **Restaurant Owner** - Full access, settings, reports
2. **Manager** - Order management, table management
3. **Waiter** - Table orders, order entry
4. **KDS Staff** - Kitchen display, order status updates

---

## Console Debug Logs

When enabled, logs show:
```
🌐 [API] GET /api/v1/vendoremployee/all-table-list
✅ [API Response] GET /api/... (200)
🔵 [InitialDataContext] Loaded 12 tables, 3 rooms
🔵 [InitialDataContext] Starting data load (Attempt 1/3)
```

---

## Environment Variables

```env
REACT_APP_API_URL=https://preprod.mygenie.online
REACT_APP_BACKEND_URL=https://[preview-url].preview.emergentagent.com
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

---

## Next Session Tasks

1. Test login flow and verify all data loads
2. Verify Table View shows orders on Table 3 and Table 5
3. Verify Order View shows Delivery and TakeAway orders
4. Implement manual refresh button for orders
5. Continue with order status update integration
