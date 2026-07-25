// CR-079: Current Stock Panel (renamed from InventoryDashboardPanel by CR-079)
// CR-075-A: S1 export dual-response · S2 filter UX · S3 status chips · S5 error banner + retry + export spinner
// CR-072: Original — KPIs + stock table with filters
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Download, AlertTriangle, XCircle, Layers, LayoutGrid, Loader2, FileText, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as XLSX from 'xlsx'; // CR-086 F2
import jsPDF from 'jspdf'; // CR-086 F3
import autoTable from 'jspdf-autotable'; // CR-086 F3 (v5 requires named-function pattern)
import * as inventoryService from '@/api/services/inventoryService';
import { getHorizonDates } from '@/utils/purchasePlanner'; // CR-081 WU-2

// CR-075-A · S3 — pre-computed Tailwind class map (dynamic class strings don't survive purge)
const CHIP_CLASSES = {
  slate: { active: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300', count: 'bg-slate-200' },
  green: { active: 'bg-green-100 text-green-700 ring-1 ring-green-300',  count: 'bg-green-200' },
  amber: { active: 'bg-amber-100 text-amber-700 ring-1 ring-amber-300',  count: 'bg-amber-200' },
  red:   { active: 'bg-red-100 text-red-700 ring-1 ring-red-300',        count: 'bg-red-200' },
};

function StatusBadge({ isLowStock, quantity }) {
  if (Number(quantity) <= 0) return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600" data-testid="status-out">Out of Stock</span>;
  if (isLowStock) return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600" data-testid="status-low">Low Stock</span>;
  return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600" data-testid="status-ok">In Stock</span>;
}

export default function CurrentStockPanel() {
  const [stockItems, setStockItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dcrSummary, setDcrSummary] = useState([]); // CR-081 WU-2
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const dates7 = getHorizonDates(7);
      const [stock, cats, dcr] = await Promise.allSettled([
        inventoryService.getStockInventory(),
        inventoryService.getCategories(),
        inventoryService.getDailyConsumptionReport(dates7),
      ]);
      if (stock.status === 'fulfilled') setStockItems(stock.value);
      else throw new Error(stock.reason?.readableMessage || 'Failed to load stock');
      if (cats.status === 'fulfilled') setCategories(cats.value);
      if (dcr.status === 'fulfilled') setDcrSummary(dcr.value?.stock_summary || []);
    } catch (err) {
      setLoadError(err?.readableMessage || err?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // KPI calculations
  const kpis = useMemo(() => {
    const total = stockItems.length;
    const lowStock = stockItems.filter(i => i.isLowStock && Number(i.quantity) > 0).length;
    const outOfStock = stockItems.filter(i => Number(i.quantity) <= 0).length;
    const inStock = total - lowStock - outOfStock;
    const catCount = categories.length;
    return { total, lowStock, outOfStock, inStock, catCount };
  }, [stockItems, categories]);

  // CR-081 WU-2: Days-left per item from velocity
  const daysLeftMap = useMemo(() => {
    const map = new Map();
    const dcrMap = new Map(dcrSummary.map(r => [String(r.ingredient_id), r]));
    stockItems.forEach(item => {
      const summary = dcrMap.get(String(item.id));
      const onHand = Number(item.calQuantity || item.quantity) || 0;
      const totalConsumed = summary ? Number(summary.total_consumed || 0) : 0;
      const avgDaily = totalConsumed / 7;
      map.set(String(item.id), avgDaily > 0 ? onHand / avgDaily : Infinity);
    });
    return map;
  }, [stockItems, dcrSummary]);

  // BUG-211: Filtered + sorted items (Out of Stock → Low Stock → In Stock)
  const filtered = useMemo(() => {
    return stockItems.filter(item => {
      if (search) {
        const q = search.toLowerCase();
        if (!item.name.toLowerCase().includes(q) && !item.categoryName.toLowerCase().includes(q) && !item.vendorName.toLowerCase().includes(q)) return false;
      }
      if (categoryFilter && String(item.categoryId) !== categoryFilter) return false;
      if (statusFilter === 'low' && !(item.isLowStock && Number(item.quantity) > 0)) return false;
      if (statusFilter === 'out' && Number(item.quantity) > 0) return false;
      if (statusFilter === 'ok' && (item.isLowStock || Number(item.quantity) <= 0)) return false;
      return true;
    }).sort((a, b) => {
      // BUG-211: Out of Stock (0) → Low Stock (1) → In Stock (2)
      const rank = (i) => Number(i.quantity) <= 0 ? 0 : i.isLowStock ? 1 : 2;
      return rank(a) - rank(b);
    });
  }, [stockItems, search, categoryFilter, statusFilter]);

  const hasActiveFilter = Boolean(search || categoryFilter || statusFilter);  // CR-075-A · S2
  const clearFilters = () => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); };

  // CR-086 F2: Client-side Excel export with correct stock-oriented columns
  const handleExport = () => {
    const rows = filtered.map(item => {
      const dl = daysLeftMap.get(String(item.id));
      return {
        'Ingredient Name': item.name,
        'Category': item.categoryName,
        'Base Unit': item.unit,
        'Current Stock': item.displayQty || item.quantity,
        'Status': Number(item.quantity) <= 0 ? 'Out of Stock' : item.isLowStock ? 'Low Stock' : 'In Stock',
        'Days Left': !Number.isFinite(dl) ? '' : `~${Math.round(dl)}`,
        'Vendor': item.vendorName || '',
        'Min Alert': item.minQtyAlert > 0 ? `${item.minQtyAlert} ${item.unit}` : '',
        'Small Unit': item.smallUnit || '',
        'Conversion Factor': item.conversionFactor || '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Current Stock');
    XLSX.writeFile(wb, `Stock_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Stock exported');
  };

  // CR-086 F3: Client-side PDF export with KPI summary + table
  const handlePdfExport = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('Current Stock Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 22);
    doc.text(`Total: ${kpis.total}  |  In Stock: ${kpis.inStock}  |  Low Stock: ${kpis.lowStock}  |  Out of Stock: ${kpis.outOfStock}  |  Categories: ${kpis.catCount}`, 14, 28);
    autoTable(doc, {
      startY: 34,
      head: [['Ingredient', 'Category', 'Stock', 'Unit', 'Status', 'Days Left', 'Vendor', 'Min Alert']],
      body: filtered.map(item => {
        const dl = daysLeftMap.get(String(item.id));
        return [
          item.name, item.categoryName,
          item.displayQty || item.quantity, item.displayUnit || item.unit,
          Number(item.quantity) <= 0 ? 'Out of Stock' : item.isLowStock ? 'Low Stock' : 'In Stock',
          !Number.isFinite(dl) ? '—' : `~${Math.round(dl)}d`,
          item.vendorName || '—',
          item.minQtyAlert > 0 ? `${item.minQtyAlert} ${item.unit}` : '—',
        ];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [51, 65, 85] },
    });
    doc.save(`Stock_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('PDF exported');
  };

  const selectCls = "h-9 text-sm border border-slate-200 rounded-md px-2 outline-none focus:border-orange-400 bg-white";

  return (
    <div data-testid="current-stock-panel">
      {/* CR-081: Phase 2 Intelligence Banner with dashboard link */}
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl px-5 py-3 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><Layers className="w-4 h-4 text-slate-400" /></div>
          <div>
            <span className="text-sm font-medium text-slate-700">Stock Intelligence</span>
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">Phase 2</span>
            <p className="text-xs text-slate-400 mt-0.5">Looking for forecasts, cost trends, vendor performance?</p>
          </div>
        </div>
        <a href="/inventory-dashboard" className="text-xs font-semibold text-orange-500 hover:underline whitespace-nowrap"
           data-testid="open-dashboard-link">
          Open Dashboard →
        </a>
      </div>

      {/* BUG-211: KPI Cards — clickable as filters (Option A: replaces chip row) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${!statusFilter ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'}`}
          onClick={() => setStatusFilter('')} data-testid="kpi-total">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Layers className="w-5 h-5 text-blue-500" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>{kpis.total}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Total Items</p>
            </div>
          </div>
        </div>
        <div className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${statusFilter === 'low' ? 'border-amber-400 ring-2 ring-amber-100' : 'border-amber-200 hover:border-amber-300'}`}
          onClick={() => setStatusFilter(statusFilter === 'low' ? '' : 'low')} data-testid="kpi-low">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-500" /></div>
            <div>
              <p className="text-2xl font-bold text-amber-600" style={{ fontFamily: 'Manrope, sans-serif' }}>{kpis.lowStock}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Low Stock</p>
            </div>
          </div>
        </div>
        <div className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${statusFilter === 'out' ? 'border-red-400 ring-2 ring-red-100' : 'border-red-200 hover:border-red-300'}`}
          onClick={() => setStatusFilter(statusFilter === 'out' ? '' : 'out')} data-testid="kpi-out">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><XCircle className="w-5 h-5 text-red-500" /></div>
            <div>
              <p className="text-2xl font-bold text-red-600" style={{ fontFamily: 'Manrope, sans-serif' }}>{kpis.outOfStock}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Out of Stock</p>
            </div>
          </div>
        </div>
        <div className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${statusFilter === 'ok' ? 'border-green-400 ring-2 ring-green-100' : 'border-slate-200 hover:border-slate-300'}`}
          onClick={() => setStatusFilter(statusFilter === 'ok' ? '' : 'ok')} data-testid="kpi-categories">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><LayoutGrid className="w-5 h-5 text-green-500" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>{kpis.catCount}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Categories</p>
            </div>
          </div>
        </div>
      </div>

      {/* CR-075-A · S5 — inline load error banner with retry */}
      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 flex items-center justify-between" data-testid="load-error-banner">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{loadError}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}
            className="text-red-600 border-red-300 hover:bg-red-100" data-testid="load-retry-btn">
            Retry
          </Button>
        </div>
      )}

      {/* Stock Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Toolbar — CR-075-A · S2/S3 rework */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          {/* Row 1: search + category dropdown + clear + export */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search stock items..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm" data-testid="stock-search" />
            </div>

            {/* CR-075-A · S2 — dropdown with active-filter dot indicator */}
            <div className="relative">
              <select
                className={`${selectCls} ${categoryFilter ? 'ring-1 ring-orange-400 border-orange-400' : ''}`}
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                data-testid="stock-category-filter"
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {categoryFilter && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" data-testid="category-active-dot" />
              )}
            </div>

            {/* CR-075-A · S2 — Clear all filters (only visible when any filter active) */}
            {hasActiveFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilters}
                className="text-xs text-slate-500 hover:text-slate-700" data-testid="clear-filters-btn">
                Clear all
              </Button>
            )}

            {/* CR-086 F2+F3: Excel + PDF export buttons */}
            <Button variant="outline" size="sm" onClick={handleExport}
              className="ml-auto gap-1.5" data-testid="stock-export-btn">
              <Download className="w-4 h-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handlePdfExport}
              className="gap-1.5" data-testid="stock-pdf-btn">
              <FileText className="w-4 h-4" /> PDF
            </Button>
          </div>

          {/* BUG-211: Status chip row removed — KPI cards now serve as filters (Option A) */}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {/* CR-085 A1: Table with grid borders */}
          <table className="w-full text-left border-collapse" style={{ minWidth: 900 }} data-testid="stock-table">
            <thead>
              <tr>
                {['Ingredient', 'Category', 'Current Stock', 'Status', 'Days Left', 'Vendor'].map((h, i) => (
                  <th key={i} className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-200 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">Loading stock...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">{hasActiveFilter ? 'No items match filters' : 'No stock items'}</td></tr>
              ) : filtered.map(item => {
                const daysLeft = daysLeftMap.get(String(item.id));
                const isOut = Number(item.quantity) <= 0;
                const isLow = item.isLowStock && !isOut;
                return (
                <tr key={item.id} className={`border-b border-slate-200 hover:bg-slate-50/50 transition-colors ${isLow ? 'bg-amber-50/20' : ''} ${isOut ? 'bg-red-50/20' : ''}`}
                  data-testid={`stock-row-${item.id}`}>
                  <td className="py-3 px-4 border border-slate-200">
                    <div className="flex items-center gap-1.5">
                      {isOut && <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                      {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                      <span className={`text-sm font-medium ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-900'}`}>{item.name}</span>
                    </div>
                    {item.isSubRecipe && <span className="ml-5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">Sub-Recipe</span>}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600 border border-slate-200">{item.categoryName}</td>
                  <td className="py-3 px-4 border border-slate-200">
                    <span className="text-sm font-semibold text-slate-900">{item.displayQty || item.quantity}</span>
                    <span className="text-xs text-slate-400 ml-1">{item.displayUnit || item.unit}</span>
                  </td>
                  <td className="py-3 px-4 border border-slate-200"><StatusBadge isLowStock={item.isLowStock} quantity={item.quantity} /></td>
                  {/* CR-085 A2: Days Left badges — larger with clock icon for critical */}
                  <td className="py-3 px-4 border border-slate-200 text-center">
                    {daysLeft === undefined || !Number.isFinite(daysLeft) ? (
                      <span className="text-xs text-slate-300">—</span>
                    ) : daysLeft <= 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700"><Clock className="w-3 h-3" />0d</span>
                    ) : daysLeft <= 3 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700"><Clock className="w-3 h-3" />~{Math.round(daysLeft)}d</span>
                    ) : daysLeft <= 7 ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">~{Math.round(daysLeft)}d</span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">~{Math.round(daysLeft)}d</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600 border border-slate-200">{item.vendorName || '—'}</td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
        {!loading && <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">Showing {filtered.length} of {stockItems.length} items</div>}
      </div>
    </div>
  );
}
