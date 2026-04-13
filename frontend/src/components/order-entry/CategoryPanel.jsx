import { useMemo } from "react";
import { ChevronRight, ChevronLeft, ChevronDown } from "lucide-react";
import { COLORS } from "../../constants";

const CategoryPanel = ({ activeCategory, onCategoryChange, onBack, categories = [] }) => {
  // Build full category list: All + Popular + real categories from API
  const allCategories = useMemo(() => {
    const specials = [
      { id: "all", name: "All" },
      { id: "popular", name: "Popular" },
    ];
    const real = categories.map(c => ({ id: c.categoryId, name: c.categoryName }));
    return [...specials, ...real];
  }, [categories]);

  // Check if there are more categories than visible
  const hasMoreCategories = allCategories.length > 8;

  return (
    <div
      className="w-44 flex-shrink-0 flex flex-col"
      style={{ backgroundColor: COLORS.lightBg, borderRight: `1px solid ${COLORS.borderGray}` }}
      data-testid="category-panel"
    >
      {/* Prominent Back button */}
      <div
        className="px-3 py-3 flex items-center"
        style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
      >
        <button
          onClick={onBack}
          className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
          style={{ 
            backgroundColor: COLORS.primaryOrange,
            color: "white"
          }}
          title="Go Back"
          data-testid="category-back-btn"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>

      {/* Category list - scrollable with compact items (removed search) */}
      <div className="flex-1 overflow-y-auto relative">
        {allCategories.map((category) => (
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
        ))}
        
        {/* Scroll indicator - shows when there are more categories */}
        {hasMoreCategories && (
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
