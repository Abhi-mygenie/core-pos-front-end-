import { useState, useCallback, useMemo } from "react";
import { mockMenuItems } from "../data";

/**
 * Custom hook for menu filtering in OrderEntry
 */
const useMenuFilter = () => {
  const [activeCategory, setActiveCategory] = useState("popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [primaryFilter, setPrimaryFilter] = useState(null); // "veg" | "egg" | "nonveg" | null
  const [secondaryFilters, setSecondaryFilters] = useState({ 
    glutenFree: false, 
    jain: false, 
    vegan: false 
  });

  // Toggle primary filter (mutually exclusive)
  const togglePrimaryFilter = useCallback((filter) => {
    setPrimaryFilter(prev => prev === filter ? null : filter);
  }, []);

  // Toggle secondary filter
  const toggleSecondaryFilter = useCallback((filter) => {
    setSecondaryFilters(prev => ({ ...prev, [filter]: !prev[filter] }));
  }, []);

  // Get filtered menu items
  const filteredItems = useMemo(() => {
    let items = mockMenuItems[activeCategory] || [];
    
    // Search filter
    if (searchQuery.trim()) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Primary dietary filter
    if (primaryFilter) {
      items = items.filter(item => item.type === primaryFilter);
    }
    
    // Secondary dietary filters
    if (secondaryFilters.glutenFree) {
      items = items.filter(item => item.glutenFree === true);
    }
    if (secondaryFilters.jain) {
      items = items.filter(item => item.jain === true);
    }
    if (secondaryFilters.vegan) {
      items = items.filter(item => item.vegan === true);
    }
    
    return items;
  }, [activeCategory, searchQuery, primaryFilter, secondaryFilters]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setPrimaryFilter(null);
    setSecondaryFilters({ glutenFree: false, jain: false, vegan: false });
  }, []);

  return {
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    primaryFilter,
    togglePrimaryFilter,
    secondaryFilters,
    toggleSecondaryFilter,
    filteredItems,
    clearFilters,
  };
};

export default useMenuFilter;
