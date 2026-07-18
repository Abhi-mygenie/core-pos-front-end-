# Addendum — Delivery-Charge Handling in Subtotal / `order_sub_total_without_tax`

> Re-verified directly from code after the delivery-order screenshot. Investigation + plan only — no code change.
> Companions: `INVESTIGATION_order_sub_total_keys.md`, `PLAN_order_sub_total_keys_split.md`.

---

## 1. Direct Code Evidence

### 1.1 UI render order (CollectPaymentPanel.jsx, L1521-1567)

The author comment on L1522 spells out the intended order:

```jsx
{/* BUG-281: Order is now — Discounts(−) → Service Charge(+) → Delivery → Tip(+) → Subtotal(pre-tax) → Taxes → Round Off */}
```

The actual JSX renders rows in exactly this top-to-bottom sequence:

| Row | Source line | Visible when |
|---|---|---|
| Item Total | L1456-1459 | always |
| Discounts block | L1467-1520 | `totalDiscount > 0` |
| Service Charge | L1530-1539 | `scApplicable && % > 0 && enabled` |
| **Delivery Charge** | **L1542-1549** | `orderType === 'delivery' && deliveryCharge > 0` |
| Tip | L1552-1559 | `tipEnabled && tip > 0` |
| **Subtotal** | **L1562-1567** | always |
| Taxes (incl. CGST/SGST on delivery) | L1578-1644 | per-component gating |
| Grand Total | L1684-1693 | always |

### 1.2 What the Subtotal value actually equals (CollectPaymentPanel.jsx:446)

```js
// Subtotal = pre-tax total = postDiscountItems + SC + tip
// (Delivery is added after tax in rawFinalTotal; delivery's own GST is already in sgst/cgst.)
const subtotal = Math.round((subtotalAfterDiscount + serviceCharge + tip) * 100) / 100;
```

**Delivery is excluded from `subtotal`.** The inline comment is explicit about it.

### 1.3 Grand-Total assembly (CollectPaymentPanel.jsx:448)

```js
const rawFinalTotal = Math.round((subtotal + sgst + cgst + deliveryCharge) * 100) / 100;
```

Delivery is added **after** tax. The math is correct — both item GST and delivery GST are already inside `sgst + cgst` — but it means `subtotal` and `rawFinalTotal` are separated by `(tax + deliveryCharge)`, not by tax alone.

### 1.4 Bill/print payload (orderTransform.js:1618 + L1549-1555)

Override path: `order_subtotal ← overrides.orderSubtotal ← CollectPaymentPanel.subtotal` → **excludes delivery**.

Fallback path (dashboard manual reprint, no live overrides):

```js
const itemBase = order.subtotalBeforeTax || order.subtotalAmount || computedSubtotal || 0;
const tipAmt   = overrides.tip !== undefined ? overrides.tip : (parseFloat(order.tipAmount) || 0);
return Math.round((itemBase + serviceChargeAmount + tipAmt) * 100) / 100;
```

→ also **excludes delivery**.

So `order_subtotal` on the print payload currently **excludes delivery in every code path**.

### 1.5 Reproduction maths for your screenshot

| Variable | Value |
|---|---|
| itemTotal | 242 |
| subtotalAfterDiscount | 242 |
| serviceCharge | 0 (delivery → SC gate fails: L391 scApplicable = dineIn/walkIn/isRoom) |
| tip | 0 |
| deliveryCharge | 1999 |
| **Subtotal (current code)** | `242 + 0 + 0 = 242` ✓ matches screenshot |
| sgst + cgst | item GST + delivery GST ≈ 412 (back-solved from Grand Total 2653) |
| rawFinalTotal | `242 + 412 + 1999 = 2653` ✓ matches screenshot |

The Grand Total is **correct**. Only the labelling/decomposition is misleading.

---

## 2. Answers To Your Five Investigation Questions

### Q1. Should the UI Subtotal for delivery include delivery charge?

**Yes — based on the current render-order in code, the value is inconsistent with its own row layout.** The Subtotal row sits **below** the Delivery Charge row, and the section is labelled "pre-tax". A casual reader (or auditor) will assume Subtotal = sum of all rows above it, ending in "before taxes". That assumption breaks today because Subtotal omits Delivery.

Two ways to make it consistent — only one is non-disruptive:

| Option | Effect on UI | Effect on Grand Total math | Effect on payload semantics |
|---|---|---|---|
| **A.** Include delivery in Subtotal value (recommended) | Subtotal becomes 2241 in your example; row order unchanged | Algebraically identical; just rearranged decomposition | `order_subtotal` and `order_sub_total_without_tax` become "everything before tax" — matches the literal meaning of the key name |
| B. Move Delivery Charge row to **after** Tax block | Subtotal stays 242 | Unchanged | Subtotal would represent items-only-plus-SC-plus-tip, still excludes delivery — semantically thin and surprising vs key name "without_tax" |

Option A is clearly preferred: it aligns name, row order, value, and your stated revised rule.

### Q2. Should `order_sub_total_without_tax` include delivery charge for delivery orders?

**Yes — per your revised rule.** "Total before tax" means *everything* on the bill that is added before GST, which on a delivery order includes the delivery charge (its own delivery GST is taxed separately, so the charge itself is pre-tax).

Concrete formula (works for every order type, since non-delivery flows have `deliveryCharge = 0`):

```
order_sub_total_without_tax = max(0, items − discount) + serviceCharge + tip + deliveryCharge
```

Rounded to 2dp.

### Q3. Does bill/print `order_subtotal` currently include or exclude delivery?

**Excludes**, in both the override path (live cashier print) and the dashboard fallback path. See §1.4.

This must be updated alongside `order_sub_total_without_tax` to stay self-consistent (both keys are the same Subtotal concept, just on different payloads).

### Q4. Is the visual row ordering wrong if Subtotal intentionally excludes delivery?

**Yes — given the current row order, the value is misleading.** Either:
- The row order is wrong (Delivery should be below Subtotal — Option B above), OR
- The value is wrong (Subtotal should include Delivery — Option A above).

The author comment on L1522 actually places Delivery between SC and Tip *in the chain leading to Subtotal*, which strongly implies Option A was the original intent and the value-side was an implementation slip.

### Q5. Can payload and UI be made consistent without changing Grand Total / GST / round-off math?

**Yes — purely an algebraic rearrangement.** Today:

```
subtotal       = postDiscount + SC + tip
rawFinalTotal  = subtotal + GST + deliveryCharge
```

After Option A:

```
subtotal       = postDiscount + SC + tip + deliveryCharge
rawFinalTotal  = subtotal + GST
```

Same Grand Total. Same GST. Same delivery GST. Same round-off. Same payment amount. Same KOT. Only the *decomposition* changes.

---

## 3. Side-by-Side: Before vs After

Using your screenshot example (Item 242, Delivery 1999, no discount/SC/tip, GST ≈ 412):

| Surface | Key / Row | Before | After |
|---|---|---|---|
| UI Item Total row | — | 242 | 242 |
| UI Service Charge row | — | (hidden, SC=0) | (hidden) |
| UI Delivery Charge row | — | 1999 | 1999 |
| UI Tip row | — | (hidden) | (hidden) |
| **UI Subtotal row** | — | **242** ← misleading | **2241** ← consistent |
| UI Taxes block | — | 412 (item GST + delivery GST) | 412 (unchanged) |
| UI Grand Total | — | 2653 | 2653 (unchanged) |
| Bill/print payload | `order_item_total` | 242 | 242 |
| Bill/print payload | `order_subtotal` | 242 | 2241 |
| Order payload | `order_sub_total_amount` | 242 (today via items-only) | 242 |
| Order payload | `order_sub_total_without_tax` | 242 (today same as above) | 2241 |
| Order payload | `order_amount` (Grand Total) | 2653 | 2653 |
| Settlement payload | `grant_amount` | 2653 | 2653 |

Non-delivery orders (e.g., dine-in with SC=6, no discount/tip): `subtotal` stays `items + SC + 0 + 0` = `126` exactly as the earlier screenshot — no regression.

---

## 4. Implementation Plan (Option A — recommended)

### 4.1 Files / Functions Touched

| File | Function / Block | Lines | Change |
|---|---|---|---|
| `src/api/transforms/orderTransform.js` | `calcOrderTotals` | L612-672 | Add new local `subtotalWithoutTax`; change RHS of `order_sub_total_without_tax` in return |
| `src/api/transforms/orderTransform.js` | `collectBillExisting` | L1124-1136, L1229-1230 | Destructure `subtotal` from `paymentData`; assign it to `order_sub_total_without_tax` |
| `src/api/transforms/orderTransform.js` | `buildBillPrintPayload` fallback | L1549-1555 | Add `+ overrideDelivery` to the fallback Subtotal formula so dashboard-reprint stays consistent with the live print path |
| `src/components/order-entry/CollectPaymentPanel.jsx` | bill-summary calc | L446-448 | Fold `deliveryCharge` into `subtotal`; remove it from `rawFinalTotal` (algebraic rearrangement) |

**4 surgical edits in 2 files. ~6 net code lines. No test infra changes, no env changes.**

### 4.2 Exact diffs (PROPOSED — not applied)

**A) `CollectPaymentPanel.jsx:446-448`**

```js
// BEFORE
const subtotal      = Math.round((subtotalAfterDiscount + serviceCharge + tip) * 100) / 100;
const rawFinalTotal = Math.round((subtotal + sgst + cgst + deliveryCharge) * 100) / 100;

// AFTER (algebraic rearrangement — same Grand Total)
const subtotal      = Math.round((subtotalAfterDiscount + serviceCharge + tip + deliveryCharge) * 100) / 100;
const rawFinalTotal = Math.round((subtotal + sgst + cgst) * 100) / 100;
```

**B) `orderTransform.js` — `calcOrderTotals` (around L657-659)**

Add local after `const serviceCharge = …` block (~L618):

```js
const subtotalWithoutTax =
  Math.round((postDiscount + serviceCharge + tipAmount + deliveryCharge) * 100) / 100;
```

Change returned keys:

```js
order_sub_total_amount:      subtotal,            // Item Total — unchanged
order_sub_total_without_tax: subtotalWithoutTax,  // Pre-tax complete (incl. delivery)
```

**C) `orderTransform.js` — `collectBillExisting` (L1124-1136 + L1229-1230)**

Destructure `subtotal` from `paymentData`:

```js
itemTotal = 0, subtotal = 0, serviceCharge = 0, deliveryCharge = 0,
```

Split keys:

```js
order_sub_total_amount:       itemTotal || 0,
order_sub_total_without_tax:  subtotal  || 0,
```

`subtotal` arriving from `CollectPaymentPanel.handlePayment` (L581) will already contain delivery after change (A), so no extra wiring.

**D) `orderTransform.js` — `buildBillPrintPayload` fallback (L1549-1555)**

```js
// BEFORE
const itemBase = order.subtotalBeforeTax || order.subtotalAmount || computedSubtotal || 0;
const tipAmt   = overrides.tip !== undefined ? overrides.tip : (parseFloat(order.tipAmount) || 0);
return Math.round((itemBase + serviceChargeAmount + tipAmt) * 100) / 100;

// AFTER
const itemBase = order.subtotalBeforeTax || order.subtotalAmount || computedSubtotal || 0;
const tipAmt   = overrides.tip !== undefined ? overrides.tip : (parseFloat(order.tipAmount) || 0);
const delAmt   = overrides.deliveryCharge !== undefined ? overrides.deliveryCharge : (order.deliveryCharge || 0);
return Math.round((itemBase + serviceChargeAmount + tipAmt + delAmt) * 100) / 100;
```

Live-print override path (which uses `overrides.orderSubtotal` = CollectPaymentPanel `subtotal`) requires no edit — it picks up the new value via cascade from (A).

### 4.3 Files / Functions Explicitly Untouched

- All tax math (item GST proration, SC GST, tip GST, delivery GST, CR-013 logic).
- All round-off math (BUG-009 ceil/floor; round-off applied only to Grand Total).
- All discount / coupon / loyalty / wallet logic.
- All SC applicability gates (orderType, isRoom).
- KOT / printer-agent payloads.
- `transferToRoom` (does not emit either key).
- Inbound `fromAPI.order` and `reportTransform.js` (read paths).
- `package.json`, `.env`, supervisor config.

### 4.4 Round-off / Grand-Total Invariance Proof Sketch

Let `T = sgst + cgst` (which today already includes delivery GST per CR-013, since `deliveryGst` is summed into `totalGst` at L417 of CollectPaymentPanel).

Today: `rawFinalTotal = (postDiscount + SC + tip) + T + delivery`
After: `rawFinalTotal = (postDiscount + SC + tip + delivery) + T`

Both expressions are `postDiscount + SC + tip + delivery + T`. Rounding (BUG-009) is applied to `rawFinalTotal` only — identical input → identical `finalTotal` → identical `roundOff`. ✓

Same proof applies to `calcOrderTotals`: it never used `subtotal` in its `rawTotal` calc (L649 uses `postDiscount + SC + tip + delivery + totalTax` directly), so the new local `subtotalWithoutTax` is *purely additive metadata* — it cannot perturb `order_amount` or `round_up`. ✓

---

## 5. Risks & Open Items

| Risk | Severity | Note |
|---|---|---|
| Backend reads `order_subtotal` from print payload as "items-only-pre-tax" today and breaks on receiving a higher value. | Medium | Confirm with backend before deploy. The natural English reading of the key supports the new value; we are aligning, not diverging. |
| Backend audits compare `order_sub_total_without_tax + tax_amount = order_amount`. Today this holds **only when delivery=0** (since delivery sits outside subtotal). After the fix it holds in **all** cases. | Low (improvement) | Net positive for auditability. Worth calling out so backend can update report invariants. |
| UI shows a sudden jump in the Subtotal value for delivery orders post-deploy. | Low | This is the desired behavior. Worth a brief release note for ops users. |
| Dashboard reprints (no live overrides) — fallback path needs (D); without it, dashboard reprints would diverge from cashier prints on delivery orders. | Addressed in plan as edit (D). | n/a |
| Non-delivery orders: `deliveryCharge = 0` everywhere → behavior byte-identical to today. | None | Validated by inspection of upstream gates. |
| `placeOrder` (postpaid) — discount/tip default to 0; delivery is gated by `orderType === 'delivery'`. So `order_sub_total_without_tax` will be `subtotal + SC + delivery` on delivery-postpaid place-order. | None | Matches the rule. |

---

## 6. Verification Plan (for the implementing agent post-approval)

For each row, capture the outbound payload from DevTools → Network and the Bill Summary UI:

| Scenario | Cart | Expected `order_sub_total_amount` | Expected `order_sub_total_without_tax` | Expected UI Subtotal | Expected Grand Total |
|---|---|---|---|---|---|
| Dine-in, no SC/disc/tip, item GST 5% | 1 × ₹100 | 100 | 100 | 100 | 105 |
| Dine-in, SC 5%, no disc/tip | 1 × ₹120, GST 5% | 120 | 126 | 126 | 132.30 (pre-round) → 132 |
| Dine-in, SC 5%, disc ₹10, tip ₹5 | 1 × ₹120 | 120 | 105.5 (= 110 + 5.5 + 5) | 105.5 | + GST/round-off |
| **Delivery, no SC/disc/tip, delivery ₹1999, item GST 5%** | 1 × ₹242 | **242** | **2241** | **2241** | **2653** ✓ matches screenshot |
| Takeaway, no SC/disc/tip | 1 × ₹100 | 100 | 100 | 100 | + GST |
| Room order (no associated, no balance) | 1 × ₹100, SC 10% | 100 | 110 | 110 | + GST |
| Bill print payload (`order-temp-store`) for the delivery scenario above | | `order_item_total = 242`, `order_subtotal = 2241` | same | n/a | n/a |

Confirm: `order_amount`, `gst_tax`, `vat_tax`, `service_tax`, `service_gst_tax_amount`, `tip_tax_amount`, `round_up`, `payment_amount`, `grant_amount`, KOT `printer_agent` are byte-identical to a pre-change capture for every scenario.

---

## 7. Recap

- Bill/print `order_subtotal` and order `order_sub_total_without_tax` both currently **exclude** delivery — confirmed from code.
- UI row order places Delivery above Subtotal but Subtotal value omits Delivery — confirmed inconsistency, predates this thread.
- Your revised rule (`order_sub_total_without_tax` includes delivery for delivery orders) is consistent with row order and key semantics — recommended.
- Plan needs ~6 net code lines across 2 files (4 surgical edits). Grand Total / GST / round-off / payment / KOT untouched, mathematically invariant under the rearrangement.
- One **open question** for backend owner: confirm `order_subtotal` / `order_sub_total_without_tax` are read as "everything before tax (incl. delivery)" rather than "items-only-pre-tax". If the latter, only the formula in the new local changes; structural plumbing is identical.

Awaiting explicit go-ahead before any code is written.
