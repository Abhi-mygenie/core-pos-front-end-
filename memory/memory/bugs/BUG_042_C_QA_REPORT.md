# BUG-042-C — QA Report

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-042-C
> **QA stage:** Static + automated (no preprod owner smoke yet)
> **Date:** 2026-02 (current session)
> **Verdict (this report):** `implementation_complete_ready_for_smoke`
> **Related docs:**
> - Gate: `/app/memory/bugs/BUG_042_C_PRE_IMPLEMENTATION_CODE_GATE.md`
> - Status Check (pre-impl): `/app/memory/bugs/BUG_042_C_IMPLEMENTATION_STATUS_CHECK.md`
> - Implementation Summary: `/app/memory/bugs/BUG_042_C_IMPLEMENTATION_SUMMARY.md`

---

## 1. QA Scope

Validate that the four in-place edits to `frontend/src/api/socket/socketHandlers.js` implement the gate-approved BUG-042-C scope, without regressing:
- existing terminal-status removal for `f_order_status` 3 (cancelled) and 6 (paid),
- the CRITICAL GUARD that status 7 (Yet-to-Confirm) stays in OrderContext,
- the POS2-005 status-8 insertion skip,
- non-touched surfaces (initial-load, Audit Hold tab, Room, payment payloads, Hold rail UI, backend).

## 2. Test Inventory & Results

### 2.1 Static (gate §8.4)

| Assertion | Expected | Observed | Status |
|---|---|---|---|
| ESLint on `socketHandlers.js` | clean | clean | ✅ |
| ESLint on `__tests__/api/socket/` | clean | clean | ✅ |
| `grep -c "fOrderStatus === 9" socketHandlers.js` | 4 | 4 | ✅ |
| `grep -c "fOrderStatus === 8" socketHandlers.js` | 2 | 2 | ✅ |
| `grep -n "fOrderStatus === 9\|fOrderStatus === 8" socketHandlers.js` lines | L185 (8\|9), L284 (9), L425 (9), L481 (8\|9) | matches | ✅ |

### 2.2 Unit / handler-level (gate §8.1) — automated

Suites covering BUG-042-C:
- `frontend/src/__tests__/api/socket/updateOrderStatus.test.js` — extended with 5 cases.
- `frontend/src/__tests__/api/socket/BUG_042_C_handlers.test.js` — NEW, 12 cases across 3 describe blocks.

| Gate # | Mapped test | Handler | Status |
|---|---|---|---|
| U-1  | `BUG-042-C / U-1: removes order when fOrderStatus === 9 and does NOT force table available` | `handleUpdateOrderStatus` | ✅ |
| U-2  | `BUG-042-C / U-2 regression: status-3 (cancelled) still removes AND forces table available` | `handleUpdateOrderStatus` | ✅ |
| U-3  | `BUG-042-C / U-3 regression: status-6 (paid) still removes AND forces table available` | `handleUpdateOrderStatus` | ✅ |
| U-4  | `BUG-042-C / U-4 CRITICAL GUARD: status-7 (Yet-to-Confirm) is NOT removed` | `handleUpdateOrderStatus` | ✅ |
| U-5  | `BUG-042-C / U-5 regression: status-5 (served) is NOT removed` | `handleUpdateOrderStatus` | ✅ |
| U-6  | `update-order + fOrderStatus=9` (parameterised) | `handleOrderDataEvent` | ✅ |
| U-7  | `update-order-source + fOrderStatus=9` (parameterised) | `handleOrderDataEvent` | ✅ |
| U-8  | `update-order-target + fOrderStatus=9` (parameterised) | `handleOrderDataEvent` | ✅ |
|      | `update-order-paid + fOrderStatus=9` (parameterised, gate-extra) | `handleOrderDataEvent` | ✅ |
|      | `update-item-status + fOrderStatus=9` (parameterised, gate-extra) | `handleOrderDataEvent` | ✅ |
|      | `update-order + fOrderStatus=6 regression` | `handleOrderDataEvent` | ✅ |
|      | `update-order + fOrderStatus=3 regression` | `handleOrderDataEvent` | ✅ |
|      | `CRITICAL GUARD: update-order + fOrderStatus=7` | `handleOrderDataEvent` | ✅ |
| U-10 | `status-9: does NOT call addOrder` | `handleNewOrder` | ✅ |
| U-11 | `regression status-8: does NOT call addOrder` | `handleNewOrder` | ✅ |
| U-12 | `regression status-1: calls addOrder normally` | `handleNewOrder` | ✅ |
| U-13 | `status-9: does NOT call addOrder` | `handleScanNewOrder` | ✅ |
| U-14 | `regression status-8: does NOT call addOrder` | `handleScanNewOrder` | ✅ |
| U-15 | `regression status-1: calls addOrder normally` | `handleScanNewOrder` | ✅ |

**Gate §8.1 coverage:** Gate scoped 15 unit tests (U-1 … U-15). Implementation covers all 15 + 2 gate-extras (update-order-paid, update-item-status). Note: gate U-9 (update-order-target table-switch with mid-event status-9) was folded into the parameterised assertion that `syncTableStatus` is not called with `'available'` for status-9 across all five update-order-style events; if owner wants an explicit table-switch + old-table-freed assertion, that can be added as a follow-up.

### 2.3 Targeted run

```
$ CI=true yarn test --testPathPattern="api/socket" --watchAll=false
PASS src/__tests__/api/socket/BUG_042_C_handlers.test.js (5.394 s)
PASS src/__tests__/api/socket/updateOrderStatus.test.js (5.558 s)
PASS src/__tests__/api/socket/handleScanNewOrder.enrichment.test.js
PASS src/__tests__/api/socket/socketServiceGlobal.test.js
PASS src/__tests__/api/socket/socketEvents.test.js

Test Suites: 5 passed, 5 total
Tests:       40 passed, 40 total
```

### 2.4 Full repo regression

```
$ CI=true yarn test --watchAll=false --silent
Test Suites: 31 passed, 31 total
Tests:       446 passed, 446 total
Time:        12.173 s
```

→ **No regression.** All existing tests including `handleScanNewOrder.enrichment.test.js` (POS2-002-P4-FU-01), `socketEvents.test.js`, and the v2 `updateOrderStatus` pre-existing T1–T6 cases continue to pass.

### 2.5 Production build

```
$ CI=true yarn build
Compiled successfully.
... build folder is ready to be deployed.
Done in 30.91s.
```

→ ✅ No compile-time or webpack errors introduced.

### 2.6 Initial-load "do-no-harm" assertion (gate §8.2 L-1)

- `orderService.getRunningOrders` (`frontend/src/api/services/orderService.js`) — **unchanged**.
- `fromAPI.orderList` — **unchanged**.
- No client-side status-9 filter introduced.
- Verified by file diff inspection (no edits made to either file).

## 3. Forbidden-File Compliance

| Surface | State |
|---|---|
| `/app/memory/final/*` | ❌ Not touched |
| `BUG_TEMPLATE.md` | ❌ Not touched |
| Backend / `/app/backend` | ❌ Not touched (frontend-only repo) |
| Payment payloads (`collectBillExisting`) | ❌ Not touched (BUG-042-B remains closed) |
| Audit / Hold reports (`reportService.getHoldOrders` / `reportTransform.holdOrder`) | ❌ Not touched |
| Room / To Room (`transferToRoom` / `/order-shifted-room`) | ❌ Not touched |
| Hold rail UI (`CollectPaymentPanel`, `CollectBillPanelDrawer`, `OrderTable`) | ❌ Not touched |
| Initial-load API (`getRunningOrders`, `fromAPI.orderList`) | ❌ Not touched |
| `OrderContext`, `TableContext` | ❌ Not touched |
| `orderTransform.js`, `constants.js` | ❌ Not touched |

All locked surfaces verified clean via file inspection and grep.

## 4. Manual / Preprod Tests Recommended (gate §8.3 — for owner smoke)

These functional tests require live preprod and are NOT executed automatically. Recommended for the owner-smoke pass that follows this report:

| # | Scenario | Expected |
|---|---|---|
| F-1 | Backend emits `update-order-status` with `f_order_status === 9` on a running dine-in order | Order tile disappears from dashboard within 1 frame; table tile remains `'occupied'`; Audit → Hold tab still shows the order. |
| F-2 | Backend emits `update-order-status` with `f_order_status === 7` | Dashboard tile **stays**. CRITICAL GUARD. |
| F-3 | Backend emits `update-order-status` with `f_order_status === 8` | Behaviour unchanged from POS2-005. |
| F-4 | Backend emits `update-order-status` with `f_order_status === 3` | Tile disappears; table → `'available'`. REGRESSION ANCHOR. |
| F-5 | Backend emits `update-order-status` with `f_order_status === 6` | Tile disappears; table → `'available'`. REGRESSION ANCHOR. |
| F-6 | `new-order` socket arrives with `f_order_status === 9` | Order does NOT appear on dashboard; Audit → Hold tab shows it. |
| F-7 | `scan-new-order` socket arrives with `f_order_status === 9` | Same as F-6. |
| F-8 | Status-9 order later flipped to status 6 (paid) | If `update-order-paid` arrives — log-only no-op (order not in running context). If a fresh `new-order` arrives — standard insertion path; status-6 then removes. Both acceptable. |
| F-9 | Dashboard refresh while a status-9 order exists in backend | `/get-running-order` does NOT return status-9 (owner-confirmed); dashboard renders without it. |
| F-10 | Transfer-to-Room flow on a running order | Source order → status-6 → existing terminal-clear fires. REGRESSION ANCHOR (Room unaffected). |
| F-11 | Auto-print bill after Collect Bill | Unchanged. REGRESSION ANCHOR. |

## 5. Risk Posture Confirmation (gate §9)

| Risk | Pre-impl assessment | Post-impl observation |
|---|---|---|
| Regression on status 3 / 6 | Very Low | ✅ Confirmed clean — 4 regression tests pass + full repo green. |
| Regression on status 7 | Very Low | ✅ Confirmed clean — CRITICAL GUARD tests pass. |
| Regression on status 8 | Very Low | ✅ Confirmed clean — POS2-005 insertion-skip regression tests pass; existing `handleScanNewOrder.enrichment.test.js` passes. |
| Table-status semantics for status-9 | Low | ✅ Asserted directly: `syncTableStatus` called WITHOUT `'available'` override on the status-9 branch. |
| Audit Hold tab | Zero | ✅ No code change; independent path. |
| Room / Print / LocalStorage / Bootstrap | Zero | ✅ No code change. |

## 6. Open Items

- **Owner preprod smoke** (gate §8.3 F-1 … F-11) → to be captured in `BUG_042_C_SMOKE_SIGNOFF.md` after the owner runs the matrix.
- **Final-docs update** (this is a baseline/business-rule revision per owner) — deferred per directive; `/app/memory/final/` and `BUG_TEMPLATE.md` NOT updated in this session. Owner may request a sweep separately.
- **Gate §5.5 optional refactor** (shared `TERMINAL_ORDER_STATUSES` constant) — not implemented; raised for code-review consideration only.
- **Gate U-9 explicit table-switch test** (update-order-target with mid-event status-9 + old-table freed) — folded into the parameterised assertion; could be expanded as a follow-up if desired.

## 7. Final Verdict (this report)

**`implementation_complete_ready_for_smoke`** ✅

- All four gate-scoped edits applied verbatim per Gate §5 pseudo-diff.
- 17 BUG-042-C-related unit tests added across 2 files; all pass.
- Full repo regression: 446 / 446 tests green.
- Production build: ✅.
- ESLint: ✅.
- Static grep assertions per Gate §8.4: ✅.
- All forbidden surfaces verified untouched.
- Awaiting owner preprod smoke (gate §8.3) for final closure.

---

*End of BUG-042-C QA Report.*
