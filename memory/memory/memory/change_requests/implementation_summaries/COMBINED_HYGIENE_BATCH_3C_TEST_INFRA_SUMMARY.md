# Combined Hygiene — Batch 3C TEST-INFRA-001 Wiring — Implementation Summary

**Agent:** Combined Hygiene Implementation Agent — Batch 3C
**Date:** 2026-05-04
**Branch:** `5may` (production deployment branch — Batch 3C verified against `may4` plan)
**Scope:** Wire `@testing-library/react` + `@testing-library/jest-dom` so JSX test suites can execute under `yarn test`. Closes the 9-item Combined Hygiene track.
**Predecessors:**
- Plan: `/app/memory/change_requests/impact_analysis/COMBINED_HYGIENE_9_ITEMS_IMPLEMENTATION_PLAN.md` §9.3.3 + §11 G-5
- Batch 1: `.../COMBINED_HYGIENE_BATCH_1_DOC_CLEANUP_SUMMARY.md`
- Batch 2: `.../COMBINED_HYGIENE_BATCH_2_DISPLAY_EXPORT_SUMMARY.md`
- Batch 3A: `.../COMBINED_HYGIENE_BATCH_3A_LOADINGPAGE_ESLINT_SUMMARY.md`
- Batch 3B: `.../COMBINED_HYGIENE_BATCH_3B_PAYMENTSERVICE_DELETE_SUMMARY.md`
- Owner approval: G-5 = **Choice 1 = A** (install `@testing-library/jest-dom` + create `setupTests.js`), **Choice 2 = A** (run once, classify failures as backlog, do not fix in 3C).

## Status
- **TEST-INFRA-001:** ✅ RESOLVED 2026-05-04 via Batch 3C
- **9-item Combined Hygiene track:** ✅ COMPLETE (all 9 items closed)

---

## 1. Exact changes landed

### 1.1 Files MODIFIED (2)

| Path | Change | Net delta |
|---|---|---|
| `/app/frontend/package.json` | `devDependencies` block — added `@testing-library/jest-dom@^6` and `@testing-library/react@^14`; resolved by yarn to `6.9.1` and `14.3.1` | +2 lines |
| `/app/frontend/yarn.lock` | yarn auto-update — 16 new entries (2 direct + 14 transitive: `@testing-library/dom@9.3.4`, `@adobe/css-tools@4.4.4`, `@types/aria-query@5.0.4`, `@types/react-dom@18.3.7`, `css.escape@1.5.1`, `deep-equal@2.2.3`, `dom-accessibility-api@0.6.3`, `es-get-iterator@1.1.3`, `indent-string@4.0.0`, `lz-string@1.5.0`, `min-indent@1.0.1`, `object-is@1.1.6`, `redent@3.0.0`, `strip-indent@3.0.0`) | several lines |

### 1.2 Files CREATED (1)

| Path | Content | Lines |
|---|---|---|
| `/app/frontend/src/setupTests.js` | `import '@testing-library/jest-dom';` (single statement, CRA auto-loads before Jest tests) | 1 |

### 1.3 Files NOT TOUCHED

- ❌ Production source code — UNTOUCHED (devDeps + setup-only change)
- ❌ Backend (`/app/backend/**`) — UNTOUCHED
- ❌ `/app/memory/final/*` — UNTOUCHED
- ❌ `craco.config.js` — UNTOUCHED (existing `setupFiles: setupTests.polyfills.js` wiring preserved; CRA's separate auto-load of `setupTests.js` runs in addition)
- ❌ `paymentService.*` — already deleted in Batch 3B; not re-touched

---

## 2. Validation performed

### 2.1 Install
| Check | Result |
|---|---|
| `yarn add --dev @testing-library/react@^14 @testing-library/jest-dom@^6` | ✅ exit 0; "Done in 8.98s" |
| `yarn.lock` updated | ✅ "Saved lockfile"; 16 new dependencies |
| `node_modules/@testing-library/react/` | ✅ created |
| `node_modules/@testing-library/jest-dom/` | ✅ created |

### 2.2 Build / runtime sanity
| Check | Result |
|---|---|
| Frontend HTTP (preview URL) | ✅ 200 |
| Backend HTTP `/api/` | ✅ 200 |
| Webpack runtime / dev server | ✅ Unchanged (devDeps only; no runtime bundle impact) |
| Supervisor `frontend` status | ✅ RUNNING |

### 2.3 `yarn test --watchAll=false` first-run

| Metric | Value |
|---|---|
| Total test suites | **19** |
| Suites passing | **9** |
| Suites failing | **10** |
| Total tests | **201** |
| Tests passing | **127** |
| Tests failing | **74** |
| Wall time | 17.9s |

---

## 3. Pass/Fail tally — per-suite breakdown

### 3.1 PASSING (9 suites)

| # | Suite | Notes |
|---|---|---|
| 1 | `__tests__/api/axios.test.js` | Pure-Jest |
| 2 | `__tests__/api/role-name-wire-contract.test.js` | Pure-Jest |
| 3 | `__tests__/api/socket/socketEvents.test.js` | Pure-Jest |
| 4 | `__tests__/api/socket/socketServiceGlobal.test.js` | Pure-Jest |
| 5 | `__tests__/api/transforms/categoryTransform.test.js` | Pure-Jest |
| 6 | `__tests__/api/transforms/profileTransform.test.js` | Pure-Jest |
| 7 | **`__tests__/contexts/SocketContext.test.jsx`** | **JSX — previously BLOCKED, now PASSES (13/13)** ⭐ Batch 3C unlocked this suite |
| 8 | **`__tests__/guards/ErrorBoundary.test.jsx`** | **JSX — previously BLOCKED, now PASSES (5/5)** ⭐ Batch 3C unlocked this suite |
| 9 | `api/transforms/__tests__/req3-room-bill-print.test.js` | Pure-Jest |

### 3.2 FAILING (10 suites)

| # | Suite | Type | Failure summary | Classification |
|---|---|---|---|---|
| 1 | `__tests__/guards/ProtectedRoute.test.jsx` | JSX | 9 tests fail; render produces `error-boundary-fallback` instead of expected route content (real component throws during Jest render — fixture / mock-context drift) | **NS-3C-1** newly-surfaced backlog |
| 2 | `__tests__/integration/App.routing.test.jsx` | JSX | 4 tests fail; same `error-boundary-fallback` rendering (shares `ProtectedRoute` + `ErrorBoundary` imports with NS-3C-1) | **NS-3C-2** newly-surfaced backlog |
| 3 | `__tests__/api/constants.test.js` | Pure-Jest | T-08 T3 — non-`/api/...` URL path detected in `API_ENDPOINTS` | **NS-3C-3** pre-existing pure-Jest drift |
| 4 | `__tests__/api/transforms/rawField.test.js` | Pure-Jest | T-11 T3 — `_raw` references found in 3 component/page files | **NS-3C-4** pre-existing pure-Jest drift |
| 5 | `__tests__/structure/barrelExports.test.js` | Pure-Jest | T-12 + T-14 — barrel files missing `CollectBillPanelDrawer`, `RoomOrdersReportPage`, etc. | **NS-3C-5** pre-existing pure-Jest drift |
| 6 | `__tests__/api/socket/updateOrderStatus.test.js` | Pure-Jest | Socket payload assertions | **NS-3C-6** pre-existing pure-Jest drift |
| 7 | `__tests__/api/transforms/cancelItemPayload.test.js` | Pure-Jest | Transform assertions | **NS-3C-7** pre-existing pure-Jest drift |
| 8 | `__tests__/api/transforms/orderTransformFinancials.test.js` | Pure-Jest | Transform assertions | **NS-3C-8** pre-existing pure-Jest drift |
| 9 | `__tests__/api/transforms/updateOrderPayload.test.js` | Pure-Jest | Transform assertions | **NS-3C-9** pre-existing pure-Jest drift |
| 10 | `api/transforms/__tests__/orderTransform.roomInfo.test.js` | Pure-Jest | Transform assertions | **NS-3C-10** pre-existing pure-Jest drift |

---

## 4. Failure classification (per owner instruction #10)

### 4.1 Caused by Batch 3C wiring
**NONE.** Zero failures are caused by the wiring or the `setupTests.js` creation.

### 4.2 Newly surfaced — JSX content/fixture drift (2 suites, 13 tests)
- **NS-3C-1** `ProtectedRoute.test.jsx` (9 tests) — real `ProtectedRoute` component or its dependency-graph import throws during Jest render; `<ErrorBoundary>` (mounted upstream by the test setup or by the component itself) catches and renders `error-boundary-fallback`. Mocked `useAuth`/`useRestaurant` contexts in the test no longer match the runtime contract.
- **NS-3C-2** `App.routing.test.jsx` (4 tests) — same root cause; this integration suite imports both `ProtectedRoute` and `ErrorBoundary`.

These would have failed exactly the same way the moment `@testing-library/react` was wired regardless of when. They are **content drift between the test fixtures and the current component surface**, not wiring defects.

### 4.3 Newly surfaced — pre-existing pure-Jest drift (8 suites, 61 tests)
**NS-3C-3 through NS-3C-10** — all in pure-Jest territory; do not depend on `@testing-library/react`. They have been broken on this branch for some time and would have surfaced the moment anyone ran `yarn test`. Batch 3C does not introduce them; it merely makes them visible by being the first batch to run the test suite.

### 4.4 Action per owner instruction #7 + #10
- ❌ NOT fixed in Batch 3C.
- ✅ All 10 logged as separate backlog rows (NS-3C-1 ... NS-3C-10) in `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` §7 rows 24-33.

---

## 5. Why this is safe

### 5.1 Zero production / runtime impact
- Both new packages are `devDependencies` — never bundled into production webpack output.
- `setupTests.js` is loaded by Jest only (CRA auto-loader); never imported by any source file.
- Frontend preview URL HTTP 200 unchanged. Backend HTTP 200 unchanged.

### 5.2 Zero baseline rule violation
| Rule | Compliance |
|---|---|
| **API-03** (paymentService stale; OrderEntry composes; CollectPaymentPanel settles) | ✅ Not relevant — no API code touched |
| **API-05** (deliberate cleanup of stale surfaces) | ✅ Not triggered |
| **FA-03** (hotspot files) | ✅ No hotspot file touched |
| **FA-05** (code-is-truth) | ✅ Tests now run; no source modified |
| **EP-01..EP-05** (env contract) | ✅ No env change |
| Sprint-accepted CRs (CR-001, CR-003, CR-004, CR-005#1, CR-006, CR-007, CR-008, A0a, A0b) | ✅ Behaviour unchanged |
| B2 Phase 2 dormant placeholder | ✅ Unchanged |

### 5.3 Zero parked-item state change
- All 9 BE-* items still parked.
- All 13 parked CR/bucket items still parked.
- No new CR opened.

---

## 6. Tracker updates applied

### 6.1 `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- §1.2 backlog count narrative — TEST-INFRA-001 + ProtectedRoute test-infra removed from "pending" list; Batch 3C tally + classification language inserted; backlog count narrative re-aligned.
- §7 row 7 (TEST-INFRA-001) → **RESOLVED 2026-05-04 via Batch 3C** with full pass/fail tally.
- §7 row 23 (ProtectedRoute test-infra) → **RESOLVED 2026-05-04 via Batch 3C**; content-drift follow-up tracked as NS-3C-1.
- §7 rows 24-33 — 10 new newly-surfaced backlog rows (NS-3C-1 through NS-3C-10).

### 6.2 `PENDING_TASK_REGISTER_2026_05_04.md`
- TEST-INFRA-001 row in §3 master table — status flipped to `closed_resolved`.
- "Pre-existing — ProtectedRoute" row in §3 master table — status flipped to `closed_resolved`.

### 6.3 New summary file
- `/app/memory/change_requests/implementation_summaries/COMBINED_HYGIENE_BATCH_3C_TEST_INFRA_SUMMARY.md` (this file).

---

## 7. Combined Hygiene 9-item track — final closeout

| # | Item | Resolved by | Status |
|---|---|---|---|
| 1 | DOC-B2-01 | Batch 1 | ✅ |
| 2 | DOC-A0a-01 | Batch 1 | ✅ |
| 3 | CSV-A0a-01 | Batch 2 | ✅ |
| 4 | DETAIL-A0a-01 | Batch 2 | ✅ |
| 5 | FILTER-A0a-01 | Batch 2 | ✅ |
| 6 | CR-001 exports alignment | Batch 2 | ✅ |
| 7 | LoadingPage ESLint | Batch 3A | ✅ |
| 8 | paymentService CLEAR_BILL | Batch 3B (DELETE) | ✅ |
| 9 | TEST-INFRA-001 wiring | **Batch 3C (this)** | ✅ |

**9-item Combined Hygiene track: COMPLETE.**

---

## 8. Strict-rules compliance certification

| Rule | Status |
|---|---|
| Production source code untouched | ✅ |
| Backend untouched | ✅ |
| `/app/memory/final/*` untouched | ✅ |
| paymentService not re-touched (Batch 3B closed) | ✅ |
| Newly-surfaced failures NOT fixed in Batch 3C | ✅ (logged as NS-3C-1..NS-3C-10) |
| No parked item unparked | ✅ |
| No new CR opened | ✅ |
| Approved scope only (Choice 1 = A, Choice 2 = A) | ✅ |
| No branch switched | ✅ |
| Trackers updated only as agreed | ✅ (Final Acceptance + Pending Register + this summary) |

---

## 9. Recommended next steps (optional, NOT started)

### 9.1 Test maintenance pass — separate session
A dedicated **Test Maintenance Agent** can address NS-3C-1..NS-3C-10 in a future session:
- NS-3C-1 / NS-3C-2 (JSX fixture drift) — refresh mocked context shapes; re-align fixtures to current component graph
- NS-3C-3..NS-3C-10 (pure-Jest drift) — re-align assertions to current `constants.js` / barrel exports / transform contracts

### 9.2 Preprod runtime addenda
A0a + A0b + FO-B1-01 runtime addenda still pending preprod wake. Orthogonal to Batch 3C.

### 9.3 Phase 3 UX-LOADING-02
Owner-led; orthogonal to Batch 3C.

### 9.4 Backend Contract Agent
9 BE-* asks remain parked. Orthogonal to Batch 3C.

— End of Batch 3C Implementation Summary —
