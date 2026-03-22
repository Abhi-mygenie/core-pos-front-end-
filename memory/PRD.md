# Restaurant POS Frontend - PRD

## Original Problem Statement
1. Pull code from repo `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch: 22-1-march-)
2. Build project as-is
3. Fix drag & drop for menu items
4. Update API endpoints to use correct vendor-specific endpoints
5. Remove demo data - show only real API data for logged-in restaurants
6. Integrate Order Entry with same APIs as Menu Management
7. Add Table Management in Settings
8. Add Cancellation Reasons Management in Settings
9. Implement post-login data preloading with progress bar
10. All components use preloaded data from context

## Architecture
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI
- **Backend API**: `https://preprod.mygenie.online` (external)
- **State**: React Context (AuthContext, TableOrderContext, InitialDataContext)

---

## API Endpoints

### Authentication
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/auth/vendoremployee/login` | POST | Login, returns JWT token |
| `/api/v2/vendoremployee/vendor-profile/profile` | GET | Vendor profile & permissions |

### Menu Management
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/vendoremployee/get-categories` | GET | Categories (vendor-specific) |
| `/api/v1/vendoremployee/get-products-list?limit=X&offset=Y&type=Z&category_id=N` | GET | Products with filtering |

### Table Management
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/vendoremployee/all-table-list` | GET | All tables with engage status |
| `/api/v1/vendoremployee/get-table-list` | GET | Only free/available tables |

### Settings
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/vendoremployee/cancellation-reasons?limit=50&offset=1` | GET | Cancellation reasons |

---

## What's Been Implemented

### Phase 1: Setup ✅
- Cloned from GitHub branch 22-1-march-
- Dependencies installed via yarn
- Production build successful

### Phase 2: Bug Fixes ✅
- Fixed product drag & drop in Menu Management
- Root cause: `handleProductDragEnd` was operating on paginated subset incorrectly

### Phase 3: API Updates ✅
- Updated `getCategories()` to use `/api/v1/vendoremployee/get-categories`
- Updated `getProducts()` to support `category_id` parameter for server-side filtering
- Removed client-side category filtering in Menu Management

### Phase 4: Mock Data Removal ✅
- Cleared mock data from DashboardPage (tables, orders, rooms)
- Cleared mock data from Order Entry (menu categories, menu items)
- All screens now show only real API data

### Phase 5: Order Entry API Integration ✅
- OrderEntry.jsx fetches categories and products from API
- Products transformed to menu item format
- CategoryPanel shows dynamic categories
- MenuItemsGrid shows products with "Customize" tag

### Phase 6: Dashboard Table Integration ✅
- Dashboard fetches tables from `all-table-list` API
- Tables separated by `rtype`: TB (Tables), RM (Rooms)
- Grouped by section using `title` field
- `engage` status determines occupied/available

### Phase 7: Settings - Table Management ✅
- Created TableManagementForm.jsx
- Lists tables and rooms from API
- Grouped by sections (Main, out, in)
- Separate "Add New Table" / "Add New Room" buttons
- Edit/Delete buttons (CRUD APIs pending)

### Phase 8: Settings - Cancellation Reasons ✅
- Created CancellationReasonsForm.jsx
- Table view with columns: Reason, Applies To, Status, Actions
- Applies To options: Order, Item, All
- Color-coded badges for item types
- Add/Edit modal with form fields

### Phase 9: Data Preloading ✅
- Created InitialDataContext for centralized data management
- Created InitialLoadingOverlay with progress bar
- Minimum 2-second loading time for visible progress
- Visual step indicators: ✓ Completed, ● In progress, ○ Pending

### Phase 10: Preloaded Data Usage ✅
- All components now use preloaded data from context
- Added "Reload All" button in Sidebar (green)
- Fallback fetching if data not preloaded

---

## File Structure

### New Files Created
```
/frontend/src/
├── context/
│   └── InitialDataContext.jsx      # Centralized data preloading
├── components/
│   ├── common/
│   │   └── InitialLoadingOverlay.jsx   # Loading progress UI
│   └── settings/
│       ├── TableManagementForm.jsx     # Table/Room CRUD
│       └── CancellationReasonsForm.jsx # Cancellation reasons CRUD
```

### Files Modified
```
/frontend/src/
├── App.js                          # Added InitialDataProvider
├── services/api.js                 # Added tableAPI, cancellationAPI
├── pages/
│   ├── LoginPage.jsx               # Triggers data preload after login
│   └── DashboardPage.jsx           # Uses preloaded tables
├── components/
│   ├── layout/
│   │   └── Sidebar.jsx             # Added "Reload All" button
│   ├── menu/
│   │   └── MenuManagementPanel.jsx # Uses preloaded data
│   ├── order-entry/
│   │   ├── OrderEntry.jsx          # Uses preloaded data
│   │   ├── CategoryPanel.jsx       # Accepts categories prop
│   │   └── MenuItemsGrid.jsx       # Supports hasCustomization
│   └── settings/
│       └── SettingsPanel.jsx       # Added Table Mgmt & Cancellation items
```

---

## Data Flow

```
Login Success
    ↓
Loading Overlay (2+ seconds)
    ↓
Preload ALL data:
  ✓ Tables (25%) - all-table-list
  ✓ Categories (50%) - get-categories  
  ✓ Products (75%) - get-products-list (500 items)
  ✓ Settings (100%) - cancellation-reasons
    ↓
Store in InitialDataContext
    ↓
Navigate to Dashboard
    ↓
All components use shared context (instant loading!)
```

---

## Sidebar Buttons

| Button | Color | Action |
|--------|-------|--------|
| **Refresh** | Orange | Refresh orders (TBD - waiting for orders API) |
| **Reload All** | Green | Reload all preloaded settings data |

---

## Settings Menu

| Item | Description | Status |
|------|-------------|--------|
| Basic Info | Name, Logo, Contact, Address | Existing |
| **Table Management** | Tables, Rooms, Sections | ✅ NEW |
| Operating Hours | Weekly schedule | Existing |
| Features | Dine-in, Delivery, Takeaway | Existing |
| Payment Settings | UPI, Card, Cash | Existing |
| Tax & Charges | GST, Service Charge | Existing |
| Printers | KOT, Bill Config | Existing |
| Discounts | Discount management | Existing |
| Terms & Conditions | Bill T&C | Existing |
| **Cancellation Reasons** | Order & Item cancellation | ✅ NEW |

---

## Test Credentials
- Email: owner@18march.com
- Password: Qplazm@10

---

## Current Status

### ✅ Working
- Login with JWT authentication
- Dashboard with real tables from API
- Menu Management with server-side filtering
- Order Entry with preloaded menu data
- Table Management UI (read-only)
- Cancellation Reasons UI (read-only)
- Data preloading with progress bar
- "Reload All" button for manual refresh

### ⏳ Pending (Waiting for APIs)
- Table CRUD operations (Add/Edit/Delete)
- Cancellation Reasons CRUD operations
- Orders API for dashboard
- Employees/Waiters API for name lookup
- "Refresh" button for orders

---

## Backlog

### P0 - Critical
- Orders API integration for Dashboard
- Show order details on occupied tables

### P1 - Important  
- CRUD APIs for Table Management
- CRUD APIs for Cancellation Reasons
- Waiter name lookup (currently showing ID)

### P2 - Nice to Have
- Form validation for all inputs
- Image upload to server
- Real-time order notifications (WebSocket)

### P3 - Future
- Refactor large components (MenuManagementPanel 1200+ lines)
- Performance optimization
- Offline mode support

---

## Notes
- All CUD operations are placeholder (toast: "API not yet implemented")
- Read operations fully functional with real API
- Preloaded data shared via React Context
- Fallback fetching if context data not available
