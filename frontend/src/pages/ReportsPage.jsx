import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import ReportTabs, { getTabConfig } from "../components/reports/ReportTabs";
import DatePicker from "../components/reports/DatePicker";
import SummaryBar from "../components/reports/SummaryBar";

/**
 * ReportsPage — Phase 4A Order Reports
 * Step 3: Tabs + Date Picker wired
 */
const ReportsPage = () => {
  const navigate = useNavigate();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isSilentMode, setIsSilentMode] = useState(false);
  
  // Report state
  const [activeTab, setActiveTab] = useState('paid');
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to today
    return new Date().toISOString().split('T')[0];
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Mock summary data (will be replaced with API data in Step 5)
  const [summary, setSummary] = useState({
    totalOrders: 88,
    totalAmount: 156420,
    avgOrderValue: 1777,
  });

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Data will be fetched in Step 5
    console.log(`Tab changed to: ${tabId}, date: ${selectedDate}`);
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    // Data will be fetched in Step 5
    console.log(`Date changed to: ${date}, tab: ${activeTab}`);
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
            // Tab counts will come from API in Step 5
            tabCounts={{}}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
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

          {/* Order Table placeholder */}
          <div 
            className="bg-white border border-zinc-200 rounded-sm"
            data-testid="reports-table-placeholder"
          >
            <div className="p-12 text-center">
              <div className="text-zinc-300 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-zinc-900 mb-1">
                {currentTabConfig.label} Orders
              </h3>
              <p className="text-sm text-zinc-500 mb-4">
                Selected date: <span className="font-mono">{selectedDate}</span>
              </p>
              <p className="text-xs text-zinc-400">
                Step 3 complete — Data fetching coming in Step 5
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;
