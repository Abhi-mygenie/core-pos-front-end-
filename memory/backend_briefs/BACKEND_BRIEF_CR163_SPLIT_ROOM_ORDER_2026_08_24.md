# BACKEND_BRIEF_CR163_SPLIT_ROOM_ORDER_2026_08_24

## Summary
- Issue: `split-room-order` endpoint has two gaps blocking CR-163 from working correctly
- Classification: BACKEND_BUG (×2)
- Frontend impact: items don't leave the room order screen; new orders appear as room cards not walk-in tables
- Priority / Risk: P1 / HIGH

---

## Endpoint
- Method: POST
- URL: `https://preprod.mygenie.online/api/v2/vendoremployee/order/split-room-order`
- Auth: Bearer token required

---

## GAP 1 — Items not removed from source order (COPY instead of MOVE)

### Reproduction
1. Open an active room order (e.g. r2) with 3+ food items
2. Use "Move Items" → select 2 items → confirm
3. Observe: source room order still shows ALL original items at full total
4. Dashboard: r2 (1/3) ₹2,167 unchanged; r2 (2/3) ₹684 new; r2 (3/3) ₹765 new

### Current backend behaviour
- Creates a new order with **copies** of selected items
- Source order is **NOT updated** — selected items remain, total unchanged
- Socket `update-order` (if fired) carries unchanged source order → FE shows stale items

### Expected backend behaviour
- Selected items **removed** from source order
- Source order total reduces accordingly
- Socket `update-order` fired for source order with remaining items after split

---

## GAP 2 — Created order typed as room, not walk-in

### Reproduction
1. Perform a split as above
2. Dashboard shows: `r2 (2/3)` and `r2 (3/3)` with room icon + C/Out button
3. These are room cards, not walk-in table cards

### Current backend behaviour
- New order created with `table_id = room's table_id` and `restaurantTable.rtype = 'RM'` and `order_in = 'RM'`
- FE transform: `isRoom = table.rtype === 'RM' || api.order_in === 'RM'` → both true
- Dashboard `getOrdersByTableId(tableId)` returns all 3 orders for same room table → labelled as `r2 (1/3)`, `r2 (2/3)`, `r2 (3/3)`

### Expected backend behaviour
- New order must have `table_id: 0` (no room table attached)
- New order must have `order_in: 'WalkIn'` (or any non-RM value)
- Both conditions required — one alone is insufficient:
  - `table.rtype === 'RM'` comes from `restaurantTable` (must be null/absent on new order)
  - `api.order_in === 'RM'` must also be false
- FE will send `order_in: 'WalkIn'` in payload once backend confirms it is read and respected

### FE probe result
- `order_in: 'WalkIn'` accepted by endpoint (HTTP 200, no 403) — backend does NOT reject it
- Cannot confirm backend USES it without a successful live split test

---

## Screenshots
- Order screen: `/app/memory/evidence/CR-163/screenshot_order_items_not_removed.png` (attached by owner 2026-08-24)
- Dashboard: `/app/memory/evidence/CR-163/screenshot_rooms_created.png` (attached by owner 2026-08-24)

## Frontend Workaround
- Available: NO — both gaps require backend fix before FE works end-to-end
- FE implementation is complete and correct (CR-163 IMPLEMENTED in registry)
- FE is blocked on backend fixing GAP 1 and GAP 2
