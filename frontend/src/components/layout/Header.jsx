import { useState, useRef, useEffect } from "react";
import { PlusSquare, Bike, ShoppingBag, Utensils, DoorOpen, Search, X, ChevronRight, ChevronDown, Check } from "lucide-react";
import { COLORS, LOGO_URL, USE_STATUS_VIEW } from "../../constants";
import { useRestaurant } from "../../contexts";
import PlatformDropdown from "./PlatformDropdown";
import PlatformCounterChip from "./PlatformCounterChip";

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
// POS2-005: "Running" (fOrderStatus=8) removed — status 8 is now
// Hold-classified and surfaced only in the Audit Report Hold tab, not as
// a header pill on the dashboard.
const allStatusFilters = [
  { id: "pending", fOrderStatus: 7, label: "YTC" },           // Yet to Confirm
  { id: "preparing", fOrderStatus: 1, label: "Preparing" },
  { id: "ready", fOrderStatus: 2, label: "Ready" },
  { id: "served", fOrderStatus: 5, label: "Serve" }, // BUG-581: action word
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
  channelActiveFirst,          // CR-429
  onChannelActiveFirstToggle,  // CR-429
  hiddenChannels = [],
  hiddenStatuses = [],
  enabledStatuses = [],
  onRestoreHidden,
  searchQuery,
  setSearchQuery,
  searchResults,
  onSearchSelect,
  onAddOrder,
  // POS2-002 Phase 3 (May-2026): Platform filter (POS / Web / Scan).
  // value === null  → no narrowing (default)
  // value === 'pos' → orderFrom !== 'web' (future-proof against new BE values)
  // value === 'web' → orderFrom === 'web'
  platform = null,
  setPlatform = () => {},
  // POS2-002 Phase 3.1 (May-2026): live "Web N · POS M" pulse counts
  // surfaced left of the search box. Counter respects status / channel /
  // search context but IGNORES the Platform dropdown itself (independence
  // guarantee). Defaults to 0 so older call sites still render safely.
  webCount = 0,
  posCount = 0
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [tabletDropdownOpen, setTabletDropdownOpen] = useState(false); // CR-414: tablet filter dropdown
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const tabletDropdownRef = useRef(null); // CR-414: tablet dropdown click-outside ref

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

  // CR-414: close tablet filter dropdown on outside tap/click
  useEffect(() => {
    const handler = (e) => {
      if (tabletDropdownRef.current && !tabletDropdownRef.current.contains(e.target)) {
        setTabletDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
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
      case 3: return "Serve"; // BUG-581: action word
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
      // BUG-566: guard against removing last VISIBLE filter
      // (activeStatuses may contain non-visible IDs not shown in visibleStatusFilters.slice(0,6))
      const visibleNext = next.filter(s => visibleStatusFilters.some(f => f.id === s));
      if (visibleNext.length === 0) return;
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
          <nav className="hidden xl:flex items-center gap-1 ml-4"> {/* CR-414 + BUG-555 WP-C: pills hidden <1280px */}
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
              <>
              {visibleStatusFilters.map((status) => {
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
              })}
              {/* CR-018 G9: Schedule filter pill — cross-cutting boolean filter */}
              <button
                data-testid="filter-schedule"
                onClick={() => setTableFilter(tableFilter === 'schedule' ? null : 'schedule')}
                className="py-2 px-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: tableFilter === 'schedule' ? '#E3F2FD' : 'transparent',
                  color: tableFilter === 'schedule' ? '#1565C0' : COLORS.grayText,
                }}
              >
                Schedule
              </button>
              {/* CR-429: Active First toggle — Channel View only */}
              <div style={{ width: 1, height: 18, background: '#E5E5E5', margin: '0 4px' }} />
              <button
                data-testid="filter-active-first"
                onClick={onChannelActiveFirstToggle}
                className="py-2 px-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: channelActiveFirst ? 'rgba(242,107,51,0.08)' : 'transparent',
                  color: channelActiveFirst ? COLORS.primaryOrange : COLORS.grayText,
                  border: channelActiveFirst ? `1.5px solid ${COLORS.primaryOrange}` : '1.5px solid transparent',
                }}
              >
                Active First
              </button>
              </>
            )}
          </nav>

          {/* CR-414 + BUG-555 WP-C: Tablet filter dropdown — mirrors the pills nav (status filters in channel view,
              channel filters in status view). Visible <1280px only (OD-537-02, OD-414-01=A, OD-414-05=A, OD-555-10). */}
          <div className="relative xl:hidden ml-2" ref={tabletDropdownRef}> {/* BUG-555 WP-C */}
            <button
              data-testid="tablet-filter-dropdown-btn"
              aria-expanded={tabletDropdownOpen}
              onClick={() => setTabletDropdownOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              style={{ backgroundColor: '#F5F5F5', color: COLORS.darkText }}
            >
              <span>{dashboardView === 'status' ? 'Channels' : 'Status'}</span>
              <span
                data-testid="tablet-filter-active-count"
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: COLORS.borderGray, color: COLORS.grayText }}
              >
                {dashboardView === 'status'
                  ? activeChannels.length
                  : activeStatuses.length + (tableFilter === 'schedule' ? 1 : 0)}
              </span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {tabletDropdownOpen && (
              <div
                data-testid="tablet-filter-dropdown-menu"
                className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-lg border z-50 min-w-[180px] py-1"
                style={{ borderColor: COLORS.borderGray }}
              >
                {dashboardView === 'status' ? (
                  visibleChannelFilters.map((channel) => {
                    const Icon = channel.icon;
                    const isActive = activeChannels.includes(channel.id);
                    return (
                      <button
                        key={channel.id}
                        data-testid={`tablet-filter-channel-${channel.id}`}
                        onClick={() => {
                          if (isActive) {
                            const next = activeChannels.filter(c => c !== channel.id);
                            if (next.length > 0) setActiveChannels(next);
                          } else {
                            setActiveChannels([...activeChannels, channel.id]);
                          }
                        }}
                        className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 hover:bg-slate-50 transition-colors"
                        style={{ color: isActive ? COLORS.darkText : COLORS.grayText }}
                      >
                        <Check className="w-4 h-4 flex-shrink-0" style={{ visibility: isActive ? 'visible' : 'hidden', color: COLORS.primaryOrange }} />
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{channel.fullLabel}</span>
                      </button>
                    );
                  })
                ) : (
                  <>
                    {visibleStatusFilters.map((status) => {
                      const isActive = activeStatuses.includes(status.id);
                      return (
                        <button
                          key={status.id}
                          data-testid={`tablet-filter-status-${status.id}`}
                          onClick={() => handleStatusToggle(status.id)}
                          className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 hover:bg-slate-50 transition-colors"
                          style={{ color: isActive ? COLORS.darkText : COLORS.grayText }}
                        >
                          <Check className="w-4 h-4 flex-shrink-0" style={{ visibility: isActive ? 'visible' : 'hidden', color: COLORS.primaryOrange }} />
                          <span>{status.label}</span>
                        </button>
                      );
                    })}
                    <button
                      data-testid="tablet-filter-schedule"
                      onClick={() => setTableFilter(tableFilter === 'schedule' ? null : 'schedule')}
                      className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 hover:bg-slate-50 transition-colors"
                      style={{ color: tableFilter === 'schedule' ? '#1565C0' : COLORS.grayText }}
                    >
                      <Check className="w-4 h-4 flex-shrink-0" style={{ visibility: tableFilter === 'schedule' ? 'visible' : 'hidden', color: '#1565C0' }} />
                      <span>Schedule</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* POS2-002 Phase 3 (May-2026): Platform filter — sits inline after
            the status chips, separated by a 1px vertical divider so operators
            don't conflate the platform axis with the status axis.
            Cards are NOT modified — this dropdown is the only operator-visible
            affordance for the POS / Web / Scan distinction. */}
        <div className="hidden xl:flex items-center pl-3 ml-1 border-l" style={{ borderColor: COLORS.borderGray }}> {/* CR-414 + BUG-555 WP-C: hidden <1280px */}
          <PlatformDropdown value={platform} onChange={setPlatform} />
        </div>

        {/* Center Section - Search (flex-1 to take available space) */}
        <div className="flex-1 min-w-0 flex justify-end px-2 xl:px-4"> {/* CR-414 + BUG-555 WP-C: tighter padding <1280px */ /* BUG-565 */}
          {/* POS2-002 Phase 3.1 (May-2026): live counter chip — sits to the
              left of the search box, inside the right-aligned cluster.
              Read-only pulse; respects status / channel / search but
              ignores the Platform dropdown (independence guarantee). */}
          <div className="hidden xl:flex items-center mr-3"> {/* CR-414 + BUG-555 WP-C: hidden <1280px */}
            <PlatformCounterChip webCount={webCount} posCount={posCount} />
          </div>
          <div className="relative flex-1 xl:flex-initial min-w-0"> {/* CR-414 + BUG-555 WP-C: search takes remaining row width <1280px */}
            <div 
              ref={searchRef}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all w-full ${
                isSearchFocused ? "xl:w-64" : "xl:w-48" /* BUG-555 WP-C */
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
                className="flex-1 min-w-0 bg-transparent text-sm outline-none"
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
                className="absolute top-full right-0 xl:right-auto xl:left-1/2 xl:-translate-x-1/2 mt-1 w-80 xl:w-96 bg-white rounded-lg shadow-lg border overflow-hidden z-50 max-h-96 overflow-y-auto" /* CR-414 + BUG-555 WP-C: right-anchored <1280px */
                style={{ borderColor: COLORS.borderGray }}
              >
                {/* Tables - Exact Matches */}
                {searchResults.tables?.exact?.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium uppercase flex items-center gap-2" style={{ color: COLORS.primaryGreen, backgroundColor: '#f0fdf4' }}>
                      <span>Table - Exact Match</span> {/* BUG-590: add TABLE prefix — matches ROOM/DELIVERY/TAKEAWAY pattern */}
                    </div>
                    {searchResults.tables.exact.map((item) => (
                      <div
                        key={item.id}
                        data-testid={`search-result-${item.id}`}
                        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors border-l-2"
                        style={{ borderColor: COLORS.primaryGreen }}
                      >
                        <span className="font-semibold text-sm" style={{ color: COLORS.primaryOrange }}>{item.label || item.id}</span> {/* BUG-588: show display label, not DB ID */}
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
                        <span className="font-medium text-sm" style={{ color: COLORS.primaryOrange }}>{item.label || item.id}</span> {/* BUG-588: show display label, not DB ID */}
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
        <div className="flex items-center gap-3 flex-shrink-0"> {/* BUG-555 WP-C */}
          {/* Add Order Button — Req 2: hidden when Order Taking is OFF */}
          {orderTakingEnabled && (
            <button
              data-testid="add-table-btn"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 max-sm:min-w-[44px] max-sm:min-h-[44px] rounded-lg transition-colors hover:opacity-80" /* BUG-555 WP-C */
              aria-label="Add"
              style={{ backgroundColor: COLORS.primaryOrange, color: "white" }}
              onClick={onAddOrder}
            >
              <PlusSquare className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">Add</span> {/* BUG-555 WP-C: icon-only <640px */}
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
