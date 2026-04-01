# API Field Mapping Document

> Last Updated: 2026-03-30
> Status: Phase 4A — Order Reports complete. Room Integration (Phase 2A/2B) complete. All core POS features wired.

---

## Phase 1C — New Endpoints Added

### `POST /api/v1/vendoremployee/pos/order-table-room-switch` — Shift Table
**Transform:** `tableTransform.toAPI.shiftTable(currentTable, targetTable)`

| Payload Field | Frontend Source | Notes |
|---|---|---|
| `order_id` | `currentTable.orderId` | Current order ID |
| `old_table_id` | `currentTable.tableId` | Table shifting FROM |
| `new_table_id` | `targetTable.tableId` | Selected free table |
| `order_edit_count` | `currentTable.amount` | Grand total of existing order (`order_amount`) |

---

### `POST /api/v2/vendoremployee/transfer-order` — Merge Table
**Transform:** `tableTransform.toAPI.mergeTable(currentTable, sourceOrder)`

| Payload Field | Frontend Source | Notes |
|---|---|---|
| `source_order_id` | `sourceOrder.orderId` | Order being dissolved (selected table) |
| `target_order_id` | `currentTable.orderId` | Current table — survives merge |
| `transfer_note` | `"Yes"` (fixed) | Always transfers notes |

Called once per selected source table (multi-select = N sequential calls).

---

### `POST /api/v2/vendoremployee/transfer-food-item` — Transfer Food Item
**Transform:** `tableTransform.toAPI.transferFood(currentTable, targetOrder, item)`

| Payload Field | Frontend Source | Notes |
|---|---|---|
| `source_order_id` | `currentTable.orderId` | Order item is coming FROM |
| `target_order_id` | `targetOrder.orderId` (OrderContext lookup) | Order item is going TO |
| `food_item_id` | `item.id` | `orderDetails[].id` — order line item |

---

### `PUT /api/v2/vendoremployee/cancel-food-item` — Cancel Item (Full) ⏸️ PARKED
**Transform:** `orderTransform.toAPI.cancelItemFull(currentTable, item, reason)`
**Status:** Code implemented, API returns 404 — needs backend investigation

| Payload Field | Frontend Source | Notes |
|---|---|---|
| `order_id` | `currentTable.orderId` | Order ID |
| `order_food_id` | `item.id` | `orderDetails[].id` |
| `item_id` | `item.foodId` | `food_details.id` (catalog ID) |
| `order_status` | `"cancelled"` (fixed) | Always cancelled |
| `reason_type` | `"customer"` (fixed) | Always customer |
| `reason` | `reason.reasonText` | From cancellation reasons API |
| `cancel_type` | `"full"` (fixed) | Full cancel |

---

### `POST /api/v2/vendoremployee/restaurant-customer-list` — Customer Search (CHG-036)
**Transform:** `customerTransform.toAPI.searchCustomer(query)` + `customerTransform.fromAPI.customerList()`

| Direction | Field | Notes |
|---|---|---|
| Request | `key: [query]` | Array with search term (phone or name) |
| Response | `customer_list[].id` → `customerId` | |
| Response | `customer_list[].customer_name` → `name` | Full name (NOT f_name/l_name) |
| Response | `customer_list[].phone` → `phone` | |
| Parked (Phase 3) | loyalty_point, wallet_balance, date_of_birth, anniversary, membership_id | |

---

### `POST /api/v2/vendoremployee/pos/place-order` — Place Order (CHG-037)
**Transform:** `orderTransform.toAPI.placeOrder(table, cartItems, customer, orderType, options)`
**CRITICAL:** Uses `application/x-www-form-urlencoded` with `data` key (NOT JSON) — must set explicit Content-Type header in Axios call

| Payload Field | Frontend Source | Notes |
|---|---|---|
| `restaurant_id` | `restaurant.id` from RestaurantContext | |
| `cust_name` | `customer?.name \|\| (walkIn ? 'Walk-In Customer' : '')` | Empty for dineIn with no customer |
| `order_type` | `dineIn/walkIn→"dinein"`, `takeAway→"take_away"`, `delivery→"delivery"` | |
| `order_note` | `orderNotes.map(n => n.label).join(', ')` | |
| `order_amount` | `total` | Computed in OrderEntry |
| `payment_method` | `"cash_on_delivery"` | Fixed default |
| `table_id` | `table.tableId \|\| 0` | 0 for walk-in |
| `print_kot` | `printAllKOT ? "Yes" : "No"` | From KOT toggle |
| `cart[].food_id` | `item.id` | Product catalog ID |
| `cart[].quantity` | `item.qty` | |
| `cart[].price` | `item.price` | Unit price |
| `cart[].station` | `item.station.toUpperCase()` | |
| `cart[].addons_total` | Sum of `addon.price × addon.qty` | 0 if no addons |
| `cart[].variation_total` | `selectedSize?.price \|\| 0` | 0 if no variations |

**Response:** `{ message: "Order placed successfully!", order_id: 695793 }`

---
**Transform:** `orderTransform.toAPI.cancelOrderItem(currentTable, item, reason)`
**Called once per non-cancelled placed item — N items = N calls**

| Payload Field | Frontend Source | Notes |
|---|---|---|
| `order_id` | `currentTable.orderId` | Order ID |
| `order_food_id` | `item.foodId` | food_details.id (catalog) |
| `item_id` | `item.id` | orderDetails[].id |
| `order_status` | `"cancelled"` (fixed) | Always cancelled |
| `reason_type` | `reason.reasonId` (int) | Order-level reason ID |
| `reason` | `reason.reasonText` | Reason text |
| `cancel_type` | `"Pre-Serve"` or `"Post-Serve"` | Based on item.status: preparing→Pre-Serve, ready/served→Post-Serve |

---
**Transform:** `orderTransform.toAPI.cancelItemPartial(currentTable, item, reason, cancelQty)`
**Status:** Code implemented, needs backend testing

| Payload Field | Frontend Source | Notes |
|---|---|---|
| `order_id` | `currentTable.orderId` | Order ID |
| `order_food_id` | `item.id` | `orderDetails[].id` |
| `cancel_qty` | `cancelQty` | User-selected qty from modal |
| `order_status` | `"cancelled"` (fixed) | Always cancelled |
| `reason_type` | `reason.reasonId` (int) | Reason ID from cancellation reasons |
| `reason` | `reason.reasonText` | From cancellation reasons API |
| `cancel_type` | `"partial"` (fixed) | Partial cancel |

---

---

## UI Components — Data Requirements

### Table Operation Modals (Currently Mock Data)

These modals are built and functional but use mock data. Backend APIs needed.

#### Transfer Food Modal (`TransferFoodModal.jsx`)
**Purpose:** Transfer a food item from current table to another occupied table
**Data Source:** `mockTables` (mock) — needs real table data from `tableService`
**Tables Shown:** Only `occupied` and `billReady` status
**Required API:** POST endpoint to transfer item between orders

| UI Element | Data Field | Source |
|------------|------------|--------|
| Table card | `table.id`, `table.label` | mockTables |
| Capacity | `table.capacity` | mockTables |
| Status dot | `table.status` | mockTables |
| Order amount | `table.amount` | mockTables |
| Area section | `area.name` | mockTables |

**Output Payload:**
```js
{
  item: { id, name, ... },
  toTable: { id, label, ... },
  switchNotes: boolean
}
```

#### Merge Table Modal (`MergeTableModal.jsx`)
**Purpose:** Combine bills from multiple occupied tables
**Data Source:** `mockTables` (mock)
**Tables Shown:** Only `occupied`, `billReady`, `paid` status
**Selection:** Multi-select
**Required API:** POST endpoint to merge table orders

**Output Payload:**
```js
{
  primaryTable: { id, ... },
  mergeTables: [{ id, amount, ... }, ...],
  combinedBill: number
}
```

#### Shift Table Modal (`ShiftTableModal.jsx`)
**Purpose:** Move entire order to a different (empty) table
**Data Source:** `mockTables` (mock)
**Tables Shown:** Only `available` and `reserved` status
**Selection:** Single select
**Required API:** POST endpoint to shift order to new table

**Output Payload:**
```js
{
  fromTable: { id, ... },
  toTable: { id, ... }
}
```

#### Cancel Food Modal (`CancelFoodModal.jsx`)
**Purpose:** Cancel item(s) from order with reason
**Data Source:** `cancellationReasons` (mock) — needs real data from `settingsService.getCancellationReasons()`
**Features:** 
- Quantity selector when `item.qty > 1`
- Reason dropdown (required)
- Additional notes (optional)

**Output Payload:**
```js
{
  item: { id, name, qty, ... },
  reason: { id, label },
  notes: string,
  cancelQuantity: number,
  remainingQuantity: number
}
```

---

## 1. POST `/api/v1/auth/vendoremployee/login`

**Service:** `authService.login()`
**Transform:** `authTransform.fromAPI.loginResponse()`

| API Field | Frontend Field | Used in Transform | UI Location | Status |
|---|---|---|---|---|
| `token` | `token` | Yes | Stored in localStorage, used in axios headers | Mapped |
| `role_name` | `roleName` | Yes | Sidebar profile subtitle | Mapped |
| `role` | `permissions` | Yes | AuthContext — gates sidebar items, buttons | Mapped |
| `firebase_token` | `firebaseToken` | Yes | Not used in Phase 1 (push notifications) | Unused |
| `first_login` | `isFirstLogin` | Yes | Not used in Phase 1 | Unused |
| `zone_wise_topic` | `zoneWiseTopic` | Yes | Not used in Phase 1 (Firebase topics) | Unused |

**Request Payload:**
| Frontend Field | API Field |
|---|---|
| `email` | `email` |
| `password` | `password` |

---

## 2. GET `/api/v2/vendoremployee/vendor-profile/profile`

**Service:** `profileService.getProfile()`
**Transform:** `profileTransform.fromAPI.profileResponse()`

### 2a. User Fields

| API Field | Frontend Field | Used in Transform | UI Location | Status |
|---|---|---|---|---|
| `id` | `odwnerId` | Yes | Internal reference | Active |
| `emp_id` | `employeeId` | Yes | Internal reference | Active |
| `emp_f_name` | `firstName` | Yes | Sidebar profile name | Mapped |
| `emp_l_name` | `lastName` | Yes | Sidebar profile name | Mapped |
| (computed) | `fullName` | Yes | Sidebar profile display | Mapped |
| `emp_email` / `email` | `email` | Yes | Profile display | Pending |
| `phone` | `phone` | Yes | Profile display | Pending |
| `role_name` | `roleName` | Yes | Sidebar profile subtitle | Mapped |
| `default_user` | `isDefaultUser` | Yes | Permission checks | Active |
| `image` | `image` | Yes | Sidebar avatar | Mapped |
| `role` | `permissions` | Yes | AuthContext — Sidebar RBAC gating | Mapped |

**Unused User Fields (not in transform):**
| API Field | Description | Notes |
|---|---|---|
| `account_no` | Bank account | Finance — Phase 2+ |
| `auto_kot_id` | Auto KOT IDs | KDS feature |
| `bank_name` | Bank name | Finance — Phase 2+ |
| `bill_user_view` | Bill view permission | May need later |
| `branch` | Branch info | Multi-branch — Phase 2+ |
| `category_ids` | Assigned category IDs | Waiter role filtering |
| `edc_user` | EDC terminal user | Payment terminal |
| `f_name` / `l_name` | Vendor name (not employee) | Restaurant level |
| `fcm_token_web` | Web push token | Notifications |
| `holder_name` | Bank holder | Finance |
| `pos` | POS access flag | Already using permissions |
| `restaurant_discount_type` | Discount types | Mapped under restaurant |
| `restaurant_printer_config` | Android printer config | Printer settings |
| `restaurant_printer_new` | Printer stations | Mapped under restaurant |
| `restaurant_printer_windows_config` | Windows printer config | Printer settings |
| `station_role` | Station assignment | KDS feature |
| `terms_conditions` | T&C text | Settings display |
| `userinfo` | Extra user info | Null currently |
| `vat_info` | VAT details | Tax settings |

### 2b. Restaurant Fields

| API Field | Frontend Field | Used in Transform | UI Location | Status |
|---|---|---|---|---|
| `id` | `id` | Yes | Internal reference | Active |
| `name` | `name` | Yes | Settings → Restaurant Info (read + edit) | Mapped |
| `phone` | `phone` | Yes | Settings → Restaurant Info (read + edit) | Mapped |
| `email` | `email` | Yes | Settings → Restaurant Info (read + edit) | Mapped |
| `address` | `address` | Yes | Settings → Restaurant Info (read + edit) | Mapped |
| `logo` | `logo` | Yes | Settings → Restaurant Info (broken URL — see B5) | Mapped* |
| `cover_photo` | `coverPhoto` | Yes | Settings display | Pending |
| `currency` | `currency` | Yes | Settings → Restaurant Info (read + edit) | Mapped |
| (computed from currency) | `currencySymbol` | Yes | TableCard price display, Order Entry prices (via prop) | Mapped |
| `dine_in` | `features.dineIn` | Yes | Header channel tabs + Settings → Restaurant Info toggle | Mapped |
| `delivery` | `features.delivery` | Yes | Header channel tabs + Settings → Restaurant Info + Delivery Settings toggle | Mapped |
| `take_away` | `features.takeaway` | Yes | Header channel tabs + Settings → Restaurant Info + Delivery Settings toggle | Mapped |
| `room` | `features.room` | Yes | Header channel tabs + Settings → Restaurant Info toggle | Mapped |
| `inventory` | `features.inventory` | Yes | Settings → Restaurant Info toggle | Mapped |
| `tip` | `features.tip` | Yes | Settings → Service Charge toggle | Mapped |
| `service_charge` | `features.serviceCharge` | Yes | Settings → Service Charge toggle | Mapped |
| `tax` | `tax.percentage` | Yes | Settings → Tax & GST (read + edit) | Mapped |
| `gst_tax` | `tax.gstPercentage` | Yes | Settings → Tax & GST (read + edit) | Mapped |
| `gst_code` | `tax.gstCode` | Yes | Settings → Tax & GST (read + edit) | Mapped |
| `payment_types` | `paymentTypes[]` | Yes | Settings → Payment Methods (list + add/edit/delete) | Mapped |
| `pay_cash` | `paymentMethods.cash` | Yes | Settings → Payment Methods toggle | Mapped |
| `pay_upi` | `paymentMethods.upi` | Yes | Settings → Payment Methods toggle | Mapped |
| `pay_cc` | `paymentMethods.card` | Yes | Settings → Payment Methods toggle | Mapped |
| `pay_tab` | `paymentMethods.tab` | Yes | Settings → Payment Methods toggle | Mapped |
| `restaurant_discount_type` | `discountTypes[]` | Yes | Settings → Discount Types (list + add/edit/delete) | Mapped |
| `restaurant_printer_new` | `printers[]` | Yes | Settings → Printers (list + add/edit/delete) | Mapped |
| `schedules` | `schedules[]` | Yes | Settings → Operating Hours (list + edit per day) | Mapped |
| `settings` | `settings` | Yes | Settings → General Settings (toggles + edit) | Mapped |
| `search_by` | `searchOptions` | Yes | Settings → General Settings (read) | Mapped |

**Unused Restaurant Fields (not in transform):**
| API Field | Description | Notes |
|---|---|---|
| `active` | Restaurant active status | Admin level |
| `allow_cancel_post_server` | Cancel after serve | Order flow |
| `auto_prepaid_order` | Auto prepaid | Payment flow |
| `auto_service_charge` | Auto service charge | Billing |
| `available_discount` | Discount available flag | Billing |
| `available_time_starts/ends` | Operating hours | Covered by schedules |
| `avg_rating` | Average rating | Customer facing |
| `bill_date_format` | Date format on bill | Printing |

**Key Restaurant Config Fields (discovered, not yet in transform):**
| API Field | Value (Mygenie Dev) | Description | Impact |
|---|---|---|---|
| `def_ord_status` | `2` (Ready) | Default order status for new items. Controls repeat-item row behavior: Ready = qty increment on same row; other values = new separate row | Order Entry cart behavior |
| `configuration` | `"Simple"` | Restaurant config type (Simple vs Advanced stage tracking) | Order flow |
| `print_kot` | `"No"` | KOT printing disabled | Printing |
| `is_ready` | `"No"` | Purpose unclear — needs clarification | TBD |
| `schedule_order` | `True` | Scheduled orders enabled | Dashboard filters |
| `list_serve_item` | `"Dynamic"` | How served items are listed | KDS |
| `billing_auto_bill_print` | Auto print bill | Printing |
| `billing_emp` | Employee on bill | Printing |
| `booking_details` | Booking feature | Reservation |
| `business_type` | Restaurant/Cafe/etc | Config |
| `cancel_food_timings` | Cancel food timeout | Order flow |
| `cancel_order_time` | Cancel order timeout | Order flow |
| `cancle_post_serve` | Cancel post serve | Order flow |
| `complementary` | Complementary feature | Billing |
| `configuration` | Simple/Advanced | Config |
| `confirm_order_ringer` | Ringer on confirm | Sound |
| `confirm_order_show_tab` | Show tab on confirm | UI flow |
| `coupons` | Coupon list | Billing |
| `cuisine` / `cuisine_id` | Cuisine type | Customer facing |
| `def_ord_status` | Default order status | Order flow |
| `delivery_*` | Delivery settings | Delivery management |
| `description` | Restaurant description | Customer facing |
| `dinein_number/otp_require` | Dine-in settings | Order flow |
| `discount_text/type` | Discount config | Billing |
| `dynamic_upi_value` | Dynamic UPI | Payment |
| `edc` | EDC terminal config | Payment terminal |
| `feed_back` / `feedback_url` | Feedback settings | Customer facing |
| `food_*` | Food display settings | Menu config |
| `footer_text` | Bill footer | Printing |
| `free_delivery*` | Free delivery settings | Delivery |
| `fssai` | FSSAI number | Bill display |
| `gst_status` | GST enabled | Tax |
| `guest_details` | Guest details required | Order flow |
| `is_demo` | Demo restaurant | Internal |
| `is_loyality` | Loyalty enabled | Billing |
| `is_ready` | Ready status | Config |
| `latitude/longitude` | Location | Map |
| `list_serve_item` | Serve item display | KDS |
| `live` | Live status | Config |
| `live_payment` | Online payment config | Payment |
| `minimum_order` | Min order amount | Delivery |
| `non_veg/veg` | Veg/Non-veg flags | Menu config |
| `off_day` | Off days | Scheduling |
| `online_payment` | Online payment enabled | Payment |
| `order_*` | Order settings | Order flow |
| `outlet_type` | Outlet type | Config |
| `pdf_menu` | PDF menu link | Customer facing |
| `per_km_shipping_charge` | Shipping rate | Delivery |
| `pos_system/pos_view` | POS settings | Config |
| `print_kot` | Print KOT | Printing |
| `printing_*` | Printing settings | Printing |
| `razorpay` | Razorpay config | Payment |
| `real_time_order_status` | Real-time status | Order flow |
| `report_number` | Report phone | Reports |
| `reported_by` | Report grouping | Reports |
| `restaurant_model/status/type` | Business config | Admin |
| `room_*` | Room settings | Room management |
| `scanners_for_tables` | Scanner config | Table management |
| `schedule_order` | Scheduled orders | Order flow |
| `self_delivery_system` | Self delivery | Delivery |
| `send_feedback_link` | Feedback method | Customer facing |
| `service_charge_*` | Service charge config | Billing |
| `show_*` | Various display toggles | UI config |
| `slug` | URL slug | Customer facing |
| `station_display_type` | Station display | KDS |
| `surcharge` | Surcharge enabled | Billing |
| `tone_timing` | Sound timing | UI config |
| `total_round` | Round totals | Billing |
| `upi_id` | UPI ID | Payment |
| `validate_address_from_google` | Address validation | Delivery |
| `voice_in_kds` | Voice in KDS | KDS |
| `web_url` | Web URL | Customer facing |
| `weblive` | Web live status | Config |
| `zone_id` | Zone ID | Multi-zone |

---

## 3. GET `/api/v1/vendoremployee/get-categories`

**Service:** `categoryService.getCategories()`
**Transform:** `categoryTransform.fromAPI.categoryList()`

| API Field | Frontend Field | Used in Transform | UI Location | Status |
|---|---|---|---|---|
| `id` | `categoryId` | Yes | Menu Mgmt — category list + product filtering + Quick Edit dropdown | Mapped |
| `name` | `categoryName` | Yes | Menu Mgmt — category list label + product card subtitle + Quick Edit dropdown | Mapped |
| `image` | `categoryImage` | Yes | Menu Mgmt — category thumbnail (not displayed yet — no image in card) | Pending |
| `slug` | `slug` | Yes | Internal reference | Active |
| `parent_id` | `parentId` | Yes | Category hierarchy (not used in Phase 1) | Unused |
| `cat_order` | `sortOrder` | Yes | Menu Mgmt — category drag-and-drop reorder | Mapped |
| `position` | `position` | Yes | Category grid position | Active |
| `status` | `isActive` | Yes | Menu Mgmt — filter (Active/Inactive chips) | Mapped |
| (computed) | `itemCount` | Yes | Menu Mgmt — category count badge "(5)" | Mapped |
| `restaurant_id` | `restaurantId` | Yes | Internal reference | Active |
| `created_at` | `createdAt` | Yes | Settings display | Pending |
| `updated_at` | `updatedAt` | Yes | Settings display | Pending |

**Note:** `itemCount` is computed post-load by cross-referencing products. See `categoryService.calculateItemCounts()`.

---

## 4. GET `/api/v1/vendoremployee/get-products-list`

**Service:** `productService.getProducts()`
**Transform:** `productTransform.fromAPI.productListResponse()`

**Pagination Fields:**
| API Field | Frontend Field | Used in Transform |
|---|---|---|
| `total_size` | `total` | Yes |
| `limit` | `limit` | Yes |
| `offset` | `page` | Yes |

**Product Fields:**
| API Field | Frontend Field | Used in Transform | UI Location | Status |
|---|---|---|---|---|
| `id` | `productId` | Yes | Menu Mgmt — product card, drag-and-drop key | Mapped |
| `name` | `productName` | Yes | Menu Mgmt — product card title + Quick Edit name input + Full Edit | Mapped |
| `description` | `description` | Yes | Menu Mgmt — Full Edit form | Mapped |
| `image` | `productImage` | Yes | Menu Mgmt — not displayed on card yet (thumbnail pending) | Pending |
| `slug` | `slug` | Yes | Internal reference | Active |
| `category_id` | `categoryId` | Yes | Menu Mgmt — category filtering + Quick Edit dropdown + product card subtitle | Mapped |
| `category_ids` | `categoryIds` | Yes | Menu Mgmt — multi-category filtering | Mapped |
| `price` | `basePrice` | Yes | Menu Mgmt — product card price + Quick Edit + Full Edit | Mapped |
| `discount` | `discount` | Yes | Menu Mgmt — Full Edit discount field | Mapped |
| `discount_type` | `discountType` | Yes | Menu Mgmt — Full Edit discount type dropdown | Mapped |
| `tax` | `tax.percentage` | Yes | Menu Mgmt — Quick Edit "Tax %" + Full Edit | Mapped |
| `tax_type` | `tax.type` | Yes | Menu Mgmt — Quick Edit "Tax Type" dropdown + Full Edit | Mapped |
| `tax_calc` | `tax.calculation` / `tax.isInclusive` | Yes | Menu Mgmt — Full Edit "Tax Inclusive" toggle | Mapped |
| `veg` | `isVeg` | Yes | Menu Mgmt — product card food dot (🟢) + filter chip + Quick Edit + Full Edit | Mapped |
| `egg` | `hasEgg` | Yes | Menu Mgmt — product card food dot (🟡) + filter chip + Quick Edit + Full Edit | Mapped |
| `jain` | `isJain` | Yes | Menu Mgmt — product card food dot (🟣) + filter chip + Full Edit | Mapped |
| `allergen` | `allergen` | Yes | Menu Mgmt — not displayed (no allergen UI yet) | Pending |
| `variations` | `variations[]` | Yes | Menu Mgmt — Full Edit read-only list + **Order Entry → ItemCustomizationModal** variant groups | Mapped |
| (computed) | `hasVariations` | Yes | Order Entry — "Customize" label on product pill + modal gating | Active |
| `add_ons` | `addOns[]` | Yes (raw passthrough) | Menu Mgmt — Full Edit read-only list + **Order Entry → ItemCustomizationModal** addon pills | Mapped |
| `status` | `isActive` | Yes | Menu Mgmt — filter chip (Active/Inactive) | Mapped |
| `stock_out` | `isOutOfStock` | Yes | Menu Mgmt — card "Out of Stock" badge + greyed card + Full Edit toggle | Mapped |
| `is_disable` | `isDisabled` | Yes | Menu Mgmt — card "Hidden from POS" + dashed border + Full Edit toggle | Mapped |
| `available_time_starts` | `availableTimeStart` | Yes | Time-based availability | Pending |
| `available_time_ends` | `availableTimeEnd` | Yes | Time-based availability | Pending |
| `dinein` | `availability.dineIn` | Yes | Menu Mgmt — product card channel chip [Dine-In] + Full Edit toggle | Mapped |
| `takeaway` | `availability.takeaway` | Yes | Menu Mgmt — product card channel chip [Takeaway] + Full Edit toggle | Mapped |
| `delivery` | `availability.delivery` | Yes | Menu Mgmt — product card channel chip [Delivery] + Full Edit toggle | Mapped |
| `station_name` | `station` | Yes | Menu Mgmt — product card station badge (KDS/BAR) + Full Edit dropdown | Mapped |
| `order_count` | `orderCount` | Yes | Popular items sorting | Active |
| `recommended` | `isRecommended` | Yes | Not displayed yet | Pending |
| `avg_rating` | `avgRating` | Yes | Not displayed yet | Pending |
| `rating_count` | `ratingCount` | Yes | Not displayed yet | Pending |
| `complementary` | `isComplementary` | Yes | Menu Mgmt — product card subtitle "Complementary" + Quick Edit + Full Edit | Mapped |
| `complementary_price` | `complementaryPrice` | Yes | Menu Mgmt — Full Edit (shown when complementary=Yes) | Mapped |
| `is_inventory` | `isInventoryLinked` | Yes | Inventory tracking — not displayed yet | Pending |
| `is_recipe` | `hasRecipe` | Yes | Recipe link — not displayed yet | Pending |
| `recipe_id` | `recipeId` | Yes | Recipe link — not displayed yet | Pending |
| `takeaway_charge` | `takeawayCharge` | Yes | Order billing — not displayed yet | Pending |
| `delivery_charge` | `deliveryCharge` | Yes | Order billing — not displayed yet | Pending |
| `pack_charges` | `packCharges` | Yes | Order billing — not displayed yet | Pending |
| `prepration_time_min` | `prepTimeMin` | Yes | Menu Mgmt — Full Edit "Prep Time" field | Mapped |
| `serve_time_in_min` | `serveTimeMin` | Yes | Menu Mgmt — Full Edit "Serve Time" field | Mapped |
| `item_code` | `itemCode` | Yes | Menu Mgmt — Full Edit "Item Code" field | Mapped |
| `restaurant_id` | `restaurantId` | Yes | Internal reference | Active |
| `created_at` | `createdAt` | Yes | Settings display | Pending |
| `updated_at` | `updatedAt` | Yes | Settings display | Pending |

---

## 5. GET `/api/v1/vendoremployee/all-table-list`

**Service:** `tableService.getTables()`
**Transform:** `tableTransform.fromAPI.tableList()`

| API Field | Frontend Field | Used in Transform | UI Location | Status |
|---|---|---|---|---|
| `id` | `tableId` | Yes | Settings → Table Management grid + edit. **Dashboard — unique table key for state tracking** | Mapped |
| `table_no` | `tableNumber` | Yes | Settings → Table Management "T1", "T2" labels. **Dashboard — table card display label** | Mapped |
| (computed) | `displayName` | Yes | Dashboard — "Section - T1" or "T1". Used as `label` field on dashboard table cards | Mapped |
| `title` | `sectionName` | Yes | Settings → Table Management sections list. **Dashboard — groups tables by section columns** | Mapped |
| `rtype` | `tableType` / `isRoom` | Yes | Filter tables vs rooms | Active |
| `status` | `isActive` | Yes | Filter — only active shown | Active |
| `engage` | `isOccupied` | Yes | Settings → Table Management orange highlight. **Dashboard — occupied (orange) vs available (gray) status** | Mapped |
| (computed) | `status` | Yes | Settings → Table Management "free/occupied" label. **Dashboard — table card status color** | Mapped |
| `waiter_id` | `assignedWaiterId` | Yes | Order entry — waiter assignment | Pending |
| `qr_code` | `qrCode` | Yes | Table settings — QR display | Pending |
| `restaurant_id` | `restaurantId` | Yes | Internal reference | Active |
| `created_at` | `createdAt` | Yes | Settings display | Pending |
| `updated_at` | `updatedAt` | Yes | Settings display | Pending |

**Note:** `tableType` filter: `rtype === 'RM'` → Room (`isRoom: true`), else → Table (`isRoom: false`). Phase 2A unified architecture: both Tables and Rooms are stored in the same Context arrays and rendered via the same `TableCard` component. The `isRoom` boolean drives all conditional behavior (Check-In modal, Checkout labels, Credit payment hiding).

---

## 6. GET `/api/v1/vendoremployee/cancellation-reasons`

**Service:** `settingsService.getCancellationReasons()`
**Transform:** `settingsTransform.fromAPI.cancellationReasonsResponse()`

**Pagination Fields:**
| API Field | Frontend Field | Used in Transform |
|---|---|---|
| `total_size` | `total` | Yes |
| `limit` | `limit` | Yes |
| `offset` | `page` | Yes |

**Reason Fields:**
| API Field | Frontend Field | Used in Transform | UI Location | Status |
|---|---|---|---|---|
| `id` | `reasonId` | Yes | Settings → Cancellation Reasons list item | Mapped |
| `reason` | `reasonText` | Yes | Settings → Cancellation Reasons text + edit form | Mapped |
| `item_type` | `itemType` / `applicableTo` / `isForOrder` / `isForItem` | Yes | Settings → "Order Level" / "Item Level" / "Both" + edit dropdown | Mapped |
| `status` | `isActive` | Yes | Filter — only active shown + edit toggle | Mapped |
| `user_type` | `userType` | Yes | Settings display | Pending |
| `restaurant_id` | `restaurantId` | Yes | Internal reference | Active |
| `created_at` | `createdAt` | Yes | Settings display | Pending |
| `updated_at` | `updatedAt` | Yes | Settings display | Pending |

---

## 7. GET `/api/v2/vendoremployee/buffet/buffet-popular-food`

**Service:** `productService.getPopularFood()`
**Transform:** `productTransform.fromAPI.popularFoodResponse()` (same as products)

Same field mapping as Section 4 (Products). Returns popular/trending items sorted by `order_count`.

**UI Usage:** Order Entry → "Popular" category tab. Populated via `useMenu().popularFood`. Falls back to first 20 products if popular list is empty.

---

## 7b. Variation & Add-on Transform Schema (Cross-cutting)

**Transform:** `productTransform.fromAPI.variations()` + `productTransform.fromAPI.variationOptions()`

The transform outputs a canonical schema consumed by both Menu Management (read-only display) and Order Entry (ItemCustomizationModal interactive selection).

**Variation Group (API → Frontend):**
| Raw API Field | Transformed Field | Notes |
|---|---|---|
| *(synthetic)* | `id` | Generated as `vg-{index}` for React keys and state tracking |
| `name` | `name` | Group label, e.g. "Size" |
| `type` | `type` | `"single"` or `"multi"` selection |
| `required` (`"on"` string) | `required` (boolean) | `"on"` → `true`, else `false` |
| `min` | `min` | Min selections (for multi-type) |
| `max` | `max` | Max selections (for multi-type) |
| `values[]` | `options[]` | See option mapping below |

**Variation Option (API → Frontend):**
| Raw API Field | Transformed Field | Notes |
|---|---|---|
| *(synthetic)* | `id` | Generated as `vo-{index}` for React keys and comparison |
| `label` | `name` | Option display name, e.g. "Half", "Full" |
| `optionPrice` | `price` | Additional price (parsed to float) |

**Add-ons:** Passed through raw from API (`api.add_ons`). The raw structure `{ id, name, price, status, ... }` happens to match what `ItemCustomizationModal` expects. No transform applied.

**Consumer Components:**
- `ItemCustomizationModal` → reads `variantGroups[].id`, `.name`, `.required`, `.options[].id`, `.name`, `.price`
- `MenuManagementPanel` → reads `variations[].name`, `.options[].name`, `.options[].price` (display only)

---


## 8. GET `/api/v1/vendoremployee/pos/employee-orders-list` (Phase 1 Part B — IMPLEMENTED)

**Service:** `orderService.getRunningOrders()`
**Transform:** `orderTransform.fromAPI.order()`, `orderTransform.fromAPI.orderItem()`
**Context:** `OrderContext.jsx` — provides `dineInOrders`, `walkInOrders`, `deliveryOrders`, `takeAwayOrders`, `getOrderByTableId`, `orderItemsByTableId`

**Query Parameters:**
| Param | Value | Notes |
|---|---|---|
| `role_name` | `"Manager"` (default) or `"Waiter"` | Manager sees all orders; Waiter sees assigned only |

### 8a. Order Fields

| API Field | Frontend Field | Used in Transform | UI Location | Status |
|---|---|---|---|---|
| `id` | `orderId` | Yes | Dashboard grid/list cards, OrderEntry data lookup | Mapped |
| `restaurant_order_id` | `orderNumber` | Yes | Dashboard card label (e.g., "#000351") | Mapped |
| `order_type` | `orderType` | Yes (via `normalizeOrderType`) | Dashboard channel filtering (dineIn/takeAway/delivery) | Mapped |
| `order_type` (raw) | `rawOrderType` | Yes | Debug reference | Mapped |
| `order_in` | `orderIn` | Yes | Room order filtering (`"RM"` = skip) | Mapped |
| `f_order_status` | `status` / `fOrderStatus` / `tableStatus` | Yes (via `mapOrderStatus`, `mapTableStatus`) | Dashboard card status color + badge | Mapped |
| `order_status` | `lifecycle` | Yes | `"queue"` = active, `"delivered"` = completed | Mapped |
| `table_id` | `tableId` | Yes | Table grid enrichment (0 = walk-in/takeaway) | Mapped |
| `restaurantTable.table_no` | `tableNumber` | Yes | Table label | Mapped |
| `restaurantTable.title` | `tableSectionName` | Yes | Section grouping | Mapped |
| `restaurantTable.rtype` | `isRoom` | Yes | Room filtering (`"RM"` → skip for POS) | Mapped |
| `user_name` | `customer` | Yes | Dashboard card label + CartPanel customer name field | Mapped |
| `user.f_name` + `user.l_name` | `customer` (fallback) | Yes | Fallback when `user_name` is empty | Mapped |
| `user.phone` | `phone` | Yes | CartPanel phone field | Mapped |
| `order_amount` | `amount` | Yes | Dashboard card price display | Mapped |
| `delivery_address` | `deliveryAddress` | Yes | Delivery order address (structured object) | Mapped |
| `delivery_man` | `deliveryPerson` | Yes | Delivery assignment info | Mapped |
| `vendorEmployee.f_name` | `employeeName` | Yes | Waiter/staff assignment | Mapped |
| `payment_method` | `paymentMethod` | Yes | Payment info | Mapped |
| `payment_status` | `paymentStatus` | Yes | Bill Ready vs Paid determination | Mapped |
| `orderDetails[]` | `items[]` | Yes (via `fromAPI.orderItem`) | CartPanel item list when order is clicked | Mapped |
| `created_at` | `createdAt` | Yes | Order timestamp | Mapped |

### 8b. Order Item Fields (orderDetails[])

| API Field | Frontend Field | Used in Transform | UI Location | Status |
|---|---|---|---|---|
| `id` | `id` | Yes | CartPanel item key + `order_food_id` in cancel APIs | Mapped |
| `food_details.id` | `foodId` | Yes | `item_id` in full cancel API | Mapped |
| `food_details.name` | `name` | Yes | CartPanel item name | Mapped |
| `quantity` | `qty` | Yes | CartPanel item quantity | Mapped |
| `price` | `price` | Yes | CartPanel total price (qty × unit) | Mapped |
| `unit_price` | `unitPrice` | Yes | CartPanel per-item price display | Mapped |
| `food_status` | `status` | Yes (via `mapOrderStatus`) | CartPanel item status icon (green tick = served, cooking pot = preparing) | Mapped |
| `variation` | `variation` | Yes | CartPanel customization display | Mapped |
| `add_ons` | `addOns` | Yes | CartPanel addon display | Mapped |
| `food_level_notes` | `notes` | Yes | CartPanel item notes | Mapped |
| `station` | `station` | Yes | KDS routing (deferred) | Mapped |
| `ready_at` | `readyAt` | Yes | Timestamp tracking | Mapped |
| `serve_at` | `serveAt` | Yes | Timestamp tracking | Mapped |
| `cancel_at` | `cancelAt` | Yes | Timestamp tracking | Mapped |
| `created_at` | `createdAt` | Yes | CartPanel "X mins ago" display | Mapped |

### 8c. f_order_status Mapping

| f_order_status | Frontend Status Key | Table Card Status | Badge/Icon | Notes |
|---|---|---|---|---|
| 1 | `preparing` | `occupied` | CookingPot (orange) | Item being prepared |
| 2 | `ready` | `occupied` | UtensilsCrossed (green) | Ready to serve. **Also `def_ord_status` for Mygenie Dev** |
| 3 | `cancelled` | skip/`available` | — | Cancelled order |
| 4 | **TBD** | **TBD** | — | User will provide later |
| 5 | `served` | `billReady` | Check (green) | Food served, bill ready |
| 6 | `paid` | `paid` | — | Payment completed |
| 7 | `pending` | `yetToConfirm` | — | Yet to be confirmed |
| 8 | **`running`** (needs correction) | `occupied` | — | **CORRECTED: Paid through payment gateway, NOT "running/active"** |
| 9 | **TBD** | — | — | Unknown — observed on 2 POS orders. Needs clarification |

### 8d. Order Type Normalization

| API `order_type` | Frontend `orderType` | Dashboard Channel | Grid Card Icon |
|---|---|---|---|
| `"pos"` | `"dineIn"` | Dine | None |
| `"dinein"` | `"dineIn"` | Dine | None |
| `"WalkIn"` | `"dineIn"` (isWalkIn=true) | Dine | None (label = customer name or "WC") |
| `"take_away"` | `"takeAway"` | Take | ShoppingBag (amber pill `#FFF3E0`) |
| `"delivery"` | `"delivery"` | Del | Bike (blue pill `#E3F2FD`) |

### 8e. Order Routing Rules

| Condition | Behavior |
|---|---|
| `restaurantTable.rtype === "RM"` or `order_in === "RM"` | **Included** — Room orders processed identically to table orders (Phase 2A unified architecture). `isRoom: true` flag set on order |
| `table_id === 0` | Walk-in / counter order — virtual table entry with customer name |
| `order_type === "take_away"` | TakeAway channel — grid card with ShoppingBag icon |
| `order_type === "delivery"` | Delivery channel — grid card with Bike icon |

### 8f. Customer Data Flow

| Source | Frontend Field | Cart Panel Field | Notes |
|---|---|---|---|
| `user_name` or `user.f_name + user.l_name` | `order.customer` | Customer name input | "WC" default if empty + walk-in |
| `user.phone` | `order.phone` | Phone number input | Populated when order card is clicked |

### 8g. Order Source Detection

| API Field | Frontend Field | Notes |
|---|---|---|
| `order_in` | `source` | Normalized to lowercase. `null`/empty → `"own"` |

| Source Value | Logo Display | Applies To |
|---|---|---|
| `"own"` (default) | **MyGenie logo** (image) | All dine-in, own takeaway, own delivery |
| `"swiggy"` | **"S"** (orange bg #FF5722) | Swiggy aggregator orders |
| `"zomato"` | **"Z"** (red bg #E23744) | Zomato aggregator orders |

### 8h. Waiter / Staff Assignment

| API Field | Frontend Field | UI Location | Notes |
|---|---|---|---|
| `vendorEmployee.f_name` | `order.waiter` | OrderCard header center zone | Shows for ALL own orders (dine-in, takeaway, delivery). Not shown for aggregator orders. |

### 8i. Unified OrderCard UI Mapping (Component: `OrderCard.jsx`)

**Card Component:** Single `OrderCard.jsx` handles all 3 order types with consistent structure.

**Header — 3-Zone Layout (same height for all types):**
| Zone | Content | Style |
|---|---|---|
| **Left** | Logo + stacked: Order ID (top, xs bold) + Customer name or "WC" (bottom, sm medium) + 📍 address icon (own delivery only) | `flex items-center gap-2`, stacked via `flex-col leading-tight` |
| **Center** | Waiter name (own orders only) · Time ("X mins") | `flex-1 justify-center`, gray text |
| **Right** | ₹Amount (xl bold orange) + Snooze clock icon | `flex-shrink-0` |

**Primary ID per type:**
| Order Type | Primary ID (top line) | Example |
|---|---|---|
| Dine-In | Table label | `T1`, `WC` |
| TakeAway | Order number | `#000217` |
| Delivery | Order number | `#000350` |

**Items Section — Varies by type:**
| Order Type | Item Display | Item Actions |
|---|---|---|
| **Dine-In** | Status dot (orange=preparing, green=ready) + name (qty) + status label | Preparing → **[Ready]** button; Ready → **[Serve]** button |
| **Dine-In (served)** | Collapsed "Served Items (N)" section, expandable | **[Cancel]** button per served item |
| **TakeAway** | Green dot + name (qty) | None — items for reference only |
| **Delivery** | Green dot + name (qty) | None — items for reference only |

**Extra Sections (Delivery only):**
| Scenario | Section | Content |
|---|---|---|
| Swiggy/Zomato delivery | Rider section | Rider name, phone, status pill. "Awaiting Runner" if unassigned |
| Own delivery | Address popup | Triggered by 📍 icon in header. Shows `deliveryAddress.formatted` |

**Footer Actions:**
| Scenario | Left Buttons | Right Buttons |
|---|---|---|
| Normal (active order) | `Bill` · `KOT` | `X` (cancel) · `Collect` (green) |
| New online order (`yetToConfirm`) | `Bill` · `KOT` | `X` (reject) · `Accept` (green) |

**Touch Compatibility:** All buttons have `min-h-[44px]` and `min-w-[44px]` tap targets. `gap-3` between action buttons prevents accidental taps.

**Responsive Grid:** List view uses `repeat(auto-fill, minmax(360px, 1fr))` — adapts from 4 columns (wide) to 1 column (narrow).

---

## Summary

| Endpoint | Total API Fields | Transformed | Mapped to UI | Unused |
|---|---|---|---|---|
| Login | 6 | 6 | 3 (token, roleName, permissions) | 3 |
| Profile — User | 30+ | 10 | 5 (fullName, firstName, lastName, roleName, permissions, image) | 20+ |
| Profile — Restaurant | 120+ | 30 | 30 (Settings panel — all tiles + currencySymbol) | 90+ |
| Categories | 12 | 12 | 9 (Menu Mgmt + Order Entry category panel) | 0 |
| Products | 40+ | 40+ | 38 (Menu Mgmt + Order Entry pills + Customization Modal variations/addons) | 5 (allergen, recommended, ratings) |
| Tables | 13 | 13 | 10 (Settings + Dashboard grid — tableId, label, section, status) | 0 |
| Cancellation Reasons | 8 | 8 | 4 (Settings → Cancellation Reasons) | 0 |
| Popular Food | (same as Products) | (same) | Used in Order Entry "Popular" tab | 0 |
| **Running Orders** | **25+ per order** | **25+** | **Dashboard grid/list cards + CartPanel items + customer data** | **3 (b_order_status, k_order_status, associated_order_list)** |

---

## UI Components Status

| Component | Modal Design | Data Source | API Connected | Notes |
|-----------|--------------|-------------|---------------|-------|
| ItemCustomizationModal | ✅ Complete | Products API | ✅ Yes | Variants, addons, notes |
| TransferFoodModal | ✅ Complete | OrderContext | ✅ Yes | `POST /transfer-food-item` |
| MergeTableModal | ✅ Complete | OrderContext | ✅ Yes | `POST /transfer-order` |
| ShiftTableModal | ✅ Complete | Table API (live) | ✅ Yes | `POST /order-table-room-switch` |
| CancelFoodModal | ✅ Complete | SettingsContext | ✅ Yes | `PUT /cancel-food-item` + `partial-cancel-food-item` |
| CancelOrderModal | ✅ Complete | SettingsContext | ✅ Yes | `PUT /food-status-update` (Pre-Serve/Post-Serve) |
| AddCustomItemModal | ✅ Complete | MenuContext | ✅ Yes | `POST /add-single-product` |
| CustomerModal | ✅ Complete | CustomerService | ✅ Yes | `POST /restaurant-customer-list` |
| CollectPaymentPanel | ✅ Complete | Local calc + API | ✅ Yes | Scenario 1: `POST /order-bill-payment` \| Scenario 2: `POST /place-order-and-payment` |
| ItemNotesModal | ✅ Complete | Local state | N/A | Item-level notes |
| OrderNotesModal | ✅ Complete | Local state | N/A | Order-level notes |

---

## Sprint 3 — Order Taking Endpoints

| # | Feature | Endpoint | Method | Status |
|---|---------|----------|--------|--------|
| CHG-036 | Customer Lookup | `/api/v2/vendoremployee/restaurant-customer-list` | POST JSON | ✅ Done |
| CHG-037 | Place Order (new) | `/api/v2/vendoremployee/pos/place-order` | POST form-urlencoded | ✅ Done |
| CHG-038 Sc1 | Collect Bill (existing) | `/api/v2/vendoremployee/order-bill-payment` | POST JSON | ✅ Done |
| CHG-038 Sc2 | Place+Pay (fresh) | `/api/v1/vendoremployee/pos/place-order-and-payment` | POST form-urlencoded | ✅ Done |
| CHG-040 | Update Order | `/api/v2/vendoremployee/pos/update-place-order` | PUT JSON | ✅ Done |

---

### `POST /api/v1/vendoremployee/pos/user-group-check-in` — Room Check-In (CHG-049)
**Service:** `roomService.checkIn(params)`
**Mode:** JSON body (no images) or multipart/form-data (with ID images)

| Payload Field | Frontend Source | Notes |
|---|---|---|
| `phone` | `params.phone` | Required |
| `name` | `params.name` | Required |
| `room_id` | `params.roomIds` (array) | One or more room IDs |
| `booking_type` | `params.bookingType` | Default: `"WalkIn"` |
| `booking_for` | `params.bookingFor` | Default: `"personal"` |
| `order_amount` | `params.orderAmount` | Default: `0` |
| `advance_payment` | `params.advancePayment` | Default: `0` |
| `balance_payment` | `params.balancePayment` | Default: `0` |
| `payment_mode` | `params.paymentMode` | Default: `"cash"` |
| `email` | `params.email` | Optional |
| `order_note` | `params.orderNote` | Optional |
| `total_adult` | `params.totalAdult` | Optional |
| `total_children` | `params.totalChildren` | Optional |
| `id_type` | `params.idType` | Default: `"Aadhaar"`. Options: Aadhaar, Passport, DrivingLicense, VoterID, PAN |
| `checkin_date` | `params.checkinDate` | YYYY-MM-DD |
| `checkout_date` | `params.checkoutDate` | YYYY-MM-DD |
| `front_image_file` | `params.frontImage` (File) | Only in multipart mode |
| `back_image_file` | `params.backImage` (File) | Only in multipart mode |

**Note:** When images are attached, all fields are sent as `FormData` with `Content-Type: multipart/form-data`. Without images, sent as JSON.

---

## Phase 4A: Order Reports — Report Endpoints (2026-03-30)

### Report List APIs (All GET except Aggregator)

| # | Endpoint | Method | Param | Tab(s) | Transform |
|---|---|---|---|---|---|
| 1 | `/api/v2/vendoremployee/paid-order-list` | GET | `search_date` | Paid, Room Transfer, All Orders | `reportTransform.transformPaidOrders()` |
| 2 | `/api/v2/vendoremployee/cancel-order-list` | GET | `search_date` | Cancelled, Merged, All Orders | `reportTransform.transformCancelledOrders()` |
| 3 | `/api/v2/vendoremployee/paid-in-tab-order-list` | GET | `search_date` | Credit, All Orders | `reportTransform.transformCreditOrders()` |
| 4 | `/api/v2/vendoremployee/paid-paylater-order-list` | GET | `search_date` | On Hold | `reportTransform.transformHoldOrders()` |
| 5 | `/api/v1/vendoremployee/urbanpiper/get-complete-order-list` | POST | `search_date` (body) | Aggregator | `reportTransform.transformAggregatorOrders()` |
| 6 | `/api/v2/vendoremployee/employee-order-details` | GET | `order_id` | Detail drill-down | `reportTransform.transformOrderDetail()` |

### Tab → Data Source + Client-Side Filter Mapping

| Tab | API | Client-Side Filter |
|---|---|---|
| All Orders | #1 + #2 + #3 (merged) | Combined + gap detection |
| Paid | #1 `paid-order-list` | Exclude `payment_method in ["ROOM","transferToRoom"]` |
| Cancelled | #2 `cancel-order-list` | Exclude `payment_method === "Merge"` |
| Credit | #3 `paid-in-tab-order-list` | Direct |
| On Hold | #4 `paid-paylater-order-list` | Direct (shows warning banner — ISSUE-001) |
| Merged | #2 `cancel-order-list` | `payment_method === "Merge"` |
| Room Transfer | #1 `paid-order-list` | `payment_method in ["ROOM","transferToRoom"]` |
| Aggregator | #5 `urbanpiper/get-complete-order-list` | Direct |

### Report UI Components

| Component | File | Purpose |
|---|---|---|
| `ReportsPage` | `pages/ReportsPage.jsx` | Container: state management, API orchestration, tab switching |
| `ReportTabs` | `components/reports/ReportTabs.jsx` | 8 tab buttons with count badges |
| `DatePicker` | `components/reports/DatePicker.jsx` | Calendar popup + prev/next day arrows |
| `OrderTable` | `components/reports/OrderTable.jsx` | Dense sortable table, gap detection rows |
| `FilterBar` | `components/reports/FilterBar.jsx` | 2-row layout: filters+stats / breakdown pills |
| `FilterTags` | `components/reports/FilterTags.jsx` | Active filter tag chips |
| `OrderDetailSheet` | `components/reports/OrderDetailSheet.jsx` | Side sheet drill-down (glass-morphism) |
| `ExportButtons` | `components/reports/ExportButtons.jsx` | PDF print + CSV download |

---

## Pending Backend APIs

| Operation | Real Endpoint | Method | Status |
|-----------|--------------|--------|--------|
| Cancel Item (Full) | `/api/v2/vendoremployee/cancel-food-item` | PUT | ✅ Done |
| Cancel Item (Partial) | `/api/v2/vendoremployee/partial-cancel-food-item` | PUT | ✅ Done |
| Cancel Order | `/api/v2/vendoremployee/food-status-update` | PUT | ✅ Done |
| Item Ready / Serve | `/api/v2/vendoremployee/food-status-update` | PUT | 🔵 Not wired (same endpoint) |
| Accept / Reject Order | TBD | TBD | 🔵 Endpoint not provided |
| Add to Existing Order | TBD | TBD | 🔵 Endpoint not provided |

---

## Phase 2B — Transfer to Room Endpoints (2026-03-30)

### Transfer Table Order to Room

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /api/v1/vendoremployee/order-shifted-room` |
| **Auth** | Bearer token |
| **Content-Type** | `application/json` |
| **Status** | ✅ Wired |
| **Constant** | `API_ENDPOINTS.ORDER_SHIFTED_ROOM` |
| **Transform** | `orderToAPI.transferToRoom(table, paymentData, roomId)` |

**Payload Mapping:**

| API Field | Frontend Source | Notes |
|-----------|---------------|-------|
| `order_id` | `table.orderId` | String |
| `payment_mode` | `paymentData.method` | cash/card/upi |
| `payment_amount` | `paymentData.finalTotal` | Calculated total |
| `payment_status` | `"paid"` | Fixed |
| `room_id` | `roomId` (from picker) | String — destination room |
| `order_discount` | `discounts.orderDiscountPercent` | |
| `self_discount` | `discounts.manual` | Restaurant discount |
| `comm_discount` | `discounts.preset` | Community discount |
| `tip_amount` | `paymentData.tip` | |
| `vat_tax` | `paymentData.vatAmount` | |
| `gst_tax` | `sgst + cgst` | Rounded |
| `service_tax` | `0` | |
| `service_gst_tax_amount` | `0` | |
| `tip_tax_amount` | `0` | |

### Associated Orders (from Running Orders Response)

| API Field | Frontend Field | Notes |
|-----------|---------------|-------|
| `associated_order_list[].id` | `associatedOrders[].orderId` | Deduped by ID |
| `associated_order_list[].restaurant_order_id` | `associatedOrders[].orderNumber` | Display # |
| `associated_order_list[].order_amount` | `associatedOrders[].amount` | Float |
| `associated_order_list[].collect_Bill` | `associatedOrders[].transferredAt` | Timestamp |

### Paid Room Order List (History — not yet wired)

| Detail | Value |
|--------|-------|
| **Endpoint** | `GET /api/v2/vendoremployee/paid-in-room-order-list?search_date=YYYY-MM-DD` |
| **Auth** | Bearer token |
| **Status** | 🔵 Explored, not wired |
| **Response Structure** | `{ orders: [{ primary_order, associated_orders, room_grand_total }] }` |

| Field | Description |
|-------|-------------|
| `primary_order` | Room service order details (id, amount, guest info, payment, taxes) |
| `associated_orders` | Array of transferred orders (id, amount, user_name, waiter, transfer_date, taxes) |
| `room_grand_total` | Combined total (primary + transfers) |



---

## Phase 5A — Order Summary Report

> Added: 2026-03-31
> Page: `/reports/summary` (`OrderSummaryPage.jsx`)

### API Usage Summary

The Order Summary page aggregates data from multiple existing APIs to compute daily totals.

| Section | API Endpoint | Method | Date Param |
|---------|-------------|--------|------------|
| Sales / Paid Revenue | `/api/v2/vendoremployee/paid-order-list` | GET | `search_date` |
| Cancelled | `/api/v2/vendoremployee/cancel-order-list` | GET | `search_date` |
| On Hold | `/api/v2/vendoremployee/paid-paylater-order-list` | GET | `search_date` |
| Pending (Credit) | `/api/v2/vendoremployee/paid-in-tab-order-list` | GET | `search_date` |
| Aggregators | `/api/v1/vendoremployee/urbanpiper/get-complete-order-list` | POST | `search_date` (body) |
| Running Orders | `/api/v1/vendoremployee/employee-orders-list` | GET | **None — filtered in UI** |

### Running Orders Date Filtering

**Important:** The `employee-orders-list` API does NOT accept a date parameter. It returns ALL current running orders.

Frontend filters by `createdAt` field:
```javascript
const runningOrdersFiltered = allRunningOrders.filter(order => {
  const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
  return orderDate === selectedDate;
});
```

### Field Mappings for Order Summary

#### Payment Method Detection
| Payment Type | Field Check |
|--------------|-------------|
| Cash | `paymentMethod.toLowerCase().includes('cash')` |
| Card | `paymentMethod.toLowerCase().includes('card')` or `.includes('cc')` |
| UPI | `paymentMethod.toLowerCase().includes('upi')` |

#### Channel Detection (with fallback)
| Channel | Primary Field | Fallback Field |
|---------|--------------|----------------|
| Dine In | `channel === 'dinein'` | `orderType.includes('dine')` |
| Takeaway | `channel === 'takeaway'` | `orderType === 'take_away'` |
| Delivery | `channel === 'delivery'` | — |
| Room | `channel === 'room'` | — |

**Note:** `channel` field is missing from most list endpoints (GAP-001). Falls back to `orderType`.

#### Platform Detection
| Platform | Field Check |
|----------|-------------|
| POS | `platform === 'pos'` or default if missing |
| Web | `platform.includes('web')` |

**Note:** `platform` field is missing from most list endpoints (GAP-002). Defaults to POS.

#### Aggregator Detection
| Aggregator | Field Check |
|------------|-------------|
| Zomato | `aggregatorPlatform.toLowerCase().includes('zomato')` |
| Swiggy | `aggregatorPlatform.toLowerCase().includes('swiggy')` |

#### Deductions Computation
| Deduction | Field |
|-----------|-------|
| Discount | `order.discount` |
| Tips | `order.tip` |
| Tax | `order.tax.total` or `order.tax?.total` |

### Summary Computation Flow

```
1. Fetch all APIs in parallel (Promise.all)
2. Filter running orders by createdAt === selectedDate
3. Loop through paid orders:
   - Sum totals for Sales/Revenue
   - Categorize by paymentMethod → Payment Breakdown
   - Categorize by channel/orderType → By Channel
   - Categorize by platform → By Platform
   - Sum discount, tip, tax → Deductions
4. Loop through aggregator orders → Aggregators section
5. Sum cancelled orders → Cancelled card
6. Sum hold/credit orders → On Hold / Pending cards
7. Display computed totals in UI
```

### Known Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| `channel` field missing (GAP-001) | By Channel may be inaccurate | Falls back to `orderType` |
| `platform` field missing (GAP-002) | By Platform defaults to POS | — |
| `paid-paylater-order-list` bug (ISSUE-001) | On Hold shows same as Paid | Info banner in UI |
| Running Orders no date param | Must filter in UI | Filter by `createdAt` |
