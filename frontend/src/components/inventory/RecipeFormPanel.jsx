// CR-072: Recipe Form Panel — Add/Edit recipe with ingredient rows
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Trash2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as recipeService from '@/api/services/recipeService';
import * as inventoryService from '@/api/services/inventoryService';

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
          try { addonList = await recipeService.getActiveAddons(); } catch { /* addon list optional */ }
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
            const match = addonList.length > 0
              ? addonList.find(a => a.name.toLowerCase() === recipe.addonName.toLowerCase())
              : foodList.find(f => f.name.toLowerCase() === recipe.addonName.toLowerCase());
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
        if (ing) updated.unit = ing.unit;
      }
      return updated;
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Recipe name is required'); return; }
    // BUG-197 #8: validate food/addon selection
    if (recipeType === 'standard' && !foodId) { toast.error('Select a menu item for this recipe'); return; }
    if (recipeType === 'addon' && !addonId) { toast.error('Select an addon item for this recipe'); return; }
    const validIngs = ingRows.filter(r => r.ingredientId && Number(r.quantity) > 0);
    if (validIngs.length === 0) { toast.error('Add at least one ingredient'); return; }

    setSaving(true);
    try {
      const data = {
        name: name.trim(), foodId: foodId ? Number(foodId) : null, addonId: addonId ? Number(addonId) : null,
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
      toast.success(`Recipe "${name}" ${isEdit ? 'updated' : 'created'}`);
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
          <div>
            <Label className="text-xs text-slate-500">Recipe Name <span className="text-red-500">*</span></Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kunafa Classic" className={`mt-1 ${inputCls}`} data-testid="recipe-name" />
          </div>
          {/* BUG-197 #10: addon dropdown sets addonId, standard sets foodId, sub hides dropdown */}
          {recipeType === 'addon' ? (
            <div>
              <Label className="text-xs text-slate-500">Addon Item <span className="text-red-500">*</span></Label>
              <select className={`mt-1 ${selectCls}`} value={addonId} onChange={e => setAddonId(e.target.value)} data-testid="recipe-addon">
                <option value="">Select addon...</option>
                {/* BUG-197 B2-4: Use addon-specific items, fallback to foods if empty */}
                {(addons.length > 0 ? addons : foods).map(a => <option key={a.id} value={a.id}>{a.name}{a.price ? ` (₹${a.price})` : ''}</option>)}
              </select>
            </div>
          ) : recipeType !== 'sub' ? (
            <div>
              <Label className="text-xs text-slate-500">Menu Item <span className="text-red-500">*</span></Label>
              <select className={`mt-1 ${selectCls}`} value={foodId} onChange={e => setFoodId(e.target.value)} data-testid="recipe-food">
                <option value="">Select item...</option>
                {foods.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Qty</Label>
              <Input type="number" value={qty} onChange={e => setQty(e.target.value)} className={`mt-1 ${inputCls}`} data-testid="recipe-qty" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Unit</Label>
              <select className={`mt-1 ${selectCls}`} value={unit} onChange={e => setUnit(e.target.value)} data-testid="recipe-unit">
                <option value="">Unit...</option>
                {units.map((u, i) => <option key={i} value={typeof u === 'string' ? u : u.name}>{typeof u === 'string' ? u : u.name}</option>)}
              </select>
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
          <div>
            <Label className="text-xs text-slate-500">Serves</Label>
            <Input type="number" value={servePeople} onChange={e => setServePeople(e.target.value)} className={`mt-1 ${inputCls}`} />
          </div>
        </div>
      </div>

      {/* Ingredients */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-5">
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
                  <select className={selectCls} value={row.ingredientId} onChange={e => updateIngRow(row._key, 'ingredientId', e.target.value)}
                    data-testid={`recipe-ing-select-${idx}`}>
                    <option value="">Select ingredient...</option>
                    {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}
                  </select>
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
