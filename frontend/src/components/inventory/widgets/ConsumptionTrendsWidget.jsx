// CR-078 · CR-079 · Widget: Consumption Trends (30d line chart)
// CR-081 Screen 2: +ingredient dropdown + AVG/DAY + TOTAL + Δ VS PREV stats
import { useState, useMemo } from 'react';
import { TrendingUp, ChevronRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { parseQuantity, convertToBase } from '@/utils/purchasePlanner';

export default function ConsumptionTrendsWidget({ dcr }) {
  const stockDetails = dcr?.stock_details || [];
  const stockSummary = dcr?.stock_summary || [];

  // CR-081: Build ingredient list for dropdown
  const ingredients = useMemo(() => {
    const seen = new Map();
    stockSummary.forEach(r => {
      const id = String(r.ingredient_id);
      if (!seen.has(id)) seen.set(id, r.ingredient_name || r.name || `#${id}`);
    });
    return [{ id: 'all', name: 'All Ingredients' }, ...Array.from(seen.entries()).map(([id, name]) => ({ id, name }))];
  }, [stockSummary]);

  const [selectedIng, setSelectedIng] = useState('all');

  // Aggregate by date, filtered by ingredient
  const { chartData, avgPerDay, total, deltaPct } = useMemo(() => {
    const byDate = new Map();
    stockDetails.forEach(row => {
      if (selectedIng !== 'all' && String(row.ingredient_id) !== selectedIng) return;
      const date = row.consumption_date || row.date;
      if (!date) return;
      const { value, unit } = parseQuantity(row.quantity || row.consumed);
      const base = convertToBase(value, unit);
      if (!byDate.has(date)) byDate.set(date, 0);
      byDate.set(date, byDate.get(date) + base.value);
    });
    const sorted = Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-30);
    const data = sorted.map(([date, t]) => ({ date: date.slice(5), total: Number(t.toFixed(1)) }));
    const t = data.reduce((s, d) => s + d.total, 0);
    const avg = data.length > 0 ? t / data.length : 0;
    // Delta: last 15d vs first 15d
    const mid = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, mid).reduce((s, d) => s + d.total, 0);
    const secondHalf = data.slice(mid).reduce((s, d) => s + d.total, 0);
    const delta = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf * 100) : 0;
    return { chartData: data, avgPerDay: avg, total: t, deltaPct: delta };
  }, [stockDetails, selectedIng]);

  const ingName = ingredients.find(i => i.id === selectedIng)?.name || 'All';
  const unit = selectedIng === 'all' ? '' : 'kg';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4" data-testid="widget-consumption-trends">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-slate-900">Consumption Trends</h3>
        </div>
        <select value={selectedIng} onChange={e => setSelectedIng(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none"
          data-testid="consumption-ingredient-select">
          {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>
      <p className="text-[10px] text-slate-400 mb-2">{ingName} · daily consumption · last 30 days · <a className="text-orange-500 hover:underline">View details →</a></p>
      {chartData.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-4">No consumption data for this window.</p>
      ) : (
        <>
          <div style={{ width: '100%', height: 150 }} data-testid="consumption-chart">
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Line type="monotone" dataKey="total" stroke="#F97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* CR-081: Stats row */}
          <div className="flex items-center justify-around mt-3 pt-3 border-t border-slate-100">
            <div className="text-center">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">AVG/DAY</div>
              <div className="text-sm font-bold text-slate-800">{avgPerDay.toFixed(1)} {unit}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">TOTAL</div>
              <div className="text-sm font-bold text-slate-800">{total.toFixed(0)} {unit}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Δ VS PREV</div>
              <div className={`text-sm font-bold ${deltaPct > 0 ? 'text-red-600' : deltaPct < 0 ? 'text-green-600' : 'text-slate-500'}`}>
                {deltaPct > 0 ? '↑' : deltaPct < 0 ? '↓' : ''}{Math.abs(deltaPct).toFixed(0)}%
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
