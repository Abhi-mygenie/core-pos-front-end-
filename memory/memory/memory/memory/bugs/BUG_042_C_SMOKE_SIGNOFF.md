# BUG-042-C — Smoke Sign-off

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-042-C
> **Title:** Add `f_order_status === 9` (PayLater / Hold) to running-OrderContext terminal-clear logic
> **Sign-off type:** Owner smoke-test pass (preprod)
> **Date:** 2026-02 (current session)
> **Baseline note:** Owner-approved business-rule revision. Status-9 was previously non-terminal in the running dashboard; now terminal. Final-docs update (`/app/memory/final/`) deferred per owner directive — NOT performed in this session.
> **Related docs:**
> - Gate: `/app/memory/bugs/BUG_042_C_PRE_IMPLEMENTATION_CODE_GATE.md`
> - Pre-impl Status Check: `/app/memory/bugs/BUG_042_C_IMPLEMENTATION_STATUS_CHECK.md`
> - Implementation Summary: `/app/memory/bugs/BUG_042_C_IMPLEMENTATION_SUMMARY.md`
> - QA Report: `/app/memory/bugs/BUG_042_C_QA_REPORT.md`
> - Audit (v3): `/app/memory/bugs/BUG_042_OWNER_DECISION_AND_PAYLOAD_AUDIT.md` (Section 5)
> - Related closed bug: `/app/memory/bugs/BUG_042_B_SMOKE_SIGNOFF.md` (independent)

---

## 1. Owner Smoke Results

| # | Scenario | Status | Notes |
|---|---|---|---|
| 1 | Status-9 PayLater/Hold order disappears from running dashboard | ✅ **PASS** | Order tile is removed from the running grid as soon as the backend emits `f_order_status === 9` (via `update-order-status` and the update-order-style events). |
| 2 | Table is **not** force-cleared to `'available'` | ✅ **PASS** | Table tile remains `'occupied'` after the status-9 removal — `syncTableStatus` derives from `order.tableStatus` (no `'available'` override). No force-clear by table id. |
| 3 | Audit → Hold tab still shows the order | ✅ **PASS** | Audit Hold tab continues to render the status-9 order via the independent `reportService.getHoldOrders` / `/paid-paylater-order-list` path. No shared state with `OrderContext`. |
| 4 | Status 7 (Yet-to-Confirm) remains visible on the running dashboard | ✅ **PASS** | CRITICAL GUARD upheld — status-7 orders are not removed; they continue to render and update in place. |
| 5 | Status 8 behavior unchanged (POS2-005) | ✅ **PASS** | Insertion guards on `new-order` / `scan-new-order` continue to skip status-8 insertions verbatim. `update-order-*` paths still update-in-place for status-8. No regression. |
| 6 | Status 3 (cancelled) / Status 6 (paid) still clear normally and free the table | ✅ **PASS** | Both terminal paths continue to remove the order from `OrderContext` AND force the table to `'available'`. Regression anchors clean. |
| 7 | No collateral changes to payment payload / report / room / initial-load behavior | ✅ **PASS** | `collectBillExisting` (BUG-042-B remains closed at `grant_amount`), Audit Hold report path, Room / Transfer-to-Room flow, `getRunningOrders` initial-load fetch — all observed unchanged. |

---

## 2. What Was Verified

### 2.1 Primary fix (status-9 → terminal in running dashboard)
- Real backend emits of `f_order_status === 9` on dine-in running orders are reflected on the FE: the dashboard tile disappears within a frame.
- Status-9 arrivals via `new-order` and `scan-new-order` socket channels do not insert the order into the running grid.
- Table tile retains `'occupied'` after the removal (status-9 specifically does not pass the `'available'` override to `syncTableStatus`).

### 2.2 Audit Hold visibility preserved
- After running-context removal, opening Audit → Hold tab still lists the status-9 order. Confirmed the Audit Hold tab uses an independent data source from `OrderContext`, so removing from `OrderContext` does not remove from Audit Hold.

### 2.3 Regression anchors (unchanged behavior)
- **Status 3 (cancelled)** → order removed from dashboard, table flipped to `'available'`. No drift.
- **Status 6 (paid)** → order removed from dashboard, table flipped to `'available'`. No drift.
- **Status 7 (Yet-to-Confirm)** → order stays on dashboard, updates in place. CRITICAL GUARD upheld.
- **Status 8** → POS2-005 insertion-skip on `new-order` / `scan-new-order` preserved; existing update-order-* path unchanged.
- **BUG-042-B** (`grant_amount` payload) — unaffected by this change; Hold-tab Collect Bill continues to settle as designed.

### 2.4 Untouched surfaces verified clean
- `orderService.getRunningOrders` / `fromAPI.orderList` — no client-side status-9 filter introduced; backend continues to omit status-9 from `/get-running-order`.
- Audit Hold report path (`reportService.getHoldOrders` / `reportTransform.holdOrder`) — unchanged.
- Room / Transfer-to-Room flow (`transferToRoom` builder, `/order-shifted-room` endpoint) — unchanged.
- Print payload (`buildBillPrintPayload` / `/order-temp-store`) — unchanged.
- Hold rail UI (`CollectPaymentPanel`, `CollectBillPanelDrawer`, `OrderTable`) — unchanged (BUG-042-A still separate / open).
- `OrderContext`, `TableContext`, `orderTransform.js`, `constants.js` — unchanged.
- Backend — not touched (frontend-only repo).

### 2.5 Static + automated verification (re-stated for the record)
- ESLint on `socketHandlers.js` — ✅ clean.
- ESLint on `__tests__/api/socket/*` — ✅ clean.
- Targeted socket suites — ✅ 5 suites / 40 tests passing.
- Full repo regression — ✅ 31 suites / **446 tests passing**.
- Production build (`yarn build`) — ✅ success.
- Gate §8.4 grep assertions — ✅ `fOrderStatus === 9` appears at exactly 4 sites; `fOrderStatus === 8` preserved at exactly 2 insertion-guard sites.

---

## 3. What Was Intentionally NOT Changed (re-stated)

- `OrderContext` / `TableContext` — untouched.
- `orderTransform.js` (incl. `collectBillExisting`, `transferToRoom`, `buildBillPrintPayload`) — untouched.
- `constants.js` (`F_ORDER_STATUS`, `STATUS_COLUMNS`, `ORDER_TO_TABLE_STATUS`) — untouched.
- `orderService.getRunningOrders` / `fromAPI.orderList` (initial-load fetch) — untouched.
- Audit Hold report path (`reportService.getHoldOrders` / `reportTransform.holdOrder`) — untouched.
- Room / Transfer-to-Room (`transferToRoom`, `/order-shifted-room`) — untouched.
- Hold rail UI (`CollectPaymentPanel`, `CollectBillPanelDrawer`, `OrderTable`) — untouched (BUG-042-A separate).
- Payment payload (BUG-042-B `grant_amount` rename) — untouched; remains closed.
- Backend — untouched (not part of repo).
- `/app/memory/final/*` — untouched per owner directive (deferred final-docs sweep noted in §4).
- `/app/memory/BUG_TEMPLATE.md` — untouched.

---

## 4. Potential Final-Docs Update — Deferred (owner directive)

This bug is an **owner-approved baseline / business-rule revision**, not pure bug parity. The following final-docs surfaces *may* warrant a sweep once owner explicitly approves:

- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` — Realtime / socket section: terminal-status set for running-OrderContext purposes is now {3, 6, 9}, with the nuance that status-9 keeps the table `'occupied'` (no force-clear).
- `/app/memory/final/MODULE_DECISIONS_FINAL.md` — Module 4 socket-routing surface: document the status-9 special-case for `syncTableStatus`.

**No changes have been made to `/app/memory/final/` or `BUG_TEMPLATE.md` in this session.** Owner to direct separately if a sweep is desired.

---

## 5. Closure Checklist (per IMPLEMENTATION_AGENT_RULES.md handover format)

- [x] Request completed — status-9 added to running-OrderContext terminal-clear across all four target socket-handler sites, with table preserved as `'occupied'` for status-9.
- [x] Modules touched — Socket / OrderContext routing (Module 4).
- [x] Files changed — `frontend/src/api/socket/socketHandlers.js` (4 edits) + `__tests__/api/socket/updateOrderStatus.test.js` (extended) + `__tests__/api/socket/BUG_042_C_handlers.test.js` (new).
- [x] What changed functionally — see Section 2.
- [x] What was intentionally not changed — see Section 3.
- [x] Known limitations remaining — none for BUG-042-C scope. Final-docs sweep deferred per owner (Section 4).
- [x] Tests executed — static + lint + targeted + full repo + production build + owner preprod smoke.
- [x] Docs created — Implementation Summary, QA Report, this Smoke Sign-off.

---

## 6. Final Status

**`smoke_pass_ready_to_close`** ✅

BUG-042-C is fully resolved end-to-end:
- Static, lint, automated unit + regression, and production build green.
- Owner-confirmed preprod smoke pass across all 7 verification points (status-9 removal, no force-clear, Audit Hold visibility, status-7 guard, status-8 preservation, status-3/6 regression anchors, no collateral changes).
- No regression on dashboard normal Collect / Cancel / Paid flows.
- No collateral payment, report, Room, or initial-load behavior change.

### What's next (out of this bug's scope)
- **BUG-042-A** — Hold rail cleanup + row-level Collect disable when none of cash/card/upi configured. Ready for its own Pre-Implementation Code Gate on owner signal.
- **Final-docs sweep** — owner-directed only (Section 4). Not pursued in this session.
- Other open items in the broader sprint (BUG-044 backend payload omission, etc.) remain on their own tracks.

---

*End of BUG-042-C Smoke Sign-off. Bug closed.*
