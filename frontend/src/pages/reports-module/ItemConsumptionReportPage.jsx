// CR-472: Item Consumption Report — menu-item-level sold/cancelled/returned/wastage/consumed + revenue_loss
// Pattern: mirrors ConsumptionReportPage.jsx (CR-093) + PLReportPage.jsx PDF export
import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronRight, Download, FileText, Loader2, Layers, Calendar as CalendarIcon, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getItemConsumptionReport } from '@/api/services/inventoryService';
import Sidebar from '@/components/layout/Sidebar';

// CR-472: Helpers
const toISO = (d) => new Date(d).toISOString().slice(0, 10);
const today = () => toISO(new Date());
const monthStart = () => toISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const threeMonthsAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return toISO(d);
};
const fmtINR = (v) => {
  const n = parseFloat(v) || 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
};

export default function ItemConsumptionReportPage() {
  const navigate = useNavigate();
  // BUG-361: persist sidebar state across reloads
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );

  // CR-472: Date state (BUG-261 pattern: draft vs applied)
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(today());
  const [appliedFrom, setAppliedFrom] = useState(monthStart());
  const [appliedTo, setAppliedTo] = useState(today());
  const [activePreset, setActivePreset] = useState('MTD');

  // CR-472: Data
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // CR-472: UI
  const [expandedRows, setExpandedRows] = useState({});
  const [itemSearch, setItemSearch] = useState('');
  const [sortCol, setSortCol] = useState('item_name'); // CR-472 Fix D: sorting
  const [sortDir, setSortDir] = useState('asc');
  const [foodForFilter, setFoodForFilter] = useState('all'); // CR-475: menu filter (OD-475-01)

  // CR-472: Preset handler (BUG-261 pattern)
  const applyPreset = (preset) => {
    const t = new Date();
    let f = new Date();
    switch (preset) {
      case 'Today': f = t; break;
      case '7D': f = new Date(t); f.setDate(f.getDate() - 6); break;
      case '30D': f = new Date(t); f.setDate(f.getDate() - 29); break;
      case 'MTD': f = new Date(t.getFullYear(), t.getMonth(), 1); break;
      case '3M': f = new Date(t); f.setMonth(f.getMonth() - 3); break;
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
  const canApply = draftDirty && draftValid && !loading;

  // CR-472: Fetch
  const fetchReport = useCallback(async () => {
    if (!appliedFrom || !appliedTo) { toast.error('Select a date range'); return; }
    setLoading(true);
    try {
      const data = await getItemConsumptionReport({ from_date: appliedFrom, to_date: appliedTo });
      setItems(data.items || []);
      setHasFetched(true);
      setExpandedRows({});
    } catch {
      toast.error('Failed to load item consumption report');
    } finally {
      setLoading(false);
    }
  }, [appliedFrom, appliedTo]);

  useEffect(() => { fetchReport(); }, [appliedFrom, appliedTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // CR-472 + CR-475: Client-side filter — name search + menu filter
  const filteredItems = useMemo(() => {
    let result = items;
    if (foodForFilter !== 'all') result = result.filter(it => it.food_for === foodForFilter); // CR-475
    if (itemSearch) { // CR-478: search item name + ingredient names
      const term = itemSearch.toLowerCase();
      result = result.filter(it => {
        if (it.item_name?.toLowerCase().includes(term)) return true;
        const ings = [...(it.consumed_ingredients || []), ...(it.returned_ingredients || []), ...(it.wastage_ingredients || [])];
        return ings.some(ing => ing.ingredient_name?.toLowerCase().includes(term));
      });
    }
    return result;
  }, [items, itemSearch, foodForFilter]); // CR-475: +foodForFilter

  // CR-475: unique food_for values for the filter dropdown — derived from raw items (not filteredItems)
  const foodForOptions = useMemo(() => {
    const unique = [...new Set(items.map(i => i.food_for).filter(Boolean))].sort();
    return unique; // e.g. ['Normal', 'Party', 'Premium']
  }, [items]); // CR-475

  // CR-472 Fix D: Sorted items
  const sortedItems = useMemo(() => {
    const arr = [...filteredItems];
    arr.sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (typeof va === 'string') return sortDir === 'asc' ? (va || '').localeCompare(vb || '') : (vb || '').localeCompare(va || '');
      va = parseFloat(va) || 0; vb = parseFloat(vb) || 0;
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return arr;
  }, [filteredItems, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };
  const SortIcon = ({ col }) => sortCol === col
    ? <span className="ml-1 text-orange-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
    : <span className="ml-1 text-slate-300">↕</span>;

  // CR-472 + CR-475: KPIs
  const kpis = useMemo(() => ({
    totalItems: filteredItems.length,
    totalSold: filteredItems.reduce((s, i) => s + (i.sold_qty || 0), 0),
    totalCancelled: filteredItems.reduce((s, i) => s + (i.canceled_qty || 0), 0),
    totalReturned: filteredItems.reduce((s, i) => s + (i.returned_qty || 0), 0), // CR-475 OD-475-EXTRA-01
    totalConsumed: filteredItems.reduce((s, i) => s + (i.consumed_qty || 0), 0),
    totalRevenueLoss: filteredItems.reduce((s, i) => s + (parseFloat(i.revenue_loss) || 0), 0),
    hasRevenueLoss: filteredItems.some(i => i.revenue_loss != null),
  }), [filteredItems]);

  // CR-472: Expand/collapse
  const toggleRow = (id) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

  // CR-472: Excel export (CSV blob pattern — ConsumptionReportPage L142-154)
  const handleExportExcel = () => {
    if (!filteredItems.length) { toast.error('No data to export'); return; }
    const headers = ['Item Name', 'Menu', 'Punched', 'Cancelled', 'Returned to Inventory', 'Inventory Consumed', 'Inventory Loss', 'Revenue Loss']; // CR-475: +Menu column
    const rows = sortedItems.map(r => [
      r.item_name, r.food_for || '', r.sold_qty, r.canceled_qty, r.returned_qty, r.consumed_qty, r.wastage_qty, // CR-475: +food_for
      r.revenue_loss != null ? r.revenue_loss : ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `item-consumption-${appliedFrom}-${appliedTo}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // CR-472: PDF export (window.open+print pattern — ConsumptionReportPage L157-183)
  const handleExportPDF = () => {
    if (!filteredItems.length) { toast.error('No data to export'); return; }
    const tableRows = sortedItems.map(r =>
      `<tr>
        <td style="padding:6px 8px;font-weight:600">${r.item_name ?? ''}</td>
        <td style="padding:6px 8px;color:#64748B;font-size:11px">${r.food_for ?? ''}</td>
        <td style="padding:6px 8px;text-align:right">${r.sold_qty ?? 0}</td>
        <td style="padding:6px 8px;text-align:right;color:#B91C1C">${r.canceled_qty ?? 0}</td>
        <td style="padding:6px 8px;text-align:right;color:#1D4ED8">${r.returned_qty ?? 0}</td>
        <td style="padding:6px 8px;text-align:right;color:#059669;font-weight:600">${r.consumed_qty ?? 0}</td>
        <td style="padding:6px 8px;text-align:right;color:#C2410C">${r.wastage_qty ?? 0}</td>
        <td style="padding:6px 8px;text-align:right;color:#DC2626">${r.revenue_loss != null ? fmtINR(r.revenue_loss) : '—'}</td>
      </tr>`
    ).join('');
    const html = `<html><head><title>Item Consumption Report</title>
      <style>body{font-family:sans-serif;padding:24px}h2{margin-bottom:4px}p{color:#64748B;font-size:13px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse}th{background:#f1f5f9;text-align:left;padding:8px;font-size:11px;text-transform:uppercase;border-bottom:2px solid #e2e8f0}
      td{border-bottom:1px solid #f1f5f9;font-size:13px}</style></head>
      <body>
        <h2>Item Consumption Report</h2>
        <p>${appliedFrom} to ${appliedTo} · ${filteredItems.length} items · Revenue Loss: ${fmtINR(kpis.totalRevenueLoss)}</p>
        <table><thead><tr>
          <th>Item Name</th><th>Menu</th><th style="text-align:right">Punched</th><th style="text-align:right">Cancelled</th>
          <th style="text-align:right">Returned to Inv.</th><th style="text-align:right">Inv. Consumed</th>
          <th style="text-align:right">Inv. Loss</th><th style="text-align:right">Revenue Loss</th>
        </tr></thead><tbody>${tableRows}</tbody></table>
      </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  // CR-472: Sub-table renderer
  const IngredientSubTable = ({ title, ingredients, colorClass, iconEl, testId }) => (
    <div className="rounded-lg border border-slate-200 overflow-hidden" data-testid={testId}>
      <div className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wide border-b flex items-center gap-1.5 ${colorClass}`}>
        {iconEl}{title}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50">
            <th className="px-3 py-1.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">Ingredient</th>
            <th className="px-3 py-1.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wide">Qty</th>
            <th className="px-3 py-1.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wide">Unit</th>
          </tr>
        </thead>
        <tbody>
          {(!ingredients || ingredients.length === 0) ? (
            <tr><td colSpan={3} className="px-3 py-3 text-center text-slate-400 italic">No {title.toLowerCase()}</td></tr>
          ) : ingredients.map((ing, i) => (
            <tr key={ing.ingredient_id || i} className="border-t border-slate-100">
              <td className="px-3 py-1.5 text-slate-700 font-medium">{ing.ingredient_name}</td>
              <td className="px-3 py-1.5 text-right font-semibold">{ing.quantity}</td>
              <td className="px-3 py-1.5 text-right text-slate-500">{ing.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50" data-testid="item-consumption-report-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-6">

          {/* CR-472: Header */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-y-2">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" data-testid="item-consumption-back-btn">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Item Consumption Report</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {appliedFrom} to {appliedTo} &nbsp;·&nbsp; {kpis.totalItems} menu items
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!hasFetched || loading} data-testid="item-consumption-export-excel" className="gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!hasFetched || loading} data-testid="item-consumption-export-pdf" className="gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5" /> PDF
              </Button>
            </div>
          </div>

          {/* CR-472: Date range bar + search */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 flex flex-wrap gap-3 items-end" data-testid="item-consumption-filters">
            <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-slate-200'} bg-white rounded-lg`}>
              <CalendarIcon className="w-4 h-4 text-slate-400" />
              <label className="flex items-center gap-1.5 text-sm text-slate-600">
                <span className="text-xs text-slate-400 uppercase tracking-wide">From</span>
                <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setActivePreset(''); }} max={today()} className="bg-transparent border-0 outline-none text-sm font-medium text-slate-800 cursor-pointer focus:ring-0 p-0" data-testid="item-consumption-from-date" />
              </label>
              <span className="text-slate-300">—</span>
              <label className="flex items-center gap-1.5 text-sm text-slate-600">
                <span className="text-xs text-slate-400 uppercase tracking-wide">To</span>
                <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setActivePreset(''); }} max={today()} className="bg-transparent border-0 outline-none text-sm font-medium text-slate-800 cursor-pointer focus:ring-0 p-0" data-testid="item-consumption-to-date" />
              </label>
            </div>
            <button onClick={handleDateApply} disabled={!canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${canApply ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`} data-testid="item-consumption-apply-btn">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />} Apply
            </button>
            <div className="flex items-center gap-1 px-1.5 py-1 bg-slate-100 rounded-lg" data-testid="item-consumption-presets">
              {['Today', '7D', '30D', 'MTD', '3M'].map(p => (
                <button key={p} disabled={loading} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${activePreset === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`} data-testid={`item-consumption-preset-${p.toLowerCase()}`} onClick={() => applyPreset(p)}>{p}</button>
              ))}
            </div>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Search</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input placeholder="Search item or ingredient..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} className="h-8 text-xs w-48 border border-slate-200 rounded-md pl-7 pr-2" data-testid="item-consumption-search-input" />
              </div>
            </div>
            {itemSearch && (
              <Button size="sm" variant="outline" onClick={() => setItemSearch('')} className="h-8 text-xs" data-testid="item-consumption-search-clear">
                Reset
              </Button>
            )}
            {/* CR-475: food_for menu filter dropdown (OD-475-01) */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Menu</label>
              <select
                value={foodForFilter}
                onChange={e => setFoodForFilter(e.target.value)}
                className="h-8 text-xs border border-slate-200 rounded-md px-2 bg-white outline-none focus:border-[#F26B33] focus:ring-1 focus:ring-[#F26B33]"
                data-testid="item-consumption-foodfor-filter"
              >
                <option value="all">All Menus</option>
                {foodForOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* CR-472 + CR-475: KPI strip — 6 cards (2 rows × 3) OD-475-EXTRA-01 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Total Items', value: kpis.totalItems, color: '#F26B33', testid: 'item-consumption-kpi-total-items', isCurrency: false },
              { label: 'Total Punched', value: kpis.totalSold, color: '#3B82F6', testid: 'item-consumption-kpi-total-sold', isCurrency: false },
              { label: 'Total Cancelled', value: kpis.totalCancelled, color: '#EF4444', testid: 'item-consumption-kpi-total-cancelled', isCurrency: false },
              { label: 'Total Returned to Inv.', value: kpis.totalReturned, color: '#60A5FA', testid: 'item-consumption-kpi-total-returned', isCurrency: false }, // CR-475
              { label: 'Total Inv. Consumed', value: kpis.totalConsumed, color: '#329937', testid: 'item-consumption-kpi-total-consumed', isCurrency: false },
              { label: 'Revenue Loss', value: kpis.hasRevenueLoss ? fmtINR(kpis.totalRevenueLoss) : '—', color: '#DC2626', testid: 'item-consumption-kpi-revenue-loss', isCurrency: true },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4" style={{ borderLeftWidth: 3, borderLeftColor: k.color }} data-testid={k.testid}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{k.label}</p>
                <p className={`mt-1 font-bold ${k.isCurrency && k.value !== '—' ? 'text-xl text-red-600' : 'text-xl text-slate-900'}`}>
                  {k.value}
                </p>
              </div>
            ))}
          </div>

          {/* CR-472: Main table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="item-consumption-table-wrap">
            {loading ? (
              <div className="flex items-center justify-center py-20 gap-2 text-slate-400 text-sm" data-testid="item-consumption-loading">
                <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
                Loading item consumption data…
              </div>
            ) : !hasFetched ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-sm gap-2" data-testid="item-consumption-empty-initial">
                <Layers className="w-10 h-10 opacity-20" />
                Select a date range and click Apply
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-slate-400 text-sm" data-testid="item-consumption-empty-no-data">
                No data for selected filters
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="w-10 px-3 py-3" />
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide cursor-pointer select-none" onClick={() => handleSort('item_name')}>Item Name<SortIcon col="item_name" /></th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide cursor-pointer select-none" onClick={() => handleSort('sold_qty')}>Punched<SortIcon col="sold_qty" /></th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide cursor-pointer select-none" onClick={() => handleSort('canceled_qty')}>Cancelled<SortIcon col="canceled_qty" /></th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide cursor-pointer select-none" onClick={() => handleSort('returned_qty')}>Returned to Inv.<SortIcon col="returned_qty" /></th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide cursor-pointer select-none" onClick={() => handleSort('consumed_qty')}>Inv. Consumed<SortIcon col="consumed_qty" /></th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide cursor-pointer select-none" onClick={() => handleSort('wastage_qty')}>Inv. Loss<SortIcon col="wastage_qty" /></th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide cursor-pointer select-none" onClick={() => handleSort('revenue_loss')}>Revenue Loss<SortIcon col="revenue_loss" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.map(item => {
                      const isOpen = !!expandedRows[item.food_id];
                      const hasCancellation = (item.canceled_qty || 0) > 0;
                      return (
                        <Fragment key={item.food_id}>
                          <tr
                            className={`border-b border-slate-100 cursor-pointer transition-colors ${isOpen ? 'bg-orange-50/40' : 'hover:bg-orange-50'}`}
                            onClick={() => toggleRow(item.food_id)}
                            data-testid={`item-consumption-row-${item.food_id}`}
                          >
                            <td className="px-3 py-3 text-slate-400">
                              {isOpen
                                ? <ChevronDown className="w-4 h-4 text-orange-500" />
                                : <ChevronRight className="w-4 h-4" />}
                            </td>
                            <td className="px-4 py-3"> {/* CR-475: food_for badge (OD-475-01) */}
                              <span className="text-sm font-semibold text-slate-900 block leading-snug">{item.item_name}</span>
                              {item.food_for && (
                                <span
                                  className="mt-0.5 inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 leading-none"
                                  data-testid={`item-consumption-foodfor-badge-${item.food_id}`}
                                >
                                  {item.food_for}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-slate-700">{item.sold_qty}</td>
                            <td className="px-4 py-3 text-sm text-right">
                              {hasCancellation
                                ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700 border border-red-200">{item.canceled_qty}</span>
                                : <span className="text-slate-400">0</span>}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {(item.returned_qty || 0) > 0
                                ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">{item.returned_qty}</span>
                                : <span className="text-slate-400">0</span>}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-emerald-600">{item.consumed_qty}</td>
                            <td className="px-4 py-3 text-sm text-right">
                              {(item.wastage_qty || 0) > 0
                                ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">{item.wastage_qty}</span>
                                : <span className="text-slate-400">0</span>}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {item.revenue_loss != null
                                ? <span className={`font-semibold ${parseFloat(item.revenue_loss) > 0 ? 'text-red-600' : 'text-slate-400'}`}>{fmtINR(item.revenue_loss)}</span>
                                : <span className="text-slate-400 italic">—</span>}
                            </td>
                          </tr>

                          {/* CR-472: Ingredient drill-down */}
                          {isOpen && (
                            <tr data-testid={`item-consumption-drill-${item.food_id}`}>
                              <td colSpan={8} className="px-4 pb-4 pt-1 bg-orange-50/20">
                                <div className="ml-10 grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <IngredientSubTable
                                    title="Consumed Ingredients"
                                    ingredients={item.consumed_ingredients}
                                    colorClass="bg-emerald-50 text-emerald-800 border-emerald-200"
                                    iconEl={<Check className="w-3 h-3" />}
                                    testId={`item-consumption-subtable-consumed-${item.food_id}`}
                                  />
                                  <IngredientSubTable
                                    title="Returned Ingredients"
                                    ingredients={item.returned_ingredients}
                                    colorClass="bg-blue-50 text-blue-800 border-blue-200"
                                    iconEl={<ArrowLeft className="w-3 h-3" />}
                                    testId={`item-consumption-subtable-returned-${item.food_id}`}
                                  />
                                  <IngredientSubTable
                                    title="Wastage Ingredients"
                                    ingredients={item.wastage_ingredients}
                                    colorClass="bg-amber-50 text-amber-800 border-amber-200"
                                    iconEl={<Layers className="w-3 h-3" />}
                                    testId={`item-consumption-subtable-wastage-${item.food_id}`}
                                  />
                                </div>
                                {/* CR-475: Add-ons drill-down — OD-475-02 full drill-down, OD-475-03 hide when empty */}
                                {item.addons?.length > 0 && (
                                  <div className="ml-10 mt-3 rounded-xl border border-slate-200 overflow-hidden bg-slate-50/60" data-testid={`item-consumption-addons-${item.food_id}`}>
                                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 border-b border-slate-200">
                                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                                        Add-ons ({item.addons.length})
                                      </span>
                                      <span className="text-[10px] text-slate-400 italic">
                                        Add-on ingredients already included in dish totals above
                                      </span>
                                    </div>
                                    {item.addons.map(addon => (
                                      <div key={addon.addon_id} className="px-4 py-3 border-b border-slate-200 last:border-0" data-testid={`item-consumption-addon-card-${addon.addon_id}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="text-xs font-bold text-slate-700">{addon.addon_name}</span>
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-orange-100 text-orange-700 border border-orange-200 rounded uppercase tracking-wide">Add-on</span>
                                        </div>
                                        <div className="flex gap-4 text-xs text-slate-500 mb-3 px-3 py-2 bg-white rounded-lg border border-slate-100">
                                          <span>Sold <strong className="text-slate-700">{addon.sold_qty}</strong></span>
                                          <span>Cancelled <strong className="text-red-600">{addon.canceled_qty}</strong></span>
                                          <span>Returned <strong className="text-blue-600">{addon.returned_qty}</strong></span>
                                          <span>Wastage <strong className="text-amber-600">{addon.wastage_qty}</strong></span>
                                          <span>Consumed <strong className="text-emerald-600">{addon.consumed_qty}</strong></span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                          <IngredientSubTable
                                            title="Consumed"
                                            ingredients={addon.consumed_ingredients}
                                            colorClass="bg-emerald-50 text-emerald-800 border-emerald-200"
                                            iconEl={<Check className="w-3 h-3" />}
                                            testId={`item-consumption-addon-consumed-${addon.addon_id}`}
                                          />
                                          <IngredientSubTable
                                            title="Returned"
                                            ingredients={addon.returned_ingredients}
                                            colorClass="bg-blue-50 text-blue-800 border-blue-200"
                                            iconEl={<ArrowLeft className="w-3 h-3" />}
                                            testId={`item-consumption-addon-returned-${addon.addon_id}`}
                                          />
                                          <IngredientSubTable
                                            title="Wastage"
                                            ingredients={addon.wastage_ingredients}
                                            colorClass="bg-amber-50 text-amber-800 border-amber-200"
                                            iconEl={<Layers className="w-3 h-3" />}
                                            testId={`item-consumption-addon-wastage-${addon.addon_id}`}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
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

        </div>
      </div>
    </div>
  );
}
