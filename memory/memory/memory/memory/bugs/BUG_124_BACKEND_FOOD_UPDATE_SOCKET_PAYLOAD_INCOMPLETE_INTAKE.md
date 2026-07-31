# BUG-124 — Backend `food_update_${rid}` socket payload missing critical fields

> **RENUMBERED 2026-06-11:** formerly BUG-121 — ID collision with closed "Category count + post-save refresh" BUG-121. Owner-approved renumber (baseline consolidation R3).

**Status:** INTAKE
**Priority:** P2 (FE has defensive defaults — backend can ship at convenience without blocking POS)
**Sprint:** POS 4.0
**Opened:** 2026-06-08
**Reporter:** Surfaced during BUG-116 owner smoke (2026-06-08)
**Component:** Backend socket emit on `add-single-product` (POST /api/v2/vendoremployee/product/add-single-product)

---

## 1. Problem Statement

Backend emits a socket on channel `food_update_${restaurant_id}` after `add-single-product` succeeds. The `food_details` object in the payload is a **stripped subset** of the HTTP response body — missing the keys the FE needs to compute `isActive` / `isDisabled` / `isOutOfStock`.

Without these keys, the FE's `productFromAPI.product()` transform produces `isActive=false`, and the OrderEntry left-menu filter (`p.isActive && !p.isDisabled`) silently drops the new product — even though the array IS updated.

---

## 2. Evidence (Live preprod, 2026-06-08, rid=78)

| Field | HTTP response | Socket `food_details` |
|---|---|---|
| `id` | 206178 | 206178 ✓ |
| **`status`** | **1** (int) | **MISSING ❌** |
| **`is_disable`** | **"N"** | **MISSING ❌** |
| **`stock_out`** | **"N"** | **MISSING ❌** |
| **`food_status`** | **0** | **MISSING ❌** |
| **`live_web`** | **"Y"** | **MISSING ❌** |
| `egg`, `jain`, `recommended`, `description`, etc. | present | MISSING |
| `dinein`, `takeaway`, `delivery` | present | present ✓ |
| `veg`, `food_for` | present | present ✓ |
| `name`, `price`, `tax`, `tax_type`, `category_id` | present | present ✓ |

Verified via authenticated socket probe (Python `python-socketio` connected to `presocket.mygenie.online`).

---

## 3. FE Mitigation (already shipped via BUG-116 Patch v2)

`src/api/socket/socketHandlers.js` `handleFoodUpdate` now backfills missing keys via `SOCKET_FOOD_DEFAULTS`:

```js
const SOCKET_FOOD_DEFAULTS = {
  status: 1,
  is_disable: 'N',
  stock_out: 'N',
  food_status: 0,
  live_web: 'Y',
};
const normalised = { ...SOCKET_FOOD_DEFAULTS, ...food_details };
const product = productFromAPI.product(normalised);
```

**Backend values, when added, will automatically win** because spread order is `{ ...DEFAULTS, ...food_details }`. The defaults activate only when the backend omits a key.

---

## 4. Asks for Backend Team

### Minimum (unblocks correctness of inactive-by-default cases)
Add to the socket `food_details` envelope:
- `status` — int (`1` for active, `0` for inactive)
- `is_disable` — string (`"Y"` / `"N"`)

### Recommended (matches HTTP add-single-product response shape)
Also add:
- `stock_out` — string (`"Y"` / `"N"`)
- `food_status` — int
- `live_web` — string (`"Y"` / `"N"`)

### Ideal (lowest future surprise)
Mirror the **full** shape of a single item from `GET /api/v1/vendoremployee/get-products-list`. This guarantees parity with the in-memory `MenuContext.products` shape and removes any future "FE missed this key" class of bugs.

---

## 5. Why this matters even with FE defaults

Today's FE defaults assume **"newly emitted = active"**. This is correct for the `add-single-product` flow. But the same channel may carry future payload types (e.g., `type: 'update-food'` for a deactivated item, `type: 'delete-food'`, etc.). If backend ever wants to communicate "this item is now inactive" via this channel, it MUST send `status: 0` (or equivalent). Today's payload would not be able to express that — the FE default would always override to active.

So this is **not a workaround**, it's a real backend contract gap that becomes urgent when more event types are added on the same channel.

---

## 6. Recommended Backend Fix Shape

```json
{
  "type": "update-food",
  "food_id": 206178,
  "restaurant_id": 78,
  "food_details": {
    // ... all current fields ...
    "status": 1,
    "is_disable": "N",
    "stock_out": "N",
    "food_status": 0,
    "live_web": "Y",
    // ideally also: egg, jain, recommended, description, etc.
  }
}
```

---

## 7. Verification Plan (once backend ships)

1. Authenticated socket probe captures the new payload — assert all 5 minimum keys present
2. FE owner smoke: place an `add-single-product` and an `update-product` (deactivate); verify both states correctly reflected in OrderEntry menu
3. Remove the `SOCKET_FOOD_DEFAULTS` block from `socketHandlers.js` (optional; safe to keep as defensive)

---

## 8. Related Items

- **BUG-116** (parent) — `food_update_${rid}` listener implementation + this Patch v2 backfill
- **POS3_0 ELIMINATE_GET_SINGLE_ORDER** — established principle of "socket carries full payload, no follow-up fetch". This backend gap violates that principle for the menu channel.
- **`food_update` envelope doc** in `/app/frontend/src/api/socket/socketEvents.js` (line range "FOOD-UPDATE CHANNEL ENVELOPE")
