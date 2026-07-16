// CR-072: Inventory Setup Panel — 3 tabs: Ingredients / Vendors / Wastage Reasons
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Pencil, Trash2, Download, Upload, Package } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as inventoryService from '@/api/services/inventoryService';
import VendorFormDialog from './VendorFormDialog';

// ── Ingredients Tab ──────────────────────────────────────────────
function IngredientsTab() {
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [search, setSearch] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [loading, setLoading] = useState(true);
  // BUG-197 #1: Add Ingredient state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIng, setNewIng] = useState({ name: '', categoryId: '', unit: '' });

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
    try {
      await inventoryService.storeCategory({ name: newCatName.trim() });
      toast.success(`Category "${newCatName}" added`);
      setNewCatName('');
      await fetchData();
    } catch (err) {
      toast.error(err?.readableMessage || 'Failed to add category');
    }
  };

  const deleteIngredient = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await inventoryService.deleteIngredient(id);
      toast.success(`"${name}" deleted`);
      await fetchData();
    } catch (err) {
      toast.error(err?.readableMessage || 'Failed to delete');
    }
  };

  // BUG-197 #1: Add Ingredient handler
  const addIngredient = async () => {
    if (!newIng.name.trim() || !newIng.categoryId || !newIng.unit) {
      toast.error('Name, category, and unit are required');
      return;
    }
    try {
      await inventoryService.addIngredient(newIng);
      toast.success(`"${newIng.name}" added`);
      setNewIng({ name: '', categoryId: '', unit: '' });
      setShowAddForm(false);
      await fetchData();
    } catch (err) {
      toast.error(err?.readableMessage || 'Failed to add ingredient');
    }
  };

  return (
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
              <button key={cat.id} onClick={() => setSelectedCat(cat.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition-colors ${selectedCat === cat.id ? 'bg-orange-50 text-orange-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                data-testid={`cat-${cat.id}`}>
                <span className="truncate">{cat.name}</span>
                <span className="text-xs text-slate-400 ml-1">{catCounts[cat.id] || 0}</span>
              </button>
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
            {/* BUG-197 #1: Add Ingredient button */}
            <Button onClick={() => setShowAddForm(true)} className="ml-auto bg-green-600 hover:bg-green-700 text-white gap-1.5" data-testid="add-ingredient-btn">
              <Plus className="w-4 h-4" /> Add Ingredient
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left" data-testid="ingredient-table">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">Ingredient Name</th>
                  <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center" style={{ width: 80 }}>Base Unit</th>
                  <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">Conversion</th>
                  <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center" style={{ width: 80 }}>Small Unit</th>
                  <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-right" style={{ width: 100 }}>Min Alert</th>
                  <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center" style={{ width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* BUG-197 #1: Add Ingredient inline form */}
                {showAddForm && (
                  <tr className="border-b border-slate-100 bg-green-50/30" data-testid="ingredient-add-row">
                    <td className="py-2 px-4">
                      <Input value={newIng.name} onChange={e => setNewIng(p => ({ ...p, name: e.target.value }))}
                        placeholder="Ingredient name..." className="h-8 text-sm" autoFocus data-testid="new-ingredient-name" />
                    </td>
                    <td className="py-2 px-4 text-center" colSpan={2}>
                      <select className="h-8 text-xs border border-slate-200 rounded-md px-2 w-full outline-none"
                        value={newIng.categoryId} onChange={e => setNewIng(p => ({ ...p, categoryId: Number(e.target.value) }))} data-testid="new-ingredient-category">
                        <option value="">Category...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-4 text-center">
                      <select className="h-8 text-xs border border-slate-200 rounded-md px-2 w-full outline-none"
                        value={newIng.unit} onChange={e => setNewIng(p => ({ ...p, unit: e.target.value }))} data-testid="new-ingredient-unit">
                        <option value="">Unit...</option>
                        {units.map((u, i) => <option key={i} value={typeof u === 'string' ? u : u.name}>{typeof u === 'string' ? u : u.name}</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-4" />
                    <td className="py-2 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="outline" onClick={addIngredient} className="h-7 px-2 text-xs" data-testid="save-new-ingredient">Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setNewIng({ name: '', categoryId: '', unit: '' }); }} className="h-7 px-2 text-xs">Cancel</Button>
                      </div>
                    </td>
                  </tr>
                )}
                {loading ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">Loading ingredients...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">{search ? 'No matches' : 'No ingredients in this category'}</td></tr>
                ) : filtered.map(ing => (
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
                        {ing.minQtyAlert > 0 ? `${ing.minQtyAlert} ${ing.unit}` : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
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
  );
}

// ── Vendors Tab ──────────────────────────────────────────────────
function VendorsTab() {
  const [vendorTypes, setVendorTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [editVendor, setEditVendor] = useState(undefined); // undefined=closed, null=add, object=edit
  const [loading, setLoading] = useState(true);

  // Vendors come from vendor-type endpoint (which returns vendor types not vendors themselves)
  // For now display vendor types as the vendor management view
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const types = await inventoryService.getVendorTypes();
      setVendorTypes(types);
    } catch (err) {
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // BUG-197 #2: Wire to actual API
  const handleSave = async (data) => {
    try {
      await inventoryService.addVendor(data);
      toast.success(`Vendor "${data.name}" saved`);
      setEditVendor(undefined);
      await fetchData();
    } catch (err) {
      toast.error(err?.readableMessage || 'Failed to save vendor');
    }
  };

  return (
    <div data-testid="vendors-tab">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 flex items-center gap-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm" data-testid="vendor-search" />
          </div>
          <Button onClick={() => setEditVendor(null)} className="ml-auto bg-green-600 hover:bg-green-700 text-white gap-1.5" data-testid="add-vendor-btn">
            <Plus className="w-4 h-4" /> Add Vendor
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left" data-testid="vendor-table">
            <thead>
              <tr className="bg-slate-50/80">
                {['Vendor Type', 'Description', 'Status'].map((h, i) => (
                  <th key={i} className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="py-12 text-center text-sm text-slate-400">Loading vendors...</td></tr>
              ) : vendorTypes.length === 0 ? (
                <tr><td colSpan={3} className="py-12 text-center text-sm text-slate-400">No vendor types configured</td></tr>
              ) : vendorTypes.filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase())).map(v => (
                <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors" data-testid={`vendor-row-${v.id}`}>
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">{v.name}</td>
                  <td className="py-3 px-4 text-sm text-slate-500">{v.description || '—'}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <VendorFormDialog open={editVendor !== undefined} onOpenChange={(open) => { if (!open) setEditVendor(undefined); }}
        vendor={editVendor} vendorTypes={vendorTypes} onSave={handleSave} />
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
        <table className="w-full text-left" data-testid="wastage-table">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">Reason</th>
              <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center" style={{ width: 100 }}>Status</th>
              <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center" style={{ width: 140 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {showAddRow && (
              <tr className="border-b border-slate-100 bg-green-50/30" data-testid="wastage-add-row">
                <td className="py-2 px-4">
                  <Input value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="New reason..."
                    className="h-8 text-sm" autoFocus onKeyDown={e => e.key === 'Enter' && addReason()} data-testid="wastage-new-input" />
                </td>
                <td />
                <td className="py-2 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button size="sm" variant="outline" onClick={addReason} className="h-7 px-2 text-xs" data-testid="wastage-save-new">Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowAddRow(false); setNewReason(''); }} className="h-7 px-2 text-xs">Cancel</Button>
                  </div>
                </td>
              </tr>
            )}
            {loading ? (
              <tr><td colSpan={3} className="py-12 text-center text-sm text-slate-400">Loading...</td></tr>
            ) : reasons.length === 0 ? (
              <tr><td colSpan={3} className="py-12 text-center text-sm text-slate-400">No wastage reasons configured</td></tr>
            ) : reasons.map(r => (
              <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors" data-testid={`wastage-row-${r.id}`}>
                <td className="py-3 px-4">
                  {editingId === r.id ? (
                    <Input value={editingText} onChange={e => setEditingText(e.target.value)} className="h-8 text-sm"
                      autoFocus onKeyDown={e => e.key === 'Enter' && saveEdit(r.id)} data-testid={`wastage-edit-input-${r.id}`} />
                  ) : (
                    <span className={`text-sm font-medium ${r.status ? 'text-slate-900' : 'text-slate-400 line-through'}`}>{r.reason}</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  <button onClick={() => toggleStatus(r)} data-testid={`wastage-toggle-${r.id}`}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full cursor-pointer transition-colors ${r.status ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                    {r.status ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {editingId === r.id ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => saveEdit(r.id)} className="h-7 px-2 text-xs" data-testid={`wastage-save-edit-${r.id}`}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 px-2 text-xs">Cancel</Button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingId(r.id); setEditingText(r.reason); }}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" data-testid={`wastage-edit-${r.id}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteReason(r)}
                          className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" data-testid={`wastage-delete-${r.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Setup Panel ─────────────────────────────────────────────
export default function InventorySetupPanel() {
  const [activeTab, setActiveTab] = useState('ingredients');

  return (
    <div data-testid="inventory-setup-panel">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent border-b border-slate-200 rounded-none w-full justify-start gap-0 h-auto p-0 mb-6">
          {[
            { value: 'ingredients', label: 'Ingredients', icon: Package },
            { value: 'vendors', label: 'Vendors' },
            { value: 'wastage', label: 'Wastage Reasons' },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}
              data-testid={`setup-tab-${tab.value}`}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="ingredients" className="mt-0"><IngredientsTab /></TabsContent>
        <TabsContent value="vendors" className="mt-0"><VendorsTab /></TabsContent>
        <TabsContent value="wastage" className="mt-0"><WastageTab /></TabsContent>
      </Tabs>
    </div>
  );
}
