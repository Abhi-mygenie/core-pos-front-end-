# Order Report Clarifications & API Gaps

> Module: Phase 4A — Order Reports
> Parent: BACKEND_CLARIFICATIONS.md
> Last Updated: 2026-03-31
> Status: IMPLEMENTED — UI complete, API gaps documented for backend team (6 gaps, 2 bugs)

---

## Overview

This document tracks all backend clarifications, missing fields, data issues, and API gaps specific to the Order Reports module (Phase 4A). It serves as a spec for the backend team to address before full feature parity.

---

## 0. Critical Discovery: Date Filtering & Business Day Logic

### FINDING-001: Backend filters by settlement date, not creation date
**Discovered:** 2026-03-31
**Impact:** HIGH — affects all report accuracy

The backend's `search_date` parameter on list endpoints (`paid-order-list`, `cancel-order-list`, etc.) filters by `collect_bill` (settlement/payment date), NOT by `created_at`. This means:
- An order created on March 20th but paid on March 30th appears in March 30th's response
- An order created on March 30th but paid on March 31st does NOT appear in March 30th's response

**Frontend fix implemented:** Added `created_at` filtering on the frontend to ensure orders are attributed to their creation date.

### FINDING-002: Business Day spans two calendar dates
**Discovered:** 2026-03-31
**Impact:** HIGH — applies to ALL reports

Restaurant schedules define business day boundaries (e.g., Palmhouse: open 06:00, close 03:00 next day). March 30th business day = `2026-03-30 06:00:00` → `2026-03-31 03:00:00`.

**Frontend fix implemented:** Created `getBusinessDayRange()` utility. Report service now fetches both calendar dates and filters by `created_at` within the business day window.

### FINDING-003: Running orders explain most "missing" gaps
**Discovered:** 2026-03-31
**Impact:** MEDIUM — improves report accuracy

Gap detection in the All Orders tab showed "missing" order IDs. Investigation revealed:
- Some are running/unsettled orders (found via `employee-orders-list` API)
- Some are genuinely missing paid orders not returned by the API (backend bug — see ISSUE-002)

**Frontend fix implemented:** Running orders are now fetched alongside report data. Gap IDs found in running orders show as yellow "RUNNING" rows with actual data. Remaining gaps show as red "MISSING".

### ISSUE-002: Paid orders missing from paid-order-list
**Discovered:** 2026-03-31 (Palmhouse, March 30th data)
**Impact:** HIGH

Orders 012323 and 012336 are fully paid (f_order_status=6, payment_status=paid, collect_bill exists) but do NOT appear in `paid-order-list?search_date=2026-03-30`. Confirmed via `employee-order-details` endpoint.

**Status:** BACKEND BUG — needs investigation by backend team.

---

### ⚠️ ISSUE-003: Cancelled order amounts are zeroed out
**Discovered:** 2026-03-31 (Palmhouse, March 30th data)
**Impact:** HIGH — Cancelled orders show ₹0 instead of original order value

The `cancel-order-list` API returns `order_amount: 0` for all cancelled orders. All amount fields (`order_amount`, `order_sub_total_amount`, `order_sub_total_without_tax`) are zeroed out by the backend upon cancellation.

**Example:** Order 012332 (Palmhouse) — `order_amount: 0`, `payment_status: Merge`

**Status:** PENDING BACKEND CHANGE — Backend team will add a new variable to expose the original cancel amount. Frontend will map this field once available.

**Frontend action needed:** Once the new field name is confirmed, map it to the `amount` column in `reportTransform.js` → `cancelledOrders()` transform.

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

### GAP-004: No field to identify orders transferred to room (pending settlement)

**Discovered:** 2026-03-31 (Palmhouse, March 30th data)
**Impact:** HIGH — Missing orders in gap detection cannot be classified

**The Problem:**
When an order is transferred to a room (but the room hasn't been checked out yet), the order:
- Disappears from ALL list endpoints (paid, cancel, credit, hold)
- Disappears from `employee-orders-list` (running orders)
- Retains its original `payment_method` (cash, cash_on_delivery) — NOT updated to `ROOM`
- Has no `room_id`, `transferred_to_room`, or any room indicator field

**Evidence (Palmhouse, March 30th):**
| Order | payment_method | payment_status | In any list? |
|-------|---------------|----------------|-------------|
| 012318 | cash_on_delivery | unpaid | NO |
| 012323 | cash | paid | NO |
| 012327 | cash_on_delivery | unpaid | NO |

These orders are in a **blind spot** — they've left the regular order flow but haven't entered the settled room flow yet. Only after room checkout does `payment_method` become `ROOM` and the order reappears in `paid-order-list`.

**Lifecycle:**
```
1. Order created (dine-in) → in regular flow
2. Transferred to room → vanishes from all APIs
3. Room guest checks out → payment_method becomes "ROOM" → appears in paid-order-list
```

**What We Need (one of):**
- A field on the order: `transferred_to_room: true` or `room_id: <room_id>`
- Or a new endpoint: `room-pending-orders-list?search_date=YYYY-MM-DD`

**Current Workaround:** These orders show as red "MISSING" in gap detection. No frontend workaround possible.

**Priority:** P0 — Directly affects order count accuracy and missing order classification

---

### GAP-005: Some paid orders missing from `paid-order-list` (likely room-related)

**Discovered:** 2026-03-31 (Palmhouse, March 30th data)
**Impact:** HIGH — Revenue undercounted in reports

Orders 012323 (`order_amount: 305`, `payment_status: paid`) and 012336 (`payment_status: paid`) exist in the system (confirmed via `employee-order-details`) but do NOT appear in `paid-order-list?search_date=2026-03-30`. This is likely related to GAP-004 — these are room-transferred orders that were settled but not returned by the paid list.

**Priority:** P0 — Directly affects revenue accuracy

---

## Summary of All Backend Gaps

| # | Gap | Impact | Priority | Status |
|---|-----|--------|----------|--------|
| GAP-001 | `channel` field missing from list endpoints | Can't filter by Dine In/Takeaway/Delivery | P0 | Pending |
| GAP-002 | `platform` field missing from list endpoints | Can't filter by POS/Web | P0 | Pending |
| GAP-003 | `order_type` mixes channel and platform | Ambiguous data | P1 | Pending |
| GAP-004 | No room transfer identification field | Missing orders unclassifiable | P0 | Pending |
| GAP-005 | Paid orders missing from `paid-order-list` | Revenue undercounted | P0 | Pending |
| ISSUE-001 | `paid-paylater-order-list` returns same as paid | Can't show hold/paylater | P1 | Backend bug |
| ISSUE-003 | Cancel amount zeroed out | Cancelled orders show ₹0 | HIGH | Backend adding new field |

---

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

### INCONSISTENCY-002: `online_pay[]` field presence — CLARIFIED

> **IMPORTANT:** `online_pay[]` does NOT represent partial/split payment breakdown.
> It indicates the order was placed/paid via an **online payment gateway** (e.g., Razorpay).
> This is a separate concept from split payments (cash + UPI).

| Endpoint | `online_pay[]` Present |
|---|---|
| `paid-order-list` | YES |
| `cancel-order-list` | NO |
| `paid-in-tab-order-list` | NO |
| `paid-paylater-order-list` | NO |

---

### INCONSISTENCY-002b: Partial/Split Payment Breakdown — NEEDS INVESTIGATION

**Context:** Orders with `payment_method: "partial"` are split payments (e.g., ₹200 cash + ₹70 UPI = ₹270 total). The breakdown field is `partial_payments[]`.

**Known from outbound payload (B30):**
- When sending a split payment via `order-bill-payment`, the payload includes `partial_payments[]` with per-method amounts.

**Unknown — needs verification:**
- Does `paid-order-list` (32-field summary) return `partial_payments[]` in its response? **Likely NO** (summary endpoint).
- Does `employee-order-details` (108+ field detail) return `partial_payments[]`? **Likely YES** (full detail endpoint).

**Impact:** If `partial_payments[]` is only in `employee-order-details`, the table row can only show "partial" badge. The actual cash/UPI breakdown would only be visible in the drill-down side sheet.

**Action needed from backend team:**
1. Confirm whether `paid-order-list` includes `partial_payments[]` for partial orders
2. If not, consider adding it — or confirm it's available in `employee-order-details`
3. Expected structure: `partial_payments: [{ payment_mode: "cash", amount: 200 }, { payment_mode: "upi", amount: 70 }]`

**Priority:** P1 — Affects data visibility for split payment orders in reports

**Status:** OPEN — Could not verify with live data (no partial orders found on test accounts palmhouse/kunafamahal for recent dates)

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

## 9. Order Summary Report — Specifications

> Added: 2026-03-31
> Status: Phase 5A — Simple View Implemented

### 9.1 Overview

The Order Summary page (`/reports/summary`) provides a daily aggregated view of sales, revenue, and order metrics. Unlike the Audit Report (which shows individual orders in a table), Order Summary shows computed totals and breakdowns.

### 9.2 Data Sources

| Section | API Source | Date Filter |
|---------|-----------|-------------|
| Sales / Paid Revenue | `paid-order-list` | `search_date` |
| Cancelled | `cancel-order-list` | `search_date` |
| On Hold | `paid-paylater-order-list` | `search_date` |
| Pending (Credit) | `paid-in-tab-order-list` | `search_date` |
| Aggregators | `urbanpiper/get-complete-order-list` | `search_date` |
| **Running Orders** | `employee-orders-list` | **Filtered in UI by `createdAt`** |

**Important:** Running Orders API does NOT accept a date parameter. Frontend filters by `createdAt` field to match selected date.

### 9.3 Top Cards (6 Summary Cards)

| Card | Calculation | Color | Click Action |
|------|-------------|-------|--------------|
| **Sales** | Sum of all paid orders (Cash + Card + UPI + Tab) | Green | — |
| **Paid Revenue** | Money actually received today | Blue | — |
| **Running Orders** | Orders from `employee-orders-list` filtered by `createdAt` | Amber | Navigate to Dashboard |
| **On Hold** | Sum from `paid-paylater-order-list` | Purple | — |
| **Pending** | Sum from `paid-in-tab-order-list` (Credit) | Orange | — |
| **Cancelled** | Sum from `cancel-order-list` | Red | — |

### 9.4 Business Logic: Sales vs Paid Revenue

```
SALES (Generated Today) = Cash + Card + UPI + Tab (new tabs opened)
PAID REVENUE (Received Today) = Cash + Card + UPI + Tab_Cash + Tab_Card + Tab_UPI (old tabs cleared)

Key Insight:
- Sales ≠ Paid Revenue when Tab or Room features are used
- If NO Tab and NO Room → Sales = Paid Revenue (identical)
```

### 9.5 Middle Section — 3 Boxes

#### Box 1: Payment Breakdown
| Item | Field Logic |
|------|-------------|
| Cash | `paymentMethod.includes('cash')` |
| Card | `paymentMethod.includes('card')` or `paymentMethod.includes('cc')` |
| UPI | `paymentMethod.includes('upi')` |

Shows amount, percentage, order count, and progress bar.

#### Box 2: By Channel
| Item | Field Logic |
|------|-------------|
| Dine In | `channel === 'dinein'` or `orderType.includes('dine')` |
| Takeaway | `channel === 'takeaway'` or `orderType === 'take_away'` |
| Delivery | `channel === 'delivery'` |
| Room | `channel === 'room'` |

**Note:** Falls back to `orderType` if `channel` is missing (GAP-001).

#### Box 3: By Platform
| Item | Field Logic |
|------|-------------|
| POS | `platform === 'pos'` (default if missing) |
| Web | `platform.includes('web')` |

**Note:** Defaults to POS if `platform` is missing (GAP-002).

### 9.6 Bottom Section — 2 Boxes

#### Box 1: Aggregators
| Item | Field Logic |
|------|-------------|
| Zomato | `aggregatorPlatform.includes('zomato')` |
| Swiggy | `aggregatorPlatform.includes('swiggy')` |

#### Box 2: Deductions & Extras
| Item | Field |
|------|-------|
| Discount | Sum of `order.discount` |
| Tips | Sum of `order.tip` |
| Tax | Sum of `order.tax.total` |

### 9.7 Feature Detection

The Order Summary view adapts based on restaurant features:

| Feature Check | Location | API Field |
|---------------|----------|-----------|
| Tab enabled | `restaurant.paymentMethods.tab` | `api.pay_tab` |
| Room enabled | `restaurant.features.room` | `api.room` |

```javascript
const hasTab = restaurant?.paymentMethods?.tab || false;
const hasRoom = features?.room || false;

// View selection logic
if (!hasTab && !hasRoom) → Simple View (implemented)
if (hasTab && !hasRoom)  → Tab View (Phase 5B)
if (hasTab && hasRoom)   → Full View (Phase 5C)
```

### 9.8 Clarification Flags (For Discussion)

| Item | Current Approach | Needs Discussion |
|------|------------------|------------------|
| Running Orders for past dates | Filter by `createdAt` matching selected date | Can running orders exist for past dates? Edge cases? |
| `paid-paylater-order-list` | Used for On Hold | Backend returns same as paid orders (bug) |
| `channel` field missing | Falls back to `orderType` | GAP-001 — blocks accurate By Channel breakdown |
| `platform` field missing | Defaults to POS | GAP-002 — blocks accurate By Platform breakdown |

### 9.9 Implementation Phases

| Phase | Scope | Status |
|-------|-------|--------|
| 5A | Simple View (no Tab, no Room) | ✅ Done |
| 5B | Tab View (Sales vs Paid Revenue breakdown) | Planned |
| 5C | Full View (Tab + Room with transfers) | Planned |

---

## Change Log

| Date | Change | Author |
|---|---|---|
| 2026-03-31 | Added Order Summary Report specifications (Section 9) | Agent |
| 2026-03-30 | Initial document created with all 8 GAPs, 3 ISSUEs, 4 INCONSISTENCIEs | Agent |
