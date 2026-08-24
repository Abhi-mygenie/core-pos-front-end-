# NS-3C T4 / RAW-FIELD-PROD-FALLBACK-FIX — Parked Summary

**Agent:** NS-3C Test Cleanup Implementation Agent — T4
**Date:** 2026-05-04
**Branch:** `5may`
**Decision:** **Option C — Park** (per owner explicit direction)
**Rationale:** Current cycle is test-infra/test-cleanup only. The underlying issue is a **production-side bug** that requires a separate production-fix cycle.

**Predecessors:**
- T1: `/app/memory/change_requests/implementation_summaries/NS_3C_T1_TEST_ONLY_FIXES_SUMMARY.md`
- T2: `/app/memory/change_requests/implementation_summaries/NS_3C_T2_JSX_FIXTURE_FIXES_SUMMARY.md`
- T3: `/app/memory/change_requests/implementation_summaries/NS_3C_T3_TEST_FIXTURE_AND_BARREL_FIXES_SUMMARY.md`
- Triage: `/app/memory/change_requests/impact_analysis/NS_3C_TEST_FAILURE_TRIAGE_PLAN.md`

## Status
- **NS-3C-4:** ⏸ **PARKED** — escalated to backlog item `RAW-FIELD-PROD-FALLBACK-FIX`
- **NS-3C overall track:** 9 of 10 rows resolved; 1 parked for production-fix cycle.

---

## 1. Why parked (not Option A and not Option B)

| Option | Decision | Reason |
|---|---|---|
| **Option A — Relax test (test-only)** | ❌ NOT applied | Would mask a real latent prod bug behind an allowlist. Owner direction: "Do not relax the test … unless needed to document the parked state." Leaving the test FAILING preserves CI visibility on the parked bug — that *is* the documentation of the parked state. |
| **Option B — Remove `._raw` access (4-line prod fix)** | ❌ NOT applied | Owner direction: "This current cycle is test-infra / test-cleanup only. No production source code changes are allowed in this cycle." Production fix deferred to a separate cycle. |
| **Option C — Park** | ✅ APPLIED | Tracker entries created; test left failing; backlog item escalated. Bug remains visible; fix path documented for next cycle. |

---

## 2. The latent bug being parked (full technical record)

### 2.1 Architectural invariant
`_raw` is the original API response object preserved on transformed objects **for development debugging only**. It is gated by 9 explicit guards in `reportTransform.js` (lines 192, 244, 278, 313, 374, 444, 636) and `reportService.js`:
```js
...(process.env.NODE_ENV === 'development' ? { _raw: api } : {}),
```

T-11 T1/T2 in `rawField.test.js` enforce this gating — both PASS. T-11 T3 enforces "no production UI file may read `._raw`" (because in prod builds it's undefined) — currently FAILING.

### 2.2 The 4 production violations

| File | Line | Code | What's read | Available transformed equivalent | Production behaviour today |
|---|---|---|---|---|---|
| `src/components/reports/RoomRowCard.jsx` | 194 | `ao?._raw?.order_in \|\| 'SRM'` | `_raw.order_in` | **`ao.orderIn`** | Always shows literal `'SRM'` |
| `src/components/reports/RoomRowCard.jsx` | 197 | `ao?._raw?.restaurant_order_id` (2nd fallback) | `_raw.restaurant_order_id` | **`ao.orderId`** (already used as primary L196) | 2nd fallback never reachable; minor |
| `src/components/reports/RoomRowCard.jsx` | 202 | `formatTime(ao?._raw?.created_at)` (fallback) | `_raw.created_at` | **`ao.createdAt`** | Lost time fallback for non-transferred orders |
| `src/pages/RoomOrdersReportPage.jsx` | 497 | `(seed._raw && seed._raw.table) \|\| '—'` | `_raw.table` | **`seed.roomNumber`** / `seed.tableId` | Lost table-name fallback when tableId lookup fails |

### 2.3 User-visible impact in production

- **Dev environment:** All 4 reads succeed → end user sees correct values (real `order_in`, real `created_at`, real table name). This is the experience developers and reviewers see.
- **Production environment:** All 4 reads return `undefined` → fallbacks trigger:
  - Order origin badge always shows `'SRM'` (Shifted-to-Room) regardless of actual origin.
  - Transferred-time UI loses its `created_at` fallback (only `transferredAt` shows; non-transferred orders display `'—'`).
  - Room/table name shows literal `'—'` when context lookup fails.

This is **a real silent degradation** that has been shipping since CR-004 Phase 2 landed. The CI failure of `rawField.test.js` T-11 T3 is now the canary that surfaces it.

### 2.4 Why this wasn't caught in CR-004 P2 review
- The P2 QA reports do not mention `_raw`.
- Reviewers and QA verified in development builds where `_raw` is present and rendering looks correct.
- No production smoke walk specifically tested the order-origin badge, transferred-time fallback, or room-name fallback — those are rare data paths.
- `rawField.test.js` was not runnable on the branch until **Batch 3C** wired testing-library; T-11 T3 was the architectural canary that finally surfaced the issue once `yarn test` could execute.

---

## 3. What was changed in this T4 cycle

### 3.1 Files MODIFIED (2 — trackers only)

| Path | Change | Net delta |
|---|---|---|
| `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` | §7 row 27 (NS-3C-4) updated to "**PARKED 2026-05-04 via T4 Option C**" with full technical detail, escalation to backlog ID `RAW-FIELD-PROD-FALLBACK-FIX`, affected files + line numbers, real-world impact, and pointer to this summary | +1 / -1 (single-row replacement) |
| `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md` | New row added: `RAW-FIELD-PROD-FALLBACK-FIX (NS-3C-4)` with full diagnosis, proposed 4-line fix path, severity (MEDIUM — visible UI degradation), and explicit DO-NOT-touch-in-test-cycle note | +1 row added |

### 3.2 Files NOT TOUCHED (per owner direction)

- ❌ `src/components/reports/RoomRowCard.jsx` — UNTOUCHED (Option B production fix deferred)
- ❌ `src/pages/RoomOrdersReportPage.jsx` — UNTOUCHED (Option B production fix deferred)
- ❌ `src/__tests__/api/transforms/rawField.test.js` — **UNTOUCHED** (Option A masking declined; test left FAILING to keep CI visibility on the parked bug)
- ❌ Any other production source — UNTOUCHED
- ❌ Backend — UNTOUCHED
- ❌ `/app/memory/final/*` — UNTOUCHED
- ❌ Zero deletions; zero file/test/import/export removals

### 3.3 Verification

| Check | Result |
|---|---|
| `git diff frontend/src/__tests__/api/transforms/rawField.test.js` | **empty** (test untouched) ✅ |
| `git diff frontend/src/components/reports/RoomRowCard.jsx` | **empty** (production untouched) ✅ |
| `git diff frontend/src/pages/RoomOrdersReportPage.jsx` | **empty** (production untouched) ✅ |
| `yarn test rawField.test.js` | T1 PASS, T2 PASS, T3 **FAIL** — visibility maintained ✅ |

---

## 4. Backlog entry — `RAW-FIELD-PROD-FALLBACK-FIX / NS-3C-4`

**Backlog ID:** `RAW-FIELD-PROD-FALLBACK-FIX`
**Cross-reference:** NS-3C-4
**Severity:** **MEDIUM** — silent UI degradation in production builds; visible to end users on rare data paths.
**Type:** Production-source fix (not test cleanup).
**Authorised cycle:** Separate production-fix cycle only — NOT to be touched during any test-infra/test-cleanup cycle.

### 4.1 Proposed fix (when production cycle opens)

Strict 1-for-1 substitution to already-exposed transformed fields. **Zero new logic, zero new API surface.** All target fields are already populated by `reportTransform.js`.

**`src/components/reports/RoomRowCard.jsx`:**

```diff
- const oin = ao?._raw?.order_in || 'SRM';
+ const oin = ao?.orderIn || 'SRM';

  const restId =
    ao.orderNumber ||
-   ao?._raw?.restaurant_order_id ||
+   ao?.orderId ||
    `#${ao.orderId || '—'}`;

  const time =
    formatTime(ao.transferredAt) !== '—'
      ? formatTime(ao.transferredAt)
-     : formatTime(ao?._raw?.created_at);
+     : formatTime(ao?.createdAt);
```

**`src/pages/RoomOrdersReportPage.jsx`:**

```diff
  roomNumber =
    tbl?.tableNumber ||
    tbl?.displayName ||
-   (seed._raw && seed._raw.table) ||
+   seed.roomNumber ||
    '—';
```

### 4.2 Validation expected when fix lands

- `yarn test src/__tests__/api/transforms/rawField.test.js` → **3/3 PASS** naturally (no test edit needed).
- Full suite: **19/19 suites PASS, 199/199 tests PASS**.
- Manual smoke check: open Room Orders Report in production build, verify (a) order-origin badges show real values for non-SRM orders, (b) transferred-time displays a sensible value for non-transferred orders, (c) room-name fallback shows the actual table name.

### 4.3 Risk
🟢 **Low** — pure rename to already-exposed fields. `ao.orderId` is already used as the primary in the same expression on the same line of the same file (proof of stability).

### 4.4 Effort
~10 minutes of code changes + ~15 minutes targeted-test + supervisor restart verification.

---

## 5. Why test was left failing (not skipped)

Owner direction: *"Keep `rawField.test.js` failing as a known policy/prod-fallback issue, OR mark it as known parked **if the project convention supports that without hiding the bug**."*

Project convention check:
- `describe.skip(...)` / `xtest(...)` / `test.skip(...)` would suppress the FAIL line in CI → **hides the bug**.
- A leading `// PARKED` comment on the failing test would not affect Jest output → bug stays visible.
- Adding an allowlist for the 2 violating files (Option A path) → test passes but **bug stays masked**.

**Decision:** Leave the test entirely untouched. The CI output `1 failed, 2 passed` for this suite is the canonical, self-documenting record of the parked production bug. Every CI run reminds the team that `RAW-FIELD-PROD-FALLBACK-FIX` is outstanding.

---

## 6. Final NS-3C track status

| ID | Status | Resolution |
|---|---|---|
| NS-3C-1 | ✅ Resolved | T2 — JSX mock-context fix |
| NS-3C-2 | ✅ Resolved | T2 — added `useRestaurant` mock |
| NS-3C-3 | ✅ Resolved | T1 — `/api/` rule broadened to include `/pos/` |
| **NS-3C-4** | ⏸ **PARKED — T4 Option C** | Escalated to `RAW-FIELD-PROD-FALLBACK-FIX` backlog row |
| NS-3C-5 | ✅ Resolved | T3 — barrel additions (owner-approved) |
| NS-3C-6 | ✅ Resolved | T3 — rewrite to BUG-107 v2 contract |
| NS-3C-7 | ✅ Resolved | T3 — rewrite to unified `toAPI.cancelItem` |
| NS-3C-8 | ✅ Resolved | T1 — transform-layer "no fallback" expectation update |
| NS-3C-9 | ✅ Resolved | T3 — fixture rewrite to current `toAPI.updateOrder` shape |
| NS-3C-10 | ✅ Resolved | T1 — `toEqual` → `toMatchObject` for expanded `roomInfo` |

**Cumulative project tally** (T1+T2+T3+T4 combined):
- **Suites:** 9 → **18 pass / 1 fail** (NS-3C-4 deliberately parked)
- **Tests:** 127 → **198 pass / 1 fail** (the parked T-11 T3)

---

## 7. Compliance certification

| Rule | Status |
|---|---|
| No production source edits | ✅ |
| No test file edits (rawField.test.js untouched) | ✅ |
| No file/test/import/export deletions | ✅ |
| No backend changes | ✅ |
| No `/app/memory/final/` changes | ✅ |
| No parked items unparked | ✅ |
| Did not apply Option A (relax test) — bug not hidden | ✅ |
| Did not apply Option B (production fix) — deferred per owner | ✅ |
| Tracker updates limited to Final Acceptance + Pending Register | ✅ |
| Test deliberately left FAILING for CI visibility | ✅ |
| Stopped after summary; no further task started | ✅ |

---

## 8. Recommended next step (NOT started, per scope rules)

When the owner is ready to authorise a production-fix cycle:

1. Open a new cycle scoped to "production-source fix only — `RAW-FIELD-PROD-FALLBACK-FIX`".
2. Apply Option B's 4-line substitution exactly as specified in §4.1 above.
3. Verify `yarn test rawField.test.js` → 3/3 PASS naturally.
4. Verify full suite → 19/19 suites PASS, 199/199 tests PASS.
5. Manual smoke walk on production build of Room Orders Report.
6. Update Final Acceptance §7 row 27 → "RESOLVED" + reference the production-fix cycle summary.
7. Update Pending Register row → `closed_resolved`.

**Estimated total effort: ~30 minutes including verification.**

— End of NS-3C T4 Parked Summary —
