# COMBINED HYGIENE 9-ITEM IMPLEMENTATION PLAN — 2026-05-04

**Agent:** Combined Hygiene Impact + Implementation Planning Agent
**Date:** 2026-05-04
**Branch:** `may4`
**Scope:** Planning only — NO code edits, NO file edits, NO QA run, NO test run.
**Workspace:** `/app/memory/` + read-only inspection of `/app/frontend/src/**`
**Target items:** 9 non-blocking hygiene / backlog tickets (DOC-B2-01, DOC-A0a-01, CSV-A0a-01, DETAIL-A0a-01, FILTER-A0a-01, CR-001 exports alignment, pre-existing LoadingPage ESLint, pre-existing paymentService CLEAR_BILL, TEST-INFRA-001 wiring)

---

## 1. Executive summary

### 1.1 Verdict

> **✅ Batch 1 is GO (safe to start).**
> **✅ Batch 2 is GO (safe to start) with minor owner confirmation on one cosmetic choice.**
> **⚠ Batch 3 is SPLIT-OUT required** — 2 of 3 items need owner sign-off or re-sequencing:
>   - `paymentService CLEAR_BILL` cleanup → **`split_out_required`** (touches API-03 stale surface + a pre-existing failing test contract; needs owner decision on "delete vs repair").
>   - `TEST-INFRA-001` wiring → **can start standalone**, but doing it before `paymentService CLEAR_BILL` resolution will **make T-09 test suite fail** once Jest runs. Must be sequenced.
>   - `LoadingPage ESLint` fix → **safe** (cosmetic, one-file change).

### 1.2 Item classification at a glance

| Batch | Item | Risk | Safe to start now? |
|---|---|---|---|
| **B1** | DOC-B2-01 | 🟢 trivial | ✅ |
| **B1** | DOC-A0a-01 | 🟢 trivial | ✅ |
| **B2** | CSV-A0a-01 | 🟢 low (display-only, scope = exports) | ✅ |
| **B2** | DETAIL-A0a-01 | 🟢 low (display-only, one fn in one file) | ✅ (with micro-confirmation) |
| **B2** | FILTER-A0a-01 | 🟡 low-medium (filter-dropdown set affects users' filter UX; not data) | ⚠ — 1 owner micro-choice |
| **B2** | CR-001 exports alignment | 🟢 low (cosmetic CSV footer) | ✅ (with micro-confirmation) |
| **B3** | LoadingPage ESLint | 🟢 trivial | ✅ |
| **B3** | paymentService CLEAR_BILL | 🔴 medium — touches API-03 / API-05 + pre-existing failing test | **split_out_required** |
| **B3** | TEST-INFRA-001 wiring | 🟡 medium (yarn dep + build validation; will surface pre-existing failing test) | ✅ (but must be sequenced AFTER paymentService CLEAR_BILL resolution) |

### 1.3 Why this is safe overall

- All 9 items are non-baseline-changing per `/app/memory/final/*` rules. Zero baseline conflict.
- Zero backend dependency for any item. Zero parked-item unparking.
- Zero Collect Bill semantics change, zero KOT/bill totals change, zero PG-status logic change, zero CR-001..CR-008 accepted behaviour change.
- Every proposed diff is either (a) doc-prose, (b) a `—` substitution on a display/filter/export surface that is already `explicitly deferred per handover`, or (c) a one-line lint-scope fix.
- `paymentService CLEAR_BILL` is the only "real" decision point — the `collectPayment` function currently references a **non-existent** `API_ENDPOINTS.CLEAR_BILL` constant and would throw at runtime if anyone called it. No non-test caller exists (grep-verified). It is a **dead path** already documented as stale in baseline rule API-03 + API-05.

---

## 2. Baseline confirmation

### 2.1 `/app/memory/final/` baseline docs read

| Doc | Relevant rules consulted |
|---|---|
| `ARCHITECTURE_DECISIONS_FINAL.md` (373 L) | **FA-03** (hotspot files), **FA-05** (code-is-truth), **API-02** (transform-mediated payloads), **API-03** (paymentService stale; OrderEntry composes; CollectPaymentPanel settles), **API-05** (keep stale/unclear surfaces documented until **deliberately cleaned**), **SM-03/04** (localStorage governance — not touched), **EP-01..EP-05** (env contract) |
| `MODULE_DECISIONS_FINAL.md` (626 L) | **Module 10 — Reports & Export ownership** (payment-method display, CSV/PDF exports, filter dropdowns); **Module 11 — Status/Preferences** (persistence-scope change rules — not triggered) |
| `OPEN_QUESTIONS_FINAL_RESOLUTION.md` (220 L) | **OQ-07** (reporting-ownership preserved); **OQ-12** (room billing lifecycle — not touched) |
| `IMPLEMENTATION_AGENT_RULES.md` (164 L) | Approval Gate + File-Level Change Plan + Testing Checklist formats reused below in each batch |
| `CHANGE_REQUEST_PLAYBOOK.md` (221 L) | Backlog vs CR boundary (hygiene items stay backlog; no new CR opened) |
| `FINAL_DOCS_APPROVAL_STATUS.md` + `FINAL_DOCS_SUMMARY.md` | Baseline approval status — no edit triggered by any of the 9 items |

**Baseline verdict:** No rule is violated by any proposed change. Rule **API-03** explicitly names `paymentService.collectPayment()` as stale → cleanup is consistent with baseline intent, but rule **API-05** says "keep documented **until deliberately cleaned**" → the "deliberate" cleanup needs owner confirmation.

### 2.2 Sprint-acceptance overlay docs read

| Doc | Relevant sections |
|---|---|
| `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` | §1.2 acceptance counts, §3 sprint inventory, §7 backlog register (rows 1-23), §9 reconciliation outcome, §11 optional baseline enrichments |
| `BASELINE_RECONCILIATION_REPORT_2026_05_04.md` | §4.1 shipped status, §6 surface reconciliation, §9.5 handover-vs-code field drift (DOC-B2-01 source), §13 backlog consolidation |
| `PENDING_TASK_REGISTER_2026_05_04.md` | §3 full pending-task table, §4 safe-to-start-now, §11.7 combined-session recommendation |

**Sprint-acceptance verdict:** Every accepted sprint CR (CR-001, CR-003, CR-004 P0 + Phase 2 A/B/C, CR-005 #1 / B2-split Phase 1, CR-006 A1 + B1, CR-007 A2, CR-008 Sub-CR #1, CR-008 #4 Phase A / D1, A0a, A0b) retains its behaviour unchanged. No acceptance decision is perturbed.

### 2.3 QA / tracker docs read

| Doc | Scope |
|---|---|
| `QA_REPORT_INDEX.md` | All 12 active QA reports, 9 backend-blocked rows, observed unrelated issues (CR-001 exports + LoadingPage + paymentService CLEAR_BILL + ProtectedRoute test infra) |
| `A0a_UI_COD_MASK_QA_REPORT.md` §12 | DOC-A0a-01 / CSV-A0a-01 / DETAIL-A0a-01 / FILTER-A0a-01 source descriptions + handover-deferred statements |
| `CR_005_B2_SPLIT_QA_REPORT.md` §10 | DOC-B2-01 source description (handover says `snapshot_razorpay_amount`; code reads `api.payment_amount`) |
| `CR_BUCKET_A0a_UI_COD_MASK_HANDOVER.md` §12 + §14 step 6 | DOC-A0a-01 wording drift source; 4 A0a deferrals explicitly scoped |
| `CR_BUCKET_B2_PG_COLUMNS_HANDOVER.md` §1 + §4.2 | DOC-B2-01 target prose |
| `FO_B1_01_*` closure docs | Confirms FO-B1-01 is resolved follow-up; no bearing on these 9 items |

### 2.4 Are any of the 9 items baseline-changing?

| Item | Baseline impact | Owner decision? | Runtime addendum? |
|---|---|---|---|
| DOC-B2-01 | None (handover-doc prose edit) | No | No |
| DOC-A0a-01 | None (handover-doc prose edit) | No | No |
| CSV-A0a-01 | None (Module 10 display parity; raw enum preserved in API-02 transform layer) | ⚠ optional micro-confirm on `—` string vs `Cash` string | No |
| DETAIL-A0a-01 | None (one formatter function; drill-down parity with audit table) | ⚠ optional micro-confirm on what to render (`—` vs `Cash`) | No |
| FILTER-A0a-01 | None (filter set filter-out; UX surface, not data) | ⚠ optional micro-confirm (drop vs remap `cash_on_delivery → 'Cash'`) | No |
| CR-001 exports alignment | None (cosmetic CSV footer column count) | ⚠ optional micro-confirm on drop-column vs pad-row | No |
| LoadingPage ESLint | None (lint scope only) | No | No |
| paymentService CLEAR_BILL | **Touches API-03 stale surface + API-05 "deliberate cleanup" rule** | **YES — deliberate cleanup authorisation + T-09 test fate** | No |
| TEST-INFRA-001 | Adds 2 yarn devDeps; does NOT alter runtime code | No (but will surface pre-existing failing tests — sequence-sensitive) | No |

---

## 3. Files/docs inspected

### 3.1 Baseline + sprint docs (re-read this session)
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` (focused L100-200 API rules)
- `/app/memory/final/MODULE_DECISIONS_FINAL.md` (indexed)
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` (indexed)
- `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` (approval gate format L46-90)
- `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`, `FINAL_DOCS_APPROVAL_STATUS.md`, `FINAL_DOCS_SUMMARY.md` (scope check)
- `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md`
- `/app/memory/change_requests/qa_reports/QA_REPORT_INDEX.md`

### 3.2 QA reports / handovers re-read
- `/app/memory/change_requests/qa_reports/A0a_UI_COD_MASK_QA_REPORT.md` (grep scope — DOC-A0a-01 / CSV/DETAIL/FILTER findings)
- `/app/memory/change_requests/qa_reports/CR_005_B2_SPLIT_QA_REPORT.md` §10 (DOC-B2-01)
- `/app/memory/change_requests/implementation_handover/CR_BUCKET_A0a_UI_COD_MASK_HANDOVER.md` §12 + §14
- `/app/memory/change_requests/implementation_handover/CR_BUCKET_B2_PG_COLUMNS_HANDOVER.md` §1 + §4.2

### 3.3 Code files inspected (READ ONLY)
- `/app/frontend/src/components/reports/OrderDetailSheet.jsx` L78-110 (`formatPaymentMethod` at L81-92)
- `/app/frontend/src/api/transforms/reportTransform.js` L700-728 (`extractPaymentMethods` at L708-716)
- `/app/frontend/src/components/reports/ExportButtons.jsx` L40-100 (CSV columns L51-61 + summary row L93-94) + L175-210 (PDF table)
- `/app/frontend/src/api/services/paymentService.js` (16 lines — `collectPayment` at L12-15)
- `/app/frontend/src/api/constants.js` L8-60 (endpoint constants — confirmed **`CLEAR_BILL` does not exist**)
- `/app/frontend/src/__tests__/api/paymentService.test.js` (29 lines — T-09 contract test)
- `/app/frontend/src/__tests__/guards/ProtectedRoute.test.jsx`, `ErrorBoundary.test.jsx` (L1-10 — confirmed `@testing-library/react` import)
- `/app/frontend/src/pages/LoadingPage.jsx` L60-125 (useEffect at L63-69 already `eslint-disable`d; warning is on the L83-111 effect missing `loadStationData` dep)
- `/app/frontend/package.json` L70-80 (scripts) — confirmed `@testing-library/react` NOT in deps

### 3.4 Grep sweeps run (READ ONLY)
- `cash_on_delivery` full-tree → 4 hits (audit table short-circuit [A0a — correct], OrderDetailSheet L85 [DETAIL-A0a-01 target], reportTransform L711-712 [FILTER-A0a-01 reference], ExportButtons L193 [CSV/PDF-A0a-01 target])
- `collectPayment` / `CLEAR_BILL` → only 1 non-test caller: `paymentService.js:12-13` itself + `paymentMutationService.js:12-13` comment
- `@testing-library` → 2 test files only; no devDep

---

## 4. 9-item classification table

| # | ID | Category | Risk | Files likely touched | Safe now? | QA required? | Baseline impact? | Sprint-trackers update? |
|---|---|---|---|---|---|---|---|---|
| 1 | **DOC-B2-01** | Documentation-only | 🟢 trivial | `CR_BUCKET_B2_PG_COLUMNS_HANDOVER.md` §1 + §4.2 (1–2 prose edits) | ✅ | No — static doc diff | No | `QA_REPORT_INDEX.md` backlog row update (✅ already allows follow-up) + Final Acceptance §7 row 2 marker |
| 2 | **DOC-A0a-01** | Documentation-only | 🟢 trivial | `CR_BUCKET_A0a_UI_COD_MASK_HANDOVER.md` §14 step 6 (wording tweak) | ✅ | No | No | Final Acceptance §7 row 3 marker |
| 3 | **CSV-A0a-01** | Frontend export-only | 🟢 low | `/app/frontend/src/components/reports/ExportButtons.jsx` L58 CSV column + L193 PDF cell | ✅ (with micro-confirm on `—` vs `Cash`) | Yes — lint + webpack + CSV/PDF smoke (runtime preprod-gated for full parity) | No — display-only, raw enum preserved in reportTransform payloads | Final Acceptance §7 row 4 + A0a QA report §12 marker |
| 4 | **DETAIL-A0a-01** | Frontend display-only | 🟢 low | `/app/frontend/src/components/reports/OrderDetailSheet.jsx` L85 (one `methodMap` entry) | ✅ (with micro-confirm) | Yes — lint + webpack + drill-down smoke | No | Final Acceptance §7 row 5 + A0a QA report §12 marker |
| 5 | **FILTER-A0a-01** | Frontend filter-UX-only | 🟡 low-medium | `/app/frontend/src/api/transforms/reportTransform.js` L708-715 (`extractPaymentMethods`) | ⚠ — owner micro-confirm required on "drop vs remap `cash_on_delivery`" | Yes — lint + webpack + filter dropdown smoke; also confirm FilterBar chip render | No — filter set only; raw field preserved everywhere else | Final Acceptance §7 row 6 + A0a QA report §12 marker |
| 6 | **CR-001 exports alignment** | Frontend export-only (cosmetic) | 🟢 low | `/app/frontend/src/components/reports/ExportButtons.jsx` — either drop `paymentType` column at L59 OR pad summary row at L94 | ✅ (with micro-confirm) | Yes — lint + webpack + CSV footer alignment smoke | No — cosmetic CSV footer only | Final Acceptance §7 row 17 marker |
| 7 | **LoadingPage ESLint** | Technical hygiene | 🟢 trivial | `/app/frontend/src/pages/LoadingPage.jsx` L111 (add missing dep OR `eslint-disable-next-line` comment) | ✅ | Yes — lint + webpack only | No | Final Acceptance §7 row 21 marker |
| 8 | **paymentService CLEAR_BILL** | Technical hygiene (dead path) | 🔴 medium | `/app/frontend/src/api/services/paymentService.js` (16 lines; delete or repair to use `BILL_PAYMENT`) + `/app/frontend/src/__tests__/api/paymentService.test.js` (T-09 contract) + possibly `/app/frontend/src/api/constants.js` (add `CLEAR_BILL` alias) | ❌ **split_out_required** — needs owner decision | Yes + formal regression | Possibly — API-03 + API-05 deliberate-cleanup rule | Requires a separate QA report + backlog row closure |
| 9 | **TEST-INFRA-001 wiring** | Test infrastructure | 🟡 medium | `/app/frontend/package.json` (add `@testing-library/react` + `@testing-library/jest-dom` devDeps); `yarn install`; optionally a `setupTests.js` | ✅ **but sequence-sensitive** | Yes — `yarn test` run + build validation | No code behaviour change | Final Acceptance §7 rows 7 + 23 marker; QA next-agent handover update |

---

## 5. File-level impact map

### 5.1 Documentation files (BATCH 1)

| File | Current | Proposed change | Who else reads this? |
|---|---|---|---|
| `/app/memory/change_requests/implementation_handover/CR_BUCKET_B2_PG_COLUMNS_HANDOVER.md` §1 + §4.2 | "Razorpay capture amount from `snapshot_razorpay_amount`" | Either (a) update prose to `payment_amount` (code-true) OR (b) leave as `snapshot_razorpay_amount` aspirational + add "currently consumed as `api.payment_amount`" footnote | Future CR-005 refactor if Razorpay partial-capture ships |
| `/app/memory/change_requests/implementation_handover/CR_BUCKET_A0a_UI_COD_MASK_HANDOVER.md` §14 step 6 | "on the Paid tab, an unpaid `cash_on_delivery` row still has the Mark-as-Unpaid / Change-Payment-Method pills visible" | Replace with accurate statement: "`cash_on_delivery` is excluded from `PAID_ACTIONS_ALLOWED_METHODS` → pills do NOT appear on `cash_on_delivery` rows on the Paid tab (pre-existing eligibility behaviour preserved by A0a)" | Future A0a runtime addendum; CR-003 row-actions context |

### 5.2 Frontend source files (BATCH 2 + 3)

| File | Lines | Reason |
|---|---|---|
| `/app/frontend/src/components/reports/OrderDetailSheet.jsx` | L85 (`methodMap` entry `'cash_on_delivery': 'CASH'`) | DETAIL-A0a-01 — change to `'—'` OR `'Cash'` depending on owner choice |
| `/app/frontend/src/api/transforms/reportTransform.js` | L708-715 (`extractPaymentMethods`) | FILTER-A0a-01 — filter out `cash_on_delivery` from the Set OR remap before insertion |
| `/app/frontend/src/components/reports/ExportButtons.jsx` | L58-60 CSV columns; L193 PDF cell; L94 summary row | CSV-A0a-01 (mask COD to `—` in both outputs) + CR-001 exports alignment (drop `paymentType` column OR pad summary) |
| `/app/frontend/src/pages/LoadingPage.jsx` | L111 useEffect deps | LoadingPage ESLint — either add `loadStationData` to deps OR add `eslint-disable-next-line` |
| `/app/frontend/src/api/services/paymentService.js` | entire 16-line file | paymentService CLEAR_BILL — delete OR repair to `BILL_PAYMENT` (owner decision) |
| `/app/frontend/src/__tests__/api/paymentService.test.js` | entire 29-line file | T-09 contract: T2 currently asserts `CLEAR_BILL` exists on `API_ENDPOINTS`; will FAIL once Jest runs — must be updated alongside paymentService fate |
| `/app/frontend/src/api/constants.js` | L44 neighborhood | Potentially add `CLEAR_BILL: '/api/...'` IF owner chooses "repair" path (sprint-accepted behaviour uses `BILL_PAYMENT` via `paymentMutationService`) |
| `/app/frontend/package.json` | L10-68 deps block | TEST-INFRA-001 — add `@testing-library/react@^14.x`, `@testing-library/jest-dom@^6.x`, possibly `@testing-library/user-event@^14.x` as devDeps |

### 5.3 Sprint trackers to update post-implementation

| Tracker | Rows affected | Update |
|---|---|---|
| `QA_REPORT_INDEX.md` | `Observed Unrelated Issues` block L64-76 + A0a QA row | Mark LoadingPage ESLint / paymentService CLEAR_BILL / ProtectedRoute test-infra as resolved when done; cross-reference hygiene QA report |
| `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` | §7 backlog register rows 2, 3, 4, 5, 6, 7, 17, 21, 22, 23 | Mark each as RESOLVED with pointer to hygiene QA report (pattern used for FO-B1-01) |
| Create new summary | `/app/memory/change_requests/implementation_summaries/HYGIENE_9_ITEMS_SUMMARY.md` (new file, post-implementation) | Post-impl summary following CR-001/FO-B1-01 summary format |
| Create new QA report | `/app/memory/change_requests/qa_reports/HYGIENE_9_ITEMS_QA_REPORT.md` | Static + lint + build + test-run evidence |

---

## 6. Clash-risk map

| Overlap surface | Items involved | Why it may clash | Safe? | Required validation | Must NOT touch |
|---|---|---|---|---|---|
| **A0a UI-COD-MASK short-circuit** at `OrderTable.jsx:486-510` | CSV-A0a-01, DETAIL-A0a-01, FILTER-A0a-01 | All 4 A0a tickets target `cash_on_delivery`; each touches a different file/surface | ✅ Safe | Keep `OrderTable.jsx:486-510` short-circuit **untouched** — it is the accepted single source of truth for audit-table display masking. New edits go to sibling surfaces only. | `OrderTable.jsx`, `PAID_ACTIONS_ALLOWED_METHODS` eligibility predicate at `OrderTable.jsx:241`, `r_paymentMethod` raw field in reportTransform payload |
| **CR-001 exports `ExportButtons.jsx`** columns + summary row | CSV-A0a-01, CR-001 exports alignment | Both edit the same file (`ExportButtons.jsx`); column-count change and payment-method cell content change must be coordinated | ✅ Safe if done in a single batch | Edit in ONE pass; re-run CSV footer smoke after both edits. Assert `columns.length === summary.cellCount` invariant. | Do not change `displayOrderId` format, `displayLocationLabel`, `actionedBy` derivations; do not touch `cancellationReason`/`cancellationType` splice; do not alter tab-specific column splices at L64-72 |
| **CR-003 payment method row-action eligibility** | DETAIL-A0a-01, FILTER-A0a-01, CSV-A0a-01 | `PAID_ACTIONS_ALLOWED_METHODS = ['cash', 'card', 'upi']` at `OrderTable.jsx:241` already excludes `cash_on_delivery` — display masking must NOT leak into eligibility predicates | ✅ Safe | Grep-audit post-edit that **no code path reads the display string** for eligibility. Confirm `OrderTable.jsx:241` predicate still reads raw `order.paymentMethod`. | `PAID_ACTIONS_ALLOWED_METHODS`, any `paymentMethodEligible()` helper, `paymentMutationService` callers |
| **CR-005 B2 PG columns** — `payment_amount` field | DOC-B2-01 | DOC-B2-01 is a handover-prose edit only; no code touched | ✅ Safe | N/A (doc-only) | `reportService.js:927` `pgAmount` derivation; `snapshot_razorpay_order_id` plumbing; B2 Phase 2 dormant placeholder for `snapshot_razorpay_status` (BE-W2) |
| **CR-008 Sub-CR #1 D1-Cap** — delivery-charge payload fold | paymentService CLEAR_BILL | `paymentService.collectPayment` is a DEAD PATH (broken constant, no non-test caller); the LIVE Collect Bill path is `paymentMutationService` → `BILL_PAYMENT`. Cleanup of paymentService must NOT alter the live path. | ⚠ Requires owner confirmation | Grep-audit post-edit that `paymentMutationService.js` + all `OrderEntry.jsx` / `CollectPaymentPanel.jsx` callers are **unchanged**; confirm `BILL_PAYMENT` endpoint + delivery-charge fold at L1426 / L1546 not perturbed | `paymentMutationService.js`, `orderTransform.toAPI.collectPayment` builder (if present), delivery-charge fold in `OrderEntry.jsx` |
| **CR-008 #4 Phase A / D1** — stay-on-order-entry remount | paymentService CLEAR_BILL, LoadingPage ESLint | LoadingPage renders the loading screen; stay-on-order-entry relies on `DashboardPage.jsx` remount nonce, not LoadingPage. paymentService is not on stay-on-entry path. | ✅ Safe (orthogonal) | N/A | `orderEntryResetNonce`, `mygenie_stay_on_order_after_bill` localStorage |
| **FilterBar chip rendering** | FILTER-A0a-01 | `FilterTags.jsx` renders active filter chips; removing `cash_on_delivery` from the set means users lose an option to filter their audit by raw COD — this is a UX change not present before A0a | ⚠ — confirm owner intent | Owner micro-decision: drop entry (cosmetic purity) vs remap entry to label `'Cash'` (UX preservation, grouping COD with cash); currently the handover's deferred note implies "either is acceptable — pick one" | `FilterBar.jsx` PG tri-state pill, `FilterTags.jsx` chip render |
| **Module 10 Reports/Exports ownership** | All 4 A0a siblings + CR-001 exports + DOC-B2-01 | Module 10 scope covers report tables, filter bar, CSV/PDF exports, drill-down sheet. Five of nine items sit in this module. | ✅ Safe within module | Per Module 10 "Future change rules", single focused pass is allowed; no cross-module leak. Confirm no change bleeds into OrderEntry or Payment modules. | Any OrderEntry compose-path, any Payment mutation path |
| **Pre-existing T-09 test file** | paymentService CLEAR_BILL + TEST-INFRA-001 | Once TEST-INFRA-001 wires Jest+testing-library, `yarn test` will run T-09; T-09's T2 asserts `API_ENDPOINTS.CLEAR_BILL` exists; constants.js does not define it → T2 would FAIL. | 🔴 **hard sequence gate** | MUST resolve paymentService CLEAR_BILL (either delete the service+test, or add the constant) BEFORE enabling Jest. OR: update the T-09 test assertions first as part of the paymentService cleanup item. | Any other test file not related to this thread |

---

## 7. Baseline impact table

| Baseline rule / sprint decision | Item touching it | Impact | Verdict |
|---|---|---|---|
| **FA-03** — hotspot files | CR-001 exports alignment edits `ExportButtons.jsx` (already touched by CR-001) | Well-within-module surgical edit; follows CR-001 pattern | ✅ Compliant |
| **API-02** — transform-mediated payloads | DETAIL-A0a-01, FILTER-A0a-01, CSV-A0a-01 | Display/filter surfaces only; `reportTransform.fromAPI` preserves raw `paymentMethod` on every line (verified at L179, L214, L266, L301, L338, L405, L544) | ✅ Compliant |
| **API-03** — OrderEntry composes, CollectPaymentPanel settles; `paymentService.collectPayment` is stale | paymentService CLEAR_BILL | Cleanup aligns with rule intent; touches the named stale surface | ⚠ Needs owner OK (rule API-05 says "until deliberately cleaned") |
| **API-05** — document stale surfaces until deliberately cleaned | paymentService CLEAR_BILL | This IS the "deliberate" cleanup trigger; but triggering it needs owner confirmation on delete-vs-repair + T-09 test fate | ⚠ Owner decision |
| **SM-03 / SM-04** — localStorage governance | None | Not touched | ✅ Untouched |
| **EP-01..EP-05** — env contract, Firebase, Google Maps, repo backend | None | Not touched | ✅ Untouched |
| **Module 10** — Reports & Export ownership | 5 of 9 items | Single focused pass allowed; no cross-module leak | ✅ Compliant |
| **Module 11** — Status/Preferences persistence | None | Not touched | ✅ Untouched |
| **OQ-07** — reporting-ownership preserved | CSV/DETAIL/FILTER/CR-001 exports | Backend aggregation ownership unchanged; frontend display/filter parity work only | ✅ Compliant |
| **OQ-12** — room billing lifecycle | None | Not touched | ✅ Untouched |
| **CR-001 accepted behaviour** (12 deliveries — §4.1) | CR-001 exports alignment | Cosmetic footer fix; does not change status derivation, filter structure, tab routing, `displayOrderId`, `punchedBy`, `actionedBy`, `displayLocationLabel` | ✅ Preserved |
| **CR-003 accepted behaviour** | None | Not touched | ✅ Preserved |
| **CR-004 accepted behaviour (Phase 1 + Phase 2 A/B/C)** | None | Not touched | ✅ Preserved |
| **CR-005 #1 / B2-split Phase 1** | DOC-B2-01 (handover prose only) | Zero code change; `pgAmount` derivation at `reportService.js:927` unchanged | ✅ Preserved |
| **CR-006 A1 + B1 + FO-B1-01** | None | Not touched | ✅ Preserved |
| **CR-007 / A2** | None | Not touched | ✅ Preserved |
| **CR-008 Sub-CR #1 + CR-008 #4 Phase A / D1** | None (paymentService CLEAR_BILL is DEAD path, NOT the live Collect Bill flow) | LIVE Collect Bill path via `paymentMutationService → BILL_PAYMENT` is untouched | ✅ Preserved — with post-edit grep-audit required |
| **A0a UI-COD-MASK accepted behaviour** | DOC-A0a-01, CSV-A0a-01, DETAIL-A0a-01, FILTER-A0a-01 | `OrderTable.jsx:486-510` short-circuit preserved; siblings bring other surfaces into parity per handover §12 "deferred" list | ✅ Preserved |
| **A0b ROLE-NAME-WIRE-FIX accepted behaviour** | None | Not touched | ✅ Preserved |
| **Parked items** (A3, A4, B3, B4, B2 Phase 2, CR-008 #4 Phase B, CR-008 Sub-CR #3, CR-002, CR-009..CR-013) | None | Not unparked, not touched | ✅ Preserved parked state |
| **Backend asks** (BE-1..BE-F) | None | Not touched, not escalated | ✅ Preserved parked state |

**Net baseline impact: ZERO baseline-rule conflicts. One baseline rule (API-05) triggers an owner confirmation gate on one item (paymentService CLEAR_BILL).**

---

## 8. Recommended batch order

```
  Batch 1  (Docs)          →  Batch 2  (Display/Export/Filter)        →  Batch 3  (Tech hygiene)
  DOC-B2-01                   CSV-A0a-01                                 LoadingPage ESLint
  DOC-A0a-01                  DETAIL-A0a-01                              paymentService CLEAR_BILL*
                              FILTER-A0a-01                              TEST-INFRA-001 wiring
                              CR-001 exports alignment

  *split_out_required — owner approval gate before starting
```

Rationale for the order:
1. **Docs first** — zero risk, zero code, validates doc-edit muscle memory and surfaces any hidden owner wording preferences.
2. **A0a + CR-001 exports together** — all four Batch 2 items cluster in Module 10 (Reports & Export); single focused pass minimises rebuild cost and lets a single QA sweep cover them.
3. **Tech hygiene last** — LoadingPage ESLint is independent and trivial; paymentService + TEST-INFRA-001 are sequence-coupled (see clash matrix §6) and need owner clarification.

---

## 9. Exact implementation plan per batch

### 9.1 BATCH 1 — Documentation-only cleanup

#### Items
- DOC-B2-01
- DOC-A0a-01

#### Files touched
1. `/app/memory/change_requests/implementation_handover/CR_BUCKET_B2_PG_COLUMNS_HANDOVER.md`
2. `/app/memory/change_requests/implementation_handover/CR_BUCKET_A0a_UI_COD_MASK_HANDOVER.md`

#### Changes

**DOC-B2-01 — recommended edit (Option A: align prose to code):**

In `CR_BUCKET_B2_PG_COLUMNS_HANDOVER.md` §1 row "Sub-bucket B2.B" (L18) and §4.2 references:
- From: `Razorpay capture amount from snapshot_razorpay_amount`
- To: `Razorpay capture amount — currently sourced from api.payment_amount (on /order-logs-report); will migrate to snapshot_razorpay_amount when Razorpay partial-capture/refund lifecycle lands (see §5 "When to revisit Option 2")`
- Add parenthetical in §4.2 row "D-03 pgAmount derivation" explicitly noting the field name.

**DOC-A0a-01 — recommended edit:**

In `CR_BUCKET_A0a_UI_COD_MASK_HANDOVER.md` §14 step 6 (L145):
- From: `Verify (negative) — on the Paid tab, an unpaid cash_on_delivery row still has the Mark-as-Unpaid / Change-Payment-Method pills visible (eligibility checks the raw enum, not the rendered cell).`
- To: `Verify (negative) — on the Paid tab, a cash_on_delivery row does NOT show the Mark-as-Unpaid / Change-Payment-Method pills (pre-existing eligibility: PAID_ACTIONS_ALLOWED_METHODS = ['cash', 'card', 'upi'] at OrderTable.jsx:241 excludes cash_on_delivery; A0a preserves this by design — the eligibility predicate reads raw order.paymentMethod, not the masked — rendering).`

#### Baseline impact — ZERO
#### Accepted sprint behaviour preserved — ALL (doc-only)
#### What NOT to touch
- Code under `/app/frontend/src/**`
- Any other doc section (§§ unrelated to the drift)
- Sprint trackers (those get a separate closure edit in Batch 3 wrap-up or via Final Acceptance row markers)

#### Validation required
- Diff review: confirm ONLY the two prose edits landed; no table structure disturbed.
- Cross-check: grep for `snapshot_razorpay_amount` in the B2 handover — should remain as the "future target" reference; grep for `cash_on_delivery` in the A0a handover §14 — should now accurately reflect eligibility.

#### QA required
- Static diff review only. No runtime, no Jest, no curl, no supervisor restart.

#### Stop / approval gate
- **No owner gate needed** — both are doc-prose corrections described verbatim in existing QA reports (`CR_005_B2_SPLIT_QA_REPORT.md` §10 + `A0a_UI_COD_MASK_QA_REPORT.md` §12 / §14).

#### Estimated effort
- ~10 minutes total. Documentation Cleanup Agent.

---

### 9.2 BATCH 2 — Display / Export / Filter cleanup (+ CR-001 exports alignment)

#### Items
- CSV-A0a-01
- DETAIL-A0a-01
- FILTER-A0a-01
- CR-001 exports alignment

#### Files touched

1. `/app/frontend/src/components/reports/OrderDetailSheet.jsx` — **1 line at L85**
2. `/app/frontend/src/api/transforms/reportTransform.js` — **~3 lines at L708-715**
3. `/app/frontend/src/components/reports/ExportButtons.jsx` — **~3 lines at L58-60 (CSV) + L94 (summary row) + optionally L193 (PDF)**

#### Changes

##### DETAIL-A0a-01 — `OrderDetailSheet.jsx` L81-92
Current:
```js
const methodMap = {
  'cash': 'CASH',
  'cash_on_delivery': 'CASH',  // ← DETAIL-A0a-01 target
  'card': 'CARD',
  'upi': 'UPI',
  'tab': 'Added to Credit',
  'Cancel': '—',
};
```
Proposed (Option A — parity with audit table):
```js
'cash_on_delivery': '—',
```
OR (Option B — parity with Cash grouping, preserves filter UX if owner picks Option B below for FILTER-A0a-01):
```js
'cash_on_delivery': 'Cash',
```

Micro-decision: **Option A `'—'`** is recommended to preserve parity with the accepted A0a audit-table `—` mask. Flag for owner confirmation at Batch 2 kickoff.

##### FILTER-A0a-01 — `reportTransform.js` L708-716
Current:
```js
export const extractPaymentMethods = (orders = []) => {
  const methods = new Set();
  orders.forEach(o => {
    if (o.paymentMethod && o.paymentMethod !== '—') {
      methods.add(o.paymentMethod);
    }
  });
  return Array.from(methods).sort();
};
```
Proposed (Option A — drop COD from dropdown, cosmetic purity):
```js
orders.forEach(o => {
  if (o.paymentMethod && o.paymentMethod !== '—' && o.paymentMethod.toLowerCase() !== 'cash_on_delivery') {
    methods.add(o.paymentMethod);
  }
});
```
OR (Option B — remap COD to 'Cash' grouping, preserve filter UX):
```js
orders.forEach(o => {
  if (o.paymentMethod && o.paymentMethod !== '—') {
    const v = o.paymentMethod.toLowerCase() === 'cash_on_delivery' ? 'cash' : o.paymentMethod;
    methods.add(v);
  }
});
```

Micro-decision: **Option A `drop`** is the cleanest (filter dropdown no longer surfaces a raw enum that the table masks to `—`). Flag for owner confirmation.

##### CSV-A0a-01 — `ExportButtons.jsx` L58 + L193
Current L58:
```js
{ key: 'paymentMethod', label: 'Payment Method' },
```
Current L193 (PDF):
```js
<td>${order.paymentMethod || '—'}</td>
```
Proposed (both CSV + PDF):
```js
// CSV L58 — add format fn
{ key: 'paymentMethod', label: 'Payment Method',
  format: (v, _o) => (v && v.toLowerCase() === 'cash_on_delivery') ? '—' : (v || '—') },
// PDF L193
<td>${(order.paymentMethod && order.paymentMethod.toLowerCase() === 'cash_on_delivery') ? '—' : (order.paymentMethod || '—')}</td>
```

##### CR-001 exports alignment — `ExportButtons.jsx` L59 + L94

Current L59:
```js
{ key: 'paymentType', label: 'Payment Type' },
```
Current L94:
```js
const summaryRow = `\n"Total","","","","","","","${formatCurrency(totalAmount)}"`;
```

Proposed (Option A — drop `paymentType` column; recommended to match handover's 8-column intent):
- Delete L59 entirely → header becomes 8 cols, body becomes 8 cols, summary row (already 8 cells) lines up correctly.

OR (Option B — keep `paymentType` column, pad summary row):
- Change L94 to `\n"Total","","","","","","","","${formatCurrency(totalAmount)}"` (9 cells).

Micro-decision: **Option A `drop paymentType`** is cleaner (handover intent), but requires confirming the `paymentType` column is not relied on by any downstream CSV consumer (owner's Audit team workflow). Flag for owner.

#### Baseline impact — ZERO (Module 10 display/export parity; `reportTransform.fromAPI` raw-field preservation unchanged)

#### Accepted sprint behaviour preserved
- `OrderTable.jsx:486-510` audit-table short-circuit — UNTOUCHED
- `PAID_ACTIONS_ALLOWED_METHODS` eligibility — UNTOUCHED (reads raw `order.paymentMethod`)
- CR-007 A2.2 `#orderId` chip, A2.3 Print Bill button — UNTOUCHED (OrderEntry scope)
- CR-008 Sub-CR #1 delivery-charge fold — UNTOUCHED
- CR-005 B2 PG columns (`pgOrderId`, `pgAmount`, dormant `pgStatus` placeholder) — UNTOUCHED
- All transform payloads (`reportTransform.fromAPI` at L179, L214, L266, L301, L338, L405, L544) preserve raw `payment_method` — UNCHANGED

#### What NOT to touch
- `OrderTable.jsx` — leave the A0a short-circuit alone
- `paymentMutationService.js` — unrelated Collect Bill live path
- `reportService.js` pgAmount/pgOrderId derivations
- Any filter-bar PG tri-state pill logic (CR-005 B2 column visibility)
- Retained CR-001/CR-003/CR-004 diagnostic console logs

#### Validation required
1. `mcp_lint_javascript` on the 3 touched files — 0 issues.
2. Webpack build — stays at baseline (1 pre-existing `LoadingPage.jsx:111` warning; unchanged).
3. Static grep: `cash_on_delivery` full-tree — new count = 4 (unchanged) but the 3 sibling sites now mask/drop.
4. CSV footer invariant: `columns.length === (summaryRow.split(',').length)`.
5. Optional runtime when preprod wakes: audit → filter dropdown (verify COD absent or remapped), drill-down (verify — for COD rows), CSV download (verify masked).

#### QA required
- Separate hygiene QA report (pattern: `HYGIENE_9_ITEMS_QA_REPORT.md`). Static + lint + build sufficient for `qa_passed_with_runtime_addendum_pending` — preprod walk is additive.

#### Stop / approval gate
- **Micro-decision gate** at Batch 2 kickoff: confirm 3 owner options:
  1. DETAIL-A0a-01 → `—` (recommended) vs `'Cash'`
  2. FILTER-A0a-01 → drop (recommended) vs remap to `'cash'`
  3. CR-001 exports → drop `paymentType` column (recommended) vs pad summary row
- If owner declines to pick or says "implementer's discretion", proceed with recommended options and document choice in QA report.

#### Estimated effort
- ~45 min implementation + ~20 min validation. Small Frontend Implementation Agent.

---

### 9.3 BATCH 3 — Technical hygiene

#### Items
1. LoadingPage ESLint (🟢 trivial — safe)
2. paymentService CLEAR_BILL (🔴 **split_out_required** — see §12)
3. TEST-INFRA-001 wiring (🟡 sequence-gated on #2)

#### 9.3.1 LoadingPage ESLint — SAFE SUB-ITEM

**File:** `/app/frontend/src/pages/LoadingPage.jsx`

**Change:** at L111 useEffect closing `[loadingStatus, navigate, location.state]);` — either (a) add `loadStationData` to the deps array (requires wrapping `loadStationData` in `useCallback` to stabilise reference — small blast radius), OR (b) add `// eslint-disable-next-line react-hooks/exhaustive-deps` above L111 (zero behaviour change, one-line addition).

**Recommendation:** Option (b) — `// eslint-disable-next-line react-hooks/exhaustive-deps`. The existing L68 already uses this pattern for the sibling effect; consistency argues for the same resolution here.

**Validation:** `mcp_lint_javascript` on `LoadingPage.jsx` → 0 issues; webpack → 0 warnings.

**QA required:** lint only.

**Estimated effort:** ~5 minutes.

**Approval gate:** **None** (pattern match with L68 existing disable).

#### 9.3.2 paymentService CLEAR_BILL — SPLIT-OUT (see §12)

#### 9.3.3 TEST-INFRA-001 wiring — SEQUENCE-GATED

**Files:**
- `/app/frontend/package.json` — add devDeps:
  - `@testing-library/react@^14.x`
  - `@testing-library/jest-dom@^6.x`
  - `@testing-library/user-event@^14.x` (optional)
- Optionally `/app/frontend/src/setupTests.js` (CRA/CRACO auto-loaded) with `import '@testing-library/jest-dom';`

**Change mechanism:** `yarn add --dev @testing-library/react @testing-library/jest-dom @testing-library/user-event`

**What it enables:**
- `ProtectedRoute.test.jsx` and `ErrorBoundary.test.jsx` become runnable.
- `yarn test` runs the full `__tests__/` tree including pure-Jest T-09 (`paymentService.test.js`).

**Sequence hazard:**
- T-09 test T2 asserts `API_ENDPOINTS.CLEAR_BILL` exists and matches `/^\/api\//`.
- `constants.js` does NOT define `CLEAR_BILL`.
- → Enabling Jest BEFORE resolving paymentService CLEAR_BILL will produce a **visible test failure**.
- This is not a regression (the test has always been there) but it is a newly-surfaced failing test that risks blocking subsequent QA cycles.

**Resolution:**
- **Option A (recommended):** resolve paymentService CLEAR_BILL FIRST (via its owner-gated split-out per §12), update T-09 to match final state, THEN wire TEST-INFRA-001.
- **Option B:** wire TEST-INFRA-001 NOW and document T-09 T2 as "known failing; paired with paymentService CLEAR_BILL cleanup ticket" in the QA report. Requires owner sign-off on surfacing a failing test.

**Validation:**
- Webpack + dev-server unchanged (runtime code untouched).
- `yarn install` succeeds; yarn.lock updated.
- `yarn test --watchAll=false` runs; report number of pass/fail suites.
- `ProtectedRoute.test.jsx` + `ErrorBoundary.test.jsx` RUN (pass or fail surfaces).
- If Option B: T-09 T2 fails visibly; rest of suite passes.

**QA required:** lint + install + `yarn test` run; document result in hygiene QA report.

**Estimated effort:** ~30 min (install + re-build + test suite run + report).

**Approval gate:** **YES** — owner must pick Option A (sequence behind paymentService cleanup) vs Option B (wire first, accept one known failing test). Option A strongly recommended.

---

## 10. QA plan per batch

### 10.1 Batch 1 QA (docs only)
- Static diff review.
- Grep sanity: affected phrases updated; unrelated sections untouched.
- No QA report file needed (doc edit logged in Final Acceptance §7 row marker).

### 10.2 Batch 2 QA
- `mcp_lint_javascript` on `OrderDetailSheet.jsx`, `reportTransform.js`, `ExportButtons.jsx` → 0 issues.
- Webpack dev-server baseline preserved (1 pre-existing `LoadingPage.jsx:111` warning — only until Batch 3 sub-item #1 lands).
- Preview URL HTTP 200.
- Full-tree grep: `cash_on_delivery` hit count = 4 (same as pre-edit; 3 sibling sites now guard rather than raw-passthrough).
- CSV footer invariant: header columns.length === body row cells.length === summary cells.length.
- Preprod walk (runtime-addendum pending): audit drill-down, filter dropdown, CSV download for COD row → all display `—` or equivalent.
- Negative regression grep: `OrderTable.jsx:486-510` unchanged; `PAID_ACTIONS_ALLOWED_METHODS` at L241 unchanged.
- **Deliverable:** `/app/memory/change_requests/qa_reports/HYGIENE_9_ITEMS_QA_REPORT.md` covering items 1-6.

### 10.3 Batch 3 QA
- **Sub-item 1 (LoadingPage):** lint + webpack; 1-line diff review.
- **Sub-item 2 (paymentService) — per §12 split-out plan:** lint + webpack + grep-audit ("no non-test caller"); T-09 test update; regression grep against `paymentMutationService` + `BILL_PAYMENT` Collect Bill live path.
- **Sub-item 3 (TEST-INFRA-001):** `yarn install` log; `yarn test --watchAll=false` full suite run; enumerate pass/fail counts; confirm `ProtectedRoute.test.jsx` + `ErrorBoundary.test.jsx` now execute.
- **Deliverable:** append Batch 3 section to the same hygiene QA report.

---

## 11. Approval gates

| Gate | Where | Decision needed | Recommended default |
|---|---|---|---|
| **G-1** | Batch 1 kickoff | Approve DOC-B2-01 / DOC-A0a-01 prose revisions | Auto-approve (no behaviour change) |
| **G-2** | Batch 2 kickoff | Confirm 3 micro-choices: DETAIL-A0a-01 `—` vs `Cash`; FILTER-A0a-01 drop vs remap; CR-001 exports drop-column vs pad-row | All three → Option A (recommended in §9.2) |
| **G-3** | Batch 3 start — LoadingPage sub-item | Approve `eslint-disable-next-line` pattern to match L68 | Auto-approve |
| **G-4** | **Batch 3 — paymentService CLEAR_BILL** | Owner-required: delete-vs-repair (§12 spells out four sub-choices) | Defer to owner — do NOT proceed without explicit sign-off |
| **G-5** | **Batch 3 — TEST-INFRA-001 sequencing** | Owner-required: sequence behind paymentService (Option A, recommended) vs wire-first-with-known-failure (Option B) | Option A |
| **G-6** | Post-implementation | Tracker updates: mark 6 backlog rows as resolved; append hygiene QA report pointer | Standard Final-Acceptance row-update pattern (same as FO-B1-01 closure) |

---

## 12. Items to split out

### 12.1 paymentService CLEAR_BILL → `split_out_required`

**Why it must be split:**
1. Baseline rule **API-05** explicitly says stale surfaces stay "documented until **deliberately cleaned**" — cleanup triggers an intentional owner decision.
2. The function references an endpoint constant that **does not exist** (`API_ENDPOINTS.CLEAR_BILL` is absent from `constants.js`). Calling it would throw; cleanup means either deleting or repairing.
3. There is a paired failing-contract test (`paymentService.test.js` T-09 T2) that will fail once Jest runs. Cleanup scope therefore also includes test-fate decisions.
4. Rule **API-03** says `paymentService.collectPayment()` is stale and "must not be treated as canonical for new work" — the LIVE settle path is `paymentMutationService` → `API_ENDPOINTS.BILL_PAYMENT`. Cleanup must demonstrably NOT alter the live path.

**Sub-choices for owner:**
- **12.1.a Delete the dead service file** (`paymentService.js` + T-09 test file). Cleanest; matches API-03 intent. Requires confirming no non-test caller (already verified by grep — zero callers).
- **12.1.b Repair the service to point at `BILL_PAYMENT`** and update T-09 to assert `BILL_PAYMENT` — preserves the wrapper for any future caller. Risk: creates a second live path parallel to `paymentMutationService`; violates API-03 intent ("stale from a code perspective").
- **12.1.c Add `CLEAR_BILL` as an alias to `BILL_PAYMENT`** in `constants.js` — keeps file and test green but leaves dead code. Does not advance API-03 cleanup goal.
- **12.1.d Leave everything as-is and document the latent bug in backlog** — status quo. Contradicts the "safe to start now" framing in the Pending Register.

**Recommendation:** Option 12.1.a (delete). Requires owner "go" because (1) it removes a file mentioned in API-03/API-05, and (2) it deletes a test file.

**Blast radius if chosen:** 2 files removed; zero runtime impact (no caller); constants.js untouched; `paymentMutationService` untouched.

**Validation after split-out:**
- Grep post-edit: `collectPayment\b|CLEAR_BILL` → 0 hits outside of git history.
- Grep: `paymentMutationService\b|BILL_PAYMENT\b` → unchanged hit set; confirm live Collect Bill path intact.
- Webpack build unchanged.
- Hygiene QA report appends a dedicated §paymentService-cleanup subsection.

**Dependency on TEST-INFRA-001:** Must resolve 12.1 BEFORE wiring TEST-INFRA-001 (Option A of §9.3.3), OR update T-09 alongside the cleanup so the test suite runs green once Jest is enabled.

### 12.2 TEST-INFRA-001 → can stay in Batch 3 BUT must be sequenced after 12.1

Not strictly "split out" — the item itself is low-risk and contained. The sequencing hazard (§9.3.3 sequence hazard) means it cannot run before paymentService CLEAR_BILL is resolved. Treat as "latched" to 12.1.

### 12.3 CR-001 exports alignment → does NOT require split-out

Verified in §6 clash matrix and §9.2: the edit is confined to `ExportButtons.jsx` footer geometry (either drop a column or pad one cell). It does not touch report semantics, CR-001 status derivation, `displayOrderId` / `punchedBy` / `actionedBy` / `displayLocationLabel` derivations, or any tab-specific column splice at L64-72. Stays in Batch 2.

---

## 13. Final recommendation — can Batch 1 start safely?

> **✅ YES — Batch 1 (DOC-B2-01 + DOC-A0a-01) is safe to start immediately.**

- Zero code touched.
- Zero baseline-rule conflict.
- Zero accepted-sprint-behaviour impact.
- Both edits are verbatim from QA reports that already exist (`CR_005_B2_SPLIT_QA_REPORT.md` §10, `A0a_UI_COD_MASK_QA_REPORT.md` §12 + §14).
- No owner gate needed (G-1 is an auto-approve).
- Estimated total effort: ~10 minutes.
- On completion: update `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` §7 rows 2 + 3 with resolved markers (same pattern used for FO-B1-01 closure).

### 13.1 Recommended overall execution sequence

1. **Now:** Batch 1 (docs).
2. **Next:** Batch 2 (requires micro-confirm on 3 owner choices at kickoff; can fall back to recommended defaults if owner says "implementer's discretion").
3. **After owner sign-off on G-4 + G-5:** Batch 3 sub-item 1 (LoadingPage ESLint) + sub-item 2 (paymentService CLEAR_BILL per §12) + sub-item 3 (TEST-INFRA-001 wiring).
4. **Post-implementation:** single combined hygiene QA report + tracker row-updates + (optional) implementation summary.

### 13.2 What this plan explicitly does NOT do
- Does not start, modify, unpark, or touch any backend item (BE-1..BE-F) — all remain parked.
- Does not alter Collect Bill semantics, KOT/bill totals, PG status logic, or order lifecycle derivation.
- Does not touch `/app/memory/final/*` — FE-01..FE-03 optional enrichments remain on owner-decision list.
- Does not open a new CR — all 9 items stay in hygiene/backlog scope.
- Does not start CR-002, CR-009, CR-010, CR-013, A3, A4, B3, B4, B2 Phase 2, CR-008 Phase B, or CR-008 Sub-CR #3.
- Does not run QA, tests, lint, or webpack — planning is read-only.

---

**End of plan. Awaiting owner decision on Batch 1 kickoff + Batch 2 micro-confirms + G-4 / G-5 paymentService gate.**
