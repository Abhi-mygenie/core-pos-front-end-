# BUG-116 — Impact Analysis (Gate 2)

**Bug:** BUG-116 — Out-of-kitchen / custom item: backend already emits socket; FE has no listener → menu doesn't refresh in realtime
**Date:** 2026-06-08
**Agent:** E1 (Emergent)
**Sprint:** POS 4.0

---

## 1. Runtime Evidence (this session)

Backend `POST /api/v2/vendoremployee/product/add-single-product` **already emits a socket** on a new channel. Confirmed in browser console via temporary `socket.onAny` tap added to `socketService.js:23` (now reverted):

```
[BUG-116][SOCKET ANY] event= food_update_644 args=
  args[0] = {
    type: "update-food",
    food_id: 206172,
    restaurant_id: 644,
    food_details: { id: 206172, name: 'gggg', price: 7, category_id: 2454, ... }
  }
```

(Owner test was on rid=644. My earlier programmatic probe on rid=78 produced an identical envelope.)

---

## 2. Root Cause — Missing FE Listener

FE has **zero handlers** for the `food_update_${rid}` channel. `grep` confirms no references to `food_update` / `food-update` / `update-food` (as `payload.type`, distinct from the existing `update-food-status` KOT event) anywhere in the FE.

Today's behaviour after Add Custom Item:
- ✅ Product created in backend catalog
- ✅ Added to local cart on initiating terminal (via HTTP response)
- ❌ **Not added to `MenuContext.products`** on initiating terminal (won't show in menu browser without page reload)
- ❌ **Not added on other terminals** (cross-terminal blind)
- ✅ Socket envelope sent by backend, silently discarded by FE

---

## 3. Affected Files

| # | File | Change |
|---|------|--------|
| 1 | `src/api/socket/socketEvents.js` | Add `getFoodUpdateChannel(rid)` generator, `UPDATE_FOOD` payload-type constant, envelope documentation |
| 2 | `src/api/socket/socketHandlers.js` | Add `handleFoodUpdate(args, actions)` handler — transforms `food_details` via `productFromAPI.product()` then calls `actions.addOrUpdateProduct(product)` |
| 3 | `src/contexts/MenuContext.jsx` | Add `addOrUpdateProduct(product)` callback — dedup by `productId`, merge if exists, insert if new. Expose in `value` + `useMemo` deps |
| 4 | `src/api/socket/useSocketEvents.js` | Wire `addOrUpdateProduct` into `actionsRef`; add `handleFoodUpdateChannelEvent` callback; subscribe to `food_update_${rid}` inside main `useEffect`; cleanup on unmount |

**4 files. Additive only.** No existing handler/transform/component touched.

---

## 4. Files NOT Affected (deliberate)

| File | Why not |
|---|---|
| `OrderEntry.jsx` L1119 `handleAddCustomItem` | Already adds to local cart correctly via HTTP response. Socket-driven menu update is an orthogonal side-effect — no race (`cartItems` ≠ `MenuContext.products`). |
| `orderTransform.js` L832 `addCustomItem` | Payload unchanged |
| `orderTransform.js` L1905 `customItemFromAPI` | Cart-item shape unchanged |
| `productTransform.js` L54 `fromAPI.product` | `food_details` already matches input shape — verified field-by-field against runtime payload |
| `constants.js` L36 `ADD_CUSTOM_ITEM` | Endpoint URL unchanged |
| All other socket handlers (order / table / aggregator / order-engage / KOT) | Untouched — different channels |

---

## 5. Architectural Hot Spots & Mitigations

### 5.1 Alternate envelope shape
Existing channels (`new_order_${rid}` etc.) use the 5-slot `MSG_INDEX` envelope: `[eventName, orderId, restaurantId, status, payload]`. The new `food_update_${rid}` carries a **single object** as `args[0]`: `{ type, food_id, restaurant_id, food_details }`. Documented in `socketEvents.js` as a new envelope contract. Handler does NOT route through `MSG_INDEX`.

### 5.2 `actionsRef` wiring (3 spots)
In `useSocketEvents.js`, `actionsRef` must include `addOrUpdateProduct` at:
1. Initial value (current L46)
2. Ref-sync `useEffect` body (current L51)
3. Ref-sync `useEffect` deps array (current L51)

Missing any of these → stale closure → silent no-op. Explicit checklist enforced in Implementation Plan §3.

### 5.3 MenuContext `useMemo` deps
The new `addOrUpdateProduct` must be added to BOTH:
1. The `value` object (current L78-97)
2. The `useMemo` deps array (current L98-113)

Missing the deps → consumers close over `undefined` → silent no-op.

### 5.4 Same-terminal self-broadcast
When the SAME terminal that calls `add-single-product` receives the `food_update_${rid}` back:
- HTTP response → `setCartItems` (existing path, untouched)
- Socket → `addOrUpdateProduct` (new path)

Mutate **different state slices**. No race. Idempotent in both directions (dedup by `productId` in MenuContext).

### 5.5 Reconnect rehydration (Owner directive 2026-06-08)
`useSocketEvents.js:87 getRunningOrders` rehydrates orders only — menu is NOT refetched on reconnect. **Owner ruling: out of scope** — menu is loaded fresh via LoadingPage on app boot, and any post-disconnect missed `food_update_${rid}` will be picked up next time the user refreshes or re-logs.

### 5.6 Hot file ownership
`socketHandlers.js` (839 lines, POS 3.0 owner 2026-05-19) — high-traffic. Change is purely additive (new export + 1 transform import). Zero existing-handler edit.

---

## 6. Frozen Rules Audit

| Rule / Doc | Applies? | Verdict |
|---|---|---|
| **DASH-002** (status-9 socket clears) | Order flow only | N/A |
| **POLL-001 / 002 / 004** (60s poll, 1-miss, skip-open) | Order polling | N/A |
| **BUG-203** (table channel removed) | Order events | Different direction (add ≠ remove); no conflict |
| **CR-011 Screen Freeze** | Reports S0–S41 | Out of scope; no Reports module touched |
| **POS3_0 ELIMINATE_GET_SINGLE_ORDER** (no fetch-on-socket) | Socket handlers | ✅ Aligned — payload carries full `food_details`, no extra fetch |
| **MSG_INDEX envelope** | Order/table channels | New channel diverges, documented |
| **`update-food-status` event** | KOT item status on `new_order_${rid}` | Different namespace; zero collision |

**No frozen rule blocks BUG-116.**

---

## 7. Regression Risk

- **Surface:** Additive only. New channel subscription. New context helper.
- **Risk class:** LOW–MEDIUM (medium for the two checklist-sensitive insertion points in `useSocketEvents.js` and `MenuContext.jsx`)
- **Touched:** 4 files, ~60 new lines, 0 modified lines (all changes are insertions or appends to dep arrays / value objects)
- **No existing behaviour changed:** order flow, polling, cart add, KOT status, aggregator — all 100% identical

---

## 8. Related Items

- **Intake doc:** `/app/memory/memory/bugs/BUG_116_OUT_OF_KITCHEN_SOCKET_REALTIME_INTAKE.md` (corrected scope 2026-06-08)
- **POS3_0 socket handler principle:** `/app/memory/memory/change_requests/final_sprint_reconciliation/POS3_0_ELIMINATE_GET_SINGLE_ORDER_FROM_SOCKET_HANDLERS.md`
- **Owner directive (Hot Spot 5):** "on reconnect menu will anyways come in context" — reconnect rehydration is out of scope for BUG-116

---

## 9. Patch v2 (2026-06-08) — Socket Payload Incompleteness Finding

### What runtime evidence revealed
After Patch v1 shipped, owner smoke surfaced: socket fires, handler runs, MenuContext array grows from 385 → 386, provider re-renders — **but the new product is invisible** in the OrderEntry left menu panel.

Live probe of socket `food_details` vs HTTP `add-single-product` response found:
- HTTP includes `status: 1, is_disable: "N", stock_out: "N", food_status: 0, live_web: "Y"` (and many more)
- Socket strips them all out
- → `productFromAPI.product()` produces `isActive = toBoolean(undefined) = false`
- → OrderEntry filter `p.isActive && !p.isDisabled` drops the product silently

### Fix (Patch v2)
Backfill missing keys in `handleFoodUpdate` via `SOCKET_FOOD_DEFAULTS` const. Spread order ensures backend values, when shipped, automatically override defaults. **Zero FE coupling to backend timeline.**

### Backend follow-up
Filed as **BUG-121** — backend team to enrich `food_update_${rid}` payload to mirror the HTTP shape. FE defaults remain harmlessly as fallback.
