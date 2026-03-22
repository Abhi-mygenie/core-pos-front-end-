import { ChevronRight } from "lucide-react";
import { COLORS } from "../../constants";

/**
 * SearchResultItem - Single search result row
 */
const SearchResultItem = ({ 
  id, 
  displayText, 
  phone, 
  status,
  isExact = false,
  type, // 'table' | 'delivery' | 'takeAway' | 'room'
  onSelect,
}) => {
  const showHash = type === 'delivery' || type === 'takeAway';
  
  return (
    <div
      data-testid={`search-result-${id}`}
      className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
        isExact ? 'border-l-2' : ''
      }`}
      style={isExact ? { borderColor: COLORS.primaryGreen } : {}}
    >
      <span 
        className={`${isExact ? 'font-semibold' : 'font-medium'} text-sm`} 
        style={{ color: COLORS.primaryOrange }}
      >
        {showHash ? `#${id}` : id}
      </span>
      <span 
        className="text-sm flex-1" 
        style={{ color: displayText && displayText !== 'Available' && displayText !== 'Walk-in' 
          ? COLORS.darkText 
          : COLORS.grayText 
        }}
      >
        {displayText}
      </span>
      {phone && (
        <span className="text-xs" style={{ color: COLORS.grayText }}>
          {phone}
        </span>
      )}
      {status && (
        <span 
          className="text-xs px-1.5 py-0.5 rounded capitalize" 
          style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}
        >
          {status}
        </span>
      )}
      <button
        onClick={onSelect}
        className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
        style={{ color: isExact ? COLORS.primaryOrange : COLORS.grayText }}
        title="View Details"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default SearchResultItem;
