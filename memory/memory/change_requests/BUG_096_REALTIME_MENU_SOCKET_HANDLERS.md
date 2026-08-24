# BUG-096 — Realtime FE Updates for Menu (Socket Handlers)

**ID:** BUG-096
**Type:** Bug
**Status:** PARTIAL — FE-ACTIONABLE (delete-food handler missing)
**Priority:** P1
**Area:** Socket / Menu Context
**Sprint:** POS 5.0
**Created:** 2026-05-18 (POS 3.0)
**Revised:** 2026-06-15 (Investigation session — corrected scope based on owner input + code trace)
**Source:** AGENT-DISCOVERED (BUG-116 audit) + OWNER-CONFIRMED (2026-06-15 screenshot)
**Confidence:** CONFIRMED

---

## Symptom

When menu items are edited, added, or deleted via Menu Management, the POS dashboard/order screen should update in realtime via socket. Currently:

- ✅ **Food edit** (`type: "update-food"`) — WORKS (shipped BUG-116, 2026-06-08)
- ✅ **Food reorder** — WORKS (calls update API, triggers `update-food` socket, FE revalidates)
- ❌ **Food delete** (`type: "delete-food"`) — NOT HANDLED. Backend emits the event on `food_update_${rid}` channel, FE logs `WARN: unhandled type='delete-food'` and ignores it. Deleted items remain visible until page refresh.
- ✅ **Category CRUD** — NO SOCKET NEEDED (owner confirmed 2026-06-15: no requirement for category socket)

## Evidence

- **Owner screenshot (2026-06-15):** Console showing `food_update` channel event with `type: "delete-food"`, `food_id: 203231`, `restaurant_id: 541`, `name: "1 boiled egg"`. FE logs `[SocketHandler] [WARN] food-update: unhandled type='delete-food' food_id=203231`.
- Stored at: `/app/memory/evidence/BUG-096/`

## Code Trace

**Current handler** (`socketHandlers.js:878-897`):
```js
if (type === SOCKET_EVENTS.UPDATE_FOOD && food_details) {
  // handles update-food only
} else {
  log('WARN', `food-update: unhandled type='${type}' food_id=${food_id}`);
  // ← delete-food falls here
}
```

**Backend payload for delete-food:**
```json
{
  "food_details": { "id": 203231, "name": "1 boiled egg" },
  "food_id": 203231,
  "restaurant_id": 541,
  "type": "delete-food"
}
```

## Scope (FE fix)

| # | File | Change |
|---|------|--------|
| 1 | `socketEvents.js` | Add `DELETE_FOOD: 'delete-food'` constant |
| 2 | `socketHandlers.js` | Add `else if (type === SOCKET_EVENTS.DELETE_FOOD)` branch → call `actions.removeProduct(food_id)` |
| 3 | `MenuContext.jsx` | Add `removeProduct` action — filter product out of state by `food_id` |

Estimated: ~20 lines across 3 files. No hotspot files. No financial logic.

## Duplicate Check

- RELATED to BUG-116 (food edit socket — CLOSED). This is the remaining gap.
- RELATED to BUG-124 (missing socket payload fields — separate issue, backend-blocked).

## Blast Radius

- **Estimated scope:** SMALL (3 files, ~20 lines)
- **Hotspot files touched:** NO
- **Regression risk:** LOW — additive handler, existing handlers untouched

## Open Questions

None — backend payload format confirmed via owner screenshot.

## Routing

→ **PLANNING → IMPLEMENTATION** (standard gate cycle, or DIRECT_BUG_FIX if owner approves skip — ≤20 lines, 3 files, no hotspot, no financial)
