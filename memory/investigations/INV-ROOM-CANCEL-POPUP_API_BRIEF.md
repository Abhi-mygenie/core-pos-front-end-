# Room Edit-Confirm Popup Bug — API / Endpoint Brief & Missing Keys

**Bug:** In the web edit-confirm popup (`ScanOrderPopOut`), cancelling an item keeps the popup open for a
**table** order but makes it **disappear** for a **room** order.
**Verdict (proven with live probes):** The backend reports a room order's **`order_from`** as `"pos"` or
`null` — **never `"web"`** — so the frontend recomputes `isWebOrder = false` on the post-cancel refresh and
drops the order from the popup queue.

- Account used: `pms@macha.com` (restaurant_id **69**, "macha")
- Live order used: **1578881** (room **a1**, `rtype=RM`, `order_edit_count=12`, 5 × `food_status=7` web-edit lines)
- Base API: `https://preprod.mygenie.online`  · Socket: `https://presocket.mygenie.online`
- Auth header for all authenticated calls: `Authorization: Bearer <token>`

---

## 1. THE MISSING KEY (one-line answer)

| Key | Where it should appear | Table order (works) | Room order (broken) | Impact |
|-----|------------------------|---------------------|---------------------|--------|
| **`order_from`** | every order payload (REST + socket) | `"web"` | **`"pos"` or `null`** | `isWebOrder=false` → popup drops the order → **popup disappears** |
| `order_in` | `get-single-order-new` order object | `"RM"` / table | **`null`** (present as `"RM"` only in employee-orders-list) | secondary; room-type detection relies on `restaurantTable.rtype` fallback |

Frontend derivation (`src/api/transforms/orderTransform.js` L53-56, L265-266):
```js
const normaliseOrderFrom = (raw) =>
  typeof raw !== 'string' ? null : (raw.trim().toLowerCase() || null);
orderFrom:  normaliseOrderFrom(api.order_from),           // "pos" / null → not web
isWebOrder: normaliseOrderFrom(api.order_from) === 'web', // ROOM ⇒ false
```
Popup gate (`src/components/dashboard/ScanOrderPopOut.jsx` L63-66) is **first-gated on `isWebOrder`**:
```js
export const hasUnconfirmedWebEditItems = (order) =>
  Boolean(order) && order.isWebOrder && !order.scheduled &&
  order.fOrderStatus !== 7 &&
  order.items.some(it => it?.isNotConfirmed && it?.status !== 'cancelled');
```

---

## 2. Full Endpoint Inventory (with live results)

### 2.1 Auth — Login
```
POST /api/v1/auth/vendoremployee/common-login
Body: { "email": "pms@macha.com", "password": "********" }
```
- **200.** Returns `token` (120 chars), `firebase_token`, `crm_token`, `role_names`, `permissions`, `login_type`.
- Missing keys: none. ✅

### 2.2 Running Orders (dashboard board source)
```
GET /api/v1/vendoremployee/pos/employee-orders-list?role_name=Manager
```
- **200.** `{ "orders": [ ... ] }`
- Live room order 1578881 fields:
  | id | order_type | order_in | **order_from** | f_order_status | restaurantTable.rtype | table_no |
  |----|-----------|----------|------------|----------------|------------|----------|
  | 1578881 | `pos` | `RM` | **`null`** | 5 | `RM` | a1 |
- ❌ **Missing `order_from="web"`** for the web-edited room order.
- Also observed: a transient call returned `orders: []` (empty) while a direct call returned the order — see §4 secondary bug.

### 2.3 Single Order — socket re-fetch path
```
POST /api/v2/vendoremployee/get-single-order-new
Body: { "order_id": 1578881 }
```
- **200.** `{ "orders": [ { ... "order_details": [ ... ] } ] }`
- Used by `fetchSingleOrderForSocket()` → `orderFromAPI.order()` inside socket handlers.
- Live room order 1578881:
  | order_type | **order_from** | **order_in** | f_order_status | #details | food_status=7 lines |
  |-----------|------------|----------|----------------|----------|---------------------|
  | `pos` | **`null`** | **`null`** | 5 | 11 | 5 (ids 3969599, 3969624, 3969625, 3969626, 3969627) |
- ❌ **Missing `order_from="web"`** and ❌ **`order_in` is `null`** here (it is `"RM"` in employee-orders-list).

### 2.4 Cancel Item (the action under test)
```
PUT /api/v2/vendoremployee/order/cancel-food-item
Body: {
  "order_id": 1578881,
  "order_food_id": 248247,     // food_details.id (catalog id)
  "item_id": 3969599,          // order_details[].id (the line)
  "cancel_qty": 1,
  "order_status": "cancelled",
  "reason_type": 3,            // cancellation-reasons id
  "reason": "Before serving",
  "cancel_type": "Pre-Serve",  // or "Post-Serve"
  "printer_agent": [],
  "cancel_item_note": ""
}
```
- **200.** `{ "success": true, "message": "Cancel handled successfully", "data": { "order_amount": 600, "subtotal": 600, "tax": 0 } }`
- ⚠️ **Side effect:** cancelling ONE web-edit line cleared **all 5** `food_status=7` lines (post-call `get-single-order-new` showed `0` remaining). A room item-cancel appears to flush the whole pending web-edit batch server-side.

### 2.5 Cancellation Reasons
```
GET /api/v1/vendoremployee/cancellation-reasons?limit=100&offset=1
```
- **200.** 2 reasons: `id=2 "After serving"`, `id=3 "Before serving"`.
- Note: a GET **without** `limit/offset` params returned **403** (params are required).

### 2.6 Reports probed (for room-vs-table contrast — not usable)
```
GET /api/v2/vendoremployee/paid-order-list?search_date=YYYY-MM-DD    → 200 but slim projection (no order_from); POST returns 405
```
- Slim rows carry no `order_from`; not a reliable source for the contrast.

---

## 3. Socket Contract (presocket.mygenie.online)

On `connect` the client emits `join_restaurant {restaurant_id:69}` and subscribes to:
`new_order_69`, `update_table_69`, `order-engage_69`, `food_update_69`, `aggregator_order_69`.

### Raw frames captured during the live item-cancel (via `window.__SOCKET_SERVICE__.getSocket().onAny()`):
```
event "order-engage_69"  args: [1578881, "000004", 69, "engage"]

event "new_order_69"     args: [
  "update-order-status", 1578881, 69, 5,
  { "orders": [ {
      "id": 1578881, "order_type": "pos", "order_from": "pos",   ← NOT "web"
      "table_no": "a1", "restaurantTable": { "rtype": "RM" },     ← room
      "f_order_status": 5, "order_edit_count": 12, "scheduled": 0
  } ] }
]
```
- ❌ Socket frame also carries **`order_from="pos"`** for the room order. Any handler that re-transforms this
  (`handleOrderDataEvent` / `handleNewOrder` → `orderFromAPI.order()`) sets `isWebOrder=false`.
- Frame shape: `[eventType, order_id, restaurant_id, f_order_status, { orders:[...] }]`.

---

## 4. Secondary (separate) issue found
- At login the running-orders poll logged `[OrderPolling] ok (mount-or-auth): +0/~0/-1 (server=0, local=1)` —
  i.e. `employee-orders-list` momentarily returned **0** orders and, with `REMOVAL_MISS_THRESHOLD=1`
  (`src/hooks/useOrderPollingReconciliation.js` L36), the active room order 1578881 was evicted from the board
  after a single empty poll. File separately from the popup bug.

---

## 5. Fix direction (frontend — no backend change required, HIGH-risk hotspot)
Preserve the prior order's web origin whenever a re-transform yields a falsy/`"pos"` `order_from`, mirroring the
guard already present in `src/hooks/useOrderPollingReconciliation.js` L170-177
(`if (!s.orderFrom && l.orderFrom) { s.orderFrom = l.orderFrom; s.isWebOrder = l.isWebOrder; }`).
Missing equivalent guard in: `src/api/socket/socketHandlers.js` → `handleUpdateFoodStatus`,
`handleOrderDataEvent`, `handleUpdateOrderStatus` (and/or centralise in `OrderContext.updateOrder`).

**Optional backend ask:** return `order_from="web"` (and `order_in="RM"`) consistently for web-edited **room**
orders on `employee-orders-list`, `get-single-order-new`, and the `new_order_*` socket frames.

> No code changed. One authorized live mutation (cancel of line 3969599) was performed to capture the socket frame.
> Evidence: `/app/memory/evidence/INV-ROOM-CANCEL-POPUP/`
