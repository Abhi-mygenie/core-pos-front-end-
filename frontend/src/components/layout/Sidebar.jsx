import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronDown, User, Home as HomeIcon, ClipboardList, BarChart3, 
  UtensilsCrossed, Users, Wallet, Package, Settings, LogOut, 
  PanelLeftClose, PanelLeft, RefreshCw, Bell, BellOff 
} from "lucide-react";
import { COLORS, GENIE_LOGO_URL } from "../../constants";
import { useAuth, useRestaurant, useMenu, useTables, useSettings } from "../../contexts";
import { useOrders } from "../../contexts";
import { useToast } from "../../hooks/use-toast";

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
    children: [
      { id: "paid", label: "Paid", path: "/orders/paid" },
      { id: "pending", label: "Pending", path: "/orders/pending" },
      { id: "credit", label: "Credit/Tab", path: "/orders/credit" },
      { id: "cancelled", label: "Cancelled", path: "/orders/cancelled" },
    ],
  },
  {
    id: "reports",
    label: "Order Reports",
    icon: BarChart3,
    children: [
      { id: "audit", label: "Audit Report", path: "/reports/audit" },
      { id: "summary", label: "Order Summary", path: "/reports/summary" },
      { id: "report-x", label: "X Report", path: "/reports/x" },
      { id: "report-y", label: "Y Report", path: "/reports/y" },
      { id: "report-z", label: "Z Report", path: "/reports/z" },
    ],
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
const Sidebar = ({ isExpanded, setIsExpanded, isSilentMode, setIsSilentMode, onOpenSettings, onOpenMenu, onRefresh, isRefreshing, isOrderEntryOpen }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout: authLogout, hasPermission } = useAuth();
  const { restaurant, clearRestaurant } = useRestaurant();
  const { clearMenu } = useMenu();
  const { clearTables } = useTables();
  const { clearSettings } = useSettings();
  const { clearOrders } = useOrders();

  const [expandedSections, setExpandedSections] = useState({});
  const [activeItem, setActiveItem] = useState("dashboard");

  const handleRefreshClick = () => {
    if (isOrderEntryOpen) {
      toast({ title: "Close current order first", description: "Please close the open order before refreshing." });
      return;
    }
    onRefresh?.();
  };

  // Only show these sidebar sections (hide the rest)
  const VISIBLE_SECTIONS = new Set(['dashboard', 'reports', 'menu-management']);

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
      if (child.id === 'audit' || child.id === 'summary' || child.id === 'all-orders') {
        setActiveItem(child.id);
        navigate(child.path);
        return;
      }
      // Other report types - coming soon
      showComingSoon(child.label);
      return;
    }
    
    // All other children are "Coming soon" in Phase 1
    showComingSoon(child.label);
  };

  const handleLogout = () => {
    // Clear ALL contexts — prevents mixed session state between account switches
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
      className="h-screen flex flex-col transition-all duration-300 flex-shrink-0"
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

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-4">
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
        className="p-4"
        style={{ borderTop: `1px solid ${COLORS.borderGray}` }}
      >
        {/* Silent Mode Toggle */}
        <button
          data-testid="sidebar-silent-toggle"
          onClick={() => setIsSilentMode(!isSilentMode)}
          className={`w-full flex items-center gap-3 px-2 py-2.5 mb-3 rounded-lg transition-colors ${
            isExpanded ? "justify-start" : "justify-center"
          }`}
          style={{ 
            backgroundColor: isSilentMode ? `${COLORS.grayText}15` : `${COLORS.primaryGreen}15`,
            color: isSilentMode ? COLORS.grayText : COLORS.primaryGreen,
          }}
          title={!isExpanded ? (isSilentMode ? "Silent Mode" : "Ringer On") : undefined}
        >
          {isSilentMode ? (
            <BellOff className="w-5 h-5 flex-shrink-0" />
          ) : (
            <Bell className="w-5 h-5 flex-shrink-0" />
          )}
          {isExpanded && (
            <span className="text-sm font-medium">
              {isSilentMode ? "Silent Mode" : "Ringer On"}
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
