# Core POS Frontend - PRD

## Original Problem Statement
- Pull code from https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: April-phase-3-socket
- React app only (no backend)
- Build and run as is
- No testing agent required

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

## What's Been Implemented (April 3, 2026)
1. Cloned repository from `April-phase-3-socket` branch
2. Installed all dependencies via yarn
3. Disabled visual-edits plugin (causing webpack resolution issues)
4. Created `.env` file with external API URLs:
   - REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
   - REACT_APP_SOCKET_URL=https://presocket.mygenie.online
5. App running successfully on port 3000

### Bug Fix: Update Order Tax Calculation (April 3, 2026)
**Issue:** When editing an order (adding new items), only the final total amount was being sent without proper tax breakup.

**Root Cause:** `toAPI.updateOrder()` in `orderTransform.js` was sending a simplified payload without per-item tax calculations.

**Fix Applied:**
- Updated `toAPI.updateOrder()` to include proper tax calculation (same as `collectBill`)
- Now sends per-item breakup: `food_amount`, `gst_amount`, `vat_amount`, `tax_amount`, `total_price`
- Now sends order-level fields: `order_sub_total_amount`, `order_total_tax_amount`
- Removed manual `total` calculation from `OrderEntry.jsx` - transform handles it internally

**Files Modified:**
- `/app/frontend/src/api/transforms/orderTransform.js` - `toAPI.updateOrder()` function
- `/app/frontend/src/components/order-entry/OrderEntry.jsx` - `handlePlaceOrder()` function

### Bug Fix: Partial Cancel 404 Error (April 3, 2026)
**Issue:** Partial item cancellation was returning 404 error.

**Root Cause:** `handleCancelFood()` was using a separate endpoint for partial cancel (`/api/v2/vendoremployee/partial-cancel-food-item`) which doesn't exist.

**Fix Applied:**
- Both full and partial cancel now use the same endpoint: `/api/v2/vendoremployee/cancel-food-item`
- Partial cancel includes the `cancel_qty` field in the payload to differentiate from full cancel

**File Modified:**
- `/app/frontend/src/components/order-entry/OrderEntry.jsx` - `handleCancelFood()` function

### Bug Fix: Cart Items Missing Proper IDs After Place/Update Order (April 3, 2026)
**Issue:** After placing/updating an order, newly placed items retained their menu `productId` as `id` instead of getting the proper `order line item ID` from the API. This caused partial cancel to fail with "order_food_id field is required".

**Root Cause:** When items are added from menu, they have `id = productId` (food catalog ID). After placing order, the code only marked `placed: true` but didn't fetch the proper `orderDetails[].id` from the API.

**Fix Applied:**
- After successful place/update order, fetch fresh order data from API using `fetchSingleOrderForSocket()`
- Replace cart items with API-returned items that have proper `id` (order line item ID) and `foodId` (food catalog ID)
- Added fallback to mark items as placed if API refresh fails

**File Modified:**
- `/app/frontend/src/components/order-entry/OrderEntry.jsx` - `handlePlaceOrder()` function

## Current Status
- Frontend: RUNNING (localhost:3000)
- App displays MyGenie Restaurant POS login page
- Connected to external MyGenie API (preprod environment)

## Key Features (from codebase analysis)
- Login/Authentication
- Menu management (categories, products)
- Table management (table/room operations)
- Order management (place, update, cancel orders)
- Payment processing
- Real-time updates via Socket.io
- Reports (paid orders, cancelled orders, credit orders, etc.)

## Environment Configuration
```
REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
REACT_APP_SOCKET_URL=https://presocket.mygenie.online
```

## Next Steps
- Login with valid credentials to test full functionality
- Preview URL routing issue may need platform support

---

## Changelog

### April 3, 2026 - Update Order Tax Calculation Fix

#### Problem
When editing an existing order (adding new items), the API was receiving incorrect data:
- Only final `order_amount` was sent as a raw total
- Missing per-item tax breakup (`food_amount`, `gst_amount`, `tax_amount`, `total_price`)
- Missing order-level tax fields (`order_sub_total_amount`, `order_total_tax_amount`)

#### Solution
Updated `toAPI.updateOrder()` in `orderTransform.js` to mirror the calculation logic from `collectBill()`:

**Per-item fields now included:**
| Field | Description |
|-------|-------------|
| `food_amount` | Base price × quantity |
| `gst_amount` | GST tax amount (if GST type) |
| `vat_amount` | VAT tax amount (if VAT type) |
| `tax_amount` | Total tax for the item |
| `total_price` | food_amount + tax (for exclusive) |

**Order-level fields now included:**
| Field | Description |
|-------|-------------|
| `order_amount` | Calculated from cart items |
| `order_sub_total_amount` | Sum of all item totals |
| `order_total_tax_amount` | Sum of all item taxes |

#### Files Modified
1. `src/api/transforms/orderTransform.js` - Added `buildCartItem()` helper with tax logic to `updateOrder()`
2. `src/components/order-entry/OrderEntry.jsx` - Removed manual `total` calculation from `handlePlaceOrder()`

### April 3, 2026 - Partial Cancel 404 Fix

#### Problem
Partial item cancellation (cancelling some but not all quantity) was returning a 404 error.

#### Root Cause
The code was using two different endpoints:
- Full cancel: `/api/v2/vendoremployee/cancel-food-item` ✅
- Partial cancel: `/api/v2/vendoremployee/partial-cancel-food-item` ❌ (404 - doesn't exist)

#### Solution
Both full and partial cancel now use the same endpoint (`/api/v2/vendoremployee/cancel-food-item`).
The only difference is the payload - partial cancel includes `cancel_qty` field.

#### File Modified
- `src/components/order-entry/OrderEntry.jsx` - Updated `handleCancelFood()` to use `CANCEL_ITEM_FULL` endpoint for both scenarios

### April 3, 2026 - Cart Items Missing Proper IDs After Place Order

#### Problem
After placing/updating an order, partial cancel failed with "order_food_id field is required" error.

#### Root Cause
When items are added from menu, they have:
- `id` = productId (food catalog ID like 146566)
- `foodId` = undefined

After placing order, the code only marked `placed: true` but didn't fetch the proper IDs from API:
- `id` should be order line item ID (like 1900414)
- `foodId` should be food catalog ID (like 146564)

#### Solution
After successful place/update order:
1. Fetch fresh order data from API using `fetchSingleOrderForSocket(orderId)`
2. Replace cart items with API-returned items that have proper `id` and `foodId`
3. Added fallback to mark items as placed if API refresh fails

#### File Modified
- `src/components/order-entry/OrderEntry.jsx` - Updated `handlePlaceOrder()` to refresh cart items from API after success

### April 3, 2026 - Cart Always Update from API (Final Fix)

#### Problem
After place/update order, cart was falling back to local updates when API refresh failed, causing items to retain wrong IDs.

#### Root Cause
The previous fix had fallback logic that just marked items as `placed: true` locally without getting proper IDs from API. This meant:
- `item.id` stayed as productId (food catalog ID)
- `item.foodId` remained undefined
- Cancel operations failed

#### Solution
1. **Removed all local fallbacks** - Cart now ONLY updates from API response
2. **Added 500ms delay** before fetching to allow API to process new items
3. **Added retry logic** if first fetch returns no items
4. **Updated `handleCancelFood()`** to refresh cart from API after cancel success (instead of local filter/update)

#### Key Principle
> Cart items should ONLY be updated from API response, never locally (except for adding unplaced items from menu)

#### Files Modified
- `src/components/order-entry/OrderEntry.jsx`:
  - `handlePlaceOrder()` - Removed local fallbacks, added delay + retry
  - `handleCancelFood()` - Refresh cart from API after cancel success

### April 3, 2026 - Cancel Order Clears Table Immediately

#### Problem
After cancelling a complete order, the table remained occupied because the order was not removed from context.

#### Root Cause
`handleCancelOrder()` only cancelled items via API and closed the modal. It did not update the `OrderContext`, so the order still existed in memory.

#### Solution
After cancelling all items, call `removeOrder(orderId)` to immediately remove the order from context. This clears the table right away without waiting for socket events.

#### File Modified
- `src/components/order-entry/OrderEntry.jsx`:
  - Added `removeOrder` to useOrders import
  - Updated `handleCancelOrder()` to call `removeOrder(orderId)` after API calls
