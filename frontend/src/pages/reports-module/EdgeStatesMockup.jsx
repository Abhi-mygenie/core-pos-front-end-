import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  FileText,
  FileSpreadsheet,
  Search,
  ChevronsUpDown,
  AlertTriangle,
  RefreshCw,
  Inbox,
  Loader2,
  Eye,
} from 'lucide-react';

// ─── State Definitions ───
const EDGE_STATES = [
  { id: 'first-load', label: 'First Load', desc: 'Centered splash — no data yet' },
  { id: 'refetch', label: 'Re-fetch Ghost', desc: '60% opacity + progress bar' },
  { id: 'error', label: 'Error', desc: 'Inline error banner + retry' },
  { id: 'empty', label: 'Empty Result', desc: 'No data in range' },
  { id: 'loaded', label: 'Loaded (ref)', desc: 'Normal data state for comparison' },
];

// Realistic ghost data for the re-fetch state
const GHOST_ROWS = [
  { name: 'Butter Chicken', category: 'Mains', station: 'Indian Kitchen', qty: 78, revenue: 23400, isVeg: false },
  { name: 'Garlic Naan', category: 'Breads', station: 'Tandoor', qty: 145, revenue: 7250, isVeg: true },
  { name: 'Masala Chai', category: 'Beverages', station: 'Beverage Counter', qty: 210, revenue: 6300, isVeg: true },
  { name: 'Paneer Tikka', category: 'Starters', station: 'Tandoor', qty: 52, revenue: 13000, isVeg: true },
  { name: 'Dal Makhani', category: 'Mains', station: 'Indian Kitchen', qty: 64, revenue: 12800, isVeg: true },
  { name: 'Hyderabadi Biryani', category: 'Mains', station: 'Indian Kitchen', qty: 41, revenue: 16400, isVeg: false },
  { name: 'Mango Lassi', category: 'Beverages', station: 'Beverage Counter', qty: 89, revenue: 8900, isVeg: true },
  { name: 'Gulab Jamun', category: 'Desserts', station: 'Dessert Counter', qty: 55, revenue: 4400, isVeg: true },
];

const formatCurrency = (val) => {
  const hasDecimals = val % 1 !== 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 }).format(val);
};

const EdgeStatesMockup = () => {
  const navigate = useNavigate();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isSilentMode, setIsSilentMode] = useState(false);
  const [activeState, setActiveState] = useState('first-load');

  const isDisabled = activeState === 'first-load' || activeState === 'refetch';

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="edge-states-mockup-page">
      {/* Sidebar — always renders (page chrome) */}
      <Sidebar
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
        isSilentMode={isSilentMode}
        setIsSilentMode={setIsSilentMode}
        onOpenSettings={() => {}}
        onOpenMenu={() => {}}
        onOpenCredit={() => {}}
        onRefresh={() => {}}
        isRefreshing={false}
        isOrderEntryOpen={false}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50 relative">

        {/* Header — always renders (page chrome) */}
        <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200" data-testid="reports-module-header">
          <div className="flex items-center gap-4">
            <button
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              onClick={() => navigate('/reports-module/items')}
              data-testid="reports-back-btn"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-600" />
            </button>
            <div>
              <div className="text-xs font-medium text-zinc-500 mb-0.5 flex items-center gap-1.5">
                <span>Insights</span><span>›</span><span>Items & Menu</span><span>›</span>
              </div>
              <h1
                className="text-2xl font-semibold tracking-tight text-zinc-950"
                style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
              >
                Item Sales
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Date Picker — disabled during load states */}
            <div className={`flex items-center gap-2 px-3 py-2 border border-zinc-200 bg-white rounded-lg ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <CalendarIcon className="w-4 h-4 text-zinc-500" />
              <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                <span className="text-xs text-zinc-400 uppercase tracking-wide">From</span>
                <input type="date" value="2026-05-01" disabled={isDisabled} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer p-0" readOnly />
              </label>
              <span className="text-zinc-300">—</span>
              <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                <span className="text-xs text-zinc-400 uppercase tracking-wide">To</span>
                <input type="date" value="2026-05-10" disabled={isDisabled} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer p-0" readOnly />
              </label>
            </div>

            {/* Presets — disabled */}
            <div className={`flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
              {['Today', '7D', '30D', 'MTD'].map((p) => (
                <button key={p} disabled={isDisabled} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${p === 'Today' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600'}`}>
                  {p}
                </button>
              ))}
            </div>

            {/* Attribution toggle — disabled */}
            <div className={`flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <button disabled={isDisabled} className="px-2.5 py-1 text-xs font-medium rounded-md bg-white text-zinc-900 shadow-sm">By Paid Date</button>
              <button disabled={isDisabled} className="px-2.5 py-1 text-xs font-medium rounded-md text-zinc-600">By Punched Date</button>
            </div>

            {/* Export — disabled */}
            <button disabled={isDisabled} className={`flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg text-sm font-medium shadow-sm ${isDisabled ? 'opacity-50' : ''}`}>
              <FileText className="w-4 h-4 text-red-500" /> PDF
            </button>
            <button disabled={isDisabled} className={`flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg text-sm font-medium shadow-sm ${isDisabled ? 'opacity-50' : ''}`}>
              <FileSpreadsheet className="w-4 h-4 text-green-600" /> Excel
            </button>
          </div>
        </header>

        {/* Tabs — disabled during load */}
        <div className={`px-8 pt-4 bg-white border-b border-zinc-100 shrink-0 ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center gap-1 pb-3">
            {['All Items', 'Top Sellers', 'Slow Movers', 'Cancelled Lines', 'Complimentary'].map((t, i) => (
              <button key={t} disabled={isDisabled} className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${i === 0 ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}>
                {t} <span className="ml-1 opacity-70">{i === 0 ? '—' : '—'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── State Toggle Bar (S4 demo only — not part of production UI) ─── */}
        <div className="px-8 py-3 bg-amber-50 border-b border-amber-200 shrink-0" data-testid="edge-state-toggle-bar">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide mr-2">S4 Edge State Preview</span>
            {EDGE_STATES.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveState(s.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  activeState === s.id
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white text-amber-700 border border-amber-300 hover:bg-amber-100'
                }`}
                data-testid={`edge-state-btn-${s.id}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-amber-600 mt-1.5">
            {EDGE_STATES.find(s => s.id === activeState)?.desc}
          </div>
        </div>

        {/* ─── Main Panel Area ─── */}
        <div className="flex-1 flex flex-col overflow-auto relative">

          {/* Re-fetch: animated progress bar at top */}
          {activeState === 'refetch' && (
            <div className="h-0.5 w-full bg-zinc-100 shrink-0 overflow-hidden" data-testid="edge-state-progress-bar">
              <div className="h-full bg-[#F26B33] animate-progress-bar" />
            </div>
          )}

          {/* ── FIRST LOAD SPLASH ── */}
          {activeState === 'first-load' && (
            <div className="flex-1 flex items-center justify-center" data-testid="edge-state-first-load">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
                </div>
                <div>
                  <p className="text-base font-medium text-zinc-700">Loading report...</p>
                  <p className="text-sm text-zinc-400 mt-1">Fetching data from preprod</p>
                </div>
              </div>
            </div>
          )}

          {/* ── ERROR STATE ── */}
          {activeState === 'error' && (
            <div className="flex-1 flex flex-col p-8">
              {/* Error banner */}
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3" data-testid="edge-state-error-banner">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">Failed to load report data</p>
                  <p className="text-xs text-red-600 mt-0.5">Network error — the server did not respond. Please check your connection and try again.</p>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors shrink-0" data-testid="edge-state-retry-btn">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </button>
              </div>
              {/* Ghosted empty table behind error */}
              <div className="flex-1 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden opacity-30">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50/80 border-b border-zinc-200">
                      {['Item', 'Category', 'Station', 'Qty Sold', 'Revenue', 'Discount', 'Tax', 'Avg Price'].map(h => (
                        <th key={h} className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-zinc-100">
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-5 py-4"><div className="h-4 bg-zinc-100 rounded w-3/4" /></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── EMPTY RESULT ── */}
          {activeState === 'empty' && (
            <div className="flex-1 flex flex-col p-8">
              {/* Filter bar — fully interactive in empty state */}
              <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-xl border border-zinc-200 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="Search items..." className="pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-800 w-48" />
                  </div>
                  <div className="w-px h-6 bg-zinc-200" />
                  <select className="py-1.5 pl-3 pr-8 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-700 appearance-none cursor-pointer">
                    <option>All Stations</option>
                  </select>
                  <select className="py-1.5 pl-3 pr-8 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-700 appearance-none cursor-pointer">
                    <option>All Categories</option>
                  </select>
                </div>
                <div className="text-sm font-medium text-zinc-600">
                  <strong className="text-zinc-900">0</strong> ITEMS
                </div>
              </div>
              {/* Empty illustration */}
              <div className="flex-1 bg-white border border-zinc-200 rounded-xl shadow-sm flex items-center justify-center" data-testid="edge-state-empty">
                <div className="flex flex-col items-center gap-4 text-center max-w-sm">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center">
                    <Inbox className="w-8 h-8 text-zinc-300" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-zinc-900">No items found</p>
                    <p className="text-sm text-zinc-500 mt-1">No items match your current filters and date range. Try expanding the date range or clearing filters.</p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors" data-testid="edge-state-try-7d">
                      Try Last 7 Days
                    </button>
                    <button className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-50 transition-colors">
                      Reset Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── RE-FETCH GHOST + LOADED STATE ── */}
          {(activeState === 'refetch' || activeState === 'loaded') && (
            <div className={`flex-1 flex flex-col p-8 ${activeState === 'refetch' ? 'opacity-60 pointer-events-none cursor-wait' : ''}`}
              aria-busy={activeState === 'refetch'}
              data-testid={activeState === 'refetch' ? 'edge-state-refetch-ghost' : 'edge-state-loaded'}
            >
              {/* Filter + Summary Row */}
              <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-xl border border-zinc-200 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="Search items..." disabled={activeState === 'refetch'} className="pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-800 w-48" />
                  </div>
                  <div className="w-px h-6 bg-zinc-200" />
                  <select disabled={activeState === 'refetch'} className="py-1.5 pl-3 pr-8 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-700 appearance-none cursor-pointer">
                    <option>All Stations</option>
                  </select>
                  <select disabled={activeState === 'refetch'} className="py-1.5 pl-3 pr-8 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-700 appearance-none cursor-pointer">
                    <option>All Categories</option>
                  </select>
                </div>
                <div className="text-sm font-medium text-zinc-600 flex items-center gap-3">
                  <span><strong className="text-zinc-900">8</strong> ITEMS</span>
                  <span className="w-1 h-1 rounded-full bg-zinc-300" />
                  <span><strong className="text-zinc-900">{formatCurrency(92450)}</strong> REVENUE</span>
                </div>
              </div>

              {/* Data Table */}
              <div className="flex-1 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-zinc-50/80 border-b border-zinc-200">
                        <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Item <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-300 inline-block ml-1" /></th>
                        <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Category</th>
                        <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Station</th>
                        <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Qty Sold</th>
                        <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {GHOST_ROWS.map((row, i) => (
                        <tr key={i} className="hover:bg-zinc-50 transition-colors group" data-testid="edge-state-data-row">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${row.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className="font-medium text-zinc-900">{row.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm text-zinc-600">{row.category}</td>
                          <td className="px-5 py-3 text-sm text-zinc-600">{row.station}</td>
                          <td className="px-5 py-3 text-sm font-medium text-zinc-900 text-right">{row.qty}</td>
                          <td className="px-5 py-3 text-sm text-zinc-900 text-right">{formatCurrency(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-auto px-5 py-3 bg-zinc-50 border-t border-zinc-200 text-xs text-zinc-500">
                  Showing 8 items
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EdgeStatesMockup;
