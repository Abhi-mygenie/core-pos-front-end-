// CR-079: Stock Audit Panel (renamed from PhysicalCountPanel · absorbs CR-075-B rename)
// CR-072: Original — system vs physical qty with drift indicators
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Check, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react'; // BUG-223: +AlertCircle
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as inventoryService from '@/api/services/inventoryService';
import { toBreakdown, fromBreakdown, normalizeBreakdown, hasConversion } from '@/utils/quantityBreakdown'; // BUG-459

const SHOW_BUG455_PARENTHETICAL = false; // BUG-459 (OD-UNIFY-01): two-box converter is the single breakdown source on Stock Audit; BUG-455 stays live on CurrentStock/SubRecipeStock

export default function StockAuditPanel() {
  const [stockItems, setStockItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [wastageReasons, setWastageReasons] = useState([]);
  const [physicalEntries, setPhysicalEntries] = useState({}); // BUG-459: { itemId: { major, minor, reasonId } }
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

  // BUG-459: two-box helpers — maths in base unit, API receives display unit + display qty
  const convOf = (item) => hasConversion(item.conversionFactor, item.displayUnit || item.unit, item.smallUnit);
  const hasValue = (e) => (e?.major !== undefined && e?.major !== '') || (e?.minor !== undefined && e?.minor !== '');
  const entered = (item, e) => convOf(item)
    ? fromBreakdown(e.major, e.minor, item.conversionFactor)
    : { displayQty: Number(e.major) || 0, baseQty: Number(e.major) || 0 };

  const getDrift = (item) => {
    const entry = physicalEntries[item.id];
    if (!hasValue(entry)) return null;
    const diffBase = entered(item, entry).baseQty - Number(item.quantity); // BUG-459: base − base
    return { diffBase, breakdown: toBreakdown(diffBase, item.conversionFactor, item.displayUnit || item.unit, item.smallUnit) };
  };

  const handleSaveAll = async () => {
    const entries = Object.entries(physicalEntries).filter(([_, v]) => hasValue(v)); // BUG-459
    if (entries.length === 0) { toast.error('No physical counts entered'); return; }
    setSaving(true);
    try {
      let skipped = 0;
      for (const [itemId, entry] of entries) {
        const item = stockItems.find(s => String(s.id) === String(itemId));
        const reasonLabel = entry.reasonId ? wastageReasons.find(r => r.id === Number(entry.reasonId))?.reason : '';
        // BUG-sub-recipe-stock + G4: explicit three-way routing
        if (item?.isSubRecipe && item?.subrecipeId) {
          // BUG-SRSTOCK: Stock Audit = recount-only for sub-recipes (shelf count, no production credit)
          // quantity:0 — not producing; physicalQty = shelf count the user entered
          await inventoryService.addSubRecipeStock(item.subrecipeId, {
            quantity: 0,
            unit: item.unit || '',
            physicalQty: entered(item, entry).displayQty, // BUG-459 (sub-recipes: no conversion → Number(major))
            reason: reasonLabel || '',
          });
        } else if (item?.isSubRecipe && !item?.subrecipeId) {
          // Sub-recipe but subrecipeId missing — cannot call correct endpoint; skip + surface error
          skipped++;
          toast.error(`"${item.name}" is a sub-recipe but has no sub-recipe ID — skipped`);
        } else {
          // Regular ingredient — BUG-379: mirrors sub-recipe recount pattern
          const res = await inventoryService.addStock(itemId, {  // BUG-459: capture response for wastage toast
            quantity: 0,
            unit: item.displayUnit || item.unit || '',            // BUG-459: display unit — qty below is in this unit
            physicalQty: entered(item, entry).displayQty,        // BUG-459: major + minor/factor (was base number)
            wastageReasonId: entry.reasonId || null,
            reason: reasonLabel || 'Physical stock count',
          });
          const w = res?.data?.wastage; // OD-459-05
          if (w && Number(w.difference) !== 0) toast(`${item.name}: ${w.type} ${w.difference} ${w.unit}`);
        }
      }
      const saved = entries.length - skipped;
      if (saved > 0) toast.success(`${saved} adjustment(s) saved${skipped > 0 ? ` · ${skipped} skipped` : ''}`);
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

  const hasEntries = Object.keys(physicalEntries).some(k => hasValue(physicalEntries[k])); // BUG-459
  const selectCls = "h-9 text-sm border border-slate-200 rounded-md px-2 outline-none focus:border-orange-400 bg-white";

  return (
    <div data-testid="stock-audit-panel">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500">Compare system quantities with actual physical stock. Count in the display unit; put any leftover base units in the second box.</p>{/* BUG-459 */}
        <Button onClick={handleSaveAll} disabled={saving || !hasEntries}
          className="bg-green-600 hover:bg-green-700 text-white gap-1.5 disabled:opacity-50" data-testid="audit-save-btn">
          <Check className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Adjustments'}
        </Button>
      </div>

      {/* BUG-223: Unsaved adjustments banner */}
      {hasEntries && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-4" data-testid="unsaved-adjustments-banner">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-xs text-amber-700 font-medium">Unsaved adjustments — drift badges are previews until you save.</span>
        </div>
      )}

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
          <table className="w-full text-left border-collapse" style={{ minWidth: 820 }} data-testid="audit-table">
            <thead>
              <tr>
                <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border-b-2 border-slate-200" style={{ width: '28%' }}>Ingredient</th>
                <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border-b-2 border-slate-200 text-right" style={{ width: '15%' }}>System Qty</th>
                <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border-b-2 border-slate-200 text-center" style={{ width: '22%' }}>Physical Qty</th>
                <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border-b-2 border-slate-200 text-center" style={{ width: '15%' }}>Drift</th>
                <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border-b-2 border-slate-200" style={{ width: '20%' }}>Reason</th>
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
                      {SHOW_BUG455_PARENTHETICAL && item.displayQtyText && item.displayQtyText !== `${item.displayQty} ${item.displayUnit}` && ( // BUG-455 · suppressed here by BUG-459 (OD-UNIFY-01)
                        <span className="text-xs text-slate-300 ml-1">({item.displayQtyText})</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {/* BUG-459: two-box converter — [major] displayUnit [minor] smallUnit; placeholders from display_qty_parts, never base quantity */}
                      <div className="inline-flex items-center gap-1">
                        <Input type="number" step={convOf(item) ? '1' : '0.01'} min="0"
                          value={physicalEntries[item.id]?.major ?? ''}
                          onChange={e => updateEntry(item.id, 'major', e.target.value)}
                          placeholder={String(item.displayQtyParts?.major ?? item.displayQty ?? '')}
                          className="h-8 text-sm text-center w-16"
                          data-testid={`audit-input-${item.id}`} />
                        <span className="text-xs text-slate-500" data-testid={`audit-unit-major-${item.id}`}>{item.displayUnit || item.unit}</span>
                        {convOf(item) && (
                          <>
                            <Input type="number" step="1" min="0"
                              value={physicalEntries[item.id]?.minor ?? ''}
                              onChange={e => updateEntry(item.id, 'minor', e.target.value)}
                              onBlur={() => {
                                const e = physicalEntries[item.id] || {};
                                if (!hasValue(e)) return;
                                const n = normalizeBreakdown(e.major, e.minor, item.conversionFactor); // OD-459-03 (a)
                                if (String(n.major) !== String(e.major ?? '') || String(n.minor) !== String(e.minor ?? '')) {
                                  updateEntry(item.id, 'major', String(n.major)); updateEntry(item.id, 'minor', String(n.minor));
                                }
                              }}
                              placeholder={String(item.displayQtyParts?.minor ?? '')}
                              className="h-8 text-sm text-center w-16"
                              data-testid={`audit-input-minor-${item.id}`} />
                            <span className="text-xs text-slate-500" data-testid={`audit-unit-minor-${item.id}`}>{item.smallUnit}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center border-l border-slate-100">
                      {drift === null ? (
                        <span className="text-xs text-slate-300">—</span>
                      ) : drift.diffBase === 0 ? (                                                   // BUG-459
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" /> Match
                        </span>
                      ) : drift.diffBase < 0 ? (                                                     // BUG-459
                        <span className="inline-flex flex-col items-center gap-0.5 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full" data-testid="drift-preview-badge"> {/* BUG-223 */}
                          <span className="inline-flex items-center gap-1"><TrendingDown className="w-3 h-3" /> {drift.breakdown.text.replace(/^-/, '')}</span>{/* BUG-459: "0 pkt 600 gm" */}
                          <span className="text-[9px] text-amber-400 font-normal leading-none">preview</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <TrendingUp className="w-3 h-3" /> +{drift.breakdown.text}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 border-l border-slate-100">
                      {drift && drift.diffBase !== 0 ? (
                        <select className={`${selectCls} w-full text-xs`}
                          value={physicalEntries[item.id]?.reasonId || ''}
                          onChange={e => updateEntry(item.id, 'reasonId', e.target.value)}
                          data-testid={`audit-reason-${item.id}`}>
                          <option value="">Select reason...</option>
                          {wastageReasons.map(r => <option key={r.id} value={r.id}>{r.reason}</option>)}
                          <option value="physical_count">Physical stock count</option>
                        </select>
                      ) : (
                        <select className={`${selectCls} w-full text-xs opacity-50`} disabled data-testid={`audit-reason-disabled-${item.id}`}>
                          <option>N/A — no drift</option>
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CR-081: Save button moved to header */}
    </div>
  );
}
