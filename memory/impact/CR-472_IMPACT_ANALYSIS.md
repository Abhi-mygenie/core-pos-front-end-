# CR-472 — Impact Analysis

**Item:** CR-472 — Item Consumption Report (Sales Consumption)
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** NONE
**Risk:** MEDIUM
**Conflict Pre-Check:** No other item touches the same files with status ≠ CLOSED (additive-only changes to shared files)

---

## Owner Decisions — LOCKED

| OD | Decision | Rationale |
|---|---|---|
| **OD-472-01** | Under Daily Report, below existing Consumption Report | Owner: "Under Daily Report, below existing Consumption Report" |
| **OD-472-02** | No multi-store picker — just logged-in store | Owner: "No, just show the logged-in store" |
| **OD-472-03** | Excel (CSV) + PDF export | Owner: "same as all reports excel and pdf check existing report modules" |
| **OD-472-04** | Expandable rows — click food item to see its ingredients | Owner: "Expandable rows — same as existing Consumption Report pattern" |
| **OD-472-05** | Permission: `consumption_report` (same key as existing) | Login probe shows `consumption_report` in role list. Reuse same permission gate. |
| **OD-472-06** | Revenue Loss column — backend adds `revenue_loss` (₹) per item | Owner: "Option A, backend will give another field revenue loss". Backend brief filed. Additive — no existing fields change. |
| **OD-472-07** | 5th KPI card: Total Revenue Loss (₹) | Owner: "yes add card for revenue loss". Sums `revenue_loss` across all items. |

---

## Data Flow Trace

```
User clicks sidebar "Item Consumption" → navigates /reports-module/item-consumption
  → ItemConsumptionReportPage mounts
  → User selects date range (from_date, to_date) + clicks Apply
  → calls getItemConsumptionReport({ from_date, to_date })
    → api.post(REPORT_ENDPOINTS.ITEM_CONSUMPTION_REPORT, body)
      → POST https://preprod.mygenie.online/api/v2/vendoremployee/report/item-consumption-report
  → response: { items[], date_range, restaurant_id, applied_restaurant_ids, hierarchy_scope }
  → items[] rendered in table (food_id, item_name, sold_qty, canceled_qty, returned_qty, wastage_qty, consumed_qty)
  → User clicks row → expands to show consumed_ingredients[], returned_ingredients[], wastage_ingredients[]
  → User clicks Excel → CSV blob download
  → User clicks PDF → window.open + print (PLReportPage pattern)
```

---

## Affected Files

### Files WILL change (5 total: 3 modified + 2 new)

| # | File | Change | Lines | Risk |
|---|---|---|---|---|
| **E1** | `src/api/constants.js` | Add `ITEM_CONSUMPTION_REPORT` to `REPORT_ENDPOINTS` (after L239 `DAILY_CONSUMPTION_REPORT`) | +1 line | LOW — additive only |
| **E2** | `src/api/services/inventoryService.js` | Add `getItemConsumptionReport()` function (after L182, mirrors `getDailyConsumptionReport` pattern) | +5 lines | LOW — additive only |
| **E3** | `src/components/layout/Sidebar.jsx` | Add sidebar entry `{ id: "item-consumption", label: "Item Consumption", path: "/reports-module/item-consumption" }` after L99 (below Consumption Report) | +1 line | LOW — additive, non-hotspot |
| **E4** | `src/App.js` | Add import + `<Route>` for `ItemConsumptionReportPage` (after L244 consumption-report route) | +2 lines | LOW — additive |
| **E5** | `src/pages/reports-module/ItemConsumptionReportPage.jsx` | **NEW FILE** — Full page component | ~350-450 lines | MEDIUM — new file, no risk to existing code |

### Files WILL NOT change

- `ConsumptionReportPage.jsx` — existing report untouched
- `inventoryTransform.js` — no transform needed (API response used directly, same as `getDailyConsumptionReport`)
- Any order-entry, dashboard, PMS, financial, recipe, or socket files
- `recipeService.js`, `recipeTransform.js` (CR-473 scope, out of this CR)

---

## E1: constants.js — New Endpoint Constant

**Current (L239):**
```js
DAILY_CONSUMPTION_REPORT: '/api/v2/vendoremployee/report/daily-consumption-report',
```

**After E1 (insert after L239):**
```js
ITEM_CONSUMPTION_REPORT: '/api/v2/vendoremployee/report/item-consumption-report',
```

---

## E2: inventoryService.js — New Service Function

**Insert after L182 (after getDailyConsumptionReport):**
```js
// CR-472: Item Consumption Report — menu-item-level sold/cancelled/returned/wastage/consumed
export async function getItemConsumptionReport({ from_date, to_date }) {
  const res = await api.post(REPORT_ENDPOINTS.ITEM_CONSUMPTION_REPORT, { from_date, to_date });
  return res.data; // { items[], date_range, restaurant_id, applied_restaurant_ids, hierarchy_scope }
}
```

Pattern: Mirrors `getDailyConsumptionReport` exactly — POST with date body, return `res.data` raw.

---

## E3: Sidebar.jsx — New Nav Entry

**Current (L99):**
```js
{ id: "consumption-report", label: "Consumption Report", path: "/reports-module/consumption-report" }, // CR-093
```

**After E3 (insert new line after L99):**
```js
{ id: "item-consumption", label: "Item Consumption", path: "/reports-module/item-consumption" }, // CR-472
```

Permission: Sidebar already gates "Daily Report" group by `reports` permission (L94: `permission: 'report'`). The `consumption_report` permission is in the role list but the existing consumption report doesn't use a separate gate — it inherits from the parent group. Same pattern applies here.

---

## E4: App.js — New Route

**Current (L244):**
```js
<Route path="consumption-report" element={<ProtectedRoute><ConsumptionReportPage /></ProtectedRoute>} />
```

**After E4 (insert after L244):**
```js
<Route path="item-consumption" element={<ProtectedRoute><ItemConsumptionReportPage /></ProtectedRoute>} /> {/* CR-472 */}
```

Plus import at top (after L52 ConsumptionReportPage import):
```js
import ItemConsumptionReportPage from "./pages/reports-module/ItemConsumptionReportPage"; // CR-472
```

---

## E5: ItemConsumptionReportPage.jsx — NEW FILE

**Pattern:** Mirrors `ConsumptionReportPage.jsx` (CR-093) for layout, date pickers, preset pills, expandable rows, exports. Mirrors `PLReportPage.jsx` for PDF export window.open+print pattern.

**UI Structure:**
1. **Header:** Back button + "Item Consumption Report" title + date subtitle + Excel/PDF buttons
2. **Date bar:** From/To date inputs + Apply button + preset pills (Today, 7D, 30D, MTD) — same pattern as ConsumptionReportPage
3. **KPI strip:** Total Items, Total Sold, Total Cancelled, Total Consumed, Total Revenue Loss (5 cards)
4. **Main table:** Columns: Item Name, Sold, Cancelled, Returned, Wastage, Consumed, Revenue Loss (₹)
   - Expandable rows: click to reveal 3 ingredient sub-tables (Consumed, Returned, Wastage) — same drill-down pattern as ConsumptionReportPage
5. **Search filter:** Text search on item_name (client-side, same as ConsumptionReportPage ingSearch)
6. **Excel export:** CSV blob download (same pattern as ConsumptionReportPage L142-154)
7. **PDF export:** window.open + document.write + print (same pattern as ConsumptionReportPage L157-183)

**API Response Fields Used:**
- `items[].food_id` — key
- `items[].item_name` — display name
- `items[].sold_qty`, `canceled_qty`, `returned_qty`, `wastage_qty`, `consumed_qty` — table columns
- `items[].revenue_loss` — ₹ value lost from cancellations (NEW — backend brief filed, additive)
- `items[].consumed_ingredients[]`, `returned_ingredients[]`, `wastage_ingredients[]` — drill-down sub-tables
- Each ingredient: `ingredient_id`, `ingredient_name`, `quantity`, `unit`
- `date_range` — subtitle
- `restaurant_id` — not displayed (single-store, no picker per OD-472-02)

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| API contract change | LOW | HIGH | Spec doc provided by owner; API probed LIVE |
| `revenue_loss` field not yet in API | MEDIUM | LOW | Backend brief filed; frontend shows "—" if field absent (graceful fallback) |
| Sidebar ordering drift | LOW | LOW | Additive line, no reordering |
| Export pattern mismatch | LOW | LOW | Copy exact pattern from existing ConsumptionReportPage |
| Permission gate missing | LOW | MEDIUM | Inherits from parent "Daily Report" group, same as existing consumption report |

---

## Downstream Consumers

None — this is a standalone report page. No other component reads from or depends on the item consumption data.

---

## Verification Matrix

| Edit # | File | Change | How to Verify | Automated? |
|---|---|---|---|---|
| E1 | constants.js | +ITEM_CONSUMPTION_REPORT | grep constant exists | YES |
| E2 | inventoryService.js | +getItemConsumptionReport | curl POST to endpoint via preview URL | YES |
| E3 | Sidebar.jsx | +Item Consumption nav entry | Browser: sidebar shows new link below Consumption Report | NO |
| E4 | App.js | +route /reports-module/item-consumption | Browser: navigate to URL, page loads | NO |
| E5 | ItemConsumptionReportPage.jsx | Full page | Browser: date select → Apply → table populates → expand row → ingredients show → Excel → PDF | NO |

---

## Backend Brief

`revenue_loss` field requested via: `backend_briefs/BACKEND_BRIEF_CR-472_REVENUE_LOSS_FIELD_2026_10_26.md`

Frontend will code to expect this field but gracefully show "—" if absent. No blocker for Gate 3/4.

## Gate Status

- Gate 2: **COMPLETE** (this document)
- Gate 3: Awaiting "Gate 3 GO" → Implementation Plan
