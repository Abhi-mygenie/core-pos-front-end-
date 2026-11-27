# BUG-703 — Impact Analysis (Gate 2) — Aggregator expand no-op in Table/Channel mode (POS-3) — REOPENED 2026-11-20

**Role:** PLANNING (Gate 2) · **Date:** 2026-11-20 · **Type:** BUG / FE_BUG · **Priority:** P0 (tracker) / Risk **MEDIUM**
**Status:** REOPENED — prior "IMPLEMENTED 2026-11-19" fix landed in the **inactive** layout. This doc supersedes the earlier IA.

## Code Reality: PARTIAL (handler/state/popout exist; live layout not wired)
Confirmed against source (`USE_CHANNEL_LAYOUT = true`, `constants/featureFlags.js:20`):
- EXISTS & correct: `pages/DashboardPage.jsx:485` `aggregatorViewOrder` state; `:1479` `handleAggregatorView`; `:1950` `<AggregatorOrderPopOut viewOrder={aggregatorViewOrder} />`.
- EXISTS: `TableCard.jsx:59` accepts `onAggregatorView`; `:317` `onClick … isAggregator ? (table.order ? () => onAggregatorView?.(table.order) : …)` — tap handler present; `:869` PropTypes.
- WIRED only to the **inactive** grid path: `onAggregatorView={handleAggregatorView}` passed to the `TableSection` mounts at `DashboardPage.jsx:2124 / :2156 / :2191`; `TableSection.jsx:6/:52` forwards to its `TableCard`.
- **BREAK POINT:** the **live** layout `ChannelColumnsLayout` (rendered at `DashboardPage.jsx:2048`) is **not passed** `onAggregatorView`, and `ChannelColumnsLayout` → `ChannelColumn` do not forward it to their `TableCard`. In channel mode `onAggregatorView` is `undefined` → `TableCard.jsx:317` optional-call is a **no-op**.

## Conflict Pre-Check
| File | Overlap | Note |
|---|---|---|
| `pages/DashboardPage.jsx` (**R5 hotspot**) | CR-547, CR-552, CR-525 open on same file | single additive prop at `:2048`; low collision but coordinate |
| `components/dashboard/ChannelColumnsLayout.jsx` | none open | add prop passthrough |
| `components/dashboard/ChannelColumn.jsx` | BUG-591 (shipped) | add prop forward to TableCard |

## Affected files (WILL change — Gate 3 pins lines)
1. `DashboardPage.jsx:2048` — pass `onAggregatorView={handleAggregatorView}` to `<ChannelColumnsLayout>`.
2. `ChannelColumnsLayout.jsx` — destructure `onAggregatorView` and forward to each `<ChannelColumn>`.
3. `ChannelColumn.jsx` — forward `onAggregatorView` to each `<TableCard>`.

## WILL NOT touch
`TableCard.jsx` (already supports the prop), `handleAggregatorView` logic, `AggregatorOrderPopOut`, state, the old `TableSection` path (leave as-is), any payload/socket/transform.

## Downstream / regression
Non-aggregator and engaged tiles unchanged (branch at `TableCard.jsx:317` preserved). Verify: in channel mode, tap an accepted aggregator tile → `AggregatorOrderPopOut` opens read-only; aggregator-without-order stays a no-op; grid/non-channel path still works.

## Risk register
MEDIUM: touches shared dashboard layout wiring (R5 DashboardPage). Pure prop threading, no logic. Browser-verify with `poki@macha.com` (aggregator-in-table repro).

## Next
Short Gate 3 plan (3 files, prop threading) → implement → browser verify. No code changed this gate.
