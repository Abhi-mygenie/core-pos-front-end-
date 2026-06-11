# POS2-002 Phase 3.1 — Live Platform Counter Chip Implementation Summary

> **Sprint:** pos2.0
> **CR ID:** POS2-002 Phase 3.1 (sub-CR of Phase 3)
> **Date:** 2026-05-10
> **Predecessor:** Phase 3 header dropdown (shipped 2026-05-10, same day)
> **Approved scope:** owner-locked; visual reference attached as `Screenshot 2026-05-10 at 6.03.49 PM.png`.
> **Status:** ✅ `implementation_complete_ready_for_QA`

---

## 1. Scope (verbatim from owner approval)

A read-only "Web N · POS M" pulse chip rendered in the dashboard header, immediately to the LEFT of the search box. Surfaces live counts of currently in-context running orders by platform.

Owner-locked decisions:
1. **Placement:** left of search, inside the right-aligned cluster, with a `mr-3` gap before the search container.
2. **Format:** single pill, two segments separated by a center dot (`Web 4 · POS 17`).
3. **Counting scope:** "everything in context that shows on the dashboard" = respects status chips + channel column hide + search.
4. **Independence guarantee:** counter IGNORES the Platform dropdown itself (Option B — prevents `Web 4 · POS 0` circular artifact).
5. **Color coding:** brand-colored dots — green `#3DAB4E` for Web, brand orange `#F26522` for POS (matches Add button).
6. **Excluded from count:** terminal statuses (3 cancelled, 6 paid) and rows without an `orderId`.
7. **Read-only:** no click handler; pure information radiator.
8. **Layout stable when zero:** numeric labels dim instead of the chip collapsing.

### Explicit non-goals

- ❌ Click-to-filter shortcut (chip is read-only in v1)
- ❌ Auto-hide when both = 0
- ❌ Trend / sparkline / delta indicator
- ❌ Any change to cards, payloads, socket flows, or `/app/memory/final/*`

---

## 2. Files changed

| # | File | Type | Net lines | Purpose |
|---|---|---|---|---|
| 1 | `frontend/src/components/layout/PlatformCounterChip.jsx` | **NEW** | +110 | Pure presentational pill + `computePlatformCounts` purefn helper + `BRAND_COLOR_WEB` / `BRAND_COLOR_POS` exports. |
| 2 | `frontend/src/components/layout/Header.jsx` | EDIT | +13 | Imports `PlatformCounterChip`; accepts `webCount` / `posCount` props (defaulted to 0); renders the chip immediately before the search container with `mr-3` gap. |
| 3 | `frontend/src/pages/DashboardPage.jsx` | EDIT | +81 | Imports `computePlatformCounts`; new `platformCounts` `useMemo` deriving `{ web, pos }` from raw order arrays + view-aware status / channel filters + search filter. Threads counts to `<Header>`. |
| 4 | `frontend/src/__tests__/components/layout/PlatformCounterChip.test.jsx` | **NEW** | +220 | 24 focused Jest tests — brand colors, render, dimmed zero state, default props, purefn bucketing, terminal exclusion, future-BE classification, idempotence, independence guarantee, composition with status filter. |

**Total:** 2 new files, 2 edited files. Backwards-compatible (Header props default to 0; older callers won't break).

### What stays untouched (verified)

- ✅ `PlatformDropdown.jsx` — Phase 3 dropdown not modified
- ✅ `OrderCard.jsx`, `TableCard.jsx`, `DeliveryCard.jsx`, `DineInCard.jsx` — no card-tier change
- ✅ `orderTransform.js`, `CollectPaymentPanel.jsx`, socket handlers
- ✅ `/app/memory/final/*`

---

## 3. Implementation detail

### 3.1 `PlatformCounterChip.jsx` — component + purefn helper

Two exports plus a default:

```js
export const BRAND_COLOR_WEB = '#3DAB4E';     // brand green
export const BRAND_COLOR_POS = '#F26522';     // brand orange (Add button)
export const computePlatformCounts = (orders) => { web, pos };
export default PlatformCounterChip;
```

The chip is purely presentational — both numbers are passed in by the parent. The pure function is the single source of truth for counting and is consumed by:
- `DashboardPage.jsx` `useMemo` (production code path)
- `PlatformCounterChip.test.jsx` (test path)

Bucketing rules (locked):
- `web` = `orderFrom === 'web'` (i.e. `isWebOrder === true`)
- `pos` = everything else, including undefined / unknown future BE values like `aggregator`, `kiosk`

Skip rules:
- No `orderId` → empty tables / available rooms; not counted
- `fOrderStatus ∈ {3, 6}` → terminal (cancelled / paid); not counted

Defensive guards:
- Non-array input → `{ web: 0, pos: 0 }` (no throw)
- Function arity is exactly 1 → enforced by `independence guarantee` test (any future refactor that tries to thread filter state through this helper fails fast)

Visual contract:
- Container: `inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-medium`
- Two color dots (`w-2 h-2 rounded-full`) with brand colors set via inline `style={{ backgroundColor }}`
- Dimmed zero state: text becomes `text-zinc-400` (vs default `text-zinc-700`)
- Accessibility: `role="status"` + `aria-label="N running web orders, M running POS orders"` for screen readers; decorative dots marked `aria-hidden="true"`

### 3.2 `Header.jsx` insertion

Inserted into the `Center Section - Search` flex container as a sibling immediately before the search input wrapper. Wrapped in a thin `flex items-center mr-3` div so the chip vertically centers with the search bar and gets a 12px gap.

Header now accepts `webCount = 0` / `posCount = 0` with safe defaults — older call sites still render the chip harmlessly with `Web 0 · POS 0`.

### 3.3 `DashboardPage.jsx` `platformCounts` useMemo

Defines three view-aware predicates inside the memo:

| Predicate | Channel view | Status view |
|---|---|---|
| `statusOk(fOrderStatus)` | order's status must be in `activeStatuses` (chips pick) | order's status must NOT be in `hiddenStatuses` (column hide) |
| `channelOk(orderType)` | order's channel must NOT be in `hiddenChannels` (column hide) | order's channel must be in `activeChannels` (chips pick) |
| `searchOk(order)` | substring match on `orderNumber` / `customer` / `orderId` if `searchQuery` set; pass-through otherwise |

Applied to the union of `walkInOrders + takeAwayOrders + deliveryOrders + dineInOrders` (each tagged with its channel id; walkIn rolls up under `dineIn`). Result is fed to `computePlatformCounts` which handles the final orderId + terminal-status cleanup and bucketing.

Dependencies tracked: `walkInOrders, takeAwayOrders, deliveryOrders, dineInOrders, activeStatuses, activeChannels, hiddenStatuses, hiddenChannels, dashboardView, searchQuery`.

**Notably absent:** `platform` is NOT in the dependency array — independence guarantee enforced at the call site (counter does not re-compute when only the dropdown changes).

---

## 4. Tests run

### 4.1 New Phase 3.1 tests — `PlatformCounterChip.test.jsx`

**24 tests, all passing**, organized in 3 suites:

| Suite | Tests | Coverage |
|---|---|---|
| `brand color exports` | 2 | Locks `#3DAB4E` (Web) and `#F26522` (POS) — protects the brand contract. |
| `PlatformCounterChip rendering` | 9 | Both segments render, `data-count` attributes, `aria-label`, brand-dot colors, dimmed zero state per side, layout stability when both = 0, default props back-compat. |
| `computePlatformCounts purefn` | 13 | Empty/null defensive guards, `orderId` exclusion, status-3 + status-6 exclusions, Web bucketing, POS bucketing for unknown future BE values, nested `order.orderFrom` reading, top-level precedence, mixed scenario, idempotence, independence guarantee (function arity = 1), composition with status filter. |

```
PASS  src/__tests__/components/layout/PlatformCounterChip.test.jsx
Tests:       24 passed, 24 total
Time:        1.261 s
```

### 4.2 Full Jest regression sweep

```
yarn test --watchAll=false
Test Suites: 28 passed, 28 total
Tests:       397 passed, 397 total
Time:        3.093 s
```

Was 373 passing pre-Phase-3.1 → now 397. **Zero regressions, +24 net tests.**

### 4.3 Lint

```
ESLint ✅ PlatformCounterChip.jsx        — No issues found
ESLint ✅ Header.jsx                      — No issues found
ESLint ✅ DashboardPage.jsx               — No issues found
ESLint ✅ PlatformCounterChip.test.jsx    — No issues found
```

### 4.4 Smoke test

Frontend boots cleanly. Login screen renders without console errors after the changes. Deeper authenticated dashboard render is exercised via the Jest suite + the static purefn coverage.

---

## 5. Owner verification checklist (post-merge)

| # | Action | Expected |
|---|---|---|
| 1 | Fresh login, busy dashboard | Chip appears left of search reading `● Web N · ● POS M` with brand dots |
| 2 | Pick `Platform = Web` in dropdown | Chip numbers UNCHANGED (independence guarantee) |
| 3 | Pick `Platform = POS` in dropdown | Chip numbers UNCHANGED |
| 4 | Toggle off "YTC" status chip | Web/POS numbers DECREASE by the YTC count for that platform |
| 5 | Hide the Delivery channel column | Web/POS numbers DECREASE by the delivery count for that platform |
| 6 | Type a query that narrows results | Chip numbers track the search-narrowed pool |
| 7 | Pay an order (status → 6) | Count for that platform drops by 1 |
| 8 | Cancel an order (status → 3) | Count for that platform drops by 1 |
| 9 | All orders cleared | Chip reads `Web 0 · POS 0` with both numbers dimmed |
| 10 | Card-level visual diff | Cards unchanged from Phase 3 (no badge regression) |
| 11 | aria-label spot check (devtools) | Live region announces `"N running web orders, M running POS orders"` |

---

## 6. Risk surface

- **Risk: low.** Pure additive — no new API call, no new socket subscription, no new state machine. `useMemo` derives from already-loaded order arrays.
- **Edge cases covered:** empty/null input, missing `orderFrom`, missing nested `order`, future BE values, terminal statuses, both counts = 0.
- **Backwards compat:** Header props default to `0`; if the parent ever stops passing them, chip still renders `Web 0 · POS 0` harmlessly.

---

## 7. Final verdict

> ## ✅ `implementation_complete_ready_for_QA`

Phase 3.1 ships clean:
- 2 new files (`PlatformCounterChip.jsx` + its test file)
- 2 edited files (`Header.jsx` + `DashboardPage.jsx`)
- 24 new Jest tests, **397 total passing, zero regressions**
- ESLint clean across all 4 touched files
- Smoke test passing
- Cards explicitly untouched

After QA sign-off Phase 3.1 is closed; Phase 4 (Scan & Order auto-pop-out) remains queued behind owner answers to OQ-5 / OQ-12 / BE-Q-NEW-1/2.

---

— End of POS2-002 Phase 3.1 Implementation Summary 2026-05-10 —
