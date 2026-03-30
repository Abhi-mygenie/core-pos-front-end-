import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import ReportTabs, { getTabConfig } from "../components/reports/ReportTabs";
import DatePicker from "../components/reports/DatePicker";
import SummaryBar from "../components/reports/SummaryBar";
import OrderTable from "../components/reports/OrderTable";
import FilterBar from "../components/reports/FilterBar";
import FilterTags from "../components/reports/FilterTags";
import OrderDetailSheet from "../components/reports/OrderDetailSheet";
import ExportButtons from "../components/reports/ExportButtons";
import { getOrdersByTab } from "../api/services/reportService";
import { calculateSummary } from "../api/transforms/reportTransform";

/**
 * ReportsPage — Phase 4A Order Reports
 * Step 5: Order Table + Data Fetching wired
 */
const ReportsPage = () => {
  const navigate = useNavigate();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isSilentMode, setIsSilentMode] = useState(false);
  
  // Report state
  const [activeTab, setActiveTab] = useState('all');
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  // Data state
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [summary, setSummary] = useState({ totalOrders: 0, totalAmount: 0, avgOrderValue: 0 });
  const [missingCount, setMissingCount] = useState(0);
  const [statusBreakdown, setStatusBreakdown] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabCounts, setTabCounts] = useState({});
  
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

  // Fetch orders when tab or date changes
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getOrdersByTab(activeTab, selectedDate);
      setOrders(data);
      
      // Update tab count for current tab (unfiltered count)
      setTabCounts(prev => ({ ...prev, [activeTab]: data.length }));
      
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(err.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, selectedDate]);

  // Apply filters to orders
  useEffect(() => {
    let result = [...orders];
    
    // Filter by payment method
    if (filters.paymentMethod) {
      result = result.filter(o => 
        o.paymentMethod?.toLowerCase() === filters.paymentMethod.toLowerCase()
      );
    }
    
    // Filter by payment type
    if (filters.paymentType) {
      result = result.filter(o => 
        o.paymentType?.toLowerCase() === filters.paymentType.toLowerCase()
      );
    }
    
    // Channel and Platform filters disabled (GAP-001, GAP-002)
    
    setFilteredOrders(result);
    
    // Calculate summary from filtered orders
    const summaryData = calculateSummary(result);
    setSummary(summaryData);
    
    // Calculate missing count and status breakdown for All Orders tab
    if (activeTab === 'all' && result.length >= 2) {
      let missing = 0;
      // Sort by order ID descending
      const sorted = [...result].sort((a, b) => {
        const aId = parseInt(String(a.orderId || a.id).replace(/\D/g, '')) || 0;
        const bId = parseInt(String(b.orderId || b.id).replace(/\D/g, '')) || 0;
        return bId - aId;
      });
      
      for (let i = 0; i < sorted.length - 1; i++) {
        const currentId = parseInt(String(sorted[i].orderId || sorted[i].id).replace(/\D/g, '')) || 0;
        const nextId = parseInt(String(sorted[i + 1].orderId || sorted[i + 1].id).replace(/\D/g, '')) || 0;
        const gap = currentId - nextId;
        if (gap > 1 && gap <= 100) {
          missing += gap - 1;
        }
      }
      setMissingCount(missing);
      
      // Calculate status breakdown
      const breakdown = {
        paid: result.filter(o => o._status === 'paid').length,
        cancelled: result.filter(o => o._status === 'cancelled').length,
        credit: result.filter(o => o._status === 'credit').length,
        merged: result.filter(o => o._status === 'merged').length,
        roomTransfer: result.filter(o => o._status === 'roomTransfer').length,
        missing: missing,
      };
      setStatusBreakdown(breakdown);
    } else {
      setMissingCount(0);
      setStatusBreakdown(null);
    }
  }, [orders, filters, activeTab]);

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
    // Delay clearing selected order for smooth close animation
    setTimeout(() => setSelectedOrder(null), 300);
  };

  const currentTabConfig = getTabConfig(activeTab);

  return (
    <div className="flex h-screen bg-white" data-testid="reports-page">
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
          data-testid="reports-header"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToDashboard}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              data-testid="back-to-dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-600" />
            </button>
            <h1 
              className="text-2xl font-semibold tracking-tight text-zinc-950"
              style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
            >
              Order Reports
            </h1>
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
        <div className="px-8 pt-4 bg-white">
          <ReportTabs 
            activeTab={activeTab} 
            onTabChange={handleTabChange}
            tabCounts={tabCounts}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
          {/* Hold Tab Warning Banner */}
          {activeTab === 'hold' && (
            <div 
              className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-sm flex items-center gap-3"
              data-testid="hold-tab-warning"
            >
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium text-amber-800">Note:</span>
                <span className="text-amber-700 ml-1">
                  Displaying provisional hold data. Backend returns same data as Paid tab (known issue).
                </span>
              </div>
            </div>
          )}

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

          {/* Filters + Status Breakdown */}
          <div className="mb-4">
            <FilterBar 
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearAll={handleClearFilters}
              breakdown={activeTab === 'all' ? statusBreakdown : null}
            />
          </div>

          {/* Filter Tags */}
          <FilterTags 
            filters={filters}
            onRemove={handleRemoveFilter}
            onClearAll={handleClearFilters}
          />

          {/* Summary Bar */}
          <SummaryBar 
            summary={summary} 
            isLoading={isLoading}
            missingCount={activeTab === 'all' ? missingCount : 0}
          />

          {/* Order Table */}
          <OrderTable
            orders={filteredOrders}
            tabId={activeTab}
            tabLabel={currentTabConfig.label}
            isLoading={isLoading}
            onRowClick={handleRowClick}
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

export default ReportsPage;
