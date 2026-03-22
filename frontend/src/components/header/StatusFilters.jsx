import { useRef, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { COLORS } from "../../constants";
import { ROOM_STATUSES_MORE } from "../../constants/headerConfig";
import { useClickOutside } from "../../hooks";

/**
 * StatusFilters - Status filter pills with optional "More" dropdown for rooms
 */
const StatusFilters = ({
  statuses,
  activeStatuses,
  onToggle,
  isRoomOnly,
  showMoreStatuses,
  setShowMoreStatuses,
}) => {
  const moreStatusesRef = useRef(null);

  const handleMoreStatusesClickOutside = useCallback(() => {
    setShowMoreStatuses(false);
  }, [setShowMoreStatuses]);

  useClickOutside(moreStatusesRef, handleMoreStatusesClickOutside, showMoreStatuses);

  // Check if any "more" status is active
  const hasActiveMoreStatus = isRoomOnly && ROOM_STATUSES_MORE.some(s => activeStatuses.includes(s.id));

  return (
    <div className="flex items-center gap-2">
      {statuses.map((status) => {
        const isActive = activeStatuses.includes(status.id);
        return (
          <button
            key={status.id}
            data-testid={`status-${status.id}`}
            onClick={() => onToggle(status.id)}
            className="px-3 py-2.5 rounded-md text-xs font-medium transition-all"
            style={{
              backgroundColor: isActive ? COLORS.lightBg : "transparent",
              color: isActive ? COLORS.primaryOrange : COLORS.grayText,
              border: `1px solid ${isActive ? COLORS.primaryOrange : COLORS.borderGray}`,
            }}
          >
            {status.label}
          </button>
        );
      })}
      
      {/* More dropdown for room statuses */}
      {isRoomOnly && (
        <div className="relative" ref={moreStatusesRef}>
          <button
            data-testid="status-more-btn"
            onClick={() => setShowMoreStatuses(!showMoreStatuses)}
            className="px-3 py-2.5 rounded-md text-xs font-medium transition-all flex items-center gap-1"
            style={{
              backgroundColor: hasActiveMoreStatus ? COLORS.lightBg : "transparent",
              color: hasActiveMoreStatus ? COLORS.primaryOrange : COLORS.grayText,
              border: `1px solid ${hasActiveMoreStatus ? COLORS.primaryOrange : COLORS.borderGray}`,
            }}
          >
            More
            <ChevronDown className={`w-3 h-3 transition-transform ${showMoreStatuses ? 'rotate-180' : ''}`} />
          </button>
          
          {showMoreStatuses && (
            <div 
              className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border z-50 min-w-[140px]"
              style={{ borderColor: COLORS.borderGray }}
            >
              {ROOM_STATUSES_MORE.map((status) => {
                const isActive = activeStatuses.includes(status.id);
                return (
                  <button
                    key={status.id}
                    data-testid={`status-${status.id}`}
                    onClick={() => onToggle(status.id)}
                    className="w-full px-3 py-2 text-xs font-medium text-left hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg flex items-center justify-between"
                    style={{ color: isActive ? COLORS.primaryOrange : COLORS.darkText }}
                  >
                    {status.label}
                    {isActive && (
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: COLORS.primaryOrange }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatusFilters;
