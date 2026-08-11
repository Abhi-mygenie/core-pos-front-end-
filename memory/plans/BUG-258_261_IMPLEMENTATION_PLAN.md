# Implementation Plan — BUG-258 + BUG-261 (P&L + Consumption Date Bar Rewrite)

**IDs:** BUG-258, BUG-261
**Gate:** 3 (Implementation Plan)
**Date:** 2026-07-27
**Owner Decisions:** OD-2 (P&L default=7D) ✅, OD-3 (Consumption default=MTD) ✅

---

## Scope Lock
**Files WILL change:** `PLReportPage.jsx`, `ConsumptionReportPage.jsx`
**Files will NOT touch:** ExpenseReportPage (reference only), API services, Sidebar, App.js

---

## Edit 1: PLReportPage.jsx — Add Preset State + Handlers

**Current (lines 24-34):**
```js
export default function PLReportPage() {
  const navigate = useNavigate();
  const today = fmtISO(new Date());
  const weekAgo = fmtISO(new Date(Date.now() - 6 * 86400000));
  const [fromDate, setFromDate] = useState(weekAgo);
  const [toDate, setToDate] = useState(today);
  ...
```

**New:**
```js
export default function PLReportPage() {
  const navigate = useNavigate();
  const today = fmtISO(new Date());
  const weekAgo = fmtISO(new Date(Date.now() - 6 * 86400000));
  const [fromDate, setFromDate] = useState(weekAgo);
  const [toDate, setToDate] = useState(today);
  const [appliedFrom, setAppliedFrom] = useState(weekAgo);   // BUG-258
  const [appliedTo, setAppliedTo] = useState(today);          // BUG-258
  const [activePreset, setActivePreset] = useState('7D');     // BUG-261: default 7D
  ...
```

Add preset handler after line 34:
```js
  // BUG-258+261: Preset pill handler (matches ExpenseReport pattern)
  const applyPreset = (preset) => {
    const t = new Date();
    let f = new Date();
    if (preset === 'Today') { /* f = t */ }
    else if (preset === '7D') { f = new Date(t.getTime() - 6 * 86400000); }
    else if (preset === '30D') { f = new Date(t.getTime() - 29 * 86400000); }
    else if (preset === 'MTD') { f = new Date(t.getFullYear(), t.getMonth(), 1); }
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
```

Update `fetchData` dependency to use `appliedFrom`/`appliedTo`:
```js
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProfitLossReport(appliedFrom, appliedTo); // BUG-258: use applied dates
      setData(res);
    } catch (err) { ... }
  }, [appliedFrom, appliedTo]); // BUG-258
```

## Edit 2: PLReportPage.jsx — Rewrite Header (lines 139-165)

Replace the entire header `<div>` with ExpenseReport pattern:
```jsx
{/* BUG-258+261: Header with preset pills */}
<header className="flex items-center justify-between mb-6">
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
</header>
```

**Import update (line 4):** Add `CalendarIcon, Check` to lucide imports.

---

## Edit 3: ConsumptionReportPage.jsx — Add Preset State

**Current (lines 20-22):**
```js
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate]     = useState(today());
```

**New (add after line 22):**
```js
  const [appliedFrom, setAppliedFrom] = useState(monthStart()); // BUG-261
  const [appliedTo, setAppliedTo]     = useState(today());      // BUG-261
  const [activePreset, setActivePreset] = useState('MTD');       // BUG-261: default MTD
```

Add preset handler (same pattern as P&L but with `today()` function).

## Edit 4: ConsumptionReportPage.jsx — Rewrite Header + Filter Bar

Move the header (lines 138-174) to include preset pills. Keep the existing category/ingredient filters below as a separate filter row. Add CalendarIcon + preset bar pattern matching P&L edit.

---

## Verification Matrix

| Edit # | File | Change | How to Verify |
|:---:|------|--------|---------------|
| 1 | PLReportPage.jsx | Preset state + handlers | Browser: click 7D pill → dates update to last 7 days |
| 2 | PLReportPage.jsx | Header rewrite | Browser: CalendarIcon visible, pills render, Apply green when dirty |
| 3 | ConsumptionReportPage.jsx | Preset state | Browser: click MTD → dates = 1st of month to today |
| 4 | ConsumptionReportPage.jsx | Header rewrite | Browser: pills visible, category/search filters still work below |

## Post-Code Registry Checklist
- [ ] registry.json: BUG-258, BUG-261 → IMPLEMENTED
- [ ] BUG_TRACKER.md: rows updated
- [ ] FILE_OWNERSHIP.md: PLReportPage, ConsumptionReportPage added
- [ ] Code markers: `// BUG-258` + `// BUG-261` in every modified file
