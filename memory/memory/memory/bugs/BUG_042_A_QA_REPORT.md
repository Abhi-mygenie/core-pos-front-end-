# BUG-042-A — QA Report

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-042-A
> **QA stage:** Static + automated (owner preprod smoke pending)
> **Date:** 2026-02 (current session)
> **Verdict (this report):** `implementation_complete_ready_for_smoke`
> **Related docs:**
> - Gate: `/app/memory/bugs/BUG_042_A_PRE_IMPLEMENTATION_CODE_GATE.md`
> - Implementation Summary: `/app/memory/bugs/BUG_042_A_IMPLEMENTATION_SUMMARY.md`
> - Owner audit (parent): `/app/memory/bugs/BUG_042_OWNER_DECISION_AND_PAYLOAD_AUDIT.md` (Section 3)

---

## 1. QA Scope

Validate that the four edits applied per gate §5 produce the owner-locked behaviour and do not regress:
- Dashboard Collect Bill (no `allowedMethods` caller).
- BUG-042-B `grant_amount` payload (still emitted by drawer flow).
- BUG-042-C status-9 socket logic.
- Other report tabs (Paid / All / etc.).
- POS2-005-FU status-8 row exclusion.
- 2-day mutation window gate.

## 2. Test Inventory & Results

### 2.1 Static (gate §9.3)

| Assertion | Expected | Observed | Status |
|---|---|---|---|
| ESLint on `CollectPaymentPanel.jsx` | clean | clean | ✅ |
| ESLint on `components/reports/*` | clean | clean | ✅ |
| ESLint on `pages/AllOrdersReportPage.jsx` | clean | clean | ✅ |
| ESLint on `__tests__/components/*` | clean | clean | ✅ |

### 2.2 Unit / component tests (gate §9.1)

| Gate # | Mapped test | File | Status |
|---|---|---|---|
| U-1  | Full config (cash+card+upi+TAB+partial+rooms) + `allowedMethods=[cash,card,upi]` → Row 1 only cash/card/upi; Row 2 hidden | `CollectPaymentPanel.holdMode.test.jsx` | ✅ |
| U-2  | Only Cash configured → Row 1 = `['cash']`; Row 2 hidden | same | ✅ |
| U-3  | Cash + UPI configured (no Card) → Row 1 = `['cash','upi']`; Row 2 hidden | same | ✅ |
| U-3b | Cash + UPI happy path with initial method = `'cash'` | same | ✅ |
| —    | Card + UPI only (no Cash) → Row 1 = `['card','upi']`; initial method falls back to `'card'` | same | ✅ |
| U-4  | **Regression** — `CollectPaymentPanel` rendered WITHOUT `allowedMethods` + full config → Row 1 + Row 2 + dynamic dropdown all render | same | ✅ |
| U-5  | Initial `paymentMethod` when allowed=[cash,card,upi] and Cash not configured → `'card'` (or first allowed-configured) | same | ✅ |
| U-5b | Same with only UPI configured → `'upi'` | same | ✅ |
| U-6  | Initial `paymentMethod` when no `allowedMethods` (dashboard) → `'cash'` (regression anchor) | same | ✅ |
| —    | Safety: allowedMethods present but ZERO configured → falls back to `'cash'` | same | ✅ |
| —    | Safety: enabledLayout undefined → falls back to `'cash'` | same | ✅ |
| —    | `isHoldContext` predicate quadrant: undefined / null / `[]` / `['cash']` / `['cash','card','upi']` | same | ✅ (5 cases) |
| —    | None of cash/card/upi configured (only TAB) → Row 1 EMPTY; UX handled by OrderTable row-level disable | same | ✅ |
| —    | PAYMENT_METHODS catalog sanity (cash/card/upi exist with `type='method'`) | same | ✅ (3 cases) |
| U-7  | Hold row + `hasEligibleHoldPaymentMethod=true` + within window → Collect enabled; click invokes handler | `OrderTable.holdDisable.test.jsx` | ✅ |
| U-8  | Hold row + `hasEligibleHoldPaymentMethod=false` + within window → disabled; tooltip = "No eligible payment methods configured"; click does NOT fire handler | same | ✅ |
| U-9  | Hold row + window=false + `hasEligibleHoldPaymentMethod=false` → disabled; window tooltip wins | same | ✅ |
| U-11 | Hold row + `hasEligibleHoldPaymentMethod=undefined` (pre-BUG-042-A caller) → enabled (regression anchor) | same | ✅ |
| —    | Hold row + `fOrderStatus===8` (POS2-005-FU) → action cell suppressed entirely | same | ✅ |
| U-10 | Paid row + `hasEligibleHoldPaymentMethod=false` → Paid actions unaffected (Mark Unpaid still rendered when permitted) | same | ✅ |

**Total new BUG-042-A tests: 26 (20 in `CollectPaymentPanel.holdMode.test.jsx` + 6 in `OrderTable.holdDisable.test.jsx`).**

### 2.3 Targeted run

```
$ CI=true yarn test --testPathPattern="holdMode|holdDisable" --watchAll=false
PASS src/__tests__/components/order-entry/CollectPaymentPanel.holdMode.test.jsx
PASS src/__tests__/components/reports/OrderTable.holdDisable.test.jsx

Test Suites: 2 passed, 2 total
Tests:       26 passed, 26 total
```

### 2.4 Full repo regression

```
$ CI=true yarn test --watchAll=false --silent
Test Suites: 33 passed, 33 total
Tests:       472 passed, 472 total
Time:        6.04 s
```

Compared to pre-BUG-042-A baseline (31 suites / 446 tests post-BUG-042-C), the delta is **+2 suites / +26 tests, 0 regressions**.

### 2.5 Production build

```
$ CI=true yarn build
Compiled successfully.
... build folder is ready to be deployed.
Done in 19.66s.
```

→ ✅ No compile-time or webpack errors introduced.

## 3. Forbidden-File Compliance

| Surface | State |
|---|---|
| `/app/memory/final/*` | ❌ Not touched |
| `BUG_TEMPLATE.md` | ❌ Not touched |
| `orderTransform.js` (BUG-042-B payload) | ❌ Not touched |
| `socketHandlers.js` (BUG-042-C status-9) | ❌ Not touched |
| Backend / `/app/backend` | ❌ Not touched (not part of this repo) |
| Payment formulas | ❌ Not touched (Bill summary / SC / tax / discount / round-up math preserved) |
| Audit / Hold report data fetch (`reportService.getHoldOrders`, `reportTransform.holdOrder`) | ❌ Not touched |
| Room / To-Room normal flow (`transferToRoom`, `/order-shifted-room`, RoomCheckInModal) | ❌ Not touched |
| `paymentMethods.js` config (`PAYMENT_METHODS`, layout constants, helpers) | ❌ Not touched |
| `RestaurantContext.jsx` | ❌ Not touched |
| `OrderEntry.jsx` (dashboard Collect Bill consumer) | ❌ Not touched |
| Other report tabs (All / Paid / Cancelled / Credit / Merged / Running / Aggregator / Audit) | ❌ Not touched |

All locked surfaces verified clean via file inspection and grep on the diff scope.

## 4. Manual / Preprod Tests Recommended (gate §9.2 — for owner smoke)

These functional tests require a live preprod environment and are NOT executed automatically.

| # | Scenario | Expected |
|---|---|---|
| F-1 | Restaurant configured with Cash + Card + UPI + TAB + partial + rooms. Open Audit → Hold → click Collect on a row. | Drawer opens. Rail shows Cash, Card, UPI only. No Split, no Credit/Tab dynamic button, no More-dropdown, no To Room. |
| F-2 | Same restaurant: open dashboard, click Collect Bill on a running order. | Rail shows Cash / Card / UPI / Split / TAB (dynamic) / To Room (when rooms exist) — as today. **REGRESSION ANCHOR.** |
| F-3 | Restaurant configured with only Cash. Open Audit → Hold → Collect. | Rail shows only Cash. |
| F-4 | Restaurant configured with TAB + partial only (no Cash/Card/UPI). | Audit → Hold tab row: Collect button rendered **disabled** with tooltip "No eligible payment methods configured". Clicking does nothing. |
| F-5 | F-4 restaurant: dashboard Collect Bill on running order. | Rail unaffected — still shows TAB + Split as today. |
| F-6 | Hold-tab Collect → Cash → Pay successfully. | BUG-042-B `grant_amount` payload still emitted (verify via network panel). Order moves Hold → Paid on refetch. **BUG-042-B regression anchor.** |
| F-7 | Transfer-to-Room normal flow (dashboard → Collect Bill → To Room → pick room → Pay). | Unchanged. **Room regression anchor.** |
| F-8 | Backend emits `f_order_status === 9` after Hold-tab Collect Bill completes. | Status-9 → 6 transition removes the row from running dashboard (BUG-042-C). Audit → Hold tab still reflects via independent fetch. **BUG-042-C regression anchor.** |
| F-9 | Hold-tab row outside the 2-day mutation window. | Collect button disabled with window tooltip (existing behaviour). |
| F-10 | Hold-tab row with `fOrderStatus === 8` (POS2-005-FU). | Action cell suppressed entirely (existing behaviour). |

## 5. Risk Posture Confirmation (gate §8)

| Risk | Pre-impl assessment | Post-impl observation |
|---|---|---|
| Dashboard Collect Bill rail regression | Very Low | ✅ Confirmed clean — `U-4`, `U-6` regression anchors pass; full repo green. |
| Hold rail too restrictive vs owner intent | Locked by owner directive | ✅ Implementation matches owner-locked rule (Cash/Card/UPI only). |
| Row-level disable misfires on other tabs | Very Low | ✅ Confirmed clean — `U-10` Paid-tab regression test passes. |
| Mutation-window vs no-eligible-method precedence | Low | ✅ Window wins; `U-9` confirms tooltip ordering. |
| BUG-042-B `grant_amount` regression | Zero | ✅ Confirmed clean — `orderTransform.js` not touched; full repo green. |
| BUG-042-C status-9 regression | Zero | ✅ Confirmed clean — `socketHandlers.js` not touched; BUG-042-C suites still pass within the 472-test run. |
| Room / To-Room normal flow | Zero | ✅ Confirmed clean — Row-2 gate only fires in Hold context. |
| Initial payment-method default in dashboard | Zero | ✅ Confirmed bit-identical for dashboard caller — `U-6` passes. |

## 6. Open Items

- **Owner preprod smoke** (gate §9.2 F-1 … F-10) → to be captured in `BUG_042_A_SMOKE_SIGNOFF.md` after the owner runs the matrix.
- **Final-docs sweep** — not required by this change (no architecture/module rule revision). Owner may request a small documentation note in `CollectPaymentPanel`-related current-state docs separately.
- **Extension-friendly defaults** — `hasEligibleHoldPaymentMethod` defaults to `undefined` for any future `OrderTable` consumer that does not surface the flag, preserving the pre-BUG-042-A behaviour (verified via `U-11`).

## 7. Final Verdict (this report)

**`implementation_complete_ready_for_smoke`** ✅

- All four gate-scoped edits applied per Gate §5 / §6 pseudo-diff (additive prop / lazy state init / Row 2 wrap / row-action disable branch).
- 26 BUG-042-A unit/component tests added across 2 files; **all pass**.
- Full repo regression: **472 / 472 tests green** (+26 vs pre-impl baseline, 0 regressions).
- Production build: ✅ `yarn build` succeeded.
- ESLint: ✅ clean on all four production files + both new test files.
- All forbidden surfaces verified untouched (final docs, template, backend, payment payload, socket, formulas, Room normal flow, report fetch, other report tabs).
- BUG-042-B and BUG-042-C remain intact.
- Awaiting owner preprod smoke (gate §9.2) for final closure.

---

*End of BUG-042-A QA Report.*
