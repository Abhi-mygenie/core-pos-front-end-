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
import { getRunningOrders } from "../api/services/orderService";
import { calculateSummary } from "../api/transforms/reportTransform";
import { useRestaurant } from "../contexts";
import { getBusinessDayRange, isWithinBusinessDay } from "../utils/businessDay";

/**
 * AllOrdersReportPage — ALL Orders Report using order-logs-report endpoint
 * Uses single API endpoint with order_in, table_id, parent_order_id fields
 * Tabs: All | Paid | Cancelled | Credit | On Hold | Merged | Room Order | Transferred | Unpaid | Aggregator
 */

// Tab configuration for ALL Orders Report (Audit tab added dynamically based on missing count)
const ALL_ORDERS_TABS = [
  { id: 'all', label: 'All Orders', color: 'zinc' },
  { id: 'paid', label: 'Paid', color: 'blue' },
  { id: 'cancelled', label: 'Cancelled', color: 'red' },
  { id: 'credit', label: 'Added to Credit', color: 'purple' },
  { id: 'hold', label: 'On Hold', color: 'orange' },
  { id: 'merged', label: 'Merged', color: 'teal' },
  { id: 'unpaid', label: 'Unpaid', color: 'yellow' },
  { id: 'transferred', label: 'Transferred', color: 'cyan' },
  { id: 'aggregator', label: 'Aggregator', color: 'amber' },
  { id: 'audit', label: 'Audit', color: 'green' }, // Color will be dynamic: red if missing > 0, green if 0
];

// Filter functions for each tab - MUTUALLY EXCLUSIVE (priority-based)
const TAB_FILTERS = {
  all: () => true,
  paid: (o) => {
    // Exclude special categories first
    if (o.paymentMethod === 'Cancel') return false;
    if (o.paymentMethod === 'Merge' || o.paymentStatus === 'Merge') return false;
    if (o.paymentMethod === 'TAB') return false;
    if (o.paymentMethod === 'ROOM') return false;
    if (o.orderIn === 'RM') return false;
    if (o.paymentStatus === 'unpaid') return false;
    // Include paid orders (f_order_status = 6) - SRM paid orders also go here
    return o.fOrderStatus === 6;
  },
  cancelled: (o) => o.paymentMethod === 'Cancel',
  credit: (o) => o.paymentMethod === 'TAB',
  hold: (o) => o.paymentMethod?.toLowerCase() === 'paylater',
  merged: (o) => o.paymentMethod === 'Merge' || o.paymentStatus === 'Merge',
  unpaid: (o) => {
    // Only unpaid orders NOT already in other categories
    if (o.paymentStatus !== 'unpaid') return false;
    if (o.paymentMethod === 'Cancel') return false;
    if (o.paymentMethod === 'Merge' || o.paymentStatus === 'Merge') return false;
    return true;
  },
  transferred: (o) => {
    // SRM unpaid or ROOM payment (SRM paid goes to Paid tab)
    if (o.paymentMethod === 'ROOM') return true;
    if (o.orderIn === 'SRM' && o.paymentStatus === 'unpaid') return true;
    return false;
  },
  aggregator: (o) => ['zomato', 'swiggy'].includes(o.orderIn?.toLowerCase()),
  audit: (o) => o._isMissing === true, // Handled separately in useEffect
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
  const [runningOrdersMap, setRunningOrdersMap] = useState({});
  const [missingOrdersList, setMissingOrdersList] = useState([]); // List of missing order IDs
  const [summary, setSummary] = useState({ totalOrders: 0, totalAmount: 0, avgOrderValue: 0 });
  const [tabCounts, setTabCounts] = useState({});
  const [statusBreakdown, setStatusBreakdown] = useState(null);
  const [missingCount, setMissingCount] = useState(0);
  const [runningCount, setRunningCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter state
  const [filters, setFilters] = useState({
    status: null,
    paymentMethod: null,
    channel: null,
  });
  
  // Side sheet state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Fetch all orders from order-logs-report endpoint
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch both order logs and running orders in parallel
      const [data, runningOrders] = await Promise.all([
        getOrderLogsReport(selectedDate, schedules),
        getRunningOrders().catch(() => []),
      ]);
      
      setAllOrders(data.orders);
      
      // Filter running orders by business day and build lookup map
      const { start, end } = getBusinessDayRange(selectedDate, schedules);
      const runningFiltered = runningOrders.filter(order => {
        if (!order.createdAt) return false;
        const ca = order.createdAt.replace('T', ' ').substring(0, 19);
        return isWithinBusinessDay(ca, start, end);
      });
      
      // Build running orders map by order number (numeric part)
      const runningMap = {};
      runningFiltered.forEach(o => {
        const numericId = String(o.orderNumber || '').replace(/\D/g, '');
        if (numericId) runningMap[numericId] = o;
      });
      setRunningOrdersMap(runningMap);
      
      // Calculate tab counts from single dataset
      const counts = {};
      ALL_ORDERS_TABS.forEach(tab => {
        const filterFn = TAB_FILTERS[tab.id];
        if (tab.id === 'audit') {
          // Audit tab count will be set after gap detection
          counts[tab.id] = 0;
        } else {
          counts[tab.id] = filterFn ? data.orders.filter(filterFn).length : 0;
        }
      });
      
      // Calculate gap detection for All tab
      const missingIds = [];
      if (data.orders.length >= 2) {
        const sortedByIdDesc = [...data.orders].sort((a, b) => {
          const aId = parseInt(String(a.orderId || a.id).replace(/\D/g, '')) || 0;
          const bId = parseInt(String(b.orderId || b.id).replace(/\D/g, '')) || 0;
          return bId - aId;
        });
        
        let missing = 0;
        let running = 0;
        for (let i = 0; i < sortedByIdDesc.length - 1; i++) {
          const currentId = parseInt(String(sortedByIdDesc[i].orderId || sortedByIdDesc[i].id).replace(/\D/g, '')) || 0;
          const nextId = parseInt(String(sortedByIdDesc[i + 1].orderId || sortedByIdDesc[i + 1].id).replace(/\D/g, '')) || 0;
          const gap = currentId - nextId;
          if (gap > 1 && gap <= 100) {
            for (let missingId = currentId - 1; missingId > nextId; missingId--) {
              if (runningMap[String(missingId)]) {
                running++;
              } else {
                missing++;
                // Get the format from existing order IDs
                const sampleId = sortedByIdDesc[i].orderId || sortedByIdDesc[i].id;
                const padding = sampleId.length;
                missingIds.push(String(missingId).padStart(padding, '0'));
              }
            }
          }
        }
        setMissingCount(missing);
        setRunningCount(running);
        setMissingOrdersList(missingIds);
        
        // Update audit tab count and all orders count (include missing)
        counts['audit'] = missing;
        counts['all'] = data.orders.length + missing;
      }
      
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
    // Handle Audit tab specially - show missing order placeholders
    if (activeTab === 'audit') {
      const missingOrderPlaceholders = missingOrdersList.map(id => ({
        orderId: id,
        _missingId: id,
        status: 'missing',
        createdAt: '—',
        customer: '—',
        table: '—',
        waiter: '—',
        paymentMethod: '—',
        amount: 0,
        _isMissing: true,
      }));
      setFilteredOrders(missingOrderPlaceholders);
      setSummary({ totalOrders: missingOrdersList.length, totalAmount: 0, avgOrderValue: 0 });
      setStatusBreakdown(null);
      return;
    }
    
    // Apply tab filter
    let result = allOrders.filter(TAB_FILTERS[activeTab] || (() => true));
    
    // Apply payment method filter
    if (filters.paymentMethod) {
      result = result.filter(o => 
        o.paymentMethod?.toLowerCase() === filters.paymentMethod.toLowerCase()
      );
    }
    
    // Apply status filter
    if (filters.status) {
      result = result.filter(o => o.status === filters.status);
    }
    
    // Apply channel filter (Room vs Dine In)
    if (filters.channel === 'room') {
      result = result.filter(o => o.orderIn === 'RM' || o.orderIn === 'SRM' || o.paymentMethod === 'ROOM');
    } else if (filters.channel === 'dinein') {
      result = result.filter(o => o.orderIn !== 'RM' && o.orderIn !== 'SRM' && o.paymentMethod !== 'ROOM');
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
        unpaid: result.filter(TAB_FILTERS.unpaid).length,
        transferred: result.filter(TAB_FILTERS.transferred).length,
        running: runningCount,
        missing: missingCount,
      };
      setStatusBreakdown(breakdown);
    } else {
      setStatusBreakdown(null);
    }
  }, [allOrders, activeTab, filters, runningCount, missingCount, missingOrdersList]);

  // Fetch orders when date changes
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleBackToDashboard = () => {
    navigate("/dashboard", { replace: true });
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
                Audit Report
              </h1>
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
              
              // Dynamic color for Audit tab: red if missing > 0, green if 0
              const isAuditTab = tab.id === 'audit';
              const auditHasMissing = isAuditTab && missingCount > 0;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all
                    ${isActive 
                      ? isAuditTab 
                        ? auditHasMissing 
                          ? 'bg-red-600 text-white' 
                          : 'bg-green-600 text-white'
                        : 'bg-zinc-900 text-white' 
                      : isAuditTab
                        ? auditHasMissing
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-green-600 hover:bg-green-50'
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
              breakdown={null}
              summary={summary}
              missingCount={0}
              runningCount={0}
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
            runningOrdersMap={runningOrdersMap}
            showGapDetection={activeTab === 'all' && !Object.values(filters).some(v => v !== null)}
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
