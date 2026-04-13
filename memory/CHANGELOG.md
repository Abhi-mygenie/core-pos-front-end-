# Changelog

## Apr 13, 2026 — Session 13 (Socket v2 Full Implementation)

### Socket v2 Event Handlers — IMPLEMENTED

**8 files changed, 0 new files.**

#### Phase 1: socketEvents.js
- Added 4 new event constants: `UPDATE_ORDER_TARGET`, `UPDATE_ORDER_SOURCE`, `UPDATE_ORDER_PAID`, `UPDATE_ITEM_STATUS`
- `EVENTS_WITH_PAYLOAD`: added `UPDATE_ORDER` + 4 new events (total 6)
- `EVENTS_REQUIRING_ORDER_API`: removed `UPDATE_ORDER` (v2 has payload)

#### Phase 2: socketHandlers.js
- Added `handleOrderDataEvent` — unified handler for 5 events (update-order, update-order-target, update-order-source, update-order-paid, update-item-status)
- No GET API fallback — v2 only, fail fast if no payload
- No guard — deferred to future phase
- Table change detection for switch table (update-order-target: old table freed)
- Remove vs update decision: terminal + (source|paid) → removeOrder(), else updateOrder()
- BUG-216: `free→engage` workaround removed → `free→ignore`
- Handler registry + async list updated

#### Phase 3: useSocketEvents.js
- Import `handleOrderDataEvent` (replaces `handleUpdateOrder`)
- 5 new switch cases: update-order, update-order-target, update-order-source, update-order-paid, update-item-status

#### Phase 4: OrderContext.jsx
- Added `waitForOrderEngaged(orderId, timeout)` polling function
- Exported in context value + useMemo deps

#### Phase 5: OrderEntry.jsx — All handlers updated to fire-and-forget + wait-for-engage
- `handlePlaceOrder` (update path): start `waitForOrderEngaged` BEFORE api call, fire-and-forget API
- `handleTransfer`: start `waitForOrderEngaged` BEFORE api call, fire-and-forget API
- `handleMerge`: start `waitForOrderEngaged` BEFORE api call, fire-and-forget API
- `handleShift`: start `waitForTableEngaged` BEFORE api call, fire-and-forget API
- `handleCancelFood`: start `waitForOrderEngaged` BEFORE api call, fire-and-forget API
- `handleCancelOrder`: start `waitForOrderEngaged` BEFORE api call, fire-and-forget API
- `onPaymentComplete` (collect bill): start `waitForOrderEngaged` BEFORE api call, fire-and-forget API
- All handlers: redirect log `[FlowName] Socket engaged — redirecting to dashboard`

#### Phase 6: Dashboard Engage Fix
- `DashboardPage.jsx`: removed local `setTableEngaged` from `handleMarkReady` + `handleMarkServed`
- `DashboardPage.jsx`: all `isEngaged` props now use `isOrderEngaged(orderId) || isTableEngaged(tableId)`
- Delivery/TakeAway OrderCards: `isEngaged={false}` → `isEngaged={isOrderEngaged(orderId)}`
- Click blocking: checks both `isTableEngaged` and `isOrderEngaged`
- `ChannelColumnsLayout.jsx`: `isOrderEngaged` prop pass-through
- `ChannelColumn.jsx`: `isOrderEngaged` prop usage for spinner

### Bugs Fixed
- BUG-216: `free→engage` workaround removed (free now ignored)
- BUG-221: Merge order source table locked — fixed by BUG-216 removal
- BUG-222: `waitForTableEngaged` timeout on Update Order — fixed (uses `waitForOrderEngaged`)
- BUG-223: Local locking removed from Mark Ready/Served in Dashboard
- Update Order 5s timeout delay — fixed (engage starts before API)
- Cancel Food 5s timeout delay — fixed (engage starts before API)
- Collect Bill permanent table lock — fixed (removed local `setTableEngaged`)
- Walk-in/Delivery/TakeAway never showed spinner — fixed (`isOrderEngaged`)

### New Discovery
- `update-item-status`: new v2 event for item-level Ready/Serve (replaces `update-food-status`)
- `handleUpdateFoodStatus`: now dead code — backend only sends `update-item-status`

### BUG-226: `order-engage` missing before `update-item-status`
- Filed as P1 Backend bug
- Backend deployed fix same day — `order-engage` now sent before `update-item-status`
- Marked as ✅ FIXED (Backend)

---


# Changelog

## Apr 13, 2026 — Session 12 (v2 Socket Architecture Verification + Endpoint Upgrades)

### Endpoint Upgrades (5 endpoints changed)

| Constant | Old | New |
|----------|-----|-----|
| `ORDER_TABLE_SWITCH` | `/api/v1/.../pos/order-table-room-switch` | `/api/v2/.../order/order-table-room-switch` |
| `MERGE_ORDER` | `/api/v1/.../order/transfer-order` | `/api/v2/.../order/transfer-order` |
| `TRANSFER_FOOD` | `/api/v1/.../order/transfer-food-item` | `/api/v2/.../order/transfer-food-item` |
| `BILL_PAYMENT` | `/api/v2/.../order-bill-payment` | `/api/v2/.../order/order-bill-payment` |
| `CANCEL_ITEM` | `/api/v1/.../order/cancel-food-item` | `/api/v2/.../order/cancel-food-item` |

### Cancel Food Item v2 — Socket Events Verified ✅

**Tested:** Cancel 1 of 3 items from dine-in order 730865 @ restaurant 478

**Socket behavior (v2 — uses existing events!):**
1. `order-engage 730865 engage` — order locked
2. `update-order 730865 {payload}` — order updated with cancelled item removed (f_order_status=7)

**Key discovery:** Cancel food v2 reuses `update-order` event — no new event needed. Existing `handleUpdateOrder` handles it perfectly. No `update-table free`. No GET API. BUG-216 is irrelevant.

### Remaining v1 Dirty Flows — Backend Change Needed

3 flows still v1 dirty, all sharing one endpoint `order-status-update`:
- Cancel Order: 2× `update-table free` + `update-order-status` (no payload) + GET API
- Mark Ready: `update-order-status` (no payload) + GET API
- Mark Served: `update-order-status`/`update-food-status` (no payload) + GET API

**One backend fix for `order-status-update` covers all 3.**

### Switch Table v2 — Socket Events Verified ✅

**Tested:** Order 730850 switched FROM Table 4086 (source) TO Table 3237 (dest) @ restaurant 478

**Socket behavior (v2):**
1. `update-table 3237 engage` — dest table locked
2. `update-table 4086 engage` — source table locked (NEW — v1 only locked dest)
3. `update-order-target 730850 {payload}` — order updated (f_order_status=1, now on dest table)

**Key differences from Merge/Transfer Food:**
- Uses table-level locking (`update-table engage`) not order-level (`order-engage`)
- Only one data event (`update-order-target`) — no source event (same order, just moved)
- Both tables get `engage` — BUG-216 workaround no longer triggers for this flow

### Merge Table v2 — Socket Events Verified ✅

**Tested:** Order 730850 (source) merged INTO Order 730849 (target) @ restaurant 478

**New socket behavior (v2):**
1. `order-engage 730850 engage` — source order locked
2. `order-engage 730849 engage` — target order locked
3. `update-order-target 730849 {payload}` — target updated (f_order_status=1, occupied) — **NEW EVENT**
4. `update-order-source 730850 {payload}` — source cancelled (f_order_status=3, available) — **NEW EVENT**

**Key improvements over v1:**
- Order-level locking (not table-level) — works for all order types
- Both orders locked before processing
- Full payload — zero GET API calls
- No `update-table` events — BUG-221 (permanent spinner) resolved

### Transfer Food Item v2 — Socket Events Verified ✅

**Tested:** Food item transferred FROM Order 730849 (source) TO Order 730850 (target) @ restaurant 478

**Socket behavior (identical pattern to Merge Table v2):**
1. `order-engage 730849 engage` — source order locked
2. `order-engage 730850 engage` — target order locked
3. `update-order-target 730850 {payload}` — target updated (f_order_status=1, item added) — **SAME EVENT AS MERGE**
4. `update-order-source 730849 {payload}` — source updated (f_order_status=1, item removed) — **SAME EVENT AS MERGE**

**Key difference from Merge:** Source `f_order_status=1` (still active) vs Merge source `f_order_status=3` (cancelled). Same handler checks status to decide `updateOrder()` vs `removeOrder()`.

### Switch Table v1 — Socket Events Logged

**Tested:** Table→Table (3240→3239) and Walk-in→Table (0→3239)

**Socket behavior (v1, unchanged):**
1. `update-table {dest} engage`
2. `update-order {orderId}` (no payload)
3. `update-table {src} free`

Still requires GET API call. BUG-216 workaround still affects table-to-table transfers.

### Frontend Implementation Pending
- Add `update-order-target` and `update-order-source` to socket event constants
- Add shared handlers for both new events (covers Merge + Transfer Food)
- `update-order-source` handler: check `f_order_status` — if 3 (cancelled) → `removeOrder()`, else → `updateOrder()`
- Wire in `useSocketEvents.js` switch statement

### Files Modified
- `api/constants.js` — 3 endpoint URLs updated
- `memory/API_DOCUMENT_V2.md` — Merge v2 socket events documented, endpoint URLs updated
- `memory/ARCHITECTURE.md` — Socket event map, endpoint version map, locking architecture updated
- `memory/CLARIFICATIONS.md` — Socket event map updated with Merge v2
- `memory/ROADMAP.md` — TASK-B and TASK-C updated with verified merge v2 flow
- `memory/BUGS.md` — BUG-221 marked RESOLVED, endpoint references updated

---

## Apr 11, 2026 — Session 11 (Manual Bill Payload + Firebase SW Fix + Sound Fix)

### Manual Bill Print — Full Payload (COMPLETE ✅)
- **Problem:** Manual bill (`order-temp-store` API) was sending only `{order_id, print_type: "bill"}` — missing financial data, billFoodList, customer info, GST/VAT
- **Fix:** Bill now sends full payload matching backend expectation: `billFoodList` (raw orderDetails with `food_details`), computed `gst_tax`/`vat_tax`, `payment_amount`, `order_subtotal`, `Date`, `waiterName`, `tablename`, `custName`, `custPhone`, `order_type`, `Tip`, `serviceChargeAmount`, `delivery_charge`, etc.
- **KOT unchanged** — still sends simple `{order_id, print_type: "kot", station_kot: "KDS"}`
- **`station_kot`** now always included: `"KDS"` for KOT, `""` for Bill

#### Files Modified
- `api/transforms/orderTransform.js` — Added `rawOrderDetails` to `fromAPI.order()` return; added `toAPI.buildBillPrintPayload(order)` that builds full bill payload with computed GST/VAT
- `api/services/orderService.js` — `printOrder()` now accepts optional 4th param `orderData`; for bill builds full payload, for KOT keeps simple payload
- `components/cards/TableCard.jsx` — Added `useOrders` import, gets order via `getOrderById(table.orderId)`, passes to `printOrder`
- `components/cards/OrderCard.jsx` — Passes existing `order` prop to `printOrder` for bill

#### Bill Payload Key Mapping
| Payload Field | Source |
|---------------|--------|
| `billFoodList` | `order.rawOrderDetails` (preserved raw from API) |
| `gst_tax` | Computed: sum of `gst_tax_amount` where `food_details.tax_type === 'GST'` |
| `vat_tax` | Computed: sum of `gst_tax_amount` where `food_details.tax_type === 'VAT'` |
| `tablename` | `WC` (walk-in), `TA` (takeaway), `Del` (delivery), or `tableNumber` |
| `Date` | Formatted from `createdAt` as `DD/MMM/YYYY HH:MM AM/PM` |

### Firebase Service Worker — Activation Wait Fix (COMPLETE ✅)
- **Problem:** `getToken()` called immediately after `navigator.serviceWorker.register()` — SW still in `installing` state → `PushManager.subscribe()` fails with "no active Service Worker"
- **Fix:** Added wait for SW to reach `activated` state before calling `getToken()`
- **File Modified:** `config/firebase.js`

### Notification Sound — Second Play Fix (IDENTIFIED)
- **Problem:** `SoundManager.play()` uses `cloneNode()` on cached Audio elements — works first time, fails on subsequent plays due to stale media state
- **Fix approach:** Replace `cloneNode()` with `new Audio(path)` — browser HTTP-caches the `.wav` files so no performance impact
- **File:** `utils/soundManager.js` — NOT YET IMPLEMENTED (parked)

---

## Apr 11, 2026 — Session 10 (Socket Event Audit & Local Locking Analysis)

### Socket Event Audit — COMPLETE ✅
- Analyzed console logs for ALL order mutation flows (Transfer Order, Transfer Food Item, Cancel Food Item)
- Documented socket events received per flow with timestamps
- Built complete Socket Event Map (see CLARIFICATIONS.md §11)

### Endpoint Verification — COMPLETE ✅
- Confirmed all 3 endpoints stay on v1:
  - `POST /api/v1/vendoremployee/order/transfer-order`
  - `POST /api/v1/vendoremployee/order/transfer-food-item`
  - `PUT /api/v1/vendoremployee/order/cancel-food-item`
- Temporarily changed to v2, then reverted back to v1 after user confirmed

### Local Locking Audit — COMPLETE ✅
- Identified 10 locations with local locking that needs removal
- Established principle: ALL locking from socket events only, zero local locking
- Documented flow-specific wait logic (which socket event to wait for per flow)
- Documented in ROADMAP.md TASK-A (removal list) and TASK-B (replacement logic)

### BUG-216 Backend Fix Confirmed
- User confirmed BUG-216 fix is deployed on backend
- `free→engage` workaround approved for removal
- Will also fix BUG-221 (Merge Order source table locked)

### BUG-223 Created — Remove All Local Locking
- New bug tracking the removal of all local `setTableEngaged`/`waitForTableEngaged` calls
- 10 locations across 4 files identified

### Documentation Updated
- `ROADMAP.md` — New TASK-A, TASK-B, TASK-C items
- `BUGS.md` — BUG-216 status updated, BUG-223 added, socket audit results
- `CLARIFICATIONS.md` — §11 Socket Event Map, §12 Local Locking Audit
- `CHANGELOG.md` — This entry

### Transfer Order Scenarios Logged
| Scenario | Source | Destination | Logs Analyzed |
|----------|--------|-------------|---------------|
| Table→Table | 5536→5504 | ✅ | Yes |
| Walk-in→Table | 0→5510 | ✅ | Yes |
| Table→Table | 5583→5535 | ✅ | Yes |
| Table→Table | 5509→5511 | ✅ | Yes |

### v2 Endpoint Payload Test
- Tested all 3 endpoints (transfer-order, transfer-food-item, cancel-food-item) on v2
- **No socket payload in v2** — identical behavior to v1
- Reverted all 3 back to v1
- GET single order API still required for these flows

### Additional Socket Events Documented (from Mark Ready/Served/Food Status)

| Flow | Socket Event | GET API? | Local Workaround? |
|------|-------------|----------|-------------------|
| Order Ready | `update-order-status` (status 2) | ✅ Yes | ❌ No |
| Order Served | `update-order-status` (status 5) | ✅ Yes | ❌ No |
| Item Ready | `update-food-status` (status 2) | ✅ Yes | ⚠️ Yes (table engage/release) |
| Item Served | `update-food-status` (status 5) | ✅ Yes | ⚠️ Yes (table engage/release) |

### Files Modified
- `api/constants.js` — Endpoint tested on v2, reverted to v1 (no payload benefit)

---

## Apr 10, 2026 — Session 9 (KOT & Bill Manual Printing)

### KOT & Bill Manual Printing — COMPLETE
- Added manual print functionality for KOT and Bill via API
- **API Endpoint**: `POST /api/v1/vendoremployee/order-temp-store`
- **Payload**: `{ order_id: <id>, print_type: "kot" | "bill", station_kot: "KDS,BAR" }`

### Station Picker Integration — NEW
- Added `station_kot` parameter to API payload for KOT printing
- Created `StationPickerModal` component for multi-station selection
- Created `getStationsFromOrderItems()` utility function
- Fixed default station: now `null` instead of `"KDS"` (no KOT for items without station)
- Fixed walkIn/TakeAway/Delivery orders: now fallback to `table.items` when `orderItems` is undefined
- Added console logs for Auto KOT station debugging

### Bug Fix: orderItemsByTableId excludes walkIn
- `orderItemsByTableId` explicitly excludes walkIn orders (`if (!order.isWalkIn)`)
- Fixed by adding fallback: `orderItems?.items || table.items || []`

### Station Logic
| Scenario | Behavior |
|----------|----------|
| Single station | Print directly, no picker shown |
| Multiple stations | Show picker modal with checkboxes |
| No stations | Show error toast or print without station filter |

### Button Mapping
| Location | Button | Action |
|----------|--------|--------|
| TableCard (Dashboard) | Printer icon | Print KOT (with station picker if needed) |
| TableCard (Dashboard) | Bill (green) | Print Bill |
| OrderCard (Dashboard) | Printer icon | Print KOT (with station picker if needed) |
| OrderCard (Dashboard) | Bill (green) | Print Bill |
| OrderEntry Cart Panel | Re-Print | Print KOT (with station picker if needed) |

### Files Modified
- `api/constants.js` — Added `PRINT_ORDER` endpoint
- `api/services/orderService.js` — Added `printOrder(orderId, printType, stationKot)` function
- `api/services/stationService.js` — Added `getStationsFromOrderItems()` utility
- `api/transforms/productTransform.js` — Fixed station default to `null`
- `components/cards/TableCard.jsx` — Station picker integration
- `components/cards/OrderCard.jsx` — Station picker integration
- `components/order-entry/RePrintButton.jsx` — Station picker integration
- `components/order-entry/CartPanel.jsx` — Pass `cartItems` to RePrintOnlyButton
- `pages/DashboardPage.jsx` — Pass `orderItems` to TableCard

### New Files Created
- `components/modals/StationPickerModal.jsx` — Multi-select station picker modal

### UX Behavior
- Button disabled during API call (loading state)
- Success toast: "KOT request sent - Stations: KDS,BAR"
- Error toast: "Failed to send KOT request" or "No KOT stations"

### Bug Fix
- **Bill button on cards** — Previously opened Collect Payment panel, now correctly prints bill only

### Firebase Notification — Console Logs Added
- Added detailed logging for FCM debugging
- Permission status logging: `[Firebase] Current notification permission: granted|denied|default`
- Token logging: `[Firebase] FCM Token obtained: xxx...`
- Payload logging: `[Notification] Full payload: { ... }`
- Sound resolution logging: `[Notification] Sound - from payload: ... | resolved: ...`
- User warning toast if notifications denied

### Firebase Notification — Backend Payload Analysis
- **Backend DOES send `webpush`** section (confirmed from backend code)
- **But missing `webpush.data`** section — only sends `notification`, `headers`, `fcm_options`
- **Frontend receives:** `payload.notification` ✅, `payload.data` undefined ❌
- **Sound works via fallback:** `inferSoundFromContent()` guesses sound from title text
  - "new order" → `new_order.wav`
  - "confirm" → `confirm_order.wav`
- **This is fragile** — explicit `webpush.data.sound` is more reliable
- **Backend fix:** Add `'data' => ['sound' => 'new_order', ...]` inside `webpush` array

---

## Apr 10, 2026 — Session 8 (Firebase Cloud Messaging Phase 1)

### Firebase FCM Phase 1 — COMPLETE
- Installed Firebase SDK (`firebase@12.12.0`)
- All Firebase config stored in `.env` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId, VAPID key) — zero hardcoding
- **Files Created**:
  - `src/config/firebase.js` — Firebase init from env, FCM token request, foreground message listener
  - `public/firebase-messaging-sw.js` — Service Worker for background push notifications
  - `src/utils/soundManager.js` — Audio manager: preloads 14 wav files, plays by key, silent stops current sound
  - `src/contexts/NotificationContext.jsx` — Processes incoming FCM messages, triggers sound + banner
  - `src/components/layout/NotificationBanner.jsx` — Full-width top banner for FCM notifications
  - `src/components/layout/NotificationTester.jsx` — Test panel in Settings to simulate notifications
  - `public/sounds/*.wav` — 14 sound files extracted from user's Archive.zip
- **Files Modified**:
  - `contexts/AppProviders.jsx` — Added NotificationProvider
  - `contexts/index.js` — Exported NotificationProvider + useNotifications
  - `pages/LoginPage.jsx` — Requests FCM token before login, sends as `fcm_token` in payload
  - `api/transforms/authTransform.js` — Added `fcm_token` to login request transform
  - `components/order-entry/OrderEntry.jsx` — Removed "Order Placed" and "Order Updated" local toasts (replaced by FCM push)
  - `components/panels/SettingsPanel.jsx` — Added "Test Notifications" tile
  - `pages/DashboardPage.jsx` — Added NotificationBanner component

### FCM Token Flow
1. User clicks Login → `requestFCMToken()` → browser permission prompt → token obtained
2. `fcm_token` sent in login API payload alongside email/password
3. No separate `/register-device` endpoint needed

### FCM Notification Flow
1. Foreground: `onMessage` → extract title/body from `payload.notification`, sound from `payload.data.sound` → play sound + show top banner
2. Background: Service Worker → native browser notification + forward to app for sound
3. Silent (`data.sound: 'silent'`) → stops any playing sound
4. Banner: full-width top, auto-dismiss 6s, max 3 stacked

### Backend Webpush Payload Requirement (shared with backend team)
```php
'webpush' => [
    'headers' => ['Urgency' => 'high'],
    'data' => ['sound' => $basename],  // matches .wav filename without extension
    'fcm_options' => ['link' => '/dashboard'],
],
```

### Sidebar Silent Mode Toggle → SoundManager
- Sidebar Bell/BellOff toggle now wired to `NotificationContext.soundEnabled`
- Bell (green) = Ringer On → notification sounds play
- BellOff (gray) = Silent Mode → banners still show, no sound
- Removed `isSilentMode` prop drilling from `DashboardPage.jsx`
- `Sidebar.jsx` reads directly from `useNotifications()` context

### Pending Verification
- User needs to confirm browser notification permission is "Allow"
- Verify `[Firebase] FCM Token obtained` in console after login
- End-to-end test: notification from another tab/device
- Confirm `payload.data.sound` arrives from backend after `webpush` addition

---

## Apr 10, 2026 — Session 7 (UX Overhaul, Compact Headers, Order Timeline)

### Initial Setup
- Cloned from `v3--payments-` branch
- Merged `API_MAPPING.md` into `API_DOCUMENT_V2.md`

### Default View Settings — COMPLETE ✅
- Station View: Default OFF on login
- Sidebar: Default collapsed on login
- Dashboard: Default to Status view (not Channel)
- **Files Modified**: `StationContext.jsx`, `DashboardPage.jsx`

### Login Page Redesign — COMPLETE ✅
- Title: "Streamlined Hospitality." (orange) + "Exceptional Experience." (green)
- Footer: "© Mygenie 2025. HOSIGENIE HOSPITALITY SERVICES PRIVATE LIMITED. All Rights Reserved."
- Removed "Request for Demo" button and "OR" divider
- **Files Modified**: `LoginPage.jsx`

### Loading Page Update — COMPLETE ✅
- Removed "Setting up your POS..." title
- Changed to "Please wait while we set up your system"
- **Files Modified**: `LoadingPage.jsx`

### Header Redesign — COMPLETE ✅
- Filter pills: Changed to subtle gray style (removed orange)
- Search box: Smaller width (`w-48`/`w-64`) and shifted right
- ADD button: Moved to extreme right
- Online indicator: Positioned after ADD button
- Removed Table/Status dropdowns (moved to sidebar)
- **Files Modified**: `Header.jsx`

### Sidebar View Toggles — COMPLETE ✅
- Added View toggles: Grid (Table) / List (Order) icons
- Added Group toggles: Columns (Channel) / Rows (Status) icons
- Active state: Green highlight background
- Works in collapsed and expanded modes
- **Files Modified**: `Sidebar.jsx`

### Channel Icons on All Cards — COMPLETE ✅
- Added Utensils icon for Dine-In and Walk-In
- Added DoorOpen icon for Room
- Delivery (Bike) and TakeAway (ShoppingBag) already present
- Icons now show in both Table View and Order View
- **Files Modified**: `TableCard.jsx`, `OrderCard.jsx`, `ChannelColumn.jsx`

### Ready/Serve Button Borders — COMPLETE ✅
- Ready button: Orange text + cream bg + orange border
- Serve button: Green text + light green bg + green border
- **Files Modified**: `TableCard.jsx`, `OrderCard.jsx`, `TextButton.jsx`

### Order Entry Compact Header — COMPLETE ✅
- Merged 2 header rows into 1 compact row
- Removed Veg/Non-Veg/Egg filters
- Removed category search from CategoryPanel
- Prominent back button (orange filled icon)
- Search box smaller with proper spacing
- Out of menu (+) as first action icon in group
- **Files Modified**: `OrderEntry.jsx`, `CategoryPanel.jsx`

### Cart Panel KOT/Bill Logic — COMPLETE ✅
- Re-Print: Only shows for placed items
- KOT/Bill checkboxes: Only show for new (unplaced) items
- Split `RePrintButton` into `RePrintOnlyButton` and `KotBillCheckboxes`
- **Files Modified**: `CartPanel.jsx`, `RePrintButton.jsx`

### Dynamic Tables Setting — COMPLETE ✅
- Added `enableDynamicTables` setting (default: OFF)
- Table name input only shows when enabled
- Toggle in Settings > General > "Dynamic Table Names"
- Persisted in localStorage
- **Files Modified**: `CartPanel.jsx`, `SettingsContext.jsx`, `ViewEditViews.jsx`

### Order Timeline Feature — COMPLETE ✅
- **NEW COMPONENT**: `OrderTimeline.jsx` for compact dot timeline
- Format: `●──14m──●──3m──●` (Placed → Ready → Served)
- Filled dots = completed stages, Empty dots = pending
- Duration shown between stages
- Added to Order Card headers in Order View
- Stage-specific time in Table View cards
- Added `readyAt`, `servedAt` to order transform (computed from items)
- **Files Created**: `OrderTimeline.jsx`
- **Files Modified**: `OrderCard.jsx`, `TableCard.jsx`, `orderTransform.js`, `DashboardPage.jsx`

### Search Improvements (Partial)
- Fixed null check in search function
- Added `fOrderStatus` to `orderItemsByTableId`
- **Note**: Dynamic table search still pending clarification
- **Files Modified**: `DashboardPage.jsx`, `OrderContext.jsx`

---

## Apr 9, 2026 — Session 6 (Header UX, Layout Settings, Auto Print, Split Bill)

### Split Bill Feature — COMPLETE ✅
- **New Feature**: Split order among multiple people (friends sharing a meal)
- **Entry Point**: Scissors icon in OrderEntry header (visible when order has 2+ placed items)
- **Two Modes**:
  - **By Person**: Select specific items for each person, with qty split support
  - **Equal Split**: Divide bill evenly among N people (2-6)
- **API**: `POST /api/v1/vendoremployee/pos/split-order`
- **Flow**: Split → Creates new order(s) → Auto-refresh orders
- **Files Created**: `components/modals/SplitBillModal.jsx`
- **Files Modified**: `api/constants.js`, `api/services/orderService.js`, `components/order-entry/OrderEntry.jsx`

### Filter Pills — Light Tint Style (Option A) — COMPLETE ✅
- **Problem**: Even with ghost style, all-selected filters were still too orange
- **Solution**: Changed to light tint style:
  - Active: Light orange background (`#FFF3E8`) + orange text
  - Inactive: Transparent + gray text
- **Files Modified**: `Header.jsx`

### Action Buttons — Light Tint Style — COMPLETE ✅
- **Problem**: Ready/Serve buttons were solid orange/green, too prominent
- **Solution**: Changed to light tint style matching filters:
  - Ready: Light orange tint (`#FFF3E8` bg + orange text)
  - Serve: Light green tint (`#E8F5E9` bg + green text)  
  - Bill: Stays solid green (primary CTA)
  - Cancel X: Changed from red to gray (de-emphasized)
- **Files Modified**: `TableCard.jsx`, `OrderCard.jsx`

### MG Logo Removed from Order Cards — COMPLETE ✅
- **Problem**: MG logo on every order card was unnecessary visual noise
- **Solution**: Removed MG logo from all own orders in Order View
  - Aggregator logos (S/Z) still show for Swiggy/Zomato orders
- **Files Modified**: `OrderCard.jsx`

### Price Color in Order View — COMPLETE ✅
- Changed price from orange to gray to match Table View style
- **Files Modified**: `OrderCard.jsx`

### Column Header Count Badge — COMPLETE ✅
- Changed format from `activeCount/totalCount` to just `activeCount`
- Changed color from orange to gray
- **Files Modified**: `ChannelColumn.jsx`

### Dine-In Header Wrap Fix — COMPLETE ✅
- Added `whitespace-nowrap` to prevent "Dine-In" breaking into two lines
- **Files Modified**: `ChannelColumn.jsx`

### Hide Link Removed from Column Headers — COMPLETE ✅
- Removed inline "Hide" button (visibility now controlled via Settings page only)
- Removed "Show Hidden" button from Header
- **Files Modified**: `ChannelColumn.jsx`, `Header.jsx`

### Max 6 Filters in Header — COMPLETE ✅
- Limited status/channel filters to max 6 in header
- **Files Modified**: `Header.jsx`

### Search Centered in Header — COMPLETE ✅
- New layout: `[Logo][Filters] — [Search (center)] — [Add][Table▾][Channel▾]`
- Search now has dedicated flex-1 centered section
- **Files Modified**: `Header.jsx`

### Auto Print Checkboxes (KOT/Bill) — COMPLETE ✅
- Added KOT and Bill checkboxes next to Re-Print button in Order Entry
- Default state loaded from Settings API (`autoKot`, `autoBill`)
- User can toggle per order
- Actual print functionality to be bound later
- **Files Modified**: `RePrintButton.jsx`, `profileTransform.js`, `RestaurantContext.jsx`

### Default Column Layout Settings — COMPLETE ✅
- **New Feature**: Configure default columns per channel for Table View and Order View
- **Location**: Visibility Settings page → "Default Column Layout" section
- **Controls**: +/- buttons for each channel (Dine-In, TakeAway, Delivery, Room)
- **Storage**: 
  - `mygenie_layout_table_view` = `{ dineIn: 2, takeAway: 2, delivery: 2, room: 2 }`
  - `mygenie_layout_order_view` = `{ dineIn: 1, takeAway: 1, delivery: 1, room: 1 }`
- **Behavior**:
  - Removed smart measurement logic (was auto-calculating based on screen width)
  - Now reads from localStorage (or hardcoded defaults)
  - Arrow buttons on dashboard = session only (not persisted)
  - Switching views loads from localStorage
- **Files Modified**: `StatusConfigPage.jsx`, `ChannelColumnsLayout.jsx`

---

## Apr 9, 2026 — Session 5 (Header UX Refinements)

### Header UX Improvement — COMPLETE ✅
- **Problem**: Too many clustered orange icons on the right side of the header. Two toggle groups (Grid/List and Columns/BarChart) looked similar and had no labels, causing confusion.
- **Solution**: Option A — Replaced icon toggles with labeled dropdown buttons:
  - `[+ Add]` — labeled add order button (was icon-only `+`)
  - `[Table ▾]` dropdown → options: "Table View", "Order View" (was Grid/List icon toggle)
  - `[Channel ▾]` / `[Status ▾]` dropdown → options: "By Channel", "By Status" (was Columns/BarChart icon toggle pair)
  - `[●]` online indicator retained
- **Behavior**: Dropdown labels dynamically reflect current selection. Only one dropdown open at a time. Closes on outside click. Checkmark on active option.
- **Files Modified**: `Header.jsx`
- **Testing**: 18/18 tests passed (100% success rate)

---

## Apr 8, 2026 — Session 3 (Dual-View System + Visibility Settings)

### Status Configuration Page — COMPLETE ✅
- **New Page**: `/visibility/status-config` — Configure which statuses are visible on dashboard
- **Sidebar**: Added "Visibility Settings" menu with "Status Configuration" sub-item
- **Features**:
  - Grid of 9 status cards with enable/disable toggle
  - Enable All / Disable All quick action buttons
  - Reset to Default button
  - Save Configuration (persists to localStorage)
  - Unsaved changes indicator with "Save Now" toast
- **Storage**: localStorage key `mygenie_enabled_statuses`
- **Effect**: Disabled statuses are hidden from both:
  - Channel View: Status filter pills
  - Status View: Status columns
- **Files Created**: `StatusConfigPage.jsx`
- **Files Modified**: `Sidebar.jsx`, `App.js`, `DashboardPage.jsx`, `Header.jsx`
- **Future**: Will be replaced by role-based permissions from backend

### Dashboard Dual-View System — COMPLETE ✅
- **Feature Flag**: Added `USE_STATUS_VIEW` to `featureFlags.js`
- **Constants**: Added `STATUS_COLUMNS` with all 9 status definitions, `fOrderStatus: 10 (reserved)`
- **State**: Added `dashboardView` ('channel' | 'status'), `hiddenChannels`, `hiddenStatuses`
- **Data Layer**: Added `statusData` memo that groups orders by fOrderStatus (1-10)
- **Filter Swap**: 
  - Channel View → 9 Status filters (YTC, Preparing, Ready, Running, Served, Pending Pay, Paid, Cancelled, Reserved)
  - Status View → 4 Channel filters (Del, Take, Dine, Room)
- **Filtering**: Filters now work within columns (status filters in channel view, channel filters in status view)
- **Hide Feature**: Hide link on column headers, linked to filter hiding across views
- **Restore**: "Show Hidden (N)" button in Header

### Header Redesign
- Removed static "All/Del/Take/Dine/Room" channel pills
- Single filter section that swaps based on dashboardView
- Layout: Filters → Search → [+ Add] → [Table ▾] → [Channel ▾] → [●]
- Icon toggles replaced with labeled dropdowns in Session 4 (see above)

### Food Transfer Fix — P0 COMPLETE ✅
- Threaded `onFoodTransfer` prop through DashboardPage → ChannelColumnsLayout → ChannelColumn → OrderCard
- Food transfer icon now correctly opens transfer modal

### Documentation Updated
- ROADMAP.md: Marked items #1, #3, #6 as complete, added Status Configuration
- ARCHITECTURE.md: Added sections 9.4 "Dashboard Dual-View System" and 9.5 "Status Configuration"
- PRD.md: Updated status, marked all features as implemented
- CHANGELOG.md: This entry

---

## Apr 7, 2026 — Session 2 (Fork)

### Smart Default Column Calculation
- Added dynamic default maxColumns based on container width measurement
- `useEffect` measures container on mount, counts visible channels, calculates `floor(availablePerChannel / cardUnit)` per channel
- Uses `initializedForViewRef` to calculate once per viewType switch (not on every data update)
- Static fallback: table=2, order=1 (before measurement completes)

### View-Type Aware Defaults
- Table view default: 2 columns per channel
- Order view default: 1 column per channel
- Switching views resets columns to that view's default, then smart calculation overrides

### Arrow Logic Corrected (3 iterations)
- Iteration 1: Arrows transferred columns between adjacent channels (WRONG — user wanted independent)
- Iteration 2: `<` decreases self, `>` increases self, adjacent compensates (WRONG — no coupling wanted)
- Iteration 3 (FINAL): Each channel fully independent. `<` decreases (min 1), `>` increases (no max). No effect on other channels.

### localStorage Removed
- User requirement: layout resets to defaults on every login
- Switched from `useLocalStorage` to `useState`
- Added cleanup `useEffect` to remove stale `mygenie_channel_max_columns` key from browser

### Duplicate React Key Fix
- `channelData.dineIn.items` was including walk-in orders twice (from `allTablesList` + `walkInOrders.map`)
- Fixed: `allTablesList.filter(t => !t.isRoom && !t.isWalkIn)`

### Testing
- Testing agent: 12/12 tests passed (100%) for arrow functionality
- Verified: login flow, all 4 channels, arrow independence, horizontal scroll, order view, layout reset

## Apr 7, 2026 — Session 1 (Original)

### Initial Setup
- Cloned repository from GitHub (v2 branch)
- Installed dependencies with yarn
- Configured env: REACT_APP_API_BASE_URL, REACT_APP_SOCKET_URL

### Permission-Based UI
- Removed time-window/restaurant setting checks for Cancel button
- Added permission checks for `bill` and `print_icon`
- Wired Food Transfer button to navigate to OrderEntry and open modal

### Socket Workaround
- Added frontend workaround for missing `update_table` socket event on item status changes
- Table gets "engaged" lock during API fetch, released after socket event or timeout

### Channel-Based Layout — Structure Created
- Created `USE_CHANNEL_LAYOUT` feature flag
- Built `ChannelColumnsLayout.jsx`, `ChannelColumn.jsx`, `ResizeHandle.jsx`
- Added `channelData` memo in DashboardPage.jsx
- Feature-flagged rendering: old area-based vs new channel-based
