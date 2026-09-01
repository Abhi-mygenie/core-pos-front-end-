// CR-093: Consumption Report — Daily Report section, below P&L
import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronRight, Download, FileText, Loader2, Layers, Calendar as CalendarIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getDailyConsumptionReport } from '@/api/services/inventoryService';
import Sidebar from '@/components/layout/Sidebar';
import { getWastageReport, getTopWastedItems } from '@/api/services/wastageReportService'; // CR-153

// CR-093: Date helpers
const toISO = (d) => new Date(d).toISOString().slice(0, 10);
const today = () => toISO(new Date());
const monthStart = () => toISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

export default function ConsumptionReportPage() {
  const navigate = useNavigate();
  // BUG-361: persist sidebar state across reloads
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );

  // CR-093: Filters
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate]     = useState(today());
  const [appliedFrom, setAppliedFrom] = useState(monthStart()); // BUG-261
  const [appliedTo, setAppliedTo]     = useState(today());      // BUG-261
  const [activePreset, setActivePreset] = useState('MTD');       // BUG-261: default MTD
  const [categoryFilter, setCategoryFilter] = useState('');   // client-side category filter
  const [ingSearch, setIngSearch]           = useState('');   // client-side ingredient filter (OQ-2)

  // CR-093: Data
  const [summary, setSummary]   = useState([]);   // stock_summary rows
  const [details, setDetails]   = useState([]);   // stock_details rows
  const [loading, setLoading]   = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // CR-093: UI state
  const [expandedRows, setExpandedRows] = useState({}); // { ingredient_id: bool }

  // CR-153: Page-tab + wastage state
  const [pageTab,           setPageTab]           = useState('consumption'); // 'consumption' | 'wastage'
  const [wastageTab,        setWastageTab]         = useState('log');         // 'log' | 'top'
  const [wastageRecords,    setWastageRecords]     = useState([]);
  const [wastageSummary,    setWastageSummary]     = useState(null);
  const [topItems,          setTopItems]           = useState([]);
  const [loadingWastage,    setLoadingWastage]     = useState(false);
  const [hasFetchedWastage, setHasFetchedWastage] = useState(false);

  // CR-093: Derive unique categories from loaded summary
  const categories = useMemo(() =>
    [...new Set(summary.map(r => r.category_name).filter(Boolean))].sort(),
    [summary]
  );

  // CR-093: Client-side filters (OQ-2 + category)
  const filteredSummary = useMemo(() => {
    let rows = summary;
    if (categoryFilter) rows = rows.filter(r => r.category_name === categoryFilter);
    if (ingSearch)      rows = rows.filter(r => r.ingredient_name?.toLowerCase().includes(ingSearch.toLowerCase()));
    return rows;
  }, [summary, categoryFilter, ingSearch]);

  // CR-093: detail rows for a given ingredient_id (OQ-3 drill-down)
  const getDetailRows = useCallback((ingredientId) =>
    details.filter(d => d.ingredient_id === ingredientId),
    [details]
  );

  // BUG-261: Preset pill handler (matches ExpenseReport pattern)
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
  const handleDateApply = () => {
    setAppliedFrom(fromDate); setAppliedTo(toDate);
    setActivePreset('');
  };
  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const draftValid = fromDate && toDate && fromDate <= toDate;
  const canApply = draftDirty && draftValid && !loading && !loadingWastage; // CR-153

  // CR-093: Fetch from API
  const fetchReport = useCallback(async () => {
    if (!appliedFrom || !appliedTo) { toast.error('Select a date range'); return; }
    setLoading(true);
    try {
      const data = await getDailyConsumptionReport({ from_date: appliedFrom, to_date: appliedTo }); // BUG-261: use applied dates
      setSummary(data.stock_summary || []);
      setDetails(data.stock_details || []);
      setHasFetched(true);
      setExpandedRows({});
    } catch {
      toast.error('Failed to load consumption report');
    } finally {
      setLoading(false);
    }
  }, [appliedFrom, appliedTo]);

  // CR-153: Fetch wastage data (Wastage Log + Top Items in parallel)
  const fetchWastage = useCallback(async () => {
    if (!appliedFrom || !appliedTo) return;
    setLoadingWastage(true);
    try {
      const [wReport, wTop] = await Promise.all([
        getWastageReport(appliedFrom, appliedTo),
        getTopWastedItems(appliedFrom, appliedTo, 10),
      ]);
      setWastageSummary(wReport.summary || null);
      setWastageRecords(wReport.wastage_records || []);
      setTopItems(wTop.top_by_quantity || []);
      setHasFetchedWastage(true);
    } catch {
      toast.error('Failed to load wastage data');
    } finally {
      setLoadingWastage(false);
    }
  }, [appliedFrom, appliedTo]);

  // CR-153: fetch both tabs on mount + re-fetch when applied dates change (Apply / preset)
  useEffect(() => {
    fetchReport();
    fetchWastage();
  }, [appliedFrom, appliedTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // CR-093: Toggle drill-down row (OQ-3)
  const toggleRow = (id) =>
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

  // CR-093: Excel export (OQ-4b)
  const handleExportExcel = () => {
    if (!filteredSummary.length) { toast.error('No data to export'); return; }
    const headers = ['Ingredient', 'Category', 'Opening Stock', 'Total Consumed', 'Closing Stock'];
    const rows = filteredSummary.map(r => [
      r.ingredient_name, r.category_name, r.opening_stock, r.total_consumed, r.closing_stock
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `consumption-${appliedFrom}-${appliedTo}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // CR-093: PDF export — mirrors PLReportPage.jsx pattern (OQ-4b)
  const handleExportPDF = () => {
    if (!filteredSummary.length) { toast.error('No data to export'); return; }
    const rows = filteredSummary.map(r =>
      `<tr>
        <td style="padding:6px 8px">${r.ingredient_name ?? ''}</td>
        <td style="padding:6px 8px">${r.category_name ?? ''}</td>
        <td style="padding:6px 8px;text-align:right">${r.opening_stock ?? ''}</td>
        <td style="padding:6px 8px;text-align:right;color:#059669;font-weight:600">${r.total_consumed ?? ''}</td>
        <td style="padding:6px 8px;text-align:right">${r.closing_stock ?? ''}</td>
      </tr>`
    ).join('');
    const html = `<html><head><title>Consumption Report</title>
      <style>body{font-family:sans-serif;padding:24px}h2{margin-bottom:4px}p{color:#64748B;font-size:13px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse}th{background:#f1f5f9;text-align:left;padding:8px;font-size:11px;text-transform:uppercase;border-bottom:2px solid #e2e8f0}
      td{border-bottom:1px solid #f1f5f9;font-size:13px}</style></head>
      <body>
        <h2>Consumption Report</h2>
        <p>${appliedFrom} to ${appliedTo}</p>
        <table><thead><tr>
          <th>Ingredient</th><th>Category</th>
          <th style="text-align:right">Opening</th>
          <th style="text-align:right">Consumed</th>
          <th style="text-align:right">Closing</th>
        </tr></thead><tbody>${rows}</tbody></table>
      </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  // CR-093: KPI values
  const kpis = useMemo(() => ({
    total:   filteredSummary.length,
    entries: details.length,
    cats:    new Set(filteredSummary.map(r => r.category_name)).size,
  }), [filteredSummary, details]);

  return (
    <div className="flex min-h-screen bg-slate-50" data-testid="consumption-report-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />
      <div className={`flex-1 transition-all duration-300 ${isSidebarExpanded ? 'ml-64' : 'ml-16'}`}>
        <div className="max-w-7xl mx-auto px-6 py-6">

          {/* BUG-258+261: Header with preset pills (matches ExpenseReport pattern) */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" data-testid="cr093-back-btn">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Consumption Report</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {appliedFrom} to {appliedTo} &nbsp;·&nbsp; {kpis.total} ingredients
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!hasFetched || loading} data-testid="cr093-export-excel" className="gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!hasFetched || loading} data-testid="cr093-export-pdf" className="gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5" /> PDF
              </Button>
            </div>
          </div>

          {/* CR-153: Page-tab bar — Consumption | Wastage */}
          <div className="flex items-center gap-1 px-1.5 py-1 bg-slate-100 rounded-xl w-fit mb-4" data-testid="cr153-page-tabs">
            {[{ id: 'consumption', label: 'Consumption' }, { id: 'wastage', label: 'Wastage' }].map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setPageTab(t.id);
                  if (t.id === 'wastage' && !hasFetchedWastage) fetchWastage();
                }}
                className={`px-5 py-1.5 text-sm font-medium rounded-lg transition-all ${pageTab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                data-testid={`cr153-page-tab-${t.id}`}
              >{t.label}</button>
            ))}
          </div>

          {/* BUG-261: Date range bar with preset pills + CR-093 category/ingredient filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 flex flex-wrap gap-3 items-end" data-testid="cr093-filters">
            <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-slate-200'} bg-white rounded-lg`} data-testid="cr093-daterange">
              <CalendarIcon className="w-4 h-4 text-slate-400" />
              <label className="flex items-center gap-1.5 text-sm text-slate-600">
                <span className="text-xs text-slate-400 uppercase tracking-wide">From</span>
                <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setActivePreset(''); }} max={today()} className="bg-transparent border-0 outline-none text-sm font-medium text-slate-800 cursor-pointer focus:ring-0 p-0" data-testid="cr093-from-date" />
              </label>
              <span className="text-slate-300">—</span>
              <label className="flex items-center gap-1.5 text-sm text-slate-600">
                <span className="text-xs text-slate-400 uppercase tracking-wide">To</span>
                <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setActivePreset(''); }} max={today()} className="bg-transparent border-0 outline-none text-sm font-medium text-slate-800 cursor-pointer focus:ring-0 p-0" data-testid="cr093-to-date" />
              </label>
            </div>
            <button onClick={handleDateApply} disabled={!canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${canApply ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`} data-testid="cr093-apply-btn">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />} Apply
            </button>
            <div className="flex items-center gap-1 px-1.5 py-1 bg-slate-100 rounded-lg" data-testid="cr093-presets">
              {['Today', '7D', '30D', 'MTD'].map(p => (
                <button key={p} disabled={loading} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${activePreset === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`} data-testid={`cr093-preset-${p.toLowerCase()}`} onClick={() => applyPreset(p)}>{p}</button>
              ))}
            </div>
            {/* CR-153: category/ingredient filters visible on Consumption tab only */}
            {pageTab === 'consumption' && (<>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Category</label>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="h-8 text-xs border border-slate-200 rounded-md px-2 bg-white" data-testid="cr093-category-filter">
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Ingredient</label>
              <input placeholder="Search..." value={ingSearch} onChange={e => setIngSearch(e.target.value)} className="h-8 text-xs w-40 border border-slate-200 rounded-md px-2" data-testid="cr093-ing-search" />
            </div>
            <Button size="sm" variant="outline" onClick={() => { setIngSearch(''); setCategoryFilter(''); }} className="h-8 text-xs" data-testid="cr093-reset-btn">
              Reset
            </Button>
            </>)}
          </div>

          {/* CR-153: Consumption tab — existing CR-093 content unchanged */}
          {pageTab === 'consumption' && (<>

          {/* CR-093: KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-5">
            {[
              { label: 'Ingredients', value: kpis.total,   color: '#f97316', testid: 'cr093-kpi-ingredients', muted: false },
              { label: 'Entries',     value: kpis.entries, color: '#3b82f6', testid: 'cr093-kpi-entries',     muted: false },
              { label: 'Categories',  value: kpis.cats,    color: '#8b5cf6', testid: 'cr093-kpi-categories',  muted: false },
              { label: 'Cost / Unit', value: '— pending',  color: '#d1d5db', testid: 'cr093-kpi-cost',        muted: true  },
              { label: 'Margin',      value: '— pending',  color: '#d1d5db', testid: 'cr093-kpi-margin',      muted: true  },
            ].map(k => (
              <div
                key={k.label}
                className={`bg-white rounded-xl border p-4 ${k.muted ? 'border-dashed border-slate-200' : 'border-slate-200'}`}
                style={k.muted ? {} : { borderLeftWidth: 3, borderLeftColor: k.color }}
                data-testid={k.testid}
              >
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{k.label}</p>
                <p className={`mt-1 font-bold ${k.muted ? 'text-slate-300 text-sm italic' : 'text-xl text-slate-900'}`}>
                  {k.value}
                </p>
              </div>
            ))}
          </div>

          {/* CR-093: Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="cr093-table-wrap">
            {loading ? (
              <div className="flex items-center justify-center py-20 gap-2 text-slate-400 text-sm" data-testid="cr093-loading">
                <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
                Loading consumption data…
              </div>
            ) : !hasFetched ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-sm gap-2" data-testid="cr093-empty-initial">
                <Layers className="w-10 h-10 opacity-20" />
                Select a date range and click Apply
              </div>
            ) : filteredSummary.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-slate-400 text-sm" data-testid="cr093-empty-no-data">
                No data for selected filters
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="w-10 px-3 py-3" />
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Ingredient</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Category</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Opening</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Consumed</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Closing</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-300 uppercase tracking-wide" title="Available in Phase 2 — pending backend">Cost/Unit ⚠</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-300 uppercase tracking-wide" title="Available in Phase 2 — pending backend">Total Cost ⚠</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-300 uppercase tracking-wide" title="Available in Phase 2 — pending backend">Margin ⚠</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSummary.map(row => {
                      const drillRows = getDetailRows(row.ingredient_id);
                      const isOpen    = !!expandedRows[row.ingredient_id];
                      return (
                        <Fragment key={row.ingredient_id}>
                          <tr
                            key={row.ingredient_id}
                            className="border-b border-slate-100 hover:bg-orange-50 cursor-pointer transition-colors"
                            onClick={() => toggleRow(row.ingredient_id)}
                            data-testid={`cr093-row-${row.ingredient_id}`}
                          >
                            <td className="px-3 py-3 text-slate-400">
                              {isOpen
                                ? <ChevronDown  className="w-4 h-4 text-orange-500" />
                                : <ChevronRight className="w-4 h-4" />
                              }
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-900">{row.ingredient_name}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                                {row.category_name}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-slate-600">{row.opening_stock}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-600">{row.total_consumed}</td>
                            <td className="px-4 py-3 text-sm text-right text-slate-600">{row.closing_stock}</td>
                            <td className="px-4 py-3 text-sm text-right text-slate-300 italic">—</td>
                            <td className="px-4 py-3 text-sm text-right text-slate-300 italic">—</td>
                            <td className="px-4 py-3 text-sm text-right text-slate-300 italic">—</td>
                          </tr>

                          {/* CR-093: Drill-down row (OQ-3) */}
                          {isOpen && (
                            <tr key={`drill-${row.ingredient_id}`} className="bg-orange-50/40" data-testid={`cr093-drill-${row.ingredient_id}`}>
                              <td colSpan={9} className="px-4 pb-3 pt-0">
                                <div className="ml-10 rounded-lg border border-orange-200 overflow-hidden text-xs">
                                  <table className="w-full">
                                    <thead>
                                      <tr className="bg-orange-100/60">
                                        <th className="px-3 py-2 text-left text-orange-900 font-bold uppercase tracking-wide text-xs">Date</th>
                                        <th className="px-3 py-2 text-left text-orange-900 font-bold uppercase tracking-wide text-xs">Order</th>
                                        <th className="px-3 py-2 text-left text-orange-900 font-bold uppercase tracking-wide text-xs">Food Item</th>
                                        <th className="px-3 py-2 text-left text-orange-900 font-bold uppercase tracking-wide text-xs">Type</th>
                                        <th className="px-3 py-2 text-right text-orange-900 font-bold uppercase tracking-wide text-xs">Qty Deducted</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {drillRows.length === 0 ? (
                                        <tr>
                                          <td colSpan={5} className="px-3 py-3 text-center text-slate-400">
                                            No order-level detail available
                                          </td>
                                        </tr>
                                      ) : drillRows.map((d, i) => (
                                        <tr key={i} className="border-t border-orange-100">
                                          <td className="px-3 py-1.5 text-slate-600">{d.consumption_date}</td>
                                          <td className="px-3 py-1.5 text-slate-600">#{d.order_id}</td>
                                          <td className="px-3 py-1.5 font-medium text-slate-700">{d.food_item}</td>
                                          <td className="px-3 py-1.5 text-slate-500">{d.order_type}</td>
                                          <td className="px-3 py-1.5 text-right font-semibold text-emerald-700">{d.quantity_deducted}</td>
                                        </tr>
                                      ))}
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
              </div>
            )}
          </div>

          </>)} {/* end CR-153: consumption tab */}

          {/* CR-153: Wastage tab */}
          {pageTab === 'wastage' && (
            <>
              {/* CR-153: Wastage KPI strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Total Records', value: wastageSummary?.total_records ?? '—', color: '#f97316', testid: 'cr153-kpi-records' },
                  { label: 'Total Loss',    value: wastageSummary?.total_loss    ?? '—', color: '#ef4444', testid: 'cr153-kpi-loss'    },
                  { label: 'Total Gain',    value: wastageSummary?.total_gain    ?? '—', color: '#22c55e', testid: 'cr153-kpi-gain'    },
                  { label: 'Net Wastage',   value: wastageSummary?.net_wastage   ?? '—', color: '#64748b', testid: 'cr153-kpi-net'     },
                ].map(k => (
                  <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4 relative overflow-hidden" style={{ borderLeftWidth: 3, borderLeftColor: k.color }} data-testid={k.testid}>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{k.label}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{k.value}</p>
                  </div>
                ))}
              </div>

              {/* CR-153: Inner sub-tab bar */}
              <div className="flex items-center gap-1 px-1.5 py-1 bg-slate-100 rounded-xl w-fit mb-4">
                {[{ id: 'log', label: 'Wastage Log' }, { id: 'top', label: 'Top Items' }].map(t => (
                  <button key={t.id} onClick={() => setWastageTab(t.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${wastageTab === t.id ? 'bg-[#329937] text-white shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}
                    data-testid={`cr153-wastage-tab-${t.id}`}
                  >{t.label}</button>
                ))}
              </div>

              {/* CR-153: Loading */}
              {loadingWastage && (
                <div className="flex items-center justify-center py-20 gap-2 text-slate-400 text-sm" data-testid="cr153-wastage-loading">
                  <Loader2 className="w-5 h-5 animate-spin text-red-400" /> Loading wastage data…
                </div>
              )}

              {/* CR-153: Wastage Log table */}
              {!loadingWastage && wastageTab === 'log' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="cr153-wastage-log-table">
                  {wastageRecords.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-slate-400 text-sm">No wastage records for this period</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            {['Date', 'Ingredient', 'Type', 'Quantity', 'Prev Stock', 'Reason', 'Source', 'Cost'].map(h => (
                              <th key={h} className={`px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide ${['Quantity', 'Prev Stock', 'Cost'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {wastageRecords.map((r, i) => (
                            <tr key={r.wastage_id ?? i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors" data-testid={`cr153-wastage-row-${i}`}>
                              <td className="px-4 py-3 text-sm text-slate-500">{r.waste_date?.slice(0, 10) ?? '—'}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-slate-900">{r.item_name}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${r.waste_type === 'Gain' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                  {r.waste_type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-slate-700">{r.wastage_quantity} {r.unit}</td>
                              <td className="px-4 py-3 text-sm text-right text-slate-500">{r.previous_stock ?? '—'}</td>
                              <td className="px-4 py-3 text-sm text-slate-600 max-w-[160px] truncate">{r.waste_reason ?? '—'}</td>
                              <td className="px-4 py-3 text-sm text-slate-500">{r.source_type === 'physical_count' ? 'Physical Count' : (r.source_type ?? '—')}</td>
                              <td className="px-4 py-3 text-sm text-right">{r.wastage_value ? `₹${r.wastage_value}` : <span className="text-slate-300 italic">—</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* CR-153: Top Items table */}
              {!loadingWastage && wastageTab === 'top' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="cr153-top-items-table">
                  {topItems.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-slate-400 text-sm">No wastage data for this period</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            {['#', 'Ingredient', 'Type', 'Events', 'Total Wasted'].map(h => (
                              <th key={h} className={`px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide ${['Events', 'Total Wasted'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {topItems.map((t, i) => (
                            <tr key={t.food_id ?? i}
                              className={`border-b border-slate-100 transition-colors ${i === 0 ? 'bg-orange-50/50 hover:bg-orange-50' : 'hover:bg-slate-50'}`}
                              data-testid={`cr153-top-item-${i}`}
                            >
                              <td className={`px-4 py-3 text-sm font-bold ${i === 0 ? 'text-orange-500' : 'text-slate-500'}`}>{i + 1}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-slate-900">{t.item_name}</td>
                              <td className="px-4 py-3 text-sm text-slate-500">{t.item_type}</td>
                              <td className="px-4 py-3 text-sm text-right text-slate-700">{t.event_count}</td>
                              <td className={`px-4 py-3 text-sm text-right font-semibold ${i === 0 ? 'text-red-600' : 'text-slate-700'}`}>
                                {t.total_quantity} {t.unit}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )} {/* end CR-153: wastage tab */}

        </div>
      </div>
    </div>
  );
}
