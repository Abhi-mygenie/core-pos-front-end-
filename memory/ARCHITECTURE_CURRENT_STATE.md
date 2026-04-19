# ARCHITECTURE — CURRENT STATE (v3 Re-Validation)

> Generated: 2026 (v3 re-validation) | Source: `main` branch, commit `7f87721`
> Method: Static code analysis — no runtime observation
> Confidence levels: HIGH (code-verified), MEDIUM (inferred from patterns), LOW (uncertain)
> Revalidation result: **all v2 architecture claims HOLD** with code-verified evidence; one correction added (see §16 contradictions).

---

## 0. V2 → V3 Revalidation Summary

| v2 architectural claim | Status | Evidence (file:line) |
|---|---|---|
| 3 external service boundaries (REST / CRM / WebSocket) | **HOLD** | `api/axios.js:5–8`, `crmAxios.js:9–21`, `socketEvents.js:8–12` |
| 9 context providers nested in `AppProviders` | **HOLD** | `contexts/AppProviders.jsx` |
| Auth gates socket connection | **HOLD** | `SocketContext.jsx:33–64` |
| 7-step sequential data load | **HOLD** | `LoadingPage.jsx:318–337` |
| 3 socket channels (`new_order_*`, `update_table_*`, `order-engage_*`) | **HOLD** | `useSocketEvents.js:144–154` |
| BUG-203 contradiction (docs say removed; code still subscribes) | **HOLD** | `useSocketEvents.js:4–6 vs :146,153` |
| 12 socket events + 2 aggregator | **HOLD** | `socketEvents.js:55–87` |
| `handleUpdateOrder` is LEGACY/dead | **HOLD** | `socketHandlers.js:200–207` |
| `waitForOrderReady/Engaged/Removal` + `engagedOrders` Set | **HOLD** | `OrderContext.jsx:197–280` |
| BUG-273 auto-print on new-order only | **HOLD** | `OrderEntry.jsx:984–1037, 1134` |
| BUG-281 subtotal = (itemTotal − discount) + SC + tip | **HOLD** | `CollectPaymentPanel.jsx:230–235` |
| SC-GST ratio divergence (panel vs transform) | **HOLD** | `CollectPaymentPanel.jsx:218–219` vs `orderTransform.js:381–384` |
| `calcOrderTotals` round-off rule `diff ≥ 0.10` | **HOLD** | `orderTransform.js:388–393` |
| Bearer token in localStorage + 401 hard-redirect | **HOLD** | `axios.js:23, 41–52` |
| CRM axios does not handle 401 | **HOLD** | `crmAxios.js:66–79` |
| Single print endpoint `PRINT_ORDER` for KOT & Bill | **HOLD** | `constants.js:56` |
| No handshake auth for Socket.IO | **HOLD** | `socketService.js:54–62` |
| StationContext value NOT memoized | **HOLD** | `StationContext.jsx:118` |
| 2 toast systems (shadcn mounted; Sonner defined but unused) | **HOLD** | `App.js:6,29` + `ui/sonner.jsx` (zero imports outside self) |

---

## 1. High-Level Architecture (UNCHANGED)

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

All three URLs are env-driven. `axios.js` (lines 5–8) and `socketEvents.js` (lines 8–12) throw at import time if missing; `crmAxios.js` (line 19) only warns.

**Confidence: HIGH** — Re-verified line by line at v3.

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

**Key design decisions (evidence-verified at v3):**

| Decision | Evidence | Impact |
|---|---|---|
| Context-only state (no Redux / Zustand) | no state-mgmt package in `package.json` (re-checked) | Refs used heavily: `ordersRef`, `engagedTablesRef`, `engagedOrdersRef` |
| Auth gates socket connection | `SocketContext.jsx` — `useEffect` watches `isAuthenticated` | Socket only connects after login; disconnects on logout |
| Two refs per context for lock state | `engagedOrdersRef` (OrderContext.jsx:18), `engagedTablesRef` (TableContext.jsx), `ordersRef` (OrderContext.jsx:14) | Lets socket handlers read current state without closure staleness |
| 8 of 9 contexts memoize `value` | `useMemo` in Auth/Menu/Notification/Order/Restaurant/Settings/Socket/Table | StationContext missing — see RISK-012 |

**Confidence: HIGH** — Status vs v2: **Unchanged**.

---

## 3. Data Loading Flow (Login → Dashboard)

Source: `pages/LoginPage.jsx` → `pages/LoadingPage.jsx` (529 lines — unchanged).

```
LoginPage
  └─ authService.login() → sets localStorage.auth_token
     └─ navigate("/loading")
         └─ LoadingPage.useEffect → loadAllData(ctrl)
             └─ SEQUENTIAL (7 steps in fixed order, API_LOADING_ORDER at constants.js:223–231)
                1. profileService.getProfile()
                    ├─ setUserData(user, permissions) → AuthContext
                    ├─ setRestaurant(restaurant)      → RestaurantContext
                    └─ setCrmRestaurantId(id)         → crmAxios (sets X-API-Key map key)
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

**Evidence** (v3 verified): `LoadingPage.jsx:318–337`:
```js
for (const key of keysToLoad) {
  if (ctrl.aborted) return;
  const loader = loaderMap[key];
  if (loader) await loader(ctrl, data);
}
```

- Finding: Fully sequential — RISK-006 still applies.
- Type: Fact
- Evidence: `LoadingPage.jsx:323–326`
- Confidence: HIGH
- Status vs Previous: **Unchanged**

---

## 4. Socket Event & Channel Flow (v2 — UNCHANGED)

### 4.1 Connection

- Service: `api/socket/socketService.js` (singleton, also exposed as `window.__SOCKET_SERVICE__` in development — line 360–362).
- Transports: `['websocket', 'polling']` (line 60).
- Reconnection: enabled, 10 attempts, 1–30s backoff (SOCKET_CONFIG at `socketEvents.js:7–18`).
- Auth: **No `auth`, `query`, or cookie-based handshake** — `socketService.js:54–62` shows `connectionOptions` object without any identifying field. See OQ-107 (still **OPEN**).

### 4.2 Channels Subscribed

Source: `api/socket/useSocketEvents.js:144–154`.

| Channel (template) | Purpose | Handler |
|---|---|---|
| `new_order_${restaurantId}` | All order-data events (includes v2 payload events) | `handleOrderChannelEvent` → switch on `args[0]` (lines 59–101) |
| `update_table_${restaurantId}` | Table engage/free | `handleTableChannelEvent` → `handleUpdateTable` (lines 104–113, 153) |
| `order-engage_${restaurantId}` | Order-level lock events | `handleOrderEngageChannelEvent` → `handleOrderEngage` (lines 118–122, 154) |

**Contradiction (HIGH confidence, v3 re-verified):** 
- `socketHandlers.js:4–6` says "The update-table socket channel is no longer subscribed to."
- `useSocketEvents.js:4–6` repeats this, and line 126–127 says "BUG-203: Table channel removed".
- **BUT** `useSocketEvents.js:146` creates `tableChannel = getTableChannel(restaurantId)` and line 153 wires `subscribe(tableChannel, handleTableChannelEvent)`.
- Furthermore, lines 162–166 log success/failure of the table channel subscription — this is not vestigial; the code intends it to be live.

See OPEN_QUESTIONS OQ-106 (**still OPEN**). See RISK-021 (**HOLDS**).

### 4.3 Event Types (source: `api/socket/socketEvents.js:55–87` — v3 verified)

| Event | Channel | Payload shape (per code) | Handler | Category |
|---|---|---|---|---|
| `new-order` | new_order_* | `[event, orderId, restId, fOrderStatus, {orders:[...]}, {table_info:{...}}]` | `handleNewOrder` | EVENTS_WITH_PAYLOAD |
| `update-order` | new_order_* | `[event, orderId, restId, fOrderStatus, {orders:[...]}]` | `handleOrderDataEvent('update-order')` via `useSocketEvents.js:68–70` | EVENTS_WITH_PAYLOAD |
| `update-order-target` | new_order_* | same as update-order | `handleOrderDataEvent('update-order-target')` — detects table change (`socketHandlers.js:249–259`) | EVENTS_WITH_PAYLOAD |
| `update-order-source` | new_order_* | same | `handleOrderDataEvent('update-order-source')` — if `cancelled`/`paid` → remove (`socketHandlers.js:261+`) | EVENTS_WITH_PAYLOAD |
| `update-order-paid` | new_order_* | same | `handleOrderDataEvent('update-order-paid')` — same remove rule | EVENTS_WITH_PAYLOAD |
| `update-item-status` | new_order_* | same | `handleOrderDataEvent('update-item-status')` | EVENTS_WITH_PAYLOAD |
| `split-order` | new_order_* | `[event, orderId, restId, fOrderStatus, {orders:[...]}]` (original order only) | `handleSplitOrder` — only updates original | EVENTS_WITH_PAYLOAD |
| `update-food-status` | new_order_* | `[event, orderId, restId, fOrderStatus]` (no payload) | `handleUpdateFoodStatus` — fetches GET single order; engages table as WORKAROUND (`socketHandlers.js:308–354`) | EVENTS_REQUIRING_ORDER_API |
| `update-order-status` | new_order_* | `[event, orderId, restId, fOrderStatus, {orders:[...]}]` (now carries payload) | `handleUpdateOrderStatus` — **reads payload, NOT a GET** — v3 re-confirmed at `socketHandlers.js:378–390` | EVENTS_REQUIRING_ORDER_API (name misleading — see RISK-011) |
| `scan-new-order` | new_order_* | `[event, orderId, restId, fOrderStatus]` | `handleScanNewOrder` → GET then addOrder | EVENTS_REQUIRING_ORDER_API |
| `delivery-assign-order` | new_order_* | `[event, orderId, restId, riderId]` | `handleDeliveryAssignOrder` → GET then updateOrder | EVENTS_REQUIRING_ORDER_API |
| `update-table` | update_table_* | `[event, tableId, restId, status]` | `handleUpdateTable` — `engage` → lock; `free` → ignored (v2 comment says derive from order) | EVENTS_TABLE_UPDATE |
| `order-engage` | order-engage_* | `[orderId, restaurantOrderId, restId, status]` (**no event-name prefix**) | `handleOrderEngage` | Special — unique channel |
| `aggrigator-order`, `aggrigator-order-update` | aggregator_order_* | Listed in `AGGREGATOR_EVENTS` | **No subscription code present** in `useSocketEvents.js` — **grep-verified at v3** | Declared, dead in runtime |

### 4.4 Handler Dispatch (UNCHANGED)

- `useSocketEvents.js` defines three channel callbacks (`handleOrderChannelEvent`, `handleTableChannelEvent`, `handleOrderEngageChannelEvent`).
- Channel callbacks are wrapped with `socketService.on()`.
- Handlers receive `actionsRef.current` to avoid stale closures (lines 45–52).

### 4.5 Order Engage / Table Engage Protocol (v2 — UNCHANGED)

`OrderEntry.jsx` and `DashboardPage.jsx` use this pattern for HTTP mutations:

```js
// Before the mutation
const engagePromise = waitForOrderEngaged(orderId)   // polls engagedOrdersRef every 50 ms
api.put/post(...).then(...).catch(...)               // fire-and-forget; error toast in .catch
await engagePromise                                  // blocks UI until socket says "engaged"
onClose()                                            // redirect
```

- `setOrderEngaged` is invoked by `handleOrderEngage` (status `engage`).
- Data-event handlers release engage after React paints using `requestAnimationFrame(() => rAF(() => setOrderEngaged(id, false)))` — e.g. `handleUpdateOrderStatus` at `socketHandlers.js:404–411`.
- Same pattern for tables: `waitForTableEngaged` used on `handlePlaceOrder`, `handleShift`.

**Impact**: The UX is socket-first (user sees dashboard change when socket event arrives, not when HTTP responds). HTTP responses are only consumed for toasts and (BUG-273) to capture the new `order_id` for auto-print. Risk if socket drops between HTTP-response and engage-release — see RISK-020.

### 4.6 Retry / Retry-Free Events

- `handleUpdateFoodStatus` (socketHandlers.js:335) and `handleScanNewOrder` / `handleDeliveryAssignOrder` still do `fetchOrderWithRetry(orderId, retries=1)` — one retry after 1s.
- Data-carrying v2 events (`update-order*`, `update-item-status`, `split-order`, `new-order`, `update-order-status`) do **not** fetch GET. They transform `payload.orders[0]` directly via `orderFromAPI.order(...)`. If payload missing → log ERROR and bail (`socketHandlers.js:234–237, 378–381`). See OQ-102 (**still OPEN**).

**Confidence: HIGH** — v3 re-verified.

---

## 5. Order Calculation Flow (UNCHANGED)

There are **three pricing/tax computation sites**. They are related but not identical.

### 5.1 Place Order / Update Order / Place+Pay payloads

Source: `api/transforms/orderTransform.js` `buildCartItem` (lines 265–353) and `calcOrderTotals` (lines 361–405).

Per item (`buildCartItem`):
- `basePrice = item.price` (line 314)
- `addonAmount = Σ(addon.price × addon.qty)` (line 272–274)
- `variationAmount = Σ(variant option.price)` (line 282–311; derived from `selectedVariants` map keyed by group id, fallback to `item.variation` if present)
- `fullUnitPrice = basePrice + addonAmount + variationAmount` (line 316)
- `foodAmount = basePrice × qty` (line 315) — **note: this is the BASE × qty, NOT `fullUnitPrice × qty`** — v3 confirmed
- Tax: `lineTotal = fullUnitPrice × qty` (line 323); inclusive→extract, exclusive→add-on (lines 325–329). Split as GST or VAT based on `tax.type` (line 330).
- Returns `_fullUnitPrice` helper (line 351; stripped before sending).

Order totals (`calcOrderTotals` at lines 361–405):
- `subtotal = Σ (fullUnitPrice × qty)` across all built items (lines 366–371)
- `serviceCharge = round(subtotal × serviceChargePercentage / 100, 2)` when > 0 (lines 376–378)
- If `serviceCharge > 0 AND subtotal > 0` → add `serviceCharge × (gstTax/subtotal)` to `gstTax` (weighted-average GST rate applied to SC) (lines 381–384)
- `totalTax = gstTax + vatTax` (line 386)
- `rawTotal = subtotal + serviceCharge + totalTax` (line 389)
- **Rounding**: `diff = Math.round((ceilTotal − rawTotal) × 100) / 100`. If `diff ≥ 0.10` → `orderAmount = ceil`, `round_up = diff`. Else → `orderAmount = floor(rawTotal)`, `round_up = 0` (lines 390–393).

**Confidence: HIGH** — business rationale of the 0.10 threshold not visible (see OQ-001 **still OPEN**).

### 5.2 Collect Payment panel (on-screen math)

Source: `components/order-entry/CollectPaymentPanel.jsx:179–272` (v3 verified).

Order of operations (BUG-281, Feb 2026 change):
1. `itemTotal = Σ getItemLinePrice(item)` for non-cancelled items (line 180).
2. `presetDiscount`, `manualDiscount`, `loyaltyDiscount`, `couponDiscount`, `walletDiscount` → `totalDiscount` (lines 184–206).
3. `subtotalAfterDiscount = max(0, itemTotal − totalDiscount)` (line 207).
4. `serviceCharge = itemTotal × SC% / 100` (lines 210–212) — note: SC is on `itemTotal` (pre-discount), **not** `subtotalAfterDiscount`. Gated by `serviceChargeEnabled` toggle (BUG-276, line 140).
5. GST / CGST / SGST computed per-item on `getItemLinePrice(item)`; `serviceChargeGst = serviceCharge × ((sgst+cgst)/itemTotal)` added 50/50 to SGST/CGST rows (lines 215–222).
6. `deliveryCharge` from input (delivery orders only; line 225); `tip` from input (feature-flagged; line 228).
7. **Subtotal (displayed) = `subtotalAfterDiscount + serviceCharge + tip`** (line 235, pre-tax complete).
8. `rawFinalTotal = subtotal + sgst + cgst + deliveryCharge` (line 237).
9. Round-off rule: same `≥ 0.10` rule as backend payloads (lines 240–243). Additional v3 refinement: when `diff < 0.10`, `roundOff = -(rawFinalTotal - floor(rawFinalTotal))` (negative round-off, shown as a subtract-the-paise adjustment).

Additional (BUG-281 Gap-4): a second tax memo `printTaxTotals` (lines 249–271) is computed with **per-item prorated discount** adjustment via `discountRatio = totalDiscount / itemTotal` (line 250); this is fed only into the print payload override, not the UI and not the API payload for `order-bill-payment`.

**Contradiction/risk (v3 re-verified):** 
- `orderTransform.calcOrderTotals` applies SC-GST using ratio `gstTax/subtotal` (line 382); the panel applies it using ratio `(sgst+cgst)/itemTotal` (line 219). Both end up similar in the all-GST case but diverge when any item has VAT.
- SC is computed on `itemTotal` in the panel (pre-discount) but on `subtotal` (≈ itemTotal, since transform doesn't know about discounts) in `calcOrderTotals`. The panel flow thus includes SC on pre-discount base while the API payload for a new order doesn't know about discounts at all — see OQ-101 (**still OPEN**).

### 5.3 Bill-print payload

Source: `orderTransform.js` `buildBillPrintPayload` (~lines 867–1004).

- Recomputes GST/VAT from `rawOrderDetails` per-line (unit_price × qty) as a fallback.
- `serviceChargeAmount` = override if provided, else `subtotal × SC%/100` or `order.serviceTax`.
- `finalOrderSubtotal` = override if provided, else `itemBase + SC + tip` (BUG-281 semantic, matching panel).
- GST-on-SC added when not overridden.

**Three paths that call this** (evidence — see MODULE_MAP §5):
1. `OrderEntry` auto-print after new-order (no overrides; `OrderEntry.jsx:1026–1032`)
2. `CollectPaymentPanel.handlePrintBill` (full override set; see BUG-277/281)
3. `TableCard` / `OrderCard` printer icon (dashboard) (no overrides — uses socket-hydrated order)

---

## 6. Printing Flow (UNCHANGED)

```
User action                              Code path                             Endpoint
-----------                              ---------                             --------
RePrintButton (KOT)                     getStationsFromOrderItems             PRINT_ORDER
  └─ 1 station → executePrintKot         ─→ printOrder(id,'kot',stations)     (= /api/v1/vendoremployee/order-temp-store)
  └─ multi → StationPickerModal → ...
Re-print icon on TableCard/OrderCard    printOrder(id,'bill',null,order,SC%,{}) PRINT_ORDER
CollectPaymentPanel "Print Bill"         onPrintBill(overrides) → printOrder    PRINT_ORDER
  (manual, while placing collect-bill)
Auto-print on new-order (BUG-273)       waitForOrderReady → printOrder         PRINT_ORDER
  (only when settings.autoBill=true)    (no overrides; uses socket-hydrated
                                         order from context)
```

Observations (v3 re-verified):
- Single backend endpoint `PRINT_ORDER = /api/v1/vendoremployee/order-temp-store` handles both KOT and Bill (`constants.js:56`).
- `printOrder()` (`api/services/orderService.js`) branches: if `printType === 'bill' && orderData` → `buildBillPrintPayload(...)` with full financial info + `billFoodList`. Else → `{ order_id, print_type, station_kot }`.
- Station routing for KOT is derived client-side via `getStationsFromOrderItems(placedItems, getProductById)` in `stationService.js`.
- Auto-print on new-order is scoped to the **first** place-order transaction only — explicitly NOT fired for collect-bill (scenario 1) or item edits. See `OrderEntry.jsx:1140–1142` comment: "BUG-273 (Session 16): auto-print NOT fired here. Per product contract, auto-bill is scoped to new-order only."
- Auto-print gate chain (BUG-273, `OrderEntry.jsx:994–1037`):
  1. `settings?.autoBill` truthy (line 1004)
  2. `newOrderId` captured from place-order HTTP response (3 shapes considered at lines 1102–1106)
  3. `waitForOrderReady(id, 3000)` returns the order object (in context + not engaged) — else abort and log (lines 1015–1024)
  4. `order.rawOrderDetails` must be present (line 1021)

**Confidence: HIGH** — v3 verified line-by-line for the gate chain.

---

## 7. Auth & Token Handling (UNCHANGED)

Source: `authService.js`, `contexts/AuthContext.jsx`, `api/axios.js` request/response interceptors, `guards/ProtectedRoute.jsx`.

Flow (v3 verified):
1. Login → `POST /api/v1/auth/vendoremployee/login` → `authTransform.fromAPI.loginResponse`.
2. `localStorage.auth_token` set (plus optional `remember_me` + `user_email`).
3. Axios request interceptor attaches `Authorization: Bearer ${auth_token}` on every request that goes through `axios.js` (lines 21–32).
   - **CRM axios does NOT attach the Bearer token** (`crmAxios.js:52–64`); it uses `X-API-Key` only (resolved by `setCrmRestaurantId(id)`).
4. On 401 response: clear `auth_token` + `remember_me`, set `sessionStorage.auth_redirect = '1'`, perform `window.location.href = '/'` (`axios.js:41–52`).
5. `ProtectedRoute` reads `isAuthenticated` from `AuthContext` (`!!token`) and `<Navigate to="/" replace/>` if falsy.
6. Socket connect/disconnect is gated by the same `isAuthenticated`. `visibilitychange` and `online` events trigger reconnect if authenticated.
7. `AuthContext.logout()` calls `authService.logout()` + `sessionStorage.clear()` + resets state.

**Risks (carried from v2, still applicable):**
- Token in localStorage (XSS) — RISK-002
- No refresh flow — RISK-003
- 401 hard-redirect bypasses React cleanup — RISK-004

---

## 8. State Management Topology (UNCHANGED)

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
| Order | `orders`, `isLoaded`, `engagedOrders` (Set) | `ordersRef` (line 14), `engagedOrdersRef` (line 18) | — |
| Station | `availableStations`, `enabledStations`, `stationData`, `stationViewEnabled`, `displayMode`, `isLoading` | — | `localStorage.mygenie_station_view_config` |

Local-only state (notable):
- `OrderEntry` (1554 lines) keeps ~30 pieces of useState, including `cartItems`, `placedOrderId`, `orderFinancials`, `showPaymentPanel`, `isPlacingOrder`, etc.
- `CollectPaymentPanel` (1592 lines) keeps ~20 pieces of useState for payment, discount, loyalty, coupon, split, tip, service charge, etc.

**Impact**: Many heavy computations (taxTotals, printTaxTotals, serviceCharge, etc.) are `useMemo`-guarded. Changing `cartItems` triggers a cascade across both contexts (OrderContext sync in `OrderEntry`) and locals.

---

## 9. API Layer (UNCHANGED)

- Two axios instances: `api` (REST) and `crmApi` (CRM). Each has its own interceptors.
- `api` attaches `Authorization: Bearer ...`. Error response is normalized into `error.readableMessage` reading from (in order): `error.response.data.errors[0].message`, `error.response.data.message`, `error.message`, fallback string (`axios.js:55–62`).
- `crmApi` attaches `X-API-Key` per restaurant (set via `setCrmRestaurantId(id)`). Failures produce `error.readableMessage` (`crmAxios.js:66–79`). **No 401 handling** — see RISK-010.
- Request timeout: `api` 60s (`axios.js:17`), `crmApi` 15s (`crmAxios.js:50`).
- `setCrmRestaurantId` is called once in `LoadingPage` after profile success. There is no mechanism to rotate the key within a session — see OQ-203.
- All services are thin wrappers: `service → axios → constants.endpoint → transform`. No caching layer, no de-dupe, no retry (except for `handleUpdateFoodStatus` which retries once).

---

## 10. Notification Pipeline (UNCHANGED)

Source: `config/firebase.js`, `contexts/NotificationContext.jsx`, `utils/soundManager.js`, `public/firebase-messaging-sw.js`.

1. On login (`isAuthenticated` becomes true), `NotificationContext.useEffect`:
   - Preloads all **14** sound files (v3 correction; v2 said 15) into an in-memory audio cache.
   - Subscribes to `onForegroundMessage` from `firebase/messaging`.
   - Subscribes to `navigator.serviceWorker.message` events (the SW re-posts background pushes as `BACKGROUND_NOTIFICATION`).
2. Incoming payloads are processed by `processNotification`:
   - Extracts `title`, `body` from `payload.notification` OR `payload.data`.
   - Resolves sound key from explicit `data.sound`/`data.notification_sound`, else falls back to a keyword scan of `title+body` (`inferSoundFromContent`).
   - `silent` sound → stops currently playing audio and returns (no toast).
   - Otherwise: plays sound and appends a notification entry (capped at 50).
3. `NotificationBanner` reads the context to render visible notifications in `DashboardPage`.
4. FCM token acquisition is triggered by user action (no automatic prompt at load). `requestFCMToken` registers the SW with Firebase config passed as query params.

---

## 11. Feature Flags (UNCHANGED)

Source: `constants/featureFlags.js`.

| Flag | Value | Effect |
|---|---|---|
| `USE_CHANNEL_LAYOUT` | `true` | Dashboard uses channel-based resizable columns (`ChannelColumnsLayout`) instead of section-based layout |
| `USE_STATUS_VIEW` | `true` | Adds "By Status" view toggle to Dashboard (Preparing, Ready, etc.) |

Flags are consts imported by `DashboardPage` and related components; there is no runtime toggle UI.

---

## 12. Dashboard Rendering Flow (UNCHANGED)

Source: `pages/DashboardPage.jsx` (1431 lines — byte-identical to v2).

- On mount: `useSocketEvents()` subscribes to channels (once restaurant is loaded).
- `DashboardPage` composes `<Sidebar>`, `<Header>`, `<NotificationBanner>`, either `<ChannelColumnsLayout>` (feature flag) or per-section layout, inside each column `TableSection` / `OrderListSection`, and cards `TableCard`/`OrderCard`/`DineInCard`/`DeliveryCard`.
- Drag-&-drop of column widths uses `react-resizable-panels`.
- Refresh button calls `useRefreshAllData()` which re-fetches tables, categories, products, popular food, and running orders (but not profile/permissions/cancellation reasons) — `hooks/useRefreshAllData.js` (45 lines).

---

## 13. Permission Model (UNCHANGED)

Source: `AuthContext` `hasPermission/hasAnyPermission/hasAllPermissions`, consumed across many components.

- `permissions` is a flat array of strings loaded from `profileResponse.permissions`.
- Known checks (non-exhaustive, from `OrderEntry.jsx` grep): `order_cancel`, `food` (item cancel), `transfer_table`, `merge_table`, `food_transfer`, `customer_management`, `bill`, `discount`, `print_icon`.
- No role-based hierarchy; permissions are opaque string flags checked per-action.
- UI hides actions when permission is missing; no enforcement client-side beyond hiding.

**Confidence: HIGH** — business rules behind each permission are NOT documented in code.

---

## 14. Error Handling (UNCHANGED)

- `ErrorBoundary` wraps the App and renders a fallback when a descendant throws.
- Axios interceptor normalizes errors into `error.readableMessage`.
- Many call sites use `.then/.catch` with fire-and-forget pattern — state mutation happens via socket, not via HTTP response.
- Toasts via `hooks/use-toast.js` + `components/ui/toaster.jsx`; `components/ui/sonner.jsx` exists but is not imported anywhere outside its own file (grep-verified at v3) — see RISK-017.

---

## 15. Build & Scripts (UNCHANGED)

Source: `frontend/package.json` lines 58–62.

- `yarn start` → `craco start`
- `yarn build` → `craco build`
- `yarn test` → `craco test`
- No lint script declared (eslint config present via `@eslint/js`, plugins declared).
- No prettier configured.

---

## 16. Contradictions & Unclear Ownership — v3 Updated

| # | Statement found in code/comments | Observed behavior | v3 status |
|---|---|---|---|
| 1 | "BUG-203: Removed update-table channel subscription" (`useSocketEvents.js:4–6, 125–127`) | Still subscribed at runtime (`:146, :153`) | **HOLDS** |
| 2 | `handleUpdateOrder` doc says "LEGACY — kept for rollback reference" | Never called by router; dispatch uses `handleOrderDataEvent` | **HOLDS** |
| 3 | `paymentService.collectPayment` posts to `API_ENDPOINTS.CLEAR_BILL` — test asserts this key must exist | `constants.js` has no `CLEAR_BILL` key. Test T2 will fail when run. | **HOLDS** |
| 4 | `calcOrderTotals` applies SC-GST from `gstTax/subtotal` ratio vs `CollectPaymentPanel` uses `(sgst+cgst)/itemTotal` ratio | Slight divergence when mixed GST/VAT items exist | **HOLDS** |
| 5 | SC is computed on pre-discount itemTotal in the panel; on (post-discount-absent) `subtotal` in `calcOrderTotals` | Panel shows a different SC than what the backend would accept for updated orders. | **HOLDS** |
| 6 | `handleUpdateFoodStatus` still calls `fetchSingleOrderForSocket` ("workaround – no table socket") | Table channel IS subscribed; workaround may be redundant or defensive | **HOLDS** |
| 7 | `TableCard.jsx:5, :57` — imports `mockOrderItems` and assigns to `orderData` | `orderData` is never read elsewhere in TableCard — DEAD VARIABLE using mock data | **NEW v3** |

---

## 17. Risks Summary (pointer)

See `RISK_REGISTER.md` (v3). Top 5 active risks unchanged from v2:

- **RISK-001 (CRITICAL):** `paymentService.collectPayment` references `API_ENDPOINTS.CLEAR_BILL` which does not exist.
- **RISK-002 (CRITICAL):** JWT in localStorage (XSS exposure).
- **RISK-004 (HIGH):** Hard redirect on 401 bypasses React cleanup.
- **RISK-005 (HIGH):** `EDIT_ORDER_ITEM`, `EDIT_ORDER_ITEM_QTY` literal `'TBD'`.
- **RISK-006 (HIGH):** Sequential 7-step API loading (per `LoadingPage.jsx:323–326`).

New v3 findings:
- **RISK-032 (NEW, LOW):** `TableCard.jsx` imports `mockOrderItems` and assigns to a dead variable `orderData` (never read). Cosmetic but indicates incomplete cleanup.
