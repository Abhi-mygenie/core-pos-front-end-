# Bucket D1-Cap — Follow-up Fix · Focused QA Note

**Bucket:** D1-Cap (CR-008 Sub-CR #1, Phase A)
**Round:** 2 (follow-up to ship-1 same-day)
**Date:** 2026-05-03
**Files touched:** 1 (`frontend/src/api/transforms/orderTransform.js`)
**Lines added:** ~6 (2 functional + 4 comment)
**Lines removed:** 0
**Hotspot approval:** YES (already covered by the original D1-Cap Apply gate)

---

## What was missing in ship-1

Ship-1 added `delivery_charge: <captured>` as a separate field in the placeOrder / updateOrder payloads but did **not** include the delivery component inside `order_amount`, `tax_amount`, and `round_up` (which `calcOrderTotals` produces and the spread sends to the backend).

Because the backend trusts the client-computed `order_amount` and echoes it back as `api.order_amount` → `order.amount` (read by TableCard / OrderCard / Audit Report), the dashboard tiles showed the **items-only total** instead of the **items + delivery total**.

Only Collect Payment was correct, because that screen recomputes `rawFinalTotal = subtotal + sgst + cgst + deliveryCharge` client-side from scratch.

## What this round fixes

Two single-line passes of `deliveryCharge` into `calcOrderTotals(...)` as the third `extras` argument, gated on `orderType === 'delivery'`:

1. `orderTransform.js` `placeOrder` — at the `const totals = calcOrderTotals(...)` site
2. `orderTransform.js` `updateOrder` — at the `const combinedTotals = calcOrderTotals(...)` site

This mirrors the symmetric pattern already used by `placeOrderWithPayment` (the prepaid Place+Pay path).

## What this round does NOT change

- No changes to `OrderEntry.jsx`, `CartPanel.jsx`, `AddressFormModal.jsx`.
- No socket handler changes.
- No backend changes.
- No new localStorage keys.
- `placeOrderWithPayment` (prepaid) untouched — already correct since BUG-019.
- `CollectPaymentPanel` untouched — its own client-side rounding remains the source of truth on the Collect Bill screen.
- Non-delivery orders (dine-in / walk-in / takeaway) untouched — gate forces `deliveryCharge=0`.

---

## Manual validation checklist (what Owner / QA should walk on preprod)

Login: `owner@palmhouse.com` / `Qplazm@10` (Palm House, restaurant_id 541)

### Group A — Happy path on dashboard cards (the main fix verification)

| # | Step | Expected |
|---|---|---|
| A1 | New delivery order: pick address → cart row shows editable Delivery Charge → type ₹50 → place a ₹100 worth of items → return to dashboard | Dashboard tile / OrderCard `amount` shows roughly **₹150 + tax** (NOT ₹100 + tax) |
| A2 | Open the placed delivery order detail | Same total displayed (cards are consistent) |
| A3 | Update Order: add another ₹40 of items → Update | Dashboard tile recomputes to **₹190 + tax + delivery** echo |
| A4 | Audit Report → row of this order | `Amount` column matches the dashboard tile (includes delivery) |
| A5 | Collect Bill button on Order Entry | Within ±₹0.50 of dashboard tile (different rounding paths) |

### Group B — Network payload sanity (DevTools)

| # | Step | Expected |
|---|---|---|
| B1 | DevTools Network tab → POST `/api/v2/vendoremployee/order/place-order` (multipart) → inspect `data` payload | `order_amount` ≈ items+tax+delivery (NOT items+tax). `delivery_charge`= the entered value. `tax_amount` includes GST-on-delivery (per BUG-006 rule). `round_up` reflects new fractional. |
| B2 | DevTools → PUT `/order/update-place-order` (JSON) on the same order | Same expectations. `combined_totals` (spread as top-level fields) reflects delivery in `order_amount`. |

### Group C — Regression on non-delivery orders

| # | Step | Expected |
|---|---|---|
| C1 | New dine-in / walk-in / takeaway order (any items, no delivery) | Payload `order_amount` unchanged from before (no delivery component). `delivery_charge: 0`. Dashboard tile shows items+tax only. |
| C2 | Update one of those orders | Same — no delivery bleeding into total. |

### Group D — Regression on prepaid scan orders

| # | Step | Expected |
|---|---|---|
| D1 | A scan / customer-app order arrives with `delivery_charge: 10` from the customer-app backend | Dashboard tile shows correct total (already correct since BUG-019; not changed by this fix). |

### Group E — Regression on existing buckets

| # | Step | Expected |
|---|---|---|
| E1 | A2 — Order ID chip on dashboard card | Visible |
| E2 | B2-split — Audit Report PG columns under PG filter | Working |
| E3 | B1 — Multi-select variations on Big Buddha Burger | Working |
| E4 | D1 — "Stay on Order Entry After Collect Bill" toggle | Working |
| E5 | Merge / Table-Shift hidden on prepaid cards | Working |

### Group F — Edge cases

| # | Step | Expected |
|---|---|---|
| F1 | Type ₹50 then change to ₹0 inline on the cart row before placing | Payload `order_amount` is items+tax only; `delivery_charge: 0` |
| F2 | Type negative or invalid number | Field rejects (HTML `min="0"`); state stays at last valid value |
| F3 | Place a delivery order with charge ₹0 explicitly | Same as non-delivery — no change to total math |
| F4 | Re-engage an old delivery order placed before this fix (legacy data with `order_amount` not including delivery) | Dashboard tile may show legacy lower total until a fresh Update Order is fired (then re-syncs). Document but do not "fix" historical data. |

### Group G — Print payload

| # | Step | Expected |
|---|---|---|
| G1 | Print Bill from a delivery order with `delivery_charge: 50` | Printed Total / Grand Total reflects the new `order.amount` (now correct). Existing `buildBillPrintPayload` reads `order.amount` (orderTransform.js:1424) — unchanged code path, just receives the corrected value. |

---

## What to do if a test fails

Snap the failing scenario screenshot + DevTools payload + Console log + open the next session with that as input. Backups are still in place:

- `/app/frontend/src/components/order-entry/OrderEntry.jsx.bak.d1cap`
- `/app/frontend/src/api/transforms/orderTransform.js.bak.d1cap`

Rollback path: git revert this round's commits, or restore the `.bak.d1cap` files via `cp`.

---

## Sign-off after Owner verification

Once Groups A-G all pass, remove the two backup files and update the per-bucket handover (`CR_BUCKET_D1_CAP_DELIVERY_CHARGE_CAPTURE_HANDOVER.md`) Round-2 section. Then it's safe to move to Bucket D1-Gate (the BUG-019 readOnly → isPrepaid gate flip).

**Round 2 ready for Owner manual validation.**
