// CR-078 · CR-079 · Widget: Reorder Forecast
// Days-left = on_hand / velocity_per_day · red ≤3 · amber ≤7 · green >7
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { computePlan, computeVelocity } from '@/utils/purchasePlanner';

export default function ReorderForecastWidget({ stock, dcr, horizonDays = 7 }) {
  const dcrByIng = new Map((dcr?.stock_summary || []).map(r => [String(r.ingredient_id), r]));
  const rows = (stock || [])
    .filter(item => !item.isSubRecipe)
    .map(item => {
      const velocity = computeVelocity(dcrByIng.get(String(item.id)), item, horizonDays);
      const onHand   = Number(item.calQuantity) || 0;
      const daysLeft = velocity > 0 ? onHand / velocity : Infinity;
      return { id: item.id, name: item.name, unit: item.smallUnit || item.unit, onHand, velocity, daysLeft };
    })
    .filter(r => Number.isFinite(r.daysLeft) && r.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  const bandColour = (d) => d <= 3 ? 'red' : d <= 7 ? 'amber' : 'green';
  const bandBg = { red: 'bg-red-50 text-red-700', amber: 'bg-amber-50 text-amber-700', green: 'bg-green-50 text-green-700' };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4" data-testid="widget-reorder-forecast">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-slate-900">Reorder Forecast</h3>
        </div>
        <a className="text-xs text-slate-400 hover:text-orange-500 flex items-center gap-0.5" data-testid="widget-details-reorder-forecast">View details <ChevronRight className="w-3 h-3" /></a>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-4">Not enough consumption data yet — check back after 3+ days of activity.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map(r => {
            const b = bandColour(r.daysLeft);
            return (
              <div key={r.id} className="flex items-center justify-between text-xs" data-testid={`reorder-row-${r.id}`}>
                <span className="text-slate-700 truncate flex-1">{r.name}</span>
                <span className={`${bandBg[b]} font-medium px-2 py-0.5 rounded ml-2`}>
                  {r.daysLeft.toFixed(1)} d
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
