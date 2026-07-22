# QA Handover — Implementation Session 2026-06-12/13

> **For:** QA Agent
> **From:** Implementation Agent (E1)
> **Date:** 2026-06-13
> **Scope:** 10 implemented items ready for QA (8 from original 11-item backlog + 2 Phase 5 optimizations)
> **Branch:** `12-june-planning` (deployed to preview)
> **Preview URL:** https://bbb300dd-b3a2-4a89-b352-571f7b89d99d.preview.emergentagent.com
> **Production API:** https://preprod.mygenie.online/

---

## TEST CREDENTIALS

| Restaurant | Email | Password | RID | Notes |
|-----------|-------|----------|-----|-------|
| Welcome Resort | owner@welcomeresort.com | Qplazm@10 | 474 | Rooms enabled. 118 "check in" items in May. Best for BUG-132, BUG-133 testing. |
| Palm House | owner@palmhouse.com | Qplazm@10 | 541 | Rooms enabled. "Check In" capitalized. Good for BUG-133 case sensitivity. |

**Login API:** `POST /api/v1/auth/vendoremployee/login` with `{ "email": "...", "password": "..." }`

---

## ITEM 1: BUG-132 — Settlement Formula Fix

**Priority:** P0 (money impact)
**File:** `components/panels/SettlementPanel.jsx`
**What changed:** 13 edits across 5 micro-phases

### Test Cases

| # | Test | Steps | Expected | Severity |
|---|------|-------|----------|----------|
| 1.1 | 6 KPI cards visible | Login → Open Settlement panel (sidebar) | Cards: Opening Balance, Cash Collected, **Total Funds**, Settled, Remaining, Pilferage | HIGH |
| 1.2 | Total Funds math | Check Total Funds KPI value | Total Funds = Opening Balance + Cash Collected | HIGH |
| 1.3 | Per-waiter Expected formula | Look at Expected column in waiter table | Expected = Total Funds − Settled (**NOT** minus pilferage) | CRITICAL |
| 1.4 | TOTAL row Expected | Scroll to TOTAL row | Expected = Σ(Total Funds) − Σ(Settled) | CRITICAL |
| 1.5 | Pilferage shows backend value | Check Pilferage column without entering actual balance | Shows backend recorded pilferage (not ₹0) | HIGH |
| 1.6 | Pilferage live update | Enter an actual balance < Expected | Pilferage = Expected − Actual Balance | HIGH |
| 1.7 | Settle modal Expected | Click "Settle" on a waiter | Modal Expected = Total Funds − Settled (matches table) | HIGH |
| 1.8 | Modal red border | Enter amount > Expected in modal | Red border + error text "Cannot settle more than expected balance" | MEDIUM |
| 1.9 | Confirm disabled | Enter amount > Expected | Confirm button disabled | MEDIUM |
| 1.10 | Zero funds sub-text | Select a date with no activity | Settled card shows "No funds today" | LOW |

**Best test restaurant:** Welcome Resort (has settlement data)
**Best test date:** Any date in May 2026 with orders

---

## ITEM 2: CR-040 — Sidebar Rename + X/Y/Z Removal

**Priority:** P3 (cosmetic)
**Files:** `Sidebar.jsx`, `AllOrdersReportPage.jsx`, `OrderSummaryPage.jsx`, `RoomOrdersReportPage.jsx`

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 2.1 | Sidebar labels renamed | Expand "Order Reports" in sidebar | "Daily Report", "Daily Summary", "Daily Room Report" |
| 2.2 | X/Y/Z removed | Check sidebar under "Order Reports" | No X Report, Y Report, Z Report |
| 2.3 | Daily Report page header | Click "Daily Report" | Page header says "Daily Report" (not "Audit Report") |
| 2.4 | Daily Summary page header | Click "Daily Summary" | Page header says "Daily Summary" (not "Order Summary") |
| 2.5 | Daily Room Report page header | Click "Daily Room Report" | Page header says "Daily Room Report" (not "Room Orders Report") |
| 2.6 | Routes still work | Navigate to `/reports/audit` directly | Page loads correctly (route path unchanged) |

---

## ITEM 3: CR-042 — "Items & Menu" → "Item Ledger"

**Priority:** P3 (cosmetic)
**Files:** `Sidebar.jsx`, `ItemSalesHybridMockup.jsx`

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 3.1 | Sidebar label | Expand "Insights" in sidebar | "Item Ledger" (not "Items & Menu") |
| 3.2 | Page header | Click "Item Ledger" | Page header says "Item Ledger" |
| 3.3 | Export title | Trigger Excel/PDF export | Filename/title contains "Item Ledger" |
| 3.4 | Audit tab | Enable REACT_APP_SHOW_AUDIT_TAB=true → check audit tab header | "Audit · Item Ledger" |

---

## ITEM 4: BUG-131 — Sidebar Bottom Sticky

**Priority:** P2 (UX)
**File:** `Sidebar.jsx` (3 CSS edits)

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 4.1 | Expanded sidebar, all sections open | Expand Order Reports + Insights + all children | Bottom section (Ringer/Refresh/User/Logout) stays pinned at bottom, nav scrolls |
| 4.2 | Collapsed sidebar (70px) | Click collapse | Bottom icons still visible at bottom |
| 4.3 | Short viewport | Resize browser to 800px height | Nav scrolls, bottom stays |
| 4.4 | No expanded sections | Collapse all | Bottom at natural position, no scroll needed |

---

## ITEM 5: CR-037 — Remove Popular Items

**Priority:** P2 (performance)
**Files:** 8 files (see CR registry)

### Test Cases

| # | Test | Steps | Expected | Severity |
|---|------|-------|----------|----------|
| 5.1 | Boot screen items | Login → Loading screen | 6 items (was 7). "Popular Items" row is GONE. | HIGH |
| 5.2 | Category panel | Open any order on POS | CategoryPanel shows "All" + real categories. NO "Popular" tab. | HIGH |
| 5.3 | "All" category works | Select "All" tab | All active products displayed | HIGH |
| 5.4 | Refresh works | Click sidebar "Refresh" | Data reloads without errors. No popular API call in Network tab. | MEDIUM |
| 5.5 | No console errors | Check DevTools console after boot | No `setPopularFood is not a function` or similar | HIGH |

---

## ITEM 6: CR-038 — Boot Retry Policy

**Priority:** P2 (UX)
**File:** `LoadingPage.jsx`

### Test Cases

| # | Test | Steps | Expected | Severity |
|---|------|-------|----------|----------|
| 6.1 | Retry counter visible | Simulate failure (block API in DevTools) → see error state | Button shows "Retry Failed (N) — Attempt 1 of 3" | HIGH |
| 6.2 | Counter increments | Click retry 1 | Shows "Attempt 2 of 3" | HIGH |
| 6.3 | Max retries exhausted | Click retry 3 times | Button disabled (gray). "All attempts used". "Contact support" message. `data-testid="retry-exhausted"` | HIGH |
| 6.4 | Normal flow unaffected | Login with valid credentials, all APIs succeed | No retry UI. Redirects to dashboard. | CRITICAL |

---

## ITEM 7: CR-039 — Credit Total Wire

**Priority:** P1 (money)
**Files:** `creditService.js`, `CreditManagementPanel.jsx`

### Test Cases

| # | Test | Steps | Expected | Severity |
|---|------|-------|----------|----------|
| 7.1 | KPI tiles show values | Open Credit Management (sidebar) | TOTAL CREDIT shows real value (not "—"). TOTAL PAID shows real value. | CRITICAL |
| 7.2 | Tooltip updated | Hover TOTAL CREDIT tile | "Lifetime total credit across all customers" (not "Awaiting backend...") | MEDIUM |
| 7.3 | Comma-formatted balances | Check customers with balance > ₹1,000 | Balance displays correctly (e.g., ₹3,000.00 not NaN) | HIGH |
| 7.4 | Portfolio export instant | Click Portfolio Summary export | Generates immediately (no batch progress bar). No N+1 API calls in Network tab. | HIGH |
| 7.5 | Portfolio data correct | Check exported portfolio | totalCredit/totalPaid/outstanding per customer match | HIGH |
| 7.6 | Empty state | If restaurant has no credit customers | All tiles show ₹0 | LOW |

---

## ITEM 8: BUG-133 — Check In Item Filter

**Priority:** P1 (money — room tariffs inflating food revenue)
**Files:** `insightsService.js`, `reportTransform.js`, `CancellationsMockup.jsx`

### Test Cases

| # | Test | Steps | Expected | Severity |
|---|------|-------|----------|----------|
| 8.1 | Item Ledger — Welcome Resort | Login as Welcome Resort → Insights → Item Ledger → May 1-15 | "check in" does NOT appear as an item. Revenue decreased vs pre-fix. | CRITICAL |
| 8.2 | Item Ledger — Palm House | Login as Palm House → Item Ledger → May | "Check In" (capitalized) NOT present | CRITICAL |
| 8.3 | Dashboard revenue | Welcome Resort → Insights Dashboard → May | Revenue does NOT include room tariffs (₹1,100-₹3,600 per check-in removed) | HIGH |
| 8.4 | Order Ledger drill-down | Find a room order → expand detail | "check in" NOT in items list | HIGH |
| 8.5 | Cancellations | Insights → Cancellations → check for room order cancels | No "check in" items in cancel aggregation | MEDIUM |
| 8.6 | Audit Report side-sheet | Daily Report → click room order → side-sheet | "check in" NOT in items | MEDIUM |
| 8.7 | Food Court | Insights → Food Court | No "check in" in station breakdown | MEDIUM |
| 8.8 | Case insensitivity | Verified by 8.1 (lowercase) + 8.2 (capitalized) | Both filtered | HIGH |
| 8.9 | Non-room restaurant unaffected | Login as Cafe103 (no rooms) → all reports | No regression, reports unchanged | HIGH |

---

## ITEM 9: CR-045 — Field Stripping

**Priority:** P2 (performance)
**Files:** `orderPayloadStripper.js` (NEW) + 7 service/page files

### Test Cases

| # | Test | Steps | Expected | Severity |
|---|------|-------|----------|----------|
| 9.1 | All 10 Insights reports load | Navigate each report with May data | All reports display data correctly — no missing fields, no NaN, no blank columns | CRITICAL |
| 9.2 | Dashboard KPI tiles | Insights Dashboard | All 6+ tiles show values | HIGH |
| 9.3 | Item Ledger all tabs | Item Ledger → All/Sold/Cancelled/Comp/Pending/Top/Slow tabs | All show data, drill-down works | HIGH |
| 9.4 | Order Ledger columns | Order Ledger | All 51 columns display data. Side-sheet detail works. | HIGH |
| 9.5 | Exports | Trigger Excel/PDF export on any report | Export succeeds, data correct | HIGH |
| 9.6 | Audit Report unaffected | Daily Report (AllOrdersReportPage) → all tabs, side-sheet | Works normally (not wired to cache, but strip applies via reportTransform) | HIGH |
| 9.7 | Network unchanged | Check Network tab — API response size | Unchanged (backend still sends full payload). Strip is FE-only. | INFO |
| 9.8 | Env flag disable | Set `REACT_APP_STRIP_ORDERS=false` in .env → restart → check reports | All reports still work (strip disabled, passthrough) | MEDIUM |

---

## ITEM 10: CR-044 — Shared Cache + Date Persistence

**Priority:** P1 (UX performance)
**Files:** `insightsCache.js` (NEW), `InsightsCacheContext.jsx` (NEW) + 17 modified

### Test Cases

| # | Test | Steps | Expected | Severity |
|---|------|-------|----------|----------|
| 10.1 | Date persistence | Dashboard → select March 1-31 → Apply → navigate to Item Ledger | Item Ledger opens with March 1-31 pre-selected (not today) | CRITICAL |
| 10.2 | Date sync back | On Item Ledger, change to April 1-30 → Apply → navigate to Sales | Sales opens with April 1-30 | CRITICAL |
| 10.3 | Cache hit (no redundant API) | Dashboard loads March data → navigate to Item Ledger (same dates) → check Network tab | Item Ledger does NOT make a new `order-logs-report` call for `created_at` (cache hit) | CRITICAL |
| 10.4 | Cache miss on date change | On Item Ledger, change dates to Feb → Apply | New API call fires (different cache key) | HIGH |
| 10.5 | Refresh clears cache | Click Refresh on any report | Fresh API call fires (cache cleared) | HIGH |
| 10.6 | Logout clears cache (R-8) | Login as Welcome Resort → load Dashboard → Logout → Login as Palm House → Dashboard | Palm House data shown (NOT Welcome Resort cached data) | CRITICAL (security) |
| 10.7 | Split TTL — today's data | Dashboard → today's date → wait 90s → navigate away and back | Fresh API call (60s TTL expired) | HIGH |
| 10.8 | Split TTL — historical data | Dashboard → May 2026 → wait 90s → navigate away and back | Cache still valid (5-min TTL, only 90s passed) | HIGH |
| 10.9 | Large response skip | Restaurant with >3000 orders in range (unlikely on preprod) | Cache skips storing (verify via DevTools JS memory) | LOW |
| 10.10 | Settlement date persistence | Insights → Settlement → select dates → navigate to Dashboard → back to Settlement | Dates persist (Settlement shares dates, not order cache) | MEDIUM |
| 10.11 | URL param override (Item Ledger) | Navigate to `/reports-module/items?from=2026-05-01&to=2026-05-15` | URL params take priority over shared dates | MEDIUM |

---

## REGRESSION TESTS (cross-cutting)

| # | Test | Expected |
|---|------|----------|
| R-1 | POS dashboard loads | Order columns, cards, tables display correctly |
| R-2 | Login → Boot screen | 6 items load (no Popular). Progress reaches 100%. Redirects to dashboard. |
| R-3 | Place order flow | Full dine-in order → KOT → serve → collect bill → works |
| R-4 | Sidebar navigation | All sidebar items navigate correctly. No broken links. |
| R-5 | Audit Report (non-Insights) | `/reports/audit` loads independently, not affected by cache |
| R-6 | Menu Management panel | Opens, loads items, bulk editor works |
| R-7 | Settlement panel (dashboard) | Opens, shows 6 KPI cards, settle flow works |
| R-8 | Credit Management panel | Opens, shows KPI tiles with real values |
| R-9 | No console errors | Check DevTools console across all flows |

---

## ENVIRONMENT NOTES

- Frontend runs on port 3000 (craco dev server)
- Backend is external at `preprod.mygenie.online` (not local)
- `REACT_APP_STRIP_ORDERS` env var: not set (default ON — stripping active)
- `REACT_APP_SHOW_AUDIT_TAB=true` (from ENV_REGISTRY)
- WebSocket: `presocket.mygenie.online`

---

## PLAN DOCUMENTS (reference)

| Item | Plan Document |
|------|--------------|
| BUG-132 | `/app/memory/BUG_132_SETTLEMENT_FORMULA_FIX_IMPLEMENTATION_PLAN.md` |
| Phase 1 (CR-040/CR-042/BUG-131) | `/app/memory/PHASE_1_SIDEBAR_SWEEP_IMPLEMENTATION_PLAN.md` |
| Phase 2 (CR-037/CR-038) | `/app/memory/PHASE_2_BOOT_OPTIMIZATION_IMPLEMENTATION_PLAN.md` |
| CR-039 | `/app/memory/PHASE_3_CREDIT_TOTAL_WIRE_IMPLEMENTATION_PLAN.md` |
| BUG-133 | `/app/memory/BUG_133_CHECK_IN_FILTER_IMPLEMENTATION_PLAN.md` |
| CR-044 + CR-045 | `/app/memory/PHASE_5_INSIGHTS_OPTIMIZATION_IMPLEMENTATION_PLAN.md` |

---

*QA Handover — 2026-06-13. 10 items, 70+ test cases across 10 items + 9 regression tests.*
