// CR-073 · Recipe Bulk Editor — spreadsheet-style multi-recipe editor
// Rulings: A1 margin bands via menuManagementService.getFoodsList()
//          A3 partial-success UX (SmartPurchasePanel pattern)
//          A5 tab-aware store/update/delete dispatch
//          A6 Excel/Import restricted to standard tab
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, Plus, Save, ChevronRight, ChevronDown, Trash2, FileDown, Upload, Loader2, Columns3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as recipeService from '@/api/services/recipeService';
import * as inventoryService from '@/api/services/inventoryService';
import * as menuManagementService from '@/api/services/menuManagementService';

// A1: FB-7-Q2 locked colour bands
const MARGIN_BAND = {
  green: 'bg-green-50 text-green-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
};
const bandOf = (m) => (m >= 50 ? 'green' : m >= 30 ? 'amber' : 'red');

// A5: tab-aware dispatch table
const DISPATCH = {
  standard: { store: recipeService.storeRecipe, update: recipeService.updateRecipe, del: recipeService.deleteRecipe, label: 'Standard' },
  sub: { store: recipeService.storeSubRecipe, update: recipeService.updateSubRecipe, del: recipeService.deleteSubRecipe, label: 'Sub' },
  addon: { store: recipeService.storeAddonRecipe, update: recipeService.updateAddonRecipe, del: recipeService.deleteAddonRecipe, label: 'Addon' },
};

const UNIT_OPTIONS = ['plates', 'pieces', 'kg', 'gm', 'ltr', 'ml', 'pkt', 'nos'];

const emptyIng = () => ({ _key: Date.now() + Math.random(), id: null, ingredientId: '', quantity: '', unit: '', cost: 0 });

function normaliseRecipe(r, foods) {
  // Deep clone into local editable shape · works for standard/sub/addon
  // BUG-206: enrich foodId from foodsMaster at hydration time (same as BUG-197 #7)
  let resolvedFoodId = r.foodId ?? null;
  if (!resolvedFoodId && foods && foods.length && (r.name || r.foodName)) {
    const nm = (r.name || r.foodName || '').trim().toLowerCase();
    const match = foods.find(f => (f.name || f.food_name || '').trim().toLowerCase() === nm);
    if (match) resolvedFoodId = String(match.id);
  }
  return {
    _key: r.id != null ? `id-${r.id}` : `new-${Date.now()}-${Math.random()}`,
    id: r.id ?? null,
    isNew: r.id == null,
    dirty: false,
    name: r.name || '',
    foodId: resolvedFoodId,
    addonId: r.addonId ?? null,
    qty: r.qty ?? 1,
    unit: r.unit || '',
    preparationTime: r.preparationTime || '',
    serveTime: r.serveTime || '',
    servePeople: r.servePeople ?? 1,
    ingredients: (r.ingredients || []).map((ing) => ({
      _key: Math.random(),
      id: ing.id ?? null,
      ingredientId: ing.id ?? '', // toAPI needs `ingredientId` — use master id
      quantity: ing.quantity ?? '',
      unit: ing.unit || '',
      cost: Number(ing.cost) || 0,
    })),
  };
}

export default function RecipeBulkEditor({ recipes, recipeType, onRefresh }) {
  const [rows, setRows] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitResults, setSubmitResults] = useState(null);
  const [ingredientsMaster, setIngredientsMaster] = useState([]);
  const [foodsMaster, setFoodsMaster] = useState([]); // for margin lookup (standard) + food-picker for add-recipe
  const [purchaseRates, setPurchaseRates] = useState(new Map()); // BUG-207: ingredient_id → last purchase unit_price
  const importInputRef = useRef(null);
  // CR-085 D3: Column visibility toggle
  const [showColPicker, setShowColPicker] = useState(false);
  const ALL_COLS = ['Qty', 'Unit', 'Prep', 'Cook', 'Serves', 'Ingredients', 'Cost', 'Margin'];
  const [visibleCols, setVisibleCols] = useState(() => {
    try { const s = localStorage.getItem('recipe_bulk_cols'); return s ? new Set(JSON.parse(s)) : new Set(ALL_COLS); }
    catch { return new Set(ALL_COLS); }
  });
  const toggleCol = (col) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col); else next.add(col);
      localStorage.setItem('recipe_bulk_cols', JSON.stringify([...next]));
      return next;
    });
  };
  const isColVisible = (col) => visibleCols.has(col);

  const dispatch = DISPATCH[recipeType] || DISPATCH.standard;
  const excelEnabled = recipeType === 'standard'; // A6

  // ── Load masters + hydrate rows when recipes/tab/foodsMaster change ──────
  // BUG-206: foodsMaster in deps ensures foodId enrichment re-runs after master loads
  useEffect(() => {
    setRows((recipes || []).map(r => normaliseRecipe(r, foodsMaster)));
    setExpanded(new Set());
    setSubmitResults(null);
  }, [recipes, recipeType, foodsMaster]);

  useEffect(() => {
    (async () => {
      try {
        const [ings, foods, purchases] = await Promise.all([
          inventoryService.getIngredients(),
          menuManagementService.getFoodsList().then(res => res?.data?.foods || res?.foods || res || []).catch(() => []),
          inventoryService.getVendorItemList().catch(() => []), // BUG-207
        ]);
        setIngredientsMaster(ings || []);
        setFoodsMaster(Array.isArray(foods) ? foods : []);
        // BUG-207: build last-purchase-rate map (ingredient_id → latest non-zero unit_price)
        const rateMap = new Map();
        (purchases || []).forEach(p => {
          const id = p.ingredient_id;
          const price = Number(p.unit_price);
          const date = p.Purchase_Date || '';
          if (id && price > 0) {
            const existing = rateMap.get(id);
            if (!existing || date > existing.date) rateMap.set(id, { price, date });
          }
        });
        setPurchaseRates(rateMap);
      } catch {
        toast.error('Failed to load ingredient master');
      }
    })();
  }, []);

  // ── Menu price lookup (A1) ────────────────────────────────────
  const priceByName = useMemo(() => {
    const m = new Map();
    (foodsMaster || []).forEach((f) => {
      const nm = (f.name || f.food_name || '').toLowerCase().trim();
      const p = Number(f.price || f.food_price || f.sale_price || 0);
      if (nm && p > 0) m.set(nm, p);
    });
    return m;
  }, [foodsMaster]);

  // ── Cost/margin per row ───────────────────────────────────────
  // BUG-207: use last purchase rate from vendor-item-list for ingredient cost
  const costMarginFor = useCallback((row) => {
    const ings = row.ingredients || [];
    if (ings.length === 0) return { cost: null, margin: null };
    let totalCost = 0;
    let allHaveRates = true;
    for (const ing of ings) {
      const ingId = Number(ing.ingredientId || ing.id);
      const qty = Number(ing.quantity) || 0;
      const rateEntry = purchaseRates.get(ingId);
      if (rateEntry) {
        totalCost += rateEntry.price * qty;
      } else if (qty > 0) {
        allHaveRates = false;
      }
    }
    if (!allHaveRates) return { cost: null, margin: null };
    const nm = (row.name || '').toLowerCase().trim();
    const price = priceByName.get(nm) || 0;
    const serves = Number(row.servePeople) || 1;
    const costPerServe = totalCost / (serves || 1);
    const margin = price > 0 ? ((price - costPerServe) / price) * 100 : null;
    return { cost: totalCost, margin };
  }, [priceByName, purchaseRates]);

  // ── Row mutations ─────────────────────────────────────────────
  const markDirty = (row) => ({ ...row, dirty: true });

  const updateRow = (key, field, value) => {
    setRows((prev) => prev.map((r) => (r._key === key ? markDirty({ ...r, [field]: value }) : r)));
  };

  const updateIng = (rowKey, ingKey, field, value) => {
    setRows((prev) => prev.map((r) => {
      if (r._key !== rowKey) return r;
      const nextIngs = r.ingredients.map((ing) => {
        if (ing._key !== ingKey) return ing;
        const next = { ...ing, [field]: value };
        if (field === 'ingredientId' && value) {
          const master = ingredientsMaster.find((m) => String(m.id) === String(value));
          if (master) { next.unit = master.smallUnit || master.unit; } // BUG-216
        }
        return next;
      });
      return markDirty({ ...r, ingredients: nextIngs });
    }));
  };

  const addIng = (rowKey) => {
    setRows((prev) => prev.map((r) => (r._key === rowKey ? markDirty({ ...r, ingredients: [...r.ingredients, emptyIng()] }) : r)));
  };

  const removeIng = (rowKey, ingKey) => {
    setRows((prev) => prev.map((r) => (r._key === rowKey ? markDirty({ ...r, ingredients: r.ingredients.filter((i) => i._key !== ingKey) }) : r)));
  };

  const addRecipe = () => {
    const nr = normaliseRecipe({ id: null }, foodsMaster);
    nr.ingredients = [emptyIng()];
    nr.dirty = true;
    setRows((prev) => [nr, ...prev]);
    setExpanded((prev) => { const s = new Set(prev); s.add(nr._key); return s; });
  };

  const deleteRow = async (row) => {
    if (row.isNew) {
      setRows((prev) => prev.filter((r) => r._key !== row._key));
      return;
    }
    if (!window.confirm(`Delete recipe "${row.name}"?`)) return;
    try {
      await dispatch.del(row.id);
      toast.success(`Recipe "${row.name}" deleted`);
      setRows((prev) => prev.filter((r) => r._key !== row._key));
    } catch (e) {
      toast.error(e?.readableMessage || 'Failed to delete recipe');
    }
  };

  const toggleExpand = (key) => {
    setExpanded((prev) => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
  };

  // ── Batch Save (A3 · partial-success UX) ─────────────────────
  const handleSave = async () => {
    const dirtyRows = rows.filter((r) => r.dirty);
    if (dirtyRows.length === 0) { toast.info('No changes to save'); return; }

    setSaving(true); setSubmitResults(null);
    const ok = []; const failed = [];

    for (const row of dirtyRows) {
      const validIngs = (row.ingredients || []).filter((i) => i.ingredientId && Number(i.quantity) > 0);
      if (!row.name.trim()) { failed.push({ key: row._key, name: row.name || '(unnamed)', error: 'Name required' }); continue; }
      if (validIngs.length === 0) { failed.push({ key: row._key, name: row.name, error: 'At least 1 ingredient required' }); continue; }
      if (recipeType === 'standard' && row.isNew && !row.foodId) { failed.push({ key: row._key, name: row.name, error: 'Menu food required for new standard recipe' }); continue; }
      if (recipeType === 'addon' && row.isNew && !row.addonId) { failed.push({ key: row._key, name: row.name, error: 'Addon required for new addon recipe' }); continue; }
      // BUG-206: fail-fast if foodId/addonId missing on EXISTING standard/addon recipe (avoids confusing server 422)
      if (recipeType === 'standard' && !row.isNew && !row.foodId) { failed.push({ key: row._key, name: row.name, error: 'Menu food link missing — cannot save' }); continue; }
      if (recipeType === 'addon' && !row.isNew && !row.addonId) { failed.push({ key: row._key, name: row.name, error: 'Addon link missing — cannot save' }); continue; }

      const payload = {
        name: row.name.trim(),
        foodId: row.foodId ? Number(row.foodId) : null,
        addonId: row.addonId ? Number(row.addonId) : null,
        qty: Number(row.qty) || 1,
        unit: row.unit || '',
        preparationTime: row.preparationTime || '',
        serveTime: row.serveTime || '',
        servePeople: Number(row.servePeople) || 1,
        ingredients: validIngs.map((i) => ({ ingredientId: Number(i.ingredientId), quantity: Number(i.quantity), unit: i.unit })),
      };

      try {
        if (row.isNew) await dispatch.store(payload);
        else await dispatch.update(row.id, payload);
        ok.push({ key: row._key, name: row.name });
      } catch (e) {
        failed.push({ key: row._key, name: row.name, error: e?.readableMessage || e?.message || 'Save failed' });
      }
    }

    setSubmitResults({ ok, failed });
    setSaving(false);

    if (failed.length === 0) {
      toast.success(`${ok.length} recipe${ok.length > 1 ? 's' : ''} saved`);
      onRefresh?.();
    } else if (ok.length === 0) {
      toast.error('All saves failed. See details.');
    } else {
      toast.warning(`${ok.length} saved · ${failed.length} failed`);
      onRefresh?.();
    }
  };

  // ── Import / Export (A6 · standard tab only) ─────────────────
  // BUG-222: export uses JSON download_url, blob as fallback
  const handleExport = async () => {
    if (!excelEnabled) return;
    try {
      const res = await recipeService.exportRecipes();
      const downloadUrl = res?.data?.download_url || res?.download_url;
      if (downloadUrl) {
        window.open(downloadUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      // Blob fallback for legacy servers
      const blob = res?.data instanceof Blob ? res.data : new Blob([res?.data || res], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `recipes_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e?.readableMessage || 'Export failed');
    }
  };

  const handleImportClick = () => { if (excelEnabled) importInputRef.current?.click(); };
  // BUG-222: Template download
  const handleTemplate = async () => {
    if (!excelEnabled) return;
    try {
      const res = await recipeService.exportSampleRecipes();
      const downloadUrl = res?.data?.download_url || res?.download_url;
      if (downloadUrl) window.open(downloadUrl, '_blank', 'noopener,noreferrer');
      else toast.error('Template not available');
    } catch (err) {
      toast.error(err?.readableMessage || 'Template download failed');
    }
  };
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData(); fd.append('products_file', file); // BUG-222: backend field name (422-proven)
    try {
      const res = await recipeService.importRecipes(fd);
      // BUG-222: defensive — check 2xx with status:false trap
      if (res?.data?.status === false) {
        toast.error(res.data.errors || res.data.message || 'Import failed — check file format');
        return;
      }
      toast.success('Import complete');
      onRefresh?.();
    } catch (err) {
      toast.error(err?.readableMessage || 'Import failed');
    } finally {
      e.target.value = '';
    }
  };

  // ── Filtered rows ────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => (r.name || '').toLowerCase().includes(q));
  }, [rows, search]);

  const dirtyCount = rows.filter((r) => r.dirty).length;
  const excelDisabledTip = 'Available for Standard Recipes only';

  return (
    <div data-testid="recipe-bulk-editor">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-xs min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
            data-testid="bulk-search"
          />
        </div>
        <div className="text-xs text-slate-500">
          {filtered.length} of {rows.length} {dispatch.label.toLowerCase()} recipe{rows.length === 1 ? '' : 's'}
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleExport}
          disabled={!excelEnabled}
          title={excelEnabled ? 'Export to Excel' : excelDisabledTip}
          className={`h-9 px-3 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-colors ${excelEnabled ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'}`}
          data-testid="bulk-excel"
        >
          <FileDown className="w-3.5 h-3.5" /> Excel
        </button>
        {/* BUG-222: Template button */}
        <button
          type="button"
          onClick={handleTemplate}
          disabled={!excelEnabled}
          title={excelEnabled ? 'Download Template' : excelDisabledTip}
          className={`h-9 px-3 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-colors ${excelEnabled ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'}`}
          data-testid="bulk-template"
        >
          <FileDown className="w-3.5 h-3.5" /> Template
        </button>
        <button
          type="button"
          onClick={handleImportClick}
          disabled={!excelEnabled}
          title={excelEnabled ? 'Import from Excel' : excelDisabledTip}
          className={`h-9 px-3 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-colors ${excelEnabled ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'}`}
          data-testid="bulk-import"
        >
          <Upload className="w-3.5 h-3.5" /> Import
        </button>
        <input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleImport} />
        {/* CR-085 D3: Column visibility toggle */}
        <div className="relative">
          <button type="button" onClick={() => setShowColPicker(p => !p)}
            className="h-9 px-3 rounded-md text-xs font-medium border flex items-center gap-1.5 bg-white text-slate-700 border-slate-200 hover:bg-slate-50 transition-colors"
            data-testid="bulk-col-toggle">
            <Columns3 className="w-3.5 h-3.5" /> Columns
          </button>
          {showColPicker && (
            <div className="absolute right-0 top-10 z-20 bg-white border border-slate-200 rounded-lg shadow-lg p-2 w-44" data-testid="bulk-col-picker">
              {ALL_COLS.map(col => (
                <label key={col} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs text-slate-700">
                  <input type="checkbox" className="rounded border-slate-300 w-3.5 h-3.5"
                    checked={visibleCols.has(col)} onChange={() => toggleCol(col)} />
                  {col}
                </label>
              ))}
            </div>
          )}
        </div>
        <Button onClick={addRecipe} variant="outline" size="sm" className="gap-1.5" data-testid="bulk-add-recipe">
          <Plus className="w-3.5 h-3.5" /> Add Recipe
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || dirtyCount === 0}
          className="bg-green-600 hover:bg-green-700 text-white gap-1.5 disabled:bg-slate-300 disabled:cursor-not-allowed"
          data-testid="bulk-save"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? 'Saving…' : dirtyCount > 0 ? `Save Changes (${dirtyCount})` : 'Save Changes'}
        </Button>
      </div>

      {/* Partial-success banner (A3) */}
      {submitResults && (submitResults.ok.length > 0 || submitResults.failed.length > 0) && (
        <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3 space-y-1" data-testid="bulk-submit-results">
          {submitResults.ok.map((r, i) => (
            <div key={`ok-${i}`} className="text-xs text-green-700">✓ {r.name} · saved</div>
          ))}
          {submitResults.failed.map((r, i) => (
            <div key={`f-${i}`} className="text-xs text-red-700">✗ {r.name} · {r.error}</div>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="w-10 p-2"></th>
              <th className="w-10 p-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">#</th>
              <th className="p-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 min-w-[220px]">Name</th>
              {isColVisible('Qty') && <th className="w-20 p-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Qty</th>}
              {isColVisible('Unit') && <th className="w-24 p-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Unit</th>}
              {isColVisible('Prep') && <th className="w-20 p-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Prep</th>}
              {isColVisible('Cook') && <th className="w-20 p-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Cook</th>}
              {isColVisible('Serves') && <th className="w-20 p-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Serves</th>}
              {isColVisible('Ingredients') && <th className="w-24 p-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Ingredients</th>}
              {isColVisible('Cost') && <th className="w-24 p-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Cost</th>}
              {isColVisible('Margin') && <th className="w-20 p-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Margin</th>}
              <th className="w-10 p-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-8 text-center text-sm text-slate-400" data-testid="bulk-empty">
                  {search ? `No recipes match "${search}"` : `No ${dispatch.label.toLowerCase()} recipes yet · click Add Recipe to start.`}
                </td>
              </tr>
            ) : (
              filtered.map((row, idx) => {
                const isExp = expanded.has(row._key);
                const { cost, margin } = costMarginFor(row);
                const marginBand = margin != null ? bandOf(margin) : null;
                return (
                  <RecipeRow
                    key={row._key}
                    row={row}
                    idx={idx + 1}
                    isExp={isExp}
                    cost={cost}
                    margin={margin}
                    marginBand={marginBand}
                    ingredientsMaster={ingredientsMaster}
                    foodsMaster={foodsMaster}
                    recipeType={recipeType}
                    isColVisible={isColVisible}
                    onToggleExpand={() => toggleExpand(row._key)}
                    onUpdateRow={(field, value) => updateRow(row._key, field, value)}
                    onUpdateIng={(ingKey, field, value) => updateIng(row._key, ingKey, field, value)}
                    onAddIng={() => addIng(row._key)}
                    onRemoveIng={(ingKey) => removeIng(row._key, ingKey)}
                    onDeleteRow={() => deleteRow(row)}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[10px] text-slate-400 italic">
        Margin bands: <span className="text-green-600">green ≥50%</span> · <span className="text-amber-600">amber 30–49%</span> · <span className="text-red-600">red &lt;30%</span>
        {recipeType !== 'standard' && ' · Excel/Import available for Standard Recipes only'}
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// RecipeRow · one main row + optional expanded ingredient sub-table
// ────────────────────────────────────────────────────────────────
function RecipeRow({ row, idx, isExp, cost, margin, marginBand, ingredientsMaster, foodsMaster, recipeType, isColVisible, onToggleExpand, onUpdateRow, onUpdateIng, onAddIng, onRemoveIng, onDeleteRow }) {
  const gridInputCls = 'w-full h-8 px-2 text-sm text-slate-800 rounded border border-transparent hover:border-slate-200 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-200 bg-transparent';
  const showFoodPicker = row.isNew && (recipeType === 'standard' || recipeType === 'addon');

  return (
    <>
      <tr
        className={`border-b border-slate-100 hover:bg-slate-50 ${isExp ? 'bg-orange-50/30' : ''} ${row.dirty ? 'bg-yellow-50/40' : ''}`}
        data-testid={`bulk-row-${row.id ?? 'new'}`}
      >
        <td className="p-2 text-center cursor-pointer" onClick={onToggleExpand}>
          {isExp ? <ChevronDown className="w-4 h-4 text-orange-500 inline" /> : <ChevronRight className="w-4 h-4 text-slate-400 inline" />}
        </td>
        <td className="p-2 text-center text-xs text-slate-400 font-medium">{idx}</td>
        <td className="p-1">
          {showFoodPicker ? (
            <select
              value={recipeType === 'standard' ? (row.foodId || '') : (row.addonId || '')}
              onChange={(e) => {
                const val = e.target.value;
                const food = foodsMaster.find((f) => String(f.id) === String(val));
                onUpdateRow(recipeType === 'standard' ? 'foodId' : 'addonId', val);
                if (food) onUpdateRow('name', food.name || food.food_name || '');
              }}
              className={gridInputCls}
              data-testid={`bulk-food-picker-${row._key}`}
            >
              <option value="">— Select {recipeType === 'standard' ? 'menu food' : 'addon'} —</option>
              {foodsMaster.map((f) => (
                <option key={f.id} value={f.id}>{f.name || f.food_name}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={row.name}
              onChange={(e) => onUpdateRow('name', e.target.value)}
              className={`${gridInputCls} font-medium`}
              data-testid={`bulk-name-${row._key}`}
              readOnly={!row.isNew && recipeType !== 'sub'} /* standard/addon: name reflects food_name — read-only when editing */
            />
          )}
        </td>
        {/* CR-085 D3: Column visibility applied to row cells */}
        {isColVisible('Qty') && <td className="p-1">
          <input type="number" value={row.qty} onChange={(e) => onUpdateRow('qty', e.target.value)} className={`${gridInputCls} text-center`} />
        </td>}
        {isColVisible('Unit') && <td className="p-1">
          <select value={row.unit} onChange={(e) => onUpdateRow('unit', e.target.value)} className={gridInputCls}>
            <option value="">—</option>
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </td>}
        {isColVisible('Prep') && <td className="p-1">
          <input type="number" value={row.preparationTime} onChange={(e) => onUpdateRow('preparationTime', e.target.value)} className={`${gridInputCls} text-center`} />
        </td>}
        {isColVisible('Cook') && <td className="p-1">
          <input type="number" value={row.serveTime} onChange={(e) => onUpdateRow('serveTime', e.target.value)} className={`${gridInputCls} text-center`} />
        </td>}
        {isColVisible('Serves') && <td className="p-1">
          <input type="number" value={row.servePeople} onChange={(e) => onUpdateRow('servePeople', e.target.value)} className={`${gridInputCls} text-center`} />
        </td>}
        {isColVisible('Ingredients') && <td className="p-2 text-center">
          <button
            type="button"
            onClick={onToggleExpand}
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${isExp ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {row.ingredients.length} items
          </button>
        </td>}
        {isColVisible('Cost') && <td className="p-2 text-right text-sm text-slate-600 font-medium">{cost != null ? `₹${cost.toFixed(0)}` : <span className="text-xs text-slate-400">—</span>}</td>}
        {isColVisible('Margin') && <td className="p-2 text-right">
          {margin != null ? (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${MARGIN_BAND[marginBand]}`}>{margin.toFixed(0)}%</span>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </td>}
        <td className="p-2 text-center">
          <button
            type="button"
            onClick={onDeleteRow}
            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="Delete recipe"
            data-testid={`bulk-delete-${row._key}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      </tr>
      {isExp && (
        <tr>
          <td colSpan={99} className="p-0">
            <div className="border-l-4 border-orange-500 bg-slate-50/60 mx-2 mb-2 rounded-b-md overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ingredients ({row.ingredients.length})</span>
                <button
                  type="button"
                  onClick={onAddIng}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                  data-testid={`bulk-add-ing-${row._key}`}
                >
                  <Plus className="w-3 h-3" /> Add Ingredient
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-100/60">
                    <th className="p-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 pl-4" style={{ width: '50%' }}>Ingredient</th>
                    <th className="p-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500" style={{ width: '20%' }}>Quantity</th>
                    <th className="p-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500" style={{ width: '15%' }}>Unit</th>
                    <th className="p-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500" style={{ width: '15%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {row.ingredients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-xs text-slate-400 italic">No ingredients · click Add Ingredient</td>
                    </tr>
                  ) : (
                    row.ingredients.map((ing) => (
                      <tr key={ing._key} className="hover:bg-white/60 transition-colors">
                        <td className="p-1 pl-4">
                          <select
                            value={ing.ingredientId || ''}
                            onChange={(e) => onUpdateIng(ing._key, 'ingredientId', e.target.value)}
                            className="w-full h-8 px-2 text-sm text-slate-800 rounded border border-transparent hover:border-slate-200 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-200 bg-transparent"
                            data-testid={`bulk-ing-select-${row._key}-${ing._key}`}
                          >
                            <option value="">— Select —</option>
                            {ingredientsMaster.map((m) => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={ing.quantity}
                            onChange={(e) => onUpdateIng(ing._key, 'quantity', e.target.value)}
                            className="w-full h-8 px-2 text-sm text-center text-slate-700 rounded border border-transparent hover:border-slate-200 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-200 bg-transparent"
                          />
                        </td>
                        <td className="p-2 text-center text-sm text-slate-500 font-medium">{ing.unit || '—'}</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => onRemoveIng(ing._key)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Remove ingredient"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
