import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { COLORS, USE_CHANNEL_LAYOUT, USE_STATUS_VIEW } from "../constants";
import { Sidebar, Header } from "../components/layout";
import { TableSection } from "../components/sections";
import { DineInCard, DeliveryCard, OrderCard } from "../components/cards";
import TableCard from "../components/cards/TableCard";
import { OrderEntry } from "../components/order-entry";
import { sortByActiveFirst, TABLE_STATUS_PRIORITY } from "../utils";
import { useRestaurant, useTables, useOrders, useAuth, useSettings } from "../contexts";
import SettingsPanel from "../components/panels/SettingsPanel";
import MenuManagementPanel from "../components/panels/MenuManagementPanel";
import CreditManagementPanel from "../components/panels/CreditManagementPanel";
import SettlementPanel from "../components/panels/SettlementPanel";
import { useRefreshAllData } from "../hooks/useRefreshAllData";
// CR ORDER_POLLING_RECONCILIATION (May-2026): silent background safety net
// for missed-socket-event drift. No UI surface; routes through OrderContext.
import { useOrderPollingReconciliation } from "../hooks/useOrderPollingReconciliation";
import RoomCheckInModal from "../components/modals/RoomCheckInModal";
import CancelOrderModal from "../components/order-entry/CancelOrderModal";
import { useSocketEvents } from "../api/socket";
import api from "../api/axios";
import { API_ENDPOINTS, STATUS_COLUMNS } from "../api/constants";
import { toAPI as orderToAPI } from "../api/transforms/orderTransform";
import { updateOrderStatus, confirmOrder, completePrepaidOrder } from "../api/services/orderService";
import { ChannelColumnsLayout } from "../components/dashboard";
import { StationPanel } from "../components/station-view";
import NotificationBanner from "../components/layout/NotificationBanner";
import { isWebOrigin, getRunningOrders } from "../utils/orderOrigin";
import ScanOrderPopOut from "../components/dashboard/ScanOrderPopOut";

// ROOM_CARD_TOTAL (Task 4, Apr-2026): card amount for ROOM orders must reflect
// the full checkout value the cashier will see — i.e., room food/room-service
// plus any transferred dine-in/walk-in bills plus the outstanding room
// booking balance. Mirrors CollectPaymentPanel's `effectiveTotal` math
// (line 355 there) but without discount/SC/tax sensitivity, which is
// intentional — table cards across the app show a flat post-tax order amount,
// not the discount-aware finalTotal. Non-room orders are untouched and keep
// using `order.amount` directly.
const computeRoomCardAmount = (order) => {
  const food = Number(order?.amount) || 0;
  const transfers = (order?.associatedOrders || [])
    .reduce((sum, o) => sum + (Number(o?.amount) || 0), 0);
  const roomBal = Math.max(0, Number(order?.roomInfo?.balancePayment) || 0);
  return food + transfers + roomBal;
};

// DEFAULT_VIEW (Req 4): resolve initial view per axis with precedence
//   1) lock value (table|order or channel|status)
//   2) admin default (when lock = 'both')
//   3) factory default
const resolveInitialView = (lockKey, defaultKey, lockValues, defaultValues, factory) => {
  try {
    const lock = localStorage.getItem(lockKey);
    if (lockValues.includes(lock)) return lock;
    if (lock === 'both') {
      const def = localStorage.getItem(defaultKey);
      if (defaultValues.includes(def)) return def;
    }
  } catch (e) { /* localStorage unavailable */ }
  return factory;
};

// Req 2 enhancement: when Order Taking is OFF, force Order + Status views
// on initial mount and on flag flip. Sidebar runtime toggles remain visible
// (Option B per owner) so kitchen staff can flip if they choose.
const isOrderTakingDisabledFromStorage = () => {
  try {
    const stored = localStorage.getItem('mygenie_order_taking_enabled');
    if (stored === null) return false;
    const parsed = JSON.parse(stored);
    return parsed?.enabled === false;
  } catch (e) {
    return false;
  }
};

// Helper: search a list of items by id, customer/guest, and phone fields
const searchItems = (items, query, getFields) => {
  const exact = [];
  const partial = [];
  items.forEach(item => {
    const fields = getFields(item);
    const idMatch = (fields.id || '').toLowerCase();
    if (idMatch === query) {
      exact.push(item);
    } else if (fields.all.some(f => f && f.toLowerCase().includes(query))) {
      partial.push(item);
    }
  });
  return { exact, partial: partial.slice(0, 5) };
};

// Helper: extract matching IDs from search results
const getMatchingIds = (searchQuery, resultGroup) => {
  if (!searchQuery.trim()) return null;
  const ids = new Set();
  resultGroup.exact.forEach(item => ids.add(item.id));
  resultGroup.partial.forEach(item => ids.add(item.id));
  return ids;
};

// Empty state component for 0 tables
const EmptyTableState = () => (
  <div data-testid="empty-table-state" className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: COLORS.sectionBg }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={COLORS.grayText} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    </div>
    <p className="text-lg font-medium" style={{ color: COLORS.darkText }}>No Tables Found</p>
    <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>Add tables from Settings to start managing dine-in orders.</p>
  </div>
);

// Reusable order list section (Delivery/TakeAway) — now uses OrderCard
const OrderListSection = ({ title, orders, orderType, matchingIds, snoozedOrders, onToggleSnooze, onEdit, onMarkReady, onMarkServed, onBillClick, onCancelOrder, onItemStatusChange, canCancelOrder, canPrintBill, canBill, className }) => (
  <div className={className}>
    <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: COLORS.grayText }}>
      <span className="font-medium" style={{ color: COLORS.darkText }}>{title}</span>
      <span style={{ color: COLORS.borderGray }}>|</span>
      <span>{matchingIds === null ? orders.length : matchingIds.size} Orders</span>
    </div>
    {orders.length > 0 ? (
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {orders
          .filter(order => matchingIds === null || matchingIds.has(String(order.orderId)))
          .map((order) => (
            <OrderCard
              key={order.orderId}
              order={order}
              orderType={orderType}
              isSnoozed={snoozedOrders.has(String(order.orderId))}
              canCancelOrder={canCancelOrder}
              canMergeOrder={false}
              canShiftTable={false}
              canFoodTransfer={false}
              canPrintBill={canPrintBill}
              canBill={canBill}
              onToggleSnooze={onToggleSnooze}
              onEdit={onEdit}
              onMarkReady={() => onMarkReady?.({ orderId: order.orderId, tableId: 0 })}
              onMarkServed={() => onMarkServed?.({ orderId: order.orderId, tableId: 0 })}
              onBillClick={() => onBillClick?.(order)}
              onCancelOrder={onCancelOrder}
              onItemStatusChange={onItemStatusChange}
            />
          ))}
      </div>
    ) : (
      <p className="text-sm py-4" style={{ color: COLORS.grayText }}>No active orders</p>
    )}
  </div>
);

// Main Home/Dashboard Component
const DashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoaded: restaurantLoaded, currencySymbol, cancellation, features, defaultOrderStatus } = useRestaurant();
  const { tables: apiTables, isLoaded: tablesLoaded } = useTables();
  const { user, hasPermission, permissions } = useAuth();
  
  // Debug: Log permissions on Dashboard load
  useEffect(() => {
    if (user && permissions) {
      console.log('%c[Dashboard] USER PERMISSIONS', 'background: #22c55e; color: white; padding: 4px 8px; border-radius: 4px;');
      console.log('User:', user?.firstName, user?.roleName);
      console.log('Permissions Array:', permissions);
      console.table(permissions.map((p, i) => ({ '#': i + 1, Permission: p })));
    }
  }, [user, permissions]);
  const { getOrderCancellationReasons } = useSettings();
  const {
    dineInOrders, takeAwayOrders, deliveryOrders, walkInOrders,
    orders,
    orderItemsByTableId, getOrderByTableId, getOrdersByTableId, removeOrder, waitForOrderRemoval,
    isOrderEngaged, getOrderById,
  } = useOrders();
  const refreshAllData = useRefreshAllData();
  const { updateTableStatus, isTableEngaged, setTableEngaged } = useTables();

  // Socket events - subscribe to real-time updates
  const { isConnected: socketConnected } = useSocketEvents();

  // CR ORDER_POLLING_RECONCILIATION (May-2026): silent background safety
  // net. Polls running orders every 60 s while authenticated + tab visible,
  // reconciles missed socket drift, and routes adds/updates/removals
  // through the same OrderContext surface socket handlers use. Returns
  // nothing — the only visible side effect is the existing ScanOrderPopOut
  // picking up newly-discovered Web/Scan YTC orders.
  useOrderPollingReconciliation();

  // Redirect to loading if data not loaded (auth check handled by ProtectedRoute — T-07)
  useEffect(() => {
    if (!restaurantLoaded && window.location.pathname !== '/loading') {
      navigate("/loading", { replace: true });
    }
  }, [navigate, restaurantLoaded]);

  // Warn before browser reload/close — prevents accidental session loss
  // Exception: skip dialog when it's an intentional auth redirect (401)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (sessionStorage.getItem('auth_redirect')) {
        sessionStorage.removeItem('auth_redirect');
        return; // intentional redirect — no dialog
      }
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // --- State ---
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Real-time internet connectivity detection
  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Read enabled statuses from localStorage (for visibility config)
  const [enabledStatuses, setEnabledStatuses] = useState(() => {
    const stored = localStorage.getItem('mygenie_enabled_statuses');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) { /* ignore */ }
    }
    // Default: Only status 7, 1, 2, 5 (YTC, Preparing, Ready, Served)
    return ["pending", "preparing", "ready", "served"];
  });
  
  // Read channel visibility config from localStorage
  const [channelVisibility, setChannelVisibility] = useState(() => {
    const stored = localStorage.getItem('mygenie_channel_visibility');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) { /* ignore */ }
    }
    return { enabled: false, channels: ['dineIn', 'takeAway', 'delivery', 'room'] };
  });
  
  // Re-read localStorage on mount and when navigating back to dashboard
  useEffect(() => {
    const storedStatuses = localStorage.getItem('mygenie_enabled_statuses');
    if (storedStatuses) {
      try {
        const parsed = JSON.parse(storedStatuses);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEnabledStatuses(parsed);
        }
      } catch (e) { /* ignore */ }
    }
    
    const storedChannels = localStorage.getItem('mygenie_channel_visibility');
    if (storedChannels) {
      try {
        const parsed = JSON.parse(storedChannels);
        if (parsed && typeof parsed === 'object') {
          setChannelVisibility(parsed);
        }
      } catch (e) { /* ignore */ }
    }

    // VIEW_MODE_LOCK v2 (Task 1 revision, Step 4): re-derive view mode locks
    // when navigating back to the Dashboard (e.g. from the Settings page).
    // If a lock is now active we also align the visible view to the locked
    // value so the Header pills and dashboard content match immediately.
    try {
      // Req 2: order-taking OFF forces order + status, overriding lock/default
      if (isOrderTakingDisabledFromStorage()) {
        setActiveView('order');
        setDashboardView('status');
        // still update lock flags for Sidebar visibility (Option B keeps toggles visible)
        const storedTO_ot = localStorage.getItem('mygenie_view_mode_table_order');
        setLockTableOrder(storedTO_ot === 'table' || storedTO_ot === 'order');
        const storedCS_ot = localStorage.getItem('mygenie_view_mode_channel_status');
        setLockChannelStatus(storedCS_ot === 'channel' || storedCS_ot === 'status');
        return;
      }

      const storedTO = localStorage.getItem('mygenie_view_mode_table_order');
      const isLockedTO = storedTO === 'table' || storedTO === 'order';
      setLockTableOrder(isLockedTO);
      if (isLockedTO) {
        setActiveView(storedTO);
      } else if (storedTO === 'both') {
        // Req 4: when lock = 'both', re-resolve from admin default on nav-back
        const defPos = localStorage.getItem('mygenie_default_pos_view');
        if (defPos === 'table' || defPos === 'order') setActiveView(defPos);
      }

      const storedCS = localStorage.getItem('mygenie_view_mode_channel_status');
      const isLockedCS = storedCS === 'channel' || storedCS === 'status';
      setLockChannelStatus(isLockedCS);
      if (isLockedCS) {
        setDashboardView(storedCS);
      } else if (storedCS === 'both') {
        // Req 4: when lock = 'both', re-resolve from admin default on nav-back
        const defDash = localStorage.getItem('mygenie_default_dashboard_view');
        if (defDash === 'channel' || defDash === 'status') setDashboardView(defDash);
      }
    } catch (e) { /* localStorage unavailable */ }
  }, [location.pathname]);
  
  // Listen for localStorage changes (cross-tab: when config page saves in another tab)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'mygenie_enabled_statuses') {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEnabledStatuses(parsed);
          }
        } catch (err) { /* ignore */ }
      }
      if (e.key === 'mygenie_channel_visibility') {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            setChannelVisibility(parsed);
          }
        } catch (err) { /* ignore */ }
      }
      // VIEW_MODE_LOCK v2 (Task 1 revision, Step 4): cross-tab sync for
      // view mode locks. When admin saves a new lock in another tab,
      // the dashboard reacts immediately without requiring a reload.
      if (e.key === 'mygenie_view_mode_table_order') {
        const isLocked = e.newValue === 'table' || e.newValue === 'order';
        setLockTableOrder(isLocked);
        if (isLocked) setActiveView(e.newValue);
      }
      if (e.key === 'mygenie_view_mode_channel_status') {
        const isLocked = e.newValue === 'channel' || e.newValue === 'status';
        setLockChannelStatus(isLocked);
        if (isLocked) setDashboardView(e.newValue);
      }
      // Req 4: cross-tab sync for default-view keys (only effective when
      // parent axis is 'both' — admin saving a new default in another tab
      // updates the dashboard view immediately if not currently locked)
      if (e.key === 'mygenie_default_pos_view') {
        try {
          const lock = localStorage.getItem('mygenie_view_mode_table_order');
          if (lock === 'both' && (e.newValue === 'table' || e.newValue === 'order')) {
            setActiveView(e.newValue);
          }
        } catch (err) { /* ignore */ }
      }
      if (e.key === 'mygenie_default_dashboard_view') {
        try {
          const lock = localStorage.getItem('mygenie_view_mode_channel_status');
          if (lock === 'both' && (e.newValue === 'channel' || e.newValue === 'status')) {
            setDashboardView(e.newValue);
          }
        } catch (err) { /* ignore */ }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  const [activeChannels, setActiveChannels] = useState(["delivery", "takeAway", "dineIn", "room"]);
  const [activeStatuses, setActiveStatuses] = useState(["pending", "preparing", "ready", "running", "served", "pendingPayment", "paid", "cancelled", "reserved"]);
  const [tableFilter, setTableFilter] = useState(null); // null | 'confirm' | 'schedule'
  const [activeView, setActiveView] = useState(() => {
    // Req 2: order-taking OFF forces 'order' regardless of lock/default
    if (isOrderTakingDisabledFromStorage()) return 'order';
    return resolveInitialView(
      'mygenie_view_mode_table_order',
      'mygenie_default_pos_view',
      ['table', 'order'],
      ['table', 'order'],
      'table'
    );
  });
  const [dashboardView, setDashboardView] = useState(() => {
    // Req 2: order-taking OFF forces 'status' regardless of lock/default
    if (isOrderTakingDisabledFromStorage()) return 'status';
    return resolveInitialView(
      'mygenie_view_mode_channel_status',
      'mygenie_default_dashboard_view',
      ['channel', 'status'],
      ['channel', 'status'],
      'channel'  // Req 4: factory default changed from 'status' to 'channel'
    );
  });
  // VIEW_MODE_LOCK v2 (Task 1 revision, Step 4): lock flags drive whether
  // the Sidebar runtime toggle is shown for each axis. true = admin has
  // locked this axis; false (incl. 'both' / absent) = cashier may switch
  // freely. These are state (not derived) so the path-nav and cross-tab
  // storage effects below can update them at runtime.
  const [lockTableOrder, setLockTableOrder] = useState(() => {
    try {
      const stored = localStorage.getItem('mygenie_view_mode_table_order');
      return stored === 'table' || stored === 'order';
    } catch (e) { return false; }
  });
  const [lockChannelStatus, setLockChannelStatus] = useState(() => {
    try {
      const stored = localStorage.getItem('mygenie_view_mode_channel_status');
      return stored === 'channel' || stored === 'status';
    } catch (e) { return false; }
  });
  const [hiddenChannels, setHiddenChannels] = useState([]); // Hidden channel IDs (dineIn, delivery, etc.)
  const [hiddenStatuses, setHiddenStatuses] = useState([]); // Hidden status IDs (preparing, ready, etc.)
  const [orderEntryTable, setOrderEntryTable] = useState(null);
  const [orderEntryType, setOrderEntryType] = useState(null);
  const [initialShowPayment, setInitialShowPayment] = useState(false);
  const [initialTransferItem, setInitialTransferItem] = useState(null);
  const [cartsByTable, setCartsByTable] = useState({});
  const [sidebarExpanded, setSidebarExpanded] = useState(false); // Default collapsed on login
  const [searchQuery, setSearchQuery] = useState("");
  const [snoozedOrders, setSnoozedOrders] = useState(new Set());
  // POS2-002 Phase 3 (May-2026): Platform filter state. null = "All" (default).
  // 'pos' = non-web orders (orderFrom !== 'web'). 'web' = orderFrom === 'web'.
  // Persists across tab navigation but resets on full page reload (no
  // localStorage in v1 — owner-locked).
  const [platform, setPlatform] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreditOpen, setIsCreditOpen] = useState(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [checkInRoom, setCheckInRoom] = useState(null); // Room object for CheckIn modal
  const [cancelOrderEntry, setCancelOrderEntry] = useState(null); // Table entry for CancelOrderModal

  // Req 2: Order Taking flag — when false, all card body clicks no-op via
  // early return in handleTableClick. Action buttons inside cards (Mark
  // Ready/Served, Print, Confirm, Cancel) bypass handleTableClick and
  // continue working.
  const [orderTakingEnabled, setOrderTakingEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem('mygenie_order_taking_enabled');
      if (stored === null) return true;
      const parsed = JSON.parse(stored);
      return parsed?.enabled !== false;
    } catch (e) {
      return true;
    }
  });
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'mygenie_order_taking_enabled') {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : null;
          setOrderTakingEnabled(parsed?.enabled !== false);
        } catch (err) {
          setOrderTakingEnabled(true);
        }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Req 2 enhancement: react to order-taking flag flips (mount + cross-tab).
  // OFF → force order + status; ON → re-resolve from admin lock/default.
  useEffect(() => {
    if (!orderTakingEnabled) {
      setActiveView('order');
      setDashboardView('status');
    } else {
      setActiveView(resolveInitialView(
        'mygenie_view_mode_table_order',
        'mygenie_default_pos_view',
        ['table', 'order'],
        ['table', 'order'],
        'table'
      ));
      setDashboardView(resolveInitialView(
        'mygenie_view_mode_channel_status',
        'mygenie_default_dashboard_view',
        ['channel', 'status'],
        ['channel', 'status'],
        'channel'
      ));
    }
  }, [orderTakingEnabled]);

  const handleRefreshAll = async () => {
    if (isRefreshing) return;
    // Guard: block refresh when OrderEntry is open
    if (orderEntryType !== null) {
      return; // toast shown in Sidebar
    }
    setIsRefreshing(true);
    setCartsByTable({}); // clear stale saved carts
    try {
      await refreshAllData();
    } finally {
      setIsRefreshing(false);
    }
  };

  // --- Derive tables from API data + order enrichment (synchronous with render) ---
  const { tables, flatTables } = useMemo(() => {
    if (!tablesLoaded) return { tables: {}, flatTables: [] };
    const nonRoomTables = apiTables.filter(t => !t.isRoom);
    if (nonRoomTables.length === 0 && walkInOrders.length === 0) return { tables: {}, flatTables: [] };

    const adaptTable = (t) => {
      // Check if this table has running orders (supports split: 1 table → N orders)
      const tableOrders = getOrdersByTableId(t.tableId);

      if (tableOrders.length === 0) {
        // No orders — single available entry
        return [{
          id: String(t.tableId),
          label: t.tableNumber,
          status: t.isOccupied ? 'occupied' : 'available',
          tableId: t.tableId,
          orderType: 'dineIn',
          // BUG-070 (Wave 5, May-2026): propagate sectionName so Channel View
          // can group dine-in items by area inside their column.
          sectionName: t.sectionName || null,
        }];
      }

      // One entry per order (split support)
      return tableOrders.map((order, idx) => ({
        id: tableOrders.length > 1 ? `${t.tableId}-${order.orderId}` : String(t.tableId),
        label: tableOrders.length > 1 ? `${t.tableNumber} (${idx + 1}/${tableOrders.length})` : t.tableNumber,
        status: order.tableStatus,
        tableId: t.tableId,
        orderType: 'dineIn',
        // BUG-070 (Wave 5, May-2026): propagate sectionName so Channel View
        // can group dine-in items by area inside their column.
        sectionName: t.sectionName || null,
        // Order enrichment
        amount: order.amount,
        time: order.time,
        orderNumber: order.orderNumber,
        fOrderStatus: order.fOrderStatus,
        orderId: order.orderId,
        waiter: order.waiter,
        // Timeline timestamps
        createdAt: order.createdAt,
        readyAt: order.readyAt,
        servedAt: order.servedAt,
        paymentType: order.paymentType || '',
        paymentMethod: order.paymentMethod || '',
      }));
    };

    const hasSections = nonRoomTables.some(t => t.sectionName);

    if (hasSections) {
      const grouped = {};
      nonRoomTables.forEach(table => {
        if (table.status === 'disabled') return;
        const section = table.sectionName || 'Default';
        const key = section.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        if (!grouped[key]) {
          grouped[key] = { name: section, prefix: 'T', tables: [] };
        }
        grouped[key].tables.push(...adaptTable(table));
      });

      // Add walk-in orders as virtual table entries in a "Walk-In" section
      if (walkInOrders.length > 0) {
        grouped['walk_in'] = {
          name: 'Walk-In',
          prefix: 'Walk-In',
          tables: walkInOrders.map((order) => ({
            id: `wc-${order.orderId}`,
            label: order.customer || 'Walk-In',
            status: order.tableStatus,
            tableId: 0,
            // BUG-070 (Wave 5, May-2026): walk-in items belong to the
            // pseudo "Walk-In" section in Channel View grouping.
            sectionName: 'Walk-In',
            amount: order.amount,
            time: order.time,
            orderNumber: order.orderNumber,
            isWalkIn: true,
            walkInOrderId: order.orderId,
            orderId: order.orderId,
            orderType: 'walkIn',
            fOrderStatus: order.fOrderStatus,
            waiter: order.waiter || '',
            // Timeline timestamps
            createdAt: order.createdAt,
            readyAt: order.readyAt,
            servedAt: order.servedAt,
            paymentType: order.paymentType || '',
            paymentMethod: order.paymentMethod || '',
          })),
        };
      }

      return { tables: grouped, flatTables: [] };
    } else {
      const flat = nonRoomTables
        .filter(t => t.status !== 'disabled')
        .flatMap(adaptTable);

      // Append walk-in orders as virtual entries
      walkInOrders.forEach((order) => {
        flat.push({
          id: `wc-${order.orderId}`,
          label: order.customer || 'Walk-In',
          status: order.tableStatus,
          tableId: 0,
          amount: order.amount,
          time: order.time,
          orderNumber: order.orderNumber,
          isWalkIn: true,
          walkInOrderId: order.orderId,
          orderId: order.orderId,
          orderType: 'walkIn',
          fOrderStatus: order.fOrderStatus,
          waiter: order.waiter || '',
          // Timeline timestamps
          createdAt: order.createdAt,
          readyAt: order.readyAt,
          servedAt: order.servedAt,
          paymentType: order.paymentType || '',
          paymentMethod: order.paymentMethod || '',
        });
      });

      return { tables: {}, flatTables: flat };
    }
  }, [tablesLoaded, apiTables, getOrdersByTableId, walkInOrders]);

  // --- Derived values ---
  const hasAreas = Object.keys(tables).length > 0;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- tables/flatTables are useMemo outputs, valid deps
  const allTablesList = useMemo(() => {
    return hasAreas ? Object.values(tables).flatMap(s => s.tables) : flatTables;
  }, [tables, flatTables, hasAreas]);

  const allRoomsList = useMemo(() => {
    if (!tablesLoaded) return [];
    return apiTables
      .filter(t => t.isRoom && t.status !== 'disabled')
      .flatMap(t => {
        const roomOrders = getOrdersByTableId(t.tableId);
        if (roomOrders.length === 0) {
          return [{
            id: String(t.tableId),
            label: t.tableNumber,
            status: t.isOccupied ? 'occupied' : 'available',
            tableId: t.tableId,
            orderType: 'room',
            isRoom: true,
            // BUG-070 (Wave 5, May-2026): propagate sectionName so Channel View
            // and Table View can group rooms by area.
            sectionName: t.sectionName || null,
          }];
        }
        return roomOrders.map((order, idx) => ({
          id: roomOrders.length > 1 ? `${t.tableId}-${order.orderId}` : String(t.tableId),
          label: roomOrders.length > 1 ? `${t.tableNumber} (${idx + 1}/${roomOrders.length})` : t.tableNumber,
          status: order.tableStatus,
          tableId: t.tableId,
          orderType: 'room',
          isRoom: true,
          // BUG-070 (Wave 5, May-2026): propagate sectionName so Channel View
          // and Table View can group rooms by area.
          sectionName: t.sectionName || null,
          // ROOM_CARD_TOTAL (Task 4): include room balance + transferred bills.
          amount: computeRoomCardAmount(order),
          time: order.time,
          orderNumber: order.orderNumber,
          fOrderStatus: order.fOrderStatus,
          orderId: order.orderId,
          customer: order.customer,
          createdAt: order.createdAt,
          readyAt: order.readyAt,
          servedAt: order.servedAt,
          // BUG-072: pass items and orderNote so OrderCard / TableCard can render them.
          // Previously missing — caused "No active items" and missing notes on room cards.
          items: order.items,
          orderNote: order.orderNote,
          order: order,  // full order object for OrderCard fallback (item.order || item)
        }));
      });
  }, [tablesLoaded, apiTables, getOrdersByTableId]);

  // BUG-070 (Wave 5, May-2026): group rooms by `sectionName` for Table View
  // sectioned render. Mirrors the `tables` memo's grouped object shape so
  // <TableSection> can be reused. Section order = API insertion order (Q3
  // owner directive); rooms without `sectionName` go into a `__no_section__`
  // bucket rendered at the top with NO header (Q4 owner directive —
  // enforced via TableSection.jsx `{section.name && (...)}` conditional).
  const roomsBySection = useMemo(() => {
    if (!allRoomsList.length) return [];
    const buckets = new Map();
    allRoomsList.forEach(room => {
      const key = room.sectionName || '__no_section__';
      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          name: room.sectionName || null,
          prefix: 'R',
          tables: [],
        });
      }
      buckets.get(key).tables.push(room);
    });
    const arr = Array.from(buckets.values());
    const noSecIdx = arr.findIndex(s => s.key === '__no_section__');
    if (noSecIdx > 0) {
      const [ns] = arr.splice(noSecIdx, 1);
      arr.unshift(ns);
    }
    return arr;
  }, [allRoomsList]);

  // === Channel-Based Layout Data (USE_CHANNEL_LAYOUT feature flag) ===
  const channelData = useMemo(() => {
    if (!USE_CHANNEL_LAYOUT) return null;
    
    // Helper to adapt walk-in orders as table-like entries
    const adaptWalkIn = (order) => ({
      id: `wc-${order.orderId}`,
      label: order.customer || 'Walk-In',
      status: order.tableStatus,
      tableId: 0,
      amount: order.amount,
      time: order.time,
      orderNumber: order.orderNumber,
      isWalkIn: true,
      walkInOrderId: order.orderId,
      orderId: order.orderId,
      orderType: 'walkIn',
      fOrderStatus: order.fOrderStatus,
      waiter: order.waiter || '',
      order: order, // Keep full order for OrderCard
      // Timeline timestamps
      createdAt: order.createdAt,
      readyAt: order.readyAt,
      servedAt: order.servedAt,
      paymentType: order.paymentType || '',
      paymentMethod: order.paymentMethod || '',
    });

    // Helper to adapt takeaway/delivery orders
    const adaptOrder = (order, type) => ({
      id: `${type}-${order.orderId}`,
      label: order.customer || type.toUpperCase().slice(0, 3),
      status: order.tableStatus,
      tableId: 0,
      amount: order.amount,
      time: order.time,
      orderNumber: order.orderNumber,
      orderId: order.orderId,
      orderType: type,
      fOrderStatus: order.fOrderStatus,
      waiter: order.waiter || '',
      order: order, // Keep full order for OrderCard
      // Timeline timestamps
      createdAt: order.createdAt,
      readyAt: order.readyAt,
      servedAt: order.servedAt,
      paymentType: order.paymentType || '',
      paymentMethod: order.paymentMethod || '',
    });

    // Helper to enrich dine-in tables with order data (supports split: 1 table → N entries)
    const enrichTable = (table) => {
      // If table already has an orderId (from adaptTable split), use it directly
      if (table.orderId) {
        const order = dineInOrders.find(o => o.orderId === table.orderId);
        if (order) {
          return { ...table, order: order };
        }
      }
      return table;
    };

    // Helper function to check if order status matches active status filters
    const statusMatchesFilter = (item) => {
      // If item has no order or no fOrderStatus, include it (e.g., available tables)
      if (!item.order && !item.fOrderStatus) return true;
      
      const fOrderStatus = item.order?.fOrderStatus || item.fOrderStatus;
      if (!fOrderStatus) return true;

      // POS2-005: defensive — exclude f_order_status=8 from running dashboard.
      // Primary guard is at socket insertion (handleScanNewOrder /
      // handleNewOrder in socketHandlers.js); this filter catches any order
      // that slipped past the primary guard (e.g., already in OrderContext
      // from before the deploy).
      if (fOrderStatus === 8) return false;
      
      // Map fOrderStatus to filter IDs
      const statusMap = {
        7: 'pending',      // YTC
        1: 'preparing',
        2: 'ready',
        8: 'running',
        5: 'served',
        9: 'pendingPayment',
        6: 'paid',
        3: 'cancelled',
        10: 'reserved',
      };
      
      const statusId = statusMap[fOrderStatus];
      return statusId ? activeStatuses.includes(statusId) : true;
    };

    // POS2-002 Phase 3 (May-2026): Platform predicate. Composes (AND) with
    // statusMatchesFilter and the channel column. `null` = no narrowing.
    // POS2-002 Phase 3 (May-2026), simplified by CR-2026-05-15 (web/pos
    // single-axis simplification): single shared predicate via the
    // `isWebOrigin` helper. Empty Available containers (rows without an
    // orderId) are NOT orders → excluded from BOTH 'pos' and 'web'
    // buckets; they appear only under 'Platform: All'.
    const platformMatches = (item) => {
      if (platform === null) return true;
      const hasOrder = !!(item?.orderId || item?.order?.orderId);
      if (!hasOrder) return false;
      return platform === 'web' ? isWebOrigin(item) : !isWebOrigin(item);
    };

    // CR-018 G9: Schedule filter — cross-cutting boolean filter.
    // When tableFilter === 'schedule', only show scheduled orders.
    const scheduleMatches = (item) => {
      if (tableFilter !== 'schedule') return true;
      return item.scheduled === true || item.order?.scheduled === true;
    };

    return {
      dineIn: {
        id: 'dineIn',
        name: 'Dine-In',
        items: [
          // BUG-279: removed `.filter(t => t.order || t.orderId)` so empty dine-in tables
          // reach the Dine-In column. `adaptTable` produces exactly 1 available-state row
          // OR N per-order rows, never both — no BUG-245 ghost-card regression.
          //
          // CR-018 G8 (Jun-2026): Re-enabled `statusMatchesFilter` in channel view
          // so status pills (YTC/Preparing/Ready/Served) filter cards within channels.
          // Previously disconnected (May-2026 stability CR) — owner decision to re-enable.
          ...allTablesList.filter(t => !t.isRoom && !t.isWalkIn).map(enrichTable).filter(statusMatchesFilter).filter(platformMatches).filter(scheduleMatches),
          ...walkInOrders.map(adaptWalkIn).filter(statusMatchesFilter).filter(platformMatches).filter(scheduleMatches),
        ],
        enabled: features.dineIn !== false,
      },
      takeAway: {
        id: 'takeAway',
        name: 'TakeAway',
        items: takeAwayOrders.map(o => adaptOrder(o, 'takeAway')).filter(statusMatchesFilter).filter(platformMatches).filter(scheduleMatches),
        enabled: features.takeaway !== false,
      },
      delivery: {
        id: 'delivery',
        name: 'Delivery',
        items: deliveryOrders.map(o => adaptOrder(o, 'delivery')).filter(statusMatchesFilter).filter(platformMatches).filter(scheduleMatches),
        enabled: features.delivery !== false,
      },
      room: {
        id: 'room',
        name: 'Room',
        // BUG-279: same rationale as dineIn — allow empty rooms to render in Channel View.
        items: allRoomsList.filter(statusMatchesFilter).filter(platformMatches).filter(scheduleMatches),
        enabled: features.room !== false,
      },
    };
  }, [allTablesList, allRoomsList, takeAwayOrders, deliveryOrders, walkInOrders, features, dineInOrders, activeStatuses, platform, tableFilter]);

  // === Status-Based Layout Data (USE_STATUS_VIEW feature flag) ===
  const statusData = useMemo(() => {
    if (!USE_STATUS_VIEW || !USE_CHANNEL_LAYOUT) return null;

    // Helper to adapt any order into a table-like entry for the grid
    const adaptOrderForStatus = (order, orderType) => ({
      id: `${orderType}-${order.orderId}`,
      label: order.customer || order.tableNumber || orderType.toUpperCase().slice(0, 3),
      status: order.tableStatus,
      tableId: order.tableId || 0,
      amount: order.amount,
      time: order.time,
      orderNumber: order.orderNumber,
      orderId: order.orderId,
      orderType: orderType,
      fOrderStatus: order.fOrderStatus,
      waiter: order.waiter || '',
      order: order, // Keep full order for OrderCard
      // Timeline timestamps
      createdAt: order.createdAt,
      readyAt: order.readyAt,
      servedAt: order.servedAt,
      paymentType: order.paymentType || '',
      paymentMethod: order.paymentMethod || '',
    });

    // Collect ALL orders from all channels
    const allOrders = [];
    
    // Dine-In tables with orders (include if dineIn is in activeChannels)
    if (activeChannels.includes('dineIn')) {
      allTablesList.filter(t => !t.isRoom && !t.isWalkIn).forEach(table => {
        // adaptTable already created per-order entries with orderId
        if (table.orderId) {
          const order = dineInOrders.find(o => o.orderId === table.orderId);
          if (order) {
            allOrders.push({
              ...table,
              order: order,
              fOrderStatus: order.fOrderStatus,
              orderType: 'dineIn',
            });
          }
        }
      });
      
      // Walk-in orders (part of dineIn channel)
      walkInOrders.forEach(order => {
        allOrders.push(adaptOrderForStatus(order, 'walkIn'));
      });
    }
    
    // TakeAway orders
    if (activeChannels.includes('takeAway')) {
      takeAwayOrders.forEach(order => {
        allOrders.push(adaptOrderForStatus(order, 'takeAway'));
      });
    }
    
    // Delivery orders
    if (activeChannels.includes('delivery')) {
      deliveryOrders.forEach(order => {
        allOrders.push(adaptOrderForStatus(order, 'delivery'));
      });
    }
    
    // Room orders
    if (activeChannels.includes('room')) {
      allRoomsList.forEach(room => {
        // allRoomsList already has per-order entries with orderId from flatMap
        if (room.orderId) {
          // BUG-072 fix: search in `orders` (all orders) instead of `dineInOrders`
          // because room orders have isRoom=true and are excluded from dineInOrders
          // (OrderContext filters: `o.orderType === 'dineIn' && !o.isRoom`).
          // Without this, room cards fall back to the manually constructed entry
          // which lacks `items` and `orderNote`.
          const order = orders.find(o => o.orderId === room.orderId);
          const roomOrder = order || (room.fOrderStatus ? room : null);
          if (roomOrder) {
            allOrders.push({
              ...room,
              order: roomOrder,
              fOrderStatus: room.fOrderStatus || roomOrder.fOrderStatus,
              orderType: 'room',
            });
          }
        }
      });
    }

    // Group orders by fOrderStatus using STATUS_COLUMNS config
    // Filter by enabledStatuses (from config page)
    const statusGroups = {};
    // POS2-002 Phase 3 (May-2026), simplified by CR-2026-05-15: same
    // shared predicate as channelData's platformMatches — empty
    // containers excluded from origin-narrowed views.
    const platformMatches = (item) => {
      if (platform === null) return true;
      const hasOrder = !!(item?.orderId || item?.order?.orderId);
      if (!hasOrder) return false;
      return platform === 'web' ? isWebOrigin(item) : !isWebOrigin(item);
    };
    STATUS_COLUMNS.forEach(col => {
      // Map fOrderStatus to status ID for enabledStatuses check
      const statusIdMap = {
        7: 'pending', 1: 'preparing', 2: 'ready', 8: 'running',
        5: 'served', 9: 'pendingPayment', 6: 'paid', 3: 'cancelled', 10: 'reserved'
      };
      const statusId = statusIdMap[col.fOrderStatus];
      const isEnabled = enabledStatuses.length === 0 || enabledStatuses.includes(statusId);
      
      if (isEnabled) {
        statusGroups[col.id] = {
          id: col.id,
          name: col.name,
          fOrderStatus: col.fOrderStatus,
          // POS2-005: defensive filter — exclude status-8 from any column
          // that tries to surface it. Primary guard removes status-8 from
          // STATUS_COLUMNS itself; this is belt-and-braces.
          items: allOrders.filter(o => o.fOrderStatus === col.fOrderStatus && o.fOrderStatus !== 8).filter(platformMatches),
          enabled: true,
        };
      }
    });

    // CR-018 G7: Build ordered result by iterating STATUS_COLUMNS in definition
    // order (YTC→Preparing→Ready→Served...) instead of returning a numeric-keyed
    // object (JS sorts numeric keys ascending: 1→2→5→7, putting YTC last).
    const ordered = {};
    STATUS_COLUMNS.forEach(col => {
      if (statusGroups[col.id]) {
        ordered[`s${col.id}`] = statusGroups[col.id];
      }
    });

    return ordered;
  }, [allTablesList, allRoomsList, takeAwayOrders, deliveryOrders, walkInOrders, dineInOrders, orders, activeChannels, enabledStatuses, platform]);

  // POS2-002 Phase 3.1 (May-2026), SIMPLIFIED by CR-2026-05-15 (web/pos
  // single-axis simplification — owner decision recap):
  // ----------------------------------------------------------------
  //   1. Pulse counts ALL running orders by origin axis only.
  //      Web = orderFrom === 'web'; POS = every other running order.
  //   2. Pulse is INDEPENDENT of status chips, channel chips, search,
  //      and the Platform dropdown itself. There is no UI narrowing that
  //      can change the displayed number — the chip always answers
  //      "where are my orders coming from right now?" honestly.
  //   3. Empty Available containers (no orderId) are not orders →
  //      excluded by `getRunningOrders`.
  //   4. Terminal statuses (3 cancelled, 6 paid) are not running orders
  //      → excluded by `getRunningOrders`.
  //   5. Walk-ins and rooms are counted once each (raw `orders` from
  //      OrderContext is iterated directly — no per-channel selectors,
  //      so no double-count of walk-ins and no missed rooms).
  //   6. Future BE origin values (aggregator / kiosk / whatsapp /
  //      qr_campaign) bucket to POS via `!isWebOrigin`, exactly the
  //      future-proofing contract from POS2-002 Phase 3.
  const platformCounts = useMemo(() => {
    let web = 0;
    let pos = 0;
    for (const o of getRunningOrders(orders)) {
      if (isWebOrigin(o)) web += 1;
      else pos += 1;
    }
    return { web, pos };
  }, [orders]);

  // View conditions
  const isDineInOnly = activeChannels.length === 1 && activeChannels[0] === "dineIn";
  const isRoomOnly = activeChannels.length === 1 && activeChannels[0] === "room";
  const showGridView = activeView === "table";
  const showListView = !isRoomOnly && activeView === "order";

  // Unified grid items: combine tables + takeaway + delivery based on active channels
  const gridItems = useMemo(() => {
    let items = [];

    if (activeChannels.includes('dineIn')) {
      items.push(...allTablesList);
    }

    if (activeChannels.includes('takeAway')) {
      takeAwayOrders.forEach(order => {
        items.push({
          id: `ta-${order.orderId}`,
          label: order.customer || 'TA',
          status: order.tableStatus,
          tableId: 0,
          amount: order.amount,
          time: order.time,
          orderNumber: order.orderNumber,
          orderType: 'takeAway',
          orderId: order.orderId,
          fOrderStatus: order.fOrderStatus,
          waiter: order.waiter || '',
        });
      });
    }

    if (activeChannels.includes('delivery')) {
      deliveryOrders.forEach(order => {
        items.push({
          id: `del-${order.orderId}`,
          label: order.customer || 'Del',
          status: order.tableStatus,
          tableId: 0,
          amount: order.amount,
          time: order.time,
          orderNumber: order.orderNumber,
          orderType: 'delivery',
          orderId: order.orderId,
          fOrderStatus: order.fOrderStatus,
          waiter: order.waiter || '',
        });
      });
    }

    if (activeChannels.includes('room')) {
      items.push(...allRoomsList);
    }

    return items;
  }, [activeChannels, allTablesList, allRoomsList, takeAwayOrders, deliveryOrders]);

  // Grid title based on active channels
  const gridTitle = useMemo(() => {
    if (activeChannels.length >= 4) return 'All Orders';
    if (activeChannels.length === 1) {
      if (activeChannels[0] === 'dineIn') return 'Tables';
      if (activeChannels[0] === 'takeAway') return 'TakeAway Orders';
      if (activeChannels[0] === 'delivery') return 'Delivery Orders';
      if (activeChannels[0] === 'room') return 'Rooms';
    }
    return 'Orders';
  }, [activeChannels]);

  // Filter grid items — exclusive filter for Schedule/Confirm in table view
  const filteredGridItems = useMemo(() => {
    if (tableFilter === 'confirm') return gridItems.filter(item => item.status === 'yetToConfirm');
    // CR-018: filter by `scheduled` boolean (not `status` which derives from fOrderStatus)
    if (tableFilter === 'schedule') return gridItems.filter(item => item.scheduled === true || item.order?.scheduled === true);
    return gridItems; // no filter active — show all
  }, [gridItems, tableFilter]);

  // --- Search ---
  const searchResults = useMemo(() => {
    const results = {
      tables: { exact: [], partial: [] },
      delivery: { exact: [], partial: [] },
      takeAway: { exact: [], partial: [] },
      rooms: { exact: [], partial: [] }
    };

    if (!searchQuery.trim()) return results;
    const query = searchQuery.toLowerCase().trim();

    if (activeChannels.includes("dineIn")) {
      // Combine regular tables + walk-in orders for search
      const walkInSearchItems = walkInOrders.map(order => ({
        id: `wc-${order.orderId}`,
        label: order.customerName || 'Walk-In',
        tableId: order.orderId,
        isWalkIn: true,
        customer: order.customerName || '',
        phone: order.phone || '',
        status: 'occupied',
        amount: order.amount,
        fOrderStatus: order.fOrderStatus,
        orderId: order.orderId
      }));

      const enrichedTables = allTablesList.filter(t => !t.isWalkIn).map(table => {
        const ordersForTable = orderItemsByTableId[table.tableId] || [];
        // For search, find the specific order matching this table entry's orderId
        const orderData = table.orderId 
          ? (ordersForTable.find(o => o.orderId === table.orderId) || {})
          : (ordersForTable[0] || {});
        return {
          ...table,
          customer: orderData.customer || table.label || "",
          phone: orderData.phone || "",
          status: orderData.status || table.status || "available",
          amount: orderData.amount || table.amount,
          fOrderStatus: orderData.fOrderStatus || table.fOrderStatus
        };
      });

      const allSearchableTables = [...enrichedTables, ...walkInSearchItems];
      
      results.tables = searchItems(allSearchableTables, query, item => ({
        id: item.id,
        all: [item.label || item.id, item.customer, item.phone]
      }));
    }

    if (activeChannels.includes("delivery")) {
      results.delivery = searchItems(deliveryOrders, query, item => ({
        id: String(item.orderId),
        all: [item.orderNumber, item.customer, item.phone]
      }));
    }

    if (activeChannels.includes("takeAway")) {
      results.takeAway = searchItems(takeAwayOrders, query, item => ({
        id: String(item.orderId),
        all: [item.orderNumber, item.customer, item.phone]
      }));
    }

    if (activeChannels.includes("room")) {
      // Enrich rooms with status and amount
      const enrichedRooms = allRoomsList.map(room => ({
        ...room,
        guest: room.customer || room.guestName || (room.status === 'available' ? 'Available' : ''),
      }));
      results.rooms = searchItems(enrichedRooms, query, item => ({
        id: item.id,
        all: [item.id, item.guestName || item.guest || ""]
      }));
    }

    return results;
  }, [searchQuery, activeChannels, allTablesList, allRoomsList, deliveryOrders, takeAwayOrders, walkInOrders, orderItemsByTableId]);

  const matchingTableIds = useMemo(() => getMatchingIds(searchQuery, searchResults.tables), [searchQuery, searchResults]);
  const matchingRoomIds = useMemo(() => getMatchingIds(searchQuery, searchResults.rooms), [searchQuery, searchResults]);
  const matchingDeliveryIds = useMemo(() => getMatchingIds(searchQuery, searchResults.delivery), [searchQuery, searchResults]);
  const matchingTakeAwayIds = useMemo(() => getMatchingIds(searchQuery, searchResults.takeAway), [searchQuery, searchResults]);

  // Combined matching IDs for unified grid filtering
  const matchingGridIds = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const ids = new Set();
    [matchingTableIds, matchingRoomIds, matchingDeliveryIds, matchingTakeAwayIds].forEach(set => {
      if (set) set.forEach(id => ids.add(id));
    });
    return ids;
  }, [searchQuery, matchingTableIds, matchingRoomIds, matchingDeliveryIds, matchingTakeAwayIds]);

  // --- Handlers ---
  const toggleSnooze = (orderId) => {
    setSnoozedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Resolve order data for any grid entry (table, walk-in, takeaway, delivery)
  const getOrderDataForEntry = useCallback((tableEntry) => {
    if (!tableEntry) return null;

    // Takeaway or delivery virtual entry
    if (tableEntry.orderId) {
      const allOrders = [...takeAwayOrders, ...deliveryOrders, ...walkInOrders];
      const order = allOrders.find(o => o.orderId === tableEntry.orderId);
      if (order) return order;
    }

    // Walk-in virtual entry
    if (tableEntry.isWalkIn && tableEntry.walkInOrderId) {
      const order = walkInOrders.find(o => o.orderId === tableEntry.walkInOrderId);
      if (order) return order;
    }

    // Physical table — orderItemsByTableId is now array-based
    if (tableEntry.tableId) {
      const ordersForTable = orderItemsByTableId[tableEntry.tableId] || [];
      if (ordersForTable.length === 0) return null;
      // If tableEntry has orderId, find the specific order (split support)
      if (tableEntry.orderId) {
        return ordersForTable.find(o => o.orderId === tableEntry.orderId) || ordersForTable[0];
      }
      return ordersForTable[0];
    }

    // BUG-082 (Wave 6): fallback — search ALL orders by orderId.
    // Minimal scan-new-order entries have no orderType, so they don't
    // appear in filtered lists above. Direct lookup ensures Accept/Reject
    // actions work on the popup before full data arrives.
    if (tableEntry.orderId) {
      const match = orders.find(o => o.orderId === tableEntry.orderId);
      if (match) return match;
    }

    return null;
  }, [takeAwayOrders, deliveryOrders, walkInOrders, orderItemsByTableId, orders]);

  // --- Confirm scan order (green tick) ---
  const handleConfirmOrder = useCallback(async (tableEntry) => {
    const order = getOrderDataForEntry(tableEntry);
    if (!order?.orderId) return;

    try {
      // Single API call to confirm order (YTC → next status)
      // Uses dedicated waiter-dinein-order-status-update endpoint
      // order_status comes from profile API def_ord_status (mapped via F_ORDER_STATUS)
      await confirmOrder(order.orderId, permissions?.[0] || 'Manager', defaultOrderStatus);
      // Socket handler will process order-engage + update-order-paid
    } catch (err) {
      console.error('[DashboardPage] Failed to confirm order:', err);
    }
  }, [getOrderDataForEntry, permissions, defaultOrderStatus]);

  // --- Cancel scan order (red cross) → open modal ---
  const handleCancelOrder = useCallback((tableEntry) => {
    setCancelOrderEntry(tableEntry);
  }, []);

  // --- Cancel order confirmed from modal ---
  const handleCancelOrderConfirm = useCallback(async (reason) => {
    if (!cancelOrderEntry) return;

    const order = getOrderDataForEntry(cancelOrderEntry);
    if (!order) return;

    // Await API call, then socket handler does removeOrder + updateTableStatus
    try {
      const payload = orderToAPI.cancelOrder(order.orderId, permissions?.[0] || 'Manager', reason);
      await api.put(API_ENDPOINTS.ORDER_STATUS_UPDATE, payload);
      
      // Wait for socket to confirm removal
      await waitForOrderRemoval(order.orderId, 5000);
    } catch (err) {
      console.error('[CancelOrder] Failed:', err);
    }

    setCancelOrderEntry(null);
  }, [cancelOrderEntry, getOrderDataForEntry, permissions, waitForOrderRemoval]);

  const handleSearchSelect = (selection) => {
    const { type, data } = selection;
    if (type === 'table') {
      if (["occupied", "billReady"].includes(data.status)) {
        const tableData = allTablesList.find(t => t.id === data.id);
        if (tableData) handleTableClick(tableData);
      }
    }
  };

  const handleTableClick = (tableEntry) => {
    // Allow null to clear table selection (used after prepaid payment)
    if (!tableEntry) {
      setOrderEntryTable(null);
      return;
    }
    // Req 2: Order Taking disabled — silent no-op on all card body clicks.
    // Action buttons within cards (Mark Ready/Served, Print, Confirm, Cancel)
    // bypass this handler and continue working.
    if (!orderTakingEnabled) {
      return;
    }
    // Block clicks on engaged tables/orders (update in progress)
    if (isTableEngaged(tableEntry.id) || isOrderEngaged(tableEntry.orderId)) {
      console.log(`[Dashboard] Blocked click on engaged table/order ${tableEntry.id}`);
      return;
    }
    console.log(`[Dashboard] Table click allowed: ${tableEntry.id}, tableEngaged: ${isTableEngaged(tableEntry.id)}, orderEngaged: ${isOrderEngaged(tableEntry.orderId)}`);
    // Step 8: Available room → show CheckIn modal instead of OrderEntry
    if (tableEntry.orderType === 'room' && tableEntry.status === 'available') {
      setCheckInRoom(tableEntry);
      return;
    }
    setOrderEntryTable(tableEntry);
    if (tableEntry.orderType === 'takeAway') {
      setOrderEntryType('takeAway');
    } else if (tableEntry.orderType === 'delivery') {
      setOrderEntryType('delivery');
    } else if (tableEntry.orderType === 'dineIn') {
      setOrderEntryType('dineIn');    // physical table — NOT walkIn
    } else if (tableEntry.orderType === 'room') {
      setOrderEntryType('dineIn');    // occupied rooms use dineIn flow
    } else {
      setOrderEntryType('walkIn');    // actual walk-in orders (wc-* entries)
    }
  };

  const handleAddOrder = () => {
    setOrderEntryTable(null);
    setOrderEntryType("walkIn");
  };

  const handleOrderTypeChange = (newType) => {
    // Walk-In orders don't use physical tables - they create dynamic tables
    // TakeAway and Delivery also don't need physical tables
    if (newType === "walkIn" || newType === "takeAway" || newType === "delivery") {
      setOrderEntryTable(null);
    }
    setOrderEntryType(newType);
  };

  const handleCloseOrderEntry = () => {
    setOrderEntryTable(null);
    setOrderEntryType(null);
    setInitialShowPayment(false);
    setInitialTransferItem(null);
  };

  // CR-008 #4 Phase A / Bucket D1 (May-2026): "Stay on Order Entry After
  // Collect Bill" — when the toggle is ON, OrderEntry calls this instead of
  // onClose() after a successful Collect Bill. Mirrors handleAddOrder's
  // walk-in entry pattern (above) so the existing prop-change reactions
  // inside OrderEntry naturally reset cart, customer, payment panel, etc.
  // No new state-reset logic is introduced inside OrderEntry — we piggyback
  // on the same path that "Add Order" already exercises.
  //
  // CR-008 #4 Phase A fix (May-2026): bumping the `orderEntryResetNonce`
  // forces <OrderEntry/> to remount via its `key` prop, which resets ALL
  // internal useState (showPaymentPanel, split-bill modal, tip, notes,
  // customer, etc.) to their initial values. Prop-change alone is not
  // enough because these are not derived from props.
  const [orderEntryResetNonce, setOrderEntryResetNonce] = useState(0);
  const handleCollectBillStayOnOrder = () => {
    // PROD-HOTFIX (2026-05-27): Clear saved cart for current order context.
    // Walk-in cart key ('walkIn') persists across remount — old items reappear without this.
    const cartKey = orderEntryTable?.id || orderEntryType;
    if (cartKey) setCartsByTable(prev => ({ ...prev, [cartKey]: [] }));
    setOrderEntryTable(null);
    setOrderEntryType('walkIn');
    setInitialShowPayment(false);
    setInitialTransferItem(null);
    setOrderEntryResetNonce(n => n + 1);
  };

  // BUG-029 (Apr-2026): After a prepaid order is successfully settled, clear any
  // stale order-entry selection that points to the now-settled order so the POS
  // returns to a clean dashboard state instead of reopening the old edit screen.
  const handlePrepaidSettleSuccess = useCallback((settledOrderId) => {
    if (!settledOrderId) return;
    const activeOrderId = orderEntryTable?.orderId;
    if (activeOrderId && String(activeOrderId) === String(settledOrderId)) {
      setOrderEntryTable(null);
      setOrderEntryType(null);
      setInitialShowPayment(false);
      setInitialTransferItem(null);
    }
  }, [orderEntryTable]);

  // PROD-BUG-001 (2026-05-20): Auto Settle — when enabled, automatically
  // settle prepaid (non-PayLater) orders at fOrderStatus=5 without requiring
  // a manual Settle click. Uses the same completePrepaidOrder() API as the
  // manual Settle button. In-flight Set prevents duplicate calls across
  // re-renders. PayLater orders are explicitly excluded.
  const autoSettleInFlight = useRef(new Set());
  useEffect(() => {
    let autoSettleOn = false;
    try {
      autoSettleOn = localStorage.getItem('mygenie_auto_settle_enabled') === 'true';
    } catch (_) {}
    if (!autoSettleOn) return;

    const candidates = orders.filter(
      (o) =>
        o.fOrderStatus === 5 &&
        o.paymentType === 'prepaid' &&
        o.paymentMethod?.toLowerCase() !== 'paylater' &&
        !autoSettleInFlight.current.has(o.orderId)
    );

    candidates.forEach((o) => {
      autoSettleInFlight.current.add(o.orderId);
      console.log('[AutoSettle] Settling prepaid order:', o.orderId);
      completePrepaidOrder(
        o.orderId,
        o.serviceTax || 0,
        o.tipAmount || 0,
        false // not PayLater
      )
        .then(() => {
          handlePrepaidSettleSuccess(o.orderId);
        })
        .catch((err) => {
          console.error('[AutoSettle] Failed for order:', o.orderId, err?.message);
        })
        .finally(() => {
          // Remove from in-flight after 10s to allow retry if socket didn't clear
          setTimeout(() => autoSettleInFlight.current.delete(o.orderId), 10000);
        });
    });
  }, [orders, handlePrepaidSettleSuccess]);

  const handleBillClick = (tableEntry) => {
    handleTableClick(tableEntry);
    setInitialShowPayment(true);
  };

  // Handler for food transfer from Order Card - opens Order Entry with transfer modal
  const handleFoodTransfer = (order, item, tableEntry) => {
    // Open Order Entry for this table/order
    handleTableClick(tableEntry);
    // Set the item to trigger transfer modal in OrderEntry
    setInitialTransferItem(item);
  };

  // Handler for marking order as ready
  const handleMarkReady = useCallback(async (tableEntry) => {
    if (!tableEntry?.orderId) return;
    
    try {
      // No local table engage — order-engage socket handles locking
      await updateOrderStatus(tableEntry.orderId, permissions?.[0] || 'Manager', 'ready');
      // Socket handler will release lock via update-order-paid event
    } catch (error) {
      console.error('[handleMarkReady] Error:', error);
    }
  }, [permissions]);

  // Handler for marking order as served
  const handleMarkServed = useCallback(async (tableEntry) => {
    if (!tableEntry?.orderId) return;
    
    try {
      // Check if order is prepaid — use paid-prepaid-order endpoint instead
      const order = getOrderById(tableEntry.orderId);
      // BUG-087: All prepaid orders (including PayLater) use paid-prepaid-order endpoint.
      // Reverses BUG-058 Wave 7 decision per owner directive 2026-05-19.
      // PROD-BUG-002: This path is financial closure ONLY — NO printOrder() call.
      if (order?.paymentType === 'prepaid') {
        console.log('[handleMarkServed] Prepaid order — calling paid-prepaid-order:', tableEntry.orderId);
        await completePrepaidOrder(tableEntry.orderId, order.serviceTax || 0, order.tipAmount || 0, order?.paymentMethod?.toLowerCase() === 'paylater');
        // BUG-029 rework: prepaid Serve path must clear stale dashboard order-entry selection,
        // matching the Settle button path (which already calls handlePrepaidSettleSuccess).
        handlePrepaidSettleSuccess(tableEntry.orderId);
      } else {
        // No local table engage — order-engage socket handles locking
        await updateOrderStatus(tableEntry.orderId, permissions?.[0] || 'Manager', 'serve');
      }
      // Socket handler will release lock via update-order-paid event
    } catch (error) {
      console.error('[handleMarkServed] Error:', error);
    }
  }, [permissions, getOrderById, handlePrepaidSettleSuccess]);

  // Handler for item-level status change (Ready/Serve per item) from OrderCard
  const handleItemStatusChange = useCallback(async (order, item, newStatus) => {
    if (!order?.orderId || !item?.id) return;

    try {
      const payload = {
        order_id: order.orderId,
        order_food_id: item.foodId || item.id,
        item_id: item.id,
        order_status: newStatus,
        cancel_type: null,
      };
      await api.put(API_ENDPOINTS.FOOD_STATUS_UPDATE, payload);
    } catch (err) {
      console.error('[handleItemStatusChange] Failed:', err);
    }
  }, []);

  // Handler for cancel order from OrderCard (opens CancelOrderModal)
  const handleCancelOrderFromCard = useCallback((order) => {
    if (!order) return;
    // Build a tableEntry-like object from the order for CancelOrderModal
    const tableEntry = {
      id: order.tableId ? String(order.tableId) : `order-${order.orderId}`,
      tableId: order.tableId || 0,
      orderId: order.orderId,
      orderType: order.orderType === 'dineIn' ? 'dineIn' : order.orderType,
    };
    setCancelOrderEntry(tableEntry);
  }, []);

  const handleUpdateTableStatus = useCallback((tableStringId, newStatus) => {
    // Update through TableContext — useMemo derivation picks up the change
    updateTableStatus(Number(tableStringId), newStatus);
  }, [updateTableStatus]);

  return (
    <div
      data-testid="pos-home"
      className="flex min-h-screen"
      style={{ backgroundColor: COLORS.sectionBg }}
    >
      <NotificationBanner />
      {/* POS2-002 Phase 4 — Web / Scan & Order YTC visual pop-out.
          Presentation-only attention layer. Subscribes to OrderContext
          via `orders` prop; reuses existing YTC handlers verbatim:
            • Accept  → handleConfirmOrder (existing YTC accept flow)
            • Reject  → handleCancelOrderFromCard (opens existing
                       <CancelOrderModal />)
            • Snooze  → toggleSnooze (existing in-memory Set) PLUS a
                       pop-out-local 5-min hide-set (R-SNOOZE-9)
            • View    → handleTableClick (existing OrderEntry open)
          No new endpoints. No audio. No socket/contract change. */}
      <ScanOrderPopOut
        orders={orders}
        snoozedOrders={snoozedOrders}
        onToggleSnooze={toggleSnooze}
        onAccept={handleConfirmOrder}
        onReject={handleCancelOrderFromCard}
        onEdit={handleTableClick}
        currencySymbol={currencySymbol}
        suppressed={Boolean(orderEntryType) || Boolean(cancelOrderEntry)}
      />
      <Sidebar
        isExpanded={sidebarExpanded}
        setIsExpanded={setSidebarExpanded}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenMenu={() => setIsMenuOpen(true)}
        onOpenCredit={() => setIsCreditOpen(true)}
        onOpenSettlement={() => setIsSettlementOpen(true)}
        onRefresh={handleRefreshAll}
        isRefreshing={isRefreshing}
        isOrderEntryOpen={orderEntryType !== null}
        // VIEW_MODE_LOCK v2 (Task 1 revision, Steps 1 & 4): pass runtime
        // view state PLUS lock flags. Sidebar shows each toggle by default
        // and hides it only when the corresponding axis is locked by the
        // admin (StatusConfigPage).
        activeView={activeView}
        setActiveView={setActiveView}
        dashboardView={dashboardView}
        setDashboardView={setDashboardView}
        lockTableOrder={lockTableOrder}
        lockChannelStatus={lockChannelStatus}
      />

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        sidebarWidth={sidebarExpanded ? 280 : 70}
      />

      <MenuManagementPanel
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        sidebarWidth={sidebarExpanded ? 280 : 70}
      />

      <CreditManagementPanel
        isOpen={isCreditOpen}
        onClose={() => setIsCreditOpen(false)}
        sidebarWidth={sidebarExpanded ? 280 : 70}
      />

      <SettlementPanel
        isOpen={isSettlementOpen}
        onClose={() => setIsSettlementOpen(false)}
        sidebarWidth={sidebarExpanded ? 280 : 70}
      />

      <div className={`flex-1 flex flex-col min-h-screen overflow-hidden relative${!orderTakingEnabled ? ' order-taking-disabled' : ''}`}>
        {/* Refresh overlay — dims content while refreshing */}
        {isRefreshing && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
            style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}>
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin" style={{ color: COLORS.primaryOrange }} />
              <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>Refreshing data...</span>
            </div>
          </div>
        )}
        <Header
          isOnline={isOnline}
          activeChannels={activeChannels}
          setActiveChannels={setActiveChannels}
          activeStatuses={activeStatuses}
          setActiveStatuses={setActiveStatuses}
          tableFilter={tableFilter}
          setTableFilter={setTableFilter}
          activeView={activeView}
          setActiveView={setActiveView}
          dashboardView={dashboardView}
          setDashboardView={setDashboardView}
          hiddenChannels={hiddenChannels}
          hiddenStatuses={hiddenStatuses}
          enabledStatuses={enabledStatuses}
          onRestoreHidden={() => {
            setHiddenChannels([]);
            setHiddenStatuses([]);
          }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          onSearchSelect={handleSearchSelect}
          onAddOrder={handleAddOrder}
          platform={platform}
          setPlatform={setPlatform}
          webCount={platformCounts.web}
          posCount={platformCounts.pos}
        />

        <main className="flex-1 p-2 overflow-auto flex">
            {/* === Station View Panel (if enabled in settings) === */}
            <StationPanel className="flex-shrink-0" />

            {/* === Main Dashboard Content === */}
            <div className="flex-1 overflow-auto">
            {/* === NEW: Channel/Status-Based Layout (Feature Flags) === */}
            {USE_CHANNEL_LAYOUT && channelData && (
              <ChannelColumnsLayout
                channels={
                  dashboardView === 'status' && statusData
                    ? Object.values(statusData).filter(c => c.items?.length > 0 && !hiddenStatuses.includes(c.id))
                    : Object.values(channelData).filter(c => {
                        // Must be enabled by API features
                        if (!c.enabled) return false;
                        // Must not be manually hidden via column hide action
                        if (hiddenChannels.includes(c.id)) return false;
                        // Apply channel visibility override from settings
                        if (channelVisibility.enabled && !channelVisibility.channels.includes(c.id)) return false;
                        return true;
                      })
                }
                viewType={activeView === 'table' ? 'table' : 'order'}
                groupingMode={dashboardView}
                onItemClick={handleTableClick}
                onMarkReady={handleMarkReady}
                onMarkServed={handleMarkServed}
                onBillClick={handleBillClick}
                onCancelOrder={handleCancelOrderFromCard}
                onItemStatusChange={handleItemStatusChange}
                onToggleSnooze={toggleSnooze}
                onConfirmOrder={handleConfirmOrder}
                onUpdateStatus={handleUpdateTableStatus}
                onFoodTransfer={handleFoodTransfer}
                hasPermission={hasPermission}
                snoozedOrders={snoozedOrders}
                currencySymbol={currencySymbol}
                isTableEngaged={isTableEngaged}
                isOrderEngaged={isOrderEngaged}
                searchQuery={searchQuery}
                matchingIds={matchingTableIds}
                onHideColumn={(columnId) => {
                  // Hide column AND corresponding filter based on current view
                  if (dashboardView === 'status') {
                    setHiddenStatuses(prev => [...prev, columnId]);
                  } else {
                    setHiddenChannels(prev => [...prev, columnId]);
                  }
                }}
              />
            )}

            {/* === OLD: Area-Based Layout (when feature flag is off) === */}
            {!USE_CHANNEL_LAYOUT && (
              <>
            {/* Grid View - Unified for all channels */}
            {showGridView && (
              // BUG-070 (Wave 5, May-2026): drop the `isDineInOnly &&` gate so
              // table sections render whenever `hasAreas`, regardless of which
              // channels are active (Cx1 owner directive 2026-05-17).
              hasAreas ? (
                <>
                <div className="flex gap-8 overflow-x-auto">
                  {Object.entries(tables).map(([key, section], index) => (
                    <div key={key} className="contents">
                      {index > 0 && (
                        <div className="w-px self-stretch" style={{ backgroundColor: COLORS.borderGray }} />
                      )}
                      <TableSection
                        section={section}
                        onTableClick={handleTableClick}
                        onOpenModal={handleTableClick}
                        onUpdateStatus={handleUpdateTableStatus}
                        onBillClick={handleBillClick}
                        onConfirmOrder={handleConfirmOrder}
                        onCancelOrder={handleCancelOrder}
                        searchQuery={searchQuery}
                        matchingTableIds={matchingTableIds}
                        snoozedOrders={snoozedOrders}
                        onToggleSnooze={toggleSnooze}
                        currencySymbol={currencySymbol}
                        activeStatuses={activeStatuses}
                        tableFilter={tableFilter}
                      />
                    </div>
                  ))}
                </div>
                {/* BUG-070 (Wave 5, May-2026): sectioned rooms render block.
                    Renders below the sectioned tables block when at least one
                    room has a `sectionName`. Rooms without `sectionName` are
                    bucketed into `__no_section__` and render at top with NO
                    header (Q4 — enforced by TableSection conditional). */}
                {roomsBySection.length > 0 && (
                  <div className="mt-6 flex gap-8 overflow-x-auto">
                    {roomsBySection.map((section, index) => (
                      <div key={section.key} className="contents">
                        {index > 0 && (
                          <div className="w-px self-stretch" style={{ backgroundColor: COLORS.borderGray }} />
                        )}
                        <TableSection
                          section={section}
                          onTableClick={handleTableClick}
                          onOpenModal={handleTableClick}
                          onUpdateStatus={handleUpdateTableStatus}
                          onBillClick={handleBillClick}
                          onConfirmOrder={handleConfirmOrder}
                          onCancelOrder={handleCancelOrder}
                          searchQuery={searchQuery}
                          matchingTableIds={matchingTableIds}
                          snoozedOrders={snoozedOrders}
                          onToggleSnooze={toggleSnooze}
                          currencySymbol={currencySymbol}
                          activeStatuses={activeStatuses}
                          tableFilter={tableFilter}
                        />
                      </div>
                    ))}
                  </div>
                )}
                </>
              ) : filteredGridItems.length > 0 ? (
                <div>
                  <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: COLORS.grayText }}>
                    <span className="font-medium" style={{ color: COLORS.darkText }}>{gridTitle}</span>
                    <span style={{ color: COLORS.borderGray }}>|</span>
                    <span>{filteredGridItems.filter(t => matchingGridIds === null || matchingGridIds.has(t.id)).length} Items</span>
                  </div>
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, 160px)' }}>
                    {sortByActiveFirst(
                      filteredGridItems.filter(t => matchingGridIds === null || matchingGridIds.has(t.id)),
                      TABLE_STATUS_PRIORITY
                    ).map((item) => (
                      <TableCard
                        key={item.id}
                        table={item}
                        onClick={handleTableClick}
                        onOpenModal={handleTableClick}
                        onUpdateStatus={handleUpdateTableStatus}
                        onBillClick={handleBillClick}
                        onConfirmOrder={handleConfirmOrder}
                        onCancelOrder={handleCancelOrder}
                        onMarkReady={handleMarkReady}
                        onMarkServed={handleMarkServed}
                        isSnoozed={snoozedOrders?.has(item.id)}
                        onToggleSnooze={toggleSnooze}
                        currencySymbol={currencySymbol}
                        isEngaged={isOrderEngaged(item.orderId) || isTableEngaged(item.tableId)}
                        orderItems={(orderItemsByTableId[item.tableId] || []).find(o => o.orderId === item.orderId) || null}
                        onPostSettleSuccess={handlePrepaidSettleSuccess}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyTableState />
              )
            )}

            {/* List View - All orders in a single unified grid */}
            {showListView && (
              <div>
                <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: COLORS.grayText }}>
                  <span className="font-medium" style={{ color: COLORS.darkText }}>All Orders</span>
                  <span style={{ color: COLORS.borderGray }}>|</span>
                  <span>
                    {(() => {
                      let count = 0;
                      if (activeChannels.includes("dineIn")) {
                        count += allTablesList.filter(t => !["available", "reserved"].includes(t.status)).length;
                      }
                      if (activeChannels.includes("delivery")) count += deliveryOrders.length;
                      if (activeChannels.includes("takeAway")) count += takeAwayOrders.length;
                      return `${count} Orders`;
                    })()}
                  </span>
                </div>
                <div style={{ columnCount: 4, columnGap: '8px' }}>
                  {/* Dine In Orders */}
                  {activeChannels.includes("dineIn") && allTablesList
                    .filter(t => !["available", "reserved"].includes(t.status))
                    .filter(t => matchingTableIds === null || matchingTableIds.has(t.id))
                    .map((table) => {
                      const order = table.isWalkIn
                        ? walkInOrders.find(o => o.orderId === table.walkInOrderId)
                        : (table.orderId ? dineInOrders.find(o => o.orderId === table.orderId) : null);
                      if (!order) return null;
                      return (
                        <OrderCard
                          key={table.id}
                          order={order}
                          orderType="dineIn"
                          tableLabel={table.label}
                          isSnoozed={snoozedOrders.has(table.id)}
                          isEngaged={isOrderEngaged(order.orderId) || isTableEngaged(table.tableId)}
                          canCancelOrder={hasPermission('order_cancel')}
                          canMergeOrder={hasPermission('merge_table')}
                          canShiftTable={hasPermission('transfer_table')}
                          canFoodTransfer={hasPermission('food_transfer')}
                          canPrintBill={hasPermission('print_icon')}
                          canBill={hasPermission('bill')}
                          onToggleSnooze={toggleSnooze}
                          onEdit={() => handleTableClick(table)}
                          onMarkReady={() => handleMarkReady({ ...table, orderId: order.orderId, tableId: table.tableId || 0 })}
                          onMarkServed={() => handleMarkServed({ ...table, orderId: order.orderId, tableId: table.tableId || 0 })}
                          onBillClick={() => handleBillClick(table)}
                          onCancelOrder={handleCancelOrderFromCard}
                          onItemStatusChange={handleItemStatusChange}
                          onMergeOrder={(o) => console.log('[OrderCard] Merge order:', o.orderId)}
                          onTableShift={(o) => console.log('[OrderCard] Shift table:', o.orderId)}
                          onFoodTransfer={(o, item) => handleFoodTransfer(o, item, table)}
                          onPostSettleSuccess={handlePrepaidSettleSuccess}
                        />
                      );
                    })
                  }
                  
                  {/* Delivery Orders */}
                  {activeChannels.includes("delivery") && deliveryOrders
                    .filter(order => matchingDeliveryIds === null || matchingDeliveryIds.has(String(order.orderId)))
                    .map((order) => (
                      <OrderCard
                        key={`del-${order.orderId}`}
                        order={order}
                        orderType="delivery"
                        isSnoozed={snoozedOrders.has(String(order.orderId))}
                        isEngaged={isOrderEngaged(order.orderId)}
                        canCancelOrder={hasPermission('order_cancel')}
                        canMergeOrder={false}
                        canShiftTable={false}
                        canFoodTransfer={false}
                        canPrintBill={hasPermission('print_icon')}
                        canBill={hasPermission('bill')}
                        onToggleSnooze={toggleSnooze}
                        onEdit={() => handleTableClick({ id: `del-${order.orderId}`, orderId: order.orderId, orderType: 'delivery' })}
                        onMarkReady={() => handleMarkReady({ orderId: order.orderId, tableId: 0 })}
                        onMarkServed={() => handleMarkServed({ orderId: order.orderId, tableId: 0 })}
                        onBillClick={() => handleBillClick({ id: `del-${order.orderId}`, orderId: order.orderId, orderType: 'delivery' })}
                        onCancelOrder={handleCancelOrderFromCard}
                        onItemStatusChange={handleItemStatusChange}
                        onPostSettleSuccess={handlePrepaidSettleSuccess}
                      />
                    ))
                  }
                  
                  {/* TakeAway Orders */}
                  {activeChannels.includes("takeAway") && takeAwayOrders
                    .filter(order => matchingTakeAwayIds === null || matchingTakeAwayIds.has(String(order.orderId)))
                    .map((order) => (
                      <OrderCard
                        key={`ta-${order.orderId}`}
                        order={order}
                        orderType="takeAway"
                        isSnoozed={snoozedOrders.has(String(order.orderId))}
                        isEngaged={isOrderEngaged(order.orderId)}
                        canCancelOrder={hasPermission('order_cancel')}
                        canMergeOrder={false}
                        canShiftTable={false}
                        canFoodTransfer={false}
                        canPrintBill={hasPermission('print_icon')}
                        canBill={hasPermission('bill')}
                        onToggleSnooze={toggleSnooze}
                        onEdit={() => handleTableClick({ id: `ta-${order.orderId}`, orderId: order.orderId, orderType: 'takeAway' })}
                        onMarkReady={() => handleMarkReady({ orderId: order.orderId, tableId: 0 })}
                        onMarkServed={() => handleMarkServed({ orderId: order.orderId, tableId: 0 })}
                        onBillClick={() => handleBillClick({ id: `ta-${order.orderId}`, orderId: order.orderId, orderType: 'takeAway' })}
                        onCancelOrder={handleCancelOrderFromCard}
                        onItemStatusChange={handleItemStatusChange}
                        onPostSettleSuccess={handlePrepaidSettleSuccess}
                      />
                    ))
                  }
                </div>
              </div>
            )}

            {/* Room View - Rooms now render in the unified grid above */}
              </>
            )}
            </div>
        </main>

        {orderEntryType && (
          <OrderEntry
            key={orderEntryResetNonce}
            table={orderEntryTable}
            onClose={handleCloseOrderEntry}
            orderData={orderEntryTable ? getOrderDataForEntry(orderEntryTable) : null}
            orderType={orderEntryType}
            onOrderTypeChange={handleOrderTypeChange}
            allTables={allTablesList}
            onSelectTable={handleTableClick}
            savedCart={cartsByTable[orderEntryTable?.id || orderEntryType] || []}
            onCartChange={(key, items) => setCartsByTable(prev => ({ ...prev, [key]: items }))}
            initialShowPayment={initialShowPayment}
            initialTransferItem={initialTransferItem}
            onCollectBillStayOnOrder={handleCollectBillStayOnOrder}
          />
        )}

        {/* Room Check-In Panel (Phase 2A — Step 8) */}
        {checkInRoom && (
          <RoomCheckInModal
            room={checkInRoom}
            availableRooms={allRoomsList.filter(r => r.status === 'available')}
            onClose={() => setCheckInRoom(null)}
            onSuccess={() => setCheckInRoom(null)}
            sidebarWidth={sidebarExpanded ? 280 : 70}
          />
        )}

        {/* Cancel Order Modal — for yetToConfirm scan orders */}
        {cancelOrderEntry && (
          <CancelOrderModal
            table={cancelOrderEntry}
            itemCount={(() => {
              const order = getOrderDataForEntry(cancelOrderEntry);
              return order?.items?.filter(i => i.status !== 'cancelled').length || 0;
            })()}
            reasons={getOrderCancellationReasons()}
            onClose={() => setCancelOrderEntry(null)}
            onCancel={handleCancelOrderConfirm}
          />
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
