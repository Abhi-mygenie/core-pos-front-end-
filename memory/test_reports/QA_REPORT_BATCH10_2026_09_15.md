# QA Report — BATCH-10: Full Regression Smoke (Critical Path)
**Date:** 2026-09-15
**Role:** QA Agent (ALPHA v0.7 — Role 4)
**Scope:** Login → Order → Settle → Print → PMS Check-in → Folio → Checkout → Night Audit → Revenue → Reports → Sidebar → Aggregator/Menu
**Sprint:** pos_pms_1 (final smoke before Gate 6 Owner Smoke)
**Environment:** Preview `react-pos-frontend-23` → preprod `https://preprod.mygenie.online` · Account `goankitchen_owner` · Restaurant 69 (The Goan Kitchen) · Viewport 1920×800
**Method:** Live UI (Playwright) + network capture (request/response payloads) + direct API probes (curl) + code trace

---

## Test Data Created (preprod — owner may clean up)
| Artifact | Detail |
|---|---|
| Walk-in F&B order `wc-1232381` | jeera rice ×1 ₹107 · Cash · paid + settled (removed from board) |
| Room order `1232382` (#000048) | Walk-in check-in "QA Smoke Guest B10" 9000000010 → room r2 (id 8526) ₹1,000 → checked out via Cash ₹1,000 |
| Print requests | `order-temp-store` ×2 for order 1232336 (#000041) — bill print from dashboard card + Collect Payment panel |
| Product `224396` "nails" | Status toggled Inactive → Active (reverted) · Bulk Editor price 13 → 14 → 13 (reverted) |

---

## Step 1 — Login → Restaurant → Dashboard

| # | Test Case | Expected | Actual | Result |
|---|---|---|---|---|
| S1-01 | Login `owner@thegoankitchen.com` | Redirect to `/dashboard` | `/dashboard` reached; single-restaurant account auto-selected; FCM denied (headless) handled gracefully | ✅ PASS |
| S1-02 | Dashboard board renders | Dine-In + Room columns with live orders | Dine-In 6 · Room 2 (r3 ₹9,440 Test Guest GST · r5 ₹10 poi) · Web 0 / POS 8 counter chip | ✅ PASS |
| S1-03 | Loading gate | Boot screen → redirect | 9-stage loader → "All data loaded! Redirecting…" (~12 s) | ✅ PASS |

**Step 1: 3/3 PASS ✅**

---

## Step 2 — Create Order → Items → Cart → Collect Payment → Settle → Print Bill

| # | Test Case | Expected | Actual | Result |
|---|---|---|---|---|
| S2-01 | Click header **Add** button (pointer click at button centre) | OrderEntry opens (walk-in) | **Click intercepted by `search-input`** — Playwright: `<input data-testid="search-input"> … intercepts pointer events` (58 retries). `elementFromPoint` at Add centre = `INPUT search-input`. Screenshot shows search box focused with "✕" overlapping "Add". JS `.click()` on the button DOES open OrderEntry → hit-target overlap, not a handler bug. | ❌ **FAIL — MAJOR (F-01)** |
| S2-02 | OrderEntry renders (via workaround) | Menu grid + cart | `order-entry-screen` visible; 5 menu items; Popular/All/subject one categories; Walk-In badge | ✅ PASS |
| S2-03 | Add "jeera rice" to cart | Row qty 1 ₹107; Place Order (1); Collect Bill ₹107 | Cart row rendered; `place-order-btn` "Place Order (1)"; `collect-bill-btn` "Collect Bill ₹107"; KOT checked, Bill unchecked | ✅ PASS |
| S2-04 | Collect Bill → payment panel | Bill summary + payment methods | `collect-payment-panel`; Item Total/Subtotal/Grand Total ₹107; methods: Cash, UPI, Card, Credit(TAB); Discount/Tip adjustments | ✅ PASS |
| S2-05 | Cash → quick-amount → Pay ₹107 | Order placed + paid; back to dashboard | New "Walk-In PAID · Owner · 0m · Settle" card; POS counter 8 → 9 | ✅ PASS |
| S2-06 | **Settle** prepaid order (`settle-btn-wc-1232381`) | Card removed | Card removed; POS counter 9 → 8 | ✅ PASS |
| S2-07 | Dashboard card **Bill** (`collect-btn-8529`) → print | `order-temp-store` request succeeds | Spinner shown; console `[PrintOrder] payload {order_id:1232336, print_type:bill, payment_amount:107}` → `response {status:true, message:"Order inserted into temp table"}` | ✅ PASS |
| S2-08 | Open placed order → Collect Bill → **Print Bill** (`print-bill-btn`) | Button visible only when placed items exist; request succeeds | Button absent on unplaced cart (correct, `hasPlacedItems` gate); present on order #000041; "Printing…" state; temp-store `status:true` | ✅ PASS |

**Step 2: 7/8 PASS · 1 FAIL (MAJOR)**

---

## Step 3 — PMS: Check-in → In-House → Folio → Checkout

| # | Test Case | Expected | Actual | Result |
|---|---|---|---|---|
| S3-01 | `/pms/check-in` loads | KPI strip + arrivals + panel | KPIs 1 Arriving / 1 In-House / 0 Checkout / ₹100 Outstanding; arrivals r2 saurav, r1 hello; first pending arrival auto-selected in panel | ✅ PASS |
| S3-02 | **Walk-in** → form | Name/phone/room/dates/amount | Form opens; CRM lookup fires on 10-digit phone; room picker shows r3/r5 "Occupied" + r4 "Needs Cleaning" **disabled** (BUG-380/387 ✅), r2/r1 enabled | ✅ PASS |
| S3-03 | Room ₹1,000, 1 night | GST strip 5 % slab | CGST 2.5 % ₹25 + SGST 2.5 % ₹25 = ₹50 · **Total incl. GST ₹1,050.00** (BUG-386/396 ✅) | ✅ PASS |
| S3-04 | Confirm Check-In | Order created; redirect | POST ok → redirected to `/pms/in-house`; row r2 "QA Smoke Guest B10 #1232382" 2026-09-15→16 balance ₹1,000; KPI In-House 3 | ✅ PASS |
| S3-05 | In-House **View Bill** | `/pms/folio/1232382` | Folio renders: guest, WalkIn / Pay at Hotel / In-House / executive·r2 badges; Booking ID; Room Price ₹1,000; Lodging GST ₹50; Advance ₹0; F&B ₹0 | ✅ PASS |
| S3-06 | Folio balance figures | Balance consistent with check-in total (₹1,050) | **Room Balance ₹1,000 · Total Balance Due ₹1,000** (GST excluded). Source: `get-single-order-new` → `room_payment_summary.remaining_room_balance = 1000`, **no `gst_tax` key**. Same order via `employee-orders-list` → `remaining_room_balance = 1050, gst_tax = 50`. Endpoint inconsistency → folio understates by GST. | ❌ **FAIL — BLOCKER (F-02)** |
| S3-07 | **Check Out** → drawer | Drawer with bill + methods | `PmsCheckoutDrawer`: ROOM ₹1,000, Grand Total ₹1,000, Print Bill, Cash/UPI/Card/Credit, "Checkout ₹1,000" | ✅ PASS (render) |
| S3-08 | Checkout payload carries room GST (BUG-386 OD-386-02 Option A) | `room_gst_tax: 50` present | Captured POST `/api/v2/vendoremployee/order/order-bill-payment`: `payment_amount:1000, gst_tax:0, grant_amount:1000, paid_room:"yes"` — **`room_gst_tax` ABSENT**. Cause: `PmsCheckoutDrawer.jsx:157` reads `roomInfo.roomPaymentSummary.gstTax`, mapped from `room_payment_summary.gst_tax` (`orderTransform.js:432`) which this endpoint never returns → 0 → `if (roomGstTax > 0)` skips. BE reply 200 `"Room payment received via cash"`. Night Audit later shows `room_gst_collected: 0`. | ❌ **FAIL — BLOCKER (F-02)** |
| S3-09 | Post-checkout | Room freed, app returns to dashboard | `/loading` → dashboard; r2 Available; In-House KPI 3 → 2 | ✅ PASS |

**Step 3: 7/9 PASS · 2 FAIL (BLOCKER — same root, F-02)**

---

## Step 4 — Night Audit (`/pms/night-audit`)

| # | Test Case | Expected | Actual | Result |
|---|---|---|---|---|
| S4-01 | Page loads, date defaults today | 2026-09-15 | `night-audit-date-picker` = 2026-09-15 | ✅ PASS |
| S4-02 | All 8 sections render | A–H | `section-occupancy` (60 % occ), `section-revenue`, `section-outstanding` (₹8,100), `section-no-shows`, `section-departures`, `section-room-status-close`, `section-audit-trail`, `section-reconciliation` — all present; BN-1/BN-2 amber banners shown | ✅ PASS |
| S4-03 | Change date → 2026-09-14 | Refetch + re-render | Occupancy 60 % → 20 %; Rooms Sold 3 → 1; Room Sales ₹1,057 → ₹95 | ✅ PASS |
| S4-04 | **Excel** export | File download | `Night_Audit_2026-09-14.xls` downloaded | ✅ PASS |
| S4-05 | **PDF** export | Report window | New window `blob:` — title "Night Audit Report — The Goan Kitchen" | ✅ PASS |
| S4-06 | Data sanity | — | BE returns identical `room_revenue_collected 952.38 / cash 952.38` for both 15-Sep and 14-Sep; `room_gst_collected: 0`; executive "200 % ⚠" (2 sold / 1 capacity). FE renders pass-through faithfully (R6). Backend attribution quirk. | NOTE (F-08) |
| S4-07 | Navigation shell | Consistent with sibling PMS pages | Page renders **without Sidebar and without Back button** (sibling pages In-House/Check-In/Front Desk include Sidebar). Precedent exists (Aggregator Setup also shell-less). Exit only via browser Back. | MINOR (F-04) |

**Step 4: 5/5 PASS · 1 MINOR · 1 NOTE**

---

## Step 5 — Revenue Dashboard (`/pms/revenue`)

| # | Test Case | Expected | Actual | Result |
|---|---|---|---|---|
| S5-01 | Default preset 7D | `pill-7d` active; range today-6 → today | `pill-7d` has `bg-[#F26B33]`; request `start_date=2026-09-09&end_date=2026-09-15&group_by=day` | ✅ PASS |
| S5-02 | KPI tiles | 5 tiles with values | Occupancy 60 % · ADR ₹3,385/₹726 · RevPAR ₹2,031/₹435 · Room Revenue ₹71,080.32/₹15,238.08 · TRevPAR ₹2,031 | ✅ PASS |
| S5-03 | Charts render | 3 SVG charts | `chart-occupancy` (3 svg), `chart-revenue` (4 svg), `chart-adr-revpar` (5 svg, tooltip works) | ✅ PASS |
| S5-04 | Breakdown tables | Channel / Room Type / Payment Type | All 3 tables render with headers + rows | ✅ PASS |
| S5-05 | Switch preset → 30D | Refetch, re-render | request `start_date=2026-08-17&end_date=2026-09-15`; KPIs update (Room Revenue ₹1.19L/₹1.15L, Occ 26 %); charts re-render | ✅ PASS |
| S5-06 | Mount behaviour | 1 fetch | 7D `revenue-summary` request fired **twice** on mount (identical params) | NOTE (F-06) |
| S5-07 | Navigation shell | — | Same as S4-07 — no Sidebar / Back | MINOR (F-04) |

**Step 5: 5/5 PASS · 1 NOTE**

---

## Step 6 — Reports

| # | Route | Actual | Result |
|---|---|---|---|
| S6-01 | Room Orders `/reports-module/room-orders` | KPIs Total Rooms 1 · Room Revenue ₹1,000 · Collected ₹1,000 · Outstanding ₹0 (reflects today's QA stay); Daily Room Revenue bar; Collection donut; Top Rooms r2; Occupancy heatmap Tue=1 | ✅ PASS |
| S6-02 | Room Orders chart axis | Y-axis ticks render "₹1k ₹1k ₹1k ₹0k ₹0k" (rounding collision on small ranges) | MINOR (F-05) |
| S6-03 | Sales Summary `/reports/summary` | SALES ₹1,306 · PAID ₹107 (today's QA order) · RUNNING ₹199 | ✅ PASS |
| S6-04 | Daily Sales `/reports-module/daily-sales` | Renders with presets Today/7D/30D/MTD + Download | ✅ PASS |
| S6-05 | Items Ledger `/reports-module/items` | Breadcrumb Insights › Item Ledger; filters + definitions | ✅ PASS |
| S6-06 | Orders Ledger `/reports-module/order-ledger` | All Orders 4 · Settled 2 · Cancelled 1 · Running 1 | ✅ PASS |
| S6-07 | Order Report `/reports/audit` | Tabs All/Settled/Cancelled/Credit/Hold/Merged/Running/Aggregator/Audit; PDF/CSV | ✅ PASS |

**Step 6: 6/6 PASS · 1 MINOR**

---

## Step 7 — Sidebar Navigation (SPA clicks via `sidebar-*` / `flyout-*`)

| # | Link | Route | Actual | Result |
|---|---|---|---|---|
| S7-01 | Channel Manager | `/pms/channel-manager` | AIOSELL Setup / Room Mapping / Rates tabs; Sync All Now | ✅ PASS |
| S7-02 | In-House Guests | `/pms/in-house` | KPIs + table | ✅ PASS |
| S7-03 | New Booking | `/pms/new-booking` | Guest Details form | ✅ PASS |
| S7-04 | Check-In | `/pms/check-in` | Arrivals + panel | ✅ PASS |
| S7-05 | Front Desk | `/pms/front-desk` | "Good Morning · Tuesday, 15 September 2026" · Occupancy 40 % | ✅ PASS |
| S7-06 | Arrivals | `/pms/arrivals` | TODAY 1 / UPCOMING | ✅ PASS |
| S7-07 | Departures | `/pms/departures` | "Check-out by 11:00 AM" · TOTAL DUE | ✅ PASS |
| S7-08 | Tape Chart | `/pms/reservations` | Placeholder page renders (P4) | ✅ PASS |
| S7-09 | Room Status | `/pms/room-status` | Placeholder page renders (P4) | ✅ PASS |
| S7-10 | Night Audit | `/pms/night-audit` | Renders (see S4) | ✅ PASS |
| S7-11 | Revenue Dashboard | `/pms/revenue` | Renders (see S5) — note `sidebar-pms` not present on this page (F-04) | ✅ PASS |
| S7-12 | Reports/Insights links | 6 routes (S6) | All navigate | ✅ PASS |
| S7-13 | Aggregator Setup | `/aggregator/setup` | Configuration / Operational / Sync & Catalog / Category Timings tabs; Store ID `STORE_POS_ID_69` | ✅ PASS |
| S7-14 | JS errors during navigation | none | 0 `pageerror` events across 17 routes; no "Something went wrong" / NaN / undefined text | ✅ PASS |

**Step 7: 14/14 PASS ✅**

---

## Step 8 — Menu / Aggregator: Item Status Toggle + Bulk Edit

| # | Test Case | Expected | Actual | Result |
|---|---|---|---|---|
| S8-01 | Menu Management loads | Categories + 5 products | All Items 5; product cards with platform chips (Dine-In/Delivery/Takeaway/Inventory) | ✅ PASS |
| S8-02 | `status-toggle-224396` (nails) → Deactivate | Toast + Inactive badge | Toast "Deactivated — "nails" is now inactive."; card greyed with "Inactive" badge; title flips to "Activate" | ✅ PASS |
| S8-03 | Toggle back → Activate | Restored | Title "Deactivate" again | ✅ PASS |
| S8-04 | **Bulk Edit** toggle → grid | 12 columns, 5 rows, "No Changes" | `bulk-editor-grid` 5 rows grouped under SUBJECT ONE; Columns 12; Status/Type/Category filter strip; Excel/Import/Add Item/Validate Tax | ✅ PASS |
| S8-05 | Edit `cell-basePrice-224396` 13 → 14 → Save | Dirty count → save → toast | Button "Save 1 Change" → click → toast "Saved — 1 item saved successfully" → "No Changes"; grid shows 14 | ✅ PASS |
| S8-06 | Revert 14 → 13 → Save | Persisted | Saved; grid shows 13; "No Changes" | ✅ PASS |

**Step 8: 6/6 PASS ✅**

---

## Findings

**BLOCKER: 1 · MAJOR: 1 · MINOR: 3 · NOTE: 5**

| # | Finding | Severity | Evidence | Disposition |
|---|---|---|---|---|
| **F-02** | **PMS Checkout does not send room GST; Folio + Checkout drawer show balance excluding GST.** `PmsCheckoutDrawer.jsx:90` and `pmsService.getGuestFolio` both use `get-single-order-new`, whose `room_info.room_payment_summary` has **no `gst_tax`** and `remaining_room_balance` **excludes GST** (1000). `employee-orders-list` for the same order returns `gst_tax: 50, remaining_room_balance: 1050`. Result: (a) `roomGstTax` at `PmsCheckoutDrawer.jsx:157` = 0 → `room_gst_tax` never added to `order-bill-payment` payload (captured: `gst_tax:0, payment_amount:1000, grant_amount:1000`); (b) Folio "Total Balance Due ₹1,000" vs check-in "Total incl. GST ₹1,050"; (c) Night Audit `room_gst_collected: 0`. BUG-386 OD-386-02 (Option A) is silently ineffective — this was the deferred TC-386-04. | **BLOCKER** (money wrong — GST compliance) | S3-06, S3-08 payload capture; curl probes of both endpoints (order 1232382, 1232245, 1232314) | **Filed BUG-401.** FE-side fix candidate: read `room_info.gst_tax` (already the Q-364P-05 rule for folio) instead of `roomPaymentSummary.gstTax`. Balance display needs owner decision + backend brief (endpoint inconsistency; R6 forbids FE-computed totals). Bug Fix MANDATORY before Gate 6. |
| **F-01** | **Header "Add" button is covered by the search `<input>`.** `Header.jsx:351` input has `flex-1` inside a `w-48` container; input intrinsic min-width (271 px measured) overflows the 192 px box and lies over the Add button (`add-table-btn` x 1810–1886, input x 1623–1894, y 18–38 of button's 8–48). Pointer clicks on the button's centre band focus the search box instead of opening OrderEntry. Reproduced 3×; independent of viewport width (relative header layout). | **MAJOR** (core-flow entry point; workaround: click top/bottom 10 px edge or tap a table card) | S2-01 Playwright hit-target log; `elementFromPoint` = `INPUT search-input`; screenshot `s2_hdr` (search focused + "✕" over "Add") | **Filed BUG-400.** Likely 1-line fix (`min-w-0` on input or `overflow-hidden` on container) — Bug Fix MANDATORY before Gate 6. Owner to confirm on real browser during smoke. |
| F-03 | Backend stores `room_info.balance_payment` = FE-sent value **+ gst_tax again** (1232382: FE sends 1050 → BE 1100; 1232245: 8000+1440 → 10880; 1232314: → 120). Double-count on backend. FE no longer displays `balance_payment` (uses `remaining_room_balance`) so no UI impact today, but the stored figure is wrong. | NOTE (backend) | curl probes | Backend brief recommended (attach to BUG-401). |
| F-04 | Night Audit + Revenue Dashboard render without Sidebar shell or Back button — dead-end pages (browser Back only). Sibling PMS pages include Sidebar; precedent for shell-less exists (Aggregator Setup). Not specified in IA/design. | MINOR | S4-07, S5-07 screenshots | Owner decides: add Sidebar (consistent with PMS siblings) or Back link. |
| F-05 | Room Orders "Daily Room Revenue" Y-axis ticks collide: "₹1k ₹1k ₹1k ₹0k ₹0k" on sub-₹1k ranges. | MINOR (cosmetic) | S6-02 screenshot | Owner decides ship-or-fix (tick formatter precision). |
| F-06 | Revenue Dashboard fires the 7D `revenue-summary` request twice on mount (identical params). | NOTE (perf) | S5-06 network capture | Log only. |
| F-07 | In-House list shows guest "Noname" for r3/r5 (#1232245, #1232314) while dashboard/folio show "Test Guest GST"/"poi". `get-room-list` → `user.f_name = "Noname"` (backend placeholder user); FE renders faithfully. New QA guest displayed correctly. | NOTE (backend test data) | curl probe | Log only. |
| F-08 | Night Audit BE returns identical `room_revenue_collected 952.38` for 15-Sep and 14-Sep; `room_gst_collected 0`; executive occupancy 200 %. Pass-through per R6. | NOTE (backend) | S4-06 curl | Backend brief (BN-x) — attach to CR-363 notes. |
| F-09 | Registry: CR-363/364/366 still at `GATE 5A … Awaiting QA` (last status_history 2026-09-14). QA PASS from BATCH-01..09 not yet written back. Not drift vs handover; write-back pending. | NOTE (control) | registry.json spot-check | Control/Implementation agent to sync statuses post owner smoke. |
| F-10 | Automated `auto_frontend_testing_agent` unusable (12–15 s boot); all tests executed manually via Playwright scripts. | NOTE (process) | — | Log only. |

---

## Coverage

**Flows exercised:** Login/boot gate · Header Add · OrderEntry · CartPanel · CollectPaymentPanel (pay + print) · TableCard (Settle, Bill print) · CheckInPage (walk-in, GST strip, room picker gating) · InHouseGuestsPage · GuestFolioPage · PmsCheckoutDrawer (payload captured) · NightAuditPage (8 sections, date, Excel, PDF) · RevenueDashboardPage (presets, charts, tables) · RoomOrdersMockup · Sales Summary · DailySales · Items Ledger · Order Ledger · Order Report · Sidebar (11 PMS + 6 report + aggregator links) · AggregatorSetup · MenuManagement (ProductCard toggle, BulkEditor edit+save)

**Files touched by evidence:** Header.jsx · DashboardPage.jsx · OrderEntry.jsx · CartPanel.jsx · CollectPaymentPanel.jsx · TableCard.jsx · orderService.js · CheckInPage.jsx · pmsService.js · roomGstCalculator (via strip) · InHouseGuestsPage.jsx · roomListTransform.js · GuestFolioPage.jsx · folioTransform.js · PmsCheckoutDrawer.jsx · orderTransform.js · NightAuditPage.jsx · nightAuditTransform.js · RevenueDashboardPage.jsx · revenueTransform.js · Sidebar.jsx · App.js · RoomOrdersMockup.jsx · ProductCard.jsx · ProductList.jsx · BulkEditor.jsx · MenuManagementPanel.jsx

## Registry Spot-Check
```
CR-363 gate 5 IMPLEMENTED (2026-09-14) · CR-364 gate 5 IMPLEMENTED · CR-366 gate 5 IMPLEMENTED
BUG-386 "Gate 5b QA PASS … 1 NOTE (TC-386-04 deferred Gate 6)" · BUG-396 GATE_5B_QA_PASS
```
Result: **SYNCED** with handover state (no drift). QA-PASS write-back pending (F-09).

---

## QA Summary

```
Verification complete: BATCH-10 — Full Regression Smoke (8 critical-path steps, 56 test cases)
Result: FAIL — 53/56 PASS · 3 FAIL (1 BLOCKER root cause F-02 ×2 cases, 1 MAJOR F-01)
Blockers: F-02 PMS checkout omits room GST / folio balance excludes GST → BUG-401
Major:    F-01 Header Add button covered by search input → BUG-400
Minor:    F-04 no Sidebar/Back on Night Audit + Revenue · F-05 Room Orders axis ticks
Notes:    F-03, F-06, F-07, F-08, F-09, F-10
Coverage: 27 files / 20 flows exercised
Registry: SYNCED (QA-PASS write-back pending)
Report:   test_reports/QA_REPORT_BATCH10_2026_09_15.md
Next:     Bug Fix agent for BUG-401 (BLOCKER) + BUG-400 (MAJOR) → re-test S2-01, S3-06, S3-08 → Gate 6 Owner Smoke.
          MINOR F-04/F-05: owner to decide ship-or-fix.
```
