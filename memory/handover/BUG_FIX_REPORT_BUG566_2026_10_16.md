# Bug Fix Report — BUG-566 — 2026-10-16

## Summary
Fixed: 1/1. Root cause pattern: PLAN_GAP.

| Test | Severity | RCA | Root Cause | Fix | Files Changed | Verified |
|---|---|---|---|---|---|---|
| V7 — last status guard | MAJOR | PLAN_GAP | `handleStatusToggle` L244 guard checks `next.length === 0` (ALL activeStatuses). `visibleStatusFilters` is capped at 6 via `.slice(0,6)`. Non-visible IDs in `activeStatuses` prevent guard from firing → last visible filter removed → 0 orders | Added `visibleNext` guard: `next.filter(s => visibleStatusFilters.some(f => f.id === s))` → if `visibleNext.length === 0` → return | `Header.jsx` L247-248 | ✅ Code verified, compile clean |

## Scope Expansion
NONE — fix stays within `handleStatusToggle` in `Header.jsx`.

## Escalated Items
NONE.

## Registry Sync
BUG-566 → GATE_5A_IMPLEMENTED. EXIT GATE: 5/5 PASS.
