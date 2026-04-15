# MODULE MAP

> Generated: July 2025 | Source: `main` branch, static code analysis
> Maps every module, its responsibilities, dependencies, and cross-boundary interactions

---

## 1. Module Dependency Graph

```
                    ┌───────────────┐
                    │    App.js     │
                    │  (Routing)    │
                    └───────┬───────┘
                            │
               ┌────────────┼────────────────┐
               │            │                │
        ┌──────▼─────┐  ┌──▼──────────┐  ┌──▼────────────┐
        │  LoginPage  │  │ LoadingPage │  │ DashboardPage │
        └──────┬──────┘  └──────┬──────┘  └──────┬────────┘
               │                │                 │
    ┌──────────┼────────────────┼─────────────────┼──────────────┐
    │          │                │                 │              │
    │   ┌──────▼──────┐  ┌─────▼─────┐    ┌─────▼──────┐       │
    │   │ AuthContext  │  │ All 9     │    │ useSocket  │       │
    │   │             │  │ Contexts  │    │ Events     │       │
    │   └──────┬──────┘  └─────┬─────┘    └─────┬──────┘       │
    │          │               │                 │              │
    │   ┌──────▼──────┐  ┌─────▼──────┐   ┌─────▼──────┐      │
    │   │ authService │  │ *Service   │   │ socket     │      │
    │   │             │  │ modules    │   │ Handlers   │      │
    │   └──────┬──────┘  └─────┬──────┘   └─────┬──────┘      │
    │          │               │                 │              │
    │   ┌──────▼──────┐  ┌─────▼──────┐   ┌─────▼──────┐      │
    │   │  axios.js   │  │ *Transform │   │ socket     │      │
    │   │  crmAxios   │  │ modules    │   │ Service    │      │
    │   └─────────────┘  └────────────┘   └────────────┘      │
    │                                                          │
    │                  SHARED LAYER                             │
    │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
    │  │constants │ │  utils   │ │  config  │ │   hooks   │  │
    │  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
    └──────────────────────────────────────────────────────────┘
```

---

## 2. Module Registry

### 2.1 Pages (Entry Points)

| Module | File | Lines | Primary Contexts Used | Key Dependencies |
|---|---|---|---|---|
| LoginPage | `pages/LoginPage.jsx` | 275 | Auth | authService, firebase |
| LoadingPage | `pages/LoadingPage.jsx` | 530 | Auth, Restaurant, Menu, Tables, Settings, Orders, Stations | All services except customer/report |
| DashboardPage | `pages/DashboardPage.jsx` | 1376 | Auth, Restaurant, Tables, Orders, Settings | useSocketEvents, orderService, OrderEntry, cards, layout |
| AllOrdersReportPage | `pages/AllOrdersReportPage.jsx` | — | Restaurant | reportService |
| OrderSummaryPage | `pages/OrderSummaryPage.jsx` | — | Restaurant | reportService |
| StatusConfigPage | `pages/StatusConfigPage.jsx` | — | Settings | — |

### 2.2 Contexts (State Modules)

| Context | File | Lines | Owns | Consumed By | Notes |
|---|---|---|---|---|---|
| AuthContext | `contexts/AuthContext.jsx` | 117 | token, user, permissions | All protected pages, Socket, Notification | Provides hasPermission/hasAnyPermission/hasAllPermissions |
| SocketContext | `contexts/SocketContext.jsx` | 249 | connection status, subscribe() | DashboardPage via useSocketEvents | Auth-gated; handles visibility/online events |
| NotificationContext | `contexts/NotificationContext.jsx` | 187 | notifications[], soundEnabled | Layout components | Firebase FCM + Service Worker integration |
| RestaurantContext | `contexts/RestaurantContext.jsx` | 127 | restaurant config | DashboardPage, OrderEntry, Reports | Derived: features, cancellation, settings, printers, paymentTypes |
| MenuContext | `contexts/MenuContext.jsx` | 132 | categories, products, popularFood | OrderEntry (CategoryPanel), StationService | Provides search, filter, lookup helpers |
| TableContext | `contexts/TableContext.jsx` | 271 | tables[] (unified tables+rooms), engagedTables | DashboardPage, OrderEntry, socketHandlers | Engaged table pattern with refs |
| SettingsContext | `contexts/SettingsContext.jsx` | 110 | cancellationReasons, paymentLayoutConfig, enableDynamicTables | OrderEntry (cancel modals), CollectPaymentPanel | Dynamic tables toggle persisted in localStorage |
| OrderContext | `contexts/OrderContext.jsx` | 337 | orders[] (unified), engagedOrders | DashboardPage, socketHandlers | Computed: dineIn/takeAway/delivery/table/walkIn orders |
| StationContext | `contexts/StationContext.jsx` | 162 | stationData, availableStations, enabledStations | DashboardPage (StationPanel) | Config persisted in localStorage |

### 2.3 API Services

| Service | File | Lines | Axios Instance | Endpoints Used | Transform |
|---|---|---|---|---|---|
| authService | `services/authService.js` | 79 | api (main) | LOGIN | authTransform |
| profileService | `services/profileService.js` | 15 | api | PROFILE | profileTransform |
| categoryService | `services/categoryService.js` | — | api | CATEGORIES | categoryTransform |
| productService | `services/productService.js` | — | api | PRODUCTS, POPULAR_FOOD | productTransform |
| tableService | `services/tableService.js` | 110 | api | TABLES | tableTransform |
| orderService | `services/orderService.js` | 128 | api | RUNNING_ORDERS, SINGLE_ORDER_NEW, ORDER_STATUS_UPDATE, CONFIRM_ORDER, SPLIT_ORDER, PRINT_ORDER | orderTransform |
| customerService | `services/customerService.js` | 179 | **crmApi** | CUSTOMER_SEARCH/LOOKUP/CREATE/UPDATE, ADDRESS_* | customerTransform |
| paymentService | `services/paymentService.js` | 16 | api | ⚠️ **CLEAR_BILL (undefined!)** | — |
| reportService | `services/reportService.js` | 589 | api | 8 report endpoints | reportTransform |
| settingsService | `services/settingsService.js` | — | api | CANCELLATION_REASONS | settingsTransform |
| stationService | `services/stationService.js` | 238 | api | station-order-list (hardcoded URL!) | — |
| roomService | `services/roomService.js` | 85 | api | ROOM_CHECK_IN, ORDER_SHIFTED_ROOM | — |

### 2.4 API Transforms

| Transform | File | Lines | fromAPI Methods | toAPI Methods |
|---|---|---|---|---|
| authTransform | `transforms/authTransform.js` | 39 | loginResponse | loginRequest |
| profileTransform | `transforms/profileTransform.js` | 203 | profileResponse, user, restaurant, paymentTypes, discountTypes, printers, schedules, settings | — (Phase 2) |
| categoryTransform | `transforms/categoryTransform.js` | — | — | — |
| productTransform | `transforms/productTransform.js` | — | — | — |
| tableTransform | `transforms/tableTransform.js` | 166 | tableList, table, groupBySection, getSections | shiftTable, transferFood, mergeTable |
| orderTransform | `transforms/orderTransform.js` | 843 | order, orderItem, orderList | cancelItem, cancelOrder, addCustomItem, placeOrder, updateOrder, placeOrderWithPayment, collectBillExisting, transferToRoom, updateOrderStatus, buildBillPrintPayload |
| customerTransform | `transforms/customerTransform.js` | — | searchResults, customerLookup, customerDetail, crossRestaurantAddresses | createCustomer, updateCustomer, addAddress |
| reportTransform | `transforms/reportTransform.js` | — | paidOrders, cancelledOrders, creditOrders, holdOrders, aggregatorOrders, orderDetails, singleOrderNew | — |
| settingsTransform | `transforms/settingsTransform.js` | — | — | — |

### 2.5 Socket Modules

| Module | File | Lines | Responsibility |
|---|---|---|---|
| socketService | `socket/socketService.js` | 365 | Connection singleton, event pub/sub, reconnection |
| socketEvents | `socket/socketEvents.js` | 151 | Event name constants, channel name generators, config |
| socketHandlers | `socket/socketHandlers.js` | 594 | Business logic for each event type |
| useSocketEvents | `socket/useSocketEvents.js` | 191 | React hook: channel subscription wiring |

### 2.6 Components (non-UI primitives)

| Component Group | Directory | File Count | Key Components |
|---|---|---|---|
| Cards | `components/cards/` | 6 | OrderCard, TableCard, DineInCard, DeliveryCard, OrderTimeline |
| Dashboard | `components/dashboard/` | 3 | ChannelColumn, ChannelColumnsLayout, ResizeHandle |
| Guards | `components/guards/` | 2 | ProtectedRoute, ErrorBoundary |
| Layout | `components/layout/` | 4 | Header, Sidebar, NotificationBanner, NotificationTester |
| Modals | `components/modals/` | 3 | RoomCheckInModal, SplitBillModal, StationPickerModal |
| Order Entry | `components/order-entry/` | 17 | **OrderEntry** (1298 lines), CartPanel (740), CollectPaymentPanel (1235), CategoryPanel, CustomerModal, ItemCustomizationModal, CancelFoodModal, CancelOrderModal, ShiftTableModal, MergeTableModal, TransferFoodModal, AddressPickerModal, AddressFormModal, AddCustomItemModal, ItemNotesModal, OrderNotesModal, OrderPlacedModal, PaymentMethodButton, RePrintButton |
| Panels | `components/panels/` | 6 | SettingsPanel, MenuManagementPanel, CategoryList, ProductCard, ProductForm, ProductList, TableManagementView |
| Reports | `components/reports/` | 8 | OrderTable, OrderDetailSheet, FilterBar, FilterTags, DatePicker, ExportButtons, ReportTabs, SummaryBar |
| Sections | `components/sections/` | 2 | TableSection, OrderSection |
| Station View | `components/station-view/` | 1 | StationPanel |

---

## 3. Cross-Module Interactions

### 3.1 Socket → Context Updates

```
useSocketEvents.js
  │
  ├── reads: useSocket().subscribe, useSocket().isConnected
  ├── reads: useOrders().{addOrder, updateOrder, removeOrder, getOrderById, setOrderEngaged}
  ├── reads: useTables().{updateTableStatus, setTableEngaged}
  ├── reads: useRestaurant().restaurant.id  (for channel names)
  │
  └── channels:
       ├── new_order_{id} → socketHandlers → OrderContext + TableContext
       ├── update_table_{id} → socketHandlers → TableContext (engage only)
       └── order-engage_{id} → socketHandlers → OrderContext (lock/unlock)
```

### 3.2 LoadingPage → All Contexts

LoadingPage is the **central data hydrator**. It calls 7 API services and populates 6 contexts:
- `setUserData` → AuthContext (user + permissions)
- `setRestaurant` → RestaurantContext
- `setCategories`, `setProducts`, `setPopularFood` → MenuContext
- `setTables` → TableContext
- `setCancellationReasons` → SettingsContext
- `setOrders` → OrderContext
- `setAvailableStations`, `initializeConfig`, `setAllStationData` → StationContext

### 3.3 DashboardPage Central Orchestration

DashboardPage (1376 lines) is the **largest module** and the central nervous system:

| Responsibility | How |
|---|---|
| Socket event wiring | `useSocketEvents()` hook call |
| Order display (grid/list/status views) | Reads OrderContext computed values |
| Table display | Reads TableContext + enriches with order data |
| Order operations | Direct API calls for status update, confirm, cancel |
| Navigation to OrderEntry | Opens as side panel |
| Navigation to Reports/Settings | Sidebar links |
| Search across orders/tables | Local client-side search |
| Refresh all data | `useRefreshAllData()` hook |

---

## 4. Duplicate Logic Identification

| Logic | Location 1 | Location 2 | Impact |
|---|---|---|---|
| Table lookup by ID | `tableService.getTableById()` | `TableContext.getTableById()` | Low — service operates on passed arrays, context on internal state |
| Table search by number | `tableService.searchTables()` | `TableContext.searchTables()` | Low — same reason |
| Table filter by status | `tableService.filterByStatus()` | `TableContext.filterByStatus()` | Low |
| Table grouping | `tableService.getTablesBySection()` | `TableContext.getTablesGroupedBySection()` | Low |
| Station config storage key | `stationService.STATION_VIEW_STORAGE_KEY` | `StationContext.STATION_VIEW_STORAGE_KEY` | **MEDIUM** — Two sources of truth for same key name |
| Station default config | `stationService.DEFAULT_STATION_VIEW_CONFIG` (enabled: true) | `StationContext` (stationViewEnabled: false) | **HIGH** — Contradicting defaults! |
| Order role determination | `orderService.getOrderRoleParam()` | LoadingPage inline logic | Low |

---

## 5. Module Ownership Clarity

| Concern | Owner Module | Clarity |
|---|---|---|
| Authentication | AuthContext + authService | **Clear** |
| Socket connection | SocketContext + socketService | **Clear** |
| Push notifications | NotificationContext + firebase config | **Clear** |
| Restaurant configuration | RestaurantContext + profileService | **Clear** |
| Menu data (categories/products) | MenuContext + categoryService + productService | **Clear** |
| Table state | TableContext + tableService | **Clear** (but duplicate helpers) |
| Order state | OrderContext + orderService | **Clear** |
| Order operations (place/update/pay) | orderTransform.toAPI + direct API calls in DashboardPage/OrderEntry | **UNCLEAR** — Business logic scattered between transform and components |
| Cancellation logic | settingsService + CancelOrderModal + CancelFoodModal + orderTransform | **Spread across 4 files** |
| Payment flow | CollectPaymentPanel + paymentMethods.js + orderTransform | **UNCLEAR** — paymentService.js exists but references undefined endpoint |
| Station view | StationContext + stationService + StationPanel | **Clear** |
| Room operations | roomService + RoomCheckInModal + orderTransform (transferToRoom) | **Moderate** |
| Print (KOT/Bill) | orderService.printOrder + orderTransform.buildBillPrintPayload | **Clear** |
| Reports | reportService + reportTransform + report components | **Clear** |
| Sound management | soundManager singleton | **Clear** |
| Business day calculation | utils/businessDay.js | **Clear** |

---

## 6. Module Size Analysis (Complexity Hotspots)

| File | Lines | Assessment |
|---|---|---|
| `pages/DashboardPage.jsx` | 1376 | **🔴 Too large** — Mixes layout, state, operations, search |
| `components/order-entry/OrderEntry.jsx` | 1298 | **🔴 Too large** — Full order taking flow in one component |
| `components/order-entry/CollectPaymentPanel.jsx` | 1235 | **🔴 Too large** — Payment, split, room transfer, tax calc |
| `api/transforms/orderTransform.js` | 843 | **🟡 Large but justified** — Complex domain mapping |
| `components/order-entry/CartPanel.jsx` | 740 | **🟡 Large** — Cart display + item operations |
| `api/services/reportService.js` | 589 | **🟡 Large** — 8+ report types + business day filtering |
| `api/socket/socketHandlers.js` | 594 | **🟡 Large but well-organized** — One handler per event |
| `pages/LoadingPage.jsx` | 530 | **🟡 Large** — 7 loaders + station data + UI |
