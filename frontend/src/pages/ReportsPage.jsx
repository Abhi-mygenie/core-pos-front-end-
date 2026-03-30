import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import ReportTabs, { getTabConfig } from "../components/reports/ReportTabs";
import DatePicker from "../components/reports/DatePicker";
import SummaryBar from "../components/reports/SummaryBar";
import OrderTable from "../components/reports/OrderTable";
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
  const [activeTab, setActiveTab] = useState('paid');
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  // Data state
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({ totalOrders: 0, totalAmount: 0, avgOrderValue: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabCounts, setTabCounts] = useState({});

  // Fetch orders when tab or date changes
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getOrdersByTab(activeTab, selectedDate);
      setOrders(data);
      
      // Calculate summary
      const summaryData = calculateSummary(data);
      setSummary(summaryData);
      
      // Update tab count for current tab
      setTabCounts(prev => ({ ...prev, [activeTab]: data.length }));
      
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(err.message || 'Failed to load orders');
      setOrders([]);
      setSummary({ totalOrders: 0, totalAmount: 0, avgOrderValue: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, selectedDate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const handleRowClick = (order) => {
    // Side sheet drill-down coming in Step 7
    console.log('Order clicked:', order.id, order.orderId);
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
            {/* Export buttons coming in Step 8 */}
            <button 
              className="px-3 py-2 text-sm border border-zinc-200 rounded-sm hover:bg-zinc-100 transition-colors text-zinc-600"
              data-testid="export-pdf-button"
              disabled
            >
              ⬇ PDF
            </button>
            <button 
              className="px-3 py-2 text-sm border border-zinc-200 rounded-sm hover:bg-zinc-100 transition-colors text-zinc-600"
              data-testid="export-csv-button"
              disabled
            >
              ⬇ CSV
            </button>
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

          {/* Filters placeholder */}
          <div 
            className="mb-6 p-4 bg-white border border-zinc-200 rounded-sm"
            data-testid="reports-filters-placeholder"
          >
            <span className="text-sm text-zinc-500">Filters coming in Step 6</span>
          </div>

          {/* Summary Bar */}
          <SummaryBar 
            summary={summary} 
            isLoading={isLoading}
          />

          {/* Order Table */}
          <OrderTable
            orders={orders}
            tabId={activeTab}
            tabLabel={currentTabConfig.label}
            isLoading={isLoading}
            onRowClick={handleRowClick}
          />
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;
