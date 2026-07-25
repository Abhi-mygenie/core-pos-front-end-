# BUG-125 — Implementation Plan (Gate 3)

**Date:** 2026-06-11 · **Decisions:** H1 = option b (status-3, Merge guard kept) · Workstream A

## Scope (LOCKED)
One classification change in `CancellationsMockup.jsx` only. No other file.

## Change
`frontend/src/pages/reports-module/CancellationsMockup.jsx` (~line 234):
```js
// BEFORE
const isOrderCancelled = pm === 'cancelled';
// AFTER (H1=b: status-based, same predicate as deriveOrderStatus; Merge rows
// already excluded upstream by the screen's merge guard — KEEP that guard)
const isOrderCancelled = ot.f_order_status === 3 || pm === 'cancel' || pm === 'cancelled';
```

## Expected number shifts (harness-verified targets)
- Total loss & qty: UNCHANGED (scope is a partition)
- Palm House May: order-scope qty 0 → ~392; Item-Level reduces by same
- cafe103: order-scope fills similarly (41 Cancel orders Mar–Jun)

## QA (H33 harness rule)
`/app/audit_data/analyze.py` cancellations replica: post-fix screen Order-Level totals must equal replica `order_scope` values to the rupee, all 4 months, both restaurants. Merged orders must NOT appear (Merge guard regression check).

## Freeze-log
Cancellations screen (S9): per-screen amendment presented at Gate 4 (H34).

## Rollback
Single-line revert.
