// CR-069: Permission Catalog — 52 backend permissions → 8 business-function groups
// Source: Live GET /api/v2/vendoremployee/employee/all-role-list (verified 2026-07-15)
// R9 compliance: All keys use exact backend spelling (expence, sattle_report, etc.)

export const PERMISSION_GROUPS = [
  {
    id: 'orders', title: 'Orders & Billing', color: '#329937', icon: 'ClipboardList',
    description: 'Place, edit, cancel orders and manage payments',
    permissions: [
      { key: 'pos', label: 'Access POS', desc: 'Can open the POS screen' },
      { key: 'order', label: 'Place Orders', desc: 'Create new orders' },
      { key: 'order_edit', label: 'Edit Orders', desc: 'Modify items in existing orders' },
      { key: 'order_cancel', label: 'Cancel Orders', desc: 'Cancel entire orders or items' },
      { key: 'bill', label: 'Generate Bills', desc: 'Create and view bills' },
      { key: 'confirm_order', label: 'Confirm Orders', desc: 'Confirm pending orders' },
      { key: 'order_unpaid', label: 'Mark Unpaid', desc: 'Mark orders as unpaid / pay later' },
      { key: 'update_payment', label: 'Update Payment', desc: 'Change payment method after billing' },
      { key: 'clear_payment', label: 'Clear Payment', desc: 'Clear or void a payment' },
      { key: 'serve', label: 'Mark Served', desc: 'Mark items as served to customer' },
      { key: 'ready', label: 'Mark Ready', desc: 'Mark items as ready in kitchen' },
      { key: 'food', label: 'View Menu Items', desc: 'See food items on POS' },
    ],
  },
  {
    id: 'discounts', title: 'Discounts & Offers', color: '#F4A11A', icon: 'Tag',
    description: 'Apply discounts, coupons, loyalty, and complimentary items',
    permissions: [
      { key: 'discount', label: 'Apply Discounts', desc: 'Apply order or item level discounts' },
      { key: 'complementary_food', label: 'Mark Complimentary', desc: 'Mark items or orders as complimentary' }, // R9 typo
      { key: 'coupon', label: 'Manage Coupons', desc: 'Create and manage coupon codes' },
      { key: 'loyalty', label: 'Loyalty Program', desc: 'Access loyalty points and rewards' },
      { key: 'virtual_wallet', label: 'Virtual Wallet', desc: 'Manage customer wallet balance' },
    ],
  },
  {
    id: 'tables', title: 'Tables & Rooms', color: '#3B82F6', icon: 'LayoutGrid',
    description: 'Manage dine-in tables, room assignments, and transfers',
    permissions: [
      { key: 'table_view', label: 'View Tables', desc: 'See table layout and status' },
      { key: 'transfer_table', label: 'Transfer Table', desc: 'Move orders between tables' },
      { key: 'merge_table', label: 'Merge Tables', desc: 'Combine tables for a single bill' },
      { key: 'food_transfer', label: 'Transfer Items', desc: 'Move items between orders' },
      { key: 'table_management', label: 'Table Settings', desc: 'Add, edit, delete tables and rooms' },
    ],
  },
  {
    id: 'delivery', title: 'Delivery & Online', color: '#8B5CF6', icon: 'Truck',
    description: 'Manage delivery orders, riders, and aggregator integration',
    permissions: [
      { key: 'delivery_man', label: 'Assign Riders', desc: 'Assign delivery riders to orders' },
      { key: 'delivery_management', label: 'Delivery Settings', desc: 'Configure delivery zones and charges' },
      { key: 'aggregator', label: 'Aggregator Orders', desc: 'Manage Swiggy/Zomato integration' },
      { key: 'show_online_order', label: 'View Online Orders', desc: 'See incoming online orders' },
      { key: 'assign_online_order', label: 'Accept Online Orders', desc: 'Accept or reject online orders' },
    ],
  },
  {
    id: 'menu', title: 'Menu & Inventory', color: '#F26B33', icon: 'UtensilsCrossed',
    description: 'Manage menu items, categories, pricing, and stock',
    permissions: [
      { key: 'menu', label: 'Menu Management', desc: 'Add, edit, delete menu items' },
      { key: 'inventory', label: 'Inventory', desc: 'Track stock levels and quantities' },
      { key: 'physicalqty_master', label: 'Physical Qty Master', desc: 'Manage physical quantity records' },
    ],
  },
  {
    id: 'customers', title: 'Customers', color: '#EC4899', icon: 'Users',
    description: 'Customer data, CRM, and communication',
    permissions: [
      { key: 'customer_management', label: 'Customer Management', desc: 'View and manage customer records' },
      { key: 'whatsapp_icon', label: 'WhatsApp Messaging', desc: 'Send messages via WhatsApp' },
    ],
  },
  {
    id: 'settings', title: 'Setup & Admin', color: '#64748b', icon: 'Settings',
    description: 'Restaurant settings, employees, printers, and configuration',
    permissions: [
      { key: 'employee', label: 'Employee Management', desc: 'Add, edit, manage staff members' },
      { key: 'restaurant_setup', label: 'Restaurant Setup', desc: 'Configure restaurant profile' },
      { key: 'restaurant_settings', label: 'General Settings', desc: 'Operating hours, payment methods, etc.' },
      { key: 'printer', label: 'Print Bills', desc: 'Print KOT and bills' },
      { key: 'printer_management', label: 'Printer Settings', desc: 'Configure printer assignments' },
      { key: 'print_icon', label: 'Show Print Button', desc: 'Print button visible on order cards' },
      { key: 'token_display', label: 'Token Display', desc: 'Show token numbers on screen' },
      { key: 'expence', label: 'Expense Management', desc: 'Record and manage daily expenses' }, // R9 typo
    ],
  },
  {
    id: 'reports', title: 'Reports & Analytics', color: '#0EA5E9', icon: 'BarChart3',
    description: 'Access sales, revenue, settlement, and operational reports',
    permissions: [
      { key: 'report', label: 'View Reports', desc: 'Access the reports section' },
      { key: 'sales_report', label: 'Sales Report', desc: 'Daily and period sales data' },
      { key: 'revenue_report', label: 'Revenue Report', desc: 'Revenue breakdown by channel' },
      { key: 'revenue_report_average', label: 'Revenue Averages', desc: 'Average order value metrics' },
      { key: 'report_summery', label: 'Summary Report', desc: 'Overview dashboard with KPIs' }, // R9 typo
      { key: 'sattle_report', label: 'Settlement Report', desc: 'Cash settlement and day-close data' }, // R9 typo
      { key: 'waiter_revenue_report', label: 'Waiter Revenue', desc: 'Revenue broken down by waiter' },
      { key: 'room_report', label: 'Room Report', desc: 'Room billing and occupancy data' },
      { key: 'consumption_report', label: 'Consumption Report', desc: 'Inventory consumption tracking' },
      { key: 'cancellation_report', label: 'Cancellation Report', desc: 'Cancelled orders and reasons' },
      { key: 'pl_report', label: 'P&L Report', desc: 'Profit and loss statement' },
      { key: 'wastage_report', label: 'Wastage Report', desc: 'Food wastage tracking' },
    ],
  },
];

export const SECTION_COLORS = Object.fromEntries(
  PERMISSION_GROUPS.map(g => [g.id, g.color])
);

export const TOTAL_PERMISSIONS = PERMISSION_GROUPS.reduce(
  (sum, g) => sum + g.permissions.length, 0
); // 52

// Flatten for quick lookup
export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.permissions);
export const PERMISSION_MAP = Object.fromEntries(ALL_PERMISSIONS.map(p => [p.key, p]));

// Get category breakdown for a set of module keys
export function getCategoryBreakdown(moduleKeys) {
  const keySet = new Set(moduleKeys || []);
  const breakdown = {};
  for (const group of PERMISSION_GROUPS) {
    breakdown[group.id] = group.permissions.filter(p => keySet.has(p.key)).length;
  }
  return breakdown;
}
