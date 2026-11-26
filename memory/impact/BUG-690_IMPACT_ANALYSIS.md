# BUG-690 — Impact Analysis (Gate 2)

**ID:** BUG-690 · **Type:** BUG · **Area:** Menu / Order Entry
**Priority:** P3 · **Risk:** LOW · **QA Severity:** MINOR
**Stage:** Gate 2 — Impact Analysis only (no plan, no code)
**Author:** PLANNING agent · **Date:** 2026-11-18

## Code Reality
**FULL** — `frontend/src/components/panels/menu/AddonManagementPanel.jsx`:
- L55-60: `await menuService.addAddon({...})` then `toast({title:'Added', …})`.
- No re-fetch / list invalidation after the successful create (no `getAddons()`/state refresh call in the success path).
Root cause: create handler does not re-fetch or optimistically insert the new add-on, so the rendered list stays stale until a manual refresh/navigation remounts the panel.

## Conflict Pre-Check
- File owned by BUG-394 / CR-142 (Addon Master). No competing open edit.
- Parallel-safe.

## Data-flow trace
`+ Add Addon` → `addAddon()` POST succeeds → toast → (missing) list reload → UI list unchanged. Break point: absent re-fetch/insert after create.

## Affected files / lines
| File | Lines | Nature |
|------|-------|--------|
| `components/panels/menu/AddonManagementPanel.jsx` | ~L55-60 success path | re-fetch add-on list (or optimistic insert) after successful create |

## Risk
LOW (UI freshness; data is persisted). Fast-Lane *candidate* if Gate 3 confirms single-file ≤10 lines, no service/transform change — still owner-approved.

## Owner decisions
None.

## Verification seeds
1. Create add-on → appears in list immediately without manual refresh.
2. Create validation (BUG-669) still blocks empty price; ₹0 allowed.
3. No duplicate rows after the refresh.
