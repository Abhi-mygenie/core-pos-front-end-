import { COLORS } from "../../constants";
import RoomCard from "../cards/RoomCard";
import { sortByActiveFirst, ROOM_STATUS_PRIORITY } from "../../utils";

// Room Section Component
const RoomSection = ({ section, onRoomClick, activeFirst, searchQuery, matchingRoomIds }) => {
  // Filter rooms based on search
  const filteredRooms = matchingRoomIds === null 
    ? section.rooms 
    : section.rooms.filter(r => matchingRoomIds.has(r.id));

  // Sort rooms using shared utility
  const sortedRooms = sortByActiveFirst(filteredRooms, ROOM_STATUS_PRIORITY, activeFirst);

  // Don't render section if no matching rooms
  if (searchQuery && sortedRooms.length === 0) {
    return null;
  }

  return (
    <div data-testid={`room-section-${section.prefix}`} className="flex-1 min-w-[300px]">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: COLORS.grayText }}>
        <span className="font-medium" style={{ color: COLORS.darkText }}>{section.name}</span>
        {searchQuery && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: COLORS.primaryOrange, color: 'white' }}>
            {sortedRooms.length} found
          </span>
        )}
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-2 gap-3" style={{ overflow: "visible" }}>
        {sortedRooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            onClick={onRoomClick}
          />
        ))}
      </div>
    </div>
  );
};

export default RoomSection;
