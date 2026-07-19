// CR-079: Stock Audit Panel (renamed from PhysicalCountPanel · absorbs CR-075-B rename)
// CR-072: Original — system vs physical qty with drift indicators
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as inventoryService from '@/api/services/inventoryService';

export default function StockAuditPanel() {
  const [stockItems, setStockItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [wastageReasons, setWastageReasons] = useState([]);
  const [physicalEntries, setPhysicalEntries] = useState({}); // { itemId: { qty, reasonId } }
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [stock, cats, reasons] = await Promise.all([
        inventoryService.getStockInventory(),
        inventoryService.getCategories(),
        inventoryService.getWastageReasons(),
      ]);
      setStockItems(stock);
      setCategories(cats);
      setWastageReasons(reasons);
    } catch (err) {
      toast.error('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateEntry = (itemId, field, value) => {
    setPhysicalEntries(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), [field]: value },
    }));
  };

  const getDrift = (item) => {
    const entry = physicalEntries[item.id];
    if (!entry?.qty && entry?.qty !== 0) return null;
    const physical = Number(entry.qty);
    const system = Number(item.quantity);
    const diff = physical - system;
    return { diff, unit: item.displayUnit || item.unit };
  };

  const handleSaveAll = async () => {
    const entries = Object.entries(physicalEntries).filter(([_, v]) => v.qty !== undefined && v.qty !== '');
    if (entries.length === 0) { toast.error('No physical counts entered'); return; }
    setSaving(true);
    try {
      for (const [itemId, entry] of entries) {
        await inventoryService.addStock(itemId, {
          quantity: Number(entry.qty),
          wastageReasonId: entry.reasonId || null,
          reason: entry.reasonId ? wastageReasons.find(r => r.id === Number(entry.reasonId))?.reason : '',
        });
      }
      toast.success(`${entries.length} adjustment(s) saved`);
      setPhysicalEntries({});
      await fetchData();
    } catch (err) {
      toast.error(err?.readableMessage || 'Failed to save adjustments');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    return stockItems.filter(item => {
      if (search) {
        const q = search.toLowerCase();
        if (!item.name.toLowerCase().includes(q) && !item.categoryName.toLowerCase().includes(q)) return false;
      }
      if (categoryFilter && String(item.categoryId) !== categoryFilter) return false;
      return true;
    });
  }, [stockItems, search, categoryFilter]);

  const hasEntries = Object.keys(physicalEntries).some(k => physicalEntries[k]?.qty !== undefined && physicalEntries[k]?.qty !== '');
  const selectCls = "h-9 text-sm border border-slate-200 rounded-md px-2 outline-none focus:border-orange-400 bg-white";

  return (
    <div data-testid="stock-audit-panel">
      <p className="text-sm text-slate-500 mb-5">Compare system quantities with actual physical stock. Enter what you see on the shelf.</p>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 flex items-center gap-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search ingredient..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm" data-testid="audit-search" />
          </div>
          <select className={selectCls} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} data-testid="audit-category-filter">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ minWidth: 750 }} data-testid="audit-table">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200" style={{ width: '35%' }}>Ingredient</th>
                <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-right" style={{ width: '15%' }}>System Qty</th>
                <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center" style={{ width: '15%' }}>Physical Qty</th>
                <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center" style={{ width: '15%' }}>Drift</th>
                <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200" style={{ width: '20%' }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center text-sm text-slate-400">Loading stock...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-sm text-slate-400">No items found</td></tr>
              ) : filtered.map(item => {
                const drift = getDrift(item);
                return (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors" data-testid={`audit-row-${item.id}`}>
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-400">{item.categoryName}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-semibold text-slate-700">{item.displayQty || item.quantity}</span>
                      <span className="text-xs text-slate-400 ml-1">{item.displayUnit || item.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Input type="number" step="0.01"
                        value={physicalEntries[item.id]?.qty ?? ''}
                        onChange={e => updateEntry(item.id, 'qty', e.target.value)}
                        placeholder={String(item.quantity)}
                        className="h-8 text-sm text-center w-24 mx-auto"
                        data-testid={`audit-input-${item.id}`} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      {drift === null ? (
                        <span className="text-xs text-slate-300">—</span>
                      ) : drift.diff === 0 ? (
                        <span className="text-xs font-medium text-green-600"><Check className="w-3 h-3 inline -mt-0.5" /> Match</span>
                      ) : (
                        <span className={`text-xs font-medium ${drift.diff < 0 ? 'text-red-500' : 'text-amber-600'}`}>
                          {drift.diff > 0 ? '+' : ''}{drift.diff.toFixed(2)} {drift.unit}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {drift && drift.diff !== 0 ? (
                        <select className={`${selectCls} w-full text-xs`}
                          value={physicalEntries[item.id]?.reasonId || ''}
                          onChange={e => updateEntry(item.id, 'reasonId', e.target.value)}
                          data-testid={`audit-reason-${item.id}`}>
                          <option value="">Select reason...</option>
                          {wastageReasons.map(r => <option key={r.id} value={r.id}>{r.reason}</option>)}
                          <option value="physical_count">Physical stock count</option>
                        </select>
                      ) : drift && drift.diff === 0 ? (
                        <span className="text-xs text-slate-400">N/A — no drift</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save button */}
      {hasEntries && (
        <div className="flex justify-end mt-4">
          <Button onClick={handleSaveAll} disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white gap-1.5" data-testid="audit-save-btn">
            <Check className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Adjustments'}
          </Button>
        </div>
      )}
    </div>
  );
}
