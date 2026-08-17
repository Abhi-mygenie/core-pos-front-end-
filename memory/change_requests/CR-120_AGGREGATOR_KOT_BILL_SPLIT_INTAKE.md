# CR-120 — Aggregator: Split KOT/Bill Buttons by Order Status

**ID:** CR-120
**Type:** CR
**Priority:** P2
**Risk:** LOW
**Area:** Components → OrderCard.jsx
**Sprint:** pos_5_0
**Intake Date:** 2026-07-31
**Gate:** 0-1
**Source:** INVESTIGATION (Aggregator Investigation Report 2026-07-31)

---

## Owner Request

> "In table and order card when its in preparing, KOT button should come. When ready, Bill button should come."

Currently both KOT and Bill buttons show at BOTH fOrderStatus 1 (preparing) and fOrderStatus 2 (ready).

## Current Behavior

| fOrderStatus | KOT | Bill | Action |
|---|:---:|:---:|---|
| 1 (preparing) | ✅ | ✅ | Mark Ready |
| 2 (ready) | ✅ | ✅ | Ready to Dispatch |

## Desired Behavior

| fOrderStatus | KOT | Bill | Action |
|---|:---:|:---:|---|
| 1 (preparing) | ✅ | ❌ | Mark Ready |
| 2 (ready) | ❌ | ✅ | (text label) |

## Evidence

- Code: `OrderCard.jsx` line 1013: KOT → `isAggregator ? (fOrderStatus === 1 || fOrderStatus === 2)`
- Code: `OrderCard.jsx` line 1082: Bill → `isAggregator && (fOrderStatus === 1 || fOrderStatus === 2)`

## Blast Radius

- 1 file: `OrderCard.jsx` — 2 line changes (conditions)
- Risk: LOW

## Fix

- Line 1013: Change `(fOrderStatus === 1 || fOrderStatus === 2)` → `fOrderStatus === 1`
- Line 1082: Change `(fOrderStatus === 1 || fOrderStatus === 2)` → `fOrderStatus === 2`

## Acceptance Criteria

```
AC-1: fOS=1 (preparing) → KOT button shown, Bill button hidden
AC-2: fOS=2 (ready) → Bill button shown, KOT button hidden
AC-3: Non-aggregator orders unaffected
```

## Duplicate Check: DISTINCT
