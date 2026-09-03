// CR-072: Recipe Management Panel — 3 tabs (Standard / Sub / Addon) + recipe cards
// CR-073: Card/Bulk view toggle · integrates RecipeBulkEditor (spreadsheet mode)
import { useState, useEffect, useCallback, useMemo } from 'react'; // CR-088 v4: +useMemo
import { Search, Plus, Clock, Users, ChefHat, LayoutGrid, Table2, FileText, ChevronsUpDown, Check, FileDown } from 'lucide-react'; // CR-089: +FileDown
import jsPDF from 'jspdf'; // CR-089
import autoTable from 'jspdf-autotable'; // BUG-302: v5 requires named-function pattern, side-effect import does not patch doc.autoTable
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'; // CR-088 v4
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'; // CR-088 v4
import * as recipeService from '@/api/services/recipeService';
import * as inventoryService from '@/api/services/inventoryService'; // CR-088
import RecipeFormPanel from './RecipeFormPanel';
import RecipeBulkEditor from './RecipeBulkEditor';   // CR-073
import AggregatorInventoryTab from './AggregatorInventoryTab'; // CR-119

function RecipeCard({ recipe, onEdit }) {
  const maxShow = 3;
  const visibleIngs = (recipe.ingredients || []).slice(0, maxShow);
  const moreCount = (recipe.ingredients || []).length - maxShow;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow cursor-pointer"
      onClick={() => onEdit(recipe)} data-testid={`recipe-card-${recipe.id}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 truncate">{recipe.name}</h3>
          {recipe.foodName && <p className="text-xs text-slate-400 mt-0.5 truncate">Menu: {recipe.foodName}</p>}
          {recipe.addonName && <p className="text-xs text-slate-400 mt-0.5 truncate">Addon: {recipe.addonName}</p>}
        </div>
        {recipe.servePeople > 0 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600 flex-shrink-0 ml-2">
            {recipe.servePeople} Serve
          </span>
        )}
      </div>

      {/* Prep/Cook time */}
      {(recipe.preparationTime || recipe.serveTime) && (
        <div className="flex items-center gap-3 mb-3 text-xs text-slate-400">
          {recipe.preparationTime && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Prep: {recipe.preparationTime}</span>
          )}
          {recipe.serveTime && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Cook: {recipe.serveTime}</span>
          )}
        </div>
      )}

      {/* Ingredients */}
      {visibleIngs.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-slate-500 mb-1.5">Ingredients ({recipe.ingredients?.length || 0}):</p>
          <div className="space-y-1">
            {visibleIngs.map((ing, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-slate-600 truncate">{ing.name}</span>
                <span className="text-slate-400 flex-shrink-0 ml-2">{ing.quantity} {ing.unit}</span>
              </div>
            ))}
            {moreCount > 0 && <p className="text-xs text-orange-500">+ {moreCount} more</p>}
          </div>
        </div>
      )}

      {/* CR-085 A3: Cost/Sale display — uses recipe.cost and recipe.salePrice if available */}
      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-3">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${recipe.cost ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}>
          Cost: {recipe.cost ? `₹${Number(recipe.cost).toFixed(2)}` : '—'}
        </span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${recipe.salePrice ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-400'}`}>
          Sale: {recipe.salePrice ? `₹${Number(recipe.salePrice).toFixed(2)}` : '—'}
        </span>
        {recipe.cost > 0 && recipe.salePrice > 0 && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
            ((recipe.salePrice - recipe.cost) / recipe.salePrice * 100) >= 30 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
          }`}>
            Margin: {((recipe.salePrice - recipe.cost) / recipe.salePrice * 100).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}

function RecipeTab({ type, recipes, loading, onEdit, onCreate }) {
  const [search, setSearch] = useState('');

  const filtered = recipes.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || (r.foodName || '').toLowerCase().includes(q);
  });

  return (
    <div data-testid={`recipe-tab-${type}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm" data-testid={`recipe-search-${type}`} />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Loading recipes...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <ChefHat className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-400">{search ? 'No recipes match' : 'No recipes yet'}</p>
          <Button onClick={onCreate} variant="outline" size="sm" className="mt-3 gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Create First Recipe
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

// CR-088 v4: classify consumption tier — top 25% = High, bottom 25% = Low, rest = Medium
function getConsumptionTier(qty, maxQty) {
  if (maxQty <= 0) return 'low';
  const ratio = qty / maxQty;
  if (ratio >= 0.66) return 'high';
  if (ratio >= 0.33) return 'medium';
  return 'low';
}
const TIER_STYLES = {
  high:   { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400', label: 'High' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400', label: 'Medium' },
  low:    { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-400', label: 'Low' },
};

// CR-088 v4: PDF export helper
function exportByIngredientPDF(ingName, matches, totalQty) {
  const rows = matches.map(r =>
    `<tr><td style="padding:6px 8px">${r.name}</td><td style="padding:6px 8px">${r._type}</td><td style="padding:6px 8px">${r._tier?.label || ''}</td><td style="padding:6px 8px;text-align:right;font-weight:700;color:#EA580C">${r._matchedQty}</td><td style="padding:6px 8px">${r._matchedUnit}</td><td style="padding:6px 8px;text-align:right">${r.cost ? '₹' + Number(r.cost).toFixed(2) : '—'}</td></tr>`
  ).join('');
  const html = `<html><head><title>Ingredient Usage — ${ingName}</title><style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse}th{background:#f1f5f9;text-align:left;padding:8px;font-size:11px;text-transform:uppercase;border-bottom:2px solid #e2e8f0}td{border-bottom:1px solid #f1f5f9;font-size:13px}tfoot td{font-weight:700;border-top:2px solid #e2e8f0;padding:8px}</style></head><body><h2 style="margin-bottom:4px">Ingredient Usage Report</h2><p style="color:#64748B;margin-bottom:16px">${matches.length} recipes use <strong>${ingName}</strong> · Total: ${totalQty.toFixed(totalQty < 10 ? 2 : 0)} ${matches[0]?._matchedUnit || ''}</p><table><thead><tr><th>Recipe</th><th>Type</th><th>Usage</th><th style="text-align:right">Qty</th><th>Unit</th><th style="text-align:right">Cost</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td>TOTAL</td><td>${matches.length} recipes</td><td></td><td style="text-align:right">${totalQty.toFixed(totalQty < 10 ? 2 : 0)}</td><td>${matches[0]?._matchedUnit || ''}</td><td></td></tr></tfoot></table></body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); w.print(); }
}

// CR-088 v4: Full By Ingredient tab component
function ByIngredientTab({ ingredients, filteredIngredients, selectedIngId, setSelectedIngId, comboOpen, setComboOpen, ingFilter, setIngFilter, ingInRecipesCount, ingNotInRecipesCount, consumptionFilter, setConsumptionFilter, standardRecipes, subRecipes, addonRecipes, handleEdit }) {
  // Build matches
  const allRecipes = useMemo(() => [
    ...standardRecipes.map(r => ({ ...r, _type: 'Standard' })),
    ...subRecipes.map(r => ({ ...r, _type: 'Sub' })),
    ...addonRecipes.map(r => ({ ...r, _type: 'Addon' })),
  ], [standardRecipes, subRecipes, addonRecipes]);

  const matches = useMemo(() => {
    if (!selectedIngId) return [];
    const raw = allRecipes
      .map(r => {
        const ingMatch = (r.ingredients || []).find(i => String(i.id) === String(selectedIngId));
        if (!ingMatch) return null;
        return { ...r, _matchedQty: ingMatch.quantity, _matchedUnit: ingMatch.unit };
      })
      .filter(Boolean)
      .sort((a, b) => b._matchedQty - a._matchedQty); // sort qty desc
    const maxQty = raw.length > 0 ? raw[0]._matchedQty : 0;
    return raw.map(r => ({ ...r, _tier: TIER_STYLES[getConsumptionTier(r._matchedQty, maxQty)] }));
  }, [selectedIngId, allRecipes]);

  const selectedIngName = ingredients.find(i => String(i.id) === String(selectedIngId))?.name || '';
  const totalQty = matches.reduce((sum, m) => sum + (m._matchedQty || 0), 0);

  // Consumption filter counts
  const tierCounts = { all: matches.length, high: 0, medium: 0, low: 0 };
  matches.forEach(m => { const t = getConsumptionTier(m._matchedQty, matches[0]?._matchedQty || 0); tierCounts[t]++; });
  const displayed = consumptionFilter === 'all' ? matches : matches.filter(m => getConsumptionTier(m._matchedQty, matches[0]?._matchedQty || 0) === consumptionFilter);

  const pillCls = (active) => active
    ? 'bg-white shadow-sm text-slate-900 font-semibold rounded-md px-3.5 py-1.5 text-sm transition-all'
    : 'text-slate-600 rounded-md px-3.5 py-1.5 text-sm font-medium transition-all hover:text-slate-900';
  const ctabCls = (active) => active
    ? 'bg-orange-50 border border-orange-300 text-orange-600 font-semibold rounded-lg px-3.5 py-1.5 text-xs transition-all'
    : 'bg-white border border-slate-200 text-slate-500 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all hover:border-slate-300 hover:text-slate-700';

  return (
    <div data-testid="by-ingredient-tab">
      {/* Toolbar: Combobox + Ingredient Filter + PDF */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-start gap-4 flex-wrap">
          {/* Searchable Combobox */}
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild>
              <button type="button"
                className="flex items-center justify-between w-72 px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-slate-900 hover:border-orange-300 transition-colors"
                data-testid="ingredient-combobox-trigger">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-400" />
                  {selectedIngId ? `${selectedIngName} (${ingredients.find(i => String(i.id) === String(selectedIngId))?.unit || ''})` : 'Select ingredient...'}
                </div>
                <ChevronsUpDown className="w-4 h-4 text-slate-400" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search ingredient..." className="h-9 text-sm" data-testid="ingredient-search-input" />
                <CommandList>
                  <CommandEmpty>No ingredient found.</CommandEmpty>
                  <CommandGroup>
                    {filteredIngredients.map(ing => (
                      <CommandItem
                        key={ing.id}
                        value={`${ing.name} ${ing.unit}`}
                        onSelect={() => { setSelectedIngId(String(ing.id)); setComboOpen(false); setConsumptionFilter('all'); }}
                        className="text-sm"
                        data-testid={`ingredient-option-${ing.id}`}>
                        <span>{ing.name} ({ing.unit})</span>
                        {String(selectedIngId) === String(ing.id) && <Check className="w-4 h-4 text-orange-500 ml-auto" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {/* Ingredient Filter Pills */}
          <div className="flex bg-slate-100 p-1 rounded-lg gap-1" data-testid="ingredient-filter-pills">
            <button type="button" className={pillCls(ingFilter === 'all')} onClick={() => setIngFilter('all')} data-testid="filter-all">
              All <span className="text-xs text-slate-400 ml-0.5">{ingredients.length}</span>
            </button>
            <button type="button" className={pillCls(ingFilter === 'in-recipes')} onClick={() => setIngFilter('in-recipes')} data-testid="filter-in-recipes">
              In Recipes <span className="text-xs text-orange-500 ml-0.5">{ingInRecipesCount}</span>
            </button>
            <button type="button" className={pillCls(ingFilter === 'not-in-recipes')} onClick={() => setIngFilter('not-in-recipes')} data-testid="filter-not-in-recipes">
              Not in Recipes <span className="text-xs text-slate-400 ml-0.5">{ingNotInRecipesCount}</span>
            </button>
          </div>
        </div>
        {/* PDF Download */}
        {selectedIngId && matches.length > 0 && (
          <button type="button" onClick={() => exportByIngredientPDF(selectedIngName, matches, totalQty)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:text-orange-600 transition-colors shadow-sm"
            data-testid="pdf-download-btn">
            <FileText className="w-4 h-4" /> Download PDF
          </button>
        )}
      </div>

      {/* Results */}
      {selectedIngId && matches.length > 0 ? (
        <div>
          {/* Summary + Consumption Tabs */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">{matches.length} recipe{matches.length !== 1 ? 's' : ''} use</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-sm font-bold text-orange-600">{selectedIngName}</span>
              <span className="text-xs text-slate-400">(Total: {totalQty.toFixed(totalQty < 10 ? 2 : 0)} {matches[0]?._matchedUnit || ''})</span>
            </div>
            <div className="flex items-center gap-2" data-testid="consumption-tabs">
              <button type="button" className={ctabCls(consumptionFilter === 'all')} onClick={() => setConsumptionFilter('all')} data-testid="consumption-all">All <span className="font-bold ml-0.5">{tierCounts.all}</span></button>
              <button type="button" className={ctabCls(consumptionFilter === 'high')} onClick={() => setConsumptionFilter('high')} data-testid="consumption-high">
                <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1"></span>High <span className="font-bold ml-0.5">{tierCounts.high}</span>
              </button>
              <button type="button" className={ctabCls(consumptionFilter === 'medium')} onClick={() => setConsumptionFilter('medium')} data-testid="consumption-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1"></span>Medium <span className="font-bold ml-0.5">{tierCounts.medium}</span>
              </button>
              <button type="button" className={ctabCls(consumptionFilter === 'low')} onClick={() => setConsumptionFilter('low')} data-testid="consumption-low">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1"></span>Low <span className="font-bold ml-0.5">{tierCounts.low}</span>
              </button>
            </div>
          </div>
          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left" data-testid="by-ingredient-table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Recipe Name</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Usage</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Qty Used</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Unit</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Cost</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Sale</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Serves</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(r => (
                  <tr key={`${r._type}-${r.id}`}
                    className="border-b border-slate-50 hover:bg-orange-50/30 cursor-pointer transition-colors"
                    onClick={() => handleEdit(r, r._type.toLowerCase())}
                    data-testid={`byingredient-row-${r.id}`}>
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-slate-900">{r.name}</div>
                      {r.foodName && <div className="text-xs text-slate-400">Menu: {r.foodName}</div>}
                      {r.addonName && <div className="text-xs text-slate-400">Addon: {r.addonName}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r._type === 'Standard' ? 'bg-orange-50 text-orange-600' :
                        r._type === 'Sub' ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>{r._type}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${r._tier?.bg} ${r._tier?.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${r._tier?.dot}`}></span>{r._tier?.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right"><span className="text-sm font-bold text-orange-500">{r._matchedQty}</span></td>
                    <td className="py-3 px-4 text-xs text-slate-500">{r._matchedUnit}</td>
                    <td className="py-3 px-4 text-right text-xs text-slate-600">{r.cost ? `₹${Number(r.cost).toFixed(2)}` : '—'}</td>
                    <td className="py-3 px-4 text-right text-xs text-slate-600">{r.salePrice ? `₹${Number(r.salePrice).toFixed(2)}` : '—'}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{r.servePeople ? `${r.servePeople} Serve` : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-orange-50/50 border-t-2 border-slate-200">
                  <td className="py-2.5 px-4 text-xs font-bold text-slate-700">TOTAL</td>
                  <td className="py-2.5 px-4 text-xs text-slate-500">{displayed.length} recipes</td>
                  <td className="py-2.5 px-4"></td>
                  <td className="py-2.5 px-4 text-right text-sm font-bold text-orange-600">{displayed.reduce((s, m) => s + (m._matchedQty || 0), 0).toFixed(totalQty < 10 ? 2 : 0)}</td>
                  <td className="py-2.5 px-4 text-xs text-slate-500">{matches[0]?._matchedUnit || ''}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : selectedIngId && matches.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400" data-testid="no-matches">No recipes use this ingredient</div>
      ) : (
        <div className="py-12 text-center">
          <ChefHat className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Select an ingredient above to see which recipes use it</p>
        </div>
      )}
    </div>
  );
}



export default function RecipeManagementPanel() {
  const [activeTab, setActiveTab] = useState('standard');
  const [standardRecipes, setStandardRecipes] = useState([]);
  const [subRecipes, setSubRecipes] = useState([]);
  const [addonRecipes, setAddonRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRecipe, setEditingRecipe] = useState(undefined); // undefined=list, null=add, object=edit
  const [editingType, setEditingType] = useState('standard');
  const [viewMode, setViewMode] = useState('card');   // CR-073 · 'card' | 'bulk'
  const [sortBy, setSortBy] = useState('name-asc');   // CR-092
  const [ingredients, setIngredients] = useState([]);    // CR-088
  const [selectedIngId, setSelectedIngId] = useState(''); // CR-088
  const [comboOpen, setComboOpen] = useState(false);      // CR-088 v4
  const [ingFilter, setIngFilter] = useState('all');      // CR-088 v4: 'all' | 'in-recipes' | 'not-in-recipes'
  const [consumptionFilter, setConsumptionFilter] = useState('all'); // CR-088 v4: 'all' | 'high' | 'medium' | 'low'

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [std, sub, addon, ings] = await Promise.all([
        recipeService.getRecipes(),
        recipeService.getSubRecipes(),
        recipeService.getAddonRecipes(),
        inventoryService.getIngredients(), // CR-088
      ]);
      setStandardRecipes(std);
      setSubRecipes(sub);
      setAddonRecipes(addon);
      setIngredients(ings); // CR-088
    } catch (err) {
      toast.error('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // CR-092: client-side sort
  const sortRecipes = useCallback((recipes) => {
    if (!recipes) return [];
    const sorted = [...recipes];
    switch (sortBy) {
      case 'name-asc': return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc': return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'cost-high': return sorted.sort((a, b) => (Number(b.cost) || 0) - (Number(a.cost) || 0));
      case 'cost-low': return sorted.sort((a, b) => (Number(a.cost) || 0) - (Number(b.cost) || 0));
      case 'ings-high': return sorted.sort((a, b) => (b.ingredients?.length || 0) - (a.ingredients?.length || 0));
      default: return sorted;
    }
  }, [sortBy]);

  const handleEdit = (recipe, type) => {
    setEditingType(type);
    setEditingRecipe(recipe);
  };

  const handleCreate = (type) => {
    setEditingType(type);
    setEditingRecipe(null);
  };

  const handleBack = () => {
    setEditingRecipe(undefined);
    fetchData();
  };

  // CR-089: PDF export — all recipe types in one document
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Recipe Book', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);

    let yPos = 35;
    const sections = [
      { title: `Standard Recipes (${standardRecipes.length})`, recipes: standardRecipes },
      { title: `Sub-Recipes (${subRecipes.length})`, recipes: subRecipes },
      { title: `Addon Recipes (${addonRecipes.length})`, recipes: addonRecipes },
    ];

    for (const section of sections) {
      if (section.recipes.length === 0) continue;
      if (yPos > 260) { doc.addPage(); yPos = 20; }
      doc.setFontSize(13);
      doc.text(section.title, 14, yPos);
      yPos += 6;

      autoTable(doc, { // BUG-302: v5 named-function pattern (was doc.autoTable — undefined in v5)
        startY: yPos,
        head: [['Recipe', 'Item', 'Prep', 'Cook', 'Serves', 'Cost', 'Ingredients']],
        body: section.recipes.map(r => [
          r.name,
          r.foodName || r.addonName || '—',
          r.preparationTime || '—',
          r.serveTime || '—',
          r.servePeople || '—',
          r.cost ? `₹${Number(r.cost).toFixed(2)}` : '—',
          (r.ingredients || []).map(i => `${i.name} ${i.quantity}${i.unit}`).join(', ') || '—',
        ]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [242, 107, 51] },
        columnStyles: { 6: { cellWidth: 50 } },
      });

      yPos = doc.lastAutoTable.finalY + 10;
    }

    doc.save('recipe-book.pdf');
    toast.success('Recipe book PDF downloaded');
  };

  // Show form if editing
  if (editingRecipe !== undefined) {
    return <RecipeFormPanel recipe={editingRecipe} recipeType={editingType} onBack={handleBack} />;
  }

  // CR-088 v4: compute which ingredient IDs are used in at least one recipe
  const allRecipesCombined = [...standardRecipes, ...subRecipes, ...addonRecipes];
  const ingIdsInRecipes = new Set();
  allRecipesCombined.forEach(r => (r.ingredients || []).forEach(i => ingIdsInRecipes.add(String(i.id))));
  const filteredIngredients = ingredients.filter(ing => {
    if (ingFilter === 'in-recipes') return ingIdsInRecipes.has(String(ing.id));
    if (ingFilter === 'not-in-recipes') return !ingIdsInRecipes.has(String(ing.id));
    return true;
  });
  const ingInRecipesCount = ingredients.filter(i => ingIdsInRecipes.has(String(i.id))).length;
  const ingNotInRecipesCount = ingredients.length - ingInRecipesCount;

  return (
    <div data-testid="recipe-management-panel">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-6">
          <TabsList className="bg-transparent border-b border-slate-200 rounded-none justify-start gap-0 h-auto p-0">
            <TabsTrigger value="standard" data-testid="recipe-tab-standard-trigger"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700">
              Standard Recipes <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600">{standardRecipes.length}</span>
            </TabsTrigger>
            <TabsTrigger value="sub" data-testid="recipe-tab-sub-trigger"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700">
              Sub-Recipes <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{subRecipes.length}</span>
            </TabsTrigger>
            <TabsTrigger value="addon" data-testid="recipe-tab-addon-trigger"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700">
              Addon Recipes <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{addonRecipes.length}</span>
            </TabsTrigger>
            {/* CR-088: 4th tab — By Ingredient reverse lookup */}
            <TabsTrigger value="by-ingredient" data-testid="recipe-tab-byingredient-trigger"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700">
              By Ingredient
            </TabsTrigger>
            {/* CR-119: 5th tab — Aggregator Food → Recipe Mapping */}
            <TabsTrigger value="aggregator-inventory" data-testid="recipe-tab-aggregator-trigger"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700">
              Aggregator Inventory
            </TabsTrigger>
          </TabsList>
          {/* CR-089: Download PDF button */}
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5 text-xs mr-2"
            data-testid="recipe-export-pdf-btn" disabled={loading}>
            <FileDown className="w-3.5 h-3.5" /> Download PDF
          </Button>
          {activeTab !== 'by-ingredient' && activeTab !== 'aggregator-inventory' && ( /* CR-088: hide Create on By Ingredient tab, CR-119: hide on Aggregator tab */
          <Button onClick={() => handleCreate(activeTab)}
            className="bg-green-600 hover:bg-green-700 text-white gap-1.5" data-testid="create-recipe-btn">
            <Plus className="w-4 h-4" /> Create Recipe
          </Button>
          )}
        </div>

        {/* CR-073 · Card/Bulk view toggle — CR-088: hidden on By Ingredient tab, CR-119: hidden on Aggregator tab */}
        {activeTab !== 'by-ingredient' && activeTab !== 'aggregator-inventory' && (
        <div className="flex items-center justify-end mb-3 gap-1">
          <button type="button" onClick={() => setViewMode('card')}
            className={`px-2.5 h-8 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${viewMode === 'card' ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-300' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            data-testid="recipe-view-card">
            <LayoutGrid className="w-3.5 h-3.5" /> Card
          </button>
          <button type="button" onClick={() => setViewMode('bulk')}
            className={`px-2.5 h-8 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${viewMode === 'bulk' ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-300' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            data-testid="recipe-view-bulk">
            <Table2 className="w-3.5 h-3.5" /> Bulk
          </button>
        </div>
        )}

        {/* CR-092: Sort controls — hidden on By Ingredient and Aggregator tabs */}
        {activeTab !== 'by-ingredient' && activeTab !== 'aggregator-inventory' && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-400">
            {({ standard: standardRecipes, sub: subRecipes, addon: addonRecipes })[activeTab]?.length || 0} recipes
          </span>
          <select className="h-8 text-xs border border-slate-200 rounded-md px-2 outline-none focus:border-orange-400 bg-white"
            value={sortBy} onChange={e => setSortBy(e.target.value)} data-testid="recipe-sort-select">
            <option value="name-asc">Name A→Z</option>
            <option value="name-desc">Name Z→A</option>
            <option value="cost-high">Cost High→Low</option>
            <option value="cost-low">Cost Low→High</option>
            <option value="ings-high">Most Ingredients</option>
          </select>
        </div>
        )}

        {activeTab === 'aggregator-inventory' ? (
          <AggregatorInventoryTab />
        ) : activeTab === 'by-ingredient' ? (
          loading ? ( // BUG-232: loading guard — prevents empty combobox race condition
            <div className="flex items-center justify-center py-24 gap-2 text-slate-400 text-sm" data-testid="by-ingredient-loading">
              <div className="w-4 h-4 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
              Loading ingredients and recipes…
            </div>
          ) : (
          /* CR-088 v4: By Ingredient — searchable combobox + filters + consumption tabs + PDF */
          <ByIngredientTab
            ingredients={ingredients}
            filteredIngredients={filteredIngredients}
            selectedIngId={selectedIngId}
            setSelectedIngId={setSelectedIngId}
            comboOpen={comboOpen}
            setComboOpen={setComboOpen}
            ingFilter={ingFilter}
            setIngFilter={setIngFilter}
            ingInRecipesCount={ingInRecipesCount}
            ingNotInRecipesCount={ingNotInRecipesCount}
            consumptionFilter={consumptionFilter}
            setConsumptionFilter={setConsumptionFilter}
            standardRecipes={standardRecipes}
            subRecipes={subRecipes}
            addonRecipes={addonRecipes}
            handleEdit={handleEdit}
          />
          ) /* end loading ternary */
        ) : viewMode === 'bulk' ? (
          <RecipeBulkEditor
            recipes={sortRecipes({ standard: standardRecipes, sub: subRecipes, addon: addonRecipes }[activeTab])}
            recipeType={activeTab}
            onRefresh={fetchData}
          />
        ) : (
        <>
        <TabsContent value="standard" className="mt-0">
          <RecipeTab type="standard" recipes={sortRecipes(standardRecipes)} loading={loading}
            onEdit={(r) => handleEdit(r, 'standard')} onCreate={() => handleCreate('standard')} />
        </TabsContent>
        <TabsContent value="sub" className="mt-0">
          <RecipeTab type="sub" recipes={sortRecipes(subRecipes)} loading={loading}
            onEdit={(r) => handleEdit(r, 'sub')} onCreate={() => handleCreate('sub')} />
        </TabsContent>
        <TabsContent value="addon" className="mt-0">
          <RecipeTab type="addon" recipes={sortRecipes(addonRecipes)} loading={loading}
            onEdit={(r) => handleEdit(r, 'addon')} onCreate={() => handleCreate('addon')} />
        </TabsContent>
        </>
        )}
      </Tabs>
    </div>
  );
}
