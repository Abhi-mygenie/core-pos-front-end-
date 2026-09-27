import { useMemo } from "react";
import { ChevronRight, ChevronLeft, ChevronDown } from "lucide-react";
import { COLORS } from "../../constants";

// CR-148: showPopularCategory prop — when true, Popular is first (default tab is "All" since CR-376-FU-B)
// CR-376-FU-B: activeMenuProducts + popularProducts — menu-aware counts, hide 0-count categories, Popular scoped to active menu
const CategoryPanel = ({ activeCategory, onCategoryChange, onBack, categories = [], showPopularCategory = false, activeMenuProducts = [], popularProducts = [] }) => {
  // CR-376-FU-B: menu-aware list — count predicate is IDENTICAL to OrderEntry getFilteredItems() grid filter,
  // so "Name (n)" always equals the tiles shown on click. 0-count real cats hidden (B1); All always shown (B3);
  // Popular = popularProducts ∩ visible active-menu items, hidden when 0 (B4).
  const allCategories = useMemo(() => {
    const visible = activeMenuProducts.filter(p => p.isActive && !p.isDisabled);
    const list = [];
    if (showPopularCategory) { // CR-148: Popular first
      const visibleIds = new Set(visible.map(p => p.productId));
      const popularCount = popularProducts.filter(p => visibleIds.has(p.productId)).length;
      if (popularCount > 0) list.push({ id: "popular", name: "Popular", count: popularCount });
    }
    list.push({ id: "all", name: "All", count: visible.length });
    categories.forEach(c => {
      const count = visible.filter(p => p.categoryId === c.categoryId).length; // B5: categoryId only
      if (count > 0) list.push({ id: c.categoryId, name: c.categoryName, count });
    });
    return list;
  }, [categories, showPopularCategory, activeMenuProducts, popularProducts]);

  // Check if there are more categories than visible
  const hasMoreCategories = allCategories.length > 8;

  return (
    <div
      className="w-44 flex-shrink-0 flex flex-col min-h-0" /* BUG-134: min-h-0 for Windows scroll */
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
            <span className="truncate">{category.name} ({category.count})</span>{/* CR-376-FU-B: B2 item count */}
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
