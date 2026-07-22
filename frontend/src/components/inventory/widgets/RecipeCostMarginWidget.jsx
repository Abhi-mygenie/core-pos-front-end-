// CR-078 · CR-079 · Widget: Recipe Cost & Margin
// CR-081 WU-1b: Rewrite → proper table with RECIPE, COST/SERVE, SALE ₹, MARGIN (badge), Δ VS PREV
// Locked FB-7-Q2 colour bands: green ≥50% · amber 30-49% · red <30%
import { useMemo } from 'react';
import { Percent, ChevronRight } from 'lucide-react';
import { parseQuantity } from '@/utils/purchasePlanner';

const TH = "py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border-b-2 border-slate-200 whitespace-nowrap";
const TD = "py-2 px-3 border-b border-slate-200 text-xs";
const TD_SEP = "py-2 px-3 border-b border-slate-200 border-l border-slate-100 text-xs";

const BAND = { green: 'bg-green-100 text-green-700', amber: 'bg-amber-100 text-amber-700', red: 'bg-red-100 text-red-700' };
function bandOf(m) { return m >= 50 ? 'green' : m >= 30 ? 'amber' : 'red'; }

export default function RecipeCostMarginWidget({ recipes, foods, vil }) {
  const latestRate = useMemo(() => {
    const map = new Map();
    (vil || []).forEach(r => {
      const key = String(r.ingredient_id);
      const d = r.Purchase_Date;
      const existing = map.get(key);
      if (!existing || String(d) > String(existing.date)) {
        map.set(key, { rate: Number(r.unit_price) || 0, date: d, unit: parseQuantity(r.Quantity).unit });
      }
    });
    return map;
  }, [vil]);

  const priorRate = useMemo(() => {
    const now = new Date();
    const cutoff30 = new Date(now); cutoff30.setDate(now.getDate() - 30);
    const cutoff60 = new Date(now); cutoff60.setDate(now.getDate() - 60);
    const map = new Map();
    (vil || []).forEach(r => {
      const d = new Date(r.Purchase_Date);
      if (isNaN(d) || d >= cutoff30 || d < cutoff60) return;
      const key = String(r.ingredient_id);
      const existing = map.get(key);
      if (!existing || String(r.Purchase_Date) > String(existing.date)) {
        map.set(key, { rate: Number(r.unit_price) || 0, date: r.Purchase_Date });
      }
    });
    return map;
  }, [vil]);

  const priceByName = useMemo(() => {
    const map = new Map();
    (foods || []).forEach(f => {
      const nm = (f.name || f.food_name || '').toLowerCase().trim();
      const p = Number(f.price || f.food_price || f.sale_price || 0);
      if (nm && p > 0) map.set(nm, p);
    });
    return map;
  }, [foods]);

  const rows = useMemo(() => {
    return (recipes || [])
      .map(r => {
        const name = r.name || r.recipe_name || '';
        const serves = Number(r.serves || r.no_of_serve || 1);
        const ingredients = r.ingredients || r.recipe_ingredients || [];
        if (!ingredients.length) return null;
        const costPerServe = ingredients.reduce((sum, i) => {
          const ingId = String(i.ingredient_id || i.id);
          const rateInfo = latestRate.get(ingId);
          if (!rateInfo) return sum;
          return sum + (Number(i.quantity || i.qty) || 0) * rateInfo.rate;
        }, 0) / (serves || 1);
        const priorCostPerServe = ingredients.reduce((sum, i) => {
          const ingId = String(i.ingredient_id || i.id);
          const rateInfo = priorRate.get(ingId) || latestRate.get(ingId);
          if (!rateInfo) return sum;
          return sum + (Number(i.quantity || i.qty) || 0) * rateInfo.rate;
        }, 0) / (serves || 1);
        const salePrice = priceByName.get(name.toLowerCase().trim()) || 0;
        if (!(salePrice > 0)) return null;
        const margin = ((salePrice - costPerServe) / salePrice) * 100;
        const deltaPct = priorCostPerServe > 0 ? ((costPerServe - priorCostPerServe) / priorCostPerServe * 100) : 0;
        return { name, costPerServe, salePrice, margin, deltaPct };
      })
      .filter(Boolean)
      .sort((a, b) => a.margin - b.margin)
      .slice(0, 6);
  }, [recipes, latestRate, priorRate, priceByName]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4" data-testid="widget-recipe-cost-margin">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Percent className="w-4 h-4 text-purple-500" />
          <h3 className="text-sm font-semibold text-slate-900">Recipe Cost &amp; Margin</h3>
          <div className="flex items-center gap-2 ml-2">
            <span className="flex items-center gap-1 text-[9px] text-slate-400"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />{'\u2265'}50%</span>
            <span className="flex items-center gap-1 text-[9px] text-slate-400"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />30-49%</span>
            <span className="flex items-center gap-1 text-[9px] text-slate-400"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />&lt;30%</span>
          </div>
        </div>
        <a className="text-xs text-slate-400 hover:text-orange-500 flex items-center gap-0.5" data-testid="widget-details-recipe-cost-margin">View details <ChevronRight className="w-3 h-3" /></a>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-4">Add recipes and match them to menu foods to see cost-margin analysis.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" data-testid="recipe-margin-table">
            <thead>
              <tr>
                <th className={TH}>Recipe</th>
                <th className={`${TH} text-right`}>Cost/Serve</th>
                <th className={`${TH} text-right`}>Sale ₹</th>
                <th className={`${TH} text-center`}>Margin</th>
                <th className={`${TH} text-right`}>Δ vs Prev</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const b = bandOf(r.margin);
                return (
                  <tr key={i} className="hover:bg-slate-50/50" data-testid={`margin-row-${i}`}>
                    <td className={TD}><span className="text-slate-800 font-medium">{r.name}</span></td>
                    <td className={`${TD_SEP} text-right text-slate-700`}>₹{r.costPerServe.toFixed(2)}</td>
                    <td className={`${TD_SEP} text-right text-slate-700`}>₹{r.salePrice.toFixed(0)}</td>
                    <td className={`${TD_SEP} text-center`}>
                      <span className={`${BAND[b]} font-bold px-2 py-0.5 rounded text-[10px]`}>{r.margin.toFixed(0)}%</span>
                    </td>
                    <td className={`${TD_SEP} text-right`}>
                      {Math.abs(r.deltaPct) > 0.5 ? (
                        <span className={`text-[10px] font-semibold ${r.deltaPct > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {r.deltaPct > 0 ? '↑' : '↓'}{Math.abs(r.deltaPct).toFixed(1)}%
                        </span>
                      ) : <span className="text-[10px] text-slate-400">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
