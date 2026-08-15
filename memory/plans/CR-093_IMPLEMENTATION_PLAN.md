# CR-093 — Consumption Report: Implementation Plan (Gate 3)
**Date:** 2026-07-23
**Role:** PLANNING (Gate 3)
**Status:** GATE 3 COMPLETE — awaiting Gate 4 GO

---

## Owner Decisions Locked

| OQ | Decision |
|---|---|
| OQ-1 | Phase 1 without cost columns — placeholders. Backend brief filed in BACKEND_BLOCKERS_BRIEF_2026_07_22.html |
| OQ-2 | Client-side ingredient filter. Backend brief filed. |
| OQ-3 | Summary + expandable drill-down rows to order level |
| OQ-4 | Excel + PDF export |
| OQ-5 | Daily Report section → below P&L (NOT Insights) |

---

## PRE-PLAN CORRECTIONS (from code inspection)

### Correction 1 — Service function already exists ✅
`getDailyConsumptionReport({ from_date, to_date })` exists at `inventoryService.js:168` (CR-078).
**Plan updated:** Zero changes needed to `inventoryService.js`. File count drops from 4 to 3.

### Correction 2 — PDF export pattern
PLReportPage uses `window.open('', '_blank') → raw HTML injection → w.print()`.
**Plan updated:** Mirror this exact pattern — no jsPDF, no jspdf-autotable.

### Correction 3 — Navigation placement correction
Impact Analysis said "Insights → after Expenses" — **owner updated this to "Daily Report → below P&L"**.
Plan reflects correct placement: `Sidebar.jsx` Daily Report children, after `profit-loss` entry (line 95).

---

## 1. FILE CHANGE PLAN — Exact lines, exact changes

### FILE 1 of 3: `src/components/layout/Sidebar.jsx`
**Change type:** MODIFY (+1 line)
**Exact location:** Line 95 — after `profit-loss` entry, before `summary` entry

```diff
  { id: "profit-loss", label: "P&L Report", path: "/reports-module/profit-loss" },  // CR-094
+ { id: "consumption-report", label: "Consumption Report", path: "/reports-module/consumption-report" }, // CR-093
  { id: "summary", label: "Sales Summary", path: "/reports/summary" },
```

**Hotspot risk:** LOW — additive only, no existing entries touched.

---

### FILE 2 of 3: `src/App.js`
**Change type:** MODIFY (+2 lines — 1 import, 1 route)

**Import** (alongside line 47 `PLReportPage` import):
```diff
  import PLReportPage from "./pages/reports-module/PLReportPage"; // CR-094
+ import ConsumptionReportPage from "./pages/reports-module/ConsumptionReportPage"; // CR-093
```

**Route** (alongside line 153 `profit-loss` route):
```diff
  {/* CR-094: P&L Report */}
  <Route path="profit-loss" element={<ProtectedRoute><PLReportPage /></ProtectedRoute>} />
+ {/* CR-093: Consumption Report */}
+ <Route path="consumption-report" element={<ProtectedRoute><ConsumptionReportPage /></ProtectedRoute>} />
```

**Hotspot risk:** LOW — additive only.

---

### FILE 3 of 3: `src/pages/reports-module/ConsumptionReportPage.jsx`
**Change type:** NEW FILE (~230 lines)

**Full code skeleton:**

```jsx
// CR-093: Consumption Report — Daily Report section, below P&L
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronRight, Download, FileText, Loader2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getDailyConsumptionReport } from '@/api/services/inventoryService'; // CR-078 existing fn
import Sidebar from '@/components/layout/Sidebar';

// CR-093: Helpers
const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

export default function ConsumptionReportPage() {
  const navigate = useNavigate();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  // Filters
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(today());
  const [categoryId, setCategoryId] = useState('');      // sent to API (OQ-2: category works ✅)
  const [ingSearch, setIngSearch] = useState('');         // client-side filter (OQ-2: ingredient broken ❌)

  // Data
  const [summary, setSummary] = useState([]);             // stock_summary rows
  const [details, setDetails] = useState([]);             // stock_details rows
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // UI
  const [expandedRows, setExpandedRows] = useState({});   // { ingredient_id: bool }

  // CR-093: Derive category list from summary
  const categories = useMemo(() =>
    [...new Set(summary.map(r => r.category_name).filter(Boolean))].sort(),
    [summary]
  );

  // CR-093: Client-side ingredient name filter
  const filteredSummary = useMemo(() =>
    ingSearch
      ? summary.filter(r => r.ingredient_name?.toLowerCase().includes(ingSearch.toLowerCase()))
      : summary,
    [summary, ingSearch]
  );

  // CR-093: Detail rows for a given ingredient_id
  const getDetailRows = useCallback((ingredientId) =>
    details.filter(d => d.ingredient_id === ingredientId),
    [details]
  );

  // CR-093: Fetch report
  const fetchReport = useCallback(async () => {
    if (!fromDate || !toDate) { toast.error('Select a date range'); return; }
    setLoading(true);
    try {
      const data = await getDailyConsumptionReport({
        from_date: fromDate,
        to_date: toDate,
        ...(categoryId && { category_id: Number(categoryId) }),
      });
      setSummary(data.stock_summary || []);
      setDetails(data.stock_details || []);
      setHasFetched(true);
    } catch {
      toast.error('Failed to load consumption report');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, categoryId]);

  // Load on mount
  useEffect(() => { fetchReport(); }, []); // eslint-disable-line

  // CR-093: Toggle drill-down row
  const toggleRow = (id) =>
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

  // CR-093: Excel export — OQ-4b
  const handleExportExcel = () => {
    if (!filteredSummary.length) { toast.error('No data to export'); return; }
    const headers = ['Ingredient','Category','Opening Stock','Total Consumed','Closing Stock'];
    const rows = filteredSummary.map(r =>
      [r.ingredient_name, r.category_name, r.opening_stock, r.total_consumed, r.closing_stock]
    );
    const csv = [headers, ...rows].map(r => r.join('\t')).join('\n');
    const blob = new Blob([csv], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `consumption-report-${fromDate}-${toDate}.xls`; a.click();
    URL.revokeObjectURL(url);
  };

  // CR-093: PDF export — OQ-4b (mirrors PLReportPage.jsx pattern)
  const handleExportPDF = () => {
    if (!filteredSummary.length) { toast.error('No data to export'); return; }
    const rows = filteredSummary.map(r =>
      `<tr><td style="padding:6px 8px">${r.ingredient_name}</td><td style="padding:6px 8px">${r.category_name}</td><td style="padding:6px 8px;text-align:right">${r.opening_stock}</td><td style="padding:6px 8px;text-align:right;color:#059669;font-weight:600">${r.total_consumed}</td><td style="padding:6px 8px;text-align:right">${r.closing_stock}</td></tr>`
    ).join('');
    const html = `<html><head><title>Consumption Report</title><style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse}th{background:#f1f5f9;text-align:left;padding:8px;font-size:11px;text-transform:uppercase;border-bottom:2px solid #e2e8f0}td{border-bottom:1px solid #f1f5f9;font-size:13px}</style></head><body><h2>Consumption Report</h2><p style="color:#64748B">${fromDate} to ${toDate}</p><table><thead><tr><th>Ingredient</th><th>Category</th><th style="text-align:right">Opening</th><th style="text-align:right">Consumed</th><th style="text-align:right">Closing</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  // CR-093: KPI strip values
  const kpis = useMemo(() => ({
    total: filteredSummary.length,
    entries: details.length,
    cats: new Set(filteredSummary.map(r => r.category_name)).size,
  }), [filteredSummary, details]);

  return (
    <div className="flex min-h-screen bg-slate-50" data-testid="consumption-report-page">
      <Sidebar isSidebarExpanded={isSidebarExpanded} setIsSidebarExpanded={setIsSidebarExpanded} />
      <div className={`flex-1 transition-all duration-300 ${isSidebarExpanded ? 'ml-64' : 'ml-16'}`}>
        <div className="max-w-7xl mx-auto px-6 py-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" data-testid="cr093-back-btn">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Consumption Report</h1>
                <p className="text-xs text-slate-500 mt-0.5">{fromDate} to {toDate} · {kpis.total} ingredients</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!hasFetched} data-testid="cr093-export-excel" className="gap-1 text-xs">
                <Download className="w-3.5 h-3.5" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!hasFetched} data-testid="cr093-export-pdf" className="gap-1 text-xs">
                <FileText className="w-3.5 h-3.5" /> PDF
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 flex flex-wrap gap-3 items-end" data-testid="cr093-filters">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">From</label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-8 text-xs" data-testid="cr093-from-date" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">To</label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-8 text-xs" data-testid="cr093-to-date" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Category</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="h-8 text-xs border border-slate-200 rounded-md px-2" data-testid="cr093-category-filter">
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Ingredient</label>
              <Input placeholder="Search..." value={ingSearch} onChange={e => setIngSearch(e.target.value)} className="h-8 text-xs w-40" data-testid="cr093-ing-search" />
            </div>
            <Button size="sm" onClick={fetchReport} disabled={loading} className="h-8 text-xs gap-1 bg-orange-500 hover:bg-orange-600 text-white" data-testid="cr093-apply-btn">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Apply
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setIngSearch(''); setCategoryId(''); }} className="h-8 text-xs" data-testid="cr093-reset-btn">
              Reset
            </Button>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            {[
              { label: 'Ingredients', value: kpis.total, color: '#f97316', testid: 'cr093-kpi-ingredients' },
              { label: 'Entries', value: kpis.entries, color: '#3b82f6', testid: 'cr093-kpi-entries' },
              { label: 'Categories', value: kpis.cats, color: '#8b5cf6', testid: 'cr093-kpi-categories' },
              { label: 'Cost / Unit', value: '— pending', color: '#d1d5db', muted: true, testid: 'cr093-kpi-cost' },
              { label: 'Margin', value: '— pending', color: '#d1d5db', muted: true, testid: 'cr093-kpi-margin' },
            ].map(k => (
              <div key={k.label} className={`bg-white rounded-xl border p-4 ${k.muted ? 'border-dashed border-slate-200' : 'border-slate-200'}`} style={{ borderLeftWidth: k.muted ? undefined : 3, borderLeftColor: k.muted ? undefined : k.color }} data-testid={k.testid}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{k.label}</p>
                <p className={`text-xl font-bold mt-1 ${k.muted ? 'text-slate-300 text-sm' : 'text-slate-900'}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="cr093-table-wrap">
            {loading ? (
              <div className="flex items-center justify-center py-20 gap-2 text-slate-400 text-sm" data-testid="cr093-loading">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading consumption data…
              </div>
            ) : !hasFetched ? (
              <div className="flex items-center justify-center py-20 text-slate-400 text-sm" data-testid="cr093-empty-initial">
                <Layers className="w-8 h-8 mb-2 opacity-30" />
                <span className="ml-2">Select a date range and click Apply</span>
              </div>
            ) : filteredSummary.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-slate-400 text-sm" data-testid="cr093-empty-no-data">
                No data for selected filters
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="w-8 px-3 py-3" />
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Ingredient</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Opening</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Consumed</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Closing</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-300 uppercase tracking-wide" title="Available in Phase 2 — pending backend update">Cost/Unit ⚠</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-300 uppercase tracking-wide" title="Available in Phase 2 — pending backend update">Total Cost ⚠</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-300 uppercase tracking-wide" title="Available in Phase 2 — pending backend update">Margin ⚠</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSummary.map(row => {
                    const drillRows = getDetailRows(row.ingredient_id);
                    const isOpen = !!expandedRows[row.ingredient_id];
                    return (
                      <>
                        <tr
                          key={row.ingredient_id}
                          className="border-b border-slate-100 hover:bg-orange-50 cursor-pointer transition-colors"
                          onClick={() => toggleRow(row.ingredient_id)}
                          data-testid={`cr093-row-${row.ingredient_id}`}
                        >
                          <td className="px-3 py-3 text-slate-400">
                            {isOpen
                              ? <ChevronDown className="w-4 h-4 text-orange-500" />
                              : <ChevronRight className="w-4 h-4" />}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900">{row.ingredient_name}</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">{row.category_name}</span></td>
                          <td className="px-4 py-3 text-sm text-right text-slate-600">{row.opening_stock}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-600">{row.total_consumed}</td>
                          <td className="px-4 py-3 text-sm text-right text-slate-600">{row.closing_stock}</td>
                          <td className="px-4 py-3 text-sm text-right text-slate-300 italic">—</td>
                          <td className="px-4 py-3 text-sm text-right text-slate-300 italic">—</td>
                          <td className="px-4 py-3 text-sm text-right text-slate-300 italic">—</td>
                        </tr>
                        {isOpen && (
                          <tr key={`drill-${row.ingredient_id}`} className="bg-orange-50/50" data-testid={`cr093-drill-${row.ingredient_id}`}>
                            <td colSpan={9} className="px-4 pb-3 pt-0">
                              <div className="ml-8 rounded-lg border border-orange-200 overflow-hidden text-xs">
                                <table className="w-full">
                                  <thead><tr className="bg-orange-100/60">
                                    <th className="px-3 py-2 text-left text-orange-900 font-bold uppercase tracking-wide">Date</th>
                                    <th className="px-3 py-2 text-left text-orange-900 font-bold uppercase tracking-wide">Order</th>
                                    <th className="px-3 py-2 text-left text-orange-900 font-bold uppercase tracking-wide">Food Item</th>
                                    <th className="px-3 py-2 text-left text-orange-900 font-bold uppercase tracking-wide">Type</th>
                                    <th className="px-3 py-2 text-right text-orange-900 font-bold uppercase tracking-wide">Qty Deducted</th>
                                  </tr></thead>
                                  <tbody>
                                    {drillRows.length === 0
                                      ? <tr><td colSpan={5} className="px-3 py-2 text-slate-400 text-center">No order-level detail available</td></tr>
                                      : drillRows.map((d, i) => (
                                          <tr key={i} className="border-t border-orange-100">
                                            <td className="px-3 py-1.5 text-slate-600">{d.consumption_date}</td>
                                            <td className="px-3 py-1.5 text-slate-600">#{d.order_id}</td>
                                            <td className="px-3 py-1.5 text-slate-700 font-medium">{d.food_item}</td>
                                            <td className="px-3 py-1.5 text-slate-500">{d.order_type}</td>
                                            <td className="px-3 py-1.5 text-right font-semibold text-emerald-700">{d.quantity_deducted}</td>
                                          </tr>
                                        ))
                                    }
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
```

---

## 2. CHANGES NOT NEEDED (corrections)

| File | Previous plan said | Reality | Action |
|---|---|---|---|
| `inventoryService.js` | Add `getConsumptionReport()` | `getDailyConsumptionReport()` exists at line 168 (CR-078) | NO CHANGE |
| `api/constants.js` | Zero (already confirmed) | Zero | NO CHANGE |

---

## 3. FINAL FILE DELTA

| File | Type | Net change | Risk |
|---|---|---|---|
| `src/components/layout/Sidebar.jsx` | MODIFY | +1 line | LOW |
| `src/App.js` | MODIFY | +2 lines (import + route) | LOW |
| `src/pages/reports-module/ConsumptionReportPage.jsx` | NEW | ~230 lines | LOW |

**Total: ~233 lines, 3 files (2 existing + 1 new)**

---

## 4. DATA-TESTID MAP

| Element | data-testid |
|---|---|
| Page root | `consumption-report-page` |
| Back button | `cr093-back-btn` |
| Filter panel | `cr093-filters` |
| From date input | `cr093-from-date` |
| To date input | `cr093-to-date` |
| Category dropdown | `cr093-category-filter` |
| Ingredient search | `cr093-ing-search` |
| Apply button | `cr093-apply-btn` |
| Reset button | `cr093-reset-btn` |
| Excel export btn | `cr093-export-excel` |
| PDF export btn | `cr093-export-pdf` |
| KPI: ingredients | `cr093-kpi-ingredients` |
| KPI: entries | `cr093-kpi-entries` |
| KPI: categories | `cr093-kpi-categories` |
| KPI: cost (pending) | `cr093-kpi-cost` |
| KPI: margin (pending) | `cr093-kpi-margin` |
| Table wrapper | `cr093-table-wrap` |
| Loading spinner | `cr093-loading` |
| Empty (initial) | `cr093-empty-initial` |
| Empty (no data) | `cr093-empty-no-data` |
| Summary row | `cr093-row-{ingredient_id}` |
| Drill-down row | `cr093-drill-{ingredient_id}` |

---

## 5. SELF-TEST CHECKLIST (for QA agent)

- [ ] T-01: Sidebar → Daily Report → "Consumption Report" link visible below "P&L Report"
- [ ] T-02: Click link → navigates to `/reports-module/consumption-report`
- [ ] T-03: Page loads with `cr093-loading` spinner, then data appears
- [ ] T-04: Date range filter → change dates → Apply → table refreshes
- [ ] T-05: Category filter → select category → only that category's rows shown
- [ ] T-06: Ingredient search → type partial name → table narrows client-side (no API call)
- [ ] T-07: Reset button → clears search + category filter
- [ ] T-08: Click row → `cr093-drill-{id}` appears with order-level entries
- [ ] T-09: Click same row again → drill-down collapses
- [ ] T-10: Excel export → .xls file downloads with correct columns
- [ ] T-11: PDF export → print preview opens in new tab
- [ ] T-12: Cost/Unit, Total Cost, Margin columns show `—` (greyed, italic)
- [ ] T-13: KPI strip shows correct ingredient count + entry count
- [ ] T-14: Empty state (`cr093-empty-no-data`) shown for date range with no orders
- [ ] T-15: Back button → navigates back

---

## 6. RISK RE-ASSESSMENT

| Item | Risk | Reason |
|---|---|---|
| Sidebar.jsx | LOW | +1 line, additive, no conditional logic |
| App.js | LOW | +2 lines, mirrors identical P&L pattern |
| ConsumptionReportPage.jsx | LOW | New file, no other files depend on it |
| Service layer | ZERO | No changes needed |
| Overall | **LOW** | No hotspot files, no financial logic, no auth changes |

Fast lane eligible: YES (LOW risk, new screen, no existing code modification beyond +3 lines)

---

## 7. RETROACTIVE CANDIDATES
NONE

---

## 8. GATE 4 APPROVAL REQUIRED

```
Planning: CR-093
Stage: Gate 3 COMPLETE
Risk: LOW
Files: 3 (2 modify +3 lines total, 1 new ~230 lines)
Estimate: 1 session
Backend needed for Phase 1: NONE (all available)
Backend needed for Phase 2: cost/margin fields (BUG-233 brief filed)

GATE 4 GO → Implementation begins
```
