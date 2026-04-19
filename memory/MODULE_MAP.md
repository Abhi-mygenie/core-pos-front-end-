# MODULE MAP — v2

> Generated: 2026 (v2 revision) | Source: `main` branch, static code analysis
> Change from v1: adds v2 socket handlers, order-engage module, StatusConfigPage, refined print/calculation ownership, dead-code notes.

---

## 1. Module Dependency Graph (High Level)

```
                              App.js
                                │
                 ┌──────────────┼──────────────────────────────┐
                 │              │                               │
           pages/Login     pages/Loading                 pages/Dashboard
                 │              │                               │
                 │      sequential API loaders          useSocketEvents()
                 │      (profile → … → orders)               │
                 │              │                              │
                 └───→ contexts ←───────────────────────────── │
                         │                                     │
                ┌────────┴────────┐               ┌────────────┴──────────┐
                │                 │               │                       │
           api/services/*      api/socket/*   components/order-entry/*   components/cards/*
                │                 │               │                       │
         api/transforms/*  socketService    sub-components + modals   print calls
                │                 │               │
             api/axios.js    socket.io-client   …
             api/crmAxios.js
                │
        REST + CRM endpoints        Socket endpoint         FCM (firebase.js)
```

---

## 2. Module Registry

### 2.1 Pages

| Module | File | Lines | Primary contexts used | Key dependencies |
|---|---|---|---|---|
| LoginPage | `pages/LoginPage.jsx` | 274 | Auth | `authService`, `firebase.requestFCMToken` |
| LoadingPage | `pages/LoadingPage.jsx` | 529 | Auth, Restaurant, Menu, Tables, Settings, Orders, Stations | profile/category/product/table/settings/order/station services |
| DashboardPage | `pages/DashboardPage.jsx` | 1431 | All 9 | `useSocketEvents`, `useRefreshAllData`, orderService, cards, OrderEntry, Sidebar, Header, NotificationBanner |
| AllOrdersReportPage | `pages/AllOrdersReportPage.jsx` | 484 | Restaurant | reportService, reports components |
| OrderSummaryPage | `pages/OrderSummaryPage.jsx` | 517 | Restaurant | reportService, recharts |
| StatusConfigPage | `pages/StatusConfigPage.jsx` | 890 | Settings | localStorage; status visibility config — **NEW vs v1** |

### 2.2 API Layer

| Module | File | Lines | Responsibility | Owners/consumers |
|---|---|---|---|---|
| axios (REST) | `api/axios.js` | 68 | Auth-bearing HTTP client; 401 hard-redirect; `readableMessage` normalization | All `*Service.js` modules except customerService |
| crmAxios | `api/crmAxios.js` | 82 | X-API-Key HTTP client for CRM | `customerService.js` only |
| constants | `api/constants.js` | 250 | 38 endpoints, status maps, storage keys, loading order | Everything |
| index (barrel) | `api/index.js` | 4 | Re-exports | Internal |

### 2.3 Services (`api/services/*`)

| Module | Lines | Responsibility | Calls |
|---|---|---|---|
| `authService.js` | 78 | Login/logout + localStorage helpers | `/api/v1/auth/vendoremployee/login` |
| `categoryService.js` | 46 | GET categories + local `calculateItemCounts` | `CATEGORIES` |
| `customerService.js` | 178 | CRM search/lookup/create/update + addresses | CRM via `crmAxios` |
| `orderService.js` | 151 | `getRunningOrders`, `getOrderRoleParam`, `fetchSingleOrderForSocket`, `updateOrderStatus`, `confirmOrder`, `completePrepaidOrder`, `splitOrder`, `printOrder` | 8 endpoints |
| `paymentService.js` | 15 | `collectPayment` wrapper | **Broken**: uses undeclared `API_ENDPOINTS.CLEAR_BILL` (RISK-001) |
| `productService.js` | 114 | Products + popular food + helpers | `PRODUCTS`, `POPULAR_FOOD` |
| `profileService.js` | 14 | GET profile + transform | `PROFILE` |
| `reportService.js` | 588 | 16 report functions; `getOrdersByTab` dispatch; business-day range filtering | 7 report endpoints |
| `roomService.js` | 84 | Room check-in (JSON or multipart based on images) | `ROOM_CHECK_IN` |
| `settingsService.js` | 57 | Cancellation reasons | `CANCELLATION_REASONS` |
| `stationService.js` | 237 | `extractUniqueStations`, `getStationsFromOrderItems`, `fetchStationData`, localStorage config | None directly |
| `tableService.js` | 109 | GET tables + local helpers | `TABLES` |

**Dependency direction**: services → `axios`/`crmAxios` + `transforms`. Services never read React contexts.

### 2.4 Transforms (`api/transforms/*`)

| Module | Lines | Direction | Highlights |
|---|---|---|---|
| `authTransform.js` | 38 | fromAPI + toAPI | Login response → `{token, permissions}` |
| `categoryTransform.js` | 65 | fromAPI | Category list |
| `customerTransform.js` | 204 | both | CRM customer/address mapping |
| `orderTransform.js` | **1028** | both | `orderItem`, `order`, `orderList`, `toAPI.{cancelItem, cancelOrder, addCustomItem, placeOrder, updateOrder, placeOrderWithPayment, collectBillExisting, transferToRoom, updateOrderStatus, buildBillPrintPayload}` + private `buildCartItem`, `calcOrderTotals` |
| `productTransform.js` | 191 | fromAPI | Product, variant groups, addons |
| `profileTransform.js` | 206 | fromAPI | User, restaurant, features, payment types |
| `reportTransform.js` | 710 | fromAPI + filters | Business-day-aware filters, order list, merged/transferred detection |
| `settingsTransform.js` | 89 | fromAPI | Cancellation reasons |
| `tableTransform.js` | 165 | both | Table list, mergeTable, shiftTable, transferFood payloads |

### 2.5 Socket Layer (`api/socket/*`)

| Module | Lines | Responsibility |
|---|---|---|
| `socketService.js` | 365 | Singleton connection manager (connect, on/off, emit, statusListeners, logging, debug). Exposes `window.__SOCKET_SERVICE__` in development only. |
| `socketEvents.js` | 155 | Constants: `SOCKET_CONFIG`, `SOCKET_EVENTS` (12 events), `AGGREGATOR_EVENTS` (2), `CONNECTION_EVENTS`, channel generators, payload indices. Throws if `REACT_APP_SOCKET_URL` missing. |
| `socketHandlers.js` | 651 | Business logic for each event. Includes `handleNewOrder`, `handleOrderDataEvent` (unified v2 handler), `handleUpdateFoodStatus`, `handleUpdateOrderStatus`, `handleScanNewOrder`, `handleDeliveryAssignOrder`, `handleUpdateTable`, `handleOrderEngage`, `handleSplitOrder`. Also exports legacy `handleUpdateOrder` (dead code — see §5). |
| `useSocketEvents.js` | 194 | React hook that subscribes to 3 channels. Uses refs for handler actions to avoid stale closures. |
| `index.js` | 40 | Barrel re-exports |

### 2.6 Contexts (`contexts/*`)

| Module | Lines | State scope | Exposed API (condensed) |
|---|---|---|---|
| `AuthContext.jsx` | 116 | token, user, permissions | `login`, `logout`, `setUserData`, `hasPermission*`, `isAuthenticated`, `isLoading` |
| `SocketContext.jsx` | 248 | connection status | `subscribe(event, handler)`, `reconnect`, `getDebugInfo`, `setDebugMode`, `status`, `isConnected`, `isReconnecting`, `hasError`, `reconnectAttempts`, `lastConnectedAt`; also `useSocketStatus`, `useSocketEvent` |
| `NotificationContext.jsx` | 186 | FCM + sound | `notifications`, `unreadCount`, `soundEnabled`, `setSoundEnabled`, `dismissNotification`, `clearAll`, `markRead`, `simulateNotification` |
| `RestaurantContext.jsx` | 126 | restaurant config | `restaurant`, `setRestaurant`, `clearRestaurant`, `currencySymbol`, `features`, `cancellation`, `defaultOrderStatus`, `settings`, `paymentTypes`, `discountTypes`, `printers` |
| `MenuContext.jsx` | 131 | catalog | `categories`, `products`, `popularFood`, setters, `getCategoryById`, `getProductById`, `getProductsByCategory`, `searchProducts`, `filterByFoodType`, `getActiveProducts` |
| `TableContext.jsx` | 270 | tables + engage | `tables`, `sections`, `setTables`, `clearTables`, `refreshTables`, `updateTableStatus`, `setTableEngaged`, `isTableEngaged`, `waitForTableEngaged`, `getTableById`, `getTableByNumber`, `getTablesBySection`, `getTablesGroupedBySection`, `filterByStatus`, `getAvailableTables`, `getOccupiedTables`, `searchTables` |
| `SettingsContext.jsx` | 109 | cancellation + payment layout + dynamic tables | `cancellationReasons`, `paymentLayoutConfig`, `setPaymentLayoutConfig`, `enableDynamicTables`, `setEnableDynamicTables`, `getOrderCancellationReasons`, `getItemCancellationReasons`, `getReasonById` |
| `OrderContext.jsx` | 387 | orders + engage + helpers | `orders`, `isLoaded`, `setOrders`, `clearOrders`, `refreshOrders`, `addOrder`, `updateOrder`, `removeOrder`, `getOrderById`, `waitForOrderRemoval`, `waitForOrderEngaged`, `waitForOrderReady` (BUG-273), `engagedOrders`, `setOrderEngaged`, `isOrderEngaged`, computed `dineInOrders`/`takeAwayOrders`/`deliveryOrders`/`tableOrders`/`walkInOrders`, `getOrderByTableId`, `getOrdersByTableId`, `orderItemsByTableId` |
| `StationContext.jsx` | 161 | station view | `availableStations`, `enabledStations`, `stationData`, `stationViewEnabled`, `displayMode`, `setAvailableStations`, `setEnabledStations`, `setStationViewEnabled`, `setDisplayMode`, `setIsLoading`, `initializeConfig`, `saveConfig`, `updateStationData`, `setAllStationData`, `toggleStation`, `isStationEnabled` |
| `AppProviders.jsx` | 37 | composition only | See ARCHITECTURE §2 |
| `index.js` | barrel |  |

### 2.7 Components by Category

#### 2.7.1 Cards (`components/cards/*`)

| Component | Lines | Role | Notable deps |
|---|---|---|---|
| `OrderCard.jsx` | 700 | Order card for dashboard lists (delivery/takeaway/status columns) | `orderService.printOrder`, `useOrders`, permissions |
| `TableCard.jsx` | 502 | Table card with status + printer icon | `orderService.printOrder`, `orderItemsByTableId` |
| `DineInCard.jsx` | 236 | Dine-in-specific card variant | — |
| `DeliveryCard.jsx` | 222 | Delivery-specific card variant | — |
| `OrderTimeline.jsx` | 124 | Per-order timeline (created/ready/served) | Uses `readyAt`/`servedAt` from orderTransform |
| `buttons/IconButton.jsx`, `buttons/TextButton.jsx`, `buttons/index.js` | — | Button primitives | — |

#### 2.7.2 Dashboard (`components/dashboard/*`)

| Component | Lines | Role |
|---|---|---|
| `ChannelColumnsLayout.jsx` | 242 | Top-level channel columns using react-resizable-panels |
| `ChannelColumn.jsx` | 215 | Single column rendering |
| `ResizeHandle.jsx` | 105 | Divider handle |

#### 2.7.3 Order-entry (`components/order-entry/*`)

| Component | Lines | Role |
|---|---|---|
| `OrderEntry.jsx` | **1554** | Main orchestrator modal; owns cart + all modals + placement/update/cancel flows |
| `CartPanel.jsx` | 805 | Cart with line-item UI + qty controls + placed/unplaced sections |
| `CollectPaymentPanel.jsx` | **1592** | Payment UI with discounts/coupon/loyalty/wallet/SC toggle/delivery/tip, Print Bill button |
| `CategoryPanel.jsx` | 81 | Category sidebar |
| `AddCustomItemModal.jsx` | 297 | Out-of-menu item creation |
| `AddressFormModal.jsx` | 388 | Delivery address form |
| `AddressPickerModal.jsx` | 154 | Delivery address picker |
| `CancelFoodModal.jsx` | 232 | Item cancel (partial) |
| `CancelOrderModal.jsx` | 118 | Order-level cancel |
| `CustomerModal.jsx` | 332 | Customer CRM search/create |
| `ItemCustomizationModal.jsx` | 485 | Variants + addons for customizable items |
| `ItemNotesModal.jsx` | 222 | Item-level notes |
| `MergeTableModal.jsx` | 285 | Merge multiple tables |
| `OrderNotesModal.jsx` | 222 | Order-level notes |
| `OrderPlacedModal.jsx` | 68 | Success modal |
| `PaymentMethodButton.jsx` | 105 | Payment method button primitives (Block + Inline variants) |
| `RePrintButton.jsx` | 182 | Re-Print KOT + Auto KOT/Bill checkboxes |
| `ShiftTableModal.jsx` | 274 | Shift to another table |
| `TransferFoodModal.jsx` | 252 | Transfer item to another order |
| `index.js` | — | Barrel |

#### 2.7.4 Modals (`components/modals/*`)

| Component | Lines | Role |
|---|---|---|
| `RoomCheckInModal.jsx` | 292 | Guest check-in into rooms |
| `SplitBillModal.jsx` | 542 | Split bill flow (whole-item or qty-based splits) |
| `StationPickerModal.jsx` | 167 | Picker to choose which stations to print KOT for |

#### 2.7.5 Layout, Guards, Panels, Reports, Sections, Station-view

| Group | Files | Lines | Role |
|---|---|---|---|
| layout | Header, Sidebar, NotificationBanner, NotificationTester | — | Page chrome |
| guards | ProtectedRoute (14), ErrorBoundary | — | Routing + error capture |
| panels | MenuManagementPanel, SettingsPanel + sub-views (ListFormViews, TableManagementView, ViewEditViews, shared.jsx, menu/*, settings/*) | — | Admin panels inside Dashboard |
| reports | DatePicker, ExportButtons, FilterBar, FilterTags, OrderDetailSheet, OrderTable, ReportTabs, SummaryBar | — | Reports UI |
| sections | OrderSection, TableSection | — | Grid + filter sections |
| station-view | StationPanel | — | Station-by-station view |
| ui | 47 shadcn primitives | — | Headless UI |

### 2.8 Hooks (`hooks/*`)

| Hook | Lines | Purpose |
|---|---|---|
| `use-toast.js` | 155 | Shadcn toast dispatcher (works with `ui/toaster.jsx`) |
| `useLocalStorage.js` | 72 | Sync state to localStorage with cross-tab listener |
| `useRefreshAllData.js` | 45 | Refresh tables → (categories + products + popular) parallel → orders. Skips profile/permissions + cancellation reasons. |

### 2.9 Utils (`utils/*`)

| Module | Purpose |
|---|---|
| `businessDay.js` | Compute business-day range (handles restaurants that close past midnight) |
| `soundManager.js` | Audio preload/play/stop manager for 15 notification chimes |
| `statusHelpers.js` | Status → color/label/button mapping for tables, rooms, and orders |
| `index.js` | Barrel export + `sortByActiveFirst`, `TABLE_STATUS_PRIORITY` |

### 2.10 Constants & Config

- `constants/colors.js` — design tokens (COLORS, ROOM_COLORS, GENIE_LOGO_URL)
- `constants/config.js` — `CONFIG` object (min-height, defaults, search limit)
- `constants/featureFlags.js` — `USE_CHANNEL_LAYOUT`, `USE_STATUS_VIEW`
- `config/firebase.js` — Firebase init + `requestFCMToken` + `onForegroundMessage`
- `config/paymentMethods.js` — Static PAYMENT_METHODS map, `DEFAULT_PAYMENT_LAYOUT`, `filterLayoutByApiTypes`, `getDynamicPaymentTypes`
- `lib/utils.js` — shadcn `cn()` helper (tailwind-merge)

### 2.11 Mock Data (`data/*`)

Files: `mockCustomers.js`, `mockMenu.js`, `mockOrders.js`, `mockTables.js`, `mockConstants.js`, `notePresets.js`, `index.js`.

- **Still imported in panels and tests** (`SettingsPanel`, modal defaults). Not verified where used dynamically at runtime vs dev-only; ownership is unclear — see OPEN_QUESTIONS OQ-204.

### 2.12 Tests (`__tests__/*`)

See PROJECT_INVENTORY §12 for list. Test config uses CRA defaults.

---

## 3. Cross-Module Call Graph (Important Flows)

### 3.1 Login → Dashboard (Happy Path)

```
LoginPage.handleLogin
  └─ authService.login(creds, rememberMe)
      └─ axios.post(LOGIN)
      └─ localStorage.setItem('auth_token', ...)
      └─ authTransform.fromAPI.loginResponse
  └─ AuthContext.setToken + setPermissions
  └─ navigate('/loading')
LoadingPage.useEffect mount
  └─ loadAllData()
      └─ for each in API_LOADING_ORDER:
          loaderMap[key](ctrl, data)
          updateStatus(key, SUCCESS|ERROR, ...)
      └─ setCategories/setProducts/setPopularFood (bulk)
      └─ if no errors: loadStationData() → navigate('/dashboard')
DashboardPage.render
  └─ useSocketEvents()
      └─ SocketContext.subscribe(...) × 3 channels
```

### 3.2 Place New Order (Dine-In)

```
OrderEntry.handlePlaceOrder
  └─ [pre-flight] isTableEngaged/getOrderByTableId
  └─ orderTransform.toAPI.placeOrder(table, cart, customer, orderType, options)
      └─ buildCartItem × N
      └─ calcOrderTotals(cart, SC%)
  └─ api.post(PLACE_ORDER, FormData) (fire-and-forget; .catch shows toast)
  └─ waitForTableEngaged(tableId, 10000)
  └─ onClose()  → back to dashboard
Server side (external):
  └─ emits update-table engage → handleUpdateTable → setTableEngaged(id, true)
  └─ emits new-order → handleNewOrder
      └─ payload.orders → orderTransform.fromAPI.order × N
      └─ addOrder(order) + syncTableStatus
      └─ rAF(rAF(setTableEngaged(id, false)))
```

### 3.3 Update Order (Add Items) & Scenario 1 — Collect Bill on Existing Order

```
OrderEntry.handlePlaceOrder (has placed items)
  └─ orderTransform.toAPI.updateOrder(table, newItems, customer, orderType, options)
  └─ waitForOrderEngaged(placedOrderId) (listener)
  └─ api.put(UPDATE_ORDER, payload) (fire-and-forget)
  └─ await engagePromise → onClose()

OrderEntry.CollectPaymentPanel onPaymentComplete (existing order)
  └─ orderTransform.toAPI.collectBillExisting(table, cart, customer, paymentData, opts)
  └─ waitForOrderEngaged(orderId)
  └─ api.post(BILL_PAYMENT, payload) (fire-and-forget)
  └─ await engagePromise → onClose()
Server side:
  └─ emits order-engage (engage) → setOrderEngaged(id, true)
  └─ emits update-order-paid with payload → handleOrderDataEvent
      └─ if status='paid' → removeOrder(id) ; syncTableStatus(... 'available')
      └─ rAF(rAF(setOrderEngaged(id, false)))
```

### 3.4 Place + Collect Payment (Prepaid) — Auto-Print (BUG-273)

```
OrderEntry.CollectPaymentPanel onPaymentComplete (no placedOrderId)
  └─ orderTransform.toAPI.placeOrderWithPayment(...)
  └─ [capture] placePromise = api.post(PLACE_ORDER, FormData)
       .then(res => newOrderId = res.data.order_id || data.data.order_id || data.new_order_ids[0])
  └─ await waitForTableEngaged(tableId, 10000) OR 500ms delay
  └─ await placePromise  // ensures newOrderId is set
  └─ if settings.autoBill:
       └─ autoPrintNewOrderIfEnabled(newOrderId)
            └─ order = await waitForOrderReady(newOrderId, 3000) // both in-context + not engaged
            └─ if order?.rawOrderDetails:
                 printOrder(newOrderId, 'bill', null, order, SC%)  // no overrides
                 └─ buildBillPrintPayload(order, SC%, {}) → api.post(PRINT_ORDER)
  └─ onClose()
```

### 3.5 Manual "Print Bill" from Payment Panel (BUG-277/281)

```
CollectPaymentPanel.handlePrintBill
  └─ overrides = { orderItemTotal, orderSubtotal, paymentAmount, discountAmount,
                   couponCode, loyaltyAmount, walletAmount, serviceChargeAmount,
                   deliveryCharge, gstTax, vatTax, tip }
  └─ onPrintBill(overrides)   (prop from OrderEntry)
OrderEntry.onPrintBill
  └─ order = getOrderById(printOrderId) || orderData
  └─ printOrder(printOrderId, 'bill', null, order, SC%, overrides)
      └─ buildBillPrintPayload(order, SC%, overrides) → api.post(PRINT_ORDER)
```

### 3.6 Re-Print KOT

```
RePrintButton.RePrintOnlyButton.handlePrintKot
  └─ placedItems = cartItems.filter(i => i.placed)
  └─ stations = getStationsFromOrderItems(placedItems, getProductById)
  └─ if 1 station: executePrintKot([station])
  └─ else: open StationPickerModal → onConfirm → executePrintKot(selectedStations)
executePrintKot(selectedStations)
  └─ printOrder(orderId, 'kot', selectedStations.join(','))
     └─ api.post(PRINT_ORDER, { order_id, print_type:'kot', station_kot })
```

### 3.7 Cancel Item / Order

```
OrderEntry.handleCancelFood
  └─ waitForOrderEngaged(orderId)
  └─ api.put(CANCEL_ITEM, toAPI.cancelItem(...))
  └─ await engagePromise → onClose()

OrderEntry.handleCancelOrder
  └─ waitForOrderEngaged(orderId)
  └─ api.put(ORDER_STATUS_UPDATE, toAPI.cancelOrder(orderId, roleName, reason))
  └─ await engagePromise → onClose()
Server:
  └─ order-engage (engage) → lock
  └─ update-order-status | update-order-source with payload → handleOrderDataEvent/handleUpdateOrderStatus
      └─ if cancelled/paid → removeOrder + syncTableStatus(... 'available')
```

### 3.8 Socket Message Arrival (general)

```
socketService.on(channel, wrappedHandler)
  wrappedHandler(args) (args is the message array)
    └─ useSocketEvents.handleOrderChannelEvent / handleTableChannelEvent / handleOrderEngageChannelEvent
        └─ switch on args[0]  OR  direct call for order-engage
        └─ handler receives (args, actionsRef.current)
            └─ parseMessage / parseTableMessage
            └─ orderTransform.fromAPI.order (or fetchOrderWithRetry for food-status/scan/delivery)
            └─ addOrder/updateOrder/removeOrder/setOrderEngaged/setTableEngaged/updateTableStatus
```

---

## 4. Ownership of Order/Table State Changes

| Trigger | Writer | Primary consumer |
|---|---|---|
| Login | AuthContext | all contexts; LoadingPage reads & dispatches |
| Initial data load | LoadingPage → each context's setter | Dashboard + child components |
| `useRefreshAllData` | hook → Menu/Table/Order contexts | Dashboard refresh button |
| Socket: order data events | `socketHandlers` → `OrderContext` + `TableContext` | Cards, OrderEntry |
| Socket: order-engage | `handleOrderEngage` → `OrderContext.setOrderEngaged` | Card spinner / lock indicator |
| Socket: update-table | `handleUpdateTable` → `TableContext.setTableEngaged`/`updateTableStatus` | TableCard styling |
| HTTP success (place/update/cancel/collect) | Fire-and-forget; **does NOT** directly write state — socket does | Nothing |
| HTTP response for place-order | Only `newOrderId` captured (for auto-print) | BUG-273 branch |
| Cart editing in OrderEntry | Local `setCartItems` | OrderEntry/CartPanel |

---

## 5. Dead / Legacy Code

| Symbol | Location | Why flagged | Confidence |
|---|---|---|---|
| `handleUpdateOrder` | `socketHandlers.js` lines 204–207 | Router dispatches `update-order` to `handleOrderDataEvent('update-order')` (useSocketEvents.js line 69). The legacy function's body just forwards to `handleOrderDataEvent`, so even if called it would work — but it is never called by the router. Kept “for rollback reference.” | HIGH |
| `RePrintButton` default export | `RePrintButton.jsx` lines 130–182 | Module also exports `RePrintOnlyButton` + `KotBillCheckboxes`. The default `RePrintButton` is a hollow UI (no-op clicks). Import usages not fully audited. | MEDIUM |
| `AGGREGATOR_EVENTS` + `EVENTS_REQUIRING_AGGREGATOR_API` | `socketEvents.js` | No subscription code in `useSocketEvents.js` | HIGH |
| `paymentService.collectPayment` | `paymentService.js` | Uses undeclared `CLEAR_BILL` endpoint; call sites not found in `OrderEntry` (which uses `orderTransform.collectBillExisting` + direct `api.post(BILL_PAYMENT)`) | HIGH |
| `data/*` mocks | `src/data/*` | Legacy mocks still imported by panels/modals; unclear if runtime uses them or they're only dev fallbacks | MEDIUM |

---

## 6. Cross-Boundary Contracts (informal)

### 6.1 Transform ↔ Backend

- `orderTransform.toAPI.*` — each function returns a plain object matching a specific backend endpoint’s expected payload shape. Field names use snake_case.
- `orderTransform.fromAPI.order` expects 50+ fields on the raw API object (`restaurantTable`, `vendorEmployee`, `user`, `orderDetails`, `f_order_status`, `order_type`, `order_in`, `order_status`, `order_amount`, `order_sub_total_*`, `total_service_tax_amount`, `tip_amount`, `payment_*`, `associated_order_list`, `delivery_*`, `print_kot`, `print_bill_status`).
- **Socket payload shape** (for v2 data events) matches REST "single order" shape under `{orders: [apiOrder]}` — confirmed by `fetchSingleOrderForSocket` and socket handlers both using the same `fromAPI.order`.

### 6.2 Context ↔ Component

- Contexts expose stable actions via `useCallback` and `useMemo` to keep reference identity. Known exception: `StationContext` does NOT memoize its value object (line 118) — every render of `StationProvider` creates a new `value` object, causing subscribed components to re-render. See RISK_REGISTER RISK-024.
- `AuthContext` throws if used outside provider (same pattern for all contexts).

### 6.3 Socket ↔ React

- `useSocketEvents` is expected to be mounted **exactly once** near the app root (currently in `DashboardPage`). If the user navigates to `/reports/*` or `/visibility/*`, Dashboard unmounts and socket subscriptions are cleaned up. Whether state stays accurate on return is NOT verified.

---

## 7. Module Boundaries — Summary

Clear boundaries (good):
- `api/` never imports from `components/`, `pages/`, or `contexts/`. (Verified by file scan.)
- `transforms/` are pure functions; no React or axios imports.
- `socket/socketService.js` does not depend on React; `useSocketEvents.js` is the only React entry point.

Blurred boundaries (attention needed):
- `OrderEntry.jsx` (1554 LOC) directly calls `api.put` / `api.post` / `api.get` with `API_ENDPOINTS` rather than going through a service (CANCEL_ITEM, ORDER_STATUS_UPDATE, PLACE_ORDER, UPDATE_ORDER, BILL_PAYMENT, TRANSFER_FOOD, MERGE_ORDER, ORDER_TABLE_SWITCH, ORDER_SHIFTED_ROOM, ADD_CUSTOM_ITEM). Services for some of these exist but are unused.
- `CollectPaymentPanel.jsx` owns tax, SC, and tip math that partially overlaps with `orderTransform.calcOrderTotals`/`buildBillPrintPayload` → divergence risk (OQ-101).
- `DashboardPage.jsx` (1431 LOC) mixes routing, permissions, search, drag-drop, dashboard composition, and inline event handlers that call `api.put` for status updates. Could be decomposed.

---

## 8. Module Change Map (what moved since v1)

| v1 location | v2 location / state | Note |
|---|---|---|
| — | `StatusConfigPage.jsx` (new, 890 LOC) | Visibility/status config page |
| `OrderContext` (simpler) | `OrderContext` (+ `engagedOrders`, `waitForOrderEngaged`, `waitForOrderReady`, `waitForOrderRemoval`, `ordersRef`) | v2 lock protocol |
| `TableContext` (simpler) | `TableContext` (+ `engagedTables`, `waitForTableEngaged`) | v2 lock protocol |
| `socketHandlers.handleUpdateOrder` | `handleOrderDataEvent` unifies 5 events (`update-order`, `update-order-target`, `update-order-source`, `update-order-paid`, `update-item-status`); legacy kept dead | Unified v2 path |
| `socketEvents.js` (6 events) | 12 events + aggregator (dead) | v2 |
| `socketService.js` | adds `window.__SOCKET_SERVICE__` dev expose; `setDebugMode`/`getDebugInfo` | Dev ergonomics |
| `useSocketEvents.js` | adds order-engage channel + handlers | v2 lock |
| `orderTransform.toAPI` (placeOrder/updateOrder/collectBill) | adds `buildBillPrintPayload` with 12 overrides; `placeOrderWithPayment` with partial payments | BUG-273/277/281 |
| `CollectPaymentPanel` | adds SC toggle, tip input, BUG-281 subtotal semantic, print payload overrides, printTaxTotals memo | BUG-276/277/281 |
| `OrderEntry` | adds delta item pattern (BUG-237), pre-flight table occupied check (BUG-210), auto-print pipeline (BUG-273), address restore (BUG-267) | Multiple bugs |
| `stationService.js` | `fetchStationData`, `extractUniqueStations`, config LS key | Full station service |
| `reportService.js` | 588 LOC, 16 functions, business-day-aware, `getOrdersByTab` dispatch | Phase 4A |

---

## 9. Questions Arising from Module Structure

See `OPEN_QUESTIONS_FROM_CODE.md`. Highlights:
- OQ-101: Divergence between panel math and transform math (SC application point; GST-on-SC base)
- OQ-102: What happens when a v2 data event arrives without `payload.orders`? Current code logs and bails — silent failure for UI.
- OQ-103: Who owns the responsibility to consolidate order HTTP calls out of `OrderEntry.jsx` into services?
- OQ-104: Should the legacy `handleUpdateOrder` and `paymentService.collectPayment` be removed?
- OQ-106: Is the table channel still needed in v2? (contradicts BUG-203 comments)
