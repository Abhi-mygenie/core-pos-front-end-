// CR-078 · CR-079 · Inventory Intelligence Panel — hosts KPIs, alerts, 6 widgets + 2 locked wastage placeholders
// CR-081 Screen 2: Dashboard design alignment to v5 mockup
// B14 · empty overall state for brand-new outlets
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Trash2, AlertCircle, AlertTriangle, TrendingUp, Download, ShieldAlert, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRestaurant } from '../../contexts/RestaurantContext';
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

// CR-081: KPI Card component
const KpiCard = ({ icon: Icon, iconBg, iconColor, value, label, badge, testId }) => (
  <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-start gap-3" data-testid={testId}>
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
      <Icon className="w-5 h-5" style={{ color: iconColor }} />
    </div>
    <div>
      <div className="text-2xl font-bold text-slate-900 leading-tight flex items-center gap-2">
        {value}
        {badge && (
          <span className="text-[9px] font-semibold bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
            <ShieldAlert className="w-2.5 h-2.5" /> {badge}
          </span>
        )}
      </div>
      <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mt-0.5">{label}</div>
    </div>
  </div>
);

// CR-081: Low-Stock Alert Item
const LowStockItem = ({ name, qty, unit, daysLeft }) => {
  const isOut = daysLeft <= 0 || qty <= 0;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white flex-shrink-0 min-w-[160px]"
         style={{ borderColor: isOut ? '#FECACA' : '#FDE68A' }}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
           style={{ background: isOut ? '#FEF2F2' : '#FFFBEB' }}>
        <AlertCircle className="w-3.5 h-3.5" style={{ color: isOut ? '#EF4444' : '#F59E0B' }} />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-800 truncate">{name}</div>
        <div className="text-[10px] text-slate-500">
          {qty.toFixed(2)} {unit} · {isOut ? 'Out of stock' : `~${Math.round(daysLeft)} days left`}
        </div>
      </div>
    </div>
  );
};

function WastagePlaceholder({ title }) {
  return (
    <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4 opacity-70" data-testid={`wastage-placeholder-${title.toLowerCase().replace(/\s+/g,'-')}`}>
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
  const [timeRange, setTimeRange] = useState(30); // CR-081: 7d/14d/30d
  const { restaurant } = useRestaurant();

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
        const rv = r.value;
        setRecipes(Array.isArray(rv) ? rv : (Array.isArray(rv?.data) ? rv.data : []));
      }
      if (f.status === 'fulfilled') {
        const fv = f.value?.data ?? f.value;
        const arr = Array.isArray(fv) ? fv : Array.isArray(fv?.foods) ? fv.foods : Array.isArray(fv?.data) ? fv.data : Array.isArray(fv?.food_list) ? fv.food_list : [];
        setFoods(arr);
      }
      const failed = results.filter(x => x.status === 'rejected');
      if (failed.length && failed.length === results.length) setError('Failed to load intelligence data');
      else if (failed.length) toast.warning(`${failed.length} data source${failed.length > 1 ? 's' : ''} unavailable`);
    } catch (err) {
      setError(err?.readableMessage || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // CR-081: Compute KPI values from existing data
  const kpis = useMemo(() => {
    const dcrMap = new Map((dcr7?.stock_summary || []).map(r => [String(r.ingredient_id), r]));
    let reorderAlerts = 0;
    let recipesAtRisk = 0;
    const lowStockItems = [];

    (stock || []).forEach(item => {
      if (item.isSubRecipe) return;
      const onHand = Number(item.calQuantity) || 0;
      const summary = dcrMap.get(String(item.id));
      const avgDaily = summary ? (Number(summary.total_consumed || 0) / 7) : 0;
      // BUG-210 Fix 3: OOS items = 0 days left regardless of velocity
      const rawDays = avgDaily > 0 ? onHand / avgDaily : (onHand <= 0 ? 0 : Infinity);
      const daysLeft = Number.isFinite(rawDays) ? Math.max(0, rawDays) : rawDays;
      if (Number.isFinite(daysLeft) && daysLeft <= 7) {
        reorderAlerts++;
        lowStockItems.push({ id: item.id, name: item.name, qty: onHand, unit: item.smallUnit || item.unit || '', daysLeft });
      }
    });

    // Recipes at risk: recipes where any ingredient has <3 days left
    const lowIngIds = new Set(lowStockItems.filter(i => i.daysLeft <= 3).map(i => String(i.id)));
    (recipes || []).forEach(r => {
      const ings = r.ingredients || r.recipe_ingredients || [];
      if (ings.some(i => lowIngIds.has(String(i.ingredient_id || i.id)))) recipesAtRisk++;
    });

    // Cost change: avg rate delta this week vs prior
    const now = new Date();
    const wkStart = new Date(now); wkStart.setDate(now.getDate() - 30);
    const priorStart = new Date(now); priorStart.setDate(now.getDate() - 60);
    let thisTotal = 0, thisCount = 0, priorTotal = 0, priorCount = 0;
    (vil || []).forEach(r => {
      const d = new Date(r.Purchase_Date);
      const p = Number(r.unit_price);
      if (isNaN(d) || !(p > 0)) return;
      if (d >= wkStart) { thisTotal += p; thisCount++; }
      else if (d >= priorStart) { priorTotal += p; priorCount++; }
    });
    const thisAvg = thisCount > 0 ? thisTotal / thisCount : 0;
    const priorAvg = priorCount > 0 ? priorTotal / priorCount : 0;
    const costChangePct = priorAvg > 0 ? ((thisAvg - priorAvg) / priorAvg * 100) : 0;

    lowStockItems.sort((a, b) => a.daysLeft - b.daysLeft);

    return { reorderAlerts, costChangePct, recipesAtRisk, lowStockItems: lowStockItems.slice(0, 5) };
  }, [stock, dcr7, vil, recipes]);

  // CR-085 A6: Skeleton loading — per-widget placeholders instead of single spinner
  if (loading) {
    return (
      <div data-testid="intelligence-loading">
        {/* KPI skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-200" />
                <div className="flex-1">
                  <div className="h-6 w-16 bg-slate-200 rounded mb-1" />
                  <div className="h-3 w-24 bg-slate-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Widget grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-4 h-4 rounded bg-slate-200" />
                <div className="h-4 w-40 bg-slate-200 rounded" />
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map(j => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="h-3 flex-1 bg-slate-100 rounded" />
                    <div className="h-3 w-16 bg-slate-100 rounded" />
                    <div className="h-3 w-12 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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

  const hasAnyData = stock.length > 0 || (dcr30.stock_summary || []).length > 0 || vil.length > 0;
  if (!hasAnyData) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-8 text-center" data-testid="intelligence-empty">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Insights arrive after a few days of activity</h3>
        <p className="text-sm text-slate-500">Once you log orders, purchases, and stock movements, this dashboard fills up with intelligence.</p>
      </div>
    );
  }

  // CR-081: Restaurant context subtitle
  const rName = restaurant?.name || '';
  const rType = restaurant?.restaurantTypeFlag || '';
  const rParent = restaurant?.parentRestaurantId || '';
  const subtitle = [rName, rType === 'franchise' ? 'Franchise' : rType === 'master' ? 'Master' : '', rParent ? `parent restaurant #${rParent}` : ''].filter(Boolean).join(' · ');

  return (
    <div data-testid="inventory-intelligence-panel" className="space-y-4">

      {/* CR-081: Header with time range chips + filters */}
      <div className="flex items-center justify-between">
        <div>
          {subtitle && <p className="text-xs text-slate-500" data-testid="dashboard-subtitle">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {/* Time range chips */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden" data-testid="time-range-chips">
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => setTimeRange(d)}
                className="px-3 py-1.5 text-xs font-semibold transition-colors"
                style={{ background: timeRange === d ? '#1A1A1A' : 'white', color: timeRange === d ? 'white' : '#666' }}
                data-testid={`time-range-${d}d`}>
                {d}d
              </button>
            ))}
          </div>
          {/* Export */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50"
                  data-testid="dashboard-export-btn">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* CR-081: 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="kpi-cards-row">
        <KpiCard icon={AlertTriangle} iconBg="#FFF7ED" iconColor="#F97316"
                 value={kpis.reorderAlerts} label="Reorder Alerts" testId="kpi-reorder-alerts" />
        <KpiCard icon={Trash2} iconBg="#FEF2F2" iconColor="#EF4444"
                 value="—" label="Wastage Value" badge="P2" testId="kpi-wastage-value" />
        <KpiCard icon={TrendingUp} iconBg="#F0FDF4" iconColor="#22C55E"
                 value={`${kpis.costChangePct >= 0 ? '↑' : '↓'}${Math.abs(kpis.costChangePct).toFixed(1)}%`}
                 label="Cost Change · 30D" testId="kpi-cost-change" />
        <KpiCard icon={ChefHat} iconBg="#FAF5FF" iconColor="#A855F7"
                 value={kpis.recipesAtRisk} label="Recipes at Risk" testId="kpi-recipes-at-risk" />
      </div>

      {/* CR-081: Low-Stock Alerts Strip */}
      {kpis.lowStockItems.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-3" data-testid="low-stock-alerts">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-slate-800">Low-Stock Alerts</span>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {kpis.lowStockItems.length} items
              </span>
            </div>
            <a className="text-xs font-semibold text-orange-500 hover:underline" href="/inventory-current-stock" data-testid="view-stock-dashboard-link">
              View Stock Dashboard →
            </a>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {kpis.lowStockItems.map(item => (
              <LowStockItem key={item.id} {...item} />
            ))}
          </div>
        </div>
      )}

      {/* Widgets grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReorderForecastWidget stock={stock} dcr={dcr7} horizonDays={7} vil={vil} />
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
