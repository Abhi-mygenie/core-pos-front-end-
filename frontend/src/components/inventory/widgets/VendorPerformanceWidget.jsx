// CR-078 · CR-079 · Widget: Vendor Performance — 30d spend + rate delta vs cheapest for shared ingredients
import { BarChart3, ChevronRight } from 'lucide-react';

export default function VendorPerformanceWidget({ vil }) {
  const now = new Date();
  const cutoff = new Date(now); cutoff.setDate(now.getDate() - 30);

  // Per-vendor aggregates + best rate per ingredient across all vendors
  const bestRateByIng = new Map();
  (vil || []).forEach(r => {
    const price = Number(r.unit_price);
    if (!(price > 0)) return;
    const ing = String(r.ingredient_id);
    if (!bestRateByIng.has(ing) || price < bestRateByIng.get(ing)) bestRateByIng.set(ing, price);
  });

  const byVendor = new Map();
  (vil || []).forEach(r => {
    if (!r.vendor_id) return;
    const d = new Date(r.Purchase_Date);
    if (isNaN(d) || d < cutoff) return;
    const key = String(r.vendor_id);
    if (!byVendor.has(key)) byVendor.set(key, { name: r.Vendor_Name || `Vendor #${r.vendor_id}`, spend: 0, items: new Set(), deltas: [] });
    const entry = byVendor.get(key);
    entry.spend += Number(r.line_total || r.Amount) || 0;
    entry.items.add(String(r.ingredient_id));
    const best = bestRateByIng.get(String(r.ingredient_id));
    const price = Number(r.unit_price) || 0;
    if (best && price > 0) entry.deltas.push(((price - best) / best) * 100);
  });

  const rows = Array.from(byVendor.values())
    .map(v => ({
      name: v.name,
      spend: v.spend,
      itemsCount: v.items.size,
      avgDelta: v.deltas.length ? v.deltas.reduce((s, x) => s + x, 0) / v.deltas.length : 0,
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4" data-testid="widget-vendor-performance">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-500" />
          <h3 className="text-sm font-semibold text-slate-900">Vendor Performance</h3>
        </div>
        <a className="text-xs text-slate-400 hover:text-orange-500 flex items-center gap-0.5" data-testid="widget-details-vendor-performance">View details <ChevronRight className="w-3 h-3" /></a>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-4">No vendor purchase history in the last 30 days.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="text-xs" data-testid={`vendor-perf-${i}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800 truncate flex-1">{r.name}</span>
                <span className="text-slate-500 ml-2">₹{r.spend.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                <span>{r.itemsCount} item{r.itemsCount === 1 ? '' : 's'}</span>
                <span className={r.avgDelta > 5 ? 'text-red-500' : r.avgDelta < -1 ? 'text-green-600' : 'text-slate-400'}>
                  {r.avgDelta >= 0 ? '+' : ''}{r.avgDelta.toFixed(1)}% vs cheapest
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
