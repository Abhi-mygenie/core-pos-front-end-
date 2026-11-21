# CR-561 — Gate 3 Implementation Plan (REFRESHED 2026-11-21) — APS ₹1 price entry (POS-1)

> ✅ **SUPERSEDES the 2026-11-20 "backend-blocked" plan.** Backend endpoint is DELIVERED
> (`PUT /api/v2/vendoremployee/order/update-food-item-price`, see `contracts/CR-561_UPDATE_FOOD_ITEM_PRICE_API_2026-11-20.md`).
> A working **FE reference implementation already exists on branch `20261121-051150`** (Gap A — Accept pop-up).
> This plan tells the next agent to **adopt that branch for Gap A**, build the remaining **Gap B** (Order-Entry edit), and close the open items below.

**Role:** PLANNING (Gate 3) · **Date:** 2026-11-21 · **No app code changed in this plan.**
**Priority:** P0 · **Risk:** **HIGH (financial — sets the final line price → bill total). Full gate + E2E money test, no planning-skip.**

---

## Owner decisions
- **OD-561-A — LOCKED:** price entry in **both places** (Accept pop-up + Order-Entry edit).
- **OD-561-B — NEEDS RECONCILE (⚠️ blocker for ship):** the registry still locks *"allow accepting unpriced (₹1 placeholder) BUT a real price required before the final bill prints (pre-bill guard)."* The contract doc says the **interim guard is SUPERSEDED** because full edit of placed lines is now supported. These conflict. **Owner must confirm:** keep a pre-bill "block/warn billing while any line is still ₹1" safety guard, or drop it. **Recommendation: KEEP a soft pre-bill guard** — with it dropped, nothing forces a real price and an order can be billed at ₹1 (money leak).

---

## Reference implementation to ADOPT — branch `20261121-051150` (Gap A, Accept pop-up)
Source-only diff vs main = 4 files (verified byte-for-byte this session):

1. **`frontend/src/api/constants.js`** — add
   `UPDATE_FOOD_ITEM_PRICE: '/api/v2/vendoremployee/order/update-food-item-price'`.
2. **`frontend/src/api/services/orderService.js`** — new
   `updateFoodItemPrice(orderId, items)` → `PUT` with body `{ order_id:Number, items:[{item_id:Number(orderDetails[].id), unit_price:Number(>0)}] }`; returns `response.data` (`{ success, message, data:{ order_amount, subtotal, tax, items } }`).
3. **`frontend/src/components/dashboard/PopoutItemRow.jsx`** — for `isAps` (`unit===1 && !isComp`) rows, when `!isReadonly && typeof onPriceChange==='function'` render a numeric input (`data-testid="popout-item-price-input-<id>"`, `min=0 step=0.01`, `stopPropagation` on click) that calls `onPriceChange(it.id, n>0?n:null)`; otherwise keep the read-only **"Price TBD"** badge.
4. **`frontend/src/components/dashboard/ScanOrderPopOut.jsx`** — `pendingPrices` state keyed by `orderDetails[].id`; `handlePriceChange(itemId,unitPrice)`; cleared on order switch (`_kotOrderId` effect). On **Accept**, build `priceItems = entries(pendingPrices).filter(v→typeof number && v>0)` and, if any, `await updateFoodItemPrice(order.orderId, priceItems)` **before** `onAccept`. Deps include `pendingPrices` (the iter-14 fix). Wired to **both** row render sites (Mode A full + Mode B new).

**Contract adherence (confirmed):** `item_id = orderDetails[].id = it.id` ✓; `unit_price>0` ✓; all-or-nothing enforced by endpoint ✓; no KOT ✓.

**Port note:** branch base may be behind current main. Rebase/cherry-pick onto main and re-diff `PopoutItemRow.jsx` / `ScanOrderPopOut.jsx` (shared with CR-547/552/557/558 + BUG-741) before merging; re-verify no collision.

---

## Remaining scope to BUILD (not on the branch)
**Gap B — Order-Entry Edit path (OD-561-A second surface).** A loaded web-order APS line opened via **Edit** never fires the fresh-tap trigger (`OrderEntry.jsx:850`) because the line is `placed:true`. Since placed lines can't ride `update-place-order`, persist via the **same endpoint directly**: `updateFoodItemPrice(orderId, [{item_id:line.id, unit_price}])`. Reuse the dynamic-price modal UI (`:3038-3101`, `confirmDynamicPriceAndAdd:880-928`) for input; guard so it only fires for unpriced APS (`unit===1`) placed lines.

**OD-561-B pre-bill guard (if owner keeps it).** Before final bill/collect, block or warn when any cart line is still an unpriced APS placeholder (`unit===1` & APS flag). MUST NOT block non-APS orders. File: `CollectPaymentPanel.jsx` / OE billing handler (R5, financial).

---

## Must-close before ship (from gate review + `test_reports/iteration_14.json`)
1. **LIVE RETEST (currently UNVERIFIED).** iter-14 first live run FAILED: stale `pendingPrices` `useCallback` dep → `update-food-item-price` never fired → price silently dropped, order accepted at ₹1. The deps fix IS on the branch but has **not** been live-retested (test order consumed). Re-run on a fresh web order carrying an APS ₹1 line.
2. **Silent failure UX.** On a price-save rejection the branch only `console.error`s (Accept aborts because the `await` throws, which is correct) — add a **user-visible toast** so staff aren't left thinking it saved. Never accept at ₹1 silently after a price-save failure.
3. **Apply the new total.** Use `data.order_amount` where the bill total is shown, or confirm the post-accept socket `update-order-status` refresh updates the UI total.

---

## Verification matrix (E2E — money)
| Case | Expected |
|---|---|
| Accept pop-up: APS ₹1 line, enter price, Accept | `PUT update-food-item-price` fires `{item_id:orderDetails.id, unit_price}`; order accepted; bill total = price×qty; **no KOT**; socket refresh shows new price |
| Accept pop-up: APS line left blank, Accept | no price call; accepted at ₹1 placeholder (allowed); pre-bill guard (if kept) blocks final bill until priced |
| Multiple APS lines (some priced, some blank) | only priced lines sent |
| Price-save fails (order paid/cancelled) | error toast; order NOT accepted at wrong price |
| Non-APS line in pop-up | read-only line total, no input (no false `isAps`) |
| Order-Entry Edit (Gap B) web APS line | price persists via endpoint; bill correct |
| Normal (no APS) order billing | unchanged, not blocked |

---

## Conflict / sequencing · Rollback
- Shared files: `PopoutItemRow.jsx` (CR-557 owner; BUG-741), `ScanOrderPopOut.jsx` (CR-547/552/558), `OrderEntry.jsx` (R5 hotspot). Rebase onto main, re-verify.
- **Rollback:** revert the 4 Gap-A edits + the Gap-B edit; both additive. Endpoint/constant can stay.

## Next-agent sequence
1. **Gate 2 (impact)** — done & now UNBLOCKED (see refreshed banner in `impact/CR-561_IMPACT_ANALYSIS.md`).
2. **Gate 3 (this plan)** — adopt branch `20261121-051150` for Gap A; design Gap B + OD-561-B guard.
3. **Implement** — rebase/cherry-pick branch Gap A onto main; build Gap B; add error toast + total handling.
4. **Reconcile OD-561-B** with owner.
5. **Test** — `testing_agent` E2E money test **+ live retest** of the batched price save.

**Refs:** `contracts/CR-561_UPDATE_FOOD_ITEM_PRICE_API_2026-11-20.md` · `control/OWNER_DECISIONS_CR561_PRICE_PERSIST_2026-11-20.md` · `impact/CR-561_IMPACT_ANALYSIS.md` · branch `20261121-051150` (test_reports/iteration_14.json) · gate review `investigations/INV_WEBORDER_POPUP_AND_CR561_GATE_2026-11-21.md`.
