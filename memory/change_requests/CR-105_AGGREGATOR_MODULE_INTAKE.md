# CR-105 — Aggregator Integration Module (UrbanPiper / Swiggy / Zomato)

**Document:** `change_requests/CR-105_AGGREGATOR_MODULE_INTAKE.md`
**Created:** 2026-07-25
**Role:** INTAKE (Gate 0→1)
**Status:** REGISTERED

---

## Classification

| Field | Value |
|---|---|
| **Type** | CR (Feature) |
| **Priority** | P1 — HIGH (core operational flow; restaurant loses revenue on missed aggregator orders) |
| **Risk** | HIGH (touches sockets, order flow, dashboard rendering, new API endpoints, financial data — R5 hotspot files: OrderCard, DashboardPage, orderTransform) |
| **Fast Lane eligible** | NO (multi-file, multi-layer, touches hotspot files) |
| **Duplicate check** | DISTINCT — no existing CR for aggregator live-order handling. Report-only `getAggregatorOrders()` exists (reportService.js:204) but no live order lifecycle. |
| **Code Reality** | PARTIAL — scaffolding exists (socket events, channel generator, source colors, report fetcher) but no live order handler, no service, no popup, no action buttons |
| **Blast radius** | LARGE (~15 files new/modified) |
| **Source** | OWNER-REPORTED |
| **Confidence** | CONFIRMED (APIs probed live, socket code from Flutter app shared by owner) |

---

## Summary

Integrate aggregator (Swiggy/Zomato via UrbanPiper) live order handling into the existing POS dashboard. Aggregator orders arrive via a dedicated socket channel (`aggregator_order_${restaurantId}`) and must be:
1. Displayed with a mandatory popup (blocking UI) when new (`f_order_status=0`)
2. Accepted with prep-time selection → API call
3. Managed through lifecycle: Accept → Ready → Dispatch (with rider info)
4. Rejectable with reason codes
5. Visually identified by source (Swiggy/Zomato badge) everywhere

The existing order UI and dashboard flow remains unchanged. Only aggregator-specific actions and cosmetic identification are added.

---

## Owner Decisions (Locked 2026-07-25)

| # | Decision | Owner Answer |
|---|---|---|
| OD-1 | Where do aggregator orders appear? | **Merged into same dashboard, under Delivery channel** |
| OD-2 | Popup trigger | **Both `f_order_status=0` AND `f_order_status=7` trigger mandatory popup for aggregator orders** |
| OD-3 | Dispatch rider info | **Yes — rider_name + rider_phone_number required in dispatch UI** |
| OD-4 | Prep time UX | **Pill presets (5, 10, 15, 20, 25, 30 min) + manual input field** |
| OD-5 | Sound/notification | **Yes — distinct ringer for aggregator orders, mapped to existing tone system** |

---

## API Contract (Probed 2026-07-25)

### Endpoints

| Action | Method | Path | Key Payload Fields |
|---|---|---|---|
| **List orders** | GET | `/api/v1/vendoremployee/urbanpiper/get-order-list` | Auth header only |
| **Accept** | POST | `/api/v1/urbanpiper/orders-status-update` | `{ order_id, urban_order_id, new_status: "Acknowledged", message: "Success", extra: { prep_time_mins: N } }` |
| **Ready** | POST | Same | `{ order_id, urban_order_id, new_status: "Food Ready", message: "Success" }` |
| **Dispatch** | POST | Same | `{ order_id, urban_order_id, new_status: "Dispatched", message: "...", extra: { rider_name, rider_phone_number } }` |
| **Reject** | POST | Same | `{ order_id, urban_order_id, new_status: "Cancelled", message: "...", reason_code: "ITEM_OUT_OF_STOCK" }` |

### Status Mapping

| Aggregator Label | `f_order_status` | FE Status Key | Dashboard |
|---|---|---|---|
| New/Pending | **0** | **NEW — needs mapping** | Popup (mandatory) |
| Acknowledged | 1 | `preparing` ✅ | Preparing column |
| Food Ready | 2 | `ready` ✅ | Ready column |
| Cancelled | 3 | `cancelled` ✅ | Cancelled column |
| Dispatched | 5 | `served` ✅ | Served column |
| Completed | 6 | `paid` ✅ | Paid column |

### Cancel Reasons (11)

```
ITEM_OUT_OF_STOCK, STORE_CLOSED, STORE_BUSY, RIDER_NOT_AVAILABLE,
OUT_OF_DELIVERY_RADIUS, CONNECTIVITY_ISSUE, TOTAL_MISSMATCH,
INVALID_ITEM, OPTION_OUT_OF_STOCK, INVALID_OPTION, UNSPECIFIED
```

### Response Structure (order list)

```json
{
  "orders": [
    {
      "rider_info": { "id", "name", "Phone", "Cahnel", ... },
      "brand_name": null,
      "order_details_order": {
        "id": 40458,                          // ← order_id for API calls
        "urban_order_id": "2698317",          // ← required for status update
        "f_order_status": 1,
        "order_plateform": "swiggy",          // ← source identification (NOTE: misspelled "plateform")
        "user_name": "SWIGGY",
        "order_type": "delivery",
        "order_amount": 126,
        "item_total": 120,
        "total_tax_amount": 6,
        "payment_method": "aggregator",
        "payment_status": "unpaid",
        "order_note": "...",
        "delivery_charge": 0,
        "created_at": "2026-07-13 14:13:29",
        "restaurant_order_id": "478/002327",
        "restaurant_id": 478,
        "prep_time_mins": null,
        "rider_name": null,
        "rider_phone_number": null,
        // ... 96 total fields
      },
      "customer_details": {
        "username": "u_919999999992_36714103",
        "name": "SWIGGY",
        "phone": "+919999999992",
        "address": { "city", "line_1", "line_2", "pin", "latitude", "longitude", ... }
      },
      "order_details_food": [
        {
          "food_id": 1310816,
          "pos_id": "I-3168",
          "unit_price": "120.00",
          "price": 120,
          "quantity": 1,
          "food_details": { "name", "id", "category", ... },
          "variation": null,
          "add_ons": [],
          "food_status": 2,
          "gst": 6,
          "tax_amount": 6,
          "food_level_notes": null
        }
      ]
    }
  ]
}
```

---

## Socket Architecture (from Flutter source + existing FE code)

### Channel

```
aggregator_order_${restaurantId}
```

Separate from `new_order_${restaurantId}`. Already scaffolded in `socketEvents.js:43` but **not subscribed** in `socket/index.js`.

### Events

| Event | Trigger | Payload Array |
|---|---|---|
| `aggrigator-order` | New aggregator order arrives | `[event_name, orderId, restaurantId, ?, payload?]` |
| `aggrigator-order-update` | Status change on existing order | `[event_name, orderId, restaurantId, status]` |

### Handler Logic (from Flutter)

```
- Verify data[2] matches current restaurantId
- If event == 'aggrigator-order': fetch order via API using data[1] (orderId)
- If event == 'aggrigator-order-update': fetch updated order + update state
```

---

## Existing Code Infrastructure (PARTIAL)

| Layer | File | Status |
|---|---|---|
| Socket channel generator | `socketEvents.js:43` | ✅ EXISTS — `getAggregatorChannel()` |
| Socket event constants | `socketEvents.js:105-109` | ✅ EXISTS — `AGGRIGATOR_ORDER`, `AGGRIGATOR_ORDER_UPDATE` |
| Event routing category | `socketEvents.js:148-151` | ✅ EXISTS — `EVENTS_REQUIRING_AGGREGATOR_API` |
| Channel import | `socket/index.js:22` | ✅ EXISTS — imported but not subscribed |
| Source badge rendering | `OrderCard.jsx:349-364` | ✅ EXISTS — S (Swiggy orange), Z (Zomato red) badges |
| Source colors | `constants/colors.js:25-29` | ✅ EXISTS — `SOURCE_COLORS.swiggy`, `.zomato` |
| Order transform `normaliseOrderFrom()` | `orderTransform.js:52-57` | ✅ EXISTS — passes `'aggregator'` verbatim |
| Report aggregator fetch | `reportService.js:204` | ✅ EXISTS — `getAggregatorOrders()` |
| Notification tone mapping | `NotificationContext.jsx:15` | ✅ EXISTS — `swiggy_new_order` |
| Web order popup (pattern) | `ScanOrderPopOut.jsx` | ✅ EXISTS — clone for aggregator |
| **Aggregator service** | — | ❌ MISSING |
| **Socket subscription** | — | ❌ MISSING |
| **Socket handler** | — | ❌ MISSING |
| **Aggregator popup** | — | ❌ MISSING |
| **Aggregator transform** | — | ❌ MISSING |
| **f_order_status=0 mapping** | — | ❌ MISSING |
| **Cancel reason picker** | — | ❌ MISSING |
| **Dispatch rider UI** | — | ❌ MISSING |
| **Prep time picker** | — | ❌ MISSING |

---

## Blast Radius

### Files WILL change (estimated)

| # | File | Change Type | Risk |
|---|---|---|---|
| 1 | `api/constants.js` | Add endpoints + f_order_status=0 mapping | LOW |
| 2 | `api/services/aggregatorService.js` | **NEW** — accept/reject/ready/dispatch/list | MEDIUM |
| 3 | `api/transforms/aggregatorTransform.js` | **NEW** — normalize nested structure → FE order model | MEDIUM |
| 4 | `api/socket/index.js` | Subscribe to aggregator channel | MEDIUM |
| 5 | `api/socket/socketHandlers.js` | Add aggregator event handlers | MEDIUM |
| 6 | `api/socket/socketEvents.js` | No change needed (already scaffolded) | ZERO |
| 7 | `components/dashboard/AggregatorOrderPopOut.jsx` | **NEW** — mandatory popup with prep-time picker | HIGH |
| 8 | `components/modals/AggregatorRejectModal.jsx` | **NEW** — cancel reason dropdown | LOW |
| 9 | `components/modals/AggregatorDispatchModal.jsx` | **NEW** — rider name + phone input | LOW |
| 10 | `components/cards/OrderCard.jsx` (R5 hotspot) | Add aggregator action buttons (Ready/Dispatch) | MEDIUM |
| 11 | `pages/DashboardPage.jsx` (R5 hotspot) | Wire AggregatorOrderPopOut + handlers | MEDIUM |
| 12 | `contexts/OrderContext.jsx` | Merge aggregator orders into orders[] | MEDIUM |
| 13 | `utils/orderOrigin.js` | Add aggregator origin bucket | LOW |
| 14 | `components/layout/PlatformDropdown.jsx` | Add Swiggy/Zomato filter options | LOW |
| 15 | `constants/colors.js` | May need updates if more aggregators added | LOW |

### Files WILL NOT touch

- `ScanOrderPopOut.jsx` (web popup stays untouched — separate component)
- `CollectPaymentPanel.jsx` (aggregator payment handled by aggregator, not POS)
- `orderTransform.js` (regular order transform unchanged; aggregator gets own transform)
- Report modules (existing `getAggregatorOrders()` stays as-is)
- Settlement/financial logic
- Auth/permissions

---

## Open Questions

| # | Question | Status |
|---|---|---|
| OQ-1 | Does the aggregator order list API support pagination or date filtering? | OPEN (current response returns 5 orders without params) |
| OQ-2 | When `aggrigator-order` socket fires, does the FE need to call `get-order-list` to get full details, or does the socket carry the full payload? | OPEN (Flutter code suggests API fetch on socket event) |
| OQ-3 | Should accepted aggregator orders show the "Print KOT" button? | OPEN |
| OQ-4 | What tone file should aggregator ringer map to? Is `swiggy_new_order` a separate audio file or reuse `new_order`? | OPEN — check `public/sounds/` |

---

## Evidence

- API probe response saved: `/app/memory/evidence/CR-105/aggregator_orders_probe.json`
- Login response: `/app/memory/evidence/CR-105/login_response.json`
- Flutter socket code: provided by owner (inline in chat)
- cURL commands: provided by owner (inline in chat)
- Test credentials: `owner@18march.com` / `Qplazm@10` (restaurant_id: 478)
