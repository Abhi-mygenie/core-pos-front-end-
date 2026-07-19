# Investigation Report — Roles & Permissions Deep Mapping

**Date:** 2026-07-18
**Agent Role:** INVESTIGATION
**Steps Used:** 10/10
**Confidence:** HIGH (curl-verified + full code trace)

---

## 1. SYSTEM ARCHITECTURE

```
LOGIN → backend returns: { role_name: "Owner", role: ["pos","order","bill",...] }
  → FE stores permissions[] in sessionStorage
  → useAuth().hasPermission("order_cancel") checks array.includes()
  → Components gate UI elements based on these checks
```

**Permissions are a FLAT STRING ARRAY** — no hierarchy, no grouping at runtime. The backend sends a list of permission keys; the FE checks `includes()`.

---

## 2. ROLE TYPE (6 types from backend)

| ID | Name | Backend Value | Purpose |
|---|---|---|---|
| 1 | STATION | STATION | Kitchen/station staff (chef) |
| 2 | Waiter | Waiter | Table service staff |
| 3 | Manager | Manager | Floor management |
| 4 | Billing | Billing | Cashier/billing desk |
| 5 | Server Waiter | Buffet | Buffet/food court service |
| 6 | Delivery | Delivery | Delivery riders |

**FE Status:** Role Type dropdown EXISTS on Add/Edit Role form (`RoleFormView.jsx` L146). It sends `role_type: [selectedValue]` to backend on create/update. 

**BUT:** Role Type is **NOT consumed anywhere in the FE for gating or behavior**. It's only stored and displayed. The backend may use it internally — FE treats it as metadata only.

---

## 3. ROLE TEMPLATES (10 system templates)

| ID | Template Name | Permissions | Protected |
|---|---|:---:|:---:|
| 16 | Owner | 50 | YES |
| 14 | Manager | 26 | YES |
| 13 | Cashier | 19 | YES |
| 17 | Billing User | 16 | YES |
| 11 | Waiter(S) | 11 | YES |
| 15 | Accountant | 10 | YES |
| 12 | Waiter(T) | 7 | YES |
| 20 | Captain | 5 | YES |
| 18 | Station (Chef) | 4 | YES |
| 19 | Delivery Boy | 4 | YES |

**FE Status:** "Start from Template" dropdown on Add Role form loads from `/role-master-list`. Selecting a template pre-fills the permission checkboxes with that template's `default_modules[]`.

---

## 4. ALL 53 PERMISSIONS — Complete Mapping

### FRONTEND permissions (28) — Control UI elements

| # | Permission Key | Display Name | WHERE CONSUMED IN FE | Gated? |
|---|---|---|---|:---:|
| 1 | `pos` | Pos | Sidebar: dashboard, day-closure, expenses, credit | ✅ YES |
| 2 | `food` | food | OrderEntry: `canCancelItem` (item-level cancel) | ✅ YES |
| 3 | `order` | Order | **NOT consumed** — no `hasPermission('order')` found | ❌ NO |
| 4 | `bill` | Bills | Dashboard+OrderEntry: `canBill` (generate bill) | ✅ YES |
| 5 | `order_cancel` | Order Cancel | Dashboard+OrderEntry: `canCancelOrder` | ✅ YES |
| 6 | `serve` | Serve | **NOT consumed** — no `hasPermission('serve')` found | ❌ NO |
| 7 | `aggregator` | Aggregator | **NOT consumed** | ❌ NO |
| 8 | `show_online_order` | Show Online Order | **NOT consumed** | ❌ NO |
| 9 | `assign_online_order` | Assign Online Order | **NOT consumed** | ❌ NO |
| 10 | `order_unpaid` | Order Unpaid | AllOrdersReport: `canMarkUnpaid`, RoomOrders: `canRemoveFromRoom` | ✅ YES |
| 11 | `update_payment` | Update Payment | AllOrdersReport: `canChangeMethod` | ✅ YES |
| 12 | `order_edit` | Order Edit | **NOT consumed** — no `hasPermission('order_edit')` found | ❌ NO |
| 13 | `delivery_man` | Delivery Man | **NOT consumed** | ❌ NO |
| 14 | `clear_payment` | Clear Payment | **NOT consumed** | ❌ NO |
| 15 | `Ready` | Ready | **NOT consumed** | ❌ NO |
| 16 | `customer_management` | customer management | OrderEntry: `canCustomerManage` | ✅ YES |
| 17 | `virtual_wallet` | virtual wallet | **NOT consumed** | ❌ NO |
| 18 | `discount` | Discount | OrderEntry: `canDiscount` | ✅ YES |
| 19 | `transfer_table` | Transfer Table | Dashboard+OrderEntry: `canShiftTable` | ✅ YES |
| 20 | `merge_table` | Merge Table | Dashboard+OrderEntry: `canMergeOrder` | ✅ YES |
| 21 | `food_transfer` | Food Transfer | Dashboard+OrderEntry: `canFoodTransfer` | ✅ YES |
| 22 | `whatsapp_icon` | WhatsApp Icon | **NOT consumed** | ❌ NO |
| 23 | `print_icon` | Print Icon | Dashboard+OrderEntry: `canPrintBill` | ✅ YES |
| 24 | `table_view` | Table View | **NOT consumed** | ❌ NO |
| 25 | `token_display` | Token Display | **NOT consumed** | ❌ NO |
| 26 | `confirm_order` | Confirm Order | **NOT consumed** | ❌ NO |
| 27 | `complementary_food` | Complementary Food | **NOT consumed** | ❌ NO |
| 28 | `swiggy_zomato_price` | Swiggy zomato price | **NOT consumed** | ❌ NO |

### BACKEND permissions (13) — Control sidebar/section access

| # | Permission Key | Display Name | WHERE CONSUMED IN FE | Gated? |
|---|---|---|---|:---:|
| 29 | `employee` | Employee | **NOT consumed** — Employee page has no gate | ❌ NO |
| 30 | `restaurant_setup` | Restaurant Setup | **NOT consumed** | ❌ NO |
| 31 | `inventory` | Inventory | Sidebar: inventory section | ✅ YES |
| 32 | `coupon` | Coupon | **NOT consumed** | ❌ NO |
| 33 | `printer` | Print Bill | **NOT consumed** | ❌ NO |
| 34 | `menu` | Menu | Sidebar: menu-management | ✅ YES |
| 35 | `expence` | Expence | **NOT consumed** (sidebar uses `pos` not `expence`) | ❌ NO |
| 36 | `Loyalty` | Loyalty | **NOT consumed** | ❌ NO |
| 37 | `restaurant_settings` | restaurant settings | Sidebar: settings | ✅ YES |
| 38 | `printer_management` | Printer Management | **NOT consumed** | ❌ NO |
| 39 | `table_management` | Table Management | **NOT consumed** | ❌ NO |
| 40 | `delivery_management` | Delivery Management | **NOT consumed** | ❌ NO |
| 41 | `physicalqty_master` | PhysicalQty Master | **NOT consumed** | ❌ NO |

### REPORT permissions (12) — Control report access

| # | Permission Key | Display Name | WHERE CONSUMED IN FE | Gated? |
|---|---|---|---|:---:|
| 42 | `report` | report | Sidebar: reports + insights | ✅ YES |
| 43 | `report_summery` | report summery | **NOT consumed** | ❌ NO |
| 44 | `waiter_revenue_report` | waiter revenue_report | **NOT consumed** | ❌ NO |
| 45 | `sattle_report` | sattle report | **NOT consumed** | ❌ NO |
| 46 | `revenue_report` | revenue report | **NOT consumed** | ❌ NO |
| 47 | `room_report` | room report | **NOT consumed** | ❌ NO |
| 48 | `sales_report` | sales report | **NOT consumed** | ❌ NO |
| 49 | `revenue_report_average` | revenue report_average | **NOT consumed** | ❌ NO |
| 50 | `consumption_report` | consumption report | **NOT consumed** | ❌ NO |
| 51 | `cancellation_report` | cancellation report | **NOT consumed** | ❌ NO |
| 52 | `pl_report` | PL Report | **NOT consumed** | ❌ NO |
| 53 | `wastage_report` | Wastage Report | **NOT consumed** | ❌ NO |

---

## 5. CONSUMPTION SUMMARY

| Category | Total Permissions | Gated in FE | NOT Gated | % Wired |
|----------|:-:|:-:|:-:|:-:|
| Frontend (UI) | 28 | 13 | 15 | 46% |
| Backend (sections) | 13 | 3 | 10 | 23% |
| Report | 12 | 1 | 11 | 8% |
| **TOTAL** | **53** | **17** | **36** | **32%** |

**Only 17 of 53 permissions (32%) are actually enforced in the FE.** The remaining 36 are stored but never checked.

---

## 6. WHERE GATING HAPPENS (all locations)

| File | Permissions Checked | What's Gated |
|------|-------------------|-------------|
| `Sidebar.jsx` L39-49 | `pos`, `menu`, `report`, `restaurant_settings`, `inventory` | Sidebar section visibility (5 checks) |
| `OrderEntry.jsx` L303-311 | `order_cancel`, `food`, `transfer_table`, `merge_table`, `food_transfer`, `customer_management`, `bill`, `discount`, `print_icon` | Order screen action buttons (9 checks) |
| `DashboardPage.jsx` L1832-1897 | `order_cancel`, `merge_table`, `transfer_table`, `food_transfer`, `print_icon`, `bill` | Dashboard order card actions (6 checks, repeated 3x for different card types) |
| `AllOrdersReportPage.jsx` L559-560 | `update_payment`, `order_unpaid` | Change Payment + Mark Unpaid buttons |
| `RoomOrdersReportPage.jsx` L382 | `order_unpaid` | Remove from Room button |

**PermissionGate component EXISTS but is NEVER used** — 0 imports outside its own file.

---

## 7. ROLE TYPE — NOT CONSUMED IN FE

Role Type (STATION/Waiter/Manager/Billing/Server Waiter/Delivery) is:
- ✅ Loaded from `/all-role-list` API → `catalog.roleTypes`
- ✅ Displayed in Role Form dropdown (`RoleFormView.jsx` L146)
- ✅ Sent to backend on create/update (`role_type: [selectedValue]`)
- ❌ **NEVER used for any FE gating, routing, or conditional behavior**
- ❌ **NOT stored in login response** — login only returns permission keys, not role type
- ❌ **NOT available in `useAuth()`** — only `permissions[]` and `roleName` are available

**Role Type is purely administrative metadata for the backend.** The FE cannot distinguish a "Waiter" type role from a "Manager" type role at runtime.

---

## 8. WHAT'S NOT GATED (HIGH IMPACT gaps for CR-068/CR-071)

### Critical ungated actions:
| Action | Permission Key Exists | FE Gates It? | Impact |
|--------|:---:|:---:|--------|
| Cancel order | `order_cancel` | ✅ YES | Already gated |
| Cancel item | `food` | ✅ YES | Already gated |
| Edit order (add items) | `order_edit` | ❌ NO | Any role can edit orders |
| Confirm pending orders | `confirm_order` | ❌ NO | Any role can confirm |
| Mark served | `serve` | ❌ NO | Any role can mark served |
| Mark ready | `Ready` | ❌ NO | Any role can mark ready |
| Apply discount | `discount` | ✅ YES | Already gated |
| Mark complimentary | `complementary_food` | ❌ NO | Any role can mark comp |
| Access employee management | `employee` | ❌ NO | Any role sees employee page |
| Access menu management | `menu` | ✅ YES | Sidebar gated |
| Access inventory | `inventory` | ✅ YES | Sidebar gated |
| Access settings | `restaurant_settings` | ✅ YES | Sidebar gated |
| Access individual reports | `sattle_report`, etc. | ❌ NO | All reports visible if `report` permission exists |

---

## 9. OPEN QUESTIONS (for owner)

| # | Question |
|---|----------|
| OQ-1 | Does the backend use Role Type for anything (API filtering, socket routing, data scoping)? Or is it purely label/metadata? |
| OQ-2 | Should individual report permissions (e.g., `sattle_report`, `consumption_report`) gate individual report pages? Currently they're all behind the single `report` permission. |
| OQ-3 | Should `employee` permission gate the Employee Management sidebar item? Currently anyone with `pos` can see it. |
| OQ-4 | Priority order for CR-071 wiring: which of the 36 ungated permissions should be wired first? |

---

## Report
`/app/memory/evidence/ROLES_PERMISSIONS_DEEP_INVESTIGATION_2026_07_18.md`
