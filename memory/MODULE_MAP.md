# MODULE MAP — v3 (Re-Validation)

> Validation note (2026-04-19): reviewed against current codebase at `main` / `b1ebb9e`.
> Previous v3 text referenced older commit `7f87721`; module-level structure below remains largely valid but commit traceability required correction.

> Generated: 2026 (v3 re-validation) | Source: `main` branch, commit `7f87721`
> Method: Static code analysis — no runtime observation
> Revalidation result: **all v2 module structure claims HOLD** with byte-level file-size match; 2 minor corrections (mock import sites, `@hello-pangea/dnd` sites now identified).

---

## 0. V2 → V3 Revalidation Summary

| v2 module claim | Status | Notes |
|---|---|---|
| Pages count = 6 | **HOLD** | `ls src/pages/*.jsx` = 6 files |
| 13 API services, 10 transforms, 5 socket files | **HOLD** | Counts re-verified |
| `OrderEntry` 1554 LOC, `CollectPaymentPanel` 1592 LOC | **HOLD** (byte-exact) | Code is frozen at v2 snapshot |
| `handleUpdateOrder` dead code | **HOLD** | `socketHandlers.js:200–207` — body forwards to `handleOrderDataEvent` |
| `paymentService.collectPayment` dead code (broken endpoint) | **HOLD** | `paymentService.js:13` still uses `CLEAR_BILL` |
| AGGREGATOR_EVENTS declared but no subscription | **HOLD** | `grep -rn "getAggregatorChannel\|AGGREGATOR_EVENTS"` = 6 matches, all inside `socketEvents.js` / `index.js` barrel |
| `RePrintButton` default export hollow; real work in `RePrintOnlyButton` | NEEDS re-verification (see §5.2) | |
| Mock data imported in "SettingsPanel, ListFormViews, ViewEditViews, shared.jsx" | **CONTRADICTED** | Real sites: `ItemNotesModal.jsx`, `OrderNotesModal.jsx`, `TableCard.jsx` |
| `@hello-pangea/dnd` usage "not audited" | **FILLED** | `panels/menu/ProductList.jsx`, `panels/menu/CategoryList.jsx` |

---

## 1. Module Dependency Graph (High Level) — UNCHANGED

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
| StatusConfigPage | `pages/StatusConfigPage.jsx` | 890 | Settings | localStorage; status visibility config |

### 2.2 API Layer

| Module | File | Lines | Responsibility | Owners/consumers |
|---|---|---|---|---|
| axios (REST) | `api/axios.js` | 68 | Auth-bearing HTTP client; 401 hard-redirect; `readableMessage` normalization | All `*Service.js` modules except customerService |
| crmAxios | `api/crmAxios.js` | 81 (v2: 82; whitespace) | X-API-Key HTTP client for CRM | `customerService.js` only |
| constants | `api/constants.js` | 249 (v2: 250; whitespace) | 42 endpoints (v3 corrected; v2 said 38), status maps, storage keys, loading order | Everything |
| index (barrel) | `api/index.js` | 4 | Re-exports | Internal |

### 2.3 Services (`api/services/*`) — 13 files

| Module | Lines | Responsibility | Calls |
|---|---|---|---|
| `authService.js` | 78 | Login/logout + localStorage helpers | `/api/v1/auth/vendoremployee/login` |
| `categoryService.js` | 46 | GET categories + local `calculateItemCounts` | `CATEGORIES` |
| `customerService.js` | 178 | CRM search/lookup/create/update + addresses | CRM via `crmAxios` |
| `orderService.js` | 151 | `getRunningOrders`, `getOrderRoleParam`, `fetchSingleOrderForSocket`, `updateOrderStatus`, `confirmOrder`, `completePrepaidOrder`, `splitOrder`, `printOrder` | 8 endpoints |
| `paymentService.js` | 15 | `collectPayment` wrapper | **Broken (DEAD)**: uses undeclared `API_ENDPOINTS.CLEAR_BILL` — **RISK-001** |
| `productService.js` | 114 | Products + popular food + helpers | `PRODUCTS`, `POPULAR_FOOD` |
| `profileService.js` | 14 | GET profile + transform | `PROFILE` |
| `reportService.js` | 588 | 16 report functions; `getOrdersByTab` dispatch; business-day range filtering | 7 report endpoints |
| `roomService.js` | 84 | Room check-in (JSON or multipart based on images) | `ROOM_CHECK_IN` |
| `settingsService.js` | 57 | Cancellation reasons | `CANCELLATION_REASONS` |
| `stationService.js` | 237 | `extractUniqueStations`, `getStationsFromOrderItems`, `fetchStationData`, localStorage config | None directly |
| `tableService.js` | 109 | GET tables + local helpers | `TABLES` |
| (`index.js`) | — | Barrel | — |

**Dependency direction**: services → `axios`/`crmAxios` + `transforms`. Services never read React contexts. **v3 re-verified by grep for `useContext`/`useOrders`/`useTables`/`useRestaurant` under `api/services/` → zero matches.**

### 2.4 Transforms (`api/transforms/*`) — 10 files

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
| (`index.js`) | — | Barrel | — |

### 2.5 Socket Layer (`api/socket/*`) — 5 files

| Module | Lines | Responsibility |
|---|---|---|
| `socketService.js` | 364 (v2: 365; whitespace) | Singleton connection manager (connect, on/off, emit, statusListeners, logging, debug). Exposes `window.__SOCKET_SERVICE__` in development only (lines 360–362). **No auth in handshake** (lines 54–62). |
| `socketEvents.js` | 154 (v2: 155; whitespace) | Constants: `SOCKET_CONFIG`, `SOCKET_EVENTS` (13 event names at lines 55–78), `AGGREGATOR_EVENTS` (2 at lines 83–87), `CONNECTION_EVENTS`, channel generators, payload indices. Throws if `REACT_APP_SOCKET_URL` missing. |
| `socketHandlers.js` | 651 | Business logic for each event. Includes `handleNewOrder`, `handleOrderDataEvent` (unified v2 handler), `handleUpdateFoodStatus`, `handleUpdateOrderStatus`, `handleScanNewOrder`, `handleDeliveryAssignOrder`, `handleUpdateTable`, `handleOrderEngage`, `handleSplitOrder`. Also exports LEGACY `handleUpdateOrder` (dead code — see §5). |
| `useSocketEvents.js` | 194 | React hook that subscribes to 3 channels. Uses refs for handler actions to avoid stale closures. |
| `index.js` | 40 | Barrel re-exports (including `AGGREGATOR_EVENTS` and `getAggregatorChannel` — dead re-exports) |

### 2.6 Contexts (`contexts/*`) — 9 + AppProviders + barrel

| Module | Lines | State scope | Exposed API (condensed) | Memoized `value`? |
|---|---|---|---|---|
| `AuthContext.jsx` | 116 | token, user, permissions | `login`, `logout`, `setUserData`, `hasPermission*`, `isAuthenticated`, `isLoading` | **YES** (line 63) |
| `SocketContext.jsx` | 248 | connection status | `subscribe(event, handler)`, `reconnect`, `getDebugInfo`, `setDebugMode`, `status`, etc. | **YES** (line 163) |
| `NotificationContext.jsx` | 186 | FCM + sound | `notifications`, `unreadCount`, `soundEnabled`, etc. | **YES** (line 151) |
| `RestaurantContext.jsx` | 126 | restaurant config | `restaurant`, `setRestaurant`, `clearRestaurant`, `currencySymbol`, `features`, etc. | **YES** (line 77) |
| `MenuContext.jsx` | 131 | catalog | `categories`, `products`, `popularFood`, setters, getters | **YES** (line 78) |
| `TableContext.jsx` | 270 | tables + engage | `tables`, `sections`, `setTables`, `clearTables`, `refreshTables`, `updateTableStatus`, `setTableEngaged`, `isTableEngaged`, `waitForTableEngaged`, etc. | **YES** (line 207) |
| `SettingsContext.jsx` | 109 | cancellation + payment layout + dynamic tables | `cancellationReasons`, `paymentLayoutConfig`, etc. | **YES** (line 62) |
| `OrderContext.jsx` | 387 | orders + engage + helpers | `orders`, `isLoaded`, `setOrders`, `clearOrders`, `refreshOrders`, `addOrder`, `updateOrder`, `removeOrder`, `getOrderById`, `waitForOrderRemoval`, `waitForOrderEngaged`, `waitForOrderReady`, `engagedOrders`, `setOrderEngaged`, `isOrderEngaged`, computed `dineInOrders`/`takeAwayOrders`/etc. | **YES** (line 326) |
| `StationContext.jsx` | 161 | station view | `availableStations`, `enabledStations`, `stationData`, etc. | **NO** (line 118 — plain object literal) |
| `AppProviders.jsx` | 37 | composition only | See ARCHITECTURE §2 |
| `index.js` | barrel | | | |

**Verified v3 with `grep -n "const value" contexts/*.jsx`:** 8 of 9 use `useMemo(() => ({` at various lines (Auth:63, Menu:78, Notification:151, Order:326, Restaurant:77, Settings:62, Socket:163, Table:207). StationContext.jsx:118 is `const value = {` — plain object. V2 RISK-012 **HOLDS**.

### 2.7 Components by Category

#### 2.7.1 Cards (`components/cards/*`)

| Component | Lines | Role | Notable deps |
|---|---|---|---|
| `OrderCard.jsx` | 700 | Order card for dashboard lists (delivery/takeaway/status columns) | `orderService.printOrder`, `useOrders`, permissions |
| `TableCard.jsx` | 502 | Table card with status + printer icon | `orderService.printOrder`, `orderItemsByTableId`; **imports `mockOrderItems` (line 5) and assigns to dead `orderData` var (line 57) — v3 new finding** |
| `DineInCard.jsx` | 236 | Dine-in-specific card variant | — |
| `DeliveryCard.jsx` | 222 | Delivery-specific card variant | — |
| `OrderTimeline.jsx` | 124 | Per-order timeline (created/ready/served) | Uses `readyAt`/`servedAt` from orderTransform |
| `buttons/IconButton.jsx`, `buttons/TextButton.jsx`, `buttons/index.js` | — | Button primitives | — |
| `TableCard.styles.js` | — | Shared styles for TableCard | — |

#### 2.7.2 Dashboard (`components/dashboard/*`)

| Component | Lines | Role |
|---|---|---|
| `ChannelColumnsLayout.jsx` | 242 | Top-level channel columns using react-resizable-panels |
| `ChannelColumn.jsx` | 215 | Single column rendering |
| `ResizeHandle.jsx` | 105 | Divider handle |

#### 2.7.3 Order-entry (`components/order-entry/*`) — 20 files

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
| `ItemNotesModal.jsx` | 222 | Item-level notes — **imports `itemLevelPresets, getCustomerPreferences` from `data/`** |
| `MergeTableModal.jsx` | 285 | Merge multiple tables |
| `OrderNotesModal.jsx` | 222 | Order-level notes — **imports `orderLevelPresets, getCustomerPreferences` from `data/`** |
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

#### 2.7.5 Panels (`components/panels/*`)

| File | Role |
|---|---|
| `MenuManagementPanel.jsx`, `SettingsPanel.jsx` | Admin panels |
| `menu/CategoryList.jsx`, `menu/ProductList.jsx` | **Uses `@hello-pangea/dnd` for drag-reorder — v3 finding** |
| `menu/ProductCard.jsx`, `menu/ProductForm.jsx` | Menu sub-views |
| `settings/ListFormViews.jsx`, `settings/TableManagementView.jsx`, `settings/ViewEditViews.jsx`, `settings/shared.jsx` | Settings sub-views |

#### 2.7.6 Layout, Guards, Reports, Sections, Station-view, UI

| Group | Files |
|---|---|
| layout | Header, Sidebar, NotificationBanner, NotificationTester |
| guards | ProtectedRoute (14 lines), ErrorBoundary |
| reports | DatePicker, ExportButtons, FilterBar, FilterTags, OrderDetailSheet, OrderTable, ReportTabs, SummaryBar |
| sections | OrderSection, TableSection |
| station-view | StationPanel |
| ui | **46 shadcn/headless primitives (v3 correction; v2 said 47)** |

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
| `soundManager.js` | Audio preload/play/stop manager for 14 notification chimes (v3 correction) |
| `statusHelpers.js` | Status → color/label/button mapping for tables, rooms, and orders |
| `index.js` | Barrel export + `sortByActiveFirst`, `TABLE_STATUS_PRIORITY` |

### 2.10 Constants & Config

- `constants/colors.js` — design tokens (COLORS, ROOM_COLORS, GENIE_LOGO_URL)
- `constants/config.js` — `CONFIG` object (min-height, defaults, search limit)
- `constants/featureFlags.js` — `USE_CHANNEL_LAYOUT`, `USE_STATUS_VIEW`
- `config/firebase.js` — Firebase init + `requestFCMToken` + `onForegroundMessage`
- `config/paymentMethods.js` — Static PAYMENT_METHODS map, `DEFAULT_PAYMENT_LAYOUT`, `filterLayoutByApiTypes`, `getDynamicPaymentTypes`
- `lib/utils.js` — shadcn `cn()` helper (tailwind-merge)

### 2.11 Mock Data (`data/*`) — v3 CORRECTED

Files: `mockCustomers.js`, `mockMenu.js`, `mockOrders.js`, `mockTables.js`, `mockConstants.js`, `notePresets.js`, `index.js` (barrel).

**v3 actual import sites** (verified via `grep -rn "from.*data"`):

| Importer | Import | Dead? |
|---|---|---|
| `components/order-entry/ItemNotesModal.jsx:4` | `itemLevelPresets, getCustomerPreferences` | **Live — used** |
| `components/order-entry/OrderNotesModal.jsx:4` | `orderLevelPresets, getCustomerPreferences` | **Live — used** |
| `components/cards/TableCard.jsx:5, :57` | `mockOrderItems` | **DEAD — `orderData` never read** |

**v2 was wrong** to list `SettingsPanel`, `ListFormViews`, `ViewEditViews`, `shared.jsx` as consumers. Answers OQ-204.

### 2.12 Tests (`__tests__/*`)

See PROJECT_INVENTORY §11 for the full list of 17 (v3 correction; v2 said 18) test files. Test config uses CRA defaults.

---

## 3. Cross-Module Call Graph (Important Flows) — UNCHANGED

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
      └─ for each in API_LOADING_ORDER:        ← SEQUENTIAL (LoadingPage.jsx:323–326)
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
  └─ [pre-flight BUG-210] isTableEngaged/getOrderByTableId (OrderEntry.jsx:576–590)
  └─ orderTransform.toAPI.placeOrder(table, cart, customer, orderType, options)
      └─ buildCartItem × N
      └─ calcOrderTotals(cart, SC%)
  └─ api.post(PLACE_ORDER, FormData) (fire-and-forget; .catch shows toast)  [OrderEntry.jsx:614]
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
  └─ api.put(UPDATE_ORDER, payload) (fire-and-forget)  [OrderEntry.jsx:561]
  └─ await engagePromise → onClose()

OrderEntry.CollectPaymentPanel onPaymentComplete (existing order)
  └─ orderTransform.toAPI.collectBillExisting(table, cart, customer, paymentData, opts)
  └─ waitForOrderEngaged(orderId)
  └─ api.post(BILL_PAYMENT, payload) (fire-and-forget)  [OrderEntry.jsx:1154]
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
  └─ [capture] placePromise = api.post(PLACE_ORDER, FormData)   [OrderEntry.jsx:1096]
       .then(res => newOrderId = res.data.order_id || res.data.data.order_id || res.data.new_order_ids[0])
                                                                 [OrderEntry.jsx:1102–1106]
  └─ await waitForTableEngaged(tableId, 10000) OR 500ms delay  [OrderEntry.jsx:1117–1123]
  └─ await placePromise  // ensures newOrderId is set           [OrderEntry.jsx:1128]
  └─ if settings.autoBill:
       └─ autoPrintNewOrderIfEnabled(newOrderId)                 [OrderEntry.jsx:1134]
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
  └─ api.put(CANCEL_ITEM, toAPI.cancelItem(...))   [OrderEntry.jsx:739]
  └─ await engagePromise → onClose()

OrderEntry.handleCancelOrder
  └─ waitForOrderEngaged(orderId)
  └─ api.put(ORDER_STATUS_UPDATE, toAPI.cancelOrder(orderId, roleName, reason))  [OrderEntry.jsx:767]
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

## 4. Ownership of Order/Table State Changes (UNCHANGED)

| Trigger | Writer | Primary consumer |
|---|---|---|
| Login | AuthContext | all contexts; LoadingPage reads & dispatches |
| Initial data load | LoadingPage → each context's setter | Dashboard + child components |
| `useRefreshAllData` | hook → Menu/Table/Order contexts | Dashboard refresh button |
| Socket: order data events | `socketHandlers` → `OrderContext` + `TableContext` | Cards, OrderEntry |
| Socket: order-engage | `handleOrderEngage` → `OrderContext.setOrderEngaged` | Card spinner / lock indicator |
| Socket: update-table | `handleUpdateTable` → `TableContext.setTableEngaged`/`updateTableStatus` | TableCard styling |
| HTTP success (place/update/cancel/collect) | **Fire-and-forget; does NOT directly write state — socket does** | Nothing |
| HTTP response for place-order | Only `newOrderId` captured (for auto-print — BUG-273) | `autoPrintNewOrderIfEnabled` |
| Cart editing in OrderEntry | Local `setCartItems` | OrderEntry/CartPanel |

---

## 5. Dead / Legacy Code — v3

| Symbol | Location | Why flagged | Status (v2 → v3) |
|---|---|---|---|
| `handleUpdateOrder` | `socketHandlers.js:200–207` | Router dispatches `update-order` to `handleOrderDataEvent('update-order')` (`useSocketEvents.js:68–70`). The legacy function's body just forwards to `handleOrderDataEvent`, so even if called it would work — but it is never called by the router. Kept "for rollback reference." | **UNCHANGED** |
| `AGGREGATOR_EVENTS` + `EVENTS_REQUIRING_AGGREGATOR_API` + `getAggregatorChannel` | `socketEvents.js:43, 83–87, 126–129`; `socket/index.js` re-exports | No subscription code in `useSocketEvents.js`; grep: 6 matches, ALL in socketEvents.js or barrel. | **UNCHANGED** |
| `paymentService.collectPayment` | `paymentService.js:12–15` | Uses undeclared `CLEAR_BILL` endpoint; no call sites found (grep `paymentService\\.collectPayment\|import.*paymentService` = only test file). Active bill-payment flow uses `api.post(API_ENDPOINTS.BILL_PAYMENT)` directly in `OrderEntry.jsx:1154`. | **UNCHANGED** |
| `RePrintButton` default export hollow | `RePrintButton.jsx` | Module has 182 lines; needs deeper audit to confirm default vs `RePrintOnlyButton` split. | **PARTIAL — needs re-audit** |
| `mockOrderItems` in `TableCard.jsx` | `TableCard.jsx:5, 57` | Imported and assigned to `orderData`; `orderData` is never read elsewhere in the file (grep on `orderData` in that file → 1 hit only, at the assignment site). | **NEW v3** |
| `data/` mocks (broadly) | `src/data/*` | 6 mock files + barrel. Three files imported at runtime (`ItemNotesModal`, `OrderNotesModal`, `TableCard`). Of these, only `notePresets` is active use; `mockOrderItems` is dead. | **Refined (see §2.11)** |

---

## 6. Cross-Boundary Contracts (informal)

### 6.1 Transform ↔ Backend (UNCHANGED)

- `orderTransform.toAPI.*` — each function returns a plain object matching a specific backend endpoint's expected payload shape. Field names use snake_case.
- `orderTransform.fromAPI.order` expects 50+ fields on the raw API object.
- **Socket payload shape** (for v2 data events) matches REST "single order" shape under `{orders: [apiOrder]}` — both `fetchSingleOrderForSocket` and socket handlers use the same `fromAPI.order`.

### 6.2 Context ↔ Component

- Contexts expose stable actions via `useCallback` and `useMemo` to keep reference identity.
- Known exception: `StationContext` does NOT memoize its value object (line 118) — every render of `StationProvider` creates a new `value` object, causing subscribed components to re-render. See RISK-012.
- `AuthContext` throws if used outside provider (same pattern for all contexts).

### 6.3 Socket ↔ React (UNCHANGED)

- `useSocketEvents` is expected to be mounted **exactly once** near the app root (currently in `DashboardPage`). If the user navigates to `/reports/*` or `/visibility/*`, Dashboard unmounts and socket subscriptions are cleaned up. Whether state stays accurate on return is NOT verified.

---

## 7. Module Boundaries — Summary

**Clear boundaries (good) — v3 verified:**
- `api/` never imports from `components/`, `pages/`, or `contexts/`. (Grep: zero cross-imports.)
- `transforms/` are pure functions; no React or axios imports.
- `socket/socketService.js` does not depend on React; `useSocketEvents.js` is the only React entry point.

**Blurred boundaries (attention needed) — v3 re-verified:**
- `OrderEntry.jsx` (1554 LOC) directly calls `api.put` / `api.post` / `api.get` with `API_ENDPOINTS` rather than going through a service. v3 count: **11 direct `api.(get|post|put|delete|patch)` calls** for endpoints: PLACE_ORDER (×2), UPDATE_ORDER, TRANSFER_FOOD, MERGE_ORDER, ORDER_TABLE_SWITCH, CANCEL_ITEM, ORDER_STATUS_UPDATE, ADD_CUSTOM_ITEM, ORDER_SHIFTED_ROOM, BILL_PAYMENT — **10 unique endpoints**. RISK-008 HOLDS.
- `CollectPaymentPanel.jsx` owns tax, SC, and tip math that partially overlaps with `orderTransform.calcOrderTotals`/`buildBillPrintPayload` → divergence risk (OQ-101).
- `DashboardPage.jsx` (1431 LOC) mixes routing, permissions, search, drag-drop, dashboard composition, and inline event handlers that call `api.put` for status updates. Could be decomposed.

---

## 8. Module Change Map (what moved since v2)

**No structural moves detected between v2 snapshot (commit `b32dec9`, now absent) and v3 snapshot (commit `7f87721`).** The file-size census in PROJECT_INVENTORY §10 confirms byte-level stability.

The only drift is documentation quality (v2 counts and import-site lists), which this v3 pass corrects.

---

## 9. Questions Arising from Module Structure

See `OPEN_QUESTIONS_FROM_CODE.md` (v3). Key module-level questions:
- OQ-101: Divergence between panel math and transform math (SC application point; GST-on-SC base) — **OPEN**
- OQ-102: What happens when a v2 data event arrives without `payload.orders`? Current code logs and bails — silent failure for UI. — **OPEN**
- OQ-103: Who owns the responsibility to consolidate order HTTP calls out of `OrderEntry.jsx` into services? — **OPEN**
- OQ-104: Should the legacy `handleUpdateOrder` and `paymentService.collectPayment` be removed? — **Partially answered** (both confirmed dead)
- OQ-106: Is the table channel still needed in v2/v3? (contradicts BUG-203 comments) — **OPEN**
- OQ-204: Are the `src/data/mock*` files used at runtime or only in tests? — **Answered** — see §2.11
