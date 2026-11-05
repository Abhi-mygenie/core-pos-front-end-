# QA Handover — BUG-539 ml-64/ml-16 Fix

**Date:** 2026-10-12
**From:** Implementation agent
**To:** QA agent (Role 4)
**Item:** BUG-539 — Remove ml-64/ml-16 double-offset from PLReportPage + ConsumptionReportPage

---

## 1. Inherited Verification Matrix (from plan — self-test results)

| Edit | File | Line | Change | Self-Test |
|------|------|------|--------|-----------|
| E4 | `PLReportPage.jsx` | 172 | Removed `ml-64/ml-16` + `transition-all` → `flex flex-col overflow-hidden` | ✅ Code verified — L172 confirmed at HEAD |
| E5 | `ConsumptionReportPage.jsx` | 196 | Same | ✅ Code verified — L196 confirmed at HEAD |

**Compile:** webpack compiled with 1 warning (pre-existing SettlementReportMockup exhaustive-deps — ZERO new warnings) ✅

---

## 2. Test Cases (execute in order)

| # | Test | Steps | Expected | Blocker? |
|---|------|-------|---------|---------|
| TC-1 | P&L page fills full width at 1366px sidebar expanded | Login → navigate to P&L Report (sidebar open) → inspect layout at 1366px | Content fills from sidebar right-edge to screen right-edge. Zero gap between sidebar and content. | YES |
| TC-2 | P&L page fills full width at 1920px sidebar expanded | Same flow at 1920px viewport | Content fills full available width. No centering, no gap. | YES |
| TC-3 | P&L page fills correctly at 1366px sidebar collapsed | Toggle sidebar closed → inspect | Content fills from collapsed-sidebar (70px) right-edge to screen right-edge. | YES |
| TC-4 | Consumption Report fills full width at 1366px sidebar expanded | Navigate to Consumption Report → sidebar open | Same — content fills from sidebar edge to right. No gap. | YES |
| TC-5 | Sidebar animation unaffected | Toggle sidebar open/closed | Sidebar width animates smoothly. Content reflows cleanly. No layout jump or flash. | NO |

---

## 3. Regression Test Cases (prior BUG-539 fixes)

| # | Test | File/Line | Expected | Blocker? |
|---|------|---------|---------|---------|
| R1 | P&L header flex-wrap still works | PLReportPage.jsx L176 | At narrow (~900px) viewport, header controls wrap to 2nd line. No title compression. | NO |
| R2 | P&L table horizontal scroll still works | PLReportPage.jsx L266 | At narrow viewport, table scrolls horizontally inside the card. Table not clipped. | NO |
| R3 | Consumption header flex-wrap still works | ConsumptionReportPage.jsx L200 | Same wrap behaviour at narrow viewport. | NO |
| R4 | BUG-539-W: no max-w-7xl centering | PLReportPage.jsx L173 / ConsumptionReportPage.jsx L197 | No centred floating content. `px-6 py-6` padding only, no `max-w-7xl`. | NO |

---

## 4. What Changed (code diff summary)

**PLReportPage.jsx L172:**
```jsx
// BEFORE
<div className={`flex-1 transition-all duration-300 ${isSidebarExpanded ? 'ml-64' : 'ml-16'}`}>

// AFTER
<div className="flex-1 flex flex-col overflow-hidden"> {/* BUG-539 */}
```

**ConsumptionReportPage.jsx L196:**
```jsx
// BEFORE
<div className={`flex-1 transition-all duration-300 ${isSidebarExpanded ? 'ml-64' : 'ml-16'}`}>

// AFTER
<div className="flex-1 flex flex-col overflow-hidden"> {/* BUG-539 */}
```

**Root cause fixed:** Sidebar is `flex-shrink-0 relative` (in-flow). `flex-1` already positions content after sidebar. `ml-64` (256px) was an additional push, creating a 256px dead zone. Removing it collapses the gap.

---

## 5. Files Changed

| File | Lines | Change |
|------|-------|--------|
| `src/pages/reports-module/PLReportPage.jsx` | L172 | E4 — removed ml-64/ml-16 |
| `src/pages/reports-module/ConsumptionReportPage.jsx` | L196 | E5 — removed ml-64/ml-16 |

Files NOT touched: DashboardPage.jsx · Sidebar.jsx · any service/transform/context/App.js

---

## 6. Registry Sync Confirmation

```
Registry synced:  YES
BUG-539 status:   GATE_5A_IMPLEMENTED
BUG-539 sprint:   oct_cr_batch
BUG_TRACKER.md:   UPDATED (E4/E5 ml-64 fix noted)
FILE_OWNERSHIP.md: UPDATED (BUG-539 ml-64 IMPL section added)
Code markers:     {/* BUG-539 */} on L172 (PL) + L196 (Consumption)
EXIT GATE:        5/5 PASS
```

---

## 7. Credentials + Environment

| Field | Value |
|-------|-------|
| Owner account | owner@thegoankitchen.com / Qplazm@10 |
| Restaurant | The Goan Kitchen (RID 69) |
| Preview URL | https://genie-core-pos.preview.emergentagent.com |
| External backend | https://preprod.mygenie.online |

**Note for QA agent:** TC-1 through TC-4 require login on the preview URL and navigation to the respective report pages. The app connects to external preprod — login with real credentials above.

---

## 8. Regression Scope (per AGENT_PROMPT_ALPHA.md Role 4 rules)

BUG-539 touches 2 files (PLReportPage.jsx, ConsumptionReportPage.jsx) — neither is on the R5 hotspot list. Apply: handover regression tests (R1-R4 above) only. Full critical-path smoke not required for this fix.
