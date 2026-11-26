# Impact Analysis — BUG-701: Room edit-confirm popup disappears on item-cancel

**Gate:** 2 — Impact Analysis · **Role:** PLANNING
**Date:** 2026-11-18 · **Status:** GATE_2_IA_COMPLETE (non-UI, no design gate)
**Priority:** P0 · **Risk:** HIGH · **Assignee:** Abhishek · **Release:** 2026-11-17
**Source:** INV-ROOM-CANCEL-POPUP (2026-11-18) — CONFIRMED (live preprod probe + authorized cancel on order 1578881, RID 69)
**Intake:** `change_requests/BUG-701_ROOM_EDIT_CONFIRM_POPUP_DISAPPEARS_ON_ITEM_CANCEL_INTAKE.md`

---

## Code Reality: CONFIRMED
- `ScanOrderPopOut.jsx:63-66` — `hasUnconfirmedWebEditItems(order)` is **first-gated on `order.isWebOrder`**; the popup queue (`L179-188`) keeps an order only while this (or `isUnconfirmedScanOrder`) is true. `L267-275` unmount the popup when the queue empties.
- `orderTransform.js:265-266` — `isWebOrder = normaliseOrderFrom(api.order_from) === 'web'`. Room orders return `order_from` = `"pos"`/`null` → `isWebOrder=false`.
- `socketHandlers.js:430` (`handleUpdateFoodStatus`) → `updateOrder(order.orderId, order)` with the freshly re-transformed order (also `handleOrderDataEvent` L270/updateOrder, `handleUpdateOrderStatus` L460+). Each re-transform recomputes `isWebOrder=false` for rooms.
- `OrderContext.jsx:148` — `updateOrder` does a **full object replace** (`prev.map(o => o.orderId===orderId ? updatedOrder : o)`); no field preservation.
- `useOrderPollingReconciliation.js:170-177` — BUG-082 **already** preserves web origin for the *poll* path (`if (!s.orderFrom && l.orderFrom){ s.orderFrom=l.orderFrom; s.isWebOrder=l.isWebOrder }`) — but this guard is **absent** from `updateOrder` and the socket handlers.

Net: after cancelling a web-edit line on a **room** order, the follow-up socket frame / single-order fetch replaces the context order with `isWebOrder=false`, it drops out of the popup queue, and the popup unmounts. Table web orders keep `order_from="web"` and survive.

## Conflict Pre-Check
- **OrderContext.jsx** — last touched BUG-595 (L342, dine-in discount whitelist), BUG-250 (`mergeRunningOrders`). Our edit is inside `updateOrder` merge (L140-152) — **no line overlap**, additive. **Parallel-safe.**
- **CR-552** (GATE_5A_IMPLEMENTED 2026-11-18) touched `ScanOrderPopOut.jsx` + `orderTransform.js` + `DashboardPage.jsx`. BUG-701 does **not** edit those files (fix is in OrderContext only) → **no conflict** with CR-552. The `hasUnconfirmedWebEditItems` helper CR-552 added is the *consumer* we are protecting — behavior-compatible.
- **BUG-686** (useOrderPollingReconciliation L275-281) — different function; our guard reuses the same *rule* at L174-177 but adds no edit there. **No conflict.**

## Data Flow Trace
```
Web guest edits room order → backend appends food_status=7 line
  ↓
Socket update-food-status → handleUpdateFoodStatus (socketHandlers.js:417)
  ↓   fetchOrderWithRetry → orderFromAPI.order(apiOrder)
  ↓ ← BREAK POINT 1: orderTransform.js:266 sets isWebOrder=false (order_from=pos/null for room)
updateOrder(orderId, freshOrder)  (socketHandlers.js:430)
  ↓ ← BREAK POINT 2: OrderContext.jsx:148 full-replaces the order, dropping the prior isWebOrder=true
ScanOrderPopOut queue (L182) → hasUnconfirmedWebEditItems=false (gated on isWebOrder)
  ↓
queue empties → L268 `if (queue.length === 0) return null` → popup unmounts ❌
```

## Risk Classification: HIGH
- Touches R5 hotspot behaviour (socket→context→popup order flow). `updateOrder` is the single funnel for *all* order updates — a bad merge could mask/duplicate orders.
- No money/payment logic. Planning-skip **NOT** eligible.

## Affected Files + Lines (planned — Gate 3)
| File | Change | Note |
|---|---|---|
| `src/contexts/OrderContext.jsx` | `updateOrder` (L140-152): before replacing, read the existing order; if incoming `!updatedOrder.orderFrom && existing.orderFrom` → carry over `orderFrom` + `isWebOrder` (mirror BUG-082 rule at useOrderPollingReconciliation L174-177). Also carry `isWebOrder` when incoming `orderFrom` exists but equals non-web yet existing was web **only if** incoming lacks web origin (strict: preserve prior web-origin, never downgrade). | Single guarded merge; covers ALL socket paths + single-order fetch |

**Decision (owner-approved):** centralise in `updateOrder` (NOT per-handler). Rationale: one funnel, lowest regression surface, no logic duplication across 3 handlers + single-order transform.

## Owner Decisions — RESOLVED
- **OD-701-01 → Frontend guard + backend brief.** FE guard ships now; backend brief filed (`backend_briefs/BUG-701_ORDER_FROM_ROOM_WEB_BACKEND_BRIEF.md`) to also return `order_from="web"` for web-edited room orders (belt-and-suspenders).
- **OD-701-02 → Centralise in `OrderContext.updateOrder` merge** (owner accepted the architecture recommendation).

## Dependency / Secondary
- Secondary empty-poll eviction (order vanished at boot, `REMOVAL_MISS_THRESHOLD=1`) overlaps **BUG-686** — handled there, not here.

## Test Plan (Gate 3/5)
- Room order with unconfirmed web-edit line → cancel one new item → **popup stays open**, remaining new items still listed; after socket refresh + 60s poll, order still flagged `isWebOrder` in context.
- Table web order → cancel new item → unchanged (regression).
- POS (non-web) room/table order → `isWebOrder` never flips to true erroneously (no false popup).
- Paid/cancelled room order → still removed correctly (no resurrection via preserved origin).
- Unit: `OrderContext.updateOrder` preserves `orderFrom/isWebOrder` when incoming lacks web origin; does not upgrade non-web→web.

## Rollback
Single-file revert of `OrderContext.updateOrder` guard. No data migration.
