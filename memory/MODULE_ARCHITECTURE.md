# MyGenie POS Frontend — Module Architecture

**Last Updated:** April 14, 2026
**Purpose:** Scale development across a 4-person team with independently workable modules
**Total Files:** ~110 source files | ~10,000 LOC (core pages + components)

---

## Context Provider Dependency Tree (Critical — Read First)

```
AuthContext           ← Login, token, user, permissions
  └── SocketContext   ← Socket connection, subscribe/emit
      └── NotificationContext  ← Firebase FCM, sound alerts
          └── RestaurantContext  ← Restaurant profile, settings, features, CRM key
              └── MenuContext     ← Categories, products, popular items
                  └── TableContext  ← Table list, table status, table engage
                      └── SettingsContext  ← Visibility, auto-print, column layout
                          └── OrderContext   ← Orders CRUD, order engage
                              └── StationContext  ← KDS stations
```

This hierarchy means: **OrderContext can read from all above contexts, but AuthContext cannot read from OrderContext.** This is important for module boundaries.

---

## Module Breakdown — 4 Persons

### Person 1: ORDER LIFECYCLE (Heaviest — Core Business Logic)

**Owns:** Everything from order creation to order completion

| Layer | Files | LOC |
|-------|-------|-----|
| **Page** | `OrderEntry.jsx` (1298 LOC) | Main order entry orchestrator |
| **Cart** | `CartPanel.jsx` (740) | Cart display, customer inline fields, delivery address strip |
| **Menu** | `CategoryPanel.jsx` | Category + product selection |
| **Customization** | `ItemCustomizationModal.jsx`, `ItemNotesModal.jsx`, `AddCustomItemModal.jsx` | Item modifiers |
| **Order Actions** | `OrderNotesModal.jsx`, `CancelFoodModal.jsx`, `CancelOrderModal.jsx` | Order-level actions |
| **Table Ops** | `ShiftTableModal.jsx`, `MergeTableModal.jsx`, `TransferFoodModal.jsx` | Table/food operations |
| **Print** | `RePrintButton.jsx`, `OrderPlacedModal.jsx` | KOT/Bill printing |
| **API Transform** | `orderTransform.js` (842) | All order payload building (placeOrder, updateOrder, placeOrderWithPayment, manualBill) |
| **API Service** | `orderService.js` | API calls (placeOrder, updateOrderStatus, confirmOrder, foodStatus) |
| **Context** | `OrderContext.jsx` (336) | Orders state, addOrder, updateOrder, removeOrder |
| **Context** | `MenuContext.jsx` | Categories, products, search |

**Contexts this person owns:** `OrderContext`, `MenuContext`
**Contexts this person reads:** `AuthContext`, `RestaurantContext`, `SettingsContext`, `TableContext`

**API Endpoints owned:**
- `POST /place-order`
- `PUT /update-place-order`
- `PUT /order-status-update`
- `PUT /waiter-dinein-order-status-update`
- `PUT /food-status-update`
- `PUT /cancel-food-item`
- `GET /get-categories`
- `GET /get-products-list`

**Key interfaces with other modules:**
- Reads `tables` from Person 2 (for table assignment)
- Reads `socket` from Person 3 (for order-engage wait)
- Reads `customer/address` from Person 4 (for delivery orders)
- Calls `confirmOrder` which triggers socket events handled by Person 3

---

### Person 2: DASHBOARD & REAL-TIME UI (Second Heaviest)

**Owns:** Everything the user sees on the main dashboard — cards, columns, status actions, table management

| Layer | Files | LOC |
|-------|-------|-----|
| **Page** | `DashboardPage.jsx` (1376 LOC) | Main dashboard orchestrator, all status action handlers |
| **Layout** | `ChannelColumnsLayout.jsx`, `ChannelColumn.jsx`, `ResizeHandle.jsx` | Multi-column responsive layout |
| **Cards** | `TableCard.jsx`, `OrderCard.jsx`, `DineInCard.jsx`, `DeliveryCard.jsx` | Order card variants |
| **Card Utils** | `OrderTimeline.jsx`, `IconButton.jsx`, `TextButton.jsx`, `TableCard.styles.js` | Card sub-components |
| **Sections** | `OrderSection.jsx`, `TableSection.jsx` | Legacy section views |
| **Layout Shell** | `Header.jsx`, `Sidebar.jsx` | App chrome |
| **Config** | `StatusConfigPage.jsx` | Visibility & column settings |
| **API Service** | `tableService.js` | Table CRUD |
| **API Transform** | `tableTransform.js` | Table data mapping |
| **Context** | `TableContext.jsx` | Table list, status, engage |
| **Context** | `SettingsContext.jsx` | Visibility settings, column layout |

**Contexts this person owns:** `TableContext`, `SettingsContext`
**Contexts this person reads:** `OrderContext`, `AuthContext`, `RestaurantContext`

**API Endpoints owned:**
- `GET /all-table-list`
- `PUT /order-table-room-switch` (table switch)
- `PUT /transfer-order` (merge table)
- `PUT /transfer-food-item` (food transfer)

**Key interfaces with other modules:**
- Reads `orders` from Person 1 (to display on cards)
- Calls `confirmOrder`, `updateOrderStatus` from Person 1's services
- Receives socket events from Person 3 (table status updates)
- Renders `DeliveryCard` which shows delivery address from Person 4

---

### Person 3: REAL-TIME ENGINE & INFRASTRUCTURE (Socket + Auth + Notifications + System)

**Owns:** Everything that keeps the app alive — socket connection, event processing, auth, notifications, loading, system infrastructure

| Layer | Files | LOC |
|-------|-------|-----|
| **Socket Core** | `socketService.js` | Socket.io connection, reconnection, subscribe/emit |
| **Socket Events** | `socketEvents.js` | Channel naming, event constants, categories |
| **Socket Handlers** | `socketHandlers.js` (593) | All 10 event handlers (newOrder, updateOrderStatus, orderEngage, etc.) |
| **Socket Hook** | `useSocketEvents.js` | Wires socket events to handlers + contexts |
| **Auth** | `LoginPage.jsx`, `authService.js`, `authTransform.js` | Login, token management |
| **Profile** | `profileService.js`, `profileTransform.js` | Profile load, restaurant config, CRM key init |
| **Loading** | `LoadingPage.jsx` (529) | Bootstrap sequence (profile → categories → products → tables → settings → orders) |
| **Notifications** | `NotificationBanner.jsx`, `NotificationTester.jsx` | Firebase FCM, sound alerts |
| **Firebase** | `config/firebase.js` | Firebase initialization, FCM token |
| **Guards** | `ProtectedRoute.jsx`, `ErrorBoundary.jsx` | Auth guard, error boundary |
| **App Shell** | `App.js`, `AppProviders.jsx` | Routing, context provider tree |
| **Axios** | `axios.js`, `crmAxios.js` | HTTP clients (POS + CRM) |
| **Context** | `AuthContext.jsx` | User, token, permissions |
| **Context** | `SocketContext.jsx` | Socket instance, connection state |
| **Context** | `RestaurantContext.jsx` | Restaurant profile, features, defaultOrderStatus, CRM key |
| **Context** | `NotificationContext.jsx` | FCM, notification state |
| **Context** | `StationContext.jsx` | KDS stations |

**Contexts this person owns:** `AuthContext`, `SocketContext`, `RestaurantContext`, `NotificationContext`, `StationContext`
**Contexts this person reads:** `OrderContext`, `TableContext` (via socket handlers to update state)

**Socket events owned (all 10 flows):**
- `new-order` → `handleNewOrder`
- `update-order` → `handleOrderDataEvent`
- `update-order-paid` → `handleOrderDataEvent`
- `update-order-status` → `handleUpdateOrderStatus`
- `update-order-target` / `update-order-source` → `handleOrderDataEvent`
- `update-item-status` → `handleOrderDataEvent`
- `update-food-status` → `handleUpdateFoodStatus`
- `order-engage` → `handleOrderEngage`
- Table channel events → `handleNewOrder`

**Key interfaces with other modules:**
- Socket handlers call `addOrder`, `updateOrder`, `removeOrder` from Person 1's OrderContext
- Socket handlers call `updateTableStatus`, `setTableEngaged` from Person 2's TableContext
- Socket handlers use `orderTransform` from Person 1 to parse payloads
- `LoadingPage` calls services from ALL modules (profile, categories, products, tables, settings, orders)

---

### Person 4: CRM & DELIVERY & PAYMENTS & REPORTS (Customer-Facing Features)

**Owns:** Everything customer-related (CRM integration, delivery flow, addresses), payment collection, and reports

| Layer | Files | LOC |
|-------|-------|-----|
| **CRM Axios** | `crmAxios.js` | CRM HTTP client with per-restaurant API key |
| **CRM Service** | `customerService.js` | 10 functions: search, lookup, create, update, address CRUD |
| **CRM Transform** | `customerTransform.js` | CRM response → frontend mapping |
| **Customer UI** | `CustomerModal.jsx` | Create/update customer via CRM |
| **Address Picker** | `AddressPickerModal.jsx` | Address selection (cross-restaurant) |
| **Address Form** | `AddressFormModal.jsx` | Google Places Autocomplete + address form |
| **Payment** | `CollectPaymentPanel.jsx` (1235 LOC) | Payment collection, split bill, payment modes |
| **Payment Modal** | `SplitBillModal.jsx` | Split bill workflow |
| **Payment Service** | `paymentService.js` | Bill/payment API calls |
| **Payment Button** | `PaymentMethodButton.jsx` | Payment method selector |
| **Reports Page** | `AllOrdersReportPage.jsx`, `OrderSummaryPage.jsx` | Order reports |
| **Report Components** | `DatePicker.jsx`, `ExportButtons.jsx`, `FilterBar.jsx`, `FilterTags.jsx`, `OrderDetailSheet.jsx`, `OrderTable.jsx`, `ReportTabs.jsx`, `SummaryBar.jsx` | Report UI |
| **Report Service** | `reportService.js`, `reportTransform.js` | Report API calls |
| **Room** | `RoomCheckInModal.jsx`, `roomService.js` | Hotel room check-in |
| **Station** | `StationPanel.jsx`, `StationPickerModal.jsx`, `stationService.js` | KDS station view |
| **Settings UI** | `SettingsPanel.jsx`, `MenuManagementPanel.jsx` | Admin panels |

**Contexts this person owns:** None (uses existing contexts as consumer)
**Contexts this person reads:** `RestaurantContext` (CRM key, restaurant ID), `AuthContext` (user), `SettingsContext`, `TableContext`

**CRM API Endpoints owned (all 23):**
- `GET /pos/customers?search=`
- `POST /pos/customer-lookup`
- `GET /pos/customers/{id}`
- `POST /pos/customers`
- `PUT /pos/customers/{id}`
- `POST /pos/address-lookup`
- `POST /pos/customers/{id}/addresses`
- `PUT /pos/customers/{id}/addresses/{addr_id}`
- `DELETE /pos/customers/{id}/addresses/{addr_id}`
- `PUT .../default`
- Phase 5: loyalty, coupons, notes, WhatsApp (9 endpoints)

**POS API Endpoints owned:**
- `POST /order-bill-payment`
- `POST /order-temp-store` (print)
- `GET /paid-order-list`
- `GET /cancel-order-list`
- `GET /paid-in-tab-order-list`
- `GET /daily-sales-revenue-report`
- `GET /report/order-logs-report`
- `POST /pos/user-group-check-in`

**Key interfaces with other modules:**
- Customer/address data flows into Person 1's `orderTransform` (address_id, cust_name, cust_mobile)
- Payment triggers socket events handled by Person 3
- Reports read order data from POS API (independent of other modules)

---

## Interface Contract Between Modules

### Shared Data Shapes (All persons must agree on these)

```
Order {
  orderId, tableId, tableName, status, orderType,
  items[], customer { id, name, phone },
  deliveryAddress, deliveryCharge, addressId
}

Customer {
  id, name, phone, email, dob, anniversary,
  tier, totalPoints, walletBalance, addresses[]
}

Address {
  id, addressType, address, house, floor, road,
  city, state, pincode, latitude, longitude,
  contactPersonName, contactPersonNumber, deliveryInstructions
}

Table {
  tableId, tableName, status, areaId, areaName,
  orders[], engaged
}
```

### Cross-Module Function Calls

| Caller (Person) | Function | Owner (Person) | Via |
|-----------------|----------|----------------|-----|
| 2 (Dashboard) | `confirmOrder()` | 1 (Order) | `orderService.js` import |
| 2 (Dashboard) | `updateOrderStatus()` | 1 (Order) | `orderService.js` import |
| 3 (Socket) | `addOrder()`, `updateOrder()`, `removeOrder()` | 1 (Order) | `OrderContext` |
| 3 (Socket) | `updateTableStatus()`, `setTableEngaged()` | 2 (Dashboard) | `TableContext` |
| 3 (Socket) | `orderFromAPI.order()` | 1 (Order) | `orderTransform.js` import |
| 4 (CRM) | `selectedAddress.id` → `orderTransform` | 1 (Order) | Props via `OrderEntry.jsx` |
| 1 (Order) | `searchCustomers()` | 4 (CRM) | `customerService.js` import |
| 1 (Order) | `lookupAddresses()` | 4 (CRM) | `customerService.js` import |

---

## Workload Distribution

| Person | Module | Estimated Complexity | Hot Files (most changed) |
|--------|--------|---------------------|-------------------------|
| **1** | Order Lifecycle | **High** (1298 + 842 + 740 LOC core) | `OrderEntry.jsx`, `orderTransform.js`, `CartPanel.jsx` |
| **2** | Dashboard & UI | **High** (1376 LOC core) | `DashboardPage.jsx`, `TableCard.jsx`, `ChannelColumn.jsx` |
| **3** | Real-Time & Infra | **Medium-High** (593 + 529 LOC core) | `socketHandlers.js`, `LoadingPage.jsx`, `useSocketEvents.js` |
| **4** | CRM & Payments & Reports | **Medium** (1235 + distributed) | `CollectPaymentPanel.jsx`, `customerService.js`, `AddressFormModal.jsx` |

---

## Git Branching Strategy (Recommended)

```
main
├── module/order-lifecycle    (Person 1)
├── module/dashboard-ui       (Person 2)
├── module/realtime-infra     (Person 3)
└── module/crm-payments       (Person 4)
```

### Merge Order (when integrating):
1. **Person 3 first** (Infra — contexts, socket, auth)
2. **Person 1 second** (Order — depends on contexts)
3. **Person 2 third** (Dashboard — depends on orders + tables)
4. **Person 4 last** (CRM/Payments — most independent, least conflicts)

---

## Conflict Zones (Files Multiple Persons Touch)

| File | Persons | Why | Resolution |
|------|---------|-----|------------|
| `api/constants.js` | All 4 | Everyone adds endpoints | Section-based ownership (clearly commented sections) |
| `OrderEntry.jsx` | 1 + 4 | Person 1 owns it, Person 4 adds CRM/address props | Person 4 defines interface, Person 1 integrates |
| `DashboardPage.jsx` | 2 + 1 | Person 2 owns it, imports from Person 1's services | Person 1 keeps service signatures stable |
| `LoadingPage.jsx` | 3 + all | Person 3 owns it, calls all module services | Each person adds their init call, Person 3 reviews |
| `AppProviders.jsx` | 3 | Only Person 3 touches context tree | No conflicts |

---

## Independent Work Guarantee

| Person | Can work without waiting for | Must coordinate with |
|--------|------------------------------|---------------------|
| **1** | Persons 2, 3, 4 | Person 4 for customer data shape |
| **2** | Persons 1, 4 | Person 3 for socket event changes |
| **3** | Persons 2, 4 | Person 1 for orderTransform changes |
| **4** | Persons 1, 2, 3 | Person 1 for address_id in payload |
