# Layer 3 — CR Registry

**Status:** POPULATED
**Last Updated:** 2026-07-15 (INTAKE drift reconciliation: synced registry.json + CR_REGISTRY.md from `settle` branch → `15-july`. CR-069/070/071 now registered locally. CR-054 formally added to registry.json (was in CR_REGISTRY.md only). Remaining gaps documented — see §Reconciliation Audit below.) 2026-07-04 (Batch intake: CR-055 OrderCard served-items invert, CR-056 scan-popup toggle, CR-057 "No Tax" option + tax-model doc [CRITICAL/R6] — registered from owner batch report covering 13 items; 10 bugs BUG-140…BUG-149 registered in BUG_TRACKER; all 13 in registry.json.) 2026-06-12 (Planning session: 11 items registered — CR-037…CR-043 + BUG-130…BUG-133. Deep implementation plans complete for BUG-132 (settlement formula, 5 micro-phases) + Phase 1 Sidebar Sweep + Phase 2 Boot Optimization + Phase 3 Credit Total Wire. Phase 4 impact analysis complete. Zero code — planning only. Handover: `memory/handover/SESSION_HANDOVER_2026_06_12_PLANNING.md`.) 2026-06-12 (CR-036-FU-03 Gate 3 COMPLETE — F3 tax-required validation when `restaurant.tax.gstStatus === true` with packed-item exemption (`packedFood === "Yes"`); N1 backdrop loader overlay during isLoading/import/export + data-loss race guard via `pendingImport` state + import-confirmation Dialog. `profileTransform.js` extended to expose `gstStatus` via `api.gst_status === true` defensive check. 8 new tests pass; 35/35 menu tests pass across CR-027 P3 + CR-036 + FU-01 + FU-02 + FU-03; CR-027 P3 test file patched with useRestaurant mock for regression. F1 (Type no-default) PARKED. Awaiting owner Gate-4 smoke + live DevTools verification of `/profile` gst_status field path.) 2026-06-12 (CR-036-FU-02 Gate 3 COMPLETE — F4 column-order swap + N2 itemUnit Tier-4→Tier-1 promotion with label "Sold By (Unit)"; 4 new tests pass; 23/23 total pass in BulkEditor.cr036.test.jsx. CR-036-FU-03 still in deep-planning, paused per owner — F1 parked, F3 tax-required validation when gst_status=true with packed-item exemption, N1 backdrop overlay + data-loss race fix.) 2026-06-12 (Session 2026-06-12 PM closed: ① CR-029-QSR Gate 3 COMPLETE — round_up persistence on BILL_PAYMENT + QSR category-id/name parity, 11 new unit tests pass; ② CR-036 Gate 3 + Gate 4 owner-confirmed via live screenshot — Add Item top-pinned row works as designed; ③ CR-036-FU-01 spawned + Gate 3 COMPLETE same day — descriptive validation toast + red border on failing row + Name input focus + Trash2 delete icon for `_isNew` rows, 12 new unit tests pass + 4/4 CR-027 P3 regression intact; production screenshot evidence captured 2026-06-12 20:57 IST showing toast "Row 1 — Name is required. +2 more on this row. 1 more row needs attention.") 2026-06-12 (CR-036 Gate 3 COMPLETE: 7/7 unit tests + 4/4 CR-027 P3 regression pass; CR-036-FU-01 Gate 3 COMPLETE: validation UX polish — specific toast + red border + focus + Trash2 delete, 10 new tests added; awaiting owner Gate-4 smoke on both.) 2026-06-12 (CR-036 Bulk Editor Add-Item Row Visibility imported from `gh/menu-bug` — originally drafted as CR-030 on that branch, renumbered to CR-036 to avoid collision with shipped Reports CR-030. Gates 1+2 complete, Gate 3 awaiting owner GO.) 2026-06-11 (CR-033 CLOSED per owner directive after 2-restaurant formula validation; CR-029/CR-032 rows synced to GO-2 shipped state. Earlier: Insights-audit batch CR-029…CR-033 registered, Gates 0-2 complete — see section below. Earlier same-day: baseline consolidation sync: CR-020…CR-027 registered; CR-021/022/023/024 CLOSED; ID collisions resolved — Toast CR→CR-027, 401-redirect bug→BUG-123, socket-payload bug→BUG-124; CR-026 retro-registered. CR-028 Item-Level Discount registered — intake complete, no code.)

---

## Insights Cross-Report Audit CRs (registered 2026-06-11, Gates 0-2 complete)

Source: `INSIGHTS_REPORTS_AUDIT.md` (cafe103) + `INSIGHTS_REPORTS_AUDIT_PALMHOUSE.md` (palmhouse). Sibling bugs: BUG-125…BUG-129 (see Bug Tracker).

| CR ID | Title | Priority | Status | Gate | Blocker |
|---|---|---|---|---|---|
| CR-029 | Room food included in ALL reports (owner-ruled) + Room Bill bucket | P1 | **CLOSED — OWNER VERIFIED (2026-06-13)** | ✅ | — |
| **CR-029 (QSR)** | **QSR Payload Parity + `round_up` Persistence on Collect Bill.** SHARES the bare number "CR-029" with the Reports CR above (imported from `gh/menu-bug` source branch — file path: `change_requests/CR_029_QSR_PAYLOAD_PARITY_AND_ROUND_UP.md`; tests + in-code comments reference "CR-029"). Distinct scope: G1 `round_up: 0` hardcoded → real numeric via `paymentData.roundOff` (BILL_PAYMENT); G2 thread `roundOff` from UI; G3 QSR `discount_member_category_id/name` propagation (Full Mode mirror, BUG-114 parity). Owner decision: QSR mirrors Full Mode for reporting parity. | **GATE 3 COMPLETE 2026-06-12 (11/11 unit tests pass; regression 214/216 with 2 pre-existing baseline failures unrelated).** Awaiting owner Gate-4 smoke on preprod. | `orderTransform.js` (+12/-1), `CollectPaymentPanel.jsx` (+4), `CartPanel.jsx` (+15/-2), test `cr029.roundUp.test.js` (+163) |
| CR-030 | Revenue by collection date (R1) + TAB out/settlements in (H5) + labels | P1 | **CLOSED — OWNER VERIFIED (2026-06-13)** | ✅ | — |
| CR-031 | One cancellation truth: line value, qty, cancel_at, ops-amount override | P2 | **CLOSED — OWNER VERIFIED (2026-06-13)** | ✅ | — |
| CR-032 | Shared payment classifier + 3 chart groups (order/Credit/Room Bill) | P2 | **CLOSED — OWNER VERIFIED (2026-06-13)** | ✅ | — |
| CR-033 | Settlement 'total sale' basis definition + reconciliation | P1 | **CLOSED 2026-06-11 (owner directive: "u can close this CR")** — formula derived + validated on 2 restaurants: `total_sale = paid_revenue − TAB settled + TAB punched`. rid 474: 92/92 days exact ₹0 residue (incl. room rent property — folio/advance/checkout NOT included, H31 answered). rid 541: 27/31, ₹2,304 residue on 4 days. Interim honesty footnote SHIPPED (H30 — 3 surfaces). Residual backend confirmation + rid-541 residue explanation tracked as BACKEND_BRIEF_FINAL_2026_06_11.md §1 (non-blocking, hygiene). Owner returning with backend answers; reopen only if backend contradicts the formula | CLOSED | — |
| CR-034 | Items & Menu Ledger-style buckets (Sold/Credit/Cancelled/Pending) | P1 | **CLOSED — OWNER VERIFIED (2026-06-13)** | ✅ | — |
| CR-035 | Report Definitions help page (static) + ⓘ header links on 5 screens | P3 | **CLOSED — OWNER VERIFIED (2026-06-13)** | ✅ | — |

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

| **CR-011 Phase 3** | **28 Insights Report Screens (S11–S38).** Daily Sales, Hourly, Day-of-Week, Channel Pivot, Variations, Addons, Comp Detail, By Station, Cashier Settlement, Gateway Recon, Tips, Round-Off, Tax Detail, Tax Slabs, Inclusive/Exclusive, Discounts, Coupons, Cancel Detail, Table Sales, Delivery Charges, Room Transfers, Server Performance, Cashier Activity, Audit Log, Order Notes, Customer RFM, Guest vs Registered, KOT Variance. All wired to 9 live backend endpoints. | **Gate ①+④ COMPLETE — 28/28 verified with cafe103 May 2026. Awaiting owner Gate ②③. 5 FE-only fixes from owner feedback IMPLEMENTED + QA PASSED (2026-06-17): F-1 variation label, F-2 breakfast KPI, F-5 By Station removal, F-6 payment charts removal, F-10 Room Transfer gating.** | 24 new .jsx files + 4 tabs in S5 + insightsService.js + constants.js + App.js. Screenshots: `/downloads/CR011_Phase3_Screenshots_cafe103_May2026.zip` |. Screenshots: `/downloads/CR011_Phase3_Screenshots_cafe103_May2026.zip` |

| **CR-013** | **Food Court Report — Station-wise Order Breakdown.** New custom report screen (route: `/reports-module/food-court`). Layout clones Order Ledger (S6): S7 header, flat table, KPI strip, TOTAL row, search, column chooser, side-sheet drill, Excel/PDF export. **One new top-level filter: Station dropdown** (one station at a time). Each order row shows only the selected station's items (name, qty, price), subtotal, GST, total. Data: `order-logs-report → order_details_table[].station_name`. Tabs: All / Settled. Sidebar entry under Insights. | **✅ FROZEN 2026-06-07** | `foodCourtService.js`, `FoodCourtMockup.jsx` |
| **CR-013-AUDIT** | **Food Court Audit Tab — Station × Time Bucket Cross-Tabulation.** New "Audit" tab within Food Court report (CR-013). Pivot grid: rows = order IDs, columns = one per station + TOTAL + DRIFT. 5 metrics: Item Total, Discount, Sub Total, Tax, Total. Proportional distribution formula. Cancelled item tax exclusion. UNASSIGNED station column. | **✅ FROZEN 2026-06-07** | `FoodCourtMockup.jsx` |
| **CR-014** | **Menu Management API Migration — Switch from Product API to Menu Management API.** Phase 1: 20 endpoints wired (food CRUD, category CRUD, addon CRUD, station, reorder). Phase 2: Inline Bulk Editor — spreadsheet-style grid with 33 editable columns across 4 tiers, column picker, category grouping A→Z, batch parallel save (5 concurrent), Add Item, dirty-cell tracking. `item_type` mapping (0=NV,1=Veg,2=Egg,3=Jain). Order-taking untouched. | **CLOSED — OWNER VERIFIED (2026-06-08). Phase 1 Gate 5 QA 100%. Phase 2 QA 11/11 passed. Phase 2B (Excel import/export) deferred.** | `menuManagementService.js`, `menuManagementTransform.js`, `MenuManagementPanel.jsx`, `CategoryList.jsx`, `ProductList.jsx`, `ProductCard.jsx`, `ProductForm.jsx`, `BulkEditor.jsx` (NEW) |
| **CR-015** | **Settlement Module — Day-Closing / Cash Settlement.** Dashboard slide-over panel (same pattern as Menu Management). 5 KPI cards (Opening Balance, Cash Collected, Settled, Remaining, Pilferage). Per-waiter table (9 cols, expandable rows: Revenue/Tips/Cash Drawer). Modals: Settle (Full/Partial + auto-pilferage), Opening Balance, Transfer (backend-blocked placeholder). Self-Settle, Close Day. 5 APIs wired. Backend escalation: `/waiter/cash-transfer` does not exist (404). | **CLOSED — OWNER VERIFIED (2026-06-09). QA: 14/14 (page) + 9/9 (panel) passed.** | `SettlementPanel.jsx` (NEW), `settlementService.js` (NEW), `settlementTransform.js` (NEW), `DashboardPage.jsx`, `Sidebar.jsx`, `App.js` |
| **CR-016** | **Settlement History — Insights Module.** Date-range settlement history report under Insights sidebar. Summary table (one row per day), drill-down to per-waiter detail, KPI strip across range, Excel/PDF export. Depends on CR-015 + existing `get-settlement-report` API. | **CLOSED — OWNER VERIFIED (2026-06-09). 7/7 gates. 20/20 QA. Post-smoke fix: hide zero-activity days + inactive waiters.** | `SettlementReportMockup.jsx`, `settlementReportService.js`, `settlementReportTransform.js`, `Sidebar.jsx` (+1 line), `App.js` (+3 lines) |
| **BUG-120** | **CR-014 Menu Mgmt Post-Delivery Bugs (5 sub-items).** A: Input focus loss (components inside render). B: Image upload path documentation. C: Variation CRUD UI + 8-section form redesign. D: 6 API fields wired (is_inventory, packed_food, stock_out, is_disable, tax_calc, portion_size). E: Socket→MenuContext validation. | **ALL CLOSED (2026-06-09). A: fixed. B: documented. C: shipped. D: shipped. E: validated (edit works, status/delete/reorder socket pending backend — FE ready).** | `ProductForm.jsx` (rewritten), `ProductCard.jsx`, `BulkEditor.jsx`, `menuManagementTransform.js` |
| **BUG-121** | **Category item count shows 0 + post-save refresh.** A: Categories API has no products_count field — derived from foods array. B: Race condition on post-save refresh — 500ms delay added. | **CLOSED — OWNER VERIFIED (2026-06-09).** | `MenuManagementPanel.jsx`, `ProductList.jsx` |
| **CR-017** | **WhatsApp Payment Link — Send Razorpay Payment Link to Customer via WhatsApp.** | **CLOSED — OWNER VERIFIED (2026-06-13).** | `WhatsAppPaymentModal.jsx` (NEW), `paymentLinkService.js` (NEW), `OrderCard.jsx`, `constants.js` |
| **CR-018** | **Schedule Order — Place orders for future date/time.** | **CLOSED — OWNER VERIFIED (2026-06-13).** | `orderTransform.js`, `OrderEntry.jsx`, `CartPanel.jsx`, `OrderCard.jsx`, `ScanOrderPopOut.jsx`, `DashboardPage.jsx` |
| **BUG-122** | **POS orders with fOrderStatus 7 incorrectly trigger ScanOrderPopOut popup.** Predicate uses `fOrderStatus === 7` as web-origin proxy, but backend can assign status 7 to POS orders. Fix: popup only when `isWebOrder === true`. POS fOrderStatus 7 orders show as normal OrderCard with tick (✓) button (no Reject). Tick advances status per `def_ord_status` config. | **CLOSED — OWNER VERIFIED (2026-06-10).** | `ScanOrderPopOut.jsx`, `OrderCard.jsx` |
|| **BUG-122 Post-Delivery (3 FE fixes)** | | **CLOSED — OWNER VERIFIED (2026-06-13).** | `OrderCard.jsx`, `TableCard.jsx`, `CartPanel.jsx` |
|| **CR-019** | **Restaurant Settings — Self-Onboarding Setup Wizard.** | **CLOSED — OWNER VERIFIED (2026-06-13). QA: 18/18 passed.** | `RestaurantSettingsPage.jsx` (NEW), `restaurantSettingsService.js` (NEW), `restaurantSettingsTransform.js` (NEW), `App.js`, `Sidebar.jsx` |
|| **CR-020** | **Restaurant Settings Wizard — Bug Sweep (15 bugs B1–B15).** | **CLOSED — OWNER VERIFIED (2026-06-13). DEBUG-B11 logs removed.** | `restaurantSettingsTransform.js`, `restaurantSettingsService.js`, `RestaurantSettingsPage.jsx`, `OrderEntry.jsx`, `profileTransform.js` |
|| **CR-021** | **Collect Bill — Split/Partial Payment Defects (B1–B4) + prepaid parity.** B1: `partial_payments[]` attached whenever `splitPayments.length>0` + `payment_mode/payment_method: "partial"` on both postpaid (`orderTransform.js:1364/1440`) and prepaid (`:1155/1222`); B2: split amounts clear when effectiveTotal changes (`CollectPaymentPanel.jsx:668`, BUG-113 contract respected); B3: Card TxnID required only when card amount>0 (`:3082`); B4: Pay disabled when Σ split < total (`:3083`). | **CLOSED — OWNER VERIFIED 2026-06-11 (ruling R1: smoke covered both postpaid + prepaid flows).** | `orderTransform.js`, `CollectPaymentPanel.jsx` |
|| **CR-022** | **Menu Management — Food Type Filters.** Non-Veg filter caught Jain items (boolean decomposition flaw). Fix: enum-based filter on raw `item_type` 0/1/2/3 + `Number()` coercion in transform. | **CLOSED — Owner QA passed 2026-06-10.** | `ProductList.jsx`, `menuManagementTransform.js` |
|| **CR-023** | **Bulk Editor — Typing Lag (422 items).** Per-keystroke full-table re-render (~13k dirty comparisons + 4,220 cell renders). Fix: `LocalTextInput` (local state, flush on blur) + `React.memo(CellRenderer)` + auto-blur on Save. | **CLOSED — OWNER VERIFIED 2026-06-11 (ruling R2).** | `BulkEditor.jsx` |
|| **CR-024** | **Channel Visibility Override.** Bug A CLOSED-NOT-A-BUG (raw booleans correct per backend int schema). Bug B: StatusConfigPage filters channel cards by API `features` (3 render spots), stale-channel clean on save, default override OFF. | **CLOSED — Owner QA passed 2026-06-11.** | `StatusConfigPage.jsx`, `DashboardPage.jsx`, `restaurantSettingsTransform.js` |
|| **CR-025** | **Discount Payload Fix (P0 — money).** | **CLOSED — OWNER VERIFIED (2026-06-13).** | `orderTransform.js` |
|| **CR-026** | **Report Data & Rounding Sweep.** | **CLOSED — OWNER VERIFIED (2026-06-13).** | `reportTransform.js`, `orderLedgerService.js`, `creditService.js`, `CreditManagementPanel.jsx`, `OrderDetailSheet.jsx` + 11 report files |
|| **CR-027** | **Unified Toast & Error Surfacing (renumbered from CR-025 on 2026-06-11 — ID collision, ruling R3).** 168 toast calls / 28 files; 3-phase rollout locked (interceptor → mechanical conversion → BulkEditor error trail). Decisions A–D + OD-1/3/4 locked; OD-2 (TOAST_LIMIT) + OD-5 (bootstrap policy) parked. | **REGISTERED — READY FOR GATE 6 (Code). NOT STARTED — carried to next sprint.** | `axios.js` + 27 component files (planned) |
|| **BUG-123** | **Place Order on 401 silently redirects to dashboard (renumbered from BUG-120 on 2026-06-11 — ID collision, ruling R3).** Fire-and-forget HTTP + socket-wait timeout + `window.location.href` bounce; toast missable, cart lost. Affects Place Order, Collect Bill, Transfer, Update Order. | **OPEN INTAKE (P1) — next sprint.** | — |
|| **BUG-124** | **Backend `food_update_${rid}` socket payload missing critical fields (renumbered from BUG-121 on 2026-06-11 — ID collision, ruling R3).** FE defended via `SOCKET_FOOD_DEFAULTS` backfill. Backend must enrich payload. | **OPEN — BACKEND-BLOCKED (P2). FE defence shipped (`socketHandlers.js`).** | `socketHandlers.js` (defence) |
|| **CR-028** | **Item-Level Discount — payload + `give_discount` exclusion (P1, money).** All 5 gaps CLOSED. `distributeItemDiscounts()` in orderTransform.js (largest-remainder distribution). `giveDiscount` mapped in productTransform.js. `discountableTotal` in CollectPaymentPanel + CartPanel (QSR). Per-item GST recomputation on post-discount base. Coupon item/category/BOGO distribution. All OD-1…OD-12 answered. | **CLOSED — OWNER VERIFIED (2026-06-15, retroactive — code present on 15-june branch).** | `orderTransform.js` (+distributeItemDiscounts), `productTransform.js` (+giveDiscount), `CollectPaymentPanel.jsx` (+discountableTotal, +coupon rejection), `CartPanel.jsx` (+QSR discountableTotal), `OrderEntry.jsx` (+adaptProduct giveDiscount), `ProductCard.jsx` |
|| **CR-036** | **Bulk Editor — Add Item Row Visibility (Top-Pinned, Empty Category, Auto-Focus).** Imported from `gh/menu-bug` 2026-06-12 (originally drafted as **CR-030** on that branch; renumbered to **CR-036** to avoid collision with shipped Reports CR-030). UX bug: clicking `+ Add Item` adds a row to React state but `groupedRows` re-sorts alphabetically by category — new row lands off-screen with no auto-scroll. Scope locked by owner: new row at #1, no default category ("Select category…" placeholder), auto-focus on Name input, scroll-to-top, always visible regardless of search filter, validation errors → toast only. ~29 lines, single file (`BulkEditor.jsx` + minor `CellRenderer` tweak). P2 — UX only, no money/data impact. Adjacent observation flagged for future: Category cell shows `—` for all rows → future CR. | **GATE 3 COMPLETE 2026-06-12 (7/7 unit tests pass + 4/4 CR-027 Phase 3 regression pass). GATE 4 OWNER-CONFIRMED 2026-06-12 (live preprod screenshot — top-pinned new rows visible + auto-focus working). FU-01 spawned same-day for validation UX polish (see CR-036-FU-01 below).** | `BulkEditor.jsx` (+55/-6); test: `BulkEditor.cr036.test.jsx` (+163, 7 tests) |
|| **CR-036-FU-01** | **Bulk Editor — Validation UX (specific error toast + focus + red border + Trash2 delete).** Follow-up to CR-036 surfaced during owner Gate-3 smoke testing 2026-06-12. Gap 1: validation toast says "N items have errors" but doesn't surface WHICH row or WHICH field — `validateRow` computes per-row errors but `handleSave` discards them. Gap 2: `_isNew` rows use `RotateCcw` icon (reads as "undo edits"), no clear destructive affordance. Scope locked: per-row `_validationErrors` state + red border (`red-500` saturated) + red cell tint + scroll/focus to first failing row + descriptive toast ("Row 1 — Name is required. +1 more row needs attention.") + `Trash2` icon (red) for `_isNew` rows. ~50 lines, single file. Owner decisions: OQ-1 YES auto-scroll for existing invalid rows via `scrollIntoView`, OQ-2 footer pluralization pattern, OQ-3 distinct border intensities (`red-500` validation vs `red-400` save-error), OQ-4 no delete animation. | **GATE 3 COMPLETE 2026-06-12.** Implementation done. Awaiting owner Gate-4 smoke on preprod. | `BulkEditor.jsx` (~50 lines); test: `BulkEditor.cr036.test.jsx` (+10 tests) |
|| **CR-036-FU-02** | **Bulk Editor — Column Reorder + Sold By (Unit) Tier-1 Promotion.** Cosmetic follow-up surfaced during owner Gate-4 smoke of CR-036/FU-01 (2026-06-12). F4: `ALL_COLUMNS` order swap — `itemType` → `taxType` → `taxPercent` (Tax Type now reads BEFORE Tax %); N2: `itemUnit` moved from Tier 4 (hidden by default) to Tier 1 (visible) + label aligned to `"Sold By (Unit)"` matching `ProductForm.jsx:307` single-add view. API already returns `item_unit` via `menuManagementTransform.js:116` — gap was visibility, not data. P3 (pure cosmetic, no money/data impact). ~8 lines in single file. | **GATE 3 COMPLETE 2026-06-12 (4/4 new tests pass; 19/19 prior tests pass — 23 total in BulkEditor.cr036.test.jsx).** Awaiting owner Gate-4 smoke. | `BulkEditor.jsx` (+8/-5); test: `BulkEditor.cr036.test.jsx` (+4 tests, +56 lines) |
|| **CR-036-FU-03** | **Bulk Editor — Tax-Required Validation + Backdrop Loader + Data-Loss Race Guard.** Functional follow-up: F3 = when `restaurant.tax.gstStatus === true` (newly exposed via `profileTransform.js` from `api.gst_status` at restaurants[0] level, owner-confirmed shape), items must have `taxType ∈ {GST,VAT}` AND `taxPercent > 0`; **packaged items (`packedFood === "Yes"`) EXEMPT** per owner directive 2026-06-12. N1 = backdrop overlay (`bg-white/60` + blur) over BulkEditor during `isLoading \|\| importing \|\| exporting` with status text ("Loading menu…" / "Importing your Excel file…" / "Generating export…") + race-guard on `useEffect([foods])` via `pendingImport` state + confirmation Dialog on import-success-with-unsaved-edits (blocks silent data-loss). Reuses CR-036-FU-01 `_validationErrors` infrastructure for red border + cell tint + focus + descriptive toast. P1 (tax) + P2 (UX). ~140 lines across 3 files. Owner decisions: OQ-F3-1 require BOTH type+rate, OQ-F3-2 applies to both _isNew + existing dirty, OQ-F3-3 missing field → no validation (safe fallback via defensive `=== true`), OQ-F3-4 both cells tinted, OQ-N1-1 block on every refresh, OQ-N1-2 confirmation dialog with Continue/Cancel, OQ-N1-3 semi-transparent backdrop, OQ-N1-4 no Cancel button. | **GATE 3 COMPLETE 2026-06-12 (8/8 new tests pass; 35/35 menu tests pass — CR-027 P3 + CR-036 + FU-01 + FU-02 + FU-03).** Awaiting owner Gate-4 smoke + live DevTools verification of `/profile` `gst_status` field path. | `BulkEditor.jsx` (+115 lines), `profileTransform.js` (+9 lines), `MenuManagementPanel.jsx` (+4 modified); test: `BulkEditor.cr036.test.jsx` (+8 tests, +150 lines); regression mock: `BulkEditor.cr027p3.test.jsx` (+8) |

|| **CR-037** | **Remove Popular Items from Boot + Order Screen.** | **CLOSED — OWNER VERIFIED (2026-06-13).** | `LoadingPage.jsx`, `MenuContext.jsx`, `OrderEntry.jsx`, `CategoryPanel.jsx`, `productService.js`, `productTransform.js`, `constants.js`, `useRefreshAllData.js` |
|| **CR-038** | **Boot Screen Retry Policy — Max 3, global counter, disable + "Contact support".** | **CLOSED — OWNER VERIFIED (2026-06-13).** | `LoadingPage.jsx` |
|| **CR-039** | **Credit Management: Wire Total Credit / Total Paid + Portfolio Export Optimization.** | **CLOSED — OWNER VERIFIED (2026-06-13).** | `creditService.js`, `CreditManagementPanel.jsx` |
|| **CR-040** | **Sidebar: Rename report labels + Remove X/Y/Z Reports.** | **CLOSED — OWNER VERIFIED (2026-06-13).** | `Sidebar.jsx`, `AllOrdersReportPage.jsx`, `OrderSummaryPage.jsx`, `RoomOrdersReportPage.jsx` |
|| **CR-041** | **Sidebar Restructure: Reorder, Rename, Panel→Route Migration, Settings Consolidation.** Amended 2026-06-17: full sidebar reorder, 4 renames, 4 panel→route conversions, Settings parent with 8 children, Settlement Report moved under Daily Report. Doc: `change_requests/CR_041_SIDEBAR_RESTRUCTURE_INTAKE_AMENDED.md` | **IMPLEMENTED (2026-06-17)** | POS 5.0 |
|| **CR-042** | **Rename "Items & Menu" → "Item Ledger".** | **CLOSED — OWNER VERIFIED (2026-06-13).** | `Sidebar.jsx`, `ItemSalesHybridMockup.jsx` |
||| **CR-043** | **Credit Per-Customer Totals in Reports + Portfolio Optimization.** Backend now ships per-customer `total_credit`/`total_debit` on `tap-waiter-list`. Opportunities: portfolio export optimization (eliminate N+1 calls), Insights Dashboard credit breakdown, Settlement cross-reference. | **REGISTERED — GATE 1 (INTAKE) 2026-06-12. NO CODE.** | (planned) TBD |
||| **CR-044** | **Insights Module: Report Data Persistence Across Navigation (Shared Cache).** | **CLOSED — OWNER VERIFIED (2026-06-13).** | `insightsCache.js` (NEW), `InsightsCacheContext.jsx` (NEW), `App.js`, `Sidebar.jsx`, 10 report pages, 5 service files |
||| **CR-045** | **Insights Module: Suppress/Ignore Unused API Response Fields.** | **PHASE A+B IMPLEMENTED (2026-06-17). Backend took over server-side stripping. FE stripper (`orderPayloadStripper.js`) DELETED + `getDashboardAggregated` (474 lines) DELETED + `ItemSalesMockup.jsx` DELETED. ~600 lines removed. Phase C deferred (audit lazy-load migration).** | `orderPayloadStripper.js` (DELETED), `ItemSalesMockup.jsx` (DELETED), `insightsService.js`, `orderLedgerService.js`, `roomOrdersService.js`, `foodCourtService.js`, `prepServeService.js`, `CancellationsMockup.jsx`, `App.js` |
|||| **CR-046** | **Control Dashboard v2.0 — Interactive Workflow Controller.** Login gate + build exclusion + gate progress bars + batch queue (select items → send to stage) + Gate 4 approval buttons + smoke test cards + Express Lane (auto-chained batches). 3-phase delivery: Phase 1 security+foundation, Phase 2 batch workflow, Phase 3 smoke+express. All changes confined to `public/__dev/`. | **REGISTERED — INTAKE COMPLETE 2026-06-14. NO CODE.** | (planned) `auth.js`, `workflow.js`, `dashboard.js`, `access.json`, `workflow_queue.json` |
|||||| **CR-047** | **AGENT_PROMPT_ALPHA v0.6 — Role Hardening (Intake, QA, Bug Fix, Investigation).** 8 edits: STEP -1 session start, STEP -1.5 conditional env check, PLANNING stage dispatch, INTAKE (+severity rubric, +duplicate detection, +evidence, +blast radius), QA (+4-tier severity, +re-test, +coverage), BUG FIX (full rewrite: +reproduce, +RCA, +5 escalation paths), INVESTIGATION (+10-step time-box, +hypothesis, +persistence, +exit criteria). Doc-only CR. | **CLOSED — OWNER VERIFIED (2026-06-15).** | `AGENT_PROMPT_ALPHA.md` |

---


## POS 5.0 New CRs (2026-06-17)

|| CR ID | Title | Status | Files |
||---|---|---|---|
||| **CR-051** | **Customer Field Mandatoriness Override (Visibility Section).** 5 localStorage toggles: Walk-in Name/Phone, Dine-in Name/Phone, TakeAway Phone. Validation at Place Order + Collect Bill + QSR — same pattern as Delivery. Per-device, no backend sync. | **GATE 3 COMPLETE (2026-06-17). Awaiting Gate 4 GO.** | `StatusConfigPage.jsx`, `OrderEntry.jsx` |
||| **CR-055** | **OrderCard — invert served-items collapse.** Served items currently hidden until expand; owner wants served items visible by default (pending on expand or grouped separately). Behavior change on OrderCard render surface. Batch-analyze with BUG-146 + BUG-149 (same surface). | **CLOSED — CODE VERIFIED (2026-07-09). Served toggle + section exist (OrderCard.jsx:54, lines 698-730). Owner accepted current collapsed-by-default behavior and directed close.** | `components/cards/OrderCard.jsx` |
||| **CR-056** | **Restaurant Setting — scan-order popup toggle.** Toggle to show/suppress incoming-scan popup on dashboard. Backend field `show_scan_popup` (integer 1/0). Default ON. | **IMPLEMENTED (2026-07-24). profileTransform maps setting, settingsTransform roundtrips it, SettingsPage toggle in Step 4, DashboardPage conditional gate. // CR-056** | `profileTransform.js`, `restaurantSettingsTransform.js`, `RestaurantSettingsPage.jsx`, `DashboardPage.jsx` |
||| **CR-057** | **Menu Management — "No Tax" option + tax-model documentation.** Two-part: (A) document current tax rules (GST/VAT/mode/level composition), (B) add "No Tax" option to Menu Mgmt tax dropdown. R6 CRITICAL — 6 owner rulings required; full E2E money regression. | **INTAKE (2026-07-04).** CRITICAL. | `RestaurantSettingsPage.jsx`, `components/panels/menu/**`, `orderTransform.js`, bill/print, `TaxSlabsMockup.jsx` |
||| **CR-058** | **Order-level "Mark Order Complimentary" action + mandatory discount note.** Flips every active item to comp in one step, prompts for reason/authorising manager, rolls up into existing Comp bucket in Discount Report. **SUBSUMES BUG-145** (dropdown-based approach). R6 HIGH — 8 owner rulings required at Planning; full E2E money regression. | **INTAKE (2026-07-04).** | `CollectPaymentPanel.jsx`, `orderTransform.js`, optionally `OrderCard.jsx` |
|||| **CR-059** | **Expense Module — Migration from Old POS to New POS (Phase 1).** 19 API endpoints mapped. Two routes: `/expenses` (daily entry — cashier) + `/expense-setup` (master management — Menu Mgmt pattern with bulk editor + Excel import/export). Categories + stock items + unit prices + multi-line transaction entry. Phase 2 split into CR-061 + CR-062. BUG-DND-CR059 (handleDragEnd DELETE+POST) + BUG-P2 (grip handles removed) QA PASS (8/8). | **IMPLEMENTED + QA PASS (2026-07-08). Gate 6 (Owner Smoke) pending.** | `ExpenseEntryPage.jsx`, `ExpenseSetupPage.jsx`, `ExpenseEntryPanel.jsx`, `ExpenseSetupPanel.jsx`, `ExpenseBulkEditor.jsx`, `expenseService.js`, `expenseTransform.js` + Sidebar/App.js/constants.js (modified) |
||||| **CR-060** | **Table/Room Management — Wire CRUD APIs to Existing UI.** `TableManagementView.jsx` (272 lines) has full UI shell with ALL CRUD mocked (toast-only, zero API calls). 8 endpoints mapped. REWRITE with real APIs, Dialog (Type toggle TB/RM + waiter assignment), `TableBulkEditor.jsx` (NEW, spreadsheet grid), Excel import/export, `comingSoon` flag removed. **SUBSUMES BUG-148.** Phase 2: QR codes + waiter permissions (parked). | **GATE 3 COMPLETE — Implementation Plan ready (2026-07-06). P1, MEDIUM risk. 6 files (5 existing + 1 new, ~550 lines). Awaiting Gate 4 GO.** | `TableManagementView.jsx` (REWRITE), `TableBulkEditor.jsx` (NEW), `tableService.js`, `tableTransform.js`, `constants.js` (+TABLE_CONFIG_ENDPOINTS), `Sidebar.jsx` (comingSoon flag) |
|||||| **CR-061** | **Expense Report — FE Build with Client-Side Aggregation.** CR-059 Phase 2. Insights → Expense Report page (`/reports-module/expense-report`) — KPIs, charts (daily bar, category pie, payment split), filterable table, Excel/PDF export. Surface B: Daily Report → Expense Summary Card. Follows DailySalesMockup/SettlementReportMockup pattern. | **GATE 3 COMPLETE — Implementation Plan ready (2026-07-06). P1, LOW risk. 5 files (3 existing + 2 new, ~660 lines). Awaiting Gate 4 GO.** | `ExpenseReportPage.jsx` (NEW), `expenseReportService.js` (NEW), `Sidebar.jsx` (+Expenses Insights group), `App.js` (+route), `OrderSummaryPage.jsx` (+expense card) |
||||||| **CR-062** | **Expense Report — Backend Aggregation Migration.** Server-side aggregation via POST /expense/expense-aggregation. Replaces CR-061 client-side math with server-computed grand_total, daily_totals, category_totals, payment_totals. Client-side fallback retained. | **IMPLEMENTED (2026-07-24). P2, LOW risk.** | `constants.js`, `expenseService.js`, `ExpenseReportPage.jsx` |
|||||||| **CR-066** | **Unit Price Management — Tab in Expense Setup.** Owner-only CRUD for setting unit prices on expense stock items. Tab inside `/expense-setup` (not standalone route). Two sections: "Not Priced Yet" + "Priced." Service layer (5 functions) already wired. `fromAPI.itemsWithoutPrices()` transform + `ExpenseSetupPanel.jsx` tab strip + Unit Price tab UI needed. Search bar for both sections. Bulk Edit button hidden on Unit Prices tab. No cashier restriction for now (deferred). | **IMPLEMENTED (2026-07-11). QA 8/8 PASS. Gate 6 (Owner Smoke) next.** | `ExpenseSetupPanel.jsx` (+160 lines), `expenseTransform.js` (+10 lines) |


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

---

## CR-053 Training Academy — Sub-CRs (added 2026-06-18)

| CR ID | Title | Status | Files | Notes |
|---|---|---|---|---|
| **CR-053** | **Training Academy — overlay SDK + backend on :8002 + Menu Mgmt course.** Zero-touch POS integration via 2 lines in `index.html` + 20-line proxy in `backend/server.py`. Standalone webpack bundle, MongoDB `mygenie_training` DB. | **Phase 1 IMPLEMENTED 2026-06-18 (SDK + backend + 12-mission course)**. Pivoted by CR-053-UX-01 (see below). | `/app/training-backend/**`, `/app/training-sdk/**`, `frontend/public/index.html` (+2), `backend/server.py` (+20) |
| **CR-053-UX-01** | **Read-and-Explore Tour pivot.** Owner correctly flagged that interactive missions cannot run on live restaurant data. Re-architected: 13 missions × step types (🔦 highlight / 👆 explore / 📖 for_real). No data-writing actions ever required. Stuck-detector + explicit mission picker + dismissable "Now try it" checklist. | **GATE 3 COMPLETE + IMPLEMENTED 2026-06-18.** Awaiting owner browser walkthrough with real staff login (auth-gated). | `training-backend/seed/seed_menu_management.py` (rewrite), `training-backend/routes/progress.py` (+mission_status), `training-sdk/src/**` (8 files), `frontend/public/training/training-sdk.js` (rebuilt) |
| **CR-053-ENV-01** | **Training SDK master env switch (`REACT_APP_TRAINING_ENABLED`).** Build-time gated boolean — `"true"` enables SDK script injection, anything else (including missing) keeps SDK off. Default `false` in this pod. | **IMPLEMENTED 2026-06-18.** All 9 verification scenarios pass (V1-V9: off, on, toggle, missing-var, typo, POS regression). Intake doc: `change_requests/CR_053_ENV_01_TRAINING_ENV_FLAG.md` | `frontend/.env` (+1 line), `frontend/public/index.html` (replaced commented script with conditional inline loader, +9/-2) |
| **CR-054** | **Training Sandbox Mode (Service Worker mutation interception).** Phase 2 successor — staff perform real actions on real-looking data, all mutations faked. Effort ~10 days for Menu Mgmt module. 10 intake questions still open. | **PLACEHOLDER INTAKE 2026-06-18.** Awaiting owner intake workshop. Doc: `change_requests/CR_054_TRAINING_SANDBOX_INTAKE.md` | (planned) `training-sdk/**` + new `frontend/public/training-sw.js` |

| **CR-069** | **Employee Management + Role Management (Migration Wave 1).** Originally split into 3 phases (CR-069/070/071). Owner approved building Employee CRUD + Role CRUD together in Wave 1 (2 PRs). 14 files shipped (11 new + 3 modified, ~1,500 lines). Inline editable employee grid, rich 6-column role table with coverage bars, 8 business-function permission editor (52 permissions). All 18 OQs resolved. Mockup frozen 2026-07-15. **SUBSUMES `OG-CR041-EMPLOYEE-MGMT` + `CR-070`.** Wave 2 (consumer wiring) = CR-071. | **IMPLEMENTED 2026-07-15 (Wave 1). 23/23 tests passed.** P1, **CRITICAL** (owner OQ-9: strict approval for financial/access logic). Docs: `change_requests/CR-069_EMPLOYEE_MANAGEMENT_INTAKE.md` + `impact/CR-069_IMPACT_ANALYSIS.md` + `plans/CR_069_IMPLEMENTATION_PLAN.md` + `test_reports/iteration_23.json` | `pages/EmployeeManagementPage.jsx`, `components/panels/employee/EmployeeListView.jsx`, `components/panels/employee/RoleListView.jsx`, `components/panels/employee/RoleFormView.jsx`, `components/panels/employee/ResetPasswordDialog.jsx`, `components/guards/PermissionGate.jsx`, `constants/permissionCatalog.js`, `api/services/employeeService.js`, `api/services/roleService.js`, `api/transforms/employeeTransform.js`, `api/transforms/roleTransform.js`, `api/constants.js`, `Sidebar.jsx:110`, `App.js:56,160-161` |
| **CR-070** | **Role Management (Migration Phase 2).** | **SUBSUMED into CR-069 (2026-07-15).** All planned files (RoleListView, RoleFormView, permissionCatalog, roleService, roleTransform) built under CR-069 Wave 1 PR2 with `// CR-069` markers. No separate implementation needed. | See CR-069 files above |
| **CR-071** | **App-Wide Role Gating / Permission Consumer Wiring (Migration Phase 3 — DEFERRED).** Consume existing `AuthContext.hasPermission()` across ~30 files: Sidebar sub-items, R5 hotspots (OrderCard/CartPanel/OrderEntry/CollectPaymentPanel/TableCard), all Reports, Menu Mgmt (bulk edit/delete/price), Credit/Settlement/Expense CRUD, Settings tiles. `PermissionGate.jsx` already shipped in CR-069. NO new endpoints. NO new UI screens. Deferred behind CR-057 (Menu No-Tax) + CR-058 (Order Complimentary) to avoid R5 hotspot merge conflicts (R16). **BLOCKS CR-068** (Cancellation Role-Gating). | **INTAKE — DEFERRED.** Depends on: CR-069 (DONE), CR-057, CR-058. P1, CRITICAL. Blast radius: LARGE (~30 files, ~80–120 gate insertions). | (planned) ~30 consumer files across order flow, reports, menu mgmt, credit/settlement/expense, settings tiles |
| **CR-072** | **Inventory Management — Migration from Old POS (Phase 1 CRUD).** 5 screens: Stock Dashboard (4 KPIs + 427-item table with filters), Purchase Entry (multi-line form), Physical Count (system vs physical drift), Inventory Setup (3 tabs: 429 ingredients/31 categories, 5 vendor types, 4 wastage reasons), Recipes (3 tabs: 64 standard, 11 sub, 7 addon with card grid + form). 37 API endpoints wired. Phase 2 Intelligence blocked on 6 backend endpoints (brief filed). | **IMPLEMENTED 2026-07-15 (Phase 1). 21/21 tests passed.** P1, HIGH. Docs: `change_requests/CR-072_INVENTORY_MANAGEMENT_INTAKE.md` + `impact/CR-072_IMPACT_ANALYSIS.md` + `plans/CR-072_IMPLEMENTATION_PLAN.md` + `backend_briefs/BACKEND_BRIEF_CR072_2026_07_15.md` + `test_reports/iteration_24.json`. | `pages/Inventory*.jsx` (5), `components/inventory/*.jsx` (7), `api/services/inventoryService.js`, `api/services/recipeService.js`, `api/transforms/inventoryTransform.js`, `api/transforms/recipeTransform.js`, `api/constants.js` (INVENTORY_ENDPOINTS + RECIPE_ENDPOINTS), `Sidebar.jsx` (inventory section + VISIBLE_SECTIONS), `App.js` (5 routes) |
| **CR-074** | **Expense Setup — Remove Import/Export + Design Consistency Refresh (match Menu Management).** Split: **-A NARROW** = remove item-master Excel/CSV import + export from Bulk Editor + dead-code sweep (Insights Excel/PDF preserved). **-B** = full UI redesign to match Menu Management inline-edit-with-dropdown pattern. **CR-074-B scope EXPANDED 2026-07-16** to also absorb: (i) **CR-064** unit-price field on quick-add form, (ii) **BUG-162** Setup panel flicker fix (optimistic local updates), (iii) **BUG-202** inline Edit Item (no feature flag — enabled by default). Supersedes CR-067 bulk-editor UI patterns. | **-A: IMPLEMENTED 2026-07-16. -B: IMPLEMENTED 2026-07-17.** All 5 code phases shipped + QA-verified (iterations 26/27/28). P2, MEDIUM. Docs: `plans/CR-074-B_IMPLEMENTATION_PLAN.md` + `impact/CR-074-B_IMPACT_ANALYSIS.md`. | `ExpenseSetupPanel.jsx`, `ExpenseBulkEditor.jsx`, `expenseService.js`, `constants.js`, `expenseTransform.js`, `ExpenseSetupPage.jsx`, `ExpenseEntryPage.jsx` |
| **CR-064** | *(Original)* Add Item: include unit price field in quick-add form. | **IMPLEMENTED (bundled into CR-074-B Phase 2, 2026-07-17).** Two-call sequence: POST create item → POST set unit price. Curl-verified on preprod. | Same as CR-074-B file set. |
| **CR-065** | *(Original)* Item-level inline edit (rename) on Expense Setup item list. | **RETIRED — SUPERSEDED-BY-BUG-202 (2026-07-16).** BUG-202 covers rename **and** change-category with backend brief written, semantics locked. Strict superset. | Superseded — BUG-202 target set. |


---

## Reconciliation Audit (2026-07-15)

**Performed by:** INTAKE agent (drift check)
**Scope:** `settle` branch registry.json + CR_REGISTRY.md synced to `15-july` (local)

### Actions Taken

| # | Action | Detail |
|---|---|---|
| 1 | **registry.json synced** from `settle` → local | CR-069, CR-070, CR-071 now registered locally (were missing — `15-july` branched before Feb 15 registration) |
| 2 | **CR-054 formally registered** in registry.json | Had intake doc + CR_REGISTRY.md row but was never added to registry.json. Now registered as `PLACEHOLDER INTAKE, gate: 0, sprint: backlog`. |
| 3 | **CR_REGISTRY.md synced** from `settle` → local | Full replacement to capture all settle-branch updates |

### Remaining Gaps (documented, no action needed)

| Gap | Explanation | Risk |
|---|---|---|
| **CR-063** — skipped number | No intake doc, no mention, no code. Number was skipped between CR-062 and CR-064. Likely intentional or reserved. | NONE — cosmetic |
| **BUG-120, BUG-121** — not in registry.json | These were CR-014 sub-items (Menu Mgmt post-delivery bugs). CLOSED. Later, new bugs claimed these IDs and were renumbered to BUG-123/BUG-124 (collision resolution 2026-06-11). The original BUG-120/121 IDs are now vacant. | NONE — historical |
| **BUG-036** — not in registry.json | POS 1.0 legacy bug (PG-Paid Scan Order) tracked under CR-011. Smoke signoff + code gate waiver exist. Never registered as standalone in registry.json. | NONE — tracked under CR-011 |

### Post-Reconciliation State

```
Total items in registry.json: 301
CR range: CR-001 to CR-080 (75 registered, 1 gap: CR-063)
BUG range: BUG-001 to BUG-195 (192 registered, 3 cosmetic gaps: BUG-036/120/121)
```

| CR-075 | Inventory Module UX Overhaul (Stock + Purchase/Receive) | P1 | HIGH | **Gate 2 CLOSED · SPLIT into CR-075-A · CR-075-B · CR-077 · CR-078 · CR-079** | 2→3 | Original scope reduced. CR-075-A + CR-075-B ship-ready · CR-077/CR-078/CR-079 registered as new CRs. See `impact/CR-075_CR-076_BUG-201_IMPACT_ANALYSIS.md` |
| CR-076 | Amazon S3 File Upload — Invoice attachments + Room Check-in docs | P2 | MEDIUM | **INTAKE · PARKED** | 1 | Removed from CR-075 bundle. Presigned URL flow. Awaiting backend endpoint contract + env. |
| CR-077 | Hierarchy Stock Transfer — Receive · Dispatch · Dispute · Return (split from CR-075 P5 per B15) | P1 | HIGH | **INTAKE** | 1 | 9 endpoints live-verified via `owner@palmindia.com`. Full Receive screen designed in mock v5. Est. 8-12 files / 600-900 lines. Master creds still needed for Dispatch. Docs: `change_requests/CR-077_HIERARCHY_STOCK_TRANSFER_INTAKE.md` |
| CR-078 | Smart Purchase — Item-First Planner with Velocity & Vendor Intelligence (split from CR-075 per Q10-a) | P1 | HIGH | **INTAKE** | 1 | Full workflow redesign of Purchase Entry. Horizon picker · gap = \|need − on-hand\| · vendor ranking = lowest last rate · override warning · ad-hoc rows · N sequential POSTs (optimisation brief filed). Est. 6-8 files / 400-500 lines. Docs: `change_requests/CR-078_SMART_PURCHASE_INTAKE.md` |
| CR-079 | Inventory Information Architecture Restructure — Intelligence-as-Dashboard | P2 | MEDIUM | **INTAKE** | 1 | Nav restructure: Intelligence becomes default Dashboard · old Dashboard → "Current Stock" · Purchase Entry → "Smart Purchase" · Physical Count → "Stock Audit". Recommend bundling CR-075-B into CR-079. Est. 6-8 files / 55-80 lines. Docs: `change_requests/CR-079_INVENTORY_IA_RESTRUCTURE_INTAKE.md` |
| CR-080 | Transfer-First Smart Purchase — Franchise cross-flow optimisation | P3 | MEDIUM | **CLOSED — WONT-DO (2026-07-20)** | — | Owner ruling: franchise model is push-based (parent dispatches → franchise receives via CR-077 Phase 1). Franchise buys from vendors via CR-078. Transfer-First pull model not needed. |

### 2026-07-19 QA Intake (CR-073 Follow-Up)

| ID | Description | Priority | Risk | Status | Gates | Files |
|---|---|---|---|---|---|---|
| **CR-073** | Recipe Bulk Editor — Inline Spreadsheet for Recipe Management | **P1** | HIGH | **IMPLEMENTED — EXIT GATE PENDING** (BUG-206 blocker, registry debt V15-V17) | 0-5a (partial) | RecipeBulkEditor.jsx (NEW, 567 lines), RecipeManagementPanel.jsx (MODIFIED) |
| **CR-073-FU-01** | Recipe Bulk Editor — Column Visibility Toggle. Missing feature from CR-073 original spec. Both frozen mockups show "Columns 10" button in toolbar. Not implemented. Reference: Menu BulkEditor.jsx has this pattern. | **P2** | MEDIUM | **INTAKE — NEEDS PLANNING (Gate 2-3)** | 0-1 ✅ | RecipeBulkEditor.jsx (~50-80 lines new) |

### 2026-07-19 Design Alignment Intake

| ID | Description | Priority | Risk | Status | Gates | Files |
|---|---|---|---|---|---|---|
| **CR-081** | Inventory V5 Mockup Design Alignment Pass — Phase A: Nav pill tab bar, Phase B: Dashboard KPIs+widgets, Phase C: Smart Purchase polish, Phase D: Other screens. Absorbs CR-075 remaining polish. ~745 lines, 12+ files. | **P1** | HIGH | **INTAKE** | 0-1 ✅ | All inventory panels + widgets + new InventoryTabBar.jsx |
| **CR-075** | ~~Inventory UX Overhaul~~ — PARTIALLY SHIPPED. S1/S3/S5/PC2 shipped. Remaining items ABSORBED into CR-081. | — | — | **ABSORBED into CR-081** | — | — |

**CR-077 UPDATE (2026-07-19):** Phase 1 IMPLEMENTED + QA PASS 8/8. Route /inventory-receive, ReceiveStockPanel + ReceiveDrawer + inventoryTransferService + transform. Accept All/Reject All. iteration_10.

### 2026-07-19 Socket Room-Join Intake

| ID | Description | Priority | Risk | Status | Notes |
|---|---|---|---|---|---|
| **CR-082** | Socket Room-Join — FE emits `join_restaurant({restaurant_id})` after connect so room-scoped backend events reach POS client. 3 files, ~22 lines. | **P0** | CRITICAL | **QA PASS (2026-07-20)** — 7/7 tests, 0 blockers | QA Report: `test_reports/CR-082_QA_REPORT_2026_07_20.md`. Files: `socketEvents.js`, `socketService.js`, `useSocketEvents.js` |

### 2026-07-20 Inventory Consolidation

| **CR-085** | Inventory Module Completion (Phase 2 Consolidation). 6 categories: (A) CR-081 design gaps — missing table borders, columns, sparklines, skeleton loading. (B) Backend 500 blockers on recipe create (3 endpoints, RecipeController.php). (C) 5 frontend fixes applied (min_unit_alert string, prep_time default, sub-recipe key, addon dropdown source). (D) Unstarted features: S3 file upload (CR-076), Dispatch/Dispute/Return (CR-077 P2), Recipe column toggle (CR-073-FU-01). (E) Code quality: extract InventorySetupPanel tabs. (F) Registry housekeeping for BUG-210 + CR-084 QA status. | **P1** | HIGH | **INTAKE** | 0-1 | ~35 files, 3607 LOC. Absorbs CR-081/CR-075/CR-076/CR-077-P2/CR-073-FU-01. Backend brief filed. |

| **CR-086** | Current Stock & Ingredients UX Overhaul — 5 features: (1) Card-based filter UX replacing status chip pills, (2) Export field fix (current export has purchase fields, not stock fields — need Category, Status, Days Left, Vendor, Min Alert), (3) PDF export option, (4) Ingredient Bulk Editor (spreadsheet-style, matching RecipeBulkEditor/Menu BulkEditor pattern, ~400-500 lines), (5) Import wiring (service function exists, button disabled). | **P2** | HIGH | **INTAKE** | 0-1 | 5+ files, ~400-600 lines. New IngredientBulkEditor.jsx component. RELATED to CR-075 (S1), CR-081, CR-085. |

---

### 2026-07-22 Inventory Module Batch (CR-088 → CR-094)

| CR ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **CR-088** | Recipe "By Ingredient" Reverse View Tab — 4th tab in RecipeManagementPanel; select ingredient → see all recipes using it with qty. | **P2** | LOW | **IMPLEMENTED** | 0-5 ✅ | 1 file: `RecipeManagementPanel.jsx`. ~90 lines. |
| **CR-089** | PDF Export for Standard, Sub, Addon Recipes — printable recipe sheet for kitchen staff. Backend endpoint check needed; client-side fallback via jspdf. | **P2** | LOW | **INTAKE COMPLETE** | 0-1 ✅ | 2-3 files: `RecipeManagementPanel.jsx`, `recipeService.js`. ~30 lines. |
| **CR-090** | Inventory Categories — Delete (edit deferred — backend PUT missing). DELETE endpoint CONFIRMED. Trash icon on category sidebar, 3 error paths (success/has-ingredients/franchise-locked). RELATED to BUG-220. | **P2** | MEDIUM | **GATE 3 COMPLETE** | 3 ✅ | 3 files: `constants.js`, `inventoryService.js`, `InventorySetupPanel.jsx`. ~30 lines. Plan: `/app/memory/plans/CR-090_IMPLEMENTATION_PLAN.md` |
| **CR-091** | Purchase — Transaction ID for Bank Transfer — `payment_ref_id` field shown when paymentMethod = bank transfer. Mirror of CR-087 for purchase module. | **P2** | LOW | **INTAKE COMPLETE** | 0-1 ✅ | 2-3 files: `PurchaseEntryPanel.jsx`, `inventoryTransform.js`. ~25 lines. |
| **CR-092** | Recipe Tabs — Sort Controls — sort by name/date/cost, applies per active tab. Client-side sort only. | **P3** | LOW | **INTAKE COMPLETE** | 0-1 ✅ | 1-2 files: `RecipeManagementPanel.jsx`. ~20-25 lines. |
| **CR-093** | Consumption Report — New Screen (Date Range, Category, Ingredient, Margin, Cost) — new Inventory tab, uses DCR API. | **P2** | LOW | **IMPLEMENTED** (2026-07-23) | 0-5 ✅ | 4 files: `ConsumptionReportPage.jsx` (NEW), `Sidebar.jsx` (+1), `App.js` (+2), `inventoryService.js` (+spread). Navigation: Daily Report → below P&L. |
| **CR-094** | P&L Report — New Screen Under Daily Reports. KPI strip, charts, sortable table, PDF export. | **P1** | MEDIUM | **IMPLEMENTED** | 0-5 ✅ | 5 files: `PLReportPage.jsx` (NEW), `constants.js`, `reportService.js`, `Sidebar.jsx`, `App.js`. |


---

### 2026-07-24 Employee Management — Role Type Derivation (CR-095 → CR-096)

| CR ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **CR-095** | Waiter-to-Waiter Transfer — Unlock Settlement Feature | **P2** | LOW | **IMPLEMENTED** (2026-07-23) | 0-5 ✅ | 3 files: `SettlementPanel.jsx`, `settlementService.js`, `settlementTransform.js`. |
| **CR-096** | Role Type Derivation from Template map_role (Option A) | **P1** | LOW | **QA PASS** (2026-07-24) — 9/9 tests pass. T1 (Waiter), T2 (Station), T3 (Manager), T4 (Scratch) all pass. Template permissions auto-populate confirmed. Awaiting Gate 6 (Owner Smoke). | 0-5b ✅ | 2 files (`roleTransform.js` L57 + `RoleFormView.jsx` L83–95). QA Report: `/app/memory/test_reports/CR-096_QA_REPORT_2026_07_24.md` |


---

### 2026-07-23 Auto-Settle Throttle (CR-097)

| CR ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **CR-097** | Auto-Settle — Throttle/Stagger Concurrent Settle Calls on Dashboard Load | **P0** | CRITICAL | **QA PASS** (2026-07-24) — 10/10 tests pass. Sequential queue verified, old burst removed, PayLater exclusion, cleanup, persistence all confirmed. Awaiting Gate 6 (Owner Smoke). | 0-5b ✅ | QA: `/app/memory/test_reports/CR_097_QA_REPORT_2026_07_24.md`. Plan: `/app/memory/plans/CR_097_IMPLEMENTATION_PLAN.md`. |


---

### 2026-07-24 OrderCard Feature Gaps (CR-098 → CR-099)

| CR ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **CR-098** | Short Code (Item Code) Display on Order Card | **P1** | LOW | **IMPLEMENTED (2026-07-24). itemCode mapped in orderTransform, displayed on OrderCard (Preparing/Served/Cancelled), searchable in OrderEntry, shown on menu pills. // CR-098** | 0-5a ✅ | `orderTransform.js`, `OrderEntry.jsx`, `OrderCard.jsx` |
| **CR-099** | Per-Item Preparation & Serve Time Display on Order Card | **P1** | MEDIUM | **IMPLEMENTED (2026-07-24). formatElapsed helper + 60s timer. Preparing: "Prep: Xm" (orange). Ready: "Prep: Xm · Wait: Ym" (green). Served: "Prep: Xm · Serve: Ym" (gray). // CR-099** | 0-5a ✅ | `OrderCard.jsx` |


---

### 2026-07-24 Smart Purchase — Partial Payment (CR-100)

| CR ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **CR-100** | Smart Purchase — Partial Payment, Reference ID, Notes & Unpaid Status | **P1** | HIGH | **INTAKE — BACKEND-BLOCKED** | 0-1 ✅ | Backend contract change needed: `payment_status`, `paid_amount`, `partial_payments[]`, `payment_ref_id` on `POST /add-purchase`. FE ready (~175 lines, 3 files, mirrors Expense CR-083 split pattern). Intake doc: `change_requests/CR_100_SMART_PURCHASE_PARTIAL_PAYMENT_INTAKE.md`. Backend brief: `BACKEND_BLOCKERS_BRIEF_2026_07_22.html` §CR-100. |

### 2026-07-24 Inventory Payload G-020 Alignment (CR-102)

| CR ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **CR-102** | Inventory Add/Edit: Send `consumption_unit` in Payload (G-020 Alignment) | **P1** | LOW | **IMPLEMENTED (2026-07-24). consumption_unit sent from smallUnit; converion_factor conditional on hasConversion. // CR-102** | 0-5a ✅ | `inventoryTransform.js` |

### 2026-07-24 Smart Purchase — Bulk Remove UX (CR-103)

| CR ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **CR-103** | Smart Purchase: Bulk Remove UX — Select All + Prominent Cross Button | **P1** | MEDIUM | **IMPLEMENTED (2026-07-24). Sub-A: activeRows filter (rate>0), skip unfilled. Sub-B: × button 20px+red hover. Sub-C: checkbox column+select all+bulk remove toolbar. // CR-103** | 0-5a ✅ | `SmartPurchasePanel.jsx`, `AutoShoppingList.jsx` |

### 2026-07-24 Recipe PDF + Daily Report Filters (CR-089 + CR-101)

| CR ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **CR-089** | PDF Export for Recipes (jsPDF 3-section document) | **P2** | LOW | **IMPLEMENTED (2026-07-24). jsPDF+autoTable, 3 sections (Standard/Sub/Addon), "Download PDF" button. // CR-089** | 0-5a ✅ | `RecipeManagementPanel.jsx` |
| **CR-101** | Daily Report — Punched By + Collected By Filter Dropdowns | **P2** | LOW | **IMPLEMENTED (2026-07-24). 2 client-side-derived dropdowns from unique punchedBy/actionedBy. Hidden when no data. // CR-101** | 0-5a ✅ | `AllOrdersReportPage.jsx`, `FilterBar.jsx` |
