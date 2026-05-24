# BUG-042-A — Implementation Summary

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-042-A
> **Title:** Hold Collect Bill payment-rail cleanup + row-level Collect disable
> **Implementation date:** 2026-02 (current session)
> **Approval reference:** `/app/memory/bugs/BUG_042_A_PRE_IMPLEMENTATION_CODE_GATE.md`
> **Related closed bugs:** BUG-042-B (`grant_amount` payload) — closed, untouched. BUG-042-C (status-9 socket clear) — closed, untouched.

---

## 1. Scope Applied (per Gate §5)

Four small additive edits across four files. No payload, no socket, no API, no formula, no Room normal-flow change.

| # | File | Function / Site | Edit |
|---|---|---|---|
| 1 | `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Component props (after L48) | Added optional `allowedMethods` prop. When provided as a non-empty array (e.g., `['cash','card','upi']`), the panel mounts in **Hold-Collect mode**. |
| 1 | same file | `paymentMethod` state initializer (was L255) | Replaced the literal `useState('cash')` with a lazy initializer. In Hold mode, picks `'cash'` if configured (intersection with `enabledLayout.row1`); else first allowed-AND-configured method; falls back to `'cash'` literal. Dashboard caller default is **bit-identical** to before. Added `isHoldContext` derived flag. |
| 1 | same file | Row 2 render block (was L1721–1799) | Wrapped the **entire** Row 2 (`<div className="grid grid-cols-3 gap-2"> … </div>`) in `{!isHoldContext && ( … )}`. Hides Split, Credit/Tab dynamic button, "More" dynamic dropdown, and To Room button when in Hold mode. |
| 2 | `frontend/src/components/reports/CollectBillPanelDrawer.jsx` | `<CollectPaymentPanel … />` mount (was L290 area) | Added `allowedMethods={['cash', 'card', 'upi']}` prop. One-line addition with an inline rationale comment. |
| 3 | `frontend/src/pages/AllOrdersReportPage.jsx` | `useRestaurant` destructure (L124) | Added `paymentTypes: restaurantPaymentTypes` to the destructure. |
| 3 | same file | New `useMemo` after L548 | Computes `hasEligibleHoldPaymentMethod = ['cash','card','upi'].some(id => paymentTypes.some(pt => pt.name?.toLowerCase() === id))`. |
| 3 | same file | `actionsConfig` builder (Hold/Paid branch) | Surfaces `hasEligibleHoldPaymentMethod` to `OrderTable` via the existing `actionsConfig` channel. |
| 4 | `frontend/src/components/reports/OrderTable.jsx` | `renderActionsCell` destructure of `actionsConfig` | Added `hasEligibleHoldPaymentMethod` (defaults to `undefined` to keep pre-BUG-042-A behaviour for callers that don't supply it). |
| 4 | same file | Hold-tab branch of `renderActionsCell` | Renders the Collect Bill button **disabled** with tooltip `"No eligible payment methods configured"` when `hasEligibleHoldPaymentMethod === false`. The window-gate (`isWithinMutationWindow=false`) still takes precedence — its tooltip wins when both are blocking. |

## 2. What Changed Functionally

| Scenario | Pre-change behaviour | Post-change behaviour |
|---|---|---|
| Audit → Hold → Collect Bill with restaurant having Cash + Card + UPI + TAB + partial + rooms | Rail showed Cash / Card / UPI **plus** Split + Credit/TAB dynamic button + To Room button + "More" dropdown | Rail shows **only** Cash / Card / UPI (Row 1). Row 2 hidden. |
| Same flow, restaurant has only Cash | Only Cash + (Row 2 surfaces if any configured: e.g., To Room when rooms exist) | Only Cash button renders. Row 2 hidden. |
| Same flow, restaurant has only Card + UPI (no Cash) | Card + UPI + (Row 2 surfaces) | Card + UPI render. Row 2 hidden. Initial selection auto-picks first configured method (`'card'`). |
| Same flow, restaurant has **none** of Cash / Card / UPI configured | Row 1 empty; cashier could still click Row 2 (Split / Credit / TAB / To-Room) | Row 1 empty AND **row-level Collect button on the Hold tab is rendered disabled** with tooltip `"No eligible payment methods configured"`. Operator cannot open the drawer until a primary method is configured. |
| Dashboard Collect Bill (running order) — any configuration | Full rail | **Unchanged.** Caller does not pass `allowedMethods`; existing render path runs verbatim. |
| Hold-tab row with `fOrderStatus === 8` (POS2-005-FU) | Action cell suppressed via `isOrderEligibleForRowActions` | **Unchanged.** |
| Hold-tab row outside 2-day mutation window | Disabled with `"Only available for today and yesterday"` tooltip | **Unchanged.** Window message keeps precedence over the new no-eligible-method tooltip when both apply. |

## 3. Files Touched

### Production code (4 files)
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — 3 in-place edits (prop, state initializer + `isHoldContext`, Row 2 gate).
- `frontend/src/components/reports/CollectBillPanelDrawer.jsx` — 1 prop pass at the panel mount.
- `frontend/src/pages/AllOrdersReportPage.jsx` — destructure addition + new `useMemo` + `actionsConfig` field addition.
- `frontend/src/components/reports/OrderTable.jsx` — destructure addition + Hold-branch disable rendering.

### Tests (2 new files)
- `frontend/src/__tests__/components/order-entry/CollectPaymentPanel.holdMode.test.jsx` — 20 pure-function tests covering `isHoldContext` derivation, initial-method default, end-to-end intersection with the real `filterLayoutByApiTypes`, and dashboard-regression anchors.
- `frontend/src/__tests__/components/reports/OrderTable.holdDisable.test.jsx` — 6 RTL tests covering enabled/disabled/window-precedence/regression-anchor scenarios for the Hold-tab Collect Bill row action.

## 4. What Was Intentionally NOT Changed

### Inside `CollectPaymentPanel.jsx`
- ✋ Row 1 rendering logic (cash/card/upi primary methods).
- ✋ Bill summary, tax/SC/discount/round-up/tip math.
- ✋ Split-payment internal logic (still active when consumed without `allowedMethods`).
- ✋ Cash quick-pills, Card txn-id, TAB customer info, transferToRoom flow, dynamic dropdown logic.
- ✋ Pay button submission path.
- ✋ Existing useEffects (room fresh-fetch, etc.).
- ✋ `enabledLayout`, `dynamicPaymentTypes`, `filterLayoutByApiTypes`, `getDynamicPaymentTypes` — all consumed unchanged.

### Outside `CollectPaymentPanel.jsx`
- ✋ `OrderEntry.jsx` — dashboard Collect-Bill consumer unchanged (no prop passed).
- ✋ `orderTransform.collectBillExisting` — BUG-042-B closed; `grant_amount` payload preserved.
- ✋ `socketHandlers.js` — BUG-042-C closed; status-9 logic preserved.
- ✋ `reportService.getHoldOrders` / `reportTransform.holdOrder` — Audit Hold data fetch unchanged.
- ✋ `transferToRoom` builder / `/order-shifted-room` endpoint — Room flow unchanged outside Hold mode.
- ✋ `buildBillPrintPayload` / `/order-temp-store` — print payload unchanged.
- ✋ `RestaurantContext.jsx` — `paymentTypes` consumed via existing derivation.
- ✋ `paymentMethods.js` config — `PAYMENT_METHODS`, `DEFAULT_PAYMENT_LAYOUT`, helpers all unchanged.
- ✋ `isOrderEligibleForRowActions` — POS2-005-FU status-8 disable preserved.
- ✋ Other report tabs (All / Paid / Cancelled / Credit / Merged / Running / Aggregator / Audit) — no behaviour change.

### Documentation
- ✋ `/app/memory/final/*` — NOT updated.
- ✋ `/app/memory/BUG_TEMPLATE.md` — NOT updated.
- ✋ Backend (`/app/backend` is not in this repo).

### Other BUG-042 sub-buckets
- ✋ BUG-042-B (`grant_amount` payload rename) — closed, untouched.
- ✋ BUG-042-C (status-9 socket-handler clear) — closed, untouched.

## 5. Verification

### 5.1 Static / lint
- **ESLint** on `CollectPaymentPanel.jsx`: ✅ clean.
- **ESLint** on `components/reports/*` (incl. `OrderTable.jsx`, `CollectBillPanelDrawer.jsx`): ✅ clean.
- **ESLint** on `pages/AllOrdersReportPage.jsx`: ✅ clean.
- **ESLint** on `__tests__/components/*`: ✅ clean.

### 5.2 Unit tests
- **Targeted (BUG-042-A new files):** 2 suites / **26 tests passing**.
- **Full repo regression:** 33 suites / **472 tests passing** (up from 446 — +26 new tests, 0 regression).

### 5.3 Production build
- `yarn build` → ✅ success (build folder created).

### 5.4 Owner-locked behavior verified by tests
- ✅ Hold mode shows only configured Cash / Card / UPI (`U-1`, `U-2`, `U-3`).
- ✅ Hold mode hides Split / Credit-TAB / "More" / To Room (Row 2 gate via `isHoldContext`).
- ✅ When only Cash configured, only Cash shows (`U-2`).
- ✅ When Cash + UPI configured (no Card), only Cash + UPI show (`U-3`).
- ✅ When none of Cash/Card/UPI configured, Collect Bill row action **disabled** with clear tooltip (`U-8`, `U-9`).
- ✅ Window-gate keeps precedence (`U-9`).
- ✅ Normal dashboard Collect Bill rail unchanged (`U-4`, `U-6` regression anchors).
- ✅ Paid tab actions unaffected by the new flag (`U-10`).
- ✅ POS2-005-FU status-8 row exclusion preserved.
- ✅ BUG-042-B and BUG-042-C remain intact (their test suites continue to pass).

## 6. Risk Posture

| Surface | Risk | Status |
|---|---|---|
| Dashboard Collect Bill rail | Very Low | Caller passes no `allowedMethods` prop → `isHoldContext === false` → bit-identical render. Covered by regression-anchor tests `U-4` and `U-6`. |
| BUG-042-B `grant_amount` payload | Zero | `orderTransform.collectBillExisting` not touched. |
| BUG-042-C status-9 clear | Zero | `socketHandlers.js` not touched. Full-repo regression green including the BUG-042-C test files. |
| Room / Transfer-to-Room normal flow | Zero | To-Room button hidden **only** when `isHoldContext === true`. Dashboard path unchanged. `transferToRoom` builder + `/order-shifted-room` endpoint untouched. |
| Audit / Hold report data fetch | Zero | `reportService.getHoldOrders` not touched. |
| Other report tabs | Zero | Only the Hold branch of `renderActionsCell` was modified; Paid / Audit / Aggregator branches untouched. Test `U-10` confirms Paid is unaffected. |

## 7. Baseline / Final-Docs Update — Deferred (per directive)

BUG-042-A is a UI-rail and row-action gating change. It does **not** mutate any architecture/module rule documented in `/app/memory/final/`. No baseline rule revision is implied by this change.

- `/app/memory/final/*` — **NOT** updated (per directive).
- `BUG_TEMPLATE.md` — **NOT** updated (per directive).

If a future docs sweep wants to add a brief note that `CollectPaymentPanel` now supports a Hold-context `allowedMethods` prop, that is purely cosmetic and may be done as a documentation pass on owner approval.

## 8. Rollback

Four discrete edits across four files; each is a small additive block. Revert by:
1. Removing the `allowedMethods` prop + `isHoldContext` derivation + Row 2 wrapping conditional in `CollectPaymentPanel.jsx`; restoring the `useState('cash')` literal.
2. Removing the single `allowedMethods` prop from the `CollectBillPanelDrawer.jsx` mount.
3. Removing the `hasEligibleHoldPaymentMethod` memo + `actionsConfig` field + the destructure addition in `AllOrdersReportPage.jsx`.
4. Restoring the original Hold-branch button in `OrderTable.jsx::renderActionsCell`.

Optionally also delete the two new test files. No DB / config / supervisor / cache dependency. Hot reload picks up the revert immediately.

## 9. Closure Checklist

- [x] Request completed — Hold-Collect rail restricted to Cash/Card/UPI; row-level Collect disabled when none configured.
- [x] Files changed — 4 production files + 2 new test files.
- [x] What changed functionally — see Section 2.
- [x] What was intentionally not changed — see Section 4.
- [x] Known limitations remaining — none for BUG-042-A scope.
- [x] Tests executed — lint + targeted (26 tests) + full repo regression (472 tests) + production build.
- [x] Docs created — this implementation summary + `BUG_042_A_QA_REPORT.md` (companion).
- [ ] Owner smoke sign-off — pending → produces `BUG_042_A_SMOKE_SIGNOFF.md`.

---

*End of BUG-042-A Implementation Summary.*
