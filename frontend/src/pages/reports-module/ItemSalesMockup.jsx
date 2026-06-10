import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { getItemSalesAggregated } from '../../api/services/insightsService';
import ItemDrillSheet from './ItemDrillSheet';
import useReportFetch from '../../components/reports/useReportFetch';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  FileText,
  FileSpreadsheet,
  X,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Check
} from 'lucide-react';

// --- Seed Data Generator ---
const CATEGORIES = ['Mains', 'Breads', 'Beverages', 'Desserts', 'Starters', 'Soups'];
const STATIONS = ['Indian Kitchen', 'Tandoor', 'Beverage Counter', 'Dessert Counter', 'Chinese Kitchen'];
const ITEMS = [
  { n: "Butter Chicken", c: "Mains", s: "Indian Kitchen", v: false },
  { n: "Garlic Naan", c: "Breads", s: "Tandoor", v: true },
  { n: "Veg Biryani", c: "Mains", s: "Indian Kitchen", v: true },
  { n: "Masala Chai", c: "Beverages", s: "Beverage Counter", v: true },
  { n: "Paneer Tikka", c: "Starters", s: "Tandoor", v: true },
  { n: "Tandoori Roti", c: "Breads", s: "Tandoor", v: true },
  { n: "Dal Makhani", c: "Mains", s: "Indian Kitchen", v: true },
  { n: "Chicken Tikka", c: "Starters", s: "Tandoor", v: false },
  { n: "Mango Lassi", c: "Beverages", s: "Beverage Counter", v: true },
  { n: "Hyderabadi Biryani", c: "Mains", s: "Indian Kitchen", v: false },
  { n: "Mutton Rogan Josh", c: "Mains", s: "Indian Kitchen", v: false },
  { n: "Palak Paneer", c: "Mains", s: "Indian Kitchen", v: true },
  { n: "Jeera Rice", c: "Mains", s: "Indian Kitchen", v: true },
  { n: "Gulab Jamun", c: "Desserts", s: "Dessert Counter", v: true },
  { n: "Samosa", c: "Starters", s: "Indian Kitchen", v: true },
  { n: "Pani Puri", c: "Starters", s: "Indian Kitchen", v: true },
  { n: "Aloo Gobi", c: "Mains", s: "Indian Kitchen", v: true },
  { n: "Chana Masala", c: "Mains", s: "Indian Kitchen", v: true },
  { n: "Malai Kofta", c: "Mains", s: "Indian Kitchen", v: true },
  { n: "Fish Curry", c: "Mains", s: "Indian Kitchen", v: false },
  { n: "Prawn Masala", c: "Mains", s: "Indian Kitchen", v: false },
  { n: "Chicken 65", c: "Starters", s: "Chinese Kitchen", v: false },
  { n: "Gajar Halwa", c: "Desserts", s: "Dessert Counter", v: true },
  { n: "Rasmalai", c: "Desserts", s: "Dessert Counter", v: true },
  { n: "Sweet Lassi", c: "Beverages", s: "Beverage Counter", v: true },
  { n: "Salted Lassi", c: "Beverages", s: "Beverage Counter", v: true },
  { n: "Filter Coffee", c: "Beverages", s: "Beverage Counter", v: true },
  { n: "Lemon Soda", c: "Beverages", s: "Beverage Counter", v: true },
  { n: "Mushroom Masala", c: "Mains", s: "Indian Kitchen", v: true },
  { n: "Veg Pulao", c: "Mains", s: "Indian Kitchen", v: true },
  { n: "Peas Pulao", c: "Mains", s: "Indian Kitchen", v: true },
  { n: "Chicken Korma", c: "Mains", s: "Indian Kitchen", v: false },
  { n: "Mutton Keema", c: "Mains", s: "Indian Kitchen", v: false },
  { n: "Kadhai Paneer", c: "Mains", s: "Indian Kitchen", v: true },
  { n: "Bhindi Masala", c: "Mains", s: "Indian Kitchen", v: true },
  { n: "Baingan Bharta", c: "Mains", s: "Indian Kitchen", v: true },
  { n: "Mix Veg Curry", c: "Mains", s: "Indian Kitchen", v: true },
  { n: "Chicken Manchow", c: "Soups", s: "Chinese Kitchen", v: false },
  { n: "Tandoori Chicken", c: "Starters", s: "Tandoor", v: false },
  { n: "Seekh Kebab", c: "Starters", s: "Tandoor", v: false },
  { n: "Hara Bhara Kebab", c: "Starters", s: "Tandoor", v: true },
  { n: "Fish Tikka", c: "Starters", s: "Tandoor", v: false },
  { n: "Prawn Koliwada", c: "Starters", s: "Indian Kitchen", v: false },
  { n: "Mutton Biryani", c: "Mains", s: "Indian Kitchen", v: false },
  { n: "Egg Biryani", c: "Mains", s: "Indian Kitchen", v: false },
  { n: "Egg Curry", c: "Mains", s: "Indian Kitchen", v: false },
  { n: "Omelette", c: "Starters", s: "Indian Kitchen", v: false },
  { n: "Boiled Egg", c: "Starters", s: "Indian Kitchen", v: false },
  { n: "Tomato Soup", c: "Soups", s: "Chinese Kitchen", v: true },
  { n: "Sweet Corn Soup", c: "Soups", s: "Chinese Kitchen", v: true },
];

const generateSeedData = () => {
  return ITEMS.map((item, idx) => {
    // Generate realistic looking data
    const isCancelled = idx % 12 === 0;
    const isComplimentary = idx % 15 === 0 && !isCancelled;
    const isSlowMover = idx % 8 === 0 && !isCancelled && !isComplimentary;
    
    let qty = Math.floor(Math.random() * 40) + 10;
    if (isSlowMover) qty = 1;
    if (isCancelled) qty = Math.floor(Math.random() * 3) + 1;
    if (idx < 5) qty += 50; // Ensure top sellers
    
    const basePrice = Math.floor(Math.random() * 400) + 50;
    
    let rev = qty * basePrice;
    let discount = Math.floor(rev * 0.05); // 5% avg discount
    if (isComplimentary) {
      discount = rev;
      rev = 0;
    }
    if (isCancelled) {
      rev = 0;
      discount = 0;
    }
    
    const tax = Math.floor((qty * basePrice - discount) * 0.05);
    
    return {
      id: `itm-${idx + 1}`,
      name: item.n,
      category: item.c,
      station: item.s,
      isVeg: item.v,
      qty,
      revenue: rev,
      discount,
      tax,
      avgPrice: basePrice,
      status: isCancelled ? 'cancelled' : 'sold',
      isComplimentary
    };
  });
};

const SEED_DATA = generateSeedData();

// --- Constants ---
const TABS = [
  { id: 'all', label: 'All Items' },
  { id: 'top', label: 'Top Sellers' },
  { id: 'slow', label: 'Slow Movers' },
  { id: 'cancelled', label: 'Cancelled Lines' },
  { id: 'comp', label: 'Complimentary' },
];

const ItemSalesMockup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);

  // Read date range from URL query params (passed from Dashboard navigation)
  const urlFrom = searchParams.get('from');
  const urlTo = searchParams.get('to');
  const initialFrom = urlFrom && /^\d{4}-\d{2}-\d{2}$/.test(urlFrom) ? urlFrom : fmt(today);
  const initialTo = urlTo && /^\d{4}-\d{2}-\d{2}$/.test(urlTo) ? urlTo : fmt(today);
  
  // App Shell State
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isSilentMode, setIsSilentMode] = useState(false);
  
  // Header State — draft dates (user editing) vs applied dates (trigger fetch)
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);
  const [appliedFrom, setAppliedFrom] = useState(initialFrom);
  const [appliedTo, setAppliedTo] = useState(initialTo);
  // CR-011 S2: date attribution toggles. Cancelled tab uses its own toggle
  // (cancel_at / created_at) since a cancelled line never has a paid date.
  const [paidPunchedToggle, setPaidPunchedToggle] = useState('collect_bill');   // 'collect_bill' | 'created_at'
  const [cancelPunchedToggle, setCancelPunchedToggle] = useState('cancel_at');  // 'cancel_at'    | 'created_at'
  
  // Report State
  const [activeTab, setActiveTab] = useState('all');
  
  // Filters State
  const [stationFilter, setStationFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [vegFilter, setVegFilter] = useState(''); // 'veg', 'nonveg', ''
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sort State
  const [sortConfig, setSortConfig] = useState({ key: 'revenue', direction: 'desc' });
  
  // Drill Sheet State
  const [selectedRow, setSelectedRow] = useState(null);

  // Effective sortBy passed to the service depends on which tab is active.
  const effectiveSortBy = activeTab === 'cancelled' ? cancelPunchedToggle : paidPunchedToggle;

  // Date validation: only fetch when appliedFrom <= appliedTo
  const datesValid = appliedFrom && appliedTo && appliedFrom <= appliedTo;
  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const draftValid = fromDate && toDate && fromDate <= toDate;

  // Max date range: 2 months (~62 days)
  const MAX_RANGE_DAYS = 62;
  const getDaysDiff = (f, t) => Math.round((new Date(t) - new Date(f)) / (1000 * 60 * 60 * 24));
  const draftRangeExceeded = draftValid && getDaysDiff(fromDate, toDate) > MAX_RANGE_DAYS;
  const canApply = draftDirty && draftValid && !draftRangeExceeded;
  const maxToDate = fromDate ? new Date(new Date(fromDate).getTime() + MAX_RANGE_DAYS * 86400000).toISOString().slice(0, 10) : '';
  const minFromDate = toDate ? new Date(new Date(toDate).getTime() - MAX_RANGE_DAYS * 86400000).toISOString().slice(0, 10) : '';

  // Active preset tracking (no preset active when dates come from URL)
  const [activePreset, setActivePreset] = useState(urlFrom ? '' : 'Today');

  // Preset handlers — apply immediately (both dates set at once)
  const handlePreset = (preset) => {
    const now = new Date();
    const fmtDate = (d) => d.toISOString().slice(0, 10);
    let f, t;
    switch (preset) {
      case 'Today':
        f = fmtDate(now); t = fmtDate(now);
        break;
      case '7D': {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        f = fmtDate(d); t = fmtDate(now);
        break;
      }
      case '30D': {
        const d = new Date(now);
        d.setDate(d.getDate() - 29);
        f = fmtDate(d); t = fmtDate(now);
        break;
      }
      case 'MTD': {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        f = fmtDate(d); t = fmtDate(now);
        break;
      }
      case 'FY': {
        const fyEndYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        f = fmtDate(new Date(fyEndYear - 1, 3, 1));
        t = fmtDate(new Date(fyEndYear, 2, 31));
        break;
      }
      default: return;
    }
    setFromDate(f);
    setToDate(t);
    setAppliedFrom(f);
    setAppliedTo(t);
    setActivePreset(preset);
  };

  // Apply button handler
  const handleApply = () => {
    if (draftValid && !draftRangeExceeded) {
      setAppliedFrom(fromDate);
      setAppliedTo(toDate);
      setActivePreset('');
    }
  };

  // Clear preset when dates are manually changed
  const handleFromDate = (val) => { setFromDate(val); setActivePreset(''); };
  const handleToDate = (val) => { setToDate(val); setActivePreset(''); };

  // CR-011 Code Gate 1: useReportFetch with applied dates
  const { data: fetchResult, isLoading, error, hasLoadedOnce, refetch } = useReportFetch(
    () => getItemSalesAggregated(appliedFrom, appliedTo, effectiveSortBy),
    [appliedFrom, appliedTo, effectiveSortBy],
    { enabled: datesValid }
  );

  // Map service shape → JSX-friendly shape
  const apiRows = useMemo(() => {
    if (!fetchResult?.rows) return [];
    return fetchResult.rows.map((r) => ({
      id: r.foodId,
      name: r.name,
      category: r.category,
      station: r.station,
      isVeg: r.veg,
      qty: r.qtySold,
      qtyCancelled: r.qtyCancelled,
      qtyComplementary: r.qtyComplementary,
      revenue: Math.round(r.revenueSold),
      revenueCancelled: Math.round(r.revenueCancelled),
      revenueComplementary: Math.round(r.revenueComplementary),
      // Totals + per-bucket fields (CR-011 data-scope fix)
      discount: Math.round(r.discount),
      discountSold:          Math.round(r.discountSold || 0),
      discountCancelled:     Math.round(r.discountCancelled || 0),
      discountComplementary: Math.round(r.discountComplementary || 0),
      tax: Math.round(r.tax),
      taxSold:           Math.round(r.taxSold || 0),
      taxCancelled:      Math.round(r.taxCancelled || 0),
      taxComplementary:  Math.round(r.taxComplementary || 0),
      avgPrice: Math.round(r.avgSalePrice),
      avgPriceSold:          Math.round(r.avgSalePriceSold || 0),
      avgPriceCancelled:     Math.round(r.avgSalePriceCancelled || 0),
      avgPriceComplementary: Math.round(r.avgSalePriceComplementary || 0),
      status: r.qtySold > 0 ? 'sold' : (r.qtyCancelled > 0 ? 'cancelled' : 'unsold'),
      isComplimentary: r.qtyComplementary > 0,
      drill: r.drill,
    }));
  }, [fetchResult]);

  // Derived Data
  const filteredData = useMemo(() => {
    let data = [...apiRows];
    
    // Tab filtering
    if (activeTab === 'top') {
      data.sort((a, b) => b.revenue - a.revenue);
      data = data.slice(0, 20);
    } else if (activeTab === 'slow') {
      data = data.filter(d => d.qty <= 1 && d.status !== 'cancelled');
    } else if (activeTab === 'cancelled') {
      data = data.filter(d => d.qtyCancelled > 0);
    } else if (activeTab === 'comp') {
      data = data.filter(d => d.isComplimentary);
    }
    
    // User filtering
    if (stationFilter) data = data.filter(d => d.station === stationFilter);
    if (categoryFilter) data = data.filter(d => d.category === categoryFilter);
    if (vegFilter === 'veg') data = data.filter(d => d.isVeg);
    if (vegFilter === 'nonveg') data = data.filter(d => !d.isVeg);
    if (searchQuery) data = data.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Sorting
    data.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return data;
  }, [apiRows, activeTab, stationFilter, categoryFilter, vegFilter, searchQuery, sortConfig]);

  // Tab Counts
  const tabCounts = useMemo(() => {
    return {
      all: apiRows.length,
      top: Math.min(20, apiRows.length),
      slow: apiRows.filter(d => d.qty <= 1 && d.status !== 'cancelled').length,
      cancelled: apiRows.filter(d => d.qtyCancelled > 0).length,
      comp: apiRows.filter(d => d.isComplimentary).length,
    };
  }, [apiRows]);

  // Real-data filter options (replace hardcoded CATEGORIES/STATIONS)
  const stationOptions = useMemo(
    () => Array.from(new Set(apiRows.map(r => r.station).filter(s => s && s !== '—'))).sort(),
    [apiRows]
  );
  const categoryOptions = useMemo(
    () => Array.from(new Set(apiRows.map(r => r.category).filter(c => c && c !== '—'))).sort(),
    [apiRows]
  );

  // For Cancelled/Complementary tabs, override the visible revenue/qty/discount/tax/avgPrice
  // per row so the table + summary reflect the tab's lens (CR-011 data-scope fix, plan §4.3).
  const lensFilteredData = useMemo(() => {
    if (activeTab === 'cancelled') {
      return filteredData.map(d => ({
        ...d,
        qty:      d.qtyCancelled,
        revenue:  d.revenueCancelled,
        discount: d.discountCancelled,
        tax:      d.taxCancelled,
        avgPrice: d.avgPriceCancelled,
      }));
    }
    if (activeTab === 'comp') {
      return filteredData.map(d => ({
        ...d,
        qty:      d.qtyComplementary,
        revenue:  d.revenueComplementary,
        discount: d.discountComplementary,
        tax:      d.taxComplementary,
        avgPrice: d.avgPriceComplementary,
      }));
    }
    return filteredData;
  }, [filteredData, activeTab]);

  // Summary Metrics
  const summary = useMemo(() => {
    const totalItems = lensFilteredData.length;
    const totalRev = lensFilteredData.reduce((sum, item) => sum + item.revenue, 0);
    const totalQty = lensFilteredData.reduce((sum, item) => sum + item.qty, 0);
    const avgRev = totalQty > 0 ? Math.round(totalRev / totalQty) : 0;
    return { totalItems, totalRev, avgRev, totalQty };
  }, [lensFilteredData]);

  // Handlers
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-300 inline-block ml-1" />;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-3.5 h-3.5 text-zinc-800 inline-block ml-1" />
      : <ChevronDown className="w-3.5 h-3.5 text-zinc-800 inline-block ml-1" />;
  };

  const formatCurrency = (val) => { const hasDecimals = val % 1 !== 0; return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 }).format(val); };

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="item-sales-report-page">
      {/* Sidebar */}
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

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50 relative">
        
        {/* Header - IDENTICAL to DashboardMockup */}
        <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200" data-testid="reports-module-header">
          <div className="flex items-center gap-4">
            <button 
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              data-testid="reports-back-btn"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-5 h-5 text-zinc-600" />
            </button>
            <div>
              <div className="text-xs font-medium text-zinc-500 mb-0.5 flex items-center gap-1.5">
                <span className="hover:text-zinc-700 cursor-pointer transition-colors">Insights</span>
                <span>›</span>
                <span className="hover:text-zinc-700 cursor-pointer transition-colors">Items & Menu</span>
                <span>›</span>
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
            {/* Date Range Picker */}
            <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid && !draftRangeExceeded ? 'border-[#F26B33]' : draftRangeExceeded ? 'border-red-400' : 'border-zinc-200'} bg-white rounded-lg transition-colors ${isLoading ? 'opacity-50' : ''}`} data-testid="reports-daterange-picker">
              <CalendarIcon className="w-4 h-4 text-zinc-500" />
              <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                <span className="text-xs text-zinc-400 uppercase tracking-wide">From</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => handleFromDate(e.target.value)}
                  disabled={isLoading}
                  min={minFromDate}
                  className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0"
                  data-testid="reports-date-from"
                />
              </label>
              <span className="text-zinc-300">&mdash;</span>
              <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                <span className="text-xs text-zinc-400 uppercase tracking-wide">To</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => handleToDate(e.target.value)}
                  disabled={isLoading}
                  max={maxToDate}
                  className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0"
                  data-testid="reports-date-to"
                />
              </label>
              {draftRangeExceeded && (
                <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">Max 2 months</span>
              )}
            </div>

            {/* Apply Button */}
            <button
              onClick={handleApply}
              disabled={isLoading || !canApply}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                canApply
                  ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]'
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              }`}
              data-testid="reports-date-apply-btn"
            >
              <Check className="w-4 h-4" />
              Apply
            </button>

            {/* Quick range presets */}
            <div className={`flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg ${isLoading ? 'opacity-50' : ''}`} data-testid="reports-date-presets">
              {['Today', '7D', '30D', 'MTD', 'FY'].map((p) => {
                const isDisabledPreset = p === 'FY';
                return (
                  <button
                    key={p}
                    disabled={isLoading || isDisabledPreset}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      isDisabledPreset
                        ? 'text-zinc-300 cursor-not-allowed'
                        : activePreset === p
                          ? 'bg-white text-zinc-900 shadow-sm'
                          : 'text-zinc-600 hover:bg-white/50 hover:text-zinc-900'
                    }`}
                    data-testid={`reports-date-preset-${p.toLowerCase()}`}
                    onClick={() => !isDisabledPreset && handlePreset(p)}
                    title={isDisabledPreset ? 'Coming soon — max range is 2 months' : ''}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            {/* CR-011 S2: Date Attribution toggle — context-aware.
                On Cancelled tab: Cancelled Date / Punched Date.
                On all other tabs: Paid Date / Punched Date. */}
            {activeTab === 'cancelled' ? (
              <div className={`flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg ${isLoading ? 'opacity-50' : ''}`} data-testid="reports-attribution-toggle" title="How cancelled lines are attributed to a date">
                <button
                  onClick={() => setCancelPunchedToggle('cancel_at')}
                  disabled={isLoading}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${cancelPunchedToggle === 'cancel_at' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50 hover:text-zinc-900'}`}
                  data-testid="reports-attribution-cancelled"
                >
                  By Cancelled Date
                </button>
                <button
                  onClick={() => setCancelPunchedToggle('created_at')}
                  disabled={isLoading}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${cancelPunchedToggle === 'created_at' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50 hover:text-zinc-900'}`}
                  data-testid="reports-attribution-punched"
                >
                  By Punched Date
                </button>
              </div>
            ) : (
              <div className={`flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg ${isLoading ? 'opacity-50' : ''}`} data-testid="reports-attribution-toggle" title="How orders are attributed to a date">
                <button
                  onClick={() => setPaidPunchedToggle('collect_bill')}
                  disabled={isLoading}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${paidPunchedToggle === 'collect_bill' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50 hover:text-zinc-900'}`}
                  data-testid="reports-attribution-paid"
                >
                  By Paid Date
                </button>
                <button
                  onClick={() => setPaidPunchedToggle('created_at')}
                  disabled={isLoading}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${paidPunchedToggle === 'created_at' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50 hover:text-zinc-900'}`}
                  data-testid="reports-attribution-punched"
                >
                  By Punched Date
                </button>
              </div>
            )}

            {/* Export Buttons */}
            <button 
              disabled={isLoading}
              className={`flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium shadow-sm ${isLoading ? 'opacity-50' : ''}`}
              data-testid="reports-export-pdf-btn"
            >
              <FileText className="w-4 h-4 text-red-500" />
              PDF
            </button>
            <button 
              disabled={isLoading}
              className={`flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium shadow-sm ${isLoading ? 'opacity-50' : ''}`}
              data-testid="reports-export-excel-btn"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              Excel
            </button>
          </div>
        </header>

        {/* Top-tab Segment Bar */}
        <div className={`px-8 pt-4 bg-white border-b border-zinc-100 shrink-0 ${isLoading ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-1 overflow-x-auto pb-3">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = tabCounts[tab.id];
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={isLoading}
                  className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                    isActive 
                      ? 'bg-zinc-900 text-white' 
                      : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                  data-testid={`reports-items-tab-${tab.id}`}
                >
                  {tab.label} <span className="ml-1 opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area — wrapped in ReportLoadingShield (Code Gate 1) */}
        <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={refetch}>
          <div className="p-8 flex flex-col flex-1 relative">

          {/* Filter + Summary Row */}
          <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-xl border border-zinc-200 shadow-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isLoading}
                  className="pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all w-48"
                  data-testid="reports-items-filter-search"
                />
              </div>
              <div className="w-px h-6 bg-zinc-200" />
              <select
                value={stationFilter}
                onChange={(e) => setStationFilter(e.target.value)}
                disabled={isLoading}
                className="py-1.5 pl-3 pr-8 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 appearance-none cursor-pointer"
                data-testid="reports-items-filter-station"
              >
                <option value="">All Stations</option>
                {stationOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                disabled={isLoading}
                className="py-1.5 pl-3 pr-8 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 appearance-none cursor-pointer"
                data-testid="reports-items-filter-category"
              >
                <option value="">All Categories</option>
                {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={vegFilter}
                onChange={(e) => setVegFilter(e.target.value)}
                disabled={isLoading}
                className="py-1.5 pl-3 pr-8 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 appearance-none cursor-pointer"
                data-testid="reports-items-filter-veg"
              >
                <option value="">All Types</option>
                <option value="veg">Veg Only</option>
                <option value="nonveg">Non-Veg Only</option>
              </select>
            </div>
            <div className="text-sm font-medium text-zinc-600 flex items-center gap-3">
              <span><strong className="text-zinc-900">{summary.totalItems}</strong> ITEMS</span>
              <span className="w-1 h-1 rounded-full bg-zinc-300" />
              <span><strong className="text-zinc-900">{formatCurrency(summary.totalRev)}</strong> REVENUE</span>
              <span className="w-1 h-1 rounded-full bg-zinc-300" />
              <span><strong className="text-zinc-900">{formatCurrency(summary.avgRev)}</strong> AVG</span>
            </div>
          </div>

          {/* Active Filter Chips */}
          {(stationFilter || categoryFilter || vegFilter || searchQuery) && (
            <div className="flex items-center gap-2 mb-4 shrink-0 flex-wrap">
              {stationFilter && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-xs font-medium text-zinc-700 border border-zinc-200">
                  Station: {stationFilter}
                  <button onClick={() => setStationFilter('')} className="hover:text-zinc-900"><X className="w-3 h-3" /></button>
                </span>
              )}
              {categoryFilter && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-xs font-medium text-zinc-700 border border-zinc-200">
                  Category: {categoryFilter}
                  <button onClick={() => setCategoryFilter('')} className="hover:text-zinc-900"><X className="w-3 h-3" /></button>
                </span>
              )}
              {vegFilter && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-xs font-medium text-zinc-700 border border-zinc-200">
                  Type: {vegFilter === 'veg' ? 'Veg Only' : 'Non-Veg Only'}
                  <button onClick={() => setVegFilter('')} className="hover:text-zinc-900"><X className="w-3 h-3" /></button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-xs font-medium text-zinc-700 border border-zinc-200">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-zinc-900"><X className="w-3 h-3" /></button>
                </span>
              )}
              <button 
                onClick={() => { setStationFilter(''); setCategoryFilter(''); setVegFilter(''); setSearchQuery(''); }}
                className="text-xs text-zinc-500 hover:text-zinc-900 font-medium ml-2"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Data Table */}
          <div className="flex-1 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col relative">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-zinc-50/80 border-b border-zinc-200">
                    <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => handleSort('name')}>
                      Item {getSortIcon('name')}
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Category</th>
                    <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Station</th>
                    <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => handleSort('qty')}>
                      Qty Sold {getSortIcon('qty')}
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => handleSort('revenue')}>
                      Revenue {getSortIcon('revenue')}
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => handleSort('discount')}>
                      Discount {getSortIcon('discount')}
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => handleSort('tax')}>
                      Tax {getSortIcon('tax')}
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => handleSort('avgPrice')}>
                      Avg Price {getSortIcon('avgPrice')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {lensFilteredData.length === 0 ? (
                    // Empty State
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-zinc-500">
                          <Search className="w-10 h-10 text-zinc-300 mb-3" />
                          <p className="text-base font-medium text-zinc-900 mb-1">No items found</p>
                          <p className="text-sm mb-4">No items match your current filters and date range.</p>
                          <button 
                            className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
                            onClick={() => { setStationFilter(''); setCategoryFilter(''); setVegFilter(''); setSearchQuery(''); setFromDate(fmt(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000))); }}
                          >
                            Try Last 7 Days
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    // Data Rows
                    lensFilteredData.map((row) => (
                      <tr 
                        key={row.id} 
                        className={`hover:bg-zinc-50 cursor-pointer transition-colors group ${selectedRow?.id === row.id ? 'bg-blue-50/50' : ''}`}
                        onClick={() => setSelectedRow(row)}
                        data-testid="reports-items-table-row"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${row.isVeg ? 'bg-green-500' : 'bg-red-500'}`} title={row.isVeg ? 'Veg' : 'Non-Veg'} />
                            <span className="font-medium text-zinc-900 group-hover:text-blue-600 transition-colors">{row.name}</span>
                            {activeTab !== 'cancelled' && row.status === 'cancelled' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">Cancelled</span>}
                            {row.isComplimentary && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">Comp</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-zinc-600">{row.category}</td>
                        <td className="px-5 py-3 text-sm text-zinc-600">{row.station}</td>
                        <td className="px-5 py-3 text-sm font-medium text-zinc-900 text-right">{row.qty}</td>
                        <td className="px-5 py-3 text-sm text-zinc-900 text-right">{formatCurrency(row.revenue)}</td>
                        <td className="px-5 py-3 text-sm text-zinc-600 text-right">{formatCurrency(row.discount)}</td>
                        <td className="px-5 py-3 text-sm text-zinc-600 text-right">{formatCurrency(row.tax)}</td>
                        <td className="px-5 py-3 text-sm text-zinc-600 text-right">{formatCurrency(row.avgPrice)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Table Footer */}
            {!isLoading && lensFilteredData.length > 0 && (
              <div className="mt-auto px-5 py-3 bg-zinc-50 border-t border-zinc-200 text-xs text-zinc-500 flex justify-between items-center shrink-0">
                <span>Showing {lensFilteredData.length} {lensFilteredData.length === 1 ? 'item' : 'items'}</span>
                <span>sorted by {sortConfig.key.charAt(0).toUpperCase() + sortConfig.key.slice(1)} {sortConfig.direction === 'desc' ? '↓' : '↑'}</span>
              </div>
            )}
          </div>
          </div>
        </ReportLoadingShield>

        {/* S3 — Side-sheet Drill Template */}
        {selectedRow && (
          <ItemDrillSheet
            item={selectedRow}
            onClose={() => setSelectedRow(null)}
            totalRevenue={summary.totalRev}
          />
        )}
      </main>
    </div>
  );
};

export default ItemSalesMockup;