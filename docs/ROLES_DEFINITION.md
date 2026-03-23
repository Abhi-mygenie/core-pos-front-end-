# Roles & Permissions (RBAC) Definition

> Last Updated: 2026-03-23
> Source: `role` array from `GET /api/v2/vendoremployee/vendor-profile/profile`
> Current test account: `owner@18march.com` (role_name: "Owner") — has all 50 permissions

---

## Permission List (50 total)

Grouped by feature area:

### Core / Role
| Permission | Description | UI Gating |
|---|---|---|
| `Manager` | Manager role flag | Role-level access |
| `pos` | POS access | Access to POS system |

### Menu & Food
| Permission | Description | UI Gating |
|---|---|---|
| `menu` | Menu management access | Sidebar: "Menu Management" visibility |
| `food` | Food/product management | Menu panel: Add/Edit product buttons |
| `food_transfer` | Transfer food between stations | Order flow action |

### Order Management
| Permission | Description | UI Gating |
|---|---|---|
| `order` | Order access | Dashboard: View orders |
| `order_edit` | Edit existing orders | Order card: Edit button |
| `order_cancel` | Cancel orders | Order card: Cancel button |
| `order_unpaid` | View/manage unpaid orders | Dashboard: Unpaid filter |
| `serve` | Mark items as served | Order card: Serve button |
| `Ready` | Mark items as ready | Order card: Ready button |

### Billing & Payment
| Permission | Description | UI Gating |
|---|---|---|
| `bill` | Generate bills | Order card: Bill button |
| `clear_payment` | Clear payment | Order card: Collect button |
| `update_payment` | Update payment method | Payment modal actions |
| `discount` | Apply discounts | Order entry: Discount button |
| `coupon` | Apply coupons | Order entry: Coupon button |
| `Loyalty` | Loyalty program access | Billing: Loyalty points |
| `virtual_wallet` | Customer wallet access | Payment: Wallet option |

### Table Management
| Permission | Description | UI Gating |
|---|---|---|
| `table_management` | Manage tables (CRUD) | Settings: Table Management tile |
| `table_view` | View tables | Dashboard: Dine-in tab visibility |
| `merge_table` | Merge tables | Table action: Merge button |
| `transfer_table` | Transfer table orders | Table action: Transfer button |

### Delivery & Online
| Permission | Description | UI Gating |
|---|---|---|
| `delivery_man` | Delivery person management | Delivery settings |
| `delivery_management` | Delivery order management | Dashboard: Delivery tab |
| `show_online_order` | View online orders | Dashboard: Online orders |
| `assign_online_order` | Assign online orders | Order card: Assign button |
| `aggregator` | Aggregator order access | Dashboard: Aggregator orders |

### Employee Management
| Permission | Description | UI Gating |
|---|---|---|
| `employee` | Employee management | Sidebar: "Employees" visibility |

### Inventory
| Permission | Description | UI Gating |
|---|---|---|
| `inventory` | Inventory management | Sidebar: "Inventory" visibility |
| `physicalqty_master` | Physical quantity master | Inventory: Stock count |

### Reports
| Permission | Description | UI Gating |
|---|---|---|
| `report` | General reports access | Sidebar: "Reports" visibility |
| `report_summery` | Summary report | Reports: Summary tab |
| `sales_report` | Sales report | Reports: Sales tab |
| `revenue_report` | Revenue report | Reports: Revenue tab |
| `revenue_report_average` | Average revenue report | Reports: Avg Revenue tab |
| `cancellation_report` | Cancellation report | Reports: Cancellations tab |
| `consumption_report` | Consumption report | Reports: Consumption tab |
| `sattle_report` | Settlement report | Reports: Settlement tab |
| `wastage_report` | Wastage report | Reports: Wastage tab |
| `waiter_revenue_report` | Waiter revenue report | Reports: Waiter Revenue tab |
| `room_report` | Room report | Reports: Room tab |
| `pl_report` | P&L report | Reports: P&L tab |

### Settings & Configuration
| Permission | Description | UI Gating |
|---|---|---|
| `restaurant_settings` | Restaurant settings access | Sidebar: "Settings" visibility |
| `restaurant_setup` | Restaurant setup | Settings: Setup tile |
| `printer_management` | Printer management | Settings: Printers tile |
| `printer` | Printer access | Print actions |
| `print_icon` | Show print icon | Order card: Print icon |
| `whatsapp_icon` | Show WhatsApp icon | Order card: WhatsApp icon |

### Expenses
| Permission | Description | UI Gating |
|---|---|---|
| `expence` | Expense management | Sidebar: "Expenses" visibility |

### Customer
| Permission | Description | UI Gating |
|---|---|---|
| `customer_management` | Customer management | Customer lookup/management |

### Reporting Method
| Permission | Description | UI Gating |
|---|---|---|
| `settelment_report` | Settlement report (alternate) | Reports module |

---

## Sidebar Menu → Permission Mapping

| Sidebar Item | Required Permission(s) | Phase 1 Status |
|---|---|---|
| Dashboard | `pos` | Mapped — visibility gated by `hasPermission('pos')` |
| Orders | `order` | Mapped — visibility gated |
| Reports | `report` | Mapped — visibility gated |
| Menu Management | `menu` | Mapped — visibility gated, opens panel (Sub-step 3) |
| Employees | `employee` | Mapped — "Coming soon" toast on click |
| Expenses | `expence` | Mapped — "Coming soon" toast on click |
| Inventory | `inventory` | Mapped — "Coming soon" toast on click |
| Settings | `restaurant_settings` | Mapped — visibility gated, opens Settings panel |

---

## Role Hierarchy (Observed)

| Role | Permissions | Notes |
|---|---|---|
| **Owner** | All 50 | Full access |
| **Manager** | Most (varies) | Typically all except some financial |
| **Captain/Waiter** | Limited | `order`, `serve`, `table_view`, `bill` |
| **Cashier** | Billing focused | `bill`, `clear_payment`, `update_payment` |
| **KDS Operator** | Kitchen only | `food`, `serve`, `Ready` |

> Note: Exact role → permission mappings depend on backend configuration per restaurant. The above is a general pattern. The frontend should always check individual permissions, not role names.

---

## Implementation Notes

1. **Always check permissions array**, never rely on `role_name` string
2. Use `useAuth().hasPermission('permission_name')` for single checks
3. Use `useAuth().hasAnyPermission([...])` for "show if ANY match"
4. Use `useAuth().hasAllPermissions([...])` for "show if ALL match"
5. Phase 1: Read-only — permission checks gate visibility only. CRUD actions show "Coming soon" toast.
