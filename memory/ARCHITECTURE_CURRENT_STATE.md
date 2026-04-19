# ARCHITECTURE — CURRENT STATE (v2)

> Generated: 2026 (v2 revision) | Source: `main` branch, static code analysis
> Confidence levels: HIGH (code-verified), MEDIUM (inferred from patterns), LOW (uncertain)
> Change from v1: adds v2 socket event routing, order-engage channel, engage/wait primitives, BUG-273/276/277/281 calculation semantics, auto-print flow, and contradictions in table-channel usage.

---

## 1. High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                  │
│  ┌─────────────────┐   ┌───────────────────────────────────────┐     │
│  │ firebase-       │   │       React 19 SPA (CRA + CRACO)      │     │
│  │ messaging-sw.js │──▶│  index.js → <StrictMode>              │     │
│  │  (background    │   │    App.js                             │     │
│  │  FCM handler)   │   │    ├── <ErrorBoundary>                │     │
│  └─────────────────┘   │    │   └── <AppProviders>             │     │
│                        │    │        ├── Auth                  │     │
│                        │    │        ├── Socket                │     │
│                        │    │        ├── Notification (FCM)    │     │
│                        │    │        ├── Restaurant            │     │
│                        │    │        ├── Menu                  │     │
│                        │    │        ├── Table                 │     │
│                        │    │        ├── Settings              │     │
│                        │    │        ├── Order                 │     │
│                        │    │        └── Station               │     │
│                        │    └── <BrowserRouter><Routes>...     │     │
│                        └───────────────┬───────────────────────┘     │
│                                        │                              │
│       ┌────────────────────────────────┼────────────────────────┐    │
│       │                                │                         │    │
│  ┌────▼─────┐    ┌──────────┐    ┌────▼─────────┐                │    │
│  │ axios.js │    │ crmAxios │    │ socketService│                │    │
│  │ (Bearer) │    │ (X-API-  │    │ (Socket.IO)  │                │    │
│  └────┬─────┘    │  Key)    │    └──────┬───────┘                │    │
│       │          └────┬─────┘           │                        │    │
└───────┼───────────────┼─────────────────┼────────────────────────┘    │
        ▼               ▼                 ▼                             │
 ┌──────────────┐ ┌─────────────┐ ┌────────────────┐                   │
 │ REACT_APP_   │ │ REACT_APP_  │ │ REACT_APP_     │                   │
 │ API_BASE_URL │ │ CRM_BASE_URL│ │ SOCKET_URL     │                   │
 │ (REST)       │ │ (REST)      │ │ (WebSocket)    │                   │
 └──────────────┘ └─────────────┘ └────────────────┘                   │
```

**Confidence: HIGH** — All three URLs are env-driven. `axios.js` and `socketEvents.js` throw at import time if missing; `crmAxios.js` only warns.

---

## 2. Context Provider Hierarchy

Source: `src/contexts/AppProviders.jsx` (outer → inner):

```
<ErrorBoundary>                                 (guards/ErrorBoundary.jsx)
  <AppProviders>
    <AuthProvider>                              token, user, permissions
      <SocketProvider>                          connection lifecycle (auth-gated)
        <NotificationProvider>                  FCM foreground + SW-fwd background + sound
          <RestaurantProvider>                  restaurant config, features, SC%, printers
            <MenuProvider>                      categories, products, popular food
              <TableProvider>                   tables + rooms unified, engagedTables Set
                <SettingsProvider>              cancellation reasons, paymentLayoutConfig
                  <OrderProvider>               orders unified, engagedOrders Set, wait-for helpers
                    <StationProvider>           station view (localStorage-backed)
                      {children}
```

**Key design decisions (evidence-verified):**

| Decision | Evidence | Impact |
|---|---|---|
| Context-only state (no Redux / Zustand) | no state-mgmt package in `package.json` | Every context change re-renders all subscribers; refs used heavily to work around (e.g. `ordersRef`, `engagedTablesRef`) |
| Auth gates socket connection | `SocketContext.jsx` lines 33–64 — `useEffect` watches `isAuthenticated` | Socket only connects after login; disconnects on logout |
| Notification provider sits above Restaurant | `AppProviders.jsx` line 17 | Sound playback works even if REST calls haven’t completed |
| Order nested under Table | `AppProviders.jsx` line 22 | Order handlers in socket layer can call `useTables` hooks; table providers cannot read orders (no reverse dependency) |
| Two refs per context for lock state | `engagedOrdersRef`, `engagedTablesRef`, `ordersRef` | Lets socket handlers / poll loops read current state without closure staleness |

**Confidence: HIGH**

---

## 3. Data Loading Flow (Login → Dashboard)

Source: `pages/LoginPage.jsx` → `pages/LoadingPage.jsx`.

```
LoginPage
  └─ authService.login() → sets localStorage.auth_token
     └─ navigate("/loading")
         └─ LoadingPage.useEffect → loadAllData(ctrl)
             └─ SEQUENTIAL (7 steps in fixed order, API_LOADING_ORDER)
                1. profileService.getProfile()
                    ├─ setUserData(user, permissions) → AuthContext
                    ├─ setRestaurant(restaurant)      → RestaurantContext
                    └─ setCrmRestaurantId(id)         → crmAxios (sets X-API-Key)
                2. categoryService.getCategories()
                3. productService.getProducts({limit:500, offset:1, type:'all'})
                    └─ data.categories = calculateItemCounts(...)  (in-memory only)
                4. tableService.getTables()           → setTables
                5. settingsService.getCancellationReasons({limit:100}) → setCancellationReasons
                6. productService.getPopularFood(...)
                7. orderService.getRunningOrders(roleParam)  → setOrders

             After all 7 succeed:
             └─ loadStationData()  (parallel station fetches per enabled station)
                 └─ setAllStationData(data)
                 └─ navigate("/dashboard")  (500ms delay)

             On any error:
             └─ show inline error + retry-only-failed button
```

Notes:
- **No parallelism among the 7 main steps** — see RISK-006 in v1 (still present).
- Categories item counts are calculated on the client from products, then re-dispatched.
- Live elapsed-time timer renders every 100ms; not canceled on errors until `isComplete`.

**Confidence: HIGH**

---

## 4. Socket Event & Channel Flow (v2)

### 4.1 Connection

- Service: `api/socket/socketService.js` (singleton, also exposed as `window.__SOCKET_SERVICE__` in development).
- Transports: `['websocket', 'polling']` (websocket preferred).
- Reconnection: enabled, 10 attempts, 1–30s backoff.
- Auth: `SocketContext` only calls `socketService.connect()` when `isAuthenticated` is true. **No handshake auth/token is passed to Socket.IO** — see OPEN_QUESTIONS OQ-107.

### 4.2 Channels Subscribed

Source: `api/socket/useSocketEvents.js` lines 144–154.

| Channel (template) | Purpose | Handler |
|---|---|---|
| `new_order_${restaurantId}` | All order-data events (includes v2 payload events) | `handleOrderChannelEvent` → switch on `args[0]` |
| `update_table_${restaurantId}` | Table engage/free | `handleTableChannelEvent` → `handleUpdateTable` |
| `order-engage_${restaurantId}` | Order-level lock events | `handleOrderEngageChannelEvent` → `handleOrderEngage` |

**Contradiction (HIGH confidence)**: `socketHandlers.js` (file header comment, lines 4–6) and `useSocketEvents.js` (lines 4–6, 126) both assert that the `update-table` channel was removed per BUG-203, yet `useSocketEvents.js` lines 146 and 153 actively subscribe to `getTableChannel(restaurantId)` and invoke `handleUpdateTable`. The runtime behavior disagrees with the documentation comments. See OPEN_QUESTIONS OQ-106.

### 4.3 Event Types (source: `api/socket/socketEvents.js`)

| Event | Channel | Payload shape (per code) | Handler | Category |
|---|---|---|---|---|
| `new-order` | new_order_* | `[event, orderId, restId, fOrderStatus, {orders:[...]}, {table_info:{...}}]` | `handleNewOrder` | EVENTS_WITH_PAYLOAD |
| `update-order` | new_order_* | `[event, orderId, restId, fOrderStatus, {orders:[...]}]` | `handleOrderDataEvent('update-order')` | EVENTS_WITH_PAYLOAD |
| `update-order-target` | new_order_* | same as update-order | `handleOrderDataEvent('update-order-target')` — detects table change | EVENTS_WITH_PAYLOAD |
| `update-order-source` | new_order_* | same | `handleOrderDataEvent('update-order-source')` — if cancelled/paid → remove | EVENTS_WITH_PAYLOAD |
| `update-order-paid` | new_order_* | same | `handleOrderDataEvent('update-order-paid')` — if cancelled/paid → remove | EVENTS_WITH_PAYLOAD |
| `update-item-status` | new_order_* | same | `handleOrderDataEvent('update-item-status')` | EVENTS_WITH_PAYLOAD |
| `split-order` | new_order_* | `[event, orderId, restId, fOrderStatus, {orders:[...]}]` (original order only) | `handleSplitOrder` — only updates original | EVENTS_WITH_PAYLOAD |
| `update-food-status` | new_order_* | `[event, orderId, restId, fOrderStatus]` (no payload) | `handleUpdateFoodStatus` — fetches GET single order; engages table as WORKAROUND | EVENTS_REQUIRING_ORDER_API |
| `update-order-status` | new_order_* | `[event, orderId, restId, fOrderStatus, {orders:[...]}]` (now carries payload) | `handleUpdateOrderStatus` — branches on API status, not socket status | EVENTS_REQUIRING_ORDER_API (name kept, but it now reads payload) |
| `scan-new-order` | new_order_* | `[event, orderId, restId, fOrderStatus]` | `handleScanNewOrder` → GET then addOrder | EVENTS_REQUIRING_ORDER_API |
| `delivery-assign-order` | new_order_* | `[event, orderId, restId, riderId]` | `handleDeliveryAssignOrder` → GET then updateOrder | EVENTS_REQUIRING_ORDER_API |
| `update-table` | update_table_* | `[event, tableId, restId, status]` | `handleUpdateTable` — `engage` → lock; `free` → ignored (v2 comment says derive from order) | EVENTS_TABLE_UPDATE |
| `order-engage` | order-engage_* | `[orderId, restaurantOrderId, restId, status]` (no event-name prefix) | `handleOrderEngage` | Special — new channel |
| `aggrigator-order`, `aggrigator-order-update` | aggregator_order_* | Listed in `AGGREGATOR_EVENTS` | **No subscription code present** in `useSocketEvents.js` | Declared, dead in runtime |

### 4.4 Handler Dispatch

- `useSocketEvents.js` defines three channel callbacks (`handleOrderChannelEvent`, `handleTableChannelEvent`, `handleOrderEngageChannelEvent`).
- Channel callbacks are wrapped with `socketService.on()`, which adds a DEBUG-level log and a cleanup reference.
- The handlers receive `actionsRef.current` (Order + Table context actions) so that function identity changes don’t cause re-subscribe churn.

### 4.5 Order Engage / Table Engage Protocol (v2)

`OrderEntry.jsx` and `DashboardPage.jsx` use this pattern for HTTP mutations:

```
// Before the mutation
const engagePromise = waitForOrderEngaged(orderId)   // polls engagedOrdersRef every 50 ms
api.put/post(...).then(...).catch(...)               // fire-and-forget; error toast in .catch
await engagePromise                                  // blocks UI until socket says "engaged"
onClose()                                            // redirect
```

- `setOrderEngaged` is invoked by `handleOrderEngage` (status `engage`).
- Handlers for data events release engage after React paints: `requestAnimationFrame(() => rAF(() => setOrderEngaged(id, false)))`.
- Same pattern for tables: `waitForTableEngaged` used on `handlePlaceOrder`, `handleShift`.

**Impact**: The UX is socket-first (user sees dashboard change when socket event arrives, not when HTTP responds). HTTP responses are only consumed for toasts and (BUG-273) to capture the new `order_id` for auto-print.

### 4.6 Retry / Retry-Free Events

- `handleUpdateFoodStatus` and `handleScanNewOrder` / `handleDeliveryAssignOrder` still do `fetchOrderWithRetry(orderId, retries=1)` — one retry after 1s.
- Data-carrying v2 events (`update-order*`, `update-item-status`, `split-order`, `new-order`, `update-order-status`) do **not** fetch GET. They transform `payload.orders[0]` directly. If payload is missing/empty → log ERROR and bail (see OQ-102).

**Confidence: HIGH**

---

## 5. Order Calculation Flow

There are **three pricing/tax computation sites**. They are related but not identical.

### 5.1 Place Order / Update Order / Place+Pay payloads
Source: `api/transforms/orderTransform.js` `buildCartItem` (lines 265–353) and `calcOrderTotals` (lines 361–405).

Per item (`buildCartItem`):
- `basePrice = item.price`
- `addonAmount = Σ(addon.price × addon.qty)`
- `variationAmount = Σ(variant option.price)` (derived from `selectedVariants` map keyed by group id, fallback to `item.variation` if present)
- `fullUnitPrice = basePrice + addonAmount + variationAmount`
- `foodAmount = basePrice × qty` (note: this is the BASE × qty, NOT `fullUnitPrice × qty`)
- Tax: `lineTotal = fullUnitPrice × qty`; inclusive→extract, exclusive→add-on. Split as GST or VAT based on `tax.type`.
- Returns `_fullUnitPrice` helper (stripped before sending).

Order totals (`calcOrderTotals`):
- `subtotal = Σ (fullUnitPrice × qty)` across all built items
- `serviceCharge = round(subtotal × serviceChargePercentage / 100, 2)` when > 0
- If `serviceCharge > 0 AND subtotal > 0` → add `serviceCharge × (gstTax/subtotal)` to `gstTax` (weighted-average GST rate applied to SC)
- `totalTax = gstTax + vatTax`
- `rawTotal = subtotal + serviceCharge + totalTax`
- **Rounding**: `diff = Math.ceil(rawTotal) − rawTotal`. If `diff ≥ 0.10` → `orderAmount = ceil`, `round_up = diff`. Else → `orderAmount = floor(rawTotal)`, `round_up = 0`.

**Confidence: HIGH** — business rationale of the 0.10 threshold not visible (see OQ-001).

### 5.2 Collect Payment panel (on-screen math)
Source: `components/order-entry/CollectPaymentPanel.jsx` lines 179–272.

Order of operations (BUG-281, Feb 2026 change):
1. `itemTotal = Σ getItemLinePrice(item)` for non-cancelled items.
2. `presetDiscount`, `manualDiscount`, `loyaltyDiscount`, `couponDiscount`, `walletDiscount` → `totalDiscount`.
3. `subtotalAfterDiscount = max(0, itemTotal − totalDiscount)`.
4. `serviceCharge = itemTotal × SC% / 100` (rounded) — note: SC is on `itemTotal` (pre-discount), **not** `subtotalAfterDiscount`. Gated by `serviceChargeEnabled` toggle (BUG-276).
5. GST / CGST / SGST computed per-item on `getItemLinePrice(item)`; SC GST = `serviceCharge × ((sgst+cgst)/itemTotal)` added 50/50 to SGST/CGST rows.
6. `deliveryCharge` from input (delivery orders only); `tip` from input (feature-flagged).
7. **Subtotal (displayed) = `subtotalAfterDiscount + serviceCharge + tip`** (pre-tax complete).
8. `rawFinalTotal = subtotal + sgst + cgst + deliveryCharge`.
9. Round-off rule: same `≥ 0.10` rule as backend payloads.

Additional (BUG-281 Gap-4): a second tax memo `printTaxTotals` is computed with **per-item prorated discount** adjustment; this is fed only into the print payload override, not the UI and not the API payload for `order-bill-payment`.

**Contradiction/risk**: 
- `orderTransform.calcOrderTotals` applies SC GST based on `gstTax/subtotal` whereas the panel applies it based on `(sgst+cgst)/itemTotal`. Both end up similar in the common all-GST case but diverge when any item has VAT.
- SC is computed on `itemTotal` in the panel but on `subtotal` (≈ itemTotal, no discount at that layer) in `calcOrderTotals`. The panel flow thus includes SC on pre-discount base while the API payload for a new order doesn't know about discounts at all — see OQ-101.

### 5.3 Bill-print payload
Source: `orderTransform.js` `buildBillPrintPayload` (lines 867–1004).

- Recomputes GST/VAT from `rawOrderDetails` per-line (unit_price × qty) as a fallback.
- `serviceChargeAmount` = override if provided, else `subtotal × SC%/100` or `order.serviceTax`.
- `finalOrderSubtotal` = override if provided, else `itemBase + SC + tip` (BUG-281 semantic, matching panel).
- GST-on-SC added when not overridden.

**Three paths that call this** (evidence — see MODULE_MAP §5):
1. `OrderEntry` auto-print after new-order (no overrides)
2. `CollectPaymentPanel.handlePrintBill` (full override set)
3. `TableCard` / `OrderCard` printer icon (dashboard) (no overrides — uses socket-hydrated order)

---

## 6. Printing Flow

```
User action                              Code path                             Endpoint
-----------                              ---------                             --------
RePrintButton (KOT)                     getStationsFromOrderItems             PRINT_ORDER
  └─ 1 station → executePrintKot         ─→ printOrder(id,'kot',stations)     (= /api/v1/.../order-temp-store)
  └─ multi → StationPickerModal → ...
Re-print icon on TableCard/OrderCard    printOrder(id,'bill',null,order,SC%,{}) PRINT_ORDER
CollectPaymentPanel "Print Bill"         onPrintBill(overrides) → printOrder    PRINT_ORDER
  (manual, while placing collect-bill)
Auto-print on new-order (BUG-273)       waitForOrderReady → printOrder         PRINT_ORDER
  (only when settings.autoBill=true)    (no overrides; uses socket-hydrated
                                         order from context)
```

Observations:
- Single backend endpoint `PRINT_ORDER = /api/v1/vendoremployee/order-temp-store` handles both KOT and Bill (driven by `print_type` field).
- `printOrder()` (`api/services/orderService.js`) branches:
  - `printType === 'bill' && orderData` → `buildBillPrintPayload(...)` with full financial info + `billFoodList`
  - Otherwise → `{ order_id, print_type, station_kot }`
- Station routing for KOT is derived client-side via `getStationsFromOrderItems(placedItems, getProductById)` in `stationService.js` (not audited in this pass).
- Auto-print on new-order is scoped to the **first** place-order transaction only — explicitly NOT fired for collect-bill (scenario 1) or item edits.
- Auto-print gate chain (BUG-273):
  1. `settings.autoBill` truthy (profile-level pref)
  2. `newOrderId` captured from place-order HTTP response (multiple response shapes considered)
  3. `waitForOrderReady(id, 3000)` returns the order object (in context + not engaged) — else abort and log

**Confidence: HIGH**

---

## 7. Auth & Token Handling

Source: `authService.js`, `contexts/AuthContext.jsx`, `api/axios.js` request/response interceptors, `guards/ProtectedRoute.jsx`.

Flow:
1. Login → `POST /api/v1/auth/vendoremployee/login` → `authTransform.fromAPI.loginResponse`.
2. `localStorage.auth_token` set (plus optional `remember_me` + `user_email`).
3. Axios request interceptor attaches `Authorization: Bearer ${auth_token}` on every request that goes through `axios.js`.
   - **CRM axios does NOT attach the Bearer token**; it uses `X-API-Key` only (resolved by `setCrmRestaurantId(id)`).
4. On 401 response: clear `auth_token` + `remember_me`, set `sessionStorage.auth_redirect = '1'`, perform `window.location.href = '/'`.
5. `ProtectedRoute` reads `isAuthenticated` from `AuthContext` (`!!token`) and `<Navigate to="/" replace/>` if falsy.
6. Socket connect/disconnect is gated by the same `isAuthenticated`. `visibilitychange` and `online` events trigger reconnect if authenticated.
7. `AuthContext.logout()` calls `authService.logout()` + `sessionStorage.clear()` + resets state.

**Risks (carried from v1, still applicable):**
- Token in localStorage (XSS) — RISK-002
- No refresh flow — RISK-003
- 401 hard-redirect bypasses React cleanup — RISK-004

---

## 8. State Management Topology

Per-context state stores (all via `createContext` + `useState`/`useRef`/`useMemo`):

| Context | Primary state | Refs (for closure-stale workaround) | External persistence |
|---|---|---|---|
| Auth | `token`, `user`, `permissions`, `isLoading` | — | `localStorage.auth_token`, `remember_me`, `user_email` |
| Socket | `status`, `reconnectAttempts`, `lastConnectedAt` | `initializedRef` | `localStorage.SOCKET_DEBUG` |
| Notification | `notifications[]` (capped at 50), `soundEnabled` | `initializedRef`, `foregroundUnsubRef`, `processNotificationRef` | — |
| Restaurant | `restaurant`, `isLoaded` | — | — |
| Menu | `categories`, `products`, `popularFood`, `isLoaded` | — | — |
| Table | `tables`, `isLoaded`, `engagedTables` (Set) | `engagedTablesRef` | — |
| Settings | `cancellationReasons`, `paymentLayoutConfig`, `isLoaded`, `enableDynamicTables` | — | `localStorage.mygenie_enable_dynamic_tables` |
| Order | `orders`, `isLoaded`, `engagedOrders` (Set) | `ordersRef`, `engagedOrdersRef` | — |
| Station | `availableStations`, `enabledStations`, `stationData`, `stationViewEnabled`, `displayMode`, `isLoading` | — | `localStorage.mygenie_station_view_config` |

Local-only state (notable):
- `OrderEntry` (1554 lines) keeps ~30 pieces of useState, including `cartItems`, `placedOrderId`, `orderFinancials`, `showPaymentPanel`, `isPlacingOrder`, etc.
- `CollectPaymentPanel` (1592 lines) keeps ~20 pieces of useState for payment, discount, loyalty, coupon, split, tip, service charge, etc.

**Impact**: Many heavy computations (taxTotals, printTaxTotals, serviceCharge, etc.) are `useMemo`-guarded. Changing `cartItems` triggers a cascade across both contexts (OrderContext sync in `OrderEntry`) and locals.

---

## 9. API Layer

- Two axios instances: `api` (REST) and `crmApi` (CRM). Each has its own interceptors.
- `api` attaches `Authorization: Bearer ...`. Error response is normalized into `error.readableMessage` reading from (in order): `error.response.data.errors[0].message`, `error.response.data.message`, `error.message`, fallback string.
- `crmApi` attaches `X-API-Key` per restaurant (set via `setCrmRestaurantId(id)`). Failures produce `error.readableMessage`.
- Request timeout: `api` 60s, `crmApi` 15s.
- `setCrmRestaurantId` is called once in `LoadingPage` after profile success. There is no mechanism to rotate the key within a session — see OQ-203.
- All services are thin wrappers: `service → axios → constants.endpoint → transform`. No caching layer, no de-dupe, no retry (except for `handleUpdateFoodStatus` which retries once).

---

## 10. Notification Pipeline

Source: `config/firebase.js`, `contexts/NotificationContext.jsx`, `utils/soundManager.js`, `public/firebase-messaging-sw.js`.

1. On login (`isAuthenticated` becomes true), `NotificationContext.useEffect`:
   - Preloads all 15 sound files into an in-memory audio cache.
   - Subscribes to `onForegroundMessage` from `firebase/messaging`.
   - Subscribes to `navigator.serviceWorker.message` events (the SW re-posts background pushes as `BACKGROUND_NOTIFICATION`).
2. Incoming payloads are processed by `processNotification`:
   - Extracts `title`, `body` from `payload.notification` OR `payload.data`.
   - Resolves sound key from explicit `data.sound`/`data.notification_sound`, else falls back to a keyword scan of `title+body` (`inferSoundFromContent`).
   - `silent` sound → stops currently playing audio and returns (no toast).
   - Otherwise: plays sound and appends a notification entry (capped at 50).
3. `NotificationBanner` reads the context to render visible notifications in `DashboardPage`.
4. FCM token acquisition is triggered by user action (no automatic prompt at load). `requestFCMToken` registers the SW with Firebase config passed as query params.

**Impact**: Background notifications rely on the service worker receiving Firebase config via URL. If `index.html` is served with strict CSP, the SW registration URL may be blocked (not verified).

---

## 11. Feature Flags

Source: `constants/featureFlags.js`.

| Flag | Value | Effect |
|---|---|---|
| `USE_CHANNEL_LAYOUT` | `true` | Dashboard uses channel-based resizable columns (`ChannelColumnsLayout`) instead of section-based layout |
| `USE_STATUS_VIEW` | `true` | Adds "By Status" view toggle to Dashboard (Preparing, Ready, etc.) |

Flags are consts imported by `DashboardPage` and related components; there is no runtime toggle UI.

---

## 12. Dashboard Rendering Flow

Source: `pages/DashboardPage.jsx` (1431 lines).

- On mount: `useSocketEvents()` subscribes to channels (once restaurant is loaded).
- `DashboardPage` composes:
  - `<Sidebar>`, `<Header>`, `<NotificationBanner>`
  - Either `<ChannelColumnsLayout>` (feature flag) or per-section layout
  - Inside each column: `TableSection` (tables grid), `OrderListSection` (delivery/takeaway), etc.
  - Cards: `TableCard`, `OrderCard`, `DineInCard`, `DeliveryCard` — each reads live order/table from respective contexts.
- Drag-&-drop of column widths uses `react-resizable-panels`.
- Refresh button calls `useRefreshAllData()` which re-fetches tables, categories, products, popular food, and running orders (but not profile/permissions/cancellation reasons).

Dashboard → OrderEntry flow:
- Clicking a table/order opens `<OrderEntry ... />` as a fullscreen modal (`z-50`).
- On close, `DashboardPage` re-renders from contexts (OrderEntry doesn’t need to push state up — context state is already updated via sockets).

---

## 13. Permission Model

Source: `AuthContext` `hasPermission/hasAnyPermission/hasAllPermissions`, consumed across many components.

- `permissions` is a flat array of strings loaded from `profileResponse.permissions`.
- Known checks (non-exhaustive, from `OrderEntry.jsx`):
  - `order_cancel`, `food` (item cancel), `transfer_table`, `merge_table`, `food_transfer`, `customer_management`, `bill`, `discount`, `print_icon`.
- No role-based hierarchy; permissions are opaque string flags checked per-action.
- UI hides actions when permission is missing; no enforcement client-side beyond hiding.

**Confidence: HIGH** — business rules behind each permission are NOT documented in code.

---

## 14. Error Handling

- `ErrorBoundary` wraps the App and renders a fallback when a descendant throws (code not inspected in detail).
- Axios interceptor normalizes errors into `error.readableMessage`.
- Many call sites use `.then/.catch` with fire-and-forget pattern — state mutation happens via socket, not via HTTP response.
- Toasts via `hooks/use-toast.js` + `components/ui/toaster.jsx` + `components/ui/sonner.jsx` (two toast systems present — see OQ-201).

---

## 15. Build & Scripts

Source: `frontend/package.json` lines 65–68.

- `yarn start` → `craco start`
- `yarn build` → `craco build`
- `yarn test` → `craco test`
- No lint script declared (eslint config present via `@eslint/js`, plugins declared).
- No prettier configured.

---

## 16. Risks Summary (pointer)

See `RISK_REGISTER.md` for full list. New/updated for v2:

- RISK-001 (CRITICAL, unchanged): `paymentService.collectPayment` references `API_ENDPOINTS.CLEAR_BILL` which does not exist. Test asserts it should exist (and currently fails).
- RISK-005 (HIGH, unchanged): `EDIT_ORDER_ITEM`, `EDIT_ORDER_ITEM_QTY` literal `'TBD'`.
- RISK-020 (NEW, MEDIUM): Dead handler `handleUpdateOrder` (socketHandlers.js line 204) kept "for rollback" but never invoked by router.
- RISK-021 (NEW, MEDIUM): Table channel subscribed despite comment saying it was removed (BUG-203).
- RISK-022 (NEW, MEDIUM): Aggregator events declared in `AGGREGATOR_EVENTS` + `EVENTS_REQUIRING_AGGREGATOR_API` but never subscribed to.
- RISK-023 (NEW, LOW/MEDIUM): Two toast systems (`toaster.jsx` + `sonner.jsx`) both in ui/, potential inconsistency.

---

## 17. Contradictions & Unclear Ownership (quick reference)

| # | Statement found in code/comments | Observed behavior |
|---|---|---|
| 1 | "BUG-203: Removed update-table channel subscription" (`useSocketEvents.js` header) | Still subscribed at runtime |
| 2 | `handleUpdateOrder` doc says "LEGACY — kept for rollback reference" | Never called by router; dispatch uses `handleOrderDataEvent` |
| 3 | Comment in `orderService.updateOrderStatus` vs `confirmOrder`: separate endpoint, yet both serialize via `toAPI.updateOrderStatus(orderId, roleName, status)` with same payload shape | Tests pass for `CONFIRM_ORDER` endpoint; semantic difference unclear |
| 4 | `paymentService.test.js` asserts `API_ENDPOINTS.CLEAR_BILL` is a real `/api/...` endpoint | `constants.js` has no `CLEAR_BILL` key. Test should fail when run. |
| 5 | `calcOrderTotals` applies SC-GST from `gstTax/subtotal` ratio vs `CollectPaymentPanel` uses `(sgst+cgst)/itemTotal` ratio | Slight divergence when mixed GST/VAT items exist |
| 6 | SC is computed on pre-discount itemTotal in the panel; on (post-discount-absent) `subtotal` in `calcOrderTotals` | Panel shows a different SC than what the backend would accept for updated orders. Need reconciliation — OQ-101 |
| 7 | `handleUpdateFoodStatus` still calls `fetchSingleOrderForSocket` ("workaround – no table socket") | Table channel IS subscribed; workaround may be redundant or defensive |
