# Layer 3 — CR Registry

**Status:** POPULATED
**Last Updated:** 2026-06-11 (Insights-audit batch CR-029…CR-033 registered, Gates 0-2 complete — see section below. Earlier same-day: baseline consolidation sync: CR-020…CR-027 registered; CR-021/022/023/024 CLOSED; ID collisions resolved — Toast CR→CR-027, 401-redirect bug→BUG-123, socket-payload bug→BUG-124; CR-026 retro-registered. CR-028 Item-Level Discount registered — intake complete, no code.)

---

## Insights Cross-Report Audit CRs (registered 2026-06-11, Gates 0-2 complete)

Source: `INSIGHTS_REPORTS_AUDIT.md` (cafe103) + `INSIGHTS_REPORTS_AUDIT_PALMHOUSE.md` (palmhouse). Sibling bugs: BUG-125…BUG-129 (see Bug Tracker).

| CR ID | Title | Priority | Status | Gate | Blocker |
|---|---|---|---|---|---|
| CR-029 | Room scope consistency — shared predicate + per-screen badge/toggle | P1 | REGISTERED 2/7 | Gate 3 needs owner choice | Badge vs toggle; default scope; transferToRoom membership |
| CR-030 | Punch vs collection attribution — standardized + labelled toggle | P1 | REGISTERED 2/7 | Gate 3 BLOCKED | Owner OD-1..OD-3 (revenue basis, toggle vs canonical, TAB timing) |
| CR-031 | Canonical cancellation money formula (Dashboard vs Cancellations) | P2 | REGISTERED 2/7 | Gate 3 needs owner sign-off | Formula approval; depends BUG-125 |
| CR-032 | Shared payment-method classifier (pending/partial/COD/zero-amt) | P2 | REGISTERED 2/7 | Ready for Gate 3 | Info ask: backend semantics of 'pending' |
| CR-033 | Settlement 'total sale' basis definition + reconciliation | P1 | REGISTERED 2/7 — BACKEND-BLOCKED | — | Backend formula documentation |

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
| **BUG-122** | **POS orders with fOrderStatus 7 incorrectly trigger ScanOrderPopOut popup.** Predicate uses `fOrderStatus === 7` as web-origin proxy, but backend can assign status 7 to POS orders. Fix: popup only when `isWebOrder === true`. POS fOrderStatus 7 orders show as normal OrderCard with tick (✓) button (no Reject). Tick advances status per `def_ord_status` config. | **CLOSED — OWNER VERIFIED (2026-06-10).** | `ScanOrderPopOut.jsx`, `OrderCard.jsx` |
|| **BUG-122 Post-Delivery (3 FE fixes)** | **Fix #1: Cancel (X) button added to POS YTC OrderCard (owner confirmed ✗+✓ needed, not ✓ only). Fix #2: TableCard snooze gated to `table.isWebOrder === true` (BUG-122 parity with OrderCard). Fix #3 (CR-018): `schedule_at` trailing space removed + Place Order disable guard strengthened to require time component (`includes(':')`).** Handover doc: `memory/handover/CR018_BUG122_FE_FIXES_HANDOVER_2026_06_10.md`. | **IMPLEMENTED (2026-06-10). Awaiting owner smoke.** | `OrderCard.jsx`, `TableCard.jsx`, `CartPanel.jsx` |
|| **CR-019** | **Restaurant Settings — Self-Onboarding Setup Wizard.** New standalone 6-step wizard page (route: `/restaurant-settings`) for restaurant self-onboarding. Steps: (1) Restaurant Identity & Tax [required], (2) Channels & Payments [required], (3) Charges & Tips [optional/skip], (4) Order & Kitchen [optional/skip], (5) Inventory & Extras [optional/skip], (6) Owner Info [required]. APIs: `GET settings-list` + `POST update-settings` (multipart). Left-rail stepper, visual channel cards, chip payment selectors. ~50+ fields across 3 API sections (basic, advanced, vendor). Interactive mockup at `/mockup-wizard.html`. | **IMPLEMENTED — Gate 5 COMPLETE (2026-06-10). QA: 18/18 passed. Awaiting owner smoke (Gate 6).** | `RestaurantSettingsPage.jsx` (NEW), `restaurantSettingsService.js` (NEW), `restaurantSettingsTransform.js` (NEW), `App.js`, `Sidebar.jsx` |
|| **CR-020** | **Restaurant Settings Wizard — Bug Sweep (15 bugs B1–B15).** Phases 1–3 (B1 online_payment data-loss, B9/B10 multipart headers, B3 file re-upload, B5/B6 step-nav guards, B7 error-bleed, B8 NumberInput, B4 imports) CLOSED — owner signed off. B2 CLOSED-NOT-A-BUG (backend int columns need raw booleans — live API verified). Phase 4: B11 order-type dropdown filters by features (code live; DEBUG-B11 logs in `OrderEntry.jsx:2124` + `profileTransform.js` to remove post-validation); B12 Default-GST field hidden; B13/B14 GST Mode labels "Item Level/Restaurant Level" + dynamic hint; B15 Short Code toggle. | **Phases 1–3 CLOSED — OWNER VERIFIED. Phase 4 + B12–B15 IMPLEMENTED — awaiting owner smoke (batch S-4). B11 PARKED pending live profile validation.** | `restaurantSettingsTransform.js`, `restaurantSettingsService.js`, `RestaurantSettingsPage.jsx`, `OrderEntry.jsx`, `profileTransform.js` |
|| **CR-021** | **Collect Bill — Split/Partial Payment Defects (B1–B4) + prepaid parity.** B1: `partial_payments[]` attached whenever `splitPayments.length>0` + `payment_mode/payment_method: "partial"` on both postpaid (`orderTransform.js:1364/1440`) and prepaid (`:1155/1222`); B2: split amounts clear when effectiveTotal changes (`CollectPaymentPanel.jsx:668`, BUG-113 contract respected); B3: Card TxnID required only when card amount>0 (`:3082`); B4: Pay disabled when Σ split < total (`:3083`). | **CLOSED — OWNER VERIFIED 2026-06-11 (ruling R1: smoke covered both postpaid + prepaid flows).** | `orderTransform.js`, `CollectPaymentPanel.jsx` |
|| **CR-022** | **Menu Management — Food Type Filters.** Non-Veg filter caught Jain items (boolean decomposition flaw). Fix: enum-based filter on raw `item_type` 0/1/2/3 + `Number()` coercion in transform. | **CLOSED — Owner QA passed 2026-06-10.** | `ProductList.jsx`, `menuManagementTransform.js` |
|| **CR-023** | **Bulk Editor — Typing Lag (422 items).** Per-keystroke full-table re-render (~13k dirty comparisons + 4,220 cell renders). Fix: `LocalTextInput` (local state, flush on blur) + `React.memo(CellRenderer)` + auto-blur on Save. | **CLOSED — OWNER VERIFIED 2026-06-11 (ruling R2).** | `BulkEditor.jsx` |
|| **CR-024** | **Channel Visibility Override.** Bug A CLOSED-NOT-A-BUG (raw booleans correct per backend int schema). Bug B: StatusConfigPage filters channel cards by API `features` (3 render spots), stale-channel clean on save, default override OFF. | **CLOSED — Owner QA passed 2026-06-11.** | `StatusConfigPage.jsx`, `DashboardPage.jsx`, `restaurantSettingsTransform.js` |
|| **CR-025** | **Discount Payload Fix (P0 — money).** `order_discount` sends ₹ amount (`discounts.manual`) not percentage; `self_discount: 0` across prepaid/postpaid/transferToRoom; prepaid gains `comm_discount`/`discount_value`/`discount_type` parity. | **IMPLEMENTED — awaiting owner smoke (batch S-1, P0).** | `orderTransform.js` |
|| **CR-026** | **Report Data & Rounding Sweep (retro-registered 2026-06-11 per ruling R4).** 6 Session-3 fixes: display rounding (12 report files, 2-decimal), orderLogsReportRow fields (phone/email/txn-ref/address/room), singleOrderNew 12 financial fields, credit totals from API, customerDetails crash fix, bill-summary sequence. Backend asks raised: Gap-4 partial breakup + tap-waiter-list totals. | **IMPLEMENTED — awaiting owner smoke (batch S-9).** | `reportTransform.js`, `orderLedgerService.js`, `creditService.js`, `CreditManagementPanel.jsx`, `OrderDetailSheet.jsx` + 11 report files |
|| **CR-027** | **Unified Toast & Error Surfacing (renumbered from CR-025 on 2026-06-11 — ID collision, ruling R3).** 168 toast calls / 28 files; 3-phase rollout locked (interceptor → mechanical conversion → BulkEditor error trail). Decisions A–D + OD-1/3/4 locked; OD-2 (TOAST_LIMIT) + OD-5 (bootstrap policy) parked. | **REGISTERED — READY FOR GATE 6 (Code). NOT STARTED — carried to next sprint.** | `axios.js` + 27 component files (planned) |
|| **BUG-123** | **Place Order on 401 silently redirects to dashboard (renumbered from BUG-120 on 2026-06-11 — ID collision, ruling R3).** Fire-and-forget HTTP + socket-wait timeout + `window.location.href` bounce; toast missable, cart lost. Affects Place Order, Collect Bill, Transfer, Update Order. | **OPEN INTAKE (P1) — next sprint.** | — |
|| **BUG-124** | **Backend `food_update_${rid}` socket payload missing critical fields (renumbered from BUG-121 on 2026-06-11 — ID collision, ruling R3).** FE defended via `SOCKET_FOOD_DEFAULTS` backfill. Backend must enrich payload. | **OPEN — BACKEND-BLOCKED (P2). FE defence shipped (`socketHandlers.js`).** | `socketHandlers.js` (defence) |
|| **CR-028** | **Item-Level Discount — payload + `give_discount` exclusion (P1, money).** Gap 1: payload sends hardcoded `discount_amount: '0.00'` per item (`orderTransform.js:603`) — must send real per-item distribution. Gap 2: `give_discount='No'` flag exists only in Menu Management; `productTransform.js` never maps it → cart/billing ignores it — flagged items must be excluded from discount base. 4-phase plan drafted; blocked on OD-1…OD-5 (incl. backend asks: does POS menu API return `give_discount`? does backend store per-item discount_amount?). | **REGISTERED — INTAKE COMPLETE 2026-06-11. NO CODE. Next-sprint backlog unless owner pulls forward.** | (planned) `productTransform.js`, `CartPanel.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js` |

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
