# Combined Hygiene — Batch 3B paymentService CLEAR_BILL DELETE — Implementation Summary

**Agent:** Combined Hygiene Implementation Agent — Batch 3B
**Date:** 2026-05-04
**Branch:** `may4`
**Scope:** Dead-code DELETE of stale `paymentService.js` + its zombie contract test + 1 stale-pointer comment refresh in `paymentMutationService.js`. Live Collect Bill flow UNTOUCHED.
**Predecessors:**
- Plan: `/app/memory/change_requests/impact_analysis/COMBINED_HYGIENE_9_ITEMS_IMPLEMENTATION_PLAN.md` §12.1.a
- Batch 1: `.../COMBINED_HYGIENE_BATCH_1_DOC_CLEANUP_SUMMARY.md`
- Batch 2: `.../COMBINED_HYGIENE_BATCH_2_DISPLAY_EXPORT_SUMMARY.md`
- Batch 3A: `.../COMBINED_HYGIENE_BATCH_3A_LOADINGPAGE_ESLINT_SUMMARY.md`
- Owner approval: G-4 = **DELETE**, G-5 = deferred (Batch 3C not started).

## Status
- **paymentService CLEAR_BILL:** ✅ RESOLVED 2026-05-04 via DELETE
- **Batch 3C (TEST-INFRA-001):** unblocked but NOT started this session

---

## 1. Exact changes landed

### 1.1 Files DELETED (2)

| Path | Size before | Reason |
|---|---|---|
| `/app/frontend/src/api/services/paymentService.js` | 16 lines, 485 bytes | Exported `collectPayment()` that posted to `API_ENDPOINTS.CLEAR_BILL` — a constant that does not exist in `constants.js`. Any caller would crash. Zero runtime callers (grep-verified). Rule API-03 explicitly names this file "stale from a code perspective; must not be treated as canonical for new work." |
| `/app/frontend/src/__tests__/api/paymentService.test.js` | 29 lines | T-09 contract test suite with 3 tests. T2 asserts `API_ENDPOINTS.CLEAR_BILL` exists — would **fail** the moment Jest runs (constant is absent). T3 asserts `paymentService.js` references `CLEAR_BILL`. Both tests validated the dead path; both become obsolete the instant the dead file is removed. |

### 1.2 File EDITED (1)

`/app/frontend/src/api/services/paymentMutationService.js` L10-17 — 3-line comment refresh only, no functional code change.

**Before (L10-16):**
```js
//   - The shared axios client already attaches the Bearer token via the auth
//     interceptor — do NOT re-add Authorization headers here.
//   - This file is intentionally separate from the legacy paymentService.js
//     (which references a stale CLEAR_BILL constant). Keep these wrappers
//     side-effect free; UI orchestration (toasts, optimistic updates, refresh)
//     belongs to the page layer.
```

**After (L10-17):**
```js
//   - The shared axios client already attaches the Bearer token via the auth
//     interceptor — do NOT re-add Authorization headers here.
//   - This file is the canonical home for CR-003 financial mutation wrappers.
//     The legacy `paymentService.js` (stale `CLEAR_BILL` path) was deleted
//     2026-05-04 as part of Batch 3B hygiene. Keep these wrappers side-effect
//     free; UI orchestration (toasts, optimistic updates, refresh) belongs to
//     the page layer.
```

Net diff: −2 code files (45 lines removed) · +1 line in the comment refresh. Zero functional-code delta.

---

## 2. Why this is safe

### 2.1 Zero runtime consumer audit
| Query | Hits before | Hits after |
|---|---|---|
| `from.*paymentService\b \| require.*paymentService\b \| import.*paymentService\b` | 0 (one doc-comment hit only) | 0 |
| `\bcollectPayment\b` (full tree) | 3 (all inside the dead file or its test) | 0 |
| `CLEAR_BILL` (full tree) | 6 (5 inside dead file + test; 1 comment in `paymentMutationService.js`) | 1 (historical changelog comment in `paymentMutationService.js:13`, intentional per proposal) |

### 2.2 Real Collect Bill path preserved
The live Collect Bill flow remains intact across all 4 surfaces, none of which ever referenced `paymentService.js`:

| Consumer | Line | Status |
|---|---|---|
| `OrderEntry.jsx:1463` — `api.post(API_ENDPOINTS.BILL_PAYMENT, payload)` | Direct call with CR-008 Sub-CR #1 D1-Cap payload (delivery-charge fold) | ✅ UNTOUCHED |
| `CollectBillPanelDrawer.jsx:183` — `api.post(API_ENDPOINTS.BILL_PAYMENT, payload)` | Audit-report drawer | ✅ UNTOUCHED |
| `AllOrdersReportPage.jsx` — imports `changeOrderPaymentMethod`, `makeOrderUnpaid` from `paymentMutationService` | CR-003 row-action mutations | ✅ UNTOUCHED |
| `RoomOrdersReportPage.jsx:38` — imports `makeOrderUnpaid` from `paymentMutationService` | Room orders row-actions | ✅ UNTOUCHED |

### 2.3 Constants untouched
`/app/frontend/src/api/constants.js` NOT edited. `BILL_PAYMENT` at L44 preserved verbatim. No new `CLEAR_BILL` alias added.

---

## 3. Validation performed

| Check | Result |
|---|---|
| `ls paymentService.js` | ✅ File not found (confirms deletion) |
| `ls paymentService.test.js` | ✅ File not found (confirms deletion) |
| Grep `from/require/import paymentService` | ✅ 0 hits |
| Grep `\bcollectPayment\b` | ✅ 0 hits |
| Grep `CLEAR_BILL` | ✅ 1 hit — historical comment in `paymentMutationService.js:13` (intentional) |
| `mcp_lint_javascript paymentMutationService.js` | ✅ 0 issues |
| Supervisor `frontend` status | ✅ RUNNING (pid 718, uptime 1h 30m) |
| Webpack build status | ✅ `Compiled successfully!` (0 warnings; reconfirms Batch 3A ESLint cleanup is still in effect) |
| Preview URL HTTP | ✅ 200 |
| Hot-reload post-delete | ✅ No module-not-found error; no missing-import error; no runtime error |

---

## 4. What was NOT touched

### 4.1 Files explicitly preserved per owner instruction
- ❌ `/app/frontend/src/api/constants.js` — no `CLEAR_BILL` added; `BILL_PAYMENT` untouched
- ❌ `/app/frontend/src/components/order-entry/OrderEntry.jsx` — live Collect Bill path at L1463 + CR-008 D1-Cap delivery-charge fold untouched
- ❌ `/app/frontend/src/components/reports/CollectBillPanelDrawer.jsx` — drawer Collect Bill at L183 untouched
- ❌ `/app/frontend/src/pages/AllOrdersReportPage.jsx` — `paymentMutationService` CR-003 consumers untouched
- ❌ `/app/frontend/src/pages/RoomOrdersReportPage.jsx` — `paymentMutationService` CR-003 consumers untouched
- ❌ `/app/backend/**` — no backend change
- ❌ `/app/memory/final/*` — UNTOUCHED

### 4.2 `paymentMutationService.js` functional code preserved
- `normalizePaymentMethod` helper — untouched
- `normalizeOrderId` helper — untouched
- `ALLOWED_PAYMENT_METHODS` frozen array — untouched
- `changeOrderPaymentMethod` wrapper — untouched (CR-003 Endpoint A)
- `makeOrderUnpaid` wrapper — untouched (CR-003 Endpoint B)

### 4.3 Out-of-scope items preserved
- ❌ Batch 3C (TEST-INFRA-001 wiring) — NOT started; remains `backlog_follow_up` pending G-5 decision
- ❌ Phase 3 UX-LOADING-02 CR — NOT started
- ❌ Batch 3A ESLint disable at `LoadingPage.jsx:111` — preserved
- ❌ All Batch 1 / Batch 2 resolutions — preserved
- ❌ All 9 parked backend asks (BE-1..BE-F) — unchanged
- ❌ All 13 parked CR/bucket items — unchanged
- ❌ All 3 runtime addenda (A0a, A0b, FO-B1-01) — unchanged
- ❌ `OrderEntry.jsx.bak.d1cap` backup file — left as historical artefact

---

## 5. Baseline rule compliance

| Rule | Status |
|---|---|
| **API-03** — `paymentService.collectPayment()` stale; OrderEntry composes, CollectPaymentPanel settles | ✅ **Fulfilled by deletion** — stale entry point removed; canonical paths preserved |
| **API-05** — keep stale surfaces documented until deliberately cleaned | ✅ **This IS the deliberate cleanup**; owner G-4 approval obtained |
| **FA-03** — hotspot files caution | ✅ No hotspot file touched; only the dead file and its own test |
| **CR-003** accepted behaviour (Change Method / Mark Unpaid wrappers) | ✅ Preserved (file structure of `paymentMutationService.js` unchanged) |
| **CR-008 Sub-CR #1 D1-Cap** (delivery-charge fold) | ✅ Preserved (`OrderEntry.jsx:1463` untouched) |
| **CR-008 #4 Phase A** (stay-on-order-entry after Collect Bill) | ✅ Preserved |
| **B2 Phase 2 dormant placeholder** | ✅ Preserved |

---

## 6. Tracker updates applied

### 6.1 Final Acceptance §1.2 backlog count
- Decremented 12 → 11.
- "pre-existing **paymentService** / ProtectedRoute test-infra" in the backlog-list narrative → now reads "pre-existing **ProtectedRoute** test-infra" (paymentService removed).
- Batch 3B resolution cite appended.

### 6.2 Final Acceptance §7 row 22 (paymentService CLEAR_BILL)
- Status flipped to **RESOLVED 2026-05-04 via DELETE**.
- Next-owner column: `Closed — Batch 3B hygiene`.
- Full detail block added: what was deleted, what was preserved (BILL_PAYMENT live path enumeration), API-03/API-05 fulfillment note, Batch 3C unblocker note, summary-doc pointer.

### 6.3 New summary file
- `/app/memory/change_requests/implementation_summaries/COMBINED_HYGIENE_BATCH_3B_PAYMENTSERVICE_DELETE_SUMMARY.md` (this file).

---

## 7. Remaining hygiene items

| Batch | Item | Status | Next trigger |
|---|---|---|---|
| Batch 3C | TEST-INFRA-001 wiring | `backlog_follow_up` | **G-5 owner decision** — now UNBLOCKED (T-09 test file no longer exists, so `yarn test` would no longer surface the `CLEAR_BILL` failure). Sequencing gate removed; safe to wire whenever owner authorises. |

---

## 8. Strict-rules compliance certification

| Rule | Status |
|---|---|
| No live Collect Bill flow touched | ✅ |
| `paymentMutationService.js` functional code untouched | ✅ (only a 3-line comment block refreshed) |
| `BILL_PAYMENT` untouched | ✅ |
| No `CLEAR_BILL` added anywhere | ✅ |
| No repair or alias of stale path | ✅ |
| TEST-INFRA-001 not touched | ✅ |
| No `/app/memory/final/*` edit | ✅ |
| No backend edit | ✅ |
| No parked item unparked | ✅ |
| No new CR opened | ✅ |
| No QA run (minimal static + lint + build only) | ✅ |
| No branch switched | ✅ |

---

## 9. Recommended next step

### 9.1 Batch 3C (TEST-INFRA-001) is now clean to start
With `paymentService.test.js` gone, wiring `@testing-library/react` + `@testing-library/jest-dom` no longer surfaces the T-09 failure. The sequencing gate (G-5 Option A vs B) is effectively moot — Option A is automatically satisfied.

When owner approves G-5:
- `yarn add --dev @testing-library/react @testing-library/jest-dom @testing-library/user-event`
- Run `yarn test --watchAll=false` — expect `ProtectedRoute.test.jsx` + `ErrorBoundary.test.jsx` to execute.
- Create Batch 3C summary → final hygiene 9-item closeout.

### 9.2 Alternative — Phase 3 UX-LOADING-02
If owner wants to pick A/B/C options on the UX improvement first, that's fully orthogonal.

### 9.3 Alternative — preprod runtime addenda
Still pending preprod wake; orthogonal to Batch 3C.

— End of Batch 3B Implementation Summary —
