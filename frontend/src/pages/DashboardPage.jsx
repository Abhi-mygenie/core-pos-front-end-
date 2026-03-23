import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { COLORS } from "../constants";
import { mockRooms } from "../data";
import { Sidebar, Header } from "../components/layout";
import { TableSection, RoomSection } from "../components/sections";
import { DineInCard, DeliveryCard } from "../components/cards";
import TableCard from "../components/cards/TableCard";
import { OrderEntry } from "../components/order-entry";
import { sortByActiveFirst, TABLE_STATUS_PRIORITY } from "../utils";
import { useRestaurant, useTables, useOrders } from "../contexts";
import * as authService from "../api/services/authService";
import SettingsPanel from "../components/panels/SettingsPanel";
import MenuManagementPanel from "../components/panels/MenuManagementPanel";

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
    {orders.length > 0 ? (
      <div className="grid grid-cols-3 gap-4">
        {orders
          .filter(order => matchingIds === null || matchingIds.has(String(order.orderId)))
          .map((order) => (
            <DeliveryCard
              key={order.orderId}
              order={order}
              isSnoozed={snoozedOrders.has(String(order.orderId))}
              onToggleSnooze={onToggleSnooze}
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
  const { isLoaded: restaurantLoaded, currencySymbol } = useRestaurant();
  const { tables: apiTables, isLoaded: tablesLoaded } = useTables();
  const {
    dineInOrders, takeAwayOrders, deliveryOrders, walkInOrders,
    orderItemsByTableId, getOrderByTableId,
  } = useOrders();

  // Redirect to login if not authenticated, or to loading if data not loaded
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate("/");
    } else if (!restaurantLoaded) {
      navigate("/loading");
    }
  }, [navigate, restaurantLoaded]);

  // --- State ---
  const [tables, setTables] = useState({});
  const [flatTables, setFlatTables] = useState([]);
  const [rooms, setRooms] = useState(mockRooms);
  const [isOnline] = useState(true);
  const [activeChannels, setActiveChannels] = useState(["delivery", "takeAway", "dineIn"]);
  const [activeStatuses, setActiveStatuses] = useState(["confirm", "cooking", "ready", "running", "schedule"]);
  const [activeView, setActiveView] = useState("table");
  const [activeFirst, setActiveFirst] = useState(true);
  const [orderEntryTable, setOrderEntryTable] = useState(null);
  const [orderEntryType, setOrderEntryType] = useState(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSilentMode, setIsSilentMode] = useState(false);
  const [snoozedOrders, setSnoozedOrders] = useState(new Set());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- Seed tables from real API data + enrich with order data ---
  useEffect(() => {
    if (!tablesLoaded || apiTables.length === 0) return;

    const adaptTable = (t) => {
      // Check if this table has a running order
      const order = getOrderByTableId(t.tableId);
      const hasOrder = !!order;

      return {
        id: String(t.tableId),
        label: `T${t.tableNumber}`,
        status: hasOrder ? order.tableStatus : (t.isOccupied ? 'occupied' : 'available'),
        tableId: t.tableId,
        // Order enrichment (only if order exists)
        amount: hasOrder ? order.amount : undefined,
        time: hasOrder ? order.time : undefined,
        orderNumber: hasOrder ? order.orderNumber : undefined,
      };
    };

    const hasSections = apiTables.some(t => t.sectionName);

    if (hasSections) {
      const grouped = {};
      apiTables.forEach(table => {
        if (table.status === 'disabled') return;
        const section = table.sectionName || 'Default';
        const key = section.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        if (!grouped[key]) {
          grouped[key] = { name: section, prefix: 'T', tables: [] };
        }
        grouped[key].tables.push(adaptTable(table));
      });

      // Add walk-in orders as virtual table entries in a "Walk-In" section
      if (walkInOrders.length > 0) {
        grouped['walk_in'] = {
          name: 'Walk-In',
          prefix: 'WC',
          tables: walkInOrders.map((order, idx) => ({
            id: `wc-${order.orderId}`,
            label: order.customer || 'WC',
            status: order.tableStatus,
            tableId: 0,
            amount: order.amount,
            time: order.time,
            orderNumber: order.orderNumber,
            isWalkIn: true,
            walkInOrderId: order.orderId,
          })),
        };
      }

      setTables(grouped);
      setFlatTables([]);
    } else {
      const flat = apiTables
        .filter(t => t.status !== 'disabled')
        .map(adaptTable);

      // Append walk-in orders as virtual entries
      walkInOrders.forEach((order) => {
        flat.push({
          id: `wc-${order.orderId}`,
          label: order.customer || 'WC',
          status: order.tableStatus,
          tableId: 0,
          amount: order.amount,
          time: order.time,
          orderNumber: order.orderNumber,
          isWalkIn: true,
          walkInOrderId: order.orderId,
        });
      });

      setTables({});
      setFlatTables(flat);
    }
  }, [tablesLoaded, apiTables, getOrderByTableId, walkInOrders]);

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
        const orderData = orderItemsByTableId[table.tableId] || {};
        return {
          ...table,
          customer: orderData.customer || table.label || "",
          phone: orderData.phone || ""
        };
      });
      results.tables = searchItems(enriched, query, item => ({
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
      results.rooms = searchItems(allRoomsList, query, item => ({
        id: item.id,
        all: [item.id, item.guestName || ""]
      }));
    }

    return results;
  }, [searchQuery, activeChannels, allTablesList, allRoomsList, deliveryOrders, takeAwayOrders, orderItemsByTableId]);

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
    setOrderEntryType("delivery");
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

  const handleUpdateTableStatus = (tableId, newStatus) => {
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
  };

  return (
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
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenMenu={() => setIsMenuOpen(true)}
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
                        currencySymbol={currencySymbol}
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
                        currencySymbol={currencySymbol}
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
                orders={deliveryOrders}
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
                orders={takeAwayOrders}
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
                      onRoomClick={(room) => console.log("Room clicked:", room)}
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
            orderData={orderEntryTable ? (orderItemsByTableId[orderEntryTable.tableId] || null) : null}
            orderType={orderEntryType}
            onOrderTypeChange={handleOrderTypeChange}
            allTables={allTablesList}
            onSelectTable={handleTableClick}
          />
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
