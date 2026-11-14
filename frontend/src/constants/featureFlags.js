// Feature Flags for controlled rollout of new features
// Toggle these to enable/disable features without code changes

/**
 * USE_CHANNEL_LAYOUT
 * 
 * When TRUE:
 *  - Dashboard shows channel-based columns (Dine-In, TakeAway, Delivery, Room)
 *  - Each channel is a resizable column
 *  - Channel filter buttons are hidden from Header
 *  - Same layout for Table View and List View
 * 
 * When FALSE:
 *  - Dashboard shows area-based sections (Default, out, in, Walk-In)
 *  - Channel filter buttons visible in Header
 *  - Original behavior preserved
 * 
 * Rollback: Set to false to revert to old behavior immediately
 */
export const USE_CHANNEL_LAYOUT = true;

/**
 * USE_STATUS_VIEW
 * 
 * When TRUE:
 *  - Dashboard can toggle between "By Channel" and "By Status" views
 *  - "By Status" groups orders by fOrderStatus (Preparing, Ready, Served, etc.)
 *  - Header shows view toggle buttons
 *  - Filter pills swap based on active view
 * 
 * When FALSE:
 *  - Only "By Channel" view is available
 *  - No status view toggle shown
 * 
 * Rollback: Set to false to hide status view feature
 */
export const USE_STATUS_VIEW = true;

// Future feature flags can be added here
// export const USE_NEW_PAYMENT_FLOW = false;
// export const USE_ADVANCED_SEARCH = false;
