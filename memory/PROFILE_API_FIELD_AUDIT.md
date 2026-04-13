# Profile API — Complete Field-by-Field Mapping Audit

**Source:** `GET /api/v2/vendoremployee/vendor-profile/profile`
**Based on:** Actual API response from LV FOODS (Owner role, Feb 2026)
**Transform File:** `/app/frontend/src/api/transforms/profileTransform.js`

Legend:
- **MAPPED** = Field is extracted in `profileTransform.js` and consumed in UI
- **TRANSFORM ONLY** = Field is extracted in transform but not yet consumed in any UI component
- **MISSING** = Field exists in API but is NOT extracted in transform
- **NOT NEEDED** = Field is intentionally skipped (not relevant to POS frontend)

---

## 1. Top-Level User Fields

| # | API Field | Value (Example) | Transform Key | Stored In | UI Usage | Status |
|---|-----------|----------------|---------------|-----------|----------|--------|
| 1 | `id` | `713` | `user.ownerId` | `AuthContext.user` | Internal reference | **MAPPED** |
| 2 | `f_name` | `"Mahalakshmi"` | — | — | Not used (emp_f_name used instead) | **NOT NEEDED** |
| 3 | `l_name` | `""` | — | — | Not used (emp_l_name used instead) | **NOT NEEDED** |
| 4 | `phone` | `"5456712345"` | `user.phone` | `AuthContext.user` | Profile display | **MAPPED** |
| 5 | `email` | `"lv@mygenie.online"` | `user.email` (fallback) | `AuthContext.user` | Profile display | **MAPPED** |
| 6 | `email_verified_at` | `null` | — | — | — | **NOT NEEDED** |
| 7 | `created_at` | `"2025-12-19T06:02:56.000000Z"` | — | — | — | **NOT NEEDED** |
| 8 | `updated_at` | `"2026-04-03T10:14:43.000000Z"` | — | — | — | **NOT NEEDED** |
| 9 | `bank_name` | `null` | — | — | — | **NOT NEEDED** |
| 10 | `branch` | `null` | — | — | — | **NOT NEEDED** |
| 11 | `holder_name` | `null` | — | — | — | **NOT NEEDED** |
| 12 | `account_no` | `null` | — | — | — | **NOT NEEDED** |
| 13 | `image` | `null` | `user.image` | `AuthContext.user` | Sidebar avatar | **MAPPED** |
| 14 | `status` | `1` | — | — | — | **NOT NEEDED** |
| 15 | `firebase_token` | `null` | — | — | — | **NOT NEEDED** |
| 16 | `fcm_token_web` | `null` | — | — | — | **NOT NEEDED** |
| 17 | `pos` | `1` | — | — | Could gate POS access | **MISSING** |
| 18 | `userinfo` | `null` | — | — | — | **NOT NEEDED** |
| 19 | `vat_info` | `{"status": true, "code": ""}` | — | — | VAT configuration | **MISSING** |
| 20 | `category_ids` | `[5658, 4896, 5325, 5387]` | — | — | Employee's assigned category IDs | **MISSING** |

---

## 2. Employee Fields (Top-Level)

| # | API Field | Value (Example) | Transform Key | Stored In | UI Usage | Status |
|---|-----------|----------------|---------------|-----------|----------|--------|
| 21 | `emp_id` | `3592` | `user.employeeId` | `AuthContext.user` | Sent in order payloads | **MAPPED** |
| 22 | `role_name` | `"Owner"` | `user.roleName` | `AuthContext.user` | Sent in cancel/status APIs | **MAPPED** |
| 23 | `emp_f_name` | `"Owner"` | `user.firstName` | `AuthContext.user` | Sidebar, Header | **MAPPED** |
| 24 | `emp_l_name` | `null` | `user.lastName` | `AuthContext.user` | Sidebar | **MAPPED** |
| 25 | `emp_email` | `"owner@lv.com"` | `user.email` | `AuthContext.user` | Profile display | **MAPPED** |
| 26 | `default_user` | `"No"` | `user.isDefaultUser` | `AuthContext.user` | May affect permissions | **MAPPED** |
| 27 | `bill_user_view` | `"No"` | — | — | Whether user can view bills | **MISSING** |
| 28 | `edc_user` | `"No"` | — | — | EDC (card machine) access | **MISSING** |
| 29 | `station_role` | `null` | — | — | KDS station assignment | **MISSING** |
| 30 | `employee_last_order_id` | `"003137"` | — | — | Last order placed by employee | **MISSING** |

---

## 3. Role / Permissions Array

| # | API Field | Value (Example) | Transform Key | Stored In | UI Usage | Status |
|---|-----------|----------------|---------------|-----------|----------|--------|
| 31 | `role` | `["Manager", "food", "pos", ...]` (50+ strings) | `permissions` | `AuthContext.permissions` | `hasPermission()` checks | **MAPPED** |

### Individual Permission Strings in `role[]`:

| # | Permission | Description | UI Component | Status |
|---|-----------|-------------|--------------|--------|
| 31a | `Manager` | Manager-level access flag | General admin gate | **MISSING** — Not checked |
| 31b | `food` | Food operations (includes item cancel) | `CancelFoodModal` | **MISSING** — Not checked |
| 31c | `pos` | POS system access | Entire POS app gate | **MISSING** — Not checked |
| 31d | `order` | General order access | Dashboard Order View | **MISSING** — Not checked |
| 31e | `bill` | Billing / collect payment | Bill button, `CollectPaymentPanel` | **MISSING** — Not checked |
| 31f | `order_cancel` | Cancel entire order | OrderCard Cancel [X] button | **MAPPED** — `canCancelOrder` prop |
| 31g | `serve` | Mark order/items served | Serve button, item serve toggle | **MISSING** — Not checked |
| 31h | `aggregator` | Aggregator order access | Aggregator section | **MISSING** — Not checked |
| 31i | `show_online_order` | View online/aggregator orders | Dashboard online orders | **MISSING** — Not checked |
| 31j | `assign_online_order` | Accept/assign online orders | Accept/Reject buttons | **MISSING** — Not checked |
| 31k | `order_unpaid` | View unpaid orders | Report filters | **MISSING** — Not checked |
| 31l | `update_payment` | Update payment on order | Payment edits | **MISSING** — Not checked |
| 31m | `order_edit` | Edit/update existing order | OrderCard tap → OrderEntry | **MISSING** — Card tap not gated |
| 31n | `delivery_man` | Delivery person assignment | Assign delivery flow | **MISSING** — Not checked |
| 31o | `clear_payment` | Clear/void a payment | Payment void action | **MISSING** — Not checked |
| 31p | `Ready` | Mark order/items ready (CAPITAL R) | Ready button, item ready toggle | **MISSING** — Not checked |
| 31q | `customer_management` | Customer search/add | `CustomerModal` | **MISSING** — Not checked |
| 31r | `virtual_wallet` | Customer wallet operations | Wallet payment option | **MISSING** — Not checked |
| 31s | `discount` | Apply discounts | Discount section in OrderEntry | **MISSING** — Not checked |
| 31t | `transfer_table` | Shift order to another table | OrderCard Shift button | **MAPPED** — `canShiftTable` prop |
| 31u | `merge_table` | Merge orders from two tables | OrderCard Merge button | **MAPPED** — `canMergeOrder` prop |
| 31v | `food_transfer` | Transfer item between tables | OrderCard Food Transfer icon | **MAPPED** — `canFoodTransfer` prop |
| 31w | `whatsapp_icon` | Show WhatsApp icon | Header/Footer WhatsApp | **MISSING** — Not checked |
| 31x | `print_icon` | Print bill/KOT | KOT button, Bill print | **MISSING** — Phase 2 |
| 31y | `table_view` | View tables on dashboard | Table grid visibility | **MISSING** — Not checked |
| 31z | `employee` | Employee management | Sidebar → Employees | **MISSING** — Not checked |
| 31aa | `restaurant_setup` | Restaurant setup/config | Sidebar → Setup | **MISSING** — Not checked |
| 31ab | `inventory` | Inventory management | Sidebar → Inventory | **MISSING** — Not checked |
| 31ac | `coupon` | Coupon management | Settings → Coupons | **MISSING** — Not checked |
| 31ad | `printer` | Printer access | Settings → Printers | **MISSING** — Not checked |
| 31ae | `menu` | Menu management | Sidebar → Menu | **MISSING** — Not checked |
| 31af | `expence` | Expense tracking (API typo) | Sidebar → Expenses | **MISSING** — Not checked |
| 31ag | `Loyalty` | Loyalty program (CAPITAL L) | Loyalty features | **MISSING** — Not checked |
| 31ah | `restaurant_settings` | Restaurant settings | Sidebar → Settings | **MISSING** — Not checked |
| 31ai | `printer_management` | Printer configuration | Settings → Printer config | **MISSING** — Not checked |
| 31aj | `table_management` | Table layout management | Sidebar → Table mgmt | **MISSING** — Not checked |
| 31ak | `delivery_management` | Delivery config | Sidebar → Delivery config | **MISSING** — Not checked |
| 31al | `physicalqty_master` | Physical quantity master | Inventory → Physical QTY | **MISSING** — Not checked |
| 31am | `report` | General report access | Sidebar → Reports | **MISSING** — Not checked |
| 31an | `report_summery` | Summary report (API typo) | Reports → Summary tab | **MISSING** — Not checked |
| 31ao | `waiter_revenue_report` | Waiter revenue report | Reports → Waiter tab | **MISSING** — Not checked |
| 31ap | `sattle_report` | Settlement report (API typo) | Reports → Settlement tab | **MISSING** — Not checked |
| 31aq | `revenue_report` | Revenue report | Reports → Revenue tab | **MISSING** — Not checked |
| 31ar | `room_report` | Room report | Reports → Room tab | **MISSING** — Not checked |
| 31as | `sales_report` | Sales report | Reports → Sales tab | **MISSING** — Not checked |
| 31at | `revenue_report_average` | Average revenue report | Reports → Average tab | **MISSING** — Not checked |
| 31au | `consumption_report` | Consumption report | Reports → Consumption tab | **MISSING** — Not checked |
| 31av | `cancellation_report` | Cancellation report | Reports → Cancellation tab | **MISSING** — Not checked |
| 31aw | `pl_report` | P&L report | Reports → P&L tab | **MISSING** — Not checked |
| 31ax | `wastage_report` | Wastage report | Reports → Wastage tab | **MISSING** — Not checked |

---

## 4. Restaurant Object (`restaurants[0]`)

### 4.1 Identity & Basic Info

| # | API Field | Value (Example) | Transform Key | UI Usage | Status |
|---|-----------|----------------|---------------|----------|--------|
| 32 | `id` | `690` | `restaurant.id` | Socket channel subscriptions, API payloads | **MAPPED** |
| 33 | `name` | `"LV FOODS"` | `restaurant.name` | Header, Sidebar | **MAPPED** |
| 34 | `phone` | `"5456712345"` | `restaurant.phone` | Profile display | **MAPPED** |
| 35 | `report_number` | `"5456712345"` | — | Report phone number | **MISSING** |
| 36 | `email` | `"lv@mygenie.online"` | `restaurant.email` | Profile display | **MAPPED** |
| 37 | `logo` | `"2025-12-23-694a003752b2e.png"` | `restaurant.logo` | Header/Sidebar logo | **MAPPED** |
| 38 | `latitude` | `"14.998562968578792"` | — | Map/location | **NOT NEEDED** |
| 39 | `longitude` | `"74.02569559193228"` | — | Map/location | **NOT NEEDED** |
| 40 | `address` | `"BETHAL NAGAR ROAD..."` | `restaurant.address` | Bill display | **MAPPED** |
| 41 | `footer_text` | `"Thank you! Please visit us again soon."` | — | Bill footer | **MISSING** |
| 42 | `minimum_order` | `0` | — | Min order validation | **MISSING** |
| 43 | `comission` | `null` | — | — | **NOT NEEDED** |
| 44 | `schedule_order` | `false` | — | Enable scheduled orders | **MISSING** |
| 45 | `status` | `1` | — | Restaurant active status | **NOT NEEDED** |
| 46 | `vendor_id` | `713` | — | — | **NOT NEEDED** |
| 47 | `free_delivery` | `false` | — | Free delivery flag | **MISSING** |
| 48 | `cover_photo` | `null` | `restaurant.coverPhoto` | — | **MAPPED** |
| 49 | `slug` | `"lv"` | — | URL slug | **NOT NEEDED** |
| 50 | `order_count` | `0` | — | — | **NOT NEEDED** |
| 51 | `total_order` | `0` | — | — | **NOT NEEDED** |
| 52 | `restaurant_model` | `"commission"` | — | Business model | **NOT NEEDED** |
| 53 | `order_subscription_active` | `false` | — | Subscription feature | **NOT NEEDED** |
| 54 | `business_type` | `"restaurant"` | — | — | **NOT NEEDED** |
| 55 | `description` | `null` | — | — | **NOT NEEDED** |
| 56 | `is_demo` | `0` | — | Demo flag | **NOT NEEDED** |
| 57 | `restaurant_status` | `1` | — | — | **NOT NEEDED** |
| 58 | `available_time_starts` | `"10:00"` | — | Operating hours | **MISSING** |
| 59 | `available_time_ends` | `"23:00"` | — | Operating hours | **MISSING** |
| 60 | `zone_id` | `16` | — | — | **NOT NEEDED** |
| 61 | `web_url` | `""` | — | — | **NOT NEEDED** |
| 62 | `cuisine_id` | `null` | — | — | **NOT NEEDED** |
| 63 | `live` | `1` | — | — | **NOT NEEDED** |

### 4.2 Feature Flags

| # | API Field | Value | Transform Key | UI Usage | Status |
|---|-----------|-------|---------------|----------|--------|
| 64 | `dine_in` | `"Yes"` | `features.dineIn` | Show/hide Dine-In section | **MAPPED** |
| 65 | `delivery` | `true` | `features.delivery` | Show/hide Delivery section | **MAPPED** |
| 66 | `take_away` | `true` | `features.takeaway` | Show/hide TakeAway section | **MAPPED** |
| 67 | `room` | `"No"` | `features.room` | Show/hide Rooms | **MAPPED** |
| 68 | `inventory` | `"No"` | `features.inventory` | Enable inventory management | **MAPPED** |
| 69 | `tip` | `"Yes"` | `features.tip` | Show tip input in payment | **MAPPED** |
| 70 | `service_charge` | `"No"` | `features.serviceCharge` | Apply service charge | **MAPPED** |
| 71 | `food_section` | `true` | — | — | **NOT NEEDED** |
| 72 | `reviews_section` | `true` | — | — | **NOT NEEDED** |
| 73 | `active` | `true` | — | — | **NOT NEEDED** |
| 74 | `complementary` | `"No"` | — | Enable complementary items | **MISSING** |
| 75 | `food_for` | `"Normal"` | — | Food type context | **MISSING** |

### 4.3 Tax & GST

| # | API Field | Value | Transform Key | UI Usage | Status |
|---|-----------|-------|---------------|----------|--------|
| 76 | `tax` | `0` | `tax.percentage` | Tax calculation | **MAPPED** |
| 77 | `gst_tax` | `"0.00"` | `tax.gstPercentage` | GST calculation | **MAPPED** |
| 78 | `gst_code` | `""` | `tax.gstCode` | GST code display | **MAPPED** |
| 79 | `gst_status` | `false` | — | GST enabled flag | **MISSING** |
| 80 | `restaurent_gst` | `"restaurant"` | — | GST type | **MISSING** |
| 81 | `fssai` | `""` | — | FSSAI number for bill | **MISSING** |
| 82 | `tip_tax` | `"0.00"` | — | Tax on tips | **MISSING** |
| 83 | `service_charge_percentage` | `"0.00"` | — | Service charge % | **MISSING** |
| 84 | `service_charge_tax` | `"0.00"` | — | Tax on service charge | **MISSING** |

### 4.4 Payment Configuration

| # | API Field | Value | Transform Key | UI Usage | Status |
|---|-----------|-------|---------------|----------|--------|
| 85 | `pay_cash` | `"Yes"` | `paymentMethods.cash` | Show Cash option | **MAPPED** |
| 86 | `pay_upi` | `"Yes"` | `paymentMethods.upi` | Show UPI option | **MAPPED** |
| 87 | `pay_cc` | `"Yes"` | `paymentMethods.card` | Show Card option | **MAPPED** |
| 88 | `pay_tab` | `"No"` | `paymentMethods.tab` | Show Tab/Credit option | **MAPPED** |
| 89 | `currency` | `"INR"` | `restaurant.currency` | Currency display | **MAPPED** |
| 90 | `upi_id` | `"gpay-12194016877@okbizaxis"` | — | UPI payment QR | **MISSING** |
| 91 | `dynamic_upi_value` | `"Yes"` | — | Dynamic UPI amount | **MISSING** |
| 92 | `order_payment_type` | `"both"` | — | Prepaid/postpaid/both | **MISSING** |
| 93 | `online_payment` | `"No"` | — | Online payment gateway | **MISSING** |
| 94 | `show_cash_on_delivery` | `"Yes"` | — | COD option | **MISSING** |
| 95 | `razorpay` | `null` | — | Razorpay config | **NOT NEEDED** |

### 4.5 Cancellation Settings

| # | API Field | Value | Transform Key | UI Usage | Status |
|---|-----------|-------|---------------|----------|--------|
| 96 | `cancle_post_serve` | `"Yes"` | `cancellation.allowPostServeCancel` | Gate cancel on served items | **TRANSFORM ONLY** — UI check missing |
| 97 | `allow_cancel_post_server` | `"Yes"` | `cancellation.allowPostServeCancel2` | Redundant gate | **TRANSFORM ONLY** — UI check missing |
| 98 | `cancel_order_time` | `5` | `cancellation.orderCancelWindowMinutes` | Time window for order cancel (5 min) | **TRANSFORM ONLY** — UI check missing |
| 99 | `cancel_food_timings` | `5` | `cancellation.itemCancelWindowMinutes` | Time window for item cancel (5 min) | **TRANSFORM ONLY** — UI check missing |

### 4.6 Order & Display Settings

| # | API Field | Value | Transform Key | UI Usage | Status |
|---|-----------|-------|---------------|----------|--------|
| 100 | `def_ord_status` | `5` | — | Default order status on creation | **MISSING** |
| 101 | `discount_type` | `"Percent"` | — | Default discount type | **MISSING** |
| 102 | `discount_text` | `"Discount"` | — | Discount label text | **MISSING** |
| 103 | `off_day` | `" "` | — | Restaurant off days | **MISSING** |
| 104 | `delivery_time` | `"-"` | — | Delivery time estimate | **MISSING** |
| 105 | `veg` | `1` | — | Veg items available | **NOT NEEDED** |
| 106 | `non_veg` | `1` | — | Non-veg items available | **NOT NEEDED** |
| 107 | `self_delivery_system` | `0` | — | Self delivery flag | **MISSING** |
| 108 | `pos_system` | `false` | — | POS enabled flag | **MISSING** |
| 109 | `minimum_shipping_charge` | `0` | — | Min shipping charge | **MISSING** |
| 110 | `per_km_shipping_charge` | `null` | — | Per-km shipping | **MISSING** |
| 111 | `maximum_shipping_charge` | `null` | — | Max shipping | **MISSING** |
| 112 | `total_round` | `"Yes"` | — | Round bill totals | **MISSING** |
| 113 | `food_price_with_paisa` | `"No"` | — | Show paisa in prices | **MISSING** |
| 114 | `food_different_price` | `"No"` | — | Different prices per channel | **MISSING** |
| 115 | `available_discount` | `"Yes"` | — | Discounts enabled | **MISSING** |

### 4.7 Printing & KOT Settings

| # | API Field | Value | Transform Key | UI Usage | Status |
|---|-----------|-------|---------------|----------|--------|
| 116 | `print_kot` | `"No"` | — | Auto-print KOT | **MISSING** |
| 117 | `printing_option` | `"Station"` | — | Print by station/order | **MISSING** |
| 118 | `printing_in_kds` | `"Yes"` | — | Print in KDS | **MISSING** |
| 119 | `voice_in_kds` | `"Yes"` | — | Voice alerts in KDS | **MISSING** |
| 120 | `list_serve_item` | `"Dynamic"` | — | Served item list style | **MISSING** |
| 121 | `billing_emp` | `"Yes"` | — | Show biller on bill | **MISSING** |
| 122 | `show_address_on_bill` | `"No"` | — | Address on bill | **MISSING** |
| 123 | `billing_auto_bill_print` | `"No"` | — | Auto-print bill | **MISSING** |
| 124 | `bill_date_format` | `"dd/MM/yyyy hh:mm"` | — | Date format on bill | **MISSING** |
| 125 | `bill_logo` | `"2025-12-19-694533a572833.png"` | — | Bill-specific logo | **MISSING** |

### 4.8 Delivery Settings

| # | API Field | Value | Transform Key | UI Usage | Status |
|---|-----------|-------|---------------|----------|--------|
| 126 | `delivery_contact_no` | `"8951817537"` | — | Delivery contact | **MISSING** |
| 127 | `delivery_person_name` | `"Mahalakshmi"` | — | Default delivery person | **MISSING** |
| 128 | `delivery_fee` | `"Yes"` | — | Charge delivery fee | **MISSING** |
| 129 | `delivery_assign` | `"No"` | — | Auto-assign delivery | **MISSING** |
| 130 | `free_delivery_amt` | `"0.00"` | — | Free delivery threshold | **MISSING** |
| 131 | `free_delivery_km` | `0` | — | Free delivery distance | **MISSING** |
| 132 | `surcharge` | `"Yes"` | — | Surcharge enabled | **MISSING** |

### 4.9 Customer & UI Settings

| # | API Field | Value | Transform Key | UI Usage | Status |
|---|-----------|-------|---------------|----------|--------|
| 133 | `feed_back` | `"No"` | — | Feedback enabled | **MISSING** |
| 134 | `feedback_url` | `""` | — | Feedback URL | **MISSING** |
| 135 | `send_feedback_link` | `"internal"` | — | Feedback link type | **MISSING** |
| 136 | `food_date` | `"No"` | — | Show food date | **MISSING** |
| 137 | `food_level_notes` | `"Yes"` | — | Enable item-level notes | **MISSING** |
| 138 | `show_popular_category` | `"Yes"` | — | Show popular category | **MISSING** |
| 139 | `show_food_varriance` | `"Yes"` | — | Show food variants (API typo) | **MISSING** |
| 140 | `show_ac_non_menu` | `"No"` | — | Show AC/Non-AC menu | **MISSING** |
| 141 | `search_food` | `"Search Food"` | — | Search placeholder text | **MISSING** |
| 142 | `pos_view` | `"No"` | — | POS view mode | **MISSING** |
| 143 | `configuration` | `"Simple"` | — | Configuration mode | **MISSING** |
| 144 | `set_restaurant_type` | `"Restaurant"` | — | Restaurant type | **MISSING** |
| 145 | `restaurant_type` | `"Restaurant"` | — | Restaurant type (duplicate) | **MISSING** |
| 146 | `search_by` | `["table no", "user id"]` | `restaurant.searchOptions` | Search filter options | **MAPPED** |
| 147 | `station_display_type` | `"Yes"` | — | Station display config | **MISSING** |
| 148 | `food_timings` | `"0"` | — | Food timing config | **MISSING** |
| 149 | `scanners_for_tables` | `"No"` | — | QR scanner for tables | **MISSING** |
| 150 | `weblive` | `0` | — | Web live flag | **NOT NEEDED** |
| 151 | `auto_prepaid_order` | `"No"` | — | Auto-prepaid flow | **MISSING** |

### 4.10 Room Settings

| # | API Field | Value | Transform Key | UI Usage | Status |
|---|-----------|-------|---------------|----------|--------|
| 152 | `room_price` | `"No"` | — | Room pricing enabled | **MISSING** |
| 153 | `guest_details` | `"Yes"` | — | Guest details required | **MISSING** |
| 154 | `booking_details` | `"Yes"` | — | Booking details required | **MISSING** |
| 155 | `room_billing_included` | `"Yes"` | — | Room billing included | **MISSING** |
| 156 | `room_gst_applicable` | `"No"` | — | GST on room charges | **MISSING** |

### 4.11 OTP & Confirmation

| # | API Field | Value | Transform Key | UI Usage | Status |
|---|-----------|-------|---------------|----------|--------|
| 157 | `order_confirm_for_web` | `"Yes"` | — | Order confirm for web POS | **MISSING** |
| 158 | `real_time_order_status` | `"No"` | — | Real-time status to customer | **MISSING** |
| 159 | `show_real_status_to_customer` | `"No"` | — | Duplicate of above | **MISSING** |
| 160 | `dinein_otp_require` | `"Yes"` | — | OTP for dine-in | **MISSING** |
| 161 | `room_otp_require` | `"Yes"` | — | OTP for room | **MISSING** |
| 162 | `dinein_number` | `"No"` | — | Dine-in number display | **MISSING** |
| 163 | `confirm_order_show_tab` | `"No"` | — | Show confirm on tab | **MISSING** |
| 164 | `confirm_order_ringer` | `"Yes"` | — | Ring on new order | **MISSING** |
| 165 | `tone_timing` | `2` | — | Ringer tone duration (seconds) | **MISSING** |

### 4.12 Address & Validation

| # | API Field | Value | Transform Key | UI Usage | Status |
|---|-----------|-------|---------------|----------|--------|
| 166 | `validate_address_from_google` | `"Yes"` | — | Google address validation | **MISSING** |
| 167 | `show_user_gst` | `"No"` | — | Show user GST number | **MISSING** |
| 168 | `is_ready` | `"No"` | — | Ready state flag | **MISSING** |

### 4.13 Live Payment Config

| # | API Field | Value | Transform Key | UI Usage | Status |
|---|-----------|-------|---------------|----------|--------|
| 169 | `live_payment.walkin_online_payment` | `"No"` | — | Online payment for walk-in | **MISSING** |
| 170 | `live_payment.dinein_online_payment` | `"No"` | — | Online payment for dine-in | **MISSING** |
| 171 | `live_payment.takeaway_online_payment` | `"No"` | — | Online payment for takeaway | **MISSING** |
| 172 | `live_payment.delivery_online_payment` | `"No"` | — | Online payment for delivery | **MISSING** |

### 4.14 Empty/Null Collections

| # | API Field | Value | Transform Key | UI Usage | Status |
|---|-----------|-------|---------------|----------|--------|
| 173 | `coupons` | `[]` | — | Active coupons | **MISSING** |
| 174 | `cuisine` | `[]` | — | Cuisine tags | **NOT NEEDED** |
| 175 | `positive_rating` | `0` | — | — | **NOT NEEDED** |
| 176 | `avg_rating` | `0` | — | — | **NOT NEEDED** |
| 177 | `rating_count` | `0` | — | — | **NOT NEEDED** |
| 178 | `discount` | `null` | — | Active discount | **MISSING** |
| 179 | `reported_by` | `"created_at"` | — | Report date field | **MISSING** |
| 180 | `settelment_report` | `"No"` | — | Settlement report flag | **MISSING** |
| 181 | `sales_id` | `null` | — | — | **NOT NEEDED** |
| 182 | `outlet_type` | `null` | — | — | **NOT NEEDED** |
| 183 | `pdf_menu` | `null` | — | — | **NOT NEEDED** |
| 184 | `auto_service_charge` | `"No"` | — | Auto service charge | **MISSING** |
| 185 | `inventory_alert_number` | `""` | — | Inventory alert phone | **MISSING** |
| 186 | `inventory_negative` | `"No"` | — | Allow negative inventory | **MISSING** |
| 187 | `is_loyality` | `"No"` | — | Loyalty program (restaurant level) | **MISSING** |
| 188 | `terms_conditions` | `[]` | — | T&C text | **NOT NEEDED** |

---

## 5. Nested Objects

### 5.1 Schedules (`restaurants[0].schedules[]`)

| # | API Field | Value | Transform Key | UI Usage | Status |
|---|-----------|-------|---------------|----------|--------|
| 189 | `id` | `5325` | `schedules[].id` | Internal ref | **MAPPED** |
| 190 | `day` | `0-6` | `schedules[].day` | Day index | **MAPPED** |
| 191 | `opening_time` | `"06:00:00"` | `schedules[].openingTime` | Operating hours | **MAPPED** |
| 192 | `closing_time` | `"03:00:00"` | `schedules[].closingTime` | Operating hours | **MAPPED** |

### 5.2 Payment Types (`restaurants[0].payment_types[]`)

| # | API Field | Value | Transform Key | UI Usage | Status |
|---|-----------|-------|---------------|----------|--------|
| 193 | `id` | `1` | `paymentTypes[].id` | Payment ID | **MAPPED** |
| 194 | `name` | `"cash"` | `paymentTypes[].name` | Internal name | **MAPPED** |
| 195 | `display_name` | `"Cash"` | `paymentTypes[].displayName` | Display label | **MAPPED** |

### 5.3 Settings Object (`restaurants[0].settings`)

| # | API Field | Value | Transform Key | UI Usage | Status |
|---|-----------|-------|---------------|----------|--------|
| 196 | `is_coupon` | `"Yes"` | `settings.isCoupon` | Show coupon input | **MAPPED** |
| 197 | `is_loyality` | `"No"` | `settings.isLoyalty` | Show loyalty section | **MAPPED** |
| 198 | `is_customer_wallet` | `"No"` | `settings.isCustomerWallet` | Show wallet option | **MAPPED** |
| 199 | `aggregator_auto_kot` | `"Yes"` | `settings.aggregatorAutoKot` | Auto KOT for aggregator | **MAPPED** |
| 200 | `default_prep_time` | `15` | `settings.defaultPrepTime` | Default prep time (min) | **MAPPED** |
| 201 | `aggregator_auto_bill` | `"No"` | — | Auto bill for aggregator | **MISSING** |
| 202 | `aggregator_auto_bill_stage` | `"Ready"` | — | Stage to auto-bill | **MISSING** |
| 203 | `auto_dispatch` | `"No"` | — | Auto dispatch orders | **MISSING** |
| 204 | `auto_prep_time_ack` | `"No"` | — | Auto-acknowledge prep time | **MISSING** |
| 205 | `confirm_order_tone` | `"default"` | — | Tone for new orders | **MISSING** |
| 206 | `aggregator_order_tone` | `"buzzer"` | — | Tone for aggregator | **MISSING** |
| 207 | `service_chrg_taxt` | `"Service Charge"` | — | Service charge label | **MISSING** |
| 208 | `show_user_gst` | `"No"` | — | Show user GST | **MISSING** |
| 209 | `deliver_charge_gst` | `"5.00"` | — | GST on delivery charge | **MISSING** |
| 210 | `role_base_discount` | `"No"` | — | Role-based discount limits | **MISSING** |
| 211 | `short_code` | `"No"` | — | Short code display | **MISSING** |
| 212 | `order_auto_serve` | `"No"` | — | Auto-mark as served | **MISSING** |
| 213 | `is_category_box` | `"Yes"` | — | Category box UI style | **MISSING** |
| 214 | `is_banner` | `"Yes"` | — | Show banners | **MISSING** |
| 215 | `restaurant_for` | `"Normal"` | — | Restaurant mode | **MISSING** |
| 216 | `prep_time_count_method` | `"quantity"` | — | Prep time calculation | **MISSING** |
| 217 | `prep_time_bonus_config` | `null` | — | Bonus prep time config | **MISSING** |
| 218 | `no_of_kot` | `"1"` | — | Number of KOT copies | **MISSING** |
| 219 | `no_of_bill` | `"1"` | — | Number of bill copies | **MISSING** |
| 220 | `auto_paid` | `"No"` | — | Auto mark as paid | **MISSING** |
| 221 | `online_order` | `"Yes"` | — | Online ordering enabled | **MISSING** |
| 222 | `multiple_menu` | `"No"` | — | Multiple menus | **MISSING** |
| 223 | `print_bill_customer_copy` | `"No"` | — | Print customer copy | **MISSING** |

### 5.4 EDC Config (`restaurants[0].edc`)

| # | API Field | Value | Transform Key | UI Usage | Status |
|---|-----------|-------|---------------|----------|--------|
| 224 | `edc_pinelab` | `"No"` | — | Pinelab EDC enabled | **MISSING** |
| 225 | `edc_type` | `"Pinelab"` | — | EDC device type | **MISSING** |
| 226 | `edc_pinelab_key` | `{StoreId, ClientId, ...}` | — | Pinelab API keys | **MISSING** |

### 5.5 Discount Types (`restaurant_discount_type[]`)

| # | API Field | Value | Transform Key | UI Usage | Status |
|---|-----------|-------|---------------|----------|--------|
| 227 | `restaurant_discount_type` | `[]` (empty for this restaurant) | `restaurant.discountTypes` | Discount options in payment | **MAPPED** |

---

## 6. Printer Configuration

### 6.1 Printer Definitions (`restaurant_printer_new[]`)

| # | API Field | Value | Transform Key | UI Usage | Status |
|---|-----------|-------|---------------|----------|--------|
| 228 | `id` | `1201` | `printers[].id` | Printer ID | **MAPPED** |
| 229 | `area_name` | `"KDS"` | `printers[].name` | Printer/station name | **MAPPED** (mapped as `printer_name` though, see note) |
| 230 | `printer_type` | `"online"` | `printers[].type` | Connection type | **MAPPED** |
| 231 | `printer_name` | `"usb"` | `printers[].name` | Device name | **MAPPED** |
| 232 | `printer_ip` | `null` | — | Wired IP | **MISSING** |
| 233 | `wifi_printer_ip` | `null` | — | WiFi IP | **MISSING** |
| 234 | `wifi_printer_name` | `"Counter2"` | — | WiFi printer name | **MISSING** |
| 235 | `mac_printer_ip` | `null` | — | MAC address | **MISSING** |
| 236 | `printer_paper_roll` | `80` | `printers[].paperSize` | Paper size (mm) | **MAPPED** |
| 237 | `categories_id` | `[4896, 5325, ...]` | `printers[].categoryIds` | Assigned categories | **MAPPED** |

**Note:** Transform uses `printer_name` but the actual station name is in `area_name` (KDS, BAR, BILL). Need to verify which field is correct.

### 6.2 Printer Config (Android/Windows)

| # | API Field | Status |
|---|-----------|--------|
| 238 | `restaurant_printer_config[]` | **MISSING** — Android print layout config (58mm/80mm) not mapped |
| 239 | `restaurant_printer_windows_config[]` | **MISSING** — Windows print layout config not mapped |

These contain bill formatting settings (title, logo, address, GST, footer, etc.) for Phase 2 (Bill Print).

---

## 7. Other Top-Level Fields

| # | API Field | Value | Transform Key | UI Usage | Status |
|---|-----------|-------|---------------|----------|--------|
| 240 | `auto_kot_id` | `[]` | — | Auto-KOT food IDs | **MISSING** |

---

## Summary Statistics

| Category | Total Fields | MAPPED | TRANSFORM ONLY | MISSING | NOT NEEDED |
|----------|-------------|--------|----------------|---------|------------|
| User Identity | 20 | 8 | 0 | 4 | 8 |
| Employee | 10 | 6 | 0 | 4 | 0 |
| Permissions (role[]) | 50 | 4 | 0 | 46 | 0 |
| Restaurant Identity | 32 | 8 | 0 | 10 | 14 |
| Feature Flags | 12 | 7 | 0 | 3 | 2 |
| Tax & GST | 9 | 3 | 0 | 6 | 0 |
| Payment Config | 11 | 5 | 0 | 5 | 1 |
| Cancellation | 4 | 0 | 4 | 0 | 0 |
| Order & Display | 16 | 1 | 0 | 14 | 1 |
| Printing & KOT | 10 | 0 | 0 | 10 | 0 |
| Delivery | 7 | 0 | 0 | 7 | 0 |
| Customer & UI | 19 | 0 | 0 | 18 | 1 |
| Room | 5 | 0 | 0 | 5 | 0 |
| OTP & Confirmation | 9 | 0 | 0 | 9 | 0 |
| Live Payment | 4 | 0 | 0 | 4 | 0 |
| Collections | 16 | 0 | 0 | 8 | 8 |
| Schedules | 4 | 4 | 0 | 0 | 0 |
| Payment Types | 3 | 3 | 0 | 0 | 0 |
| Settings Object | 28 | 5 | 0 | 23 | 0 |
| EDC | 3 | 0 | 0 | 3 | 0 |
| Discount Types | 1 | 1 | 0 | 0 | 0 |
| Printers | 10 | 6 | 0 | 4 | 0 |
| Printer Config | 2 | 0 | 0 | 2 | 0 |
| **TOTAL** | **~240** | **~61** | **4** | **~140** | **~35** |

**Coverage: ~27% mapped, ~58% missing, ~15% not needed**
