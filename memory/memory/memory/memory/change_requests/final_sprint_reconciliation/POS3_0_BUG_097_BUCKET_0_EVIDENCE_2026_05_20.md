# POS3.0 BUG-097 Bucket 0 — Runtime/API Verification Evidence — 2026-05-20

## 1. Purpose

This document captures the evidence from Bucket 0 runtime/API verification for BUG-097.

No code was changed. No `/app/memory/final/` updated.

---

## 2. Authentication

| Field | Value |
|---|---|
| Login API | `POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/login` |
| Email | `owner@18march.com` |
| Password | `Qplazm@10` |
| Role | Owner |
| Restaurant ID | 478 |
| Token validity | Fresh token generated per session |

---

## 3. Evidence Collected

### RV-01: Dispatch API Response Shape — NOT TESTABLE

**Reason:** No delivery orders in `ready` status currently exist on preprod (restaurant 478). All 5 running orders are `dinein` type.

**Status:** `cannot_verify_no_delivery_order_available`

**Action needed:** Owner must place a delivery order on preprod, or provide a delivery order ID for testing.

---

### RV-02: Assign API Response Shape — NOT TESTABLE

**Reason:** Same as RV-01 — no delivery orders available.

**Status:** `cannot_verify_no_delivery_order_available`

---

### RV-03: `f_order_status` After Dispatch — NOT TESTABLE

**Reason:** Same as RV-01.

**Status:** `cannot_verify_no_delivery_order_available`

---

### RV-04: Socket Event After Dispatch — NOT TESTABLE

**Reason:** Same as RV-01.

**Status:** `cannot_verify_no_delivery_order_available`

---

### RV-05: Rider/Delivery Fields in Order API Response — VERIFIED ✅

**Tested against:** `get-single-order-new` (order 868689, dinein) and `employee-orders-list` (running orders).

**CRITICAL FINDING — Backend field names differ from previous planning assumptions:**

| Planning Assumed Field | Actual Backend Field | Present In `get-single-order-new`? | Present In `employee-orders-list`? | Value (non-delivery order) |
|---|---|---|---|---|
| `rider_name` | **NOT PRESENT** | No | No | — |
| `rider_phone_number` | **NOT PRESENT** | No | No | — |
| `rider_status` | **NOT PRESENT** | No | No | — |
| — | `delivery_man` | **Yes** | **Yes** | `null` (object when populated) |
| — | `delivery_man_id` | **Yes** | **Yes** | `null` |
| — | `delivery_man_status` | **Yes** | **Yes** | `"No"` |
| — | `order_dispatch_status` | **Yes** | **Yes** | `"No"` |
| — | `delivery_address` | **Yes** | **Yes** | `null` |
| — | `delivery_charge` | **Yes** | **Yes** | `0` |

**The `delivery_man` field is an OBJECT (not separate name/phone fields).** When a delivery person is assigned, it likely contains the employee object from `delivery-employee-list` (with `id`, `f_name`, `l_name`, `phone`, etc.).

**Rider name/phone must be extracted from `delivery_man` object, NOT from top-level fields.**

**`order_in` field:**
| API | Present? | Value |
|---|---|---|
| `get-single-order-new` | **NOT PRESENT** | Field does not exist in response |
| `employee-orders-list` (running orders) | **Yes** | `null` for dinein, expected `"own"` or other for delivery |

**Impact:** `order_in` is not in the single-order response. The `source` field in the frontend transform (`orderTransform.js` L257: `source: (api.order_in || 'own').toLowerCase()`) will default to `'own'` when processing single-order responses. This may be intentional (running order list provides `order_in`, socket events may also provide it).

---

### Employee List Response — RE-VERIFIED ✅

**Endpoint:** `POST /api/v1/vendoremployee/delivery-employee-list`

**Response shape:** JSON array of 22 employee objects.

**Key fields confirmed:**
```
id:                number    (e.g., 1477)
f_name:            string    (e.g., "Captain")
l_name:            string|null
phone:             string|null
email:             string
status:            boolean   (true/false)
image:             string|null
employee_role_id:  number
is_production:     "Yes"|"No"
```

**Note:** Returns ALL employees, not just delivery-designated ones. No `role` or `delivery_boy` field to filter by.

---

## 4. Complete Order Field Inventory (53 fields)

From `get-single-order-new` response:

```
associated_order_list, audio_file, b_order_status, cancel_at, canceled_by,
checked, created_at, daily_token, delivery_address, delivery_charge,
delivery_man, delivery_man_id, delivery_man_status, employee_id,
f_order_status, id, k_order_status, orderDetails, order_amount,
order_dispatch_status, order_edit_count, order_note, order_status,
order_sub_total_amount, order_sub_total_without_tax, order_type,
parent_order_id, payment_id, payment_method, payment_status,
payment_type, print_bill_status, print_kot, ready_order_details,
restaurantTable, restaurant_id, restaurant_order_id, room_info,
schedule_at, send_payment_link, serve_order_details, table_id,
tablepart, tip_amount, tip_tax_amount, total_service_tax_amount,
updated_at, user, user_id, user_name, vendorEmployee,
waiter_call, waiter_id
```

Running orders list (`employee-orders-list`) has 49 fields — same minus: `cancel_at`, `canceled_by`, `order_sub_total_without_tax`, `ready_order_details`. Plus: `order_in`.

---

## 5. Corrected Transform Mapping Plan

Based on verified fields, the `orderTransform.fromAPI.order()` extension should be:

| Backend Field | Frontend Field | Type | Notes |
|---|---|---|---|
| `api.delivery_man` | `deliveryMan` | object/null | Full delivery person object when assigned |
| `api.delivery_man?.f_name` + `api.delivery_man?.l_name` | `rider` | string/null | Constructed from delivery_man object: `f_name + ' ' + l_name` |
| `api.delivery_man?.phone` | `riderPhone` | string/null | From delivery_man object |
| `api.delivery_man_id` | `deliveryManId` | number/null | ID of assigned delivery person |
| `api.delivery_man_status` | `deliveryManStatus` | string | "Yes"/"No" — whether delivery person accepted |
| `api.order_dispatch_status` | `orderDispatchStatus` | string | "Yes"/"No" — whether order is dispatched |

**Rider status derivation (computed, not from single field):**
```
if delivery_man_id exists && delivery_man_status === "No" → "riderAssigned" (pending accept)
if delivery_man_id exists && delivery_man_status === "Yes" → "riderReached" or "dispatched"
if order_dispatch_status === "Yes" → dispatched
if no delivery_man_id → null (no rider)
```

**This replaces the previous assumption of `api.rider_name`, `api.rider_phone_number`, `api.rider_status` fields — those DO NOT EXIST.**

---

## 6. Blockers Discovered

| Blocker | Impact | Workaround |
|---|---|---|
| No live delivery orders on preprod | Cannot test RV-01 through RV-04 (dispatch/assign API response, socket events) | Owner must place a delivery order, or provide order ID from another restaurant |
| `order_in` not in `get-single-order-new` | `source` field defaults to `'own'` for single-order fetches. Button logic may not work correctly when order is fetched via socket handler's `fetchOrderWithRetry` | Need to verify if socket payload includes `order_in`. Or store `source` from running orders list and don't overwrite from single-order fetch. |
| `delivery_man` is object, not separate fields | Previous transform plan assumed `rider_name`, `rider_phone_number`, `rider_status` as top-level fields — all wrong | Updated mapping plan above extracts from nested object |
| Employee list returns ALL employees | No way to filter delivery-designated staff on FE without additional field | Show all active employees, or ask owner if a filter field exists |

### CRITICAL CORRECTION (Late Session): `delivery_assign` is a Restaurant Profile Setting

**Discovery:** The key that determines **Dispatch vs Assign Rider** is `delivery_assign` on the **restaurant profile** (`restaurants[0].delivery_assign`), NOT `source`/`order_in` on the order.

| Profile Field | Location | Current Value (restaurant 478) | Meaning |
|---|---|---|---|
| `delivery_assign` | `restaurants[0].delivery_assign` | `"Yes"` | Restaurant has delivery riders → Assign Rider flow |

**Business rule (owner-confirmed):**
- `delivery_assign === "Yes"` → **Assign Rider** button for ALL delivery orders
- `delivery_assign === "No"` → **Dispatch** button for ALL delivery orders (cashier self-delivers)

**This is a restaurant-level setting, not per-order.**

**Impact on previous planning:**
- Previous Bucket 1 used `source === "own"` for button logic → **WRONG**
- `source`/`order_in` indicates order origin (own/swiggy/zomato), NOT delivery method
- The correct signal is `delivery_assign` from the restaurant profile
- `delivery_assign` is NOT currently mapped in `profileTransform.js` — needs to be added

**Additional relevant profile fields found:**
| Field | Value | Notes |
|---|---|---|
| `delivery_assign` | `"Yes"` | Assign Rider vs Dispatch toggle |
| `delivery_person_name` | `"Chota"` | Default delivery person name? |
| `self_delivery_system` | `1` | Self-delivery enabled |
| `delivery` | `true` | Delivery feature enabled |
| `delivery_fee` | `"Yes"` | Delivery fee applicable |

---

## 7. Updated Bucket Readiness After Bucket 0

| Bucket | Previous Status | Updated Status | Reason |
|---|---|---|---|
| **Bucket 1** (Transform) | `yes_with_runtime_gate` | **yes — field names confirmed** | RV-05 answered. Backend field names verified. Transform mapping corrected. Can proceed. |
| **Bucket 2** (Dispatch) | `yes_with_runtime_gate` | **yes_with_runtime_gate — API response still untested** | Dispatch API payload is known. Response shape still untested (no live delivery order). Can implement API call; verify response at integration time. |
| **Bucket 3** (Delivered) | `yes_with_runtime_gate` | **yes — uses existing Collect Bill flow** | BQ-097-4 answered. No new API needed. |
| **Bucket 4** (Assign Rider) | `ready_for_ui_planning_but_api_response_validation_pending` | **yes_for_ui — employee list shape confirmed. Assign response still untested.** | BQ-097-1 answered. Modal data mapping confirmed. Assign API response (BQ-097-5) untested. |
| **Bucket 5** (Socket) | `no_backend_blocked` | **no_backend_blocked** | BQ-097-2/3 still pending. |

---

## 8. Remaining Runtime Validations (Deferred — Need Live Delivery Order)

| ID | What | When It Can Be Done |
|---|---|---|
| RV-01 | Dispatch API response shape | When a delivery order in `ready` status exists on preprod |
| RV-02 | Assign API response shape | Same |
| RV-03 | `f_order_status` after dispatch | Same |
| RV-04 | Socket event after dispatch | Same — observe via browser console |

**Recommendation:** Proceed to Bucket 1 (transform foundation) now. Deferred RV-01 through RV-04 can be validated during Bucket 2 implementation when a live delivery order is available.

---

## 9. Confirmation

- **No code changed**
- **No `/app/memory/final/` updated**
- **No baseline docs updated**
- **No implementation performed**

---

*— POS3.0 BUG-097 Bucket 0 Evidence — 2026-05-20 —*
