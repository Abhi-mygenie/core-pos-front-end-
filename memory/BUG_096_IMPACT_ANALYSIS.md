# BUG-096 — Impact Analysis (Gate 2)

**ID:** BUG-096
**Title:** Realtime FE Updates for Menu — delete-food socket handler missing
**Priority:** P1
**Sprint:** POS 5.0
**Date:** 2026-06-15
**Code Reality:** NONE — no delete-food handler exists
**Conflict Pre-Check:** CLEAR — no other open item touches socketEvents.js, socketHandlers.js, or MenuContext.jsx

---

## 1. Summary

Backend emits `type: "delete-food"` on `food_update_${rid}` channel when a menu item is deleted. FE currently logs `WARN: unhandled type='delete-food'` and does nothing. Deleted items remain visible until page refresh.

## 2. Data Flow Trace

```
Backend: DELETE product → emits socket on `food_update_${rid}`
  → Payload: { type: "delete-food", food_id: <id>, restaurant_id: <rid>, food_details: { id, name } }
  → FE: socketHandlers.js:handleFoodUpdate() receives it
    → Line 885: checks `type === SOCKET_EVENTS.UPDATE_FOOD` — NO match
    → Line 896: falls to `else` → logs WARN, does nothing
  → BREAK: no handler for "delete-food" type
  → Product stays in MenuContext.products array
  → OrderEntry left-menu still shows deleted item
```

## 3. Affected Files

| # | File | Current State | Change Needed |
|---|------|---------------|---------------|
| 1 | `api/socket/socketEvents.js:90` | Only has `UPDATE_FOOD: 'update-food'` | Add `DELETE_FOOD: 'delete-food'` constant |
| 2 | `api/socket/socketHandlers.js:895` | `else { log WARN }` catch-all | Add `else if (type === SOCKET_EVENTS.DELETE_FOOD)` branch → call `actions.removeProduct(food_id)` |
| 3 | `contexts/MenuContext.jsx` | Has `addOrUpdateProduct` but no `removeProduct` | Add `removeProduct(productId)` action — filter product out of state |

## 4. Downstream Consumers

- `OrderEntry.jsx` — reads `products` from MenuContext to render left-menu. Will auto-update when product is removed from state.
- `CategoryPanel.jsx` — reads products by category. Will auto-update.
- `BulkEditor.jsx` — reads products for grid. Will auto-update.
- `useSocketEvents.js` — already wires `handleFoodUpdate` to `food_update_${rid}` channel. No change needed.

## 5. Risks

| Risk | Level | Mitigation |
|------|-------|------------|
| Deleted item in active cart | LOW | Cart references productId — removing from MenuContext doesn't remove from cart. Cashier can still check out existing cart items. |
| Backend sends delete-food for item in active order | LOW | Backend should prevent this; FE menu removal is display-only |
| `removeProduct` called with invalid food_id | LOW | Filter is a no-op if productId not found |

## 6. Owner Decisions Needed

None — backend payload format confirmed via owner screenshot (2026-06-15). Scope is clear.

## 7. Scope

- **Estimated:** ~20 lines across 3 files
- **Hotspot files:** NO
- **Financial logic:** NO
- **Planning skip eligible:** YES (≤20 lines, 3 non-hotspot files, no financial) — owner can approve DIRECT_BUG_FIX
