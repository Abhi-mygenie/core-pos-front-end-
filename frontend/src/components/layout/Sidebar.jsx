import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  ChevronDown, User, Home as HomeIcon, ClipboardList, BarChart3, 
  UtensilsCrossed, Users, Wallet, Package, Settings, LogOut, 
  PanelLeftClose, PanelLeft, RefreshCw, Bell, BellOff, Eye,
  LayoutGrid, List, Columns, Rows, LineChart, Banknote, Store as StoreIcon
} from "lucide-react";
import { COLORS, GENIE_LOGO_URL } from "../../constants";
import { useAuth, useRestaurant, useMenu, useTables, useSettings } from "../../contexts";
import { useOrders } from "../../contexts";
import { useNotifications } from "../../contexts/NotificationContext";
import { useToast } from "../../hooks/use-toast";
import { clearInsightsCache } from "../../api/services/insightsCache";

// Permission mapping for sidebar items
const SIDEBAR_PERMISSIONS = {
  dashboard: 'pos',
  orders: 'order',
  reports: 'report',
  'menu-management': 'menu',
  employees: 'employee',
  expenses: 'expence',
  inventory: 'inventory',
  settings: 'restaurant_settings',
  'restaurant-setup': 'restaurant_setup',
};

// Items that show "Coming soon" toast instead of navigating
const COMING_SOON_ITEMS = new Set(['employees', 'expenses', 'inventory']);

// Sidebar Menu Data
const sidebarMenuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: HomeIcon,
    path: "/dashboard",
  },
  {
    id: "orders",
    label: "Orders",
    icon: ClipboardList,
    // BUG-104 Phase 2A (L): Orphan children removed — Credit Management is now
    // a standalone top-level sidebar item (F-001/F-002). The "Orders" parent
    // itself is not in VISIBLE_SECTIONS and was already hidden at runtime.
    children: [],
  },
  {
    id: "reports",
    label: "Order Reports",
    icon: BarChart3,
    children: [
      { id: "audit", label: "Daily Report", path: "/reports/audit" },
      { id: "summary", label: "Daily Summary", path: "/reports/summary" },
      // CR-004: New PMS-style Room Orders report. Inherits the `report`
      // permission key (Q-5 / A-9). Route is wired in App.js; click handler
      // below is whitelisted so this child navigates instead of falling
      // through to the "coming soon" toast.
      { id: "rooms", label: "Daily Room Report", path: "/reports/rooms" },
    ],
  },
  // CR-011 — Insights module (POS 4.0). Permission key `reports_module`
  // intentionally NOT in SIDEBAR_PERMISSIONS yet (owner: bypass for now,
  // show to all). Will be added in Phase 4 hardening (S39).
  {
    id: "insights",
    label: "Insights",
    icon: LineChart,
    children: [
      { id: "insights-dashboard", label: "Dashboard", path: "/reports-module/dashboard" },
      { id: "insights-settlement", label: "Settlement", path: "/reports-module/settlement" },
      { id: "insights-sales", label: "Sales", path: "/reports-module/sales" },
      { id: "insights-items", label: "Item Ledger", path: "/reports-module/items" },
      { id: "insights-order-ledger", label: "Order Ledger", path: "/reports-module/order-ledger" },
      { id: "insights-payments", label: "Payments", path: "/reports-module/payments" },
      { id: "insights-tax", label: "Tax", path: "/reports-module/tax", comingSoon: true },
      { id: "insights-discounts", label: "Discounts & Promos", path: "/reports-module/discounts", comingSoon: true },
      { id: "insights-cancellations", label: "Cancellations", path: "/reports-module/cancellations" },
      { id: "insights-locations", label: "Locations & Channels", path: "/reports-module/locations", comingSoon: true },
      { id: "insights-staff", label: "Staff Performance", path: "/reports-module/staff", comingSoon: true },
      { id: "insights-audit-log", label: "Audit Log", path: "/reports-module/audit-log", comingSoon: true },
      { id: "insights-customers", label: "Customers", path: "/reports-module/customers", comingSoon: true },
      { id: "insights-kitchen", label: "Kitchen Ops", path: "/reports-module/kitchen-ops" },
      { id: "insights-room-orders", label: "Room Orders", path: "/reports-module/room-orders" },
      { id: "insights-food-court", label: "Food Court", path: "/reports-module/food-court" },
    ],
  },
  {
    id: "credit",
    label: "Credit Management",
    icon: Wallet,
  },
  {
    id: "settlement",
    label: "Settlement",
    icon: Banknote,
    path: "/settlement",
  },
  {
    id: "restaurant-setup",
    label: "Restaurant Setup",
    icon: StoreIcon,
    path: "/restaurant-settings",
  },
  {
    id: "menu-management",
    label: "Menu Management",
    icon: UtensilsCrossed,
    children: [
      { id: "categories", label: "Categories", path: "/menu/categories" },
      { id: "items", label: "Menu Items", path: "/menu/items" },
      { id: "modifiers", label: "Modifiers/Add-ons", path: "/menu/modifiers" },
      { id: "pricing", label: "Pricing", path: "/menu/pricing" },
      { id: "images", label: "Item Images", path: "/menu/images" },
    ],
  },
  {
    id: "visibility-settings",
    label: "Visibility Settings",
    icon: Eye,
    children: [
      { id: "status-config", label: "Status Configuration", path: "/visibility/status-config" },
    ],
  },
  {
    id: "employees",
    label: "Employees",
    icon: Users,
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: Wallet,
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    children: [
      { id: "business-info", label: "Business Info", path: "/settings/business" },
      { id: "printer", label: "Printer Settings", path: "/settings/printer" },
      { id: "payment", label: "Payment Methods", path: "/settings/payment" },
      { id: "tax", label: "Tax Settings", path: "/settings/tax" },
      { id: "notifications", label: "Notifications", path: "/settings/notifications" },
      { id: "integrations", label: "Integrations", path: "/settings/integrations" },
    ],
  },
];

// Sidebar Component
const Sidebar = ({ 
  isExpanded, 
  setIsExpanded, 
  onOpenSettings, 
  onOpenMenu, 
  onOpenCredit,
  onOpenSettlement,
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
  const { toast } = useToast();
  const { user, logout: authLogout, hasPermission } = useAuth();
  const { restaurant, clearRestaurant } = useRestaurant();
  const { clearMenu } = useMenu();
  const { clearTables } = useTables();
  const { clearSettings } = useSettings();
  const { clearOrders } = useOrders();
  const { soundEnabled, setSoundEnabled } = useNotifications();

  const [expandedSections, setExpandedSections] = useState({});
  const [activeItem, setActiveItem] = useState("dashboard");

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

  const handleRefreshClick = () => {
    if (isOrderEntryOpen) {
      toast({ title: "Close current order first", description: "Please close the open order before refreshing." });
      return;
    }
    onRefresh?.();
  };

  // Only show these sidebar sections (hide the rest)
  const VISIBLE_SECTIONS = new Set(['dashboard', 'reports', 'insights', 'credit', 'settlement', 'restaurant-setup', 'menu-management', 'visibility-settings']);

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

    // Settings opens its own panel
    if (item.id === 'settings') {
      onOpenSettings?.();
      return;
    }

    // Menu Management opens its own panel
    if (item.id === 'menu-management') {
      onOpenMenu?.();
      return;
    }

    // Credit Management opens its own slide-over panel (Menu-Management style).
    if (item.id === 'credit') {
      onOpenCredit?.();
      return;
    }

    // Settlement opens its own slide-over panel.
    if (item.id === 'settlement') {
      onOpenSettlement?.();
      return;
    }

    // Items with children - toggle expansion
    if (item.children) {
      toggleSection(item.id);
    } else {
      setActiveItem(item.id);
      if (item.path) {
        navigate(item.path);
      }
    }
  };

  const handleChildClick = (parentId, child) => {
    // Order Reports children - navigate to actual routes
    if (parentId === 'reports') {
      // CR-004: 'rooms' added so Room Orders Report navigates instead of
      // falling through to the "coming soon" toast.
      if (
        child.id === 'audit' ||
        child.id === 'summary' ||
        child.id === 'all-orders' ||
        child.id === 'rooms'
      ) {
        setActiveItem(child.id);
        navigate(child.path);
        return;
      }
      // Other report types - coming soon
      showComingSoon(child.label);
      return;
    }
    
    // Visibility Settings children - navigate to actual routes
    if (parentId === 'visibility-settings') {
      if (child.id === 'status-config') {
        setActiveItem(child.id);
        navigate(child.path);
        return;
      }
      showComingSoon(child.label);
      return;
    }

    // CR-011 — Insights module children. `insights-dashboard` wired today
    // (S0/S1 of CR-011 Screen Freeze). Remaining 11 sub-items show
    // "Coming Soon" until their respective screens are frozen.
    if (parentId === 'insights') {
      if (child.comingSoon) {
        showComingSoon(child.label);
        return;
      }
      setActiveItem(child.id);
      navigate(child.path);
      return;
    }
    
    // All other children are "Coming soon" in Phase 1
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
      className="h-screen flex flex-col transition-all duration-300 flex-shrink-0 overflow-hidden"
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
      <nav className="flex-1 overflow-y-auto py-4 min-h-0">
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
                onClick={() => handleItemClick(item)}
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
