# ARCHITECTURE — CURRENT STATE

> Generated: July 2025 | Source: `main` branch, static code analysis
> Confidence levels: HIGH (code-verified), MEDIUM (inferred from patterns), LOW (uncertain)

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER                                     │
│                                                                     │
│  ┌────────────┐  ┌──────────────────────────────┐                  │
│  │  Firebase   │  │     React 19 SPA (CRA+CRACO) │                  │
│  │  Service    │  │                              │                  │
│  │  Worker     │──│  App.js                      │                  │
│  │  (FCM)      │  │  ├── BrowserRouter           │                  │
│  └────────────┘  │  │   ├── /  LoginPage         │                  │
│                  │  │   ├── /loading LoadingPage  │                  │
│                  │  │   ├── /dashboard Dashboard  │                  │
│                  │  │   ├── /reports/*  Reports   │                  │
│                  │  │   └── /visibility/* Config  │                  │
│                  │  ├── AppProviders (9 Contexts)  │                  │
│                  │  └── Toaster                   │                  │
│                  └──────────┬───────────────────┘                  │
│                             │                                       │
│            ┌────────────────┼────────────────┐                     │
│            │                │                │                     │
│       ┌────▼────┐    ┌─────▼─────┐   ┌──────▼──────┐             │
│       │ axios.js │    │ crmAxios  │   │ socketSvc   │             │
│       │ (Main)   │    │ (CRM)     │   │ (socket.io) │             │
│       └────┬─────┘    └─────┬─────┘   └──────┬──────┘             │
└────────────┼────────────────┼────────────────┼─────────────────────┘
             │                │                │
     ┌───────▼────────┐ ┌────▼────────┐ ┌─────▼──────────┐
     │  preprod.       │ │ crm.        │ │ presocket.     │
     │  mygenie.online │ │ mygenie.    │ │ mygenie.online │
     │  (REST API)     │ │ online/api  │ │ (WebSocket)    │
     └────────────────┘ └─────────────┘ └────────────────┘
```

**Confidence: HIGH** — All three external URLs are env-configured and code-verified.

---

## 2. Context Provider Hierarchy

```
<ErrorBoundary>
  <AppProviders>
    <AuthProvider>              ← Token, user, permissions
      <SocketProvider>          ← Connection lifecycle, auth-gated
        <NotificationProvider>  ← FCM + sound playback
          <RestaurantProvider>  ← Restaurant config, features, printers
            <MenuProvider>      ← Categories, products, popular food
              <TableProvider>   ← Tables + rooms (unified), engaged state
                <SettingsProvider>  ← Cancellation reasons, payment layout
                  <OrderProvider>   ← Running orders, CRUD, engaged state
                    <StationProvider>  ← Kitchen station view data
                      {children}
```

**Evidence**: `contexts/AppProviders.jsx` lines 13-34

### Key Design Decisions

| Decision | Evidence | Impact |
|---|---|---|
| Context-only state (no Redux) | No Redux dependency in package.json | Every context change re-renders all consumers |
| Auth gates socket connection | `SocketContext.jsx` line 34 | Socket only connects after login |
| Notification depends on Auth only | Provider order: Auth → Socket → Notification | Sound plays even without socket |
| Order nesting under Table | Provider order in AppProviders.jsx | Orders can access tables but not vice-versa |

**Confidence: HIGH**

---

## 3. Data Loading Flow

```
LoginPage → [token in localStorage] → navigate("/loading")
                                          │
                                    LoadingPage
                                          │
                              Sequential API calls:
                              1. Profile (+ permissions)
                              2. Categories
                              3. Products
                              4. Tables
                              5. Cancellation Reasons
                              6. Popular Food
                              7. Running Orders
                                          │
                              All success? → Station data (parallel)
                                          │
                                    navigate("/dashboard")
```

**Evidence**: `pages/LoadingPage.jsx` lines 318-337 (`loadAllData` function)

### Critical Finding: Sequential Loading

All 7 API calls run **sequentially**, not in parallel. Profile must succeed first (for restaurant config), then the rest run one-by-one. Any failure shows individual error + retry button.

**Confidence: HIGH** — Code clearly shows `for (const key of keysToLoad)` with `await loader(ctrl, data)`.

**Impact: MEDIUM** — Adds 1-3 seconds of unnecessary wait time. Categories, Products, Tables, and Settings could run in parallel after Profile.

---

## 4. Authentication & Token Flow

```
┌──────────┐    POST /api/v1/auth/vendoremployee/login
│ LoginPage │ ──────────────────────────────────────────► MyGenie API
│           │ ◄──────────────────────────────────────────
│           │    { token, role_name, role[], firebase_token }
└──────┬───┘
       │ localStorage.setItem('auth_token', token)
       │ AuthContext.setToken(token)
       ▼
┌──────────────┐
│ axios.js     │  Request interceptor:
│ interceptor  │  config.headers.Authorization = `Bearer ${token}`
└──────────────┘
       │
       │  401 Response interceptor:
       │  → localStorage.removeItem('auth_token')
       │  → window.location.href = '/'  (hard redirect)
```

**Evidence**: 
- `api/services/authService.js` lines 13-32
- `api/axios.js` lines 21-52

### Findings

| Finding | Evidence | Confidence | Impact |
|---|---|---|---|
| No token refresh mechanism | No refresh token endpoint in constants.js | HIGH | Session expires = forced re-login |
| Token stored in localStorage (not httpOnly) | `authService.js` line 20 | HIGH | XSS vulnerability risk |
| 401 causes hard redirect (not React navigation) | `axios.js` line 50 uses `window.location.href` | HIGH | Bypasses React state cleanup |
| "Remember Me" only remembers email, not session | `authService.js` lines 24-29 | HIGH | UX expectation mismatch possible |
| FCM token sent with login | `authTransform.js` line 36 | HIGH | Push notification registration on login |
| ProtectedRoute only checks `!!token` | `ProtectedRoute.jsx` line 10 | HIGH | No token validity check (expired tokens pass) |

---

## 5. Socket Architecture

### Connection Lifecycle

```
Auth success → SocketContext.useEffect → socketService.connect()
                                              │
                              io(SOCKET_CONFIG.URL, options)
                              URL: process.env.REACT_APP_SOCKET_URL
                              transports: ['websocket', 'polling']
                              reconnectionAttempts: 10
                              reconnectionDelay: 1000ms
                              reconnectionDelayMax: 30000ms
                              timeout: 5000ms
```

**Evidence**: `api/socket/socketService.js` lines 43-71, `socketEvents.js` lines 7-18

### Channel Subscription Model

```
Restaurant ID (from profile) → Channel names:

  new_order_{restaurantId}       → 10 event types (order CRUD)
  update_table_{restaurantId}    → 1 event type (table status)
  order-engage_{restaurantId}    → 1 event type (order locking)
```

**Evidence**: `api/socket/socketEvents.js` lines 23-50, `useSocketEvents.js` lines 139-150

### Socket Event Handling Strategy

| Event | Source Channel | Handler | Action |
|---|---|---|---|
| `new-order` | order | handleNewOrder | Transform payload → addOrder + syncTable |
| `update-order` | order | handleOrderDataEvent | Transform payload → updateOrder |
| `update-order-target` | order | handleOrderDataEvent | updateOrder + detect table change |
| `update-order-source` | order | handleOrderDataEvent | removeOrder if terminal, else update |
| `update-order-paid` | order | handleOrderDataEvent | removeOrder if terminal, else update |
| `update-item-status` | order | handleOrderDataEvent | updateOrder |
| `update-food-status` | order | handleUpdateFoodStatus | **Fetch from API** → updateOrder |
| `update-order-status` | order | handleUpdateOrderStatus | Transform payload → update/remove |
| `scan-new-order` | order | handleScanNewOrder | **Fetch from API** → addOrder |
| `delivery-assign-order` | order | handleDeliveryAssignOrder | **Fetch from API** → updateOrder |
| `split-order` | order | handleSplitOrder | Transform payload → updateOrder (original order with reduced items) |
| `update-table` | table | handleUpdateTable | Local table status update |
| `order-engage` | order-engage | handleOrderEngage | Lock/unlock order card |

**Key Pattern**: v2 events (update-order-target/source/paid, update-item-status, split-order) use **inline payload** (no API call). Legacy events (update-food-status, scan-new-order, delivery-assign) still **fetch from API**.

**Evidence**: `api/socket/socketHandlers.js` entire file (594 lines)

### Table Status Derivation (BUG-203 Pattern)

Table status is **derived from order data** inside order event handlers, NOT from the table channel directly. The table channel's `update-table` with `free` status is **intentionally ignored** in v2.

**Evidence**: `socketHandlers.js` lines 4-6 (comment), line 493-496 (ignore free)

### Order/Table Engage Pattern

Both orders and tables use a **temporary locking** mechanism during socket update transactions:

1. Socket `engage` event → set engaged (locked, shows spinner)
2. Process order update
3. `requestAnimationFrame` × 2 → release engaged (unlocked)

**Evidence**: `socketHandlers.js` lines 276-288, `OrderContext.jsx` lines 50-62

---

## 6. API Integration Architecture

### Dual-Instance Pattern

| Instance | File | Base URL | Auth | Purpose |
|---|---|---|---|---|
| `api` | `axios.js` | `REACT_APP_API_BASE_URL` | Bearer token (localStorage) | Main business API |
| `crmApi` | `crmAxios.js` | `REACT_APP_CRM_BASE_URL` | X-API-Key (per restaurant) | Customer/Address CRM |

### Transform Layer (Anti-Corruption Pattern)

```
API Response → transforms/xxxTransform.js (fromAPI) → Frontend Model
Frontend Form → transforms/xxxTransform.js (toAPI) → API Payload
```

Each domain has its own transform file. The largest is `orderTransform.js` (843 lines) which handles:
- Order item mapping (tax, addons, variations)
- Order status mapping (f_order_status → frontend status key)
- Cart item building for API payloads
- Financial calculations (subtotal, tax, rounding)
- Bill print payload construction

**Evidence**: `api/transforms/orderTransform.js`

### "Check In" System Item Filtering (v5)

The backend stores room check-in as a product/category named "Check In" in the food catalog. This system marker is filtered out at **3 levels** to prevent it appearing in UI:

1. `categoryTransform.js` `fromAPI.categoryList` — hides "Check In" category from CategoryPanel
2. `productTransform.js` `fromAPI.productList` — hides "Check In" product from product search/grid
3. `orderTransform.js` `fromAPI.order` — hides "Check In" items from order item lists

**Evidence**: `categoryTransform.js` `.filter(cat => cat.categoryName.toLowerCase() !== 'check in')`, `productTransform.js` `.filter(p => p.productName.toLowerCase() !== 'check in')`, `orderTransform.js` line 204
**Confidence**: HIGH
**Impact**: LOW — Cosmetic, but the 3-location pattern means a new system marker name would need changes in all 3 files

### CRM Per-Restaurant Key Resolution

```
REACT_APP_CRM_API_KEYS = { "364": "dp_live_...", "475": "dp_live_...", ... }
                                │
LoadingPage → profile → restaurant.id → setCrmRestaurantId(id)
                                │
crmAxios interceptor → getCrmApiKey() → X-API-Key header
```

**Evidence**: `crmAxios.js` lines 29-41, `LoadingPage.jsx` line 192

---

## 7. Order Calculation Flow

### Cart Item Financial Calculation

```
basePrice (per unit)
  + addonAmount (sum of addon prices × addon quantities)
  + variationAmount (sum of selected variant option prices)
  = fullUnitPrice

lineTotal = fullUnitPrice × itemQuantity

Tax calculation:
  if Inclusive: taxAmount = lineTotal - (lineTotal / (1 + taxPct/100))
  if Exclusive: taxAmount = lineTotal × (taxPct/100)

  if GST: gst_amount = taxAmount, vat_amount = 0
  if VAT: gst_amount = 0, vat_amount = taxAmount
```

**Evidence**: `orderTransform.js` lines 263-351 (`buildCartItem` function)

### Order-Level Financial Totals

```
For each cart item:
  subtotal += fullUnitPrice × quantity
  gstTax += gst_amount
  vatTax += vat_amount

subtotal = round(subtotal, 2)

Service charge (v3 — July 2025):
  serviceCharge = subtotal × serviceChargePercentage / 100
  GST on service charge:
    avgGstRate = gstTax / subtotal
    gstTax += serviceCharge × avgGstRate

totalTax = gstTax + vatTax
rawTotal = subtotal + serviceCharge + totalTax

Rounding:
  ceilTotal = Math.ceil(rawTotal)
  diff = ceilTotal - rawTotal
  if diff >= 0.10: roundUp = diff, orderAmount = ceilTotal
  else: roundUp = 0, orderAmount = Math.floor(rawTotal)
```

**Evidence**: `orderTransform.js` lines 355-403 (`calcOrderTotals` function)
**v3 change**: `calcOrderTotals` now accepts `serviceChargePercentage` parameter. Service charge computed on food subtotal, with GST added using average item GST rate. `service_tax` field now returned in totals object instead of being hardcoded to 0.

**Confidence: HIGH** — Direct code reading

**RISK**: The rounding logic uses `Math.floor` when diff < 0.10, which could cause customer to pay less than actual. The `>=0.10` threshold is a business rule with no visible documentation.

---

## 7a. `placeOrderWithPayment` Payload Structure (July 2025 Update)

### `partial_payments` Now Mandatory

Previously, `partial_payments` was only included for split payments. Now it is **always sent**, with all 3 modes (cash, card, upi):

```
Single payment (e.g., cash):
  partial_payments: [
    { payment_mode: "cash", payment_amount: 500, grant_amount: 500, transaction_id: "" },
    { payment_mode: "card", payment_amount: 0,   grant_amount: 0,   transaction_id: "" },
    { payment_mode: "upi",  payment_amount: 0,   grant_amount: 0,   transaction_id: "" },
  ]

Split payment:
  partial_payments: [user-specified amounts, missing modes filled with 0]
```

**Evidence**: `orderTransform.js` `placeOrderWithPayment` lines 578-607

### Null → Empty String Migration

Multiple optional fields changed from `null` to `''`:
- `transaction_id`, `discount_type`, `coupon_title`, `coupon_type`, `paid_room`, `room_id`, `address_id`, `discount_member_category_name`, `usage_id`

`tip_amount` changed from numeric `0` to string `'0'`.
`delivery_charge` now stringified: `String(parseFloat(...).toFixed(1))`.
`service_tax` no longer hardcoded to 0 — now uses computed service charge from `calcOrderTotals` (v3).
New field `billing_auto_bill_print: 'Yes'/'No'` added to `placeOrderWithPayment` and `collectBillExisting` (v3, from `settings.autoBill`).

**Evidence**: `orderTransform.js` diff, lines 618-648 (v2), lines 634, 689 (v3)
**Confidence**: HIGH
**Impact**: MEDIUM — Backend must handle empty string the same as null for these fields

### `collectBillExisting` Payload Rewrite (v4 — BUG-252)

The `collectBillExisting` transform (Flow 4: postpaid → paid) was **significantly rewritten** for Old POS payload parity:

```
Before (v1-v3):  ~15 fields — order_id, payment_mode, amounts, taxes, basic discounts
After  (v4):     ~35 fields — adds food_detail[], waiter_id, restaurant_name,
                   full discount breakdown (12 fields), loyalty, wallet, room,
                   TAB-specific name/mobile, grand_amount
```

Key changes:
1. **`food_detail` array** built from placed cart items — per-item: `food_id`, `unit_price`, `quantity`, `variation_amount`, `addon_amount`, `gst_amount`, `vat_amount`, `discount_amount`
2. **TAB payment**: `payment_status` is `'success'` (not `'paid'` like all other methods)
3. **TAB-specific**: `name` + `mobile` fields from `tabContact` for credit tracking
4. **Full discounts**: 12 fields (was 4) — `self_discount`, `coupon_discount`, `coupon_title`, `coupon_type`, `comm_discount`, `discount_type`, `order_discount_type`, `order_discount`, `discount_value`, `used_loyalty_point`, `use_wallet_balance`, `discount_member_category_*`
5. **Employee/restaurant**: `waiter_id` (from `user.employeeId`), `restaurant_name`
6. **Endpoint comment fixed**: was incorrectly noted as "place-order", now correctly "order-bill-payment"

**Evidence**: `orderTransform.js` `collectBillExisting` lines 669-780
**Confidence**: HIGH
**Impact**: HIGH — Major payload expansion. Backend dependency on these exact field names.

**⚠ DUPLICATE LOGIC**: The `food_detail` builder in `collectBillExisting` **duplicates** the `buildCartItem` helper (lines 263-351) — both compute per-item variation_amount, addon_amount, tax. They are NOT shared. Any tax calculation fix must be applied in both places.

---

## 7b. Prepaid Order Flow (July 2025 — New)

```
Place Order with payment_status=paid, payment_type=prepaid
  → Order created with paymentType='prepaid'
  → Dashboard shows order normally
  → OrderEntry detects isPrepaid → blocks item edits, hides Place/Bill buttons
  → On "Mark Served":
      if paymentType === 'prepaid':
        → POST /api/v2/vendoremployee/order/paid-prepaid-order
           { order_id, payment_status: 'paid', service_tax, tip_amount }
      else:
        → PUT /api/v2/vendoremployee/order/order-status-update (normal flow)
```

**Evidence**:
- Detection: `OrderEntry.jsx` — `isPrepaid = orderPaymentType === 'prepaid'`
- Block edits: `OrderEntry.jsx` — `addCustomizedItemToCart` returns early for prepaid
- Mark Served: `DashboardPage.jsx` `handleMarkServed` — calls `completePrepaidOrder()`
- Endpoint: `orderService.js` `completePrepaidOrder()` → `API_ENDPOINTS.PREPAID_ORDER`
- CartPanel: hides Place Order + Collect Bill buttons when `isPrepaid && hasPlacedItems`

**Confidence**: HIGH
**Impact**: HIGH — New order lifecycle path that bypasses normal status update endpoint

---

## 7c. Delta Item Pattern for Placed Item Qty Editing (July 2025 — BUG-237)

Previously, editing a placed item's quantity was a stub (`TODO CHG-040`). Now implemented via delta items:

```
Placed item (qty=2, _originalQty=2) → User clicks + to make qty 3
  → Creates unplaced delta item: { ...placedItem, qty: 1, placed: false, _deltaForId: placedItemId }
  → CartPanel shows combined qty (2+1=3) on placed item row
  → Delta item hidden from display
  → On "Update Order": delta item flows through normal unplaced→API pipeline
  → On socket update: delta items invalidated (filtered by !_deltaForId in cart sync)

Constraints:
  - Cannot decrease below _originalQty (use Cancel Item for that)
  - If qty returns to original, delta item is removed
```

**Evidence**: `OrderEntry.jsx` `updateQuantity` callback, `CartPanel.jsx` `PlacedItemRow` `displayQty` prop
**Confidence**: HIGH
**Impact**: MEDIUM — New item lifecycle pattern that interacts with socket sync

---

## 7d. `orderItemsByTableId` Data Model Change (July 2025 — Breaking)

Previously returned **single object** per tableId. Now returns **array of order objects** per tableId, to support split orders (1 table → N concurrent orders).

```
Before: orderItemsByTableId[tableId] = { orderId, items, amount, ... }
After:  orderItemsByTableId[tableId] = [ { orderId, items, amount, ... }, ... ]
```

All consumers updated: `DashboardPage.jsx` (adaptTable returns array, uses flatMap), `DineInCard.jsx` (find in array by orderId).

**Evidence**: `OrderContext.jsx` lines 249-278
**Confidence**: HIGH
**Impact**: HIGH — Breaking change for any consumer not updated to handle arrays

---

## 7e. Service Charge Flow (v3 — July 2025)

End-to-end service charge implementation:

```
Restaurant Profile API
  → profileTransform.js extracts:
      serviceChargePercentage (number, e.g. 10 for 10%)
      autoServiceCharge (boolean — NOT currently used in code)
  → RestaurantContext.restaurant.serviceChargePercentage

OrderEntry.jsx
  → reads restaurant?.serviceChargePercentage
  → passes to placeOrder / updateOrder / placeOrderWithPayment options

orderTransform.js calcOrderTotals(cart, serviceChargePercentage)
  → serviceCharge = subtotal × rate / 100
  → GST on service charge = serviceCharge × (gstTax / subtotal)  ← avg rate approximation
  → service_tax field in API payload = serviceCharge

CollectPaymentPanel.jsx (UI display)
  → Reads restaurant?.serviceChargePercentage
  → Computes serviceCharge = itemTotal × rate / 100
  → GST on service charge split evenly: SGST += half, CGST += half
  → finalTotal = subtotalAfterDiscount + serviceCharge + sgst + cgst
  → Passes serviceCharge in paymentData for collectBillExisting/transferToRoom

Bill Print (orderService.printOrder → buildBillPrintPayload)
  → serviceChargePercentage passed through
  → Computed on bill's food subtotal independently
  → serviceChargeAmount shown on printed bill
```

**Evidence**: `profileTransform.js` lines 78-81, `orderTransform.js` `calcOrderTotals`, `CollectPaymentPanel.jsx` lines 196-212, `OrderEntry.jsx` lines 549, 582, 981
**Confidence**: HIGH
**Impact**: HIGH — Affects all order financial calculations, bill display, and print output

**NOTE**: `autoServiceCharge` is extracted from the profile but **no code currently reads it**. Only `serviceChargePercentage` is used. See OQ-025.

---


## 8. Print Flow

```
orderService.printOrder(orderId, printType, stationKot, orderData, serviceChargePercentage)
       │
       ├── printType === 'kot'
       │     → { order_id, print_type: 'kot', station_kot: 'KDS,BAR' }
       │
       └── printType === 'bill' && orderData
             → toAPI.buildBillPrintPayload(orderData, serviceChargePercentage)
             → Full bill payload with billFoodList, financial data,
               customer info, table label, formatted date
             → BUG-246 fix (v3): uses unit_price not price (was line total, caused double-counting)
             → Service charge computed from serviceChargePercentage on food subtotal
             → GST on service charge using average item GST rate
             → custName uses order.customerName (raw) not order.customer (display label)

Both → POST /api/v1/vendoremployee/order-temp-store
```

**Evidence**: `api/services/orderService.js` lines 124-141, `orderTransform.js` `buildBillPrintPayload`
**v3 changes**: `printOrder` signature expanded with `serviceChargePercentage`. `buildBillPrintPayload` fixed BUG-246 (unit_price vs price), added service charge computation, uses `customerName` for bill.

### Key Detail: KOT Station Routing

KOT prints are routed to specific kitchen stations. Station names come from product catalog (`product.station` field). The `station_kot` param is a comma-separated list of station names.

**Evidence**: `stationService.js` `getStationsFromOrderItems` function

---

## 9. Notification & Sound Architecture

```
Firebase FCM (foreground) → onMessage callback
                              │
                              ▼
NotificationContext.processNotification(payload)
  1. Extract title/body from payload.notification or payload.data
  2. Resolve sound: explicit key OR infer from content text
  3. soundManager.play(resolvedSound)
  4. Add to notifications array (max 50)

Firebase FCM (background) → Service Worker → postMessage
                              │
                              ▼
navigator.serviceWorker.onmessage
  → if type === 'BACKGROUND_NOTIFICATION'
  → processNotification({ data: payload })
```

**Evidence**: `contexts/NotificationContext.jsx`, `utils/soundManager.js`, `config/firebase.js`

### Sound Files (12 sounds)

Located in `/public/sounds/` — `.wav` format, preloaded on auth.

**Evidence**: `soundManager.js` lines 5-20

---

## 10. Feature Flags

| Flag | Value | Purpose | Evidence |
|---|---|---|---|
| `USE_CHANNEL_LAYOUT` | `true` | Channel-based dashboard columns vs area-based sections | `constants/featureFlags.js` |
| `USE_STATUS_VIEW` | `true` | Enable "By Status" dashboard view toggle | `constants/featureFlags.js` |

Both are currently **ON**. No runtime toggle mechanism — requires code deploy to change.

**Confidence: HIGH**

---

## 11. Local Storage Usage

| Key | Purpose | Set By | Read By |
|---|---|---|---|
| `auth_token` | JWT Bearer token | authService.login | axios interceptor, AuthContext |
| `remember_me` | Persist email flag | authService.login | LoginPage |
| `user_email` | Remembered email | authService.login | LoginPage |
| `mygenie_enable_dynamic_tables` | Dynamic tables setting | SettingsContext | SettingsContext |
| `mygenie_station_view_config` | Station view preferences | StationContext | StationContext |
| `SOCKET_DEBUG` | Socket debug logging | socketService | socketService |

**Evidence**: Various files as noted

---

## 12. Key Architectural Patterns

| Pattern | Where Used | Assessment |
|---|---|---|
| Context-only state management | All state | Simple but limited scalability |
| Service → Transform → Context | All API data | Clean separation, good testability |
| Singleton service (Socket) | `socketService.js` | Appropriate for single connection |
| Ref-based state for polling | `OrderContext`, `TableContext` | Avoids stale closure issues in async |
| requestAnimationFrame for state sync | Socket handlers | Ensures React has painted before releasing locks |
| Feature flags (static) | `featureFlags.js` | No runtime toggle — deploy-only |
| Anti-corruption layer (transforms) | `api/transforms/*` | Isolates API changes from UI |
| Engaged/locked state | Tables + Orders | Prevents concurrent UI updates during socket transactions |
| Delta items for qty editing | `OrderEntry.jsx` | Unplaced delta item linked to placed item via `_deltaForId` |
| Split order: 1 table → N cards | `OrderContext.jsx`, `DashboardPage.jsx` | `orderItemsByTableId` returns array, `adaptTable` returns array |
| Input validation (order-type specific) | `OrderEntry.jsx`, `CartPanel.jsx` | TakeAway→name required, Delivery→name+phone+address required |
| Payment validation | `CollectPaymentPanel.jsx` | Card→4-digit txn ID, TAB→name+phone, Split card→per-row txn ID |
