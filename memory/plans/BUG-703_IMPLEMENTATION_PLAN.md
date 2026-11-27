# BUG-703 — Gate 3 Implementation Plan — Aggregator expand no-op in channel layout (POS-3) — REOPENED

**Risk:** MEDIUM · **Decisions:** none pending · **Dependency:** none · Code-verified against current `main`. Supersedes any prior plan.

## Root cause (confirmed)
Live path `ChannelColumnsLayout → ChannelColumn → TableCard` never receives `onAggregatorView`. Both layout components forward `onAggregatorReady`/`onAggregatorDispatch` but **not** `onAggregatorView`; `TableCard:317` therefore gets `undefined` → tap is a no-op. Handler/state/popout already exist (`DashboardPage.jsx:1479 handleAggregatorView`, `:485 aggregatorViewOrder`, `:1950 <AggregatorOrderPopOut>`).

## Exact edits (3 files, additive prop threading only)
**1. `components/dashboard/ChannelColumn.jsx`**
- Props destructure (~line 52, after `onAggregatorDispatch,`): add `onAggregatorView,`
- TableCard render (~line 337, after `onAggregatorDispatch={onAggregatorDispatch}`): add `onAggregatorView={onAggregatorView}`

**2. `components/dashboard/ChannelColumnsLayout.jsx`**
- Props destructure (~line 74, after `onAggregatorDispatch,`): add `onAggregatorView,`
- `<ChannelColumn>` render (~line 214, after `onAggregatorDispatch={onAggregatorDispatch}`): add `onAggregatorView={onAggregatorView}`

**3. `pages/DashboardPage.jsx`** (ChannelColumnsLayout block starting `:2048`)
- Add `onAggregatorView={handleAggregatorView}` alongside the existing `onAggregatorReady`/`onAggregatorDispatch` props.

## Verification matrix
| Case | Expected |
|---|---|
| Channel/table mode, tap accepted aggregator tile (`poki@macha.com`, order with `table.order`) | `AggregatorOrderPopOut` opens read-only |
| Aggregator tile with NO order | still a no-op (branch at TableCard:317 preserved) |
| Non-aggregator table tile | normal open-modal unchanged |
| Grid/non-channel layout (TableSection) | unchanged (still works) |
| Order-view (OrderCard) aggregator | unchanged |

## Regression / rollback
Pure additive props — no logic touched. Rollback = revert the 3 prop additions. No backend, transform, or payload change.
