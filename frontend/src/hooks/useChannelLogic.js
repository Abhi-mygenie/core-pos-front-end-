import { useMemo, useCallback } from "react";
import { MULTI_CHANNEL_IDS } from "../constants/headerConfig";

/**
 * Custom hook for channel selection logic
 * Handles multi-select behavior with special cases for "All" and "Room"
 */
const useChannelLogic = (activeChannels, setActiveChannels) => {
  // Derived state
  const isAllChannels = useMemo(() => 
    MULTI_CHANNEL_IDS.every(id => activeChannels.includes(id)) && !activeChannels.includes("room"),
    [activeChannels]
  );

  const isRoomOnly = useMemo(() => 
    activeChannels.length === 1 && activeChannels[0] === "room",
    [activeChannels]
  );

  const isDineInOnly = useMemo(() => 
    activeChannels.length === 1 && activeChannels[0] === "dineIn",
    [activeChannels]
  );

  const hasDineIn = useMemo(() => 
    activeChannels.includes("dineIn"),
    [activeChannels]
  );

  // Channel toggle handler
  const handleChannelToggle = useCallback((channelId) => {
    // "All" selects Del + Take + Dine
    if (channelId === "all") {
      setActiveChannels([...MULTI_CHANNEL_IDS]);
      return;
    }
    // Room is exclusive — deselects everything else
    if (channelId === "room") {
      setActiveChannels(["room"]);
      return;
    }
    // Clicking non-room while Room is active → select only that channel
    if (activeChannels.length === 1 && activeChannels[0] === "room") {
      setActiveChannels([channelId]);
      return;
    }
    // Was "All" selected → select only clicked one
    if (MULTI_CHANNEL_IDS.every(id => activeChannels.includes(id)) && !activeChannels.includes("room")) {
      setActiveChannels([channelId]);
      return;
    }
    // Toggle within multi-select group
    if (activeChannels.includes(channelId)) {
      const next = activeChannels.filter(c => c !== channelId);
      // Don't allow empty — revert to all 3
      setActiveChannels(next.length === 0 ? [...MULTI_CHANNEL_IDS] : next);
    } else {
      setActiveChannels([...activeChannels, channelId]);
    }
  }, [activeChannels, setActiveChannels]);

  // Dynamic search placeholder
  const getSearchPlaceholder = useCallback(() => {
    if (isRoomOnly) return "Search room, guest...";
    if (isAllChannels) return "Search table, order...";
    if (activeChannels.length === 1) {
      if (activeChannels[0] === "dineIn") return "Search table, customer...";
      if (activeChannels[0] === "delivery") return "Search order, customer...";
      if (activeChannels[0] === "takeAway") return "Search order, customer...";
    }
    const hasTable = activeChannels.includes("dineIn");
    const hasOrder = activeChannels.includes("delivery") || activeChannels.includes("takeAway");
    if (hasTable && hasOrder) return "Search table, order...";
    if (hasTable) return "Search table, customer...";
    if (hasOrder) return "Search order, customer...";
    return "Search...";
  }, [activeChannels, isRoomOnly, isAllChannels]);

  return {
    isAllChannels,
    isRoomOnly,
    isDineInOnly,
    hasDineIn,
    handleChannelToggle,
    getSearchPlaceholder,
  };
};

export default useChannelLogic;
