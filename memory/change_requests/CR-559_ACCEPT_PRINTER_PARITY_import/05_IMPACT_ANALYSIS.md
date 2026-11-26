# CR-554 — Impact Analysis (Gate 2)

**Date:** 2026-11-19 · **Agent:** E1 · **Risk:** CRITICAL (printing / order flow)
**Code Reality:** FULL — code already shipped & live-verified (retroactive backfill; see intake Process Note).
**Conflict Pre-Check:** No open (non-CLOSED) registry item currently owns these three files for an
overlapping change. FILE_OWNERSHIP: DashboardPage.jsx / orderService.js / OrderContext.jsx are
high-traffic hotspots — last touched by CR-525 (TableCard/OrderCard/DashboardPage) which is QA-PASS/closed-path.
Change here is confined to `handleConfirmOrder`, `confirmOrder`, and one additive projection field → parallel-safe.

## 1. Data Flow (traced)
**Accept (web/scan):**
`ScanOrderPopOut.handleAcceptClick(activeOrder)` → `buildTableEntryFromOrder(order)` → `onAccept(entry)`
→ `DashboardPage.handleConfirmOrder(tableEntry)` → `getOrderDataForEntry(tableEntry)` →
resolves order from `OrderContext.orderItemsByTableId[tableId]` → `orderService.confirmOrder(orderId, role, status, printerAgent)`
→ `toAPI.updateOrderStatus(...)` + `printer_agent` → PUT `CONFIRM_ORDER`
(`/api/v2/vendoremployee/order/waiter-dinein-order-status-update`).

**Reference (Place Order):** `orderTransform.js:1099-1102,1165` — `selectAgentsForKot(printerAgents, cartStationsToSet(items))` + `selectAgentsForBill(printerAgents)`.

## 2. Root Causes
- **RC-1 (parity gap):** the confirm/accept path used a status-only payload (`updateOrderStatus`) that never built or sent `printer_agent`. `printerAgents` (from `useRestaurant()`) was never passed into the confirm handler.
- **RC-2 (the "still not sending" report):** `OrderContext.orderItemsByTableId` is a **whitelisted projection** that carried `order.items` but **omitted `isWebOrder`**. When `handleConfirmOrder` re-resolved the t2 table order from this projection, `order.isWebOrder` was `undefined`, so the new web-only gate skipped building `printer_agent`. The pop-up itself reads the un-projected `orders` source (which has `isWebOrder`), which is why it displayed while Accept sent nothing.

## 3. Affected Files / Lines
| File | Location | Change |
|---|---|---|
| `frontend/src/pages/DashboardPage.jsx` | import ~40-41; `handleConfirmOrder` ~1367-1398 | Build `printer_agent` (web orders only), pass to `confirmOrder`; add `printerAgents` to deps |
| `frontend/src/api/services/orderService.js` | `confirmOrder` ~70-82 | Accept `printerAgent` param; add `printer_agent` to payload ONLY when non-empty |
| `frontend/src/contexts/OrderContext.jsx` | `orderItemsByTableId` ~347-351 | Carry `isWebOrder` through the table projection (additive) |

## 4. Downstream Consumers / Regression Surface
- `handleConfirmOrder` also serves **non-web POS status-7 OrderCard confirms** → gated by `order.isWebOrder`; non-web keeps original status-only body (printer_agent added only when non-empty). ✅ no regression.
- Shared `toAPI.updateOrderStatus` is also used by `updateOrderStatus` (ready/serve) & cancel → **left untouched**; `printer_agent` is added in the `confirmOrder` service only. ✅ no regression.
- `orderItemsByTableId` consumed by OrderEntry/CartPanel → extra `isWebOrder` field is additive, no existing reader breaks. ✅
- Station resolution uses each order line's `.station` via `cartStationsToSet` (backend-specified), robust even when an item is absent from the live menu (unlike the menu-lookup `getStationsFromOrderItems`).

## 5. Risk Register
| Risk | Likelihood | Mitigation |
|---|---|---|
| Printer routing fires on non-web confirms | Med | `order.isWebOrder` gate + empty-array omission |
| Double KOT print | Low | Option A only — no `printOrder` call after accept |
| Wrong station on web edit | Med | web edit → only `isNotConfirmed` (food_status 7) items |
| Projection field leak breaks consumers | Low | additive field, default `false` |

## 6. Owner Decisions
All LOCKED by backend reply (OD-1/2/3 — see intake §7). No open decisions.
