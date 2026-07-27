# Investigation Report — Batch 2026-07-27 (Reports + Inventory + Smart Purchase)

**Agent Role:** INVESTIGATION
**Date:** 2026-07-27
**Steps Used:** 10/10
**Source:** OWNER-REPORTED (screenshots + verbal description)

---

## Issue-by-Issue Root Cause Analysis

---

### ISSUE 1 — P&L Report Calendar Broken / Different UI
**Confidence:** HIGH (code-confirmed)
**Classification:** FE_BUG + DESIGN_INCONSISTENCY

**Root Cause:**
- `PLReportPage.jsx` (CR-094) uses raw `<Input type="date">` (lines 152-154) — a native browser date picker
- **No `max` attribute** → allows selecting future dates (screenshot confirms 26/07/2026 selectable)
- **No shadcn calendar** component used — `/app/frontend/src/components/ui/calendar.jsx` exists but is not imported
- **No preset pills** (Today, 7D, 30D, MTD) unlike DailySalesMockup, SettlementReport, ExpenseReport
- Other mature reports (ExpenseReport, DailySales, Settlement) use `max={fmtISO(today)}` on date inputs AND preset pill bar
- The screenshot matches a plain `<input type="date">` with orange Apply button, not the polished date range bar other reports have

**Break Point:** PLReportPage was built (CR-094) without following the established date-range pattern used by ExpenseReport, DailySales, etc.

---

### ISSUE 2 — P&L Report Missing Graphs
**Confidence:** HIGH (code-confirmed)
**Classification:** FE_BUG (conditional rendering too strict)

**Root Cause:**
- Charts ARE coded in PLReportPage.jsx (BarChart lines 185-197, PieChart lines 199-212)
- BUT wrapped in: `{chartData.length > 1 && (` (line 182)
- If the API returns data for only 1 day (or the report rows collapse to 1 entry), charts hide entirely
- The PieChart also conditionally hides: `{pieData.length > 0 && (` (line 199) — only shows if expenses OR purchase > 0
- Compared to ExpenseReport: chart section shows regardless of data count (bar chart always renders even with 1 bar)
- Additionally, the entire chart/KPI section is guarded by `!data || !summary` (line 169) — if API returns unexpected shape, everything hides

**Break Point:** `chartData.length > 1` condition on line 182 — should be `>= 1` or always render with empty-state

---

### ISSUE 3 — Calendar Allows Future Dates Across Reports
**Confidence:** HIGH (code-confirmed)
**Classification:** FE_BUG

**Affected Files:**
| File | Has `max` attribute? | Status |
|------|---------------------|--------|
| PLReportPage.jsx (lines 152-154) | NO | **BUG** |
| ConsumptionReportPage.jsx (lines 184-194) | NO | **BUG** |
| ExpenseReportPage.jsx (lines 314-316) | YES `max={fmtISO(today)}` | CORRECT |
| DailySalesMockup.jsx | YES `max={fmtISO(today)}` | CORRECT |
| SettlementReportMockup.jsx | YES | CORRECT |
| TableSalesMockup.jsx | YES | CORRECT |
| All other report mockups checked | YES | CORRECT |

**Root Cause:** PLReportPage (CR-094) and ConsumptionReportPage (CR-093) were built without the `max` restriction that every other report includes.

---

### ISSUE 4 — Missing Preset Pills (7D, 14D, etc.) in P&L, Consumption, Expense Reports
**Confidence:** HIGH (code-confirmed)
**Classification:** DESIGN_INCONSISTENCY

**Pattern comparison:**
| Report | Has Preset Pills? | Presets |
|--------|-------------------|---------|
| DailySalesMockup | YES | Today, 7D, 30D, MTD |
| SettlementReportMockup | YES | Today, Yesterday, 7D, 30D, 90D, 365D, MTD, YTD |
| ExpenseReportPage | YES | Today, 7D, 30D, MTD |
| **PLReportPage** | **NO** | **— missing entirely** |
| **ConsumptionReportPage** | **NO** | **— missing entirely** |

**Root Cause:** CR-094 (P&L) and CR-093 (Consumption) were implemented without the preset pill bar. The established pattern in the codebase is: `['Today', '7D', '30D', 'MTD']` pills with default = '7D'.

**Owner Note:** User requested "7, 14 days etc" — aligning to the existing pattern + adding 14D where relevant.

---

### ISSUE 5 — "Coming Soon" Placeholders in Production
**Confidence:** HIGH (code-confirmed)
**Classification:** FE_BUG (P0 for production)

**Found locations:**
| Location | Text | Production Visible? |
|----------|------|:---:|
| `InventoryIntelligencePanel.jsx:70` | "Coming soon — awaiting backend wastage endpoint" (Wastage Insights + Top Wasted Items) | **YES — screenshot confirmed** |
| `InventorySetupPanel.jsx:269` | Import button `title="Coming soon"` | YES (tooltip) |
| `Sidebar.jsx:304,317` | "Coming Soon" sidebar placeholders | YES |
| `LoginPage.jsx:102,109` | "Coming Soon" cards on login | YES |
| `CollectPaymentPanel.jsx:1341` | Helper text — code comment only | NO (code path) |

**Root Cause:** Wastage widgets in InventoryIntelligencePanel (`WastagePlaceholder` component, lines 61-73) explicitly show "Coming soon — awaiting backend wastage endpoint." with a dashed border. The screenshots show these are clearly visible. Backend wastage endpoints do not exist yet (BACKEND-BLOCKED), but the "coming soon" message should NOT be shown in production UI.

---

### ISSUE 6 — Smart Purchase: All Items Selected by Default
**Confidence:** HIGH (code-confirmed)
**Classification:** FE_BUG (UX)

**Root Cause:**
- `SmartPurchasePanel.jsx` line 54-66: `computePlan()` returns ALL ingredients that need purchasing
- ALL items are rendered in `AutoShoppingList` — no initial filter
- `rate` field starts empty (`rate: ''` line 59), so items won't submit — but they still APPEAR as if they're "in the cart"
- `selectedRows` is empty initially (line 19: `new Set()`), BUT this is for bulk-remove checkbox selection — not for "include in purchase" selection
- User expectation: items should start UNCHECKED/UNSELECTED — user picks what to buy

**Break Point:** No opt-in selection mechanism. All planner items appear by default. The "active" filter (`rate > 0`) only applies to submission, not to visibility.

---

### ISSUE 7 — Smart Purchase: No Search or Sort by Category
**Confidence:** HIGH (code-confirmed)
**Classification:** FE_BUG (UX/missing feature)

**Root Cause:**
- `AutoShoppingList.jsx` has an ad-hoc typeahead for ADDING new items (line 39), but NO search to FILTER the existing list
- No category grouping or sort functionality exists in the shopping list
- With 100+ items, the list is unmanageable
- Other panels in the app (e.g., ConsumptionReport, ExpenseReport) have category filters and search bars

---

### ISSUE 8 — Smart Purchase: No Sticky Navigation
**Confidence:** HIGH (code-confirmed)
**Classification:** FE_BUG (UX)

**Root Cause:**
- `SmartPurchasePanel.jsx` has "Review & Submit" buttons at top (line 206) AND bottom (line 265)
- But with 100+ items, user scrolls a long way — neither the header bar nor the submit button is sticky
- The `HorizonPicker` + toolbar div (line 198) is NOT `sticky top-0`
- No scroll-to-top or floating action button

---

### ISSUE 9 — System Vendor Explanation Confusing
**Confidence:** HIGH (code-confirmed)
**Classification:** FE_BUG (UX/documentation)

**Root Cause:**
- `SmartPurchasePanel.jsx` line 58: When no vendor history exists for an ingredient, it defaults to `vendor_id: 'system'`
- Line 101: `m['system'] = 'System Vendor'`
- There is NO tooltip, help text, or explanation of what "System Vendor" means
- User sees "System Vendor" in dropdown but doesn't understand it = "no vendor assigned yet, please pick one"
- On submit, System Vendor vendor_id is sent as `null` (line 164) — correct backend behavior, but confusing frontend UX

---

### ISSUE 10 — Conversion Factor Explanation Missing
**Confidence:** HIGH (code-confirmed)
**Classification:** FE_BUG (UX/documentation)

**Root Cause:**
- `InventorySetupPanel.jsx` line 311: `<Input type="number" ... placeholder="e.g. 1000">`
- Line 410: Shows `1 ${ing.unit} = ${ing.conversionFactor} ${ing.smallUnit}` display
- NO tooltip or help text explaining the concept
- Example: If unit=KG and smallUnit=GM, conversionFactor=1000 means 1 KG = 1000 GM
- Users don't understand when conversion factor applies or how it affects stock calculations
- `purchasePlanner.js` line 154: `const threshold = (Number(item.minQtyAlert) || 0) * (Number(item.conversionFactor) || 1)` — conversion factor directly affects reorder alerts

---

### ISSUE 11 — Wasted Report / Top Wasted Items Not Showing
**Confidence:** HIGH (code-confirmed)
**Classification:** BACKEND_BLOCKED

**Root Cause:**
- `InventoryIntelligencePanel.jsx` lines 315-316: Both "Wastage Insights" and "Top Wasted Items" use `WastagePlaceholder` component
- The component (lines 61-73) is an intentional placeholder: dashed border, italic text, alert icon
- KPI card "Wastage Value" (line 276) shows "—" with "P2" badge
- **No backend endpoint exists for wastage data** — this is explicitly stated in the placeholder text
- The wastage feature was scoped as Phase 2 of the inventory module

**Blocker:** Backend team needs to build the wastage API endpoints. Frontend has placeholder UI ready to wire.

---

## Summary Table

| # | Issue | Classification | Confidence | Root Cause | Risk | Fix Scope |
|---|-------|---------------|------------|------------|------|-----------|
| 1 | P&L Calendar broken/different | FE_BUG | HIGH | Raw `<input type=date>`, no max, no calendar component, no presets | MEDIUM | 1 file, ~40 lines |
| 2 | P&L no graphs | FE_BUG | HIGH | `chartData.length > 1` condition too strict | LOW | 1 file, ~2 lines |
| 3 | Future dates in calendars | FE_BUG | HIGH | Missing `max` attr on P&L + Consumption | LOW | 2 files, ~4 lines |
| 4 | Missing preset pills | DESIGN_INCONSISTENCY | HIGH | CR-093/094 didn't adopt preset pattern | MEDIUM | 2 files, ~50 lines each |
| 5 | "Coming Soon" in production | FE_BUG (P0) | HIGH | Explicit placeholder components visible | MEDIUM | 3-5 files, various |
| 6 | Smart Purchase all selected | FE_BUG (UX) | HIGH | No opt-in selection; all planner items shown | MEDIUM | 2 files |
| 7 | Smart Purchase no search/sort | MISSING_FEATURE | HIGH | No filter/search/category sort in list | MEDIUM | 1-2 files, ~60 lines |
| 8 | Smart Purchase no sticky | FE_BUG (UX) | HIGH | Toolbar not sticky, long scroll | LOW | 1 file, ~5 lines |
| 9 | System Vendor confusing | FE_BUG (UX) | HIGH | No tooltip/explanation | LOW | 1-2 files, ~10 lines |
| 10 | Conversion Factor unexplained | FE_BUG (UX) | HIGH | No help text/tooltip | LOW | 1 file, ~10 lines |
| 11 | Wastage report blocked | BACKEND_BLOCKED | HIGH | No backend endpoint exists | N/A | BACKEND_ASK |

---

## Recommendations

### Immediate Fixes (Planning skip eligible — LOW risk, small scope):
- **Issue 2** (chart condition): Change `chartData.length > 1` → `chartData.length >= 1`. 1 file, 1 line.
- **Issue 3** (future dates): Add `max={today}` to P&L + Consumption date inputs. 2 files, 4 lines.
- **Issue 8** (sticky): Add `sticky top-0 z-10` to SmartPurchase toolbar div. 1 file.

### Needs Full Planning (MEDIUM risk, multi-file):
- **Issue 1 + 4** (P&L calendar + presets): Rewrite P&L date bar to match ExpenseReport pattern with preset pills + max date. Consider using shadcn calendar component.
- **Issue 4** (Consumption presets): Same treatment for ConsumptionReportPage.
- **Issue 5** ("Coming Soon"): Audit all locations, hide/remove from production. Wastage: either remove widgets entirely or show a subtle "under development" that doesn't look like an error.
- **Issue 6 + 7** (Smart Purchase selection + search): Add search/filter bar, category grouping, and opt-in checkbox selection.
- **Issue 9 + 10** (explanations): Add tooltips/help text for System Vendor and Conversion Factor.

### Backend Brief Required:
- **Issue 11**: Wastage API endpoints needed. Frontend placeholder UI is ready to wire.

---

## Evidence Artifacts
- Screenshots: Owner-provided (3 screenshots: P&L date bar, "Stock Intelligence Phase 2" label, Wastage "Coming soon")
- Code traces: All documented above with file:line references
- All saved to: `/app/memory/evidence/INVESTIGATION_BATCH_2026_07_27/`
