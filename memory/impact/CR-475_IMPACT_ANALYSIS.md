# CR-475 — Impact Analysis

**Item:** CR-475 — Item Consumption Report: Add `food_for` filter+badge + `addons[]` drill-down + "Total Returned to Inv." KPI  
**Stage:** Gate 2 — Impact Analysis  
**Code Reality:** NONE — all three additions absent from current 407-line `ItemConsumptionReportPage.jsx`  
**Risk:** LOW — 1 file, no API change, no new service, no route change  
**Conflict Pre-Check:** Only CR-472 (GATE_5B_QA_PASS) has ever touched this file. No open items in flight. **Parallel-safe.**

---

## Owner Decisions — LOCKED

| OD | Decision |
|---|---|
| **OD-475-01** | `food_for` shown as small badge below item name in each row. PLUS a filter dropdown alongside the search bar — default "All", options populated from unique `food_for` values in the response. |
| **OD-475-02** | Full drill-down per add-on: qty row (Sold/Cancelled/Returned/Wastage/Consumed) + full 3 ingredient sub-tables (Consumed / Returned / Wastage). Labeled as additive/awareness only — quantities already included in dish totals. |
| **OD-475-03** | Hide add-ons section entirely when `item.addons` is empty or zero-length. |
| **OD-475-EXTRA-01** | Add "Total Returned to Inv." as a new 6th KPI card (from owner extra note on header title). |

---

## Data Flow Trace

```
API response (unchanged endpoint):
  items[].food_for           ← NEW field — string, e.g. "Normal" / "Premium" / "Party"
  items[].addons[]           ← NEW array — per add-on: {addon_id, addon_name, sold_qty,
                                canceled_qty, returned_qty, wastage_qty, consumed_qty,
                                consumed_ingredients[], returned_ingredients[], wastage_ingredients[]}
  items[].returned_qty       ← EXISTING — now also needs to appear in KPI strip

Frontend changes:
  [E1] filteredItems useMemo → add foodForFilter state + filter logic
  [E2] Filter bar JSX → add food_for dropdown after search bar
  [E3] Item name cell JSX → add food_for badge below name
  [E4] KPIs useMemo → add totalReturned
  [E5] KPI strip JSX → add 6th card "Total Returned to Inv."
  [E6] Expanded row JSX → add addons[] section after existing 3 sub-tables
  [E7] CSV export → add food_for column + returned_qty in headers/rows
  [E8] PDF export → add food_for column to print layout
```

---

## Affected Files

### Files WILL change (1 file only)

| # | File | Change | Lines affected | Risk |
|---|---|---|---|---|
| **E1** | `ItemConsumptionReportPage.jsx` | Add `foodForFilter` state + update `filteredItems` useMemo to apply it | New state ~L46; useMemo L94-97 | LOW |
| **E2** | `ItemConsumptionReportPage.jsx` | Add `food_for` filter dropdown in the filter bar, after the search/reset block (L260-271) | ~L270 — insert after reset button | LOW |
| **E3** | `ItemConsumptionReportPage.jsx` | Add `food_for` badge below item name in the row cell (L339) | L339 — add `<span>` below item name | LOW |
| **E4** | `ItemConsumptionReportPage.jsx` | Add `totalReturned` to kpis useMemo (L119-127) | L123 — add one line | LOW |
| **E5** | `ItemConsumptionReportPage.jsx` | Add 6th KPI card "Total Returned to Inv." in the KPI strip grid. Change grid from `lg:grid-cols-5` to `lg:grid-cols-3` (2 rows) or `lg:grid-cols-6`. | L275-290 | LOW |
| **E6** | `ItemConsumptionReportPage.jsx` | Add addons[] section inside expanded row, after existing 3 sub-tables (L368-390). Show only when `item.addons?.length > 0`. Each addon: name label + qty row + 3 ingredient sub-tables reusing `IngredientSubTable`. | L390 — insert before closing `</div>` | LOW |
| **E7** | `ItemConsumptionReportPage.jsx` | Add `food_for` as 2nd column in CSV headers + rows (L135-138). Add `returned_qty` already present — no change needed for existing columns. | L135-138 | LOW |
| **E8** | `ItemConsumptionReportPage.jsx` | Add `food_for` cell in PDF table rows (L151-161) + header (L170-172). | L151-172 | LOW |

### Files WILL NOT change
- `src/api/services/inventoryService.js` — `getItemConsumptionReport` function unchanged (API already returns `food_for` + `addons[]`)
- `src/api/constants.js` — endpoint unchanged
- `src/App.js`, `Sidebar.jsx` — no route/nav change
- Any other file

---

## E1: `foodForFilter` state + updated `filteredItems`

**New state (insert after L48 `sortDir` state):**
```js
const [foodForFilter, setFoodForFilter] = useState('all'); // CR-475
```

**Derive available menu options from response (add to existing useMemos):**
```js
const foodForOptions = useMemo(() => {
  const unique = [...new Set(items.map(i => i.food_for).filter(Boolean))].sort();
  return unique; // ['Normal', 'Party', 'Premium', ...]
}, [items]); // CR-475
```

**Update filteredItems useMemo (L94-97):**
```js
// Current:
const filteredItems = useMemo(() => {
  if (!itemSearch) return items;
  return items.filter(it => it.item_name?.toLowerCase().includes(itemSearch.toLowerCase()));
}, [items, itemSearch]);

// After E1:
const filteredItems = useMemo(() => {
  let result = items;
  if (foodForFilter !== 'all') result = result.filter(it => it.food_for === foodForFilter);
  if (itemSearch) result = result.filter(it => it.item_name?.toLowerCase().includes(itemSearch.toLowerCase()));
  return result;
}, [items, itemSearch, foodForFilter]); // CR-475
```

---

## E2: `food_for` filter dropdown in filter bar

**Insert after the reset button block (after L271), inside the filter bar `div`:**
```jsx
{/* CR-475: food_for filter dropdown */}
<div>
  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Menu</label>
  <select
    value={foodForFilter}
    onChange={e => setFoodForFilter(e.target.value)}
    className="h-8 text-xs border border-slate-200 rounded-md px-2 bg-white"
    data-testid="item-consumption-foodfor-filter"
  >
    <option value="all">All Menus</option>
    {foodForOptions.map(opt => (
      <option key={opt} value={opt}>{opt}</option>
    ))}
  </select>
</div>
```

---

## E3: `food_for` badge on item name cell

**Current L339:**
```jsx
<td className="px-4 py-3 text-sm font-semibold text-slate-900">{item.item_name}</td>
```

**After E3:**
```jsx
<td className="px-4 py-3">
  <span className="text-sm font-semibold text-slate-900 block">{item.item_name}</span>
  {item.food_for && (
    <span className="mt-0.5 inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200" data-testid={`item-consumption-foodfor-badge-${item.food_id}`}>
      {item.food_for}
    </span>
  )} {/* CR-475 */}
</td>
```

---

## E4: `totalReturned` in KPIs useMemo

**Add to kpis useMemo (L119-127):**
```js
totalReturned: filteredItems.reduce((s, i) => s + (i.returned_qty || 0), 0), // CR-475
```

---

## E5: 6th KPI card "Total Returned to Inv."

**Change grid (L275):**
```jsx
// Current:
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">

// After E5:
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 mb-5">
```
*2 rows of 3 on large screens — gives space for the 6th card without crowding.*

**Add 6th entry to the KPI array (after Revenue Loss at L281):**
```js
{ label: 'Total Returned to Inv.', value: kpis.totalReturned, color: '#3B82F6', testid: 'item-consumption-kpi-total-returned', isCurrency: false }, // CR-475
```

**Note:** Insert as 4th position (after Cancelled, before Inv. Consumed) to keep logical flow: Punched → Cancelled → Returned → Consumed → Inv. Loss → Revenue Loss.

---

## E6: `addons[]` section in expanded row

**After the closing `</div>` of the 3-column ingredient grid (after L390), inside the `isOpen` block:**

```jsx
{/* CR-475: Add-ons breakdown — shown only when item has recipe add-ons (OD-475-03: hide when empty) */}
{item.addons?.length > 0 && (
  <div className="ml-10 mt-3 rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50">
    <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
        Add-ons ({item.addons.length})
      </span>
      <span className="text-[10px] text-slate-400 italic">
        Add-on ingredients already included in dish totals above
      </span>
    </div>
    {item.addons.map(addon => (
      <div key={addon.addon_id} className="border-b border-slate-200 last:border-0 px-4 py-3">
        {/* Addon header: name + qty row */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-slate-700">{addon.addon_name}</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200">Add-on</span>
        </div>
        <div className="flex gap-4 text-xs text-slate-500 mb-3">
          <span>Sold <strong className="text-slate-700">{addon.sold_qty}</strong></span>
          <span>Cancelled <strong className="text-red-600">{addon.canceled_qty}</strong></span>
          <span>Returned <strong className="text-blue-600">{addon.returned_qty}</strong></span>
          <span>Wastage <strong className="text-amber-600">{addon.wastage_qty}</strong></span>
          <span>Consumed <strong className="text-emerald-600">{addon.consumed_qty}</strong></span>
        </div>
        {/* Full 3 ingredient sub-tables per addon (OD-475-02) */}
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
```

---

## E7: CSV export — add `food_for` column

**L135 headers array:**
```js
// Current:
const headers = ['Item Name', 'Punched', 'Cancelled', 'Returned to Inventory', 'Inventory Consumed', 'Inventory Loss', 'Revenue Loss'];

// After E7:
const headers = ['Item Name', 'Menu', 'Punched', 'Cancelled', 'Returned to Inventory', 'Inventory Consumed', 'Inventory Loss', 'Revenue Loss']; // CR-475
```

**L136-139 rows array:**
```js
// Current:
const rows = sortedItems.map(r => [r.item_name, r.sold_qty, r.canceled_qty, r.returned_qty, r.consumed_qty, r.wastage_qty, r.revenue_loss != null ? r.revenue_loss : '']);

// After E7:
const rows = sortedItems.map(r => [r.item_name, r.food_for || '', r.sold_qty, r.canceled_qty, r.returned_qty, r.consumed_qty, r.wastage_qty, r.revenue_loss != null ? r.revenue_loss : '']); // CR-475
```

---

## E8: PDF export — add `food_for` column

**L170-172 `<th>` headers — add "Menu" after "Item Name":**
```js
<th>Item Name</th><th>Menu</th><th style="text-align:right">Punched</th>...
```

**L151-161 row template — add `food_for` cell after item name:**
```js
<td style="padding:6px 8px;font-weight:600">${r.item_name ?? ''}</td>
<td style="padding:6px 8px;color:#64748B;font-size:12px">${r.food_for ?? ''}</td>
...
```

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `food_for` absent from old API responses | LOW | LOW | Badge/filter use optional chaining — `item.food_for` shows nothing when absent |
| `addons[]` absent from old API responses | LOW | LOW | `item.addons?.length > 0` guard — section hidden when field missing |
| 6th KPI card makes strip too wide | LOW | LOW | Grid changed to 2 rows of 3 — adapts cleanly on all screen sizes |
| `IngredientSubTable` reused for addons | NONE | — | Component is stateless, accepts any `ingredients[]` array |

---

## Downstream Consumers

None — `ItemConsumptionReportPage.jsx` is a standalone page. No component reads from it.

---

## Verification Matrix (seeds QA)

| # | Edit | Verify | Method |
|---|---|---|---|
| V1 | E1+E2 | Food_for filter dropdown shows "All Menus" + unique menu names from response | Browser |
| V2 | E1 | Selecting "Premium" from dropdown shows only Premium dishes | Browser |
| V3 | E3 | Each row shows small badge (e.g. "Normal") below item name | Browser |
| V4 | E4+E5 | 6th KPI card "Total Returned to Inv." shows correct sum | Browser |
| V5 | E6 | Expanding a dish WITH addons shows the add-ons section | Browser |
| V6 | E6 | Expanding a dish WITHOUT addons shows NO add-ons section | Browser |
| V7 | E6 | Each addon shows qty row + 3 ingredient sub-tables | Browser |
| V8 | E7 | CSV export includes "Menu" column | Download/check |
| V9 | E8 | PDF export includes "Menu" column | Print preview |
| V10 | — | Existing expand/collapse, search, sort, KPIs unchanged | Regression |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-475 → GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: ItemConsumptionReportPage.jsx + date
- [ ] Code markers: // CR-475 in every modified block
- [ ] Compile: webpack 0 new warnings
```

---

## Gate Status
- Gate 1: COMPLETE (Intake)
- Gate 2: **COMPLETE** (this document)
- Gate 3: Awaiting Implementation Plan → Gate 4 GO
