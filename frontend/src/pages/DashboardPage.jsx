import { useState, useMemo, useCallback, useEffect } from "react";
import { COLORS, CONFIG } from "../constants";
import { Sidebar, Header } from "../components/layout";
import { TableSection, RoomSection } from "../components/sections";
import { DineInCard, DeliveryCard } from "../components/cards";
import TableCard from "../components/cards/TableCard";
import { OrderEntry } from "../components/order-entry";
import { sortByActiveFirst, TABLE_STATUS_PRIORITY } from "../utils";
import { TableOrderProvider } from "../context/TableOrderContext";
import { SettingsPanel } from "../components/settings";
import { MenuManagementPanel } from "../components/menu";
import { useInitialData } from "../context/InitialDataContext";

// Helper: search a list of items by id, customer/guest, and phone fields
const searchItems = (items, query, getFields) => {
  const exact = [];
  const partial = [];
  items.forEach(item => {
    const fields = getFields(item);
    const idMatch = fields.id.toLowerCase();
    if (idMatch === query) {
      exact.push(item);
    } else if (fields.all.some(f => f.toLowerCase().includes(query))) {
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

// Reusable order list section (Delivery/TakeAway)
const OrderListSection = ({ title, orders, matchingIds, snoozedOrders, onToggleSnooze, className }) => (
  <div className={className}>
    <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: COLORS.grayText }}>
      <span className="font-medium" style={{ color: COLORS.darkText }}>{title}</span>
      <span style={{ color: COLORS.borderGray }}>|</span>
      <span>{matchingIds === null ? orders.length : matchingIds.size} Orders</span>
    </div>
    <div className="grid grid-cols-3 gap-4">
      {orders
        .filter(order => matchingIds === null || matchingIds.has(order.id))
        .map((order) => (
          <DeliveryCard
            key={order.id}
            order={order}
            isSnoozed={snoozedOrders.has(order.id)}
            onToggleSnooze={onToggleSnooze}
          />
        ))}
    </div>
  </div>
);

// Dashboard Loading Component
const DashboardLoading = ({ progress, currentStep, error, retryCount, maxRetries, loadingStats }) => {
  // Get detailed message for current step
  const getStepMessage = () => {
    if (!currentStep) return 'Preparing...';
    
    const stats = loadingStats || {};
    switch (currentStep) {
      case 'tables':
        const t = stats.tables?.loaded || 0;
        const r = stats.rooms?.loaded || 0;
        return t > 0 || r > 0 ? `${t} Tables, ${r} Rooms loaded` : 'Loading tables...';
      case 'categories':
        const c = stats.categories?.loaded || 0;
        return c > 0 ? `${c} Categories loaded` : 'Loading categories...';
      case 'products':
        const p = stats.products?.loaded || 0;
        return p > 0 ? `${p} Menu items loaded` : 'Loading menu items...';
      case 'settings':
        const s = stats.cancellationReasons?.loaded || 0;
        return s > 0 ? `${s} Settings loaded` : 'Loading settings...';
      default:
        return `${currentStep.charAt(0).toUpperCase() + currentStep.slice(1)}...`;
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen" style={{ backgroundColor: COLORS.sectionBg }}>
      <div className="text-center p-8 rounded-2xl shadow-lg" style={{ backgroundColor: COLORS.lightBg, minWidth: '400px' }}>
        {error ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: COLORS.darkText }}>
              {retryCount < maxRetries ? 'Connection Issue' : 'Failed to Load'}
            </h2>
            <p className="text-sm mb-4" style={{ color: COLORS.grayText }}>{error}</p>
            {retryCount < maxRetries && (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: COLORS.primaryGreen, borderTopColor: 'transparent' }}></div>
                <span className="text-sm" style={{ color: COLORS.primaryGreen }}>
                  Retrying... (Attempt {retryCount + 1}/{maxRetries})
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8F5E9' }}>
              <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: COLORS.primaryGreen, borderTopColor: 'transparent', borderWidth: '3px' }}></div>
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: COLORS.darkText }}>Loading Dashboard</h2>
            <p className="text-sm mb-4" style={{ color: COLORS.grayText }}>
              {getStepMessage()}
            </p>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: COLORS.borderGray }}>
              <div 
                className="h-full transition-all duration-300 rounded-full" 
                style={{ backgroundColor: COLORS.primaryGreen, width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs mt-2" style={{ color: COLORS.grayText }}>{progress}% complete</p>
          </>
        )}
      </div>
    </div>
  );
};

// Main Home/Dashboard Component
const DashboardPage = () => {
  // Initial data from context (preloaded after login)
  const { 
    tables: apiTables, 
    rooms: apiRooms, 
    isDataLoaded,
    isInitialLoading,
    loadingProgress,
    currentStep,
    loadingError,
    retryCount,
    maxRetries,
    loadingStats,
    deliveryOrders: apiDeliveryOrders,
    takeAwayOrders: apiTakeAwayOrders,
    dineInOrders: apiDineInOrders
  } = useInitialData();
  
  // --- State ---
  const [tables, setTables] = useState({});
  const [flatTables, setFlatTables] = useState([]);
  const [rooms, setRooms] = useState({});
  const [isOnline] = useState(true);
  const [activeChannels, setActiveChannels] = useState(CONFIG.DEFAULT_CHANNELS);
  const [activeStatuses, setActiveStatuses] = useState(CONFIG.DEFAULT_STATUSES);
  const [activeView, setActiveView] = useState("table");
  const [activeFirst, setActiveFirst] = useState(true);
  const [orderEntryTable, setOrderEntryTable] = useState(null);
  const [orderEntryType, setOrderEntryType] = useState(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSilentMode, setIsSilentMode] = useState(false);
  const [snoozedOrders, setSnoozedOrders] = useState(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuManagementOpen, setMenuManagementOpen] = useState(false);

  // Transform API data to frontend format
  const transformTableData = useCallback((tableList, roomList, dineInOrdersList) => {
    // Create a map of tableId -> orders for quick lookup
    const ordersByTableId = {};
    (dineInOrdersList || []).forEach(order => {
      if (order.tableId) {
        if (!ordersByTableId[order.tableId]) {
          ordersByTableId[order.tableId] = [];
        }
        ordersByTableId[order.tableId].push(order);
      }
    });

    // Transform to frontend format and group by section (title)
    const transformTable = (item) => {
      const tableOrders = ordersByTableId[item.id] || [];
      const hasOrders = tableOrders.length > 0;
      const latestOrder = tableOrders[0]; // Most recent order
      
      return {
        id: `T${item.table_no}`,
        tableId: item.id,
        tableNo: item.table_no,
        status: item.engage === 'Yes' ? 'active' : 'available',
        waiterId: item.waiter_id,
        section: item.title || 'Main',
        // Populate from order if available
        customer: latestOrder?.customer || '',
        waiter: latestOrder?.waiterName || '',
        items: latestOrder?.items || [],
        amount: latestOrder?.amount || 0,
        time: latestOrder?.time || '',
        // Order data
        orders: tableOrders,
        orderCount: tableOrders.length,
        hasOrders: hasOrders,
        latestOrder: latestOrder,
        paymentStatus: latestOrder?.paymentStatus || '',
        orderStatus: latestOrder?.status || '',
      };
    };
    
    const transformRoom = (item) => ({
      id: `R${item.table_no}`,
      roomId: item.id,
      roomNo: item.table_no,
      status: item.engage === 'Yes' ? 'active' : 'available',
      waiterId: item.waiter_id,
      section: item.title || 'Main',
      guest: '',
      items: [],
      amount: 0,
      time: '',
    });
    
    // Group tables by section (title)
    const tablesBySection = {};
    tableList.forEach(item => {
      const section = item.title || 'Main';
      if (!tablesBySection[section]) {
        tablesBySection[section] = { name: section, tables: [] };
      }
      tablesBySection[section].tables.push(transformTable(item));
    });
    
    // Group rooms by section
    const roomsBySection = {};
    roomList.forEach(item => {
      const section = item.title || 'Main';
      if (!roomsBySection[section]) {
        roomsBySection[section] = { name: section, rooms: [] };
      }
      roomsBySection[section].rooms.push(transformRoom(item));
    });
    
    // Set state
    if (Object.keys(tablesBySection).length > 0) {
      setTables(tablesBySection);
      setFlatTables([]);
    } else {
      setTables({});
      setFlatTables(tableList.map(transformTable));
    }
    
    setRooms(roomsBySection);
  }, []);

  // Use preloaded data from context ONLY (no fallback API calls)
  useEffect(() => {
    if (isDataLoaded && apiTables.length > 0) {
      transformTableData(apiTables, apiRooms, apiDineInOrders);
    }
  }, [isDataLoaded, apiTables, apiRooms, apiDineInOrders, transformTableData]);

  // --- Derived values ---
  const hasAreas = Object.keys(tables).length > 0;

  const allTablesList = useMemo(() => {
    return hasAreas ? Object.values(tables).flatMap(s => s.tables) : flatTables;
  }, [tables, flatTables, hasAreas]);

  const allRoomsList = useMemo(() => {
    return Object.values(rooms).flatMap(s => s.rooms);
  }, [rooms]);

  // Dine In view logic
  const isDineInOnly = activeChannels.length === 1 && activeChannels[0] === "dineIn";
  const hasDineIn = activeChannels.includes("dineIn");
  const showDineInAsTable = isDineInOnly && activeView === "table";
  const showDineInAsOrder = hasDineIn && (isDineInOnly ? activeView === "order" : true);

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
      const enriched = allTablesList.map(table => {
        return {
          ...table,
          customer: table.customer || "",
          reservedFor: table.reservedFor || "",
          phone: table.phone || ""
        };
      });
      results.tables = searchItems(enriched, query, item => ({
        id: item.id,
        all: [item.id, item.customer, item.reservedFor, item.phone]
      }));
    }

    if (activeChannels.includes("delivery")) {
      results.delivery = searchItems(apiDeliveryOrders, query, item => ({
        id: item.orderId || item.id,
        all: [item.orderId || item.id, item.customer, item.phone]
      }));
    }

    if (activeChannels.includes("takeAway")) {
      results.takeAway = searchItems(apiTakeAwayOrders, query, item => ({
        id: item.orderId || item.id,
        all: [item.orderId || item.id, item.customer, item.phone]
      }));
    }

    if (activeChannels.includes("room")) {
      results.rooms = searchItems(allRoomsList, query, item => ({
        id: item.id,
        all: [item.id, item.guestName || ""]
      }));
    }

    return results;
  }, [searchQuery, activeChannels, allTablesList, allRoomsList, apiDeliveryOrders, apiTakeAwayOrders]);

  const matchingTableIds = useMemo(() => getMatchingIds(searchQuery, searchResults.tables), [searchQuery, searchResults]);
  const matchingRoomIds = useMemo(() => getMatchingIds(searchQuery, searchResults.rooms), [searchQuery, searchResults]);
  const matchingDeliveryIds = useMemo(() => getMatchingIds(searchQuery, searchResults.delivery), [searchQuery, searchResults]);
  const matchingTakeAwayIds = useMemo(() => getMatchingIds(searchQuery, searchResults.takeAway), [searchQuery, searchResults]);

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

  const handleSearchSelect = (selection) => {
    const { type, data } = selection;
    if (type === 'table') {
      if (["occupied", "billReady"].includes(data.status)) {
        const tableData = allTablesList.find(t => t.id === data.id);
        if (tableData) handleTableClick(tableData);
      }
    }
  };

  const handleTableClick = (table) => {
    setOrderEntryTable(table);
    setOrderEntryType("walkIn");
  };

  const handleAddOrder = () => {
    setOrderEntryTable(null);
    // Map active dashboard tab to order type
    if (activeChannels.length === 1 && activeChannels[0] === "delivery") {
      setOrderEntryType("delivery");
    } else if (activeChannels.length === 1 && activeChannels[0] === "takeAway") {
      setOrderEntryType("takeAway");
    } else {
      // dineIn, all, or mixed → default to walkIn
      setOrderEntryType("walkIn");
    }
  };

  const handleOrderTypeChange = (newType) => {
    if (newType === "walkIn" && !orderEntryTable) {
      const firstAvailable = allTablesList.find(t => t.status === "available");
      if (firstAvailable) setOrderEntryTable(firstAvailable);
    } else if (newType !== "walkIn") {
      setOrderEntryTable(null);
    }
    setOrderEntryType(newType);
  };

  const handleCloseOrderEntry = () => {
    setOrderEntryTable(null);
    setOrderEntryType(null);
  };

  const handleUpdateTableStatus = useCallback((tableId, newStatus) => {
    if (hasAreas) {
      setTables(prev => Object.fromEntries(
        Object.entries(prev).map(([key, section]) => [key, {
          ...section,
          tables: section.tables.map(t => t.id === tableId ? { ...t, status: newStatus } : t),
        }])
      ));
    } else {
      setFlatTables(prev => prev.map(t => t.id === tableId ? { ...t, status: newStatus } : t));
    }
  }, [hasAreas]);

  // Show loading state if data not loaded
  if (!isDataLoaded || isInitialLoading) {
    return (
      <DashboardLoading 
        progress={loadingProgress}
        currentStep={currentStep}
        error={loadingError}
        retryCount={retryCount}
        maxRetries={maxRetries}
        loadingStats={loadingStats}
      />
    );
  }

  return (
    <TableOrderProvider onUpdateTableStatus={handleUpdateTableStatus}>
    <div
      data-testid="pos-home"
      className="flex min-h-screen"
      style={{ backgroundColor: COLORS.sectionBg }}
    >
      <Sidebar
        isExpanded={sidebarExpanded}
        setIsExpanded={setSidebarExpanded}
        isSilentMode={isSilentMode}
        setIsSilentMode={setIsSilentMode}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        menuManagementOpen={menuManagementOpen}
        setMenuManagementOpen={setMenuManagementOpen}
      />

      {/* Settings Panel - Full Page */}
      {settingsOpen ? (
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden p-6">
          <SettingsPanel onClose={() => setSettingsOpen(false)} />
        </div>
      ) : menuManagementOpen ? (
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden p-6">
          <MenuManagementPanel onClose={() => setMenuManagementOpen(false)} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Header
          isOnline={isOnline}
          activeChannels={activeChannels}
          setActiveChannels={setActiveChannels}
          activeStatuses={activeStatuses}
          setActiveStatuses={setActiveStatuses}
          activeView={activeView}
          setActiveView={setActiveView}
          activeFirst={activeFirst}
          setActiveFirst={setActiveFirst}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          onSearchSelect={handleSearchSelect}
          onAddOrder={handleAddOrder}
        />

        <main className="flex-1 p-6 overflow-auto">
          <div
            data-testid="content-container"
            className="rounded-2xl shadow-sm p-6"
            style={{ backgroundColor: COLORS.lightBg }}
          >
            {/* Dine In - Table View */}
            {showDineInAsTable && (
              hasAreas ? (
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
                        activeFirst={activeFirst}
                        searchQuery={searchQuery}
                        matchingTableIds={matchingTableIds}
                        snoozedOrders={snoozedOrders}
                        onToggleSnooze={toggleSnooze}
                      />
                    </div>
                  ))}
                </div>
              ) : flatTables.length > 0 ? (
                <div>
                  <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: COLORS.grayText }}>
                    <span className="font-medium" style={{ color: COLORS.darkText }}>All Tables</span>
                    <span style={{ color: COLORS.borderGray }}>|</span>
                    <span>{matchingTableIds === null ? flatTables.length : matchingTableIds.size} Tables</span>
                  </div>
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, 160px)' }}>
                    {sortByActiveFirst(
                      flatTables.filter(t => matchingTableIds === null || matchingTableIds.has(t.id)),
                      TABLE_STATUS_PRIORITY,
                      activeFirst
                    ).map((table) => (
                      <TableCard
                        key={table.id}
                        table={table}
                        onClick={handleTableClick}
                        onOpenModal={handleTableClick}
                        onUpdateStatus={handleUpdateTableStatus}
                        isSnoozed={snoozedOrders?.has(table.id)}
                        onToggleSnooze={toggleSnooze}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyTableState />
              )
            )}

            {/* Dine In - Order View (tiles) */}
            {showDineInAsOrder && (
              <div>
                <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: COLORS.grayText }}>
                  <span className="font-medium" style={{ color: COLORS.darkText }}>Dine In Orders</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {allTablesList
                    .filter(t => !["available", "reserved"].includes(t.status))
                    .filter(t => matchingTableIds === null || matchingTableIds.has(t.id))
                    .map((table) => (
                      <DineInCard
                        key={table.id}
                        table={table}
                        onEdit={handleTableClick}
                        isSnoozed={snoozedOrders.has(table.id)}
                        onToggleSnooze={toggleSnooze}
                      />
                    ))
                  }
                </div>
              </div>
            )}

            {/* Delivery View */}
            {activeChannels.includes("delivery") && (
              <OrderListSection
                title="Delivery Orders"
                orders={apiDeliveryOrders}
                matchingIds={matchingDeliveryIds}
                snoozedOrders={snoozedOrders}
                onToggleSnooze={toggleSnooze}
                className={hasDineIn ? "mt-6 pt-6 border-t" : ""}
              />
            )}

            {/* TakeAway View */}
            {activeChannels.includes("takeAway") && (
              <OrderListSection
                title="TakeAway Orders"
                orders={apiTakeAwayOrders}
                matchingIds={matchingTakeAwayIds}
                snoozedOrders={snoozedOrders}
                onToggleSnooze={toggleSnooze}
                className={hasDineIn || activeChannels.includes("delivery") ? "mt-6 pt-6 border-t" : ""}
              />
            )}

            {/* Room View (dynamic) */}
            {activeChannels.includes("room") && (
              <div className="flex gap-8 overflow-x-auto">
                {Object.entries(rooms).map(([key, section], index) => (
                  <div key={key} className="contents">
                    {index > 0 && (
                      <div className="w-px self-stretch" style={{ backgroundColor: COLORS.borderGray }} />
                    )}
                    <RoomSection
                      section={section}
                      onRoomClick={() => {/* TODO: room click handler */}}
                      activeFirst={activeFirst}
                      searchQuery={searchQuery}
                      matchingRoomIds={matchingRoomIds}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {orderEntryType && (
          <OrderEntry
            table={orderEntryTable}
            onClose={handleCloseOrderEntry}
            orderType={orderEntryType}
            onOrderTypeChange={handleOrderTypeChange}
            allTables={allTablesList}
            onSelectTable={handleTableClick}
            onResetForNewOrder={() => { setOrderEntryTable(null); setOrderEntryType("walkIn"); }}
          />
        )}
      </div>
      )}
    </div>
    </TableOrderProvider>
  );
};

export default DashboardPage;
