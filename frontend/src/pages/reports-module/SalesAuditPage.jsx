// CR-474: Sales Audit — Date-Wise Sales Revenue Report
// Pattern: mirrors ItemConsumptionReportPage (CR-472) + PLReportPage chart
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Loader2, Layers, Calendar as CalendarIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { getDateWiseSalesRevenue } from '@/api/services/inventoryService';
import Sidebar from '@/components/layout/Sidebar';

// CR-474: Helpers
const toISO = (d) => new Date(d).toISOString().slice(0, 10);
const today = () => toISO(new Date());
const monthStart = () => toISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const fmtINR = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(v) || 0);
const fmtDateLabel = (d) => {
  if (!d) return '';
  const [, m, day] = d.split('-');
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(day)} ${months[parseInt(m)]}`;
};
const fmtAxis = (v) => v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v;

// CR-474: Chart colors
const CHART_COLORS = { sales: '#3B82F6', paid: '#329937', cancelled: '#EF4444', discount: '#F59E0B' };

// CR-474: Custom tooltip
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-bold text-slate-900 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono font-semibold text-slate-800">{fmtINR(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function SalesAuditPage() {
  const navigate = useNavigate();
  // BUG-361: persist sidebar
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );

  // CR-474: Date state (MTD default)
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(today());
  const [appliedFrom, setAppliedFrom] = useState(monthStart());
  const [appliedTo, setAppliedTo] = useState(today());
  const [activePreset, setActivePreset] = useState('MTD');

  // CR-474: Data
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState(null);

  // CR-474: Preset handler
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
    const fStr = toISO(f), tStr = toISO(t);
    setFromDate(fStr); setToDate(tStr);
    setAppliedFrom(fStr); setAppliedTo(tStr);
    setActivePreset(preset);
  };
  const handleDateApply = () => { setAppliedFrom(fromDate); setAppliedTo(toDate); setActivePreset(''); };
  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const draftValid = fromDate && toDate && fromDate <= toDate;
  const canApply = draftDirty && draftValid && !loading;

  // CR-474: Fetch
  const fetchReport = useCallback(async () => {
    if (!appliedFrom || !appliedTo) return;
    setLoading(true); setError(null);
    try {
      const res = await getDateWiseSalesRevenue({ from_date: appliedFrom, to_date: appliedTo });
      setReportData(res.data || res);
      setHasFetched(true);
    } catch (err) {
      const msg = err?.readableMessage || err?.response?.data?.message || 'Failed to load Sales Audit report';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [appliedFrom, appliedTo]);

  useEffect(() => { fetchReport(); }, [appliedFrom, appliedTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // CR-474: Computed
  const daily = useMemo(() => reportData?.daily || [], [reportData]);
  const summary = useMemo(() => reportData?.summary || {}, [reportData]);
  const header = reportData?.header || 'Sales Audit';
  const chartData = useMemo(() => daily.map(d => ({ ...d, label: fmtDateLabel(d.date) })), [daily]);

  // CR-474: Dynamic columns from API (Option B — future-proof, auto-reflects backend label changes)
  const KPI_CONFIG = { total_sales: { color: '#3B82F6', testid: 'sales-audit-kpi-total-sales' }, total_cancelled: { color: '#EF4444', testid: 'sales-audit-kpi-total-cancelled', textColor: 'text-red-600' }, total_discount: { color: '#F59E0B', testid: 'sales-audit-kpi-total-discount', textColor: 'text-amber-600' }, total_paid_revenue: { color: '#329937', testid: 'sales-audit-kpi-total-paid', textColor: 'text-emerald-700' } };
  const CHART_CONFIG = { total_sales: { fill: CHART_COLORS.sales, size: 14 }, total_cancelled: { fill: CHART_COLORS.cancelled, size: 8 }, total_discount: { fill: CHART_COLORS.discount, size: 8 }, total_paid_revenue: { fill: CHART_COLORS.paid, size: 14 } };
  const columns = useMemo(() => reportData?.columns || [
    { key: 'date', label: 'Date' }, { key: 'total_sales', label: 'Total Sales' },
    { key: 'total_cancelled', label: 'Total Cancelled' }, { key: 'total_discount', label: 'Total Discount' },
    { key: 'total_paid_revenue', label: 'Total Paid Revenue' },
  ], [reportData]);
  const amountColumns = useMemo(() => columns.filter(c => c.key !== 'date'), [columns]);
  const colLabel = useCallback((key) => columns.find(c => c.key === key)?.label || key, [columns]);

  // CR-474: KPIs — labels from API columns
  const kpis = useMemo(() => amountColumns.map(c => ({
    label: c.label,
    value: fmtINR(summary[c.key]),
    ...(KPI_CONFIG[c.key] || { color: '#64748B', testid: `sales-audit-kpi-${c.key}` }),
  })), [summary, amountColumns]);

  // CR-474: Excel export
  const handleExportExcel = () => {
    if (!daily.length) { toast.error('No data to export'); return; }
    const cols = reportData?.columns || [{ key: 'date', label: 'Date' }, { key: 'total_sales', label: 'Total Sales' }, { key: 'total_cancelled', label: 'Total Cancelled' }, { key: 'total_discount', label: 'Total Discount' }, { key: 'total_paid_revenue', label: 'Total Paid Revenue' }];
    const headers = cols.map(c => c.label);
    const rows = daily.map(r => cols.map(c => c.key === 'date' ? r.date : r[c.key]));
    rows.push(['Total', summary.total_sales, summary.total_cancelled, summary.total_discount, summary.total_paid_revenue]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `sales-audit-${appliedFrom}-${appliedTo}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // CR-474: PDF export
  const handleExportPDF = () => {
    if (!daily.length) { toast.error('No data to export'); return; }
    const tableRows = daily.map(r => {
      const cells = amountColumns.map(c => {
        const color = c.key === 'total_cancelled' ? '#B91C1C' : c.key === 'total_discount' ? '#D97706' : c.key === 'total_paid_revenue' ? '#059669' : '#1e293b';
        const bold = c.key === 'total_paid_revenue' ? 'font-weight:600;' : '';
        return `<td style="padding:6px 8px;text-align:right;color:${color};${bold}">${fmtINR(r[c.key])}</td>`;
      }).join('');
      return `<tr><td style="padding:6px 8px">${r.date}</td>${cells}</tr>`;
    }).join('');
    const totalsCells = amountColumns.map(c => {
      const color = c.key === 'total_cancelled' ? '#B91C1C' : c.key === 'total_discount' ? '#D97706' : c.key === 'total_paid_revenue' ? '#059669' : '#1e293b';
      return `<td style="padding:6px 8px;text-align:right;color:${color}">${fmtINR(summary[c.key])}</td>`;
    }).join('');
    const totalsRow = `<tr style="border-top:2px solid #94a3b8;font-weight:700"><td style="padding:6px 8px">Total</td>${totalsCells}</tr>`;
    const thCells = amountColumns.map(c => `<th style="text-align:right">${c.label}</th>`).join('');
    const html = `<html><head><title>${header} — Sales Audit</title>
      <style>body{font-family:sans-serif;padding:24px}h2{margin-bottom:4px}p{color:#64748B;font-size:13px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse}th{background:#f1f5f9;text-align:left;padding:8px;font-size:11px;text-transform:uppercase;border-bottom:2px solid #e2e8f0}
      td{border-bottom:1px solid #f1f5f9;font-size:13px}</style></head>
      <body><h2>${header}</h2><p>Sales Audit · ${appliedFrom} to ${appliedTo} · ${daily.length} business days</p>
      <table><thead><tr><th>Date</th>${thCells}</tr></thead>
      <tbody>${tableRows}${totalsRow}</tbody></table></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  return (
    <div className="flex min-h-screen bg-slate-50" data-testid="sales-audit-report-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-6 space-y-5 overflow-y-auto">

          {/* CR-474: Header */}
          <div className="flex items-center justify-between flex-wrap gap-y-2 bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm" data-testid="sales-audit-header">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" data-testid="sales-audit-back-btn">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight" data-testid="sales-audit-title">{header}</h1>
                <p className="text-xs text-slate-500 mt-0.5">Sales Audit · {appliedFrom} to {appliedTo} · {daily.length} business days</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!hasFetched || loading} data-testid="sales-audit-export-excel" className="gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!hasFetched || loading} data-testid="sales-audit-export-pdf" className="gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5" /> PDF
              </Button>
            </div>
          </div>

          {/* CR-474: Date bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end shadow-sm" data-testid="sales-audit-filters">
            <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-slate-200'} bg-white rounded-lg`}>
              <CalendarIcon className="w-4 h-4 text-slate-400" />
              <label className="flex items-center gap-1.5 text-sm text-slate-600">
                <span className="text-xs text-slate-400 uppercase tracking-wide">From</span>
                <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setActivePreset(''); }} max={today()} className="bg-transparent border-0 outline-none text-sm font-medium text-slate-800 cursor-pointer focus:ring-0 p-0" data-testid="sales-audit-date-from" />
              </label>
              <span className="text-slate-300">—</span>
              <label className="flex items-center gap-1.5 text-sm text-slate-600">
                <span className="text-xs text-slate-400 uppercase tracking-wide">To</span>
                <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setActivePreset(''); }} max={today()} className="bg-transparent border-0 outline-none text-sm font-medium text-slate-800 cursor-pointer focus:ring-0 p-0" data-testid="sales-audit-date-to" />
              </label>
            </div>
            <button onClick={handleDateApply} disabled={!canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${canApply ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`} data-testid="sales-audit-apply-btn">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />} Apply
            </button>
            <div className="flex items-center gap-1 px-1.5 py-1 bg-slate-100 rounded-lg">
              {['Today', '7D', '30D', 'MTD'].map(p => (
                <button key={p} disabled={loading} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${activePreset === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`} data-testid={`sales-audit-preset-${p.toLowerCase()}`} onClick={() => applyPreset(p)}>{p}</button>
              ))}
            </div>
          </div>

          {/* CR-474: KPI strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map(k => (
              <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5" style={{ borderLeftWidth: 4, borderLeftColor: k.color }} data-testid={k.testid}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{k.label}</p>
                <p className={`text-2xl font-black mt-1 tracking-tight ${k.textColor || 'text-slate-900'}`} style={{ fontFamily: 'ui-monospace, monospace' }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* CR-474: Chart */}
          {hasFetched && daily.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm" data-testid="sales-audit-trend-chart">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Daily Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtAxis} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {amountColumns.map(c => (
                    <Bar key={c.key} dataKey={c.key} name={c.label} fill={(CHART_CONFIG[c.key] || {}).fill || '#94a3b8'} radius={[3, 3, 0, 0]} barSize={(CHART_CONFIG[c.key] || {}).size || 10} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* CR-474: Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm" data-testid="sales-audit-table">
            {loading ? (
              <div className="flex items-center justify-center py-20 gap-2 text-slate-400 text-sm" data-testid="sales-audit-loading">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" /> Loading Sales Audit data…
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-red-500 text-sm gap-2" data-testid="sales-audit-error">
                <p>{error}</p>
                <Button size="sm" variant="outline" onClick={fetchReport}>Retry</Button>
              </div>
            ) : !hasFetched ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-sm gap-2" data-testid="sales-audit-empty-initial">
                <Layers className="w-10 h-10 opacity-20" /> Select a date range and click Apply
              </div>
            ) : daily.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-slate-400 text-sm" data-testid="sales-audit-empty-no-data">
                No data for selected date range
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200">
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                      {amountColumns.map(c => (
                        <th key={c.key} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {daily.map(row => (
                      <tr key={row.date} className="border-b border-slate-100 hover:bg-slate-50 transition-colors" data-testid={`sales-audit-row-${row.date}`}>
                        <td className="px-4 py-2.5 text-sm font-medium text-slate-800">{row.date}</td>
                        {amountColumns.map(c => {
                          const textCls = c.key === 'total_cancelled' ? (row[c.key] > 0 ? 'text-red-600' : 'text-slate-400')
                            : c.key === 'total_discount' ? (row[c.key] > 0 ? 'text-amber-600' : 'text-slate-400')
                            : c.key === 'total_paid_revenue' ? 'text-emerald-700 font-semibold'
                            : 'text-slate-800';
                          return <td key={c.key} className={`px-4 py-2.5 text-sm text-right ${textCls}`} style={{ fontFamily: 'ui-monospace, monospace' }}>{fmtINR(row[c.key])}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-slate-50">
                      <td className="px-4 py-3 text-sm font-bold text-slate-900">Total</td>
                      {amountColumns.map(c => {
                        const textCls = c.key === 'total_cancelled' ? 'text-red-600'
                          : c.key === 'total_discount' ? 'text-amber-600'
                          : c.key === 'total_paid_revenue' ? 'text-emerald-700'
                          : 'text-slate-900';
                        return <td key={c.key} className={`px-4 py-3 text-sm font-bold text-right ${textCls}`} style={{ fontFamily: 'ui-monospace, monospace' }}>{fmtINR(summary[c.key])}</td>;
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
