# Investigation — Backend V2 order-discount handoff vs "show applied discount on dashboard" (BUG-680)

**Role:** INVESTIGATION (Role 6) — read-only, no code written
**Date:** 2026-11-20
**Confidence:** HIGH (code-traced FE) · backend behaviour = per uploaded handoff (preprod, not re-run here)
**Related:** BUG-680 (status `GATE_1_INTAKE_COMPLETE — OD LOCKED`, OD-680-01 = **Option B, backend updates order_amount**)
**Backend handoff:** `memory/handover/V2_ORDER_DISCOUNT_FRONTEND_HANDOFF_2026-11-20.md`

**Test credentials (preprod, for live verification):**

| Account | Email | Password | Use |
|---|---|---|---|
| Owner (BUG-680 repro) | `owner@mantri.com` | `Qplazm@10` | Table T2 / Order #001447 — reproduce discount-not-on-dashboard |
| Staff (aggregator/table mode) | `poki@macha.com` | `Qplazm@10` | Running-orders list + apply-discount readback checks |

> Use these to confirm the running-orders list endpoint returns the recalculated `order_amount` + `restaurant_discount_amount` after a v2 discount.

---

## 1. What the owner asked
"Check this backend handoff — there is a CR for showing the applied discount on the dashboard." → That CR is **BUG-680**. This report maps the new backend V2 endpoint to BUG-680 and states exactly what the frontend still needs.

## 2. What the backend delivered (V2)
New endpoint **`POST /api/v2/vendoremployee/order/order-discount-manage`** (preprod). Unlike the old v1, on success it now:
- Mutates `orders.order_discount_type`, `discount_value`, `order_discount`, `restaurant_discount_amount` and **recalculates item allocations, taxes, and bill totals** through the existing calculator.
- Publishes an `update-order` socket (KOT flag N).
- Returns a summary (`order_amount`, `discount_amount` = applied ₹, `discount_type` = `Percent`/`Fixed`, `discount_value` = raw entered value). Full readback via `get-single-order-new`: `orders[].restaurant_discount_amount`, `order_discount_type`, `discount_value`, and per-item `orderDetails[].discount_on_food`.

**This is the Option B that BUG-680 was waiting on** — the backend now carries the discount into the order totals/readback instead of storing it only as config.

> Request contract: `{ order_id:int, discount_amount:number, discount_type:"percent"|"fixed", discount_note?:string }`. percent ≤ 100; fixed ≤ eligible active-item subtotal; `0` removes. Errors: 422 (validation), 404 (unknown/inaccessible order), 401 (auth).

## 3. Frontend state today (code-traced)
| Spot | Current code | Effect |
|---|---|---|
| Apply-discount call | `orderService.js:228 applyOrderDiscount` → `constants.js:258 MANAGE = '/api/v1/vendoremployee/order-discount-manage'` | **Still points at v1** — the old endpoint that did NOT mutate totals. No v2 wiring exists anywhere in `api/` (verified). |
| Dashboard tile amount | `OrderCard.jsx:526` → `₹{order.amount}` where `order.amount = parseFloat(api.order_amount)` (`orderTransform.js:225`) | Shows whatever `order_amount` the list returns. Per BUG-680 this was pre-discount under v1. |
| Dashboard discount display | — | **`OrderCard` renders NO discount anywhere** (grep: zero matches). There is no discount line/badge on the tile. |
| Discount fields already parsed | `orderTransform.js:236 discount` (=`restaurant_discount_amount`), `:238 discountValue`, `:239 discountType`, `:243 orderDiscountJson` | The data the card needs is **already available** on the `order` object — just not rendered. |

## 4. Conclusion — is the dashboard "showing applied discount" now unblocked?
**Yes, the backend unblocks it, but FE work remains. Two independent FE gaps:**

1. **Endpoint version** — `applyOrderDiscount` must call the **v2** endpoint (`constants.js:258`) so the discount actually mutates `order_amount` + `restaurant_discount_amount` in the readback the dashboard consumes. Until this is switched, the v1 call won't recalc totals and the tile stays pre-discount. *(If backend has deprecated/aliased v1→v2 server-side, confirm with backend; otherwise FE must switch.)*
2. **Display** — add a discount indication to `OrderCard` (e.g. `Disc ₹{order.discount} ({order.discountType}/{order.discountValue})`) and make the headline amount reflect the recalculated post-discount `order_amount`. Fields are already on the transformed `order`.

BUG-680 blast radius (same discount, other screens) also applies if parity is wanted: `OrderEntry.jsx:1223-1227` (Collect Bill button) and `CartPanel.jsx:512` (placed-order total).

## 5. Risk / routing
- **Risk:** HIGH (financial display) — BUG-680 is P0, **Planning-skip NOT eligible**.
- **Scope:** small-to-medium FE — 1 endpoint constant + `OrderCard` render (+ optional OrderEntry/CartPanel for parity).
- **Backend open findings (do NOT block dashboard display, flag only):** (1) fixed-discount allocation not redistributed across lines after adding an item (affects line GST / transfer); (2) mixed-discount merge policy undecided (fixed source merged into % destination → destination % applied to combined subtotal). Both are backend-side; the handoff itself marks full lifecycle **not production-signed-off**.

## 6. Verification gap (honesty note)
FE paths are code-confirmed. The backend recalc + readback (`order_amount` post-discount in the **running-orders list** that feeds the dashboard, not just `get-single-order-new`) was **not re-run here** — it needs a live preprod call with an employee token (e.g. poki@macha.com / owner@mantri.com). Recommend confirming the list endpoint returns the recalculated `order_amount` + `restaurant_discount_amount` before/with the FE change.

## 7. Recommended next step (owner decision)
Progress **BUG-680 to Planning (Gate 2)** as the FE implementation of Option B:
- Confirm v1→v2 endpoint switch (or backend alias).
- Decide display: discount line on `OrderCard` only, or full parity (OrderCard + OrderEntry Collect-Bill + CartPanel).

**No application code changed.**
