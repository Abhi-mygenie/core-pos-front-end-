# Pre-Implementation Sign-Off — Subtotal / Delivery Charge Alignment

> Final planning confirmation against the 8 approval clarifications. No code change. Builds on:
> - `/app/memory/BUCKETED_PLAN_subtotal_alignment.md`
> - `/app/memory/PLAN_subtotal_delivery_addendum.md`
> - `/app/memory/INVESTIGATION_order_sub_total_keys.md`

---

## Clarification-by-Clarification Acknowledgement

| # | Clarification | Status | Evidence / Plan Item |
|---|---|---|---|
| 1 | Subtotal must include delivery when applicable | **Acknowledged** | Bucket 1 (UI) folds `+ deliveryCharge` into `subtotal` at CollectPaymentPanel.jsx:446. Bucket 2 introduces matching helper local `subtotalWithoutTax`. `deliveryCharge` is already 0 for non-delivery orders by upstream `orderType === 'delivery'` gate (orderTransform.js:797 / L918; CollectPaymentPanel.jsx:382). |
| 2 | Grand Total must remain unchanged | **Mathematically proven** | Algebraic invariance: with `T = sgst + cgst`, `(postDisc+SC+tip) + T + delivery ≡ (postDisc+SC+tip+delivery) + T`. Identical input to BUG-009 round-off. Plus `calcOrderTotals.rawTotal` (L649) reads its components directly, never `subtotal` — so `order_amount` is byte-identical regardless of the new local. |
| 3 | `delivery_charge` must remain a separate key | **Preserved** | No edit touches the `delivery_charge` emit sites: orderTransform.js L837 (placeOrder), L949 (updateOrder), L1070 (placeOrderWithPayment), L1250 (collectBillExisting), L1671 (buildBillPrintPayload). |
| 4 | Delivery GST must remain unchanged, no double-count | **Preserved** | `delGstAmt = deliveryCharge × delTaxRate` (L640 calcOrderTotals; L415 CollectPaymentPanel) and its inclusion in composite `gst_tax` (L643 / L417) are **not touched** by any bucket. The only "delivery" arithmetic moved is the principal, between `subtotal` and `rawFinalTotal`. The GST term sits in `sgst + cgst`, which is in both expressions identically. |
| 5 | Consistency across all flows | **Covered** | Bucket 1 (UI), Bucket 2 (placeOrder / updateOrder / placeOrderWithPayment / collectBillExisting), Bucket 3 (buildBillPrintPayload fallback). Live-cashier print and BUG-273 auto-print cascade from Bucket 1 automatically. Transfer-to-Room (does not emit either key) unaffected. |
| 6 | Verify `fromAPI.order` maps `delivery_charge → order.deliveryCharge` | **CONFIRMED — already mapped** | `orderTransform.js:280` reads `deliveryCharge: parseFloat(api.delivery_charge) || 0`. **No 1-line patch needed**, the conditional addition listed in §5.4 of the bucketed plan is DROPPED. Bucket 3's fallback (`order.deliveryCharge`) works out of the box. |
| 7 | Add QA check for OrderDetailSheet/report tax display | **CONFIRMED SAFE — no patch needed** | OrderDetailSheet.jsx:751 reads `displayData.subtotal` and `displayData.deliveryCharge`. Both come from `reportFromAPI.singleOrderNew` (reportTransform.js:453-527): `subtotal` is computed **locally from `items.reduce`** at L466 (items-only sum), NOT from the inbound `order_sub_total_*` keys. `deliveryCharge` is from `order.delivery_charge` (L527). Our outbound fix does **not** alter the inbound `singleOrderNew` transform → `displayData.subtotal` stays items-only → existing Tax formula `amount − subtotal − deliveryCharge` is unaffected. QA still recommended (capture before/after view of a delivery order) but no code change anticipated. |
| 8 | Do not trust the old test asserting `order_sub_total_amount === order_amount` | **Acknowledged** | `updateOrderPayload.test.js:248-258` was already flagged as loose. It compares `order_sub_total_amount` (items-only) to `order_amount` (grand total) — these are equal only in a contrived no-tax fixture. We treat the test as a fixture-pinned artefact, not a business rule. After fix, the same fixture still passes because neither key changes value. |

---

## Final Code Delta (Locked)

| Bucket | File | Function / Block | Lines | Net Lines |
|---|---|---|---|---|
| 1 | `src/components/order-entry/CollectPaymentPanel.jsx` | bill-summary calc | L446, L448 | 2 (formula) + minor comment hygiene at L446 & L1561 |
| 2 | `src/api/transforms/orderTransform.js` | `calcOrderTotals` | new local after L618; change return at L657-659 | +1 local, change 1 returned key |
| 2 | `src/api/transforms/orderTransform.js` | `collectBillExisting` | destructure at L1124-1136; payload at L1229-1230 | +1 destructured field; change 1 payload key |
| 3 | `src/api/transforms/orderTransform.js` | `buildBillPrintPayload` fallback IIFE | L1549-1555 | +3 lines (delAmt resolution + addition) |
| — | inbound `fromAPI.order` patch | — | **NOT NEEDED** (already mapped, see #6 above) | 0 |

**Total: 2 files, ≤ 9 net production code lines, plus ≤ 3 comment-hygiene lines. No env, no deps, no supervisor, no test infra changes.**

---

## Confirmed Untouched (Guard-Rails)

- `gst_tax`, `vat_tax`, `tax_amount`, `total_gst_tax_amount`, `service_gst_tax_amount`, `tip_tax_amount`, item-GST proration, SC-GST, tip-GST, delivery-GST math (CR-013).
- `order_amount`, `round_up`, BUG-009 rounding rule, `rawTotal`, `rawFinalTotal` output values.
- `payment_amount`, `grant_amount`, `partial_payments`, cash-pills, change calc, Split-Bill totals, `effectiveTotal`.
- `delivery_charge` (separate key on every payload).
- `service_tax` (SC principal).
- `discount_*`, `coupon_*`, `loyalty_*`, `wallet_*` keys and their compute paths.
- `printer_agent`, `selectAgentsForKot`, `cartStationsToSet` (KOT routing metadata).
- `transferToRoom` payload (does not emit either key).
- `fromAPI.order` and `fromAPI.orderItem` (inbound response transforms).
- `reportTransform.singleOrderNew` and OrderDetailSheet Tax formula (now confirmed safe).
- `reportTransform.js` row builder (read path only).
- BUG-281 row order in the UI.
- `cart` / `food_detail` line items and their per-item GST / discount / complementary handling.
- All `__tests__` files (no existing test breaks; optional additions are Bucket 4 only).
- `.env`, `package.json`, supervisor config, integration secrets.

---

## QA / Verification Plan (post-implementation, when approved)

### A. Outbound Payload Capture (DevTools → Network), before vs after

| Endpoint | Scenario | Expected `order_sub_total_amount` | Expected `order_sub_total_without_tax` | Expected `order_amount` |
|---|---|---|---|---|
| `place-order` | Dine-in ₹100, no SC/disc/tip, item GST 5% | 100 | 100 | 105 |
| `place-order` | Dine-in ₹120, SC 5% | 120 | 126 | computed (unchanged from pre-fix) |
| `place-order` | **Delivery ₹242, delivery ₹1999, GST 5%/5%** | **242** | **2241** | **2653** |
| `update-place-order` | matching dine-in / delivery scenarios | same as above | same | unchanged |
| `place-order` (with payment) | Dine-in ₹120, SC 5%, disc ₹10, tip ₹5 | 120 | 120.5 | unchanged |
| `order-bill-payment` | Settlement on delivery ₹242 / ₹1999 | 242 | 2241 | grand_amount = 2653 |
| `order-temp-store` | Live cashier print, delivery scenario | `order_item_total = 242`, `order_subtotal = 2241`, `delivery_charge = 1999` | — | — |
| `order-temp-store` | Dashboard OrderCard reprint, same order | identical to cashier print | — | — |
| `order-temp-store` | Dashboard TableCard reprint | identical | — | — |
| `order-temp-store` | RePrintButton after settlement | identical | — | — |

### B. UI Screenshots (Bill Summary card on Collect Payment screen)

- Dine-in ₹120 SC 5% → Subtotal row reads ₹126 (unchanged from earlier confirmation).
- **Delivery ₹242 / ₹1999 → Subtotal row reads ₹2241**, Delivery Charge row reads ₹1999, Grand Total reads ₹2653 (unchanged).

### C. Regression Sweep (must remain byte-identical)

- `gst_tax`, `vat_tax`, `service_tax`, `service_gst_tax_amount`, `tip_tax_amount`, `total_gst_tax_amount`, `round_up`, `delivery_charge`, `payment_amount`, `grant_amount`, `cgst_amount`, `sgst_amount`, `printer_agent`, `partial_payments`, `cart`, `food_detail`.

### D. Reports Drawer Sanity (Clarification 7)

- Open OrderDetailSheet for a delivery order before fix → note Subtotal / Delivery Charge / Tax / Total values.
- Open same after fix → same values (since reports drawer computes `subtotal` locally from items, not from outbound keys). If any drift observed, surfaces a separate follow-up.

---

## Open Items at Sign-Off Time

| # | Item | Owner | Required Before Implementation? |
|---|---|---|---|
| O1 | Backend owner: confirm `order_sub_total_without_tax` / `order_subtotal` semantic = "pre-tax including delivery". | Backend | Recommended yes — if backend insists on "items-only", only the new local's formula changes; structural plumbing identical. |
| O2 | Backend owner: confirm bill template renders correctly with the new (higher) `order_subtotal` value for delivery orders. | Backend | Recommended yes — purely a render-side concern, but worth a 60-second sanity check on preprod. |
| O3 | Approval to proceed to implementation. | **YOU** | **Yes — explicit go-ahead required.** |

---

## Final Recap

- All 8 clarifications acknowledged and aligned.
- Item #6 (inbound mapping) — pre-verified, no extra patch needed.
- Item #7 (reports tax formula) — pre-verified, safe; QA capture recommended but no code edit anticipated.
- Final code delta: **2 files, ≤ 9 production code lines + comment hygiene**.
- Grand Total mathematically invariant.
- All other tax / SC / delivery-GST / round-off / payment / KOT / printer-agent paths untouched.
- No existing test breaks.

**Awaiting your explicit go-ahead before any code is written.**
