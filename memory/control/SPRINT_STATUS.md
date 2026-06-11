# Layer 6 — Sprint Status Board

**Status:** POPULATED
**Last Updated:** 2026-05-31 (POS 4.0 consolidation — all prior sprint boards closed/archived; deferred + blocked + intake carried into a single POS 4.0 backlog)

---

## POS 2.0 — CLOSED (2026-05-09)

| Metric | Value |
|---|---|
| Items | 15 |
| Implemented + QA passed | 5 (POS2-003 main, FU-02, REOPEN-A, POS2-005, POS2-007) |
| Investigation complete | 0 — all resolved 2026-05-31 (POS2-002 CLOSED via CR; POS2-005-FU§B CLOSED as-designed/keep cross-tab; POS2-006 DEFERRED→POS 4.0; POS2-004 rolled into POS2-005) |
| Parked | 1 (POS2-003-REOPEN-B) |
| Not started | 1 (POS2-001 → POS 4.0 backlog; POS2-006-PG-PAID-ONLY DROPPED — owner kept cross-tab) |
| Key Doc | `sprint_consolidation/POS2_0_SPRINT_CONSOLIDATION_REPORT_2026_05_09.md` |

---

## POS 3.0 — CLOSED BUT INCOMPLETE (~2026-05-21)

| Metric | Value |
|---|---|
| Items | 22 (13 bugs + 9 CRs) |
| Shipped + owner-confirmed | 8 (BUG-087,088,089,098,099,100,102,103) |
| Shipped, smoke pending | 0 (BUG-097 smoke PASSED 2026-05-31 → main VERIFIED; residuals → POS 4.0) |
| Partially implemented | 1 (BUG-096) |
| Planning complete | 1 (BUG-095) |
| Backend-blocked | 6 (BUG-090,091,092,093,094,101) |
| CRM-blocked | 3 (BUG-106,107,108) |
| Owner scope needed | 2 (BUG-104,105) |
| Production hotfixes | 4 (PROD-001 closed, PROD-002 QA-pending, PROD-003 BE-followup, PROD-004/005 shipped) |
| Business rules frozen | 44 of 56 |
| Key Doc | `final_sprint_reconciliation/POS3_0_COMPLETE_SPRINT_STATUS_RECONCILIATION_2026_05_21.md` |

---

## POS 3.1 — CLOSED → consolidated into POS 4.0 (2026-05-31)

| Metric | Value |
|---|---|
| Items | 3 |
| Shipped + verified | 3 (BUG-109, 110, 111) |
| Backlog | Empty |
| Key Doc | `change_requests/pos_3_1/README.md` |
| Handover | `HANDOVER_NEXT_AGENT_2026_05_27.md` |

---

## CRM 2.0 — CLOSED → backlog consolidated into POS 4.0 (2026-05-31)

| Metric | Value |
|---|---|
| Total CRs | 9 |
| Code-complete | 0 (CR-002 CLOSED — OWNER VERIFIED 2026-05-31, T-28/T-29 live PASS) |
| Subsumed | 3 (CR-001, CR-006, CR-007) |
| Not started | 4 (CR-003, CR-004, CR-005, CR-008) → POS 4.0 backlog |
| Not formalized | 1 (CR-009 BUG-108 carryover) |
| Open QA gaps | 7 |
| Missing docs | 4 |
| Key Doc | `crm/crm_2_0/reconciliation/CRM2_0_SPRINT_CONSOLIDATION_2026_05_27.md` |

---
## POS 4.0 — ACTIVE (Consolidated Backlog, opened 2026-05-31)

The single active sprint. All un-started / deferred / blocked / intake items from
POS 2.0, POS 3.0, POS 3.1 and CRM 2.0 were consolidated here. Closed/shipped work
stays archived in its original sprint section above (history preserved).

| Bucket | Count | Items |
|---|---|---|
| B — Deferred / Not started | 3 | POS2-001, POS2-006 (confirmOrderTone), BUG-097 residual: CartPanel gate |
| C — Blocked (reactivation-gated) | 11 | Backend: BUG-090/091/092/093/094/101/096, BUG-097 Bucket-5 rider events, BUG-085 · CRM: BUG-106/107, BUG-108 P1 defect · Owner-scope: BUG-104/105 · Backend: POS2-008 |
| D — Intake only | 5 | BUG-040, BUG-041 (audit report export), **CR-010 (weight items P1)**, **CR-011 (Reports Module P1)**, **CR-012 (Menu API migration P1)** |

### CR-011 — Gate 2.5 Screen Freeze (active phase)

| Field | Value |
|---|---|
| **Phase** | 2.5 — Screen Freeze Phase 1 **COMPLETE** + **Code Gate 1 PASSED**. Phase 2: S5+S6+S7 FROZEN. Next: S8. |
| **Total screens** | 41 (Phase 1: 5 · Phase 2: 6 · Phase 3: 28 · Phase 4: 3) |
| **Phase 1 status** | **All 5 screens ✅ FROZEN** (S0 2026-06-02, S1–S4 2026-06-01). **Code Gate 1 PASSED 2026-06-02**. |
| **Phase 2 status** | **S5 ✅ FROZEN 2026-06-05** (Item Sales Hybrid). **S6 ✅ FROZEN 2026-06-05** (Order Ledger). **S7 ✅ FROZEN 2026-06-05** (Sales). Next: **S8 Payments**. |
| **Currently next** | **S8 Payments** — Payment reconciliation screen. |
| **Exit criteria** | All 41 screens in FROZEN state → Implementation Plan revision → Gate 3 |
| **Tracking log** | `CR_011_SCREEN_FREEZE_LOG.md` |
| **Code Gate 1 artifacts** | `CR_011_CODE_GATE_1_IMPLEMENTATION_PLAN_2026_06_02.md` + `CR_011_CODE_GATE_1_SCOPE_LOCK_2026_06_02.md` |

**Closed by owner 2026-05-31 (no longer in backlog):** POS2-003-REOPEN-B (code on v2), UX-LOADING-02, PROD-HOTFIX-006, Order Activity Log. **CRM CRs CR-003/004/005/008/009 → SUBSUMED (done).**

**Full backlog (IDs + blockers + reactivation triggers):** `change_requests/PHASE_4_CONSOLIDATED_BACKLOG_2026_05_31.md`
**Owner attestation for deferral batch:** `control/POS_4_0_DEFERRAL_OWNER_ATTESTATION_2026_05_31.md`
**Baseline consolidation:** `control/BASELINE_CONSOLIDATION_REPORT_2026_05_31.md`

> Separate track (not folded into POS 4.0): the **12 unfrozen business rules** remain on their own 5-step promotion gate (TIP-003, ROUND-001 + 10 Part B rules promoted 2026-05-31).

### CR-014 — Menu Management API Migration + Bulk Editor (2026-06-08)

| Field | Value |
|---|---|
| Phase 1 | **CLOSED — OWNER VERIFIED.** 20 API endpoints wired. Gate 5 QA 100%. |
| Phase 2 | **CLOSED — OWNER VERIFIED.** Inline Bulk Editor: 33 columns, 4-tier picker, category grouping, batch save. QA 11/11. |
| Phase 2B | **DEFERRED.** Excel import/export/template (APIs #8-10). |
| Files | `BulkEditor.jsx` (NEW), `menuManagementService.js`, `menuManagementTransform.js`, `MenuManagementPanel.jsx`, `CategoryList.jsx`, `ProductList.jsx`, `ProductCard.jsx`, `ProductForm.jsx` |

### CR-015 — Settlement Module (2026-06-08)

| Field | Value |
|---|---|
| Status | **IMPLEMENTED — AWAITING OWNER SMOKE.** |
| Implementation | Dashboard slide-over panel. 5 APIs wired. 5 KPI cards, 9-col waiter table, 3 modals. QA: 14/14 + 9/9 passed. |
| Backend escalation | `POST /waiter/cash-transfer` — 404, does not exist. UI placeholder with disabled state. |
| Files | `SettlementPanel.jsx` (NEW), `settlementService.js` (NEW), `settlementTransform.js` (NEW), `DashboardPage.jsx`, `Sidebar.jsx`, `App.js` |

### CR-016 — Settlement History / Insights (2026-06-08)

| Field | Value |
|---|---|
| Status | **REGISTERED.** Parked for future scoping. |
| Scope | Date-range settlement history under Insights. Depends on CR-015. |

---



## Standalone CRs

| CR | Status | Date |
|---|---|---|
| Audit Report Optimization | SHIPPED | 2026-05-28 |
| Order Activity Log | REGISTERED, NOT STARTED | 2026-05-28 |
| **DEV-DASHBOARD-001** (v1.0 + v1.1) | **CLOSED — OWNER VERIFIED** | **2026-05-29** |

---

## Dev Tooling — CLOSED (2026-05-29)

| Metric | Value |
|---|---|
| Items | 1 (DEV-DASHBOARD-001, v1.0 + v1.1) |
| Implemented + owner verified | 1 |
| 6-artifact closure | YES (Session Start, Plan, Code-Gate-via-scope-lock, Impl Summary, QA in handover, Owner Smoke Sign-off) |
| Files touched (existing app) | 0 |
| Files added | `/app/frontend/public/__dev/**`, `/app/scripts/gen_dev_dashboard_config.js` |
| Key Doc | `change_requests/DEV_DASHBOARD_V1_1_ROW_DETAIL_PLAN_2026_05_29.md` |
| Handover (v1.0) | `HANDOVER_DEV_DASHBOARD_2026_05_29.md` |
| Handover (v1.1) | `HANDOVER_DEV_DASHBOARD_V1_1_2026_05_29.md` |
| Owner sign-off | `DEV_DASHBOARD_V1_1_OWNER_SMOKE_SIGNOFF_2026_05_29.md` |

---

## Phase 3

| CR | Status | Blocker |
|---|---|---|
| UX-LOADING-02 | NEEDS_OWNER_DECISION | Awaiting Concern A + B picks |

---

## Owner Decision Log

| Date | Decision | Source |
|---|---|---|
| 2026-05-16 | 32 business rules frozen, 24 deferred | Business Logic Owner Approval Session |
| 2026-05-19 | QSR Quick Billing UX approved (BUG-099) | Owner smoke test PASS |
| 2026-05-20 | Delivery dispatch flow frozen: `deliveryAssign` from profile, not `order_in`/`source` | BUG-097 Session |
| 2026-05-20 | Auto-settle toggle approved (PROD-HOTFIX-001) | Owner live-verified |
| 2026-05-22 | BUG-108 CRM integration: 11 owner decisions recorded (Q1-Q11) | POS3_0_BUG_108_OWNER_DECISIONS_RECORDED |
| 2026-05-26 | CRM 2.0 CR-002: 27 contract decisions frozen | Contract Freeze v1.1 |
| 2026-05-27 | Customer icon permission gate removed (unconditional) | CRM 2.0 Hotfix — owner confirmed |
| 2026-05-29 | PROD-007 loyalty earn points — owner verified | 2026-05-29 |
| 2026-05-29 | PROD-008 KOT custName/custPhone — owner verified | 2026-05-29 |
| 2026-05-29 | Control Layer v1 built (14 files, 0 TODOs) | 2026-05-29 |
| 2026-05-29 | Agent Prompt Alpha v0.2 refined (16 rules) | 2026-05-29 |
| 2026-05-29 | Owner decisions captured: A1-A5, B1-B4, C1, D1-D13 | 2026-05-29 |
| 2026-05-29 | DEV-DASHBOARD-001 v1.0 approved & shipped (6 scope decisions, 1 env-gate decision) | DEV_DASHBOARD session, 2026-05-29 |
| 2026-05-29 | DEV-DASHBOARD-001 v1.1 approved & shipped (Option B + cross-tab linking + Option C) | DEV_DASHBOARD_V1_1 session, 2026-05-29 |
| 2026-05-30 | AUDIT-CLOSURE-DRIFT-001 approved & shipped — 44 bugs reconciled, Artifact References column added | AUDIT_CLOSURE_DRIFT_001 session, 2026-05-30 |
| 2026-05-30 | AUDIT-CLOSURE-DRIFT-001 owner smoke G-2 — PENDING owner verification | OWNER_SMOKE_SIGNOFF (pending), 2026-05-30 |
| 2026-05-31 | BUG-097 25-row delivery-dispatch smoke — PASSED (owner-attested); main VERIFIED, residuals (CartPanel gate + Bucket-5 rider events) carved to POS 4.0 | Owner attestation, 2026-05-31 |
| 2026-05-31 | AUDIT-CLOSURE-DRIFT-001 G-2 owner smoke — PASSED; CR CLOSED — OWNER VERIFIED | Owner attestation, 2026-05-31 |
| 2026-05-31 | PROD-002 (Settle print guard) CLOSED — OWNER VERIFIED: live runtime QA Group A passed (Settle → no order-temp-store POST / no print log / no physical print) + owner confirms backend does not print on paid-prepaid-order. No code fix needed | Owner live QA, 2026-05-31 |
| 2026-05-31 | CLOSED 4 more (owner-verified): POS2-003-REOPEN-B (code on v2 place-order, constants.js L59 + live commit), UX-LOADING-02, PROD-HOTFIX-006, Order Activity Log (current code state as desired) | Owner directive, 2026-05-31 |
| 2026-05-31 | CRM 2.0 CR-002 T-28/T-29 live regression PASS (owner-captured commit payloads, R689); CR-002 CLOSED — OWNER VERIFIED; OG-02 + OG-06 CLOSED | Owner live capture, 2026-05-31 |
| 2026-05-31 | POS2-002 confirmed working & CLOSED (resolved under a shipped CR); POS2-005-FU§B CLOSED as-designed (keep PG filter cross-tab/all tabs); POS2-006 confirmOrderTone DEFERRED → POS 4.0 | Owner directive, 2026-05-31 |
| 2026-05-31 | Business rules **TIP-003** (no tip on takeaway/delivery; profile-gated) + **ROUND-001** (grand-total always-ceil; profile round-off gate) owner-reconfirmed & PROMOTED to frozen baseline (code-verified). Frozen 32→34, pending 24→22 | Owner reconfirm, 2026-05-31 |
| 2026-05-31 | **Part B: 10 of 15 rules PROMOTED** (code-verified + owner-reconfirmed): TAX-004, TAX-006, SC-005, DEL-001, DEL-002, DEL-003, TOTALS-003, POLL-002; SCAN-002 + PAY-003 as **current-state** freezes (no 2-min snooze hide; partial-payments keep all 3 modes per Option 1). PARKED: SCAN-003, ROOM-002 (owner will reconfirm), PAY-009 (timeout-error note-only), TAX-007 (live-print), POLL-003 (backend confirm). Frozen 34→44, pending 22→12 | Owner reconfirm, 2026-05-31 |
| 2026-06-02 | **CR-011 Code Gate 1 PASSED** — 0 code changes, all 5 Phase 1 screens compliant with §5 (17 items) | Code Gate audit, 2026-06-02 |
| 2026-06-02 | **CR-011 S0 re-opened** for 3 owner-directed fixes: (1) Cancellation cancel_at attribution via Option A (separate API call) + double-counting fix, (2) Payment Mix total sum badge, (3) Date filter persistence via URL query params to S2. S2 also updated. | Owner directive, 2026-06-02 |
| 2026-06-02 | **Cancellation attribution = cancel_at always for items.** Dashboard makes second API call with `created_at` sort, filters items by `cancel_at` in range. Item-level excludes items from order-level cancels (no double-counting). Order-level `cancel_at` is NULL in API — uses item-level `cancel_at` as proxy. | Owner confirmed, 2026-06-02 |
| 2026-06-02 | **Audit tile: show actor name.** `operations[].vendor_employee_name` for who made unpaid / changed payment method. `previous_payment_method` → `current_payment_method` for method change detail. | Owner directive, 2026-06-02 |
| 2026-06-02 | **Payment Mix total = sum of all method revenues.** Badge shows sum so owner can spot if anything is missing vs Net Sales. | Owner directive, 2026-06-02 |
| 2026-06-02 | **S0 + S2 re-frozen** after all fixes verified by owner (Palm House Apr: 145 = 43 order + 102 item, ₹36,326; Payment Mix ₹10,22,433 = Net Sales). | Owner validated, 2026-06-02 |
| 2026-06-02 | **CR-011 S5 scope expanded — Unified Download menu (5 options).** Single `Download` trigger button opens dropdown with 5 options in order: (1) Excel — ENABLED, (2) PDF — ENABLED, (3) Send via Email (attachment) — DISABLED placeholder, (4) Send via WhatsApp — DISABLED placeholder, (5) Send via SMS — DISABLED placeholder. Email, WhatsApp + SMS integration deferred to Phase 2B. PDF + Excel formatting MUST match Credit/Tab Management module (`creditStatementGenerator.js`). Replaces previously planned standalone "Combined Export" button. Scope captured in `CR_011_S5_SCOPE_ADDENDUM_2026_06_02.md`. Confirmed: S5 = production Item Sales = S2 5-tab pattern + Download menu, parent of Phase-3 S15–S18. | Owner directive, 2026-06-02 |
| 2026-06-02 | **CR-011 S5 visual sign-off — Gate ③ PASSED.** Owner verbatim: *"lock it ok with request"*. Mockup at `/app/frontend/src/pages/reports-module/ItemSalesHybridMockup.jsx`, preview route `/reports-module/items-hybrid/preview`. S5 status: 🟡 Mockup ready → 🔵 Locked (visual). Proceeding to Gate ④ (live API wiring). Real Excel + PDF generation logic deferred to Code Gate 2 per addendum §2.6; menu buttons stub to `console.info` during Gate ④/⑤. | Owner sign-off, 2026-06-02 |
| 2026-06-02 | **CR-011 `reportExporter.js` PROMOTED to Code Gate 1.5 — SHIPPED.** Owner directive *"go path C"*: build the export primitive now (instead of Code Gate 2) so S5 Gate ⑤ validates numbers + export format together, and S6–S10 inherit it free. New file `/app/frontend/src/utils/reportExporter.js` exposes `openReportWindow`, `exportReportAsPDF`, `exportReportAsExcel`. PDF = HTML→Blob→`win.print()` (same pattern as `creditStatementGenerator.js`, reusing `STATEMENT_CSS`). Excel = SpreadsheetML 2003 XML (dependency-free, multi-sheet, frozen header, styled). Wired to S5 Download menu — Excel + PDF actions functional; Email/WhatsApp/SMS stay disabled placeholders. Smoke-verified: 6-worksheet `.xls` (16209 bytes), PDF popup title "Item Sales — The Palm House" with 5 section headers. Addendum §2.6 updated. | Owner directive, 2026-06-02 |
| 2026-06-02 | **CR-011 Item Sales — Cancelled/Comp tab data-scope mismatch flagged.** Owner spotted Tax > Revenue on S5 Cancelled Lines tab (e.g. Americano: Revenue ₹140 / Tax ₹551). Root cause: `getItemSalesAggregated` in `insightsService.js` accumulates `discount` + `tax` + `avgSalePrice` per food_id across ALL line types (sold + cancelled + comp), while UI lens for Cancelled / Comp tabs only re-points `revenue` + `qty`. Same behaviour exists on frozen S2 — inherited. **Owner picked Option 1 (service-layer split).** Verbatim: *"option 1 first update this in document"*. Decision artifact: `CR_011_DATA_SCOPE_FIX_PLAN_2026_06_02.md` — documents new fields `discountSold/Cancelled/Complementary`, `taxSold/Cancelled/Complementary`, `avgSalePriceSold/Cancelled/Complementary`; backward-compat totals preserved; UI lens patch in S2 + S5; S2 status flipped ✅ → 🔧 per §7. Implementation pending §6 approvals. | Owner directive, 2026-06-02 |
| 2026-06-02 | **CR-011 Detailed implementation plan documented for the data-scope fix.** Owner directive verbatim: *"first i need detailed planning and to be documented without missing anything"*. New artifact: `CR_011_DATA_SCOPE_FIX_IMPLEMENTATION_PLAN_2026_06_02.md` — 16 sections covering scope, pre-checks, exact service+screen diffs, side-sheet (S3 FROZEN re-open decision), test/lint plan, verification matrix (8.1–8.14 across S2/S5/Dashboard/exports/drill), atomic rollout sequence (12 steps), affected-files matrix, risk register (R1–R8), rollback strategy, post-merge doc updates, 5-gate owner approval matrix (A1–A5), time estimate, open questions (Q1–Q5). No code touched. Awaits A1–A5 approval before §9 execution. | Owner directive, 2026-06-02 |
| 2026-06-02 | **CR-011 Data-scope fix SHIPPED — implementation plan §9 executed atomically.** Owner approved A1–A5 verbatim "go". Changes: (a) `insightsService.js` `getItemSalesAggregated` accumulator + initial row + finalisation expanded with `discountSold/Cancelled/Complementary`, `taxSold/Cancelled/Complementary`, `avgSalePriceSold/Cancelled/Complementary` (+12 helper accumulators); backward-compat totals preserved. (b) `ItemSalesMockup.jsx` (S2) mapper + `lensFilteredData` patched for Cancelled/Comp tabs. (c) `ItemSalesHybridMockup.jsx` (S5) mapper + `lensFilteredData` + `buildExportPayload()` patched. (d) `ItemDrillSheet.jsx` (S3) — option 6.1.B applied (zero code edit; selectedRow shape now lensed). Verified on Palm House (rid=541) May-2026 window: Cappuccino Cancelled row Tax ₹8 (was inflated previously), Eggs Benny ₹35, Pancakes ₹0; Excel Cancelled-Lines TOTAL Tax = ₹552 (lensed); 6-worksheet `.xls` 249KB (Summary+5 tabs). Both S2 and S5 show identical numbers (parity confirmed). S2/S3/S5 status all 🟠 Re-validation pending. Lint clean, supervisor compiled warnings only. | Owner directive "go", 2026-06-02 |
| 2026-06-02 | **NEW CONSTITUTIONAL RULE — Frontend Business Logic Disclosure (Protocol §8).** Owner verbatim: *"there should be no front end business logic put until asked from owner and freezed as decision. all front end logic put to be highlighted as part of audit explaining the logic for owners decision"*. Captured as `CR_011_SCREEN_FREEZE_PROTOCOL.md §8` (§8.1–8.4). Enforced via new sub-CR **CR-011-AUDIT-01 — Frontend Business Logic Audit Gate** (registered in `CR_REGISTRY.md` Standalone CRs section, planning status). 14 candidate FE business rules pre-seeded as REVIEW items in `OWNER_DECISION_QUEUE.md` Category G (G1–G14 covering Slow-Movers threshold, Top-Sellers definition, Comp badge trigger, tax aggregation formula, menuPrice fallback chain, avgSalePrice weighting, etc.). Audit tab on S5 will surface these at runtime via `auditManifest.js` + `// @audit:rule` annotation convention. Export gate (XLSX + PDF) blocks while any RED/AMBER/REVIEW item is unresolved on the active screen. | Owner directive, 2026-06-02 |
| 2026-06-02 | **CR-011-AUDIT-01 planning kick-off.** Owner verbatim: *"Summary v3 approved · register CR-011-AUDIT-01 + protocol §8 + decision queue · go write the plan"*. Sub-CR registered, protocol §8 added, decision queue pre-seeded with 14 REVIEW items. Implementation plan to be drafted at `CR_011_S5_AUDIT_TAB_PLAN_2026_06_02.md` next. No code touched. | Owner directive, 2026-06-02 |
| 2026-06-02 | **CR-011-AUDIT-01 SHIPPED — implementation plan §9 executed atomically.** Owner approved A1–A6 verbatim "go". (a) New `auditManifest.js` — 14 entries (FE-01..FE-14; FE-14 pre-approved). (b) New `auditEngine.js` — 3 pure functions (auditRows/auditReviewItems/auditSummary) computing RED + AMBER + REVIEW with zero tolerance. (c) `insightsService.js` patched — `taxRate`/`taxType`/`taxCalc` carry-through per food_id + per-bucket `bothTaxesBooked_*` flags + 8 inline `@audit:rule` annotations. (d) `ItemSalesHybridMockup.jsx` patched — 6th Audit tab with KPI strip (Total/RED/AMBER/REVIEW) + 3 section tables sorted by Δ desc + chat-paste Approve/Reject buttons + in-place row tinting (amber/red left-border + ⚠ chip) on the other 5 tabs + Download menu Excel/PDF disabled with "GATED" badge when audit.blocksExport. Smoke-verified Palm House May 2026: 201 flags total (0 RED, 188 AMBER, 13 REVIEW). Largest AMBER: Zanzibar Burger ₹29,200 → expected ₹1,460 actual ₹1,314 Δ −₹146 (5% GST mismatch). Lint clean, supervisor compiled warnings only. | Owner directive "go", 2026-06-02 |
| 2026-06-02 | **CR-011-AUDIT-01 — Comp tab audit policy FROZEN (FE-15 APPROVED).** Owner verbatim: *"so this is correct business rule no front end used in gst calculation its should be coming from backend / so complimentary rows are correct / we can make them light green and freeze this in decision"* + *"thats correct now its a business rule flag as red"*. Decision: Comp lines audit-exempt from standard tax-rate check (Policy C-A) — GST/VAT is computed by backend against billable amount (= ₹0 for comp lines), no frontend rule involved. Safety net: non-zero gst_tax_amount or vat_tax_amount on a comp line flags RED as backend data anomaly. New severity `EXEMPT` added to `auditEngine.js`; new section + 5th KPI card added to Audit tab; comp rows on Comp tab render `bg-green-50` + `border-l-green-400` + `✓ exempt` chip via per-bucket sev lookup (so AMBER from Sold bucket does not bleed onto Comp-tab display). FE-15 manifest entry → `approved=true`. Audit total: 201 → 198 (3 comp moved to EXEMPT); 0 RED · 185 AMBER · 13 REVIEW · 3 EXEMPT. Export gate still blocked (185 + 13 active flags). `OWNER_DECISION_QUEUE.md` Category G now 15 rows, 1 decided (G15 ✅), 14 pending. | Owner directive "go", 2026-06-02 |
| 2026-06-02 | **CR-011-AUDIT-01 — Tab-by-tab audit-status group ordering FROZEN (FE-16 APPROVED).** Owner verbatim: *"yes separator · clean = no audit flag · go"*. Decision: rows on every tab (except Comp + Audit) auto-partition into "audit-flagged" (top) and "audit-clean" (bottom) groups. For All/Top/Slow tabs: flagged = AMBER/RED in Sold bucket. For Cancelled tab: flagged = `actualTax > 0` (tax booked despite cancellation); clean = `actualTax = 0` (Pattern-B cancellations). Within each group, user's column sort still applies. A separator row sits between the two groups carrying an item-count badge (amber strip for flagged, green strip for clean). Files: `lensFilteredData` in `ItemSalesHybridMockup.jsx` partitions + counts + emits separator rows via flatMap; new `// @audit:rule FE-16` annotation; `auditManifest.js` FE-16 entry approved=true. Verified Palm House May-2026 Cancelled tab: separator reads "TAX BOOKED ON CANCELLATION · 27 ITEMS — REVIEW", 27 rows with non-zero tax above (Cappuccino ₹8, My Fav Eggs ₹13, Eggs Benny ₹35, …), 40 clean cancellations below. `OWNER_DECISION_QUEUE.md` Category G now 16 rows, 2 decided. | Owner directive "go", 2026-06-02 |
| 2026-06-02 | **CR-011-AUDIT-01 — Full FE Disclosure batch SHIPPED (FE-18..FE-47, FE-46 skipped).** Owner directive: *"we should not have any front end rule unless verified and signed by me"* → *"c"* (full disclosure first) → *"a"* (ship). Codebase scan produced 30 previously-undisclosed FE business rules. All 30 registered in `auditManifest.js` with `approved=false` and matching `// @audit:rule` annotations across `auditEngine.js`, `insightsService.js`, `ItemSalesHybridMockup.jsx`. `OWNER_DECISION_QUEUE.md` Category G expanded with §G.3.1–§G.3.5 (G18..G47). Category G now 46 rows, 42 pending REVIEW. | Owner directive "a", 2026-06-02 |
| 2026-06-02 | **CR-011-AUDIT-01 — FE-17 SCOPE CORRECTED same-day (tax-presence audit, not full exemption).** Owner reviewed screenshot of all-cancelled-green state and flagged the rule mismatch: *"all cancelled rows are green, what logic u put, ?? dont edit code. tell logic which rows in cancel should be green and which amber"* → after agent explained the 4 possible rules, owner clarified verbatim: *"in audit only one who no taxes should be green, because cancelled item will not have tax"* + *"what business logic decision u frooze ??"*. **Corrected rule (FROZEN this iteration):** Business rule = cancelled lines should not carry tax. Severity logic: `tax = 0` → EXEMPT (green, matches expectation); `tax > 0` → AMBER (review, contradicts business rule); `GST + VAT both > 0` → RED (top-level safety net unchanged). NO FE expectedTax math — just tax-presence audit. Owner confirmations: *"1 amber for now"* (severity for tax > 0), *"2 re enable"* (FE-16 partition re-enabled for Cancelled tab), *"3 a"* (FE-17 entry updated in-place, scope-correction noted in `approvedSource`). Files: `auditEngine.js` Cancelled branch swapped from EXEMPT-all to tax-presence AMBER/EXEMPT; `auditManifest.js` FE-17 name/explains/approvedSource updated in-place; `ItemSalesHybridMockup.jsx` Cancelled tab removed from partition-bypass list, isFlagged predicate now checks cancelled-bucket AMBER; separator copy updated. | Owner directive "1 amber for now / 2 re enable / 3 a", 2026-06-02 |
| 2026-06-02 | **CR-011-AUDIT-01 — Session close (final) — FE-43 REJECTED + Q2 hypothesis CONFIRMED via raw API payload.** Owner directives: *"1 reject cancelled shd show cancelled and complementary shd show complementary / 2 yes confirm the hypothesis need to find when is tax coming when item is cancelled / 3. its fine / first finish these"*. **FE-43 REJECTED & shipped:** manifest entry `approved=false` with rejection quote in `approvedSource`; JSX gates Comp chip — visible only on All/Top/Slow tabs, hidden on Cancelled tab (rejected cross-tab bleed) AND Comp tab (redundant). **Q2 raw payload investigation:** agent authenticated to preprod (Palm House owner@palmhouse.com), fetched `/api/v2/vendoremployee/report/order-logs-report` with `sort_by=created_at` for 2026-04-03 to 2026-06-02 (38 MB, 2173 orders). Filtered 302 cancelled lines (food_status=3) and classified by backend `cancel_type` field. **Findings:** (a) Zanzibar Burger 12 cancelled lines = ₹4,850 revenue / ₹60 tax matches owner's UI observation exactly. (b) The ₹60 tax = 1 Post-Serve line (#013575, qty 1, ₹20 GST, line-level reason_type=3) + 1 Order-level line (#012714, qty 2, ₹40 GST, parent cancellation_reason="Before serving"). (c) **Broader pattern (per cancel_type breakdown):** Order-level cancellations: 46 lines, 5 (11%) with tax leakage ₹62 ⚠ should always be ₹0. Pre-Serve: 110 lines, 25 (23%) with tax leakage ₹380 ⚠ should always be ₹0. Post-Serve: 146 lines, 22 (15%) with tax leakage ₹314 (defensible — item was delivered). **Total tax on cancellations: ₹757 across 52 lines.** Owner asked agent to validate `cancel_type` reliability (option B) — confirmed **100% populated** (302/302 lines), FE-35 fallback never needed. **Pattern: backend booking is inconsistent, no FE rule causes this.** FE-17 AMBER correctly surfaces all 52 tax-on-cancellation rows for owner review. Decision on broader pattern (escalate to backend / new FE rule / leave-as-is) deferred to next session. Sample data preserved at `/tmp/orders_created.json` (ephemeral). Files: `auditManifest.js` G43 rejection; `ItemSalesHybridMockup.jsx` Comp chip gating + FE-43 annotation; `OWNER_DECISION_QUEUE.md` G43 row + counters; handover doc updated. Lint clean. Category G now 47 rows, 6 decided (5 approved + 1 rejected), 41 pending. | Owner directive sequence 2026-06-02 evening, 2026-06-02 |
| 2026-06-02 | **🔴 CRITICAL BUSINESS RULE FROZEN + Backend Escalation P0 raised — Cancelled order financials NOT reverted.** Owner verbatim: *"if order is cancelled tax, discount service charge delivery charge all has be reverted, this needs to be flagged to back end with critical priority"*. **New business rule (FROZEN):** When any line transitions to `food_status='3'` OR an order is fully cancelled, ALL financial fields MUST be zeroed by backend — tax (gst+vat), discount (line + order + restaurant + coupon), service charge (line + service_gst), delivery charge (charge + gst), tip, total_*_tax_amount. **Investigation deepened:** Agent extended the Q2 raw-payload analysis from tax-only to all-financials. Palm House 60-day sample: 52/302 (17%) cancelled lines leak ₹757 tax + ₹48 order-discount. Pattern uniform across all 3 cancel_types (Order/Pre-Serve/Post-Serve). **Escalation doc created:** `CR_011_BACKEND_ESCALATION_CANCELLED_FINANCIALS_2026_06_02.md` with full evidence, two concrete sample orders (Zanzibar Burger #013575 Post-Serve ₹20 + #012714 Order-level ₹40), backend asks (zero-out fields on cancellation + migration option a/b + cancel_type universality confirmation). Added to `OWNER_DECISION_QUEUE.md` Category D as new row #0 (P0 CRITICAL, above existing items). **Frontend posture:** FE-17 AMBER continues surfacing tax leakage; no FE compensating logic will be added (per owner — don't mask the bug). Candidate FE-49 (extend FE-17 to also flag discount/SC/delivery leakage) deferred to next session pending owner approval. Export gate still blocked. | Owner directive 2026-06-02 evening, 2026-06-02 |
| 2026-06-02 | **CR-011-AUDIT-01 — FE-27 REJECTED (Math.round → 2-decimal precision).** Owner verbatim: *"Reject FE-27 — remove rounding entirely, show decimal values, we have to always show actual value till 2 decimals"*. **Investigation results:** Agent replicated insightsService → apiRows → auditEngine pipeline in Python using raw Palm House 30-day payload (652 orders, 437 products). Found Math.round in apiRows mapper truncating paise BEFORE audit engine comparison. Quantified impact: 29 of 127 Sold-bucket AMBERs (23%) were **false positives** — items with zero actual deviation flagged AMBER due to ₹0.50 rounding error (e.g. Golden Pineapple: raw tax ₹122.50 → Math.round → ₹122 → expected ₹122.50 → Δ ₹−0.50 → AMBER). Additionally 51 of 127 AMBERs had Δ ≤ ₹1 (in rounding noise zone). **Code change shipped:** (a) `ItemSalesHybridMockup.jsx` apiRows mapper: all 12 currency fields changed from `Math.round(v)` to `Math.round((v\|\|0)*100)/100` (round-to-2-decimals via `r2()` helper). (b) `formatCurrency` changed from `maximumFractionDigits:0` to `minimumFractionDigits:2, maximumFractionDigits:2`. (c) `auditManifest.js` FE-27 entry updated with rejection + verbatim; FE-28 description updated (parity gap resolved). (d) `OWNER_DECISION_QUEUE.md` G27 row updated, counter now 8 decided / 40 pending. **Expected impact:** ~29 false AMBER flags eliminated; Sold-bucket AMBER drops from ~127 to ~100; audit engine now sees raw 2-decimal values. | Owner directive "go", 2026-06-02 |
| 2026-06-02 | **CR-011-AUDIT-01 — 3 tab-level fixes shipped (FE-49, FE-50, FE-01 updated). Discount deferred.** Owner investigation found: (1) All Items tab included 9 cancelled-only items (qtySold=0) showing as ghost rows with qty=0, revenue=₹0. (2) Tax/AvgPrice columns on All/Top/Slow tabs used backward-compat ALL-bucket totals instead of sold-only. (3) Slow Movers filter allowed comp-only items (latent bug, 0 current impact). Owner directed: *"yes plan all 3 fixes"* + *"first go ahead and fix these then we will come to discount handling"*. **Changes shipped:** (a) `lensFilteredData` All/Top/Slow branch now re-lenses `tax → taxSold`, `avgPrice → avgPriceSold` (discount stays ALL-bucket, deferred). 5 items corrected: Zanzibar Burger ₹392→₹400, Cappuccino ₹158→₹160. (b) All Items filter: excludes cancelled-only items (qtySold=0 && qtyCancelled>0 && qtyComp=0). Count: 224→215. (c) Slow Movers filter: added `qty > 0` guard. (d) New manifest entries FE-49 + FE-50 registered; FE-01 explains updated. (e) `OWNER_DECISION_QUEUE.md` G49+G50 rows added, counter now 50 total / 42 pending. Audit AMBER count unchanged (audit engine already used taxSold). | Owner directive "go", 2026-06-02 |
| 2026-06-02 | **CR-011-AUDIT-01 — Revenue + Discount source fix shipped (FE-51, FE-52). Root cause of Sold-bucket AMBERs found and fixed.** Owner directed Zanzibar Burger deep-dive (Apr–May: 175 sold, ₹70K revenue, ₹3,290 tax vs expected ₹3,500 = ₹210 drift). **Root cause:** Backend sends `price` = menu price (₹400), not actual collected amount. Backend computes tax on `price − discount_on_food` (per-line allocated discount). FE was reading `discount_amount` (always ₹0) instead of `discount_on_food` (₹40/₹80/₹400). Verified: 160/160 Zanzibar lines match perfectly when using `(price − discount_on_food) × 5%`. Owner verbatim: *"backend doesnt send actual value for which item was sold it always send item price...for now at front end we should decrease discount so show revenue coz item revenue will be after discount"*. **Changes shipped:** (a) `insightsService.js`: discount reads from `discount_on_food` instead of `discount_amount`; revenue = `price − discount_on_food` (actual collected). (b) Drill-down lines also show discounted revenue. (c) `auditManifest.js` FE-51 + FE-52 registered. (d) `OWNER_DECISION_QUEUE.md` G51+G52 added, counter now 54 total / 46 pending. **Expected impact:** Most Sold-bucket AMBERs eliminated (tax now matches rate × discounted revenue). Backend escalation noted: should send actual selling price. | Owner directive "go", 2026-06-02 |
| 2026-06-02 | **CR-011-AUDIT-01 — Batch rule decisions: 4 approved + 2 rejected + avgPrice + comp filter fixes.** Owner: *"complementary and cancelled should not be part of all item, fast selling or low selling"* + *"avg price of item is not right how is avg price calculated revenue/item sold correct?"*. **Approved:** FE-49 (All Items = sold only, comp-only excluded), FE-50 (tax+avgPrice lensed to sold-only), FE-51 (discount_on_food source), FE-52 (revenue = price − discount). **Rejected:** FE-02 (Top Sellers had `\|\| isComplimentary` — removed), FE-13 (avgPrice was `unitPriceSum/lineCount` = menu price avg — changed to `revenue/qty` = actual collected per unit, 149 items corrected, e.g. Zanzibar ₹400→₹376, Mojito ₹500→₹300). **Code:** (a) `ItemSalesHybridMockup.jsx`: removed `\|\| d.isComplimentary` from All Items + Top Sellers filters + tabCounts. (b) `insightsService.js`: avgSalePrice formula changed to revenue/qty per bucket. (c) `auditManifest.js`: FE-49/50/51/52 approved, FE-02/FE-13 rejected with verbatim. **Totals:** 14 decided (9 approved + 5 rejected) / 38 REVIEW pending. | Owner directive "go", 2026-06-02 |
| 2026-06-02 | **CR-011-AUDIT-01 — 7-column layout shipped (FE-53/54/55) + addon/variation revenue included + "Lost Revenue" for both Cancelled+Comp.** Owner directed complete column restructure after Eggs Benny investigation revealed add-ons (₹150 for 2 eggs + spinach) and variations were missing from revenue. New columns: Qty, Item Total (`unit_price×qty + addon + variation`), Discount (`discount_on_food`), Subtotal (`itemTotal − discount + serviceCharge`), Tax, Total Revenue (`subtotal + tax`), Avg Price (`totalRevenue / qty`). Context-aware headers: Cancelled+Comp → "Lost Revenue". Audit engine now uses subtotal as tax base → eliminates addon-caused AMBERs. FE-48 amended: "Would-be Revenue" → "Lost Revenue" on Comp tab per owner directive. 3 new rules registered (FE-53/54/55). `insightsService.js` fully restructured with per-bucket itemTotal/discount/serviceCharge/subtotal/tax/totalRevenue accumulators. | Owner directive "go", 2026-06-02 |
| 2026-06-02 | **CR-011-AUDIT-01 — Full tax drift investigation complete. Investigation report filed.** Deep-dive across Zanzibar Burger (₹210 drift → discount_on_food), Eggs Benny (₹17.50 → addons), Cappuccino (₹16 → backend zero-GST), and 5 more AMBER items. System-wide analysis: 138 zero-GST orders classified into 6 categories. 84 orders = NOT bugs (100% discount, SRM reception, tax-exempt items — our subtotal formula handles all correctly). 74 orders = REAL bugs: May 9 incident (~70 orders, ~₹2,500 GST missing P0), Room GST distribution (2 orders, ₹133 P1), misc (2 orders P2). Tolerance set ±₹0.02 (eliminates floating-point ghosts). Comp badge to be removed from sold tabs. Investigation report: `CR_011_S5_AUDIT_TAX_DRIFT_INVESTIGATION_2026_06_02.md`. Backend escalations: ESC-1 (May 9 incident P0), ESC-2 (Room GST distribution P1), ESC-3 (Cancelled financials P0, already filed), ESC-4 (price field inconsistency P2). | Investigation session, 2026-06-02/03 |
| 2026-06-04 | **CR-011 S6 — Delivery-GST audit + subtotal-drift root-cause (fork session).** (1) **FE-89 Delivery-GST rule (AMBER)** — delivery orders where API `delivery_charge_gst=0` vs expected `deliveryCharge × restaurant.deliveryChargeGstPct%` (cafe103=5%). Owner verbatim: *"1 Amber"*, *"2 just single line then our drift and this column should match"*. Single-line Del.GST(API)/Exp.Del.GST/Drift columns. (2) **Delivery-GST location badges + FE-88 AMBER downgrade** — engine classifies WHERE backend parked the un-booked delivery GST: `Del GST → Total` (only in `order_amount`, not booked → FE-88 RED→AMBER, self-heals) vs `Del GST → Header` (lumped into header `total_gst_tax_amount`, not itemized → FE-86). Downgrade only when drift == `deliveryCharge × rate%` (±₹0.02). (3) **FE-86/FE-88 de-dup vs FE-82R** — owner verbatim *"this is already highlighted red in subtotal drift so we don't need these orders here"* + *"supress"*. When already RED in FE-82R (subtotal double-count): FE-86 `Del GST → Header` suppressed (`delGstInHeader && fe82rFired`; header GST is actually correct = 5%×(items+delivery)) and FE-88 suppressed (`fe82rFired`; drift is the wrong subtotal resurfacing). Order stays RED only in FE-82R. cafe103 May1–Jun4: RED 145→117, zero genuine flags lost. (4) **Backend subtotal double-count ROOT-CAUSED + RESOLVED** — verified FE renders API faithfully (direct `order-logs-report` call same as UI); `order_sub_total_without_tax` inflated (#011949: 1080 vs correct 1030) while `total_gst_tax_amount` (51.50) + `order_amount` (1082) already correct → only stored subtotal field wrong; all rows frozen at `updated_at=2026-05-27`. **Owner confirmed the correcting backend query was NOT committed; owner committed → working fine.** Also: FE-86 mass-firing from 06-03 (2069 flags) confirmed RESOLVED via `sumItemTax` fix → now ~54. **Files:** `orderLedgerAuditEngine.js` (opts param, delGstInHeader, FE-89 branch, FE-86 tag+de-dup, FE-88 AMBER+de-dup), `auditManifest.js` (FE-89), `orderLedgerService.js` (deliveryChargeGst passthrough), `OrderLedgerMockup.jsx` (rate wiring, Del.GST columns, badges, banners). Lint clean. **S6 status: 🟢 Gate ⑤ in-flight. Handover: `NEXT_AGENT_HANDOVER_2026_06_04_CR_011_S6_DELIVERY_GST.md`. Pending owner: tab rename (said "wait"), FE-86 fStatus=1 exclusion (deferred — "still auditing"), Aggregator zomato_gold predicate, Block B/C decisions.** | Owner directive series 2026-06-04, fork session |
| 2026-06-03 | **CR-011 S5 — May 9 "incident" CORRECTED to NON-ISSUE.** Re-investigation with per-item tax_rate verification: 162 orders on May 9 → 84 normal GST + 71 tax-exempt alcohol (`tax: 0` in product config, correctly ₹0 GST) + 3 100% discount + 3 empty + 1 real bug (₹6.50). Previous analysis misclassified alcohol orders (Corona, Budweiser, Kingfisher, Mojito) as zero-GST bugs. **ESC-1 DOWNGRADED from P0 CRITICAL to CLOSED — NOT A BUG.** OWNER_DECISION_QUEUE D#14 updated. | Re-investigation, 2026-06-03 |
| 2026-06-03 | **CR-011 S5 — Complete drift re-analysis: 12 orders / ₹623.50 across Apr–Jun.** Every AMBER traced to specific orders. 2 patterns: (1) 8 orders f_order_status=2/5 (pending/unsettled) = ₹486 drift, GST not yet billed — NOT bugs, just unbilled. (2) 4 orders f_order_status=6 (paid) = ₹137.50 real backend bugs: Room GST distribution (#013489 ₹108, #013594 ₹15) + isolated anomalies (#014509 ₹6.50, #014606 ₹8). | Investigation, 2026-06-03 |
| 2026-06-03 | **CR-011 S5 — Pending Billing tab + Sold Items rename OWNER DIRECTED.** Owner: *"f_order_status should be 6"* + *"1 4 5 6 should not have any item in common these are mutually exclusive / 2 and 3 are subset of 1"* + *"keep same audit rules in pending till i manually verify audit as green"*. New 4-bucket model: CANCELLED (food_status=3) → COMP (complementary=1) → SOLD (f_order_status=6) → PENDING BILLING (remainder). Tab 1 renamed "Sold Items". New tab 6 "Pending Billing". Top Sellers + Slow Movers = strict subsets of Sold Items. Same audit engine rules for Pending tab. FE-56 + FE-57 registered. **Planning doc: `CR_011_S5_PENDING_BILLING_TAB_PLAN_2026_06_03.md`. No code yet.** | Owner directive, 2026-06-03 |
| 2026-06-03 | **CR-011 S5 — Pending Billing tab IMPLEMENTED + code shipped.** Service layer: 4th bucket (isPending = !cancelled & !comp & f_order_status≠6). Audit engine: pending bucket added to BUCKETS array. UI: 7 tabs (Sold Items / Top Sellers / Slow Movers / Cancelled Lines / Complimentary / Pending Billing / Audit), lens, column headers (Pending Qty / Unbilled Revenue), export sheet. FE-56 + FE-57 in manifest. Compiled clean. | Owner GO, 2026-06-03 |
| 2026-06-03 | **CR-011 S5 — Pending Billing shows 0 items: ROOT CAUSE FOUND.** API `sort_by=collect_bill` only returns f_order_status=6 orders (2,034). Pending orders (f=2/5, 27 total) have no collect_bill timestamp → excluded by backend. `sort_by=created_at` returns all 2,174 orders including pending. Fix: dual-fetch (second call with created_at) — same pattern Dashboard S0 already uses for cancellations. **No code yet — pending owner direction.** | Investigation, 2026-06-03 |
| 2026-06-03 | **CR-011 S5 — Lafetta cross-restaurant drift investigation.** owner@lafetta.com (rid=78): 33 AMBER items, 34 drift lines, ₹792.90 total missing tax — caused by 12 orders. 11 of 12 are from Apr 17-19 by employee "Umesh". All f_order_status=6 (paid). Mix of GST 5% and VAT 22% items. All have actual_tax=₹0. Concentrated 3-day system-level incident — real backend bug. | Investigation, 2026-06-03 |
| 2026-06-03 | **CR-011 S5 — Audit Drift Investigation feature OWNER DIRECTED.** Owner: *"In audit tab i need order details which are responsible for drift, will detailed note this kind of investigation to run dynamically when user clicks on we need to have button to run this investigation"*. New feature: "Investigate" button on each AMBER row → inline expansion showing per-order drift lines. No extra API call — data retained during existing aggregation loop. FE-58 + FE-59 registered. **Planning doc: `CR_011_S5_AUDIT_DRIFT_INVESTIGATION_PLAN_2026_06_03.md`. No code yet.** | Owner directive, 2026-06-03 |
| 2026-06-03 | **CR-011 S5 — Last Seen Ambiguity (order-level) + Items Ordered column SHIPPED (FE-60).** Initially item-per-row, then owner directed order-level view. Final form: one row per drift order, sorted latest first, with columns: Order, Date, Employee, Payment, Table, Items, Items Ordered (names), Item Total, Discount, Subtotal, GST Expected, GST Actual, GST Drift. TOTAL footer row. Owner: *"we need to show actual order not item wise"* + *"also need column item ordered next to item"*. | Owner directive + iterations, 2026-06-03 |
| 2026-06-03 | **CR-011 S5 PARKED — owner directive to start S6.** Owner: *"I will like to keep this here it self till backend doesnt correct ambiguity, and move to next screen set for orders"* → confirmed *"yes"* to park S5, start S6. S5 AMBER flags (10 items, 5 orders for Palm House; 33 items, 12 orders for Lafetta) are all backend GST bugs. Will auto-resolve when backend ships fix. Dual-fetch for Pending Billing deferred. 42 REVIEW items deferred. **S6 Order Ledger Hybrid is NEXT.** | Owner directive, 2026-06-03 |
| 2026-06-03 | **CR-011 S6 — Inheritance rules locked + revised mockup applied (Gates ① + ② + ③).** Owner confirmed point-by-point: A1–A7 header/tabs inherited from `AllOrdersReportPage` (DatePicker single-day, FilterBar PayType/Status/Payment/Channel/Platform/ALL chips, FilterTags); B1–B12 filter rules inherited; C1–C6 intentional divergences (S6 = read-only historical browsing, no inline mutations, 51-col Excel-parity table, side-sheet drill from Audit Report's `OrderDetailSheet` 480px modal not bespoke 460px rail, S5 Download pattern, S6 Audit tab DISTINCT from Audit Report's Audit tab with own rule family TBD). Open decisions resolved: F1 ✅ no future dates (inherited from DatePicker), F2 ✅ business-day boundary from profile API schedules via `getBusinessDayRange`, F3 ✅ status breakdown pills hidden for now (`breakdown={null}`), F4 ✅ filters reset on tab change, F5 ✅ filters persist on date change, F6 ✅ side-sheet closes on tab change, F7 ✅ Download hidden on Audit tab, F8 ✅ standard empty-state copy, F9 ✅ default sort Order ID desc, F10 ✅ 2-decimal currency, F11 ✅ Audit tab green when no rules. D3 dual-fetch (`collect_bill` + `created_at`) deferred to Gate ④ wiring. **R3b path approved** — thin wrapper `OrderLedgerDetailSheet.jsx` maps seed → OrderDetailSheet displayData shape (`items[]` populated → DATA MODE → skips `getSingleOrderNew` fetch). | Owner directives sequence 2026-06-03 afternoon, 2026-06-03 |
| 2026-06-03 | **CR-011 S6 — Gate ① mockup SHIPPED + Gate ② review PASSED + Gate ③ owner SIGN-OFF.** Owner verbatim: *"Sign off Gate ① — I need few changes in UI but I will do it after actual wiring with realistic data"*. Files shipped: (a) `/app/frontend/src/pages/reports-module/OrderLedgerMockup.jsx` — 9 tabs (All/Settled/Cancelled/Credit/Hold/Merged/Running/Aggregator/Audit), all 51 columns, Header + FilterBar + FilterTags + Search + Sort + DatePicker reused, S5 Download pattern (Excel/PDF + Email/WhatsApp/SMS Phase 2B placeholders), Download hidden on Audit tab, Audit tab framework with KPI strip + empty state "Ledger Audit — Rules TBD" clarifying coexistence with Audit Report audit, footer tooltip "Mockup awaits Gate ② review · Business-day + dual-fetch wire on Gate ④". (b) NEW `/app/frontend/src/pages/reports-module/OrderLedgerDetailSheet.jsx` — thin wrapper reusing Audit Report's `OrderDetailSheet` (480px modal + backdrop) via DATA MODE; maps seed row → displayData shape with `items[]` populated; DD/MM/YYYY → ISO date fix. (c) `/app/frontend/src/api/services/orderLedgerService.js` — Gate ④ TODO block added (dual-fetch pattern + business-day boundary). Routes already registered in `App.js`: `/reports-module/order-ledger` (auth) + `/reports-module/order-ledger/preview` (public). Browser verified: all 3 surfaces render (default ledger, drill on #012480 shows "Order 012480 / Settled / 31 May 2026 09:31 pm / Priya Sharma · 9988776655 / 5 Items / Settled via CASH", Audit tab shows green pill + "Ledger Audit — Rules TBD" + Download hidden). Lint clean across all 3 files. **S6 status: 🔵 Locked (visual). UI tweaks deferred to Gate ⑤ on real data per owner directive. Proceeding to Gate ④ (API wiring).** | Owner sign-off, 2026-06-03 |
| 2026-06-03 | **CR-011 S6 — Ledger Audit Block A Revised SHIPPED + classifier fix.** Series of owner directives 2026-06-03 evening: (1) Classifier fix — owner pointed out Cancelled/Merged/Hold/Aggregator tabs showing 0 ("g4 is not working nothing goes here"). Investigation revealed S6 was using wrong transform fields. Fix: replaced custom tabFilter classifier with verbatim copy of `AllOrdersReportPage.TAB_FILTERS` (L66‑123) using canonical `paymentMethod` / `paymentStatus` / `fOrderStatus` / `orderIn` / `status` fields. Added `isRoomOrderForReport` exclusion. Also discovered S6 was defaulting to `sort_by=collect_bill` while Audit Report hardcodes `created_at` (L237) — changed default attribution to `created_at` per owner verbatim "yes change to created_at". Result on cafe103 May 2026: Cancelled went 0→5, Merged went 0→68, #012460 (the user-cited example) now correctly classified as Merge. (2) Ledger Audit Block A revised — owner approved 5 rules then refined: FE-82 REJECTED ("tax is on item level fso for order level we simply need to check item total subtotal gst and total"). Replaced with FE-82R (SubTotal formula = itemTotal − discount + delivery + service + tip), FE-86 (tax aggregation: Σ items.tax = header tax), FE-88 (Grand Total = subTotal + gst + vat + roundOff). All 3 RED. FE-81 severity bumped AMBER → RED per "1 red". RoundOff confirmed always ≥0 in this system (Math.ceil pattern); profile flag `restaurant.totalRound !== false` controls but doesn't affect formula. Loyalty/coupon/wallet EXCLUDED from discount per owner directive ("ignore loyalty and coupon for now"). Engine rewritten with 4-step canonical math. **Verified live cafe103 May 1‑31:** 2077 scanned, 125 skipped, 2130 active flags — FE-81=0 ✓, FE-82R=16 (real header math breaks), FE-83=0 ✓, FE-86=2069 (likely false positives — transform doesn't carry items[].tax_amount → needs data-pipeline investigation), FE-88=45 (real header math breaks). 61 real findings (FE-82R + FE-88) need owner triage. **Files:** `orderLedgerService.js` (classifier+room-exclusion rewrite), `orderLedgerAuditEngine.js` (full rewrite, 4-step math), `auditManifest.js` (FE-82 rejected, FE-81 RED, FE-82R/86/88 added), `OrderLedgerMockup.jsx` (legend chip updates, KPI strip wiring). Lint clean across all 4. **S6 status: 🟢 Gate ⑤ in-flight — awaiting (a) FE-86 transform investigation, (b) tab labels final rename, (c) Aggregator predicate extension, (d) Block B/C decisions.** | Owner directive series 2026-06-03 evening, 2026-06-03 |

---

## Deferred Items (consolidated across all sprints)

| Item | Sprint | Reason | Next Step |
|---|---|---|---|
| 7 unfrozen business rules | POS 3.0 | Code fix + verification + owner re-approval needed per rule | Pick highest-impact rules first (5 Part B promoted 2026-05-31; 5 Part C+D promoted 2026-06-01; 7 remain blocked on owner/backend) |
| BE-1 P1-P6 display fields | POS 3.0 | Backend not delivered | Backend team schedules |
| BE-2 Lodging payment breakdown | POS 3.0 | Backend not delivered | Backend team schedules |
| BUG-097 CartPanel gate | POS 3.0 | Owner must pick Option A/B/C/D | Owner reconciliation session |
| BUG-097 Bucket 5 (rider events) | POS 3.0 | Backend must supply socket event names | Backend ships |
| BUG-104 Credit/Tab module | POS 3.0 | Full scope session needed | Owner scope session |
| BUG-105 Settlement module | POS 3.0 | Full scope session needed | Owner scope session |
| CRM 2.0 CR-003 Tab | CRM 2.0 | Not started | Owner prioritization |
| CRM 2.0 CR-005 Wallet | CRM 2.0 | Not started (deferred from BUG-108) | Discovery agent |
| CRM 2.0 CR-008 Integrations | CRM 2.0 | Scope TBD | Owner defines scope |
| Phase 3 UX-LOADING-02 | Phase 3 | Needs owner A/B picks | Owner decision |
| Order Activity Log CR | Standalone | Registered, not started | Owner prioritizes |


---

## Owner Decision Log (append-only)

| Date | Decision | Verbatim | Agent Action |
|------|----------|----------|--------------|
| 2026-06-04 | FE-61 GST NOT CONFIGURED exemption policy APPROVED | "we can mark them that till 1st gst was not added make an exception under a new policy and move them from this list and mark them green in audit" | FE-61 added to manifest (APPROVED), insightsService.js tags May-22 items as GST_NOT_CONFIGURED, S5 Audit tab renders them in green exempt block |
| 2026-06-04 | FE-58 cancelled drift false-positive FIX | Owner confirmed backend correctly reverted cancelled item tax to ₹0. Agent verified 2 sample orders (#012372, #012162): all 83 cancelled lines have gst_tax_amount=₹0 | Skipped cancelled items from FE-58 drift collector (1-line fix: `if (!isCancelled)`) |
| 2026-06-04 | S5 Audit 3-block classification SHIPPED | Investigation: 111 orders → 3 root causes: OVER TAXED (split bug, 11), TAX NOT COMPUTED (backend bug, 4), GST NOT CONFIGURED (exempt, 36). Net actionable: 15 orders | Replaced single "Last Seen Ambiguity" table with 3 classified blocks with badges |

|| 2026-06-05 | **S5 Re-open: 6 business rules locked + implemented** | Owner "lock it" — All Items tab, Punched Date default, bucket grouping, ₹0 revenue for Cancelled/Comp, within-bucket sort, tab counts | All 6 rules shipped in ItemSalesHybridMockup.jsx |
|| 2026-06-05 | **Tab reorder + renames** | Owner directive: "All / Sold / Cancelled / Complimentary / Pending / Top / Slow" + remove "Items" and "Lines" from labels | TABS array reordered + renamed |
|| 2026-06-05 | **Attribution toggle removed** | "there is no need of punch date and collect bill toggle" | Toggle removed, effectiveSortBy deleted, hardcoded created_at |
|| 2026-06-05 | **All audit badges/tinting removed from data tabs** | Owner directive: remove all badges colors from all tabs except Audit | Row tinting, chips, FE-16 separators removed from all data tabs |
|| 2026-06-05 | **42 REVIEW rules batch-approved** | Owner reviewed all groups A–F and approved | auditManifest.js: 42 rules → approved=true |
|| 2026-06-05 | **FE-54 confirmed** | "service charge and tips are same thing, delivery charge excluded" | No code change — formula correct as-is |
|| 2026-06-05 | **FE-51 future CR noted** | "in future we will have item level discount also" | Doc note only, CR when backend ships |
|| 2026-06-05 | **Audit tab env-gated** | "audit tab will be configuration based only if env is yes it will show, keep it on only in pre production" | REACT_APP_SHOW_AUDIT_TAB=true/false |
|| 2026-06-05 | **Cancelled + Comp: red revenue loss** | "in complimentary and cancelled it should be revenue loss and numbers in red" | Summary strip + table cells in red |
|| 2026-06-05 | **Export gate: AMBER excluded** | Owner picked option 2: "Gate only on RED + REVIEW, not AMBER" | auditEngine.js blocksExport = (red + review) > 0 |
|| 2026-06-05 | **Station + Category summary in exports** | "station wise category wise summary only in pdf and excel" — Option A (Sold only), Option B (compact both on one page), alphabetical | 2 new sheets + PDF first page summaryTables |
|| 2026-06-05 | **Production cleanup** | "remove all these messages coming soon etc just keep them disabled" | Dev messages, badges, footer text removed |
|| 2026-06-05 | **S5 FROZEN** | "I think we are good to freeze screen for item sales" | CR_011_SCREEN_FREEZE_LOG.md → S5 ✅ FROZEN |
|| 2026-06-05 | **Route swap** | S5 replaces S2 at `/reports-module/items` | App.js updated || 2026-06-11 | **POS 4.0 PRE-FREEZE CONSOLIDATION + OWNER RULINGS R1–R5.** Full doc⇄code reconciliation (code = truth, 23 items validated, 21 VERIFIED, 0 code defects). Owner rulings: **R1** CR-021 smoke covered both flows → CLOSED. **R2** CR-023 smoke done → CLOSED. **R3** renumbering approved — Toast CR→**CR-027**, 401-redirect bug→**BUG-123**, socket-payload bug→**BUG-124**. **R4** Session-3 fixes retro-registered as **CR-026 Report Data & Rounding Sweep**. **R5** BUG-112/113/114 → formal smoke batch. Registers synced (CR_REGISTRY +10 rows, BUG_TRACKER, CONTROL_DASHBOARD, OWNER_DECISION_QUEUE Cat-G 68/2/0 from auditManifest, ENV_REGISTRY new pod). **Freeze now blocked ONLY on smoke batch S-1…S-9 (`POS4_0_OWNER_SMOKE_BATCH_2026_06_11.md`) + DEBUG-B11 log removal.** Reports: `POS4_0_BASELINE_CONSOLIDATION_REPORT_2026_06_11.md`. | Owner rulings R1–R5, 2026-06-11 |
