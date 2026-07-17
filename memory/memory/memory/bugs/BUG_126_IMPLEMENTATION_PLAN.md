# BUG-126 — Implementation Plan (Gate 3)

**Date:** 2026-06-11 · Workstream A · No open decisions

## Scope (LOCKED)
One token in `insightsService.js`. No other file.

## Change
`frontend/src/api/services/insightsService.js` (~line 93):
```js
// BEFORE
const orderRoundOff = parseFloat(ot.round_off) || 0;   // field does not exist
// AFTER
const orderRoundOff = parseFloat(ot.round_up) || 0;    // BUG-126: real API field
```

## Expected number shifts (harness-verified targets)
Items & Menu "Sold" revenue increases by exactly: Palm House Mar +₹460 / Apr +₹305 / May +₹272 / Jun +₹23 (replica `items.roundoff_missing`).

## QA
Post-fix Items total = pre-fix total + roundoff_missing per month, both restaurants, to the rupee. Dashboard untouched (different code path) — regression snapshot.

## Freeze-log
Items screen not in frozen set — no amendment needed.

## Rollback
Single-token revert.
