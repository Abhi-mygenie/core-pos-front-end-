# BUG-370 INTAKE — Delivery Reassign Missing in "Waiting for Rider" State
**Date:** 2026-09-01 | **Priority:** P2 | **Risk:** LOW | **Severity:** MINOR | **Status:** INTAKE

## Description
After a delivery order is dispatched and is in "Waiting for Rider" state, there is no way to reassign/change the rider. The button shows but is fully disabled. Once a rider is assigned, the reassign option is available. User needs reassign in BOTH states.

## Code Reality: PARTIAL
`OrderCard.jsx` — delivery action section:
```jsx
// Waiting state (lines 1176-1182):
<button disabled className="...opacity-50 cursor-default">
  Waiting for Rider           ← disabled, no onClick — BUG
</button>

// Assigned state (lines 1184-1190):
<button data-testid="reassign-rider-btn-{id}"
  onClick={() => setShowAssignRider(true)}>  ← WORKS
  Reassign
</button>
```

**Fix:** Make the "Waiting for Rider" button interactive (same onClick as Reassign).

## Duplicate Check: DISTINCT
## Blast Radius: SMALL (1 file — OrderCard.jsx, ~3 lines)
## Planning Skip: YES eligible — owner approval needed
## Next: Gate 4 GO (Fast Lane with owner approval)
