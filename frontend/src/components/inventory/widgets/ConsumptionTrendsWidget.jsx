// CR-078 · CR-079 · Widget: Consumption Trends (30d sparkline · top items)
import { TrendingUp, ChevronRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { parseQuantity, convertToBase } from '@/utils/purchasePlanner';

export default function ConsumptionTrendsWidget({ dcr }) {
  const stockDetails = dcr?.stock_details || [];  // per-order breakdown includes consumption_date
  // Aggregate by date
  const byDate = new Map();
  stockDetails.forEach(row => {
    const date = row.consumption_date || row.date;
    if (!date) return;
    const { value, unit } = parseQuantity(row.quantity || row.consumed);
    const base = convertToBase(value, unit);
    if (!byDate.has(date)) byDate.set(date, 0);
    byDate.set(date, byDate.get(date) + base.value);
  });
  const chartData = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, total]) => ({ date: date.slice(5), total: Number(total.toFixed(1)) }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4" data-testid="widget-consumption-trends">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-slate-900">Consumption Trends</h3>
        </div>
        <a className="text-xs text-slate-400 hover:text-orange-500 flex items-center gap-0.5" data-testid="widget-details-consumption-trends">View details <ChevronRight className="w-3 h-3" /></a>
      </div>
      {chartData.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-4">No consumption data for this window.</p>
      ) : (
        <div style={{ width: '100%', height: 140 }} data-testid="consumption-chart">
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="text-[10px] text-slate-400 mt-1">Aggregated across all ingredients · normalized to base units</p>
    </div>
  );
}
