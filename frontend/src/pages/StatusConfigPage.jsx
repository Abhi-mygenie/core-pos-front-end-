import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, RotateCcw, Save, Eye, EyeOff } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import { COLORS } from "../constants";
import { useToast } from "../hooks/use-toast";
import { useStations, useMenu } from "../contexts";
import { fetchStationData } from "../api/services/stationService";

// LocalStorage key for enabled statuses
const STORAGE_KEY = 'mygenie_enabled_statuses';

// LocalStorage key for station view config
const STATION_VIEW_STORAGE_KEY = 'mygenie_station_view_config';

// LocalStorage key for channel visibility
const CHANNEL_VISIBILITY_STORAGE_KEY = 'mygenie_channel_visibility';

// LocalStorage keys for column layout
const LAYOUT_TABLE_VIEW_KEY = 'mygenie_layout_table_view';
const LAYOUT_ORDER_VIEW_KEY = 'mygenie_layout_order_view';

// VIEW_MODE_LOCK v2 (Task 1 revision, Step 2): the default behaviour is the
// LEGACY runtime toggle (Sidebar shows both view-mode toggles). The two
// localStorage keys below now live in an extended value domain:
//   'table'   | 'order'   | 'both'  for the Table/Order axis
//   'channel' | 'status'  | 'both'  for the Channel/Status axis
// 'both' = no admin override; cashier sees the legacy runtime toggle.
// A specific value ('table' | 'order' | 'channel' | 'status') means
// the admin has chosen to lock that axis — DashboardPage will then hide
// the corresponding sidebar toggle (Step 4).
const VIEW_MODE_TABLE_ORDER_KEY = 'mygenie_view_mode_table_order';     // 'table' | 'order' | 'both'
const VIEW_MODE_CHANNEL_STATUS_KEY = 'mygenie_view_mode_channel_status'; // 'channel' | 'status' | 'both'
const DEFAULT_VIEW_MODE_TO = 'both';
const DEFAULT_VIEW_MODE_CS = 'both';

// DEFAULT_VIEW (Req 4): admin-controlled default view that activates only
// when the corresponding axis lock above is 'both'. Allowed values:
//   'table'   | 'order'    for the POS axis
//   'channel' | 'status'   for the Dashboard axis
// When the parent axis is locked ('table'/'order' or 'channel'/'status'),
// these keys are PRESERVED in localStorage but ignored at runtime.
const DEFAULT_POS_VIEW_KEY = 'mygenie_default_pos_view';                // 'table' | 'order'
const DEFAULT_DASHBOARD_VIEW_KEY = 'mygenie_default_dashboard_view';    // 'channel' | 'status'
const DEFAULT_POS_VIEW_FACTORY = 'table';
const DEFAULT_DASHBOARD_VIEW_FACTORY = 'channel';

// Req 2: Order Taking master switch — when disabled, all paths to
// OrderEntry / Room Check-In modal are silently no-op'd. In-card action
// buttons (Mark Ready, Mark Served, Print KOT/Bill, Confirm, Cancel) are
// unaffected because they bypass `handleTableClick`.
const ORDER_TAKING_KEY = 'mygenie_order_taking_enabled';
const ORDER_TAKING_FACTORY = true;

// Default column layout configs
const DEFAULT_LAYOUT_TABLE = { dineIn: 2, takeAway: 2, delivery: 2, room: 2 };
const DEFAULT_LAYOUT_ORDER = { dineIn: 1, takeAway: 1, delivery: 1, room: 1 };

// Station icons mapping
const STATION_ICONS = {
  KDS: '🍳',
  BAR: '🍺',
  GRILL: '🔥',
  DEFAULT: '📋',
};

// Default station view config
const DEFAULT_STATION_VIEW_CONFIG = {
  enabled: true,  // Enabled by default
  stations: [],
  displayMode: 'stacked', // 'stacked' | 'accordion'
};

// Available channels (IDs must match DashboardPage channelData keys)
const ALL_CHANNELS = [
  { id: 'dineIn', label: 'Dine-In', description: 'In-restaurant dining orders', icon: '🍽️' },
  { id: 'takeAway', label: 'TakeAway', description: 'Takeaway/pickup orders', icon: '🥡' },
  { id: 'delivery', label: 'Delivery', description: 'Delivery orders', icon: '🚗' },
  { id: 'room', label: 'Room', description: 'Room service orders', icon: '🛏️' },
];

// Default channel visibility config - all enabled
const DEFAULT_CHANNEL_CONFIG = {
  enabled: true,
  channels: ALL_CHANNELS.map(c => c.id),  // All channels enabled by default
};

// All 9 status definitions (same as Header.jsx)
const ALL_STATUSES = [
  { id: "pending", fOrderStatus: 7, label: "YTC", description: "Yet to Confirm orders" },
  { id: "preparing", fOrderStatus: 1, label: "Preparing", description: "Orders being prepared" },
  { id: "ready", fOrderStatus: 2, label: "Ready", description: "Orders ready for pickup/serve" },
  { id: "running", fOrderStatus: 8, label: "Running", description: "Active running orders" },
  { id: "served", fOrderStatus: 5, label: "Served", description: "Orders already served" },
  { id: "pendingPayment", fOrderStatus: 9, label: "Pending Pay", description: "Awaiting payment" },
  { id: "paid", fOrderStatus: 6, label: "Paid", description: "Paid/completed orders" },
  { id: "cancelled", fOrderStatus: 3, label: "Cancelled", description: "Cancelled orders" },
  { id: "reserved", fOrderStatus: 10, label: "Reserved", description: "Reserved tables/orders" },
];

// Default: Only status 7, 1, 2, 5 enabled (YTC, Preparing, Ready, Served)
const DEFAULT_ENABLED = ["pending", "preparing", "ready", "served"];  // Status 7, 1, 2, 5

/**
 * StatusConfigPage - Configure which statuses are visible on the dashboard
 * Follows same pattern as Audit Report page
 */
const StatusConfigPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isSilentMode, setIsSilentMode] = useState(false);
  
  // Get available stations from context (loaded from products)
  const {
    availableStations,
    setStationViewEnabled,
    setEnabledStations,
    setDisplayMode: setContextDisplayMode,
    setAllStationData,
  } = useStations();
  // Categories needed to build categoriesMap for fetchStationData
  const { categories } = useMenu();
  
  // Build station list with icons
  const AVAILABLE_STATIONS = availableStations.map(station => ({
    id: station,
    label: station,
    description: `${station} Station`,
    icon: STATION_ICONS[station] || STATION_ICONS.DEFAULT,
  }));
  
  // Enabled statuses state
  const [enabledStatuses, setEnabledStatuses] = useState(DEFAULT_ENABLED);
  const [hasChanges, setHasChanges] = useState(false);

  // Station View config state
  const [stationViewConfig, setStationViewConfig] = useState(DEFAULT_STATION_VIEW_CONFIG);

  // Channel visibility config state
  const [channelConfig, setChannelConfig] = useState(DEFAULT_CHANNEL_CONFIG);

  // Column layout config state
  const [layoutTableView, setLayoutTableView] = useState(DEFAULT_LAYOUT_TABLE);
  const [layoutOrderView, setLayoutOrderView] = useState(DEFAULT_LAYOUT_ORDER);

  // VIEW_MODE_LOCK (Task 1): single-pick view mode per axis
  const [viewModeTableOrder, setViewModeTableOrder] = useState(DEFAULT_VIEW_MODE_TO);
  const [viewModeChannelStatus, setViewModeChannelStatus] = useState(DEFAULT_VIEW_MODE_CS);

  // DEFAULT_VIEW (Req 4): defaults active only when parent axis = 'both'
  const [defaultPosView, setDefaultPosView] = useState(DEFAULT_POS_VIEW_FACTORY);
  const [defaultDashboardView, setDefaultDashboardView] = useState(DEFAULT_DASHBOARD_VIEW_FACTORY);

  // Req 2: Order Taking master switch (default enabled — preserves legacy behavior)
  const [orderTakingEnabled, setOrderTakingEnabled] = useState(ORDER_TAKING_FACTORY);

  // Load from localStorage on mount
  useEffect(() => {
    // Load status config
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEnabledStatuses(parsed);
        }
      } catch (e) {
        console.error('Failed to parse stored statuses:', e);
      }
    }

    // Load station view config
    const storedStationConfig = localStorage.getItem(STATION_VIEW_STORAGE_KEY);
    if (storedStationConfig) {
      try {
        const parsed = JSON.parse(storedStationConfig);
        setStationViewConfig({ ...DEFAULT_STATION_VIEW_CONFIG, ...parsed });
      } catch (e) {
        console.error('Failed to parse stored station view config:', e);
      }
    }

    // Load channel visibility config
    const storedChannelConfig = localStorage.getItem(CHANNEL_VISIBILITY_STORAGE_KEY);
    if (storedChannelConfig) {
      try {
        const parsed = JSON.parse(storedChannelConfig);
        setChannelConfig({ ...DEFAULT_CHANNEL_CONFIG, ...parsed });
      } catch (e) {
        console.error('Failed to parse stored channel visibility config:', e);
      }
    }

    // Load column layout configs
    const storedLayoutTable = localStorage.getItem(LAYOUT_TABLE_VIEW_KEY);
    if (storedLayoutTable) {
      try {
        const parsed = JSON.parse(storedLayoutTable);
        setLayoutTableView({ ...DEFAULT_LAYOUT_TABLE, ...parsed });
      } catch (e) {
        console.error('Failed to parse stored table view layout:', e);
      }
    }

    const storedLayoutOrder = localStorage.getItem(LAYOUT_ORDER_VIEW_KEY);
    if (storedLayoutOrder) {
      try {
        const parsed = JSON.parse(storedLayoutOrder);
        setLayoutOrderView({ ...DEFAULT_LAYOUT_ORDER, ...parsed });
      } catch (e) {
        console.error('Failed to parse stored order view layout:', e);
      }
    }

    // VIEW_MODE_LOCK v2 (Task 1 revision, Step 2): hydrate view modes,
    // accepting 'both' as a valid stored value alongside the per-axis locks.
    try {
      const storedTO = localStorage.getItem(VIEW_MODE_TABLE_ORDER_KEY);
      if (storedTO === 'table' || storedTO === 'order' || storedTO === 'both') setViewModeTableOrder(storedTO);
      const storedCS = localStorage.getItem(VIEW_MODE_CHANNEL_STATUS_KEY);
      if (storedCS === 'channel' || storedCS === 'status' || storedCS === 'both') setViewModeChannelStatus(storedCS);
    } catch (e) {
      console.error('Failed to parse stored view modes:', e);
    }

    // DEFAULT_VIEW (Req 4): hydrate per-axis default-view values
    try {
      const storedDefPos = localStorage.getItem(DEFAULT_POS_VIEW_KEY);
      if (storedDefPos === 'table' || storedDefPos === 'order') {
        setDefaultPosView(storedDefPos);
      } else if (storedDefPos === null) {
        // Req 4 backfill: persist factory default on first load if key absent,
        // so localStorage shape stays consistent without requiring user action.
        localStorage.setItem(DEFAULT_POS_VIEW_KEY, DEFAULT_POS_VIEW_FACTORY);
      }
      const storedDefDash = localStorage.getItem(DEFAULT_DASHBOARD_VIEW_KEY);
      if (storedDefDash === 'channel' || storedDefDash === 'status') {
        setDefaultDashboardView(storedDefDash);
      } else if (storedDefDash === null) {
        localStorage.setItem(DEFAULT_DASHBOARD_VIEW_KEY, DEFAULT_DASHBOARD_VIEW_FACTORY);
      }
    } catch (e) {
      console.error('Failed to parse stored default views:', e);
    }

    // Req 2: hydrate Order Taking flag with first-visit backfill
    try {
      const storedOT = localStorage.getItem(ORDER_TAKING_KEY);
      if (storedOT === null) {
        // Backfill factory default so storage shape stays consistent.
        localStorage.setItem(ORDER_TAKING_KEY, JSON.stringify({ enabled: ORDER_TAKING_FACTORY }));
      } else {
        const parsed = JSON.parse(storedOT);
        setOrderTakingEnabled(parsed?.enabled !== false);
      }
    } catch (e) {
      console.error('Failed to parse Order Taking flag:', e);
    }
  }, []);

  // Toggle a status
  const toggleStatus = (statusId) => {
    setEnabledStatuses(prev => {
      const isEnabled = prev.includes(statusId);
      // Prevent disabling all statuses (at least 1 must be enabled)
      if (isEnabled && prev.length === 1) {
        toast({
          title: "Cannot disable",
          description: "At least one status must be enabled.",
          variant: "destructive",
        });
        return prev;
      }
      const next = isEnabled 
        ? prev.filter(id => id !== statusId)
        : [...prev, statusId];
      setHasChanges(true);
      return next;
    });
  };

  // Enable all
  const enableAll = () => {
    setEnabledStatuses(DEFAULT_ENABLED);
    setHasChanges(true);
  };

  // Disable all except one (first one)
  const disableAll = () => {
    setEnabledStatuses([DEFAULT_ENABLED[0]]);
    setHasChanges(true);
  };

  // Reset to default
  const resetToDefault = () => {
    setEnabledStatuses(DEFAULT_ENABLED);
    setStationViewConfig(DEFAULT_STATION_VIEW_CONFIG);
    setChannelConfig(DEFAULT_CHANNEL_CONFIG);
    setLayoutTableView(DEFAULT_LAYOUT_TABLE);
    setLayoutOrderView(DEFAULT_LAYOUT_ORDER);
    setViewModeTableOrder(DEFAULT_VIEW_MODE_TO);
    setViewModeChannelStatus(DEFAULT_VIEW_MODE_CS);
    // DEFAULT_VIEW (Req 4): also reset per-axis defaults to factory
    setDefaultPosView(DEFAULT_POS_VIEW_FACTORY);
    setDefaultDashboardView(DEFAULT_DASHBOARD_VIEW_FACTORY);
    // Req 2: also reset Order Taking to factory (enabled)
    setOrderTakingEnabled(ORDER_TAKING_FACTORY);
    setHasChanges(true);
  };

  // Toggle station view enabled
  const toggleStationViewEnabled = () => {
    setStationViewConfig(prev => ({
      ...prev,
      enabled: !prev.enabled,
    }));
    setHasChanges(true);
  };

  // Toggle a station
  const toggleStation = (stationId) => {
    setStationViewConfig(prev => {
      const isSelected = prev.stations.includes(stationId);
      return {
        ...prev,
        stations: isSelected
          ? prev.stations.filter(id => id !== stationId)
          : [...prev.stations, stationId],
      };
    });
    setHasChanges(true);
  };

  // Toggle channel visibility enabled
  const toggleChannelEnabled = () => {
    setChannelConfig(prev => ({
      ...prev,
      enabled: !prev.enabled,
    }));
    setHasChanges(true);
  };

  // Toggle a channel
  const toggleChannel = (channelId) => {
    setChannelConfig(prev => {
      const isSelected = prev.channels.includes(channelId);
      // Prevent disabling all channels
      if (isSelected && prev.channels.length === 1) {
        toast({
          title: "Cannot disable",
          description: "At least one channel must be enabled.",
          variant: "destructive",
        });
        return prev;
      }
      return {
        ...prev,
        channels: isSelected
          ? prev.channels.filter(id => id !== channelId)
          : [...prev.channels, channelId],
      };
    });
    setHasChanges(true);
  };

  // Change display mode
  const setDisplayMode = (mode) => {
    setStationViewConfig(prev => ({
      ...prev,
      displayMode: mode,
    }));
    setHasChanges(true);
  };

  // Update column count for a channel in Table View
  const updateTableViewColumns = (channelId, delta) => {
    setLayoutTableView(prev => {
      const current = prev[channelId] ?? 2;
      const newVal = Math.max(1, current + delta); // Min 1
      return { ...prev, [channelId]: newVal };
    });
    setHasChanges(true);
  };

  // Update column count for a channel in Order View
  const updateOrderViewColumns = (channelId, delta) => {
    setLayoutOrderView(prev => {
      const current = prev[channelId] ?? 1;
      const newVal = Math.max(1, current + delta); // Min 1
      return { ...prev, [channelId]: newVal };
    });
    setHasChanges(true);
  };

  // Reset layout to defaults
  const resetLayout = () => {
    setLayoutTableView(DEFAULT_LAYOUT_TABLE);
    setLayoutOrderView(DEFAULT_LAYOUT_ORDER);
    setHasChanges(true);
  };

  // Save to localStorage
  const saveConfiguration = async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enabledStatuses));
    localStorage.setItem(STATION_VIEW_STORAGE_KEY, JSON.stringify(stationViewConfig));
    localStorage.setItem(CHANNEL_VISIBILITY_STORAGE_KEY, JSON.stringify(channelConfig));
    localStorage.setItem(LAYOUT_TABLE_VIEW_KEY, JSON.stringify(layoutTableView));
    localStorage.setItem(LAYOUT_ORDER_VIEW_KEY, JSON.stringify(layoutOrderView));
    // VIEW_MODE_LOCK (Task 1): persist single-pick view modes
    localStorage.setItem(VIEW_MODE_TABLE_ORDER_KEY, viewModeTableOrder);
    localStorage.setItem(VIEW_MODE_CHANNEL_STATUS_KEY, viewModeChannelStatus);
    // DEFAULT_VIEW (Req 4): persist per-axis default-view selections
    localStorage.setItem(DEFAULT_POS_VIEW_KEY, defaultPosView);
    localStorage.setItem(DEFAULT_DASHBOARD_VIEW_KEY, defaultDashboardView);
    // Req 2: persist Order Taking flag
    localStorage.setItem(ORDER_TAKING_KEY, JSON.stringify({ enabled: orderTakingEnabled }));

    // STATION_VIEW_SYNC (Apr-2026): localStorage write alone leaves StationContext
    // stale until a full reload, so the dashboard's StationPanel renders nothing
    // when the user navigates back via React Router. Sync context state from the
    // form state, then refetch station data so the panel populates immediately.
    const nextEnabled = stationViewConfig.enabled !== false;
    const nextStations = Array.isArray(stationViewConfig.stations)
      ? stationViewConfig.stations.filter(s => availableStations.includes(s))
      : [];
    const nextDisplayMode = stationViewConfig.displayMode || 'stacked';
    setStationViewEnabled(nextEnabled);
    setEnabledStations(nextStations);
    setContextDisplayMode(nextDisplayMode);

    if (nextEnabled && nextStations.length > 0) {
      try {
        const categoriesMap = {};
        (categories || []).forEach(cat => {
          if (cat.categoryId) {
            categoriesMap[cat.categoryId] = cat.categoryName || cat.name;
            categoriesMap[String(cat.categoryId)] = cat.categoryName || cat.name;
          }
        });
        const results = await Promise.all(
          nextStations.map(s => fetchStationData(s, categoriesMap))
        );
        const dataObj = {};
        nextStations.forEach((s, i) => { dataObj[s] = results[i]; });
        setAllStationData(dataObj);
      } catch (e) {
        console.error('[StatusConfigPage] Failed to refresh station data after save:', e);
      }
    } else {
      // Reset station data when disabled or no stations selected
      setAllStationData({});
    }

    setHasChanges(false);
    toast({
      title: "Configuration saved",
      description: `Settings saved. Layout: Table(${Object.values(layoutTableView).join('/')}) Order(${Object.values(layoutOrderView).join('/')})`,
    });
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: COLORS.background }}>
      {/* Sidebar */}
      <Sidebar
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
        isSilentMode={isSilentMode}
        setIsSilentMode={setIsSilentMode}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className="px-6 py-4 flex items-center justify-between"
          style={{ 
            backgroundColor: COLORS.lightBg, 
            borderBottom: `1px solid ${COLORS.borderGray}` 
          }}
        >
          <div className="flex items-center gap-4">
            <button
              data-testid="back-btn"
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" style={{ color: COLORS.darkText }} />
            </button>
            <h1 className="text-xl font-semibold" style={{ color: COLORS.darkText }}>
              Status Configuration
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Reset Button */}
            <button
              data-testid="reset-btn"
              onClick={resetToDefault}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors hover:bg-gray-50"
              style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm">Reset to Default</span>
            </button>

            {/* Save Button */}
            <button
              data-testid="save-btn"
              onClick={saveConfiguration}
              disabled={!hasChanges}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              style={{ 
                backgroundColor: hasChanges ? COLORS.primaryOrange : COLORS.borderGray, 
                color: 'white' 
              }}
            >
              <Save className="w-4 h-4" />
              <span className="text-sm">Save Configuration</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Info Card */}
            <div 
              className="p-4 rounded-lg mb-6"
              style={{ backgroundColor: `${COLORS.primaryOrange}10`, border: `1px solid ${COLORS.primaryOrange}30` }}
            >
              <p className="text-sm" style={{ color: COLORS.darkText }}>
                <strong>Note:</strong> Select which order statuses should be visible on the dashboard. 
                In Channel View, these will appear as filter pills. In Status View, these will appear as columns.
                <br />
                <span style={{ color: COLORS.grayText }}>
                  This configuration is stored locally and will persist until you change it.
                  In future, this will be controlled by user role permissions.
                </span>
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3 mb-6">
              <button
                data-testid="enable-all-btn"
                onClick={enableAll}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors hover:opacity-80"
                style={{ backgroundColor: COLORS.primaryGreen, color: 'white' }}
              >
                <Eye className="w-4 h-4" />
                Enable All
              </button>
              <button
                data-testid="disable-all-btn"
                onClick={disableAll}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors hover:opacity-80"
                style={{ backgroundColor: COLORS.grayText, color: 'white' }}
              >
                <EyeOff className="w-4 h-4" />
                Disable All
              </button>
              <span className="text-sm ml-auto" style={{ color: COLORS.grayText }}>
                {enabledStatuses.length} of {ALL_STATUSES.length} enabled
              </span>
            </div>

            {/* Status Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ALL_STATUSES.map((status) => {
                const isEnabled = enabledStatuses.includes(status.id);
                return (
                  <div
                    key={status.id}
                    data-testid={`status-card-${status.id}`}
                    onClick={() => toggleStatus(status.id)}
                    className="p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md"
                    style={{
                      backgroundColor: isEnabled ? `${COLORS.primaryOrange}05` : COLORS.lightBg,
                      borderColor: isEnabled ? COLORS.primaryOrange : COLORS.borderGray,
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span 
                            className="font-semibold"
                            style={{ color: isEnabled ? COLORS.primaryOrange : COLORS.darkText }}
                          >
                            {status.label}
                          </span>
                          <span 
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ 
                              backgroundColor: COLORS.borderGray,
                              color: COLORS.grayText,
                            }}
                          >
                            Status {status.fOrderStatus}
                          </span>
                        </div>
                        <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                          {status.description}
                        </p>
                      </div>
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ 
                          backgroundColor: isEnabled ? COLORS.primaryOrange : COLORS.borderGray,
                        }}
                      >
                        {isEnabled && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ============== UI ELEMENTS (Req 2: Order Taking) ============== */}
            <div className="mt-10 pt-8" style={{ borderTop: `2px solid ${COLORS.borderGray}` }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
                    UI Elements
                  </h2>
                  <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                    Control which dashboard actions are available on this device.
                  </p>
                </div>
              </div>

              <div
                className="rounded-lg p-4 border-2 flex items-start justify-between gap-4"
                style={{
                  backgroundColor: orderTakingEnabled ? `${COLORS.primaryGreen}05` : COLORS.lightBg,
                  borderColor: orderTakingEnabled ? COLORS.primaryGreen : COLORS.borderGray,
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium" style={{ color: COLORS.darkText }}>
                      Order Taking
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: orderTakingEnabled ? COLORS.primaryGreen : COLORS.grayText,
                        color: '#fff',
                      }}
                    >
                      {orderTakingEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: COLORS.grayText }}>
                    When OFF, this device cannot create new orders or open existing orders for
                    editing. Staff can still mark items ready/served and print bills/KOTs. Useful
                    for kitchen-floor staff or service-only terminals.
                  </p>
                </div>
                <button
                  data-testid="order-taking-toggle"
                  onClick={() => { setOrderTakingEnabled(v => !v); setHasChanges(true); }}
                  className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none"
                  style={{ backgroundColor: orderTakingEnabled ? COLORS.primaryGreen : COLORS.borderGray }}
                  role="switch"
                  aria-checked={orderTakingEnabled}
                >
                  <span
                    className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                    style={{ transform: orderTakingEnabled ? 'translateX(22px)' : 'translateX(2px)', marginTop: '2px' }}
                  />
                </button>
              </div>
            </div>

            {/* ============== STATION VIEW CONFIGURATION ============== */}
            <div className="mt-10 pt-8" style={{ borderTop: `2px solid ${COLORS.borderGray}` }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
                    Station View
                  </h2>
                  <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                    Display aggregated kitchen station items on dashboard
                  </p>
                </div>
                
                {/* Enable/Disable Toggle */}
                <button
                  data-testid="station-view-toggle"
                  onClick={toggleStationViewEnabled}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: stationViewConfig.enabled ? COLORS.primaryGreen : COLORS.borderGray,
                    color: 'white',
                  }}
                >
                  {stationViewConfig.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span className="text-sm font-medium">
                    {stationViewConfig.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </button>
              </div>

              {/* Station View Options (only show when enabled) */}
              {stationViewConfig.enabled && (
                <>
                  {/* Info Card */}
                  <div 
                    className="p-4 rounded-lg mb-6"
                    style={{ backgroundColor: `${COLORS.primaryGreen}10`, border: `1px solid ${COLORS.primaryGreen}30` }}
                  >
                    <p className="text-sm" style={{ color: COLORS.darkText }}>
                      <strong>Station View</strong> shows aggregated item counts from kitchen stations before the order columns on your dashboard.
                      Select which stations to display and how they should appear.
                    </p>
                  </div>

                  {/* Display Mode Selection
                      Re-implemented (Task 1 revision) using the page's
                      checkbox-card pattern to avoid the sr-only-radio
                      scroll-jump bug. Same fix as View Mode below. */}
                  <div className="mb-6">
                    <label className="text-sm font-medium mb-3 block" style={{ color: COLORS.darkText }}>
                      Display Mode
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { id: 'stacked',   label: 'Stacked',   description: 'All stations visible, scroll to see more' },
                        { id: 'accordion', label: 'Accordion', description: 'Click to expand/collapse each station' },
                      ].map((opt) => {
                        const isSelected = stationViewConfig.displayMode === opt.id;
                        return (
                          <div
                            key={opt.id}
                            data-testid={`display-mode-${opt.id}`}
                            onClick={() => setDisplayMode(opt.id)}
                            className="p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md"
                            style={{
                              backgroundColor: isSelected ? `${COLORS.primaryOrange}05` : COLORS.lightBg,
                              borderColor: isSelected ? COLORS.primaryOrange : COLORS.borderGray,
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <span
                                  className="font-semibold"
                                  style={{ color: isSelected ? COLORS.primaryOrange : COLORS.darkText }}
                                >
                                  {opt.label}
                                </span>
                                <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                                  {opt.description}
                                </p>
                              </div>
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: isSelected ? COLORS.primaryOrange : COLORS.borderGray }}
                              >
                                {isSelected && <Check className="w-4 h-4 text-white" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Station Selection */}
                  <div>
                    <label className="text-sm font-medium mb-3 block" style={{ color: COLORS.darkText }}>
                      Select Stations ({stationViewConfig.stations.length} selected)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {AVAILABLE_STATIONS.map((station) => {
                        const isSelected = stationViewConfig.stations.includes(station.id);
                        return (
                          <div
                            key={station.id}
                            data-testid={`station-card-${station.id}`}
                            onClick={() => toggleStation(station.id)}
                            className="p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md"
                            style={{
                              backgroundColor: isSelected ? `${COLORS.primaryGreen}05` : COLORS.lightBg,
                              borderColor: isSelected ? COLORS.primaryGreen : COLORS.borderGray,
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{station.icon}</span>
                                  <span 
                                    className="font-semibold"
                                    style={{ color: isSelected ? COLORS.primaryGreen : COLORS.darkText }}
                                  >
                                    {station.label}
                                  </span>
                                </div>
                                <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                                  {station.description}
                                </p>
                              </div>
                              <div 
                                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ 
                                  backgroundColor: isSelected ? COLORS.primaryGreen : COLORS.borderGray,
                                }}
                              >
                                {isSelected && <Check className="w-4 h-4 text-white" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ============== CHANNEL VISIBILITY CONFIGURATION ============== */}
            <div className="mt-10 pt-8" style={{ borderTop: `2px solid ${COLORS.borderGray}` }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
                    Channel Visibility
                  </h2>
                  <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                    Override API-provided channels to show/hide Dine-In, TakeAway, Delivery, Room on dashboard
                  </p>
                </div>
                
                {/* Enable/Disable Toggle */}
                <button
                  data-testid="channel-visibility-toggle"
                  onClick={toggleChannelEnabled}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: channelConfig.enabled ? COLORS.primaryGreen : COLORS.borderGray,
                    color: 'white',
                  }}
                >
                  {channelConfig.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span className="text-sm font-medium">
                    {channelConfig.enabled ? 'Override ON' : 'Override OFF'}
                  </span>
                </button>
              </div>

              {/* Channel cards (only show when override is enabled) */}
              {channelConfig.enabled && (
                <>
                  <div 
                    className="p-4 rounded-lg mb-6"
                    style={{ backgroundColor: `${COLORS.primaryOrange}10`, border: `1px solid ${COLORS.primaryOrange}30` }}
                  >
                    <p className="text-sm" style={{ color: COLORS.darkText }}>
                      <strong>Channel Override</strong> lets you hide specific order channels from the dashboard, 
                      regardless of what the API returns. Unchecked channels will be completely hidden.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {ALL_CHANNELS.map((channel) => {
                      const isSelected = channelConfig.channels.includes(channel.id);
                      return (
                        <div
                          key={channel.id}
                          data-testid={`channel-card-${channel.id}`}
                          onClick={() => toggleChannel(channel.id)}
                          className="p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md"
                          style={{
                            backgroundColor: isSelected ? `${COLORS.primaryOrange}05` : COLORS.lightBg,
                            borderColor: isSelected ? COLORS.primaryOrange : COLORS.borderGray,
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{channel.icon}</span>
                                <span 
                                  className="font-semibold"
                                  style={{ color: isSelected ? COLORS.primaryOrange : COLORS.darkText }}
                                >
                                  {channel.label}
                                </span>
                              </div>
                              <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                                {channel.description}
                              </p>
                            </div>
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ 
                                backgroundColor: isSelected ? COLORS.primaryOrange : COLORS.borderGray,
                              }}
                            >
                              {isSelected && <Check className="w-4 h-4 text-white" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* ============== VIEW MODE LOCK v2 (Task 1 revision, Step 3) ==============
                Re-implemented using the page's existing checkbox-card pattern
                (div onClick, no hidden form input). The previous radio
                implementation used <label> + sr-only <input type="radio">,
                which on click focused the hidden input and caused the browser
                to scroll the document to (0,0), making the section appear blank.
                This pattern is identical to the Status / Station / Channel
                cards above and is known to work reliably. */}
            <div className="mt-10 pt-8" style={{ borderTop: `2px solid ${COLORS.borderGray}` }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
                    View Mode
                  </h2>
                  <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                    Override the default view mode (optional).
                  </p>
                </div>
              </div>

              <div
                className="p-4 rounded-lg mb-6"
                style={{ backgroundColor: `${COLORS.primaryOrange}10`, border: `1px solid ${COLORS.primaryOrange}30` }}
              >
                <p className="text-sm" style={{ color: COLORS.darkText }}>
                  By default, cashiers see both view toggles in the sidebar and can switch on the fly. Pick a specific view to lock the dashboard. Choose <strong>Both</strong> to let cashiers switch freely — you can also set which view opens first when both are enabled.
                </p>
              </div>

              {/* Axis A — Table or Order View */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-3 block" style={{ color: COLORS.darkText }}>
                  Table or Order View
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'table', label: 'Table View', description: 'Lock to tables grid (with table numbers/sections)' },
                    { id: 'order', label: 'Order View', description: 'Lock to flat order list (one row per order)' },
                    { id: 'both',  label: 'Both (default)', description: 'Cashier can switch from the sidebar' },
                  ].map((opt) => {
                    const isSelected = viewModeTableOrder === opt.id;
                    return (
                      <div
                        key={opt.id}
                        data-testid={`view-mode-to-${opt.id}`}
                        onClick={() => { setViewModeTableOrder(opt.id); setHasChanges(true); }}
                        className="p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md"
                        style={{
                          backgroundColor: isSelected ? `${COLORS.primaryOrange}05` : COLORS.lightBg,
                          borderColor: isSelected ? COLORS.primaryOrange : COLORS.borderGray,
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span
                              className="font-semibold"
                              style={{ color: isSelected ? COLORS.primaryOrange : COLORS.darkText }}
                            >
                              {opt.label}
                            </span>
                            <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                              {opt.description}
                            </p>
                          </div>
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: isSelected ? COLORS.primaryOrange : COLORS.borderGray }}
                          >
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* DEFAULT_POS_VIEW (Req 4): sub-row picker visible only when parent axis = 'both' */}
                {viewModeTableOrder === 'both' && (
                  <div className="mt-4 ml-2 pl-4" style={{ borderLeft: `2px solid ${COLORS.borderGray}` }}>
                    <label className="text-sm font-medium mb-3 block" style={{ color: COLORS.darkText }}>
                      Default POS View
                      <span className="text-xs ml-2" style={{ color: COLORS.grayText }}>
                        Which view opens first when cashier loads the dashboard
                      </span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { id: 'table', label: 'Table View', description: 'Open Table View first on load' },
                        { id: 'order', label: 'Order View', description: 'Open Order View first on load' },
                      ].map((opt) => {
                        const isSelected = defaultPosView === opt.id;
                        return (
                          <div
                            key={opt.id}
                            data-testid={`default-pos-view-${opt.id}`}
                            onClick={() => { setDefaultPosView(opt.id); setHasChanges(true); }}
                            className="p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-sm"
                            style={{
                              backgroundColor: isSelected ? `${COLORS.primaryOrange}05` : COLORS.lightBg,
                              borderColor: isSelected ? COLORS.primaryOrange : COLORS.borderGray,
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <span
                                  className="font-medium text-sm"
                                  style={{ color: isSelected ? COLORS.primaryOrange : COLORS.darkText }}
                                >
                                  {opt.label}
                                </span>
                                <p className="text-xs mt-1" style={{ color: COLORS.grayText }}>
                                  {opt.description}
                                </p>
                              </div>
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: isSelected ? COLORS.primaryOrange : COLORS.borderGray }}
                              >
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Axis B — Channel or Status View */}
              <div>
                <label className="text-sm font-medium mb-3 block" style={{ color: COLORS.darkText }}>
                  Channel or Status View
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'channel', label: 'By Channel', description: 'Lock columns grouped by channel (Dine-In, TakeAway, Delivery, Room)' },
                    { id: 'status',  label: 'By Status',  description: 'Lock columns grouped by order status (YTC, Preparing, Ready, ...)' },
                    { id: 'both',    label: 'Both (default)', description: 'Cashier can switch from the sidebar' },
                  ].map((opt) => {
                    const isSelected = viewModeChannelStatus === opt.id;
                    return (
                      <div
                        key={opt.id}
                        data-testid={`view-mode-cs-${opt.id}`}
                        onClick={() => { setViewModeChannelStatus(opt.id); setHasChanges(true); }}
                        className="p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md"
                        style={{
                          backgroundColor: isSelected ? `${COLORS.primaryGreen}05` : COLORS.lightBg,
                          borderColor: isSelected ? COLORS.primaryGreen : COLORS.borderGray,
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span
                              className="font-semibold"
                              style={{ color: isSelected ? COLORS.primaryGreen : COLORS.darkText }}
                            >
                              {opt.label}
                            </span>
                            <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                              {opt.description}
                            </p>
                          </div>
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: isSelected ? COLORS.primaryGreen : COLORS.borderGray }}
                          >
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* DEFAULT_DASHBOARD_VIEW (Req 4): sub-row picker visible only when parent axis = 'both' */}
                {viewModeChannelStatus === 'both' && (
                  <div className="mt-4 ml-2 pl-4" style={{ borderLeft: `2px solid ${COLORS.borderGray}` }}>
                    <label className="text-sm font-medium mb-3 block" style={{ color: COLORS.darkText }}>
                      Default Dashboard View
                      <span className="text-xs ml-2" style={{ color: COLORS.grayText }}>
                        Which grouping opens first when cashier loads the dashboard
                      </span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { id: 'channel', label: 'By Channel', description: 'Open Channel grouping first' },
                        { id: 'status', label: 'By Status', description: 'Open Status grouping first' },
                      ].map((opt) => {
                        const isSelected = defaultDashboardView === opt.id;
                        return (
                          <div
                            key={opt.id}
                            data-testid={`default-dashboard-view-${opt.id}`}
                            onClick={() => { setDefaultDashboardView(opt.id); setHasChanges(true); }}
                            className="p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-sm"
                            style={{
                              backgroundColor: isSelected ? `${COLORS.primaryGreen}05` : COLORS.lightBg,
                              borderColor: isSelected ? COLORS.primaryGreen : COLORS.borderGray,
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <span
                                  className="font-medium text-sm"
                                  style={{ color: isSelected ? COLORS.primaryGreen : COLORS.darkText }}
                                >
                                  {opt.label}
                                </span>
                                <p className="text-xs mt-1" style={{ color: COLORS.grayText }}>
                                  {opt.description}
                                </p>
                              </div>
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: isSelected ? COLORS.primaryGreen : COLORS.borderGray }}
                              >
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ============== DEFAULT COLUMN LAYOUT ============== */}
            <div className="mt-10 pt-8" style={{ borderTop: `2px solid ${COLORS.borderGray}` }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
                    Default Column Layout
                  </h2>
                  <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                    Set default number of columns per channel for Table View and Order View
                  </p>
                </div>
                
                {/* Reset Layout Button */}
                <button
                  data-testid="reset-layout-btn"
                  onClick={resetLayout}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-gray-100"
                  style={{ border: `1px solid ${COLORS.borderGray}`, color: COLORS.grayText }}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-sm font-medium">Reset Layout</span>
                </button>
              </div>

              {/* Table View Layout */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-3" style={{ color: COLORS.darkText }}>
                  Table View
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {ALL_CHANNELS.map((channel) => (
                    <div
                      key={`table-${channel.id}`}
                      className="p-4 rounded-lg border"
                      style={{ backgroundColor: COLORS.lightBg, borderColor: COLORS.borderGray }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{channel.icon}</span>
                        <span className="font-medium text-sm" style={{ color: COLORS.darkText }}>
                          {channel.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          data-testid={`table-${channel.id}-minus`}
                          onClick={() => updateTableViewColumns(channel.id, -1)}
                          disabled={layoutTableView[channel.id] <= 1}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-colors disabled:opacity-30"
                          style={{ 
                            backgroundColor: COLORS.borderGray, 
                            color: COLORS.darkText 
                          }}
                        >
                          −
                        </button>
                        <span 
                          className="text-xl font-bold w-8 text-center"
                          style={{ color: COLORS.primaryOrange }}
                        >
                          {layoutTableView[channel.id]}
                        </span>
                        <button
                          data-testid={`table-${channel.id}-plus`}
                          onClick={() => updateTableViewColumns(channel.id, 1)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-colors hover:opacity-80"
                          style={{ 
                            backgroundColor: COLORS.primaryOrange, 
                            color: 'white' 
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order View Layout */}
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: COLORS.darkText }}>
                  Order View
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {ALL_CHANNELS.map((channel) => (
                    <div
                      key={`order-${channel.id}`}
                      className="p-4 rounded-lg border"
                      style={{ backgroundColor: COLORS.lightBg, borderColor: COLORS.borderGray }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{channel.icon}</span>
                        <span className="font-medium text-sm" style={{ color: COLORS.darkText }}>
                          {channel.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          data-testid={`order-${channel.id}-minus`}
                          onClick={() => updateOrderViewColumns(channel.id, -1)}
                          disabled={layoutOrderView[channel.id] <= 1}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-colors disabled:opacity-30"
                          style={{ 
                            backgroundColor: COLORS.borderGray, 
                            color: COLORS.darkText 
                          }}
                        >
                          −
                        </button>
                        <span 
                          className="text-xl font-bold w-8 text-center"
                          style={{ color: COLORS.primaryGreen }}
                        >
                          {layoutOrderView[channel.id]}
                        </span>
                        <button
                          data-testid={`order-${channel.id}-plus`}
                          onClick={() => updateOrderViewColumns(channel.id, 1)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-colors hover:opacity-80"
                          style={{ 
                            backgroundColor: COLORS.primaryGreen, 
                            color: 'white' 
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div 
                className="mt-4 p-3 rounded-lg"
                style={{ backgroundColor: `${COLORS.grayText}10` }}
              >
                <p className="text-xs" style={{ color: COLORS.grayText }}>
                  💡 Arrow buttons on dashboard adjust columns temporarily (session only). Save here for permanent defaults.
                </p>
              </div>
            </div>

            {/* Changes Indicator */}
            {hasChanges && (
              <div 
                className="fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3"
                style={{ backgroundColor: COLORS.darkText }}
              >
                <span className="text-sm text-white">You have unsaved changes</span>
                <button
                  onClick={saveConfiguration}
                  className="px-3 py-1.5 rounded-md text-sm font-medium"
                  style={{ backgroundColor: COLORS.primaryOrange, color: 'white' }}
                >
                  Save Now
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StatusConfigPage;
