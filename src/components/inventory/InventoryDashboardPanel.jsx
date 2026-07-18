// CR-072: Inventory Dashboard Panel — KPIs + stock table with filters
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Download, AlertTriangle, XCircle, Layers, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as inventoryService from '@/api/services/inventoryService';

function StatusBadge({ isLowStock, quantity }) {
  if (Number(quantity) <= 0) return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600" data-testid="status-out">Out of Stock</span>;
  if (isLowStock) return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600" data-testid="status-low">Low Stock</span>;
  return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600" data-testid="status-ok">In Stock</span>;
}

export default function InventoryDashboardPanel() {
  const [stockItems, setStockItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [stock, cats] = await Promise.all([
        inventoryService.getStockInventory(),
        inventoryService.getCategories(),
      ]);
      setStockItems(stock);
      setCategories(cats);
    } catch (err) {
      toast.error('Failed to load inventory');
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
    const catCount = categories.length;
    return { total, lowStock, outOfStock, catCount };
  }, [stockItems, categories]);

  // Filtered items
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
    });
  }, [stockItems, search, categoryFilter, statusFilter]);

  const handleExport = async () => {
    try {
      const res = await inventoryService.exportStock();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'stock-inventory.xlsx'; a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Stock exported');
    } catch { toast.error('Export failed'); }
  };

  const selectCls = "h-9 text-sm border border-slate-200 rounded-md px-2 outline-none focus:border-orange-400 bg-white";

  return (
    <div data-testid="inventory-dashboard-panel">
      {/* Phase 2 Intelligence Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><Layers className="w-4 h-4 text-slate-400" /></div>
          <div>
            <span className="text-sm font-medium text-slate-700">Stock Intelligence</span>
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">Phase 2</span>
            <p className="text-xs text-slate-400 mt-0.5">Reorder forecasts, consumption trends, cost analysis — coming soon</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4" data-testid="kpi-total">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Layers className="w-5 h-5 text-blue-500" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>{kpis.total}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Total Items</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4" data-testid="kpi-low">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-500" /></div>
            <div>
              <p className="text-2xl font-bold text-amber-600" style={{ fontFamily: 'Manrope, sans-serif' }}>{kpis.lowStock}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Low Stock</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4" data-testid="kpi-out">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><XCircle className="w-5 h-5 text-red-500" /></div>
            <div>
              <p className="text-2xl font-bold text-red-600" style={{ fontFamily: 'Manrope, sans-serif' }}>{kpis.outOfStock}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Out of Stock</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4" data-testid="kpi-categories">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><LayoutGrid className="w-5 h-5 text-green-500" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>{kpis.catCount}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Categories</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 flex items-center gap-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search stock items..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm" data-testid="stock-search" />
          </div>
          <select className={selectCls} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} data-testid="stock-category-filter">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className={selectCls} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} data-testid="stock-status-filter">
            <option value="">All Status</option>
            <option value="ok">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
          <Button variant="outline" size="sm" onClick={handleExport} className="ml-auto gap-1.5" data-testid="stock-export-btn">
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ minWidth: 800 }} data-testid="stock-table">
            <thead>
              <tr className="bg-slate-50/80">
                {['Ingredient', 'Category', 'Current Stock', 'Status', 'Vendor'].map((h, i) => (
                  <th key={i} className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center text-sm text-slate-400">Loading stock...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-sm text-slate-400">{search || categoryFilter || statusFilter ? 'No items match filters' : 'No stock items'}</td></tr>
              ) : filtered.map(item => (
                <tr key={item.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${item.isLowStock ? 'bg-amber-50/20' : ''} ${Number(item.quantity) <= 0 ? 'bg-red-50/20' : ''}`}
                  data-testid={`stock-row-${item.id}`}>
                  <td className="py-3 px-4">
                    <span className={`text-sm font-medium ${Number(item.quantity) <= 0 ? 'text-red-600' : item.isLowStock ? 'text-amber-600' : 'text-slate-900'}`}>{item.name}</span>
                    {item.isSubRecipe && <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">Sub-Recipe</span>}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{item.categoryName}</td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-semibold text-slate-900">{item.displayQty || item.quantity}</span>
                    <span className="text-xs text-slate-400 ml-1">{item.displayUnit || item.unit}</span>
                  </td>
                  <td className="py-3 px-4"><StatusBadge isLowStock={item.isLowStock} quantity={item.quantity} /></td>
                  <td className="py-3 px-4 text-sm text-slate-600">{item.vendorName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">Showing {filtered.length} of {stockItems.length} items</div>}
      </div>
    </div>
  );
}
