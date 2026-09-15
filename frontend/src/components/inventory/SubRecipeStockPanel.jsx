// CR-139: Sub-Recipe Stock Panel — produce quantities OR shelf recount for sub-recipes
// BUG-SRSTOCK: redesigned with Produce / Recount mode toggle per backend contract
// Produce mode: quantity only (ADD to stock). Recount mode: physical_qty (SET then produce 0).
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Check, TrendingDown, TrendingUp, AlertCircle, Factory, ClipboardList } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as inventoryService from '@/api/services/inventoryService';
import * as recipeService from '@/api/services/recipeService';

export default function SubRecipeStockPanel() {
  const [subRecipes, setSubRecipes] = useState([]);
  const [stockMap, setStockMap] = useState(new Map());
  const [wastageReasons, setWastageReasons] = useState([]);
  const [entries, setEntries] = useState({});
  // produce: { [id]: { qty, batch, expiry } }
  // recount: { [id]: { shelf, reasonId, batch, expiry } }
  const [mode, setMode] = useState('produce'); // 'produce' | 'recount'
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

  const handleModeChange = (newMode) => {
    setEntries({});   // clear on mode switch — avoids stale produce qty appearing in recount shelf field
    setMode(newMode);
  };

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

  // getDrift — recount mode only: book − shelf (positive = loss, negative = gain)
  const getDrift = (sub) => {
    if (mode !== 'recount') return null;
    const entry = entries[String(sub.id)];
    if (entry?.shelf === undefined || entry?.shelf === '') return null;
    const { qty: current, unit } = getCurrentQty(sub);
    return { diff: current - Number(entry.shelf), unit };
  };

  const handleSaveAll = async () => {
    if (mode === 'produce') {
      const toSave = Object.entries(entries).filter(([, v]) => v.qty !== undefined && v.qty !== '' && Number(v.qty) > 0);
      if (!toSave.length) { toast.error('No production quantities entered'); return; }
      setSaving(true);
      try {
        for (const [id, entry] of toSave) {
          const sub = subRecipes.find(s => String(s.id) === String(id));
          if (!sub) continue;
          const stockItem = getStockItem(sub);
          const unit = stockItem?.unit || sub.stockUnit || sub.unit || '';
          await inventoryService.addSubRecipeStock(sub.id, {
            quantity: Number(entry.qty),
            unit,
            // BUG-SRSTOCK: produce mode — no physicalQty, no reason
            ...(entry.batch ? { batch: entry.batch } : {}),
            ...(entry.expiry ? { expiry: entry.expiry } : {}),
          });
        }
        toast.success(`${toSave.length} production record${toSave.length > 1 ? 's' : ''} saved`);
        setEntries({});
        await fetchData();
      } catch (err) {
        toast.error(err?.readableMessage || 'Failed to save production');
      } finally {
        setSaving(false);
      }
    } else {
      // Recount mode
      const toSave = Object.entries(entries).filter(([, v]) => v.shelf !== undefined && v.shelf !== '');
      if (!toSave.length) { toast.error('No shelf counts entered'); return; }

      // Validate: reason required when mismatch
      for (const [id, entry] of toSave) {
        const sub = subRecipes.find(s => String(s.id) === String(id));
        if (!sub) continue;
        const drift = getDrift(sub);
        if (drift && Math.abs(drift.diff) > 0.01 && !entry.reasonId) {
          toast.error(`Wastage reason required for "${sub.name}"`);
          return;
        }
      }

      setSaving(true);
      try {
        let skipped = 0;
        for (const [id, entry] of toSave) {
          const sub = subRecipes.find(s => String(s.id) === String(id));
          if (!sub) continue;
          const stockItem = getStockItem(sub);
          const unit = stockItem?.unit || sub.stockUnit || sub.unit || '';
          const { qty: currentQty } = getCurrentQty(sub);
          const shelfCount = Number(entry.shelf);
          const hasMismatch = Math.abs(currentQty - shelfCount) > 0.01;

          if (!hasMismatch) { skipped++; continue; } // shelf == book: omit physical_qty per contract

          const reasonLabel = entry.reasonId
            ? wastageReasons.find(r => r.id === Number(entry.reasonId))?.reason || ''
            : '';

          await inventoryService.addSubRecipeStock(sub.id, {
            quantity: 0,               // recount-only: no production credit
            unit,
            physicalQty: shelfCount,   // shelf count triggers backend recount
            reason: reasonLabel,
            ...(entry.batch ? { batch: entry.batch } : {}),
            ...(entry.expiry ? { expiry: entry.expiry } : {}),
          });
        }
        const saved = toSave.length - skipped;
        if (saved > 0) {
          toast.success(`${saved} shelf count${saved > 1 ? 's' : ''} recorded`);
        } else {
          toast.info('No mismatches found — all shelf counts match book stock');
        }
        setEntries({});
        await fetchData();
      } catch (err) {
        toast.error(err?.readableMessage || 'Failed to save shelf counts');
      } finally {
        setSaving(false);
      }
    }
  };

  const filtered = useMemo(() =>
    subRecipes.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase())),
    [subRecipes, search]
  );

  const isProduce = mode === 'produce';
  const hasEntries = isProduce
    ? Object.values(entries).some(v => v.qty !== undefined && v.qty !== '' && Number(v.qty) > 0)
    : Object.values(entries).some(v => v.shelf !== undefined && v.shelf !== '');
  const entryCount = isProduce
    ? Object.values(entries).filter(v => v.qty !== undefined && v.qty !== '' && Number(v.qty) > 0).length
    : Object.values(entries).filter(v => v.shelf !== undefined && v.shelf !== '').length;

  const selectCls = 'h-9 text-sm border border-slate-200 rounded-md px-2 outline-none focus:border-orange-400 bg-white';

  return (
    <div data-testid="sub-recipe-stock-panel">
      {/* Header row: description + mode toggle + save */}
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <p className="text-sm text-slate-500">
          {isProduce
            ? 'Enter quantities produced this run. Stock will increase by the entered amount.'
            : 'Enter what you count on the shelf. Drift vs book stock will be recorded as wastage or gain.'}
        </p>
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Mode toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1"
            data-testid="sub-recipe-mode-toggle">
            <button
              onClick={() => handleModeChange('produce')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                ${isProduce ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              data-testid="mode-produce-btn">
              <Factory className="w-3 h-3" />Produce
            </button>
            <button
              onClick={() => handleModeChange('recount')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                ${!isProduce ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              data-testid="mode-recount-btn">
              <ClipboardList className="w-3 h-3" />Recount
            </button>
          </div>
          <Button onClick={handleSaveAll} disabled={saving || !hasEntries}
            className="bg-green-600 hover:bg-green-700 text-white gap-1.5 disabled:opacity-50"
            data-testid="sub-recipe-stock-save-btn">
            <Check className="w-4 h-4" />
            {saving ? 'Saving...'
              : entryCount > 0
                ? `Save ${entryCount} ${isProduce ? 'Production' : 'Recount'}${entryCount > 1 ? 's' : ''}`
                : isProduce ? 'Save Production' : 'Save Recount'}
          </Button>
        </div>
      </div>

      {/* Unsaved banner */}
      {hasEntries && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-4"
          data-testid="sub-recipe-unsaved-banner">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-xs text-amber-700 font-medium">
            Unsaved {isProduce ? 'production entries' : 'shelf counts'} — not yet saved to stock.
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
          <table className="w-full text-left border-collapse"
            style={{ minWidth: isProduce ? 720 : 900 }}
            data-testid="sub-recipe-stock-table">
            <thead>
              <tr>
                {(isProduce
                  ? ['Sub-Recipe', 'Current Stock', 'Produce Qty', 'Unit', 'Batch (opt)', 'Expiry (opt)']
                  : ['Sub-Recipe', 'Book Stock', 'Shelf Count', 'Unit', 'Drift', 'Wastage Reason', 'Batch (opt)', 'Expiry (opt)']
                ).map((h, i) => (
                  <th key={i} className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border-b-2 border-slate-200 whitespace-nowrap">
                    {h}
                    {h === 'Wastage Reason' && (
                      <span className="text-[9px] font-normal text-slate-400 ml-1">when mismatch</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={isProduce ? 6 : 8} className="py-12 text-center text-sm text-slate-400">Loading sub-recipe stock...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={isProduce ? 6 : 8} className="py-12 text-center text-sm text-slate-400">
                  {search ? 'No sub-recipes match search' : 'No sub-recipes found'}
                </td></tr>
              ) : filtered.map(sub => {
                const { qty: currentQty, unit: displayUnit } = getCurrentQty(sub);
                const entry = entries[String(sub.id)] || {};
                const drift = getDrift(sub);
                const isLoss = drift !== null && drift.diff > 0;
                const isGain = drift !== null && drift.diff < 0;
                const rowCls = !isProduce && isLoss
                  ? 'bg-amber-50/30 border-l-[3px] border-l-amber-400'
                  : !isProduce && isGain
                    ? 'bg-green-50/30 border-l-[3px] border-l-green-400'
                    : '';

                return (
                  <tr key={sub.id}
                    className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${rowCls}`}
                    data-testid={`sub-recipe-row-${sub.id}`}>

                    {/* Sub-Recipe Name */}
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-slate-900">{sub.name}</div>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">Sub-Recipe</span>
                    </td>

                    {/* Current / Book Stock */}
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-semibold text-slate-700">{currentQty}</span>
                      <span className="text-xs text-slate-400 ml-1">{displayUnit}</span>
                    </td>

                    {/* Qty input — produce qty OR shelf count */}
                    <td className="py-3 px-4 text-center">
                      {isProduce ? (
                        <Input type="number" step="0.01" min="0.01"
                          value={entry.qty ?? ''}
                          onChange={e => updateEntry(sub.id, 'qty', e.target.value)}
                          placeholder="0"
                          className="h-8 text-sm text-center w-24 mx-auto"
                          data-testid={`sub-recipe-qty-${sub.id}`} />
                      ) : (
                        <Input type="number" step="0.01" min="0"
                          value={entry.shelf ?? ''}
                          onChange={e => updateEntry(sub.id, 'shelf', e.target.value)}
                          placeholder={String(currentQty)}
                          className={`h-8 text-sm text-center w-24 mx-auto ${isLoss ? 'border-amber-300' : isGain ? 'border-green-300' : ''}`}
                          data-testid={`sub-recipe-shelf-${sub.id}`} />
                      )}
                    </td>

                    {/* Unit */}
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {displayUnit || '—'}
                      </span>
                    </td>

                    {/* Drift — recount mode only */}
                    {!isProduce && (
                      <td className="py-3 px-4 text-center">
                        {drift === null
                          ? <span className="text-xs text-slate-300">—</span>
                          : Math.abs(drift.diff) <= 0.01
                            ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                <Check className="w-3 h-3" />Match
                              </span>
                            : drift.diff > 0
                              ? <span className="inline-flex flex-col items-center text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"
                                  data-testid={`drift-loss-${sub.id}`}>
                                  <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3" />−{drift.diff.toFixed(2)} {drift.unit}</span>
                                  <span className="text-[9px] text-amber-400 font-normal">loss</span>
                                </span>
                              : <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full"
                                  data-testid={`drift-gain-${sub.id}`}>
                                  <TrendingUp className="w-3 h-3" />+{Math.abs(drift.diff).toFixed(2)} {drift.unit}
                                </span>
                        }
                      </td>
                    )}

                    {/* Wastage Reason — recount mode only, when mismatch */}
                    {!isProduce && (
                      <td className="py-3 px-4">
                        {drift !== null && Math.abs(drift.diff) > 0.01 ? (
                          <>
                            <select
                              className={`${selectCls} w-full text-xs ${!entry.reasonId ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}
                              value={entry.reasonId || ''}
                              onChange={e => updateEntry(sub.id, 'reasonId', e.target.value)}
                              data-testid={`sub-recipe-reason-${sub.id}`}>
                              <option value="">Select reason... ⚠</option>
                              {wastageReasons.map(r => <option key={r.id} value={r.id}>{r.reason}</option>)}
                            </select>
                            {!entry.reasonId && (
                              <div className="text-[10px] text-red-500 mt-0.5">Required for mismatch</div>
                            )}
                          </>
                        ) : (
                          <select className={`${selectCls} w-full text-xs opacity-40`} disabled
                            data-testid={`sub-recipe-reason-disabled-${sub.id}`}>
                            <option>{drift && Math.abs(drift.diff) <= 0.01 ? 'N/A — match' : 'N/A'}</option>
                          </select>
                        )}
                      </td>
                    )}

                    {/* Batch (opt) */}
                    <td className="py-3 px-4">
                      <Input value={entry.batch || ''}
                        onChange={e => updateEntry(sub.id, 'batch', e.target.value)}
                        placeholder="e.g. B-001" className="h-8 text-xs"
                        data-testid={`sub-recipe-batch-${sub.id}`} />
                    </td>

                    {/* Expiry (opt) */}
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
              {entryCount > 0
                ? `Save ${entryCount} ${isProduce ? 'Production' : 'Recount'}${entryCount > 1 ? 's' : ''}`
                : isProduce ? 'Save Production' : 'Save Recount'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
