import { useState, useRef, useCallback, useMemo } from "react";
import { PlusSquare, Search, X } from "lucide-react";
import { COLORS, LOGO_URL } from "../../constants";
import { ORDER_STATUSES, ROOM_STATUSES_MAIN, DINE_IN_TABLE_STATUSES } from "../../constants/headerConfig";
import { useClickOutside, useChannelLogic, useSearchResults } from "../../hooks";
import { ChannelPills, StatusFilters, SearchDropdown, ViewToggle } from "../header";

/**
 * Header Component - Optimized and decomposed
 */
const Header = ({ 
  isOnline, 
  activeChannels, 
  setActiveChannels, 
  activeStatuses, 
  setActiveStatuses, 
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

  // Use custom hooks
  const { 
    isAllChannels, 
    isRoomOnly, 
    isDineInOnly, 
    handleChannelToggle, 
    getSearchPlaceholder 
  } = useChannelLogic(activeChannels, setActiveChannels);

  const { showDropdown, getTableDisplayText } = useSearchResults(
    searchResults, 
    searchQuery, 
    isSearchFocused
  );

  // Click outside handler for search
  const handleSearchClickOutside = useCallback(() => {
    setIsSearchFocused(false);
  }, []);
  useClickOutside(searchRef, handleSearchClickOutside, isSearchFocused);

  // Handle search select
  const handleSearchSelect = useCallback((item) => {
    onSearchSelect(item);
    setSearchQuery("");
    setIsSearchFocused(false);
  }, [onSearchSelect, setSearchQuery]);

  // Status toggle handler
  const handleStatusToggle = useCallback((statusId) => {
    if (activeStatuses.includes(statusId)) {
      const next = activeStatuses.filter(s => s !== statusId);
      if (next.length === 0) return;
      setActiveStatuses(next);
    } else {
      setActiveStatuses([...activeStatuses, statusId]);
    }
  }, [activeStatuses, setActiveStatuses]);

  // Determine which statuses to show based on context
  const statuses = useMemo(() => {
    if (isRoomOnly) return ROOM_STATUSES_MAIN;
    const isDineInTableView = isDineInOnly && activeView === "table";
    if (isDineInTableView) return DINE_IN_TABLE_STATUSES;
    return ORDER_STATUSES;
  }, [isRoomOnly, isDineInOnly, activeView]);

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

          {/* Channel Pills */}
          <ChannelPills
            activeChannels={activeChannels}
            isAllChannels={isAllChannels}
            isRoomOnly={isRoomOnly}
            onToggle={handleChannelToggle}
          />
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
              <SearchDropdown
                searchResults={searchResults}
                onSelect={handleSearchSelect}
                getTableDisplayText={getTableDisplayText}
                dropdownRef={dropdownRef}
              />
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-6" style={{ backgroundColor: COLORS.borderGray }} />

          {/* Status Filters */}
          <StatusFilters
            statuses={statuses}
            activeStatuses={activeStatuses}
            onToggle={handleStatusToggle}
            isRoomOnly={isRoomOnly}
            showMoreStatuses={showMoreStatuses}
            setShowMoreStatuses={setShowMoreStatuses}
          />

          {/* Divider */}
          <div className="w-px h-6" style={{ backgroundColor: COLORS.borderGray }} />

          {/* Add Order Button */}
          <button
            data-testid="add-table-btn"
            className="p-3 rounded-lg transition-colors hover:opacity-80"
            style={{ backgroundColor: COLORS.primaryOrange, color: "white" }}
            onClick={onAddOrder}
          >
            <PlusSquare className="w-5 h-5" />
          </button>
          
          {/* View Toggle - Only when Dine In is the sole selected channel */}
          {isDineInOnly && (
            <ViewToggle activeView={activeView} setActiveView={setActiveView} />
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

          {/* Online/Offline Status */}
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
