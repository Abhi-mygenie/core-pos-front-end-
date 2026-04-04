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

### April 3, 2026 - API Financials for Bill Summary

#### Problem
Bill Summary (CollectPaymentPanel) was calculating totals locally from cartItems, including cancelled items. This caused:
- Wrong item total (₹120 instead of ₹0 after cancellation)
- Cancelled items shown without strikethrough
- Totals not matching API values

#### Solution
1. **OrderEntry.jsx:**
   - Added `orderFinancials` state to store API values (amount, subtotalAmount, subtotalBeforeTax)
   - Initialize from orderData when opening existing order
   - Update after place/update order API refresh
   - Update after cancel item API refresh
   - Pass `orderFinancials` and `hasPlacedItems` to CollectPaymentPanel

2. **CollectPaymentPanel.jsx:**
   - Added `orderFinancials` and `hasPlacedItems` props
   - Filter `activeItems` (non-cancelled) and `cancelledItems` separately
   - Use `activeItems` for all calculations (tax, bar/kitchen totals)
   - For placed orders, use API `orderFinancials.subtotalBeforeTax` for itemTotal
   - Show cancelled items with strikethrough styling

#### Files Modified
- `src/components/order-entry/OrderEntry.jsx`
- `src/components/order-entry/CollectPaymentPanel.jsx`

### April 4, 2026 - Update Order Complete Totals

#### Problem
When editing an existing order (adding new items), the update order payload was only sending the NEW items' totals, not the complete order totals.

**Example:**
- Existing order: ₹150
- New item added: ₹75
- Payload was sending: `order_amount: 75` ❌
- Should send: `order_amount: 225` ✅

#### Solution
1. **OrderEntry.jsx:** Pass `existingOrderTotal` and `existingSubtotal` from `orderFinancials` to the `updateOrder` transform
2. **orderTransform.js:** Calculate complete order totals = existing (from API) + new items

#### Files Modified
- `src/components/order-entry/OrderEntry.jsx` - Pass `orderFinancials` to updateOrder
- `src/api/transforms/orderTransform.js` - Calculate complete order totals in updateOrder

---

## Backend Clarifications / Known Limitations

### 1. Get Single Order API Does NOT Return Financial Data for New Orders
**Issue:** After placing a new order, `get-single-order-new` API returns `order_amount: 0`, `order_sub_total_amount: 0` etc.

**Root Cause:** The API doesn't have the financial data populated immediately after order creation.

**Solution:** Use socket's `new-order` event payload instead of API call. Socket contains complete order data including:
- `order_amount`
- `order_sub_total_amount`
- `order_sub_total_without_tax`
- `orderDetails` with proper item IDs

**Impact:**
- ❌ Cannot use API fallback for place order
- ✅ Socket `new-order` is the ONLY source of truth for newly placed orders
- ✅ Update Order and Cancel Item can still use API (order already exists)

### April 4, 2026 - Place Order Uses Socket Instead of API

#### Problem
After placing a new order, we were calling `get-single-order-new` API to refresh cart with proper IDs and financials. But API returns `order_amount: 0` for newly placed orders.

#### Solution
1. **Place Order:** Use socket's `new-order` event (contains complete data)
   - Mark items as placed locally after API success
   - Add useEffect to sync from OrderContext when socket updates
   - Socket payload has proper IDs and financials

2. **Update Order:** Keep using API (order already exists, API has data)

3. **Cancel Item:** Keep using API (order already exists)

#### Files Modified
- `src/components/order-entry/OrderEntry.jsx`:
  - Removed `fetchSingleOrderForSocket` call after place order
  - Added useEffect to sync from OrderContext when socket updates
  - Kept API refresh for Update Order only

### April 4, 2026 - Update Order: Remove Duplicate API Call (BUG-201)

#### Problem
When adding items to an existing order, `get-single-order-new` was called **twice**:
- Call 1: `OrderEntry.jsx` called `fetchSingleOrderForSocket` directly after API success (500ms delay + retry)
- Call 2: Socket handler (`handleUpdateOrder`) called `fetchSingleOrderForSocket` after receiving `update-order` event

#### Solution
1. **Removed** direct `fetchSingleOrderForSocket` call from `handlePlaceOrder`'s Update Order path
2. **Added** optimistic local marking: unplaced items get `placed: true` immediately
3. **Expanded `useEffect`** to sync from OrderContext on any financial change (not just when local is 0)
   - Before: `contextHasFinancials && localMissingFinancials` (new order only)
   - After: `contextAmount !== localAmount || contextSubtotal !== localSubtotal` (new + update)
4. **Added** unplaced item preservation during sync

#### Key Learning
- For Update Order: server emits ONLY `update-order` socket (NOT `update-food-status`)
- `update-food-status` is for kitchen status changes only

#### Current Status
Fix applied. If user still sees 2 calls, it's either cached JS (needs hard refresh) or duplicate socket listener registration (needs investigation in `useSocketEvents.js`).

#### Files Modified
- `src/components/order-entry/OrderEntry.jsx`:
  - `handlePlaceOrder()` — removed `fetchSingleOrderForSocket` for update path
  - `useEffect` — expanded sync condition to cover update order

### Open Bugs (see /app/memory/BUGS.md for full details)
- **BUG-201**: Duplicate API calls on Update Order (P0, IN PROGRESS)
- **BUG-202**: Duplicate API calls on Cancel Item (P0, NOT STARTED)
- **BUG-203**: Redundant `update-table` socket handling (P1, NOT STARTED)
- **BUG-204**: `order_sub_total_without_tax` returns 0 from backend (P1, BLOCKED on backend team)
