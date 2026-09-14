// CR-078 · CR-079 · Widget: Reorder Forecast
// CR-081 WU-1c: Grid borders — proper bordered table per v5 mockup
import { AlertTriangle } from 'lucide-react';
import { computeVelocity } from '@/utils/purchasePlanner';

const TH = "py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border-b-2 border-slate-200 whitespace-nowrap";
const TD = "py-2 px-3 border-b border-slate-200 text-xs";
const TD_SEP = "py-2 px-3 border-b border-slate-200 border-l border-slate-100 text-xs";
const BAND_STYLE = { red: 'bg-red-100 text-red-700', amber: 'bg-amber-100 text-amber-700', green: 'bg-green-100 text-green-700' };

export default function ReorderForecastWidget({ stock, dcr, horizonDays = 7, vil }) {
  const dcrByIng = new Map((dcr?.stock_summary || []).map(r => [String(r.ingredient_id), r]));
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
      const onHand = Number(item.calQuantity) || 0;
      // BUG-210 Fix 1: OOS items without velocity = 0d. Clamp negative to 0.
      const rawDays = velocity > 0 ? onHand / velocity : (onHand <= 0 ? 0 : Infinity);
      const daysLeft = Number.isFinite(rawDays) ? Math.max(0, rawDays) : rawDays;
      const suggestReorder = velocity > 0 ? Math.max(0, Math.ceil(velocity * horizonDays) - onHand) : (onHand <= 0 ? Math.abs(onHand) : 0);
      const vendor = vendorByIng.get(String(item.id));
      const unit = item.smallUnit || item.unit || '';
      const fmtQty = (q, u) => {
        if (u === 'gm' && q >= 1000) return `${(q / 1000).toFixed(1)} kg`;
        if (u === 'ml' && q >= 1000) return `${(q / 1000).toFixed(1)} ltr`;
        return `${q.toFixed(q < 10 ? 2 : 0)} ${u}`;
      };
      return { id: item.id, name: item.name, onHand, daysLeft, suggestReorder: Math.max(0, suggestReorder), vendor: vendor?.name || '—', fmtOnHand: fmtQty(onHand, unit), fmtSuggest: suggestReorder > 0 ? fmtQty(suggestReorder, unit) : '—' };
    })
    .filter(r => Number.isFinite(r.daysLeft))
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
          <table className="w-full border-collapse" data-testid="reorder-forecast-table">
            <thead>
              <tr>
                <th className={`${TH} text-left`}>Ingredient</th>
                <th className={`${TH} text-right`}>Current</th>
                <th className={`${TH} text-center`}>Days Left</th>
                <th className={`${TH} text-right`}>Suggest Reorder</th>
                <th className={`${TH} text-left`}>Preferred Vendor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50" data-testid={`reorder-row-${r.id}`}>
                  <td className={`${TD} text-slate-800 font-medium`}>{r.name}</td>
                  <td className={TD_SEP} style={{ textAlign: 'right', color: r.onHand <= 0 ? '#EF4444' : '#64748B' }}>{r.fmtOnHand}</td>
                  <td className={`${TD_SEP} text-center`}>
                    <span className={`${BAND_STYLE[band(r.daysLeft)]} font-bold px-2 py-0.5 rounded-full text-[10px]`}>{r.daysLeft.toFixed(0)}d</span>
                  </td>
                  <td className={`${TD_SEP} text-right text-slate-600`}>{r.fmtSuggest}</td>
                  <td className={`${TD_SEP} text-slate-500`}>{r.vendor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
