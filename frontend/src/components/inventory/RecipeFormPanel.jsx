// CR-072: Recipe Form Panel — Add/Edit recipe with ingredient rows
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, Check, Search, ChevronDown, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as recipeService from '@/api/services/recipeService';
import * as inventoryService from '@/api/services/inventoryService';

// BUG-238: Searchable select replacing plain <select> dropdowns for large lists
// BUG-322: position:fixed + getBoundingClientRect — escapes overflow-hidden ingredient table container (L305)
function SearchableSelect({ items, value, onChange, placeholder, error, testId, renderItem }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 }); // BUG-322
  const containerRef = useRef(null);
  const triggerRef = useRef(null);  // BUG-322: ref on trigger button for getBoundingClientRect
  const dropRef = useRef(null);     // BUG-322: ref on fixed panel for outside-click detection
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i => (i.label || '').toLowerCase().includes(q));
  }, [items, search]);

  const selected = value ? items.find(i => String(i.value) === String(value)) : null;

  // BUG-322: compute fixed coords from trigger button before opening
  const openDrop = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    // BUG-322: check both trigger wrapper AND fixed dropdown panel
    const handleClick = (e) => {
      const inTrigger = containerRef.current && containerRef.current.contains(e.target);
      const inDrop = dropRef.current && dropRef.current.contains(e.target);
      if (!inTrigger && !inDrop) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  return (
    <div className="relative" ref={containerRef} data-testid={testId}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => open ? setOpen(false) : openDrop()} // BUG-322: openDrop computes position
        className={`w-full flex items-center justify-between gap-1.5 h-9 px-3 text-sm rounded-md border bg-white text-left transition-colors ${error ? 'border-red-500 ring-1 ring-red-200' : 'border-slate-200 hover:border-orange-300'} ${!selected ? 'text-slate-400' : 'text-slate-800'}`}
      >
        <span className="truncate flex-1">{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          ref={dropRef}
          className="bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden"
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999, minWidth: 240 }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50/50">
            <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Type to search..."
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-slate-400"
              data-testid={testId ? `${testId}-search` : undefined}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="p-0.5 rounded hover:bg-slate-200">
                <X className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-slate-400 text-center">No results found</li>
            ) : filtered.map(item => (
              <li
                key={item.value}
                onClick={() => { onChange(String(item.value), item); setSearch(''); setOpen(false); }}
                className={`px-3 py-2 text-sm cursor-pointer transition-colors flex items-center gap-2 ${String(item.value) === String(value) ? 'bg-orange-50 text-orange-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}
                data-testid={testId ? `${testId}-option-${item.value}` : undefined}
              >
                {String(item.value) === String(value) && <Check className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />}
                <span className="truncate">{renderItem ? renderItem(item) : item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function emptyIngRow() {
  return { _key: Date.now() + Math.random(), ingredientId: '', quantity: '', unit: '' };
}

export default function RecipeFormPanel({ recipe, recipeType, onBack }) {
  const isEdit = !!recipe?.id;
  const [ingredients, setIngredients] = useState([]);
  const [foods, setFoods] = useState([]);
  const [addons, setAddons] = useState([]);  // BUG-197 B2-4: separate addon items
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({}); // BUG-215

  // Form state
  const [name, setName] = useState(recipe?.name || '');
  const [foodId, setFoodId] = useState(recipe?.foodId || '');
  const [addonId, setAddonId] = useState(recipe?.addonId || '');
  const [qty, setQty] = useState(recipe?.qty || 1);
  const [unit, setUnit] = useState(recipe?.unit || '');
  const [prepTime, setPrepTime] = useState(recipe?.preparationTime || '');
  const [serveTime, setServeTime] = useState(recipe?.serveTime || '');
  const [servePeople, setServePeople] = useState(recipe?.servePeople || 1);
  const [ingRows, setIngRows] = useState(
    recipe?.ingredients?.length > 0
      ? recipe.ingredients.map(ing => ({ _key: Math.random(), ingredientId: ing.id, quantity: ing.quantity, unit: ing.unit }))
      : [emptyIngRow()]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [ingList, foodList, unitList] = await Promise.all([
          inventoryService.getIngredients(),
          recipeService.getActiveFoods(),
          inventoryService.getUnits(),
        ]);
        // BUG-197 B2-4: Load addon items separately for addon recipe type
        let addonList = [];
        if (recipeType === 'addon') {
          try { addonList = await recipeService.getActiveAddons(); } catch { toast.error('Failed to load addon items'); } // BUG-214
        }
        setIngredients(ingList);
        setFoods(foodList);
        setAddons(addonList);
        setUnits(Array.isArray(unitList) ? unitList : []);
        // BUG-197 #7: reverse-lookup foodId/addonId from name for edit mode
        // (GET recipe response may not include food_id, only food_name)
        if (isEdit && foodList.length) {
          if (recipeType !== 'sub' && !foodId && recipe?.foodName) {
            const match = foodList.find(f => f.name.toLowerCase() === recipe.foodName.toLowerCase());
            if (match) setFoodId(String(match.id));
          }
          if (recipeType === 'addon' && !addonId && recipe?.addonName) {
            const match = addonList.find(a => a.name.toLowerCase() === recipe.addonName.toLowerCase()); // BUG-214
            if (match) setAddonId(String(match.id));
          }
        }
      } catch { toast.error('Failed to load form data'); }
      finally { setLoading(false); }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addIngRow = () => setIngRows(prev => [...prev, emptyIngRow()]);
  const removeIngRow = (key) => { if (ingRows.length > 1) setIngRows(prev => prev.filter(r => r._key !== key)); };
  const updateIngRow = (key, field, value) => {
    setIngRows(prev => prev.map(r => {
      if (r._key !== key) return r;
      const updated = { ...r, [field]: value };
      if (field === 'ingredientId' && value) {
        const ing = ingredients.find(i => i.id === Number(value));
        if (ing) updated.unit = ing.smallUnit || ing.unit; // BUG-216
      }
      return updated;
    }));
  };

  const handleSave = async () => {
    // BUG-215: collect all validation errors inline instead of toast-per-field
    const newErrors = {};
    // BUG-237: Recipe Name only required for sub-recipes (standard/addon auto-derive from item selection)
    if (recipeType === 'sub' && !name.trim()) newErrors.name = 'Recipe name is required';
    if (recipeType === 'standard' && !foodId) newErrors.foodId = 'Select a menu item for this recipe';
    if (recipeType === 'addon' && !addonId) newErrors.addonId = 'Select an addon item for this recipe';
    if (!unit) newErrors.unit = 'Unit is required'; // BUG-217: blank unit → backend 500
    const validIngs = ingRows.filter(r => r.ingredientId && Number(r.quantity) > 0);
    if (validIngs.length === 0) newErrors.ingRows = 'Add at least one ingredient';
    if (Object.keys(newErrors).length > 0) {
      toast.error('Please fix the highlighted fields');
      setErrors(newErrors);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      // BUG-237: auto-derive recipe name from selected item for standard/addon
      let derivedName = name.trim();
      if (recipeType === 'standard') {
        const food = foods.find(f => String(f.id) === String(foodId));
        derivedName = food?.name || name.trim();
      } else if (recipeType === 'addon') {
        const addon = addons.find(a => String(a.id) === String(addonId));
        derivedName = addon?.name || name.trim();
      }
      const data = {
        name: derivedName, foodId: foodId ? Number(foodId) : null, addonId: addonId ? Number(addonId) : null,
        qty: Number(qty), unit, preparationTime: prepTime, serveTime, servePeople: Number(servePeople),
        ingredients: validIngs.map(r => ({ ingredientId: Number(r.ingredientId), quantity: Number(r.quantity), unit: r.unit })),
      };

      if (recipeType === 'sub') {
        isEdit ? await recipeService.updateSubRecipe(recipe.id, data) : await recipeService.storeSubRecipe(data);
      } else if (recipeType === 'addon') {
        isEdit ? await recipeService.updateAddonRecipe(recipe.id, data) : await recipeService.storeAddonRecipe(data);
      } else {
        isEdit ? await recipeService.updateRecipe(recipe.id, data) : await recipeService.storeRecipe(data);
      }
      toast.success(`Recipe "${derivedName}" ${isEdit ? 'updated' : 'created'}`);
      onBack?.();
    } catch (err) {
      toast.error(err?.readableMessage || 'Failed to save recipe');
    } finally { setSaving(false); }
  };

  const inputCls = "h-9 text-sm border-slate-200 focus:border-orange-400 focus:ring-1 focus:ring-orange-100 rounded-md bg-white";
  const selectCls = "h-9 text-sm border border-slate-200 focus:border-orange-400 rounded-md bg-white w-full px-2 outline-none";

  if (loading) return <div className="py-12 text-center text-sm text-slate-400">Loading form...</div>;

  return (
    <div data-testid="recipe-form-panel">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-500" data-testid="recipe-form-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-green-700" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {isEdit ? 'Edit' : 'Create'} {recipeType === 'sub' ? 'Sub-Recipe' : recipeType === 'addon' ? 'Addon Recipe' : 'Recipe'}
        </h2>
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* BUG-237: Recipe Name only shown for sub-recipes; standard/addon auto-derive from item */}
          {recipeType === 'sub' ? (
          <div>
            <Label className="text-xs text-slate-500">Recipe Name <span className="text-red-500">*</span></Label>
            <Input value={name} onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: undefined })); }} placeholder="e.g. Kunafa Classic" className={`mt-1 ${inputCls} ${errors.name ? 'border-red-500 ring-1 ring-red-200' : ''}`} data-testid="recipe-name" />
            {errors.name && <p className="text-xs text-red-500 mt-1" data-testid="recipe-error-name">{errors.name}</p>}
          </div>
          ) : null}
          {/* BUG-197 #10: addon dropdown sets addonId, standard sets foodId, sub hides dropdown */}
          {/* BUG-238: Searchable combobox replaces plain <select> for all item dropdowns */}
          {recipeType === 'addon' ? (
            <div>
              <Label className="text-xs text-slate-500">Addon Item <span className="text-red-500">*</span></Label>
              <div className="mt-1">
                <SearchableSelect
                  items={addons.length === 0 ? [] : addons.map(a => ({ value: a.id, label: `${a.name}${a.price ? ` (₹${a.price})` : ''}` }))}
                  value={addonId}
                  onChange={(val) => { setAddonId(val); setErrors(prev => ({ ...prev, addonId: undefined })); }}
                  placeholder="Search addon..."
                  error={errors.addonId}
                  testId="recipe-addon"
                />
              </div>
              {errors.addonId && <p className="text-xs text-red-500 mt-1" data-testid="recipe-error-addonId">{errors.addonId}</p>}
            </div>
          ) : recipeType !== 'sub' ? (
            <div>
              <Label className="text-xs text-slate-500">Menu Item <span className="text-red-500">*</span></Label>
              <div className="mt-1">
                <SearchableSelect
                  items={foods.map(f => ({ value: f.id, label: f.name }))}
                  value={foodId}
                  onChange={(val) => { setFoodId(val); setErrors(prev => ({ ...prev, foodId: undefined })); }}
                  placeholder="Search menu item..."
                  error={errors.foodId}
                  testId="recipe-food"
                />
              </div>
              {errors.foodId && <p className="text-xs text-red-500 mt-1" data-testid="recipe-error-foodId">{errors.foodId}</p>}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Qty</Label>
              <Input type="number" value={qty} onChange={e => setQty(e.target.value)} className={`mt-1 ${inputCls}`} data-testid="recipe-qty" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Unit <span className="text-red-500">*</span></Label> {/* BUG-217 */}
              <select className={`mt-1 ${selectCls} ${errors.unit ? 'border-red-500 ring-1 ring-red-200' : ''}`} value={unit} onChange={e => { setUnit(e.target.value); setErrors(prev => ({ ...prev, unit: undefined })); }} data-testid="recipe-unit">
                <option value="">Unit...</option>
                {units.map((u, i) => <option key={i} value={typeof u === 'string' ? u : u.name}>{typeof u === 'string' ? u : u.name}</option>)}
              </select>
              {errors.unit && <p className="text-xs text-red-500 mt-1" data-testid="recipe-error-unit">{errors.unit}</p>}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <Label className="text-xs text-slate-500">Prep Time</Label>
            <Input value={prepTime} onChange={e => setPrepTime(e.target.value)} placeholder="e.g. 15m" className={`mt-1 ${inputCls}`} />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Cook/Serve Time</Label>
            <Input value={serveTime} onChange={e => setServeTime(e.target.value)} placeholder="e.g. 5m" className={`mt-1 ${inputCls}`} />
          </div>
          {/* BUG-239: Serves only shown for standard recipes; sub/addon always default 1 */}
          {recipeType === 'standard' && (
          <div>
            <Label className="text-xs text-slate-500">Serves</Label>
            <Input type="number" value={servePeople} onChange={e => setServePeople(e.target.value)} className={`mt-1 ${inputCls}`} />
          </div>
          )}
        </div>
      </div>

      {/* Ingredients */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-5">
        {errors.ingRows && <div className="px-5 py-2 bg-red-50 text-xs text-red-600 font-medium border-b border-red-100" data-testid="recipe-error-ingRows">{errors.ingRows}</div>}
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ingredients ({ingRows.filter(r => r.ingredientId).length})</span>
          <button onClick={addIngRow} className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700"
            data-testid="recipe-add-ingredient">
            <Plus className="w-3.5 h-3.5" /> Add Ingredient
          </button>
        </div>
        <table className="w-full text-left" data-testid="recipe-ingredients-table">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="py-2 px-4 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200" style={{ width: '40%' }}>Ingredient</th>
              <th className="py-2 px-4 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200 text-center" style={{ width: '20%' }}>Quantity</th>
              <th className="py-2 px-4 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200 text-center" style={{ width: '15%' }}>Unit</th>
              <th className="py-2 px-4 border-b border-slate-200" style={{ width: '5%' }}></th>
            </tr>
          </thead>
          <tbody>
            {ingRows.map((row, idx) => (
              <tr key={row._key} className="border-b border-slate-50">
                <td className="py-2 px-4">
                  {/* BUG-238: Searchable ingredient dropdown */}
                  <SearchableSelect
                    items={ingredients.map(ing => ({ value: ing.id, label: `${ing.name} (${ing.smallUnit || ing.unit})`, raw: ing }))}
                    value={row.ingredientId}
                    onChange={(val, item) => updateIngRow(row._key, 'ingredientId', val)}
                    placeholder="Search ingredient..."
                    testId={`recipe-ing-select-${idx}`}
                  />
                </td>
                <td className="py-2 px-4">
                  <Input type="number" step="0.01" value={row.quantity} onChange={e => updateIngRow(row._key, 'quantity', e.target.value)}
                    placeholder="0" className={`text-center ${inputCls}`} data-testid={`recipe-ing-qty-${idx}`} />
                </td>
                <td className="py-2 px-4 text-center">
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">{row.unit || '—'}</span>
                </td>
                <td className="py-2 px-4">
                  {ingRows.length > 1 && (
                    <button onClick={() => removeIngRow(row._key)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-3 mb-8">
        <Button variant="outline" onClick={onBack} data-testid="recipe-form-cancel">Cancel</Button>
        <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white gap-1.5" data-testid="recipe-form-save">
          <Check className="w-4 h-4" /> {saving ? 'Saving...' : isEdit ? 'Update Recipe' : 'Save Recipe'}
        </Button>
      </div>
    </div>
  );
}
