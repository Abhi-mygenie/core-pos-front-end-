# CR-106 — Implementation Plan (Gate 3)

**Document:** `plans/CR-106_IMPLEMENTATION_PLAN.md`
**Created:** 2026-07-25
**Role:** PLANNING (Gate 3)
**Impact Analysis ref:** `impact/CR-106_IMPACT_ANALYSIS.md` (FROZEN + 5 gaps incorporated)
**Status:** AWAITING GATE 4 GO

---

## Header Block (v0.7 mandatory)

| Field | Value |
|---|---|
| **Code Reality** | PARTIAL — socket scaffolding exists, live handler/service/popup/transform missing |
| **Entry Verification** | All target file line numbers verified against current `main` branch on pod 2026-07-25 |
| **Risk** | HIGH (R5 hotspots: DashboardPage, OrderCard) |
| **Scope Lock** | 11 files (5 NEW + 6 MODIFY). See §Files WILL change / WILL NOT touch. |

---

## Execution Sequence (4 Phases)

### Phase 1: Foundation (no UI, no side effects)

#### Edit 1 — `api/constants.js` — Add f_order_status=0 + aggregator endpoints

**Current (L277-288):**
```js
export const F_ORDER_STATUS = {
  1: 'preparing',
  2: 'ready',
  3: 'cancelled',
  // 4: reserved for future development
  5: 'served',
  6: 'paid',
  7: 'pending',
  8: 'running',
  9: 'pendingPayment',
  10: 'reserved',
};
```

**New (insert `0: 'aggregatorNew'` at L278):**
```js
export const F_ORDER_STATUS = {
  0: 'aggregatorNew',  // CR-106: incoming aggregator order (Swiggy/Zomato)
  1: 'preparing',
  2: 'ready',
  3: 'cancelled',
  // 4: reserved for future development
  5: 'served',
  6: 'paid',
  7: 'pending',
  8: 'running',
  9: 'pendingPayment',
  10: 'reserved',
};
```

**Append after L459 (end of file):**
```js
// CR-106: AGGREGATOR MODULE ENDPOINTS (UrbanPiper — Swiggy/Zomato)
export const AGGREGATOR_ENDPOINTS = {
  ORDER_LIST: '/api/v1/vendoremployee/urbanpiper/get-order-list',
  ORDER_STATUS_UPDATE: '/api/v1/urbanpiper/orders-status-update',
};

// CR-106: Cancel reason codes (identical for Swiggy & Zomato via UrbanPiper)
export const AGGREGATOR_CANCEL_REASONS = [
  { code: 'ITEM_OUT_OF_STOCK', label: 'Item Out of Stock' },
  { code: 'STORE_CLOSED', label: 'Store Closed' },
  { code: 'STORE_BUSY', label: 'Store Busy' },
  { code: 'RIDER_NOT_AVAILABLE', label: 'Rider Not Available' },
  { code: 'OUT_OF_DELIVERY_RADIUS', label: 'Out of Delivery Radius' },
  { code: 'CONNECTIVITY_ISSUE', label: 'Connectivity Issue' },
  { code: 'TOTAL_MISSMATCH', label: 'Total Mismatch' },
  { code: 'INVALID_ITEM', label: 'Invalid Item' },
  { code: 'OPTION_OUT_OF_STOCK', label: 'Option Out of Stock' },
  { code: 'INVALID_OPTION', label: 'Invalid Option' },
  { code: 'UNSPECIFIED', label: 'Other / Unspecified' },
];
```

---

#### Edit 2 — NEW FILE `api/services/aggregatorService.js`

```js
// CR-106: Aggregator order lifecycle API calls (UrbanPiper — Swiggy/Zomato)
import api from '../axios';
import { AGGREGATOR_ENDPOINTS } from '../constants';

export async function getAggregatorOrderList() {
  const res = await api.get(AGGREGATOR_ENDPOINTS.ORDER_LIST);
  return res.data;
}

export async function updateAggregatorOrderStatus({ order_id, urban_order_id, new_status, message, extra, reason_code }) {
  const payload = { order_id, urban_order_id, new_status, message: message || 'Success' };
  if (extra) payload.extra = extra;
  if (reason_code) payload.reason_code = reason_code;
  const res = await api.post(AGGREGATOR_ENDPOINTS.ORDER_STATUS_UPDATE, payload);
  return res.data;
}
```

~20 lines. Risk: LOW.

---

#### Edit 3 — NEW FILE `api/transforms/aggregatorTransform.js`

```js
// CR-106: Normalize nested aggregator API response → flat FE order model
// Incorporates GAP-1 (order note), GAP-2 (coupon/discount), GAP-3 (rider_info casing), GAP-5 (schedule_at)

export const fromAPI = {
  /**
   * Transform single aggregator order from API nested shape → flat FE model
   * Compatible with OrderContext.addOrder()
   */
  aggregatorOrder(raw) {
    const od = raw.order_details_order || {};
    const foods = raw.order_details_food || [];
    const cust = raw.customer_details || {};
    const rider = raw.rider_info || {};

    // GAP-1: order note — food_details.order_note takes precedence over order_details_order.order_note
    const orderNote = foods[0]?.food_details?.order_note || od.order_note || null;

    return {
      // Identity
      orderId: od.id,
      urbanOrderId: String(od.urban_order_id || ''),
      orderNumber: od.restaurant_order_id || '',
      restaurantId: od.restaurant_id,

      // Status
      fOrderStatus: od.f_order_status,

      // Source / Origin
      source: od.order_plateform || 'aggregator',   // NOTE: backend misspells "plateform"
      orderFrom: 'aggregator',
      isAggregator: true,
      isWebOrder: false,  // prevents ScanOrderPopOut from triggering

      // Type
      orderType: od.order_type || 'delivery',

      // Financials
      amount: Number(od.order_amount) || 0,
      itemTotal: Number(od.item_total) || 0,
      taxAmount: Number(od.total_tax_amount) || 0,
      deliveryCharge: Number(od.delivery_charge) || 0,
      // GAP-2: coupon/discount fields
      couponCode: od.coupon_code || null,
      couponDiscount: Number(od.coupon_discount_amount) || 0,
      discountBy: od.discount_on_product_by || null,

      // Payment
      paymentMethod: od.payment_method || 'aggregator',
      paymentType: od.payment_status || 'unpaid',

      // Timestamps
      createdAt: od.created_at || '',
      // GAP-5: scheduled aggregator orders
      scheduledAt: od.schedule_at || null,

      // Prep / Lifecycle
      prepTimeMins: od.prep_time_mins || null,
      deliveryOtp: od.otp ? String(od.otp) : null,

      // Customer
      customerName: cust.name || od.user_name || '',
      phone: cust.phone || '',
      deliveryAddress: cust.address || null,

      // Notes
      orderNote,

      // Rider — GAP-3: inconsistent key casing (Phone, Cahnel)
      riderName: od.rider_name || rider.name || null,
      riderPhone: od.rider_phone_number || rider.Phone || rider.phone || null,
      riderInfo: {
        id: rider.id || null,
        name: rider.name || null,
        phone: rider.Phone || rider.phone || null,
        channel: rider.Cahnel || rider.channel || null,
        returnOtp: rider.order_return_otp || null,
        bagReturnOtp: rider.bag_return_otp || null,
      },

      // Items
      items: foods.map(f => {
        const fd = f.food_details || {};
        return {
          id: f.id,
          foodId: f.food_id,
          posId: f.pos_id,
          name: fd.title || fd.name || '',  // C-1: use .title first
          categoryName: fd.category?.name || '',
          quantity: Number(f.quantity) || 1,
          unitPrice: Number(f.unit_price || f.price) || 0,
          price: Number(f.price) || 0,
          tax: Number(f.gst || f.tax_amount) || 0,
          notes: f.food_level_notes || null,
          addOns: f.add_ons || [],
          variation: f.variation || null,
          imageUrl: fd.image_url || null,
          foodStatus: f.food_status,
          // GAP-2: item-level discount
          discount: Number(f.discount_on_food || fd.discount) || 0,
          discountCode: f.discount_type || fd.discount_code || null,
          taxBreakdown: f.tax_breakdown || null,
          station: f.station || null,
        };
      }),

      // Derived fields for UI compatibility
      tableId: 0,
      tableName: '',
      waiterName: '',
    };
  },

  /**
   * Transform full API list response → array of flat orders
   */
  aggregatorOrderList(apiResponse) {
    const orders = apiResponse?.orders || [];
    return orders.map(raw => fromAPI.aggregatorOrder(raw));
  },
};
```

~115 lines. Risk: MEDIUM (must match OrderCard/TableCard expected shape).

---

#### Edit 4 — `api/socket/socketHandlers.js` — Add aggregator handlers

**Append after line 906 (end of file):**
```js
// =============================================================================
// CR-106: AGGREGATOR ORDER HANDLERS
// =============================================================================

/**
 * Handle new aggregator order from socket
 * Socket: aggregator_order_${rid} → 'aggrigator-order' → [event, orderId, rid, ?, payload?]
 * Owner confirmed: full payload comes via socket, no separate API fetch needed
 */
export const handleAggregatorNewOrder = (message, actions, aggregatorTransform) => {
  log('INFO', 'Aggregator new order event', message);
  const orderId = message[1];
  const payload = message[4] || message[3]; // payload position may vary

  if (payload && typeof payload === 'object' && payload.order_details_order) {
    // Full payload in socket — transform directly
    const order = aggregatorTransform.fromAPI.aggregatorOrder(payload);
    actions.addOrder(order);
    log('INFO', `Aggregator order added from socket payload: ${order.orderId}`);
  } else {
    // Fallback: fetch via API (shouldn't happen per owner, but defensive)
    log('WARN', `Aggregator socket missing payload for orderId=${orderId}, fetching via API`);
    import('../services/aggregatorService').then(({ getAggregatorOrderList }) => {
      getAggregatorOrderList().then(data => {
        const orders = aggregatorTransform.fromAPI.aggregatorOrderList(data);
        const found = orders.find(o => o.orderId === Number(orderId));
        if (found) actions.addOrder(found);
      }).catch(err => log('ERROR', 'Aggregator API fallback failed', err));
    });
  }
};

/**
 * Handle aggregator order status update from socket
 * Socket: aggregator_order_${rid} → 'aggrigator-order-update' → [event, orderId, rid, status]
 */
export const handleAggregatorOrderUpdate = (message, actions, aggregatorTransform) => {
  log('INFO', 'Aggregator order update event', message);
  const orderId = Number(message[1]);
  const payload = message[4] || message[3];

  if (payload && typeof payload === 'object' && payload.order_details_order) {
    const order = aggregatorTransform.fromAPI.aggregatorOrder(payload);
    actions.updateOrder(order.orderId, order);
    log('INFO', `Aggregator order updated from socket: ${order.orderId}, status=${order.fOrderStatus}`);
  } else {
    // Fallback: re-fetch order list and find this order
    log('WARN', `Aggregator update missing payload for orderId=${orderId}, fetching via API`);
    import('../services/aggregatorService').then(({ getAggregatorOrderList }) => {
      getAggregatorOrderList().then(data => {
        const orders = aggregatorTransform.fromAPI.aggregatorOrderList(data);
        const found = orders.find(o => o.orderId === orderId);
        if (found) actions.updateOrder(found.orderId, found);
      }).catch(err => log('ERROR', 'Aggregator update API fallback failed', err));
    });
  }
};
```

~60 lines. Risk: MEDIUM.

---

#### Edit 5 — `api/socket/useSocketEvents.js` — Subscribe to aggregator channel

**5a. Add import (L19-22, after `getFoodUpdateChannel`):**

Current L22:
```js
} from './socketEvents';
```
Change to:
```js
  getAggregatorChannel,
} from './socketEvents';
```

Also import `AGGREGATOR_EVENTS` — add to existing import block at L22:
```js
import {
  SOCKET_EVENTS,
  AGGREGATOR_EVENTS,
  getOrderChannel,
  getTableChannel,
  getOrderEngageChannel,
  getFoodUpdateChannel,
  getAggregatorChannel,
} from './socketEvents';
```

**5b. Add handler import (L24-34, after existing handler imports):**

After L34 (`} from './socketHandlers';`), add:
```js
import {
  handleAggregatorNewOrder,
  handleAggregatorOrderUpdate,
} from './socketHandlers';
import { fromAPI as aggregatorFromAPI } from '../transforms/aggregatorTransform'; // CR-106
```

**5c. Add aggregator channel callback (after L188, after handleFoodUpdateChannelEvent):**

```js
  // CR-106: Aggregator order channel handler (Swiggy/Zomato via UrbanPiper)
  const handleAggregatorChannelEvent = useCallback((...args) => {
    const eventName = args[0];
    console.log(`[useSocketEvents] Aggregator channel event: ${eventName}`, args);
    
    switch (eventName) {
      case AGGREGATOR_EVENTS.AGGRIGATOR_ORDER:
        handleAggregatorNewOrder(args, actionsRef.current, { fromAPI: aggregatorFromAPI });
        break;
      case AGGREGATOR_EVENTS.AGGRIGATOR_ORDER_UPDATE:
        handleAggregatorOrderUpdate(args, actionsRef.current, { fromAPI: aggregatorFromAPI });
        break;
      default:
        console.log(`[useSocketEvents] Unknown aggregator event: ${eventName}`);
    }
  }, []);
```

**5d. Add channel subscription (L219-226 block, after foodUpdateChannel):**

After L219 (`const foodUpdateChannel = getFoodUpdateChannel(restaurantId);`), add:
```js
    // CR-106: Subscribe to aggregator order channel (Swiggy/Zomato)
    const aggregatorChannel = getAggregatorChannel(restaurantId);
```

After L226 (`const unsubscribeFoodUpdate = subscribe(foodUpdateChannel, handleFoodUpdateChannelEvent);`), add:
```js
    const unsubscribeAggregator = subscribe(aggregatorChannel, handleAggregatorChannelEvent);
```

Add log block after L250:
```js
    if (unsubscribeAggregator) {
      console.log('[useSocketEvents] Subscribed to aggregator channel successfully');
    } else {
      console.warn('[useSocketEvents] Aggregator channel subscription failed');
    }
```

**5e. Add cleanup (L255-258):**

After L258 (`unsubscribeFoodUpdate && unsubscribeFoodUpdate();`), add:
```js
      unsubscribeAggregator && unsubscribeAggregator();
```

**5f. Add to dependency array (L260-268):**

Add `handleAggregatorChannelEvent` to the deps array at L267 (after `handleFoodUpdateChannelEvent`).

---

### Phase 2: UI Components (independent, no integration)

#### Edit 6 — NEW FILE `components/modals/AggregatorRejectModal.jsx`

Isolated modal with:
- Dropdown of 11 cancel reasons (from `AGGREGATOR_CANCEL_REASONS` constant)
- Optional message text field
- Cancel / Confirm buttons
- Props: `open`, `onClose`, `onConfirm(reasonCode, message)`
- Uses shadcn `Dialog`, `Select`, `Button`

~80 lines. Risk: LOW.

#### Edit 7 — NEW FILE `components/modals/AggregatorDispatchModal.jsx`

Isolated modal with:
- Rider name text input (required)
- Rider phone text input (required)
- Cancel / Dispatch buttons
- Props: `open`, `onClose`, `onConfirm(riderName, riderPhone)`
- Uses shadcn `Dialog`, `Input`, `Button`

~60 lines. Risk: LOW.

#### Edit 8 — NEW FILE `components/dashboard/AggregatorOrderPopOut.jsx`

Clone of `ScanOrderPopOut.jsx` (648 lines) structure, adapted for aggregator:

**Key differences from ScanOrderPopOut:**
- **Predicate:** `isAggregator === true && (fOrderStatus === 0 || fOrderStatus === 7)` (vs web: `isWebOrder && fOrderStatus === 7`)
- **Actions:** Reject + Accept ONLY (no View/Edit — OD-6, OD-10)
- **Prep time picker:** Pill presets (5/10/15/20/25/30) + manual input — must select before accept (OD-4)
- **Body displays:** Order number, OTP, source badge (S/Z), total breakdown (item total, coupon discount GAP-2, tax, order amount), customer (masked), address, order note (GAP-1 corrected source), scheduled time (GAP-5 if future), item list with category
- **Size:** Same as ScanOrderPopOut (OD-7) — desktop ≥50% viewport centered
- **Blocking:** App unusable until all aggregator popup orders actioned
- **Queue:** Sequential with "Order N of M" + Prev/Next

**Props:**
- `orders` — full order list
- `onAccept(order, prepTimeMins)` — caller handles API call
- `onReject(order)` — caller opens AggregatorRejectModal
- `currencySymbol`
- `suppressed` — hide when OrderEntry is open

~300 lines. Risk: HIGH (complex UI, must not interfere with ScanOrderPopOut).

---

### Phase 3: Integration (depends on Phase 1 + 2)

#### Edit 9 — `pages/DashboardPage.jsx` — Wire aggregator popup + handlers

**9a. Import (after L29):**
```js
import AggregatorOrderPopOut from "../components/dashboard/AggregatorOrderPopOut"; // CR-106
import AggregatorRejectModal from "../components/modals/AggregatorRejectModal";   // CR-106
import AggregatorDispatchModal from "../components/modals/AggregatorDispatchModal"; // CR-106
import { updateAggregatorOrderStatus } from "../api/services/aggregatorService";    // CR-106
```

**9b. State (inside DashboardPage component, near other modal states):**
```js
  // CR-106: Aggregator modal state
  const [aggregatorRejectOrder, setAggregatorRejectOrder] = useState(null);
  const [aggregatorDispatchOrder, setAggregatorDispatchOrder] = useState(null);
```

**9c. Handlers (inside DashboardPage, near handleConfirmOrder):**
```js
  // CR-106: Aggregator order handlers
  const handleAggregatorAccept = async (order, prepTimeMins) => {
    try {
      await updateAggregatorOrderStatus({
        order_id: order.orderId,
        urban_order_id: order.urbanOrderId,
        new_status: 'Acknowledged',
        message: 'Success',
        extra: { prep_time_mins: prepTimeMins },
      });
    } catch (err) {
      console.error('[Dashboard] Aggregator accept failed:', err);
    }
  };

  const handleAggregatorReject = async (reasonCode, message) => {
    if (!aggregatorRejectOrder) return;
    try {
      await updateAggregatorOrderStatus({
        order_id: aggregatorRejectOrder.orderId,
        urban_order_id: aggregatorRejectOrder.urbanOrderId,
        new_status: 'Cancelled',
        message: message || 'Order rejected',
        reason_code: reasonCode,
      });
    } catch (err) {
      console.error('[Dashboard] Aggregator reject failed:', err);
    } finally {
      setAggregatorRejectOrder(null);
    }
  };

  const handleAggregatorReady = async (order) => {
    try {
      await updateAggregatorOrderStatus({
        order_id: order.orderId,
        urban_order_id: order.urbanOrderId,
        new_status: 'Food Ready',
        message: 'Success',
      });
    } catch (err) {
      console.error('[Dashboard] Aggregator ready failed:', err);
    }
  };

  const handleAggregatorDispatch = async (riderName, riderPhone) => {
    if (!aggregatorDispatchOrder) return;
    try {
      await updateAggregatorOrderStatus({
        order_id: aggregatorDispatchOrder.orderId,
        urban_order_id: aggregatorDispatchOrder.urbanOrderId,
        new_status: 'Dispatched',
        message: 'Order dispatched',
        extra: { rider_name: riderName, rider_phone_number: riderPhone },
      });
    } catch (err) {
      console.error('[Dashboard] Aggregator dispatch failed:', err);
    } finally {
      setAggregatorDispatchOrder(null);
    }
  };
```

**9d. JSX mount (after L1625, after ScanOrderPopOut closing tag):**
```jsx
      {/* CR-106: Aggregator order popup (Swiggy/Zomato) */}
      <AggregatorOrderPopOut
        orders={orders}
        onAccept={handleAggregatorAccept}
        onReject={(order) => setAggregatorRejectOrder(order)}
        currencySymbol={currencySymbol}
        suppressed={Boolean(orderEntryType) || Boolean(cancelOrderEntry)}
      />
      <AggregatorRejectModal
        open={!!aggregatorRejectOrder}
        onClose={() => setAggregatorRejectOrder(null)}
        onConfirm={handleAggregatorReject}
      />
      <AggregatorDispatchModal
        open={!!aggregatorDispatchOrder}
        onClose={() => setAggregatorDispatchOrder(null)}
        onConfirm={handleAggregatorDispatch}
      />
```

---

#### Edit 10 — `components/cards/OrderCard.jsx` — Aggregator actions + read-only

**10a. Add `isAggregator` derivation (near L97-98, after `const source = ...`):**
```js
  const isAggregator = order.isAggregator === true; // CR-106
```

**10b. Block card click for aggregator (near handleTableClick usage):**
All card body onClick handlers must check `!isAggregator` before opening OrderEntry.

**10c. Add aggregator action buttons (in action button area, ~L994):**
For aggregator preparing orders (fOrderStatus=1): show "Ready" button → calls `onAggregatorReady(order)`.
For aggregator ready orders (fOrderStatus=2): show "Dispatch" button → calls `onAggregatorDispatch(order)`.
Hide POS-specific buttons (Cancel, Settle) for aggregator orders.

**10d. Props needed from DashboardPage:**
- `onAggregatorReady` — calls handleAggregatorReady
- `onAggregatorDispatch` — opens AggregatorDispatchModal

**10e. Rider timeline (GAP-4 aware):**
For aggregator orders, show compact rider status. Default "No Rider" when all rider fields null. Show name/phone when populated via socket update.

~40 lines of changes. Risk: MEDIUM (R5 hotspot, but all changes gated behind `isAggregator`).

---

#### Edit 11 — `components/cards/TableCard.jsx` — Aggregator grid view

Same pattern as OrderCard but compact:
- S/Z source badge (already works via existing `source` rendering if present)
- Aggregator action buttons (Ready/Dispatch) — compact icons
- Card click = no-op for aggregator
- Compact rider status pill (no full timeline)

~25 lines of changes. Risk: LOW.

---

### Phase 4: Polish (optional, can defer)

Not scoped for Gate 4. Candidates for follow-up:
- `PlatformDropdown.jsx` — Swiggy/Zomato filter options
- Aggregator order fetch on initial boot (get-order-list on login to populate existing orders)

---

## Files WILL change

| # | File | Type | Lines Added | Risk |
|---|---|---|---|---|
| 1 | `api/constants.js` | MODIFY | +25 | LOW |
| 2 | `api/services/aggregatorService.js` | **NEW** | ~20 | LOW |
| 3 | `api/transforms/aggregatorTransform.js` | **NEW** | ~115 | MEDIUM |
| 4 | `api/socket/socketHandlers.js` | MODIFY (append) | +60 | MEDIUM |
| 5 | `api/socket/useSocketEvents.js` | MODIFY | +35 | LOW |
| 6 | `components/dashboard/AggregatorOrderPopOut.jsx` | **NEW** | ~300 | HIGH |
| 7 | `components/modals/AggregatorRejectModal.jsx` | **NEW** | ~80 | LOW |
| 8 | `components/modals/AggregatorDispatchModal.jsx` | **NEW** | ~60 | LOW |
| 9 | `pages/DashboardPage.jsx` | MODIFY | +75 | MEDIUM |
| 10 | `components/cards/OrderCard.jsx` | MODIFY | +40 | MEDIUM |
| 11 | `components/cards/TableCard.jsx` | MODIFY | +25 | LOW |

**Total: ~835 new/changed lines across 11 files (5 new + 6 modified).**

## Files WILL NOT touch

- `ScanOrderPopOut.jsx` — web popup stays untouched
- `CollectPaymentPanel.jsx` — aggregator payment handled externally
- `orderTransform.js` — regular orders unchanged; aggregator gets own transform
- `socketEvents.js` — already has all needed scaffolding (channel generator, event constants, routing categories)
- Report modules — `getAggregatorOrders()` stays as-is
- Settlement / financial logic
- Auth / permissions
- NotificationContext — sound handled server-side (FCM)

---

## Verification Matrix

| # | File | Change | How to Verify | Automated? |
|---|---|---|---|---|
| V1 | constants.js | `F_ORDER_STATUS[0]` = 'aggregatorNew' | `console.log(F_ORDER_STATUS[0])` | YES |
| V2 | constants.js | `AGGREGATOR_ENDPOINTS` + `AGGREGATOR_CANCEL_REASONS` | Import check | YES |
| V3 | aggregatorTransform.js | Nested → flat, `food_details.title`, GAP-1 note, GAP-2 coupon, GAP-3 rider | Input real JSON → validate all output fields | YES |
| V4 | aggregatorService.js | API accept call | curl: accept order → verify API response | NO |
| V5 | aggregatorService.js | API reject call | curl: reject order with reason → verify | NO |
| V6 | useSocketEvents.js | Aggregator channel subscription | Console log confirms subscription on login | NO |
| V7 | socketHandlers.js | Aggregator new order handler | Mock socket → verify addOrder called | YES |
| V8 | socketHandlers.js | Aggregator update handler | Mock socket → verify updateOrder called | YES |
| V9 | AggregatorOrderPopOut.jsx | Popup for f_order_status=0/7 | Browser: login → aggregator order arrives → popup blocks UI | NO |
| V10 | AggregatorOrderPopOut.jsx | Prep time pills + accept | Select pill → accept → Network tab: payload has prep_time_mins | NO |
| V11 | AggregatorRejectModal.jsx | Cancel reason picker | Reject → pick reason → Network tab: payload has reason_code | NO |
| V12 | AggregatorDispatchModal.jsx | Rider info | Dispatch → enter rider → Network tab: payload has rider fields | NO |
| V13 | DashboardPage.jsx | Popup wired + no conflict with ScanOrderPopOut | Web orders still use web popup; aggregator uses aggregator popup | NO |
| V14 | OrderCard.jsx | Ready/Dispatch buttons for aggregator | Accepted aggregator order shows Ready button | NO |
| V15 | OrderCard.jsx | Source badge S/Z | Swiggy order shows orange S badge | NO (existing — verify still works) |
| V16 | OrderCard.jsx | Card click no-op for aggregator | Click card body → nothing opens | NO |
| V17 | TableCard.jsx | S/Z badge + action buttons | Swiggy grid card shows S badge + Ready/Dispatch | NO |
| V18 | TableCard.jsx | Card click no-op for aggregator | Click card → nothing opens | NO |

---

## Post-Code Registry Checklist

The IMPLEMENTATION agent MUST execute after coding:

- [ ] `registry.json`: CR-106 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] `CR_REGISTRY.md`: CR-106 row updated to IMPLEMENTED
- [ ] `FILE_OWNERSHIP.md`: add all 11 files with CR-106 + date
- [ ] Code markers: `// CR-106` comment in every modified file
- [ ] Compile check: webpack 0 new warnings

---

## Handover

```
Plan ready at plans/CR-106_IMPLEMENTATION_PLAN.md. 11 edits across 11 files (5 new + 6 modified).
Code reality: PARTIAL (scaffolding exists, 5 new files + 6 modifications needed).
Scope: 11 files WILL change / ScanOrderPopOut, CollectPaymentPanel, orderTransform.js, settlement, auth WILL NOT touch.
Verification matrix: 18 checks (4 automated, 14 manual/browser).
Owner decisions needed: NONE (all 14 locked in Gate 2).
Awaiting Gate 4 GO.
```
