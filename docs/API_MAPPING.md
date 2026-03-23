# API Field Mapping Document

> Last Updated: 2026-03-23
> Status: Phase 1 Part A — Transforms done. Sidebar, Header, Settings UI mapped.

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
| (computed from currency) | `currencySymbol` | Yes | All price displays | Pending |
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
| `variations` | `variations[]` | Yes | Menu Mgmt — Full Edit read-only list | Mapped (read-only) |
| (computed) | `hasVariations` | Yes | Internal — variation picker gate | Active |
| `add_ons` | `addOns[]` | Yes | Menu Mgmt — Full Edit read-only list | Mapped (read-only) |
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
| `id` | `tableId` | Yes | Settings → Table Management grid + edit | Mapped |
| `table_no` | `tableNumber` | Yes | Settings → Table Management "T1", "T2" labels | Mapped |
| (computed) | `displayName` | Yes | Dashboard — "Section - T1" | Pending |
| `title` | `sectionName` | Yes | Settings → Table Management sections list | Mapped |
| `rtype` | `tableType` / `isRoom` | Yes | Filter tables vs rooms | Active |
| `status` | `isActive` | Yes | Filter — only active shown | Active |
| `engage` | `isOccupied` | Yes | Settings → Table Management orange highlight | Mapped |
| (computed) | `status` | Yes | Settings → Table Management "free/occupied" label | Mapped |
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
| Login | 6 | 6 | 3 (token, roleName, permissions) | 3 |
| Profile — User | 30+ | 10 | 5 (fullName, firstName, lastName, roleName, permissions, image) | 20+ |
| Profile — Restaurant | 120+ | 30 | 29 (Settings panel — all tiles) | 90+ |
| Categories | 12 | 12 | 8 (Menu Mgmt — list, filter, count, reorder, CRUD) | 0 |
| Products | 40+ | 40+ | 35 (Menu Mgmt — card, Quick Edit, Full Edit, filters) | 5 (allergen, recommended, ratings) |
| Tables | 13 | 13 | 7 (Settings → Table Management) | 0 |
| Cancellation Reasons | 8 | 8 | 4 (Settings → Cancellation Reasons) | 0 |
| Popular Food | (same as Products) | (same) | 0 (not yet used in UI) | 0 |
| Running Orders | Unknown | 0 | 0 | All |
