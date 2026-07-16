# POS2-002 Phase 3 — Header Platform Dropdown Implementation Summary

> **Sprint:** pos2.0
> **CR ID:** POS2-002 Phase 3 of 4
> **Date:** 2026-05-10
> **Predecessors shipped:** Phase 1 (`orderFrom`/`isWebOrder` mapping, 2026-05-09) + Phase 2 (web delivery-charge lock, 2026-05-09)
> **Approved scope:** UX proposal revised 2026-05-10 — header-only; cards untouched.
> **Status:** ✅ `implementation_complete_ready_for_QA`

---

## 1. Scope (verbatim from owner approval)

1. Add Platform dropdown in the dashboard header only.
2. Insert it after the status chips and before the search section, with the proposed 1px vertical divider.
3. Options: `Platform: All` (default), `POS`, `Web / Scan`.
4. Default = `Platform: All` (`value === null`).
5. Filtering:
   - `null` (All) → no platform/source filtering
   - `'pos'` → `orderFrom !== 'web'` (future-proof against `aggregator` / `kiosk`)
   - `'web'` → `orderFrom === 'web'` (i.e. `isWebOrder === true`)
6. Composes (AND) with status chips, channel column, and search.
7. Active visual cue when POS or Web / Scan is selected (zinc-900 dark pill).
8. Cards untouched — no edits to `OrderCard`, `TableCard`, `DeliveryCard`, `DineInCard`; no badges added.
9. New `PlatformDropdown.jsx` component (self-contained).
10. Jest tests for: options, default, filtering, persistence, composition with existing filters.

### Explicit non-goals (per owner instruction)

- ❌ Phase 4 pop-out — not implemented.
- ❌ Card badges — not implemented; cards are byte-identical to pre-Phase-3.
- ❌ Delivery-charge logic — untouched (Phase 2 territory).
- ❌ Socket behaviour — untouched.
- ❌ `/app/memory/final/*` — not edited.

---

## 2. Files changed

| File | Type | Lines net | Purpose |
|---|---|---|---|
| `frontend/src/components/layout/PlatformDropdown.jsx` | **NEW** | +99 | Self-contained shadcn-style 3-option dropdown. Exports `PLATFORM_OPTIONS`. |
| `frontend/src/components/layout/Header.jsx` | EDIT | +12 | Imports `PlatformDropdown`; accepts `platform` / `setPlatform` props (defaulted, so older callers still work); renders dropdown after `</nav>` with a `border-l` divider, before the search container. |
| `frontend/src/pages/DashboardPage.jsx` | EDIT | +28 | Adds `platform` state (`useState(null)`); applies `platformMatches` predicate inside `channelData` and `statusData` `useMemo` blocks; threads `platform` / `setPlatform` to `<Header>`. |
| `frontend/src/__tests__/components/layout/PlatformDropdown.test.jsx` | **NEW** | +220 | 20 focused Jest tests — options export, render, default, click behaviour, active state, persistence, predicate parity, AND composition. |

**Total:** 2 new files, 2 edited files. No file deleted. No legacy shim added.

### What was NOT touched (verified)

- `OrderCard.jsx` — unchanged.
- `TableCard.jsx` — unchanged.
- `DeliveryCard.jsx`, `DineInCard.jsx`, all card-tier components — unchanged.
- `orderTransform.js` — unchanged (Phase 1's `orderFrom`/`isWebOrder` already in place).
- `CollectPaymentPanel.jsx` — unchanged (Phase 2 delivery lock untouched).
- `socketHandlers.js`, `useSocket*` — unchanged.
- `/app/memory/final/*` — unchanged.

---

## 3. Implementation detail

### 3.1 New component — `PlatformDropdown.jsx`

- Self-contained, no external state machine. Controlled component: `value` (one of `null`, `'pos'`, `'web'`) + `onChange` callback.
- Click-outside-closes panel via `useEffect` + `mousedown` listener (mirrors `FilterBar.jsx` Select pattern).
- Trigger label always reads `Platform: <value>` so the active filter is visible at a glance even when collapsed.
- Visual contract:
  - Default (value === null): `bg-white border-zinc-300 text-zinc-600` — neutral.
  - Active (value !== null): `bg-zinc-900 border-zinc-900 text-white` — dark pill, mirrors the POS2-006 PG dropdown.
  - Open: `bg-white border-zinc-950 ring-1 ring-zinc-950` — same focus ring as PG dropdown.
- `data-active` attribute exposes the active flag for tests + automation.
- Test IDs:
  - `dashboard-platform-filter` — trigger button.
  - `dashboard-platform-filter-panel` — open dropdown panel.
  - `dashboard-platform-filter-option-{all|pos|web}` — three option buttons.
- Exports: `default PlatformDropdown` + named `PLATFORM_OPTIONS` (consumed by tests; future migrations can re-use it without re-typing the values).

### 3.2 `Header.jsx` insertion

Inserted **between** the closing `</nav>` of the chip row (L290 pre-edit) and the opening of the `Center Section - Search` (L294 pre-edit). Dropdown sits inside a `pl-3 ml-1 border-l` wrapper using `COLORS.borderGray` for the 1px divider, satisfying the proposal's "vertical divider separates orthogonal axes" rule.

Header now accepts two new props with safe defaults:

```jsx
platform = null,
setPlatform = () => {}
```

Older call sites (if any) still work — the dropdown silently no-ops. The dashboard call site (`pages/DashboardPage.jsx` L1442–1443) passes the controlled state.

### 3.3 `DashboardPage.jsx` predicate

Defined inline inside both `channelData` and `statusData` `useMemo` blocks (kept local — no extracted helper, per "no over-engineering" rule). Predicate is the exact one-liner from the proposal:

```js
const platformMatches = (item) => {
  if (platform === null) return true;
  const orderFrom = item.order?.orderFrom ?? item.orderFrom;
  if (platform === 'pos') return orderFrom !== 'web';
  if (platform === 'web') return orderFrom === 'web';
  return true;
};
```

- Reads from `item.order.orderFrom` for nested shapes (dineIn enriched tables, room rows) and falls back to top-level `item.orderFrom` for adapted shapes (walkIn/takeAway/delivery).
- Empty/available rows (no `orderFrom`) classify as `pos` (visible under "All" + "POS", hidden under "Web / Scan"). Tested via `platformMatches predicate › empty/available rows...`.
- Future BE values like `'aggregator'` / `'kiosk'` correctly classify as POS-side until they get their own dropdown row in Phase 3 v2 — verified via `platform === "pos" → every non-web order...`.
- Applied **after** `statusMatchesFilter` so the AND composition order is `status → platform`. Idempotent in either order, but this matches the visual flow operators expect.

`platform` added to both `useMemo` dep arrays so re-filter happens when the dropdown changes.

### 3.4 Persistence

Lives in `DashboardPage` `useState`. Persists across:
- ✅ Tab switches (channel ↔ status view) — same component tree.
- ✅ Filter chip changes — re-renders, state preserved.
- ✅ Search query typing — state preserved.

Resets on:
- 🔄 Full page reload (no localStorage in v1, owner-locked).
- 🔄 Logout / re-login (DashboardPage unmounts).

---

## 4. Tests run

### 4.1 New Phase 3 tests — `PlatformDropdown.test.jsx`

**20 tests, all passing**, organized in 3 suites:

| Suite | Tests | Coverage |
|---|---|---|
| `PLATFORM_OPTIONS export` | 1 | Validates the exported array shape (3 entries, exact values + labels). |
| `PlatformDropdown rendering & default state` | 10 | Default label, panel closed, open-on-click, all 3 options visible, click POS/Web/All emits correct value, active visual cue, persistence across re-render, selected-option highlight. |
| `platformMatches predicate` | 9 | All 3 branches (null/pos/web), nested vs top-level `orderFrom`, empty rows behaviour, unknown-future-BE-value classification, AND composition with status filter, idempotence. |

```
PASS  src/__tests__/components/layout/PlatformDropdown.test.jsx
Tests:       20 passed, 20 total
Time:        0.955 s
```

### 4.2 Full Jest regression sweep

```
yarn test --watchAll=false
Test Suites: 27 passed, 27 total
Tests:       373 passed, 373 total
Time:        3.032 s
```

Was 353 passing pre-Phase-3 → now 373. **Zero regressions, +20 net tests.**

### 4.3 Lint

```
ESLint ✅ PlatformDropdown.jsx        — No issues found
ESLint ✅ Header.jsx                   — No issues found
ESLint ✅ DashboardPage.jsx            — No issues found
ESLint ✅ PlatformDropdown.test.jsx    — No issues found
```

### 4.4 Smoke test

Frontend loads cleanly, login screen renders without console errors after the changes (deeper dashboard render is gated by auth — exercised via the Jest predicate + integration tests).

---

## 5. Owner verification checklist

| # | Check | Where to verify | Expected |
|---|---|---|---|
| 1 | Dropdown is visible after Served chip with a divider | Dashboard header, top-left band | `Platform: All ▾` button between status chips and search |
| 2 | Default state is "Platform: All" | Fresh login | Trigger reads `Platform: All`, default neutral colour |
| 3 | Selecting POS narrows out web orders | Open dropdown → POS | Web/Scan cards disappear from every channel column |
| 4 | Selecting Web / Scan shows only web orders | Open dropdown → Web / Scan | Only web-origin orders visible; empty tables disappear |
| 5 | Active visual cue | Selecting POS or Web | Trigger turns dark (zinc-900 bg, white text) |
| 6 | Composition with status chips | YTC + Web / Scan | Only `isWebOrder && fOrderStatus === 7` rows visible |
| 7 | Composition with channel column | Delivery + Web / Scan | Only delivery + web rows visible |
| 8 | Persistence across tab switch | Pick Web → switch Channel→Status view | Filter survives the switch |
| 9 | Reset on reload | Pick POS → F5 | Drops back to `Platform: All` |
| 10 | Cards unchanged | Visual diff against pre-Phase-3 | No card visual change for POS or Web orders |

---

## 6. Risk surface

- **None high-risk.** Filter is additive: `null` short-circuits to `return true`, so default behaviour is byte-identical to pre-Phase-3.
- **Edge case covered:** items with neither `order.orderFrom` nor top-level `orderFrom` (empty tables) classify as POS — tested.
- **Future BE values:** `aggregator`, `kiosk`, etc. classify as POS-side until they get their own option — tested.
- **Deps:** No new package added. No deprecation. No backend contract change.

---

## 7. Final verdict

> ## ✅ `implementation_complete_ready_for_QA`

Header-only Phase 3 ships clean:
- 2 new files (`PlatformDropdown.jsx` + its test file)
- 2 edited files (`Header.jsx` + `DashboardPage.jsx`)
- 20 new Jest tests, 373 total passing, zero regressions
- Lint clean across all 4 touched files
- Smoke test passing
- Cards explicitly untouched per owner directive

After QA sign-off Phase 3 is closed; Phase 4 (Scan & Order auto-pop-out) remains queued behind owner answers to OQ-5 / OQ-12 / BE-Q-NEW-1/2.

---

— End of POS2-002 Phase 3 Implementation Summary 2026-05-10 —
