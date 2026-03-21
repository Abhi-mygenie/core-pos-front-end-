import { useState, useMemo } from "react";
import { ChevronRight, ChevronLeft, ArrowRightLeft, GitMerge, Search, ChevronDown } from "lucide-react";
import { COLORS } from "../../constants";
import { mockMenuCategories } from "../../data";

const CategoryPanel = ({ activeCategory, onCategoryChange, onShiftTable, onMergeTable, onBack }) => {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return mockMenuCategories;
    const query = searchQuery.toLowerCase();
    return mockMenuCategories.filter(cat => 
      cat.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Check if there are more categories than visible
  const hasMoreCategories = mockMenuCategories.length > 8;

  return (
    <div
      className="w-44 flex-shrink-0 flex flex-col"
      style={{ backgroundColor: COLORS.lightBg, borderRight: `1px solid ${COLORS.borderGray}` }}
      data-testid="category-panel"
    >
      {/* Action buttons with Back arrow */}
      <div
        className="px-2 py-2 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
      >
        {/* Back button */}
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          title="Go Back"
          data-testid="category-back-btn"
        >
          <ChevronLeft className="w-5 h-5" style={{ color: COLORS.primaryOrange }} />
        </button>
        
        {/* Shift & Merge buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onShiftTable}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            title="Shift Table"
            data-testid="shift-table-btn"
          >
            <ArrowRightLeft className="w-4 h-4" style={{ color: COLORS.grayText }} />
          </button>
          <button
            onClick={onMergeTable}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            title="Merge Tables"
            data-testid="merge-tables-btn"
          >
            <GitMerge className="w-4 h-4" style={{ color: COLORS.grayText }} />
          </button>
        </div>
      </div>

      {/* Search box */}
      <div className="px-2 py-2" style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}>
        <div className="relative">
          <Search 
            className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5" 
            style={{ color: COLORS.grayText }} 
          />
          <input
            type="text"
            placeholder="Search category"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1"
            style={{ 
              borderColor: COLORS.borderGray, 
              backgroundColor: "white",
              fontSize: "12px"
            }}
            data-testid="category-search-input"
          />
        </div>
      </div>

      {/* Category list - scrollable with compact items */}
      <div className="flex-1 overflow-y-auto relative">
        {filteredCategories.length === 0 ? (
          <div className="px-3 py-4 text-xs text-center" style={{ color: COLORS.grayText }}>
            No categories found
          </div>
        ) : (
          filteredCategories.map((category) => (
            <button
              key={category.id}
              data-testid={`category-${category.id}`}
              onClick={() => onCategoryChange(category.id)}
              className="w-full px-3 py-2.5 text-left text-sm font-medium flex items-center justify-between transition-colors"
              style={{
                backgroundColor: activeCategory === category.id ? COLORS.primaryGreen : "transparent",
                color: activeCategory === category.id ? "white" : COLORS.darkText,
              }}
            >
              <span className="truncate">{category.name}</span>
              {activeCategory === category.id && (
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "white" }} />
              )}
            </button>
          ))
        )}
        
        {/* Scroll indicator - shows when there are more categories */}
        {hasMoreCategories && !searchQuery && (
          <div 
            className="sticky bottom-0 left-0 right-0 py-1 flex items-center justify-center"
            style={{ 
              background: `linear-gradient(transparent, ${COLORS.lightBg})`,
              pointerEvents: "none"
            }}
          >
            <ChevronDown className="w-4 h-4 animate-bounce" style={{ color: COLORS.grayText }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryPanel;
