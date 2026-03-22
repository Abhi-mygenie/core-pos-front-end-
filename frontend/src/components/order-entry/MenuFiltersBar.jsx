import { Search, Plus } from "lucide-react";
import { COLORS } from "../../constants";

const PRIMARY_FILTERS = [
  { key: "veg", label: "Veg" },
  { key: "nonveg", label: "Non-Veg" },
  { key: "egg", label: "Egg" }
];

const SECONDARY_FILTERS = [
  { key: "glutenFree", label: "Gluten Free" },
  { key: "jain", label: "Jain" },
  { key: "vegan", label: "Vegan" }
];

/**
 * MenuFiltersBar - Search and dietary filters for menu items
 */
const MenuFiltersBar = ({
  searchQuery,
  onSearchChange,
  primaryFilter,
  onTogglePrimaryFilter,
  secondaryFilters,
  onToggleSecondaryFilter,
}) => {
  return (
    <div 
      className="px-4 py-3 flex-shrink-0 flex items-center gap-3" 
      style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
    >
      {/* Compact Search */}
      <div className="relative w-48 flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: COLORS.grayText }} />
        <input
          data-testid="menu-search-input"
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
          style={{ backgroundColor: COLORS.sectionBg, color: COLORS.darkText }}
        />
      </div>

      {/* Divider */}
      <div className="h-6 w-px" style={{ backgroundColor: COLORS.borderGray }} />

      {/* Primary Dietary Filters */}
      <div className="flex items-center gap-2">
        {PRIMARY_FILTERS.map(filter => {
          const isActive = primaryFilter === filter.key;
          return (
            <button
              key={filter.key}
              data-testid={`filter-${filter.key}`}
              onClick={() => onTogglePrimaryFilter(filter.key)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: isActive ? COLORS.primaryGreen : "transparent",
                color: isActive ? "white" : COLORS.darkText,
                border: `1px solid ${isActive ? COLORS.primaryGreen : COLORS.borderGray}`,
              }}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-6 w-px" style={{ backgroundColor: COLORS.borderGray }} />

      {/* Secondary Dietary Filters */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {SECONDARY_FILTERS.map(filter => {
          const isActive = secondaryFilters[filter.key];
          return (
            <button
              key={filter.key}
              data-testid={`filter-${filter.key}`}
              onClick={() => onToggleSecondaryFilter(filter.key)}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
              style={{
                backgroundColor: isActive ? COLORS.primaryGreen : "transparent",
                color: isActive ? "white" : COLORS.grayText,
                border: `1px solid ${isActive ? COLORS.primaryGreen : COLORS.borderGray}`,
              }}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Add Custom Item */}
      <button
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
        style={{ border: `1px solid ${COLORS.borderGray}` }}
        title="Add Custom Item"
        data-testid="add-custom-item-btn"
      >
        <Plus className="w-5 h-5" style={{ color: COLORS.primaryOrange }} />
      </button>
    </div>
  );
};

export default MenuFiltersBar;
