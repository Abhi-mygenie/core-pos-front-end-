import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  ChevronDown, User, Home as HomeIcon, ClipboardList, BarChart3, 
  UtensilsCrossed, Users, Wallet, Package, Settings, LogOut, 
  PanelLeftClose, PanelLeft, RefreshCw, Bell, BellOff, Eye,
  LayoutGrid, List, Columns, Rows, LineChart, Banknote, Store as StoreIcon, Receipt
} from "lucide-react";
import { COLORS, GENIE_LOGO_URL } from "../../constants";
import { useAuth, useRestaurant, useMenu, useTables, useSettings } from "../../contexts";
import { useOrders } from "../../contexts";
import { useNotifications } from "../../contexts/NotificationContext";
import { useToast } from "../../hooks/use-toast";
import { clearInsightsCache } from "../../api/services/insightsCache";
import { useInsightsCacheSafe } from "../../contexts/InsightsCacheContext"; // BUG-136

// BUG-136: Sidebar scroll position persistence across navigations
const useSidebarScroll = () => {
  const ctx = useInsightsCacheSafe();
  const navRef = useRef(null);

  const saveScroll = useCallback(() => {
    if (navRef.current && ctx?.setSidebarScrollTop) {
      ctx.setSidebarScrollTop(navRef.current.scrollTop);
    }
  }, [ctx]);

  // Restore scroll position on mount
  useLayoutEffect(() => {
    if (navRef.current && ctx?.sidebarScrollTop > 0) {
      navRef.current.scrollTop = ctx.sidebarScrollTop;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { navRef, saveScroll };
};

// CR-041: Permission mapping for sidebar items
const SIDEBAR_PERMISSIONS = {
  dashboard: 'pos',
  'day-closure': 'pos',
  'expenses': 'pos',           // CR-059
  'menu-management': 'menu',
  credit: 'pos',
  reports: 'report',
  settings: 'restaurant_settings',
  inventory: 'inventory',      // CR-072
  insights: 'report',
};

// CR-041: Coming Soon items (placeholders for TBD screens)
const COMING_SOON_ITEMS = new Set([]);

// CR-041: Sidebar Menu Data — restructured
const sidebarMenuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: HomeIcon,
    path: "/dashboard",
  },
  {
    id: "day-closure",
    label: "Day Closure",
    icon: Banknote,
    path: "/day-closure",
  },
  // CR-059: Expense Module
  {
    id: "expenses",
    label: "Expenses",
    icon: Receipt,
    children: [
      { id: "add-expenses", label: "Add Expenses", path: "/expenses" },
      { id: "expense-setup", label: "Expense Setup", path: "/expense-setup" },
    ],
  },
  {
    id: "menu-management",
    label: "Menu Management",
    icon: UtensilsCrossed,
    path: "/menu",
  },
  {
    id: "credit",
    label: "Credit Management",
    icon: Wallet,
    path: "/credit",
  },
  {
    id: "reports",
    label: "Daily Report",
    icon: BarChart3,
    children: [
      { id: "summary", label: "Sales Summary", path: "/reports/summary" },
      { id: "audit", label: "Order Report", path: "/reports/audit" },
      { id: "item-report", label: "Item Report", comingSoon: true },
      { id: "insights-settlement", label: "Settlement Report", path: "/reports-module/settlement" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    children: [
      { id: "restaurant-setup", label: "Restaurant Setup", path: "/restaurant-settings" },
      { id: "table-management", label: "Table Management", path: "/settings" }, // CR-060
      { id: "printers", label: "Printers", comingSoon: true },
      { id: "operating-hours", label: "Operating Hours", comingSoon: true },
      { id: "cancellation-reasons", label: "Cancellation Reasons", comingSoon: true },
      { id: "employee-management", label: "Employee Management", path: "/employees" }, // CR-069
      { id: "dashboard-display", label: "Dashboard Display", path: "/visibility/status-config" },
      { id: "all-settings", label: "All Settings", path: "/settings" },
    ],
  },
  // CR-072/CR-078/CR-079 — Inventory Management
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    children: [
      { id: "inventory-dashboard", label: "Dashboard", path: "/inventory-dashboard" },                                  // CR-079 · Intelligence view (default)
      { id: "inventory-current-stock", label: "Current Stock", path: "/inventory-current-stock" },                      // CR-079 · was "Stock Dashboard"
      { id: "inventory-smart-purchase", label: "Smart Purchase", path: "/inventory-smart-purchase" },                   // CR-078 · was "Purchase Entry"
      { id: "inventory-receive", label: "Receive", path: "/inventory-receive", featureGate: "restaurantTypeFlagged" },  // CR-077 · conditional B13 (franchise + master)
      { id: "inventory-audit", label: "Stock Audit", path: "/inventory-audit" },                                        // CR-079 · absorbs CR-075-B · was "Physical Count"
      { id: "inventory-setup", label: "Ingredients & Setup", path: "/inventory-setup" },
      { id: "inventory-recipes", label: "Recipes", path: "/recipes" },
    ],
  },
  // CR-011 — Insights module (LAST in sidebar per CR-041)
  {
    id: "insights",
    label: "Insights",
    icon: LineChart,
    children: [
      { id: "insights-dashboard", label: "Dashboard", path: "/reports-module/dashboard" },
      // Sales group
      { id: "insights-sales-group", label: "Sales", isGroup: true },
      { id: "insights-sales", label: "Sales Overview", path: "/reports-module/sales" },
      { id: "insights-daily-sales", label: "Daily Sales", path: "/reports-module/daily-sales" },
      { id: "insights-hourly-sales", label: "Hourly Sales", path: "/reports-module/hourly-sales" },
      { id: "insights-day-of-week", label: "Day-of-Week", path: "/reports-module/day-of-week" },
      { id: "insights-channel-pivot", label: "Channel & Payment", path: "/reports-module/channel-pivot" },
      // Items group
      { id: "insights-items-group", label: "Sales Ledger", isGroup: true },
      { id: "insights-items", label: "Items Ledger", path: "/reports-module/items" },
      { id: "insights-order-ledger", label: "Orders Ledger", path: "/reports-module/order-ledger" },
      // Payments group
      { id: "insights-payments-group", label: "Payments", isGroup: true },
      { id: "insights-payments", label: "Payments Overview", path: "/reports-module/payments" },
      { id: "insights-cashier-settlement", label: "Cashier Settlement", path: "/reports-module/cashier-settlement" },
      { id: "insights-gateway-recon", label: "Gateway Recon", path: "/reports-module/gateway-recon" },
      { id: "insights-tips", label: "Tip Report", path: "/reports-module/tips" },
      { id: "insights-round-off", label: "Round-Off", path: "/reports-module/round-off" },
      // Tax group
      { id: "insights-tax-group", label: "Tax", isGroup: true },
      { id: "insights-tax-detail", label: "GST / VAT Detail", path: "/reports-module/tax-detail" },
      { id: "insights-tax-slabs", label: "Tax Slabs", path: "/reports-module/tax-slabs" },
      { id: "insights-tax-calc", label: "Inclusive / Exclusive", path: "/reports-module/tax-calc" },
      // Discounts group
      { id: "insights-discounts-group", label: "Discounts", isGroup: true },
      { id: "insights-discounts", label: "Discount Report", path: "/reports-module/discounts" },
      { id: "insights-coupons", label: "Coupon Usage", path: "/reports-module/coupons" },
      // Cancellations group
      { id: "insights-cancel-group", label: "Cancellations", isGroup: true },
      { id: "insights-cancellations", label: "Cancellations", path: "/reports-module/cancellations" },
      { id: "insights-cancel-detail", label: "Item Cancel Detail", path: "/reports-module/cancel-detail" },
      { id: "insights-order-notes", label: "Order Notes", path: "/reports-module/order-notes" },
      // Locations group
      { id: "insights-locations-group", label: "Locations", isGroup: true },
      { id: "insights-table-sales", label: "Table-wise Sales", path: "/reports-module/locations-tables" },
      { id: "insights-delivery-charges", label: "Delivery Charges", path: "/reports-module/locations-delivery" },
      { id: "insights-room-transfers", label: "Room Transfers", path: "/reports-module/locations-transfers", featureGate: "room" }, // F-10: gated by features.room
      // Staff group
      { id: "insights-staff-group", label: "Staff", isGroup: true },
      { id: "insights-staff-servers", label: "Server Performance", path: "/reports-module/staff-servers" },
      { id: "insights-staff-cashiers", label: "Cashier Activity", path: "/reports-module/staff-cashiers" },
      // Audit group
      { id: "insights-audit-group", label: "Audit", isGroup: true },
      { id: "insights-audit-log", label: "Order Edit Audit", path: "/reports-module/audit-log" },
      // Customers group
      { id: "insights-customers-group", label: "Customers", isGroup: true },
      { id: "insights-customers-rfm", label: "Customer Intelligence", path: "/reports-module/customers-rfm" },
      { id: "insights-customers-mix", label: "Guest vs Registered", path: "/reports-module/customers-mix" },
      // Operations group
      { id: "insights-ops-group", label: "Operations", isGroup: true },
      { id: "insights-kitchen", label: "Kitchen Ops", path: "/reports-module/kitchen-ops" },
      { id: "insights-kot-variance", label: "KOT Variance", path: "/reports-module/kot-variance" },
      { id: "insights-room-orders", label: "Room Orders", path: "/reports-module/room-orders" },
      { id: "insights-food-court", label: "Food Court", path: "/reports-module/food-court" },
      // CR-061: Expense Report
      { id: "insights-expenses-group", label: "Expenses", isGroup: true },
      { id: "insights-expense-report", label: "Expense Report", path: "/reports-module/expense-report" },
    ],
  },
];

// Sidebar Component
const Sidebar = ({ 
  isExpanded, 
  setIsExpanded, 
  // CR-041: onOpenSettings/Menu/Credit/Settlement removed (panel → route migration)
  onRefresh, 
  isRefreshing, 
  isOrderEntryOpen,
  // VIEW_MODE_LOCK v2 (Task 1 revision, Steps 1 & 4): runtime view toggles
  // are restored as the legacy default. Each axis is hidden only when the
  // corresponding lock flag is true (admin override active).
  activeView,
  setActiveView,
  dashboardView,
  setDashboardView,
  lockTableOrder = false,
  lockChannelStatus = false,
}) => {
  const navigate = useNavigate();
  const { navRef, saveScroll } = useSidebarScroll(); // BUG-136
  const { toast } = useToast();
  const { user, logout: authLogout, hasPermission } = useAuth();
  const { restaurant, clearRestaurant, restaurantTypeFlag } = useRestaurant();
  const { clearMenu } = useMenu();
  const { clearTables } = useTables();
  const { clearSettings } = useSettings();
  const { clearOrders } = useOrders();
  const { soundEnabled, setSoundEnabled } = useNotifications();

  const [expandedSections, setExpandedSections] = useState({});
  const [activeItem, setActiveItem] = useState("dashboard");

  // CR-052: Flyout state for collapsed sidebar
  const [flyoutItem, setFlyoutItem] = useState(null);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const flyoutRef = useRef(null);

  // CR-011 S1: derive active sidebar item from the current route so the
  // correct child (e.g. Insights → Dashboard) gets highlighted on page load
  // and after browser navigation — not just after an in-app click.
  const location = useLocation();
  useEffect(() => {
    const path = location.pathname;
    // Walk visible menu to find a matching child path first (more specific)
    for (const item of sidebarMenuItems) {
      if (item.children) {
        for (const child of item.children) {
          if (child.path && (path === child.path || path.startsWith(child.path + "/"))) {
            setActiveItem(child.id);
            setExpandedSections((prev) => ({ ...prev, [item.id]: true }));
            return;
          }
        }
      }
    }
    // Fallback: top-level item path match
    for (const item of sidebarMenuItems) {
      if (item.path && (path === item.path || path.startsWith(item.path + "/"))) {
        setActiveItem(item.id);
        return;
      }
    }
  }, [location.pathname]);

  // CR-052: Close flyout on click outside
  useEffect(() => {
    if (!flyoutItem) return;
    const handler = (e) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target)) {
        setFlyoutItem(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [flyoutItem]);

  // CR-052: Close flyout when sidebar expands
  useEffect(() => {
    if (isExpanded) setFlyoutItem(null);
  }, [isExpanded]);

  const handleRefreshClick = () => {
    if (isOrderEntryOpen) {
      toast({ title: "Close current order first", description: "Please close the open order before refreshing." });
      return;
    }
    onRefresh?.();
  };

  // Only show these sidebar sections (hide the rest)
  const VISIBLE_SECTIONS = new Set(['dashboard', 'day-closure', 'expenses', 'menu-management', 'credit', 'reports', 'settings', 'inventory', 'insights']); // CR-041, CR-059, CR-072

  // Filter menu items by visibility + permission
  const visibleMenuItems = sidebarMenuItems.filter((item) => {
    if (!VISIBLE_SECTIONS.has(item.id)) return false;
    const perm = SIDEBAR_PERMISSIONS[item.id];
    if (!perm) return true;
    return hasPermission(perm);
  });

  const showComingSoon = (label) => {
    toast({
      title: "Coming Soon",
      description: `${label} will be available in a future update.`,
    });
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleItemClick = (item) => {
    // "Coming soon" items
    if (COMING_SOON_ITEMS.has(item.id)) {
      showComingSoon(item.label);
      return;
    }

    // CR-041: Panel special-cases removed. All items now use path or children toggle.

    // Items with children - toggle expansion or show flyout
    if (item.children) {
      // CR-052: Collapsed → show flyout instead of expanding sidebar
      if (!isExpanded) {
        if (flyoutItem?.id === item.id) {
          setFlyoutItem(null);
        } else {
          setFlyoutItem(item);
        }
        return;
      }
      toggleSection(item.id);
    } else {
      setActiveItem(item.id);
      if (item.path) {
        saveScroll(); // BUG-136
        navigate(item.path);
      }
    }
  };

  const handleChildClick = (parentId, child) => {
    // CR-041: Daily Report children (renamed from Order Reports)
    if (parentId === 'reports') {
      if (child.comingSoon) {
        showComingSoon(child.label);
        return;
      }
      setActiveItem(child.id);
      saveScroll(); // BUG-136
      navigate(child.path);
      return;
    }

    // CR-041: Settings children
    if (parentId === 'settings') {
      if (child.comingSoon) {
        showComingSoon(child.label);
        return;
      }
      setActiveItem(child.id);
      saveScroll(); // BUG-136
      navigate(child.path);
      return;
    }

    // CR-011 — Insights module children
    if (parentId === 'insights') {
      if (child.comingSoon) {
        showComingSoon(child.label);
        return;
      }
      setActiveItem(child.id);
      saveScroll(); // BUG-136
      navigate(child.path);
      return;
    }
    
    // CR-059: Expenses children and any future module children with real paths
    if (child.comingSoon) {
      showComingSoon(child.label);
      return;
    }
    if (child.path) {
      setActiveItem(child.id);
      saveScroll();
      navigate(child.path);
      return;
    }

    // Truly unimplemented children
    showComingSoon(child.label);
  };

  const handleLogout = () => {
    // Clear ALL contexts — prevents mixed session state between account switches
    clearInsightsCache();     // CR-044 R-8: clear report cache on logout
    authLogout();
    clearRestaurant();
    clearMenu();
    clearTables();
    clearSettings();
    clearOrders();
    sessionStorage.clear();
    localStorage.removeItem('auth_token');
    localStorage.removeItem('remember_me');
    navigate("/");
  };

  return (
    <aside
      data-testid="sidebar"
      className="h-screen flex flex-col transition-all duration-300 flex-shrink-0 relative"
      style={{ 
        width: isExpanded ? "280px" : "70px",
        backgroundColor: COLORS.lightBg,
        borderRight: `1px solid ${COLORS.borderGray}`,
      }}
    >
      {/* Logo + Collapse Toggle */}
      <div 
        className="p-4 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
      >
        {isExpanded ? (
          <>
            <img 
              src={GENIE_LOGO_URL} 
              alt="Logo" 
              className="h-10 w-auto"
            />
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              data-testid="collapse-sidebar"
            >
              <PanelLeftClose className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors mx-auto"
            data-testid="expand-sidebar"
          >
            <PanelLeft className="w-5 h-5" style={{ color: COLORS.grayText }} />
          </button>
        )}
      </div>

      {/* VIEW_MODE_LOCK v2 (Task 1 revision, Steps 1 & 4): runtime view
          toggles. Default behaviour = both toggles visible (legacy).
          Each toggle hides only when its axis is locked by an admin
          override saved on StatusConfigPage. The outer container also
          hides if every individual toggle would be hidden, to avoid
          rendering an empty bordered div. */}
      {((setActiveView && !lockTableOrder) || (setDashboardView && !lockChannelStatus)) && (
        <div
          data-testid="view-toggles-container"
          className="px-3 py-3 flex flex-col gap-2"
          style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
        >
          {setActiveView && !lockTableOrder && (
            <button
              data-testid="view-toggle"
              onClick={() => setActiveView(activeView === 'table' ? 'order' : 'table')}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors hover:opacity-90 ${
                isExpanded ? "justify-start" : "justify-center"
              }`}
              style={{
                backgroundColor: `${COLORS.primaryOrange}15`,
                color: COLORS.primaryOrange,
              }}
              title={!isExpanded ? (activeView === 'table' ? "Switch to Order View" : "Switch to Table View") : undefined}
            >
              {activeView === 'table' ? (
                <LayoutGrid className="w-5 h-5 flex-shrink-0" />
              ) : (
                <List className="w-5 h-5 flex-shrink-0" />
              )}
              {isExpanded && (
                <span className="text-sm font-medium">
                  {activeView === 'table' ? 'Table View' : 'Order View'}
                </span>
              )}
            </button>
          )}

          {setDashboardView && !lockChannelStatus && (
            <button
              data-testid="group-toggle"
              onClick={() => setDashboardView(dashboardView === 'channel' ? 'status' : 'channel')}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors hover:opacity-90 ${
                isExpanded ? "justify-start" : "justify-center"
              }`}
              style={{
                backgroundColor: `${COLORS.primaryGreen}15`,
                color: COLORS.primaryGreen,
              }}
              title={!isExpanded ? (dashboardView === 'channel' ? "Switch to Status View" : "Switch to Channel View") : undefined}
            >
              {dashboardView === 'channel' ? (
                <Columns className="w-5 h-5 flex-shrink-0" />
              ) : (
                <Rows className="w-5 h-5 flex-shrink-0" />
              )}
              {isExpanded && (
                <span className="text-sm font-medium">
                  {dashboardView === 'channel' ? 'By Channel' : 'By Status'}
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Menu Items */}
      <nav ref={navRef} className="flex-1 overflow-y-auto py-4 min-h-0">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          const isOpen = expandedSections[item.id];
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={item.id}>
              {/* Main Menu Item */}
              <button
                data-testid={`sidebar-${item.id}`}
                onClick={(e) => {
                  // CR-052: Capture button Y for flyout positioning
                  if (!isExpanded && hasChildren) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const asideRect = e.currentTarget.closest('aside')?.getBoundingClientRect();
                    setFlyoutTop(rect.top - (asideRect?.top || 0));
                  }
                  handleItemClick(item);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                  isExpanded ? "justify-start" : "justify-center"
                }`}
                style={{
                  backgroundColor: isActive && !hasChildren ? `${COLORS.primaryGreen}10` : "transparent",
                  borderLeft: isActive && !hasChildren ? `3px solid ${COLORS.primaryGreen}` : "3px solid transparent",
                  color: isActive && !hasChildren ? COLORS.primaryGreen : COLORS.darkText,
                }}
                title={!isExpanded ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isExpanded && (
                  <>
                    <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                    {hasChildren && (
                      <ChevronDown 
                        className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        style={{ color: COLORS.grayText }}
                      />
                    )}
                  </>
                )}
              </button>

              {/* Children Items */}
              {hasChildren && isExpanded && isOpen && (
                <div className="ml-4 border-l" style={{ borderColor: COLORS.borderGray }}>
                  {item.children.map((child) => {
                    // CR-011 Phase 3: Group headers (non-clickable category labels)
                    if (child.isGroup) {
                      return (
                        <div key={child.id} className="px-4 pt-3 pb-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: COLORS.grayText }}>{child.label}</span>
                        </div>
                      );
                    }
                    // F-10: Feature-gate — hide items when restaurant lacks the feature
                    // CR-078 B13: 'restaurantTypeFlagged' case → show pill for franchise + master, hide for normal/undefined
                    if (child.featureGate === 'restaurantTypeFlagged') {
                      if (!(restaurantTypeFlag === 'franchise' || restaurantTypeFlag === 'master')) return null;
                    } else if (child.featureGate && !restaurant?.features?.[child.featureGate]) return null;
                    const isChildActive = activeItem === child.id;
                    return (
                      <button
                        key={child.id}
                        data-testid={`sidebar-${child.id}`}
                        onClick={() => handleChildClick(item.id, child)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left"
                        style={{
                          backgroundColor: isChildActive ? `${COLORS.primaryGreen}10` : "transparent",
                          color: isChildActive ? COLORS.primaryGreen : COLORS.grayText,
                        }}
                      >
                        <span className="text-sm">{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* CR-052: Flyout panel for collapsed sidebar */}
      {flyoutItem && !isExpanded && (
        <div
          ref={flyoutRef}
          data-testid="sidebar-flyout"
          className="absolute bg-white rounded-xl shadow-2xl border z-[200] overflow-hidden"
          style={{
            left: '70px',
            top: flyoutTop,
            width: '240px',
            maxHeight: '70vh',
            borderColor: COLORS.borderGray,
          }}
        >
          <div
            className="px-4 py-3 sticky top-0 bg-white z-10"
            style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
          >
            <span className="font-semibold text-sm" style={{ color: COLORS.darkText }}>
              {flyoutItem.label}
            </span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 48px)' }}>
            {flyoutItem.children.map((child) => {
              if (child.isGroup) {
                return (
                  <div key={child.id} className="px-4 pt-3 pb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: COLORS.grayText }}>
                      {child.label}
                    </span>
                  </div>
                );
              }
              // CR-078 B13: 'restaurantTypeFlagged' case → show pill for franchise + master
              if (child.featureGate === 'restaurantTypeFlagged') {
                if (!(restaurantTypeFlag === 'franchise' || restaurantTypeFlag === 'master')) return null;
              } else if (child.featureGate && !restaurant?.features?.[child.featureGate]) return null;
              const isChildActive = activeItem === child.id;
              return (
                <button
                  key={child.id}
                  data-testid={`flyout-${child.id}`}
                  onClick={() => {
                    setFlyoutItem(null);
                    handleChildClick(flyoutItem.id, child);
                  }}
                  className="w-full flex items-center px-4 py-2.5 transition-colors text-left hover:bg-gray-50"
                  style={{
                    backgroundColor: isChildActive ? `${COLORS.primaryGreen}10` : 'transparent',
                    color: isChildActive ? COLORS.primaryGreen : COLORS.grayText,
                  }}
                >
                  <span className="text-sm">{child.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Section - Ringer, Refresh, Profile & Logout */}
      <div 
        className="p-4 flex-shrink-0"
        style={{ borderTop: `1px solid ${COLORS.borderGray}` }}
      >
        {/* Silent Mode Toggle */}
        <button
          data-testid="sidebar-silent-toggle"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`w-full flex items-center gap-3 px-2 py-2.5 mb-3 rounded-lg transition-colors ${
            isExpanded ? "justify-start" : "justify-center"
          }`}
          style={{ 
            backgroundColor: !soundEnabled ? `${COLORS.grayText}15` : `${COLORS.primaryGreen}15`,
            color: !soundEnabled ? COLORS.grayText : COLORS.primaryGreen,
          }}
          title={!isExpanded ? (!soundEnabled ? "Silent Mode" : "Ringer On") : undefined}
        >
          {!soundEnabled ? (
            <BellOff className="w-5 h-5 flex-shrink-0" />
          ) : (
            <Bell className="w-5 h-5 flex-shrink-0" />
          )}
          {isExpanded && (
            <span className="text-sm font-medium">
              {!soundEnabled ? "Silent Mode" : "Ringer On"}
            </span>
          )}
        </button>

        {/* Refresh Button */}
        <button
          data-testid="sidebar-refresh"
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          className={`w-full flex items-center gap-3 px-2 py-2.5 mb-1 rounded-lg transition-colors hover:bg-gray-100 disabled:opacity-60 ${
            isExpanded ? "justify-start" : "justify-center"
          }`}
          style={{ color: COLORS.primaryOrange }}
          title={!isExpanded ? "Refresh Data" : undefined}
        >
          <RefreshCw className={`w-5 h-5 flex-shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isExpanded && <span className="text-sm font-medium">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>}
        </button>

        {/* Profile */}
        <button
          data-testid="sidebar-profile"
          className={`w-full flex items-center gap-3 px-2 py-2.5 hover:bg-gray-100 rounded-lg transition-colors ${
            isExpanded ? "justify-start" : "justify-center"
          }`}
          title={!isExpanded ? "Profile" : undefined}
        >
          {user?.image ? (
            <img 
              src={user.image} 
              alt={user.fullName || 'User'} 
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
          ) : null}
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ 
              backgroundColor: COLORS.primaryOrange,
              display: user?.image ? 'none' : 'flex',
            }}
          >
            <User className="w-4 h-4 text-white" />
          </div>
          {isExpanded && (
            <div className="flex-1 text-left">
              <div className="text-sm font-medium truncate" style={{ color: COLORS.darkText }}>
                {user?.firstName
                  ? `${user.firstName} (${user.roleName || 'Staff'})`
                  : (user?.roleName || 'Staff')}
              </div>
              <div className="text-xs" style={{ color: COLORS.grayText }}>
                {restaurant?.id ? `#${restaurant.id}` : (user?.roleName || '')}
              </div>
            </div>
          )}
        </button>

        {/* Logout */}
        <button
          data-testid="sidebar-logout"
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-2 py-2.5 mt-2 hover:bg-red-50 rounded-lg transition-colors ${
            isExpanded ? "justify-start" : "justify-center"
          }`}
          style={{ color: "#EF4444" }}
          title={!isExpanded ? "Logout" : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isExpanded && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
