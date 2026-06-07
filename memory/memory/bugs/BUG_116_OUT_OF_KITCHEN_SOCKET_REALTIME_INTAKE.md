# BUG-116 — Out-of-Kitchen Item: API Must Emit Socket Event for Realtime Menu Update

**Status:** INTAKE
**Priority:** P1
**Sprint:** POS 4.0
**Opened:** 2026-06-07
**Reporter:** Owner
**Component:** Backend API + FE socket handler

---

## 1. Problem Statement (Owner Verbatim)

> When we add an out-of-kitchen item, an API is called so that menu which is added to out-of-kitchen item is called on the sockets. There's a change in the API needed so that it can be handled on a socket and realtime menu can be updated once it's added from out-of-kitchen or out-of-menu item.

---

## 2. Current Behavior

1. User marks an item as "out of kitchen" / "out of menu" (stock-out / unavailable toggle)
2. FE calls the backend API to update the item's availability status
3. The change takes effect **only after page refresh** — other open POS terminals / browser tabs do NOT see the menu change in realtime

---

## 3. Expected Behavior

1. User marks an item as "out of kitchen" / "out of menu"
2. FE calls the backend API
3. **Backend emits a socket event** (e.g., `menu-update` or `food-availability-change`) to all connected POS clients for that restaurant
4. FE receives the socket event and **updates the menu in realtime** — the item immediately shows as unavailable/greyed-out across all terminals without refresh

---

## 4. Scope

### Backend (API change required)
- The existing "mark out-of-kitchen" API must emit a socket event after successfully toggling the item
- Socket event should carry: `food_id`, new availability status, restaurant_id
- This is a **backend change** — needs backend team coordination

### Frontend (socket handler)
- FE must listen for the new socket event
- On receipt, update the local menu/category state to reflect the item's new availability
- Related to **BUG-096** (Realtime FE updates for menu) which is PARTIALLY IMPLEMENTED and blocked on backend socket event names (BQ-CR-01/02/03)

---

## 5. Related Items

| Item | Relationship |
|---|---|
| **BUG-096** | Realtime FE updates for menu — PARTIALLY IMPLEMENTED, same domain. Socket event names unknown (BQ-CR-01/02/03) |
| `constants.js` | Socket event name constants — needs new entry for menu availability |
| `socketHandlers.js` | Socket event listener — needs handler for menu availability change |
| `RestaurantContext.jsx` or menu state | Menu data store — needs update on socket event |

---

## 6. Backend API Endpoint (Owner-Provided)

**Endpoint that needs socket emission added:**
```
POST https://preprod.mygenie.online/api/v2/vendoremployee/product/add-single-product
```

This is the API called when adding/toggling an out-of-kitchen item. Backend must emit a socket event after this call succeeds so all connected POS clients receive the menu update in realtime.

---

## 7. Open Questions

| # | Question | Owner |
|---|---|---|
| ~~Q-116-1~~ | ~~What is the current API endpoint for toggling out-of-kitchen?~~ | **ANSWERED: `/api/v2/vendoremployee/product/add-single-product`** |
| Q-116-2 | What socket event name should backend emit? (aligns with BUG-096 BQ-CR-01/02/03) | Backend |
| Q-116-3 | Should the socket payload include the full item object or just food_id + status? | Backend |
| Q-116-4 | Does this also apply to "out of stock" for variations/addons, or only main items? | Owner |

---

## 7. Next Steps

1. Backend team: add socket emission to the out-of-kitchen toggle API
2. Backend team: define socket event name + payload shape (resolves BQ-CR-01 from BUG-096)
3. FE: wire socket handler to update menu state in realtime
4. Test across multiple terminals
