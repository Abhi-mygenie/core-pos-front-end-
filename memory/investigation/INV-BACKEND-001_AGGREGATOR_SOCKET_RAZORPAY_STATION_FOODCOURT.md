# INVESTIGATION REPORT — Aggregator Socket + Razorpay Refund + Station Config + Food Court

**ID:** INV-BACKEND-001
**Date:** 2026-08-17
**Role:** INVESTIGATION
**Status:** COMPLETE — root cause + gaps confirmed for all 5 items
**No code written this session.**

---

## Scope (5 items from backend update)

1. Aggregator socket — backend switched from API to socket; test with frontend
2. Razorpay cancel-and-refund API — new endpoint, needs frontend integration
3. `station_gst` + `auto_serve` added to printer-config endpoint
4. `restaurant_for = food_court` needed for station_gst display
5. `/api/v1/vendoremployee/food-court-order-report` — dedicated food court endpoint

---

## Item 1 — Aggregator Socket (Frontend Status + Test Gaps)

### Current Frontend State

**Socket infrastructure IS fully implemented:**
```
useSocketEvents.js:
  → subscribes to: aggregator_order_${restaurantId}   ← getAggregatorChannel()
  → listens for:   AGGRIGATOR_ORDER + AGGRIGATOR_ORDER_UPDATE

socketHandlers.js:
  handleAggregatorNewOrder()     ← adds new aggregator order to OrderContext
  handleAggregatorOrderUpdate()  ← updates / removes on terminal status (3=cancelled, 6=paid)

Both handlers:
  → Primary: use socket payload directly (message[4] || message[3])
  → Fallback: fetch via aggregatorService API (defensive, shouldn't normally fire)
```

**Transform expects this shape:**
```js
aggregatorTransform.aggregatorOrder(raw):
  raw.order_details_order   ← main order fields (id, f_order_status, amounts...)
  raw.order_details_food    ← food items array
  raw.customer_details      ← customer info
  raw.rider_info            ← rider info
  raw.brand_name            ← brand name (top-level)
```

### Gaps Requiring Testing

**Gap 1 — Socket payload position:**
```js
// socketHandlers.js:
const payload = message[4] || message[3];  // ← payload at slot 4 or 3?
// socketEvents.js MSG_INDEX.PAYLOAD = 4
// If backend puts payload at different slot → falls back to API silently
```
Must confirm: Does backend `aggrigator-order` emit payload at `message[4]`?

**Gap 2 — Payload shape match:**
```js
if (payload && typeof payload === 'object' && payload.order_details_order) {
  // ← checks for order_details_order key
}
// If backend emits different top-level key → all orders fall to API fallback
```
Must confirm: Does backend socket payload contain `order_details_order` at the top level?

**Gap 3 — Auto-reject notification on unconfirmed order:**
```js
// If order was fos=0/7 (unconfirmed) and becomes fos=3 (cancelled):
→ toast({ "Aggregator order auto-rejected", variant: "destructive" })
// Test: does this fire correctly when backend sends fos=3 via socket?
```

**Verdict: Frontend is ready. Testing is the blocker — no code changes expected unless payload shape differs.**

---

## Item 2 — Razorpay Cancel and Refund API

### Endpoint Provided
```
POST https://manage.mygenie.online/api/v1/razor-pay/cancel-and-refund-order
Body: {
  order_id: 983282,
  restaurant_id: 699,
  cancellation_reason: "Customer cancelled",
  cancellation_note: "Refund through Razorpay"
}
```

**Note: Base URL is `manage.mygenie.online` not `preprod.mygenie.online`** — different subdomain. Confirm if this goes through the same `api` axios instance or needs a separate one.

### Current Frontend State

```bash
# api/constants.js:
  PAYMENT_LINK: '/api/v1/razor-pay/payment-link'   ← exists (CR-017)
  cancel-and-refund-order: ABSENT ❌

# Any cancel+refund service: NONE
# Any "Refund" button in cancellation flow: NONE
```

**Code reality: NONE** — no endpoint constant, no service, no UI trigger.

### Where This Should Be Triggered

Existing cancellation flow:
```
OrderEntry.jsx → handleCancelOrder()
  → DELETE/POST cancel-order API → order removed
  → No Razorpay refund triggered ← GAP
```

When an order was paid via Razorpay PG (`paymentMethod === 'razorpay'` dynamic type), cancelling it should auto-trigger the refund endpoint.

### Key Open Questions

1. Is this triggered **automatically** when a Razorpay-paid order is cancelled? Or is it a **manual "Refund" button** shown after cancellation?
2. The endpoint is at `manage.mygenie.online` — does this require a different axios baseURL or same instance?
3. What is the `restaurant_id` source? (Profile `restaurant.id`?)
4. Are `cancellation_reason` and `cancellation_note` passed from the cancellation modal, or are they hardcoded?

**Code reality: NONE — new service + integration + conditional trigger needed**

---

## Item 3 — station_gst + auto_serve in Printer Config

### Backend Confirmation

Backend has confirmed `/api/v2/vendoremployee/restaurant-settings/printer-config` (ADD and UPDATE) now accepts:
- `station_gst`: string (GST number for the station)
- `auto_serve`: `"Yes"` / `"No"` (auto-serve toggle)

The existing `default` field maps: `null` = None, `1` = Ready, `2` = Serve, `5` = Delivered (confirmed from curl)

### Frontend State

**CR-161 (Station Management Screen) has NOT been implemented yet** — this is the planned screen for managing stations via this endpoint.

**The intake for CR-161 already included these fields** — the implementation plan (Gate 3) can now be written with full confidence since backend has confirmed both fields.

**No gap in frontend code** — these fields need to be in the CR-161 implementation.
**Code reality: NONE (CR-161 not started) — but fields are CONFIRMED for implementation**

---

## Item 4 — restaurant_for = food_court (Missing Option)

### Current State

```js
// RestaurantSettingsPage.jsx line 376:
<SelectInput
  label="Restaurant Type"
  value={s1.restaurantFor}
  options={[
    { value: 'Normal', label: 'Normal' },
    { value: 'Hotel', label: 'Hotel' }
    // ← 'food_court' MISSING ❌
  ]}
/>

// restaurantSettingsTransform.js line 38:
restaurantFor: basic.restaurant_for || 'Normal'  ← reads/writes correctly, just UI missing option
```

### What food_court Enables

When `restaurant_for === 'food_court'`:
- `station_gst` field should be **visible and editable** in the station management screen (CR-161)
- Food court stations each have their own GST number (unlike Normal/Hotel restaurants)
- The food court report page (`FoodCourtMockup.jsx`) should be accessible

### Files Needing Change

| File | Change |
|------|--------|
| `RestaurantSettingsPage.jsx` line 376 | Add `{ value: 'food_court', label: 'Food Court' }` to options |
| `restaurantSettingsTransform.js` | Already handles any string value — no change needed |
| CR-161 `StationsTab.jsx` (not built yet) | Show `station_gst` field only when `restaurantFor === 'food_court'` |

**Code reality: PARTIAL** — transform works; UI options array missing `food_court`

**Blast radius: SMALL** — 1 line in RestaurantSettingsPage, conditional in CR-161

---

## Item 5 — Food Court Order Report: Dedicated Endpoint

### Endpoint Provided
```
GET /api/v1/vendoremployee/food-court-order-report
```

### Current State

```js
// foodCourtService.js — currently uses ORDER_LOGS_REPORT:
const resp = await api.post(API_ENDPOINTS.ORDER_LOGS_REPORT, { ... })
// → expensive month-by-month chunked batching workaround
// → generic order log transform, not food-court-specific

// FoodCourtMockup.jsx — mockup UI exists ✅
// api/constants.js — FOOD_COURT_ORDER_REPORT: ABSENT ❌
```

**Code reality: PARTIAL** — UI mockup and service file exist; dedicated endpoint not wired; service uses old workaround endpoint.

### Gap

The new `food-court-order-report` endpoint is purpose-built for food courts — it should:
- Return food court-specific data (by station/counter)
- Be faster than the chunked `order-logs-report` workaround
- Be the canonical endpoint for CR-157 (Food Court Report)

### Changes Needed

| File | Change |
|------|--------|
| `api/constants.js` | Add `FOOD_COURT_ORDER_REPORT: '/api/v1/vendoremployee/food-court-order-report'` |
| `api/services/foodCourtService.js` | Replace `ORDER_LOGS_REPORT` batch with single call to `FOOD_COURT_ORDER_REPORT` |
| Transform | May need new transform based on the actual response shape |

**Owner must provide:** Response shape of `/api/v1/vendoremployee/food-court-order-report` before transform can be written.

---

## Summary Table

| # | Item | Frontend Status | Gap | Action |
|---|------|----------------|-----|--------|
| 1 | Aggregator Socket | IMPLEMENTED | Payload shape + slot need live testing | Test with preprod socket |
| 2 | Razorpay Cancel+Refund | NONE | No endpoint, service, or UI | Register BUG/CR, get owner answers |
| 3 | station_gst + auto_serve | NONE (CR-161 pending) | Fields confirmed by backend — include in CR-161 plan | CR-161 Gate 3 can now proceed |
| 4 | restaurant_for food_court | PARTIAL (1 missing option) | `food_court` option absent from select | Register BUG-339, Fast Lane eligible |
| 5 | Food court endpoint | PARTIAL (mockup + old service) | `FOOD_COURT_ORDER_REPORT` not in constants; service uses workaround | Register CR-157 update / BUG-340 |

---

## Open Questions

| # | Question | Item |
|---|----------|------|
| OQ-1 | Razorpay refund: triggered automatically on cancellation or via manual "Refund" button? | 2 |
| OQ-2 | `manage.mygenie.online` — same axios instance or different baseURL? | 2 |
| OQ-3 | Does `cancellation_reason` / `cancellation_note` come from the cancellation modal? | 2 |
| OQ-4 | What is the full response shape of `/food-court-order-report`? (Needed for transform) | 5 |
| OQ-5 | For aggregator socket test: What exact JSON shape does backend emit at `aggrigator-order`? | 1 |

---

*Investigation complete. No code written.*
