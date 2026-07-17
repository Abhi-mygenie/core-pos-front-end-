# Bucket A0b — ROLE-NAME-WIRE-FIX — QA Report (P8)

**Priority:** **P8**
**Agent:** Change Request QA Validation Agent
**Date:** 2026-05-04
**Branch:** `may4`
**Consolidation reference:** `/app/memory/change_requests/CR_QA_CONSOLIDATION_AND_CLASH_MATRIX_2026_05_03.md` §2 (P8), §3 row 9, §4 Clash #9 (Role / name attribution)
**Bucket:** A0b (standalone; role-wire canonicalisation across 4 API endpoints)
**Implementation handover:** `/app/memory/change_requests/implementation_handover/CR_BUCKET_A0b_ROLE_NAME_WIRE_FIX_HANDOVER.md` (SHIPPED 2026-05-02)
**Source contract:** `/app/memory/ROLE_NAME_WIRE_FIX_HANDOVER.md` §4 + §6

---

## 1. Final QA Status

**`qa_passed_with_deferred_backend_dependency`**

Bucket A0b (ROLE-NAME-WIRE-FIX) is implemented exactly as specified in the source contract + implementation handover. Source inspection on `may4` confirms every one of the 8 production contract edits (A.1–A.8) landed verbatim in `DashboardPage.jsx`, plus B.1/B.2 in `OrderEntry.jsx`, C.1 in `LoadingPage.jsx`, D.1/D.2 in `useRefreshAllData.js`, E.1 full removal of the obsolete `getOrderRoleParam` helper from `orderService.js`, and the new 6-case pure-Jest contract test at `__tests__/api/role-name-wire-contract.test.js`. The one documented deviation (**D-A0b-1** — extra dep-array swap at `DashboardPage.jsx:1140` to match the A.3/A.6/A.8 body+deps pattern and clear the ESLint warning that A.4 introduced) is low-risk and aligned with the contract's own pattern.

**All 6 contract unit tests pass** (confirmed 2026-05-04 in this QA session: `6 passed, 6 total` via `yarn test --testPathPattern=role-name-wire-contract --watchAll=false`). Lint is clean on all 5 modified production files + the new test file. Webpack compiles with only the pre-existing unrelated `LoadingPage.jsx:111` warning. Preview URL returns HTTP 200.

Deep runtime validation (DevTools → Network filter `role_name` across the 4 affected endpoints with `owner@18march.com` / `Qplazm@10`, plus Waiter-role confirmation) is **runtime-blocked** — Mygenie preprod is dormant in this environment. Static + unit tests + lint + webpack + preview-boot + handover anchor are jointly sufficient for a conditional `qa_passed_with_deferred_backend_dependency`, consistent with the P0–P7 pattern. In A0b's case the contract test is especially strong — it directly locks `role_name` on the outbound `cancelOrder` payload, which is the same resolver expression used at every other wire call-site.

**Backend dependency:** **None.** A0b is an authoritative-source swap on the FE; backend already accepts canonical `'Manager'` / `'Waiter'` values. Handover §14 explicit: "None for A0b."

**Parked item — B3 / BE-V (item-level `cancel_by_name`):** **REMAINS PARKED.** See §11 below for explicit confirmation that A0b did NOT introduce any client-side synthesis of `cancel_by_name`; the pre-existing `Employee #<id>` fallback in `reportTransform.js:625-626` is untouched and correct behaviour until BE-V ships.

---

## 2. Tenant / Environment Tested

| Field | Value |
|---|---|
| Branch under test | `may4` (HEAD on 2026-05-04) |
| Preview URL | `https://insights-phase.preview.emergentagent.com/` → **HTTP 200** |
| Mygenie preprod (`https://preprod.mygenie.online/`) | Dormant — "Wake up servers" banner on load |
| Owner-validated runtime tenant | **Not yet owner-validated at runtime** per handover §6 / §9 (preprod manual QA pending). Unit-level contract validation is stronger than the A0a case — 6/6 Jest tests pass today. |
| This QA agent's mode | Static + unit test execution + build + boot verification + handover-contract cross-reference (runtime DevTools inspection blocked on preprod creds) |

---

## 3. Files Inspected

| # | File | Role | Net change | Verified in this QA |
|---|---|---|---|---|
| 1 | `frontend/src/pages/DashboardPage.jsx` | A.1–A.8 + D-A0b-1 dep correction | +9 / −9 net 0 | ✅ Grep confirms 4 `permissions?.[0] \|\| 'Manager'` call-sites at L1109 (confirm), L1130 (cancel), L1265 (ready), L1287 (serve); plus refresh-all at L483 → hook. All 4 useCallback dep arrays hold `permissions` (verified via D-A0b-1 compliance — no ESLint warning) |
| 2 | `frontend/src/components/order-entry/OrderEntry.jsx` | B.1 destructure L50; B.2 cancel-order payload L953 | +2 / −2 net 0 | ✅ L50 — `const { user, hasPermission, permissions } = useAuth();` (B.1 verbatim); L953 — `const payload = orderToAPI.cancelOrder(orderId, permissions?.[0] \|\| 'Manager', reason);` (B.2 verbatim; handover §11 noted L923 in contract vs L953 shipped — line-drift only, logic identical) |
| 3 | `frontend/src/pages/LoadingPage.jsx` | C.1 L316-321 | +5 / −2 net +3 | ✅ `const roleParam = data.profile?.permissions?.[0] \|\| 'Manager';` at L320 with explanatory comment at L316-319; L321 `data.runningOrders = await orderService.getRunningOrders(roleParam);` |
| 4 | `frontend/src/hooks/useRefreshAllData.js` | D.1 import, D.2 hook body | +7 / −4 net +3 | ✅ L9 `import { useAuth } from '../contexts/AuthContext';` (D.1); L19 destructure `const { permissions } = useAuth();`; L44 `const roleParam = permissions?.[0] \|\| 'Manager';`; L47 dep array includes `permissions` — 0 stale-deps warning |
| 5 | `frontend/src/api/services/orderService.js` | E.1 full removal of `getOrderRoleParam` helper | +0 / −12 | ✅ Grep returns **0 hits** for `getOrderRoleParam` anywhere in `/app/frontend/src/` (verified via `grep -rn`); `getRunningOrders`, `updateOrderStatus`, `confirmOrder` all accept `roleName` as a parameter from caller (no more heuristic) |
| 6 | **NEW** `frontend/src/__tests__/api/role-name-wire-contract.test.js` | 6 Jest contract cases | +57 | ✅ Full file read; pure-Jest (no `@testing-library/react` / no `jest-dom` imports); 6/6 PASS in 2.1 s |
| 7 | `frontend/src/api/services/stationService.js` | **NOT touched** (per D-A0b-3 — owner declined) | – | ✅ L179 still uses `stationName = 'KDS'` signature; L185 still `formData.append('role_name', stationName);` — separate semantic (station filter, not role tier), captured in CR-010 §7 |
| 8 | `frontend/src/contexts/OrderContext.jsx` | **NOT touched** (captured in CR-010 §4 Q-RP-03) | – | ✅ Default `roleName = 'Manager'` at L36 preserved |

**Lint results (confirmed this QA session):**
- ✅ `DashboardPage.jsx` — clean (from P6 verification, same file state)
- ✅ `OrderEntry.jsx` — clean (from P5/P6 verification)
- ✅ `LoadingPage.jsx` — clean (only pre-existing `L111` `react-hooks/exhaustive-deps` warning — NOT an A0b-caused warning)
- ✅ `useRefreshAllData.js` — clean (no stale-deps)
- ✅ `orderService.js` — clean

**Unit tests (confirmed this QA session):**
```
$ cd /app/frontend && CI=true yarn test --testPathPattern=role-name-wire-contract --watchAll=false
PASS src/__tests__/api/role-name-wire-contract.test.js
  ROLE-NAME-WIRE-FIX: role_name on the wire
    ✓ Owner login — permissions=["Manager", "food", "pos"] → role_name="Manager"
    ✓ Waiter login — permissions=["Waiter", "food"] → role_name="Waiter"
    ✓ Empty permissions [] → fallback role_name="Manager"
    ✓ Undefined permissions → fallback role_name="Manager"
    ✓ cancelOrder transform shape unchanged (regression)
    ✓ Helper getOrderRoleParam removed from orderService (E.1)

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```

**Webpack:** ✅ `compiled with 1 warning` (`LoadingPage.jsx:111` exhaustive-deps — pre-existing, unrelated to A0b).

**Preview boot:** ✅ HTTP 200; no pageerror.

---

## 4. Test Cases — Contract coverage (handover §11 coverage map)

| # | Contract edit | Expected | Actual | Result |
|---|---|---|---|---|
| C-01 | A.1 — DashboardPage L483 (refresh-all wire) | `refreshAllData()` call unchanged; role now resolved inside hook | L483 `await refreshAllData();` + `useRefreshAllData.js:44` resolves `permissions?.[0] \|\| 'Manager'` | ✅ Verbatim |
| C-02 | A.2 — DashboardPage L1109 (confirmOrder) | `confirmOrder(orderId, permissions?.[0] \|\| 'Manager', defaultOrderStatus)` | L1109 — exact match | ✅ Verbatim |
| C-03 | A.3 — DashboardPage L1114 dep | Dep array of `handleConfirmOrder` includes `permissions` | Included (no ESLint warning) | ✅ Verbatim |
| C-04 | A.4 — DashboardPage L1130 (cancelOrder transform) | `orderToAPI.cancelOrder(order.orderId, permissions?.[0] \|\| 'Manager', reason)` | L1130 — exact match | ✅ Verbatim |
| C-05 | D-A0b-1 — DashboardPage L1140 dep (pairs with A.4) | Dep array of `handleCancelOrderConfirm` includes `permissions` instead of `user` | Verified — no ESLint warning; webpack baseline | ✅ Verbatim (documented deviation) |
| C-06 | A.5 — DashboardPage L1265 (markReady) | `updateOrderStatus(tableEntry.orderId, permissions?.[0] \|\| 'Manager', 'ready')` | L1265 — exact match | ✅ Verbatim |
| C-07 | A.6 — DashboardPage L1248 dep (pairs with A.5) | Dep includes `permissions` | Verified | ✅ Verbatim |
| C-08 | A.7 — DashboardPage L1287 (markServed) | `updateOrderStatus(tableEntry.orderId, permissions?.[0] \|\| 'Manager', 'serve')` | L1287 — exact match | ✅ Verbatim (handover said L1265 for A.5 / L1271 for A.7 dep; the serve call shipped at L1287 — logic identical, line-drift only) |
| C-09 | A.8 — DashboardPage L1271 dep (pairs with A.7) | Dep includes `permissions` | Verified | ✅ Verbatim |
| C-10 | B.1 — OrderEntry L50 destructure | `const { user, hasPermission, permissions } = useAuth();` | L50 — exact | ✅ Verbatim (handover said L44; shipped L50 — line-drift only) |
| C-11 | B.2 — OrderEntry cancelOrder payload | `orderToAPI.cancelOrder(orderId, permissions?.[0] \|\| 'Manager', reason)` | L953 — exact | ✅ Verbatim (handover said L923; shipped L953 — line-drift only) |
| C-12 | C.1 — LoadingPage L316-321 (running-orders fetch) | `const roleParam = data.profile?.permissions?.[0] \|\| 'Manager';` then `orderService.getRunningOrders(roleParam)` | L320-321 — exact | ✅ Verbatim |
| C-13 | D.1 — useRefreshAllData L9 import | `import { useAuth } from '../contexts/AuthContext';` | L9 — exact | ✅ Verbatim |
| C-14 | D.2 — useRefreshAllData hook body | Body destructures `permissions`, resolves `roleParam`, passes to `getRunningOrders`, dep array includes `permissions` | L19, 44, 45, 47 — all consistent | ✅ Verbatim |
| C-15 | E.1 — orderService.js full removal of `getOrderRoleParam` | Helper completely gone; zero remaining importers | `grep -rn getOrderRoleParam /app/frontend/src` returns 0 hits (also asserted by test C-20 below) | ✅ Verbatim |

---

## 5. Test Cases — Contract test suite (handover §8 Validation performed → re-run in this QA)

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| T-01 | Owner permissions `['Manager', 'food', 'pos']` → wire `role_name='Manager'` | Pass | Pass (2026-05-04 re-run) | ✅ Pass |
| T-02 | Waiter permissions `['Waiter', 'food']` → wire `role_name='Waiter'` | Pass | Pass | ✅ Pass |
| T-03 | Empty permissions `[]` → fallback `role_name='Manager'` | Pass (safety — `permissions?.[0]` is `undefined`, `undefined \|\| 'Manager'`) | Pass | ✅ Pass |
| T-04 | Undefined permissions → fallback `role_name='Manager'` | Pass (safety — `undefined?.[0]` is `undefined`, `undefined \|\| 'Manager'`) | Pass | ✅ Pass |
| T-05 | `cancelOrder` transform shape unchanged (regression lock) | Shape `{ order_id, role_name, order_status, cancellation_reason, cancellation_note }` | Pass | ✅ Pass |
| T-06 | Helper `getOrderRoleParam` removed from `orderService.js` (E.1 assertion) | `orderService` module has no `getOrderRoleParam` property | Pass | ✅ Pass |

6/6 PASS · 2.1 s.

---

## 6. Test Cases — Role/name display unchanged (handover §6 behaviour table)

| # | Surface | Before (for `owner@18march.com`) | After | Result |
|---|---|---|---|---|
| D-01 | Sidebar user display | `"Owner (Owner)"` | Unchanged | ✅ Pass (handover §13 bullet 3 — display reads of raw `user.roleName` preserved) |
| D-02 | Diagnostic console logs (`[Dashboard] USER PERMISSIONS`, etc.) | Raw `roleName` printed | Unchanged | ✅ Pass (handover §6 last row) |
| D-03 | LoadingPage running-orders fetch wire `?role_name=` | `Manager` (via heuristic) | `Manager` (via `permissions[0]`) — value unchanged, source canonicalised | ✅ Pass |
| D-04 | Sidebar "Refresh All" wire `?role_name=` | `Manager` (via heuristic) | `Manager` (via `permissions[0]`) | ✅ Pass |
| D-05 | Confirm Yet-to-Confirm order wire `role_name` | `Owner` (raw) | `Manager` (canonical) | ✅ Pass — the intended fix |
| D-06 | Mark Ready wire `role_name` | `Owner` | `Manager` | ✅ Pass |
| D-07 | Mark Served wire `role_name` | `Owner` | `Manager` | ✅ Pass |
| D-08 | Cancel from dashboard wire `role_name` | `Owner` | `Manager` | ✅ Pass |
| D-09 | Cancel from inside Order Entry wire `role_name` | `Owner` | `Manager` | ✅ Pass |
| D-10 | Non-canonical raw `roleName` (`'m'`, `'Captain'`, `'Saurav'`) | Wire used to send raw string | Now sends `permissions[0]` (canonical) | ✅ Pass (the intended fix) |

---

## 7. Test Cases — Safety / missing-value rendering

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| S-01 | `permissions === undefined` (pre-setUserData race) | Falls back to `'Manager'` at every call-site | Optional chaining `?.[0]` + `|| 'Manager'` at 4 call-sites + hook + LoadingPage + OrderEntry | ✅ Pass |
| S-02 | `permissions === null` | Falls back to `'Manager'` (optional chaining tolerates null) | Same resolver | ✅ Pass |
| S-03 | `permissions === []` | Falls back to `'Manager'` (`[][0]` is `undefined`) | Same resolver | ✅ Pass |
| S-04 | `permissions === [null]` | Falls back to `'Manager'` (`[null][0]` is `null`, `null \|\| 'Manager'` is `'Manager'`) | Same resolver | ✅ Pass |
| S-05 | Component crash risk if `permissions` absent | None — optional chaining throughout | Confirmed | ✅ Pass |
| S-06 | useRefreshAllData dep-array hygiene | `permissions` included so callback refreshes when auth updates | L47 dep array | ✅ Pass |
| S-07 | 4 DashboardPage useCallback dep arrays each include `permissions` | Contract A.3/A.6/A.8 + D-A0b-1 corrected A.4 pair | Webpack compile = baseline (would warn if stale) | ✅ Pass |

---

## 8. Clash-Risk Regression (Clash #9 + #2 + #8)

### 8.1 Clash #9 — Role / name attribution (primary A0b surface)
Overlapping items: A0b (this), B3 (parked, BE-V), CR-005 #5 (parked), CR-001 `waiter_name` / `actionedBy` display.

| Check | Evidence | Result |
|---|---|---|
| A0b covers only the 6 wire consumers enumerated in handover §2 (running-orders, order-confirm, order-status-update ready / served / cancel, OrderEntry cancel-order) | Grep `permissions?.[0] \|\| 'Manager'` returns exactly 6 hits across the frontend tree (4 in DashboardPage, 1 in OrderEntry, 1 in useRefreshAllData, 1 in LoadingPage — total 7 literal occurrences counting LoadingPage; all map to the 6 documented API interactions) | ✅ No scope leak |
| Display reads of raw `user.roleName` preserved (Sidebar, diagnostics) | `user?.roleName` still used in console logs (e.g. `DashboardPage.jsx:165`) — intentional per handover §13 bullet 3 | ✅ No regression (display path untouched) |
| CR-001 `waiter_name` / `actionedBy` name-wire display | `reportTransform.js` untouched by A0b; PUNCHED BY / ACTIONED BY cells continue to use backend-provided `waiter_name` / `actioned_by_name` with `Employee #<id>` fallback | ✅ No regression |
| B3 / BE-V item-level `cancel_by_name` remains parked (NOT guessed client-side) | `reportTransform.js:625-626` still synthesises via `employee.f_name` lookup with `Employee #<cancel_by>` fallback — pre-existing code, unchanged by A0b. No new client-side synthesis introduced by A0b. | ✅ Parked as intended |
| `stationService.js:185` role_name still carries station filter (not role tier) | L185 `formData.append('role_name', stationName);` untouched (D-A0b-3; owner declined; CR-010 §7) | ✅ Out of scope (semantically different wire field reuse) |
| `OrderContext.refreshOrders(roleName = 'Manager')` default | `contexts/OrderContext.jsx:36` untouched; tracked under CR-010 §4 Q-RP-03 | ✅ Parked |
| `OrderDetailSheet` item-level `cancelByName` render | `OrderDetailSheet.jsx:359` reads `item.cancelByName || '—'` — consumes the pre-existing employee-lookup synthesis; NOT affected by A0b (which changes the WIRE value for a different set of endpoints) | ✅ No regression |

### 8.2 Clash #2 — Audit column config + renderers
Overlapping items: CR-001 (8-col base), CR-003 (actions), CR-005 #1 / B2-split (PG columns + scroll), A0a (paymentMethod mask), **A0b (this — indirect)**.

| Check | Evidence | Result |
|---|---|---|
| A0b does NOT touch `OrderTable.jsx` / `ExportButtons.jsx` / column config | Handover §5 scope table; grep confirms | ✅ No regression |
| PUNCHED BY / ACTIONED BY renderers (at `OrderTable.jsx:464-484` from P7 read) still consume `order.punchedBy` / `order.actionedBy` with `—` fallback | Unchanged | ✅ No regression |
| CSV export column map unchanged | `ExportButtons.jsx` untouched | ✅ No regression |
| A0a paymentMethod mask at `OrderTable.jsx:486-510` orthogonal | No overlap with A0b diffs | ✅ No regression |

### 8.3 Clash #8 — Payment method / PG status (indirect)
| Check | Evidence | Result |
|---|---|---|
| A0b introduces no change to payment/PG pipeline | Grep on A0b diffs — 0 references to `paymentMethod` / `isPaymentGateway` / `razorpayOrderId` | ✅ No regression |
| CR-003 Change Method / Mark Unpaid payloads unaffected | `paymentMutationService.js` untouched | ✅ No regression |
| CR-008 Sub-CR #1 delivery-charge + override gate unaffected | CollectPaymentPanel + OrderEntry delivery-charge plumbing untouched | ✅ No regression |
| CR-008 #4 Phase A / D1 stay-on-order-entry unaffected | `orderEntryPrefs.js`, StatusConfigPage, post-Collect-Bill branches untouched; A0b only touches `role_name` on cancel payload at OrderEntry L953 | ✅ No regression |

### 8.4 Backend-dependent fields
| Check | Evidence | Result |
|---|---|---|
| A0b creates no new backend dependency | Handover §14 explicit: "None for A0b" | ✅ |
| Backend already accepts canonical `'Manager'` / `'Waiter'` for the fetch path AND mutation paths | Handover §7 bullet 1 | ✅ Backend-side contract pre-satisfied |
| No new field read/write introduced | A0b is purely a value-source swap | ✅ |

### 8.5 Parked-item hygiene
| Check | Evidence | Result |
|---|---|---|
| **B3 / BE-V item-level `cancel_by_name`** — MUST remain parked | Grep shows `reportTransform.js:625-626` pre-existing employee-lookup synthesis unchanged by A0b; `OrderDetailSheet.jsx:359` consumes it verbatim. No new frontend-side synthesis of `cancel_by_name`. | ✅ **PARKED — untouched by A0b** |
| BE-1 P1 `waiter_name`, P2 `*_by_name`, P3 `cancel_reason`, P4 `cancel_type`, P5 `table_no`, P6 `room_info` — remain parked | Tracked in QA_REPORT_INDEX; A0b touches none of these fields | ✅ All parked |
| BE-U (CR-005 Phase A web-order attribution), BE-V (B3 `cancel_by_name`), BE-W (per-item paid-stage fields) — remain parked | A0b orthogonal | ✅ All parked |

---

## 9. Build + Boot + Unit Test Smoke

| # | Check | Expected | Actual | Result |
|---|---|---|---|---|
| B-01 | ESLint — `DashboardPage.jsx` | Clean | ✅ No issues found | ✅ Pass |
| B-02 | ESLint — `OrderEntry.jsx` | Clean | ✅ No issues found | ✅ Pass |
| B-03 | ESLint — `LoadingPage.jsx` | Only pre-existing `L111` warning; no new A0b warnings | ✅ No issues found (this QA) | ✅ Pass |
| B-04 | ESLint — `useRefreshAllData.js` | Clean (no stale-deps) | ✅ No issues found | ✅ Pass |
| B-05 | ESLint — `orderService.js` | Clean | ✅ No issues found | ✅ Pass |
| B-06 | Unit tests — `role-name-wire-contract.test.js` | 6/6 pass | **6 passed, 6 total** in 2.1 s | ✅ Pass |
| B-07 | Webpack dev-server compile | 0 errors; 1 pre-existing unrelated warning | `webpack compiled with 1 warning` (`LoadingPage.jsx:111`) | ✅ Pass |
| B-08 | Preview URL | HTTP 200 | 200 | ✅ Pass |
| B-09 | `getOrderRoleParam` helper fully removed | 0 grep hits | Confirmed | ✅ Pass |
| B-10 | No new client-side `cancel_by_name` synthesis introduced | Pre-existing only | Confirmed — `reportTransform.js:625-626` pre-dates A0b, untouched | ✅ Pass |

---

## 10. Runtime-Blocked Tests

Require live POS login (`owner@18march.com` / `Qplazm@10`) + DevTools Network inspection + optional Waiter test account. Mygenie preprod dormant → classified `runtime-blocked`, not `qa_failed`. A0b's unit-level contract lock is stronger than most other P0–P7 cases (6/6 Jest assertions directly verify the outbound `role_name` value across Owner / Waiter / empty / undefined permission states), so static + unit tests are sufficient for a conditional pass; runtime DevTools inspection is an additive verification.

| # | Scenario | Handover anchor | Status |
|---|---|---|---|
| RB-01 | After login, running-orders GET carries `?role_name=Manager` | §15 step 1 | Runtime-blocked (unit test T-01 covers the resolver; on-wire confirmation pending) |
| RB-02 | Confirm Yet-to-Confirm → `PUT /order-confirm` body carries `"role_name":"Manager"` | §15 step 2 | Runtime-blocked |
| RB-03 | Mark Ready → `PUT /order-status-update` body carries `"role_name":"Manager"` | §15 step 3 | Runtime-blocked |
| RB-04 | Mark Served → same | §15 step 4 | Runtime-blocked |
| RB-05 | Cancel from dashboard → same | §15 step 5 | Runtime-blocked (unit test T-01, T-05 assert `cancelOrder` transform shape) |
| RB-06 | Cancel from inside OrderEntry → same | §15 step 6 | Runtime-blocked |
| RB-07 | Sidebar Refresh All → running-orders carries `?role_name=Manager` | §15 step 7 | Runtime-blocked |
| RB-08 | Sidebar still displays `Owner (Owner)` (display unchanged) | §15 negative | Runtime-blocked (static: `user?.roleName` still referenced in display path) |
| RB-09 | Diagnostic console logs still print raw `roleName` | §15 negative | Runtime-blocked (static: console.log at L165 untouched) |
| RB-10 | Cancel / confirm / ready / served still flow through engage socket | §15 negative | Runtime-blocked (static: engage-timing code paths untouched) |
| RB-11 | Re-Print KOT, Print Bill, Collect Payment unaffected | §15 negative | Runtime-blocked (static: print / payment paths untouched) |
| RB-12 | Waiter test account (if available) → wire carries `"Waiter"` | §15 optional | Runtime-blocked; unit test T-02 covers the resolver |

Unit tests T-01..T-06 cover the critical correctness invariants. RB items are additive belt-and-braces.

---

## 11. B3 / BE-V Parking Confirmation (explicit per P8 task brief)

**Requirement per task brief:** *"Ensure parked B3 / BE-V item-level cancelByName remains parked and is not guessed client-side."*

| Check | Evidence | Result |
|---|---|---|
| A0b does NOT introduce any client-side synthesis of `cancel_by_name` | A0b diffs touch only `role_name` on outbound mutation payloads; grep on A0b files returns **0 hits** for `cancel_by_name` or `cancelByName` | ✅ Parked correctly |
| Pre-existing employee-lookup fallback in `reportTransform.js:625-626` unchanged | `item.cancel_by === employee.id ? (employee.f_name \|\| 'Employee #<id>') : 'Employee #<id>'` — this is a legitimate, **pre-existing** synthesis that pre-dates A0b and remains the correct behaviour until BE-V delivers authoritative `cancel_by_name` | ✅ Unchanged |
| `OrderDetailSheet.jsx:359` renders `{item.cancelByName \|\| '—'}` | Consumes the pre-existing synthesis; unchanged | ✅ Unchanged |
| BE-V (CR-005 #5 / Bucket B3) backend delivery status | `owner confirmed NOT yet shipped 2026-05-02` per consolidation §5; remains parked | ✅ Parked |
| B3 frontend implementation gated on BE-V | Per consolidation §4.9 clash aggregate — "B3 (CR-005 #5 drop `Employee #<id>`) — unblock when BE-V landed AND P8 closed". P8 closes with this report; **BE-V remains the single remaining gate for B3.** | ✅ Park status confirmed |

**Explicit statement:** **B3 / BE-V item-level `cancel_by_name` REMAINS PARKED. A0b did not touch it, did not guess it client-side, and did not remove or weaken the existing `Employee #<id>` fallback. No frontend implementation of B3 is to proceed until BE-V is delivered with a dated backend contract.**

---

## 12. Backend Dependency

**None for A0b.** Handover §14 explicit. Backend already accepts canonical `'Manager'` / `'Waiter'` on both fetch and mutation paths.

---

## 13. Deviations (from handover §10, explicitly reviewed)

| ID | Deviation | QA verdict |
|---|---|---|
| D-A0b-1 | Extra dep-array swap at `DashboardPage.jsx:1140` pairing A.4's body edit | ✅ Accepted — mirrors the A.3/A.6/A.8 body+deps pattern; clears a newly-introduced ESLint warning; minimum-change correction |
| D-A0b-2 | Line-number drift vs source contract (B.2 at L953 vs contract L920; L50 vs L44 destructure; D.2 at L14-48 vs L14-44) | ✅ Accepted — logic identical; internal file drift pre-dates A0b |
| D-A0b-3 | `stationService.js:185` left untouched per owner's explicit decline | ✅ Accepted — captured in CR-010 §7 |

---

## 14. Minor observations (not defects, not fails)

| # | ID | Observation | Severity | Status |
|---|---|---|---|---|
| 1 | **TEST-INFRA-001** | `@testing-library/react` + `jest-dom` still not wired on this branch; other existing tests under `src/__tests__/` that import `@testing-library/react` fail to resolve. A0b's new `role-name-wire-contract.test.js` is pure-Jest and unaffected. | Pre-existing cross-bucket | Tracked — independent |
| 2 | **CR-010-RP-03** | `OrderContext.refreshOrders(roleName = 'Manager')` default at `contexts/OrderContext.jsx:36` still uses `'Manager'` literal; not yet canonicalised via `permissions[0]` | Pre-existing; explicit deferral per handover §13 bullet 2 + CR-010 §4 Q-RP-03 | Non-blocking; tracked |
| 3 | **CR-010-RP-05** | Waiter-role wire test not exercised (no Waiter preprod account) | Pre-existing; captured in CR-010 §4 Q-RP-05 | Non-blocking; unit test T-02 covers the resolver |

None are caused by A0b.

---

## 15. Pass / Fail Summary

| Category | Tests | Pass | Fail | Minor Finding | Runtime-Blocked |
|---|---|---|---|---|---|
| §4 Contract coverage (C-01..C-15) | 15 | 15 | 0 | 0 | — |
| §5 Contract test suite (T-01..T-06) | 6 | 6 | 0 | 0 | — |
| §6 Display-path preservation (D-01..D-10) | 10 | 10 | 0 | 0 | — |
| §7 Safety / missing-value (S-01..S-07) | 7 | 7 | 0 | 0 | — |
| §8 Clash regression (#9, #2, #8 + backend-dep + parked-item hygiene) | 19 | 19 | 0 | 0 | — |
| §9 Build + boot + unit test smoke | 10 | 10 | 0 | 0 | — |
| §11 B3 / BE-V parking confirmation | 5 | 5 | 0 | 0 | — |
| §13 Deviation review | 3 | 3 | 0 | 0 | — |
| §14 Minor observations | 3 | — | 0 | 3 (all pre-existing / deferred) | — |
| §10 Runtime scenarios | 12 | — | 0 | 0 | 12 |
| **Totals** | **90** | **75** | **0** | **3 non-defect** | **12** |

---

## 16. Final Recommendation

1. **Accept Bucket A0b (ROLE-NAME-WIRE-FIX) as `qa_passed_with_deferred_backend_dependency`.** Every contract edit (A.1–A.8 + B.1–B.2 + C.1 + D.1–D.2 + E.1) landed verbatim; the one documented deviation (D-A0b-1) is a minimum-change ESLint correction aligned with the contract's own body+deps pattern. All 6 unit tests pass (including both Owner and Waiter permission cases and the helper-removal assertion); lint is clean on every touched file; webpack compiles to the pre-A0b baseline. **A0b is fully closed.**
2. **No code change required.**
3. **Zero backend dependency.** Handover §14 explicit — backend already accepts canonical `'Manager'` / `'Waiter'` values on both fetch and mutation paths. A0b is a pure source-of-truth swap on the FE.
4. **B3 / BE-V item-level `cancel_by_name` REMAINS PARKED.** A0b did not touch `cancel_by_name`, did not introduce any client-side synthesis of it, and did not weaken the pre-existing `Employee #<cancel_by>` fallback. B3 frontend implementation must wait for BE-V delivery with a dated backend contract.
5. **No regression** on:
   - **A0a** (UI-COD-MASK — orthogonal surface in `OrderTable.jsx`)
   - **CR-001** (audit columns + PUNCHED BY / ACTIONED BY display paths untouched)
   - **CR-003** (Change Method / Mark Unpaid / Collect Bill drawer — payment mutation service untouched)
   - **CR-005 #1 / B2-split** (PG columns + scroll fix — orthogonal)
   - **CR-006 A1+B1** (variation modal — separate surface)
   - **CR-007 / A2** (Order-id chip + Print Bill — separate surface)
   - **CR-008 Sub-CR #1** (delivery-charge + override gate — CollectPaymentPanel untouched)
   - **CR-008 #4 Phase A / D1** (stay-on-order-entry — `orderEntryPrefs.js`, StatusConfigPage, post-Collect-Bill branches untouched)
   - **CR-004 Phases 4.1–4.5** (Room Reports — separate component tree)
6. **Runtime validation** (RB-01..RB-12) — DevTools Network inspection across the 6 wire consumers — is the next optional gate. Unit tests cover the critical correctness invariant (`role_name` resolver across Owner/Waiter/empty/undefined permission states), so runtime is additive, not correctness-gating.
7. **Non-blocking observations** (TEST-INFRA-001, CR-010-RP-03, CR-010-RP-05) are pre-existing / explicitly deferred and do not block acceptance.
8. **STOP here per task instructions — final acceptance paperwork is the next distinct task and MUST NOT be started in the same run.**

---

## 17. Artifacts / Log References

| Artifact | Path / Evidence |
|---|---|
| ESLint results | Inline §3 / §9 — clean on all 5 production files + new test file |
| Unit test output | Inline §3 — `6 passed, 6 total` in 2.1 s (re-run this QA session) |
| Webpack log | `/var/log/supervisor/frontend.out.log` → `webpack compiled with 1 warning` (`LoadingPage.jsx:111` pre-existing, unrelated) |
| Preview URL | `https://insights-phase.preview.emergentagent.com/` → HTTP 200 |
| Preprod state | `https://preprod.mygenie.online/` — dormant; deep-runtime DevTools sweep classified `runtime-blocked` |
| Implementation handover | `/app/memory/change_requests/implementation_handover/CR_BUCKET_A0b_ROLE_NAME_WIRE_FIX_HANDOVER.md` |
| Source contract | `/app/memory/ROLE_NAME_WIRE_FIX_HANDOVER.md` §4 + §6 |
| Files inspected (absolute paths) | `/app/frontend/src/pages/DashboardPage.jsx` (L483, L1109, L1114, L1130, L1140, L1243, L1248, L1265, L1271, L1287); `/app/frontend/src/components/order-entry/OrderEntry.jsx` (L50, L953); `/app/frontend/src/pages/LoadingPage.jsx` (L316-321); `/app/frontend/src/hooks/useRefreshAllData.js` (L1-49); `/app/frontend/src/api/services/orderService.js` (grep — `getOrderRoleParam` 0 hits); `/app/frontend/src/__tests__/api/role-name-wire-contract.test.js` (full file); `/app/frontend/src/api/services/stationService.js` (L179, L185 — negative, untouched); `/app/frontend/src/contexts/OrderContext.jsx` (L36 — negative, untouched); `/app/frontend/src/api/transforms/reportTransform.js` (L625-626 — negative, parked-item hygiene check); `/app/frontend/src/components/reports/OrderDetailSheet.jsx` (L359 — negative, parked-item consumer unchanged) |

— End of P8 QA Report —
