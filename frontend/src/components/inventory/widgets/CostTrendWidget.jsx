// CR-078 · CR-079 · Widget: Cost Trend — week-over-week rate delta per ingredient
// CR-081 WU-1a: Rewrite → proper table with INGREDIENT, CURRENT RATE, TREND sparkline, Δ VS PREV
import { useMemo } from 'react';
import { DollarSign, ChevronRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

// CR-081: Shared grid table styles
const TH = "py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border-b-2 border-slate-200 whitespace-nowrap";
const TD = "py-2 px-3 border-b border-slate-200 text-xs";
const TD_SEP = "py-2 px-3 border-b border-slate-200 border-l border-slate-100 text-xs";

export default function CostTrendWidget({ vil }) {

  const rows = useMemo(() => {
    const n = new Date();
    // BUG-210 Fix 2: Widen to 30d vs prior 30d (consistent with KPI "Cost Change · 30D")
    const ws = new Date(n); ws.setDate(n.getDate() - 30);
    const ps = new Date(n); ps.setDate(n.getDate() - 60);
    const byIng = new Map();
    (vil || []).forEach(r => {
      const d = new Date(r.Purchase_Date);
      if (isNaN(d)) return;
      const price = Number(r.unit_price);
      if (!(price > 0)) return;
      const key = String(r.ingredient_id);
      if (!byIng.has(key)) byIng.set(key, { name: r.Ingredient_Name || 'Unknown', thisW: [], priorW: [], history: [], unit: '' });
      const entry = byIng.get(key);
      // BUG-210 Fix 4: Extract unit from Quantity field "3 gm" → "gm"
      if (!entry.unit) {
        const qParts = String(r.Quantity || '').trim().split(/\s+/);
        if (qParts.length >= 2) entry.unit = qParts[qParts.length - 1];
      }
      entry.history.push({ date: r.Purchase_Date, price });
      if (d >= ws) entry.thisW.push(price);
      else if (d >= ps) entry.priorW.push(price);
    });

    return Array.from(byIng.values())
      .map(e => {
        const avg = arr => arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null;
        const thisAvg = avg(e.thisW);
        const priorAvg = avg(e.priorW);
        if (thisAvg === null || priorAvg === null) return null;
        const delta = ((thisAvg - priorAvg) / priorAvg) * 100;
        const sparkData = e.history
          .sort((a, b) => String(a.date).localeCompare(String(b.date)))
          .slice(-7)
          .map((h, i) => ({ i, p: h.price }));
        return { name: e.name, currentRate: thisAvg, delta, sparkData, unit: e.unit || '' };
      })
      .filter(Boolean)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 6);
  }, [vil]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4" data-testid="widget-cost-trend">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-900">Cost Trend per Ingredient</h3>
        </div>
        <a className="text-xs text-slate-400 hover:text-orange-500 flex items-center gap-0.5" data-testid="widget-details-cost-trend">View details <ChevronRight className="w-3 h-3" /></a>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-4">No purchase history in the last 14 days.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" data-testid="cost-trend-table">
            <thead>
              <tr>
                <th className={TH}>Ingredient</th>
                <th className={`${TH} text-right`}>Current Rate</th>
                <th className={`${TH} text-center`}>Trend</th>
                <th className={`${TH} text-right`}>Δ vs Prev</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/50" data-testid={`cost-row-${i}`}>
                  <td className={TD}>
                    <span className="text-slate-800 font-medium">{r.name}</span>
                  </td>
                  <td className={`${TD_SEP} text-right text-slate-700 font-medium`}>
                    ₹{r.currentRate.toFixed(0)}{r.unit ? ` / ${r.unit}` : ''}
                  </td>
                  <td className={`${TD_SEP} text-center`}>
                    {r.sparkData.length >= 2 ? (
                      <div className="inline-block" style={{ width: 60, height: 24 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={r.sparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                            <Line type="monotone" dataKey="p" stroke={r.delta >= 0 ? '#EF4444' : '#22C55E'} strokeWidth={1.5} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className={`${TD_SEP} text-right`}>
                    <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded text-[10px] ${
                      r.delta > 0 ? 'bg-red-50 text-red-700' : r.delta < 0 ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-500'
                    }`}>
                      {r.delta > 0 ? '↑' : r.delta < 0 ? '↓' : ''}{Math.abs(r.delta).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[10px] text-slate-400 mt-2">Last 30 days vs prior 30 days · rate change per unit</p>
    </div>
  );
}
