import { COLORS } from "../../constants";
import SearchResultItem from "./SearchResultItem";

/**
 * SearchResultGroup - Group of search results with header
 */
const SearchResultGroup = ({
  title,
  items,
  isExact = false,
  type, // 'table' | 'delivery' | 'takeAway' | 'room'
  onSelect,
  getDisplayText,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <div 
        className="px-3 py-2 text-xs font-medium uppercase flex items-center gap-2" 
        style={{ 
          color: isExact ? COLORS.primaryGreen : COLORS.grayText, 
          backgroundColor: isExact ? '#f0fdf4' : COLORS.sectionBg 
        }}
      >
        <span>{title}</span>
      </div>
      {items.map((item) => (
        <SearchResultItem
          key={item.id}
          id={item.id}
          displayText={getDisplayText ? getDisplayText(item) : item.customer || item.guest || "Available"}
          phone={item.phone}
          status={type !== 'table' && type !== 'room' ? item.status : undefined}
          isExact={isExact}
          type={type}
          onSelect={() => onSelect({ type, data: item })}
        />
      ))}
    </div>
  );
};

export default SearchResultGroup;
