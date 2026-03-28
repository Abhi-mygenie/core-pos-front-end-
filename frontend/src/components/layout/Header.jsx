import { useState, useRef, useEffect } from "react";
import { PlusSquare, Grid3X3, Bike, ShoppingBag, Utensils, DoorOpen, List, LayoutGrid, Search, X, ChevronRight, ChevronDown } from "lucide-react";
import { COLORS, LOGO_URL } from "../../constants";
import { useRestaurant } from "../../contexts";

// Multi-selectable channel IDs (excludes Room)
const MULTI_CHANNEL_IDS = ["delivery", "takeAway", "dineIn"];

// Order Type channels with icons and short labels
const channels = [
  { id: "delivery", label: "Del", fullLabel: "Delivery", icon: Bike },
  { id: "takeAway", label: "Take", fullLabel: "TakeAway", icon: ShoppingBag },
  { id: "dineIn", label: "Dine", fullLabel: "Dine In", icon: Utensils },
  { id: "room", label: "Room", fullLabel: "Room", icon: DoorOpen },
];

// Order Status filters
const orderStatuses = [
  { id: "confirm", label: "Confirm" },
  { id: "cooking", label: "Cooking" },
  { id: "ready", label: "Ready" },
  { id: "running", label: "Running" },
  { id: "schedule", label: "Schedule" },
];

// Room-specific statuses - split into main and secondary
const roomStatusesMain = [
  { id: "available", label: "Available" },
  { id: "checkedIn", label: "Checked In" },
  { id: "reserved", label: "Reserved" },
];

const roomStatusesMore = [
  { id: "checkedOut", label: "Checked Out" },
  { id: "housekeeping", label: "Housekeeping" },
  { id: "maintenance", label: "Maintenance" },
];

// All room statuses (for reference)
const roomStatuses = [...roomStatusesMain, ...roomStatusesMore];

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
  activeFirst, 
  setActiveFirst,
  searchQuery,
  setSearchQuery,
  searchResults,
  onSearchSelect,
  onAddOrder
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showMoreStatuses, setShowMoreStatuses] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const moreStatusesRef = useRef(null);

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
      if (
        moreStatusesRef.current &&
        !moreStatusesRef.current.contains(event.target)
      ) {
        setShowMoreStatuses(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  // Determine which statuses to show based on selected channels and view
  const isRoomOnly = activeChannels.length === 1 && activeChannels[0] === "room";
  const isTableView = !isRoomOnly && activeView === "table";
  
  // Context-aware status filters
  let statuses;
  if (isRoomOnly) {
    // Room View: Show room-specific statuses
    statuses = roomStatusesMain;
  } else if (isTableView) {
    // Grid/Table View (any channel): Only Schedule and Confirm
    statuses = [
      { id: "schedule", label: "Schedule" },
      { id: "confirm", label: "Confirm" }
    ];
  } else {
    // Order/List View: Show all order statuses
    statuses = orderStatuses;
  }

  // Check if any "more" status is active (for room)
  const hasActiveMoreStatus = isRoomOnly && roomStatusesMore.some(s => activeStatuses.includes(s.id));

  // Dynamic search placeholder based on selected channels
  const getSearchPlaceholder = () => {
    if (isRoomOnly) {
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
    if (hasTable && hasOrder) return "Search table, order...";
    if (hasTable) return "Search table, customer...";
    if (hasOrder) return "Search order, customer...";
    return "Search...";
  };

  // "All" means all visible multi-selectable channels are active (no room)
  const isAllChannels = visibleMultiChannelIds.length > 0 && visibleMultiChannelIds.every(id => activeChannels.includes(id)) && !activeChannels.includes("room");

  // Dine In is the only selected channel (show table/order toggle)
  const isDineInOnly = activeChannels.length === 1 && activeChannels[0] === "dineIn";

  const handleChannelToggle = (channelId) => {
    // "All" selects visible multi-selectable channels
    if (channelId === "all") {
      setActiveChannels([...visibleMultiChannelIds]);
      return;
    }
    // Room is exclusive — deselects everything else
    if (channelId === "room") {
      setActiveChannels(["room"]);
      return;
    }
    // Clicking non-room while Room is active → select only that channel
    if (isRoomOnly) {
      setActiveChannels([channelId]);
      return;
    }
    // Was "All" selected → select only clicked one
    if (isAllChannels) {
      setActiveChannels([channelId]);
      return;
    }
    // Toggle within multi-select group
    if (activeChannels.includes(channelId)) {
      const next = activeChannels.filter(c => c !== channelId);
      // Don't allow empty — revert to all visible
      setActiveChannels(next.length === 0 ? [...visibleMultiChannelIds] : next);
    } else {
      setActiveChannels([...activeChannels, channelId]);
    }
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
      className="px-6 py-3"
      style={{ backgroundColor: COLORS.lightBg, borderBottom: `1px solid ${COLORS.borderGray}` }}
    >
      <div className="flex items-center justify-between">
        {/* Left Section - Logo + Order Types */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div data-testid="logo" className="flex items-center">
            <img 
              src={LOGO_URL} 
              alt="Logo" 
              className="h-9 w-auto object-contain"
            />
          </div>

          {/* Order Type Pills - Multi-select with All */}
          <nav className="flex items-center gap-1 ml-4">
            {/* All pill */}
            <button
              data-testid="channel-all"
              onClick={() => handleChannelToggle("all")}
              className="flex items-center gap-1.5 py-3 px-3 rounded-lg transition-colors"
              style={{
                backgroundColor: isAllChannels ? COLORS.primaryOrange : "transparent",
                color: isAllChannels ? "white" : COLORS.grayText,
              }}
              title="All Channels"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-sm font-medium">All</span>
            </button>
            {visibleChannels.map((channel) => {
              const Icon = channel.icon;
              const isRoom = channel.id === "room";
              const isActive = isRoom
                ? isRoomOnly
                : !isAllChannels && activeChannels.includes(channel.id);
              return (
                <button
                  key={channel.id}
                  data-testid={`channel-${channel.id}`}
                  onClick={() => handleChannelToggle(channel.id)}
                  className="flex items-center gap-1.5 py-3 px-3 rounded-lg transition-colors"
                  style={{
                    backgroundColor: isActive ? COLORS.primaryOrange : "transparent",
                    color: isActive ? "white" : COLORS.grayText,
                  }}
                  title={channel.fullLabel}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{channel.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Section - Search + Status Filters + Actions */}
        <div className="flex items-center gap-3">
          {/* Search Input with Dropdown */}
          <div className="relative">
            <div 
              ref={searchRef}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all ${
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
                className="absolute top-full left-0 mt-1 w-96 bg-white rounded-lg shadow-lg border overflow-hidden z-50 max-h-96 overflow-y-auto"
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
                        {item.phone && <span className="text-xs" style={{ color: COLORS.grayText }}>{item.phone}</span>}
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
                        {item.phone && <span className="text-xs" style={{ color: COLORS.grayText }}>{item.phone}</span>}
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
                        <span className="font-semibold text-sm" style={{ color: COLORS.primaryOrange }}>{item.id}</span>
                        <span className="text-sm flex-1" style={{ color: COLORS.darkText }}>{item.guest || "Available"}</span>
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
                        <span className="font-medium text-sm" style={{ color: COLORS.primaryOrange }}>{item.id}</span>
                        <span className="text-sm flex-1" style={{ color: COLORS.darkText }}>{item.guest || "Available"}</span>
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

          {/* Divider */}
          <div className="w-px h-6" style={{ backgroundColor: COLORS.borderGray }} />

          {/* Status Filter Pills */}
          <div className="flex items-center gap-2">
            {statuses.map((status) => {
              // Table view: exclusive single-select filter
              const isActive = isTableView
                ? tableFilter === status.id
                : activeStatuses.includes(status.id);
              const handleClick = isTableView
                ? () => setTableFilter(prev => prev === status.id ? null : status.id)
                : () => handleStatusToggle(status.id);
              return (
                <button
                  key={status.id}
                  data-testid={`status-${status.id}`}
                  onClick={handleClick}
                  className="px-3 py-2.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    backgroundColor: isActive ? COLORS.lightBg : "transparent",
                    color: isActive ? COLORS.primaryOrange : COLORS.grayText,
                    border: `1px solid ${isActive ? COLORS.primaryOrange : COLORS.borderGray}`,
                  }}
                >
                  {status.label}
                </button>
              );
            })}
            
            {/* More dropdown for room statuses */}
            {isRoomOnly && (
              <div className="relative" ref={moreStatusesRef}>
                <button
                  data-testid="status-more-btn"
                  onClick={() => setShowMoreStatuses(!showMoreStatuses)}
                  className="px-3 py-2.5 rounded-md text-xs font-medium transition-all flex items-center gap-1"
                  style={{
                    backgroundColor: hasActiveMoreStatus ? COLORS.lightBg : "transparent",
                    color: hasActiveMoreStatus ? COLORS.primaryOrange : COLORS.grayText,
                    border: `1px solid ${hasActiveMoreStatus ? COLORS.primaryOrange : COLORS.borderGray}`,
                  }}
                >
                  More
                  <ChevronDown className={`w-3 h-3 transition-transform ${showMoreStatuses ? 'rotate-180' : ''}`} />
                </button>
                
                {showMoreStatuses && (
                  <div 
                    className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border z-50 min-w-[140px]"
                    style={{ borderColor: COLORS.borderGray }}
                  >
                    {roomStatusesMore.map((status) => {
                      const isActive = activeStatuses.includes(status.id);
                      return (
                        <button
                          key={status.id}
                          data-testid={`status-${status.id}`}
                          onClick={() => handleStatusToggle(status.id)}
                          className="w-full px-3 py-2 text-xs font-medium text-left hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg flex items-center justify-between"
                          style={{ color: isActive ? COLORS.primaryOrange : COLORS.darkText }}
                        >
                          {status.label}
                          {isActive && (
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: COLORS.primaryOrange }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-6" style={{ backgroundColor: COLORS.borderGray }} />

          {/* Add Order Button - Prominent Orange */}
          <button
            data-testid="add-table-btn"
            className="p-3 rounded-lg transition-colors hover:opacity-80"
            style={{ backgroundColor: COLORS.primaryOrange, color: "white" }}
            onClick={onAddOrder}
          >
            <PlusSquare className="w-5 h-5" />
          </button>
          
          {/* View Toggle - Available for all non-room channels */}
          {!isRoomOnly && (
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                data-testid="table-view-btn"
                className={`p-2.5 rounded-md transition-colors ${
                  activeView === "table" ? "bg-white shadow-sm" : ""
                }`}
                style={{ color: activeView === "table" ? COLORS.primaryOrange : COLORS.grayText }}
                onClick={() => setActiveView("table")}
                title="Table View"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                data-testid="order-view-btn"
                className={`p-2.5 rounded-md transition-colors ${
                  activeView === "order" ? "bg-white shadow-sm" : ""
                }`}
                style={{ color: activeView === "order" ? COLORS.primaryOrange : COLORS.grayText }}
                onClick={() => setActiveView("order")}
                title="Order View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Active First Toggle - Show for non-room channels */}
          {!isRoomOnly && (
            <div
              data-testid="active-first-toggle"
              className="w-8 h-4 rounded-full relative cursor-pointer transition-colors"
              style={{ backgroundColor: activeFirst ? COLORS.primaryGreen : COLORS.borderGray }}
              onClick={() => setActiveFirst(!activeFirst)}
            >
              <div 
                className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all"
                style={activeFirst ? { right: "2px" } : { left: "2px" }}
              />
            </div>
          )}

          {/* Online/Offline Status - Just circle indicator */}
          <div
            data-testid="online-status"
            className="ml-1"
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
