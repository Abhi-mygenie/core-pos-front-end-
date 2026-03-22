# Restaurant POS Frontend - PRD

## Original Problem Statement
1. Pull code from repo `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch: 22-1-march-)
2. Build project as-is
3. Fix drag & drop for menu items
4. Update API endpoints to use correct vendor-specific endpoints
5. Remove demo data - show only real API data for logged-in restaurants

## Architecture
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI
- **Backend API**: `https://preprod.mygenie.online` (external)
- **State**: React Context (AuthContext, TableOrderContext)

## API Endpoints Updated (Jan 2026)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/v1/auth/vendoremployee/login` | POST | Authentication | ✅ Working |
| `/api/v2/vendoremployee/vendor-profile/profile` | GET | Vendor profile | ✅ Working |
| `/api/v1/vendoremployee/get-categories` | GET | Categories (vendor-specific) | ✅ UPDATED |
| `/api/v1/vendoremployee/get-products-list` | GET | Products (with category_id) | ✅ UPDATED |

### API Changes Made
1. **Categories**: Changed from `/api/v1/categories` to `/api/v1/vendoremployee/get-categories`
   - Now returns only categories for logged-in vendor's restaurant
   - No need for frontend filtering by restaurant_id

2. **Products**: Added `category_id` parameter
   - Server-side filtering instead of fetching all 200 products
   - Proper pagination with `limit`, `offset`, `category_id`, `type`

## What's Been Implemented

### Phase 1: Setup ✅
- Cloned from GitHub branch 22-1-march-
- Dependencies installed via yarn
- Production build successful

### Phase 2: Bug Fixes ✅
- Fixed product drag & drop (was only working for categories)
- Root cause: `handleProductDragEnd` was operating on paginated subset incorrectly
- Solution: Proper state update with `food_order` persistence

### Phase 3: API Updates ✅
- Updated `getCategories()` to use vendor-specific endpoint
- Updated `getProducts()` to support `category_id` parameter
- Implemented server-side pagination and filtering
- Removed client-side category filtering (now handled by API)

## File Changes

| File | Changes |
|------|---------|
| `/frontend/src/services/api.js` | Updated endpoints |
| `/frontend/src/components/menu/MenuManagementPanel.jsx` | Server-side filtering, fixed DnD |

## Test Credentials
- Email: owner@18march.com
- Password: Qplazm@10

## Current Status
- ✅ Login working
- ✅ Categories loading from vendor API
- ✅ Products loading with server-side filtering
- ✅ Category click filters products via API
- ✅ Pagination working server-side
- ✅ Drag & drop for categories working
- ✅ Drag & drop for products fixed

## Backlog
- P1: Category product counts (API doesn't return count field)
- P2: Form validation for all inputs
- P2: Image upload to server (currently base64 preview)
- P3: Refactor MenuManagementPanel.jsx (still 1000+ lines)
