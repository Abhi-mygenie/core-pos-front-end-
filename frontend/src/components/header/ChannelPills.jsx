import { LayoutGrid } from "lucide-react";
import { COLORS } from "../../constants";
import { CHANNELS } from "../../constants/headerConfig";

/**
 * ChannelPills - Channel toggle buttons (All, Del, Take, Dine, Room)
 */
const ChannelPills = ({
  activeChannels,
  isAllChannels,
  isRoomOnly,
  onToggle,
}) => {
  return (
    <nav className="flex items-center gap-1 ml-4">
      {/* All pill */}
      <button
        data-testid="channel-all"
        onClick={() => onToggle("all")}
        className="flex items-center gap-1.5 py-3 px-3 rounded-lg transition-colors"
        style={{
          backgroundColor: isAllChannels ? COLORS.primaryOrange : "transparent",
          color: isAllChannels ? "white" : COLORS.grayText,
        }}
        title="All Channels"
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="text-sm font-medium">All</span>
      </button>
      
      {CHANNELS.map((channel) => {
        const Icon = channel.icon;
        const isRoom = channel.id === "room";
        const isActive = isRoom
          ? isRoomOnly
          : !isAllChannels && activeChannels.includes(channel.id);
        
        return (
          <button
            key={channel.id}
            data-testid={`channel-${channel.id}`}
            onClick={() => onToggle(channel.id)}
            className="flex items-center gap-1.5 py-3 px-3 rounded-lg transition-colors"
            style={{
              backgroundColor: isActive ? COLORS.primaryOrange : "transparent",
              color: isActive ? "white" : COLORS.grayText,
            }}
            title={channel.fullLabel}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm font-medium">{channel.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default ChannelPills;
