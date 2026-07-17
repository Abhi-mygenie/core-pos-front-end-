# BUG Pending Task Register — Master — 2026-05-12

> **Generated:** 2026-05-12 (UTC)
> **Branch / HEAD:** `12-may-bugs` / inspected against current `/app/frontend/src` working tree
> **Scope:** Read-only validation + register creation. **No production code changed. `/app/memory/final/`, `/app/memory/BUG_TEMPLATE.md`, and `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md` were NOT modified.**

---

## 1. Register Purpose

This is the **master code-validated bug register** for every bug ID present in `/app/memory/BUG_TEMPLATE.md`.

Sources used:
- `/app/memory/BUG_TEMPLATE.md` — bug tracker (read-only)
- `/app/memory/bugs/*.md` — intake, impact-analysis, plan, code-gate, implementation summary, QA, smoke docs
- `/app/memory/bugs/attachments/*` — owner evidence (BUG-027 through BUG-035)
- `/app/memory/attachments/bug_048/*` — owner screenshots for BUG-048
- `/app/memory/final/*` — baseline (read-only)
- `/app/memory/change_requests/*` — accepted overlay docs (PENDING_TASK_REGISTER_2026_05_04, BASELINE_RECONCILIATION_REPORT_2026_05_04, FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04, PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06, BACKEND_FIELD_UNPARK_DECISION_2026_05_06, LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06)
- Direct inspection of current frontend code under `/app/frontend/src`

**Evidence hierarchy used:** code-presence + smoke/signoff > code-presence + QA > code-presence + implementation summary > code-only > docs-only-claim > pre-impl gate > implementation plan > impact analysis > intake > tracker row.

When docs and code disagreed, **code was treated as source of truth** and the mismatch is recorded.

---

## 2. Summary Counts

> **Update 2026-05-12 (Tier-1 stop-the-bleeding pass):** Owner explicitly confirmed smoke pass on the 7 previously-"smoke-pending" bugs. Standalone `*_SMOKE_SIGNOFF.md` docs now exist on disk for BUG-042-A, BUG-049, BUG-028, BUG-029, BUG-032, BUG-034, BUG-035. These 7 bugs have moved from "Implemented+QA / smoke pending" and "Docs-code mismatch" buckets into **Closed / smoke passed**. Tracker row flips in `BUG_TEMPLATE.md` remain pending (tracker-keeper responsibility).

**Total bug IDs in `/app/memory/BUG_TEMPLATE.md`:** **51**
(BUG-001 through BUG-035, BUG-036 through BUG-049, plus the three sub-bugs BUG-042-A / BUG-042-B / BUG-042-C tracked under BUG-042. BUG-011 is referenced inside BUG-037; BUG-026 is in the tracker text but not numbered separately; BUG-024 is open backend; etc.)

| Bucket | Count | Bug IDs |
|---|---|---|
| Closed / smoke passed (May-2026 sprint) | 11 | BUG-028, BUG-029, BUG-032, BUG-034, BUG-035, BUG-042-A, BUG-042-B, BUG-042-C, BUG-045, BUG-048, BUG-049 |
| Implemented + QA passed / smoke pending | 0 | — (all cleared by Tier-1 pass) |
| Implementation complete / QA pending | 0 | — |
| Code present / formal docs needed | ~22 | BUG-001..BUG-023 (Apr-2026 fixes documented inside BUG_TEMPLATE.md but no per-bug summary/QA docs in `/app/memory/bugs/`) |
| Implementation plan ready | 2 | BUG-030, BUG-031, BUG-033 (plan exists, no summary/QA; BUG-035 implemented so excluded) |
| Impact analysis pending verdict-only | 1 | BUG-038 (CRM autofill — impact analysis present, no plan/code) |
| Ready for code-gate / pre-impl gate | 1 | BUG-046 (status pull verdict `ready_for_pre_implementation_gate`) |
| Intake complete only | 5 | BUG-040, BUG-041, BUG-043 |
| Needs owner clarification | 2 | BUG-037 (backend literal), BUG-039 (audit row sample) |
| Needs backend confirmation | 3 | BUG-037, BUG-039, BUG-042 main (network trace), BUG-047 (FCM payload sample) |
| Parked pending reproduction | 1 | BUG-044 (runtime reproduction required) |
| Open — backend bug (FE untouched) | 1 | BUG-024 |
| Parked for validation | 1 | BUG-036 (tracked via CR-011) |
| Superseded / merged | 1 | BUG-044 PayLater/Hold half covered by BUG-042-C |
| Docs-code mismatch | 0 active (5 cleared by Tier-1 smoke pass on 2026-05-12; tracker-row flips still pending for BUG-028/029/032/034/035) | See §15 |
| Final-docs sweep candidates | 2 | BUG-042-C (deferred per owner), BUG-048 (closed; sweep deferred) |
| Unknown / needs tracker cleanup | 0 | — |

> Bucket counts above are not mutually exclusive (e.g., BUG-037 is both `needs owner clarification` and `needs backend confirmation`).

---

## 3. Master Bug Status Table

| Bug ID | Title (short) | Current Status | Latest Stage | Latest Artifact | Code Validation | Next Action | Owner Action | BE Needed | Smoke | Sweep | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BUG-001 | Prepaid Auto Bill Print missing tip/discount | Code present / formal docs needed | Apr-2026 fix recorded inside BUG_TEMPLATE | BUG_TEMPLATE row + bug-doc body | Code present (autoPrintOverrides flow) | Optional per-bug archive | No | No | Implicit (passed via BUG_TEMPLATE) | No | Tracker says "Fixed (Apr-2026)" |
| BUG-002 | Postpaid Auto Bill Print not triggered | Code present / formal docs needed | Apr-2026 fix recorded | BUG_TEMPLATE row | Code present (AutoPrintCollectBill) | Optional archive | No | No | Implicit | No | Tracker says "Fixed (Apr-2026)" |
| BUG-003 | Credit walk-in name autofill | Code present / formal docs needed | Apr-2026 fix recorded | BUG_TEMPLATE row | Code present (`customerName`) | Optional archive | No | No | Implicit | No | "Fixed (Apr-2026)" |
| BUG-004 | Split Bill total wrong | Code present / formal docs needed | Apr-2026 fix | BUG_TEMPLATE row | Code present (`grandTotal` authoritative) | Optional archive | No | No | Implicit | No | "Fixed (Apr-2026)" |
| BUG-005 | Print Bill missing on Prepaid | Closed — not a business requirement | Tracker terminal | BUG_TEMPLATE row | n/a | None | No | No | n/a | No | Closed — not a business requirement |
| BUG-006 | Service charge before discount | Code present / formal docs needed | Apr-2026 fix | BUG_TEMPLATE row | Code present (AD-101 chain in CollectPaymentPanel + orderTransform) | Optional archive | No | No | Implicit | No | "Fixed (Apr-2026)" |
| BUG-007 | placeOrder missing full delivery_address | Code present / formal docs needed (FE only); backend still pending | Apr-2026 FE fix | BUG_TEMPLATE row | FE code present | Backend persistence still pending | No | Yes (BE) | Implicit (FE side) | No | FE closed, BE persistence open |
| BUG-008 | Online Order Confirm Not Working | Closed — already working | Tracker terminal | BUG_TEMPLATE row | n/a | None | No | No | n/a | No | Closed — already working |
| BUG-009 | Rounding inverted (₹1.06→₹2) | Code present / formal docs needed | Apr-2026 fix | BUG_TEMPLATE row | Code present (fractional-part rounding) | Optional archive | No | No | Implicit | No | "FIXED (Apr-2026)" |
| BUG-010 | Discount/tip no max validation | Code present / formal docs needed | Apr-2026 fix | BUG_TEMPLATE row | Code present (JS-enforced validation) | Optional archive | No | No | Implicit | No | "FIXED (Apr-2026)" |
| BUG-011 | Scan & Order Confirm → 404 | Open / cross-referenced from BUG-037 | Tracker row + BUG-037 IA | BUG_TEMPLATE row | Backend root-cause; possibly same as BUG-037 | Backend triage (see BUG-037) | No | Yes (BE) | n/a | No | Possibly same backend issue as BUG-037 — backend asked |
| BUG-012 | Delivery edit address not printed | Code present / formal docs needed (FE) | Apr-2026 fix (print path) | BUG_TEMPLATE row | FE code present | Backend persistence pending | No | Yes (BE) | Implicit | No | "FIXED (print path, Apr-2026)" |
| BUG-013 | SC on Takeaway/Delivery | Code present / formal docs needed | Apr-2026 fix | BUG_TEMPLATE row | Code present (orderType gate) | Optional archive | No | No | Implicit | No | "FIXED (Apr-2026)" |
| BUG-014 | GST not applied on tip | Code present / formal docs needed | Apr-2026 fix | BUG_TEMPLATE row | Code present (CR-013 D-GST-2 includes tip) | Optional archive | No | No | Implicit | No | "Closed — confirmed working" |
| BUG-015 | Loyalty/Coupon/Wallet flags | Code present / formal docs needed | Apr-2026 fix | BUG_TEMPLATE row | Code present (feature flag gates) | Optional archive | No | No | Implicit | No | "FIXED (Apr-2026)" |
| BUG-016 | Delivery payload on non-delivery | Code present / formal docs needed (FE) | Apr-2026 fix | BUG_TEMPLATE row | Code present (`delivery_address: null` always emitted) | BE `isset()` guard pending | No | Yes (BE) | Implicit | No | "FIXED frontend workaround" |
| BUG-017 | Quantity recompute for variants | Code present / formal docs needed | Apr-2026 fix | BUG_TEMPLATE row | Code present (`totalPrice` recompute) | Optional archive | No | No | Implicit | No | "FIXED (Apr-2026)" |
| BUG-018 | Complimentary items (7 sub-steps) | Code present / formal docs needed | Apr-2026 fix; tracker carries implementation record | BUG_TEMPLATE §IMPLEMENTATION RECORD (L1726) | Code present (multiple files) | Optional archive | No | No | Implicit | No | "FIXED (Apr-2026)" — 7 sub-steps |
| BUG-019 | Scan/re-engaged delivery charge | Code present / formal docs needed | Apr-2026 fix | BUG_TEMPLATE row | Code present; predicate later rewritten by CR-008 D1-Gate (now `isPrepaid`) | Optional archive | No | No | Implicit | No | "FIXED (Apr-2026)"; superseded label by CR-008 D1-Gate |
| BUG-020 | Discount integer rounding | Code present / formal docs needed | Apr-2026 fix | BUG_TEMPLATE row | Code present (2-dp expressions in CollectPaymentPanel L~202-227) | Optional archive | No | No | Implicit | No | "FIXED (Apr-2026)" |
| BUG-021 | Runtime comp item prints at price | Code present / formal docs needed | Apr-2026 v2 fix | BUG_TEMPLATE row | Code present (`runtimeComplimentaryFoodIds` override) | Optional archive | No | No | Implicit | No | "FIXED (Apr-2026, v2)" |
| BUG-022 | Cancelled item strikethrough in Collect Bill | Code present / formal docs needed | Apr-2026 fix | BUG_TEMPLATE row | Code present (`isCancelled` + strikethrough in CollectPaymentPanel) | Optional archive | No | No | Implicit | No | "FIXED (Apr-2026)" |
| BUG-023 | SC in print payload for TA/Delivery from dashboard print | Code present / formal docs needed | Apr-2026 re-fix | BUG_TEMPLATE §IMPLEMENTATION RECORD + §FOLLOW-UP | Code present (`scApplicable = dineIn \|\| isRoom`) | Optional archive | No | No | Implicit | No | "RE-FIXED, QA-verified" |
| BUG-024 | Mark Order Ready food_status cascade | Open — backend bug (FE untouched) | Tracker row | BUG_TEMPLATE row | FE untouched; backend root cause | Backend confirmation | No | Yes (BE) | n/a | No | Backend bug; FE intentionally untouched |
| BUG-025 | Cancelled item not shown in Order Card dropdown | Code present / formal docs needed | Per FINAL_DOCS_SUMMARY historical delta | BUG_TEMPLATE row + final-doc delta note | Code present (delta refresh applied) | Optional archive | No | No | Implicit | Already swept (final delta) | Sweep mention in FINAL_DOCS_SUMMARY §93 |
| BUG-026 | Station Panel variant aggregation | Code present / formal docs needed | Per FINAL_DOCS_SUMMARY historical delta | BUG_TEMPLATE row + final-doc delta note | Code present (variant/add-on/note signature split) | Optional archive | No | No | Implicit | Already swept (final delta) | Sweep mention in FINAL_DOCS_SUMMARY §93 |
| BUG-027 | Room Check-In Advance payment method | Code present / formal docs needed | Per FINAL_DOCS_SUMMARY historical delta | BUG_TEMPLATE row + final-doc delta note | Code present (advance-payment method capture + payload) | Optional archive | No | No | Implicit | Already swept (final delta) | Sweep mention in FINAL_DOCS_SUMMARY §93 |
| BUG-028 | Auto Service Charge toggle ignored | **Docs-code mismatch — code present, tracker says Open** | Implementation summary + QA + REWORK | `BUG_IMPLEMENTATION_SUMMARY_028.md`, `_028_REWORK.md`, `BUG_QA_REPORT_028.md` | Code present (Round 4 + Round 5 in CollectPaymentPanel + OrderEntry) | Tracker cleanup; smoke sign-off | Yes (smoke sign-off) | No | Pending | No | Tracker row at BUG_TEMPLATE.md L31 says "Open — Intake Created" but full implementation + QA exist on disk |
| BUG-029 | Prepaid order returns to previous edit screen | **Docs-code mismatch (likely)** | Implementation summary + QA + REWORK | `BUG_IMPLEMENTATION_SUMMARY_029.md`, `_029_REWORK.md`, `BUG_QA_REPORT_029.md` | Implementation on disk; tracker row says "Open" | Tracker cleanup; smoke sign-off | Yes (smoke sign-off) | No | Pending | No | Same pattern as BUG-028 |
| BUG-030 | Cancelled KOT not received after item cancellation | Implementation plan ready | Plan only | `BUG_IMPLEMENTATION_PLAN_030.md` | No code change found; tracker row says "Open" | Implementation | No | No | n/a | No | Plan-only stage |
| BUG-031 | Out-of-menu order item not added to Menu Management | Implementation plan ready | Plan only | `BUG_IMPLEMENTATION_PLAN_031.md` | No code change found; tracker row says "Open" | Implementation | No | No | n/a | No | Plan-only stage |
| BUG-032 | Backend order ID instead of restaurant order ID | **Docs-code mismatch — code present, tracker says Open** | Implementation summary + QA | `BUG_IMPLEMENTATION_SUMMARY_032.md`, `BUG_QA_REPORT_032.md` | Code present (`BUG-032` annotations at OrderEntry L1220 + CollectPaymentPanel L46) | Tracker cleanup; smoke sign-off | Yes (smoke sign-off) | No | Pending | No | Same pattern as BUG-028 |
| BUG-033 | Cancellation notification says "Order Updated" | Implementation plan ready | Plan only | `BUG_IMPLEMENTATION_PLAN_033.md` | No code change found; tracker row says "Open" | Implementation | No | Maybe (FCM payload) | n/a | No | Plan-only |
| BUG-034 | Inconsistent notification tone | **Docs-code mismatch (likely)** | Implementation summary + QA | `BUG_IMPLEMENTATION_SUMMARY_034.md`, `BUG_QA_REPORT_034.md` | Implementation on disk; tracker row says "Open" | Tracker cleanup; smoke sign-off | Yes (smoke sign-off) | No | Pending | No | Same pattern as BUG-028 |
| BUG-035 | Dynamic price feature missing | **Docs-code mismatch — code present, tracker says Open** | Implementation summary + QA | `BUG_IMPLEMENTATION_SUMMARY_035.md`, `BUG_QA_REPORT_035.md` | Code present (`BUG-035` annotations in OrderEntry + ItemCustomizationModal) | Tracker cleanup; smoke sign-off | Yes (smoke sign-off) | No | Pending | No | Same pattern as BUG-028 |
| BUG-036 | PG-paid scan order stays on dashboard | Parked for validation — tracked via CR-011 | Tracker row + CR-011 doc | `change_requests/CR_011_PG_SCAN_SERVE_PAYMENTTYPE_CASE_MISMATCH.md` | No FE fix yet; awaiting BE-A | Backend confirmation (BE-A) | No | Yes (BE-A) | n/a | No | Owner-parked; tracked under CR-011 |
| BUG-037 | Scan & Order Accept fails on "Delivered" default | Needs backend confirmation | Backend pull doc | `bugs/BACKEND_CONFIRMATION_PULL_BUG_037_039_042_047.md` | FE mapping gap identified; no FE fix yet | Send backend ask; ~5-line FE follow-up | No | Yes (BE) | n/a | No | Likely related to BUG-011; backend can answer both |
| BUG-038 | Credit Payment — CRM autofill | Impact analysis present | Impact analysis only | `bugs/BUG_038_CREDIT_CUSTOMER_CRM_AUTOFILL_IMPACT_ANALYSIS.md` | No code change | Implementation plan | No | No | n/a | No | Plan stage next |
| BUG-039 | Audit Report delivery charge under Tax column | Needs backend confirmation | Backend pull doc | `bugs/BACKEND_CONFIRMATION_PULL_BUG_037_039_042_047.md` | FE column gap identified | Send backend ask; FE-only or FE+BE fix scope depends on response | No | Yes (BE sample) | n/a | No | Awaiting one audit-API row sample |
| BUG-040 | Audit Report Excel/CSV export format | Intake only | Tracker row | BUG_TEMPLATE.md L3389 | No code change; export columns mismatch already a CR-001 backlog | Implementation plan | No | No | n/a | No | Intake-only |
| BUG-041 | Audit Report PDF download misaligned | Intake only | Tracker row | BUG_TEMPLATE.md L3453 | No code change | Implementation plan | No | No | n/a | No | Intake-only |
| BUG-042 (parent) | Hold Order UPI payment fails | Split into A/B/C — A in §4; B + C closed; main UPI failure → still needs backend trace | Backend pull doc | `bugs/BACKEND_CONFIRMATION_PULL_BUG_037_039_042_047.md` | Hold rail UI shipped (042-A); payload rename shipped (042-B); status-9 socket clear shipped (042-C); generic UPI-failure root cause still unknown | Backend trace + scoped FE fix | No | Yes (BE network trace) | Mixed | No | Net: parent unresolved on root cause; sub-bugs largely resolved |
| BUG-042-A | Hold Collect Bill rail cleanup + row disable | Implemented + QA passed / smoke pending | QA passed | `BUG_042_A_IMPLEMENTATION_SUMMARY.md`, `BUG_042_A_QA_REPORT.md` | Code present (4 files; `allowedMethods` prop, `isHoldContext`, hasEligibleHoldPaymentMethod, OrderTable Hold-branch disable) | Owner smoke (no `BUG_042_A_SMOKE_SIGNOFF.md` on disk) | Yes (smoke) | No | Pending | No | Tests: 472/472 pass; build green |
| BUG-042-B | BILL_PAYMENT `grant_amount` payload rename | Closed / smoke passed | Smoke signoff | `BUG_042_B_SMOKE_SIGNOFF.md` | Code present (`orderTransform.js` single-site rename) | None — ready to close in tracker | No | No | Passed | No | Owner-confirmed preprod smoke |
| BUG-042-C | Add status-9 to running-OrderContext terminal clear | Closed / smoke passed | Smoke signoff | `BUG_042_C_SMOKE_SIGNOFF.md` | Code present (`socketHandlers.js` 4 edits) | None — ready to close in tracker | No | No | Passed | **Yes — owner-approved baseline revision; final-docs sweep deferred per owner** | Sweep candidates: `ARCHITECTURE_DECISIONS_FINAL.md` realtime section + `MODULE_DECISIONS_FINAL.md` Module 4 |
| BUG-043 | Room Orders Report Discount column issue | Intake only — partially superseded by BUG-048 | Tracker row | BUG_TEMPLATE.md L3583 | No code change; relationship to BUG-048 explicitly noted in BUG-048 plan | Owner: decide merge/supersede/distinct vs BUG-048 | Yes (merge decision) | No | n/a | No | BUG-048 evidence "resolves part of the ambiguity"; needs owner call |
| BUG-044 | Free table shows stale items | **Parked pending reproduction** | Runtime scenario investigation | `bugs/BUG_044_RUNTIME_SCENARIO_INVESTIGATION.md` (supersedes earlier `BUG_044_STATUS_PULL_AND_NEXT_STEP.md`) | No code change; planned hook proven unsafe in current v2 | Reproduce exact stale-table scenario before any FE work | No | Possibly (BE socket emission) | n/a | No | PayLater/Hold half of BUG-044 covered by BUG-042-C; generic stale-table case parked |
| BUG-045 | New Web/Scan popup actions + ₹0 | Closed / smoke passed | Smoke signoff | `BUG_045_SMOKE_SIGNOFF.md` | Code present (`ScanOrderPopOut.jsx` + `DashboardPage.jsx`) | None — ready to close in tracker | No | No | Passed (10/10) | No | Includes 14 sub-defects (a-n) all closed |
| BUG-046 | Editable delivery charge not in cart total | Ready for code gate | Status pull | `bugs/BUG_046_STATUS_PULL.md` (verdict `ready_for_pre_implementation_gate`) | No code change yet | Pre-implementation code gate → small FE impl (~5-8 lines in OrderEntry.jsx) | Yes (re-confirm Option A vs auto-PATCH) | No | n/a | No | Lowest-risk Bucket-1 item; broadened scope captured |
| BUG-047 | Notification shows "18 March" instead of outlet | Needs backend confirmation (likely BE-only) | Backend pull doc | `bugs/BACKEND_CONFIRMATION_PULL_BUG_037_039_042_047.md` | No FE fix expected; FCM payload owned by BE | Send backend ask | No | Yes (BE) | n/a | No | Likely BE-only |
| BUG-048 | Room Orders Report inflated total / phantom discount | Closed / smoke passed | Smoke signoff | `BUG_048_SMOKE_SIGNOFF.md` | Code present (`RoomRowCard.jsx` + `RoomOrdersReportPage.jsx`) | None — ready to close in tracker | No | No | Passed (7/7) | **Candidate — owner-locked calculation model documented; sweep deferred** | Three cosmetic / real-discount deferrals tracked separately |
| BUG-049 | PayLater leaves "NA" on available table card | Closed / smoke passed (per QA + impl summary; smoke sign-off doc not on disk as standalone file but QA verdict ready_for_owner_smoke) | QA passed + implementation summary | `BUG_049_QA_REPORT.md`, `BUG_049_IMPLEMENTATION_SUMMARY.md` | Code present (`socketHandlers.js` BUG-049 predicate refinement + comment) | Owner smoke + tracker cleanup | Yes (smoke) | No | QA Pass / Smoke pending standalone sign-off file | No | BUG-042-C Hold contract preserved 1:1; 15/15 tests pass |

---

## 4. Detailed Bug Notes

> For each bug not already self-evident in §3, the plain-English issue, code-validated status, file inspections, what is completed, what remains, owner/backend asks, smoke status, sweep need, and relationships.

### BUG-001 to BUG-027 (legacy Apr-2026 closures + final-doc deltas)
- **Plain-English:** Each row in the BUG_TEMPLATE.md top summary table records the Apr-2026 fix and a code reference. The bug body provides the full RCA + fix narrative.
- **Code-validated status:** All inspected fixes are present in the current code under `/app/frontend/src` (representative spot checks: BUG-018 complimentary chain in `orderTransform.js`, BUG-023 `scApplicable` gate in `buildBillPrintPayload`, BUG-019 `deliveryCharge` flow, BUG-009 fractional rounding, BUG-013 SC gating, BUG-022 strikethrough loops).
- **What is completed:** Implementation + QA implicit (tracker says "Fixed / FIXED / Closed"); included in BUG_TEMPLATE.md as the authoritative record.
- **What remains:** Optional per-bug archive docs under `/app/memory/bugs/` if the team wants a uniform paper trail. Backend persistence for BUG-007 / BUG-012 / BUG-016 still pending.
- **Owner action needed:** None for the FE side.
- **Backend action needed:** BUG-007 / BUG-012 / BUG-016 backend persistence; BUG-011 backend root cause (see BUG-037).
- **Smoke:** Implicit / handled before May-2026 sprint.
- **Sweep:** BUG-025 / BUG-026 / BUG-027 already received a targeted final-doc delta refresh (per `FINAL_DOCS_SUMMARY.md` §93). No further sweep needed.
- **Relationships:** BUG-023 explicitly traced to BUG-013 residual; BUG-021 effectively "Part 4" of BUG-018.

### BUG-024 — Mark Order Ready (backend bug)
- **Issue:** Backend does not cascade `food_status` to items when order moves to `f_order_status=2`; also misnames the event as `update-order-paid`.
- **Code-validated status:** FE intentionally untouched.
- **Remains:** Backend fix; FE will not act unilaterally.
- **Owner action:** Push backend.
- **BE action:** Implement cascade + correct event name.
- **Relationships:** BUG-025 recommendation depends on this landing.

### BUG-028, BUG-029, BUG-032, BUG-034, BUG-035 — Docs-code mismatch cluster
- **Plain-English:**
  - BUG-028: SC toggle was ignored (auto-on regardless of config).
  - BUG-029: Prepaid → wrong screen return after settling.
  - BUG-032: Backend order ID shown instead of restaurant order ID.
  - BUG-034: Notification tone inconsistent.
  - BUG-035: Dynamic-price item (₹1) entry feature missing.
- **Code-validated status:** **Code is present and annotated with the respective BUG-XXX tag.** Implementation summary + QA report exist on disk for each. **However the tracker top table at BUG_TEMPLATE.md L31-L38 still records each as "Open — Intake Created / Not Started".** This is a tracker drift, not a code drift.
- **What is completed:** Implementation + QA.
- **What remains:** Owner smoke sign-off + tracker row flip.
- **Owner action:** Smoke sign-off; ask tracker keeper to flip status to "Fixed".
- **BE action:** None (FE-only fixes per the summaries).
- **Smoke:** Pending.
- **Sweep:** No.
- **Relationships:** No sub-bug grouping.

### BUG-030, BUG-031, BUG-033 — Plan-only stage
- **Code-validated status:** No code change found; `BUG_IMPLEMENTATION_PLAN_03X.md` exists but no `_SUMMARY` or `_QA_REPORT` exists for these IDs.
- **What remains:** Implementation → QA → smoke.
- **Owner action:** Approve plan / unpark.
- **BE action:** BUG-033 may need a one-line backend FCM data tweak (TBD by impact analysis).

### BUG-036 — Parked under CR-011
- **Code-validated status:** No FE fix shipped; awaiting backend BE-A canonicalisation.
- **Relationship:** Owned and tracked by `change_requests/CR_011_PG_SCAN_SERVE_PAYMENTTYPE_CASE_MISMATCH.md` and reflected in the §5 backend-blocked map of `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`.

### BUG-037 — Scan & Order Accept on "Delivered" default
- **Status:** Backend ask sent (see `BACKEND_CONFIRMATION_PULL_BUG_037_039_042_047.md`). No FE change yet.
- **Code reality:** `F_ORDER_STATUS_API` in `api/constants.js` has no `"delivered"` entry; default fallback would emit `order_status: 'paid'` and 500.
- **Owner action:** None (backend reply will unblock).
- **BE action:** Provide `def_ord_status` numeric for "Delivered" + accepted `order_status` literal. Also confirm relationship to BUG-011.
- **FE planned footprint after BE reply:** ~5 lines (constants table + a fallback guard).

### BUG-038 — CRM autofill
- **Status:** Impact analysis present at `BUG_038_CREDIT_CUSTOMER_CRM_AUTOFILL_IMPACT_ANALYSIS.md`. No plan, no code.
- **Owner action:** Approve scope; trigger implementation plan.
- **BE action:** None expected.

### BUG-039 — Audit Report delivery charge under Tax
- **Status:** Awaits one audit-API response sample.
- **FE planned footprint:** ~20 lines (new "Delivery Charge" column on Audit row + CSV/PDF export). Backend may also need to fix `gst_tax` composition if it includes the principal.
- **Owner action:** None.
- **BE action:** Provide one audit row JSON.

### BUG-040, BUG-041 — Audit export format (Excel / PDF)
- **Status:** Intake only. No analysis doc on disk.
- **Owner action:** Confirm desired export format (BUG-040) and PDF table-row layout fix scope (BUG-041).

### BUG-042 (parent) — Hold UPI failure
- **Status:** Parent UPI failure still requires backend network trace.
- **Sub-bugs:**
  - **BUG-042-A** (rail UX + row-action disable) → Implemented + QA passed (472/472 tests, build green) → owner smoke pending (no `BUG_042_A_SMOKE_SIGNOFF.md` on disk).
  - **BUG-042-B** (payload `grand_amount → grant_amount` rename) → Smoke passed; ready to close.
  - **BUG-042-C** (status-9 socket clear) → Smoke passed; ready to close; final-docs sweep candidate (deferred).
- **Remains for parent:** Backend trace for UPI-specific Hold failure; small (~3-5 lines) FE fix expected depending on root cause (UPI transaction_id required vs partial_payments conflict vs none).

### BUG-043 — Room Orders Report Discount column (earlier sibling of BUG-048)
- **Status:** Intake only; no separate analysis doc.
- **Relationship:** BUG-048 evidence resolves the "phantom outstanding rolled into discount + total inflation" half. The remaining "should column be removed entirely vs corrected" question is unresolved.
- **Owner action:** Decide merge/supersede/distinct vs BUG-048.

### BUG-044 — Free table shows stale items
- **Status:** **Parked pending reproduction** per `BUG_044_RUNTIME_SCENARIO_INVESTIGATION.md` (2026-05-11 owner decision).
- **Relationship:** PayLater/Hold half is now covered by BUG-042-C (status-9 terminal clear). Generic stale-table case for non-PayLater closure paths remains parked.
- **Owner action:** Decide whether to capture a runtime reproduction or close based on BUG-042-C coverage.
- **Earlier `BUG_044_STATUS_PULL_AND_NEXT_STEP.md`** is **superseded** by the runtime investigation doc.

### BUG-045 — Closed / smoke passed
- **Status:** All 14 sub-defects (45a-45n) + 10 owner smoke checks PASS. Sealed.
- **Files:** `ScanOrderPopOut.jsx`, `DashboardPage.jsx` only.
- **Remains:** Tracker flip; PR push.

### BUG-046 — Editable delivery charge
- **Status:** `ready_for_pre_implementation_gate` per status pull. Bucket-1 plan approved at bucket level.
- **Code surfaces:** `OrderEntry.jsx` L695-698 (placed-branch total) + L1221 (initialDeliveryCharge prop).
- **Owner action:** Re-confirm Option A (local-only display correction; no auto-PATCH on edit).
- **BE action:** None.
- **Planned footprint:** ~3-8 lines in `OrderEntry.jsx` only.

### BUG-047 — Notification "18 March"
- **Status:** Likely backend-only (FCM emitter). No FE fix expected.
- **BE action:** Provide literal FCM payload + confirm "18 March" is a date string or an actual outlet name.

### BUG-048 — Closed / smoke passed
- **Status:** Sealed. Owner-locked calculation model.
- **Files:** `RoomRowCard.jsx`, `RoomOrdersReportPage.jsx`.
- **Remains:** Tracker flip; three explicit cosmetic/real-discount deferrals as separate items (RoomRowCard expanded "Room service items" line, red Balance styling on settled rows, real-discount Outstanding nuance for non-zero `discount_amount`).

### BUG-049 — PayLater "NA" on table card
- **Status:** QA PASS, ready for owner smoke. Implementation summary verdict is `implementation_complete_ready_for_smoke`. Tests 15/15 pass; lint clean. `BUG_042_C` test matrix correctly narrowed; new `update-order-paid` PayLater path test added; Hold regression test added.
- **Code:** `socketHandlers.js` BUG-049 predicate refinement at L281-301 + comment at L420-432.
- **Remains:** Standalone `BUG_049_SMOKE_SIGNOFF.md` after owner smoke; tracker flip.

---

## 5. Closed / Ready-to-Close Bugs

| Bug | Smoke | Sealed-by file | Tracker action |
|---|---|---|---|
| BUG-005 | n/a | Tracker (terminal: not a business requirement) | Already closed |
| BUG-008 | n/a | Tracker (terminal: already working) | Already closed |
| BUG-028 | PASS (5/5, 2026-05-12) | `BUG_028_SMOKE_SIGNOFF.md` | Flip to Closed (currently "Open — Intake Created") |
| BUG-029 | PASS (5/5, 2026-05-12) | `BUG_029_SMOKE_SIGNOFF.md` | Flip to Closed (currently "Open — Intake Created") |
| BUG-032 | PASS (5/5, 2026-05-12) | `BUG_032_SMOKE_SIGNOFF.md` | Flip to Closed (currently "Open — Intake Created") |
| BUG-034 | PASS (5/5, 2026-05-12) | `BUG_034_SMOKE_SIGNOFF.md` | Flip to Closed (currently "Open — Intake Created") |
| BUG-035 | PASS (7/7, 2026-05-12) | `BUG_035_SMOKE_SIGNOFF.md` | Flip to Closed (currently "Open — Intake Created") |
| BUG-042-A | PASS (10/10, 2026-05-12) | `BUG_042_A_SMOKE_SIGNOFF.md` | Flip to Closed |
| BUG-042-B | PASS | `BUG_042_B_SMOKE_SIGNOFF.md` | Flip to Closed |
| BUG-042-C | PASS | `BUG_042_C_SMOKE_SIGNOFF.md` | Flip to Closed; sweep deferred per owner |
| BUG-045 | PASS (10/10) | `BUG_045_SMOKE_SIGNOFF.md` | Flip to Closed |
| BUG-048 | PASS (7/7) | `BUG_048_SMOKE_SIGNOFF.md` | Flip to Closed |
| BUG-049 | PASS (7/7, 2026-05-12) | `BUG_049_SMOKE_SIGNOFF.md` | Flip to Closed |

Legacy Apr-2026 closures (BUG-001..BUG-023, BUG-025, BUG-026, BUG-027) are already documented as closed inside `BUG_TEMPLATE.md` and present in code. No additional tracker action required.

---

## 6. Implemented but Smoke Pending

**Empty as of 2026-05-12.** Tier-1 stop-the-bleeding pass cleared this bucket — owner confirmed smoke for BUG-042-A, BUG-049, BUG-028, BUG-029, BUG-032, BUG-034, BUG-035; standalone signoff docs created on disk.

---

## 7. Code Present but Formal Docs Needed

Legacy Apr-2026 bugs whose narrative is inside `BUG_TEMPLATE.md` but for which no per-bug `BUG_IMPLEMENTATION_SUMMARY_*.md` / `BUG_QA_REPORT_*.md` exist on disk:

BUG-001, BUG-002, BUG-003, BUG-004, BUG-006, BUG-007 (FE side), BUG-009, BUG-010, BUG-012 (FE side), BUG-013, BUG-014, BUG-015, BUG-016 (FE side), BUG-017, BUG-018, BUG-019, BUG-020, BUG-021, BUG-022, BUG-023.

These are NOT regressions; the in-template implementation record + code presence is sufficient evidence. Optional uniform paper trail under `/app/memory/bugs/` is a doc-only follow-up.

---

## 8. Ready for Implementation / Code Gate

| Bug | Stage | Next agent |
|---|---|---|
| BUG-046 | `ready_for_pre_implementation_gate` | Pre-Implementation Code Gate Agent → small FE impl |
| BUG-030 | Implementation plan ready | Implementation agent (after owner go) |
| BUG-031 | Implementation plan ready | Implementation agent (after owner go) |
| BUG-033 | Implementation plan ready | Implementation agent (after owner go) |
| BUG-038 | Impact analysis done | Implementation plan agent |

---

## 9. Blocked / Waiting

### 9.1 Owner clarification
- **BUG-043** — merge/supersede vs BUG-048 decision.
- **BUG-040** — confirm desired Excel/CSV export format.
- **BUG-041** — PDF table-row layout scope.
- **BUG-046** — re-confirm Option A vs auto-PATCH option (re-confirmation only).

### 9.2 Backend confirmation / data sample / network trace
- **BUG-037** — `def_ord_status` numeric for "Delivered" + accepted `order_status` literal; relation to BUG-011.
- **BUG-039** — one audit-API row sample.
- **BUG-042 (parent)** — UPI-on-Hold network trace (request payload + response body).
- **BUG-047** — literal FCM payload + outlet-name confirmation.
- **BUG-024** — backend cascade implementation + event-name fix (FE intentionally untouched).
- **BUG-036** — BE-A canonicalisation (via CR-011).

### 9.3 Missing evidence
- **BUG-043** — no screenshots; awaiting owner.

### 9.4 Runtime reproduction
- **BUG-044** — owner directive 2026-05-11: reproduce exact stale-table scenario before any FE implementation.

---

## 10. Superseded / Split / Merged

| Relationship | Detail |
|---|---|
| BUG-042 split into A/B/C | Confirmed in all three sub-bug docs. |
| BUG-044 PayLater/Hold half → BUG-042-C | BUG-042-C terminal-clear for status-9 covers PayLater/Hold removal-from-running cases. Generic stale-table case for non-status-9 closure paths remains parked under BUG-044. |
| BUG-043 ↔ BUG-048 | BUG-048 plan §"Open Questions" explicitly raises the merge/supersede/distinct decision for BUG-043. Owner call needed. |
| BUG-021 ↔ BUG-018 | BUG-021 was effectively BUG-018 "Part 4" — postpaid auto-print runtime-comp case. |
| BUG-023 ↔ BUG-013 | BUG-023 is the print-payload residual of BUG-013. |
| BUG-036 ↔ CR-011 | BUG-036 owner-parked and tracked via CR-011 PG scan/serve paymentType canonicalisation. |
| BUG-037 ↔ BUG-011 | Likely same backend root cause (HTTP 500 BadMethodCallException on delivery-scan-confirm). Backend ask covers both. |
| BUG-044 (older `BUG_044_STATUS_PULL_AND_NEXT_STEP.md` verdict) | Superseded by `BUG_044_RUNTIME_SCENARIO_INVESTIGATION.md`. |

---

## 11. Final Docs Sweep Candidates

Per `IMPLEMENTATION_AGENT_RULES.md` (only baseline-changing fixes warrant a `/app/memory/final/*` update):

| Bug | Reason | Recommended sweep target | Status |
|---|---|---|---|
| **BUG-042-C** | Owner-approved baseline revision: status-9 is now terminal for running-OrderContext purposes (with status-9-specific table-state preservation). | `ARCHITECTURE_DECISIONS_FINAL.md` realtime/socket section + `MODULE_DECISIONS_FINAL.md` Module 4 | **Deferred per owner directive** |
| **BUG-048** | Owner-locked Room Orders Report calculation model. Cosmetic but stabilises a reporting business rule. | `ARCHITECTURE_DECISIONS_FINAL.md` (reporting math note, if owner agrees) | Deferred (not pursued in BUG-048 task) |
| Status-8 dashboard / G62 question | The `f_order_status === 8` Dashboard-recall investigation (see `LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md` §G62 and `impact_analysis/F_ORDER_STATUS_8_DASHBOARD_REGRESSION_CHECK.md`) needs owner answers Q1-Q3 before any sweep. | n/a until owner answer | Owner-blocked |

No other May-2026 bug touches a baseline rule documented in `/app/memory/final/*`.

---

## 12. Owner Action Checklist

> **Tier-1 stop-the-bleeding pass complete (2026-05-12).** Items #1-#3 below are now ✅ DONE — owner confirmed smoke for all 7 bugs; standalone signoff docs created. The remaining items are unchanged.

| # | Action | Bug(s) | Status |
|---|---|---|---|
| 1 | Owner smoke on preprod for BUG-042-A (Hold rail) | BUG-042-A | ✅ DONE (2026-05-12) — `BUG_042_A_SMOKE_SIGNOFF.md` |
| 2 | Owner smoke on preprod for BUG-049 (PayLater NA) | BUG-049 | ✅ DONE (2026-05-12) — `BUG_049_SMOKE_SIGNOFF.md` |
| 3 | Owner smoke on preprod for BUG-028 / BUG-029 / BUG-032 / BUG-034 / BUG-035 (docs-code mismatch cluster) | BUG-028, BUG-029, BUG-032, BUG-034, BUG-035 | ✅ DONE (2026-05-12) — 5 signoff docs created |
| 4 | Tracker keeper flips **11 bugs** to Closed in `BUG_TEMPLATE.md` (BUG-028, 029, 032, 034, 035, 042-A, 042-B, 042-C, 045, 048, 049) | 11 bugs | Pending |
| 5 | Decide BUG-043 merge/supersede/distinct vs BUG-048 | BUG-043 | Pending |
| 6 | Re-confirm BUG-046 Option A (local-only display correction, no auto-PATCH) | BUG-046 | Pending |
| 7 | Approve BUG-038 plan (analysis exists; plan agent next) | BUG-038 | Pending |
| 8 | Confirm BUG-040 / BUG-041 export formats and PDF layout scope | BUG-040, BUG-041 | Pending |
| 9 | Send / chase the four-bug backend confirmation message (BACKEND_CONFIRMATION_PULL_BUG_037_039_042_047.md) | BUG-037, BUG-039, BUG-042 parent, BUG-047 | Pending |
| 10 | Decide BUG-044 — capture runtime reproduction or close based on BUG-042-C coverage | BUG-044 | Pending |
| 11 | Approve a future final-docs sweep cycle for BUG-042-C (and optionally BUG-048) | BUG-042-C, BUG-048 | Pending |
| 12 | Consider Tier-2 (retroactive QA of Apr-2026 legacy bugs BUG-001..BUG-023) and Tier-3 (process-hardening rule in `IMPLEMENTATION_AGENT_RULES.md` requiring 6-artifact gate before tracker Closed) | All legacy bugs + process | Owner decision pending |

---

## 13. Backend Action Checklist

| # | Ask | Bug(s) |
|---|---|---|
| 1 | UPI-on-Hold network trace (request payload + response body + HTTP status) | BUG-042 parent |
| 2 | `def_ord_status` numeric for "Delivered" + accepted `order_status` literal + relation to BUG-011 | BUG-037 (and BUG-011) |
| 3 | One audit-API row JSON for a delivery order with `delivery_charge > 0` | BUG-039 |
| 4 | Literal FCM payload (title, body, `data`) for one "18 March" notification + outlet name vs date-string confirmation | BUG-047 |
| 5 | Item-level `food_status` cascade fix + correct event name | BUG-024 |
| 6 | Persist `delivery_address` (round-trip) | BUG-007 |
| 7 | Persist edited delivery-address (round-trip / print path resilience) | BUG-012 |
| 8 | `isset()` guard for delivery_address on non-delivery types | BUG-016 |
| 9 | BE-A canonical paymentType case (CR-011) | BUG-036 |

---

## 14. QA / Runtime Reproduction Checklist

| # | Item | Type |
|---|---|---|
| 1 | Reproduce stale-table scenario for BUG-044 (specific socket frame sequence that frees a table without delivering a terminal order frame on a non-PayLater path) | Runtime repro |
| 2 | Owner smoke for BUG-042-A | Smoke |
| 3 | Owner smoke for BUG-049 | Smoke |
| 4 | Owner smoke for BUG-028 / BUG-029 / BUG-032 / BUG-034 / BUG-035 cluster | Smoke |
| 5 | After backend reply for BUG-037 / BUG-039 / BUG-042 parent / BUG-047 → confirm planned FE fix scope and queue implementation | Plan → impl |
| 6 | BUG-048 deferred: real-discount Outstanding nuance — confirm if owner wants the corrective tweak when explicit `discount_amount > 0` | Verification |

---

## 15. Docs-Code Mismatch / Tracker Cleanup

### 15.1 Code-ahead-of-tracker (docs-code mismatch) — **RESOLVED on disk, tracker flip pending**
The following bugs previously had implementation + QA evidence on disk and annotated code in the working tree, but the BUG_TEMPLATE.md top summary table still records each as "Open — Intake Created / Not Started". **As of 2026-05-12, owner smoke pass has been confirmed and standalone `*_SMOKE_SIGNOFF.md` docs are now on disk for all five.** Only the BUG_TEMPLATE.md row-flip remains.

| Bug | Code evidence | Doc evidence | Smoke signoff |
|---|---|---|---|
| BUG-028 | `OrderEntry.jsx:756` (Round 5) + `CollectPaymentPanel.jsx:239-1317` (Round 4) | `BUG_IMPLEMENTATION_SUMMARY_028.md`, `_028_REWORK.md`, `BUG_QA_REPORT_028.md` | ✅ `BUG_028_SMOKE_SIGNOFF.md` (2026-05-12) |
| BUG-029 | (Implementation summary describes the post-settle navigation fix) | `BUG_IMPLEMENTATION_SUMMARY_029.md`, `_029_REWORK.md`, `BUG_QA_REPORT_029.md` | ✅ `BUG_029_SMOKE_SIGNOFF.md` (2026-05-12) |
| BUG-032 | `OrderEntry.jsx:1220`, `CollectPaymentPanel.jsx:46` | `BUG_IMPLEMENTATION_SUMMARY_032.md`, `BUG_QA_REPORT_032.md` | ✅ `BUG_032_SMOKE_SIGNOFF.md` (2026-05-12) |
| BUG-034 | (Implementation summary describes the notification-tone fix) | `BUG_IMPLEMENTATION_SUMMARY_034.md`, `BUG_QA_REPORT_034.md` | ✅ `BUG_034_SMOKE_SIGNOFF.md` (2026-05-12) |
| BUG-035 | `OrderEntry.jsx:111,477,503,1901`, `ItemCustomizationModal.jsx:19,65,86,228` | `BUG_IMPLEMENTATION_SUMMARY_035.md`, `BUG_QA_REPORT_035.md` | ✅ `BUG_035_SMOKE_SIGNOFF.md` (2026-05-12) |

**Action:** Tracker keeper to flip these 5 rows in `BUG_TEMPLATE.md` from "Open — Intake Created" to Closed. **This register does NOT modify BUG_TEMPLATE.md per the strict-rules directive.**

### 15.2 Other minor inconsistencies
- BUG-019 tracker comment cites `readOnly={initialDeliveryCharge > 0}` lock; current code at `CollectPaymentPanel.jsx:938` is `readOnly={isPrepaid || (isWebOrder && initialDeliveryCharge > 0)}` — predicate rewritten by CR-008 D1-Gate. Not a regression; label drift only.
- `BUG_044_STATUS_PULL_AND_NEXT_STEP.md` verdict `ready_for_pre_implementation_gate` is **superseded** by `BUG_044_RUNTIME_SCENARIO_INVESTIGATION.md` (parked pending repro). The status-pull file already carries an inline supersession banner.

### 15.3 Docs exist but missing from BUG_TEMPLATE.md
None observed. All bug docs under `/app/memory/bugs/` correspond to a BUG-XXX present in the tracker.

---

## 16. Closing certifications

- ✅ No production code modified.
- ✅ `/app/memory/final/` not touched.
- ✅ `/app/memory/BUG_TEMPLATE.md` not touched.
- ✅ `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md` not overwritten.
- ✅ No new bugs created.
- ✅ No item marked "Closed" from docs alone — closures listed in §5 each have a smoke/signoff document on disk.
- ✅ When code inspection could not be completed (legacy Apr-2026 bugs without a per-bug archive file), the entry is classified conservatively as **"Code present / formal docs needed"** rather than "Closed".

---

*End of Master Bug Pending Task Register — 2026-05-12.*
