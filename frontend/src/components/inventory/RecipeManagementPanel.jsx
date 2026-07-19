// CR-072: Recipe Management Panel — 3 tabs (Standard / Sub / Addon) + recipe cards
// CR-073: Card/Bulk view toggle · integrates RecipeBulkEditor (spreadsheet mode)
import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Clock, Users, ChefHat, LayoutGrid, Table2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as recipeService from '@/api/services/recipeService';
import RecipeFormPanel from './RecipeFormPanel';
import RecipeBulkEditor from './RecipeBulkEditor';   // CR-073

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

      {/* Phase 2 cost placeholder */}
      <div className="mt-3 pt-2 border-t border-slate-100">
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-50 text-slate-400">
          Cost: ₹... · Margin: ...%
        </span>
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

export default function RecipeManagementPanel() {
  const [activeTab, setActiveTab] = useState('standard');
  const [standardRecipes, setStandardRecipes] = useState([]);
  const [subRecipes, setSubRecipes] = useState([]);
  const [addonRecipes, setAddonRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRecipe, setEditingRecipe] = useState(undefined); // undefined=list, null=add, object=edit
  const [editingType, setEditingType] = useState('standard');
  const [viewMode, setViewMode] = useState('card');   // CR-073 · 'card' | 'bulk'

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [std, sub, addon] = await Promise.all([
        recipeService.getRecipes(),
        recipeService.getSubRecipes(),
        recipeService.getAddonRecipes(),
      ]);
      setStandardRecipes(std);
      setSubRecipes(sub);
      setAddonRecipes(addon);
    } catch (err) {
      toast.error('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  // Show form if editing
  if (editingRecipe !== undefined) {
    return <RecipeFormPanel recipe={editingRecipe} recipeType={editingType} onBack={handleBack} />;
  }

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
          </TabsList>
          <Button onClick={() => handleCreate(activeTab)}
            className="bg-green-600 hover:bg-green-700 text-white gap-1.5" data-testid="create-recipe-btn">
            <Plus className="w-4 h-4" /> Create Recipe
          </Button>
        </div>

        {/* CR-073 · Card/Bulk view toggle */}
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

        {viewMode === 'bulk' ? (
          <RecipeBulkEditor
            recipes={{ standard: standardRecipes, sub: subRecipes, addon: addonRecipes }[activeTab]}
            recipeType={activeTab}
            onRefresh={fetchData}
          />
        ) : (
        <>
        <TabsContent value="standard" className="mt-0">
          <RecipeTab type="standard" recipes={standardRecipes} loading={loading}
            onEdit={(r) => handleEdit(r, 'standard')} onCreate={() => handleCreate('standard')} />
        </TabsContent>
        <TabsContent value="sub" className="mt-0">
          <RecipeTab type="sub" recipes={subRecipes} loading={loading}
            onEdit={(r) => handleEdit(r, 'sub')} onCreate={() => handleCreate('sub')} />
        </TabsContent>
        <TabsContent value="addon" className="mt-0">
          <RecipeTab type="addon" recipes={addonRecipes} loading={loading}
            onEdit={(r) => handleEdit(r, 'addon')} onCreate={() => handleCreate('addon')} />
        </TabsContent>
        </>
        )}
      </Tabs>
    </div>
  );
}
