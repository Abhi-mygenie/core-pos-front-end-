# CR-561 — Impact Analysis (Gate 2) — APS ₹1 price entry from Accept pop-up / web-order edit (POS-1)

> ✅ **GATE-2 RE-VERIFIED 2026-11-20 — UNBLOCKED.** Backend delivered `PUT /api/v2/vendoremployee/order/update-food-item-price` (reprices a placed TBD/₹1 line by `orderDetails[].id`, returns recalculated `data.order_amount`, rejects paid/cancelled, no KOT). The earlier "backend-blocked" finding is RESOLVED — CR-561 is a full FE build. Decisions (2026-11-20): pre-bill guard DROPPED; prices saved BATCHED on Accept/Update; entry in BOTH Accept pop-up + OE edit. Contract: `contracts/CR-561_UPDATE_FOOD_ITEM_PRICE_API_2026-11-20.md`. Revalidated plan: `plans/CR-561_IMPLEMENTATION_PLAN.md`. Sections below are the original pre-delivery analysis (mechanism now provided by the API).


**Role:** PLANNING (Gate 2) · **Date:** 2026-11-20 · **Type:** CR / FE_GAP · **Priority:** P1
**Risk:** **HIGH** → now touches the billing gate (see OD-561-B consequence) — full gate flow, no planning-skip.
**Owner decisions:** LOCKED — OD-561-A = **both places**; OD-561-B = **allow accepting unpriced (₹1 placeholder)** BUT **a real price must be set before the final bill prints**.

## Code Reality: PARTIAL
- Fresh ₹1 tap in Order Entry already works: `OrderEntry.jsx:850` `if (Number(item.price) === 1) setDynamicPriceItem(item)` → modal `:3038` → `confirmDynamicPriceAndAdd` `:880-928` (sets `_isDynamicPrice`, cashier price authoritative).
- **Gap A (Accept pop-up):** `PopoutItemRow.jsx:73` `isAps = unit===1 && !isComp`; `:116-118` renders a **read-only "Price TBD" badge** — no entry affordance. Pop-up rows are rendered via the shared `PopoutItemRow` (owned by CR-557).
- **Gap B (web order in Order-Entry Edit):** an APS line arrives already in the cart (loaded, not a fresh tap), so the `:850` ₹1 trigger never fires → never prompts.

## Conflict Pre-Check (FILE_OWNERSHIP + registry)
| File | Risk | Open overlap | Sequencing |
|---|---|---|---|
| `components/dashboard/PopoutItemRow.jsx` | shared row | **CR-557** owner (shared row), **BUG-741** (this batch, wording) | coordinate; additive affordance + a wording change |
| `components/dashboard/ScanOrderPopOut.jsx` | hotspot-ish | **CR-547** (KOT selection), **CR-552** (Mode B reject), **CR-558** (per-item accept) all open on this file | **sequence CR-561 after CR-552/CR-547/CR-558 settle** or coordinate edits |
| `components/order-entry/OrderEntry.jsx` | **R5 hotspot** | many open items | additive reuse of existing `dynamicPriceItem` model |
| `components/order-entry/CollectPaymentPanel.jsx` (billing gate — NEW scope from OD-561-B) | **R5 hotspot, financial** | BUG-665/662 etc. | new pre-bill "no unpriced APS" guard |

## Data flow
Accept pop-up: web/scan order → `ScanOrderPopOut` list → `PopoutItemRow` (APS badge, Price TBD) → **no price captured** → accept sends item at unit ₹1.
Order-Entry edit: loaded order → cart has APS line at ₹1 → place/bill uses ₹1.
Target: reuse `dynamicPriceItem`/`_isDynamicPrice` model so a cashier-entered price becomes the authoritative unit price in both surfaces; **and** add a billing-time guard.

## Affected files (WILL change — pinned at Gate 3)
1. `PopoutItemRow.jsx` — replace read-only "Price TBD" with a price-entry affordance for APS rows (editable in Accept pop-up).
2. `ScanOrderPopOut.jsx` — capture entered price into the item before Accept; carry into accept payload.
3. `OrderEntry.jsx` — trigger the price-entry modal for an APS/₹1 line opened via **Edit** (not just fresh tap); reuse `confirmDynamicPriceAndAdd` logic.
4. `CollectPaymentPanel.jsx` (and/or OrderEntry billing handler) — **NEW guard (OD-561-B):** block final bill / collect when any cart item is still APS-unpriced (unit===1 & flagged), prompt to set price first.

## WILL NOT touch
Backend contract, discount/coupon/tax math, settlement logic, non-APS pricing, printing.

## Downstream consumers
`buildCartItem` (`orderTransform.js:775` station/price), place-order & bill payloads, CollectPaymentPanel totals. Entered price must flow through unchanged; the bill guard must not block non-APS orders.

## Risk register
- HIGH: editing the billing/collect gate (R5, financial) — regression risk to normal (non-APS) billing. Needs E2E money test.
- MEDIUM: shared-row (`PopoutItemRow`) and `ScanOrderPopOut` edit collisions with CR-547/552/557/558 — sequence.

## Probes (read-only, permitted)
Verify the web/scan order payload actually represents APS items as unit price = 1 on the running order (login `owner@cafe103.com`), to confirm `isAps` detection holds for loaded orders in Edit (Gap B).

## Next
Gate 3 Implementation Plan (pin exact lines + verification matrix). No code changed.
