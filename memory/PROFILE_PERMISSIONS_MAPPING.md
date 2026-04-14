# Profile API — User Roles, Permissions & Restaurant Settings Mapping

**Version:** 2.0 (P0 Complete)
**Last Updated:** February 2026
**Source Endpoint:** `GET /api/v2/vendoremployee/vendor-profile/profile`

---

## Table of Contents

1. [API Response Overview](#1-api-response-overview)
2. [User Identity Fields](#2-user-identity-fields)
3. [Role & Permissions Array (`api.role`)](#3-role--permissions-array-apirole)
4. [Known Permission Strings & UI Mapping](#4-known-permission-strings--ui-mapping)
5. [Role Name Archetypes](#5-role-name-archetypes)
6. [Restaurant Cancellation Settings](#6-restaurant-cancellation-settings)
7. [Restaurant Feature Flags](#7-restaurant-feature-flags)
8. [Restaurant Payment Configuration](#8-restaurant-payment-configuration)
9. [Restaurant Settings Object](#9-restaurant-settings-object)
10. [Current Implementation Status](#10-current-implementation-status)
11. [Action → Permission → Component Matrix](#11-action--permission--component-matrix)

---

## 1. API Response Overview

The Profile API returns the employee's identity, their assigned role + permission array, and the restaurant configuration (features, taxes, printers, schedules, cancellation rules, payment options).

```
GET /api/v2/vendoremployee/vendor-profile/profile
Authorization: Bearer <token>

Response shape:
{
  "id": number,                      // owner/vendor ID
  "emp_id": number,                  // employee ID
  "emp_f_name": string,              // first name
  "emp_l_name": string,              // last name
  "emp_email": string,               // email
  "phone": string,                   // phone
  "role_name": string,               // "Owner" | "Manager" | "Waiter" | "Captain" | custom
  "role": [ ...permissions ],        // array of permission strings
  "default_user": "Yes" | "No",
  "image": string | null,
  "restaurants": [ { ...restaurant } ]
}
```

### Transform Location
- **File:** `/app/frontend/src/api/transforms/profileTransform.js`
- **Function:** `fromAPI.profileResponse(api)` → returns `{ user, restaurant, permissions }`

### Context Storage
| Data | Stored In | How Accessed |
|------|-----------|--------------|
| `user` (identity) | `AuthContext.user` | `useAuth().user` |
| `permissions` (role array) | `AuthContext.permissions` | `useAuth().permissions`, `hasPermission('...')` |
| `restaurant` (config) | `RestaurantContext.restaurant` | `useRestaurant().restaurant` |

---

## 2. User Identity Fields

| API Field | Transform Key | Type | Description | UI Usage |
|-----------|--------------|------|-------------|----------|
| `id` | `user.ownerId` | number | Vendor/owner ID | Internal reference |
| `emp_id` | `user.employeeId` | number | Employee ID | Sent in order payloads as `employee_id` |
| `emp_f_name` | `user.firstName` | string | First name | Sidebar profile, order attribution |
| `emp_l_name` | `user.lastName` | string | Last name | Sidebar profile |
| `emp_f_name + emp_l_name` | `user.fullName` | string | Combined name | Display in Header/Sidebar |
| `emp_email` / `email` | `user.email` | string | Email address | Profile display |
| `phone` | `user.phone` | string | Phone number | Profile display |
| `role_name` | `user.roleName` | string | Human-readable role | Sent in cancel/status APIs as `role_name` |
| `default_user` | `user.isDefaultUser` | boolean | Whether this is the default (owner) account | May affect certain permissions |
| `image` | `user.image` | string/null | Profile image URL | Sidebar avatar |

---

## 3. Role & Permissions Array (`api.role`)

The `role` field in the API response is a **flat array of permission strings**. Each string represents a specific action the user is allowed to perform. The array is role-dependent — an "Owner" gets all permissions, while a restricted "Waiter" may get only a subset.

```javascript
// Actual Owner role array (from LV FOODS / role_name: "Owner")
"role": [
  "Manager", "food", "pos", "order", "bill",
  "order_cancel", "serve", "aggregator",
  "show_online_order", "assign_online_order",
  "order_unpaid", "update_payment", "order_edit",
  "delivery_man", "clear_payment", "Ready",
  "customer_management", "virtual_wallet", "discount",
  "transfer_table", "merge_table", "food_transfer",
  "whatsapp_icon", "print_icon", "table_view",
  "employee", "restaurant_setup", "inventory",
  "coupon", "printer", "menu", "expence",
  "Loyalty", "restaurant_settings", "printer_management",
  "table_management", "delivery_management",
  "physicalqty_master", "report", "report_summery",
  "waiter_revenue_report", "sattle_report", "revenue_report",
  "room_report", "sales_report", "revenue_report_average",
  "consumption_report", "cancellation_report",
  "pl_report", "wastage_report"
]
```

### How Permissions Are Consumed

```javascript
// AuthContext.jsx provides:
const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

// Single check
const canCancel = hasPermission('order_cancel');

// Any of multiple
const canManageTables = hasAnyPermission(['table_shift', 'table_merge']);

// All required
const isAdmin = hasAllPermissions(['settings_manage', 'employee_manage']);
```

---

## 4. Known Permission Strings & UI Mapping

### Order Operations

| Permission String | Description | UI Component(s) Affected | Visibility Rule | Status |
|-------------------|-------------|--------------------------|-----------------|--------|
| `order` | General order access | `DashboardPage` → Order View tab | Hide Order View entirely if missing | **MISSING** — Order View always visible |
| `order_cancel` | Cancel entire order | `OrderCard` → Cancel [X] button (footer) | Hide button if missing | **MAPPED** — `canCancelOrder` prop in `OrderCard.jsx` |
| `order_edit` | Edit/update existing order | `OrderCard` → tap to open `OrderEntry` | Disable card tap if missing | **MISSING** — Card tap not gated |
| `food` | General food operations (includes item cancel) | `OrderEntry` → `CancelFoodModal` | Hide item cancel if missing | **MISSING** — Not yet gated |
| `serve` | Mark order/items as served | `OrderCard` → Serve button, item serve toggle | Hide serve actions if missing | **MISSING** — Always visible |
| `Ready` | Mark order/items as ready (note: capital R) | `OrderCard` → Ready button, item ready toggle | Hide ready actions if missing | **MISSING** — Always visible |

### Table Operations

| Permission String | Description | UI Component(s) Affected | Visibility Rule | Status |
|-------------------|-------------|--------------------------|-----------------|--------|
| `transfer_table` | Shift order to another table | `OrderCard` → Shift button (header) | Hide shift button if missing | **MAPPED** — `canShiftTable` prop in `OrderCard.jsx` |
| `merge_table` | Merge orders from two tables | `OrderCard` → Merge button (header) | Hide merge button if missing | **MAPPED** — `canMergeOrder` prop in `OrderCard.jsx` |
| `food_transfer` | Transfer item to another table | `OrderCard` → Food Transfer icon (item row) | Hide transfer icon if missing | **MAPPED** — `canFoodTransfer` prop in `OrderCard.jsx` |
| `table_view` | View tables on dashboard | `DashboardPage` → Table grid | Hide table grid if missing | **MISSING** — Always visible |
| `table_management` | Manage table layout/config | Sidebar → Table management | Hide link if missing | **MISSING** |

### Billing & Payment

| Permission String | Description | UI Component(s) Affected | Visibility Rule | Status |
|-------------------|-------------|--------------------------|-----------------|--------|
| `bill` | Collect payment / settle bill | `OrderCard` → Bill button, `CollectPaymentPanel` | Hide bill button if missing | **MISSING** — Disabled for Phase 2 |
| `order_unpaid` | View unpaid orders | Reports / Dashboard filters | Filter capability | **MISSING** |
| `update_payment` | Update payment on order | Payment modification | Gate payment edits | **MISSING** |
| `clear_payment` | Clear/void a payment | Payment panel | Gate clear action | **MISSING** |
| `print_icon` | Print bill/KOT | `OrderCard` → KOT button, Bill print | Gate print actions | **MISSING** — Phase 2 |

### Customer & Discount

| Permission String | Description | UI Component(s) Affected | Visibility Rule | Status |
|-------------------|-------------|--------------------------|-----------------|--------|
| `customer_management` | Search/add customers | `OrderEntry` → `CustomerModal` | Disable customer button if missing | **MISSING** |
| `discount` | Apply manual/coupon discounts | `OrderEntry` → Discount section | Hide discount controls if missing | **MISSING** |
| `coupon` | Manage coupons | Settings → Coupons | Gate coupon section | **MISSING** |
| `virtual_wallet` | Customer wallet operations | Payment → Wallet option | Gate wallet option | **MISSING** |
| `Loyalty` | Loyalty program (note: capital L) | Loyalty section | Gate loyalty features | **MISSING** |

### Admin & Setup

| Permission String | Description | UI Component(s) Affected | Visibility Rule | Status |
|-------------------|-------------|--------------------------|-----------------|--------|
| `Manager` | Manager-level access | General admin | Broad access gate | **MISSING** |
| `pos` | POS system access | Entire POS app | Block POS if missing | **MISSING** |
| `menu` | Menu management | Sidebar → Menu Management | Hide link if missing | **MISSING** |
| `employee` | Employee management | Sidebar → Employee section | Hide link if missing | **MISSING** |
| `restaurant_setup` | Restaurant setup/config | Sidebar → Setup | Hide link if missing | **MISSING** |
| `restaurant_settings` | Restaurant settings | Sidebar → Settings | Hide link if missing | **MISSING** |
| `printer` | Printer access | Settings → Printer section | Gate printer access | **MISSING** |
| `printer_management` | Manage printer config | Settings → Printer config | Gate printer management | **MISSING** |
| `inventory` | Inventory management | Sidebar → Inventory | Hide link if missing | **MISSING** |
| `delivery_management` | Delivery management | Sidebar → Delivery config | Hide link if missing | **MISSING** |
| `delivery_man` | Delivery person assignment | Order → Assign delivery | Gate assign action | **MISSING** |
| `expence` | Expense tracking (note: typo in API) | Sidebar → Expenses | Hide link if missing | **MISSING** |
| `physicalqty_master` | Physical quantity master | Inventory → Physical QTY | Gate section | **MISSING** |

### Aggregator

| Permission String | Description | UI Component(s) Affected | Visibility Rule | Status |
|-------------------|-------------|--------------------------|-----------------|--------|
| `aggregator` | Aggregator order access | Aggregator section | Gate aggregator features | **MISSING** |
| `show_online_order` | View online orders | Dashboard → Online orders | Show/hide online orders | **MISSING** |
| `assign_online_order` | Accept/assign online orders | Order → Accept/Reject | Gate accept action | **MISSING** |

### Reports

| Permission String | Description | UI Component(s) Affected | Visibility Rule | Status |
|-------------------|-------------|--------------------------|-----------------|--------|
| `report` | General report access | Sidebar → Reports | Hide reports link if missing | **MISSING** |
| `report_summery` | Summary report (note: typo) | Reports → Summary | Gate summary tab | **MISSING** |
| `waiter_revenue_report` | Waiter revenue report | Reports → Waiter | Gate waiter report | **MISSING** |
| `sattle_report` | Settlement report (note: typo) | Reports → Settlement | Gate settlement tab | **MISSING** |
| `revenue_report` | Revenue report | Reports → Revenue | Gate revenue tab | **MISSING** |
| `room_report` | Room report | Reports → Room | Gate room report | **MISSING** |
| `sales_report` | Sales report | Reports → Sales | Gate sales tab | **MISSING** |
| `revenue_report_average` | Average revenue report | Reports → Average | Gate average tab | **MISSING** |
| `consumption_report` | Consumption report | Reports → Consumption | Gate consumption tab | **MISSING** |
| `cancellation_report` | Cancellation report | Reports → Cancellation | Gate cancellation tab | **MISSING** |
| `pl_report` | P&L report | Reports → P&L | Gate P&L tab | **MISSING** |
| `wastage_report` | Wastage report | Reports → Wastage | Gate wastage tab | **MISSING** |

### UI-Only Permissions

| Permission String | Description | UI Component(s) Affected | Visibility Rule | Status |
|-------------------|-------------|--------------------------|-----------------|--------|
| `whatsapp_icon` | Show WhatsApp icon | Header/Footer → WhatsApp | Show/hide icon | **MISSING** |

---

## 5. Role Name Archetypes

| `role_name` Value | Typical Permission Set | Description |
|-------------------|----------------------|-------------|
| `Owner` | ALL 50+ permissions (verified from actual API) | Restaurant owner — full access |
| `Manager` | ALL or nearly all | On-duty manager — full operational access |
| `Captain` | `order`, `food`, `order_cancel`, `order_edit`, `serve`, `Ready`, `transfer_table`, `merge_table`, `food_transfer`, `bill`, `print_icon`, `customer_management` | Floor captain — order operations, no admin |
| `Waiter` | `order`, `order_edit`, `serve`, `print_icon` | Basic waiter — view/take orders only |
| `Cashier` | `order`, `bill`, `print_icon`, `report`, `customer_management` | Cashier — billing and reports |
| `KDS` | `order`, `Ready`, `serve` | Kitchen Display — view and status only |
| Custom roles | Varies | Restaurant-defined custom roles |

**Note:** `role_name` is sent in API payloads (e.g., cancel order requires `role_name`). The actual permissions come from the `role` array, not the role name. The `role` array may contain `"Manager"` as a permission string (not to be confused with `role_name`).

---

## 6. Restaurant Cancellation Settings

These fields are on the **restaurant object** (inside `restaurants[0]`) and control when/how cancellations are allowed. They are **operational business rules** set by the restaurant owner.

| API Field | Type | Values | Description | UI Impact | Confirmed Value (LV FOODS) |
|-----------|------|--------|-------------|-----------|---------------------------|
| `cancle_post_serve` | string | `"Yes"` / `"No"` | Allow cancellation of items **after** they've been served | If `"No"`: hide cancel button for items with `status === "served"` | `"Yes"` |
| `allow_cancel_post_server` | string | `"Yes"` / `"No"` | Secondary flag for post-serve cancellation (redundant with above, both must be checked) | Same as above — double-gate | `"Yes"` |
| `cancel_order_time` | number/string | Minutes (e.g., `5`) or `0` for unlimited | Time window (in minutes) after order creation within which full order cancellation is allowed | If elapsed: disable/hide Cancel Order button, show "Cancellation window expired" tooltip | `5` |
| `cancel_food_timings` | number/string | Minutes (e.g., `5`) or `0` for unlimited | Time window after item was added within which individual item cancellation is allowed | If elapsed: disable/hide Cancel Item action | `5` |

### Current Transform Status
**MAPPED** in `profileTransform.js` → `fromAPI.restaurant()` as `cancellation` object. Exposed via `RestaurantContext.cancellation`.

```javascript
// profileTransform.js → fromAPI.restaurant()
cancellation: {
  allowPostServeCancel: toBoolean(api.cancle_post_serve),         // Note: API has typo "cancle"
  allowPostServeCancel2: toBoolean(api.allow_cancel_post_server), // Redundant gate
  orderCancelWindowMinutes: parseInt(api.cancel_order_time) || 0, // 0 = unlimited
  itemCancelWindowMinutes: parseInt(api.cancel_food_timings) || 0, // 0 = unlimited
},
```

**UI Consumption Status:** **MISSING** — The cancellation settings are mapped in the transform and exposed via `RestaurantContext.cancellation`, but the time-window checks are not yet enforced in `OrderCard.jsx` or `OrderEntry.jsx`. The `allowPostServeCancel` flag is not yet checked when rendering cancel actions for served items.

### Cancellation Decision Matrix

| Scenario | Permission Check | Setting Check | Result |
|----------|-----------------|---------------|--------|
| Cancel entire order | `hasPermission('order_cancel')` | `cancel_order_time` not expired | Allow |
| Cancel entire order | `hasPermission('order_cancel')` | `cancel_order_time` expired | Block |
| Cancel entire order | No `order_cancel` permission | — | Block (hide button) |
| Cancel pre-serve item | `hasPermission('food_cancel')` | `cancel_food_timings` not expired | Allow |
| Cancel pre-serve item | `hasPermission('food_cancel')` | `cancel_food_timings` expired | Block |
| Cancel post-serve item | `hasPermission('food_cancel')` | `cancle_post_serve === "Yes"` | Allow |
| Cancel post-serve item | `hasPermission('food_cancel')` | `cancle_post_serve === "No"` | Block (hide button for served items) |

---

## 7. Restaurant Feature Flags

These control which order types and features are enabled for the restaurant.

| API Field | Transform Key | Type | UI Impact |
|-----------|--------------|------|-----------|
| `dine_in` | `features.dineIn` | boolean | Show/hide Dine-In tables on Dashboard |
| `delivery` | `features.delivery` | boolean | Show/hide Delivery order section |
| `take_away` | `features.takeaway` | boolean | Show/hide TakeAway order section |
| `room` | `features.room` | boolean | Show/hide Room tables on Dashboard |
| `inventory` | `features.inventory` | boolean | Enable inventory management |
| `tip` | `features.tip` | boolean | Show tip input in payment collection |
| `service_charge` | `features.serviceCharge` | boolean | Apply service charge to orders |

### Currently Mapped: YES (in `profileTransform.js` lines 70-78)

---

## 8. Restaurant Payment Configuration

| API Field | Transform Key | Type | UI Impact |
|-----------|--------------|------|-----------|
| `pay_cash` | `paymentMethods.cash` | boolean | Show Cash option in `CollectPaymentPanel` |
| `pay_upi` | `paymentMethods.upi` | boolean | Show UPI option |
| `pay_cc` | `paymentMethods.card` | boolean | Show Card option |
| `pay_tab` | `paymentMethods.tab` | boolean | Show Tab/Credit option |
| `payment_types[]` | `paymentTypes` | array | List of custom payment types (id, name, displayName) |

### Currently Mapped: YES (in `profileTransform.js` lines 88-96)

---

## 9. Restaurant Settings Object

Nested under `restaurants[0].settings`:

| API Field | Transform Key | Type | UI Impact |
|-----------|--------------|------|-----------|
| `is_coupon` | `settings.isCoupon` | boolean | Show coupon input in payment/discount |
| `is_loyality` | `settings.isLoyalty` | boolean | Show loyalty points section |
| `is_customer_wallet` | `settings.isCustomerWallet` | boolean | Show wallet balance option |
| `aggregator_auto_kot` | `settings.aggregatorAutoKot` | boolean | Auto-print KOT for aggregator orders |
| `default_prep_time` | `settings.defaultPrepTime` | number | Default preparation time (minutes) for new orders |

### Currently Mapped: YES (in `profileTransform.js` lines 172-181)

---

## 10. Current Implementation Status

| Area | Mapped in Transform? | Consumed in UI? | Status | Notes |
|------|---------------------|-----------------|--------|-------|
| User identity | YES | YES (Sidebar, Header) | **DONE** | Complete |
| Role name (`role_name`) | YES | YES (sent in API calls) | **DONE** | Complete |
| Permissions array (`role`) | YES (stored as flat array) | **PARTIAL** — OrderCard buttons gated | **IN PROGRESS** | `order_cancel`, `table_merge`, `table_shift`, `food_transfer` gated in OrderCard. OrderEntry & Sidebar NOT gated |
| Restaurant features | YES | PARTIAL (dineIn/delivery/takeaway used in filtering) | **DONE** | |
| Restaurant tax | YES | YES (order calculations) | **DONE** | Complete |
| Payment methods | YES | YES (`CollectPaymentPanel`) | **DONE** | Complete |
| Discount types | YES | PARTIAL | **PARTIAL** | |
| Printers | YES | NO (Phase 2 — KOT/Bill print) | **MISSING** | Phase 2 |
| Schedules | YES | NO (not displayed) | **MISSING** | Low priority |
| Settings | YES | PARTIAL | **PARTIAL** | |
| **Cancellation settings** | **YES** | **NO** | **PARTIAL** | Transform done, UI time-window checks missing |

### Handler Wiring Status

| Handler | Component | API Endpoint | Status |
|---------|-----------|-------------|--------|
| `onCancelOrder` | `OrderCard` → `DashboardPage` | `PUT /api/v2/vendoremployee/order-status-update` | **MAPPED** — Opens `CancelOrderModal`, calls API on confirm |
| `onItemStatusChange` | `OrderCard` → `DashboardPage` | `PUT /api/v2/vendoremployee/food-status-update` | **MAPPED** — Calls food status update API directly |
| `onMarkReady` | `OrderCard` → `DashboardPage` | `PUT /api/v2/vendoremployee/order-status-update` | **MAPPED** — Calls `updateOrderStatus(orderId, roleName, 'ready')` |
| `onMarkServed` | `OrderCard` → `DashboardPage` | `PUT /api/v2/vendoremployee/order-status-update` | **MAPPED** — Calls `updateOrderStatus(orderId, roleName, 'serve')` |
| `onMergeOrder` | `OrderCard` → `DashboardPage` | `POST /api/v1/vendoremployee/order/transfer-order` | **STUB** — Console.log only, modal not wired from list view |
| `onTableShift` | `OrderCard` → `DashboardPage` | `POST /api/v1/vendoremployee/pos/order-table-room-switch` | **STUB** — Console.log only, modal not wired from list view |
| `onFoodTransfer` | `OrderCard` → `DashboardPage` | `POST /api/v1/vendoremployee/order/transfer-food-item` | **STUB** — Console.log only, modal not wired from list view |
| `onEdit` | `OrderCard` → `DashboardPage` | N/A (opens OrderEntry) | **MAPPED** — Opens `OrderEntry` via `handleTableClick` |
| `onBillClick` | `OrderCard` → `DashboardPage` | N/A (opens OrderEntry with payment) | **MAPPED** — Opens `OrderEntry` via `handleBillClick` (disabled Phase 2) |

---

## 11. Action → Permission → Component Matrix

This is the master reference for which UI actions need which permission checks and where.

### OrderCard.jsx (Dashboard Cards)

| UI Element | Location in Card | Permission Required | Additional Condition | Status |
|------------|-----------------|---------------------|---------------------|--------|
| **Cancel Order [X]** | Footer left | `order_cancel` | `cancel_order_time` not expired | **MAPPED** — Gated via `canCancelOrder` prop. Time-window check: **MISSING** |
| **Merge Order** | Header right | `merge_table` | Dine-In only, not YetToConfirm | **MAPPED** — Gated via `canMergeOrder` prop |
| **Table Shift** | Header right | `transfer_table` | Dine-In only, not YetToConfirm | **MAPPED** — Gated via `canShiftTable` prop |
| **Food Transfer** | Item row left | `food_transfer` | Dine-In only, not YetToConfirm | **MAPPED** — Gated via `canFoodTransfer` prop |
| **Card tap → Edit** | Entire card | `order_edit` | Not engaged | **MISSING** — Always clickable |
| **Ready button** | Footer right | `Ready` (capital R) | `fOrderStatus === 1` | **MISSING** — Always visible |
| **Serve button** | Footer right | `serve` | `fOrderStatus === 2` | **MISSING** — Always visible |
| **Bill button** | Footer right | `bill` | `fOrderStatus === 5` | **MISSING** — Permission not gated (disabled for Phase 2) |
| **KOT button** | Footer left | `print_icon` | Always present | **MISSING** — Permission not gated (disabled for Phase 2) |
| **Item Ready/Serve toggle** | Item row right | `Ready` / `serve` | Dine-In only | **MAPPED** — Handler wired via `onItemStatusChange` |

### OrderEntry.jsx (Order Taking Panel)

| UI Element | Permission Required | Additional Condition | Status |
|------------|---------------------|---------------------|--------|
| Add items to cart | `order_edit` | — | **MISSING** |
| Cancel food item | `food` | Pre-ready: `cancel_food_timings` window. Post-ready: `cancle_post_serve` flag | **MAPPED** — `canCancelItem` + `isItemCancelAllowed()` in CartPanel → PlacedItemRow |
| Cancel full order | `order_cancel` | Pre-ready: `cancel_order_time` window. Post-ready: `cancle_post_serve` flag | **MAPPED** — `isOrderCancelAllowed` gates Trash icon in OrderEntry header |
| Shift table | `transfer_table` | Dine-In only | **MAPPED** — `canShiftTable` prop in CategoryPanel |
| Merge order | `merge_table` | Dine-In only | **MAPPED** — `canMergeOrder` prop in CategoryPanel |
| Transfer food | `food_transfer` | Dine-In only | **MAPPED** — `canFoodTransfer` in CartPanel → PlacedItemRow |
| Collect payment | `bill` | Order must be placed | **MAPPED** — `canBill` gates Collect Bill button in CartPanel |
| Apply discount | `discount` | — | **MISSING** — Flag computed but not gated in UI |
| Complementary item | `complementary` (TBD — not in Owner role) | — | **MISSING** |
| Customer search | `customer_management` | — | **MAPPED** — `canCustomerManage` gates UserPlus button in OrderEntry header |

### Sidebar / Navigation

| UI Element | Permission Required | Status |
|------------|---------------------|--------|
| Menu Management | `menu` | **MISSING** |
| Reports | `report` | **MISSING** |
| Settings | `restaurant_settings` | **MISSING** |
| Employee Management | `employee` | **MISSING** |

---

## Quick Reference: Implementation Checklist

- [x] **Transform**: Add cancellation settings to `profileTransform.js` → `fromAPI.restaurant()`
- [x] **Transform**: Store cancellation config in `RestaurantContext` for UI access
- [x] **OrderCard.jsx**: Wrap Cancel button with `hasPermission('order_cancel')` via `canCancelOrder` prop
- [x] **OrderCard.jsx**: Wrap Merge button with `hasPermission('merge_table')` via `canMergeOrder` prop
- [x] **OrderCard.jsx**: Wrap Shift button with `hasPermission('transfer_table')` via `canShiftTable` prop
- [x] **OrderCard.jsx**: Wrap Food Transfer icon with `hasPermission('food_transfer')` via `canFoodTransfer` prop
- [x] **DashboardPage.jsx**: Wire `onCancelOrder` handler → `CancelOrderModal` → API
- [x] **DashboardPage.jsx**: Wire `onItemStatusChange` handler → `FOOD_STATUS_UPDATE` API
- [x] **Permission strings verified** against actual API response (Feb 2026)
- [ ] **OrderCard.jsx**: Add `cancel_order_time` elapsed check for Cancel button
- [x] **OrderEntry.jsx**: Gate Cancel Order (trash icon) with `order_cancel` + cancellation time/post-ready logic
- [x] **OrderEntry.jsx**: Gate Customer button with `customer_management`
- [x] **CategoryPanel.jsx**: Gate Shift Table with `transfer_table`
- [x] **CategoryPanel.jsx**: Gate Merge Table with `merge_table`
- [x] **CartPanel.jsx**: Gate Cancel Item with `food` + `isItemCancelAllowed()` (time window + post-ready)
- [x] **CartPanel.jsx**: Gate Transfer Food with `food_transfer`
- [x] **CartPanel.jsx**: Gate Collect Bill with `bill`
- [ ] **OrderCard.jsx**: Gate Ready button with `hasPermission('Ready')` (capital R)
- [ ] **OrderCard.jsx**: Gate Serve button with `hasPermission('serve')`
- [ ] **OrderEntry.jsx**: Gate Add items with `order_edit` permission
- [ ] **Sidebar.jsx**: Add permission gates to navigation links (`menu`, `report`, `restaurant_settings`, `employee`)
- [ ] **OrderCard.jsx**: Gate `onEdit` (card tap) with `order_edit` permission
- [ ] **OrderCard.jsx**: Gate Bill button with `bill` permission (after Phase 2)

---

### API Typos to Note
- `cancle_post_serve` (should be "cancel") — accepted as-is
- `report_summery` (should be "summary") — accepted as-is
- `sattle_report` (should be "settlement") — accepted as-is
- `expence` (should be "expense") — accepted as-is

*This document should be updated as new permissions are discovered from the API or as UI components are gated.*
