# Per-Bucket Implementation Handover — Bucket A0a (UI-COD-MASK)

**Bucket:** A0a — UI-COD-MASK (May-2026)
**Implemented by:** Implementation Agent
**Date:** 2026-05-02
**Status:** ✅ Implemented, lint + webpack-compile + smoke-test passed. Live preprod manual QA pending (no creds in pod).

---

## 1. Source planning handover

- **Main planning handover:** `/app/memory/change_requests/implementation_handover/CR_005_to_009_IMPLEMENTATION_HANDOVER.md` §10.A0a
- **Source contract (verbatim diff):** `/app/memory/UI_COD_MASK_HANDOVER.md` §5.2
- **Repo / branch:** upstream `https://github.com/Abhi-mygenie/core-pos-front-end-.git` @ `1-may` (local pod working tree)

## 2. Bucket implemented

Render `—` instead of literal `cash_on_delivery` in OrderTable's Payment column on every tab. Display-only change. No state, classification, filter, payload, or row-action behaviour modified.

## 3. User approvals received

| # | Ask | Decision |
|---|---|---|
| 1 | Approval Gate (§10.A0a) | ✅ Approved verbatim. User asked to skip the verbose gate format going forward. |
| 2 | Test-file approach (T-A / T-B / T-C) | User delegated to implementation agent. Agent recommended **T-A** (skip test file, defer test infra). User approved final review including this deviation. |

## 4. Open questions answered

§12 of main handover lists **no open questions** for A0a. None pending.

## 5. Files changed

| File | Lines | Net Δ | Notes |
|---|---|---|---|
| `frontend/src/components/reports/OrderTable.jsx` | 467–492 | +11 / −3 (net +8) | Single `case 'paymentMethod':` branch in `renderCell`. Verbatim per source-doc §5.2. |

**No other files touched.** `git status --short` confirms (excluding the untracked `frontend/yarn.lock` left over from the deployment task).

## 6. Before / after behaviour

| Surface | Before | After |
|---|---|---|
| `/reports/audit` Payment column on **All Orders** tab | `cash_on_delivery` already masked as `—` (whitelist of `cash`/`card`/`upi`). | Unchanged — still `—`. |
| `/reports/audit` Payment column on **Audit / Paid / Cancelled / Hold / Unpaid / Merged / Aggregator / Transferred / Credit** tabs | Renders raw enum string `cash_on_delivery` inside a pill badge. | Renders `—` (zinc-400 text span, no pill). |
| Other payment methods (`cash`, `card`, `upi`, `pending`, `transferToRoom`, etc.) | Pill badge with raw value. | Unchanged — pill badge with raw value. |
| Row-action eligibility (`OrderTable.jsx:231, 289`) — Mark-as-Unpaid / Change-Payment-Method pills | Reads raw `order.paymentMethod`. | Unchanged — still reads raw `order.paymentMethod`. Eligible `cash_on_delivery` rows still show pills. |
| Row click → OrderDetailSheet | Opens. `formatPaymentMethod` already maps `cash_on_delivery → "CASH"`. | Unchanged. |
| Filters (`filters.paymentMethod` against `order.paymentMethod`) | Operate on raw value. | Unchanged. |
| Outbound payloads / mutations / CSV export | Use raw `order.paymentMethod`. | Unchanged. |

## 7. API / socket / state assumptions (§7 of `IMPLEMENTATION_AGENT_RULES.md`)

- **APIs:** none touched.
- **Sockets:** none touched.
- **State:** `order.paymentMethod` retained verbatim throughout the row pipeline. Only the cell renderer's return value differs for the cash-on-delivery short-circuit.
- **localStorage:** none touched.
- **Print / payment / room:** none touched. Print/CSV exports still contain the raw `cash_on_delivery` string per §8.3 of source doc (explicitly out of scope).

## 8. Validation performed

| Check | Result |
|---|---|
| ESLint on `OrderTable.jsx` | ✅ 0 issues |
| Webpack hot-reload compile (`tail /var/log/supervisor/frontend.out.log`) | ✅ `webpack compiled with 1 warning` — only the pre-existing `LoadingPage.jsx:111` exhaustive-deps warning, unchanged |
| Smoke screenshot of `https://insights-phase.preview.emergentagent.com` | ✅ Page loads, no compile-error overlay, Mygenie login screen renders |
| `git status` scope-leak check | ✅ Only `OrderTable.jsx` modified |
| `git diff` vs `UI_COD_MASK_HANDOVER.md` §5.2 | ✅ Verbatim match (block braces, comment, 4-line short-circuit, hoist `pm` → `pmLower`) |
| Cross-bucket regression checklist items runnable without backend creds (main handover §11) | ✅ Webpack compile clean; no new console errors on login screen; no unrelated files modified |

## 9. Validation NOT performed (and why)

| Check | Reason |
|---|---|
| Live preprod manual QA per `UI_COD_MASK_HANDOVER.md` §11.2 — log in as `owner@18march.com`, `/reports/audit` across every tab | Pod has no test credentials; real backend is external `preprod.mygenie.online`. **QA owner must run.** |
| `yarn test --testPathPattern=OrderTable-paymentCol` per source doc §11.1 + main handover §10.A0a Testing Checklist | Test file `__tests__/components/reports/OrderTable-paymentCol.test.jsx` was **not created** in this bucket. See §10 deviations. |
| Full Jest suite green (cross-bucket regression checklist) | Pre-existing failures in `src/__tests__/api/constants.test.js` and module-resolution failure for `@testing-library/react` in `src/__tests__/contexts/SocketContext.test.jsx`. Both unrelated to A0a. |

## 10. Deviations from source contract

### D-A0a-1 — Test file deferred (T-A path)

**Source doc §6.1 / main handover §10.A0a File-Level Plan** require a new test `frontend/src/__tests__/components/reports/OrderTable-paymentCol.test.jsx`.

**Status:** Not created in this bucket.

**Reason:** Pre-existing condition on branch `1-may`:
- `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` are NOT in `package.json` and NOT installed in `node_modules`.
- Existing test files (`src/__tests__/contexts/SocketContext.test.jsx`, etc.) already `import { render, act } from '@testing-library/react'` and would fail to resolve today.
- `react-test-renderer` is also not installed.
- Source doc §6.2 explicitly anticipates this and says: *"If `@testing-library/react` isn't already wired, fall back to … snapshot test … Avoid depending on `jest-dom` extensions that aren't in `package.json`."*

Adding `@testing-library/react` + `@testing-library/jest-dom` as devDeps would silently expand the scope of a "very-low-risk display-only fix" into a `package.json` / `yarn.lock` change. Per "no scope leakage" rule the agent skipped the test artefact and recorded the gap here.

**Recommended follow-up ticket** (NOT done in this bucket):

> **TEST-INFRA-001 — Restore frontend test harness**
> 1. `cd /app/frontend && yarn add --dev @testing-library/react@^14 @testing-library/jest-dom@^6 @testing-library/user-event@^14`
> 2. Add `import '@testing-library/jest-dom';` to `src/setupTests.js` (create if missing — CRA auto-loads it).
> 3. Fix the pre-existing failing assertion in `src/__tests__/api/constants.test.js:34` (path-validation case `isValidPath || isTBD` returning false).
> 4. Land the §6.1 test cases verbatim into `src/__tests__/components/reports/OrderTable-paymentCol.test.jsx`.
> 5. Verify: `cd /app/frontend && CI=true yarn test --watchAll=false` is green.

This follow-up is also a prerequisite for landing the test-file portions of buckets A0b, A1, A2, A3, A4, B1, B2, B3, B4 cleanly.

## 11. Regression checklist result (main handover §11)

| Item | Status |
|---|---|
| `/reports/audit` loads on welcomeresort + 18march; all 4 tabs populate | ⏳ QA owner — needs login |
| Filter date / search / PG checkbox / channel / platform behave unchanged | ✅ Code-path unchanged (no filter or transform touched) |
| CSV export for each tab opens cleanly | ✅ ExportButtons.jsx untouched |
| OrderDetailSheet drill-down opens for any row | ✅ Click handler untouched |
| Dashboard live socket update after place-order / cancel / transfer / merge | ✅ Sockets untouched |
| OrderEntry → CollectPaymentPanel → bill print round-trip | ✅ Print path untouched |
| Re-Print KOT button on placed orders | ✅ Untouched |
| Browser console: only documented `[BE-1 *]` / `[BE-2 *]` / `[BILL-PRINT]` informational lines; no new errors | ✅ Smoke screenshot console clean on login screen |
| `cd /app/frontend && CI=true yarn test --watchAll=false` — full suite green | ❌ Cannot run cleanly today (pre-existing test-infra gap, see §10) |
| `tail -50 /var/log/supervisor/frontend.out.log` — `webpack compiled successfully` | ✅ Compile clean, only pre-existing LoadingPage warning |

## 12. Known limitations / out of scope

Per `UI_COD_MASK_HANDOVER.md` §8 — explicitly deferred follow-ups (NOT touched in A0a):

1. Filter-dropdown cosmetic — `api/transforms/reportTransform.js:711-712` may surface `cash_on_delivery` as a filter-set value if the dropdown is rendered. Recommend a sibling ticket to either drop `cash_on_delivery` from the filter set or map it to `cash`.
2. `OrderDetailSheet.formatPaymentMethod` currently maps `cash_on_delivery → "CASH"`. Product may want this to also be blank for table parity. Decision deferred.
3. CSV exports / print receipts that include `paymentMethod` will still contain the raw `cash_on_delivery` string. Symmetric masking on exports requires a separate ticket if product wants it.

## 13. Backend pending items

**None for A0a.** Larger backend asks (BE-2..BE-14, BE-A..BE-F) listed in main handover §9 are unchanged.

## 14. QA instructions

### Pre-conditions
- Live URL: `https://insights-phase.preview.emergentagent.com`
- Account: `owner@18march.com` / `Qplazm@10`
- Test data hint: today's `cash_on_delivery` rows are on the **Running** tab (e.g., row 002290 ₹47). Earlier dates had cancelled / paid `cash_on_delivery` rows (e.g., the operator screenshot dates with ₹30 / ₹120).

### Steps
1. Log in. Navigate to `/reports/audit`.
2. For each tab — All Orders / Audit / Paid / Cancelled / Hold / Unpaid / Merged / Aggregator / Transferred / Credit / Running — pick a date range with `cash_on_delivery` rows present.
3. **Verify** — Payment column for those rows shows `—` (zinc-400 text), no pill badge.
4. **Verify** — rows with `cash`, `card`, `upi`, `pending`, `transferToRoom` etc. still show their raw value inside a pill badge as before.
5. **Verify (negative)** — click a `cash_on_delivery` row → OrderDetailSheet opens; the detail sheet still says "Paid via CASH" as today.
6. **Verify (negative)** — on the Paid tab, a `cash_on_delivery` row does NOT show the Mark-as-Unpaid / Change-Payment-Method pills. This is **pre-existing eligibility behaviour** preserved by A0a: `PAID_ACTIONS_ALLOWED_METHODS = ['cash', 'card', 'upi']` at `OrderTable.jsx:241` excludes `cash_on_delivery`, and the row-action eligibility predicate reads the raw `order.paymentMethod` (not the masked `—` rendering). A0a introduces no change to the eligibility list. See §16 (DOC-A0a-01 drift resolution).
7. **Verify (regression)** — pagination, sort, search, date-range, channel filter, PG filter all behave as before.

### Rollback
Single git revert on this commit. No data migration. No dependent consumers.

## 15. Next recommended bucket

Per main handover §13 sequencing: **Bucket A0b — ROLE-NAME-WIRE-FIX**.

- Source contract: `/app/memory/ROLE_NAME_WIRE_FIX_HANDOVER.md` (14 edits across 5 files).
- Pre-filled Approval Gate: main handover §10.A0b.
- Risk: Low. Touches `DashboardPage.jsx`, `OrderEntry.jsx`, `LoadingPage.jsx`, `useRefreshAllData.js`, `orderService.js`. **DashboardPage and OrderEntry are hotspots** — extra caution per `IMPLEMENTATION_AGENT_RULES.md` §"Additional guardrails".
- Same test-infra deviation will recur on A0b's test file. Recommend either landing TEST-INFRA-001 first, or accepting the same T-A path on A0b.

**I will NOT start A0b unless you explicitly approve it.**

---

## 16. DOC-A0a-01 drift resolution (added 2026-05-04)

**Finding:** §14 step 6 earlier stated that an unpaid `cash_on_delivery` row on the Paid tab "still has the Mark-as-Unpaid / Change-Payment-Method pills visible (eligibility checks the raw enum, not the rendered cell)." That wording incorrectly implied pills WOULD appear for `cash_on_delivery`. In the shipped code at `OrderTable.jsx:241`, `PAID_ACTIONS_ALLOWED_METHODS = ['cash', 'card', 'upi']` **excludes** `cash_on_delivery` — so those pills do NOT appear on `cash_on_delivery` rows. Source: `A0a_UI_COD_MASK_QA_REPORT.md` §12 item 1.

**Accepted resolution (documentation-only; NO code change this run):**
1. §14 step 6 wording corrected in this revision — pills do NOT appear for `cash_on_delivery` on the Paid tab. This is pre-existing eligibility behaviour that A0a preserves.
2. Eligibility predicate at `OrderTable.jsx:241` continues to read **raw** `order.paymentMethod` — NOT the masked `—` span rendered by the A0a display short-circuit at `OrderTable.jsx:486-510`. Display masking and eligibility logic are cleanly separated; the A0a change is purely cosmetic and does NOT leak into row-action gates.
3. A0a's accepted scope (single-branch display short-circuit in the audit-table `paymentMethod` cell) remains unchanged. The raw `cash_on_delivery` enum continues to flow through transforms, payloads, CSV export, PDF print, OrderDetailSheet drill-down, and filter-dropdown set **exactly as before A0a** — unless explicitly changed by the sibling A0a tickets (CSV-A0a-01, DETAIL-A0a-01, FILTER-A0a-01), which are **NOT part of Batch 1** and remain pending.
4. No payment semantics changed. No CR-003 row-action behaviour changed. No CR-001 / CR-004 / CR-005 / CR-006 / CR-007 / CR-008 accepted behaviour perturbed.

**Sibling-ticket pending-state reminder (NOT resolved by this run):**
- **CSV-A0a-01** — CSV export at `ExportButtons.jsx:193` still emits raw `cash_on_delivery`. Pending (Batch 2).
- **DETAIL-A0a-01** — `OrderDetailSheet.formatPaymentMethod` still maps `cash_on_delivery → 'CASH'` on drill-down. Pending (Batch 2).
- **FILTER-A0a-01** — `reportTransform.extractPaymentMethods` at L708-716 still surfaces `cash_on_delivery` in the filter dropdown. Pending (Batch 2).

**Impact:** Zero on code or payload. Pure documentation alignment on one QA-verification wording drift.

**Closure:** DOC-A0a-01 marked RESOLVED 2026-05-04 via this documentation revision.

---

**End of A0a per-bucket handover.**
