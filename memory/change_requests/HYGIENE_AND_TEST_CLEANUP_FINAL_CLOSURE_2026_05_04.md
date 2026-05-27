# Hygiene + NS-3C Test Cleanup — Final Closure 2026-05-04

> ## ⚠ 2026-05-05 POST-FINAL-ACCEPTANCE UPDATE — CR-013 Phase 1.5
> **The CR-013 references in §1.3 ("13 parked CR/sub-CR/bucket items remain parked … CR-013"), §7.4 ("All 13 parked CR/sub-CR/bucket items … remain in their pre-cycle parked state"), and §9.2 ("CR-013 · CR · `parked_owner_decision` (not started)") are superseded.**
>
> - **New CR-013 status:** `qa_passed_with_known_print_backend_finding`.
> - **QA report:** `/app/memory/change_requests/qa_reports/CR_013_PHASE_1_5_RUNTIME_QA_REPORT.md`
> - **Reconciliation summary:** `/app/memory/change_requests/implementation_summaries/CR_013_TRACKER_RECONCILIATION_SUMMARY_2026_05_05.md`
> - **Hygiene + NS-3C closure itself is unchanged** — no hygiene items or test-suite results were affected by CR-013's later 2026-05-05 work. The 19/19 suites · 199/199 tests headline tally in §1.2 / §5 remains valid.
> - **Items kept pending (not resolved by this update):** BE-G9 / BE-G10 / BE-G11 backend asks · Bean Me Up backend print-template double-count owner decision · additive owner visual walk-through on tenant 742.

**Agent:** Hygiene + Test Cleanup Final Closure Agent
**Date:** 2026-05-04
**Branch:** `5may`
**Mode:** Read-only closure snapshot. No code edits, no QA runs, no test runs (final-status confirmation only — see §5).
**Predecessors (read in full):**
- `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md`
- `/app/memory/change_requests/implementation_summaries/RAW_FIELD_PROD_FALLBACK_FIX_SUMMARY.md`
- `/app/memory/change_requests/implementation_summaries/COMBINED_HYGIENE_BATCH_1_DOC_CLEANUP_SUMMARY.md`
- `/app/memory/change_requests/implementation_summaries/COMBINED_HYGIENE_BATCH_2_DISPLAY_EXPORT_SUMMARY.md`
- `/app/memory/change_requests/implementation_summaries/COMBINED_HYGIENE_BATCH_3A_LOADINGPAGE_ESLINT_SUMMARY.md`
- `/app/memory/change_requests/implementation_summaries/COMBINED_HYGIENE_BATCH_3B_PAYMENTSERVICE_DELETE_SUMMARY.md`
- `/app/memory/change_requests/implementation_summaries/COMBINED_HYGIENE_BATCH_3C_TEST_INFRA_SUMMARY.md`
- `/app/memory/change_requests/implementation_summaries/NS_3C_T1_TEST_ONLY_FIXES_SUMMARY.md`
- `/app/memory/change_requests/implementation_summaries/NS_3C_T2_JSX_FIXTURE_FIXES_SUMMARY.md`
- `/app/memory/change_requests/implementation_summaries/NS_3C_T3_TEST_FIXTURE_AND_BARREL_FIXES_SUMMARY.md`
- `/app/memory/change_requests/implementation_summaries/NS_3C_T4_RAW_FIELD_PARKED_SUMMARY.md`
- `/app/memory/change_requests/qa_reports/QA_REPORT_INDEX.md`

---

## 1. Executive summary

### 1.1 Verdict

> **✅ CLOSED — the Combined Hygiene + NS-3C Test Cleanup + RAW-FIELD-PROD-FALLBACK-FIX track is fully complete on branch `5may`.**

Three sequential mini-tracks ran 2026-05-04:

1. **Combined Hygiene (9 items)** across 5 batches (Batch 1 + Batch 2 + Batch 3A + Batch 3B + Batch 3C). The cycle wired `@testing-library/react` + `jest-dom` for the first time on this branch via Batch 3C, which surfaced 10 newly-visible failing test suites (NS-3C-1..NS-3C-10).
2. **NS-3C Test Cleanup (10 items)** ran 4 sub-batches (T1 + T2 + T3 + T4-park). T1+T2+T3 closed 9 of 10. T4 parked the 10th (NS-3C-4) as a real production-fix item rather than masking it.
3. **RAW-FIELD-PROD-FALLBACK-FIX (1 item)** — the parked NS-3C-4 — ran as an owner-approved production-fix cycle and closed the residue.

### 1.2 Net headline numbers

| Metric | Value |
|---|---|
| Hygiene items closed | **9 / 9** |
| NS-3C items closed | **10 / 10** |
| RAW-FIELD-PROD-FALLBACK-FIX | ✅ Closed |
| Test suites passing | **19 / 19** |
| Tests passing | **199 / 199** |
| Production behaviour delta | **None observable** (every fix was hygiene, dead-code removal, decoupling, redundancy removal, or expectation refresh) |
| Backend changes | **0** |
| `/app/memory/final/*` changes | **0** |
| Sprint-accepted CRs disturbed | **0** |
| BE-* parked items unparked | **0** |

### 1.3 Cumulative project state after closure

- 12 sprint-accepted frontend CRs (CR-001..CR-008, A0a, A0b — from the 2026-04-29/05-04 sprint window) **remain accepted** with their original `accepted_with_deferred_backend_dependency` (10) and `accepted_with_runtime_addendum_pending` (2) classifications.
- 9 BE-* asks **remain parked** (BE-1, BE-2, BE-T, BE-U, BE-V, BE-W, BE-W2, BE-A, BE-F).
- 13 parked CR/sub-CR/bucket items **remain parked** (A3, A4, B3, B4, B2 Phase 2, CR-008 #4 Phase B, CR-008 Sub-CR #3, CR-002, CR-009, CR-010, CR-011, CR-012, CR-013).
- 1 new Phase-3 CR was filed during Batch 3A (UX-LOADING-02 — visible station-load progress) — owner option-pick (A/B/C) pending, still parked.
- 3 runtime addenda (A0a, A0b, FO-B1-01) **remain pending preprod wake** — additive only, no acceptance gate.

---

## 2. Completed 9-item Hygiene track

| # | ID | Description | Batch | Resolution |
|---|---|---|---|---|
| 1 | **DOC-B2-01** | CR-005 #1 / B2-split handover prose referenced `snapshot_razorpay_amount`; shipped code reads `payment_amount` | **Batch 1** | Documentation-only. Aligned `CR_BUCKET_B2_PG_COLUMNS_HANDOVER.md` §1 row B2.B + §5 + new §10 to shipped code. No code change. |
| 2 | **DOC-A0a-01** | A0a handover §14 step 6 wording vs pre-existing `PAID_ACTIONS_ALLOWED_METHODS` eligibility | **Batch 1** | Documentation-only. Wording corrected in `CR_BUCKET_A0a_UI_COD_MASK_HANDOVER.md` §14 step 6 + new §16. No code change. |
| 3 | **CSV-A0a-01** | CSV export at `ExportButtons.jsx:193` still emitted raw `cash_on_delivery` | **Batch 2** | CSV column format-fn + PDF cell guard added at `ExportButtons.jsx:58-61 + 205`; both mask `cash_on_delivery → '—'` matching audit-table A0a display. Raw enum preserved in payload. |
| 4 | **DETAIL-A0a-01** | OrderDetailSheet drill-down still mapped `cash_on_delivery → 'CASH'` via `formatPaymentMethod` | **Batch 2** | `methodMap['cash_on_delivery']` changed from `'CASH'` to `'—'` at `OrderDetailSheet.jsx:89`. |
| 5 | **FILTER-A0a-01** | `reportTransform.extractPaymentMethods` could surface `cash_on_delivery` in the filter dropdown | **Batch 2** | Exported helper at `reportTransform.js:708-726` now excludes `cash_on_delivery` from the returned Set (defensive — zero current runtime consumers). |
| 6 | **CR-001 / Exports column alignment** | `ExportButtons.jsx` CSV had 9 columns vs handover's 8; summary row 1 column off | **Batch 2** | Summary row generated dynamically from `columns.length` at `ExportButtons.jsx:92-104`. Aligns on all 3 tab variants (base 9=9, cancelled 11=11, aggregator 11=11). `paymentType` column retained per owner preference. |
| 7 | **LoadingPage ESLint** | `LoadingPage.jsx:111 react-hooks/exhaustive-deps` warning | **Batch 3A** | Single `// eslint-disable-next-line react-hooks/exhaustive-deps` added at `LoadingPage.jsx:112` (mirrors existing sibling disable at L68). Webpack now `Compiled successfully` (was `Compiled with 1 warning`). Side-observation about visible station-load progress filed as **new Phase-3 CR `UX-LOADING-02`** — not part of this track. |
| 8 | **paymentService CLEAR_BILL** | `paymentService.collectPayment()` referenced missing `API_ENDPOINTS.CLEAR_BILL` | **Batch 3B (DELETE)** | Dead file `paymentService.js` removed (zero runtime callers; grep-verified). Companion zombie test file `paymentService.test.js` removed. 3-line comment in `paymentMutationService.js:12-17` refreshed. Live Collect Bill path (`BILL_PAYMENT` via `OrderEntry.jsx:1463`, `CollectBillPanelDrawer.jsx:183`, CR-003 wrappers) untouched. |
| 9 | **TEST-INFRA-001** | `@testing-library/react` + `jest-dom` not wired on this branch | **Batch 3C** | `yarn add --dev @testing-library/react@^14 @testing-library/jest-dom@^6` (resolved to `14.3.1` + `6.9.1`); `setupTests.js` created with `import '@testing-library/jest-dom';`. `yarn test --watchAll=false` ran the full 19-suite tree for the first time on this branch. (Cumulative result before NS-3C cleanup: 9 suites pass / 10 fail, 127/201 tests — see Batch 3C summary §3 for the surfaced failure inventory that became NS-3C-1..NS-3C-10.) |

**Hygiene track summary:** 5 production source files lightly edited (export/display + ESLint) · 2 dead files deleted · 4 doc files updated · 2 dev-deps added · 1 setup file created · 1 new Phase-3 CR opened. Runtime/UI behaviour preserved end-to-end.

---

## 3. Completed NS-3C Test Cleanup track

| ID | Suite | Resolution sub-batch | Net change |
|---|---|---|---|
| **NS-3C-1** | `__tests__/guards/ProtectedRoute.test.jsx` | **T2** (JSX mock-context) | Test-only: flipped `mockRestaurantValue.isLoaded` default from `false` to `true`; repurposed test B2 to assert the documented CR-001 Fix B2 loading-redirect (`/loading`). 9/9 PASS. |
| **NS-3C-2** | `__tests__/integration/App.routing.test.jsx` | **T2** | Test-only: added `useRestaurant` mock parallel to ProtectedRoute.test.jsx (default `{ isLoaded: true }`; reset in `beforeEach`). 4/4 PASS. |
| **NS-3C-3** | `__tests__/api/constants.test.js` (T-08 T3) | **T1** | Test-only: broadened valid-prefix rule from `/api/` ∪ `TBD` to `/api/` ∪ `/pos/` ∪ `TBD` (CRM endpoints legitimately use `/pos/...`). 4/4 PASS. |
| **NS-3C-4** | `__tests__/api/transforms/rawField.test.js` (T-11 T3) | **RAW-FIELD-PROD-FALLBACK-FIX** (separate production-fix cycle) | Production-source fix (Option a). 4 lines edited across `RoomRowCard.jsx` + `RoomOrdersReportPage.jsx`. Test untouched. 3/3 PASS naturally. See §4. |
| **NS-3C-5** | `__tests__/structure/barrelExports.test.js` (T-12 / T-14) | **T3** | Production: 4 missing report exports added to `src/components/reports/index.js`; 2 missing page exports added to `src/pages/index.js`. Barrels are non-runtime scaffolding (live app uses direct named imports). 26/26 PASS. |
| **NS-3C-6** | `__tests__/api/socket/updateOrderStatus.test.js` | **T3** | Test-only: rewritten in place to assert BUG-107 v2 socket-payload contract (`parseMessage`-driven, `cancelled`/`paid` → remove, others → update, invalid → early return). 11/11 PASS. |
| **NS-3C-7** | `__tests__/api/transforms/cancelItemPayload.test.js` | **T3** | Test-only: rewritten to use unified `toAPI.cancelItem(table, item, reason, qty)` (BUG-106 unified). Owner-approved Choice 2.A: 2 obsolete cancel-split assertions reversed (`cancel_qty` is now ALWAYS expected). 32/32 PASS. |
| **NS-3C-8** | `__tests__/api/transforms/orderTransformFinancials.test.js` | **T1** | Test-only: 3 stale-fallback tests updated to match transform-layer "no fallback" contract (`orderTransform.js:183`); consumer-layer fallback chain at L1360 covers display. 18/18 PASS. |
| **NS-3C-9** | `__tests__/api/transforms/updateOrderPayload.test.js` | **T3** | Test-only: rewritten to current `toAPI.updateOrder` contract (string-typed `gst_amount`/`vat_amount`; per-item `tax_amount`/`total_price` rolled up to order-level; `order_id: String(...)`; `order_type: 'takeaway'` per OLD_POS_NORMALIZE Task 3, Apr-2026; `cust_name`-only). 17/17 PASS. |
| **NS-3C-10** | `api/transforms/__tests__/orderTransform.roomInfo.test.js` | **T1** | Test-only: 2 strict `toEqual` assertions changed to `toMatchObject` to accommodate CR-004 P4.1 + BE-2 §4.1 expanded `roomInfo` schema (10 added keys). 7/7 PASS. |

**NS-3C track summary:** 10 of 10 closed. Production source touched only on NS-3C-5 (barrel additions; non-runtime) and NS-3C-4 (RAW-FIELD-PROD-FALLBACK-FIX, see §4). Every other resolution was test-only.

---

## 4. RAW-FIELD-PROD-FALLBACK-FIX final status

**Status:** ✅ **RESOLVED 2026-05-04** — owner-approved Option (a), no transform-contract change.

### 4.1 Production edits landed

| File | Lines | Change |
|---|---|---|
| `src/components/reports/RoomRowCard.jsx` | L194 | `oin = ao?._raw?.order_in \|\| 'SRM'` → literal `'SRM'`. (API schema for `associated_order_list[]` items lacks `order_in`; literal is the de-facto stable contract.) |
| `src/components/reports/RoomRowCard.jsx` | L197 | Redundant middle fallback `ao?._raw?.restaurant_order_id` removed. (`ao.orderNumber === item.restaurant_order_id`, already the primary on the same expression.) |
| `src/components/reports/RoomRowCard.jsx` | L202 | `formatTime(ao?._raw?.created_at)` else-branch removed. (Items in `associated_order_list[]` reliably populate `transferredAt`; rare-edge fallback dropped per Option a.) |
| `src/pages/RoomOrdersReportPage.jsx` | L497 | Dead `(seed._raw && seed._raw.table)` middle fallback removed. (Live source: `_raw.table` is an OBJECT, unreachable since `seed.roomNumber` is already populated upstream. Logs source: no `.table` field on the raw log row.) |

### 4.2 Validation

- `yarn test src/__tests__/api/transforms/rawField.test.js` → **3/3 PASS naturally** (test file untouched).
- `yarn test --watchAll=false` (full suite) → **19/19 suites · 199/199 tests PASS** in 5.6s.
- `grep '\._raw\b' src/components/reports/RoomRowCard.jsx src/pages/RoomOrdersReportPage.jsx` → empty (zero residual `._raw` access in either consumer, including comments).
- 9 dev-gates in `reportTransform.js` (192/244/278/313/374/444/636) + `orderTransform.js:1235` unchanged (T-11 T2 still satisfied).

### 4.3 Owner-approval record

- Approval: `Approve as-is (G-A = a)` — owner explicitly chose Option (a) over Option (b) (the alternative would have additively extended the `associatedOrders` mini-transform with `createdAt`).
- Tracker rows updated: `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` §7 row 27 → RESOLVED; `PENDING_TASK_REGISTER_2026_05_04.md` `RAW-FIELD-PROD-FALLBACK-FIX` row → `closed_resolved`.
- Implementation summary: `/app/memory/change_requests/implementation_summaries/RAW_FIELD_PROD_FALLBACK_FIX_SUMMARY.md`.

---

## 5. Final test-suite status (final-status confirmation only)

| Metric | Pre-Batch 3C | Post-Batch 3C (NS-3C surface) | Post-NS-3C T1+T2+T3 | Post-RAW-FIELD-PROD-FALLBACK-FIX |
|---|---|---|---|---|
| Test suites total | not runnable on branch | 19 | 19 | **19** |
| Suites passing | n/a | 9 | 18 (NS-3C-4 parked failing) | **19** ✅ |
| Tests total | not runnable | 201 | 201 | **199** (note: `paymentService.test.js` deleted as zombie alongside Batch 3B `paymentService.js` delete; net total dropped by 2) |
| Tests passing | n/a | 127 | 198 | **199** ✅ |
| `rawField.test.js` | n/a | T-11 T1 ✅ T2 ✅ T3 ❌ | T1 ✅ T2 ✅ T3 ❌ (parked) | **T1 ✅ T2 ✅ T3 ✅** |

Latest full-suite run command (executed during the production-fix cycle): `cd /app/frontend && CI=true yarn test --watchAll=false` → `Test Suites: 19 passed, 19 total · Tests: 199 passed, 199 total · Time: 5.636 s`.

**This closure document does NOT trigger a new test run; the green tally above is the canonical final state from the production-fix cycle's verification step.**

---

## 6. Files changed by category (entire 3-track cycle)

### 6.1 Documentation / tracker

| Path | Tracks |
|---|---|
| `/app/memory/change_requests/CR_BUCKET_B2_PG_COLUMNS_HANDOVER.md` | Batch 1 (DOC-B2-01) |
| `/app/memory/change_requests/CR_BUCKET_A0a_UI_COD_MASK_HANDOVER.md` | Batch 1 (DOC-A0a-01) |
| `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` | All batches (§7 row updates) + RAW-FIELD-PROD-FALLBACK-FIX |
| `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md` | RAW-FIELD-PROD-FALLBACK-FIX (row → `closed_resolved`) |
| `/app/memory/change_requests/qa_reports/QA_REPORT_INDEX.md` | (already cleaned during the precursor Final Acceptance run; not re-touched in this cycle) |
| `/app/memory/change_requests/implementation_summaries/COMBINED_HYGIENE_BATCH_1_DOC_CLEANUP_SUMMARY.md` | new |
| `/app/memory/change_requests/implementation_summaries/COMBINED_HYGIENE_BATCH_2_DISPLAY_EXPORT_SUMMARY.md` | new |
| `/app/memory/change_requests/implementation_summaries/COMBINED_HYGIENE_BATCH_3A_LOADINGPAGE_ESLINT_SUMMARY.md` | new |
| `/app/memory/change_requests/implementation_summaries/COMBINED_HYGIENE_BATCH_3B_PAYMENTSERVICE_DELETE_SUMMARY.md` | new |
| `/app/memory/change_requests/implementation_summaries/COMBINED_HYGIENE_BATCH_3C_TEST_INFRA_SUMMARY.md` | new |
| `/app/memory/change_requests/implementation_summaries/NS_3C_T1_TEST_ONLY_FIXES_SUMMARY.md` | new |
| `/app/memory/change_requests/implementation_summaries/NS_3C_T2_JSX_FIXTURE_FIXES_SUMMARY.md` | new |
| `/app/memory/change_requests/implementation_summaries/NS_3C_T3_TEST_FIXTURE_AND_BARREL_FIXES_SUMMARY.md` | new |
| `/app/memory/change_requests/implementation_summaries/NS_3C_T4_RAW_FIELD_PARKED_SUMMARY.md` | new (now historical — production-fix cycle has since resolved) |
| `/app/memory/change_requests/impact_analysis/NS_3C_TEST_FAILURE_TRIAGE_PLAN.md` | new |
| `/app/memory/change_requests/implementation_summaries/RAW_FIELD_PROD_FALLBACK_FIX_SUMMARY.md` | new |
| `/app/memory/change_requests/phase_3/UX_LOADING_02_VISIBLE_STATION_PROGRESS.md` | new (side-observation Phase-3 CR; owner option-pick pending) |
| `/app/memory/change_requests/HYGIENE_AND_TEST_CLEANUP_FINAL_CLOSURE_2026_05_04.md` | this file |

### 6.2 Tests

| Path | Track | Nature |
|---|---|---|
| `frontend/src/__tests__/api/constants.test.js` | NS-3C-3 (T1) | Rule broadened (`/api/` ∪ `/pos/` ∪ `TBD`) |
| `frontend/src/__tests__/api/transforms/orderTransformFinancials.test.js` | NS-3C-8 (T1) | 3 fallback tests updated to transform-layer "no fallback" expectation |
| `frontend/src/api/transforms/__tests__/orderTransform.roomInfo.test.js` | NS-3C-10 (T1) | 2 `toEqual` → `toMatchObject` |
| `frontend/src/__tests__/guards/ProtectedRoute.test.jsx` | NS-3C-1 (T2) | `mockRestaurantValue` default flipped; B2 repurposed |
| `frontend/src/__tests__/integration/App.routing.test.jsx` | NS-3C-2 (T2) | `useRestaurant` mock added |
| `frontend/src/__tests__/structure/barrelExports.test.js` | NS-3C-5 (T3) | (no edit; passes after barrel additions in §6.3) |
| `frontend/src/__tests__/api/socket/updateOrderStatus.test.js` | NS-3C-6 (T3) | Rewritten in place to BUG-107 v2 contract |
| `frontend/src/__tests__/api/transforms/cancelItemPayload.test.js` | NS-3C-7 (T3) | Rewritten in place to unified `toAPI.cancelItem` |
| `frontend/src/__tests__/api/transforms/updateOrderPayload.test.js` | NS-3C-9 (T3) | Rewritten in place to current `toAPI.updateOrder` shape |
| `frontend/src/setupTests.js` | TEST-INFRA-001 (Batch 3C) | NEW file (`import '@testing-library/jest-dom'`) |
| `frontend/src/__tests__/services/paymentService.test.js` | paymentService DELETE (Batch 3B) | DELETED (zombie test for deleted production file) |

(The `rawField.test.js` file was deliberately UNTOUCHED across the entire cycle.)

### 6.3 Production source

| Path | Track | Net |
|---|---|---|
| `frontend/src/components/reports/ExportButtons.jsx` | CSV-A0a-01 + CR-001 / Exports (Batch 2) | CSV/PDF mask; dynamic summary row |
| `frontend/src/components/reports/OrderDetailSheet.jsx` | DETAIL-A0a-01 (Batch 2) | `methodMap['cash_on_delivery'] = '—'` |
| `frontend/src/api/transforms/reportTransform.js` | FILTER-A0a-01 (Batch 2) | `extractPaymentMethods` excludes `cash_on_delivery` |
| `frontend/src/pages/LoadingPage.jsx` | LoadingPage ESLint (Batch 3A) | `// eslint-disable-next-line` at L112 |
| `frontend/src/api/services/paymentService.js` | paymentService CLEAR_BILL (Batch 3B) | DELETED (dead file; zero runtime callers) |
| `frontend/src/api/services/paymentMutationService.js` | paymentService CLEAR_BILL (Batch 3B) | 3-line comment refresh (L12-17) |
| `frontend/src/components/reports/index.js` | NS-3C-5 (T3) | +4 exports |
| `frontend/src/pages/index.js` | NS-3C-5 (T3) | +2 exports |
| `frontend/src/components/reports/RoomRowCard.jsx` | RAW-FIELD-PROD-FALLBACK-FIX | 3 surgical edits at L193-202 (literal `'SRM'`; redundant fallback removed; `created_at` else-branch dropped) |
| `frontend/src/pages/RoomOrdersReportPage.jsx` | RAW-FIELD-PROD-FALLBACK-FIX | 1 surgical edit at L491-498 (dead `_raw.table` middle fallback removed) |

### 6.4 Package / dependency

| Change | Track |
|---|---|
| `yarn add --dev @testing-library/react@^14` (resolved to 14.3.1) | TEST-INFRA-001 (Batch 3C) |
| `yarn add --dev @testing-library/jest-dom@^6` (resolved to 6.9.1) | TEST-INFRA-001 (Batch 3C) |
| `yarn.lock` updated by yarn (transitive resolution) | TEST-INFRA-001 (Batch 3C) |

No production dependencies changed. No version bumps to existing packages.

---

## 7. Confirmation of untouched areas

### 7.1 Backend

✅ **`/app/backend/**` — UNTOUCHED across all three tracks.** No file added, removed, or edited. No backend supervisor service started during this cycle. The frontend supervisor service was the only one running (consistent with the deployed frontend-only project on this branch).

### 7.2 `/app/memory/final/` baseline docs

✅ **`/app/memory/final/*` — UNTOUCHED.** All 7 baseline docs (`ARCHITECTURE_DECISIONS_FINAL.md`, `MODULE_DECISIONS_FINAL.md`, `OPEN_QUESTIONS_FINAL_RESOLUTION.md`, `FINAL_DOCS_APPROVAL_STATUS.md`, etc.) carry their pre-cycle content unchanged. The 3 optional baseline-enrichment proposals (FE-01, FE-02, FE-03) catalogued in Final Acceptance §11 remain `needs_owner_decision` and were NOT applied.

### 7.3 Parked BE-* items

✅ **All 9 BE-* items remain parked (`parked_backend_dependency`).** No BE item was unparked, contracted, or otherwise advanced during the cycle:

- BE-1 (CR-001 cell-level fields) — parked
- BE-2 (Lodging payment breakdown) — parked
- BE-T (CR-004 P2 G2/G3/OPT) — parked
- BE-U (CR-005 Phase A web-order attribution) — parked
- BE-V (B3 item-level `cancel_by_name`) — parked
- BE-W (Per-item paid-stage fields) — parked
- BE-W2 (`snapshot_razorpay_status` → gates B2 Phase 2) — parked
- BE-A (CR-011 PG scan lifecycle) — parked
- BE-F (`default_landing_screen` → gates CR-008 #4 Phase B) — parked

### 7.4 Other parked items

✅ All 13 parked CR/sub-CR/bucket items (A3, A4, B3, B4, B2 Phase 2, CR-008 Sub-CR #3, CR-008 #4 Phase B, CR-002, CR-009, CR-010, CR-011, CR-012, CR-013) remain in their pre-cycle parked state. No item was unparked.

### 7.5 Sprint-accepted CRs

✅ The 12 sprint-accepted CRs (CR-001..CR-008, A0a, A0b) remain accepted with their original classifications. Cycle edits did NOT alter any sprint-accepted behaviour:

- All UI consumers in CR-001..CR-008 + A0a + A0b QA reports continue to render and behave identically.
- No transform contract was widened, narrowed, or removed (Option a was selected for RAW-FIELD-PROD-FALLBACK-FIX precisely to preserve transform contracts).
- No socket/HTTP wire format changed.

---

## 8. Corrected interpretation of the RAW-FIELD issue

The T4 parked summary (`NS_3C_T4_RAW_FIELD_PARKED_SUMMARY.md` §2.1) framed NS-3C-4 as a **production-only silent-degradation bug** caused by `process.env.NODE_ENV === 'development'` build-time stripping. The production-fix cycle's static inspection corrected this premise.

### 8.1 What was actually true

| `_raw` source consumed by the 4 violating UI lines | Where set | Dev-gated? | Production behaviour |
|---|---|---|---|
| `ao._raw` (each AssociatedOrder item read in `RoomRowCard.jsx`) | `orderTransform.js:268` — `_raw: item` inside the `associatedOrders` mini-transform | **❌ NO gate** | `ao._raw` is present in production builds |
| `seed._raw` (live-source rows read in `RoomOrdersReportPage.jsx`) | `roomListTransform.js:54` — `_raw: r` | **❌ NO gate** | `seed._raw` is present in production builds |
| `seed._raw` (logs-source rows read in `RoomOrdersReportPage.jsx`) | `reportService.js:1177` — `_raw: o` | **❌ NO gate** | `seed._raw` is present in production builds |

The 7 dev-gates counted by T4 (`reportTransform.js:192/244/278/313/374/444/636`) sit on top-level audit-report row transforms — **a different layer entirely**, never reached by these 4 specific UI accesses. The "literal `'SRM'` always shown / lost `created_at` / lost table-name" symptoms claimed in T4 §2.3 **were not caused by build-time stripping** and were not actually occurring as silent production degradations.

### 8.2 What the test rule was actually enforcing

`rawField.test.js` T-11 T3's static text-match rule (`/\._raw\b/g`) was enforcing an **architectural decoupling rule**:

> *UI components and pages must read transformed fields, not raw API fields, regardless of whether `_raw` happens to be available at runtime.*

The intent: keep consumer code coupled only to the stable transformed contract, so that future changes to upstream API shapes ripple through transforms (one-touch fix) instead of through every UI consumer (n-touch fix).

### 8.3 What the production-fix cycle delivered

The 4 surgical edits realise that decoupling cleanly:

- **L194 (RoomRowCard):** the literal `'SRM'` is now explicit (the API never reliably provided `order_in` on `associated_order_list[]` items anyway — the `_raw.order_in` read was reaching for a field that doesn't exist in the documented schema).
- **L197 (RoomRowCard):** the redundant `_raw.restaurant_order_id` middle fallback was removed (`ao.orderNumber` is the same value, already used as the primary).
- **L202 (RoomRowCard):** the rare-edge `_raw.created_at` fallback was dropped per Option (a) (no QA report or owner walk has flagged the edge case in the wild; Option b — additive transform extension — was offered and deliberately declined to keep transform contracts unchanged).
- **L497 (RoomOrdersReportPage):** the dead `_raw.table` fallback was removed (live-source `_raw.table` is an OBJECT and unreachable; logs-source `_raw` carries no `.table` field — the branch was effectively dead code).

### 8.4 Why this re-framing matters for future agents

- The T4 "silent production degradation" risk note **should not be cited** in future architecture or QA documents as an example of dev-only stripping — that mechanism was not at play here.
- The actual learning: **the test rule's text-match check is a forward-looking architectural guardrail**, not a reactive bug detector. It deserves to keep its strict reading because it prevents new UI consumers from coupling to raw API fields.
- For future production fixes that touch transform consumers, default to Option (a) (read existing transformed fields; remove dead/redundant `_raw` accesses) rather than Option (b) (extend the transform contract). Extending transforms speculatively adds maintenance surface for unobserved edge cases.

---

## 9. Remaining pending items after this cycle

The cycle did not change the parked-item landscape. The list below mirrors `PENDING_TASK_REGISTER_2026_05_04.md` post-this-cycle.

### 9.1 Backend asks (`parked_backend_dependency`) — 9 items

| BE Item | Gates | Priority |
|---|---|---|
| **BE-F** | CR-008 #4 Phase B (`default_landing_screen` server-side) | HIGH |
| **BE-W2** | B2 Phase 2 (`snapshot_razorpay_status` → PG Status auto-reveal) | HIGH |
| **BE-1** | CR-001 cell-level UX (P1–P6 + G1) + retained-diagnostics removal | HIGH |
| **BE-V** | B3 item-level `cancel_by_name` | MEDIUM |
| **BE-T** | CR-004 P2 cross-day (G2/G3/OPT) | MEDIUM |
| **BE-W** | Per-item paid-stage fields | MEDIUM |
| **BE-2** | Lodging payment breakdown | MEDIUM |
| **BE-U** | CR-005 Phase A web-order attribution | LOW |
| **BE-A** | CR-011 PG scan lifecycle | LOW |

### 9.2 Parked CR / sub-CR / bucket items — 13 items

| Item | Type | Park reason |
|---|---|---|
| A3 | Bucket | `parked_owner_decision` (declined) |
| A4 | Bucket | `parked_owner_decision` (declined) |
| B3 | Bucket | `parked_backend_dependency` (BE-V) |
| B4 | Bucket | `parked_owner_decision` (by-design) |
| B2 Phase 2 | Sub-bucket | `qa_blocked_backend_dependency` (BE-W2) |
| CR-008 Sub-CR #3 | Sub-CR | `parked_backend_dependency` (backend roadmap) |
| CR-008 #4 Phase B | Sub-CR phase | `qa_blocked_backend_dependency` (BE-F) |
| CR-002 | CR | `parked_owner_decision` (not started) |
| CR-009 | CR | `parked_backend_dependency` (backend-heavy; not started) |
| CR-010 | CR | `parked_owner_decision` (not started; captures Q-RP-03/05, D-A0b-3) |
| CR-011 | CR | `parked_backend_dependency` (BE-A) |
| CR-012 | CR | `parked_owner_decision` (not started) |
| CR-013 | CR | `parked_owner_decision` (not started) |

### 9.3 Phase-3 CRs

| ID | Status |
|---|---|
| **UX-LOADING-02** (visible station-load progress) | NEW this cycle (Batch 3A side-observation). Owner option-pick (A/B/C) pending. Not started. |

### 9.4 Runtime addenda — 3 items (additive only; preprod-gated)

- **A0a** — UI-COD-MASK manual smoke per handover §14 (display short-circuit visual verification on every audit tab) — `accepted_with_runtime_addendum_pending`
- **A0b** — ROLE-NAME-WIRE-FIX DevTools Network sweep across 6 wire consumers — `accepted_with_runtime_addendum_pending`
- **FO-B1-01** — multi-select variant cart-line display ~5-min walk (RB-01..RB-11) — `qa_passed_with_runtime_addendum_pending`

All three trigger when `https://preprod.mygenie.online/` wakes; collectively ~20 minutes of work; no acceptance gate.

### 9.5 Owner-decision items (non-blocking)

- **FE-01** — Optional baseline enrichment to `ARCHITECTURE_DECISIONS_FINAL.md` SM-03 list
- **FE-02** — Optional closure of OQ-07 (reporting-ownership verification)
- **FE-03** — Optional CR-008 #4 Phase A example to MODULE_DECISIONS_FINAL.md Module 11
- Optional full rewrite of `SESSION_TRACKER.md` and `QA_HANDOVER_INDEX.md` (currently pointer-appended only)

All 5 are pure proposals; none blocks anything.

### 9.6 Cosmetic backlog — owner-decision

- **CR-004 / Visual** — missing-`room_info` warning badge vs `—` placeholder (cosmetic owner call)
- **CR-004 / Scope (orphan-SRM)** — orphan-SRM fallback grouping (rare data path; spec drift)

---

## 10. Recommended next track

### 10.1 Trigger conditions for each candidate next track

| Candidate next track | Trigger condition | Effort | Owner gate? |
|---|---|---|---|
| **A. Runtime QA Addendum sweep** (A0a + A0b + FO-B1-01) | Preprod (`https://preprod.mygenie.online/`) wakes | ~20 min combined | No |
| **B. Backend Contract Agent intake** for BE-F + BE-W2 + BE-1 (highest FE-dependent surface area) | Backend team coordination available | One intake session + backend delivery sequencing | Yes (priority + scheduling) |
| **C. UX-LOADING-02 owner option-pick** (Phase-3 CR filed in Batch 3A) | Owner reviews the 3 design options A/B/C | ~10 min for the call; implementation per option choice | Yes |
| **D. Owner prioritisation pass** for parked CR-002 / CR-009 / CR-010 / CR-011 / CR-012 / CR-013 | Sprint planning slot opens | Owner call + new CR cycle | Yes |
| **E. Optional baseline enrichments** (FE-01..FE-03) | Owner approval | ~15 min total doc edits | Yes |

### 10.2 Recommended sequencing

> **Recommended next track: A (Runtime QA Addendum sweep).**

Why:
- It's the only safe, zero-gate, zero-coordination work item that meaningfully advances acceptance state.
- It closes the only outstanding QA-status conditionality on the 12 sprint-accepted CRs (the runtime addenda).
- Single agent session, ~20 minutes, no backend dependency, no owner decision.
- Both A0a and A0b currently sit at `accepted_with_runtime_addendum_pending`; converting them to plain `accepted` (with their backend deps still deferred) cleans the acceptance ledger.

Trigger: any time preprod is awake. If preprod is currently dormant, this track is queued for the next preprod-awake window.

> **Parallel-eligible track: B (Backend Contract Agent intake).**

This is the highest-leverage move on long-term sprint progress (each BE landing unparks an entire FE phase), but requires backend team coordination and is therefore not strictly "next" without that handshake. If the backend team is already lined up, it can run in parallel with A.

> **Owner-gated next: C (UX-LOADING-02 option-pick).**

Small but unblocks a Phase-3 CR cleanly. Recommended for the next available owner check-in.

### 10.3 Explicit "do NOT start" list

Per scope hygiene at closure, these must NOT be treated as next tracks without explicit re-authorisation:

- ❌ Any new test-cleanup track (the 19/19 · 199/199 green state is the new floor; further test work needs a bug to chase, not preventive maintenance).
- ❌ Any backend-blocked FE work (B3, B2 Phase 2, CR-008 #4 Phase B, CR-011) — wait for the corresponding BE.
- ❌ Any owner-declined item re-open (A3, A4, B4) without owner re-approval.
- ❌ Any `/app/memory/final/*` edit (FE-01..FE-03 require explicit owner approval first).
- ❌ Any backend service start on this branch (frontend-only project; backend supervisor stays STOPPED).

---

## 11. Strict-rules compliance certification (this closure run)

| Rule | Status |
|---|---|
| Read-only closure document | ✅ |
| No source-code edits (frontend) | ✅ |
| No source-code edits (backend) | ✅ |
| No `/app/memory/final/*` edits | ✅ |
| No QA run | ✅ |
| No new test runs (final-status confirmation only — figures cited from production-fix cycle's verification step) | ✅ |
| No code pulled / branch switched | ✅ |
| No new CR opened in this run | ✅ |
| No item unparked | ✅ |
| Single new doc created (`HYGIENE_AND_TEST_CLEANUP_FINAL_CLOSURE_2026_05_04.md`) | ✅ |
| Stopped after document creation | ✅ |

---

**Closure stamped: 2026-05-04. Branch `5may` is at the cleanest state recorded since sprint-exit certification (Final Acceptance 2026-05-04). Suggested next move: Runtime QA Addendum sweep when preprod wakes.**

— End of Hygiene + NS-3C Test Cleanup Final Closure —
