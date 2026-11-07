# CR-477 — Implementation Plan (Gate 3)
## Ingredient Movement Report — Line-by-Line

**Date:** 2026-10-28
**Stage:** Gate 3 — Implementation Plan
**Risk:** MEDIUM
**Pattern:** Mirrors `ItemConsumptionReportPage.jsx` (CR-472)

---

## MODIFICATION M1 — constants.js

**File:** `src/api/constants.js`
**Insert after L234** (REJECT entry in INVENTORY_TRANSFER_ENDPOINTS):

```js
  INGREDIENT_MOVEMENT_REPORT: '/api/v2/vendoremployee/inventory-transfer/ingredient-movement-report', // CR-477
```

**Rationale:** Endpoint lives under `inventory-transfer` URL prefix, so it belongs in `INVENTORY_TRANSFER_ENDPOINTS`, not `REPORT_ENDPOINTS`.

---

## MODIFICATION M2 — inventoryService.js

**File:** `src/api/services/inventoryService.js`
**Step M2a:** Add `INVENTORY_TRANSFER_ENDPOINTS` to import at L4:
```js
// BEFORE:
import { INVENTORY_ENDPOINTS, EXPENSE_ENDPOINTS, REPORT_ENDPOINTS } from '../constants';
// AFTER:
import { INVENTORY_ENDPOINTS, EXPENSE_ENDPOINTS, REPORT_ENDPOINTS, INVENTORY_TRANSFER_ENDPOINTS } from '../constants';
```

**Step M2b:** Insert after L189 (after `getItemConsumptionReport`):
```js
// CR-477: Ingredient Movement Report (dispatched/received stock transfers)
export async function getIngredientMovementReport({ movement, from_date, to_date, stock_title }) {
  const body = { movement, from_date, to_date };
  if (stock_title) body.stock_title = stock_title;
  const res = await api.post(INVENTORY_TRANSFER_ENDPOINTS.INGREDIENT_MOVEMENT_REPORT, body);
  return res.data; // No wrapper — body IS the report
}
```

---

## MODIFICATION M3 — Sidebar.jsx

**File:** `src/components/layout/Sidebar.jsx`
**Insert after L100** (item-consumption entry):

```js
      { id: "ingredient-movement", label: "Ingredient Movement", path: "/reports-module/ingredient-movement" }, // CR-477
```

This places it directly below "Item Consumption" in the Daily Report section as per OD-477-01.

---

## MODIFICATION M4 — App.js

**File:** `src/App.js`
**Step M4a:** Add import after L53 (ItemConsumptionReportPage):
```js
import IngredientMovementReportPage from "./pages/reports-module/IngredientMovementReportPage"; // CR-477
```

**Step M4b:** Add route after L250 (item-consumption route):
```js
              <Route path="ingredient-movement" element={<ProtectedRoute><IngredientMovementReportPage /></ProtectedRoute>} /> {/* CR-477 */}
```

---

## NEW FILE F1 — IngredientMovementReportPage.jsx

**File:** `src/pages/reports-module/IngredientMovementReportPage.jsx`
**~350 lines** — mirrors ItemConsumptionReportPage structure

### Structure outline:

```
IMPORTS (L1-9)
  - react: useState, useEffect, useCallback, useMemo, Fragment
  - react-router-dom: useNavigate
  - lucide-react: ArrowLeft, ChevronDown, ChevronRight, Download, FileText, Loader2, Search, ArrowLeftRight, Check, Calendar
  - @/components/ui/button: Button
  - sonner: toast
  - @/api/services/inventoryService: getIngredientMovementReport
  - @/components/layout/Sidebar: Sidebar

HELPERS (L11-25)
  - toISO(d): date → YYYY-MM-DD
  - today(): today as YYYY-MM-DD
  - daysAgo(n): today minus n days
  - fmtDate(str): "2026-07-27 17:39:08" → "27 Jul 17:39"
  - STATUS_BADGES: { received: emerald, dispatched: blue, in_transit: amber, pending: slate }

COMPONENT (L27-end)
  export default function IngredientMovementReportPage()

STATE (L28-52):
  - isSidebarExpanded (localStorage persist — BUG-361 pattern)
  - movement: 'received' | 'dispatched' (default: 'received')
  - fromDate / toDate (default: daysAgo(7) / today())
  - appliedFrom / appliedTo (draft vs applied pattern)
  - activePreset: 'L7D' (default)
  - searchTerm: '' (free text)
  - ingredients: [] (API response)
  - loading: false
  - hasFetched: false
  - expandedRows: {} (toggle map)

PRESETS (L54-64):
  const PRESETS = [
    { key: 'Today', from: today(), to: today() },
    { key: 'L7D', label: 'Last 7 Days', from: daysAgo(7), to: today() },
    { key: 'MTD', from: monthStart(), to: today() },
  ];
  const applyPreset = (p) => { setFromDate(p.from); setToDate(p.to); setActivePreset(p.key); setAppliedFrom(p.from); setAppliedTo(p.to); };

FETCH (L66-85):
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getIngredientMovementReport({
        movement,
        from_date: appliedFrom,
        to_date: appliedTo,
        stock_title: undefined, // search is client-side filter
      });
      setIngredients(data.ingredients || []);
      setHasFetched(true);
    } catch (err) {
      toast.error('Failed to load report');
      console.error('CR-477:', err);
    } finally {
      setLoading(false);
    }
  }, [movement, appliedFrom, appliedTo]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

COMPUTED (L87-107):
  // Client-side search filter
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return ingredients;
    const term = searchTerm.toLowerCase();
    return ingredients.filter(i => i.stock_title.toLowerCase().includes(term));
  }, [ingredients, searchTerm]);

  // KPI totals
  const totalIngredients = filtered.length;
  const totalTransfers = filtered.reduce((s, i) => s + i.line_count, 0);

TOGGLE (L109-113):
  const toggleRow = (title) => setExpandedRows(prev => ({ ...prev, [title]: !prev[title] }));

DATE APPLY (L115-120):
  const handleDateApply = () => { setAppliedFrom(fromDate); setAppliedTo(toDate); setActivePreset(''); };
  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const canApply = draftDirty && fromDate <= toDate;

EXPORT EXCEL (L122-140): CSV blob pattern
  const handleExportExcel = () => {
    if (!filtered.length) { toast.error('No data'); return; }
    // Header + flattened lines
    const header = ['Ingredient', 'Unit', 'Total Qty', 'From Store', 'To Store', 'Dispatched', 'Received', 'Qty', 'Status'];
    const rows = filtered.flatMap(ing =>
      ing.lines.map(l => [ing.stock_title, ing.unit, ing.total_qty, l.from_restaurant_name, l.to_restaurant_name, l.dispatched_at || '', l.received_at || '', l.quantity, l.status])
    );
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ingredient-movement-${movement}-${appliedFrom}-${appliedTo}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

EXPORT PDF (L142-175): window.open+print pattern
  const handleExportPDF = () => {
    if (!filtered.length) { toast.error('No data'); return; }
    const w = window.open('', '_blank');
    // Build HTML table with header + all lines
    // Same pattern as ItemConsumptionReportPage L159-183
    w.document.write(`<html><head><title>Ingredient Movement Report</title><style>...</style></head><body>...table...</body></html>`);
    w.document.close(); w.print();
  };

RENDER (L177-end):
  return (
    <div className="flex min-h-screen bg-slate-50" data-testid="ingredient-movement-report-page">
      <Sidebar ... />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-6">

          {/* HEADER — back + title + export buttons */}
          ...ArrowLeft, h1 "Ingredient Movement", subtitle, Excel+PDF buttons...

          {/* FILTER BAR */}
          <div className="bg-white rounded-xl border p-4 mb-5 flex flex-wrap gap-3 items-end">

            {/* Movement toggle */}
            <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1">
              <button data-testid="movement-toggle-received"
                className={movement === 'received' ? 'active-orange' : 'inactive'}
                onClick={() => setMovement('received')}>Received</button>
              <button data-testid="movement-toggle-dispatched"
                className={movement === 'dispatched' ? 'active-orange' : 'inactive'}
                onClick={() => setMovement('dispatched')}>Dispatched</button>
            </div>

            <div className="w-px h-6 bg-slate-200" />

            {/* Date presets */}
            {PRESETS.map(p => <button key={p.key} data-testid={`date-preset-${p.key.toLowerCase()}`}
              className={activePreset === p.key ? 'preset-active' : 'preset-inactive'}
              onClick={() => applyPreset(p)}>{p.label || p.key}</button>)}

            {/* Date inputs */}
            <input type="date" value={fromDate} data-testid="date-start-input" />
            <input type="date" value={toDate} data-testid="date-end-input" />

            {/* Apply button (if dirty) */}
            {draftDirty && <button onClick={handleDateApply} data-testid="date-apply-btn">Apply</button>}

            <div className="w-px h-6 bg-slate-200" />

            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search icon />
              <input placeholder="Search ingredient..." data-testid="ingredient-search-input"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>

          {/* KPI STRIP */}
          <div className="flex items-center gap-6 px-1 mb-4 text-xs">
            <span>INGREDIENTS <b>{totalIngredients}</b></span>
            <span>TOTAL TRANSFERS <b>{totalTransfers}</b></span>
            <span>PERIOD {appliedFrom} — {appliedTo}</span>
          </div>

          {/* DATA TABLE */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table>
              <thead> Ingredient | Unit | Total Qty | Transfers </thead>
              <tbody>
                {loading && <SkeletonRows />}
                {!loading && !filtered.length && <EmptyState />}
                {!loading && filtered.map(ing => (
                  <Fragment key={`${ing.stock_title}-${ing.unit}`}>
                    {/* Parent row — collapsed */}
                    <tr onClick={() => toggleRow(ing.stock_title + ing.unit)}
                        data-testid={`ingredient-row-${ing.stock_title}`}>
                      <td>{expandedRows[...] ? <ChevronDown/> : <ChevronRight/>}</td>
                      <td>{ing.stock_title}</td>
                      <td><badge>{ing.unit}</badge></td>
                      <td className="mono font-bold text-orange-500">{ing.total_qty}</td>
                      <td>{ing.line_count}</td>
                    </tr>

                    {/* Drill-down — transfer lines */}
                    {expandedRows[...] && (
                      <tr><td colSpan={5}>
                        <table className="drilldown">
                          <thead> From | To | Dispatched | Received | Qty | Ref | Status </thead>
                          <tbody>
                            {ing.lines.map(line => (
                              <tr key={line.transfer_id}>
                                <td>{line.from_restaurant_name}</td>
                                <td>{line.to_restaurant_name}</td>
                                <td>{fmtDate(line.dispatched_at)}</td>
                                <td>{fmtDate(line.received_at)}</td>
                                <td className="mono">{line.quantity} {line.unit}</td>
                                <td className="mono text-[10px]">{line.reference_code || '—'}</td>
                                <td><StatusBadge status={line.status} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td></tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            <footer>Showing {filtered.length} of {ingredients.length} ingredients · {movement} · {appliedFrom} – {appliedTo}</footer>
          </div>

        </div>
      </div>
    </div>
  );
```

---

## Execution Sequence

| Step | File | Change | Dependencies |
|---|---|---|---|
| 1 | constants.js | Add endpoint to INVENTORY_TRANSFER_ENDPOINTS | None |
| 2 | inventoryService.js | Add import + function | Step 1 (endpoint constant) |
| 3 | Sidebar.jsx | Add menu entry | None |
| 4 | App.js | Add import + route | Step 5 (page file must exist) |
| 5 | IngredientMovementReportPage.jsx | Create full page | Steps 1-2 (service must exist) |

**Steps 1, 3 can run in parallel. Then 2, then 5, then 4.**

---

## Verification Matrix

| # | Edit | File | How to Verify |
|---|---|---|---|
| V1 | M1: endpoint constant | constants.js | grep INGREDIENT_MOVEMENT |
| V2 | M2: service function | inventoryService.js | grep getIngredientMovementReport |
| V3 | M3: sidebar entry | Sidebar.jsx | Browser: "Ingredient Movement" below "Item Consumption" |
| V4 | M4: route | App.js | Browser: navigate to /reports-module/ingredient-movement |
| V5 | F1: page renders | Page | Browser: page loads with filters + empty table |
| V6 | F1: movement toggle | Page | Toggle Received ↔ Dispatched, API re-fetches |
| V7 | F1: date presets | Page | Click "Last 7 Days" → dates update, data re-fetches |
| V8 | F1: fetch + render | Page | Palm House received → 19 ingredients, collapsible rows |
| V9 | F1: drill-down | Page | Click "Blue Tokai" → 8 transfer lines visible |
| V10 | F1: search filter | Page | Type "Blue" → filtered to matching ingredients |
| V11 | F1: Excel export | Page | Click Excel → CSV downloads |
| V12 | F1: PDF export | Page | Click PDF → print window opens |
| V13 | F1: empty state | Page | Palm House dispatched → 0 results → empty state shown |
| V14 | F1: loading state | Page | During fetch → skeleton/loader visible |
| V15 | Compile | webpack | 0 new warnings |
| REG | Existing pages | ItemConsumption, ConsumptionReport | Still work unchanged |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-477 → GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md / CR_REGISTRY.md: row added
- [ ] FILE_OWNERSHIP.md: all 5 files listed
- [ ] Code markers: // CR-477 in every new/modified file
- [ ] Compile check: webpack 0 new warnings
```

---

```
Planning complete: CR-477
Stage: Gate 3 — Implementation Plan
Code reality: NONE
Risk: MEDIUM
Files WILL create: 1 (IngredientMovementReportPage.jsx ~350 lines)
Files WILL modify: 4 (constants.js +1L, inventoryService.js +7L, Sidebar.jsx +1L, App.js +2L)
Verification: 15 checks + 1 regression
Owner decisions: ALL 4 LOCKED
Next: Gate 4 GO → Implementation
```
