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
- 5 new event constants: UPDATE_ORDER_TARGET, UPDATE_ORDER_SOURCE, UPDATE_ORDER_PAID, UPDATE_ITEM_STATUS
- `handleOrderDataEvent` — unified handler for 5 v2 data events
- No GET API fallback (v2 only), no guard (deferred)
- Table change detection for switch table
- Remove vs update decision for terminal statuses
- BUG-216 `free→engage` workaround removed (free→ignore)

**OrderContext.jsx:**
- `waitForOrderEngaged` polling function added

**OrderEntry.jsx — Fire-and-forget + wait-for-engage pattern:**
- All 8 handlers: start listening for engage BEFORE API call, fire API without await, redirect on socket confirmation
- Console log identifiers for every redirect point

**Dashboard engage fix (DashboardPage.jsx, ChannelColumnsLayout.jsx, ChannelColumn.jsx):**
- Removed local `setTableEngaged` from handleMarkReady/handleMarkServed
- All card components now use `isOrderEngaged(orderId) || isTableEngaged(tableId)` for spinner
- Walk-in/Delivery/TakeAway now show spinner during order-engage
- `handleConfirmOrder`: changed from N item-level `FOOD_STATUS_UPDATE` calls to single `ORDER_STATUS_UPDATE` with `order_status: "paid"`

### Verified Flow Matrix (Console Log Validated)

| Flow | Status | Notes |
|------|--------|-------|
| New Order (dine-in) | ✅ | No regression |
| Update Order | ✅ | Fire-and-forget, instant redirect, no 5s delay |
| Cancel Food Item | ✅ | Instant redirect |
| Transfer Food (partial) | ✅ | Both orders updated |
| Shift Table | ✅ | Table change detection, old table freed |
| Merge (Table → Table) | ✅ | Target updated, source removed |
| Merge (Walk-in → Walk-in) | ✅ | Both events received |
| Merge (Table → Walk-in) | ✅ | Source table freed, target updated |
| Merge (Walk-in → Table) | ❌ | Backend BUG-228 |
| Mark Ready (order-level) | ✅ | Table + walk-in |
| Mark Served (item-level) | ✅ | `update-item-status` |
| Item Ready (item-level) | ✅ | `update-item-status` |
| Cancel Full Order | ✅ | Double-fire idempotent |
| Collect Bill | Needs testing | Pattern implemented |
| Confirm Order (YTC→Preparing) | ❌ | Backend BUG-229 — `$orderstatus` undefined |

### Bugs Fixed (Frontend)
- BUG-216: free→engage workaround removed
- BUG-221: Merge order source table locked
- BUG-222: waitForTableEngaged timeout on Update Order
- BUG-223: Local locking removed from Dashboard
- Update Order / Cancel Food 5s timeout delay
- Collect Bill permanent table lock
- Walk-in/Delivery/TakeAway never showed spinner

### Backend Bugs Filed
- BUG-226: order-engage missing before update-item-status → ✅ FIXED same day
- BUG-227: Order-level Ready/Serve does not update item-level food_status → ❌ OPEN
- BUG-228: update-order-target not sent for Walk-in → Table merge → ❌ OPEN
- BUG-229: Confirm Order — backend `$orderstatus` undefined at OrderController.php:3643 → ❌ OPEN

## Prioritized Backlog

### P0 (Critical)
- Collect Bill flow: needs live console log validation

### P1 (High)
- Phase 2 guard: skip already-removed orders (defensive)
- Cancel Food last item: verify order cleanup
- Ghost cards in Table View (channelData statusMatchesFilter includes empty tables)

### P2 (Medium)
- handleUpdateOrderStatus guard: skip GET if already handled by update-order-paid
- Remove dead code: handleUpdateOrder (delegates), handleUpdateFoodStatus (never fires)

### Open Backend Bugs
- BUG-204: order_sub_total_without_tax returns 0
- BUG-210: No table engage check (multi-device race)
- BUG-212: Addon names mismatch between APIs
- BUG-224: Manual Bill gst_tax always 0
- BUG-225: Manual Bill custName sends label instead of real name
- BUG-227: Order-level Ready/Serve does not update item-level food_status
- BUG-228: update-order-target not sent for Walk-in → Table merge
