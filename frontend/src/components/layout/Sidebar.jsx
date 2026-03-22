import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronDown, User, Home as HomeIcon, ClipboardList, BarChart3, 
  UtensilsCrossed, Users, Wallet, Package, Settings, LogOut, 
  PanelLeftClose, PanelLeft, RefreshCw, Bell, BellOff, RotateCcw
} from "lucide-react";
import { COLORS, GENIE_LOGO_URL } from "../../constants";
import { useAuth } from "../../context/AuthContext";
import { useInitialData } from "../../context/InitialDataContext";

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
    label: "Reports",
    icon: BarChart3,
    children: [
      { id: "sales", label: "Sales Report", path: "/reports/sales" },
      { id: "daily", label: "Daily Summary", path: "/reports/daily" },
      { id: "top-selling", label: "Top Selling", path: "/reports/top-selling" },
      { id: "staff-performance", label: "Staff Performance", path: "/reports/staff" },
      { id: "order-history", label: "Order History", path: "/reports/history" },
      { id: "export", label: "Export Data", path: "/reports/export" },
    ],
  },
  {
    id: "menu-management",
    label: "Menu Management",
    icon: UtensilsCrossed,
    path: "/menu", // Opens full panel
  },
  {
    id: "employees",
    label: "Employees",
    icon: Users,
    children: [
      { id: "staff-list", label: "Staff List", path: "/employees/list" },
      { id: "shifts", label: "Shifts & Schedule", path: "/employees/shifts" },
      { id: "roles", label: "Roles & Permissions", path: "/employees/roles" },
      { id: "attendance", label: "Attendance", path: "/employees/attendance" },
      { id: "payroll", label: "Payroll", path: "/employees/payroll" },
    ],
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: Wallet,
    children: [
      { id: "add-expense", label: "Add Expense", path: "/expenses/add" },
      { id: "expense-reports", label: "Expense Reports", path: "/expenses/reports" },
      { id: "expense-categories", label: "Categories", path: "/expenses/categories" },
      { id: "receipts", label: "Receipts", path: "/expenses/receipts" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    children: [
      { id: "stock-list", label: "Stock List", path: "/inventory/stock" },
      { id: "low-stock", label: "Low Stock Alerts", path: "/inventory/alerts" },
      { id: "purchase-orders", label: "Purchase Orders", path: "/inventory/orders" },
      { id: "suppliers", label: "Suppliers", path: "/inventory/suppliers" },
      { id: "stock-reports", label: "Stock Reports", path: "/inventory/reports" },
    ],
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
const Sidebar = ({ isExpanded, setIsExpanded, isSilentMode, setIsSilentMode, settingsOpen, setSettingsOpen, menuManagementOpen, setMenuManagementOpen }) => {
  const navigate = useNavigate();
  const { user, logout: authLogout, token } = useAuth();
  const { loadInitialData, isInitialLoading, resetData } = useInitialData();
  const [expandedSections, setExpandedSections] = useState({});
  const [activeItem, setActiveItem] = useState("dashboard");

  const handleReloadAll = async () => {
    if (token && !isInitialLoading) {
      await loadInitialData(token);
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleItemClick = (item) => {
    // Special handling for Settings - toggle settings panel
    if (item.id === "settings") {
      setSettingsOpen(!settingsOpen);
      setMenuManagementOpen(false);
      setActiveItem(settingsOpen ? "dashboard" : "settings");
      return;
    }
    
    // Special handling for Menu Management - toggle menu panel
    if (item.id === "menu-management") {
      setMenuManagementOpen(!menuManagementOpen);
      setSettingsOpen(false);
      setActiveItem(menuManagementOpen ? "dashboard" : "menu-management");
      return;
    }
    
    // Close panels if open and clicking other menu
    if (settingsOpen) {
      setSettingsOpen(false);
    }
    if (menuManagementOpen) {
      setMenuManagementOpen(false);
    }
    
    if (item.children) {
      toggleSection(item.id);
    } else {
      setActiveItem(item.id);
      // navigate(item.path); // Uncomment when routes are ready
    }
  };

  const handleChildClick = (parentId, child) => {
    if (settingsOpen) {
      setSettingsOpen(false);
    }
    if (menuManagementOpen) {
      setMenuManagementOpen(false);
    }
    setActiveItem(child.id);
    // navigate(child.path); // Uncomment when routes are ready
  };

  const handleLogout = () => {
    authLogout();
    resetData(); // Clear cached data (tables, products, categories, etc.)
    localStorage.removeItem("rememberMe");
    localStorage.removeItem("username");
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
        {sidebarMenuItems.map((item) => {
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
                  backgroundColor: (isActive && !hasChildren) || (item.id === "settings" && settingsOpen) || (item.id === "menu-management" && menuManagementOpen)
                    ? `${COLORS.primaryGreen}10` 
                    : "transparent",
                  borderLeft: (isActive && !hasChildren) || (item.id === "settings" && settingsOpen) || (item.id === "menu-management" && menuManagementOpen)
                    ? `3px solid ${COLORS.primaryGreen}` 
                    : "3px solid transparent",
                  color: (isActive && !hasChildren) || (item.id === "settings" && settingsOpen) || (item.id === "menu-management" && menuManagementOpen)
                    ? COLORS.primaryGreen 
                    : COLORS.darkText,
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

        {/* Refresh Button - Prominent */}
        <button
          data-testid="sidebar-refresh"
          onClick={() => {/* TODO: refresh orders */}}
          className={`w-full flex items-center gap-3 px-2 py-2.5 mb-2 rounded-lg transition-colors hover:opacity-90 ${
            isExpanded ? "justify-start" : "justify-center"
          }`}
          style={{ backgroundColor: COLORS.primaryOrange, color: "white" }}
          title={!isExpanded ? "Refresh Orders" : undefined}
        >
          <RefreshCw className="w-5 h-5 flex-shrink-0" />
          {isExpanded && <span className="text-sm font-semibold">Refresh</span>}
        </button>

        {/* Reload All Settings Button */}
        <button
          data-testid="sidebar-reload-all"
          onClick={handleReloadAll}
          disabled={isInitialLoading}
          className={`w-full flex items-center gap-3 px-2 py-2.5 mb-3 rounded-lg transition-colors hover:opacity-90 ${
            isExpanded ? "justify-start" : "justify-center"
          } ${isInitialLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
          title={!isExpanded ? "Reload All Settings" : undefined}
        >
          <RotateCcw className={`w-5 h-5 flex-shrink-0 ${isInitialLoading ? "animate-spin" : ""}`} />
          {isExpanded && <span className="text-sm font-semibold">{isInitialLoading ? "Reloading..." : "Reload All"}</span>}
        </button>

        {/* Profile */}
        <button
          data-testid="sidebar-profile"
          className={`w-full flex items-center gap-3 px-2 py-2.5 hover:bg-gray-100 rounded-lg transition-colors ${
            isExpanded ? "justify-start" : "justify-center"
          }`}
          title={!isExpanded ? "Profile" : undefined}
        >
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: COLORS.primaryOrange }}
          >
            <User className="w-4 h-4 text-white" />
          </div>
          {isExpanded && (
            <div className="flex-1 text-left">
              <div className="text-sm font-medium" style={{ color: COLORS.darkText }}>
                {user?.firstName || "User"}
              </div>
              <div className="text-xs" style={{ color: COLORS.grayText }}>
                {user?.roleName || "Staff"}
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
