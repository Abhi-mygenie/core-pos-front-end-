# Investigation Report — CR-140/CR-141 Gap Audit + BulkEditor Variations Display

**Date:** 2026-08-15
**Role:** INVESTIGATION
**Steps used:** 7/10
**Triggered by:** Owner screenshots — Variations column absent by default (SS1), blank pills in expand panel (SS2) + CR-140/141 gap audit request

---

## 1. Summary

| Track | Finding | Root Cause | Confidence |
|---|---|---|---|
| T1 | Variations column NOT visible by default | `tier: 2` columns never shown by default — only `tier === 1` is (BulkEditor L225/256) | HIGH |
| T2 | Variation expand panel pills show blank content | VariationExpandPanel reads `val.label`/`val.optionPrice`, but transform stores `val.name`/`val.price` | HIGH (API-confirmed) |
| T3 | CR-140/CR-141 gap audit | Both code-complete. QA Gate 5b NOT executed for either. | CONFIRMED |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | `tier: 2` not shown by default | Code trace L225/256 | 1 | ✅ CONFIRMED | `c.tier === 1` only |
| H2 | Variation pills blank due to wrong field names | Code trace transform L130-144 + VariationExpandPanel L41 | 2 | ✅ CONFIRMED | `val.label` undefined after transform |
| H3 | API variation values have no labels (data empty) | API probe: `GET /foods-list` (refreshed token) | 3 | ❌ ELIMINATED | API returns `{label:'finger', optionPrice:'10'}` — data IS present |
| H4 | CR-140/CR-141 have unfixed code gaps | Code reality check (grep key functions/files) | 4 | ❌ ELIMINATED — code complete | All files/functions present |
| H5 | CR-140/CR-141 QA never ran | Registry + handover check | 1 | ✅ CONFIRMED | gate: 5, no QA PASS in status |

---

## 3. Track T1 — Variations not visible by default

### Root cause
`visibleCols` state is initialized at **L224-226** and reset on menuType change at **L254-257**:
```js
getColumns(menuType).reduce((acc, c) => ({ ...acc, [c.key]: c.tier === 1 }), {})
```
Only `tier === 1` columns are shown by default. `tier: 2` columns start hidden.

After GAP-BULK-DEFAULTS change: `addons = tier 1` ✅ (visible), `variations = tier 2` ❌ (still hidden).

The comment in the GAP-BULK-DEFAULTS session said "tier 2 still shows in Editing bar" — **this was wrong**.

### Evidence
- Screenshot 1: "Columns 13" — Editing bar ends at "Add-ons", no "Variations"
- Screenshot 2: "Columns 14", "+1 more" — user manually enabled Variations via Column picker
- L57: `{ key: "variations", ..., tier: 2 }` — needs to be `tier: 1`
- L56: `{ key: "addons",    ..., tier: 1 }` — correct ✅

### Fix required
**1 line** in `components/panels/menu/BulkEditor.jsx` L57:
```js
// CURRENT (broken):
{ key: "variations", label: "Variations", type: "var_expand", width: 110, tier: 2 },
// FIX:
{ key: "variations", label: "Variations", type: "var_expand", width: 110, tier: 1 },
```

---

## 4. Track T2 — Variation expand panel blank pills

### Root cause
**API response shape** (confirmed via `GET /foods-list`):
```json
{"variation": [{"name": "choose subject one", "values": [{"label": "finger", "optionPrice": "10"}]}]}
```

**Transform output** (`menuManagementTransform.js` L139-142):
```js
values: (v.values || []).map((val, vi) => ({
  id: `vo-${vi}`,
  name: val.label,                      // API "label" → stored as "name"
  price: parseFloat(val.optionPrice) || 0,  // API "optionPrice" → stored as "price"
}))
```

**VariationExpandPanel reads** (L41):
```jsx
{val.label}{val.optionPrice > 0 ? ` · ₹${val.optionPrice}` : ''}
```
- `val.label` → `undefined` (field is `name`)
- `val.optionPrice` → `undefined` (field is `price`)

**API probe result:** `val_keys=['label', 'optionPrice']` — API data IS present:
- Group: `"choose subject one"` (matches screenshot 2 "CHOOSE SUBJECT ONE" ✅ — group.name is read correctly)
- Values: `finger(₹10)`, `toe(₹20)` — not showing because wrong field names

### Fix required
**2 character changes** in `components/panels/menu/VariationExpandPanel.jsx` L41:
```jsx
// CURRENT (broken):
{val.label}{val.optionPrice > 0 ? ` · ₹${val.optionPrice}` : ''}
// FIX:
{val.name}{val.price > 0 ? ` · ₹${val.price}` : ''}
```

---

## 5. Track T3 — CR-140/CR-141 Status Audit

### CR-140 — Aggregator Menu: Food Add/Edit/StockToggle
**Status: CODE COMPLETE ✅ — QA PENDING**

| Component | File | Status |
|---|---|---|
| Transform: +5 aggregator fields | `menuManagementTransform.js` | ✅ Present |
| Service: addFoodAggregator, getRestaurantClients, aggregatorStockToggle | `menuManagementService.js` | ✅ Present |
| ProductForm: Platform Sync section | `ProductForm.jsx` | ✅ Present |
| ProductCard: Swiggy/Zomato chips + stock toggle | `ProductCard.jsx` | ✅ Present |
| BulkEditor: getColumns(menuType), isDirty, CellRenderer clientId | `BulkEditor.jsx` | ✅ Present |
| MenuManagementPanel: fetchClients + separate useEffect | `MenuManagementPanel.jsx` | ✅ Present |
| AggregatorStockToggle.jsx | NEW file | ✅ Present |

**Missing:** QA Gate 5b not executed. QA handover exists at `handover/QA_HANDOVER_CR140_2026_08_14.md` (12 test cases + 2 regression).

### CR-141 — Aggregator Sync Ops: Category Timings + Sync/Clear Tabs
**Status: CODE COMPLETE ✅ — QA PENDING**

| Component | File | Status |
|---|---|---|
| 6 service functions | `aggregatorConfigService.js` | ✅ Present |
| 6-tab AggregatorSetupView (+Sync & Catalog, +Category Timings) | `AggregatorSetupView.jsx` | ✅ Present |
| SyncCatalogTab: 4 action cards, Full Reset guard | `SyncCatalogTab.jsx` | ✅ Present |
| CategoryTimingsTab: timing groups list + inline form | `CategoryTimingsTab.jsx` | ✅ Present |

**Missing:** QA Gate 5b not executed. No QA handover written for CR-141.

---

## 6. Data Flow Trace — T2

```
API: GET /foods-list → variation[0].values[0] = { label: "finger", optionPrice: "10" }
Transform: menuManagementTransform.fromAPI.variations() L139-142
  → values[0] = { id: "vo-0", name: "finger", price: 10 }   ← key change here
State: BulkEditor row.variations = [{ name:"choose subject one", values:[{name:"finger", price:10}] }]
Component: VariationExpandPanel L41 reads val.label (undefined) val.optionPrice (undefined)
UI: pills render as empty spans                              ← BREAK POINT
```

---

## 7. Evidence Artifacts
- API token: `/app/memory/inv_goan_token.txt` (refreshed 2026-08-15 ~7:30 PM)
- API probe result: food "test1" — variation "choose subject one" with values `["finger"(₹10), "toe"(₹20)]`
- Source: `BulkEditor.jsx` L57 (tier: 2), L224-226/254-257 (tier===1 init)
- Source: `VariationExpandPanel.jsx` L41 (`val.label`/`val.optionPrice`)
- Source: `menuManagementTransform.js` L139-142 (`val.name`/`val.price`)

---

## 8. Recommendations

### T1 + T2 — Both are planning-skip eligible
- T1: 1 file, 1 char change (`tier: 2` → `tier: 1`) — LOW risk
- T2: 1 file, 2 char changes (`val.label`→`val.name`, `val.optionPrice`→`val.price`) — LOW risk
- Neither touches API, financial logic, or R5 hotspot files
- **Recommend: direct bug fix (owner approval needed)**

### T3 — CR-140/CR-141 QA
- Both ready for QA Gate 5b
- CR-140 QA handover exists (use it)
- CR-141 needs a QA handover written first

---
