# AUDIT REPORT — API Contract Freeze Document

**Document ID:** `AUDIT_REPORT_CONTRACT_FREEZE_2026_05_28`
**Date:** 2026-05-28
**Status:** `PENDING_BOTH_PARTY_SIGN_OFF`
**Parties:**
- **Party A:** POS Frontend Team
- **Party B:** Backend / API Team

**Rule:** No implementation work on either side shall begin until BOTH parties have reviewed and approved this document. Any disagreement must be resolved and the document amended before sign-off.

---

## 1. SCOPE

This contract covers the `/api/v2/vendoremployee/report/order-logs-report` endpoint and its consumption by the POS Audit Report page. It defines:

- What the frontend will consume and how
- What the backend must fix/add
- What the frontend will eliminate
- The shared data contract for the order detail modal and lifecycle timeline

---

## 2. CURRENT STATE (As-Is)

### 2.1 API Calls on Page Load (Current)

| # | Endpoint | Method | Purpose | Calls |
|---|---|---|---|---|
| 1 | `/get-room-list` | GET | Get active rooms for SRM cascade | 1 |
| 2 | `/employee-orders-list` | GET | Running orders for gap detection | 1 |
| 3 | `/get-single-order-new` | POST | Per-room folio fetch (SRM cascade) | N (= in-house rooms) |
| 4 | `/order-logs-report` | POST | Actual report data | 1 |
| **Total** | | | | **3 + N** |

### 2.2 API Call on Row Click (Current)

| # | Endpoint | Method | Purpose | Calls |
|---|---|---|---|---|
| 5 | `/get-single-order-new` | POST | Fetch order detail for side sheet | 1 |

### 2.3 Current Issues

- Palm House with 8 rooms = **11 API calls** on page load
- Row click = **1 additional API call** per click (loading spinner, latency)
- Modal Tax (GST) line uses `amount - subtotal - deliveryCharge` remainder hack → shows **negative values** on cancelled orders (e.g. ₹-50)
- Order lifecycle timeline only shows "Created → Paid" — missing Ready, Served, Confirmed steps
- 300-line inline transform in `reportService.js` — no proper transform layer
- `order_details_table[]` has 47 fields per item but only 2 are read

---

## 3. TARGET STATE (To-Be)

### 3.1 API Calls on Page Load (Target)

| # | Endpoint | Method | Purpose | Calls |
|---|---|---|---|---|
| 1 | `/employee-orders-list` | GET | Running orders for gap detection | 1 |
| 2 | `/order-logs-report` | POST | ALL data — rows + items + lifecycle + bill | 1 |
| **Total** | | | | **2** |

**Eliminated:** `get-room-list` (1 call) + `get-single-order-new × N rooms` (N calls) = **1 + N calls eliminated**

**Condition for room cascade elimination:** Backend fixes GAP 8 (SRM `payment_method` update on room checkout) OR adds `is_parent_room_active` field. **Until then, room cascade stays as-is.**

### 3.2 API Call on Row Click (Target)

| # | Endpoint | Method | Purpose | Calls |
|---|---|---|---|---|
| — | None | — | Data already loaded from `order-logs-report` | **0** |

**Eliminated:** `get-single-order-new` on every row click = **1 call eliminated per click, modal opens instantly**

### 3.3 Improvement Summary

| Metric | Current | Target |
|---|---|---|
| Page load calls (no rooms) | 3 | 2 |
| Page load calls (8 rooms) | 11 | 2 (or 11 until GAP 8 is fixed) |
| Row click calls | 1 | **0** |
| Modal open time | ~500ms–2s (network) | **Instant** |
| Tax display accuracy | Remainder hack (can show ₹-50) | Real GST/VAT/SC/Tip/Roundoff fields |
| Lifecycle timeline | Created → Paid only | Full: Created → Confirmed → Ready → Served → Paid/Cancelled |

---

## 4. DATA CONTRACT — What Frontend Will Read from `/order-logs-report`

### 4.1 Order Row Fields (from `orders_table`)

Already consumed today — no change:

| Field | Key | Usage |
|---|---|---|
| Order ID | `restaurant_order_id` | Display |
| DB ID | `id` | Internal reference |
| Amount | `order_amount` | Total |
| Customer | `user_name` | Display |
| Waiter | `waiter_name` | Punched By |
| Table | `table_name` | Table No |
| Payment Method | `payment_method` | Badge + filter |
| f_order_status | `f_order_status` | Status derivation |
| Created At | `created_at` | Time column |
| Collected At | `collect_bill` | Paid timestamp |
| Order Type | `order_type` | Channel filter |
| Platform | `order_from` | Platform filter |

**NEW fields frontend will start reading (already in response, just unused):**

| Field | Key | Usage |
|---|---|---|
| Subtotal | `order_sub_total_without_tax` (fallback: `order_sub_total_amount`) | Bill summary |
| GST | `total_gst_tax_amount` | Bill summary — replaces remainder hack |
| VAT | `total_vat_tax_amount` | Bill summary |
| Service Tax | `total_service_tax_amount` | Bill summary |
| Tip | `tip_amount` | Bill summary |
| Tip Tax | `tip_tax_amount` | Bill summary |
| Round-off | `round_up` | Bill summary |
| Delivery Charge | `delivery_charge` | Bill summary |
| Delivery GST | `delivery_charge_gst` | Bill summary |
| Discount | `restaurant_discount_amount` | Bill summary |
| Coupon Code | `coupon_code` | Bill summary |
| Coupon Amount | `coupon_discount_amount` | Bill summary |
| Ready At | `ready_at` (order-level) | Lifecycle timeline |
| Order Note | `order_note` | Display in modal |
| Cancellation Reason | `cancellation_reason` | Cancelled order detail |
| Employee Name | `employee_name` | "Collected by" |

### 4.2 Item Fields (from `order_details_table[]`)

**NEW — frontend will start parsing these (already in response, currently only 2 of 47 fields read):**

| Field | Key | Type | Notes |
|---|---|---|---|
| Item Name | `food_details` → parse JSON → `.name` | string (JSON) | Needs `JSON.parse()` |
| Veg/Non-veg | `food_details` → `.veg` | int (1=veg, 0=non-veg) | Inside JSON string |
| Egg | `food_details` → `.egg` | int | Inside JSON string |
| Image | `food_details` → `.image` | string/null | Inside JSON string |
| Tax % | `food_details` → `.tax` | number | Inside JSON string |
| Tax Type | `food_details` → `.tax_type` | string (GST/VAT) | Inside JSON string |
| Tax Calc | `food_details` → `.tax_calc` | string (Inclusive/Exclusive) | Inside JSON string |
| Quantity | `quantity` | int | Direct |
| Unit Price | `unit_price` | string (decimal) | Direct |
| Line Price | `price` | number | Direct |
| Station | `station` | string (KDS/BAR) | Direct |
| Item Type | `item_type` | string | Direct |
| Food Status | `food_status` | int (2=ready, 3=cancelled, 5=served) | Direct |
| Notes | `food_level_notes` | string | Direct |
| Variations | `variation` | string (JSON array) | Needs `JSON.parse()` |
| Add-ons | `add_ons` | string (JSON array) | Needs `JSON.parse()` |
| Ready At | `ready_at` | datetime/null | Item-level timeline |
| Ready By | `ready_by` | int (employee ID) | Item-level timeline |
| Serve At | `serve_at` | datetime/null | Item-level timeline |
| Serve By | `serve_by` | int (employee ID) | Item-level timeline |
| Cancel At | `cancel_at` | datetime/null | Item-level timeline |
| Cancel By Name | `cancel_by_name` | string/null | Cancel attribution |
| Cancel Type | `cancel_type` | string (Pre-Serve/Post-Serve) | Cancel classification |
| Cancel Reason | `cancel_reason_text` | string/null | Cancel reason |
| Complementary | `complementary` | int (0/1) | Comp item flag |
| Per-item GST | `gst_tax_amount` | string (decimal) | Item-level tax |
| Per-item VAT | `vat_tax_amount` | string (decimal) | Item-level tax |
| Per-item Discount | `discount_amount` | string (decimal) | Item-level discount |
| Per-item SC | `service_charge` | string (decimal) | Item-level SC |
| Paid Status | `paid_status` | int | Item payment flag |

### 4.3 Operations (from `operations[]`)

**NEW — frontend will start reading this for lifecycle timeline:**

Each entry in `operations[]`:

| Field | Type | Usage |
|---|---|---|
| `operation` | string | Action type: `order_bill_payment`, `order_shifted_room`, `waiter_dinein_order_status_update`, etc. |
| `vendor_employee_id` | int | WHO (ID) |
| `vendor_employee_name` | string | WHO (name) |
| `created_at` | datetime | WHEN |
| `previous_f_order_status` | int | From status |
| `current_f_order_status` | int | To status |
| `previous_payment_method` | string | From payment method |
| `current_payment_method` | string | To payment method |
| `previous_payment_status` | string | From payment status |
| `current_payment_status` | string | To payment status |
| `previous_order_status` | string | From order status |
| `current_order_status` | string | To order status |
| `previous_order_amount` | string (decimal) | Amount before |
| `current_order_amount` | string (decimal) | Amount after |
| `current_collect_bill` | datetime/null | Bill collection timestamp |

---

## 5. BACKEND OBLIGATIONS — Gaps to Fix

No frontend implementation will proceed until ALL P0 and P1 gaps are confirmed fixed (or formally deferred with both-party agreement).

### P0 — Blocker

| # | Gap | Current State | Required State | Verification Order IDs |
|---|---|---|---|---|
| **GAP-1** | `operations[]` empty on prepaid orders | 141/141 orders on rid=383 have `operations=[]` | Log `order_bill_payment` (or equivalent) for prepaid — same structure as postpaid | rid=383: `063153 (db_id=861198)`, `063155 (db_id=861286)`, `063151 (db_id=861163)` |

### P1 — Required

| # | Gap | Current State | Required State | Verification Order IDs |
|---|---|---|---|---|
| **GAP-2** | `operations[]` empty on merged orders | 6/6 merged orders have `operations=[]` | Log `order_merged` operation | rid=541: `014684 (db_id=863427)`, `014683 (db_id=863256)`, `014658 (db_id=862245)` / rid=644: `010979 (db_id=857497)`, `010954 (db_id=856839)`, `010927 (db_id=856162)` |
| **GAP-3** | `operations[]` empty on cancelled orders | 7/7 cancelled orders have `operations=[]` | Log `order_cancelled` operation | rid=541: `014679 (db_id=862763)`, `014652 (db_id=862095)` / rid=383: `063044 (db_id=859638)`, `063118 (db_id=860646)`, `063099 (db_id=860391)` |
| **GAP-4** | `payment_status` = NULL on 100% of orders | 224/224 orders checked: `payment_status=None` | Populate `'paid'` / `'unpaid'` | rid=644: `011133 (db_id=867138)` / rid=541: `014688 (db_id=864235)` / rid=383: `063155 (db_id=861286)` |
| **GAP-5** | Order-level cancel fields ALL NULL | `cancel_at`, `canceled_by`, `cancellation_reason` = NULL even on cancelled orders | Populate from item-level data or cancel action | rid=383: `063044 (db_id=859638)` — item-level has Sunita/Pre-Serve/Change Requested but order-level is NULL |

### P2 — Desired

| # | Gap | Current State | Required State | Verification Order IDs |
|---|---|---|---|---|
| **GAP-6** | Order-level `serve_at` inconsistent | cafe103: 1/41, palmhouse: 25/37, pav: 0/135 | Populate when last item served | rid=644: any paid order / rid=383: any paid order |

### Parked (not blocking this contract)

| # | Gap | Notes |
|---|---|---|
| **GAP-7** | `order_sub_total_without_tax` = 0 on rid=383 | Frontend will use `order_sub_total_amount` as fallback |
| **GAP-8** | SRM `payment_method` stuck as `transferToRoom` after room checkout | Discussed separately; room cascade stays until resolved |

---

## 6. FRONTEND OBLIGATIONS — What Frontend Will Do

Frontend will NOT begin implementation until Section 5 (P0 + P1) is signed off by backend.

### 6.1 Eliminate `get-single-order-new` on row click

- Parse `order_details_table[]` from `/order-logs-report` response during initial load
- `JSON.parse()` the `food_details`, `variation`, `add_ons` strings per item
- Attach parsed items to each row object
- `OrderDetailSheet` reads from row data — no API call, instant open

### 6.2 Extract inline transform to `reportTransform.js`

- Move the 300-line inline transform from `reportService.getOrderLogsReport()` into `reportTransform.js` as `reportListFromAPI.orderLogsReport()`
- Extract status derivation into a shared utility
- Remove dev diagnostic logging (WATCH_ORDER_IDS, G5 snapshots) or gate behind debug flag

### 6.3 Fix bill summary — use real fields

- Replace `Tax (GST) = amount - subtotal - delivery` remainder hack
- Use `total_gst_tax_amount`, `total_vat_tax_amount`, `total_service_tax_amount`
- Add Tip, Round-off, Discount, Coupon lines from `orders_table` fields
- Eliminates the ₹-50 Tax bug on cancelled orders

### 6.4 Build lifecycle timeline from `operations[]`

- Render full timeline: Created → Confirmed → Ready → Served → Paid/Cancelled
- Show WHO performed each action (`vendor_employee_name`)
- Show WHEN each action happened (`created_at`)
- Fallback to item-level timestamps when `operations[]` is incomplete
- Handle payment changes, unpaid→repaid cycles

### 6.5 Fields NOT needed (confirmed by owner)

- ~~`user.phone`~~ — customer name is sufficient
- ~~`restaurantTable.title`~~ — `table_name` is the display value
- ~~`vendorEmployee.l_name`~~ — `waiter_name` already has full name

---

## 7. VERIFICATION PROTOCOL

### 7.1 Backend Verification

After backend deploys fixes, frontend will verify using these exact order IDs:

| Gap | Restaurant | Order ID | DB ID | Check |
|---|---|---|---|---|
| GAP-1 | vishal@pav.com (383) | 063153 | 861198 | `operations[]` is non-empty |
| GAP-1 | owner@palmhouse.com (541) | 014687 | 864187 | `operations[]` is non-empty |
| GAP-2 | owner@palmhouse.com (541) | 014684 | 863427 | `operations[]` has merge entry |
| GAP-3 | vishal@pav.com (383) | 063044 | 859638 | `operations[]` has cancel entry |
| GAP-4 | owner@cafe103.com (644) | 011133 | 867138 | `payment_status` = `'paid'` (not NULL) |
| GAP-5 | vishal@pav.com (383) | 063044 | 859638 | `cancel_at`, `canceled_by`, `cancellation_reason` populated |

### 7.2 Frontend Verification

After frontend implements changes, backend will verify:

| Check | Expected |
|---|---|
| Page load network calls | Only `employee-orders-list` + `order-logs-report` (2 calls, no rooms) |
| Row click network calls | 0 additional calls |
| Modal opens | Instantly (no loading spinner) |
| Tax display | Real GST/VAT values (no negative numbers) |
| Timeline | Shows all lifecycle steps with names and times |

---

## 8. SIGN-OFF

| Party | Name | Date | Status |
|---|---|---|---|
| **Party A** (POS Frontend) | | | `PENDING` |
| **Party B** (Backend / API) | | | `PENDING` |

**Contract becomes active only when BOTH parties sign off.**

**Amendment rule:** Any change to this contract requires both parties to re-sign. Unilateral changes are not valid.

---

*End of Contract Freeze Document*
*Document path: `/app/memory/bugs/AUDIT_REPORT_CONTRACT_FREEZE_2026_05_28.md`*
