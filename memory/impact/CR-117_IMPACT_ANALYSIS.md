# CR-117 — Impact Analysis (Gate 2)

**ID:** CR-117  
**Title:** Order Report Beta — Combined Backend-Aggregated Daily Order Report  
**Gate:** 2 (Impact Analysis)  
**Date:** 2026-07-31  
**Risk:** LOW  
**Code Reality:** NONE — zero code exists for CR-117 in codebase (grep confirmed)  
**Conflict Pre-Check:** See §1 below  

---

## 0. Code Reality Check

```bash
grep -rn "CR-117\|OrderReportBeta\|order-report-beta\|daily-order-report-details-combined" \
  /app/frontend/src/ --include="*.js" --include="*.jsx"
# → 0 results
```

**Verdict: NONE** — full plan required.

---

## 1. Conflict Pre-Check

| File | Other Open Item | Status | Risk |
|------|----------------|--------|------|
| `Sidebar.jsx` | CR-052 (QA PASS — AWAITING SMOKE) | Parallel-safe: CR-052 changed flyout/collapse behavior; CR-117 adds 1 child object to `sidebarMenuItems.reports.children[]` — no overlap | LOW |
| `api/constants.js` | BUG-152 (AWAITING SMOKE), CR-118 (INTAKE) | Parallel-safe: separate constant keys, no collision | LOW |
| `App.js` | No open conflicts on route area | — | LOW |
| `reportService.js` | No open conflicts | — | LOW |

**Verdict: No blocking conflicts.** CR-117 can proceed independently.

---

## 2. Data Flow Trace

### 2a. API → Frontend

```
User selects date range (from/to)
  → POST /api/v1/vendoremployee/daily-order-report-details-combined
    Body: { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }
    Auth: Bearer token (via api.js interceptor)
    Base: REACT_APP_API_BASE_URL (https://preprod.mygenie.online/)
  → Response: {
      order_stats: { paidOrders, unpaidOrders, cancelOrders },
      daily_reports: [ { date, report: [orderRow...], paid_revenue, order_revenue, tab_revenue, room_revenue, unpaid_revenue, total_sales, total_discount, gst_amount, ... } ],
      grand_total: { paid_revenue, order_revenue, tab_revenue, room_revenue, unpaid_revenue, total_sales, total_discount, gst_amount, ... },
      from, to
    }
```

### 2b. Excel Export

```
User clicks "Export Excel"
  → POST /api/v1/vendoremployee/daily-order-report-excel-export-combined
    Body: { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }
    Auth: Bearer token
    Base: REACT_APP_API_BASE_URL (from env)
  → Response: expected blob (Excel file) OR JSON { download_url }
```

### 2c. UI Render Chain

```
OrderReportBetaPage.jsx (NEW)
  ├─ Sidebar.jsx (existing — sidebar nav)
  ├─ Date Range (From/To inline inputs + Apply btn — same pattern as DailySalesMockup/InsightsCache)
  ├─ KPI strip (order_stats → 4 cards: Total/Paid/Unpaid/Cancelled)
  ├─ Tabs (All Orders + Aggregator active; 6 blocked tabs greyed)
  ├─ Filter bar (Pay Type, Payment, Channel, Platform, Punched By, Collected By; Status + PG blocked)
  ├─ Per-day collapsible sections (daily_reports[])
  │   ├─ Day header (date + weekday + day-level totals: orders count, paid_revenue, total_sales, total_discount)
  │   └─ Order table rows (report[] within each day)
  │       ├─ Columns: Order#, Time, Platform, Type, Waiter, Items, Amount, GST, Service, Payment, Status
  │       └─ Platform badge (order_plateform: null→POS, swiggy→Swiggy, zomato→Zomato)
  ├─ Grand total footer (grand_total: revenue by PM, TAB revenue, room revenue, unpaid revenue, charges)
  └─ Export Excel button → POST daily-order-report-excel-export-combined
```

---

## 3. Affected Files

| # | File | Change | Lines Est. | Risk |
|---|------|--------|-----------|------|
| 1 | `src/pages/reports-module/OrderReportBetaPage.jsx` | **NEW** — full page component | ~500-600 | LOW (new file, no regression) |
| 2 | `src/api/constants.js` | +2 endpoint constants | ~4 | LOW |
| 3 | `src/api/services/reportService.js` | +2 exported functions (`getOrderReportBetaCombined`, `exportOrderReportBetaExcel`) | ~25 | LOW |
| 4 | `src/App.js` | +1 import + 1 route inside `reports-module/*` | ~3 | LOW |
| 5 | `src/components/layout/Sidebar.jsx` | +1 child entry in `reports.children[]` | ~2 | LOW |

**Total: 5 files (~535 net new lines). 4 modified files, 1 new file.**

### Files Will NOT Touch

- `orderTransform.js` — no order transform needed (backend pre-aggregated)
- `reportTransform.js` — no transform needed (display raw backend fields)
- `AllOrdersReportPage.jsx` — separate report, untouched
- `OrderTable.jsx` — CR-117 uses its own table (different column set)
- `InsightsCacheContext.jsx` — no cache integration (separate API)
- Any financial/billing/settlement logic

---

## 4. Downstream Consumers

**None.** CR-117 is a brand-new isolated page. No existing component depends on it. No shared state or context is modified.

---

## 5. Risk Assessment

| Factor | Assessment |
|--------|-----------|
| Financial logic | NO — read-only display of backend-aggregated data. No client-side money computation. |
| Hotspot files (R5) | NO — none of the 5 R5 hotspot files are touched |
| Provider order (R7) | NO — no provider changes |
| localStorage (R8) | NO — no localStorage changes |
| Auth/permissions | NO — uses existing Bearer token via api.js interceptor |
| Socket/realtime | NO |
| Existing tests | NO — new page, no existing test breakage |

**Overall Risk: LOW** — New isolated page consuming a new API endpoint. Zero interaction with existing order flow, billing, or financial logic.

---

## 6. Open Questions (Carried from Intake)

| # | Question | Status | Impact on Plan |
|---|----------|--------|----------------|
| **OQ-1** | Excel endpoint base URL | **RESOLVED (2026-07-31)** — owner confirmed: all APIs use `REACT_APP_API_BASE_URL` from env. No hardcoded domains. | None — standard pattern. |
| **OQ-2** | Separate route vs tab within AllOrdersReportPage | **RESOLVED** — separate route under Daily Report. Route: `/reports-module/order-report-beta`. | None. |
| **OQ-3** | Per-day collapsible or flat list | **PENDING UX REVIEW** — owner wants to see UX based on API structure before deciding. Proceeding with collapsible (matches API shape). Owner will confirm after seeing implementation. | Collapsible is default; can be switched to flat post-review. |
| **OQ-4** | Platform badge design | **RESOLVED (2026-07-31)** — colored pill badges (S=Swiggy orange, Z=Zomato red, POS=green). Matches CR-106/CR-110 pattern. | None. |
| **OQ-5** | Sidebar label | **RESOLVED (2026-07-31)** — "Orders (Beta)" under Daily Report section. | None. |
| **OQ-6** | Date range default | **RESOLVED (2026-07-31)** — today only. | None. |

**Owner Decisions — All Resolved. OQ-3 pending UX review post-implementation.**

## 6b. Filter & Tab Gap Analysis — Backend Brief Filed

**Decision: Only the new combined endpoint will be used. No workarounds. No partial mappings.**

Backend Brief: `/app/memory/backend_briefs/BACKEND_BRIEF_CR-117_2026-07-31.md`

### What's COVERED (fields already in combined endpoint)

**Filters that work today (6 of 8 + 1 new):**

| # | Filter | Field Available | Status |
|---|--------|----------------|--------|
| 1 | Date Range | `from` / `to` request params | ✅ COVERED |
| 2 | Pay Type | `payment_for` | ✅ COVERED (4 values: prepaid, postpaid, payment_gateway, aggregator) |
| 3 | Channel (Dine-in/Takeaway/Delivery/POS) | `order_type` | ✅ COVERED |
| 4 | Punched By | `waiter` | ✅ COVERED |
| 5 | Collected By | `collected_by` | ✅ COVERED |
| 6 | Aggregator Platform (NEW) | `order_plateform` | ✅ COVERED |
| 7 | KPI strip (Paid/Unpaid/Cancel counts) | `order_stats` | ✅ COVERED |

**Page features that work today:**
- Per-day collapsible sections (`daily_reports[]` grouped by date) ✅
- Grand total footer (`grand_total` object) ✅
- Excel export (`daily-order-report-excel-export-combined`) ✅
- All order row display fields (Order#, Time, Items, Amount, GST, VAT, etc.) ✅

### What's BLOCKED AT BACKEND (9 fields missing)

**P0 — 4 fields block ALL tab classification (6 tabs unusable):**

| Field | Blocks | Tab(s) Affected |
|-------|--------|----------------|
| `f_order_status` | Settled (=6), Hold (=8,9), Cancelled (=3) | Settled, Hold, Cancelled |
| `order_status` | Running detection ('queue'/'running') | Running |
| `payment_status` | Merge detection ('Merge'), Unpaid ('unpaid') | Merged, Running |
| `payment_method` | All tab routing ('Cancel'→Cancelled, 'TAB'→Credit, 'Merge'→Merged, 'paylater'→Hold, 'transferToRoom'→Running) | ALL 6 tabs |

**P1 — 3 fields block filters:**

| Field | Blocks |
|-------|--------|
| `razorpay_order_id` | PG / Non-PG filter |
| `order_in` | Channel classification (DI/TA/DL/RM/SRM) |
| `order_from` | Platform filter (POS/Web) |

**P2 — 2 fields (nice to have):**

| Field | Enables |
|-------|---------|
| `table_id` | Table identification |
| `parent_order_id` | Merged/room order linking |

### Bottom Line

| Feature | Status |
|---------|--------|
| **Tabs: All + Aggregator** | ✅ Can ship now |
| **Tabs: Settled/Cancelled/Credit/Hold/Merged/Running** | ❌ BLOCKED — needs P0 backend fields |
| **Filters: Date/PayType/Channel/PunchedBy/CollectedBy/AggregatorPlatform** | ✅ Can ship now |
| **Filters: Payment Gateway** | ❌ BLOCKED — needs `razorpay_order_id` |
| **Filters: Status (7-value)** | ❌ BLOCKED — needs `f_order_status` + `payment_method` |
| **KPI strip + Grand total + Per-day sections + Excel export** | ✅ Can ship now |

---

## 7. Reusable Components Identified

| Component | Path | Reusable? |
|-----------|------|-----------|
| `Sidebar` | `components/layout/Sidebar.jsx` | YES — standard layout |
| `DatePicker` | `components/reports/DatePicker.jsx` | NO — existing is single-date. CR-117 needs From/To range. Use inline `input type="date"` pattern from DailySalesMockup + `useInsightsCache` shared dates. |
| `ReportLoadingShield` | `components/reports/ReportLoadingShield.jsx` | YES — loading state |
| `ExportButtons` | `components/reports/ExportButtons.jsx` | PARTIAL — CSV/PDF pattern exists but Excel-from-backend is different. May use custom button instead. |
| `api` (axios) | `api/axios.js` | YES — auth interceptor, base URL |
| `useRestaurant` | `contexts/` | YES — restaurant context for header |
| `useInsightsCache` | `contexts/InsightsCacheContext.jsx` | MAYBE — shared date range state. Route is inside `InsightsCacheProvider` so dates could be shared. |

---

## 8. Verification Matrix (Seeds QA)

| # | What to Verify | Method | Automated? |
|---|---------------|--------|:---:|
| V-1 | Route `/reports-module/order-report-beta` renders page | Browser navigate | NO |
| V-2 | KPI strip shows paidOrders/unpaidOrders/cancelOrders from order_stats | Browser + Network tab | NO |
| V-3 | Daily sections render with correct date headers | Browser visual | NO |
| V-4 | Order rows show all key fields (Order #, Time, Platform, Type, Waiter, Amount, GST, Payment) | Browser visual | NO |
| V-5 | Platform badge shows for aggregator orders (`order_plateform` ≠ null) | Browser visual (needs aggregator data in date range) | NO |
| V-6 | Grand total footer matches `grand_total` from API | Browser + Network tab comparison | NO |
| V-7 | Date range change re-fetches API with new from/to | Network tab | NO |
| V-8 | Excel export button triggers POST to combined-excel endpoint and downloads file | Network tab + file download | NO |
| V-9 | Sidebar "Daily Report" section shows "Order Report Beta" link | Browser visual | NO |
| V-10 | Empty state shown when API returns empty daily_reports | Change date to future date | NO |
| V-11 | `constants.js` has 2 new constants | Code grep | YES |
| V-12 | `reportService.js` exports 2 new functions | Code grep | YES |
| V-13 | Webpack compiles with 0 new errors | `yarn start` logs | YES |

---

## 9. Summary

CR-117 is a **low-risk, additive feature** — a new report page consuming ONLY the new combined endpoint. No workarounds. No partial mappings from alternate fields. 5 files (1 new, 4 modified). No hotspot files.

**All OQs resolved.** OQ-3 (collapsible vs flat) proceeding with collapsible — owner UX review post-implementation.

**Backend brief filed:** `backend_briefs/BACKEND_BRIEF_CR-117_2026-07-31.md`

**Can ship now (without backend changes):**
- ✅ Page with KPI strip, per-day collapsible sections, grand total footer, Excel export
- ✅ Filters: Date Range, Pay Type, Channel, Punched By, Collected By, Aggregator Platform
- ✅ Tabs: All Orders, Aggregator

**Blocked at backend (9 missing fields in combined endpoint):**
- ❌ 6 tabs (Settled/Cancelled/Credit/Hold/Merged/Running) — needs `f_order_status`, `order_status`, `payment_status`, `payment_method`
- ❌ PG filter — needs `razorpay_order_id`
- ❌ 7-value Status filter — needs `f_order_status` + `payment_method`

**Next:** Gate 3 (Implementation Plan) for what CAN ship → backend delivers P0 fields → extend page with full tabs/filters.

---

## Docs Updated
- This file: `/app/memory/impact/CR-117_IMPACT_ANALYSIS.md`
- Backend brief: `/app/memory/backend_briefs/BACKEND_BRIEF_CR-117_2026-07-31.md`
- Backend brief (HTML): `/app/frontend/public/BACKEND_BLOCKERS_BRIEF_2026_07_22.html#cr-117`
- Design mockup: `/app/frontend/public/cr117-mockup.html`
- Evidence: `/app/memory/evidence/CR-117/combined_validated_response_20260731.json`
- Evidence: `/app/memory/evidence/CR-117/order_logs_report_sample_20260731.json`

---

## 10. Curl Validation (2026-07-31)

Live-probed on preprod with `owner@18march.com` (rid=478). Date range: 2026-07-25 → 2026-07-30. **42 orders across 6 days.**

All 25 field→UI mappings validated ✅. Evidence saved to `/app/memory/evidence/CR-117/`.

---

## 11. Transform Notes (from curl validation)

| Field | API Value | Transform | UI Display |
|-------|-----------|-----------|------------|
| `order_plateform` | `null` | null check | POS badge (green) |
| `order_plateform` | `"swiggy"` | direct | Swiggy badge (orange) |
| `order_plateform` | `"zomato"` | direct | Zomato badge (red) |
| `order_type` | `"dinein"` | direct | Dine-in badge |
| `order_type` | `"delivery"` | direct | Delivery badge |
| `order_type` | `"pos"` | direct | POS text |
| `payment_type` | `"Cash"/"Unpaid"/"Cancel"/"Partial"` | direct (display label) | Status badge |
| `payment_method_raw` | `"cash"/"pending"/"cancel"/"tab"/"aggregator"/"payment_gateway"/"partial"/"cash_on_delivery"` | capitalize | Payment badge |
| `payment_for` | `"prepaid"/"postpaid"/"payment_gateway"/"aggregator"` | capitalize | Pay Type filter (4 values, not 2) |
| `order_amount_raw` | `"115.00"` (string) | `parseFloat()` | ₹115 |
| `order_date` | `"10:04"` (HH:MM string) | direct — no parsing | 10:04 |
| `restaurant_order_id` | `"002356"` | prefix `#` | #002356 |
| `grand_total.*` | strings with commas `"4,703.00"` | strip commas + parseFloat | ₹4,703 |

---

## 12. Design Mockup

URL: `/cr117-mockup.html`

Reviewed and approved elements:
- ✅ From/To date range picker with Apply button (matches DailySalesMockup pattern)
- ✅ Tabs: All Orders + Aggregator active; 6 blocked tabs with 🔒 indicators
- ✅ Backend blocker banner with field tags
- ✅ KPI strip: 4 cards (Total/Paid/Unpaid/Cancelled)
- ✅ Filter bar: 8 dropdowns (2 blocked with 🔒) + summary stats (orders/total/avg)
- ✅ No duplicate breakdown pills (removed — tabs already convey tab info)
- ✅ Per-day collapsible sections with day stats
- ✅ Order table: 11 columns matching API fields
- ✅ Platform badges (POS green, Swiggy orange, Zomato red)
- ✅ Grand total footer: 5 sections (totals, revenue by PM, TAB, unpaid, charges)

---

## Gate 2 Status: COMPLETE ✅

**Completed artifacts:**
1. ✅ Code Reality Check — NONE
2. ✅ Conflict Pre-Check — no blocking conflicts
3. ✅ Data Flow Trace — API → Transform → UI mapped
4. ✅ Affected Files — 5 files, scope locked
5. ✅ Risk Assessment — LOW
6. ✅ OQs — all resolved (OQ-1 through OQ-6)
7. ✅ Filter/Tab Gap Analysis — covered vs blocked clearly documented
8. ✅ Backend Brief — filed in MD + amended into HTML
9. ✅ Curl Validation — 42 orders probed, 25 field mappings confirmed
10. ✅ Transform Notes — all value→display mappings documented
11. ✅ Design Mockup — reviewed by owner, corrections applied
12. ✅ Verification Matrix — 13 test cases seeded for QA

**Next: Gate 3 — Implementation Plan**
