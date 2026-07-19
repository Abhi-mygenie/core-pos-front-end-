// CR-078 · CR-079 · Widget: Cost Trend — week-over-week rate delta per ingredient
import { DollarSign, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react';

export default function CostTrendWidget({ vil }) {
  // Group by ingredient · compute avg rate for this week vs prior week
  const now = new Date();
  const wkStart = new Date(now); wkStart.setDate(now.getDate() - 7);
  const priorStart = new Date(now); priorStart.setDate(now.getDate() - 14);

  const byIng = new Map();
  (vil || []).forEach(r => {
    const d = new Date(r.Purchase_Date);
    if (isNaN(d)) return;
    const price = Number(r.unit_price);
    if (!(price > 0)) return;
    const key = String(r.ingredient_id);
    if (!byIng.has(key)) byIng.set(key, { name: r.Ingredient_Name || 'Unknown', thisW: [], priorW: [] });
    const entry = byIng.get(key);
    if (d >= wkStart) entry.thisW.push(price);
    else if (d >= priorStart) entry.priorW.push(price);
  });

  const rows = Array.from(byIng.values())
    .map(e => {
      const avg = arr => arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null;
      const thisAvg = avg(e.thisW);
      const priorAvg = avg(e.priorW);
      if (thisAvg === null || priorAvg === null) return null;
      const delta = ((thisAvg - priorAvg) / priorAvg) * 100;
      return { name: e.name, thisAvg, priorAvg, delta };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4" data-testid="widget-cost-trend">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-900">Cost Trend</h3>
        </div>
        <a className="text-xs text-slate-400 hover:text-orange-500 flex items-center gap-0.5" data-testid="widget-details-cost-trend">View details <ChevronRight className="w-3 h-3" /></a>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-4">No purchase history in the last 14 days.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between text-xs" data-testid={`cost-row-${i}`}>
              <span className="text-slate-700 truncate flex-1">{r.name}</span>
              <span className={`flex items-center gap-1 font-medium ${r.delta > 0 ? 'text-red-600' : r.delta < 0 ? 'text-green-600' : 'text-slate-500'}`}>
                {r.delta > 0 ? <ArrowUp className="w-3 h-3" /> : r.delta < 0 ? <ArrowDown className="w-3 h-3" /> : null}
                {Math.abs(r.delta).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-slate-400 mt-2">This week vs previous week · rate change per unit</p>
    </div>
  );
}
