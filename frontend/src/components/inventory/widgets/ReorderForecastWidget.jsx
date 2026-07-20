// CR-078 · CR-079 · Widget: Reorder Forecast
// CR-081 Screen 2: Table with INGREDIENT, CURRENT, DAYS LEFT, SUGGEST REORDER, PREFERRED VENDOR
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { computeVelocity } from '@/utils/purchasePlanner';

const BAND_STYLE = {
  red:   'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-green-100 text-green-700',
};

export default function ReorderForecastWidget({ stock, dcr, horizonDays = 7, vil }) {
  const dcrByIng = new Map((dcr?.stock_summary || []).map(r => [String(r.ingredient_id), r]));

  // Latest vendor per ingredient from vendor-item-list
  const vendorByIng = new Map();
  (vil || []).forEach(r => {
    const key = String(r.ingredient_id);
    const existing = vendorByIng.get(key);
    if (!existing || String(r.Purchase_Date) > String(existing.date)) {
      vendorByIng.set(key, { name: r.Vendor_Name || '', date: r.Purchase_Date });
    }
  });

  const rows = (stock || [])
    .filter(item => !item.isSubRecipe)
    .map(item => {
      const velocity = computeVelocity(dcrByIng.get(String(item.id)), item, horizonDays);
      const onHand   = Number(item.calQuantity) || 0;
      const daysLeft = velocity > 0 ? onHand / velocity : Infinity;
      const suggestReorder = velocity > 0 ? Math.ceil(velocity * horizonDays) - onHand : 0;
      const vendor = vendorByIng.get(String(item.id));
      const unit = item.smallUnit || item.unit || '';
      // Format qty with unit conversion
      const fmtQty = (q, u) => {
        if (u === 'gm' && q >= 1000) return `${(q / 1000).toFixed(1)} kg`;
        if (u === 'ml' && q >= 1000) return `${(q / 1000).toFixed(1)} ltr`;
        return `${q.toFixed(q < 10 ? 2 : 0)} ${u}`;
      };
      return { id: item.id, name: item.name, unit, onHand, daysLeft, suggestReorder: Math.max(0, suggestReorder), vendor: vendor?.name || '—', fmtOnHand: fmtQty(onHand, unit), fmtSuggest: suggestReorder > 0 ? fmtQty(suggestReorder, unit) : '—' };
    })
    .filter(r => Number.isFinite(r.daysLeft) && r.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 8);

  const band = (d) => d <= 3 ? 'red' : d <= 7 ? 'amber' : 'green';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4" data-testid="widget-reorder-forecast">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-slate-900">Reorder Forecast</h3>
        </div>
        <span className="text-[10px] text-slate-400">Based on daily-consumption-report velocity · <a className="text-orange-500 hover:underline" data-testid="widget-details-reorder-forecast">View details →</a></span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-4">Not enough consumption data yet — check back after 3+ days of activity.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 font-semibold text-slate-500 uppercase tracking-wider">Ingredient</th>
                <th className="text-right py-2 font-semibold text-slate-500 uppercase tracking-wider">Current</th>
                <th className="text-center py-2 font-semibold text-slate-500 uppercase tracking-wider">Days Left</th>
                <th className="text-right py-2 font-semibold text-slate-500 uppercase tracking-wider">Suggest Reorder</th>
                <th className="text-left py-2 pl-3 font-semibold text-slate-500 uppercase tracking-wider">Preferred Vendor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const b = band(r.daysLeft);
                return (
                  <tr key={r.id} className="border-b border-slate-50" data-testid={`reorder-row-${r.id}`}>
                    <td className="py-2 text-slate-800 font-medium">{r.name}</td>
                    <td className="py-2 text-right" style={{ color: r.onHand <= 0 ? '#EF4444' : '#64748B' }}>{r.fmtOnHand}</td>
                    <td className="py-2 text-center">
                      <span className={`${BAND_STYLE[b]} font-bold px-2 py-0.5 rounded-full text-[10px]`}>
                        {r.daysLeft.toFixed(0)}d
                      </span>
                    </td>
                    <td className="py-2 text-right text-slate-600">{r.fmtSuggest}</td>
                    <td className="py-2 pl-3 text-slate-500">{r.vendor}</td>
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
