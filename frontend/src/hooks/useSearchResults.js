import { useMemo } from "react";

/**
 * Custom hook for search results logic
 */
const useSearchResults = (searchResults, searchQuery, isSearchFocused) => {
  // Check if there are any results
  const hasResults = useMemo(() => {
    if (!searchResults) return false;
    return (
      (searchResults.tables?.exact?.length > 0 || searchResults.tables?.partial?.length > 0) ||
      (searchResults.delivery?.exact?.length > 0 || searchResults.delivery?.partial?.length > 0) ||
      (searchResults.takeAway?.exact?.length > 0 || searchResults.takeAway?.partial?.length > 0) ||
      (searchResults.rooms?.exact?.length > 0 || searchResults.rooms?.partial?.length > 0)
    );
  }, [searchResults]);

  const showDropdown = useMemo(() => 
    isSearchFocused && searchQuery.length > 0 && hasResults,
    [isSearchFocused, searchQuery, hasResults]
  );

  // Helper to get table display text
  const getTableDisplayText = (item) => {
    if (item.customer) return item.customer;
    if (item.status === "reserved" && item.reservedFor) return item.reservedFor;
    if (item.status === "available") return "Available";
    if (item.status === "reserved") return "Reserved";
    return "Walk-in";
  };

  return {
    hasResults,
    showDropdown,
    getTableDisplayText,
  };
};

export default useSearchResults;
