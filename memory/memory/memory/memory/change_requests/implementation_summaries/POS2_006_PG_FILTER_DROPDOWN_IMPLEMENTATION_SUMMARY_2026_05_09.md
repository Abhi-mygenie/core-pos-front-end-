# POS2-006-PG-FILTER-DROPDOWN — Implementation Summary

> **Sprint:** pos2.0
> **CR ID:** POS2-006-PG-FILTER-DROPDOWN
> **Date:** 2026-05-09
> **Predecessor docs:**
> - `change_requests/sprint_consolidation/POS2_0_OWNER_DECISIONS_AMENDMENT_2026_05_09.md` §Decision-8 (locked spec)
> - `change_requests/impact_analysis/POS2_005_FU_STATUS_8_9_COLLECT_BILL_AND_PG_FILTER_INVESTIGATION_2026_05_09.md` §B (origin row)
> - User locked-spec message 2026-05-09 (9 items, verbatim)

---

## 1. Locked spec — owner verbatim (2026-05-09)

| # | Locked behaviour |
|---|---|
| 1 | Replace the current All/PG checkbox UI with a dropdown |
| 2 | Dropdown options: **ALL · Non-PG · PG** |
| 3 | Dropdown should be visible **across all report tabs** |
| 4 | **Do not reset** selection on tab change |
| 5 | Selection **persists** while navigating between report tabs |
| 6 | Default value remains **ALL** |
| 7 | **Non-PG branch must be enabled in filtering logic** |
| 8 | Existing report filters should continue to work with the PG dropdown |
| 9 | Hide dropdown only if backend provides a reliable PG-enabled flag — **otherwise keep visible** (no order-data inference) |

---

## 2. Files changed

| # | File | Change | LOC delta |
|---|---|---|---:|
| 1 | `frontend/src/components/reports/FilterBar.jsx` | (a) Replaced 2-checkbox `<div role="group">` block (L249-304) with the in-file `<Select>` component (3 options surfaced as ALL placeholder + Non-PG + PG). (b) Updated `PAYMENT_GATEWAY_OPTIONS` export from `[All, PG]` to `[Non-PG, PG]` (ALL is placeholder, not a list entry). (c) Comment updated. | -75 / +30 |
| 2 | `frontend/src/components/reports/OrderTable.jsx` | Updated `pgFilterActive` predicate comment to document tri-state behaviour. **Logic unchanged** — `pgFilterActive` remains `=== 'gateway'` so PG columns appear ONLY for the PG selection (Non-PG-narrowed rows have no Razorpay IDs to display). | 0 / +5 (comment-only) |
| 3 | `frontend/src/components/reports/FilterTags.jsx` | Comment updated to reflect the tri-state (`'gateway'` and `'nonGateway'` both produce chips). **Logic unchanged** — the existing `PAYMENT_GATEWAY_OPTIONS.find(o => o.value === value)` lookup automatically resolves the new `'nonGateway'` label without code changes. | 0 / +4 (comment-only) |
| 4 | **`frontend/src/pages/AllOrdersReportPage.jsx`** | Added the `'nonGateway'` branch to the row-narrowing predicate at L429-436. **This is the only change outside the 3 files originally listed in the task brief**, made to satisfy locked item 7 ("Non-PG branch must be enabled in filtering logic"). Without this, selecting "Non-PG" would render but never narrow rows. Other report filter predicates (status, paymentMethod, channel, platform) are untouched. | +6 / -2 |
| 5 | `frontend/src/__tests__/components/reports/PGFilterDropdown.test.jsx` (NEW) | 19 focused unit tests across 5 describe blocks covering the locked spec | +290 |

**Total LOC delta:** ~+335 / -77 across 4 source files + 1 new test file.

**Files NOT touched:**
- `frontend/src/api/transforms/profileTransform.js` ✅ (locked item 9)
- `frontend/src/contexts/RestaurantContext.jsx` ✅ (locked item 9)
- `frontend/src/components/ui/select.tsx` (used the in-file `<Select>` component already present in `FilterBar.jsx` — visually consistent with Channel/Platform filters)
- `/app/memory/final/*` ✅ (per playbook)
- Any other report filter or unrelated CR file ✅ (per task brief)

---

## 3. Exact diffs (essence)

### 3.1 `FilterBar.jsx` — `PAYMENT_GATEWAY_OPTIONS` export

```diff
- const PAYMENT_GATEWAY_OPTIONS = [
-   { value: null, label: 'All' },
-   { value: 'gateway', label: 'PG' },
- ];
+ const PAYMENT_GATEWAY_OPTIONS = [
+   { value: 'nonGateway', label: 'Non-PG' },
+   { value: 'gateway',    label: 'PG' },
+ ];
```

The in-file `<Select>` component renders `placeholder` as the first row inside the panel (and emits `null` when clicked) — so the 3 visible options become **ALL** (placeholder, value `null`) + **Non-PG** + **PG** without `null` being in the options array.

### 3.2 `FilterBar.jsx` — UI swap

```diff
- <div role="group" data-testid="filter-payment-gateway" ...>
-   <span>Payment Gateway</span>
-   {PAYMENT_GATEWAY_OPTIONS.map((opt) => {
-     // ... 2-checkbox toggle logic ...
-   })}
- </div>
+ <Select
+   value={filters.paymentGateway}
+   options={PAYMENT_GATEWAY_OPTIONS}
+   onChange={(val) => onFilterChange('paymentGateway', val)}
+   placeholder="ALL"
+   testId="filter-payment-gateway"
+ />
```

`testId="filter-payment-gateway"` is preserved verbatim from the previous block — existing automation that targets this testid continues to work.

### 3.3 `AllOrdersReportPage.jsx` — predicate (locked item 7)

```diff
- if (filters.paymentGateway === 'gateway') {
-   result = result.filter(o => o.isPaymentGateway === true);
- }
+ if (filters.paymentGateway === 'gateway') {
+   result = result.filter(o => o.isPaymentGateway === true);
+ } else if (filters.paymentGateway === 'nonGateway') {
+   result = result.filter(o => o.isPaymentGateway !== true);
+ }
```

The Non-PG predicate uses `!== true` (not `=== false`) so it covers both explicit `false` and missing/null `isPaymentGateway` values — i.e. PG ∪ Non-PG = ALL with no row leaks (asserted in test §4 case 4).

### 3.4 `OrderTable.jsx` — predicate (no logic change)

```diff
- // PG Order Id + PG Amount appear whenever the PG filter is active.
+ // PG Order Id + PG Amount appear whenever the PG filter is narrowed to
+ // gateway-only rows. POS2-006: 'nonGateway' narrowed rows have no
+ // Razorpay IDs to display, so PG columns stay hidden. ALL likewise hides.
  const pgFilterActive = filters.paymentGateway === 'gateway';
```

Logic intentionally unchanged: `pgFilterActive === 'gateway'` is the only branch that enables PG-specific columns, which is exactly the locked behaviour.

### 3.5 `FilterTags.jsx` — comment update only

The existing `PAYMENT_GATEWAY_OPTIONS.find(o => o.value === value)?.label` lookup automatically resolves `'nonGateway'` to "Non-PG" because the options export now includes that value. The comment was updated to document the tri-state; no logic change.

---

## 4. Validation

| # | Gate | Command | Result |
|---|---|---|---|
| 1 | New focused test suite (PG dropdown) | `yarn test --testPathPattern='PGFilterDropdown'` | **19/19 tests pass** ✅ |
| 2 | Full unit-test suite (regression) | `yarn test --watchAll=false` | **24/24 suites · 310/310 tests pass** ✅ |
| 3 | Production build | `yarn build` | **`Compiled successfully`** in 26.06s ✅ |
| 4 | Bundle size | (vs pre-change baseline 434.04 kB) | ~434.0 kB (no measurable delta) ✅ |
| 5 | testId compatibility | `data-testid="filter-payment-gateway"` preserved | ✅ existing automation continues to work |
| 6 | `/app/memory/final/*` integrity | `ls -la /app/memory/final/` (no edits) | ✅ untouched |

### 4.1 Test coverage matrix

| Locked item | Tests covering | Pass |
|---|---|---|
| 1. Replace checkbox with dropdown | §2 — "renders the PG dropdown trigger" | ✅ |
| 2. Options ALL / Non-PG / PG | §1 export shape; §2 "panel with 3 choices" | ✅ |
| 3. Visible across all tabs | §5 — re-render with `activeTab` paid/hold/cancelled/aggregator/running | ✅ |
| 4. No reset on tab change | §5 — `onChange` not called when only `activeTab` changes | ✅ |
| 5. Selection persists across tabs | §5 — both PG and Non-PG verified across 4 tab changes | ✅ |
| 6. Default = ALL | §2 — "default state displays ALL placeholder" | ✅ |
| 7. Non-PG enabled in filtering | §4 — predicate parity tests for PG, Non-PG, ALL + union-completeness | ✅ |
| 8. Existing filters keep working | §2 renderBar with mixed `filters` keys; §3 chip removes only the PG filter; full-suite regression 310/310 | ✅ |
| 9. No BE-flag inference (always-visible) | `profileTransform.js` + `RestaurantContext.jsx` not edited; FilterBar has no visibility predicate | ✅ |

### 4.2 Test-suite breakdown for PGFilterDropdown.test.jsx

| Block | Cases |
|---|---:|
| §1 PAYMENT_GATEWAY_OPTIONS export | 1 |
| §2 FilterBar dropdown rendering | 8 |
| §3 FilterTags chip rendering | 4 |
| §4 row-narrowing predicate | 4 |
| §5 selection persists across tab change | 2 |
| **Total** | **19** |

---

## 5. Notes for next agent / QA

### 5.1 Why a 4th source file (`AllOrdersReportPage.jsx`) was edited

The task brief listed 3 expected source files (`FilterBar.jsx`, `OrderTable.jsx`, `FilterTags.jsx`) + a test file. **Locked item 7** ("Non-PG branch must be enabled in filtering logic") could not be satisfied within those 3 files alone — the row-narrowing predicate for `filters.paymentGateway` lives in `AllOrdersReportPage.jsx:429-436`, not in any reports component. Without the `nonGateway` branch added there, selecting "Non-PG" would render the chip but the order list would not narrow.

The change is minimal (1 `else if` branch + comment) and is **strictly scoped to the existing PG predicate block** — no other filter (status, paymentMethod, channel, platform) is touched, in compliance with task-brief item *"Do not change other report filters"*.

This is documented inline in the file's comment and again here for traceability.

### 5.2 Live smoke recommendations (non-blocking)

When QA or owner runs the live preprod app at `https://insights-phase.preview.emergentagent.com`:

1. Open the All Orders Report page.
2. **Visual:** Verify the Payment Gateway control is now a dropdown (not 2 checkboxes); default reads "ALL".
3. **Tab visibility:** Switch through Paid / Cancelled / Hold / Running / Aggregator / All / Audit / Credit / Merged tabs — dropdown should appear on every tab.
4. **Persistence:** Select "PG"; switch tabs — selection should still read "PG"; chip should still appear.
5. **PG filter:** Select "PG"; verify only PG-paid rows appear (matches behaviour pre-change).
6. **Non-PG filter (NEW):** Select "Non-PG"; verify all rows without Razorpay IDs appear, and PG-specific columns (PG Order Id / PG Amount / PG Status) do NOT show (because Non-PG rows have no PG IDs).
7. **Chip removal:** Click the X on the PG/Non-PG chip; selection resets to ALL; rows expand back to full list.

### 5.3 Backend follow-up (optional, micro-CR scale)

Per locked item 9, the dropdown stays visible regardless of tenant PG configuration. If the backend later adds a reliable `is_razorpay` (or equivalent) flag to `/profile`, a small follow-up (~5-10 LOC) can:

1. Map the flag in `profileTransform.js` → `restaurant.hasPaymentGateway`.
2. Expose it from `RestaurantContext`.
3. Wrap the `<Select>` in a `{hasPaymentGateway && ...}` predicate in `FilterBar.jsx`.

No code change is needed today; this is a future enhancement only.

---

## 6. Risks / loose ends

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R-1 | Tenants who previously relied on the 2-checkbox keyboard pattern (Tab + Space to toggle) may need a moment to acclimatise to the dropdown | Low | UI is conventional shadcn-style dropdown (matches Channel / Platform filters); accessibility is preserved via `<button>` semantics on the trigger. |
| R-2 | The Non-PG predicate uses `isPaymentGateway !== true` which includes rows where the field is missing | None — by design | Test §4 case 4 asserts PG ∪ Non-PG = ALL and is non-overlapping. The contract is "PG = explicitly true; everything else = Non-PG", which is what operators expect. |
| R-3 | Bundle-size change | None | No measurable delta vs pre-change (~434.0 kB main bundle); the deleted 2-checkbox block is replaced by reuse of the existing in-file `<Select>` component. |
| R-4 | Future agent re-shadowing the previous CR-001 Phase 2 retire-of-tri-state | Low | Comment block in FilterBar.jsx PAYMENT_GATEWAY_OPTIONS now documents POS2-006 as the latest decision; CR-001 Phase 2 retirement is superseded. |
| R-5 | testId stability for downstream automation (Cypress / Playwright) | Low | `data-testid="filter-payment-gateway"` preserved on the trigger button. The previous `filter-pg-all` / `filter-pg-pg` per-checkbox testids no longer exist (those checkboxes are gone). Any test that targeted those will need updating to interact with the dropdown trigger + click panel rows by visible text — same pattern used by the new test suite. |

---

## 7. Final verdict

> ## `implementation_complete_ready_for_QA`

- 4 source files + 1 new test file edited; 4th source-file edit (`AllOrdersReportPage.jsx`) explicitly justified to satisfy locked item 7 (no scope creep).
- 19 new focused tests + 24/24 suites green + 310/310 total tests pass.
- Production build clean; no bundle-size regression.
- All 9 locked items verified at unit-test level; locked item 9 satisfied by leaving `profileTransform.js` and `RestaurantContext.jsx` untouched.
- testId on the Select trigger preserved for downstream automation continuity.
- No edits to `/app/memory/final/`, no touch to other CRs.

### Next action items
- **Owner / QA:** run the §5.2 live-smoke checklist on the running app at convenience (visual + tab persistence + PG / Non-PG narrowing + chip remove). Non-blocking.
- **Backlog (optional):** if backend later ships `is_razorpay` (or equivalent) on `/profile`, spawn a ~5-10 LOC follow-up to conditionally hide the dropdown for PG-disabled tenants per locked item 9 second clause.

---

— End of POS2-006-PG-FILTER-DROPDOWN Implementation Summary 2026-05-09 —
