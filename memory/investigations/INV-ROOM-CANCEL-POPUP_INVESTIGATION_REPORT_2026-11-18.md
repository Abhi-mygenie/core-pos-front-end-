# INV-ROOM-CANCEL-POPUP — Investigation Report

**Date:** 2026-11-18
**Role:** INVESTIGATION (Role 6) — no code edits, gate-only
**Reporter account used:** pms@macha.com (restaurant 69, "macha") — token NOT stored (security rule)
**Symptom (owner-reported):** In the web **edit-confirm** popup (ScanOrderPopOut), cancelling a newly-added item:
- **Table (dine-in) order** → popup **stays open** (correct).
- **Room order** → popup **disappears entirely** (bug).

---

## 1. Summary

**Root cause (HIGH confidence):** The edit-confirm popup keeps an order visible only while
`hasUnconfirmedWebEditItems(order)` is true, and that helper is **gated first on `order.isWebOrder`**.
For **room orders the backend returns `order_from: null`**, so every time the order is re-transformed
from backend data (which happens on the cancel-item socket round-trip, on get-single-order, and on the
60 s reconciliation poll), `isWebOrder` is recomputed as **false** and the order silently drops out of
the popup queue → the popup unmounts. Table web orders return `order_from: "web"`, so they survive the
refresh and the popup stays.

- **Classification:** FE_BUG (frontend; a backend data-shape quirk is the trigger, but the FE can and should defend against it — it already does so in one code path but not the others)
- **Confidence:** HIGH
- **Steps used:** 8 / 10

**Decisive evidence (live preprod probe, restaurant 69):**
Running order `1578881`, room **a1**:
```
order_type=pos  order_in=RM  rtype=RM  order_from=null  f_order_status=5
order_details food_status sample = [5,5,3,3,3,7]   ← contains a food_status=7 (web-edit, unconfirmed) line
```
→ This IS a room web-edit order (has a food_status=7 appended line) **with `order_from=null`**.
`isWebOrder = normaliseOrderFrom(null) === 'web'` → **false**, so `hasUnconfirmedWebEditItems()` returns
false regardless of the food_status=7 line. Evidence file: `evidence/INV-ROOM-CANCEL-POPUP/running_orders.json`.

---

## 1a. REAL PROBE RESULTS (live preprod, no assumptions)

All three probes were run against the live backend with the owner account. A **real item-cancel mutation
was executed** on room order 1578881 (line 3969599) — the exact action the owner described.

**Probe 1 — exact socket re-fetch endpoint** `POST /api/v2/vendoremployee/get-single-order-new {order_id:1578881}`
(this is `fetchSingleOrderForSocket`, the function socket handlers call):
```
order_from = null   order_in = null   order_type = "pos"   f_order_status = 5
order_details: 5 lines with food_status = 7  (ids 3969599,3969624,3969625,3969626,3969627)
```
→ `isWebOrder = normaliseOrderFrom(null)==='web' = false`, even though 5 unconfirmed web-edit lines exist.
Evidence: `evidence/INV-ROOM-CANCEL-POPUP/single_order_1578881.json`.

**Probe 2 — RAW socket frame captured during the live cancel** (via `window.__SOCKET_SERVICE__.getSocket().onAny()`):
The cancel API returned `200 {"success":true,"message":"Cancel handled successfully"}`. The backend then
emitted, on channel `new_order_69`:
```
["update-order-status", 1578881, 69, 5, { orders: [ {
    id:1578881, order_type:"pos", order_from:"pos",      ← NOT "web"
    table_no:"a1", restaurantTable:{ rtype:"RM" },        ← room
    f_order_status:5, order_edit_count:12, scheduled:0
} ] }]
```
→ The re-transform of this frame gives `isWebOrder = normaliseOrderFrom("pos")==='web' = false`.
Evidence: `evidence/INV-ROOM-CANCEL-POPUP/raw_socket_frame_cancel.json`.

**Conclusion (proven, not inferred):** On the refresh that follows an item-cancel, the room order is
re-transformed from backend data where `order_from` is **`"pos"` (socket frame) or `null` (single-order)** —
**never `"web"`**. `isWebOrder` therefore flips to **false**, `hasUnconfirmedWebEditItems()` short-circuits,
the order leaves the `ScanOrderPopOut` queue, and the popup unmounts. The differentiator vs. table orders is
exactly the `order_from` value: table web orders carry `order_from="web"` (consistent with the owner's report
that the table popup "stays as is"), room orders do not.

**Probe 3 — post-cancel state** `get-single-order-new(1578881)` after the mutation:
```
order_from = null (still)   f_order_status = 5   remaining food_status=7 lines: 0
```
Secondary finding: cancelling **one** web-edit line cleared **all five** `food_status=7` lines on the room
order — i.e. a room item-cancel appears to flush/resolve the whole pending web-edit batch server-side. Worth a
separate look, but even a single remaining food_status=7 line would still be hidden by the isWebOrder=false
gate above. Evidence: `evidence/INV-ROOM-CANCEL-POPUP/single_order_postcancel.json`.

---

## 2. Hypotheses Tested

| # | Hypothesis | Test method | Result | Evidence |
|---|-----------|-------------|--------|----------|
| H1 | Popup closes because the order is **removed** from OrderContext on a terminal status (BUG-217: backend sends status 6 on cancel-item) | Code trace of socket remove paths | PARTIAL — possible but not room-specific; secondary | socketHandlers L310-346, L424-433, L495-517 |
| H2 | Popup closes because the re-transformed room order loses **`isWebOrder`** (order_from omitted for rooms) | Code trace + **live API probe** | **CONFIRMED** | ScanOrderPopOut L63-66; orderTransform L265-266; running_orders.json (order_from=null) |
| H3 | Scenario-only (room had 1 new item, table had many) | Logic review | ELIMINATED — H2 makes room orders fail independent of item count | hasUnconfirmedWebEditItems short-circuits on isWebOrder |

---

## 3. Data-Flow Trace

```
Customer edits web order for a ROOM
  → socket scan-new-order / update-order carries order_from='web'
  → handleScanNewOrder EXPLICITLY sets transformedOrder.isWebOrder = (orderFrom==='web')   [socketHandlers.js L574-576]
  → OrderContext.orders[] holds the room order with isWebOrder=TRUE
  → ScanOrderPopOut queue includes it (hasUnconfirmedWebEditItems=true) → POPUP SHOWS ✅

Owner clicks per-item cancel in popup
  → executeScanItemCancel → api.put(CANCEL_ITEM)                      [DashboardPage.jsx L1718-1734]
  → backend emits socket (update-food-status / update-order / update-order-status)
  → handler RE-TRANSFORMS the order from backend payload / GET single order:
        handleUpdateFoodStatus → fetchSingleOrderForSocket → orderFromAPI.order()   [socketHandlers.js L417-433]
        handleOrderDataEvent  → orderFromAPI.order(payload.orders[0])               [socketHandlers.js L270]
  → orderTransform.order(): isWebOrder = normaliseOrderFrom(api.order_from)==='web'  [orderTransform.js L265-266]
        For ROOM orders api.order_from = null  → isWebOrder = FALSE   ← BREAK POINT
  → OrderContext.updateOrder() REPLACES the stored order with isWebOrder=false       [OrderContext.jsx L148]
  → ScanOrderPopOut re-derives queue: hasUnconfirmedWebEditItems=false (gated on isWebOrder)  [ScanOrderPopOut.jsx L63-66, L180-188]
  → queue empties → `if (queue.length === 0) return null`  → POPUP DISAPPEARS ❌     [ScanOrderPopOut.jsx L268]

TABLE web order: api.order_from='web' is returned on refresh → isWebOrder stays TRUE → popup stays ✅
```

**The exact gate:**
```js
// ScanOrderPopOut.jsx L63-66
export const hasUnconfirmedWebEditItems = (order) =>
  Boolean(order) && order.isWebOrder && !order.scheduled &&          // ← isWebOrder gate kills room orders
  order.fOrderStatus !== 7 &&
  Array.isArray(order.items) && order.items.some(it => it?.isNotConfirmed && it?.status !== 'cancelled');
```

**Why one code path already defends but the others don't:**
`useOrderPollingReconciliation.js` L170-177 explicitly preserves web origin when the backend omits it:
```js
// BUG-082 (Wave 6): preserve scan-new-order web origin.
// The running-order-list API may omit `order_from` for YTC orders...
if (!s.orderFrom && l.orderFrom) { s.orderFrom = l.orderFrom; s.isWebOrder = l.isWebOrder; }
```
The **socket update handlers** (`handleUpdateFoodStatus`, `handleOrderDataEvent`, `handleUpdateOrderStatus`)
and the **get-single-order transform** have **no equivalent guard**, so the cancel-item refresh overwrites
`isWebOrder` with false for room orders.

---

## 4. Evidence Artifacts (saved; token/PII stripped)

`/app/memory/evidence/INV-ROOM-CANCEL-POPUP/`
- `running_orders.json` — live employee-orders-list probe: room order 1578881, `order_from=null`, has a food_status=7 line.
- `boot_socket_log.txt` — socket connect → subscribe `rest_69` → poll removes order 1578881.

**Secondary finding (socket/boot log):** the same room order 1578881 was dropped at login by the reconciliation
poll: `[OrderPolling] ok (mount-or-auth): +0/~0/-1 (server=0, local=1)` — i.e. `getRunningOrders` momentarily
returned **0** orders while a direct curl to the same endpoint returned 1. With `REMOVAL_MISS_THRESHOLD=1`
(BUG-079) a single empty poll immediately evicts the order. This is a **separate** bug from the popup issue but
is worth filing: it makes active room orders vanish from the board on a transient empty poll.

---

## 5. Recommendations

**Primary (FE fix) — classification FE_FIX, Risk: HIGH (sockets + order flow hotspots):**
Preserve the prior order's web origin whenever a re-transform yields a falsy `order_from`, mirroring the
guard already in `useOrderPollingReconciliation.js` L174-177. Candidate sites (to be scoped by Planning):
- `socketHandlers.js` → `handleUpdateFoodStatus`, `handleOrderDataEvent`, `handleUpdateOrderStatus`
  (carry over `isWebOrder`/`orderFrom` from `getOrderById(orderId)` when the fresh payload omits it), and/or
- centralise the preservation in the OrderContext `updateOrder` merge, and/or
- `fetchSingleOrderForSocket` / get-single-order transform.

**Planning-skip eligibility:** NOT eligible (touches socket hotspot files + core order-update path, >1 file,
>10 lines, HIGH risk). → **Full Planning gate (Gate 2-3) recommended.**

**Backend ask (optional, BACKEND_BRIEF candidate):** Have the running-orders / get-single-order APIs return
`order_from` for room (`order_in=RM`) orders so FE origin detection is consistent with table orders. Even if
backend fixes this, the FE guard above is still the robust fix.

**Secondary (separate filing):** Re-evaluate `REMOVAL_MISS_THRESHOLD=1` / the `server=0` transient-empty poll
that evicted active room order 1578881 at boot.

---

## 6. Retroactive Candidates
None.

---

## Gate note
No application code was changed (INVESTIGATION role, owner directive "don't edit code — stay in gate").
One **real data mutation** was performed with owner authorization: item-cancel on room order 1578881 line
3969599 (reason "Before serving") — used to capture the live socket frame. No testing_agent run — there is
no code fix to verify this session. Next step is owner decision → PLANNING.
