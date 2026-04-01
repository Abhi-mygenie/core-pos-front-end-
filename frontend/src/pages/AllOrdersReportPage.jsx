import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import DatePicker from "../components/reports/DatePicker";
import OrderTable from "../components/reports/OrderTable";
import FilterBar from "../components/reports/FilterBar";
import FilterTags from "../components/reports/FilterTags";
import OrderDetailSheet from "../components/reports/OrderDetailSheet";
import ExportButtons from "../components/reports/ExportButtons";
import { getOrderLogsReport } from "../api/services/reportService";
import { calculateSummary } from "../api/transforms/reportTransform";
import { useRestaurant } from "../contexts";

/**
 * AllOrdersReportPage — ALL Orders Report using order-logs-report endpoint
 * Uses single API endpoint with order_in, table_id, parent_order_id fields
 * Tabs: All | Paid | Cancelled | Credit | On Hold | Merged | Room Order | Transferred | Aggregator
 */

// Tab configuration for ALL Orders Report
const ALL_ORDERS_TABS = [
  { id: 'all', label: 'All Orders', color: 'zinc' },
  { id: 'paid', label: 'Paid', color: 'blue' },
  { id: 'cancelled', label: 'Cancelled', color: 'red' },
  { id: 'credit', label: 'Credit', color: 'purple' },
  { id: 'hold', label: 'On Hold', color: 'orange' },
  { id: 'merged', label: 'Merged', color: 'teal' },
  { id: 'roomOrder', label: 'Room Order', color: 'pink' },
  { id: 'transferred', label: 'Transferred', color: 'cyan' },
  { id: 'aggregator', label: 'Aggregator', color: 'amber' },
];

// Filter functions for each tab
const TAB_FILTERS = {
  all: () => true,
  paid: (o) => o.status === 'paid',
  cancelled: (o) => o.status === 'cancelled',
  credit: (o) => o.status === 'credit' || o.paymentMethod === 'TAB',
  hold: (o) => o.paymentMethod?.toLowerCase() === 'paylater',
  merged: (o) => o.status === 'merged' || o.paymentMethod === 'Merge',
  roomOrder: (o) => o.orderIn === 'RM',
  transferred: (o) => o.orderIn === 'SRM',
  aggregator: (o) => ['zomato', 'swiggy'].includes(o.orderIn?.toLowerCase()),
};

const AllOrdersReportPage = () => {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();
  const schedules = useMemo(() => restaurant?.schedules || [], [restaurant?.schedules]);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isSilentMode, setIsSilentMode] = useState(false);
  
  // Report state
  const [activeTab, setActiveTab] = useState('all');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  
  // Data state - all orders from single API call
  const [allOrders, setAllOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [summary, setSummary] = useState({ totalOrders: 0, totalAmount: 0, avgOrderValue: 0 });
  const [tabCounts, setTabCounts] = useState({});
  const [statusBreakdown, setStatusBreakdown] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter state
  const [filters, setFilters] = useState({
    paymentMethod: null,
    paymentType: null,
    channel: null,
    platform: null,
  });
  
  // Side sheet state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Fetch all orders from order-logs-report endpoint
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getOrderLogsReport(selectedDate, schedules);
      setAllOrders(data.orders);
      
      // Calculate tab counts from single dataset
      const counts = {};
      ALL_ORDERS_TABS.forEach(tab => {
        counts[tab.id] = data.orders.filter(TAB_FILTERS[tab.id]).length;
      });
      setTabCounts(counts);
      
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(err.message || 'Failed to load orders');
      setAllOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, schedules]);

  // Filter orders based on active tab and filters
  useEffect(() => {
    // Apply tab filter
    let result = allOrders.filter(TAB_FILTERS[activeTab] || (() => true));
    
    // Apply payment method filter
    if (filters.paymentMethod) {
      result = result.filter(o => 
        o.paymentMethod?.toLowerCase() === filters.paymentMethod.toLowerCase()
      );
    }
    
    // Apply payment type filter
    if (filters.paymentType) {
      result = result.filter(o => 
        o.paymentType?.toLowerCase() === filters.paymentType.toLowerCase()
      );
    }
    
    setFilteredOrders(result);
    
    // Calculate summary
    const summaryData = calculateSummary(result);
    setSummary(summaryData);
    
    // Calculate status breakdown for All tab
    if (activeTab === 'all') {
      const breakdown = {
        all: result.length,
        paid: result.filter(TAB_FILTERS.paid).length,
        cancelled: result.filter(TAB_FILTERS.cancelled).length,
        credit: result.filter(TAB_FILTERS.credit).length,
        merged: result.filter(TAB_FILTERS.merged).length,
        roomOrder: result.filter(TAB_FILTERS.roomOrder).length,
        transferred: result.filter(TAB_FILTERS.transferred).length,
      };
      setStatusBreakdown(breakdown);
    } else {
      setStatusBreakdown(null);
    }
  }, [allOrders, activeTab, filters]);

  // Fetch orders when date changes
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Reset filters when tab changes
    setFilters({
      paymentMethod: null,
      paymentType: null,
      channel: null,
      platform: null,
    });
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      paymentMethod: null,
      paymentType: null,
      channel: null,
      platform: null,
    });
  };

  const handleRemoveFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: null }));
  };

  const handleRowClick = (order) => {
    setSelectedOrder(order);
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setTimeout(() => setSelectedOrder(null), 300);
  };

  const currentTabConfig = ALL_ORDERS_TABS.find(t => t.id === activeTab) || ALL_ORDERS_TABS[0];

  return (
    <div className="flex h-screen bg-white" data-testid="all-orders-report-page">
      {/* Sidebar */}
      <Sidebar
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
        isSilentMode={isSilentMode}
        setIsSilentMode={setIsSilentMode}
        onOpenSettings={() => {}}
        onOpenMenu={() => {}}
        onRefresh={() => {}}
        isRefreshing={false}
        isOrderEntryOpen={false}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
        {/* Header */}
        <header 
          className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200"
          data-testid="all-orders-header"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToDashboard}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              data-testid="back-to-dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-600" />
            </button>
            <div>
              <h1 
                className="text-2xl font-semibold tracking-tight text-zinc-950"
                style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
              >
                ALL Orders
              </h1>
              <p className="text-sm text-zinc-500">Using order-logs-report endpoint</p>
            </div>
          </div>

          {/* Date Picker + Export Buttons */}
          <div className="flex items-center gap-3">
            <DatePicker 
              value={selectedDate} 
              onChange={handleDateChange} 
            />
            <ExportButtons
              orders={filteredOrders}
              tabId={activeTab}
              tabLabel={currentTabConfig.label}
              selectedDate={selectedDate}
              summary={summary}
              disabled={isLoading}
            />
          </div>
        </header>

        {/* Tabs */}
        <div className="px-8 pt-4 bg-white border-b border-zinc-100">
          <div className="flex items-center gap-1 overflow-x-auto pb-3">
            {ALL_ORDERS_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = tabCounts[tab.id] || 0;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all
                    ${isActive 
                      ? 'bg-zinc-900 text-white' 
                      : 'text-zinc-600 hover:bg-zinc-100'
                    }
                  `}
                  data-testid={`tab-${tab.id}`}
                >
                  {tab.label} {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
          {/* Error Banner */}
          {error && (
            <div 
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-sm flex items-center gap-3"
              data-testid="error-banner"
            >
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="text-sm text-red-700">{error}</div>
              <button 
                onClick={fetchOrders}
                className="ml-auto text-sm font-medium text-red-700 hover:text-red-900"
              >
                Retry
              </button>
            </div>
          )}

          {/* Filters + Summary Stats */}
          <div className="mb-4">
            <FilterBar 
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearAll={handleClearFilters}
              breakdown={statusBreakdown}
              summary={summary}
              missingCount={0}
              tabSettled={null}
              activeTab={activeTab}
            />
          </div>

          {/* Filter Tags */}
          <FilterTags 
            filters={filters}
            onRemove={handleRemoveFilter}
            onClearAll={handleClearFilters}
          />

          {/* Order Table */}
          <OrderTable
            orders={filteredOrders}
            tabId={activeTab}
            tabLabel={currentTabConfig.label}
            isLoading={isLoading}
            onRowClick={handleRowClick}
            runningOrdersMap={{}}
            showGapDetection={false}
          />
        </div>
      </main>

      {/* Order Detail Side Sheet */}
      <OrderDetailSheet
        isOpen={isSheetOpen}
        onClose={handleCloseSheet}
        order={selectedOrder}
        tabId={activeTab}
      />
    </div>
  );
};

export default AllOrdersReportPage;
