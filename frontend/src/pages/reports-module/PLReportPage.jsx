// CR-094: Profit & Loss Report — new screen under Daily Reports, above Sales
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar as CalendarIcon, TrendingUp, TrendingDown, IndianRupee, Receipt, Download, Loader2, Check } from 'lucide-react'; // BUG-303: DollarSign→IndianRupee
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { getProfitLossReport } from '@/api/services/reportService';
import Sidebar from '@/components/layout/Sidebar';

// CR-094: Helpers
const fmtINR = (v) => {
  const n = parseFloat(v) || 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);
};
const fmtISO = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};
const CHART_COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981'];
const PIE_COLORS = ['#EF4444', '#F59E0B'];

export default function PLReportPage() {
  const navigate = useNavigate();
  const today = fmtISO(new Date());
  const weekAgo = fmtISO(new Date(Date.now() - 6 * 86400000));
  const [fromDate, setFromDate] = useState(weekAgo);
  const [toDate, setToDate] = useState(today);
  const [appliedFrom, setAppliedFrom] = useState(weekAgo);   // BUG-258
  const [appliedTo, setAppliedTo] = useState(today);          // BUG-258
  const [activePreset, setActivePreset] = useState('7D');     // BUG-261: default 7D
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false); // CR-052

  // BUG-258+261: Preset pill handler (matches ExpenseReport pattern)
  const applyPreset = (preset) => {
    const t = new Date();
    let f = new Date();
    switch (preset) {
      case 'Today': f = t; break;
      case '7D': f = new Date(t); f.setDate(f.getDate() - 6); break;
      case '30D': f = new Date(t); f.setDate(f.getDate() - 29); break;
      case 'MTD': f = new Date(t.getFullYear(), t.getMonth(), 1); break;
      default: break;
    }
    const fStr = fmtISO(f), tStr = fmtISO(t);
    setFromDate(fStr); setToDate(tStr);
    setAppliedFrom(fStr); setAppliedTo(tStr);
    setActivePreset(preset);
  };
  const handleApply = () => {
    setAppliedFrom(fromDate); setAppliedTo(toDate);
    setActivePreset('');
  };
  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const draftValid = fromDate && toDate && fromDate <= toDate;
  const canApply = draftDirty && draftValid && !loading;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProfitLossReport(appliedFrom, appliedTo); // BUG-258: use applied dates
      setData(res);
    } catch (err) {
      toast.error(err?.readableMessage || 'Failed to load P&L report');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [appliedFrom, appliedTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

// CR-094: Parse summary KPIs
  // BUG-PL-B fix: API returns comma-formatted strings e.g. "537,876.02" — strip commas before parseFloat
  const numStr = (v) => parseFloat(String(v ?? 0).replace(/,/g, '')) || 0;

  const summary = useMemo(() => {
    if (!data?.summary) return null;
    const s = data.summary;
    return {
      totalSales:    numStr(s.total_sales),
      paidRevenue:   numStr(s.total_paid_revenue ?? s.paid_revenue),
      totalExpenses: numStr(s.total_expenses),
      totalPurchase: numStr(s.total_purchase),
      profitLoss:    numStr(s.total_profit_loss ?? s.profit_loss),
    };
  }, [data]);

  // CR-094: Chart data from report rows — BUG-PL-B fix: strip commas
  const chartData = useMemo(() => {
    if (!data?.report?.length) return [];
    return data.report.map(r => ({
      date:     r.date || '',
      revenue:  numStr(r.sales || r.paid_revenue),
      expenses: numStr(r.total_expenses),
      purchase: numStr(r.total_purchase || r.purchase),
      profit:   numStr(r.profit_loss),
    }));
  }, [data]);

  // CR-094: Table rows with client-side sort
  const tableRows = useMemo(() => {
    if (!data?.report?.length) return [];
    const rows = data.report.map(r => ({
      date:        r.date || '',
      sales:       numStr(r.sales),
      paidRevenue: numStr(r.paid_revenue),
      expenses:    numStr(r.total_expenses),
      purchase:    numStr(r.total_purchase || r.purchase),
      profitLoss:  numStr(r.profit_loss),
    }));
    // BUG-303: convert DD/MM/YYYY to YYYY-MM-DD for correct date sort
    const toSortable = (s) => { const [d,m,y] = (s||'').split('/'); return y&&m&&d ? `${y}-${m}-${d}` : s||''; };
    rows.sort((a, b) => {
      let av = a[sortCol], bv = b[sortCol];
      if (sortCol === 'date') { av = toSortable(av); bv = toSortable(bv); }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return rows;
  }, [data, sortCol, sortDir]);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };
  const sortIcon = (col) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  // CR-094: Pie data
  const pieData = useMemo(() => {
    if (!summary) return [];
    return [
      { name: 'Expenses', value: summary.totalExpenses },
      { name: 'Purchase', value: summary.totalPurchase },
    ].filter(d => d.value > 0);
  }, [summary]);

  // CR-094: PDF export
  const handleExportPDF = () => {
    if (!tableRows.length) return;
    const rows = tableRows.map(r =>
      `<tr><td style="padding:6px 8px">${r.date}</td><td style="padding:6px 8px;text-align:right">${fmtINR(r.sales)}</td><td style="padding:6px 8px;text-align:right">${fmtINR(r.paidRevenue)}</td><td style="padding:6px 8px;text-align:right">${fmtINR(r.expenses)}</td><td style="padding:6px 8px;text-align:right">${fmtINR(r.purchase)}</td><td style="padding:6px 8px;text-align:right;font-weight:700;color:${r.profitLoss >= 0 ? '#16A34A' : '#DC2626'}">${fmtINR(r.profitLoss)}</td></tr>`
    ).join('');
    const html = `<html><head><title>P&L Report</title><style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse}th{background:#f1f5f9;text-align:left;padding:8px;font-size:11px;text-transform:uppercase;border-bottom:2px solid #e2e8f0}td{border-bottom:1px solid #f1f5f9;font-size:13px}tfoot td{font-weight:700;border-top:2px solid #e2e8f0;padding:8px}</style></head><body><h2>Profit & Loss Report</h2><p style="color:#64748B">${appliedFrom} to ${appliedTo}</p><table><thead><tr><th>Date</th><th style="text-align:right">Sales</th><th style="text-align:right">Paid Revenue</th><th style="text-align:right">Expenses</th><th style="text-align:right">Purchase</th><th style="text-align:right">Net P&L</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td>TOTAL</td><td style="text-align:right">${fmtINR(summary?.totalSales)}</td><td style="text-align:right">${fmtINR(summary?.paidRevenue)}</td><td style="text-align:right">${fmtINR(summary?.totalExpenses)}</td><td style="text-align:right">${fmtINR(summary?.totalPurchase)}</td><td style="text-align:right;font-weight:700;color:${(summary?.profitLoss || 0) >= 0 ? '#16A34A' : '#DC2626'}">${fmtINR(summary?.profitLoss)}</td></tr></tfoot></table></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  const KpiCard = ({ label, value, icon: Icon, color, isCurrency = true }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3" data-testid={`pl-kpi-${label.toLowerCase().replace(/[^a-z]/g, '-')}`}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
        <Icon className="w-4.5 h-4.5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-lg font-bold mt-0.5" style={{ color }}>{isCurrency ? fmtINR(value) : value}</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50" data-testid="pl-report-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <div className={`flex-1 transition-all duration-300 ${isSidebarExpanded ? 'ml-64' : 'ml-16'}`}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Header */}
          {/* BUG-258+261: Header with preset pills (matches ExpenseReport pattern) */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" data-testid="pl-back-btn">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Profit & Loss Report</h1>
                <p className="text-xs text-slate-500">Revenue vs expenses breakdown</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-slate-200'} bg-white rounded-lg`} data-testid="pl-daterange">
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                <label className="flex items-center gap-1.5 text-sm text-slate-600">
                  <span className="text-xs text-slate-400 uppercase tracking-wide">From</span>
                  <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setActivePreset(''); }} max={today} className="bg-transparent border-0 outline-none text-sm font-medium text-slate-800 cursor-pointer focus:ring-0 p-0" data-testid="pl-date-from" />
                </label>
                <span className="text-slate-300">—</span>
                <label className="flex items-center gap-1.5 text-sm text-slate-600">
                  <span className="text-xs text-slate-400 uppercase tracking-wide">To</span>
                  <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setActivePreset(''); }} max={today} className="bg-transparent border-0 outline-none text-sm font-medium text-slate-800 cursor-pointer focus:ring-0 p-0" data-testid="pl-date-to" />
                </label>
              </div>
              <button onClick={handleApply} disabled={!canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${canApply ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`} data-testid="pl-apply-btn">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />} Apply
              </button>
              <div className="flex items-center gap-1 px-1.5 py-1 bg-slate-100 rounded-lg" data-testid="pl-presets">
                {['Today', '7D', '30D', 'MTD'].map(p => (
                  <button key={p} disabled={loading} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${activePreset === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`} data-testid={`pl-preset-${p.toLowerCase()}`} onClick={() => applyPreset(p)}>{p}</button>
                ))}
              </div>
              {tableRows.length > 0 && (
                <Button onClick={handleExportPDF} variant="outline" size="sm" className="text-xs gap-1" data-testid="pl-export-pdf">
                  <Download className="w-3.5 h-3.5" /> PDF
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-slate-400 gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading P&L data...</div>
          ) : !data || !summary ? (
            <div className="py-20 text-center text-sm text-slate-400" data-testid="pl-empty">No data for selected period. Try a different date range.</div>
          ) : (
            <>
              {/* KPI Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" data-testid="pl-kpi-strip">
                <KpiCard label="Total Sales" value={summary.totalSales} icon={IndianRupee} color="#3B82F6" /> {/* BUG-303: DollarSign→IndianRupee */}
                <KpiCard label="Paid Revenue" value={summary.paidRevenue} icon={TrendingUp} color="#10B981" />
                <KpiCard label="Total Expenses" value={summary.totalExpenses} icon={Receipt} color="#EF4444" />
                <KpiCard label="Net P&L" value={summary.profitLoss} icon={summary.profitLoss >= 0 ? TrendingUp : TrendingDown} color={summary.profitLoss >= 0 ? '#16A34A' : '#DC2626'} />
              </div>

              {/* Charts Row */}
              {chartData.length >= 1 && ( // BUG-259: show charts even with 1 data point
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                  {/* Bar Chart */}
                  <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4" data-testid="pl-bar-chart">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Revenue vs Expenses</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={chartData} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v) => fmtINR(v)} />
                        <Bar dataKey="revenue" name="Revenue" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Pie Chart */}
                  {pieData.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4" data-testid="pl-pie-chart">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Cost Breakdown</p>
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v) => fmtINR(v)} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

              {/* Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm" data-testid="pl-table">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {[
                        { key: 'date', label: 'Date', align: '' },
                        { key: 'sales', label: 'Sales', align: 'text-right' },
                        { key: 'paidRevenue', label: 'Paid Revenue', align: 'text-right' },
                        { key: 'expenses', label: 'Expenses', align: 'text-right' },
                        { key: 'purchase', label: 'Purchase', align: 'text-right' },
                        { key: 'profitLoss', label: 'Net P&L', align: 'text-right' },
                      ].map(col => (
                        <th key={col.key}
                          className={`py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-700 select-none ${col.align}`}
                          onClick={() => toggleSort(col.key)}>
                          {col.label}{sortIcon(col.key)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((r, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors" data-testid={`pl-row-${i}`}>
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">{r.date}</td>
                        <td className="py-3 px-4 text-sm text-right text-slate-700">{fmtINR(r.sales)}</td>
                        <td className="py-3 px-4 text-sm text-right text-slate-700">{fmtINR(r.paidRevenue)}</td>
                        <td className="py-3 px-4 text-sm text-right text-red-600">{fmtINR(r.expenses)}</td>
                        <td className="py-3 px-4 text-sm text-right text-amber-600">{fmtINR(r.purchase)}</td>
                        <td className={`py-3 px-4 text-sm text-right font-bold ${r.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {fmtINR(r.profitLoss)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-orange-50/50 border-t-2 border-slate-200" data-testid="pl-total-row">
                      <td className="py-2.5 px-4 text-xs font-bold text-slate-700">TOTAL</td>
                      <td className="py-2.5 px-4 text-sm text-right font-bold text-slate-900">{fmtINR(summary.totalSales)}</td>
                      <td className="py-2.5 px-4 text-sm text-right font-bold text-slate-900">{fmtINR(summary.paidRevenue)}</td>
                      <td className="py-2.5 px-4 text-sm text-right font-bold text-red-600">{fmtINR(summary.totalExpenses)}</td>
                      <td className="py-2.5 px-4 text-sm text-right font-bold text-amber-600">{fmtINR(summary.totalPurchase)}</td>
                      <td className={`py-2.5 px-4 text-sm text-right font-extrabold ${summary.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmtINR(summary.profitLoss)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
