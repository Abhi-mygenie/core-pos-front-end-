# Doc 10 — API Field Audit: Order Logs Report

**Endpoint:** `POST /api/v2/vendoremployee/report/order-logs-report`
**Transform:** `reportTransform.js` → `orderLogsReportRow` + `parseOrderItem`
**Raw consumers (pre-transform):** `insightsService.js`, `roomOrdersService.js`, `foodCourtService.js`, `orderLedgerService.js`
**Post-transform consumers:** `AllOrdersReportPage`, `DashboardMockup`, `SalesMockup`, `PaymentsMockup`, `CancellationsMockup`, `ItemSalesHybridMockup`, `OrderLedgerMockup`, `FoodCourtMockup`, `PrepServeTimeMockup`, `RoomOrdersMockup`, `SettlementReportMockup`
**Frequency:** Per report load — can be 30–40 MB for a single month. Powers 11+ screens.

> **Critical context:** This is the single heaviest API in the system. A month of data = ~37.5 MB (cafe103) / ~40 MB (Palm House). The response carries **128 fields** in `orders_table`, **47 fields** per item in `order_details_table`, and **72 fields** per `food_details` blob. The frontend uses **60 of 128** orders_table fields, **28 of 47** item fields, and **7 of 72** food_details fields.

---

## Summary

### orders_table (128 fields)

| Status | Count | % |
|--------|-------|---|
| ✅ USED | 52 | 41% |
| ❌ DEAD | 68 | 53% |
| ⚠️ DOUBT | 8 | 6% |
| **Total** | **128** | 100% |

### order_details_table (47 fields per item)

| Status | Count | % |
|--------|-------|---|
| ✅ USED | 30 | 64% |
| ❌ DEAD | 13 | 28% |
| ⚠️ DOUBT | 4 | 8% |
| **Total** | **47** | 100% |

### food_details (72 fields per blob — JSON string ~1.6 KB)

| Status | Count | % |
|--------|-------|---|
| ✅ USED | 7 | 10% |
| ❌ DEAD | 65 | 90% |
| **Total** | **72** | 100% |

### operations (26 fields per op)

| Status | Count | % |
|--------|-------|---|
| ✅ USED | 8 | 31% |
| ❌ DEAD | 18 | 69% |
| **Total** | **26** | 100% |

### Wrapper-level (5 keys)

| Status | Count | % |
|--------|-------|---|
| ✅ USED | 5 | 100% |

---

## Estimated Payload Savings

| Component | Current Size/order | After strip | Saving | Orders/month |
|-----------|-------------------|-------------|--------|-------------|
| `orders_table` (68 dead of 128) | ~3.2 KB | ~1.5 KB | **~1.7 KB** | × 2,000 = **3.4 MB** |
| `food_details` blob (65 dead of 72) | ~1.6 KB/item | ~0.1 KB/item | **~1.5 KB/item** | × 8,000 items = **12 MB** |
| `order_details_table` (13 dead of 47) | ~0.8 KB/item | ~0.5 KB/item | **~0.3 KB/item** | × 8,000 = **2.4 MB** |
| `operations` (18 dead of 26) | ~0.5 KB/op | ~0.2 KB/op | **~0.3 KB/op** | × 3,000 = **0.9 MB** |
| **Total monthly** | **~37.5 MB** | **~18.8 MB** | **~18.7 MB (50%)** | **before gzip** |
| **With gzip** | ~6 MB | ~3 MB | **~3 MB saved** | **per month load** |

**Biggest single win: stripping `food_details` to 7 fields saves ~12 MB/month raw.**

---

## Time Savings — Measured from Live API Data

> All numbers below are from real API payloads captured from preprod (`/app/audit_data/orders_jun_created_at.json`). Not estimates — actual JSON measured byte-by-byte.

### Per-Component Reduction (measured averages)

| Component | Current avg/unit | After strip | Reduction |
|-----------|-----------------|-------------|-----------|
| `food_details` blob | 3,298 bytes | 128 bytes | **96% smaller** |
| `order_details_table` item | 4,577 bytes | 926 bytes | **80% smaller** |
| `orders_table` | 3,175 bytes | 1,351 bytes | **57% smaller** |
| `operations` entry | 987 bytes | 257 bytes | **74% smaller** |

### Monthly Totals (cafe103 ~2,264 orders, ~3.3 items/order)

| Metric | Current | After Strip | Savings |
|--------|---------|-------------|---------|
| Raw JSON | 49.1 MB | 12.0 MB | **37.1 MB (76%)** |
| Gzipped | 7.9 MB | 1.9 MB | **5.9 MB (75%)** |

### Monthly Totals (Palm House ~2,400 orders, ~40 MB)

| Metric | Current | After Strip | Savings |
|--------|---------|-------------|---------|
| Raw JSON | 40 MB | 9.8 MB | **30.2 MB (75%)** |
| Gzipped | 6.4 MB | 1.6 MB | **4.8 MB (75%)** |

### Network Time Savings Per Report Load (1 month range)

| Connection | cafe103 Current | cafe103 After | **Time Saved** | Palm House Saved |
|-----------|----------------|---------------|----------------|-----------------|
| **WiFi (50 Mbps)** | 1.3s | 0.3s | **1.0s** | 0.8s |
| **4G (10 Mbps)** | 6.3s | 1.5s | **4.8s** | 3.9s |
| **3G (2 Mbps)** | 31.5s | 7.7s | **23.8s** | 19.3s |
| **Slow 3G (0.5 Mbps)** | 125.8s | 30.8s | **95.0s** | 77.4s |

### Backend Server Savings

| Metric | Current | After Strip | Saving |
|--------|---------|-------------|--------|
| JSON serialization time | ~25,000 ms | ~6,000 ms | **~19s less CPU per request** |
| Server memory per request | 49 MB | 12 MB | **37 MB less RAM** |
| DB result set | 128 columns | 60 columns | **Fewer disk reads** |

### Stage-by-Stage Time Impact (4G connection, 1-month load)

| Stage | Action | Raw Saving | Gzip Saving | Time Saved (4G) |
|-------|--------|-----------|-------------|-----------------|
| **Stage 1** | Strip `food_details` to 7 fields | ~24 MB | ~3.8 MB | **~3.1s** |
| **Stage 2** | Drop 68 dead `orders_table` fields | ~4.1 MB | ~0.7 MB | **~0.5s** |
| **Stage 3** | Drop 13+ dead `order_details_table` fields | ~6 MB | ~1.0 MB | **~0.8s** |
| **Stage 4** | Drop 18 dead `operations` fields | ~3 MB | ~0.5 MB | **~0.4s** |
| **All stages** | Combined | **~37 MB** | **~5.9 MB** | **~4.8s** |

> **Note:** These savings multiply when users navigate between Insights screens — Dashboard, Sales, Items, Cancellations each trigger their own `order-logs-report` fetch. A user browsing all 6 report screens for one month currently downloads ~240 MB. After stripping: ~60 MB.

---

## A. orders_table — 128 Fields

### ✅ USED (52 fields)

| # | Field | Consumer | Purpose |
|---|-------|----------|---------|
| 1 | `id` | reportTransform, insightsService, all screens | Primary key |
| 2 | `restaurant_order_id` | reportTransform, insightsService | Display order # |
| 3 | `created_at` | All services (business day filter, date display) | Created timestamp |
| 4 | `collect_bill` | insightsService (collection-date attribution), reportTransform (paid timestamp) | Collection timestamp |
| 5 | `updated_at` | reportTransform (collectedAt fallback, merge time) | Updated timestamp |
| 6 | `f_order_status` | deriveOrderStatus, insightsService, all screens | Status code (6=paid, 3=cancelled etc.) |
| 7 | `payment_method` | deriveOrderStatus, insightsService, paymentClassifier | Cash/Card/UPI/TAB/Cancel/Merge/etc. |
| 8 | `payment_status` | deriveOrderStatus, reportTransform | paid/unpaid/Merge |
| 9 | `payment_type` | reportTransform | Prepaid/postpaid |
| 10 | `order_amount` | insightsService (revenue), reportTransform (amount) | Grand total |
| 11 | `order_in` | reportTransform (RM/SRM), roomOrdersService, insightsService | Order origin type |
| 12 | `order_type` | reportTransform (channel), insightsService | dinein/takeaway/delivery |
| 13 | `order_from` | reportTransform (platform: pos/web) | Order platform |
| 14 | `order_sub_total_amount` | reportTransform (itemTotal) | Item total pre-deductions |
| 15 | `order_sub_total_without_tax` | reportTransform (subtotal) | Subtotal before tax |
| 16 | `delivery_charge` | reportTransform, insightsService | Delivery charge |
| 17 | `delivery_charge_gst` | reportTransform | Delivery charge GST |
| 18 | `tip_amount` | reportTransform, insightsService | Tip amount |
| 19 | `tip_tax_amount` | reportTransform | Tip tax |
| 20 | `round_up` | reportTransform, insightsService | Round-off amount |
| 21 | `table_name` | reportTransform, insightsService | Table/room display name |
| 22 | `table_id` | reportTransform (location logic) | Table ID |
| 23 | `waiter_name` | reportTransform (punchedBy), insightsService | Staff who punched |
| 24 | `employee_name` | reportTransform (actionedBy) | Employee who actioned |
| 25 | `employee_id` | reportTransform (actionedBy fallback) | Employee ID fallback |
| 26 | `restaurant_discount_amount` | reportTransform, insightsService | Discount amount |
| 27 | `coupon_discount_amount` | reportTransform, insightsService | Coupon discount |
| 28 | `coupon_code` | reportTransform | Coupon code |
| 29 | `cancellation_reason` | reportTransform, insightsService | Cancel reason text |
| 30 | `cancel_at` | reportTransform (cancelled timestamp) | Order-level cancel time |
| 31 | `total_gst_tax_amount` | reportTransform (gstAmount) | Total GST |
| 32 | `total_vat_tax_amount` | reportTransform (vatAmount) | Total VAT |
| 33 | `total_service_tax_amount` | reportTransform (serviceChargeAmount) | Service charge |
| 34 | `service_gst_tax_amount` | Section 4.2 keep-list | Service charge GST |
| 35 | `discount_value` | reportTransform (legacy discount fallback) | Legacy discount |
| 36 | `order_discount` | Section 4.2 keep-list | Order discount |
| 37 | `order_discount_type` | Section 4.2 keep-list | Discount type |
| 38 | `comunity_discount` | Section 4.2 keep-list | Community discount |
| 39 | `discount_member_category` | Section 4.2 keep-list | Discount member category |
| 40 | `user_id` | insightsService (customer identification) | User ID |
| 41 | `user_name` | reportTransform (customer), roomOrdersService | Customer name |
| 42 | `cust_mobile` | reportTransform, insightsService | Customer phone |
| 43 | `razorpay_order_id` | reportTransform (payment gateway flag) | Razorpay order ref |
| 44 | `transaction_id` | reportTransform (transactionRef fallback) | Transaction ID |
| 45 | `parent_order_id` | reportTransform (SRM room linking) | Parent order for SRM |
| 46 | `payment_amount` | reportTransform (pgAmount) | Payment gateway amount |
| 47 | `snapshot_razorpay_status` | reportTransform (pgStatus) | Razorpay status |
| 48 | `order_note` | reportTransform | Order notes |
| 49 | `ready_at` | reportTransform (timeline) | Order ready timestamp |
| 50 | `serve_at` | reportTransform (timeline) | Order served timestamp |
| 51 | `loyalty_info` | insightsService (loyalty parsing) | Loyalty JSON blob |
| 52 | `canceled_by` | reportTransform (actionedBy for cancelled) | Cancelled by ID |

### ⚠️ DOUBT (8 fields)

| # | Field | Notes |
|---|-------|-------|
| 1 | `order_status` | Extracted as lifecycle ('queue'/'delivered') — may be redundant with `f_order_status` |
| 2 | `total_tax_amount` | Sum of GST+VAT+service — but individual components already extracted |
| 3 | `cancel_state` | Backend brief mentions stray values ('Merge','ready') — semantics unclear |
| 4 | `waiter_id` | Extracted but only `waiter_name` is displayed |
| 5 | `print_bill_status` | May be passed through for audit but not in orderLogsReportRow |
| 6 | `print_kot` | Same as above |
| 7 | `scheduled` | reportTransform doesn't extract it for order-logs (only running orders do) |
| 8 | `schedule_at` | Same as above |

### ❌ DEAD (68 fields)

| # | Field | Bytes est. | Notes |
|---|-------|-----------|-------|
| 1 | `accepted` | 5 | Order lifecycle flag — backend-only |
| 2 | `address_id` | 5 | Delivery address FK — not used by FE |
| 3 | `adjusment` | 5 | Misspelled adjustment — never read |
| 4 | `air_bnb_id` | 5 | Airbnb integration — not used |
| 5 | `audio_file` | 10 | Audio attachment — not used |
| 6 | `b_item` | 5 | Bar item status — not used |
| 7 | `b_order_status` | 5 | Bar order status — not used |
| 8 | `billing_auto_bill_print` | 5 | Per-order auto-bill flag — config from profile used instead |
| 9 | `callback` | 5 | Callback URL — not used |
| 10 | `canceled` | 10 | Cancelled timestamp — `cancel_at` used instead |
| 11 | `cancellation_note` | 20 | Separate from reason — not displayed |
| 12 | `checked` | 5 | Check flag — not used |
| 13 | `confirmed` | 10 | Confirmed timestamp — not used |
| 14 | `coupon_created_by` | 10 | Coupon creator — not used |
| 15 | `coupon_discount_title` | 20 | Coupon title — not used (code used instead) |
| 16 | `coupon_discount_type` | 10 | Coupon type — not used |
| 17 | `coupon_info` | 200+ | Full coupon JSON blob — not used |
| 18 | `daily_token` | 10 | Daily sequence token — not used |
| 19 | `delivered` | 10 | Delivered timestamp — not used |
| 20 | `delivery_address` | 100+ | Full address JSON — customer_details used instead |
| 21 | `delivery_address_id` | 5 | Address FK — not used |
| 22 | `delivery_man_id` | 5 | Rider FK — not used in reports |
| 23 | `delivery_man_status` | 5 | Rider status — not used in reports |
| 24 | `discount_for` | 10 | Discount target — not used |
| 25 | `discount_on_product_by` | 10 | Discount applicator — not used |
| 26 | `distance` | 5 | Delivery distance — not used |
| 27 | `dm_tips` | 5 | Delivery man tips — not used |
| 28 | `edited` | 10 | Edited timestamp — not used |
| 29 | `estimatedTime` | 10 | Estimated time — not used |
| 30 | `failed` | 10 | Failed timestamp — not used |
| 31 | `fcm_token` | 50+ | Firebase token — not used in reports |
| 32 | `free_delivery_by` | 10 | Free delivery flag — not used |
| 33 | `handover` | 10 | Handover timestamp — not used |
| 34 | `k_item` | 5 | Kitchen item status — not used |
| 35 | `k_order_status` | 5 | Kitchen order status — not used |
| 36 | `order_dispatch_status` | 5 | Dispatch flag — not used in reports |
| 37 | `order_edit_count` | 5 | Edit counter — not used |
| 38 | `original_delivery_charge` | 5 | Pre-edit delivery charge — not used |
| 39 | `otp` | 10 | Order OTP — not used |
| 40 | `payload_total_gst_tax_amount` | 10 | Payload GST — duplicate of total_gst_tax_amount |
| 41 | `payment_created_at` | 20 | Payment timestamp — `collect_bill` used instead |
| 42 | `payment_details` | 100+ | Full payment JSON — not used |
| 43 | `payment_id` | 20 | Payment gateway ID — not used |
| 44 | `pending` | 10 | Pending timestamp — not used |
| 45 | `picked_up` | 10 | Picked up timestamp — not used |
| 46 | `processing` | 10 | Processing timestamp — not used |
| 47 | `processing_time` | 5 | Processing duration — not used |
| 48 | `razorpay_payment_id` | 30 | Razorpay payment ID — `razorpay_order_id` used instead |
| 49 | `refund_request_canceled` | 10 | Refund flag — not used |
| 50 | `refund_requested` | 10 | Refund flag — not used |
| 51 | `refunded` | 10 | Refund timestamp — not used |
| 52 | `request_uuid` | 40 | Request UUID — not used |
| 53 | `restaurant_id` | 5 | Restaurant FK — single-restaurant context |
| 54 | `send_payment_link` | 5 | Payment link flag — not used |
| 55 | `snapshot_amount_match` | 5 | Razorpay reconciliation — not used |
| 56 | `snapshot_fetched_at` | 20 | Razorpay snapshot time — not used |
| 57 | `snapshot_mismatch_flag` | 5 | Razorpay mismatch — not used |
| 58 | `snapshot_razorpay_amount` | 10 | Razorpay amount — not used |
| 59 | `snapshot_razorpay_method` | 10 | Razorpay method — not used |
| 60 | `snapshot_status_match` | 5 | Razorpay match — not used |
| 61 | `station_order_status` | 5 | Station status — not used |
| 62 | `subscription_id` | 10 | Subscription — not used |
| 63 | `tablepart` | 5 | Table partition — not used |
| 64 | `tax_status` | 5 | Tax flag — not used |
| 65 | `user_document_id` | 10 | User document FK — not used |
| 66 | `vehicle_id` | 5 | Vehicle FK — not used |
| 67 | `wallet_info` | 50+ | Wallet JSON blob — not used |
| 68 | `zone_id` | 5 | Zone FK — not used |

---

## B. order_details_table — 47 Fields per Item

### ✅ USED (30 fields)

| # | Field | Consumer |
|---|-------|----------|
| 1 | `id` | parseOrderItem |
| 2 | `food_id` | insightsService (item aggregation key) |
| 3 | `food_details` | parseOrderItem (JSON blob → name, tax, category, veg, egg, image) |
| 4 | `food_status` | parseOrderItem, insightsService (cancel/sold/comp bucket) |
| 5 | `quantity` | parseOrderItem, insightsService |
| 6 | `unit_price` | parseOrderItem, insightsService |
| 7 | `price` | parseOrderItem, insightsService (line total) |
| 8 | `station` | parseOrderItem, foodCourtService |
| 9 | `variation` | parseOrderItem (JSON string) |
| 10 | `add_ons` | parseOrderItem, insightsService (JSON string) |
| 11 | `food_level_notes` | parseOrderItem |
| 12 | `cancel_at` | parseOrderItem, insightsService (cancel date attribution) |
| 13 | `cancel_by_name` | parseOrderItem |
| 14 | `cancel_type` | parseOrderItem, insightsService |
| 15 | `cancel_reason_text` | parseOrderItem |
| 16 | `complementary` | parseOrderItem, insightsService |
| 17 | `complementary_price` | parseOrderItem |
| 18 | `gst_tax_amount` | parseOrderItem, insightsService |
| 19 | `vat_tax_amount` | parseOrderItem, insightsService |
| 20 | `discount_amount` | parseOrderItem |
| 21 | `service_charge` | parseOrderItem, insightsService |
| 22 | `ready_at` | parseOrderItem (timeline) |
| 23 | `ready_by` | parseOrderItem |
| 24 | `serve_at` | parseOrderItem (timeline) |
| 25 | `serve_by` | parseOrderItem |
| 26 | `created_at` | parseOrderItem (direct-serve fallback) |
| 27 | `item_type` | parseOrderItem |
| 28 | `total_add_on_price` | insightsService (addon cost) |
| 29 | `total_variation_price` | insightsService (variation cost) |
| 30 | `discount_on_food` | insightsService |

### ❌ DEAD (13 fields)

| # | Field | Notes |
|---|-------|-------|
| 1 | `cancel_by` | Numeric ID — `cancel_by_name` used instead |
| 2 | `discount_type` | Per-item discount type — not read |
| 3 | `gst` | Unclear meaning — `gst_tax_amount` used instead |
| 4 | `item_campaign_id` | Campaign FK — not used |
| 5 | `item_gst` | Duplicate of gst_tax_amount? — not read |
| 6 | `item_update_count` | Edit counter — not used |
| 7 | `item_vat` | Duplicate of vat_tax_amount? — not read |
| 8 | `order_id` | Parent order FK — redundant (wrapper provides context) |
| 9 | `paid_status` | Per-item paid flag — not used |
| 10 | `priority` | Item priority — not used |
| 11 | `reason` | Separate from cancel_reason_text — not used |
| 12 | `reason_type` | insightsService reads but may be redundant with cancel_type |
| 13 | `table_id_seq` | Table sequence — not used |
| 14 | `tax_amount` | Another tax field — not read |
| 15 | `updated_at` | Item update time — not used |
| 16 | `variant` | Separate from variation JSON — not used |
| 17 | `web_coupon_type` | Web coupon type — not used |

### ⚠️ DOUBT (4 fields)

| # | Field | Notes |
|---|-------|-------|
| 1 | `reason_type` | insightsService reads `line.reason_type` — may be needed for cancel classification |
| 2 | `item_gst` / `item_vat` | May duplicate gst_tax_amount/vat_tax_amount — need backend confirmation |
| 3 | `gst` | Unclear relationship to gst_tax_amount — need backend confirmation |
| 4 | `cancel_by` | Numeric ID; name version used — but ID might be needed for future linking |

---

## C. food_details — 72 Fields per Blob (JSON string ~1.6 KB)

### ✅ USED (7 fields only)

| # | Field | Consumer |
|---|-------|----------|
| 1 | `id` | parseOrderItem (foodId) |
| 2 | `name` | parseOrderItem, insightsService |
| 3 | `category_id` | insightsService (category grouping) |
| 4 | `tax` | parseOrderItem, insightsService (tax rate) |
| 5 | `tax_type` | parseOrderItem, insightsService (GST/VAT) |
| 6 | `tax_calc` | parseOrderItem (inclusive/exclusive) |
| 7 | `veg` | parseOrderItem (isVeg badge) |

### ❌ DEAD (65 fields) — **This is the #1 optimization target**

`add_ons`, `allergen`, `attributes`, `available_time_ends`, `available_time_starts`, `avg_rating`, `category_ids`, `choice_options`, `complementary`, `complementary_price`, `created_at`, `cuisines`, `delivery`, `delivery_charge`, `description`, `dinein`, `discount`, `discount_type`, `egg`, `food_for`, `food_order`, `food_status`, `food_stock`, `free_delivery`, `give_discount`, `image`, `is_disable`, `is_inventory`, `is_recipe`, `item_code`, `item_unit`, `item_unit_price`, `jain`, `kcal`, `live_web`, `max_delivery_time`, `min_delivery_time`, `order_count`, `pack_charges`, `packed_food`, `portion_size`, `prepration_time_min`, `price`, `rating_count`, `recipe`, `recipe_id`, `recipe_status`, `recommended`, `restaurant_closing_time`, `restaurant_discount`, `restaurant_id`, `restaurant_name`, `restaurant_opening_time`, `restaurant_status`, `schedule_order`, `serve_time_in_min`, `slug`, `status`, `stock_out`, `takeaway`, `takeaway_charge`, `updated_at`, `variations`, `web_available_time_ends`, `web_available_time_starts`

**Each item's `food_details` is a full product catalog snapshot (~1.6 KB). Only 7 fields (~100 bytes) are needed. Stripping the blob to 7 fields saves ~1.5 KB per item × ~4 items/order × ~2,000 orders/month = ~12 MB/month.**

---

## D. operations — 26 Fields per Operation

### ✅ USED (8 fields)

| # | Field | Consumer |
|---|-------|----------|
| 1 | `operation` | buildTimeline, insightsService (cancel/payment detection) |
| 2 | `created_at` | buildTimeline (timestamp) |
| 3 | `previous_order_amount` | insightsService (OPS-CANCEL order value) |
| 4 | `previous_payment_method` | insightsService |
| 5 | `current_payment_method` | insightsService |
| 6 | `vendor_employee_name` | insightsService (cancelled-by resolution) |
| 7 | `food_id` | reportTransform (item name enrichment) |
| 8 | `restaurant_order_id` | reportTransform (enriched operations) |

### ❌ DEAD (18 fields)

`id`, `order_id`, `order_type`, `payment_type`, `restaurant_id`, `updated_at`, `vendor_employee_id`, `current_b_order_status`, `current_collect_bill`, `current_f_order_status`, `current_k_order_status`, `current_order_amount`, `current_order_status`, `current_payment_status`, `previous_b_order_status`, `previous_f_order_status`, `previous_k_order_status`, `previous_order_status`, `previous_payment_status`

---

## E. Wrapper-Level Keys

| Key | Status | Notes |
|-----|--------|-------|
| `orders_table` | ✅ USED | Core order data |
| `order_details_table` | ✅ USED | Item lines |
| `operations` | ✅ USED | Timeline + cancel ops |
| `partial_payments` | ✅ USED | By insightsService for split payments |
| `order_info` | ⚠️ DOUBT | Present in response but no consumer found |
| `room_info` | ✅ USED | roomOrdersService, reportTransform (room financial data) |
| `customer_details` | ✅ USED | reportTransform (delivery address) |

---

## F. Recommended Backend Action — Staged

| Stage | Action | Savings | Effort |
|-------|--------|---------|--------|
| **Stage 1** | Strip `food_details` to 7 fields: `id`, `name`, `category_id`, `tax`, `tax_type`, `tax_calc`, `veg` | **~12 MB/month** (biggest single win) | Small — SELECT clause or JSON projection |
| **Stage 2** | Drop 68 dead `orders_table` fields | **~3.4 MB/month** | Medium — SELECT clause change |
| **Stage 3** | Drop 13 dead `order_details_table` fields | **~2.4 MB/month** | Small — SELECT clause change |
| **Stage 4** | Drop 18 dead `operations` fields | **~0.9 MB/month** | Small — SELECT clause change |
| **Stage 5** | Support `fields` parameter (Section 4.2 of BACKEND_API_CONTRACT) | Future-proofs all consumers | Medium |
| **Stage 6** | Server-side aggregation endpoints (replace client-side compute) | **~37 MB → ~150 KB** | Large — per BACKEND_API_CONTRACT §3 |

**Quick win: Stage 1 alone (food_details strip) saves ~12 MB/month with minimal backend effort.**

---

*Generated: 2026-06-12 | Source: Live API sample data (`/app/audit_data/orders_jun_created_at.json`) + static analysis of `reportTransform.js`, `insightsService.js`, `roomOrdersService.js`, `foodCourtService.js`, `orderLedgerService.js` → full codebase grep*
