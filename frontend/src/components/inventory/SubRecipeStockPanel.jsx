// CR-139: Sub-Recipe Stock Panel — add/adjust sub-recipe stock quantities
// Pattern: mirrors StockAuditPanel.jsx (table + inline qty inputs + Save All)
// Data: getSubRecipes() for names/IDs + getStockInventory(isSubRecipe) for quantities (V3 two-source)
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Check, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as inventoryService from '@/api/services/inventoryService';
import * as recipeService from '@/api/services/recipeService';

export default function SubRecipeStockPanel() {
  const [subRecipes, setSubRecipes] = useState([]);
  const [stockMap, setStockMap] = useState(new Map()); // Map<String(subrecipeId), stockItem>
  const [wastageReasons, setWastageReasons] = useState([]);
  const [entries, setEntries] = useState({}); // { [String(sub.id)]: { qty, reasonId, batch, expiry } }
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subs, stock, reasons] = await Promise.all([
        recipeService.getSubRecipes(),
        inventoryService.getStockInventory(),
        inventoryService.getWastageReasons(),
      ]);
      // V3 two-source design: join stock quantities to sub-recipe master by subrecipeId
      const map = new Map();
      stock
        .filter(s => s.isSubRecipe && s.subrecipeId)
        .forEach(s => map.set(String(s.subrecipeId), s));
      setSubRecipes(subs);
      setStockMap(map);
      setWastageReasons(reasons);
    } catch (err) {
      toast.error('Failed to load sub-recipe stock');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateEntry = (id, field, value) =>
    setEntries(prev => ({ ...prev, [String(id)]: { ...(prev[String(id)] || {}), [field]: value } }));

  const getStockItem = (sub) => stockMap.get(String(sub.id));

  const getCurrentQty = (sub) => {
    const s = getStockItem(sub);
    return {
      qty: Number(s?.displayQty ?? s?.quantity ?? sub.currentStock ?? 0),
      unit: s?.displayUnit || s?.unit || sub.stockUnit || sub.unit || '',
    };
  };

  const getDrift = (sub) => {
    const entry = entries[String(sub.id)];
    if (entry?.qty === undefined || entry?.qty === '') return null;
    const { qty: current, unit } = getCurrentQty(sub);
    return { diff: Number(entry.qty) - current, unit };
  };

  const handleSaveAll = async () => {
    const toSave = Object.entries(entries).filter(([, v]) => v.qty !== undefined && v.qty !== '');
    if (!toSave.length) { toast.error('No quantities entered'); return; }

    // Validate: wastage reason REQUIRED when drift is negative (OD-3)
    for (const [id, entry] of toSave) {
      const sub = subRecipes.find(s => String(s.id) === String(id));
      if (!sub) continue; // defensive: skip if sub-recipe not found
      const drift = getDrift(sub);
      if (drift && drift.diff < 0 && !entry.reasonId) {
        toast.error(`Wastage reason required for "${sub.name}"`);
        return;
      }
    }

    setSaving(true);
    try {
      for (const [id, entry] of toSave) {
        const sub = subRecipes.find(s => String(s.id) === String(id));
        if (!sub) continue;
        const stockItem = getStockItem(sub);
        const unit = stockItem?.unit || sub.stockUnit || sub.unit || '';
        const reasonLabel = entry.reasonId
          ? wastageReasons.find(r => r.id === Number(entry.reasonId))?.reason || ''
          : '';
        await inventoryService.addSubRecipeStock(sub.id, {
          quantity: Number(entry.qty),
          unit,
          physicalQty: Number(entry.qty), // V4: physicalQty always equals quantity entered
          reason: reasonLabel,
          ...(entry.batch ? { batch: entry.batch } : {}),
          ...(entry.expiry ? { expiry: entry.expiry } : {}),
        });
      }
      toast.success(`${toSave.length} adjustment${toSave.length > 1 ? 's' : ''} saved`);
      setEntries({});
      await fetchData();
    } catch (err) {
      toast.error(err?.readableMessage || 'Failed to save adjustments');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() =>
    subRecipes.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase())),
    [subRecipes, search]
  );

  const hasEntries = Object.values(entries).some(v => v.qty !== undefined && v.qty !== '');
  const entryCount = Object.values(entries).filter(v => v.qty !== undefined && v.qty !== '').length;
  const selectCls = 'h-9 text-sm border border-slate-200 rounded-md px-2 outline-none focus:border-orange-400 bg-white';

  return (
    <div data-testid="sub-recipe-stock-panel">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500">
          Enter quantities produced for each sub-recipe. Negative adjustments require a wastage reason.
        </p>
        <Button onClick={handleSaveAll} disabled={saving || !hasEntries}
          className="bg-green-600 hover:bg-green-700 text-white gap-1.5 disabled:opacity-50"
          data-testid="sub-recipe-stock-save-btn">
          <Check className="w-4 h-4" />
          {saving ? 'Saving...' : entryCount > 0 ? `Save ${entryCount} Adjustment${entryCount > 1 ? 's' : ''}` : 'Save Adjustments'}
        </Button>
      </div>

      {/* Unsaved banner */}
      {hasEntries && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-4"
          data-testid="sub-recipe-unsaved-banner">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-xs text-amber-700 font-medium">
            Unsaved adjustments — drift badges are previews until you save.
          </span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 flex items-center gap-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search sub-recipes..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm" data-testid="sub-recipe-stock-search" />
          </div>
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} sub-recipes</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ minWidth: 860 }}
            data-testid="sub-recipe-stock-table">
            <thead>
              <tr>
                {['Sub-Recipe', 'Current Qty', 'New Qty', 'Unit', 'Drift', 'Wastage Reason *', 'Batch (opt)', 'Expiry (opt)'].map((h, i) => (
                  <th key={i} className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border-b-2 border-slate-200 whitespace-nowrap">
                    {h}
                    {h === 'Wastage Reason *' && (
                      <span className="text-[9px] font-normal text-slate-400 ml-1">required if negative</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-slate-400">Loading sub-recipe stock...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-slate-400">
                  {search ? 'No sub-recipes match search' : 'No sub-recipes found'}
                </td></tr>
              ) : filtered.map(sub => {
                const { qty: currentQty, unit: displayUnit } = getCurrentQty(sub);
                const entry = entries[String(sub.id)] || {};
                const drift = getDrift(sub);
                const isNegative = drift !== null && drift.diff < 0;
                const isPositive = drift !== null && drift.diff > 0;
                const rowCls = isNegative
                  ? 'bg-amber-50/30 border-l-[3px] border-l-amber-400'
                  : isPositive
                    ? 'bg-green-50/30 border-l-[3px] border-l-green-400'
                    : '';
                return (
                  <tr key={sub.id}
                    className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${rowCls}`}
                    data-testid={`sub-recipe-row-${sub.id}`}>

                    {/* Sub-Recipe Name */}
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-slate-900">{sub.name}</div>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">
                        Sub-Recipe
                      </span>
                    </td>

                    {/* Current Qty */}
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-semibold text-slate-700">{currentQty}</span>
                      <span className="text-xs text-slate-400 ml-1">{displayUnit}</span>
                    </td>

                    {/* New Qty input */}
                    <td className="py-3 px-4 text-center">
                      <Input type="number" step="0.01" min="0"
                        value={entry.qty ?? ''}
                        onChange={e => updateEntry(sub.id, 'qty', e.target.value)}
                        placeholder={String(currentQty)}
                        className={`h-8 text-sm text-center w-24 mx-auto ${isNegative ? 'border-amber-300' : ''}`}
                        data-testid={`sub-recipe-qty-${sub.id}`} />
                    </td>

                    {/* Unit badge */}
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {displayUnit || '—'}
                      </span>
                    </td>

                    {/* Drift */}
                    <td className="py-3 px-4 text-center">
                      {drift === null
                        ? <span className="text-xs text-slate-300">—</span>
                        : drift.diff === 0
                          ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" />Match
                            </span>
                          : drift.diff < 0
                            ? <span className="inline-flex flex-col items-center text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"
                                data-testid={`drift-negative-${sub.id}`}>
                                <span className="flex items-center gap-1">
                                  <TrendingDown className="w-3 h-3" />{drift.diff.toFixed(2)} {drift.unit}
                                </span>
                                <span className="text-[9px] text-amber-400 font-normal">preview</span>
                              </span>
                            : <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full"
                                data-testid={`drift-positive-${sub.id}`}>
                                <TrendingUp className="w-3 h-3" />+{drift.diff.toFixed(2)} {drift.unit}
                              </span>
                      }
                    </td>

                    {/* Wastage Reason — REQUIRED when negative (OD-3) */}
                    <td className="py-3 px-4">
                      {isNegative ? (
                        <>
                          <select
                            className={`${selectCls} w-full text-xs ${!entry.reasonId ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}
                            value={entry.reasonId || ''}
                            onChange={e => updateEntry(sub.id, 'reasonId', e.target.value)}
                            data-testid={`sub-recipe-reason-${sub.id}`}>
                            <option value="">Select reason... ⚠</option>
                            {wastageReasons.map(r => <option key={r.id} value={r.id}>{r.reason}</option>)}
                            <option value="0">Physical stock count</option>
                          </select>
                          {!entry.reasonId && (
                            <div className="text-[10px] text-red-500 mt-0.5">Required for negative drift</div>
                          )}
                        </>
                      ) : (
                        <select className={`${selectCls} w-full text-xs opacity-40`} disabled
                          data-testid={`sub-recipe-reason-disabled-${sub.id}`}>
                          <option>{drift?.diff === 0 ? 'N/A — match' : 'N/A — no drift'}</option>
                        </select>
                      )}
                    </td>

                    {/* Batch — optional (OD-4) */}
                    <td className="py-3 px-4">
                      <Input value={entry.batch || ''}
                        onChange={e => updateEntry(sub.id, 'batch', e.target.value)}
                        placeholder="e.g. B-001" className="h-8 text-xs"
                        data-testid={`sub-recipe-batch-${sub.id}`} />
                    </td>

                    {/* Expiry — optional (OD-4) */}
                    <td className="py-3 px-4">
                      <Input type="date" value={entry.expiry || ''}
                        onChange={e => updateEntry(sub.id, 'expiry', e.target.value)}
                        className="h-8 text-xs"
                        data-testid={`sub-recipe-expiry-${sub.id}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs text-slate-400">
            {filtered.length} sub-recipe{filtered.length !== 1 ? 's' : ''}
            {entryCount > 0 && (
              <> · <strong className="text-amber-600">{entryCount} unsaved</strong></>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              className={`text-xs px-3 py-1.5 rounded transition-colors ${hasEntries ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'}`}
              onClick={() => setEntries({})} disabled={!hasEntries}
              data-testid="sub-recipe-stock-reset">
              Reset All
            </button>
            <Button size="sm"
              className="bg-green-600 hover:bg-green-700 text-white text-xs disabled:opacity-50"
              onClick={handleSaveAll} disabled={saving || !hasEntries}
              data-testid="sub-recipe-stock-save-footer">
              {entryCount > 0 ? `Save ${entryCount} Adjustment${entryCount > 1 ? 's' : ''}` : 'Save Adjustments'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
