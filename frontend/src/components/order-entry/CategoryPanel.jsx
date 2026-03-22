import { ChevronRight, ChevronLeft, ArrowRightLeft, GitMerge } from "lucide-react";
import { COLORS } from "../../constants";

const CategoryPanel = ({ activeCategory, onCategoryChange, onShiftTable, onMergeTable, onClose, categories = [] }) => (
  <div
    className="w-48 flex-shrink-0 flex flex-col"
    style={{ backgroundColor: COLORS.lightBg, borderRight: `1px solid ${COLORS.borderGray}` }}
  >
    <div
      className="px-4 py-3 flex items-center justify-center gap-3"
      style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
    >
      <button
        onClick={onClose}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Back to Dashboard"
        data-testid="category-back-btn"
      >
        <ChevronLeft className="w-6 h-6" style={{ color: COLORS.primaryOrange }} />
      </button>
      <button
        onClick={onShiftTable}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Shift Table"
        data-testid="shift-table-btn"
      >
        <ArrowRightLeft className="w-5 h-5" style={{ color: COLORS.grayText }} />
      </button>
      <button
        onClick={onMergeTable}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Merge Tables"
        data-testid="merge-tables-btn"
      >
        <GitMerge className="w-5 h-5" style={{ color: COLORS.grayText }} />
      </button>
    </div>
    <div className="flex-1 overflow-y-auto">
      {/* All category */}
      <button
        key="all"
        data-testid="category-all"
        onClick={() => onCategoryChange("all")}
        className="w-full px-4 py-5 text-left font-medium flex items-center justify-between transition-colors"
        style={{
          backgroundColor: activeCategory === "all" ? COLORS.primaryGreen : "transparent",
          color: activeCategory === "all" ? "white" : COLORS.darkText,
        }}
      >
        <span>All</span>
        {activeCategory === "all" && (
          <ChevronRight className="w-5 h-5" style={{ color: "white" }} />
        )}
      </button>
      {/* Dynamic categories from API */}
      {categories.map((category) => (
        <button
          key={category.id}
          data-testid={`category-${category.id}`}
          onClick={() => onCategoryChange(category.id)}
          className="w-full px-4 py-5 text-left font-medium flex items-center justify-between transition-colors"
          style={{
            backgroundColor: activeCategory === category.id ? COLORS.primaryGreen : "transparent",
            color: activeCategory === category.id ? "white" : COLORS.darkText,
          }}
        >
          <span>{category.name}</span>
          {activeCategory === category.id && (
            <ChevronRight className="w-5 h-5" style={{ color: "white" }} />
          )}
        </button>
      ))}
      {categories.length === 0 && (
        <div className="px-4 py-8 text-center text-sm" style={{ color: COLORS.grayText }}>
          No categories available
        </div>
      )}
    </div>
  </div>
);

export default CategoryPanel;
