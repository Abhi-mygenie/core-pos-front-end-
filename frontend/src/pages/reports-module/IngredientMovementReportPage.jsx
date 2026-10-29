// CR-477: Ingredient Movement Report — stock transfers between stores (dispatched/received)
// Pattern: mirrors ItemConsumptionReportPage.jsx (CR-472)
import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronRight, Download, FileText, Loader2, Search, Check, Calendar as CalendarIcon, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getIngredientMovementReport } from '@/api/services/inventoryService';
import Sidebar from '@/components/layout/Sidebar';

// CR-477: Helpers
const toISO = (d) => new Date(d).toISOString().slice(0, 10);
const today = () => toISO(new Date());
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return toISO(d); };
const monthStart = () => toISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

const fmtDate = (str) => {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d)) return str;
  const day = d.getDate();
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${mon} ${hh}:${mm}`;
};

// CR-477: Status badge styles
const STATUS_STYLES = {
  received:   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  dispatched: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  in_transit: { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  pending:    { bg: 'bg-slate-100',  text: 'text-slate-600',   border: 'border-slate-200' },
};
const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${s.bg} ${s.text} ${s.border}`} data-testid={`status-badge-${status}`}>
      {(status || 'unknown').replace(/_/g, ' ')}
    </span>
  );
};

// CR-477: Presets
const PRESETS = [
  { key: 'Today', label: 'Today', from: today(), to: today() },
  { key: 'L7D', label: 'Last 7 Days', from: daysAgo(7), to: today() },
  { key: 'MTD', label: 'MTD', from: monthStart(), to: today() },
];

export default function IngredientMovementReportPage() {
  const navigate = useNavigate();
  // BUG-361: persist sidebar
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );

  // CR-477: Movement toggle
  const [movement, setMovement] = useState('received');

  // CR-477: Date state (draft vs applied — BUG-261 pattern)
  const [fromDate, setFromDate] = useState(daysAgo(7));
  const [toDate, setToDate] = useState(today());
  const [appliedFrom, setAppliedFrom] = useState(daysAgo(7));
  const [appliedTo, setAppliedTo] = useState(today());
  const [activePreset, setActivePreset] = useState('L7D');

  // CR-477: Data
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // CR-477: UI
  const [expandedRows, setExpandedRows] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // CR-477: Preset handler
  const applyPreset = (p) => {
    setFromDate(p.from);
    setToDate(p.to);
    setAppliedFrom(p.from);
    setAppliedTo(p.to);
    setActivePreset(p.key);
  };

  // CR-477: Date apply
  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const canApply = draftDirty && fromDate <= toDate;
  const handleDateApply = () => {
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
    setActivePreset('');
  };

  // CR-477: Fetch report
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getIngredientMovementReport({
        movement,
        from_date: appliedFrom,
        to_date: appliedTo,
      });
      setIngredients(data.ingredients || []);
      setHasFetched(true);
      setExpandedRows({});
    } catch (err) {
      toast.error('Failed to load ingredient movement report');
      console.error('CR-477:', err);
    } finally {
      setLoading(false);
    }
  }, [movement, appliedFrom, appliedTo]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // CR-477: Client-side search filter
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return ingredients;
    const term = searchTerm.toLowerCase();
    return ingredients.filter(i => i.stock_title.toLowerCase().includes(term));
  }, [ingredients, searchTerm]);

  // CR-477: KPI totals
  const totalIngredients = filtered.length;
  const totalTransfers = filtered.reduce((s, i) => s + i.line_count, 0);

  // CR-477: Row toggle
  const toggleRow = (key) => setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));

  // CR-477: Excel export (CSV blob — mirrors CR-472 L142-154)
  const handleExportExcel = () => {
    if (!filtered.length) { toast.error('No data to export'); return; }
    const header = ['Ingredient', 'Unit', 'Total Qty', 'From Store', 'To Store', 'Dispatched', 'Received', 'Qty', 'Ref', 'Status'];
    const rows = filtered.flatMap(ing =>
      ing.lines.map(l => [
        ing.stock_title, ing.unit, ing.total_qty,
        l.from_restaurant_name, l.to_restaurant_name,
        l.dispatched_at || '', l.received_at || '',
        l.quantity, l.reference_code || '', l.status,
      ])
    );
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ingredient-movement-${movement}-${appliedFrom}-${appliedTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // CR-477: PDF export (print window — mirrors CR-472 L158-183)
  const handleExportPDF = () => {
    if (!filtered.length) { toast.error('No data to export'); return; }
    const tableRows = filtered.flatMap(ing =>
      [
        `<tr style="background:#f8fafc;font-weight:600"><td colspan="3">${ing.stock_title}</td><td>${ing.unit}</td><td style="text-align:right">${ing.total_qty}</td><td style="text-align:right">${ing.line_count} transfers</td><td></td></tr>`,
        ...ing.lines.map(l =>
          `<tr><td style="padding-left:24px">${l.from_restaurant_name}</td><td>${l.to_restaurant_name}</td><td>${fmtDate(l.dispatched_at)}</td><td>${fmtDate(l.received_at)}</td><td style="text-align:right">${l.quantity} ${l.unit}</td><td>${l.reference_code || '—'}</td><td>${l.status}</td></tr>`
        ),
      ]
    ).join('');
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Ingredient Movement Report</title>
      <style>body{font-family:Inter,system-ui,sans-serif;padding:32px;color:#1e293b}h1{font-size:20px;margin-bottom:4px}
      .meta{font-size:12px;color:#64748b;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:12px}
      th{text-align:left;padding:8px 6px;border-bottom:2px solid #e2e8f0;font-size:10px;text-transform:uppercase;color:#64748b}
      td{padding:6px;border-bottom:1px solid #f1f5f9}</style></head><body>
      <h1>Ingredient Movement Report</h1>
      <p class="meta">${movement.charAt(0).toUpperCase() + movement.slice(1)} &middot; ${appliedFrom} to ${appliedTo} &middot; ${totalIngredients} ingredients &middot; ${totalTransfers} transfers</p>
      <table><thead><tr><th>From Store</th><th>To Store</th><th>Dispatched</th><th>Received</th><th>Qty</th><th>Ref</th><th>Status</th></tr></thead>
      <tbody>${tableRows}</tbody></table></body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="flex min-h-screen bg-slate-50" data-testid="ingredient-movement-report-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-6">

          {/* CR-477: Header */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-y-2">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" data-testid="report-back-button">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Ingredient Movement</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Stock transfers — {movement} &middot; {appliedFrom} to {appliedTo}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!hasFetched || loading || !filtered.length} data-testid="export-excel-btn" className="gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!hasFetched || loading || !filtered.length} data-testid="export-pdf-btn" className="gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5" /> PDF
              </Button>
            </div>
          </div>

          {/* CR-477: Filter bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 flex flex-wrap gap-3 items-center" data-testid="ingredient-movement-filters">
            {/* Movement toggle */}
            <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1">
              <button
                data-testid="movement-toggle-received"
                onClick={() => setMovement('received')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${movement === 'received' ? 'bg-[#F97316] text-white font-semibold shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >Received</button>
              <button
                data-testid="movement-toggle-dispatched"
                onClick={() => setMovement('dispatched')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${movement === 'dispatched' ? 'bg-[#F97316] text-white font-semibold shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >Dispatched</button>
            </div>

            <div className="w-px h-8 bg-slate-200" />

            {/* Date presets */}
            <div className="flex items-center gap-1.5">
              {PRESETS.map(p => (
                <button
                  key={p.key}
                  data-testid={`date-preset-${p.key.toLowerCase()}`}
                  disabled={loading}
                  onClick={() => applyPreset(p)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${activePreset === p.key ? 'bg-orange-50 text-orange-700 border-orange-300 font-semibold' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'}`}
                >{p.label}</button>
              ))}
            </div>

            {/* Date inputs */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white">
                <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setActivePreset(''); }} max={today()} className="bg-transparent border-0 outline-none text-xs font-medium text-slate-800 cursor-pointer w-[110px]" data-testid="date-start-input" />
              </div>
              <span className="text-slate-400 text-xs">to</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white">
                <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setActivePreset(''); }} max={today()} className="bg-transparent border-0 outline-none text-xs font-medium text-slate-800 cursor-pointer w-[110px]" data-testid="date-end-input" />
              </div>
            </div>

            {/* Apply (if dirty) */}
            {draftDirty && (
              <button onClick={handleDateApply} disabled={!canApply || loading} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${canApply ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`} data-testid="date-apply-btn">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Apply
              </button>
            )}

            <div className="w-px h-8 bg-slate-200" />

            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                placeholder="Search ingredient..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
                data-testid="ingredient-search-input"
              />
            </div>

            {searchTerm && (
              <Button size="sm" variant="outline" onClick={() => setSearchTerm('')} className="h-8 text-xs" data-testid="ingredient-search-clear">
                Reset
              </Button>
            )}
          </div>

          {/* CR-477: KPI strip */}
          {hasFetched && !loading && (
            <div className="flex items-center gap-6 px-1 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Ingredients</span>
                <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md">{totalIngredients}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Total Transfers</span>
                <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md">{totalTransfers}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Period</span>
                <span className="text-xs font-medium text-slate-600">{appliedFrom} — {appliedTo}</span>
              </div>
            </div>
          )}

          {/* CR-477: Data table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" data-testid="ingredient-movement-table">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="w-10 px-3 py-3"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Ingredient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Unit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Total Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Transfers</th>
                </tr>
              </thead>
              <tbody>
                {/* Loading */}
                {loading && Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skel-${i}`} className="border-b border-slate-100" data-testid="loading-movement-state">
                    <td className="px-3 py-4"><div className="w-4 h-4 bg-slate-200 rounded animate-pulse" /></td>
                    <td className="px-4 py-4"><div className="w-48 h-4 bg-slate-200 rounded animate-pulse" /></td>
                    <td className="px-4 py-4"><div className="w-10 h-4 bg-slate-200 rounded animate-pulse" /></td>
                    <td className="px-4 py-4"><div className="w-12 h-4 bg-slate-200 rounded animate-pulse ml-auto" /></td>
                    <td className="px-4 py-4"><div className="w-8 h-4 bg-slate-200 rounded animate-pulse ml-auto" /></td>
                  </tr>
                ))}

                {/* Empty state */}
                {!loading && hasFetched && !filtered.length && (
                  <tr data-testid="empty-movement-state">
                    <td colSpan={5} className="py-16 text-center">
                      <ArrowLeftRight className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-slate-500 mb-1">No Ingredient Movements Found</p>
                      <p className="text-xs text-slate-400 mb-4">No stock transfers match your current filters.</p>
                      {searchTerm && (
                        <Button size="sm" variant="outline" onClick={() => setSearchTerm('')} className="text-xs">Reset Search</Button>
                      )}
                    </td>
                  </tr>
                )}

                {/* Data rows */}
                {!loading && filtered.map((ing) => {
                  const rowKey = `${ing.stock_title}__${ing.unit}`;
                  const isOpen = !!expandedRows[rowKey];
                  return (
                    <Fragment key={rowKey}>
                      {/* Parent row */}
                      <tr
                        onClick={() => toggleRow(rowKey)}
                        className={`border-b border-slate-100 cursor-pointer transition-colors ${isOpen ? 'bg-orange-50/30' : 'hover:bg-slate-50/80'}`}
                        data-testid={`ingredient-row-${ing.stock_title.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <td className="px-3 py-3 text-center">
                          {isOpen
                            ? <ChevronDown className="w-4 h-4 text-orange-500 inline" />
                            : <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                          }
                        </td>
                        <td className={`px-4 py-3 ${isOpen ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'}`}>{ing.stock_title}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{ing.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono font-bold ${isOpen ? 'text-lg text-[#F97316]' : 'text-slate-800'}`}>{ing.total_qty}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-slate-600 font-medium">{ing.line_count}</span>
                        </td>
                      </tr>

                      {/* Drill-down */}
                      {isOpen && (
                        <tr data-testid={`ingredient-drilldown-${ing.stock_title.replace(/\s+/g, '-').toLowerCase()}`}>
                          <td colSpan={5} className="p-0">
                            <div className="bg-slate-50/80 border-b border-slate-200 px-8 py-3">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-slate-400 uppercase tracking-wider">
                                    <th className="py-2 text-left font-semibold">From Store</th>
                                    <th className="py-2 text-left font-semibold">To Store</th>
                                    <th className="py-2 text-left font-semibold">Dispatched</th>
                                    <th className="py-2 text-left font-semibold">Received</th>
                                    <th className="py-2 text-right font-semibold">Qty</th>
                                    <th className="py-2 text-left font-semibold">Ref</th>
                                    <th className="py-2 text-center font-semibold">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="text-slate-700">
                                  {ing.lines.map((line) => (
                                    <tr key={line.transfer_id} className="border-t border-slate-100 hover:bg-white/60">
                                      <td className="py-2.5 font-medium">{line.from_restaurant_name}</td>
                                      <td className="py-2.5">{line.to_restaurant_name}</td>
                                      <td className="py-2.5 text-slate-500">{fmtDate(line.dispatched_at)}</td>
                                      <td className="py-2.5 text-slate-500">{fmtDate(line.received_at)}</td>
                                      <td className="py-2.5 text-right font-mono font-semibold">{line.quantity} {line.unit}</td>
                                      <td className="py-2.5 font-mono text-slate-400 text-[10px]">{line.reference_code || '—'}</td>
                                      <td className="py-2.5 text-center"><StatusBadge status={line.status} /></td>
                                    </tr>
                                  ))}
                                  {/* Subtotal row */}
                                  <tr className="border-t border-slate-200">
                                    <td colSpan={4} className="py-2 text-slate-400 text-[10px]">{ing.line_count} transfers</td>
                                    <td className="py-2 text-right font-mono font-bold text-slate-600">{ing.total_qty} {ing.unit} total</td>
                                    <td colSpan={2}></td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* Footer */}
            {hasFetched && !loading && (
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                <span>Showing {filtered.length} of {ingredients.length} ingredients</span>
                <span>{movement.charAt(0).toUpperCase() + movement.slice(1)} &middot; {appliedFrom} – {appliedTo}</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
