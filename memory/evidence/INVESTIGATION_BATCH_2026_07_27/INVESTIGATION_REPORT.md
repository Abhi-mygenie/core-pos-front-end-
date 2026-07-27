# Investigation Report — Batch 2026-07-27 (Reports + Inventory + Smart Purchase)

**Agent Role:** INVESTIGATION
**Date:** 2026-07-27
**Steps Used:** 10/10
**Source:** OWNER-REPORTED (screenshots + verbal description)
**Owner Ruling:** Preset pill pattern `[Today, 7D, 30D, MTD]` is the standard — no 14D needed.

---

## Issue-by-Issue Root Cause Analysis

---

### ISSUE 1 — P&L Report Calendar Broken / Different UI
**Confidence:** HIGH (code-confirmed)
**Classification:** FE_BUG + DESIGN_INCONSISTENCY
**Severity:** P1 | **Risk:** MEDIUM

**Root Cause:**
- `PLReportPage.jsx` (CR-094) uses raw `<Input type="date">` (lines 152-154) — a native browser date picker
- **No `max` attribute** → allows selecting future dates (screenshot confirms)
- **No shadcn calendar** component used — `/app/frontend/src/components/ui/calendar.jsx` exists but is not imported
- **No preset pills** (Today, 7D, 30D, MTD) unlike DailySalesMockup, SettlementReport, ExpenseReport
- Other mature reports (ExpenseReport, DailySales, Settlement) use `max={fmtISO(today)}` on date inputs AND preset pill bar

**Break Point:** PLReportPage was built (CR-094) without following the established date-range pattern.

**Recommendation:** Rewrite P&L header bar to match ExpenseReportPage pattern: CalendarIcon + From/To with `max`, Apply button, preset pill bar `[Today, 7D, 30D, MTD]` with default 7D.

---

### ISSUE 2 — P&L Report Missing Graphs
**Confidence:** HIGH (code-confirmed)
**Classification:** FE_BUG (conditional rendering too strict)
**Severity:** P2 | **Risk:** LOW

**Root Cause:**
- Charts ARE coded in PLReportPage.jsx (BarChart lines 185-197, PieChart lines 199-212)
- BUT wrapped in: `{chartData.length > 1 && (` (line 182)
- If the API returns data for only 1 day, charts hide entirely
- Compared to ExpenseReport: chart section always renders even with 1 bar

**Break Point:** `chartData.length > 1` on line 182 — should be `>= 1` or always render.

**Recommendation:** Change condition to `chartData.length >= 1`. Planning skip eligible (1 line, LOW risk).

---

### ISSUE 3 — Calendar Allows Future Dates Across Reports
**Confidence:** HIGH (code-confirmed)
**Classification:** FE_BUG
**Severity:** P1 | **Risk:** LOW

**Affected Files (5 total — expanded from initial 2):**

| File | Has `max` attribute? | Status |
|------|---------------------|--------|
| `PLReportPage.jsx` (lines 152-154) | NO | **BUG** |
| `ConsumptionReportPage.jsx` (lines 184-194) | NO | **BUG** |
| `EdgeStatesMockup.jsx` | NO | **BUG** |
| `ItemSalesHybridMockup.jsx` | NO | **BUG** |
| `DashboardMockup.jsx` | NO | **BUG** |
| All other 28 reports | YES `max={fmtISO(today)}` | CORRECT |

**Root Cause:** 5 reports were built without the `max` restriction that every other report includes.

**Recommendation:** Add `max` attribute to all 5 files. Planning skip eligible (5 files, ~2 lines each, LOW risk). Could batch with Issue 1/4.

---

### ISSUE 4 — Missing Preset Pills in P&L and Consumption Reports
**Confidence:** HIGH (code-confirmed)
**Classification:** DESIGN_INCONSISTENCY
**Severity:** P1 | **Risk:** MEDIUM
**Owner Ruling:** Standard pattern is `[Today, 7D, 30D, MTD]` — no changes to existing preset sets.

**Pattern comparison:**
| Report | Has Preset Pills? | Presets |
|--------|:-:|---------|
| DailySalesMockup | YES | Today, 7D, 30D, MTD |
| SettlementReportMockup | YES | Today, Yesterday, 7D, 30D, 90D, 365D, MTD, YTD |
| ExpenseReportPage | YES | Today, 7D, 30D, MTD ✅ |
| **PLReportPage** | **NO** | **— missing entirely** |
| **ConsumptionReportPage** | **NO** | **— missing entirely** |

**Root Cause:** CR-094 (P&L) and CR-093 (Consumption) didn't adopt the preset pill pattern.

**Recommendation:** Add `[Today, 7D, 30D, MTD]` preset bar to P&L and Consumption. Default = 7D. Needs planning (UI layout work, ~50 lines per file).

---

### ISSUE 5 — "Coming Soon" Placeholders Visible in Production
**Confidence:** HIGH (code-confirmed + screenshot-confirmed)
**Classification:** FE_BUG
**Severity:** P0 | **Risk:** MEDIUM

**Full audit — all "Coming Soon" locations in the app:**

| Location | Text | User-Visible? | Action |
|----------|------|:---:|--------|
| `InventoryIntelligencePanel.jsx:61-73` | "Coming soon — awaiting backend wastage endpoint" (Wastage Insights + Top Wasted Items) | **YES — screenshot** | Hide or remove widgets |
| `InventorySetupPanel.jsx:269` | Import button `title="Coming soon"` | YES (tooltip) | Remove tooltip |
| `Sidebar.jsx:304,317` | "Coming Soon" sidebar placeholders | YES | Hide items |
| `LoginPage.jsx:102,109` | "Coming Soon" cards | YES | Hide or remove |
| `CollectPaymentPanel.jsx:1341` | Code comment only | NO | No action |
| `FilterBar.jsx:252` | Code comment only | NO | No action |

**Root Cause:** Placeholder components/text left in production code. Backend endpoints for wastage don't exist yet, but the UI shouldn't display development-phase placeholders.

**Recommendation:** Remove or hide all user-visible "Coming Soon" text. Wastage widgets: either remove entirely or replace with a minimal non-placeholder state. Needs planning (multi-file).

---

### ISSUE 6 — Smart Purchase: All Items Visible by Default
**Confidence:** HIGH (code-confirmed)
**Classification:** FE_BUG (UX)
**Severity:** P2 | **Risk:** MEDIUM

**Root Cause:**
- `SmartPurchasePanel.jsx:54-66`: `computePlan()` returns ALL ingredients needing purchase
- ALL items render in `AutoShoppingList` — no initial opt-in
- `rate: ''` (line 59) means items won't submit, but they visually appear "in the cart"
- User expects items to start UNCHECKED — user picks what to buy

**Recommendation:** Add a checkbox/toggle per row, default unchecked. Only checked+rated items go to submit. Needs planning.

---

### ISSUE 7 — Smart Purchase: No Search or Sort by Category
**Confidence:** HIGH (code-confirmed)
**Classification:** MISSING_FEATURE
**Severity:** P1 | **Risk:** MEDIUM

**Root Cause:**
- `AutoShoppingList.jsx` has ad-hoc typeahead for ADDING new items, but NO search to FILTER the existing list
- No category grouping or sort exists
- With 100+ items, the list is unmanageable

**Recommendation:** Add search bar + category dropdown filter above the table. Needs planning.

---

### ISSUE 8 — Smart Purchase: No Sticky Navigation
**Confidence:** HIGH (code-confirmed)
**Classification:** FE_BUG (UX)
**Severity:** P2 | **Risk:** LOW

**Root Cause:**
- `SmartPurchasePanel.jsx:198` toolbar div is NOT `sticky`
- "Review & Submit" buttons exist at top (line 206) and bottom (line 265) but neither sticks
- With 100+ items, user must scroll to access controls

**Recommendation:** Add `sticky top-0 z-10 bg-white` to toolbar div. Planning skip eligible (1 file, CSS only, LOW risk).

---

### ISSUE 9 — System Vendor Explanation Confusing
**Confidence:** HIGH (code-confirmed)
**Classification:** FE_BUG (UX)
**Severity:** P2 | **Risk:** LOW

**Root Cause:**
- `SmartPurchasePanel.jsx:58`: Defaults to `vendor_id: 'system'` when no vendor history
- `m['system'] = 'System Vendor'` (line 101) — no tooltip or explanation
- User sees "System Vendor" in dropdown but doesn't understand it = "no vendor assigned yet"
- On submit, System Vendor sends `null` vendor_id (line 164) — correct backend behavior, confusing UX

**Recommendation:** Add tooltip: "System Vendor = no vendor history found. Select a vendor before submitting." Planning skip eligible (LOW risk).

---

### ISSUE 10 — Conversion Factor Explanation Missing
**Confidence:** HIGH (code-confirmed)
**Classification:** FE_BUG (UX/documentation)
**Severity:** P3 | **Risk:** LOW

**Root Cause:**
- `InventorySetupPanel.jsx:311`: Input field with `placeholder="e.g. 1000"` but no help text
- Line 410: Display shows `1 ${ing.unit} = ${ing.conversionFactor} ${ing.smallUnit}`
- No tooltip explaining: "How many small units in 1 large unit? e.g. 1 KG = 1000 GM → enter 1000"
- `purchasePlanner.js:154` uses it for reorder threshold calculation

**Recommendation:** Add tooltip/help text next to conversion factor field. Planning skip eligible (1 file, LOW risk).

---

### ISSUE 11 — Wasted Report / Top Wasted Items Not Showing
**Confidence:** HIGH (code-confirmed)
**Classification:** BACKEND_BLOCKED
**Severity:** P1 | **Risk:** N/A (cannot fix from frontend)

**Root Cause:**
- `InventoryIntelligencePanel.jsx:315-316`: Both use `WastagePlaceholder` component
- Line 70: "Coming soon — awaiting backend wastage endpoint"
- KPI card "Wastage Value" (line 276) shows "—" with "P2" badge
- **No backend endpoint exists** for wastage data — explicitly Phase 2

**Blocker:** Backend team must build wastage API endpoints. Frontend placeholder UI is ready to wire once available.

**Recommendation:** File BACKEND_BRIEF. Remove visible "Coming Soon" text from production (covered by Issue 5). Keep widget structure but hide until backend ready.

---

## Summary Table

| # | Issue | Classification | Severity | Risk | Fix Scope | Planning Skip? |
|---|-------|---------------|----------|------|-----------|:-:|
| 1 | P&L Calendar broken/different UI | FE_BUG | P1 | MEDIUM | 1 file, ~60 lines | NO |
| 2 | P&L no graphs | FE_BUG | P2 | LOW | 1 file, 1 line | YES (owner approve) |
| 3 | Future dates in 5 reports | FE_BUG | P1 | LOW | 5 files, ~2 lines each | YES (owner approve) |
| 4 | Missing preset pills (P&L + Consumption) | DESIGN_INCONSISTENCY | P1 | MEDIUM | 2 files, ~50 lines each | NO |
| 5 | "Coming Soon" in production | FE_BUG | P0 | MEDIUM | 5+ files | NO |
| 6 | Smart Purchase: all items visible | FE_BUG (UX) | P2 | MEDIUM | 2 files | NO |
| 7 | Smart Purchase: no search/sort | MISSING_FEATURE | P1 | MEDIUM | 1-2 files, ~60 lines | NO |
| 8 | Smart Purchase: no sticky nav | FE_BUG (UX) | P2 | LOW | 1 file, CSS only | YES (owner approve) |
| 9 | System Vendor confusing | FE_BUG (UX) | P2 | LOW | 1-2 files, ~10 lines | YES (owner approve) |
| 10 | Conversion Factor unexplained | FE_BUG (UX) | P3 | LOW | 1 file, ~10 lines | YES (owner approve) |
| 11 | Wastage report blocked | BACKEND_BLOCKED | P1 | N/A | BACKEND_ASK | N/A |

---

## Owner Decisions Recorded

| # | Decision | Answer |
|---|----------|--------|
| OD-1 | Preset pill pattern | `[Today, 7D, 30D, MTD]` is the standard. No 14D needed. |

---

## Recommendations for Next Session

### Batch A — Quick Fixes (Planning skip eligible, pending owner approval):
- Issue 2: Chart condition fix (1 line)
- Issue 3: Add `max` to 5 report date inputs
- Issue 8: Sticky toolbar CSS
- Issue 9: System Vendor tooltip
- Issue 10: Conversion Factor help text

### Batch B — Needs Full Planning (Gate 2-3):
- Issue 1 + 4: P&L + Consumption date bar rewrite with presets
- Issue 5: "Coming Soon" audit + removal across app
- Issue 6 + 7: Smart Purchase selection + search/sort

### Batch C — Backend Brief:
- Issue 11: Wastage API endpoints needed

---

## Evidence Artifacts
- Screenshots: Owner-provided (3: P&L date bar, Stock Intelligence Phase 2 label, Wastage Coming Soon)
- Code traces: All documented with file:line references
- Path: `/app/memory/evidence/INVESTIGATION_BATCH_2026_07_27/`
