# BUG-042-A — Owner Smoke Sign-off

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-042-A
> **Title:** Hold Collect Bill payment-rail cleanup + row-level Collect disable
> **Sign-off type:** Owner smoke-test pass (preprod)
> **Date:** 2026-05-12 (current session)
> **Final status:** `smoke_pass_ready_to_close` ✅
> **Related docs:**
> - Code Gate: `/app/memory/bugs/BUG_042_A_PRE_IMPLEMENTATION_CODE_GATE.md`
> - Implementation Summary: `/app/memory/bugs/BUG_042_A_IMPLEMENTATION_SUMMARY.md`
> - QA Report: `/app/memory/bugs/BUG_042_A_QA_REPORT.md`
> - Sub-bug context: `/app/memory/bugs/BUG_042_OWNER_DECISION_AND_PAYLOAD_AUDIT.md`

---

## 1. Owner Smoke Results

| # | Scenario | Status | Notes |
|---|---|---|---|
| 1 | Hold tab → row's Collect Bill → drawer opens with Row 1 (Cash/Card/UPI) only | ✅ PASS | Row 2 (Split / Credit-TAB / "More" / To Room) hidden as designed |
| 2 | Restaurant has Cash + Card + UPI configured → all three render in Row 1 | ✅ PASS | — |
| 3 | Restaurant has only Cash configured → only Cash renders | ✅ PASS | Row 1 minimal; Row 2 still hidden |
| 4 | Restaurant has Card + UPI (no Cash) → Card + UPI render; initial selection auto-picks `card` | ✅ PASS | — |
| 5 | Restaurant has **none** of Cash/Card/UPI configured → row-level Collect Bill button disabled with tooltip `"No eligible payment methods configured"` | ✅ PASS | Operator cannot open the drawer |
| 6 | Dashboard normal Collect Bill (running order) — full rail unchanged | ✅ PASS | Regression anchor confirmed |
| 7 | Hold-tab row outside 2-day mutation window → window tooltip wins over BUG-042-A tooltip when both apply | ✅ PASS | Precedence preserved |
| 8 | Hold-tab row with `fOrderStatus === 8` → action cell still suppressed (POS2-005-FU preserved) | ✅ PASS | No regression |
| 9 | Paid-tab row actions unaffected by new `hasEligibleHoldPaymentMethod` flag | ✅ PASS | — |
| 10 | BUG-042-B (`grant_amount`) and BUG-042-C (status-9 socket clear) — unaffected | ✅ PASS | Both remain closed; no collateral changes |

**Smoke result: 10/10 PASS.** Owner explicitly confirmed.

---

## 2. What Was Verified

### 2.1 Primary fix (Hold-mode rail + row-action disable)
- `CollectPaymentPanel` mounts in Hold-mode when `allowedMethods=['cash','card','upi']` is supplied by `CollectBillPanelDrawer`.
- Row 1 honours the intersection of `allowedMethods` and restaurant-configured payment types.
- Row 2 is gated by `isHoldContext` — hidden entirely in Hold-mode.
- Audit-side `actionsConfig` carries `hasEligibleHoldPaymentMethod`; `OrderTable`'s Hold branch renders the row Collect Bill disabled when false.

### 2.2 Regression anchors
- Dashboard Collect Bill (no `allowedMethods` prop) renders the full rail bit-identical to pre-change behaviour.
- BUG-042-B `grant_amount` payload preserved.
- BUG-042-C status-9 terminal-clear preserved.
- POS2-005-FU status-8 action-cell suppression preserved.

### 2.3 Static + automated verification (re-stated)
- ESLint clean on all 4 production files + 2 new test files.
- 26 new tests pass (CollectPaymentPanel.holdMode + OrderTable.holdDisable).
- Full repo regression: 472/472 tests pass.
- Production build (`yarn build`) green.

---

## 3. What Was Intentionally NOT Changed (re-stated)

- `CollectPaymentPanel` Row 1, bill summary, math, Split-payment internals, Cash quick-pills, Card txn-id, TAB info, transferToRoom flow, dynamic dropdown logic.
- `OrderEntry.jsx` (dashboard consumer).
- `orderTransform.collectBillExisting` payload (BUG-042-B preserved).
- `socketHandlers.js` (BUG-042-C preserved).
- `reportService.getHoldOrders` / `reportTransform.holdOrder`.
- `transferToRoom` builder + `/order-shifted-room` endpoint.
- `buildBillPrintPayload` / `/order-temp-store`.
- `RestaurantContext`, `paymentMethods.js` config, `isOrderEligibleForRowActions`.
- Backend (not in this repo).
- `/app/memory/final/*` — not modified.
- `/app/memory/BUG_TEMPLATE.md` — not modified.

---

## 4. Closure Checklist

- [x] Implementation complete — `BUG_042_A_IMPLEMENTATION_SUMMARY.md`.
- [x] QA passed — `BUG_042_A_QA_REPORT.md` (472/472 tests + lint + build).
- [x] Owner preprod smoke — 10/10 PASS (this document).
- [x] No code changes during smoke step.
- [x] No `/app/memory/final/` updates.
- [x] No `BUG_TEMPLATE.md` updates.
- [ ] **Tracker keeper:** flip BUG-042-A row in `BUG_TEMPLATE.md` to Closed.

---

## 5. Final Status

**`smoke_pass_ready_to_close`** ✅

BUG-042-A is functionally complete and owner-smoke-verified on preprod. Ready for tracker keeper to mark Closed.

### What's next (out of scope for this signoff)
- **BUG-042 (parent UPI failure)** — backend network trace still pending per `BACKEND_CONFIRMATION_PULL_BUG_037_039_042_047.md`.
- **BUG-042-B / BUG-042-C** — already closed by smoke signoff; tracker flip pending.

---

*End of BUG-042-A Smoke Sign-off. Bug closed.*
