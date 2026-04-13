# MyGenie POS Frontend - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/core-pos-front-end-.git branch `13-Apirl-V1`. React frontend only. Run as-is, then implement SOCKET_V2_FEATURE.md plan.

## Architecture
- **Frontend**: React 19 with Craco, Tailwind CSS, Radix UI components, Firebase, Socket.io
- **API Backend**: External - `https://preprod.mygenie.online/`
- **Socket**: External - `https://presocket.mygenie.online`
- **Auth**: Firebase (Google Auth domain: mygenie-restaurant.firebaseapp.com)
- **Restaurant ID**: 478

## What's Been Implemented

### Jan 13, 2026 — Session 1: Repo Setup
- Cloned repo from GitHub (branch: 13-Apirl-V1)
- Installed all dependencies (firebase, socket.io-client, @hello-pangea/dnd, radix-ui extras)
- Configured environment variables
- Frontend running on port 3000

### Jan 13, 2026 — Session 2: Socket v2 Implementation
Implemented SOCKET_V2_FEATURE.md — 5 files changed, 0 new files:

**Phase 1: socketEvents.js**
- Added 3 new event constants: UPDATE_ORDER_TARGET, UPDATE_ORDER_SOURCE, UPDATE_ORDER_PAID
- Updated EVENTS_WITH_PAYLOAD (added UPDATE_ORDER + 3 new)
- Updated EVENTS_REQUIRING_ORDER_API (removed UPDATE_ORDER)

**Phase 2: socketHandlers.js**
- Added `handleOrderDataEvent` — unified handler for update-order, update-order-target, update-order-source, update-order-paid
- No GET API fallback (v2 only, fail fast if no payload)
- No guard (deferred to future phase)
- Table change detection for switch table (update-order-target)
- Remove vs update decision (terminal + source/paid → removeOrder)
- Fixed BUG-216: changed free→engage workaround to free→ignore
- Updated handler registry (getHandler + isAsyncHandler)

**Phase 3: useSocketEvents.js**
- Imported handleOrderDataEvent (replaced handleUpdateOrder)
- Added 3 new switch cases + updated update-order case to pass eventName

**Phase 4: OrderContext.jsx**
- Added waitForOrderEngaged polling function
- Exported in context value + useMemo deps

**Phase 5: OrderEntry.jsx — 6 handler updates**
- handlePlaceOrder (update path): waitForTableEngaged → waitForOrderEngaged
- handleShift: added waitForTableEngaged(destTableId)
- handleMerge: added waitForOrderEngaged(targetOrderId)
- handleTransfer: added waitForOrderEngaged(sourceOrderId)
- handleCancelFood: waitForTableEngaged → waitForOrderEngaged
- onPaymentComplete (collect bill): removed local setTableEngaged(true)

### Bugs Fixed
- GAP-1: Update Order 5s timeout delay — FIXED (now uses waitForOrderEngaged)
- GAP-2: Cancel Food 5s timeout delay — FIXED (now uses waitForOrderEngaged)
- GAP-3: Collect Bill permanent table lock — FIXED (removed local setTableEngaged)
- GAP-4: Shift/Merge/Transfer no wait → stale UI — FIXED (added appropriate waits)
- BUG-216: free→engage workaround causing stuck tables — FIXED (free now ignored)

### Testing Results
- All 13 test cases passed (login, socket connection, dashboard, permissions, compilation, event routing, console logs)
- No "Unknown order event" messages
- Socket subscriptions confirmed for all 3 channels (new_order_478, update_table_478, order-engage_478)

## Prioritized Backlog

### P0 (Critical)
- None currently

### P1 (High)
- Phase 2 guard: skip already-removed orders (defensive, not blocking)
- food_details validation: verify item names display correctly in all flows
- Multi-device race condition testing

### P2 (Medium)
- Remove dead handleUpdateOrder code (currently delegates to handleOrderDataEvent)
- handleUpdateOrderStatus guard: skip GET if order already handled by update-order-paid
- Walk-in edge cases: merge walk-in into table, transfer food with tableId=0

### Future/Backlog
- Cancel food last item → order cleanup (consistent with current behavior, may need backend event)
- handleUpdateFoodStatus local engage workaround removal (needs backend update)
- Partial payments / split pay implementation
- Service tax implementation
