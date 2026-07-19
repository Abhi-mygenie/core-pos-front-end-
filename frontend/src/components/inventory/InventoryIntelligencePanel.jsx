// CR-078 · CR-079 · Inventory Intelligence Panel — hosts 6 widgets + 2 locked wastage placeholders
// B14 · empty overall state for brand-new outlets
import { useState, useEffect, useCallback } from 'react';
import { Loader2, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as inventoryService from '@/api/services/inventoryService';
import * as recipeService from '@/api/services/recipeService';
import * as menuService from '@/api/services/menuManagementService';
import { getHorizonDates } from '@/utils/purchasePlanner';

import ReorderForecastWidget from './widgets/ReorderForecastWidget';
import ConsumptionTrendsWidget from './widgets/ConsumptionTrendsWidget';
import CostTrendWidget from './widgets/CostTrendWidget';
import RecipeCostMarginWidget from './widgets/RecipeCostMarginWidget';
import VendorPerformanceWidget from './widgets/VendorPerformanceWidget';
import VendorDirectoryWidget from './widgets/VendorDirectoryWidget';

function WastagePlaceholder({ title }) {
  return (
    <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4 opacity-70" title="Coming when backend wastage endpoint ships" data-testid={`wastage-placeholder-${title.toLowerCase().replace(/\s+/g,'-')}`}>
      <div className="flex items-center gap-2 mb-2">
        <Trash2 className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-500">{title}</h3>
      </div>
      <p className="text-xs text-slate-400 italic py-3">
        <AlertCircle className="w-3 h-3 inline mr-1" />
        Coming soon — awaiting backend wastage endpoint.
      </p>
    </div>
  );
}

export default function InventoryIntelligencePanel() {
  const [stock, setStock] = useState([]);
  const [dcr30, setDcr30] = useState({ stock_summary: [], stock_details: [] });
  const [dcr7, setDcr7]   = useState({ stock_summary: [] });
  const [vil, setVil] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dates30 = getHorizonDates(30);
      const dates7  = getHorizonDates(7);
      const results = await Promise.allSettled([
        inventoryService.getStockInventory(),
        inventoryService.getDailyConsumptionReport(dates30),
        inventoryService.getDailyConsumptionReport(dates7),
        inventoryService.getVendorItemList(),
        recipeService.getRecipes(),
        menuService.getFoodsList(),
      ]);
      const [s, d30, d7, v, r, f] = results;
      if (s.status === 'fulfilled') setStock(Array.isArray(s.value) ? s.value : []);
      if (d30.status === 'fulfilled') setDcr30(d30.value || { stock_summary: [], stock_details: [] });
      if (d7.status === 'fulfilled') setDcr7(d7.value || { stock_summary: [] });
      if (v.status === 'fulfilled') setVil(Array.isArray(v.value) ? v.value : []);
      if (r.status === 'fulfilled') {
        // recipes: getRecipes returns fromAPI.recipes() — either array or {data:[...]}
        const rv = r.value;
        setRecipes(Array.isArray(rv) ? rv : (Array.isArray(rv?.data) ? rv.data : []));
      }
      if (f.status === 'fulfilled') {
        // foods: getFoodsList returns raw axios response {data:{...}}
        const fv = f.value?.data ?? f.value;
        const arr = Array.isArray(fv) ? fv
                  : Array.isArray(fv?.foods) ? fv.foods
                  : Array.isArray(fv?.data) ? fv.data
                  : Array.isArray(fv?.food_list) ? fv.food_list
                  : [];
        setFoods(arr);
      }
      const failed = results.filter(x => x.status === 'rejected');
      if (failed.length && failed.length === results.length) {
        setError('Failed to load intelligence data');
      } else if (failed.length) {
        toast.warning(`${failed.length} data source${failed.length > 1 ? 's' : ''} unavailable — showing partial data`);
      }
    } catch (err) {
      setError(err?.readableMessage || 'Failed to load Inventory Intelligence');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 py-16 flex items-center justify-center gap-2 text-sm text-slate-400" data-testid="intelligence-loading">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading Inventory Intelligence…
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between" data-testid="intelligence-error">
        <span className="text-sm text-red-700">{error}</span>
        <Button variant="outline" size="sm" onClick={fetchAll} className="text-red-600 border-red-300 hover:bg-red-100">Retry</Button>
      </div>
    );
  }

  // B14 · empty-overall state for brand-new outlets
  const hasAnyData = stock.length > 0 || (dcr30.stock_summary || []).length > 0 || vil.length > 0;
  if (!hasAnyData) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-8 text-center" data-testid="intelligence-empty">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Insights arrive after a few days of activity</h3>
        <p className="text-sm text-slate-500">Once you log orders, purchases, and stock movements, this dashboard fills up with intelligence.</p>
      </div>
    );
  }

  return (
    <div data-testid="inventory-intelligence-panel">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReorderForecastWidget stock={stock} dcr={dcr7} horizonDays={7} />
        <ConsumptionTrendsWidget dcr={dcr30} />
        <CostTrendWidget vil={vil} />
        <RecipeCostMarginWidget recipes={recipes} foods={foods} vil={vil} />
        <VendorPerformanceWidget vil={vil} />
        <VendorDirectoryWidget vil={vil} />
        <WastagePlaceholder title="Wastage Insights" />
        <WastagePlaceholder title="Top Wasted Items" />
      </div>
    </div>
  );
}
