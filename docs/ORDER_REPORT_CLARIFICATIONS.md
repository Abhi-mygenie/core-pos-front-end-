# Order Report Clarifications & API Gaps

> Module: Phase 4A — Order Reports
> Parent: BACKEND_CLARIFICATIONS.md
> Last Updated: 2026-03-30
> Status: IMPLEMENTED — UI complete, API gaps documented for backend team

---

## Overview

This document tracks all backend clarifications, missing fields, data issues, and API gaps specific to the Order Reports module (Phase 4A). It serves as a spec for the backend team to address before full feature parity.

---

## 1. Missing Fields — Backend Must Add

### GAP-001: `channel` field missing from list endpoints

**Affected Endpoints:**
- `paid-order-list` (32 fields) — NO channel info
- `paid-in-tab-order-list` (23 fields) — NO channel info
- `paid-paylater-order-list` (31 fields) — NO channel info

**Available In:**
- `cancel-order-list` — has `order_type` (but mixes channel + platform)
- `employee-order-details` — has `order_type` + `restaurant_table_area`
- `urbanpiper/get-complete-order-list` — has `order_type: "delivery"`

**What We Need:**
A dedicated `channel` field on ALL list endpoints with values:
- `dinein` — Dine-in table orders
- `takeaway` — Takeaway/counter orders
- `delivery` — Delivery orders
- `room` — Room service orders

**Current Workaround:** Channel filter disabled in UI ("Coming soon" tooltip) on Paid, Credit, Hold tabs. Cancel tab uses `order_type` as partial workaround.

**Priority:** P0 — Core filter for reports

---

### GAP-002: `platform` field missing from list endpoints

**Affected Endpoints:** Same as GAP-001 — paid, credit, hold lists have no platform info.

**Available In:**
- `cancel-order-list` — `order_type` has `pos` value (mixed with channel)
- `employee-order-details` — `order_type` has `pos`/`dinein`
- `urbanpiper/get-complete-order-list` — `order_plateform` has `zomato`/`swiggy`

**What We Need:**
A dedicated `platform` field on ALL list endpoints with values:
- `pos` — Order placed from POS terminal
- `web` — Order placed via Scan & Order / web app

**Current Workaround:** Platform filter disabled in UI ("Coming soon" tooltip).

**Priority:** P0 — Core filter for reports

---

### GAP-003: `order_type` mixes Channel and Platform

**Affected Endpoints:** `cancel-order-list`, `employee-order-details`

**Current `order_type` values observed:**
- `pos` — This is a PLATFORM, not a channel
- `dinein` — This is a CHANNEL, not a platform
- `delivery` — This is a CHANNEL (seen in aggregator)

**Recommendation:** Split into two separate fields:
- `channel` → dinein, takeaway, delivery, room
- `platform` → pos, web, zomato, swiggy

**Priority:** P1 — Backend schema improvement

---

## 2. Data Issues — Backend Investigation Needed

### ISSUE-001: `paid-paylater-order-list` returns identical data to `paid-order-list`

**Endpoint:** `GET /api/v2/vendoremployee/paid-paylater-order-list`

**Observation:** On 2026-03-17, returns the EXACT same 88 orders as `paid-order-list`:
- All 88 order IDs are identical between both endpoints
- All have `payment_status: "paid"`, `f_order_status: 6`
- payment_methods: cash (44), upi (20), card (18), ROOM (6) — same distribution

**Tested Across Multiple Dates:**
| Date | Paid Orders | PayLater Orders | Match |
|---|---|---|---|
| 2026-03-17 | 88 | 88 | 100% identical IDs |
| 2026-03-30 (today) | 1 | 1 | Same order |
| 2026-03-20 | ? | 0 | — |
| 2026-03-25 | ? | 0 | — |

**Questions for Backend:**
1. What differentiates a "hold/paylater" order from a "paid" order in the database?
2. Is this endpoint filtering correctly? Expected behavior?
3. What `payment_status` or `f_order_status` value indicates "on hold"?

**Impact:** Hold tab in reports shows same data as Paid tab. Info banner added in UI.

**Priority:** P0 — Hold tab is unusable without this fix

---

### ISSUE-002: Duplicate entries in `associated_order_list`

**Endpoint:** Running orders API

**Observation:** Room 305 shows order 540564 listed TWICE in `associated_order_list`. Frontend deduplicates, but root cause is backend.

**Priority:** P2 — Frontend handles it, backend should fix for data integrity

---

### ISSUE-003: `order_status` typo — "deliverd" vs "delivered"

**Observation:** Some orders have `order_status: "deliverd"` (missing 'e'), others have `"delivered"`. Both mean the same thing.

**Affected Endpoints:** `paid-order-list`, `paid-in-tab-order-list`, `cancel-order-list`

**Impact:** Frontend must check for both spellings. Minor issue.

**Priority:** P3 — Cosmetic backend fix

---

## 3. Field Inconsistencies Across Endpoints

### INCONSISTENCY-001: Field count varies wildly

| Endpoint | Fields | Category |
|---|---|---|
| `paid-order-list` | 32 | Summary |
| `cancel-order-list` | 100+ | Full detail |
| `paid-in-tab-order-list` | 23 | Minimal |
| `paid-paylater-order-list` | 31 | Summary |
| `urbanpiper/get-complete-order-list` | Nested (70+) | Different structure |

**Recommendation:** Standardize list endpoints to include at minimum:
- `order_type` (or `channel` + `platform`)
- `table_no`
- `employee_id`
- `payment_type`
- `tip_amount`

---

### INCONSISTENCY-002: `online_pay[]` field presence

| Endpoint | `online_pay[]` Present |
|---|---|
| `paid-order-list` | YES |
| `cancel-order-list` | NO |
| `paid-in-tab-order-list` | NO |
| `paid-paylater-order-list` | NO |

---

### INCONSISTENCY-003: Credit endpoint missing common fields

**Endpoint:** `paid-in-tab-order-list` (23 fields — leanest)

**Missing fields that other list endpoints have:**
- `employee_id`
- `payment_type`
- `tip_amount`
- `table_no`
- `loyalty_info`, `coupon_info`, `wallet_info`
- `online_pay[]`, `partial_payments[]`

**Impact:** Credit tab cannot show Table/Room column, payment type filter.

---

### INCONSISTENCY-004: Aggregator response has different structure

**Endpoint:** `urbanpiper/get-complete-order-list`

All other list endpoints return flat order objects:
```json
{ "orders": [ { id, restaurant_order_id, order_amount, ... } ] }
```

Aggregator returns nested objects:
```json
{ "orders": [ { brand_name, order_details_order: {...}, customer_details: {...}, order_details_food: [...] } ] }
```

**Impact:** Frontend needs separate transform logic for aggregator data.

**Also notable:** Aggregator has unique fields not in any other endpoint:
- `order_plateform` (NOTE: typo — should be `platform`)
- `store_id`, `store_ref_id`, `urban_order_id`, `buzz_id`
- `aggrigator_id`, `aggrator_ref_id` (NOTE: typos)
- `prep_time_mins`, `rider_name`, `rider_phone_number`
- `customer_details.address` (city, line_1, sub_locality)

---

## 4. API Inventory — Complete Reference

| # | Endpoint | Method | Param | Tab(s) |
|---|---|---|---|---|
| 1 | `/api/v2/vendoremployee/paid-order-list` | GET | `search_date` | Paid, Room Transfer |
| 2 | `/api/v2/vendoremployee/cancel-order-list` | GET | `search_date` | Cancelled, Merged |
| 3 | `/api/v2/vendoremployee/paid-in-tab-order-list` | GET | `search_date` | Credit |
| 4 | `/api/v2/vendoremployee/paid-paylater-order-list` | GET | `search_date` | On Hold |
| 5 | `/api/v1/vendoremployee/urbanpiper/get-complete-order-list` | POST | `search_date` (body) | Aggregator |
| 6 | `/api/v2/vendoremployee/employee-order-details` | GET | `order_id` | Detail drill-down |

### Tab → Data Source Mapping:

| Tab | API | Filter Logic |
|---|---|---|
| Paid | #1 `paid-order-list` | Exclude `payment_method in ["ROOM","transferToRoom"]` |
| Cancelled | #2 `cancel-order-list` | Exclude `payment_method === "Merge"` |
| Credit | #3 `paid-in-tab-order-list` | Direct |
| On Hold | #4 `paid-paylater-order-list` | Direct |
| Merged | #2 `cancel-order-list` | `payment_method === "Merge"` |
| Room Transfer | #1 `paid-order-list` | `payment_method in ["ROOM","transferToRoom"]` |
| Aggregator | #5 `urbanpiper/get-complete-order-list` | Direct |

---

## 5. Filter Availability Matrix

| Filter | Paid | Cancelled | Credit | Hold | Merged | Room Transfer | Aggregator |
|---|---|---|---|---|---|---|---|
| Date | YES | YES | YES | YES | YES | YES | YES |
| Payment Method | YES | YES | YES (always TAB) | YES | YES (always Merge) | YES (always ROOM) | YES |
| Channel | NO (GAP-001) | PARTIAL | NO (GAP-001) | NO (GAP-001) | PARTIAL | NO (GAP-001) | YES (always delivery) |
| Platform | NO (GAP-002) | PARTIAL | NO (GAP-002) | NO (GAP-002) | PARTIAL | NO (GAP-002) | YES (order_plateform) |
| Payment Type | YES | YES | NO | YES | YES | YES | YES |

---

## 6. Field Availability Matrix

| Field | Paid (32) | Cancel (100+) | Credit (23) | Hold (31) | Aggregator (nested) | Detail (108+) |
|---|---|---|---|---|---|---|
| restaurant_order_id | YES | YES | YES | YES | YES (nested) | YES |
| order_amount | YES | YES | YES | YES | YES (nested) | YES |
| user_name | YES | YES | YES | YES | YES (nested) | YES |
| waiter_name | YES | YES | YES | YES | NO | YES |
| table_no | YES | YES | NO | YES | NO | YES |
| payment_method | YES | YES | YES | YES | YES (nested) | YES |
| payment_type | YES | YES | NO | YES | YES (nested) | YES |
| order_type | NO | YES | NO | NO | YES (nested) | YES |
| order_details[] | NO | YES | NO | NO | YES (as order_details_food) | YES |
| employee_id | YES | YES | NO | YES | NO | YES |
| tip_amount | YES | YES | NO | YES | YES (nested) | YES |
| taxes (gst/vat/svc) | YES | YES | YES | YES | YES (nested) | YES |
| discount | YES | YES | YES | YES | YES (nested) | YES |
| customer contact | YES | YES | YES | YES | YES (customer_details) | YES |
| cancellation_reason | NO | YES | NO | NO | NO | YES |
| restaurant_table_area | NO | NO | NO | NO | NO | YES |

---

## 7. Test Accounts for Report Data

| Account | Has Paid | Has Cancel | Has Credit | Has Hold | Has Aggregator |
|---|---|---|---|---|---|
| owner@palmhouse.com | YES (88/day) | YES (11/day) | YES (12/day) | YES (same as paid) | NO |
| owner@kunafamahal.com | ? | ? | ? | ? | YES (6/day) |

**Aggregator data ONLY available on kunafamahal.com account.**

---

## 8. Action Items for Backend Team

### P0 — Blocking Report Filters
1. **Add `channel` field** to paid-order-list, paid-in-tab-order-list, paid-paylater-order-list (GAP-001)
2. **Add `platform` field** to paid-order-list, paid-in-tab-order-list, paid-paylater-order-list (GAP-002)
3. **Fix `paid-paylater-order-list`** — currently returns same data as paid-order-list (ISSUE-001)

### P1 — Data Quality
4. **Split `order_type`** into separate `channel` + `platform` fields (GAP-003)
5. **Enrich `paid-in-tab-order-list`** with missing fields: table_no, employee_id, payment_type, tip_amount (INCONSISTENCY-003)

### P2 — Cleanup
6. **Fix `order_status` typo** — normalize "deliverd" to "delivered" (ISSUE-003)
7. **Fix `associated_order_list` duplicates** (ISSUE-002)
8. **Fix API typos** — `order_plateform` → `order_platform`, `aggrigator_id` → `aggregator_id`, `aggrator_ref_id` → `aggregator_ref_id`

---

## Change Log

| Date | Change | Author |
|---|---|---|
| 2026-03-30 | Initial document created with all 8 GAPs, 3 ISSUEs, 4 INCONSISTENCIEs | Agent |
