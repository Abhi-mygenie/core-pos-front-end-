# BUG-116 — Implementation Summary + QA (Gate 5)

**Bug:** BUG-116 — Wire FE listener for `food_update_${rid}` socket; realtime MenuContext update
**Date:** 2026-06-08
**Agent:** E1 (Emergent)
**Sprint:** POS 4.0

---

## Changes Applied (4 Files)

| # | File | Net change |
|---|------|------------|
| 1 | `src/api/socket/socketEvents.js` | +20 lines: `getFoodUpdateChannel(rid)` generator, `UPDATE_FOOD` payload-type const, envelope doc block |
| 2 | `src/api/socket/socketHandlers.js` | +37 lines: `productFromAPI` import + `handleFoodUpdate(args, actions)` export |
| 3 | `src/contexts/MenuContext.jsx` | +14 lines: `addOrUpdateProduct(product)` callback + value object + useMemo deps (2 spots updated) |
| 4 | `src/api/socket/useSocketEvents.js` | +27 lines / 6 spots updated: useMenu import, `addOrUpdateProduct` destructure, actionsRef initial + sync (2 spots), `handleFoodUpdateChannelEvent` callback, channel subscribe/unsubscribe + effect deps |

**Total:** ~98 lines added / 0 lines modified-in-place / 0 lines deleted from existing logic.

---

## Insertion-Point Checklist (per Implementation Plan §3)

| # | Spot | Status |
|---|---|---|
| 1 | MenuContext `value` object includes `addOrUpdateProduct` | ✅ |
| 2 | MenuContext `useMemo` deps includes `addOrUpdateProduct` | ✅ |
| 3 | useSocketEvents `actionsRef` initial value includes `addOrUpdateProduct` | ✅ |
| 4 | useSocketEvents sync-effect body includes `addOrUpdateProduct` | ✅ |
| 5 | useSocketEvents sync-effect deps includes `addOrUpdateProduct` | ✅ |
| 6 | useSocketEvents main subscription cleanup includes `unsubscribeFoodUpdate()` | ✅ |
| 7 | useSocketEvents main effect deps includes `handleFoodUpdateChannelEvent` | ✅ |

All 7 spots verified post-edit.

---

## QA

### Compile-time
- **ESLint** on all 4 modified files: 0 advisory, 0 blocking
- **Webpack**: compiled with 1 warning (pre-existing `react-hooks/exhaustive-deps` in unrelated `pages/reports-module/*.jsx` files — same warnings present before BUG-116). No new warnings, no errors.
- **Frontend service**: hot-reloaded clean

### Files untouched (verified)
- `OrderEntry.jsx`, `orderTransform.js`, `productTransform.js`, `constants.js` — confirmed by grep
- All other socket handlers (order, table, aggregator, order-engage, KOT/item-status, scan, split, delivery-assign) — confirmed by grep

### Numeric / behaviour invariants
- Existing `MSG_INDEX` envelope untouched — order events parse identically
- `actionsRef.current` retains all 8 original actions + adds 1 new (`addOrUpdateProduct`)
- `MenuContext.products` write path: `setProducts` (full load) unchanged + `addOrUpdateProduct` (delta) added
- `LoadingPage.jsx` and `useRefreshAllData.js` `setProducts(...)` calls unaffected

### Architectural alignment
- ✅ POS3_0 ELIMINATE_GET_SINGLE_ORDER principle: payload-driven, zero follow-up API fetch
- ✅ No collision with `update-food-status` (KOT event on `new_order_${rid}` — different channel + different event name)
- ✅ Alternate envelope (single object vs 5-slot array) documented in `socketEvents.js`

---

## Predicted Outcome (to be confirmed in Gate 6 smoke)

| Scenario | Pre-fix | Post-fix |
|---|---|---|
| Add Custom Item, single terminal | Local cart adds; menu list does NOT reflect new product without refresh | Local cart adds; menu list reflects new product immediately via socket-driven upsert |
| Add Custom Item, second terminal observing menu | Second terminal blind until refresh | Second terminal sees product appear in real-time |
| Console logs around action | Only HTTP response logs | Additional `[useSocketEvents] food-update channel event: ...` + `[SocketHandler] food-update: product XXX added/updated in MenuContext` |
| Order flow, table flow, KOT flow, polling | Identical | Identical (zero regression) |

---

## Awaiting

- **Gate 6:** Owner smoke sign-off on preprod

---

## Patch v2 (2026-06-08) — `SOCKET_FOOD_DEFAULTS` + Log Cleanup

### Why
Patch v1 (initial 4-file fix) wired the socket → MenuContext correctly. Owner smoke proved state updates land (`prev.length=385 → next.length=386`), but the product was invisible because socket `food_details` omits `status` / `is_disable` / `stock_out` / `food_status` / `live_web`. Filter `p.isActive && !p.isDisabled` silently dropped it.

### Changes
1. **`src/api/socket/socketHandlers.js`**: added `SOCKET_FOOD_DEFAULTS` const (5 keys) + 1-line spread merge in `handleFoodUpdate`. Total **+9 lines, 1 line modified**.
2. **Temp diagnostic logs reverted**:
   - `MenuContext.jsx` provider render log + `addOrUpdateProduct` trace (2 reverts)
   - `OrderEntry.jsx getFilteredItems` trace (1 revert)

### Verification
- ESLint: 0 advisory, 0 blocking
- Webpack: compiled (1 pre-existing unrelated warning, 0 new)
- Hot-reloaded clean
- Insertion-point checklist: defaults are merged BEFORE `food_details` → backend values override → ✓

### Backend follow-up filed: BUG-121
Backend team to ship the missing keys (or full HTTP-shape mirror) in the socket envelope. FE defaults remain as defensive fallback.
