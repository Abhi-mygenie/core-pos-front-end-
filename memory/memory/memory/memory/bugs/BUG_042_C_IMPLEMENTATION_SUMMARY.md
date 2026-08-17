# BUG-042-C — Implementation Summary

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-042-C
> **Title:** Add `f_order_status === 9` (PayLater / Hold) to running-OrderContext terminal-clear logic
> **Implementation date:** 2026-02 (current session)
> **Baseline note (owner-approved):** This is a **business-rule revision**, not pure bug parity. Status-9 was previously non-terminal in the running dashboard and now becomes terminal. Owner has approved this baseline shift. **Potential final-docs update needed** (to reflect status-9 as terminal alongside 3 and 6); deferred per owner directive — **no `/app/memory/final/` updates performed in this session**.
> **Related docs:**
> - Gate: `/app/memory/bugs/BUG_042_C_PRE_IMPLEMENTATION_CODE_GATE.md`
> - Status Check: `/app/memory/bugs/BUG_042_C_IMPLEMENTATION_STATUS_CHECK.md`
> - Audit: `/app/memory/bugs/BUG_042_OWNER_DECISION_AND_PAYLOAD_AUDIT.md` (Section 5)
> - Owner sign-off context: `/app/memory/bugs/BUG_042_B_SMOKE_SIGNOFF.md` (BUG-042-B remains closed; independent)

---

## 1. Scope Applied (per Gate §5)

Exactly four in-place edits in `frontend/src/api/socket/socketHandlers.js`. No other production file touched.

| # | Site | Handler | Edit |
|---|---|---|---|
| 1 | L181–187 | `handleNewOrder` | Insertion guard extended: `fOrderStatus === 8 \|\| fOrderStatus === 9` now skipped. Log message updated to include the actual numeric status. |
| 2 | L268–296 | `handleOrderDataEvent` | Added `isHoldClear = (order.fOrderStatus === 9)`; `shouldRemove = isTerminal \|\| isHoldClear`. On removal, `syncTableStatus` is called WITHOUT the `'available'` override when `isHoldClear` is true (table state derives from `order.tableStatus` → maps to `'occupied'` via `ORDER_TO_TABLE_STATUS.pendingPayment`). Log updated to include `fOrderStatus`. |
| 3 | L420–438 | `handleUpdateOrderStatus` | Added `isTerminalStatus` + `isHoldClear` decomposition; same no-force-clear `syncTableStatus` special-case for status-9. Log updated. |
| 4 | L478–484 | `handleScanNewOrder` | Insertion guard extended: `fOrderStatus === 8 \|\| fOrderStatus === 9` now skipped. Log updated. |

## 2. What Changed Functionally

| Backend emits | Pre-change FE | Post-change FE | Table state after |
|---|---|---|---|
| `f_order_status = 3` (cancelled) via update-order* / update-order-status | Remove + free table | **Unchanged** — Remove + free table | `'available'` |
| `f_order_status = 6` (paid) via update-order* / update-order-status | Remove + free table | **Unchanged** — Remove + free table | `'available'` |
| `f_order_status = 7` (Yet-to-Confirm) | Update in place | **Unchanged** — Update in place | derived |
| `f_order_status = 8` via `new-order` / `scan-new-order` | Skip insertion (POS2-005) | **Unchanged** — Skip insertion | (no FE entry) |
| `f_order_status = 8` via update-order* | Update in place | **Unchanged** — Update in place | derived |
| `f_order_status = 9` (PayLater/Hold) via update-order* / update-order-status | Update in place (BUG) | **NEW** — Remove + keep table `'occupied'` | `'occupied'` |
| `f_order_status = 9` via `new-order` / `scan-new-order` | Inserted into running context (BUG) | **NEW** — Skip insertion | (no FE entry) |
| `f_order_status = 10` (reserved) | Update in place | **Unchanged** — Update in place | derived (`'reserved'`) |

### Independent surface confirmation (unchanged):
- **Audit → Hold tab** is fed by `reportService.getHoldOrders` → independent data source. Status-9 orders continue to appear there after running-context removal. No code change.
- **Initial-load running fetch** (`orderService.getRunningOrders` → `fromAPI.orderList`) is untouched. Backend owner-confirmed never returns status-9 from `/get-running-order`.

## 3. Files Touched

### Production code (1 file)
- `frontend/src/api/socket/socketHandlers.js` — 4 in-place edits as above.

### Tests (2 files)
- `frontend/src/__tests__/api/socket/updateOrderStatus.test.js` — extended with 5 BUG-042-C tests (status-9 removal + no-force-clear, regression anchors for 3 / 6 / 5, CRITICAL GUARD for 7).
- `frontend/src/__tests__/api/socket/BUG_042_C_handlers.test.js` — NEW file covering:
  - `handleOrderDataEvent` × 5 event names (`update-order`, `update-order-target`, `update-order-source`, `update-order-paid`, `update-item-status`) with status-9 → remove, no force-clear; regression anchors for status-3 / 6; CRITICAL GUARD for status-7.
  - `handleNewOrder` × status-9 skip + status-8 regression + status-1 regression.
  - `handleScanNewOrder` × status-9 skip + status-8 regression + status-1 regression.

## 4. What Was Intentionally NOT Changed

### Inside `socketHandlers.js`
- `handleUpdateFoodStatus`, `handleDeliveryAssignOrder`, `handleSplitOrder`, `handleOrderEngage`, `handleUpdateTable` — UNCHANGED.
- Handler registry — UNCHANGED.
- `syncTableStatus` helper — UNCHANGED (only the call-sites special-case status-9).
- No shared `TERMINAL_*` constant introduced (Gate §5.5 optional refactor deferred, per owner discretion).

### Outside `socketHandlers.js`
- `OrderContext.jsx` — UNCHANGED.
- `TableContext.jsx` — UNCHANGED.
- `orderTransform.js` — UNCHANGED (BUG-042-B remains closed at `grant_amount`).
- `constants.js` — UNCHANGED. `F_ORDER_STATUS`, `STATUS_COLUMNS`, `ORDER_TO_TABLE_STATUS` preserved.
- `orderService.getRunningOrders` / `fromAPI.orderList` — UNCHANGED.
- Audit Report Hold tab (`reportService.getHoldOrders` / `reportTransform.holdOrder`) — UNCHANGED.
- `transferToRoom` builder / `/order-shifted-room` endpoint — UNCHANGED.
- Print payloads (`buildBillPrintPayload` / `/order-temp-store`) — UNCHANGED.
- Hold rail UI (`CollectPaymentPanel`, `CollectBillPanelDrawer`, `OrderTable`) — UNCHANGED (BUG-042-A is separate).
- LocalStorage keys, bootstrap (`LoadingPage.jsx`), permission gates — UNCHANGED.

### Other BUG-042 sub-buckets
- BUG-042-A (Hold rail cleanup + row-level Collect disable) — NOT in this scope.
- BUG-042-B (`grant_amount` payload rename) — already closed, not modified.

### Documentation
- `/app/memory/final/` — NOT updated per owner directive (despite this being a baseline revision; deferred sweep noted in §7).
- `/app/memory/BUG_TEMPLATE.md` — NOT updated.
- Backend — not touched (no `/app/backend` in repo; frontend-only).

## 5. Verification

### 5.1 Static / lint
- **ESLint** on `socketHandlers.js`: ✅ clean (no issues).
- **ESLint** on the two test files: ✅ clean.
- **Gate §8.4 grep assertions:**
  - `grep -c "fOrderStatus === 9" socketHandlers.js` → **4** (one per touched site, as required).
  - `grep -c "fOrderStatus === 8" socketHandlers.js` → **2** (insertion guards preserved verbatim, OR-extended).

### 5.2 Unit tests
- Targeted: `yarn test --testPathPattern="api/socket"` → **5 suites / 40 tests passing**.
- Full repo: `yarn test --watchAll=false` → **31 suites / 446 tests passing**.
- BUG-042-C-specific assertions (10 new tests across 2 files):
  - status-9 → `removeOrder` called, `updateTableStatus` called with derived `'occupied'` (NOT `'available'`).
  - status-3 / 6 → `removeOrder` + table forced `'available'` (regression anchors).
  - status-7 → `updateOrder` called, NOT `removeOrder` (CRITICAL GUARD).
  - status-9 on `new-order` / `scan-new-order` → `addOrder` NOT called.
  - status-8 on `new-order` / `scan-new-order` → `addOrder` NOT called (POS2-005 regression).
  - status-1 on `new-order` / `scan-new-order` → `addOrder` called normally.

### 5.3 Build
- `yarn build` → ✅ success (production build folder created).

## 6. Risk Posture

| Surface | Risk | Status |
|---|---|---|
| Status 3 / 6 removal flows | Very Low | Predicates are additive; covered by 2 regression tests in each handler. |
| Status 7 (Yet-to-Confirm) preservation | Very Low | No predicate touches 7; covered by CRITICAL GUARD tests. |
| Status 8 insertion skip (POS2-005) | Very Low | Guards EXTENDED, not replaced; covered by regression tests. |
| Table-status semantics for status-9 | Low | Derived from `order.tableStatus` via `ORDER_TO_TABLE_STATUS.pendingPayment → 'occupied'`. Asserted directly in unit tests. |
| Audit Hold tab | Zero | Independent data source; not touched. |
| Room / Print / LocalStorage / Bootstrap / Initial-load | Zero | Not touched; verified by file grep. |

## 7. Potential Final-Docs Update (deferred — owner directive)

Per owner: this is an approved baseline/business-rule revision. The following final-docs surfaces *may* warrant a sweep on owner approval (NOT performed in this session):

- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` — Realtime / socket section: terminal-status set is now {3, 6, 9} for running-OrderContext purposes (with the additional nuance that 9 does NOT force-clear the table).
- `/app/memory/final/MODULE_DECISIONS_FINAL.md` — Module 4 socket-routing surface: document the status-9 special-case for `syncTableStatus`.

**Action requested for owner:** confirm whether a final-docs sweep is desired. Until then, those files remain untouched as instructed.

## 8. Rollback

Four discrete edits; revert each predicate / guard to its pre-change form. Optionally also revert the two test files. No DB / config / supervisor / cache dependency. Hot reload picks up the revert immediately.

## 9. Closure Checklist

- [x] Request completed — status-9 added to running-OrderContext terminal-clear in all four socket-handler sites with no-force-clear table behaviour.
- [x] Files changed — 1 production file (`socketHandlers.js`) + 2 test files (1 extended, 1 new).
- [x] What changed functionally — see Section 2.
- [x] What was intentionally not changed — see Section 4.
- [x] Known limitations remaining — none for BUG-042-C scope; potential final-docs update deferred per owner (Section 7).
- [x] Tests executed — lint + targeted + full repo + build (Section 5).
- [x] Docs created — this implementation summary + `BUG_042_C_QA_REPORT.md` (companion).
- [ ] Owner smoke sign-off — pending → produces `BUG_042_C_SMOKE_SIGNOFF.md`.

---

*End of BUG-042-C Implementation Summary.*
