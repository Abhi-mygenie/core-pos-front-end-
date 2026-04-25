import { useState, useRef, useEffect } from "react";
import { PlusSquare, Bike, ShoppingBag, Utensils, DoorOpen, Search, X, ChevronRight, ChevronDown, Check } from "lucide-react";
import { COLORS, LOGO_URL, USE_STATUS_VIEW } from "../../constants";
import { useRestaurant } from "../../contexts";

// Multi-selectable channel IDs (includes Room now - same behavior as tables)
const MULTI_CHANNEL_IDS = ["delivery", "takeAway", "dineIn", "room"];

// Order Type channels with icons and short labels (for Status View filters)
const channels = [
  { id: "delivery", label: "Del", fullLabel: "Delivery", icon: Bike },
  { id: "takeAway", label: "Take", fullLabel: "TakeAway", icon: ShoppingBag },
  { id: "dineIn", label: "Dine", fullLabel: "Dine In", icon: Utensils },
  { id: "room", label: "Room", fullLabel: "Room", icon: DoorOpen },
];

// All 9 Order Status filters (for Channel View filters)
// Maps to fOrderStatus values from API
const allStatusFilters = [
  { id: "pending", fOrderStatus: 7, label: "YTC" },           // Yet to Confirm
  { id: "preparing", fOrderStatus: 1, label: "Preparing" },
  { id: "ready", fOrderStatus: 2, label: "Ready" },
  { id: "running", fOrderStatus: 8, label: "Running" },
  { id: "served", fOrderStatus: 5, label: "Served" },
  { id: "pendingPayment", fOrderStatus: 9, label: "Pending Pay" },
  { id: "paid", fOrderStatus: 6, label: "Paid" },
  { id: "cancelled", fOrderStatus: 3, label: "Cancelled" },
  { id: "reserved", fOrderStatus: 10, label: "Reserved" },
];

// Header Component
const Header = ({ 
  isOnline, 
  activeChannels, 
  setActiveChannels, 
  activeStatuses, 
  setActiveStatuses, 
  tableFilter,
  setTableFilter,
  activeView, 
  setActiveView,
  dashboardView = 'channel',
  setDashboardView,
  hiddenChannels = [],
  hiddenStatuses = [],
  enabledStatuses = [],
  onRestoreHidden,
  searchQuery,
  setSearchQuery,
  searchResults,
  onSearchSelect,
  onAddOrder
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter channels based on restaurant features
  const { features } = useRestaurant();
  const featureChannelMap = {
    delivery: features.delivery,
    takeAway: features.takeaway,
    dineIn: features.dineIn,
    room: features.room,
  };
  const visibleChannels = channels.filter((ch) => featureChannelMap[ch.id] !== false);
  const visibleMultiChannelIds = MULTI_CHANNEL_IDS.filter((id) => featureChannelMap[id] !== false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current && 
        !searchRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Req 2: Order Taking flag — when false, hide the Add button. Cross-tab sync
  // via storage event listener.
  const [orderTakingEnabled, setOrderTakingEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem('mygenie_order_taking_enabled');
      if (stored === null) return true;
      const parsed = JSON.parse(stored);
      return parsed?.enabled !== false;
    } catch (e) {
      return true;
    }
  });
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'mygenie_order_taking_enabled') {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : null;
          setOrderTakingEnabled(parsed?.enabled !== false);
        } catch (err) {
          setOrderTakingEnabled(true);
        }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const handleSearchSelect = (item) => {
    onSearchSelect(item);
    setSearchQuery("");
    setIsSearchFocused(false);
  };

  // Check if there are any results (with new structure)
  const hasResults = searchResults && (
    (searchResults.tables?.exact?.length > 0 || searchResults.tables?.partial?.length > 0) ||
    (searchResults.delivery?.exact?.length > 0 || searchResults.delivery?.partial?.length > 0) ||
    (searchResults.takeAway?.exact?.length > 0 || searchResults.takeAway?.partial?.length > 0) ||
    (searchResults.rooms?.exact?.length > 0 || searchResults.rooms?.partial?.length > 0)
  );

  const showDropdown = isSearchFocused && searchQuery.length > 0 && hasResults;

  // Helper to get table display text (customer name or status)
  const getTableDisplayText = (item) => {
    if (item.customer) return item.customer;
    if (item.status === "reserved" && item.reservedFor) return item.reservedFor;
    if (item.status === "available") return "Available";
    if (item.status === "reserved") return "Reserved";
    return "Walk-in"; // Only for occupied tables without customer
  };

  // Helper to get order status label from fOrderStatus
  const getOrderStatusLabel = (fOrderStatus) => {
    switch (fOrderStatus) {
      case 1: return "Preparing";
      case 2: return "Ready";
      case 3: return "Served";
      default: return null;
    }
  };

  // Helper to format amount
  const formatAmount = (amount) => {
    if (!amount && amount !== 0) return null;
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  // Determine which statuses to show based on view (same for all channels including Room)
  const isTableView = activeView === "table";
  
  // Get visible status filters: filter by enabled, then limit to max 6
  const visibleStatusFilters = allStatusFilters
    .filter(s => enabledStatuses.length === 0 || enabledStatuses.includes(s.id))  // Filter by enabled (if configured)
    .slice(0, 6);  // Max 6 filters in header
  
  // Get visible channel filters for Status View (max 6)
  const visibleChannelFilters = visibleChannels.slice(0, 6);

  // Dynamic search placeholder based on selected channels
  const getSearchPlaceholder = () => {
    if (activeChannels.includes("room") && activeChannels.length === 1) {
      return "Search room, guest...";
    }
    if (isAllChannels) {
      return "Search table, order...";
    }
    if (activeChannels.length === 1) {
      if (activeChannels[0] === "dineIn") return "Search table, customer...";
      if (activeChannels[0] === "delivery") return "Search order, customer...";
      if (activeChannels[0] === "takeAway") return "Search order, customer...";
    }
    // Multiple channels selected (but not all)
    const hasTable = activeChannels.includes("dineIn");
    const hasOrder = activeChannels.includes("delivery") || activeChannels.includes("takeAway");
    const hasRoom = activeChannels.includes("room");
    if (hasTable && hasOrder) return "Search table, order...";
    if (hasTable) return "Search table, customer...";
    if (hasOrder) return "Search order, customer...";
    if (hasRoom) return "Search room, guest...";
    return "Search...";
  };

  // "All" means all visible multi-selectable channels are active
  const isAllChannels = visibleMultiChannelIds.length > 0 && visibleMultiChannelIds.every(id => activeChannels.includes(id));

  // Dine In is the only selected channel (show table/order toggle)
  const isDineInOnly = activeChannels.length === 1 && activeChannels[0] === "dineIn";

  const handleChannelToggle = (channelId) => {
    // "All" selects all visible channels
    if (channelId === "all") {
      setActiveChannels([...visibleMultiChannelIds]);
      return;
    }
    // Individual channel = exclusive selection (only that one)
    // If already selected and it's the only one, stay selected (can't deselect all)
    if (activeChannels.length === 1 && activeChannels[0] === channelId) {
      return; // Already selected, do nothing
    }
    setActiveChannels([channelId]);
  };

  const handleStatusToggle = (statusId) => {
    if (activeStatuses.includes(statusId)) {
      const next = activeStatuses.filter(s => s !== statusId);
      if (next.length === 0) return;
      setActiveStatuses(next);
    } else {
      setActiveStatuses([...activeStatuses, statusId]);
    }
  };

  return (
    <header
      data-testid="pos-header"
      className="px-3 py-2"
      style={{ backgroundColor: COLORS.lightBg, borderBottom: `1px solid ${COLORS.borderGray}` }}
    >
      <div className="flex items-center">
        {/* Left Section - Logo + Filters */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div data-testid="logo" className="flex items-center">
            <img 
              src={LOGO_URL} 
              alt="Logo" 
              className="h-9 w-auto object-contain"
            />
          </div>

          {/* Filter Pills - Swap based on dashboardView (max 6) */}
          {/* Status View → Channel filters | Channel View → Status filters */}
          <nav className="flex items-center gap-1 ml-4">
            {dashboardView === 'status' ? (
              /* Channel Filter Pills (for Status View - filter within status columns) */
              visibleChannelFilters.map((channel) => {
                const Icon = channel.icon;
                const isActive = activeChannels.includes(channel.id);
                return (
                  <button
                    key={channel.id}
                    data-testid={`filter-channel-${channel.id}`}
                    onClick={() => {
                      if (isActive) {
                        const next = activeChannels.filter(c => c !== channel.id);
                        if (next.length > 0) setActiveChannels(next);
                      } else {
                        setActiveChannels([...activeChannels, channel.id]);
                      }
                    }}
                    className="flex items-center gap-1.5 py-2 px-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: isActive ? "#F5F5F5" : "transparent",
                      color: isActive ? COLORS.darkText : COLORS.grayText,
                    }}
                    title={channel.fullLabel}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{channel.label}</span>
                  </button>
                );
              })
            ) : (
              /* Status Filter Pills (for Channel View - filter within channel columns) */
              visibleStatusFilters.map((status) => {
                const isActive = activeStatuses.includes(status.id);
                return (
                  <button
                    key={status.id}
                    data-testid={`filter-status-${status.id}`}
                    onClick={() => handleStatusToggle(status.id)}
                    className="py-2 px-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: isActive ? "#F5F5F5" : "transparent",
                      color: isActive ? COLORS.darkText : COLORS.grayText,
                    }}
                  >
                    {status.label}
                  </button>
                );
              })
            )}
          </nav>
        </div>

        {/* Center Section - Search (flex-1 to take available space) */}
        <div className="flex-1 flex justify-end px-4">
          <div className="relative">
            <div 
              ref={searchRef}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                isSearchFocused ? "w-64" : "w-48"
              }`}
              style={{ 
                backgroundColor: COLORS.sectionBg,
                border: `1px solid ${isSearchFocused ? COLORS.primaryOrange : COLORS.borderGray}`
              }}
            >
              <Search className="w-4 h-4" style={{ color: COLORS.grayText }} />
              <input
                data-testid="search-input"
                type="text"
                placeholder={getSearchPlaceholder()}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => { if (!searchQuery) setIsSearchFocused(false); }}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: COLORS.darkText }}
              />
              {(searchQuery || isSearchFocused) && (
                <button
                  data-testid="search-clear"
                  onClick={() => {
                    setSearchQuery("");
                    setIsSearchFocused(false);
                  }}
                  className="p-0.5 rounded hover:bg-gray-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
                </button>
              )}
            </div>

            {/* Search Dropdown */}
            {showDropdown && (
              <div
                ref={dropdownRef}
                data-testid="search-dropdown"
                className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-96 bg-white rounded-lg shadow-lg border overflow-hidden z-50 max-h-96 overflow-y-auto"
                style={{ borderColor: COLORS.borderGray }}
              >
                {/* Tables - Exact Matches */}
                {searchResults.tables?.exact?.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium uppercase flex items-center gap-2" style={{ color: COLORS.primaryGreen, backgroundColor: '#f0fdf4' }}>
                      <span>Exact Match</span>
                    </div>
                    {searchResults.tables.exact.map((item) => (
                      <div
                        key={item.id}
                        data-testid={`search-result-${item.id}`}
                        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors border-l-2"
                        style={{ borderColor: COLORS.primaryGreen }}
                      >
                        <span className="font-semibold text-sm" style={{ color: COLORS.primaryOrange }}>{item.id}</span>
                        <span 
                          className="text-sm flex-1" 
                          style={{ color: item.customer ? COLORS.darkText : COLORS.grayText }}
                        >
                          {getTableDisplayText(item)}
                        </span>
                        {getOrderStatusLabel(item.fOrderStatus) && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}>
                            {getOrderStatusLabel(item.fOrderStatus)}
                          </span>
                        )}
                        {formatAmount(item.amount) && (
                          <span className="text-xs font-medium" style={{ color: COLORS.darkText }}>
                            {formatAmount(item.amount)}
                          </span>
                        )}
                        <button
                          onClick={() => handleSearchSelect({ type: 'table', data: item })}
                          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                          style={{ color: COLORS.primaryOrange }}
                          title="View Details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tables - Partial Matches */}
                {searchResults.tables?.partial?.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium uppercase" style={{ color: COLORS.grayText, backgroundColor: COLORS.sectionBg }}>
                      {searchResults.tables?.exact?.length > 0 ? 'Other Tables' : 'Tables'}
                    </div>
                    {searchResults.tables.partial.map((item) => (
                      <div
                        key={item.id}
                        data-testid={`search-result-${item.id}`}
                        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-sm" style={{ color: COLORS.primaryOrange }}>{item.id}</span>
                        <span 
                          className="text-sm flex-1" 
                          style={{ color: item.customer ? COLORS.darkText : COLORS.grayText }}
                        >
                          {getTableDisplayText(item)}
                        </span>
                        {getOrderStatusLabel(item.fOrderStatus) && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}>
                            {getOrderStatusLabel(item.fOrderStatus)}
                          </span>
                        )}
                        {formatAmount(item.amount) && (
                          <span className="text-xs font-medium" style={{ color: COLORS.darkText }}>
                            {formatAmount(item.amount)}
                          </span>
                        )}
                        <button
                          onClick={() => handleSearchSelect({ type: 'table', data: item })}
                          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                          style={{ color: COLORS.grayText }}
                          title="View Details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Delivery - Exact Matches */}
                {searchResults.delivery?.exact?.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium uppercase flex items-center gap-2" style={{ color: COLORS.primaryGreen, backgroundColor: '#f0fdf4' }}>
                      <span>Delivery - Exact Match</span>
                    </div>
                    {searchResults.delivery.exact.map((item) => (
                      <div
                        key={item.id}
                        data-testid={`search-result-${item.id}`}
                        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors border-l-2"
                        style={{ borderColor: COLORS.primaryGreen }}
                      >
                        <span className="font-semibold text-sm" style={{ color: COLORS.primaryOrange }}>#{item.id}</span>
                        <span className="text-sm flex-1" style={{ color: COLORS.darkText }}>{item.customer}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded capitalize" style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}>{item.status}</span>
                        <button
                          onClick={() => handleSearchSelect({ type: 'delivery', data: item })}
                          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                          style={{ color: COLORS.primaryOrange }}
                          title="View Details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Delivery - Partial Matches */}
                {searchResults.delivery?.partial?.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium uppercase" style={{ color: COLORS.grayText, backgroundColor: COLORS.sectionBg }}>
                      {searchResults.delivery?.exact?.length > 0 ? 'Other Delivery Orders' : 'Delivery Orders'}
                    </div>
                    {searchResults.delivery.partial.map((item) => (
                      <div
                        key={item.id}
                        data-testid={`search-result-${item.id}`}
                        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-sm" style={{ color: COLORS.primaryOrange }}>#{item.id}</span>
                        <span className="text-sm flex-1" style={{ color: COLORS.darkText }}>{item.customer}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded capitalize" style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}>{item.status}</span>
                        <button
                          onClick={() => handleSearchSelect({ type: 'delivery', data: item })}
                          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                          style={{ color: COLORS.grayText }}
                          title="View Details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* TakeAway - Exact Matches */}
                {searchResults.takeAway?.exact?.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium uppercase flex items-center gap-2" style={{ color: COLORS.primaryGreen, backgroundColor: '#f0fdf4' }}>
                      <span>TakeAway - Exact Match</span>
                    </div>
                    {searchResults.takeAway.exact.map((item) => (
                      <div
                        key={item.id}
                        data-testid={`search-result-${item.id}`}
                        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors border-l-2"
                        style={{ borderColor: COLORS.primaryGreen }}
                      >
                        <span className="font-semibold text-sm" style={{ color: COLORS.primaryOrange }}>#{item.id}</span>
                        <span className="text-sm flex-1" style={{ color: COLORS.darkText }}>{item.customer}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded capitalize" style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}>{item.status}</span>
                        <button
                          onClick={() => handleSearchSelect({ type: 'takeAway', data: item })}
                          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                          style={{ color: COLORS.primaryOrange }}
                          title="View Details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* TakeAway - Partial Matches */}
                {searchResults.takeAway?.partial?.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium uppercase" style={{ color: COLORS.grayText, backgroundColor: COLORS.sectionBg }}>
                      {searchResults.takeAway?.exact?.length > 0 ? 'Other TakeAway Orders' : 'TakeAway Orders'}
                    </div>
                    {searchResults.takeAway.partial.map((item) => (
                      <div
                        key={item.id}
                        data-testid={`search-result-${item.id}`}
                        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-sm" style={{ color: COLORS.primaryOrange }}>#{item.id}</span>
                        <span className="text-sm flex-1" style={{ color: COLORS.darkText }}>{item.customer}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded capitalize" style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}>{item.status}</span>
                        <button
                          onClick={() => handleSearchSelect({ type: 'takeAway', data: item })}
                          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                          style={{ color: COLORS.grayText }}
                          title="View Details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Rooms - Exact Matches */}
                {searchResults.rooms?.exact?.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium uppercase flex items-center gap-2" style={{ color: COLORS.primaryGreen, backgroundColor: '#f0fdf4' }}>
                      <span>Room - Exact Match</span>
                    </div>
                    {searchResults.rooms.exact.map((item) => (
                      <div
                        key={item.id}
                        data-testid={`search-result-${item.id}`}
                        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors border-l-2"
                        style={{ borderColor: COLORS.primaryGreen }}
                      >
                        <span className="font-semibold text-sm" style={{ color: COLORS.primaryOrange }}>{item.label || item.id}</span>
                        <span className="text-sm flex-1" style={{ color: item.guest && item.guest !== 'Available' ? COLORS.darkText : COLORS.grayText }}>{item.guest || "Available"}</span>
                        {getOrderStatusLabel(item.fOrderStatus) && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}>
                            {getOrderStatusLabel(item.fOrderStatus)}
                          </span>
                        )}
                        {formatAmount(item.amount) && (
                          <span className="text-xs font-medium" style={{ color: COLORS.darkText }}>
                            {formatAmount(item.amount)}
                          </span>
                        )}
                        <button
                          onClick={() => handleSearchSelect({ type: 'room', data: item })}
                          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                          style={{ color: COLORS.primaryOrange }}
                          title="View Details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Rooms - Partial Matches */}
                {searchResults.rooms?.partial?.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium uppercase" style={{ color: COLORS.grayText, backgroundColor: COLORS.sectionBg }}>
                      {searchResults.rooms?.exact?.length > 0 ? 'Other Rooms' : 'Rooms'}
                    </div>
                    {searchResults.rooms.partial.map((item) => (
                      <div
                        key={item.id}
                        data-testid={`search-result-${item.id}`}
                        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-sm" style={{ color: COLORS.primaryOrange }}>{item.label || item.id}</span>
                        <span className="text-sm flex-1" style={{ color: item.guest && item.guest !== 'Available' ? COLORS.darkText : COLORS.grayText }}>{item.guest || "Available"}</span>
                        {getOrderStatusLabel(item.fOrderStatus) && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}>
                            {getOrderStatusLabel(item.fOrderStatus)}
                          </span>
                        )}
                        {formatAmount(item.amount) && (
                          <span className="text-xs font-medium" style={{ color: COLORS.darkText }}>
                            {formatAmount(item.amount)}
                          </span>
                        )}
                        <button
                          onClick={() => handleSearchSelect({ type: 'room', data: item })}
                          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                          style={{ color: COLORS.grayText }}
                          title="View Details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Section - Add Button + Online Status */}
        <div className="flex items-center gap-3">
          {/* Add Order Button — Req 2: hidden when Order Taking is OFF */}
          {orderTakingEnabled && (
            <button
              data-testid="add-table-btn"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg transition-colors hover:opacity-80"
              style={{ backgroundColor: COLORS.primaryOrange, color: "white" }}
              onClick={onAddOrder}
            >
              <PlusSquare className="w-4 h-4" />
              <span className="text-sm font-medium">Add</span>
            </button>
          )}

          {/* Online/Offline Status - Circle indicator after Add button */}
          <div
            data-testid="online-status"
            title={isOnline ? "Online" : "Offline"}
          >
            <div 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: isOnline ? "#4CAF50" : "#F44336" }} 
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
