/**
 * FilterPill - Reusable filter button component
 */
import { COLORS } from "../../constants";

const FilterPill = ({
  id,
  label,
  isActive,
  onClick,
  icon: Icon,
  testIdPrefix = "filter",
  variant = "default", // 'default' | 'channel'
}) => {
  const isChannel = variant === "channel";
  
  return (
    <button
      data-testid={`${testIdPrefix}-${id}`}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-${isChannel ? 'lg' : 'md'} transition-colors ${
        isChannel ? 'py-3 px-3' : 'px-3 py-2.5 text-xs font-medium'
      }`}
      style={isChannel ? {
        backgroundColor: isActive ? COLORS.primaryOrange : "transparent",
        color: isActive ? "white" : COLORS.grayText,
      } : {
        backgroundColor: isActive ? COLORS.lightBg : "transparent",
        color: isActive ? COLORS.primaryOrange : COLORS.grayText,
        border: `1px solid ${isActive ? COLORS.primaryOrange : COLORS.borderGray}`,
      }}
      title={label}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span className={isChannel ? "text-sm font-medium" : ""}>{label}</span>
    </button>
  );
};

export default FilterPill;
