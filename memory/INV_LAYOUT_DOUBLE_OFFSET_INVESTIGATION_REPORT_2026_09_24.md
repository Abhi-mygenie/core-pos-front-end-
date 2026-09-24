# INV — Report pages shifted right / cut off ("screen goes out of page") — Investigation Report

**Date:** 2026-09-24 · **Role:** INVESTIGATION (ALPHA v0.7) · **Steps used:** 4/10 · **Risk:** MEDIUM (layout only, no logic) · **Registered ID:** none (owner: investigate only, do not register)
**Owner evidence:** `evidence/INV-LAYOUT-DOUBLE-OFFSET-2026-09-24/owner_screenshot_pl_report.png` — P&L Report at `pos-uat.mygenie.online/reports-module/profit-loss`, sidebar expanded: blank band between sidebar and content, title "Profit & Loss Report" squeezed into a 3-line column, KPI strip and pie chart cut off at the right edge.

## 1. Summary
- **Root cause:** `PLReportPage.jsx:171` and `ConsumptionReportPage.jsx:196` add `ml-64` (256 px) / `ml-16` (64 px) to the content wrapper **on top of** an in-flow `<Sidebar>` that already occupies 280 px / 70 px (`Sidebar.jsx:496-498` — `<aside class="h-screen flex … flex-shrink-0 relative" style={{width: isExpanded ? '280px' : '70px'}}>`, not `position: fixed`). Content is therefore offset twice (280 + 256 = 536 px when expanded), leaving a ~256 px empty band and pushing the content off the right edge.
- **Secondary:** the same two pages have no `overflow-auto` / `min-w-0` on the `flex-1` wrapper and the header row (`PLReportPage.jsx:175-212`) is `flex … justify-between` with no `flex-wrap`, so once the double offset eats the width the header's min-content (date range + Apply + presets + PDF ≈ 800 px) forces horizontal overflow and the title column collapses.
- **Why only some pages:** grep across all pages that render `<Sidebar>` shows **exactly 2** use the `ml-64/ml-16` pattern; every other page (e.g. `OrderSummaryPage.jsx:118` `<main class="flex-1 overflow-auto">`, inventory pages `flex-1 overflow-auto`, report mockups `flex-1 flex overflow-hidden`) relies on flex flow only and is unaffected.
- **Classification:** FE_BUG · **Confidence:** HIGH by code trace + geometry match; browser reproduction on the pod was blocked (see §4).

## 2. Hypotheses Tested
| # | Hypothesis | Test | Steps | Result |
|---|---|---|---|---|
| H1 | Recharts `ResponsiveContainer` growth loop widens the page | Code read `PLReportPage.jsx:220-260` — charts sit in a `grid-cols-1 lg:grid-cols-3` (minmax(0,1fr)) | 1 | ELIMINATED as primary (grid min-content is 0; also would not explain the left band) |
| H2 | Content wrapper applies a sidebar margin while sidebar is already in flow | grep `ml-64` across `pages/` + read `Sidebar.jsx:493-498` | 2–3 | **CONFIRMED** — 2 files, sidebar is `relative` in-flow |
| H3 | Header row lacks wrap/overflow guard → title squeeze + right cut-off | Code read `PLReportPage.jsx:171-212` vs `OrderSummaryPage.jsx:118` | 3 | CONFIRMED as amplifier |

Geometry check against the owner screenshot (image ≈ 0.92 × CSS px): sidebar edge at 257 px ≈ 280 CSS px; content starts at 510 px → gap ≈ 275 CSS px ≈ `ml-64` 256 px + `px-6` 24 px. Matches H2 exactly.

## 3. Affected pages
| Page | File:line | Pattern |
|---|---|---|
| Daily Report → P&L Report (`/reports-module/profit-loss`) | `src/pages/reports-module/PLReportPage.jsx:171` | `` className={`flex-1 transition-all duration-300 ${isSidebarExpanded ? 'ml-64' : 'ml-16'}`} `` |
| Daily Report → Consumption Report (`/reports-module/consumption-report`) | `src/pages/reports-module/ConsumptionReportPage.jsx:196` | identical |
Collapsed sidebar shows the same defect at a smaller scale (70 + 64 px offset), which is why it looks "sometimes fine".

## 4. Reproduction attempt (pod preview)
Login as owner@palmhouse.com succeeded, but `/loading` boot is stuck on preprod: "Setting up kitchen stations… Failed · 10.0s (1 of 2 kitchen stations failed to load — BAR)", Retry 1/3 and 2/3 also failed → the app never reaches the dashboard, so the report page could not be screenshotted from the pod. Not related to this layout issue; noted as an environment blocker (preprod `kitchen stations` endpoint timing out for palmhouse).

## 5. Recommendations
- **FE_FIX**, 2 files, 1 line each: drop the `ml-64/ml-16` classes (keep `flex-1`), and align with the sibling pattern `flex-1 overflow-auto` (or add `min-w-0`). Optionally add `flex-wrap gap-y-3` to the header row at `PLReportPage.jsx:175` so the toolbar wraps on ≤1280 px instead of squeezing the title.
- **Planning-skip eligibility:** the 1-line-per-file change is ≤10 lines and touches no hotspot (R5) and no financial logic (R6), **but it spans 2 files** → not eligible for DIRECT_BUG_FIX under the ≤1-file rule. Recommend INTAKE (one BUG, LOW/MEDIUM risk) → Fast Lane per file or a short Gate 2/3. Owner to decide.
- Both pages are CR-093 / CR-094 (pos_5_0, QA PASS 2026-07-24); BUG-258/259/261 later touched the same header — FILE_OWNERSHIP check needed at intake.

## 6. Evidence Artifacts
`/app/memory/evidence/INV-LAYOUT-DOUBLE-OFFSET-2026-09-24/owner_screenshot_pl_report.png`

## 7. Retroactive Candidates
NONE.
