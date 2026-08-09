// CR-072: Inventory Setup Panel — 3 tabs: Ingredients / Vendors / Wastage Reasons
// CR-086 F4: +IngredientBulkEditor toggle
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Pencil, Trash2, Download, Upload, Package, Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as inventoryService from '@/api/services/inventoryService';
import VendorFormDialog from './VendorFormDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'; // BUG-218
import IngredientBulkEditor from './IngredientBulkEditor'; // CR-086 F4

// ── Ingredients Tab ──────────────────────────────────────────────
// BUG-269-B: Auto-select small unit when base unit changes
const UNIT_SMALL_MAP = { kg: 'gm', ltr: 'ml', litre: 'ml' };
const AUTO_CONV_UNITS = new Set(['kg', 'ltr', 'litre']); // BUG-275: backend handles conversion (1000)
const NO_CONV_UNITS = new Set(['gm', 'ml']); // BUG-275: already small, no conversion

function IngredientsTab() {
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [search, setSearch] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [loading, setLoading] = useState(true);
  // BUG-197 #1: Add Ingredient state — BUG-212 B: expanded to 7 fields
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIng, setNewIng] = useState({ name: '', categoryId: '', unit: '', smallUnit: '', conversionFactor: '', minQtyAlert: '', minUnitAlert: '' });
  // BUG-212 A: Edit Ingredient state
  const [editingId, setEditingId] = useState(null);
  const [editIng, setEditIng] = useState({ name: '', categoryId: '', unit: '', smallUnit: '', conversionFactor: '', minQtyAlert: '', minUnitAlert: '' });
  const [exporting, setExporting] = useState(false);
  const [deleteBlocker, setDeleteBlocker] = useState(null); // BUG-218
  // CR-086 F4: Bulk editor toggle
  const [viewMode, setViewMode] = useState('list');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ings, cats, unitList] = await Promise.all([
        inventoryService.getIngredients(),
        inventoryService.getCategories(),
        inventoryService.getUnits(),
      ]);
      setIngredients(ings);
      setCategories(cats);
      setUnits(Array.isArray(unitList) ? unitList : []);
    } catch (err) {
      toast.error('Failed to load ingredients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Count per category
  const catCounts = useMemo(() => {
    const counts = {};
    for (const ing of ingredients) {
      const cid = ing.categoryId;
      counts[cid] = (counts[cid] || 0) + 1;
    }
    return counts;
  }, [ingredients]);

  // Filtered by selected category + search
  const filtered = useMemo(() => {
    return ingredients.filter(ing => {
      if (selectedCat && ing.categoryId !== selectedCat) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!ing.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [ingredients, selectedCat, search]);

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    // BUG-220: pre-call duplicate check (backend 409 remains as safety net)
    const dupName = newCatName.trim().toLowerCase();
    if (categories.some(c => (c.name || '').trim().toLowerCase() === dupName)) {
      toast.error(`Category "${newCatName.trim()}" already exists`);
      return;
    }
    try {
      await inventoryService.storeCategory({ name: newCatName.trim() });
      toast.success(`Category "${newCatName}" added`);
      setNewCatName('');
      await fetchData();
    } catch (err) {
      toast.error(err?.readableMessage || 'Failed to add category');
    }
  };

  // CR-090: Delete category handler (DELETE only — edit deferred)
  const deleteCategory = async (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    try {
      const res = await inventoryService.deleteCategory(cat.id);
      if (res?.data?.success === false) {
        toast.error(res.data.message || 'Cannot delete category');
        return;
      }
      toast.success(`Category "${cat.name}" deleted`);
      if (selectedCat === cat.id) setSelectedCat(null);
      await fetchData();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.readableMessage || 'Failed to delete category';
      toast.error(msg);
    }
  };

  const deleteIngredient = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await inventoryService.deleteIngredient(id);
      toast.success(`"${name}" deleted`);
      await fetchData();
    } catch (err) {
      // BUG-218: parse used_in_recipes from backend 400 response
      const apiData = err?.response?.data?.data;
      const recipes = apiData?.used_in_recipes;
      if (recipes && recipes.length > 0) {
        setDeleteBlocker({ name, recipes, count: apiData.recipe_count || recipes.length });
      } else {
        toast.error(err?.readableMessage || 'Failed to delete');
      }
    }
  };

  // BUG-197 #1: Add Ingredient handler — BUG-212 B: passes all 7 fields
  const addIngredient = async () => {
    if (!newIng.name.trim() || !newIng.categoryId || !newIng.unit) {
      toast.error('Name, category, and unit are required');
      return;
    }
    try {
      await inventoryService.addIngredient(newIng);
      toast.success(`"${newIng.name}" added`);
      setNewIng({ name: '', categoryId: '', unit: '', smallUnit: '', conversionFactor: '', minQtyAlert: '', minUnitAlert: '' });
      setShowAddForm(false);
      await fetchData();
    } catch (err) {
      toast.error(err?.readableMessage || 'Failed to add ingredient');
    }
  };

  // BUG-212 A: Edit Ingredient handler
  const startEdit = (ing) => {
    setEditingId(ing.id);
    // BUG-269-C: Ensure minUnitAlert always matches smallUnit on edit start
    setEditIng({
      name: ing.name, categoryId: ing.categoryId, unit: ing.unit,
      smallUnit: ing.smallUnit || '', conversionFactor: ing.conversionFactor || '',
      minQtyAlert: ing.minQtyAlert || '', minUnitAlert: ing.smallUnit || ing.minUnitAlert || '',
    });
    setShowAddForm(false);
  };

  const saveEdit = async () => {
    if (!editIng.name.trim() || !editIng.categoryId || !editIng.unit) {
      toast.error('Name, category, and unit are required');
      return;
    }
    try {
      await inventoryService.updateIngredient(editingId, editIng);
      toast.success(`"${editIng.name}" updated`);
      setEditingId(null);
      await fetchData();
    } catch (err) {
      toast.error(err?.readableMessage || 'Failed to update ingredient');
    }
  };

  const cancelEdit = () => setEditingId(null);

  // BUG-212 C: Real export handler (dual-response pattern from CurrentStockPanel)
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await inventoryService.exportIngredients();
      const downloadUrl = res?.data?.download_url || res?.download_url;
      if (downloadUrl) {
        window.open(downloadUrl, '_blank', 'noopener,noreferrer');
      } else if (res?.data) {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a'); a.href = url; a.download = 'ingredients.xlsx'; a.click();
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Unexpected export response');
      }
      toast.success('Ingredients exported');
    } catch (err) {
      toast.error(err?.readableMessage || 'Export failed — please retry');
    } finally {
      setExporting(false);
    }
  };

  // CR-086 F4: Bulk editor mode
  if (viewMode === 'bulk') {
    return (
      <IngredientBulkEditor
        allItems={ingredients}
        categories={categories}
        units={units}
        onRefresh={() => { fetchData(); setViewMode('list'); }}
        onClose={() => setViewMode('list')}
      />
    );
  }

  return (
    <>
    <div className="flex gap-5" data-testid="ingredients-tab">
      {/* Category Sidebar */}
      <div className="w-56 flex-shrink-0">
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Categories ({categories.length})</span>
          </div>
          <div className="space-y-0.5 mb-3 max-h-[400px] overflow-y-auto">
            <button onClick={() => setSelectedCat(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition-colors ${!selectedCat ? 'bg-orange-50 text-orange-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
              data-testid="cat-all">
              <span>All</span>
              <span className="text-xs text-slate-400">{ingredients.length}</span>
            </button>
            {categories.map(cat => (
              <div key={cat.id} className="group flex items-center gap-0.5" data-testid={`cat-${cat.id}`}>
                <button onClick={() => setSelectedCat(cat.id)}
                  className={`flex-1 text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition-colors ${selectedCat === cat.id ? 'bg-orange-50 text-orange-700 font-medium border-l-2 border-orange-500' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <span className="truncate">{cat.name}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${selectedCat === cat.id ? 'bg-orange-200 text-orange-800' : 'bg-slate-100 text-slate-500'}`}>{catCounts[cat.id] || 0}</span>
                </button>
                <button onClick={() => deleteCategory(cat)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex-shrink-0"
                  data-testid={`cat-delete-${cat.id}`}
                  title={`Delete ${cat.name}`}>
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="New category..."
              className="h-8 text-xs" onKeyDown={e => e.key === 'Enter' && addCategory()} data-testid="new-category-input" />
            <Button size="sm" variant="outline" onClick={addCategory} className="h-8 px-2" data-testid="add-category-btn">
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Ingredients Table */}
      <div className="flex-1">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 flex items-center gap-3 border-b border-slate-100">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder={selectedCat ? `Search in ${categories.find(c => c.id === selectedCat)?.name || ''}...` : 'Search all ingredients...'}
                value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" data-testid="ingredient-search" />
            </div>
            {/* BUG-212 C: Real export wired */}
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" data-testid="ingredient-export-btn"
              onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {exporting ? 'Exporting…' : 'Export'}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs opacity-60 cursor-not-allowed" disabled
              data-testid="ingredient-import-btn"> {/* BUG-262: removed "Coming soon" tooltip */}
              <Upload className="w-3.5 h-3.5" /> Import
            </Button>
            {/* CR-086 F4: Bulk Edit button — enabled, toggles to bulk editor */}
            <Button variant="outline" size="sm" className="gap-1.5 text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
              onClick={() => setViewMode('bulk')}
              data-testid="ingredient-bulk-edit-btn">
              <Pencil className="w-3.5 h-3.5" /> Bulk Edit
            </Button>
            <Button onClick={() => setShowAddForm(true)} className="bg-green-600 hover:bg-green-700 text-white gap-1.5" data-testid="add-ingredient-btn">
              <Plus className="w-4 h-4" /> Add Ingredient
            </Button>
          </div>
          <div className="overflow-x-auto">
            {/* CR-085 A1: Ingredients table with grid borders */}
            <table className="w-full text-left border-collapse" data-testid="ingredient-table">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border border-slate-200">Ingredient Name</th>
                  <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border border-slate-200 text-center" style={{ width: 80 }}>Base Unit</th>
                  <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border border-slate-200">Conversion</th>
                  <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border border-slate-200 text-center" style={{ width: 80 }}>Small Unit</th>
                  <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border border-slate-200 text-right" style={{ width: 100 }}>Min Alert (Qty · Unit)</th>
                  <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border border-slate-200 text-center" style={{ width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
              {/* BUG-212 B: Add Ingredient inline form — expanded to 7 fields */}
                {showAddForm && (
                  <tr className="border-b border-slate-100 bg-green-50/30" data-testid="ingredient-add-row">
                    <td className="py-2 px-4">
                      <Input value={newIng.name} onChange={e => setNewIng(p => ({ ...p, name: e.target.value }))}
                        placeholder="Ingredient name..." className="h-8 text-sm" autoFocus data-testid="new-ingredient-name" />
                    </td>
                    <td className="py-2 px-4 text-center">
                      <select className="h-8 text-xs border border-slate-200 rounded-md px-2 w-full outline-none"
                        value={newIng.unit} onChange={e => { const u = e.target.value; const autoSmall = UNIT_SMALL_MAP[u] || ''; setNewIng(p => ({ ...p, unit: u, smallUnit: autoSmall || p.smallUnit, conversionFactor: autoSmall ? '' : p.conversionFactor, minUnitAlert: autoSmall || p.smallUnit || u })); }} data-testid="new-ingredient-unit">
                        <option value="">Unit...</option>
                        {units.map((u, i) => <option key={i} value={typeof u === 'string' ? u : u.name}>{typeof u === 'string' ? u : u.name}</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-4 text-center">
                      {!AUTO_CONV_UNITS.has(newIng.unit) && !NO_CONV_UNITS.has(newIng.unit) && newIng.unit ? (
                        <Input type="number" value={newIng.conversionFactor} onChange={e => setNewIng(p => ({ ...p, conversionFactor: e.target.value }))}
                          placeholder={`1 ${newIng.unit || 'unit'} = ? ${newIng.smallUnit || 'small'}`} className="h-8 text-xs" data-testid="new-ingredient-conversion"
                          title="How many small units in 1 large unit? e.g. 1 KG = 1000 GM → enter 1000" />
                      ) : (
                        <span className="text-xs text-slate-400" data-testid="new-ingredient-conversion">—</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-center">
                      {NO_CONV_UNITS.has(newIng.unit) ? (
                        <span className="text-xs text-slate-400" data-testid="new-ingredient-small-unit">—</span>
                      ) : AUTO_CONV_UNITS.has(newIng.unit) ? (
                        <span className="h-8 text-xs border border-slate-100 rounded-md px-2 w-full inline-flex items-center justify-center bg-slate-50 text-slate-500"
                          data-testid="new-ingredient-small-unit">{UNIT_SMALL_MAP[newIng.unit] || '—'}</span>
                      ) : (
                        <select className="h-8 text-xs border border-slate-200 rounded-md px-2 w-full outline-none"
                          value={newIng.smallUnit} onChange={e => setNewIng(p => ({ ...p, smallUnit: e.target.value, minUnitAlert: e.target.value || p.unit }))} data-testid="new-ingredient-small-unit">
                          <option value="">Small unit...</option>
                          {units.map((u, i) => <option key={i} value={typeof u === 'string' ? u : u.name}>{typeof u === 'string' ? u : u.name}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex gap-1">
                        <Input type="number" value={newIng.minQtyAlert} onChange={e => setNewIng(p => ({ ...p, minQtyAlert: e.target.value }))}
                          placeholder="Alert qty" className="h-8 text-xs w-16" data-testid="new-ingredient-min-qty" />
                        {/* BUG-269-C: Alert unit locked to smallUnit (read-only) */}
                        <span className="h-8 text-xs border border-slate-100 rounded-md px-2 w-16 inline-flex items-center justify-center bg-slate-50 text-slate-500"
                          data-testid="new-ingredient-min-unit">
                          {newIng.smallUnit || newIng.unit || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-4 text-center">
                      <div className="flex flex-col gap-1">
                        <select className="h-8 text-xs border border-slate-200 rounded-md px-2 w-full outline-none mb-1"
                          value={newIng.categoryId} onChange={e => setNewIng(p => ({ ...p, categoryId: Number(e.target.value) }))} data-testid="new-ingredient-category">
                          <option value="">Category...</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="outline" onClick={addIngredient} className="h-7 px-2 text-xs" data-testid="save-new-ingredient">Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setNewIng({ name: '', categoryId: '', unit: '', smallUnit: '', conversionFactor: '', minQtyAlert: '', minUnitAlert: '' }); }} className="h-7 px-2 text-xs">Cancel</Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {loading ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">Loading ingredients...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">{search ? 'No matches' : 'No ingredients in this category'}</td></tr>
                ) : filtered.map(ing => editingId === ing.id ? (
                  // BUG-212 A: Inline edit row (blue-bordered, same pattern as VendorFormRow)
                  <tr key={ing.id} className="border-b-2 border-blue-300 bg-blue-50/40" data-testid={`ingredient-edit-row-${ing.id}`}>
                    <td className="py-2 px-4">
                      <Input value={editIng.name} onChange={e => setEditIng(p => ({ ...p, name: e.target.value }))}
                        className="h-8 text-sm" autoFocus data-testid="edit-ingredient-name" />
                    </td>
                    <td className="py-2 px-4 text-center">
                      <select className="h-8 text-xs border border-slate-200 rounded-md px-2 w-full outline-none"
                        value={editIng.unit} onChange={e => { const u = e.target.value; const autoSmall = UNIT_SMALL_MAP[u] || ''; setEditIng(p => ({ ...p, unit: u, smallUnit: autoSmall || p.smallUnit, conversionFactor: autoSmall ? '' : p.conversionFactor, minUnitAlert: autoSmall || p.smallUnit || u })); }} data-testid="edit-ingredient-unit">
                        <option value="">Unit...</option>
                        {units.map((u, i) => <option key={i} value={typeof u === 'string' ? u : u.name}>{typeof u === 'string' ? u : u.name}</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-4 text-center">
                      {!AUTO_CONV_UNITS.has(editIng.unit) && !NO_CONV_UNITS.has(editIng.unit) && editIng.unit ? (
                        <Input type="number" value={editIng.conversionFactor} onChange={e => setEditIng(p => ({ ...p, conversionFactor: e.target.value }))}
                          placeholder={`1 ${editIng.unit || 'unit'} = ? ${editIng.smallUnit || 'small'}`} className="h-8 text-xs" data-testid="edit-ingredient-conversion"
                          title="How many small units in 1 large unit? e.g. 1 KG = 1000 GM → enter 1000" />
                      ) : (
                        <span className="text-xs text-slate-400" data-testid="edit-ingredient-conversion">—</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-center">
                      {NO_CONV_UNITS.has(editIng.unit) ? (
                        <span className="text-xs text-slate-400" data-testid="edit-ingredient-small-unit">—</span>
                      ) : AUTO_CONV_UNITS.has(editIng.unit) ? (
                        <span className="h-8 text-xs border border-slate-100 rounded-md px-2 w-full inline-flex items-center justify-center bg-slate-50 text-slate-500"
                          data-testid="edit-ingredient-small-unit">{UNIT_SMALL_MAP[editIng.unit] || '—'}</span>
                      ) : (
                        <select className="h-8 text-xs border border-slate-200 rounded-md px-2 w-full outline-none"
                          value={editIng.smallUnit} onChange={e => setEditIng(p => ({ ...p, smallUnit: e.target.value, minUnitAlert: e.target.value || p.unit }))} data-testid="edit-ingredient-small-unit">
                          <option value="">Small unit...</option>
                          {units.map((u, i) => <option key={i} value={typeof u === 'string' ? u : u.name}>{typeof u === 'string' ? u : u.name}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex gap-1">
                        <Input type="number" value={editIng.minQtyAlert} onChange={e => setEditIng(p => ({ ...p, minQtyAlert: e.target.value }))}
                          placeholder="Alert qty" className="h-8 text-xs w-16" data-testid="edit-ingredient-min-qty" />
                        {/* BUG-269-C: Alert unit locked to smallUnit (read-only) */}
                        <span className="h-8 text-xs border border-slate-100 rounded-md px-2 w-16 inline-flex items-center justify-center bg-slate-50 text-slate-500"
                          data-testid="edit-ingredient-min-unit">
                          {editIng.smallUnit || editIng.unit || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-4 text-center">
                      <div className="flex flex-col gap-1">
                        <select className="h-8 text-xs border border-slate-200 rounded-md px-2 w-full outline-none mb-1"
                          value={editIng.categoryId} onChange={e => setEditIng(p => ({ ...p, categoryId: Number(e.target.value) }))} data-testid="edit-ingredient-category">
                          <option value="">Category...</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="outline" onClick={saveEdit} className="h-7 px-2 text-xs text-blue-700 border-blue-300" data-testid="save-edit-ingredient">Save</Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 px-2 text-xs">Cancel</Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={ing.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors" data-testid={`ingredient-row-${ing.id}`}>
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">{ing.name}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">{ing.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-500">
                      {ing.hasUnitConversion ? `1 ${ing.unit} = ${ing.conversionFactor} ${ing.smallUnit}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {ing.smallUnit ? <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">{ing.smallUnit}</span> : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-sm font-medium ${ing.minQtyAlert > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                        {ing.minQtyAlert > 0 ? `${ing.minQtyAlert} ${ing.minUnitAlert || ing.unit}` : '—'} {/* BUG-219: show alert unit */}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {/* BUG-212 A: Pencil icon added */}
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-colors"
                          onClick={() => startEdit(ing)} data-testid={`ingredient-edit-${ing.id}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          onClick={() => deleteIngredient(ing.id, ing.name)} data-testid={`ingredient-delete-${ing.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">
            {filtered.length} ingredient{filtered.length !== 1 ? 's' : ''}{selectedCat ? ` in ${categories.find(c => c.id === selectedCat)?.name || ''}` : ''}
          </div>}
        </div>
      </div>
    </div>
      {/* BUG-218: Delete blocker dialog */}
      <Dialog open={!!deleteBlocker} onOpenChange={() => setDeleteBlocker(null)}>
        <DialogContent className="max-w-md" data-testid="delete-blocker-dialog">
          <DialogHeader>
            <DialogTitle>Cannot Delete &quot;{deleteBlocker?.name}&quot;</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-slate-600 space-y-2">
            <p>This ingredient is used in <strong>{deleteBlocker?.count}</strong> recipe{deleteBlocker?.count !== 1 ? 's' : ''}:</p>
            <ul className="list-disc pl-5 space-y-1 max-h-40 overflow-y-auto">
              {deleteBlocker?.recipes?.map((r, i) => <li key={i} className="text-slate-700">{r}</li>)}
            </ul>
            <p className="text-xs text-slate-400 mt-2">Remove this ingredient from all recipes before deleting.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteBlocker(null)} data-testid="delete-blocker-close">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// CR-084: Vendor Management — Inline Expandable Row (Option B)
const VENDOR_TYPE_BADGE = {
  'wholesale supplier': 'bg-blue-100 text-blue-700',
  'retail store': 'bg-green-100 text-green-700',
  'grocery store': 'bg-purple-100 text-purple-700',
  'restaurant': 'bg-orange-100 text-orange-700',
  'online vendor': 'bg-sky-100 text-sky-700',
};
const vendorBadgeCls = (type) => VENDOR_TYPE_BADGE[(type || '').toLowerCase()] || 'bg-slate-100 text-slate-600';

function VendorFormRow({ vendor, vendorTypes, onSave, onCancel, isEdit }) {
  const [form, setForm] = useState({
    name: vendor?.name || '', contactPerson: vendor?.contactPerson || '',
    phone: vendor?.phone || '', email: vendor?.email || '',
    address: vendor?.address || '', vendorType: vendor?.vendorType || '', gst: vendor?.gst || '',
  });
  const [saving, setSaving] = useState(false);
  const u = (field, val) => setForm(p => ({ ...p, [field]: val }));
  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Vendor name is required'); return; }
    setSaving(true);
    try { await onSave({ ...form, id: vendor?.id }); }
    finally { setSaving(false); }
  };
  const borderColor = isEdit ? 'border-blue-300' : 'border-orange-300';
  const bgColor = isEdit ? 'bg-blue-50/40' : 'bg-orange-50/40';
  const labelColor = isEdit ? 'text-blue-700' : 'text-orange-700';
  return (
    <tr className={`border-b-2 ${borderColor} ${bgColor}`} data-testid={isEdit ? `vendor-edit-row-${vendor?.id}` : 'vendor-add-row'}>
      <td colSpan={6} className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs font-bold uppercase tracking-wider ${labelColor}`}>{isEdit ? `Editing: ${vendor?.name}` : 'New Vendor'}</span>
          <div className="flex-1 h-px" style={{ background: isEdit ? '#BFDBFE' : '#FED7AA' }}></div>
          <button onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
        </div>
        <div className="grid grid-cols-6 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Name <span className="text-red-500">*</span></label>
            <Input value={form.name} onChange={e => u('name', e.target.value)} placeholder="Vendor name"
              className="mt-0.5 h-8 text-xs" data-testid="vendor-form-name" autoFocus />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Contact</label>
            <Input value={form.contactPerson} onChange={e => u('contactPerson', e.target.value)} placeholder="Person name"
              className="mt-0.5 h-8 text-xs" data-testid="vendor-form-contact" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Phone</label>
            <Input value={form.phone} onChange={e => u('phone', e.target.value)} placeholder="9876543210"
              className="mt-0.5 h-8 text-xs" data-testid="vendor-form-phone" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Type</label>
            <select className="mt-0.5 h-8 w-full text-xs border border-slate-200 rounded-md px-2 outline-none focus:border-orange-400 bg-white"
              value={form.vendorType} onChange={e => u('vendorType', e.target.value)} data-testid="vendor-form-type">
              <option value="">Select...</option>
              {(vendorTypes || []).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase">GST</label>
            <Input value={form.gst} onChange={e => u('gst', e.target.value)} placeholder="GST27..."
              className="mt-0.5 h-8 text-xs" data-testid="vendor-form-gst" />
          </div>
          <div className="flex items-end">
            <Button size="sm" onClick={handleSave} disabled={saving}
              className="h-8 px-4 text-xs bg-green-600 hover:bg-green-700 text-white" data-testid="vendor-form-save">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-3 mt-2">
          <div className="col-span-2">
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Email</label>
            <Input value={form.email} onChange={e => u('email', e.target.value)} placeholder="vendor@email.com"
              className="mt-0.5 h-8 text-xs" data-testid="vendor-form-email" />
          </div>
          <div className="col-span-4">
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Address</label>
            <Input value={form.address} onChange={e => u('address', e.target.value)} placeholder="Street, City, State"
              className="mt-0.5 h-8 text-xs" data-testid="vendor-form-address" />
          </div>
        </div>
      </td>
    </tr>
  );
}

function VendorsTab() {
  const [vendors, setVendors] = useState([]);
  const [vendorTypes, setVendorTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [showAddRow, setShowAddRow] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [v, t] = await Promise.all([inventoryService.getVendors(), inventoryService.getVendorTypes()]);
      setVendors(v);
      setVendorTypes(t);
    } catch (err) { toast.error('Failed to load vendors'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (data) => {
    await inventoryService.addVendor(data);
    toast.success(`Vendor "${data.name}" added`);
    setShowAddRow(false);
    await fetchData();
  };
  const handleUpdate = async (data) => {
    await inventoryService.updateVendor(data.id, data);
    toast.success(`Vendor "${data.name}" updated`);
    setEditingId(null);
    await fetchData();
  };
  const handleDelete = async (vendor) => {
    if (!window.confirm(`Delete vendor "${vendor.name}"? This cannot be undone.`)) return;
    try { await inventoryService.deleteVendor(vendor.id); toast.success(`"${vendor.name}" deleted`); await fetchData(); }
    catch (err) { toast.error(err?.readableMessage || 'Failed to delete vendor'); }
  };

  const filtered = vendors.filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.contactPerson.toLowerCase().includes(search.toLowerCase()));
  const TH = "py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border-b-2 border-slate-200 whitespace-nowrap";
  const TD = "py-3 px-4 border-b border-slate-200 text-sm";
  const TDS = "py-3 px-4 border-b border-slate-200 border-l border-slate-100 text-sm";

  return (
    <div data-testid="vendors-tab">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 flex items-center gap-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm" data-testid="vendor-search" />
          </div>
          <span className="text-xs text-slate-400">{vendors.length} vendors</span>
          <Button onClick={() => { setShowAddRow(true); setEditingId(null); }} className="ml-auto bg-green-600 hover:bg-green-700 text-white gap-1.5" data-testid="add-vendor-btn">
            <Plus className="w-4 h-4" /> Add Vendor
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" data-testid="vendor-table">
            <thead>
              <tr>
                <th className={TH}>Vendor Name</th>
                <th className={TH}>Contact Person</th>
                <th className={TH}>Phone</th>
                <th className={TH}>Type</th>
                <th className={TH}>GST</th>
                <th className={`${TH} text-center`} style={{ width: 90 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {showAddRow && <VendorFormRow vendorTypes={vendorTypes} onSave={handleAdd} onCancel={() => setShowAddRow(false)} isEdit={false} />}
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">Loading vendors...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">{search ? 'No vendors match search' : 'No vendors yet'}</td></tr>
              ) : filtered.map(v => editingId === v.id ? (
                <VendorFormRow key={v.id} vendor={v} vendorTypes={vendorTypes} onSave={handleUpdate} onCancel={() => setEditingId(null)} isEdit={true} />
              ) : (
                <tr key={v.id} className="border-b border-slate-200 hover:bg-slate-50/50 transition-colors" data-testid={`vendor-row-${v.id}`}>
                  <td className={`${TD} font-semibold text-slate-900`}>{v.name}</td>
                  <td className={`${TDS} text-slate-600`}>{v.contactPerson || '\u2014'}</td>
                  <td className={`${TDS} text-slate-600`}>{v.phone || '\u2014'}</td>
                  <td className={TDS}>
                    {v.vendorType ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${vendorBadgeCls(v.vendorType)}`}>{v.vendorType}</span> : <span className="text-slate-400">{"\u2014"}</span>}
                  </td>
                  <td className={`${TDS} text-slate-500`}>{v.gst || '\u2014'}</td>
                  <td className={`${TDS} text-center`}>
                    <button onClick={() => { setEditingId(v.id); setShowAddRow(false); }}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600" data-testid={`vendor-edit-${v.id}`}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(v)}
                      className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500" data-testid={`vendor-delete-${v.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">{filtered.length} of {vendors.length} vendors</div>}
      </div>
    </div>
  );
}

// ── Wastage Reasons Tab — BUG-197 #3: Full CRUD ─────────────────
function WastageTab() {
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newReason, setNewReason] = useState('');
  const [showAddRow, setShowAddRow] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getWastageReasons();
      setReasons(data);
    } catch { toast.error('Failed to load wastage reasons'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addReason = async () => {
    if (!newReason.trim()) return;
    try {
      await inventoryService.addWastageReason({ reason: newReason.trim() });
      toast.success(`Reason "${newReason}" added`);
      setNewReason('');
      setShowAddRow(false);
      await fetchData();
    } catch (err) { toast.error(err?.readableMessage || 'Failed to add reason'); }
  };

  const saveEdit = async (id) => {
    if (!editingText.trim()) return;
    try {
      await inventoryService.updateWastageReason(id, { reason: editingText.trim() });
      toast.success('Reason updated');
      setEditingId(null);
      await fetchData();
    } catch (err) { toast.error(err?.readableMessage || 'Failed to update'); }
  };

  const toggleStatus = async (r) => {
    try {
      await inventoryService.toggleWastageStatus(r.id, r.status ? 0 : 1);
      toast.success(`"${r.reason}" ${r.status ? 'disabled' : 'enabled'}`);
      await fetchData();
    } catch (err) { toast.error(err?.readableMessage || 'Failed to toggle status'); }
  };

  const deleteReason = async (r) => {
    if (!window.confirm(`Delete "${r.reason}"?`)) return;
    try {
      await inventoryService.deleteWastageReason(r.id);
      toast.success(`"${r.reason}" deleted`);
      await fetchData();
    } catch (err) { toast.error(err?.readableMessage || 'Failed to delete'); }
  };

  return (
    <div data-testid="wastage-tab">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b border-slate-100">
          <span className="text-sm font-medium text-slate-700">Wastage Reasons ({reasons.length})</span>
          <Button onClick={() => setShowAddRow(true)} className="bg-green-600 hover:bg-green-700 text-white gap-1.5" size="sm" data-testid="add-wastage-btn">
            <Plus className="w-3.5 h-3.5" /> Add Reason
          </Button>
        </div>
        {/* CR-081 WU-7: Card-style list */}
        <div className="p-4 space-y-2" data-testid="wastage-cards">
          {showAddRow && (
            <div className="rounded-lg border-2 border-orange-300 bg-orange-50/30 p-3 flex items-center gap-3" data-testid="wastage-add-row">
              <Input value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="New reason..."
                className="h-8 text-sm flex-1 border-orange-200 focus:border-orange-400" autoFocus onKeyDown={e => e.key === 'Enter' && addReason()} data-testid="wastage-new-input" />
              <Button size="sm" variant="outline" onClick={addReason} className="h-7 px-3 text-xs border-orange-300 text-orange-700 hover:bg-orange-100" data-testid="wastage-save-new">Save</Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAddRow(false); setNewReason(''); }} className="h-7 px-2 text-xs">Cancel</Button>
            </div>
          )}
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading...</div>
          ) : reasons.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No wastage reasons configured</div>
          ) : reasons.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors" data-testid={`wastage-row-${r.id}`}>
              <div className="flex items-center gap-3 flex-1">
                {editingId === r.id ? (
                  <Input value={editingText} onChange={e => setEditingText(e.target.value)} className="h-8 text-sm flex-1"
                    autoFocus onKeyDown={e => e.key === 'Enter' && saveEdit(r.id)} data-testid={`wastage-edit-input-${r.id}`} />
                ) : (
                  <span className={`text-sm font-medium ${r.status ? 'text-slate-900' : 'text-slate-400 line-through'}`}>{r.reason}</span>
                )}
                <button onClick={() => toggleStatus(r)} data-testid={`wastage-toggle-${r.id}`}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-colors flex-shrink-0 ${r.status ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                  {r.status ? 'Active' : 'Inactive'}
                </button>
              </div>
              <div className="flex items-center gap-1 ml-3">
                {editingId === r.id ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => saveEdit(r.id)} className="h-7 px-2 text-xs" data-testid={`wastage-save-edit-${r.id}`}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 px-2 text-xs">Cancel</Button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditingId(r.id); setEditingText(r.reason); }}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" data-testid={`wastage-edit-${r.id}`}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteReason(r)}
                      className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" data-testid={`wastage-delete-${r.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Setup Panel ─────────────────────────────────────────────
export default function InventorySetupPanel({ defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab || 'ingredients');
  // CR-081: Sync tab when URL query param changes (pill click while already on setup page)
  useEffect(() => { if (defaultTab) setActiveTab(defaultTab); }, [defaultTab]);

  return (
    <div data-testid="inventory-setup-panel">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* CR-081: Sub-tabs removed — top InventoryTabBar handles Ingredients/Vendors/Wastage navigation */}
        <TabsContent value="ingredients" className="mt-0"><IngredientsTab /></TabsContent>
        <TabsContent value="vendors" className="mt-0"><VendorsTab /></TabsContent>
        <TabsContent value="wastage" className="mt-0"><WastageTab /></TabsContent>
      </Tabs>
    </div>
  );
}
