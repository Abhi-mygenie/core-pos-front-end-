import { COLORS } from "../../constants";
import { SearchResultGroup } from "../common";

/**
 * SearchDropdown - Search results dropdown
 */
const SearchDropdown = ({
  searchResults,
  onSelect,
  getTableDisplayText,
  dropdownRef,
}) => {
  return (
    <div
      ref={dropdownRef}
      data-testid="search-dropdown"
      className="absolute top-full left-0 mt-1 w-96 bg-white rounded-lg shadow-lg border overflow-hidden z-50 max-h-96 overflow-y-auto"
      style={{ borderColor: COLORS.borderGray }}
    >
      {/* Tables - Exact */}
      <SearchResultGroup
        title="Exact Match"
        items={searchResults.tables?.exact}
        isExact={true}
        type="table"
        onSelect={onSelect}
        getDisplayText={getTableDisplayText}
      />
      
      {/* Tables - Partial */}
      <SearchResultGroup
        title={searchResults.tables?.exact?.length > 0 ? 'Other Tables' : 'Tables'}
        items={searchResults.tables?.partial}
        isExact={false}
        type="table"
        onSelect={onSelect}
        getDisplayText={getTableDisplayText}
      />

      {/* Delivery - Exact */}
      <SearchResultGroup
        title="Delivery - Exact Match"
        items={searchResults.delivery?.exact}
        isExact={true}
        type="delivery"
        onSelect={onSelect}
      />
      
      {/* Delivery - Partial */}
      <SearchResultGroup
        title={searchResults.delivery?.exact?.length > 0 ? 'Other Delivery Orders' : 'Delivery Orders'}
        items={searchResults.delivery?.partial}
        isExact={false}
        type="delivery"
        onSelect={onSelect}
      />

      {/* TakeAway - Exact */}
      <SearchResultGroup
        title="TakeAway - Exact Match"
        items={searchResults.takeAway?.exact}
        isExact={true}
        type="takeAway"
        onSelect={onSelect}
      />
      
      {/* TakeAway - Partial */}
      <SearchResultGroup
        title={searchResults.takeAway?.exact?.length > 0 ? 'Other TakeAway Orders' : 'TakeAway Orders'}
        items={searchResults.takeAway?.partial}
        isExact={false}
        type="takeAway"
        onSelect={onSelect}
      />

      {/* Rooms - Exact */}
      <SearchResultGroup
        title="Room - Exact Match"
        items={searchResults.rooms?.exact}
        isExact={true}
        type="room"
        onSelect={onSelect}
      />
      
      {/* Rooms - Partial */}
      <SearchResultGroup
        title={searchResults.rooms?.exact?.length > 0 ? 'Other Rooms' : 'Rooms'}
        items={searchResults.rooms?.partial}
        isExact={false}
        type="room"
        onSelect={onSelect}
      />
    </div>
  );
};

export default SearchDropdown;
