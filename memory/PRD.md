# MyGenie POS Frontend - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/core-pos-front-end-.git branch `13-Apirl-V1`. React frontend only. Run as-is, then implement SOCKET_V2_FEATURE.md plan.

## Architecture
- **Frontend**: React 19 with Craco, Tailwind CSS, Radix UI components, Firebase, Socket.io
- **API Backend**: External - `https://preprod.mygenie.online/`
- **Socket**: External - `https://presocket.mygenie.online`
- **Auth**: Firebase (Google Auth domain: mygenie-restaurant.firebaseapp.com)
- **Restaurant ID**: 478 (preprod), 509 (testing)

## What's Been Implemented

### Jan 13, 2026 — Session 1: Repo Setup
- Cloned repo from GitHub (branch: 13-Apirl-V1)
- Installed all dependencies
- Configured environment variables
- Frontend running on port 3000

### Jan 13, 2026 — Session 2: Socket v2 Full Implementation (8 files)

**Socket Event Handlers (socketEvents.js, socketHandlers.js, useSocketEvents.js):**
- 4 new event constants: UPDATE_ORDER_TARGET, UPDATE_ORDER_SOURCE, UPDATE_ORDER_PAID, UPDATE_ITEM_STATUS
- `handleOrderDataEvent` — unified handler for 5 v2 data events
- No GET API fallback (v2 only), no guard (deferred)
- Table change detection for switch table
- Remove vs update decision for terminal statuses
- BUG-216 `free→engage` workaround removed (free→ignore)

**OrderContext.jsx:**
- `waitForOrderEngaged` polling function added

**OrderEntry.jsx — Fire-and-forget + wait-for-engage pattern:**
- All 8 handlers updated: start listening for engage BEFORE API call, fire API without await, redirect on socket confirmation
- handlePlaceOrder (update), handleTransfer, handleMerge, handleShift, handleCancelFood, handleCancelOrder, onPaymentComplete (collect bill)
- Console log identifiers for every redirect point

**Dashboard engage fix (DashboardPage.jsx, ChannelColumnsLayout.jsx, ChannelColumn.jsx):**
- Removed local `setTableEngaged` from handleMarkReady/handleMarkServed
- All card components now use `isOrderEngaged(orderId) || isTableEngaged(tableId)` for spinner
- Walk-in/Delivery/TakeAway now show spinner during order-engage
- Click blocking checks both table + order engage

### Bugs Fixed (Session 2)
- BUG-216: free→engage workaround removed
- BUG-221: Merge order source table locked — fixed
- BUG-222: waitForTableEngaged timeout on Update Order — fixed
- BUG-223: Local locking removed from Dashboard
- BUG-226: order-engage missing before update-item-status — fixed (backend)
- Update Order 5s timeout delay — fixed (fire-and-forget)
- Cancel Food 5s timeout delay — fixed
- Collect Bill permanent table lock — fixed
- Walk-in/Delivery/TakeAway never showed spinner — fixed

### Verified Flows (Console Log Validated)
- Mark Ready (table order) ✅
- Mark Ready (walk-in) ✅
- Mark Served (item-level) ✅
- Transfer Food (partial) ✅
- Cancel Full Order (double-fire idempotent) ✅
- Update Order (fire-and-forget, instant redirect) ✅
- Item-level Ready/Serve (update-item-status) ✅

## Prioritized Backlog

### P0 (Critical)
- None currently

### P1 (High)
- Collect Bill flow: needs live console log validation
- Shift Table flow: needs live console log validation
- Merge Table flow: needs live console log validation
- Cancel Food last item: verify order cleanup

### P2 (Medium)
- Phase 2 guard: skip already-removed orders (defensive)
- handleUpdateOrderStatus guard: skip GET if already handled by update-order-paid
- Remove dead code: handleUpdateOrder (delegates), handleUpdateFoodStatus (never fires)
- Walk-in edge cases: merge walk-in into table, transfer food with tableId=0

### Open Backend Bugs
- BUG-204: order_sub_total_without_tax returns 0
- BUG-210: No table engage check (multi-device race)
- BUG-212: Addon names mismatch between APIs
- BUG-224: Manual Bill gst_tax always 0
- BUG-225: Manual Bill custName sends label instead of real name
