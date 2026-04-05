# POS Frontend - API Mapping Audit & Refactor Document

**Last Updated:** April 4, 2026

---

## 1. REST API Endpoint Mapping

### Auth & Profile
| Endpoint | Method | Constant | Transform | Called From |
|----------|--------|----------|-----------|-------------|
| `/api/v1/auth/vendoremployee/login` | POST | `LOGIN` | `authTransform.js` | `AuthContext.jsx` |
| `/api/v2/vendoremployee/vendor-profile/profile` | GET | `PROFILE` | `profileTransform.js` | `LoadingPage.jsx` |

### Menu & Catalog
| Endpoint | Method | Constant | Transform | Called From |
|----------|--------|----------|-----------|-------------|
| `/api/v1/vendoremployee/get-categories` | GET | `CATEGORIES` | `categoryTransform.js` | `LoadingPage.jsx` → `MenuContext` |
| `/api/v1/vendoremployee/get-products-list` | GET | `PRODUCTS` | `productTransform.js` | `LoadingPage.jsx` → `MenuContext` |
| `/api/v2/vendoremployee/buffet/buffet-popular-food` | GET | `POPULAR_FOOD` | `productTransform.js` | `LoadingPage.jsx` → `MenuContext` |
| `/api/v1/vendoremployee/add-single-product` | POST | `ADD_CUSTOM_ITEM` | `orderTransform.js` (`customItemFromAPI`) | `OrderEntry.jsx` |

### Table Operations
| Endpoint | Method | Constant | Transform | Called From |
|----------|--------|----------|-----------|-------------|
| `/api/v1/vendoremployee/all-table-list` | GET | `TABLES` | `tableTransform.js` | `LoadingPage.jsx` → `TableContext` |
| `/api/v1/vendoremployee/pos/order-table-room-switch` | POST | `ORDER_TABLE_SWITCH` | `tableTransform.js` (`shiftTable`) | `OrderEntry.jsx` → `handleShift` |
| `/api/v2/vendoremployee/transfer-order` | POST | `MERGE_ORDER` | `tableTransform.js` (`mergeTable`) | `OrderEntry.jsx` → `handleMerge` |
| `/api/v2/vendoremployee/transfer-food-item` | POST | `TRANSFER_FOOD` | `tableTransform.js` (`transferFood`) | `OrderEntry.jsx` → `handleTransfer` |

### Order Operations
| Endpoint | Method | Constant | Transform | Called From |
|----------|--------|----------|-----------|-------------|
| `/api/v2/vendoremployee/pos/place-order` | POST | `PLACE_ORDER` | `orderTransform.js` (`toAPI.placeOrder`) | `OrderEntry.jsx` → `handlePlaceOrder` |
| `/api/v2/vendoremployee/pos/update-place-order` | PUT | `UPDATE_ORDER` | `orderTransform.js` (`toAPI.updateOrder`) | `OrderEntry.jsx` → `handlePlaceOrder` (update path) |
| `/api/v2/vendoremployee/cancel-food-item` | PUT | `CANCEL_ITEM_FULL` | `orderTransform.js` (`toAPI.cancelItemFull/Partial`) | `OrderEntry.jsx` → `handleCancelFood` |
| `/api/v2/vendoremployee/food-status-update` | PUT | `CANCEL_ORDER` | `orderTransform.js` (`toAPI.cancelOrderItem`) | `OrderEntry.jsx` → `handleCancelOrder` |
| `/api/v1/vendoremployee/pos/employee-orders-list` | GET | `RUNNING_ORDERS` | `orderTransform.js` (`fromAPI.orderList`) | `orderService.js` → `getRunningOrders` |
| `/api/v2/vendoremployee/get-single-order-new` | POST | `SINGLE_ORDER_NEW` | `orderTransform.js` (`fromAPI.order`) | `orderService.js` → `fetchSingleOrderForSocket` |

### Payment Operations
| Endpoint | Method | Constant | Transform | Called From |
|----------|--------|----------|-----------|-------------|
| `/api/v1/vendoremployee/pos/place-order-and-payment` | POST | `PLACE_ORDER_AND_PAYMENT` | `orderTransform.js` (`toAPI.collectBill`) | `OrderEntry.jsx` → `CollectPaymentPanel` |
| `/api/v2/vendoremployee/order-bill-payment` | POST | `CLEAR_BILL` | `orderTransform.js` (`toAPI.clearBill`) | `OrderEntry.jsx` → `CollectPaymentPanel` |

### Room Operations
| Endpoint | Method | Constant | Transform | Called From |
|----------|--------|----------|-----------|-------------|
| `/api/v1/vendoremployee/pos/user-group-check-in` | POST | `ROOM_CHECK_IN` | — | Room check-in flow |
| `/api/v1/vendoremployee/order-shifted-room` | POST | `ORDER_SHIFTED_ROOM` | `orderTransform.js` (`toAPI.transferToRoom`) | `OrderEntry.jsx` → `CollectPaymentPanel` |

### Reports
| Endpoint | Method | Constant | Transform | Called From |
|----------|--------|----------|-----------|-------------|
| `/api/v2/vendoremployee/paid-order-list` | GET | `REPORT_PAID_ORDERS` | `reportTransform.js` | Reports page |
| `/api/v2/vendoremployee/cancel-order-list` | GET | `REPORT_CANCELLED_ORDERS` | `reportTransform.js` | Reports page |
| `/api/v2/vendoremployee/paid-in-tab-order-list` | GET | `REPORT_CREDIT_ORDERS` | `reportTransform.js` | Reports page |
| `/api/v2/vendoremployee/paid-paylater-order-list` | GET | `REPORT_HOLD_ORDERS` | `reportTransform.js` | Reports page |
| `/api/v1/vendoremployee/urbanpiper/get-complete-order-list` | GET | `REPORT_AGGREGATOR_ORDERS` | `reportTransform.js` | Reports page |
| `/api/v2/vendoremployee/employee-order-details` | GET | `REPORT_ORDER_DETAILS` | `reportTransform.js` | Reports page |
| `/api/v2/vendoremployee/daily-sales-revenue-report` | GET | `DAILY_SALES_REPORT` | — | Reports page |
| `/api/v2/vendoremployee/report/order-logs-report` | GET | `ORDER_LOGS_REPORT` | — | Reports page |

### Settings
| Endpoint | Method | Constant | Transform | Called From |
|----------|--------|----------|-----------|-------------|
| `/api/v1/vendoremployee/cancellation-reasons` | GET | `CANCELLATION_REASONS` | `settingsTransform.js` | `LoadingPage.jsx` → `SettingsContext` |

### TBD / Not Yet Active
| Endpoint | Constant | Notes |
|----------|----------|-------|
| TBD | `EDIT_ORDER_ITEM` | CHG-040: Edit placed item qty/notes |
| TBD | `EDIT_ORDER_ITEM_QTY` | CHG-040: Edit placed item qty only |
| ~~`/api/v2/vendoremployee/partial-cancel-food-item`~~ | `CANCEL_ITEM_PARTIAL` | **DEPRECATED** — 404 error. Both full and partial cancel use `CANCEL_ITEM_FULL` endpoint. `cancel_qty` field differentiates. |

---

## 2. Socket Event Mapping

### Connection
| Config | Value |
|--------|-------|
| Server URL | `REACT_APP_SOCKET_URL` (presocket.mygenie.online) |
| Transport | websocket → polling fallback |
| Reconnection | 10 attempts, 1s–30s delay |

### Channels (dynamic per restaurant)
| Channel | Format | Events Routed |
|---------|--------|---------------|
| Order channel | `new_order_{restaurantId}` | All order events below |
| Table channel | `update_table_{restaurantId}` | `update-table` only |

### Order Channel Events
| Socket Event | Handler | API Call? | Context Action | Triggered By |
|-------------|---------|-----------|----------------|--------------|
| `new-order` | `handleNewOrder` | NO (uses payload directly) | `addOrder()` | Place New Order |
| `update-order` | `handleUpdateOrder` | YES → `get-single-order-new` | `updateOrder()` | Update Order (add items) |
| `update-food-status` | `handleUpdateFoodStatus` | YES → `get-single-order-new` | `updateOrder()` | Kitchen status change (preparing→ready→served) |
| `update-order-status` | `handleUpdateOrderStatus` | YES → `get-single-order-new` | `updateOrder()` or `removeOrder()` | Cancel item, Cancel order, Payment |
| `scan-new-order` | `handleScanNewOrder` | YES → `get-single-order-new` | `addOrder()` | QR code order |
| `delivery-assign-order` | `handleDeliveryAssignOrder` | YES → `get-single-order-new` | `updateOrder()` | Delivery rider assigned |

### Table Channel Events
| Socket Event | Handler | API Call? | Context Action | Status |
|-------------|---------|-----------|----------------|--------|
| `update-table` | `handleUpdateTable` | NO (local mapping) | `updateTableStatus()` | **REDUNDANT** — see BUG-203 |

### Socket Event → User Action Mapping
| User Action | API Called | Socket Event(s) Emitted by Server |
|-------------|-----------|-----------------------------------|
| Place New Order | `POST /place-order` | `new-order` |
| Update Order (add items) | `PUT /update-place-order` | `update-order` |
| Cancel Item (full/partial) | `PUT /cancel-food-item` | `update-food-status` or `update-order-status` |
| Cancel Full Order | `PUT /food-status-update` (per item) | `update-order-status` |
| Collect Payment | `POST /order-bill-payment` | `update-order-status` (status=6, paid) |
| Kitchen status change | (external — kitchen app) | `update-food-status` |
| Table status change | (server-derived) | `update-table` |

---

## 3. Data Flow: API Call → Socket → Context → UI

### Architecture Principle
> After any order mutation (place/update/cancel/pay), the UI component (`OrderEntry.jsx`) must NOT call `get-single-order-new` directly. The socket handler is the single entry point for fetching fresh data.

### Flow Diagram
```
User Action
    ↓
OrderEntry.jsx → API Call (PUT/POST)
    ↓
Server processes → emits Socket Event
    ↓
useSocketEvents.js routes event → socketHandlers.js
    ↓
handleXxx() → fetchSingleOrderForSocket(orderId)  [if needed]
    ↓
OrderContext.updateOrder() / addOrder() / removeOrder()
    ↓
useEffect in OrderEntry.jsx detects OrderContext change
    ↓
setCartItems() + setOrderFinancials()  [local component state synced]
```

### Per-Action Data Flow

#### Place New Order
```
OrderEntry → POST /place-order → Server
    ↓ (immediate)                    ↓
Mark items placed locally      emit new-order (with full payload)
    ↓                                ↓
                              handleNewOrder → addOrder(transformedOrder)
                                     ↓
                              useEffect detects OrderContext change
                                     ↓
                              Sync cartItems + financials from context
```
**API calls to `get-single-order-new`: 0** (socket payload has everything)

#### Update Order (add items) — CURRENT (after BUG-201 fix)
```
OrderEntry → PUT /update-place-order → Server
    ↓ (immediate)                          ↓
Mark unplaced as placed locally      emit update-order
                                           ↓
                                    handleUpdateOrder → fetchSingleOrderForSocket
                                           ↓
                                    OrderContext.updateOrder(freshOrder)
                                           ↓
                                    useEffect detects financial change
                                           ↓
                                    Sync cartItems + financials from context
```
**API calls to `get-single-order-new`: 1** (socket handler only)

#### Update Order — Verified Console Flow (April 5, 2026)
Server emits on **2 channels** simultaneously for a single update-order action:
```
T+0ms:    [ORDER channel]  update-order 730308        → handleUpdateOrder → fetchSingleOrderForSocket (API call)
T+0ms:    [TABLE channel]  update-table 6238 engage   → handleUpdateTable → updateTableStatus (local only)
T+200ms:  [OrderEntry]     PUT response arrives        → marks items placed locally
T+800ms:  [socketHandlers] API response arrives        → OrderContext.updateOrder(freshOrder)
T+800ms:  [OrderEntry]     useEffect detects change    → syncs cart (190 → 310)
```
**Key finding:** `update-table` is redundant — the order data from `get-single-order-new` already contains `table_id` and `f_order_status`. Table status can be derived.
**NOTE:** Socket arrives BEFORE HTTP response (socket ~0ms, HTTP ~200ms).

#### Update Order — BEFORE fix (BUG-201)
```
OrderEntry → PUT /update-place-order → Server
    ↓ (500ms delay)                        ↓
fetchSingleOrderForSocket (CALL 1)   emit update-order
    ↓                                      ↓
setCartItems + setFinancials         handleUpdateOrder → fetchSingleOrderForSocket (CALL 2)
                                           ↓
                                    OrderContext.updateOrder(freshOrder)
```
**API calls to `get-single-order-new`: 2** (DUPLICATE — both UI and socket fetched)

#### Cancel Item — CURRENT (BUG-202 not yet fixed)
```
OrderEntry → PUT /cancel-food-item → Server
    ↓ (immediate)                        ↓
fetchSingleOrderForSocket (CALL 1)  emit update-food-status / update-order-status
    ↓                                    ↓
setCartItems + setFinancials        handleXxx → fetchSingleOrderForSocket (CALL 2)
                                         ↓
                                    OrderContext.updateOrder(freshOrder)
```
**API calls to `get-single-order-new`: 2** (DUPLICATE — same bug as BUG-201)

---

## 4. `fetchSingleOrderForSocket` — Usage Audit

| Caller | File | Line | When | Should Call? |
|--------|------|------|------|--------------|
| `handleUpdateOrder` | `socketHandlers.js` | 162 | `update-order` socket fires | YES — socket handler is the correct place |
| `handleUpdateFoodStatus` | `socketHandlers.js` | 187 | `update-food-status` socket fires | YES |
| `handleUpdateOrderStatus` | `socketHandlers.js` | 224 | `update-order-status` socket fires | YES |
| `handleScanNewOrder` | `socketHandlers.js` | 261 | `scan-new-order` socket fires | YES |
| `handleDeliveryAssignOrder` | `socketHandlers.js` | 286 | `delivery-assign-order` socket fires | YES |
| ~~`handlePlaceOrder` (update path)~~ | ~~`OrderEntry.jsx`~~ | ~~361~~ | ~~After PUT success~~ | **NO — REMOVED (BUG-201 fix)** |
| `handleCancelFood` | `OrderEntry.jsx` | 469 | After PUT cancel success | **NO — TO BE REMOVED (BUG-202)** |

### Target State
`fetchSingleOrderForSocket` should ONLY be called from `socketHandlers.js`. Zero calls from UI components.

---

## 5. Refactor Recommendations

### R1: Remove all `fetchSingleOrderForSocket` from `OrderEntry.jsx` (P0)
- **Status**: Partially done (Update Order path removed, Cancel Item path remaining)
- **Files**: `OrderEntry.jsx`
- **Impact**: Eliminates all duplicate API calls

### R2: Deprecate `update-table` socket handling (P1)
- **Status**: Not started
- **Current**: `handleUpdateTable` in `socketHandlers.js` maps socket status → `TableContext`
- **Target**: Derive table status from `OrderContext` in `TableContext` or `DashboardPage`
- **Logic**: `orders.some(o => o.tableId === id && o.status !== 'cancelled')` → occupied, else available
- **Files**: `socketHandlers.js`, `useSocketEvents.js`, `TableContext.jsx`

### R3: Remove `CANCEL_ITEM_PARTIAL` constant (P2)
- **Status**: Not started
- **Reason**: Endpoint returns 404. Both full and partial use `CANCEL_ITEM_FULL`. The constant is dead code.
- **File**: `constants.js` line 26

### R4: Clean up stale `fetchSingleOrderForSocket` import (P2)
- **When**: After BUG-202 is fixed (Cancel Item)
- **File**: `OrderEntry.jsx` line 10 — import can be removed once no UI component uses it

---

## 6. Transform File Index

| File | Direction | Functions | Used By |
|------|-----------|-----------|---------|
| `orderTransform.js` | API → FE | `fromAPI.order`, `fromAPI.orderItem`, `fromAPI.orderList` | `orderService.js`, `socketHandlers.js` |
| `orderTransform.js` | FE → API | `toAPI.placeOrder`, `toAPI.updateOrder`, `toAPI.cancelItemFull`, `toAPI.cancelItemPartial`, `toAPI.cancelOrderItem`, `toAPI.clearBill`, `toAPI.collectBill`, `toAPI.transferToRoom`, `toAPI.addCustomItem` | `OrderEntry.jsx` |
| `orderTransform.js` | API → Cart | `customItemFromAPI` | `OrderEntry.jsx` |
| `tableTransform.js` | FE → API | `toAPI.transferFood`, `toAPI.mergeTable`, `toAPI.shiftTable` | `OrderEntry.jsx` |
| `tableTransform.js` | API → FE | `fromAPI.table`, `fromAPI.tableList` | `LoadingPage.jsx` |
| `authTransform.js` | API → FE | Login response mapping | `AuthContext.jsx` |
| `categoryTransform.js` | API → FE | Category list mapping | `MenuContext.jsx` |
| `productTransform.js` | API → FE | Product list mapping | `MenuContext.jsx` |
| `profileTransform.js` | API → FE | Profile/restaurant mapping | `RestaurantContext.jsx` |
| `settingsTransform.js` | API → FE | Cancellation reasons | `SettingsContext.jsx` |
| `customerTransform.js` | API → FE | Customer search results | `CustomerModal.jsx` |
| `reportTransform.js` | API → FE | Report data mapping | Report pages |


---

## 7. Race Condition Analysis (Multi-User Concurrent Access)

**Updated:** April 5, 2026

### The Window
Between socket event received → `get-single-order-new` API in-flight → context updated, there is a ~1 second window where other users (waiters, kitchen, another POS terminal) can act on the **same order**.

### Scenarios

| # | Another user's action | Socket event fired | What happens | Risk level |
|---|----------------------|-------------------|-------------|------------|
| 1 | Kitchen marks item ready | `update-food-status` | 2 API calls for same order in-flight. Last response wins in context. If older response arrives LAST, it overwrites the newer kitchen status. | **HIGH — stale data overwrites** |
| 2 | Another waiter adds items | `update-order` | 2 `get-single-order-new` calls. Last response wins. Could temporarily overwrite other waiter's additions. | **MEDIUM — self-corrects on next event** |
| 3 | Another waiter cancels item | `update-order-status` | Cancelled item status could be overwritten by stale response from earlier call. | **MEDIUM — self-corrects on next event** |
| 4 | Customer pays | `update-order-status` (status=6) | `removeOrder` fires. But in-flight API call returns and calls `updateOrder` — re-adds paid order to context. | **HIGH — paid order reappears** |
| 5 | Table shifted | `update-table` | Marks OLD table occupied even though order moved. | **LOW — cosmetic, corrects on refresh** |

### Why This Happens
Every socket event handler for the same order independently calls `get-single-order-new`. There is **no sequencing, deduplication, or staleness check**.

```
T+0ms:    update-order fires     → API call #1 starts
T+200ms:  update-food-status fires → API call #2 starts
T+400ms:  API call #2 returns (NEWER data) → context updated ✅
T+600ms:  API call #1 returns (OLDER data) → context updated ❌ overwrites newer
```

### Backend Team Recommendations
1. **Include full order payload** in `update-order` event (like `new-order` already does) — eliminates the API call and the race entirely
2. **Include `updated_at` timestamp** in socket message — frontend can discard stale API responses
3. **Coalesce events** — if multiple events fire for same order within 500ms, send only final state

### Frontend Mitigations (without backend changes)
1. **Debounce per orderId** — multiple events within 500ms → single API fetch
2. **Timestamp comparison** — compare `updatedAt` before writing to context, reject older
3. **AbortController** — cancel in-flight API request when newer event arrives for same order
4. **Sequential queue per order** — process events one at a time per orderId

### Current Priority
For now, the ~1 second window is small and real-world collisions are rare. **Scenario #4 (paid order reappears)** is the highest risk. A simple debounce per orderId would address most cases.

---

## 8. Dual-Channel Redundancy (Backend Team Clarification Needed)

**Updated:** April 5, 2026

### Current Behavior
When the server processes an order action (place/update/cancel/pay), it emits on **2 channels simultaneously**:

| Channel | Event | Data | Handler action |
|---------|-------|------|---------------|
| `new_order_{restaurantId}` | `update-order` | `[event, orderId, restaurantId, status]` | Calls API → updates `OrderContext` |
| `update_table_{restaurantId}` | `update-table` | `[event, tableId, restaurantId, 'engage'/'free']` | Maps status → updates `TableContext` |

The `update-order` handler fetches the full order from API, which already contains `table_id` and `f_order_status` — everything needed to derive table status.

### Questions for Backend Team
1. **Is there ANY situation where a table status changes WITHOUT an order event being emitted?** (e.g., manual table reservation, table disable from admin panel)
2. **If a table goes available (order paid/cancelled), does `update-order-status` ALWAYS fire?** Or does only `update-table` fire in some edge cases?
3. **Can the frontend safely ignore `update-table` and derive table status entirely from order data?**

If the answer is "order events always accompany table changes," then the frontend can:
- Stop listening to `update_table_{restaurantId}` channel entirely
- Derive table status from `OrderContext` (active order exists → occupied, no order → available)
- Eliminate one entire socket subscription and the dual-source table status problem
