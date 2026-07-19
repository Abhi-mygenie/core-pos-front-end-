# Per-Bucket Implementation Handover — Bucket A0b (ROLE-NAME-WIRE-FIX)

**Bucket:** A0b — ROLE-NAME-WIRE-FIX (May-2026)
**Implemented by:** Implementation Agent
**Date:** 2026-05-02
**Status:** ✅ Implemented, lint clean on all 6 files, 6/6 unit tests pass, webpack compile back to pre-A0b baseline (only the pre-existing `LoadingPage.jsx:111` warning), live preprod manual QA pending QA owner.

---

## 1. Source planning handover

- **Main planning handover:** `/app/memory/change_requests/implementation_handover/CR_005_to_009_IMPLEMENTATION_HANDOVER.md` §10.A0b
- **Source contract (verbatim diff):** `/app/memory/ROLE_NAME_WIRE_FIX_HANDOVER.md` §4
- **Repo / branch:** upstream `core-pos-front-end-` @ `1-may` (local pod working tree)

## 2. Bucket implemented

Switch the `role_name` wire value from heuristic / raw `user.roleName` to `permissions?.[0] || 'Manager'` across 4 endpoints (running-orders fetch, order-confirm, order-status-update for ready/served/cancel). Frontend-only. Same fix applied at every callsite. Now `role_name` always carries the backend-authoritative role tier (`Manager` / `Waiter` / etc.) instead of either a heuristic OR the raw user identity label.

## 3. User approvals received

| # | Ask | Decision |
|---|---|---|
| 1 | Approval Gate (§10.A0b) | ✅ Approved (concise format per user override of verbose template) |
| 2 | Test-file approach | T-A++ — production fix verbatim **plus** new pure-Jest contract test (no @testing-library / no devDeps added) |
| 3 | Final implementation review (incl. deviation D-A0b-1) | ✅ Approved |
| 4 | `stationService.js:185` extension | ❌ **Owner declined** — stays untouched. Captured separately in CR-010. |

## 4. Open questions answered

§12 of main handover lists no open questions for A0b. No clarifications needed.

## 5. Files changed

| File | Edits | Net Δ | Notes |
|---|---|---|---|
| `frontend/src/pages/DashboardPage.jsx` | 8 contract edits (A.1–A.8) + 1 dep-array correction (D-A0b-1) | +9 / −9 (net 0) | Hotspot per `IMPLEMENTATION_AGENT_RULES.md`. All edits are value-source swaps (`user?.roleName` → `permissions?.[0]`). |
| `frontend/src/components/order-entry/OrderEntry.jsx` | 2 (B.1 destructure, B.2 cancel payload at actual L923) | +2 / −2 (net 0) | Hotspot. Cancel-order is the only mutation in this file. Engage-timing untouched. |
| `frontend/src/pages/LoadingPage.jsx` | 1 (C.1) | +5 / −2 (net +3) | Hotspot (bootstrap). Replaced 2 lines of heuristic with 1 line + 3-line comment. |
| `frontend/src/hooks/useRefreshAllData.js` | 2 (D.1 import, D.2 hook body) | +7 / −4 (net +3) | Drops `userRole = 'Owner'` arg from callback; adds `permissions` to deps. |
| `frontend/src/api/services/orderService.js` | 1 (E.1) | +0 / −12 (net −12) | Deleted obsolete `getOrderRoleParam` helper. Zero remaining importers (verified by grep). |
| `frontend/src/__tests__/api/role-name-wire-contract.test.js` | NEW | +57 | 6 pure-Jest cases. No @testing-library / no devDeps added. |

**Total:** 5 production files modified + 1 new test file. **Diff stat: 23 insertions / 29 deletions** (helper deletion dominates).

## 6. Before / after behaviour

| Action | Wire field | Before (for `owner@18march.com`) | After |
|---|---|---|---|
| LoadingPage initial running-orders fetch | `?role_name=` | `Manager` (via heuristic) | `Manager` (via `permissions[0]`) — **value unchanged, source canonicalised** |
| Sidebar "Refresh All" button | `?role_name=` | `Manager` (via heuristic) | `Manager` (via `permissions[0]`) — same |
| Confirm a Yet-to-Confirm order (dashboard green tick) | `role_name` body | `Owner` (raw `user.roleName`) | **`Manager`** |
| Mark Ready (dashboard order/table card) | `role_name` body | `Owner` | **`Manager`** |
| Mark Served (dashboard order/table card) | `role_name` body | `Owner` | **`Manager`** |
| Cancel order from dashboard | `role_name` body | `Owner` | **`Manager`** |
| Cancel order from inside Order Entry | `role_name` body | `Owner` | **`Manager`** |
| Sidebar user display | (display only) | `"Owner (Owner)"` | Unchanged |
| Diagnostic console logs | (display only) | Print raw `roleName` | Unchanged |

For users whose raw `roleName` was non-canonical (e.g. `'m'`, `'Captain'`, `'Saurav'`) and who triggered a mutation, the wire used to send the literal raw string; now sends `permissions[0]` (canonical `'Manager'` or `'Waiter'`). **This is the intended fix.**

## 7. API / socket / state assumptions

- **APIs:** 4 endpoints affected (`GET /running-orders`, `PUT /order-confirm`, `PUT /order-status-update`, `PUT /order-status-update`). Backend already accepts the canonical `'Manager'` value on the fetch path; mutation paths now receive the same value instead of raw user identity.
- **Sockets:** Not touched. `waitForOrderEngaged`, `waitForTableEngaged`, `waitForOrderRemoval`, `waitForOrderReady` all unchanged. Engage-timing preserved.
- **State:** No new state. `permissions` already lives in `AuthContext` and was already destructured in `DashboardPage.jsx` (L159). `OrderEntry.jsx` and `useRefreshAllData.js` now destructure it as well.
- **localStorage:** Not touched.
- **Print / payment / room:** Not touched.

## 8. Validation performed

| Check | Result |
|---|---|
| ESLint on all 6 files | ✅ 0 issues each |
| `cd /app/frontend && CI=true yarn test --testPathPattern=role-name-wire-contract --watchAll=false` | ✅ **6/6 PASS** in 1.9s |
| `grep -rn "getOrderRoleParam" /app/frontend/src` | ✅ Zero hits — helper fully removed |
| Webpack hot-reload compile | ✅ Back to pre-A0b baseline (only the pre-existing `LoadingPage.jsx:111` exhaustive-deps warning) after D-A0b-1 |
| Smoke screenshot on preview URL | ✅ App loads, no compile-error overlay, login screen renders |
| `git status` scope-leak check | ✅ Only the 5 documented files modified + 1 new test file |
| Diff stat vs source contract | ✅ Coverage map (§11 below) shows every contract edit landed |

## 9. Validation NOT performed

| Check | Reason |
|---|---|
| Live preprod manual QA per source doc §7B (DevTools Network filter `role_name` on all 4 endpoints) | Pod has no test creds; real backend external (`preprod.mygenie.online`). **QA owner must run.** |
| Full Jest suite green | Pre-existing failures in `src/__tests__/api/constants.test.js` (assertion bug at L34) and module-resolution failure in `src/__tests__/contexts/SocketContext.test.jsx` (imports `@testing-library/react` which is not installed). Both pre-existing on branch `1-may`, unrelated to A0b. Tracked under follow-up TEST-INFRA-001 (logged in A0a handover). |
| Waiter-role wire test | No Waiter test account in preprod confirmed. Logged as Q-RP-05 in CR-010. |

## 10. Deviations from source contract

### D-A0b-1 — Extra dep-array swap in `DashboardPage.jsx::handleCancelOrderConfirm` L1140

- **What:** Dep array `[..., user, ...]` → `[..., permissions, ...]`.
- **Why:** Source doc §4 A.4 swapped the inline `user?.roleName` → `permissions?.[0]` at L1130 inside this callback's body, but did NOT list a paired dep-array edit. After A.4 the dep array was stale (referenced `user`, body referenced `permissions`) and ESLint's `react-hooks/exhaustive-deps` rule surfaced a new compile warning. The contract's own pattern (A.3 / A.6 / A.8) pairs body+deps swaps for the other three callbacks in this same file — A.4 was the only one missing its dep partner. Aligning is the minimum-change correction.
- **Risk:** Very low. Same shape applied 3 other times by the contract.
- **Outcome:** Webpack compile is back to the pre-A0b baseline (only `LoadingPage.jsx:111` warning remains).

### D-A0b-2 — Line-number drift vs source contract (informational)

- B.2 cancel-order edit is at actual L923; contract said L920. Logic identical.
- D.2 hook body extends to L48; contract said L44. Logic identical.
- Internal file drift unrelated to A0b. `search_replace` matched cleanly on logic.

### D-A0b-3 — `stationService.js:185` decision logged outside the contract

- Source doc §2 marked `stationService.js:185` as OUT-OF-SCOPE pending product-owner direction. During A0b's review the owner was asked again and **explicitly declined** any change to `stationService.js`. Discussion captured in `/app/memory/change_requests/CR_010_ROLES_AND_PERMISSIONS_CONSOLIDATION.md` §7 *"Out of scope"*. **No code change made to `stationService.js`.** This is recorded here for traceability.

## 11. Coverage map vs source contract

| Contract edit | File:Line (actual) | Status |
|---|---|---|
| A.1 | DashboardPage L483 | ✅ Verbatim |
| A.2 | DashboardPage L1109 | ✅ Verbatim |
| A.3 | DashboardPage L1114 dep | ✅ Verbatim |
| A.4 | DashboardPage L1130 | ✅ Verbatim |
| A.5 | DashboardPage L1243 | ✅ Verbatim |
| A.6 | DashboardPage L1248 dep | ✅ Verbatim |
| A.7 | DashboardPage L1265 | ✅ Verbatim |
| A.8 | DashboardPage L1271 dep | ✅ Verbatim |
| **D-A0b-1** | **DashboardPage L1140 dep** | **⚠️ Extra (corrects ESLint warning A.4 introduced; mirrors A.3/A.6/A.8 pattern)** |
| B.1 | OrderEntry L44 destructure | ✅ Verbatim |
| B.2 | OrderEntry L923 (contract said L920) | ✅ Logic identical, line drift only |
| C.1 | LoadingPage L316 | ✅ Verbatim |
| D.1 | useRefreshAllData L9 | ✅ Verbatim |
| D.2 | useRefreshAllData L14–48 (contract said L14–44) | ✅ Verbatim, line drift only |
| E.1 | orderService L19 (deleted L19–29) | ✅ Verbatim |
| §6 test file | `__tests__/api/role-name-wire-contract.test.js` | ✅ Created |

## 12. Regression checklist (main handover §11)

| Item | Status |
|---|---|
| `/reports/audit` loads on welcomeresort + 18march | ⏳ QA owner |
| All filters / CSV export / drill-down behave unchanged | ✅ Code paths untouched (auth-only change) |
| Dashboard live socket update after place / cancel / transfer / merge | ✅ Sockets untouched; engage timing unchanged |
| OrderEntry → CollectPaymentPanel → bill print round-trip | ✅ Print path untouched |
| Re-Print KOT | ✅ Untouched |
| Browser console clean on login screen | ✅ |
| `webpack compiled successfully` (allowing pre-existing LoadingPage warning) | ✅ |
| Full Jest suite green | ❌ Pre-existing failures (TEST-INFRA-001) — unrelated to A0b. The new role-name-wire-contract test passes 6/6. |

## 13. Known limitations / out of scope

Per source doc §10 — these were explicitly deferred and remain so:

1. `stationService.js:185` (form-data `role_name=stationName` for `/station-order-list`) — owner declined any change; captured in CR-010 §7.
2. `OrderContext.refreshOrders(roleName = 'Manager')` default at `contexts/OrderContext.jsx:36` — captured in CR-010 §4 Q-RP-03.
3. Display reads of raw `user.roleName` (Sidebar, diagnostic logs) — preserved; captured in CR-010 §2.2.
4. Full-repo grep confirmation — done: `grep -rn "getOrderRoleParam"` returns zero hits.

## 14. Backend pending items

**None for A0b.** Broader role-tier semantics questions captured in CR-010 §4 (Q-RP-01..Q-RP-09).

## 15. QA instructions

### Pre-conditions
- Live URL: `https://insights-phase.preview.emergentagent.com`
- Account: `owner@18march.com` / `Qplazm@10`
- DevTools → Network tab, filter for `role_name`.

### Steps
1. Log in. After bootstrap, inspect the **running-orders** GET request — URL must contain `?role_name=Manager`.
2. Open a Yet-to-Confirm order on dashboard, click the **green tick** to confirm. Inspect the `PUT /order-confirm` request body — must contain `"role_name":"Manager"`.
3. On a placed dine-in order, click **Mark Ready**. Inspect `PUT /order-status-update` body — must contain `"role_name":"Manager"`.
4. On a placed dine-in order, click **Mark Served**. Inspect `PUT /order-status-update` body — must contain `"role_name":"Manager"`.
5. Click **Cancel** on an order from the dashboard. Inspect `PUT /order-status-update` body — must contain `"role_name":"Manager"`.
6. Open Order Entry on a placed order, click **Cancel Order** in the cart panel. Inspect `PUT /order-status-update` body — must contain `"role_name":"Manager"`.
7. Click **Refresh All** in the sidebar — running-orders GET must again carry `?role_name=Manager`.

### Negative / regression checks
- Sidebar still shows `Owner (Owner)` (display unchanged).
- Diagnostic console logs (`[Dashboard] USER PERMISSIONS`, etc.) still print the raw `roleName` for debugging.
- Cancel / confirm / mark-ready / mark-served still flow through the engage socket — order disappears or transitions on dashboard exactly as before.
- Re-Print KOT, Print Bill, Collect Payment all unaffected.
- Optional: if a Waiter test account exists, repeat steps 1–7 — wire value should be `"Waiter"` instead of `"Manager"`. Logged as a follow-up under CR-010 Q-RP-05.

### Rollback
Single git revert on this commit-set. No state migration. Behaviour returns to pre-A0b: heuristic on fetch path, raw `roleName` on mutation paths.

## 16. Next recommended bucket

Per main handover §13 sequencing: **Bucket A1 — CR-006 Phase A (Optional auto-select fix)**.

- Source contract: `/app/memory/change_requests/CR_006_VARIATION_MODAL_OPTIONAL_AND_MULTISELECT.md`
- Pre-filled Approval Gate: main handover §10.A1.
- Files: `frontend/src/components/order-entry/ItemCustomizationModal.jsx` only (3 in-place edits).
- Risk: Low. Pure UI-state fix. No backend dependency.
- Open question: Q-V1 (toggle-off behaviour for optional single-select) — default Yes per main handover §12.

**I will NOT start A1 until you explicitly approve it.**

---

**End of A0b per-bucket handover.**
