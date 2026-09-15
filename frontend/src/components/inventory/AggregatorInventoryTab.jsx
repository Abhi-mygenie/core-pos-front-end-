// CR-119: Aggregator Food → Recipe Mapping tab
// Lives inside RecipeManagementPanel as 5th tab "Aggregator Inventory"
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Download, Save, Link2Off, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import * as recipeService from '@/api/services/recipeService';

// CR-119: Inline recipe combobox — auto-search typeahead (owner decision OQ-6)
function RecipeCombobox({ foodId, currentRecipeId, recipes, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = recipes.find(r => r.id === currentRecipeId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          data-testid={`aggregator-recipe-combobox-${foodId}`}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm bg-white border rounded-lg text-left transition-colors hover:border-purple-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 ${
            currentRecipeId ? 'border-slate-200 text-slate-900' : 'border-amber-300 text-slate-400 italic'
          }`}
        >
          <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate flex-1">{selected ? selected.name : 'Search recipes...'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 z-50 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200" side="bottom" sideOffset={4} align="start">
        <Command>
          <CommandInput placeholder="Type to search recipes..." className="text-sm" />
          <CommandList className="max-h-[220px]">
            <CommandEmpty className="py-4 text-center text-sm text-slate-400">No recipe found.</CommandEmpty>
            <CommandGroup>
              {recipes.map(r => (
                <CommandItem
                  key={r.id}
                  value={r.name}
                  onSelect={() => { onChange(foodId, r.id); setOpen(false); }}
                  className="text-sm cursor-pointer"
                >
                  <span className="truncate">{r.name}</span>
                  {r.id === currentRecipeId && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-600 flex-shrink-0" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function AggregatorInventoryTab() {
  // CR-119: State
  const [foods, setFoods] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedClient, setSelectedClient] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [pendingChanges, setPendingChanges] = useState({}); // { foodId: recipeId }

  // CR-119: Fetch clients on mount
  useEffect(() => {
    recipeService.getRestaurantClients()
      .then(data => setClients(data.clients))
      .catch(() => {}); // brand selector optional — silent fail
  }, []);

  // CR-119: Fetch mapping when client changes
  const fetchMapping = useCallback(async (clientId) => {
    setLoading(true);
    try {
      const data = await recipeService.getFoodRecipeMapping(clientId);
      setFoods(data.foods);
      setRecipes(data.recipes);
      setStats(data.stats);
      setPendingChanges({});
    } catch (err) {
      toast.error('Failed to load aggregator foods');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMapping(selectedClient); }, [selectedClient, fetchMapping]);

  // CR-119: Handle recipe change (local — queued for batch save)
  const handleRecipeChange = useCallback((foodId, recipeId) => {
    setPendingChanges(prev => ({ ...prev, [foodId]: recipeId }));
    setFoods(prev => prev.map(f =>
      f.id === foodId ? { ...f, recipeId, recipeName: recipes.find(r => r.id === recipeId)?.name || null } : f
    ));
  }, [recipes]);

  // CR-119: Unlink — immediate API call (single item)
  const handleUnlink = useCallback(async (foodId) => {
    try {
      await recipeService.unlinkRecipeMapping({ itemId: foodId, clientId: selectedClient });
      setFoods(prev => prev.map(f =>
        f.id === foodId ? { ...f, recipeId: null, recipeName: null } : f
      ));
      setPendingChanges(prev => { const n = { ...prev }; delete n[foodId]; return n; });
      toast.success('Recipe unlinked');
      // Refresh stats
      const data = await recipeService.getFoodRecipeMapping(selectedClient);
      setStats(data.stats);
    } catch (err) {
      toast.error('Failed to unlink recipe');
    }
  }, [selectedClient]);

  // CR-119: Batch save all pending changes
  const handleBatchSave = useCallback(async () => {
    const updates = Object.entries(pendingChanges).map(([foodId, recipeId]) => ({
      itemId: Number(foodId),
      recipeId,
    }));
    if (updates.length === 0) {
      toast.info('No changes to save');
      return;
    }
    setSaving(true);
    try {
      const result = await recipeService.batchUpdateRecipeMapping({ updates, clientId: selectedClient });
      const sc = result.success_count || updates.length;
      const fc = result.failed_count || 0;
      if (fc > 0) {
        toast.warning(`Saved ${sc} mapping(s), ${fc} failed`);
      } else {
        toast.success(`${sc} mapping(s) saved successfully`);
      }
      setPendingChanges({});
      // Refresh stats
      const data = await recipeService.getFoodRecipeMapping(selectedClient);
      setStats(data.stats);
    } catch (err) {
      toast.error('Failed to save mappings');
    } finally {
      setSaving(false);
    }
  }, [pendingChanges, selectedClient]);

  // CR-119: Export xlsx
  const handleExport = useCallback(async () => {
    try {
      await recipeService.exportRecipeMapping();
      toast.success('Export downloaded');
    } catch (err) {
      toast.error('Export failed');
    }
  }, []);

  // CR-119: Filtered foods by search
  const filteredFoods = useMemo(() => {
    if (!search.trim()) return foods;
    const q = search.toLowerCase();
    return foods.filter(f => f.foodName.toLowerCase().includes(q));
  }, [foods, search]);

  // CR-119: Computed stats (use live food state for accuracy)
  const liveStats = useMemo(() => {
    const total = foods.length;
    const mapped = foods.filter(f => f.recipeId).length;
    return { total, mapped, unmapped: total - mapped };
  }, [foods]);

  const pendingCount = Object.keys(pendingChanges).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-slate-400 text-sm" data-testid="aggregator-inventory-loading">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading aggregator foods...
      </div>
    );
  }

  return (
    <div data-testid="aggregator-inventory-tab" className="flex flex-col gap-6">
      {/* CR-119: Brand/Client selector */}
      {clients.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Brand</label>
          <select
            data-testid="aggregator-client-select"
            value={selectedClient}
            onChange={e => setSelectedClient(Number(e.target.value))}
            className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-900 font-medium focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 cursor-pointer"
          >
            <option value={0}>All Brands (Default Catalog)</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* CR-119: Stats bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg" data-testid="aggregator-stats-total">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Total Aggregator Foods</p>
            <p className="text-2xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'monospace' }}>{liveStats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
            <Search className="w-5 h-5 text-purple-600" />
          </div>
        </div>
        <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg" data-testid="aggregator-stats-mapped">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Mapped</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1" style={{ fontFamily: 'monospace' }}>{liveStats.mapped}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
        <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg" data-testid="aggregator-stats-unmapped">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Unmapped</p>
            <p className="text-2xl font-bold text-amber-700 mt-1" style={{ fontFamily: 'monospace' }}>{liveStats.unmapped}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
        </div>
      </div>

      {/* CR-119: Table container */}
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden flex flex-col">
        {/* Filters row */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-slate-200 bg-white">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              data-testid="aggregator-food-search"
              type="text"
              placeholder="Search aggregator foods..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} data-testid="aggregator-export-btn" className="gap-1.5">
              <Download className="w-4 h-4" /> Export
            </Button>
            <Button
              size="sm"
              onClick={handleBatchSave}
              disabled={pendingCount === 0 || saving}
              data-testid="aggregator-save-btn"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {pendingCount > 0 ? `Save All (${pendingCount})` : 'Save All Changes'}
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left" data-testid="aggregator-food-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest w-[30%]">Aggregator Food</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest w-[18%]">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest w-[37%]">Search & Assign Recipe</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest w-[15%] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFoods.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-slate-400">
                    {search ? 'No foods match your search.' : 'No aggregator foods found.'}
                  </td>
                </tr>
              ) : (
                filteredFoods.map(food => (
                  <tr
                    key={food.id}
                    data-testid={`aggregator-food-row-${food.id}`}
                    className={`h-11 transition-colors hover:bg-slate-50 ${!food.recipeId ? 'bg-amber-50/30' : ''}`}
                  >
                    <td className="px-4 py-2 text-sm font-medium text-slate-900">{food.foodName}</td>
                    <td className="px-4 py-2">
                      {food.recipeId ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Mapped
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                          <AlertCircle className="w-3 h-3" /> Unmapped
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <RecipeCombobox
                        foodId={food.id}
                        currentRecipeId={food.recipeId}
                        recipes={recipes}
                        onChange={handleRecipeChange}
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      {food.recipeId ? (
                        <button
                          data-testid={`aggregator-unlink-btn-${food.id}`}
                          onClick={() => handleUnlink(food.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Unlink recipe"
                          aria-label="Unlink recipe from aggregator item"
                        >
                          <Link2Off className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
          <span>Showing {filteredFoods.length} of {foods.length} aggregator foods</span>
          <span>{liveStats.mapped} mapped · {liveStats.unmapped} unmapped</span>
        </div>
      </div>
    </div>
  );
}
