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
| OrderContext | `contexts/OrderContext.jsx` | 344 | orders[] (unified), engagedOrders | DashboardPage, socketHandlers | Computed: dineIn/takeAway/delivery/table/walkIn orders. **`orderItemsByTableId` returns ARRAY per tableId (July 2025 — split order support)** |
| StationContext | `contexts/StationContext.jsx` | 162 | stationData, availableStations, enabledStations | DashboardPage (StationPanel) | Config persisted in localStorage |

### 2.3 API Services

| Service | File | Lines | Axios Instance | Endpoints Used | Transform |
|---|---|---|---|---|---|
| authService | `services/authService.js` | 79 | api (main) | LOGIN | authTransform |
| profileService | `services/profileService.js` | 15 | api | PROFILE | profileTransform |
| categoryService | `services/categoryService.js` | — | api | CATEGORIES | categoryTransform |
| productService | `services/productService.js` | — | api | PRODUCTS, POPULAR_FOOD | productTransform |
| tableService | `services/tableService.js` | 110 | api | TABLES | tableTransform |
| orderService | `services/orderService.js` | 147 | api (main) | RUNNING_ORDERS, SINGLE_ORDER_NEW, ORDER_STATUS_UPDATE, CONFIRM_ORDER, **PREPAID_ORDER (new)**, SPLIT_ORDER (v2), PRINT_ORDER | orderTransform |

**v3 change to orderService**: `printOrder` signature expanded: `(orderId, printType, stationKot, orderData, serviceChargePercentage)` — passes service charge rate to bill print payload builder.
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
| profileTransform | `transforms/profileTransform.js` | 207 | profileResponse, user, restaurant, paymentTypes, discountTypes, printers, schedules, settings | — (Phase 2) |

**v3 change to profileTransform**: New fields extracted in `restaurant`: `serviceChargePercentage` (from `api.service_charge_percentage`), `autoServiceCharge` (from `api.auto_service_charge`). Evidence: `profileTransform.js` lines 78-81.
| categoryTransform | `transforms/categoryTransform.js` | — | — | — |
| productTransform | `transforms/productTransform.js` | — | — | — |
| tableTransform | `transforms/tableTransform.js` | 166 | tableList, table, groupBySection, getSections | shiftTable, transferFood, mergeTable |
| orderTransform | `transforms/orderTransform.js` | 843 | order, orderItem, orderList | cancelItem, cancelOrder, addCustomItem, placeOrder, updateOrder, placeOrderWithPayment, collectBillExisting, transferToRoom, updateOrderStatus, buildBillPrintPayload |

**July 2025 changes to orderTransform**:
- `fromAPI.order` now extracts `paymentType` from `api.payment_type` (for prepaid detection)
- `fromAPI.order` now extracts `customerName` (raw name, v3) separate from `customer` (display label with fallback)
- `toAPI.placeOrderWithPayment`: `partial_payments` always included (all 3 modes), `null`→`''` for optional fields, `tip_amount` now string
- `calcOrderTotals` signature changed: now `(cart, serviceChargePercentage=0)` — service charge computed on food subtotal (v3)
- `buildBillPrintPayload` signature changed: now `(order, serviceChargePercentage=0)` — BUG-246 fix: uses `unit_price` not `price`, computes service charge (v3)
- `placeOrder/updateOrder/placeOrderWithPayment/collectBillExisting` accept `serviceChargePercentage` and `autoBill` options (v3)
- New field `billing_auto_bill_print` in prepaid and collect bill payloads (v3)
- `collectBillExisting` **major rewrite** (v4 — BUG-252): builds `food_detail[]` from cart items, 12 discount fields, TAB `payment_status: 'success'`, `waiter_id`/`restaurant_name`, `name`/`mobile` for TAB. **Duplicates `buildCartItem` logic** for item-level financial computation.
| customerTransform | `transforms/customerTransform.js` | — | searchResults, customerLookup, customerDetail, crossRestaurantAddresses | createCustomer, updateCustomer, addAddress |
| reportTransform | `transforms/reportTransform.js` | — | paidOrders, cancelledOrders, creditOrders, holdOrders, aggregatorOrders, orderDetails, singleOrderNew | — |
| settingsTransform | `transforms/settingsTransform.js` | — | — | — |

### 2.5 Socket Modules

| Module | File | Lines | Responsibility |
|---|---|---|---|
| socketService | `socket/socketService.js` | 365 | Connection singleton, event pub/sub, reconnection |
| socketEvents | `socket/socketEvents.js` | 151 | Event name constants, channel name generators, config |
| socketHandlers | `socket/socketHandlers.js` | 652 | Business logic for each event type, **includes `handleSplitOrder` (July 2025)** |
| useSocketEvents | `socket/useSocketEvents.js` | 195 | React hook: channel subscription wiring (12 event types) |

### 2.6 Components (non-UI primitives)

| Component Group | Directory | File Count | Key Components |
|---|---|---|---|
| Cards | `components/cards/` | 6 | OrderCard, TableCard, DineInCard, DeliveryCard, OrderTimeline |
| Dashboard | `components/dashboard/` | 3 | ChannelColumn, ChannelColumnsLayout, ResizeHandle |
| Guards | `components/guards/` | 2 | ProtectedRoute, ErrorBoundary |
| Layout | `components/layout/` | 4 | Header, Sidebar, NotificationBanner, NotificationTester |
| Modals | `components/modals/` | 3 | RoomCheckInModal, SplitBillModal, StationPickerModal |
| Order Entry | `components/order-entry/` | 17 | **OrderEntry** (1429 lines), CartPanel (781), CollectPaymentPanel (1390), CategoryPanel, CustomerModal, ItemCustomizationModal, CancelFoodModal, CancelOrderModal, ShiftTableModal, MergeTableModal, TransferFoodModal, AddressPickerModal, AddressFormModal, AddCustomItemModal, ItemNotesModal, OrderNotesModal, OrderPlacedModal, PaymentMethodButton, RePrintButton |

**v4 note**: Shift Table, Merge Table, and Food Transfer actions are now **hidden for TakeAway/Delivery orders** (no physical table). Evidence: `OrderEntry.jsx` lines 831, 843; `CartPanel.jsx` line 619.
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
| **Per-item financial computation** | **`buildCartItem()` (lines 263-351)** | **`collectBillExisting` `food_detail` builder (lines 680-730)** | **HIGH — Both compute variation_amount, addon_amount, gst/vat per item. Not shared. Tax fix in one will not propagate to the other. (v4 — BUG-252)** |

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
| `pages/DashboardPage.jsx` | 1421 | **🔴 Too large** — Mixes layout, state, operations, search. Grew +45 lines (v2: split order support + prepaid flow) |
| `components/order-entry/OrderEntry.jsx` | 1429 | **🔴 Too large** — Full order taking flow. Grew +131 lines (v2: delta items, validations, prepaid; v3: service charge, autoBill, BUG-267) |
| `components/order-entry/CollectPaymentPanel.jsx` | 1390 | **🔴 Too large** — Payment, split, room transfer, tax calc. Grew +155 lines (v2: card txn ID, TAB customer; v3: service charge UI + computation) |
| `api/transforms/orderTransform.js` | 843 | **🟡 Large but justified** — Complex domain mapping |
| `components/order-entry/CartPanel.jsx` | 781 | **🟡 Large** — Cart display + item operations. Grew +41 lines (delta display, validation hints) |
| `api/services/reportService.js` | 589 | **🟡 Large** — 8+ report types + business day filtering |
| `api/socket/socketHandlers.js` | 594 | **🟡 Large but well-organized** — One handler per event |
| `pages/LoadingPage.jsx` | 530 | **🟡 Large** — 7 loaders + station data + UI |
