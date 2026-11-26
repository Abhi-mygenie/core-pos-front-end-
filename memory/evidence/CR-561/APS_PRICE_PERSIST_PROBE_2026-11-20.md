# CR-561 — APS price-persist probe (read-only) — 2026-11-20

**Account:** `owner@thegoankitchen.com` (preprod). **Role:** PLANNING re-verification.
**Question:** Can the real price of an APS (₹1) line on a web order be persisted to the backend FE-only?

## Method (read-only, nothing mutated)
1. `POST /api/v1/auth/vendoremployee/common-login` → `login_type: employee`, token obtained.
2. `GET /api/v1/vendoremployee/pos/employee-orders-list?role_name=Manager` → 8 running orders.
3. `POST /api/v2/vendoremployee/get-single-order-new {order_id:1579043}` → baseline.
4. Earlier: `GET` on `update-food-price` (PUT-only route existence check).

## Findings
### APS detection holds on live data
Catalog item **"melo fish"** (catalog price = 1) lands on orders at `unit_price 1.00`. `isAps = unit===1` is valid for loaded orders.

### Exact Gap B case exists — order #1579043 (baseline, untouched)
```
line 3969962 | moo duudh | unit_price 100.00 | food_status 1
line 3969974 | moo duudh | unit_price 100.00 | food_status 3
line 3969975 | moo mwwt  | unit_price 100.00 | food_status 3
line 3969977 | melo fish | unit_price 1.00   | food_status 1   (placed, APS unpriced)
line 3969980 | melo fish | unit_price 1.00   | food_status 7   (web-edit / YTC, APS unpriced)
```

### No reprice path (decisive)
1. **`update-food-price` → HTTP 404** (route not registered). Known routes (`update-place-order`, `cancel-food-item`, `waiter-dinein-order-status-update`) return 405 "Supported methods: PUT"; `update-food-price` returns the generic 404 page like a bogus control. **Endpoint does not exist.**
2. **`cart-update` items carry no line id.** `buildCartItem` (`orderTransform.js:766-801`) emits `food_id, quantity, price, …` but **no `orderDetails` line id** → `update-place-order` can only *add* lines, never reprice an existing one (re-sending a line would duplicate it).
3. **Loaded lines are `placed:true`** (`OrderEntry.jsx:517-536`, unconditional) and `update-place-order` sends **unplaced-only** (`orderTransform.js:1212-1214`) → an existing APS line is never in the update payload.

## Conclusion
- ✅ Price persists for **new/unplaced** APS items via place/update-order (shipped ₹1 "Enter Price" flow).
- ⛔ A **web-order APS line (already on the order, placed, at ₹1)** has **no FE-only path** to be repriced → **backend-dependent**.

## Anomaly noted (separate)
On order #1578881 several APS "melo fish" lines show `unit_price 1.00` but line `price` 23/15/6 — price applied to the line total while `unit_price` stayed 1. Suggests the current pricing path may not reliably write `unit_price`. Worth a separate look.

**Write-probe:** NOT executed — read-only + code evidence conclusive; a reprice write would only duplicate the line and mutate a live order for no new information. (Owner had approved; superseded by the conclusive finding.)
