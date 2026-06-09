# Layer 3 — CR Registry

**Status:** POPULATED
**Last Updated:** 2026-06-08 (CR-014 IMPLEMENTED — 20 API endpoints wired, Gate 5 QA 100% pass, awaiting owner smoke)

---

## POS 2.0 CRs (Sprint closed 2026-05-09)

| CR ID | Title | Status | Files Touched | Notes |
|---|---|---|---|---|
| POS2-001 | Delivery charge / GST / web delivery lock | NOT STARTED | — | Possibly absorbed by shipped CRs |
| POS2-002 | Order origin / Scan&Order web pipeline | CLOSED — RESOLVED VIA CR | — | Owner-confirmed working & closed under a shipped CR (2026-05-31) |
| POS2-003 (main) | Print Agent Mapping | IMPLEMENTED + QA PASSED | orderTransform.js, OrderEntry.jsx | Awaiting live tenant smoke |
| POS2-003-FU-02 | printer_agent null on Collect Bill | IMPLEMENTED | CollectPaymentPanel.jsx | Awaiting live tenant smoke |
| POS2-003-REOPEN-A | Update/cancel printer_agent | IMPLEMENTED + WIRE QA PASSED | orderTransform.js, orderService.js | 29/29 wire cases pass |
| POS2-003-REOPEN-B | v1→v2 place-order revert | PARKED | — | Gated on backend behavioural-parity confirmation |
| POS2-004 | f_order_status=8 investigation | CLOSED (superseded) | — | Rolled into POS2-005 |
| POS2-005 | f_status=8 Hold/Audit reroute | IMPLEMENTED + QA PASSED | DashboardPage.jsx, OrderTable.jsx | Status columns exclude id:8 |
| POS2-005-FU §A | Collect-Bill hidden for status-8 | IMPLEMENTED | OrderTable.jsx | Code-walk PASS |
| POS2-005-FU §B | PG filter cross-tab | CLOSED — AS DESIGNED | — | Owner decision 2026-05-31: KEEP cross-tab (all tabs). POS2-006-PG-PAID-ONLY dropped (not needed) |
| POS2-006 | confirmOrderTone investigation | DEFERRED → POS 4.0 | — | Owner 2026-05-31: shift to next phase (3 owner Qs OW-Q1/OQ-2/OQ-4 to answer there) |
| POS2-007 Phase 1 | Confirm-order tone FE override | IMPLEMENTED + QA PASSED | DashboardPage.jsx, soundManager.js | — |
| POS2-008 Phase 2 | Backend-owned tone delivery | PLANNING COMPLETE | — | Backend owns implementation |

---

## POS 3.0 Bugs (Sprint closed ~2026-05-21)

| Bug ID | Title | Priority | Status | Files | Notes |
|---|---|---|---|---|---|
| BUG-087 | PayLater PAID badge | P0 | SHIPPED + VERIFIED | OrderEntry.jsx, CollectPaymentPanel.jsx | FE closed |
| BUG-088 | Room Transfer v2 endpoint | P1 | SHIPPED + VERIFIED | orderService.js, socketHandlers.js | v2 endpoint live |
| BUG-089 | Eliminate redundant API calls | P1 | SHIPPED + VERIFIED | socketHandlers.js | Dedup guard added |
| BUG-090 | CRM customer_id on room orders | P2 | BACKEND-BLOCKED | — | Q-090-B-1 open |
| BUG-091 | CRM search API duplicates | P2 | BACKEND-BLOCKED | — | CRM team must dedup |
| BUG-092 | Phone format contract | P2 | BACKEND-BLOCKED | — | Q-092-1: +91 vs raw 10? |
| BUG-093 | Room check-in date missing | P3 | BACKEND-BLOCKED | — | Backend must add field |
| BUG-094 | Delivery socket missing payload | P3 | BACKEND-BLOCKED | — | Q-094-1 open |
| BUG-095 | Socket handler + dead code cleanup | P2 | PLANNING COMPLETE | — | Prerequisites (088+089) green |
| BUG-096 | Realtime FE updates for menu | P1 | PARTIALLY IMPLEMENTED | constants.js | Socket event names unknown |
| BUG-097 | Delivery dispatch + assign rider | P1 | MAIN VERIFIED (smoke PASSED 2026-05-31); residuals → POS 4.0 | OrderCard, TableCard, deliveryService, AssignRiderModal, orderTransform, CartPanel | 25-row smoke PASSED (owner-attested). RESIDUALS carved to POS 4.0: CartPanel Collect-Bill gate (PARKED, owner A/B/C/D) + Bucket-5 rider socket events (backend-blocked) |
| BUG-098 | Profile CRM key | P1 | SHIPPED + VERIFIED | authTransform.js, crmAxios.js | FE closed |
| BUG-099 | QSR Quick Billing UX | P1 | SHIPPED + VERIFIED | CartPanel, OrderEntry, qsrModePrefs, StatusConfigPage | Owner smoke PASS |
| BUG-100 | Remove duplicate toasts | P1 | SHIPPED + VERIFIED | Multiple components | 11 duplicates removed |
| BUG-101 | Print template delivery GST slot | P3 | BACKEND-BLOCKED | — | Q-101-1: backend must add template slot |
| BUG-102 | Mark Served/Ready button delay | P0 | SHIPPED + VERIFIED | OrderCard, TableCard | 8s→immediate+2s fallback |
| BUG-103 | Remove number input arrows | P2 | SHIPPED + VERIFIED | index.css | Global CSS rule |
| BUG-104 | Credit/Tab Management module | P1 | OWNER SCOPE NEEDED | — | Phase 2A shipped; full scope awaiting owner |
| BUG-105 | Settlement module | P1 | OWNER SCOPE NEEDED | — | No route, no sidebar entry, no APIs |
| BUG-106 | CRM Notes API | P2 | CRM-BLOCKED | — | CQ-CR-01/02 open |
| BUG-107 | CRM Insights API | P2 | CRM-BLOCKED | — | CQ-CR-03/04 open |
| BUG-108 | CRM Coupon/Loyalty/Wallet | P1 | CRM-BLOCKED → PARTIAL | CollectPaymentPanel, couponService, loyaltyTransform | Coupon V1-V3 + Loyalty shipped; P1 backend defect open |

---

## POS 3.1 CRs (Active since 2026-05-27)

| CR ID | Title | Status | Files Touched | Notes |
|---|---|---|---|---|
| BUG-109 | QSR takeaway/delivery validation parity | SHIPPED + VERIFIED | CartPanel.jsx | — |
| BUG-110 | QSR prepaid lock parity | SHIPPED + VERIFIED | CartPanel.jsx | — |
| BUG-111 P1+P2 | Grand Total + server-driven breakdown | SHIPPED + VERIFIED | CartPanel.jsx, OrderEntry.jsx | — |

---

## CRM 2.0 CRs (Active since 2026-05-26)

| CR ID | Title | Status | Files Touched | Notes |
|---|---|---|---|---|
| CR-001 | Customer Notes Suggestion | SUBSUMED into CR-002 | — | Legacy GETs never called |
| CR-002 | Cross-Sell + Customer Intelligence | CLOSED — OWNER VERIFIED | 4 new + 4 modified | T-28/T-29 live regression PASS (2026-05-31); order_note/food_level_notes unchanged, no stray fields, OG-06 clean |
| CR-003 | Tab | NOT_STARTED | — | — |
| CR-004 | Up-sell | NOT_STARTED | — | Blocked: server `feature_flags.upsell=false` |
| CR-005 | Wallet | NOT_STARTED | — | Deferred from BUG-108 |
| CR-006 | Item-level Notes | SUBSUMED into CR-002 | — | — |
| CR-007 | Order-level Notes | SUBSUMED into CR-002 | — | — |
| CR-008 | Integrations | NOT_STARTED | — | Scope TBD |
| CR-009 | BUG-108 Carryover | NOT_FORMALIZED | — | Items listed in CRM 2.0 README |

---

## Standalone CRs

| CR ID | Title | Status | Files Touched |
|---|---|---|---|
| Audit Report Optimization | Transform rewrite + dual-mode sheet | SHIPPED | reportTransform, reportService, OrderDetailSheet, FilterBar, FilterTags, AllOrdersReportPage |
| Order Activity Log | Chronological activity feed per order | REGISTERED, NOT STARTED | — |
| PROD-HOTFIX-006 | Takeaway print: custPhone empty → bill missing customer info | INTAKE | orderTransform.js (buildBillPrintPayload) or backend template |
| PROD-HOTFIX-007 | Loyalty "earn points" not displayed on Collect Bill | INTAKE | CollectPaymentPanel.jsx, loyaltyTransform.js |
| PROD-HOTFIX-008 | Manual KOT/Bill print: custName & custPhone NULL | CLOSED — OWNER VERIFIED | orderService.js (+2 lines) |
| PROD-HOTFIX-007 | Loyalty "earn points" display on Collect Bill | CLOSED — OWNER VERIFIED | loyaltyTransform.js (+3), CollectPaymentPanel.jsx (+5) |
| **DEV-DASHBOARD-001** | Internal dev control dashboard (v1.0 + v1.1) | **CLOSED — OWNER VERIFIED** | **`/app/frontend/public/__dev/**` (NEW, isolated), `/app/scripts/gen_dev_dashboard_config.js` (NEW). Zero touch to /src/.** |
| **AUDIT-CLOSURE-DRIFT-001** | Reconcile 44 stale-INTAKE bugs + add Artifact References column to dashboard (v1.2) | **CLOSED — OWNER VERIFIED** (G-2 smoke PASSED 2026-05-31) | **`BUG_TRACKER.md` reconciled · `BUG_TEMPLATE.md` superseded-banner · `/__dev/data/*.json` regenerated · `/__dev/dashboard.js` +ArtifactRefsSection. Zero touch to /src/.** |
| **CR-011-AUDIT-01** | **Frontend Business Logic Audit Gate** (S5 Item Sales Hybrid) — surfaces every piece of FE-coded business logic for explicit owner approval; data integrity check; export gate blocks XLSX/PDF until RED + AMBER cleared and REVIEW items approved. **Mission/Gate Condition: every row on S5 must be GREEN (zero RED + zero AMBER + zero REVIEW) — only then S5 can be FROZEN.** | **SHIPPED + 2026-06-04 session: 3-block drift classification (OVER TAXED / TAX NOT COMPUTED / GST NOT CONFIGURED). FE-58 cancelled false-positive fix. FE-61 May-22 exemption policy. Net drift: 111→15 actionable orders.** 61 rules total; 19 decided (15 approved FE-14/15/16/17/48/49/50/51/52/56/57/58/59/60/61 + 4 rejected FE-27/43/02/13); 42 REVIEW pending. | **Parent:** CR-011. **Manifest:** `auditManifest.js` (61 entries). **Governs:** Protocol §8. |

| **CR-011-ROOM** | **Insights Room Orders Report — PMS + POS historic room revenue screen.** Date-range room report (From-To, S5/S6 pattern) with KPI strip (room-only revenue), visual charts, tabs (All/Paid/Unpaid), expandable rows (Room Billing + Associated Orders), Excel/PDF export. **Gate ④ wired but 3 issues open:** (1) header not matching S5/S7, (2) ReportLoadingShield props wrong, (3) N+1 getSingleOrderRoom → must replace with single-call (room_info from wrapper + SRM grouping). See handover: `NEXT_AGENT_HANDOVER_2026_06_06_S_ROOM_GATE4.md`. | **✅ FROZEN 2026-06-06** | `RoomOrdersMockup.jsx`, `roomOrdersService.js`, `Sidebar.jsx`, `App.js` |

| **CR-013** | **Food Court Report — Station-wise Order Breakdown.** New custom report screen (route: `/reports-module/food-court`). Layout clones Order Ledger (S6): S7 header, flat table, KPI strip, TOTAL row, search, column chooser, side-sheet drill, Excel/PDF export. **One new top-level filter: Station dropdown** (one station at a time). Each order row shows only the selected station's items (name, qty, price), subtotal, GST, total. Data: `order-logs-report → order_details_table[].station_name`. Tabs: All / Settled. Sidebar entry under Insights. | **✅ FROZEN 2026-06-07** | `foodCourtService.js`, `FoodCourtMockup.jsx` |
| **CR-013-AUDIT** | **Food Court Audit Tab — Station × Time Bucket Cross-Tabulation.** New "Audit" tab within Food Court report (CR-013). Pivot grid: rows = order IDs, columns = one per station + TOTAL + DRIFT. 5 metrics: Item Total, Discount, Sub Total, Tax, Total. Proportional distribution formula. Cancelled item tax exclusion. UNASSIGNED station column. | **✅ FROZEN 2026-06-07** | `FoodCourtMockup.jsx` |
| **CR-014** | **Menu Management API Migration — Switch from Product API to Menu Management API.** Phase 1: 20 endpoints wired (food CRUD, category CRUD, addon CRUD, station, reorder). Phase 2: Inline Bulk Editor — spreadsheet-style grid with 33 editable columns across 4 tiers, column picker, category grouping A→Z, batch parallel save (5 concurrent), Add Item, dirty-cell tracking. `item_type` mapping (0=NV,1=Veg,2=Egg,3=Jain). Order-taking untouched. | **CLOSED — OWNER VERIFIED (2026-06-08). Phase 1 Gate 5 QA 100%. Phase 2 QA 11/11 passed. Phase 2B (Excel import/export) deferred.** | `menuManagementService.js`, `menuManagementTransform.js`, `MenuManagementPanel.jsx`, `CategoryList.jsx`, `ProductList.jsx`, `ProductCard.jsx`, `ProductForm.jsx`, `BulkEditor.jsx` (NEW) |
| **CR-015** | **Settlement Module — Day-Closing / Cash Settlement.** Dashboard slide-over panel (same pattern as Menu Management). 5 KPI cards (Opening Balance, Cash Collected, Settled, Remaining, Pilferage). Per-waiter table (9 cols, expandable rows: Revenue/Tips/Cash Drawer). Modals: Settle (Full/Partial + auto-pilferage), Opening Balance, Transfer (backend-blocked placeholder). Self-Settle, Close Day. 5 APIs wired. Backend escalation: `/waiter/cash-transfer` does not exist (404). | **CLOSED — OWNER VERIFIED (2026-06-09). QA: 14/14 (page) + 9/9 (panel) passed.** | `SettlementPanel.jsx` (NEW), `settlementService.js` (NEW), `settlementTransform.js` (NEW), `DashboardPage.jsx`, `Sidebar.jsx`, `App.js` |
| **CR-016** | **Settlement History — Insights Module.** Date-range settlement history report under Insights sidebar. Summary table (one row per day), drill-down to per-waiter detail, KPI strip across range, Excel/PDF export. Depends on CR-015 + existing `get-settlement-report` API. | **CLOSED — OWNER VERIFIED (2026-06-09). 7/7 gates. 20/20 QA. Post-smoke fix: hide zero-activity days + inactive waiters.** | `SettlementReportMockup.jsx`, `settlementReportService.js`, `settlementReportTransform.js`, `Sidebar.jsx` (+1 line), `App.js` (+3 lines) |
| **BUG-120** | **CR-014 Menu Mgmt Post-Delivery Bugs (5 sub-items).** A: Input focus loss (components inside render). B: Image upload path documentation. C: Variation CRUD UI + 8-section form redesign. D: 6 API fields wired (is_inventory, packed_food, stock_out, is_disable, tax_calc, portion_size). E: Socket→MenuContext validation. | **ALL CLOSED (2026-06-09). A: fixed. B: documented. C: shipped. D: shipped. E: validated (edit works, status/delete/reorder socket pending backend — FE ready).** | `ProductForm.jsx` (rewritten), `ProductCard.jsx`, `BulkEditor.jsx`, `menuManagementTransform.js` |
| **BUG-121** | **Category item count shows 0 + post-save refresh.** A: Categories API has no products_count field — derived from foods array. B: Race condition on post-save refresh — 500ms delay added. | **CLOSED — OWNER VERIFIED (2026-06-09).** | `MenuManagementPanel.jsx`, `ProductList.jsx` |
| **CR-017** | **WhatsApp Payment Link — Send Razorpay Payment Link to Customer via WhatsApp.** Send Razorpay payment link to customer phone via WhatsApp/SMS. Modal on OrderCard (unpaid orders). Auto-populates customer name/phone. Backend: `/api/v1/razor-pay/payment-link` (creates or reuses Razorpay link, triggers WhatsApp via `razoar_payment_with_url` template). | **IMPLEMENTED (Gates 0–5 complete). Awaiting owner smoke (Gate 6).** | `WhatsAppPaymentModal.jsx` (NEW), `paymentLinkService.js` (NEW), `OrderCard.jsx`, `constants.js` |
| **CR-018** | **Schedule Order — Place orders for future date/time.** Cashier can schedule an order for a future date/time via checkbox + 15-min interval picker in CartPanel (next to KOT/Bill). Payload keys `scheduled=1` + `schedule_at` already exist in `orderTransform.js` (hardcoded 0/null). Dine-In + TakeAway + Walk-In only. Scheduled orders get badge on OrderCard, own column in Status View. API tested: backend saves correctly but **scheduled orders not in running orders API (escalation filed)**. | **IMPLEMENTED (Gates 0–5 complete). Awaiting owner smoke (Gate 6). Backend escalation (running orders API) non-blocking for FE.** | `orderTransform.js`, `OrderEntry.jsx`, `CartPanel.jsx`, `OrderCard.jsx`, `ScanOrderPopOut.jsx`, `DashboardPage.jsx` |
| **BUG-122** | **POS orders with fOrderStatus 7 incorrectly trigger ScanOrderPopOut popup.** Predicate uses `fOrderStatus === 7` as web-origin proxy, but backend can assign status 7 to POS orders. Fix: popup only when `isWebOrder === true`. POS fOrderStatus 7 orders show as normal OrderCard with tick (✓) button (no Reject). Tick advances status per `def_ord_status` config. | **IMPLEMENTED (Gates 0–5 complete). Awaiting owner smoke (Gate 6).** | `ScanOrderPopOut.jsx`, `OrderCard.jsx` |

---

## Phase 3 CRs

| CR ID | Title | Status | Blocker |
|---|---|---|---|
| UX-LOADING-02 | Parallel API loading + visible station progress | NEEDS_OWNER_DECISION | Awaiting A1/A2/A3 + B1/B2/B3 pick |

---

## Cross-Sprint Dependency Flags

| File | Sprints | Risk |
|---|---|---|
| `OrderEntry.jsx` | POS 3.1 + CRM 2.0 | HIGH — both modified in same week |
| `CartPanel.jsx` | POS 3.1 + BUG-099 (POS 3.0) | MEDIUM |
| `CollectPaymentPanel.jsx` | BUG-108 (CRM) + potential financial rule fixes | MEDIUM |
