// CR-078 · CR-079 · Widget: Recipe Cost & Margin
// Locked FB-7-Q2 colour bands: green ≥50% · amber 30-49% · red <30%
import { Percent, ChevronRight } from 'lucide-react';
import { parseQuantity, convertToBase } from '@/utils/purchasePlanner';

const BAND = { green: 'bg-green-50 text-green-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700' };

function bandOf(m) { return m >= 50 ? 'green' : m >= 30 ? 'amber' : 'red'; }

export default function RecipeCostMarginWidget({ recipes, foods, vil }) {
  // Latest rate per ingredient (in base unit)
  const latestRate = new Map();
  (vil || []).forEach(r => {
    const key = String(r.ingredient_id);
    const d = r.Purchase_Date;
    const existing = latestRate.get(key);
    if (!existing || String(d) > String(existing.date)) {
      latestRate.set(key, { rate: Number(r.unit_price) || 0, date: d, unit: parseQuantity(r.Quantity).unit });
    }
  });

  // Food price lookup by name (case-insensitive)
  const priceByName = new Map();
  (foods || []).forEach(f => {
    const nm = (f.name || f.food_name || '').toLowerCase().trim();
    const p = Number(f.price || f.food_price || f.sale_price || 0);
    if (nm && p > 0) priceByName.set(nm, p);
  });

  const rows = (recipes || [])
    .map(r => {
      const name = r.name || r.recipe_name || '';
      const serves = Number(r.serves || r.no_of_serve || 1);
      const ingredients = r.ingredients || r.recipe_ingredients || [];
      if (!ingredients.length) return null;
      const costPerServe = ingredients.reduce((sum, i) => {
        const ingId = String(i.ingredient_id || i.id);
        const rateInfo = latestRate.get(ingId);
        if (!rateInfo) return sum;
        const qty = Number(i.quantity || i.qty) || 0;
        return sum + (qty * rateInfo.rate);
      }, 0) / (serves || 1);
      const salePrice = priceByName.get(name.toLowerCase().trim()) || 0;
      if (!(salePrice > 0)) return null;
      const margin = ((salePrice - costPerServe) / salePrice) * 100;
      return { name, costPerServe, salePrice, margin };
    })
    .filter(Boolean)
    .sort((a, b) => a.margin - b.margin)   // worst first
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4" data-testid="widget-recipe-cost-margin">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Percent className="w-4 h-4 text-purple-500" />
          <h3 className="text-sm font-semibold text-slate-900">Recipe Cost &amp; Margin</h3>
        </div>
        <a className="text-xs text-slate-400 hover:text-orange-500 flex items-center gap-0.5" data-testid="widget-details-recipe-cost-margin">View details <ChevronRight className="w-3 h-3" /></a>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-4">Add recipes and match them to menu foods to see cost-margin analysis.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r, i) => {
            const b = bandOf(r.margin);
            return (
              <div key={i} className="flex items-center justify-between text-xs" data-testid={`margin-row-${i}`}>
                <span className="text-slate-700 truncate flex-1">{r.name}</span>
                <span className={`${BAND[b]} font-medium px-2 py-0.5 rounded`}>
                  {r.margin.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[10px] text-slate-400 mt-2">Green ≥50% · Amber 30-49% · Red &lt;30%</p>
    </div>
  );
}
