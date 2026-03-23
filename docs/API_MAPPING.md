# API Field Mapping Document

> Last Updated: 2026-03-23
> Status: Phase 1 Part A — All fields transformed, UI mapping in progress

---

## 1. POST `/api/v1/auth/vendoremployee/login`

**Service:** `authService.login()`
**Transform:** `authTransform.fromAPI.loginResponse()`

| API Field | Frontend Field | Used in Transform | UI Location | Status |
|---|---|---|---|---|
| `token` | `token` | Yes | Stored in localStorage, used in axios headers | Active |
| `role_name` | `roleName` | Yes | Sidebar profile section | Pending |
| `role` | `permissions` | Yes | AuthContext — gates sidebar items, buttons | Pending |
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
| `emp_f_name` | `firstName` | Yes | Sidebar profile name | Pending |
| `emp_l_name` | `lastName` | Yes | Sidebar profile name | Pending |
| (computed) | `fullName` | Yes | Sidebar profile display | Pending |
| `emp_email` / `email` | `email` | Yes | Profile display | Pending |
| `phone` | `phone` | Yes | Profile display | Pending |
| `role_name` | `roleName` | Yes | Sidebar profile subtitle | Pending |
| `default_user` | `isDefaultUser` | Yes | Permission checks | Active |
| `image` | `image` | Yes | Sidebar avatar | Pending |
| `role` | `permissions` | Yes | AuthContext — RBAC gating | Pending |

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
| `name` | `name` | Yes | Sidebar header, Settings | Pending |
| `phone` | `phone` | Yes | Settings display | Pending |
| `email` | `email` | Yes | Settings display | Pending |
| `address` | `address` | Yes | Settings display | Pending |
| `logo` | `logo` | Yes | Sidebar header logo | Pending |
| `cover_photo` | `coverPhoto` | Yes | Settings display | Pending |
| `currency` | `currency` | Yes | Internal | Active |
| (computed from currency) | `currencySymbol` | Yes | All price displays | Pending |
| `dine_in` | `features.dineIn` | Yes | Dashboard channel tabs visibility | Pending |
| `delivery` | `features.delivery` | Yes | Dashboard channel tabs visibility | Pending |
| `take_away` | `features.takeaway` | Yes | Dashboard channel tabs visibility | Pending |
| `room` | `features.room` | Yes | Dashboard channel tabs visibility | Pending |
| `inventory` | `features.inventory` | Yes | Sidebar menu visibility | Pending |
| `tip` | `features.tip` | Yes | Order billing | Pending |
| `service_charge` | `features.serviceCharge` | Yes | Order billing | Pending |
| `tax` | `tax.percentage` | Yes | Order billing | Pending |
| `gst_tax` | `tax.gstPercentage` | Yes | Order billing | Pending |
| `gst_code` | `tax.gstCode` | Yes | Bill display | Pending |
| `payment_types` | `paymentTypes[]` | Yes | Payment selection | Pending |
| `pay_cash` | `paymentMethods.cash` | Yes | Payment toggles | Pending |
| `pay_upi` | `paymentMethods.upi` | Yes | Payment toggles | Pending |
| `pay_cc` | `paymentMethods.card` | Yes | Payment toggles | Pending |
| `pay_tab` | `paymentMethods.tab` | Yes | Payment toggles | Pending |
| `restaurant_discount_type` | `discountTypes[]` | Yes | Discount selection | Pending |
| `restaurant_printer_new` | `printers[]` | Yes | Printer settings | Pending |
| `schedules` | `schedules[]` | Yes | Settings — operating hours | Pending |
| `settings` | `settings` | Yes | Various settings toggles | Pending |
| `search_by` | `searchOptions` | Yes | Dashboard search config | Pending |

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
| `id` | `categoryId` | Yes | Menu panel — category list, product filtering | Pending |
| `name` | `categoryName` | Yes | Menu panel — category name label | Pending |
| `image` | `categoryImage` | Yes | Menu panel — category thumbnail | Pending |
| `slug` | `slug` | Yes | Internal reference | Active |
| `parent_id` | `parentId` | Yes | Category hierarchy (not used in Phase 1) | Unused |
| `cat_order` | `sortOrder` | Yes | Category list sort order | Active |
| `position` | `position` | Yes | Category grid position | Pending |
| `status` | `isActive` | Yes | Filter — only active shown | Active |
| (computed) | `itemCount` | Yes | Menu panel — "(X items)" badge | Pending |
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
| `id` | `productId` | Yes | Order entry — item selection | Pending |
| `name` | `productName` | Yes | Menu panel, Order entry — item name | Pending |
| `description` | `description` | Yes | Menu panel — item detail | Pending |
| `image` | `productImage` | Yes | Menu panel, Order entry — thumbnail | Pending |
| `slug` | `slug` | Yes | Internal reference | Active |
| `category_id` | `categoryId` | Yes | Filter products by category | Active |
| `category_ids` | `categoryIds` | Yes | Multi-category assignment | Active |
| `price` | `basePrice` | Yes | Menu panel, Order entry — price display | Pending |
| `discount` | `discount` | Yes | Order entry — discount calculation | Pending |
| `discount_type` | `discountType` | Yes | Order entry — discount calculation | Pending |
| `tax` | `tax.percentage` | Yes | Order billing — tax calc | Pending |
| `tax_type` | `tax.type` | Yes | Order billing — GST/VAT | Pending |
| `tax_calc` | `tax.calculation` / `tax.isInclusive` | Yes | Order billing — inclusive/exclusive | Pending |
| `veg` | `isVeg` | Yes | Menu panel — veg/non-veg indicator | Pending |
| `egg` | `hasEgg` | Yes | Menu panel — egg indicator | Pending |
| `jain` | `isJain` | Yes | Menu panel — jain indicator | Pending |
| `allergen` | `allergen` | Yes | Menu panel — allergen info | Pending |
| `variations` | `variations[]` | Yes | Order entry — size/option selection | Pending |
| (computed) | `hasVariations` | Yes | Order entry — show variation picker | Active |
| `add_ons` | `addOns[]` | Yes | Order entry — add-on selection | Pending |
| `status` | `isActive` | Yes | Filter — availability | Active |
| `stock_out` | `isOutOfStock` | Yes | Menu panel — "Out of Stock" badge | Pending |
| `is_disable` | `isDisabled` | Yes | Menu panel — disabled state | Pending |
| `available_time_starts` | `availableTimeStart` | Yes | Time-based availability | Pending |
| `available_time_ends` | `availableTimeEnd` | Yes | Time-based availability | Pending |
| `dinein` | `availability.dineIn` | Yes | Channel filtering | Pending |
| `takeaway` | `availability.takeaway` | Yes | Channel filtering | Pending |
| `delivery` | `availability.delivery` | Yes | Channel filtering | Pending |
| `station_name` | `station` | Yes | KOT routing | Pending |
| `order_count` | `orderCount` | Yes | Popular items sorting | Active |
| `recommended` | `isRecommended` | Yes | Menu panel — recommended badge | Pending |
| `avg_rating` | `avgRating` | Yes | Menu panel — rating display | Pending |
| `rating_count` | `ratingCount` | Yes | Menu panel — rating count | Pending |
| `complementary` | `isComplementary` | Yes | Complementary order flow | Pending |
| `complementary_price` | `complementaryPrice` | Yes | Complementary pricing | Pending |
| `is_inventory` | `isInventoryLinked` | Yes | Inventory tracking | Pending |
| `is_recipe` | `hasRecipe` | Yes | Recipe link | Pending |
| `recipe_id` | `recipeId` | Yes | Recipe link | Pending |
| `takeaway_charge` | `takeawayCharge` | Yes | Order billing — extra charges | Pending |
| `delivery_charge` | `deliveryCharge` | Yes | Order billing — extra charges | Pending |
| `pack_charges` | `packCharges` | Yes | Order billing — extra charges | Pending |
| `prepration_time_min` | `prepTimeMin` | Yes | KDS — prep time display | Pending |
| `serve_time_in_min` | `serveTimeMin` | Yes | KDS — serve time | Pending |
| `item_code` | `itemCode` | Yes | Menu panel — item code display | Pending |
| `restaurant_id` | `restaurantId` | Yes | Internal reference | Active |
| `created_at` | `createdAt` | Yes | Settings display | Pending |
| `updated_at` | `updatedAt` | Yes | Settings display | Pending |

---

## 5. GET `/api/v1/vendoremployee/all-table-list`

**Service:** `tableService.getTables()`
**Transform:** `tableTransform.fromAPI.tableList()`

| API Field | Frontend Field | Used in Transform | UI Location | Status |
|---|---|---|---|---|
| `id` | `tableId` | Yes | Dashboard — table card, order entry | Pending |
| `table_no` | `tableNumber` | Yes | Dashboard — table card "T1", "T2" | Pending |
| (computed) | `displayName` | Yes | Dashboard — "Section - T1" | Pending |
| `title` | `sectionName` | Yes | Dashboard — section grouping headers | Pending |
| `rtype` | `tableType` / `isRoom` | Yes | Filter tables vs rooms | Active |
| `status` | `isActive` | Yes | Filter — only active shown | Active |
| `engage` | `isOccupied` | Yes | Dashboard — table card status color | Pending |
| (computed) | `status` | Yes | Dashboard — free/occupied/disabled | Pending |
| `waiter_id` | `assignedWaiterId` | Yes | Order entry — waiter assignment | Pending |
| `qr_code` | `qrCode` | Yes | Table settings — QR display | Pending |
| `restaurant_id` | `restaurantId` | Yes | Internal reference | Active |
| `created_at` | `createdAt` | Yes | Settings display | Pending |
| `updated_at` | `updatedAt` | Yes | Settings display | Pending |

**Note:** `tableType` filter: `rtype === 'RM'` → Room, else → Table. Phase 1 loads tables only (`tablesOnly = true`).

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
| `id` | `reasonId` | Yes | Settings — reason list | Pending |
| `reason` | `reasonText` | Yes | Settings — reason text, Cancel dialog | Pending |
| `item_type` | `itemType` / `applicableTo` / `isForOrder` / `isForItem` | Yes | Settings — "Order Level" / "Item Level" / "Both" | Pending |
| `status` | `isActive` | Yes | Filter — only active shown | Active |
| `user_type` | `userType` | Yes | Settings display | Pending |
| `restaurant_id` | `restaurantId` | Yes | Internal reference | Active |
| `created_at` | `createdAt` | Yes | Settings display | Pending |
| `updated_at` | `updatedAt` | Yes | Settings display | Pending |

---

## 7. GET `/api/v2/vendoremployee/buffet/buffet-popular-food`

**Service:** `productService.getPopularFood()`
**Transform:** `productTransform.fromAPI.popularFoodResponse()` (same as products)

Same field mapping as Section 4 (Products). Returns popular/trending items sorted by `order_count`.

---

## 8. GET `/api/v1/vendoremployee/pos/employee-orders-list` (Phase 1 Part B — NOT YET IMPLEMENTED)

**Service:** Not yet created
**Transform:** Not yet created

**Known fields (from API analysis):**
| API Field | Frontend Field | UI Location | Status |
|---|---|---|---|
| `id` | `orderId` | Dashboard order cards | Not Implemented |
| `food_status` | ? | Order card status badge | Blocked — see BACKEND_CLARIFICATIONS.md |
| `order_status` | ? | Order card status | Blocked |
| `f_order_status` | ? | Food order status | Blocked |
| `b_order_status` | ? | Bar order status | Blocked |
| `k_order_status` | ? | Kitchen order status | Blocked |

---

## Summary

| Endpoint | Total API Fields | Transformed | Mapped to UI | Unused |
|---|---|---|---|---|
| Login | 6 | 6 | 1 (token) | 3 |
| Profile — User | 30+ | 10 | 1 (token/auth) | 20+ |
| Profile — Restaurant | 120+ | 30 | 0 | 90+ |
| Categories | 12 | 12 | 0 | 0 |
| Products | 40+ | 40+ | 0 | 0 |
| Tables | 13 | 13 | 0 | 0 |
| Cancellation Reasons | 8 | 8 | 0 | 0 |
| Popular Food | (same as Products) | (same) | 0 | 0 |
| Running Orders | Unknown | 0 | 0 | All |
