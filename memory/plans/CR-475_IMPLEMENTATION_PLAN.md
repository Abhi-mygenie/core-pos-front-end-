# CR-475 — Implementation Plan

**Item:** CR-475 — Item Consumption Report: food_for filter+badge · addons[] drill-down · Total Returned to Inv. KPI  
**Stage:** Gate 3 — Implementation Plan  
**Based on:** `/app/memory/impact/CR-475_IMPACT_ANALYSIS.md`  
**File:** `src/pages/reports-module/ItemConsumptionReportPage.jsx` (408 lines)  
**Risk:** LOW · 1 file · no hotspot · no API/service/route change  
**Entry verified:** All plan line numbers confirmed against current file state.

---

## Starting State Verification (run before touching any line)

```bash
# Confirm file is 408 lines and has no CR-475 markers yet
wc -l /app/frontend/src/pages/reports-module/ItemConsumptionReportPage.jsx
grep -n "CR-475\|foodForFilter\|food_for\|addons\|totalReturned" \
  /app/frontend/src/pages/reports-module/ItemConsumptionReportPage.jsx
# Expected: 0 hits — code reality NONE confirmed
```

---

## Execution Sequence

Apply in this exact order (all in the same file — sequence matters to avoid stale line references):

```
E1a → Add foodForFilter state
E1b → Add foodForOptions derived useMemo
E1c → Replace filteredItems useMemo
E2  → Add food_for filter dropdown to filter bar
E3  → Replace item name table cell with badge
E4  → Add totalReturned to kpis useMemo
E5  → Change KPI grid + add 6th card
E6  → Add addons[] section inside expanded row
E7  → Update CSV export headers + rows
E8  → Update PDF export row template + header row
```

Checkpoint after **E3**: webpack must compile with 0 new warnings.  
Checkpoint after **E6**: webpack must compile with 0 new warnings.  
Final checkpoint after **E8**: webpack must compile with 0 new warnings before writing QA handover.

---

## E1a — Add `foodForFilter` state (after L48 `sortDir`)

**Current L48:**
```js
  const [sortDir, setSortDir] = useState('asc');
```

**After E1a — insert new line immediately after L48:**
```js
  const [sortDir, setSortDir] = useState('asc');
  const [foodForFilter, setFoodForFilter] = useState('all'); // CR-475: menu filter (OD-475-01)
```

---

## E1b — Add `foodForOptions` derived memo (after L97, after existing `filteredItems`)

Insert a new useMemo immediately after the `filteredItems` block (after the closing `}, [items, itemSearch]);`):

**Current L94-97:**
```js
  // CR-472: Client-side filter
  const filteredItems = useMemo(() => {
    if (!itemSearch) return items;
    return items.filter(it => it.item_name?.toLowerCase().includes(itemSearch.toLowerCase()));
  }, [items, itemSearch]);
```

**After E1b — replace entire filteredItems block (and add foodForOptions after it):**
```js
  // CR-472 + CR-475: Client-side filter — name search + menu filter
  const filteredItems = useMemo(() => {
    let result = items;
    if (foodForFilter !== 'all') result = result.filter(it => it.food_for === foodForFilter); // CR-475
    if (itemSearch) result = result.filter(it => it.item_name?.toLowerCase().includes(itemSearch.toLowerCase()));
    return result;
  }, [items, itemSearch, foodForFilter]); // CR-475: +foodForFilter

  // CR-475: unique food_for values for the filter dropdown — derived from raw items (not filteredItems)
  const foodForOptions = useMemo(() => {
    const unique = [...new Set(items.map(i => i.food_for).filter(Boolean))].sort();
    return unique; // e.g. ['Normal', 'Party', 'Premium']
  }, [items]); // CR-475
```

---

## E2 — Add `food_for` filter dropdown to filter bar

**Insert after the reset button closing block (after L271 `})`), before the closing `</div>` of the filter bar at L272:**

**Current L267-272:**
```jsx
            {itemSearch && (
              <Button size="sm" variant="outline" onClick={() => setItemSearch('')} className="h-8 text-xs" data-testid="item-consumption-search-clear">
                Reset
              </Button>
            )}
          </div>
```

**After E2:**
```jsx
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
```

---

## E3 — Replace item name cell with badge below name

**Current L339:**
```jsx
                            <td className="px-4 py-3 text-sm font-semibold text-slate-900">{item.item_name}</td>
```

**After E3:**
```jsx
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
```

---

## E4 — Add `totalReturned` to kpis useMemo

**Current L119-127:**
```js
  // CR-472: KPIs
  const kpis = useMemo(() => ({
    totalItems: filteredItems.length,
    totalSold: filteredItems.reduce((s, i) => s + (i.sold_qty || 0), 0),
    totalCancelled: filteredItems.reduce((s, i) => s + (i.canceled_qty || 0), 0),
    totalConsumed: filteredItems.reduce((s, i) => s + (i.consumed_qty || 0), 0),
    totalRevenueLoss: filteredItems.reduce((s, i) => s + (parseFloat(i.revenue_loss) || 0), 0),
    hasRevenueLoss: filteredItems.some(i => i.revenue_loss != null),
  }), [filteredItems]);
```

**After E4 (+1 line):**
```js
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
```

---

## E5 — Change KPI grid + add 6th card

**Current L274-290:**
```jsx
          {/* CR-472: KPI strip — 5 cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
            {[
              { label: 'Total Items', value: kpis.totalItems, color: '#F26B33', testid: 'item-consumption-kpi-total-items', isCurrency: false },
              { label: 'Total Punched', value: kpis.totalSold, color: '#3B82F6', testid: 'item-consumption-kpi-total-sold', isCurrency: false },
              { label: 'Total Cancelled', value: kpis.totalCancelled, color: '#EF4444', testid: 'item-consumption-kpi-total-cancelled', isCurrency: false },
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
```

**After E5 — grid 2 rows of 3, 6th card inserted as 4th (logical order: Items→Punched→Cancelled→Returned→Consumed→Revenue Loss):**
```jsx
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
```

---

## E6 — Add `addons[]` section inside expanded row

**Insert BEFORE the closing `</div>` of the ingredient grid, and BEFORE the closing `</td></tr>` of the expanded row.**

**Current L368-392 (the ingredient grid + closing tags):**
```jsx
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
```

**After E6 — replace this block (keep existing grid, append addons section after it):**
```jsx
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
                                {/* CR-475: Add-ons drill-down — OD-475-02 full, OD-475-03 hide when empty */}
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
```

---

## E7 — CSV export: add `food_for` column

**Current L135-139:**
```js
    const headers = ['Item Name', 'Punched', 'Cancelled', 'Returned to Inventory', 'Inventory Consumed', 'Inventory Loss', 'Revenue Loss'];
    const rows = sortedItems.map(r => [
      r.item_name, r.sold_qty, r.canceled_qty, r.returned_qty, r.consumed_qty, r.wastage_qty,
      r.revenue_loss != null ? r.revenue_loss : ''
    ]);
```

**After E7:**
```js
    const headers = ['Item Name', 'Menu', 'Punched', 'Cancelled', 'Returned to Inventory', 'Inventory Consumed', 'Inventory Loss', 'Revenue Loss']; // CR-475: +Menu column
    const rows = sortedItems.map(r => [
      r.item_name, r.food_for || '', r.sold_qty, r.canceled_qty, r.returned_qty, r.consumed_qty, r.wastage_qty, // CR-475: +food_for
      r.revenue_loss != null ? r.revenue_loss : ''
    ]);
```

---

## E8 — PDF export: add `food_for` column

**Current L151-161 (table row template inside tableRows):**
```js
      `<tr>
        <td style="padding:6px 8px;font-weight:600">${r.item_name ?? ''}</td>
        <td style="padding:6px 8px;text-align:right">${r.sold_qty ?? 0}</td>
        <td style="padding:6px 8px;text-align:right;color:#B91C1C">${r.canceled_qty ?? 0}</td>
        <td style="padding:6px 8px;text-align:right;color:#1D4ED8">${r.returned_qty ?? 0}</td>
        <td style="padding:6px 8px;text-align:right;color:#059669;font-weight:600">${r.consumed_qty ?? 0}</td>
        <td style="padding:6px 8px;text-align:right;color:#C2410C">${r.wastage_qty ?? 0}</td>
        <td style="padding:6px 8px;text-align:right;color:#DC2626">${r.revenue_loss != null ? fmtINR(r.revenue_loss) : '—'}</td>
      </tr>`
```

**After E8 (add Menu cell after Item Name cell):**
```js
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
```

**Current L170-172 (PDF header row):**
```js
          <th>Item Name</th><th style="text-align:right">Punched</th><th style="text-align:right">Cancelled</th>
          <th style="text-align:right">Returned to Inv.</th><th style="text-align:right">Inv. Consumed</th>
          <th style="text-align:right">Inv. Loss</th><th style="text-align:right">Revenue Loss</th>
```

**After E8 (add Menu `<th>` after Item Name):**
```js
          <th>Item Name</th><th>Menu</th><th style="text-align:right">Punched</th><th style="text-align:right">Cancelled</th>
          <th style="text-align:right">Returned to Inv.</th><th style="text-align:right">Inv. Consumed</th>
          <th style="text-align:right">Inv. Loss</th><th style="text-align:right">Revenue Loss</th>
```

---

## Scope Lock

### Files WILL change
- `src/pages/reports-module/ItemConsumptionReportPage.jsx` — 10 sub-edits (E1a–E8), all within the single 408-line file

### Files WILL NOT touch
- `src/api/services/inventoryService.js` — `getItemConsumptionReport` already returns `food_for` + `addons[]`; no change
- `src/api/constants.js` — endpoint unchanged
- `src/App.js` — no new route
- `src/components/layout/Sidebar.jsx` — no new nav entry
- Any transform, service, context, or other component file

---

## Verification Matrix (seeds QA handover)

| # | Edit | File | Current state | After change | How to verify | Automated? |
|---|---|---|---|---|---|---|
| V1 | E1a | L48+1 | no `foodForFilter` | state declared after `sortDir` | `grep -n "foodForFilter" ItemConsumptionReportPage.jsx` | YES |
| V2 | E1b | L94-97+ | `filteredItems` filters by name only | also filters by `food_for === foodForFilter`; `foodForOptions` computed | grep + browser | YES/NO |
| V3 | E2 | L271+ | no Menu dropdown | `<select data-testid="item-consumption-foodfor-filter">` present after reset button | Browser: filter bar shows "Menu" dropdown | NO |
| V4 | E2 | — | — | Selecting "Premium" shows only Premium dishes; "All Menus" shows all | Browser | NO |
| V5 | E3 | L339 | `<td>...{item.item_name}</td>` | item name + `food_for` badge below | Browser: each row shows menu badge under name | NO |
| V6 | E4 | L119-127 | 6 KPI fields | 7 KPI fields (+ `totalReturned`) | `grep -n "totalReturned"` returns 2 hits (useMemo + KPI array) | YES |
| V7 | E5 | L274-290 | `lg:grid-cols-5`, 5 KPI items | `lg:grid-cols-3`, 6 KPI items | Browser: KPI strip = 2 rows of 3; 6th card "Total Returned to Inv." visible | NO |
| V8 | E6 | L368-390+ | 3 ingredient sub-tables only | 3 sub-tables + `addons[]` section | Browser: expand dish WITH addons → "Add-ons (N)" section visible below ingredients | NO |
| V9 | E6 | — | — | Section hidden when `item.addons?.length === 0` | Browser: expand dish WITHOUT addons → no "Add-ons" section | NO |
| V10 | E6 | — | — | Each addon shows orange "Add-on" tag + qty row + 3 sub-tables | Browser: expand addon row | NO |
| V11 | E7 | L135-139 | 7 CSV columns | 8 CSV columns (Menu as 2nd) | Download CSV → open → column B = menu name | NO |
| V12 | E8 | L151-172 | 7 PDF columns | 8 PDF columns (Menu as 2nd) | PDF → print preview → "Menu" header present | NO |
| V13 | ALL | — | — | webpack compiled, 0 new warnings | `tail -5 /var/log/supervisor/frontend.out.log` | YES |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-475 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] CR_REGISTRY.md: CR-475 row → GATE_5A_IMPLEMENTED with file list
- [ ] FILE_OWNERSHIP.md: ItemConsumptionReportPage.jsx + CR-475 + date
- [ ] Code markers: // CR-475 comment in every modified block (E1a, E1b, E2, E3, E4, E5, E6, E7, E8)
- [ ] Compile: webpack compiled with 0 new warnings
```

---

## Gate Status
- Gate 1 (Intake): COMPLETE — `change_requests/CR-475_ITEM_CONSUMPTION_FOOD_FOR_ADDONS_INTAKE.md`
- Gate 2 (Impact Analysis): COMPLETE — `impact/CR-475_IMPACT_ANALYSIS.md`
- Gate 3 (Implementation Plan): **COMPLETE** (this document)
- Gate 4 GO: **Awaiting owner approval before implementation begins**
