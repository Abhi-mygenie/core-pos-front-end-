# CR-150 — Purchase Report in New POS
## Gate 3: Implementation Plan (v2 — Design Frozen 2026-08-22)

**Date:** 2026-08-22
**Role:** PLANNING agent
**Stage:** Gate 3 — Implementation Plan
**Risk:** HIGH (financial report displaying vendor costs and purchase transactions)
**Sprint:** POS 6.0
**Design status:** FROZEN — mockup approved at `/app/frontend/public/mockups_preview.html` (CR-150 tab)

---

## Owner Decisions — All Resolved

| # | Question | Answer |
|---|---|---|
| OQ-1 | Date filter (`from`/`to` params) | **RESOLVED** — backend confirmed, params accepted |
| OQ-2 | Sidebar placement | **Daily Report section, after Expense Report** (2026-08-22) |
| OQ-3 | Default date range | Last 30 days |
| OQ-4 | Charts required | **YES — full chart suite matching ExpenseReportPage pattern** (2026-08-22) |

---

## Approved Design (FROZEN)

Full page layout matches `ExpenseReportPage.jsx` pattern exactly:

```
┌─ Header bar ─────────────────────────────────────────────────────┐
│ ← Purchase Report  [FROM] [TO]  ✓ Apply  Today 7D 30D MTD  ↓ DL │
└──────────────────────────────────────────────────────────────────┘
┌─ 5 KPI cards (grid-cols-5) ─────────────────────────────────────┐
│ PURCHASES │ TOTAL SPEND │ AVG DAILY SPEND │ VENDORS │ HIGHEST DAY│
└─────────────────────────────────────────────────────────────────┘
┌─ Charts row (grid-cols-3) ──────────────────────────────────────┐
│  Daily Purchase Trend (col-span-2 bar chart)  │ Spend by Vendor  │
│  Green bars, one per day, spend in ₹          │ Doughnut by vendor│
└─────────────────────────────────────────────────────────────────┘
┌─ Payment split (grid-cols-3) ───────────────────────────────────┐
│  Cash ₹X (N%)  ▬▬▬▬▬▬▬  │  UPI ₹X (N%)  ▬▬▬▬  │  Bank Transfer  │
└─────────────────────────────────────────────────────────────────┘
┌─ Table (full width) ────────────────────────────────────────────┐
│ Search…                              N purchases · DD/MM → DD/MM │
│ ┌ TOTALS row (orange, pinned) ─────────────────────────────────┐│
│ │ TOTALS │ — │ — │ — │ N entries │ — │ ₹TOTAL │ —            ││
│ ├─ PO REF │ DATE │ INGREDIENT │ VENDOR │ QTY │ UNIT │ TOTAL │ PAY
│ └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Scope Lock

**Files WILL change (4 files, 1 new):**
- `src/pages/reports-module/PurchaseReportPage.jsx` — **NEW**
- `src/api/services/inventoryService.js` — additive
- `src/components/layout/Sidebar.jsx` — additive
- `src/App.js` — additive

**Files WILL NOT touch:**
- `SmartPurchasePanel.jsx`
- `inventoryTransform.js`
- `rankVendors.js`
- `orderTransform.js`
- Any financial/settlement logic
- `getVendorItemList()` — untouched, new function added alongside

---

## Edit-by-Edit Plan

### Edit 1 — `src/api/services/inventoryService.js`
**Change:** Add `getPurchaseReport(from, to)` after existing `getVendorItemList()`.

**Location:** After line ~188.

**Before:**
```js
export async function getVendorItemList() {
  const res = await api.get(INVENTORY_ENDPOINTS.VENDOR_ITEM_LIST);
  return res.data?.data || [];
}
```

**After:**
```js
export async function getVendorItemList() {
  const res = await api.get(INVENTORY_ENDPOINTS.VENDOR_ITEM_LIST);
  return res.data?.data || [];
}

// CR-150: Purchase Report — same endpoint with optional date filter
export async function getPurchaseReport(from, to) {
  const params = {};
  if (from) params.from = from; // YYYY-MM-DD
  if (to)   params.to   = to;   // YYYY-MM-DD
  const res = await api.get(INVENTORY_ENDPOINTS.VENDOR_ITEM_LIST, { params });
  return res.data || {};
}
```

**Risk:** LOW — additive only.

---

### Edit 2 — `src/components/layout/Sidebar.jsx`
**Change:** Add "Purchase Report" after "Expense Report" in Daily Report children (line 103).

**Before:**
```js
      { id: "expense-report", label: "Expense Report", path: "/reports-module/expense-report" }, // BUG-FIX: sidebar entry for CR-061 Expense Report (was only under Insights)
    ],
  },
```

**After:**
```js
      { id: "expense-report", label: "Expense Report", path: "/reports-module/expense-report" }, // BUG-FIX: sidebar entry for CR-061 Expense Report (was only under Insights)
      { id: "purchase-report", label: "Purchase Report", path: "/reports-module/purchase-report" }, // CR-150
    ],
  },
```

**Risk:** LOW.

---

### Edit 3 — `src/App.js`

**Edit 3a — Import** (after line 48):
```js
import ExpenseReportPage from "./pages/reports-module/ExpenseReportPage"; // CR-061
import PurchaseReportPage from "./pages/reports-module/PurchaseReportPage"; // CR-150
```

**Edit 3b — Route** (after line 181):
```jsx
              {/* CR-061: Expense Report */}
              <Route path="expense-report" element={<ProtectedRoute><ExpenseReportPage /></ProtectedRoute>} />
              {/* CR-150: Purchase Report */}
              <Route path="purchase-report" element={<ProtectedRoute><PurchaseReportPage /></ProtectedRoute>} />
```

**Risk:** LOW.

---

### Edit 4 — `src/pages/reports-module/PurchaseReportPage.jsx` (NEW FILE)

**Pattern:** `ExpenseReportPage.jsx` — exact same layout structure.
**Design reference:** `/app/frontend/public/mockups_preview.html` → CR-150 tab (FROZEN).
**Data source:** `getPurchaseReport(from, to)` → `{ data: [...], total_amount, summary }`

#### 4.1 Imports
```jsx
// CR-150: Purchase Report Page
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../../contexts';
import { getPurchaseReport } from '../../api/services/inventoryService';
import { exportReportAsExcel } from '../../utils/reportExporter';
import Sidebar from '../../components/layout/Sidebar';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import {
  ArrowLeft, Search, Download, FileSpreadsheet, FileDown,
  ShoppingCart, TrendingUp, Users, BarChart3, CalendarDays,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
```

#### 4.2 Helper functions (top of file, outside component)
```js
// CR-150
const fmtINR = (n) => (parseFloat(n) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const todayISO   = ()  => new Date().toISOString().slice(0, 10);
const daysAgoISO = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const mtdISO     = ()  => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };

const QUICK_RANGES = [
  { label: 'Today', from: todayISO,         to: todayISO },
  { label: '7D',    from: () => daysAgoISO(6),  to: todayISO },
  { label: '30D',   from: () => daysAgoISO(29), to: todayISO },
  { label: 'MTD',   from: mtdISO,           to: todayISO },
];

const PIE_COLORS = ['#329937', '#F26B33', '#2563EB', '#7C3AED', '#EC4899', '#14B8A6', '#F59E0B', '#EF4444'];

const PAYMENT_STYLE = {
  Cash:          { bg: 'rgba(50,153,55,.10)',   color: '#329937' },
  UPI:           { bg: 'rgba(37,99,235,.10)',   color: '#2563EB' },
  'Bank Transfer': { bg: 'rgba(124,58,237,.10)', color: '#7C3AED' },
};
const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer'];
```

#### 4.3 Component state
```js
export default function PurchaseReportPage() {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();

  // Date range — default last 30 days
  const [pendingFrom, setPendingFrom] = useState(daysAgoISO(29));
  const [pendingTo,   setPendingTo]   = useState(todayISO());
  const [appliedFrom, setAppliedFrom] = useState(daysAgoISO(29)); // CR-150: applied on Apply click
  const [appliedTo,   setAppliedTo]   = useState(todayISO());
  const [activePreset, setActivePreset] = useState('30D');

  // Data
  const [rawData,  setRawData]  = useState([]);
  const [summary,  setSummary]  = useState({});
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  // Table controls
  const [search,     setSearch]     = useState('');
  const [sortKey,    setSortKey]    = useState('Purchase_Date');
  const [sortDir,    setSortDir]    = useState('desc');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
```

#### 4.4 Fetch + Apply
```js
  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await getPurchaseReport(appliedFrom, appliedTo);
      setRawData(res.data || []);
      setSummary(res.summary || {});
    } catch {
      setError('Failed to load purchase report.');
    } finally {
      setLoading(false);
    }
  }, [appliedFrom, appliedTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApply = () => {
    setAppliedFrom(pendingFrom);
    setAppliedTo(pendingTo);
  };

  const handlePreset = (preset) => {
    const range = QUICK_RANGES.find(r => r.label === preset);
    if (!range) return;
    const f = range.from(), t = range.to();
    setPendingFrom(f); setPendingTo(t);
    setAppliedFrom(f); setAppliedTo(t);
    setActivePreset(preset);
  };
```

#### 4.5 Derived data (useMemo)
```js
  // Filtered + sorted rows
  const filteredRows = useMemo(() => {
    let rows = rawData;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        (r.Ingredient_Name || '').toLowerCase().includes(q) ||
        (r.Vendor_Name     || '').toLowerCase().includes(q) ||
        String(r.ID || '').includes(q)
      );
    }
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rawData, search, sortKey, sortDir]);

  const handleSort = (key) =>
    setSortKey(k => { setSortDir(k === key ? d => d === 'asc' ? 'desc' : 'asc' : 'asc'); return key; });
  // Note: above is simplified — implementation agent use standard sort toggle pattern

  // --- KPI aggregates ---
  const totalSpend = useMemo(
    () => filteredRows.reduce((s, r) => s + (parseFloat(r.line_total) || parseFloat(r.Amount) || 0), 0),
    [filteredRows]
  );
  const vendorCount = useMemo(
    () => new Set(filteredRows.map(r => r.Vendor_Name).filter(Boolean)).size,
    [filteredRows]
  );
  const byDay = useMemo(() => {
    const acc = {};
    filteredRows.forEach(r => {
      const d = r.Purchase_Date || '';
      if (!acc[d]) acc[d] = { date: d, total: 0, count: 0 };
      acc[d].total += parseFloat(r.line_total) || parseFloat(r.Amount) || 0;
      acc[d].count++;
    });
    return Object.values(acc).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRows]);

  const activeDays  = byDay.length;
  const avgDaily    = activeDays ? totalSpend / activeDays : 0;
  const highestDay  = [...byDay].sort((a, b) => b.total - a.total)[0] || null;

  // --- Bar chart data ---
  const barData = useMemo(
    () => byDay.map(d => ({ date: d.date.slice(5).split('-').reverse().join('/'), total: d.total })),
    [byDay]
  );

  // --- Pie chart data (spend by vendor) ---
  const pieData = useMemo(() => {
    const acc = {};
    filteredRows.forEach(r => {
      const v = r.Vendor_Name || 'Unassigned';
      acc[v] = (acc[v] || 0) + (parseFloat(r.line_total) || parseFloat(r.Amount) || 0);
    });
    return Object.entries(acc).map(([name, value]) => ({ name, value }));
  }, [filteredRows]);

  // --- Payment split ---
  const payData = useMemo(() => {
    const acc = {};
    filteredRows.forEach(r => {
      const p = r.Payment_Type || 'Cash';
      acc[p] = (acc[p] || 0) + (parseFloat(r.line_total) || parseFloat(r.Amount) || 0);
    });
    return acc;
  }, [filteredRows]);
```

#### 4.6 Excel export
```js
  const handleExcel = () => {
    const rows = filteredRows.map(r => ({
      'PO Ref':       r.ID,
      'Date':         r.Purchase_Date,
      'Ingredient':   r.Ingredient_Name,
      'Vendor':       r.Vendor_Name || '—',
      'Quantity':     r.Quantity,
      'Unit Price':   r.unit_price,
      'Item Total':   parseFloat(r.line_total) || parseFloat(r.Amount) || 0,
      'Payment Type': r.Payment_Type || '—',
    }));
    exportReportAsExcel(rows, `purchase_report_${appliedFrom}_${appliedTo}.xlsx`, 'Purchase Report');
  };
```

#### 4.7 JSX structure (section by section)

**4.7a — Outer wrapper (same as ExpenseReportPage):**
```jsx
  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden" data-testid="purchase-report-page">
      <Sidebar activeItem="purchase-report" isExpanded={isSidebarExpanded} onToggle={setIsSidebarExpanded} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ReportLoadingShield loading={loading} error={error} onRetry={fetchData}>
          <div className="flex-1 overflow-y-auto">
```

**4.7b — Header bar:**
```jsx
            {/* CR-150: Header */}
            <div className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center gap-3 flex-wrap sticky top-0 z-10"
                 data-testid="purchase-report-header">
              <button onClick={() => navigate(-1)}
                className="w-8 h-8 flex items-center justify-center border border-zinc-200 rounded-lg text-zinc-500 hover:border-[#F26B33] hover:text-[#F26B33] transition-colors"
                data-testid="purchase-report-back-btn">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h1 className="text-xl font-bold text-zinc-900 mr-2" data-testid="purchase-report-title">
                Purchase Report
              </h1>

              {/* Date range picker */}
              <div className="flex items-center gap-2 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm hover:border-[#F26B33] transition-colors"
                   data-testid="purchase-report-daterange">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase">From</span>
                <input type="date" value={pendingFrom} onChange={e => setPendingFrom(e.target.value)}
                  className="border-none outline-none text-sm text-zinc-700 bg-transparent cursor-pointer"
                  data-testid="purchase-report-date-from" />
                <span className="text-zinc-300">—</span>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase">To</span>
                <input type="date" value={pendingTo} onChange={e => setPendingTo(e.target.value)}
                  className="border-none outline-none text-sm text-zinc-700 bg-transparent cursor-pointer"
                  data-testid="purchase-report-date-to" />
              </div>

              {/* Apply */}
              <button onClick={handleApply}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#329937] hover:bg-[#287a2d] text-white text-sm font-semibold rounded-lg transition-colors"
                data-testid="purchase-report-apply-btn">
                <Check className="w-3.5 h-3.5" /> Apply
              </button>

              {/* Quick presets */}
              <div className="flex gap-1 bg-zinc-100 rounded-lg p-1" data-testid="purchase-report-presets">
                {QUICK_RANGES.map(r => (
                  <button key={r.label} onClick={() => handlePreset(r.label)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${activePreset === r.label ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                    data-testid={`purchase-report-preset-${r.label}`}>
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Download */}
              <button onClick={handleExcel}
                className="ml-auto flex items-center gap-2 px-4 py-1.5 border-[1.5px] border-[#F26B33] text-[#F26B33] hover:bg-orange-50 text-sm font-semibold rounded-lg transition-colors"
                data-testid="purchase-report-download-btn">
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
```

**4.7c — 5 KPI cards (grid-cols-5):**
```jsx
            {/* CR-150: KPI Strip — 5 cards */}
            <div className="grid grid-cols-5 gap-3 px-6 pt-5" data-testid="purchase-report-kpi-strip">
              {/* Card 1: Purchases */}
              <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3" data-testid="purchase-report-kpi-purchases">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Purchases</p>
                    <p className="text-2xl font-bold text-zinc-950 tabular-nums">{filteredRows.length}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 text-[#F26B33]" />
                  </div>
                </div>
                <p className="text-xs text-zinc-500">Total PO entries</p>
              </div>

              {/* Card 2: Total Spend */}
              <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3" data-testid="purchase-report-kpi-total-spend">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Total Spend</p>
                    <p className="text-2xl font-bold text-zinc-950 tabular-nums">{fmtINR(totalSpend)}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-[#329937]" />
                  </div>
                </div>
                <p className="text-xs text-zinc-500">Gross inventory outlay</p>
              </div>

              {/* Card 3: Avg Daily Spend */}
              <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3" data-testid="purchase-report-kpi-avg-daily">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Avg Daily Spend</p>
                    <p className="text-2xl font-bold text-zinc-950 tabular-nums">{fmtINR(avgDaily)}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-[#F26B33]" />
                  </div>
                </div>
                <p className="text-xs text-zinc-500">Across {activeDays} active days</p>
              </div>

              {/* Card 4: Vendors */}
              <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3" data-testid="purchase-report-kpi-vendors">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Vendors</p>
                    <p className="text-2xl font-bold text-zinc-950 tabular-nums">{vendorCount}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-zinc-500">Suppliers engaged</p>
              </div>

              {/* Card 5: Highest Day (highlighted border) */}
              <div className="bg-white border border-[#F26B33]/30 rounded-xl px-4 py-3" data-testid="purchase-report-kpi-highest-day">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Highest Day</p>
                    <p className="text-2xl font-bold text-zinc-950 tabular-nums">{highestDay ? fmtINR(highestDay.total) : '—'}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-pink-500" />
                  </div>
                </div>
                <p className="text-xs text-zinc-500">{highestDay ? `${highestDay.date} · ${highestDay.count} POs` : 'No data'}</p>
              </div>
            </div>
```

**4.7d — Charts row (grid-cols-3 — bar 2/3, pie 1/3):**
```jsx
            {/* CR-150: Charts row — matches ExpenseReportPage grid-cols-3 */}
            <div className="grid grid-cols-3 gap-4 px-6 pt-4">

              {/* Daily Purchase Trend — col-span-2, green bars */}
              <div className="col-span-2 bg-white border border-zinc-200 rounded-xl p-6"
                   data-testid="purchase-report-daily-chart">
                <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">
                  Daily Purchase Trend
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="purchaseBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#329937" stopOpacity={0.85} />
                        <stop offset="100%" stopColor="#329937" stopOpacity={0.40} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }}
                           tickLine={false} axisLine={{ stroke: '#e4e4e7' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false}
                           tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} />
                    <ReTooltip formatter={v => [fmtINR(v), 'Spend']} />
                    <Bar dataKey="total" fill="url(#purchaseBarGrad)" radius={[4, 4, 0, 0]}
                         animationDuration={600} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Spend by Vendor — doughnut pie */}
              <div className="bg-white border border-zinc-200 rounded-xl p-6"
                   data-testid="purchase-report-vendor-chart">
                <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">
                  Spend by Vendor
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name"
                         cx="50%" cy="50%" outerRadius={75} innerRadius={42} paddingAngle={2}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Legend formatter={val => <span className="text-xs text-zinc-600">{val}</span>} />
                    <ReTooltip formatter={val => fmtINR(val)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
```

**4.7e — Payment split cards (grid-cols-3):**
```jsx
            {/* CR-150: Payment method split — matches ExpenseReportPage pattern */}
            <div className="grid grid-cols-3 gap-4 px-6 pt-4" data-testid="purchase-report-payment-split">
              {PAYMENT_METHODS.map(method => {
                const val  = payData[method] || 0;
                const pct  = Math.round((val / (totalSpend || 1)) * 100);
                const max  = Math.max(...PAYMENT_METHODS.map(m => payData[m] || 0)) || 1;
                const w    = Math.round((val / max) * 100);
                const s    = PAYMENT_STYLE[method] || PAYMENT_STYLE['Cash'];
                return (
                  <div key={method}
                       className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-4"
                       data-testid={`purchase-report-payment-${method.toLowerCase().replace(/\s+/g, '-')}`}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold flex-shrink-0"
                         style={{ backgroundColor: s.bg, color: s.color }}>₹</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-zinc-800">{method}</div>
                      <div className="text-lg font-extrabold text-zinc-950 tracking-tight tabular-nums">
                        {fmtINR(val)} <span className="text-xs font-normal text-zinc-400">({pct}%)</span>
                      </div>
                      <div className="h-1 rounded-full mt-1.5 bg-zinc-100">
                        <div className="h-full rounded-full transition-all"
                             style={{ width: `${w}%`, background: s.color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
```

**4.7f — Search bar + meta + table:**
```jsx
            {/* CR-150: Table section */}
            <div className="px-6 pt-4 pb-10">

              {/* Controls row */}
              <div className="flex items-center gap-3 mb-3">
                <div className="relative max-w-xs flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search purchases..."
                    className="w-full border border-zinc-200 rounded-lg pl-8 pr-3 py-2 text-sm text-zinc-700 outline-none focus:border-[#F26B33] transition-colors bg-white"
                    data-testid="purchase-report-search" />
                </div>
                <span className="ml-auto text-xs text-zinc-400" data-testid="purchase-report-meta">
                  {filteredRows.length} purchases · {appliedFrom.split('-').reverse().join('/')} → {appliedTo.split('-').reverse().join('/')}
                </span>
              </div>

              {/* Table */}
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden"
                   data-testid="purchase-report-table-container">
                <table className="w-full text-xs" data-testid="purchase-report-table">
                  <thead className="bg-zinc-50 border-b border-zinc-200">
                    <tr>
                      {[
                        { key: 'ID',             label: 'PO REF',       align: 'text-left' },
                        { key: 'Purchase_Date',  label: 'DATE',         align: 'text-left' },
                        { key: 'Ingredient_Name',label: 'INGREDIENT',   align: 'text-left' },
                        { key: 'Vendor_Name',    label: 'VENDOR',       align: 'text-left' },
                        { key: 'Quantity',       label: 'QTY',          align: 'text-center' },
                        { key: 'unit_price',     label: 'UNIT PRICE',   align: 'text-right' },
                        { key: 'line_total',     label: 'ITEM TOTAL',   align: 'text-right' },
                        { key: 'Payment_Type',   label: 'PAYMENT TYPE', align: 'text-left' },
                      ].map(col => (
                        <th key={col.key} onClick={() => handleSort(col.key)}
                          className={`px-4 py-3 ${col.align} text-[10px] font-semibold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none`}
                          data-testid={`purchase-report-th-${col.key.toLowerCase()}`}>
                          {col.label}
                          <span className="ml-1 opacity-40">
                            {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* TOTALS ROW — pinned first, orange */}
                    <tr className="bg-[#F26B33]/5 border-b-2 border-[#F26B33]/25"
                        data-testid="purchase-report-totals-row">
                      <td className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#F26B33]">TOTALS</td>
                      <td className="px-4 py-2.5 text-[#F26B33] text-[11px] font-bold">—</td>
                      <td className="px-4 py-2.5 text-[#F26B33] text-[11px] font-bold">—</td>
                      <td className="px-4 py-2.5 text-[#F26B33] text-[11px] font-bold">—</td>
                      <td className="px-4 py-2.5 text-center text-[#F26B33] text-[11px] font-bold tabular-nums">{filteredRows.length} entries</td>
                      <td className="px-4 py-2.5 text-right text-[#F26B33] text-[11px] font-bold">—</td>
                      <td className="px-4 py-2.5 text-right text-[#F26B33] text-[11px] font-bold tabular-nums">{fmtINR(totalSpend)}</td>
                      <td className="px-4 py-2.5 text-[#F26B33] text-[11px] font-bold">—</td>
                    </tr>

                    {/* DATA ROWS */}
                    {filteredRows.map((row, idx) => {
                      const amount = parseFloat(row.line_total) || parseFloat(row.Amount) || 0;
                      const payMethod = row.Payment_Type || '';
                      const payStyle = PAYMENT_STYLE[payMethod];
                      return (
                        <tr key={row.ID || idx}
                            className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                            data-testid={`purchase-report-row-${row.ID}`}>
                          <td className="px-4 py-3 font-semibold text-[#F26B33]">{row.ID ? `#${row.ID}` : '—'}</td>
                          <td className="px-4 py-3 text-zinc-600">{row.Purchase_Date || '—'}</td>
                          <td className="px-4 py-3 font-medium text-zinc-800">{row.Ingredient_Name || '—'}</td>
                          <td className="px-4 py-3 text-zinc-600">{row.Vendor_Name || <span className="text-zinc-300">—</span>}</td>
                          <td className="px-4 py-3 text-center text-zinc-600">{row.Quantity || '—'}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-zinc-600">{fmtINR(row.unit_price)}</td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums text-zinc-900">{fmtINR(amount)}</td>
                          <td className="px-4 py-3">
                            {payStyle ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold"
                                    style={{ background: payStyle.bg, color: payStyle.color }}>
                                {payMethod}
                              </span>
                            ) : (
                              <span className="text-zinc-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </ReportLoadingShield>
      </div>
    </div>
  );
}
```

**Note on `Check` icon:** Add `Check` to the lucide-react import list above.

**Note on `handleSort` implementation:** Use same pattern as `ExpenseReportPage.jsx` — single function that toggles direction when same key is clicked.

---

## Execution Sequence

```
1. Edit 1 — inventoryService.js          (no dependencies)
2. Edit 2 — Sidebar.jsx                  (no dependencies)
3. Edit 3a — App.js import               (no dependencies)
4. Edit 4 — PurchaseReportPage.jsx       (depends on Edit 1)
5. Edit 3b — App.js route               (depends on Edit 4)
```

Webpack compile check after Edit 3b.

---

## Verification Matrix (updated for charts)

| # | Edit | File | What to verify | How | Auto |
|---|---|---|---|---|---|
| 1 | 1 | inventoryService.js | `getPurchaseReport` exported | `grep -n "getPurchaseReport"` | AUTO |
| 2 | 1 | inventoryService.js | `getVendorItemList` still present | `grep -n "getVendorItemList"` | AUTO |
| 3 | 2 | Sidebar.jsx | "Purchase Report" after "Expense Report" | `grep -n "purchase-report"` | AUTO |
| 4 | 3 | App.js | Route + import present | `grep -n "PurchaseReportPage"` | AUTO |
| 5 | 4 | PurchaseReportPage.jsx | Page loads at `/reports-module/purchase-report` | Browser → no 404 | MANUAL |
| 6 | 4 | PurchaseReportPage.jsx | Sidebar "Purchase Report" active when on page | Green active state | MANUAL |
| 7 | 4 | KPI strip | 5 cards rendered: Purchases, Total Spend, Avg Daily, Vendors, Highest Day | Visible + not zero | MANUAL |
| 8 | 4 | Bar chart | Daily Purchase Trend renders with green bars | Chart visible | MANUAL |
| 9 | 4 | Pie chart | Spend by Vendor doughnut renders with legend | Chart + legend visible | MANUAL |
| 10 | 4 | Payment split | 3 cards: Cash / UPI / Bank Transfer with % bars | All 3 visible | MANUAL |
| 11 | 4 | Totals row | Orange TOTALS row pinned at top of table | Orange text, first row | MANUAL |
| 12 | 4 | Table | 8 columns: PO Ref / Date / Ingredient / Vendor / Qty / Unit / Total / Payment | All visible | MANUAL |
| 13 | 4 | Date filter | Set range → Apply → all sections update (KPIs + charts + table) | Data refreshes | MANUAL |
| 14 | 4 | Presets | 30D preset active by default; click Today/7D/MTD updates data | Range changes | MANUAL |
| 15 | 4 | Search | Type ingredient name → table filters, KPIs recalculate, charts update | Live filter | MANUAL |
| 16 | 4 | Sort | Click column header → rows sort; click again → reverse | Sort arrows toggle | MANUAL |
| 17 | 4 | Excel export | Click Download → .xlsx file downloaded | File opens | MANUAL |
| 18 | 4 | SmartPurchasePanel | Navigate to Stock → Smart Purchase still works | No regression | MANUAL |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-150 → status: IMPLEMENTED, sprint_key: pos_6_0
- [ ] CR_REGISTRY.md: CR-150 row → Gate 5 IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: PurchaseReportPage.jsx (NEW), inventoryService.js, Sidebar.jsx, App.js (CR-150, 2026-08-22)
- [ ] Code markers: // CR-150 in every modified file
```

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Same endpoint as SmartPurchasePanel | MEDIUM | `getPurchaseReport()` is a new separate function — `getVendorItemList()` untouched |
| `Amount: "0"` / `line_total: 0` on preprod | LOW | Prefer `line_total`, fallback to `Amount` — data quality issue on preprod only |
| `Quantity` is a string ("1 kg") | LOW | Display as-is; use `stock_quantity_raw` only if numeric sort needed |
| Recharts already installed | NONE | `recharts` in `package.json` — no new dependency needed |
| `exportReportAsExcel` signature | LOW | Match `ExpenseReportPage.jsx` call signature exactly |

---

Planning complete: CR-150 (v2 — design frozen)
Stage: Gate 3 — Implementation Plan
Design: FROZEN (mockup at /app/frontend/public/mockups_preview.html)
Code reality: NONE
Risk: HIGH
Files WILL change: inventoryService.js · Sidebar.jsx · App.js · PurchaseReportPage.jsx (NEW)
Files WILL NOT touch: SmartPurchasePanel · inventoryTransform · getVendorItemList · any financial logic
Owner decisions: ALL RESOLVED
Next: Gate 4 GO → Implementation
