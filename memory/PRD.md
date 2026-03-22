# Restaurant POS Frontend - PRD

## Original Problem Statement
1. Pull code from repo `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch: 22-1-march-)
2. Build project as-is
3. Fix drag & drop for menu items
4. Update API endpoints to use correct vendor-specific endpoints
5. Remove demo data - show only real API data for logged-in restaurants
6. Integrate Order Entry with same APIs as Menu Management

## Architecture
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI
- **Backend API**: `https://preprod.mygenie.online` (external)
- **State**: React Context (AuthContext, TableOrderContext)

## API Endpoints (All Updated)

| Endpoint | Method | Purpose | Used In |
|----------|--------|---------|---------|
| `/api/v1/auth/vendoremployee/login` | POST | Authentication | Login |
| `/api/v2/vendoremployee/vendor-profile/profile` | GET | Vendor profile | Dashboard |
| `/api/v1/vendoremployee/get-categories` | GET | Categories (vendor-specific) | Menu Mgmt, Order Entry |
| `/api/v1/vendoremployee/get-products-list` | GET | Products (with category_id) | Menu Mgmt, Order Entry |

## What's Been Implemented (Jan 2026)

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
- OrderEntry.jsx now fetches categories from `menuAPI.getCategories()`
- OrderEntry.jsx now fetches products from `menuAPI.getProducts()`
- Products transformed to menu item format with proper mapping:
  - `id`, `name`, `price` → direct mapping
  - `veg/egg` → `type` (veg/egg/nonveg)
  - `variations` → `hasCustomization`
- CategoryPanel shows dynamic categories from API
- MenuItemsGrid shows products with "Customize" tag for items with variations
- Loading state added while fetching menu data

## Files Changed

| File | Changes |
|------|---------|
| `/frontend/src/services/api.js` | Updated endpoints, added category_id param |
| `/frontend/src/components/menu/MenuManagementPanel.jsx` | Server-side filtering, fixed DnD |
| `/frontend/src/pages/DashboardPage.jsx` | Removed mock data, empty initial state |
| `/frontend/src/hooks/useMenuFilter.js` | Accept menuItems as param |
| `/frontend/src/components/order-entry/CategoryPanel.jsx` | Accept categories prop, show "All" + dynamic categories |
| `/frontend/src/components/order-entry/OrderEntry.jsx` | Fetch categories & products from API |
| `/frontend/src/components/order-entry/MenuItemsGrid.jsx` | Support hasCustomization from API |

## Current Status ✅
- ✅ Login working
- ✅ Menu Management - Categories & Products from API
- ✅ Menu Management - Server-side pagination & filtering
- ✅ Menu Management - Drag & drop working
- ✅ Order Entry - Categories from API
- ✅ Order Entry - Products from API
- ✅ Order Entry - Category filtering working
- ✅ Dashboard - Empty (no mock data)

## Test Credentials
- Email: owner@18march.com
- Password: Qplazm@10

## Backlog
- P1: Dashboard APIs (Tables, Orders, Rooms) - endpoints needed
- P2: Form validation for settings
- P2: Image upload to server
- P3: Refactor large components
