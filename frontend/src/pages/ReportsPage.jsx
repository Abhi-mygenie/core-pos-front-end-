import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import { COLORS } from "../constants";

/**
 * ReportsPage — Phase 4A Order Reports
 * Step 1: Foundation shell with sidebar integration
 */
const ReportsPage = () => {
  const navigate = useNavigate();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isSilentMode, setIsSilentMode] = useState(false);

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

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
          className="flex items-center justify-between px-8 py-6 bg-white border-b border-zinc-200"
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

          {/* Date Picker + Export Buttons placeholder */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500">Date picker & Export coming in Step 3/8</span>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
          {/* Tabs placeholder */}
          <div 
            className="mb-6 pb-4 border-b border-zinc-200"
            data-testid="reports-tabs-placeholder"
          >
            <div className="flex items-center gap-6">
              {['Paid', 'Cancelled', 'Credit', 'On Hold', 'Merged', 'Room Transfer', 'Aggregator'].map((tab, idx) => (
                <button
                  key={tab}
                  className={`pb-2 text-sm font-medium transition-colors ${
                    idx === 0 
                      ? 'text-zinc-950 border-b-2 border-zinc-950' 
                      : 'text-zinc-500 hover:text-zinc-700 border-b-2 border-transparent'
                  }`}
                  data-testid={`tab-${tab.toLowerCase().replace(' ', '-')}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Filters placeholder */}
          <div 
            className="mb-6 p-4 bg-white border border-zinc-200 rounded-sm"
            data-testid="reports-filters-placeholder"
          >
            <span className="text-sm text-zinc-500">Filters coming in Step 6</span>
          </div>

          {/* Summary Bar placeholder */}
          <div 
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
            data-testid="reports-summary-placeholder"
          >
            {['Total Orders', 'Total Amount', 'Avg Order Value'].map((label) => (
              <div 
                key={label}
                className="p-6 bg-white border border-zinc-200 rounded-sm"
              >
                <div className="text-xs tracking-wide uppercase font-semibold text-zinc-500 mb-2">
                  {label}
                </div>
                <div 
                  className="text-3xl font-bold text-zinc-950"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  —
                </div>
              </div>
            ))}
          </div>

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
              <h3 className="text-lg font-medium text-zinc-900 mb-1">Order Reports</h3>
              <p className="text-sm text-zinc-500">
                Step 1 complete — API integration coming in Step 2
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;
