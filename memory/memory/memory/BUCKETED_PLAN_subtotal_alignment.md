# Bucketed Implementation Plan — Item Total / Subtotal / Delivery Charge Alignment

> Planning only. No code change. Builds on:
> - `/app/memory/INVESTIGATION_order_sub_total_keys.md`
> - `/app/memory/PLAN_order_sub_total_keys_split.md`
> - `/app/memory/PLAN_subtotal_delivery_addendum.md`

---

## 1. Summary Verdict

**Current issue (verified from code):**
- UI Bill Summary renders rows in order: `Item Total → Discount → SC → Delivery → Tip → Subtotal → Taxes → Grand Total`, but the **Subtotal value** (CollectPaymentPanel.jsx:446) excludes `deliveryCharge`. Delivery is folded into `rawFinalTotal` after tax (L448) instead.
- Both outbound writers of `order_sub_total_amount` and `order_sub_total_without_tax` (`calcOrderTotals` returning at L657-659, and `collectBillExisting` at L1229-1230) emit **the same value** to both keys — items-only, pre-discount.
- `buildBillPrintPayload` (L1549-1555 + L1618) emits `order_subtotal` as items + SC + tip — **delivery excluded** — in both override and fallback paths.

**Required new semantic:**
- Item Total → strictly items-only.
- Subtotal → "all pre-tax components, including delivery when applicable" = `items − discount + SC + tip + delivery`.

**Fix scope:** All three layers — **UI** + **Order payload** + **Bill/Print payload**. Coordinated to keep Grand Total, GST, delivery GST, round-off, payment amount, and KOT/printer-agent byte-identical.

---

## 2. Final Mapping Contract

| Concept | Definition | UI Row | Order Payload Key | Bill / Print Payload Key |
|---|---|---|---|---|
| **Item Total** | `Σ ((_fullUnitPrice ?? price) × qty)` for non-complementary cart items. Pre-discount, pre-SC, pre-tip, pre-delivery, pre-tax. | "Item Total" (CollectPaymentPanel.jsx L1191 / L1458) | `order_sub_total_amount` | `order_item_total` |
| **Subtotal** | `max(0, items − totalDiscount) + serviceCharge + tip + deliveryCharge`, rounded 2dp. Excludes all tax, round-off, grand total. Delivery folded in when `orderType === 'delivery'` (gated upstream so it's 0 otherwise). | "Subtotal" (CollectPaymentPanel.jsx L1565) | `order_sub_total_without_tax` | `order_subtotal` |
| **Delivery Charge (principal)** | User-entered delivery fee for delivery orders. Stays as its own key everywhere. | "Delivery Charge" row (only for delivery & > 0) | `delivery_charge` (unchanged) | `delivery_charge` (unchanged) |
| **Tax** | Composite GST (item + SC + tip + delivery components) + VAT. Round-off NOT folded in (BUG-009). | "Taxes" section breakdown | `gst_tax`, `vat_tax`, `service_gst_tax_amount`, `tip_tax_amount`, plus `total_gst_tax_amount` on settlement | `gst_tax`, `cgst_amount`, `sgst_amount`, `vat_tax` |
| **Grand Total** | `subtotal + GST + (delivery if not yet in subtotal)` — after fix this becomes `subtotal + GST` because subtotal now contains delivery. BUG-009 round applied. | "Grand Total" row | `order_amount` / `payment_amount` / `grant_amount` | `payment_amount` / `grant_amount` |

**Invariant under this fix:** Grand Total formula's *output* is byte-identical. Only the decomposition between `subtotal` and `delivery` shifts.

---

## 3. Bucket 1 — UI Subtotal Fix

### 3.1 Files / Functions

| File | Function / Block | Lines |
|---|---|---|
| `src/components/order-entry/CollectPaymentPanel.jsx` | bill-summary calc (top of component body) | L446-448 |

### 3.2 Current Formula

```js
// L446-448
const subtotal      = Math.round((subtotalAfterDiscount + serviceCharge + tip) * 100) / 100;
const rawFinalTotal = Math.round((subtotal + sgst + cgst + deliveryCharge) * 100) / 100;
```

Semantic today: Subtotal = pre-tax-excluding-delivery. Delivery is added separately to `rawFinalTotal`.

### 3.3 Proposed Formula

```js
// PROPOSED — algebraic rearrangement; same final Grand Total
const subtotal      = Math.round((subtotalAfterDiscount + serviceCharge + tip + deliveryCharge) * 100) / 100;
const rawFinalTotal = Math.round((subtotal + sgst + cgst) * 100) / 100;
```

`deliveryCharge` (L382) is already 0 for non-delivery orders (`orderType === 'delivery'` gate). No new gate needed.

### 3.4 Comment Hygiene (within the same edit, no extra surface area)

- L446 inline comment ("Delivery is added after tax in rawFinalTotal…") becomes inaccurate after the change. Replace with: `Subtotal = items − discount + SC + tip + delivery (pre-tax complete). Tax sits between Subtotal and Grand Total.`
- L1522 banner comment (BUG-281 order narration) already aligns with the new semantic — no change needed.
- L1561 comment near the Subtotal row (`Subtotal = pre-tax complete (itemTotal − discount + SC + tip)`) → update to include `+ delivery`.

### 3.5 Row Order / Labels — Do They Need to Change?

**No.** The current row order already matches the new semantic:

> Item Total → Discount → SC → Delivery → Tip → Subtotal → Taxes → Grand Total

After the fix, Subtotal correctly equals the sum of every row above it that has a positive value. No row needs to be moved, hidden, or relabeled. The "Subtotal" label stays.

### 3.6 Risk

- **Cashiers who memorised the old display will see a sudden jump** for delivery orders (Subtotal jumps from items-only-derived → items + delivery in the example: 242 → 2241). Recommend a brief release note for ops users.
- **No mathematical risk.** Algebraic equivalence proven below.

### 3.7 Invariance Proof

Let `T = sgst + cgst` (already contains item GST + SC GST + tip GST + delivery GST, per CR-013 aggregation at L417).

- Today: `rawFinalTotal = (postDiscount + SC + tip) + T + deliveryCharge`
- After: `rawFinalTotal = (postDiscount + SC + tip + deliveryCharge) + T`

Both expand to `postDiscount + SC + tip + deliveryCharge + T`. Identical input to the BUG-009 round-off logic (L451-456) → identical `finalTotal` → identical `roundOff` → identical `effectiveTotal` → identical Cash quick-pills, Split totals, payment-payload `finalTotal`. ∎

### 3.8 Acceptance Criteria

| # | Scenario | Expected Subtotal | Expected Grand Total |
|---|---|---|---|
| 1 | Dine-in, ₹100, no SC, no disc, no tip, GST 5% | 100 | 105 |
| 2 | Dine-in, ₹120, SC 5%, no disc/tip | 126 | 126 + GST → BUG-009 round |
| 3 | Dine-in, ₹120, SC 5%, disc ₹10, tip ₹5 | 120.5 (= 110 + 5.5 + 5) | 120.5 + GST → round |
| 4 | **Delivery, ₹242, delivery ₹1999, GST 5%/5%** | **2241** | **2653** (matches screenshot) |
| 5 | Takeaway, ₹100, no SC | 100 | 100 + GST |
| 6 | Room, ₹100, SC 10%, no disc/tip, room balance ₹500 | 110 | 110 + GST + 500 |

For every scenario verify: `bill-subtotal-value` test-id renders the new value; Grand Total test-id renders the unchanged value; cash quick-pills, Split Bill total, and Change row use unchanged `finalTotal`.

### 3.9 Manual Test Cases

- Toggle delivery between 0 and 1999 → Subtotal moves by exactly 1999; Grand Total moves by 1999 + delivery GST (unchanged behavior).
- Toggle SC on/off → Subtotal moves by SC; delivery line stays put.
- Add discount → Subtotal drops by discount; delivery row unchanged.
- Add tip → Subtotal goes up by tip.
- Switch order types: dine-in / takeaway / delivery / room — Subtotal recomputes correctly with the same formula.

---

## 4. Bucket 2 — Order Payload Mapping Fix

### 4.1 Files / Functions

| File | Function | Lines | Edit Type |
|---|---|---|---|
| `src/api/transforms/orderTransform.js` | `calcOrderTotals` | L585-673 | Add one local; reassign one returned key |
| `src/api/transforms/orderTransform.js` | `collectBillExisting` | L1124-1136 (destructure) + L1229-1230 (payload) | Add one destructured field; reassign one payload key |

`calcOrderTotals` is shared by **placeOrder, updateOrder, placeOrderWithPayment** via the `...totals` / `...combinedTotals` spread. One helper edit covers all three flows.

### 4.2 Proposed Diffs

**Inside `calcOrderTotals`, after `serviceCharge` is computed (~ L618):**

```js
// PROPOSED — new local; reuses existing postDiscount, serviceCharge, tipAmount, deliveryCharge
const subtotalWithoutTax = Math.round(
  (postDiscount + serviceCharge + tipAmount + deliveryCharge) * 100
) / 100;
```

**Returned object (L657-672):**

```js
return {
  order_sub_total_amount:      subtotal,             // Item Total — unchanged
  order_sub_total_without_tax: subtotalWithoutTax,   // Subtotal — NEW
  tax_amount:                  totalTax,
  gst_tax:                     Math.round(gstTax * 100) / 100,
  vat_tax:                     Math.round(vatTax * 100) / 100,
  order_amount:                orderAmount,
  round_up:                    String(roundUpAbs.toFixed(2)),
  service_tax:                 serviceCharge,
  service_gst_tax_amount:      Math.round(scGstAmt  * 100) / 100,
  tip_tax_amount:              Math.round(tipGstAmt * 100) / 100,
};
```

`order_amount` is computed via `rawTotal = postDiscount + SC + tip + delivery + totalTax` at L649 — **no `subtotal` dependency** — so this remains byte-identical.

**Inside `collectBillExisting` (L1124-1136 destructure):**

```js
// PROPOSED — add `subtotal` to the destructure
const {
  method = 'cash', transactionId = '',
  splitPayments = [], tip = 0,
  finalTotal = 0, sgst = 0, cgst = 0, vatAmount = 0,
  itemTotal = 0, subtotal = 0,                       // ← NEW
  serviceCharge = 0, deliveryCharge = 0,
  tabContact = null, discounts = {},
  roomBalance = 0,
  serviceGstTaxAmount = 0,
  tipTaxAmount = 0,
} = paymentData;
```

**Payload (L1229-1230):**

```js
order_sub_total_amount:       itemTotal || 0,
order_sub_total_without_tax:  subtotal  || 0,        // ← was `itemTotal`
```

CollectPaymentPanel already passes `paymentData.subtotal` at L581. After Bucket 1, that value will include delivery automatically — no upstream wiring needed.

### 4.3 Coverage Verification (per flow)

| Flow | Function | Discount / Tip / Delivery passed to `calcOrderTotals`? | Resulting `order_sub_total_without_tax` |
|---|---|---|---|
| Place Order (dine-in postpaid) | `placeOrder` L796 | none (defaults 0); delivery only if delivery order | `items + SC + 0 + 0` = `items + SC` |
| Update/Edit Order | `updateOrder` L917 | same as above | same as place-order |
| Place Order + Payment (prepaid) | `placeOrderWithPayment` L1001 | yes — `discountAmount`, `tipAmount`, `deliveryCharge` all forwarded | `postDiscount + SC + tip + delivery` |
| Collect Bill / Settlement | `collectBillExisting` L1124 | pulled from `paymentData.subtotal` (Bucket-1 cascade) | identical to UI Subtotal |
| Transfer to Room | `transferToRoom` L1293 | **does not emit either key** — unaffected | n/a |
| Cancel / Status / Add-custom | various | non-financial payloads — unaffected | n/a |

### 4.4 Risk

- **One existing test** (`src/__tests__/api/transforms/updateOrderPayload.test.js:250-258`) asserts `payload.order_sub_total_amount === payload.order_amount` in a contrived no-tax fixture. Unaffected — that assertion compares `order_sub_total_amount` (still items-only after fix) against `order_amount` (unchanged). Both sides untouched by Bucket 2.
- **No outbound test** locks the two investigated keys to each other or to a specific value.
- `placeOrder` / `updateOrder` (postpaid) do **not** pass `tipAmount` to `calcOrderTotals`. After fix, `order_sub_total_without_tax` for a postpaid place-order = `items + SC + delivery` (no tip in the sum). That's correct — tip is entered only on the Collect Bill screen for postpaid orders.

### 4.5 Acceptance Criteria — Outbound Payload Capture

Capture from DevTools Network for each:

| Endpoint | Scenario | `order_sub_total_amount` | `order_sub_total_without_tax` |
|---|---|---|---|
| `place-order` | Dine-in ₹100, no SC | 100 | 100 |
| `place-order` | Dine-in ₹120, SC 5% | 120 | 126 |
| `place-order` | Delivery ₹242, delivery ₹1999 | 242 | 2241 |
| `update-place-order` | Same as place-order scenarios | same | same |
| `place-order` (with payment) | Dine-in ₹120, SC 5%, disc ₹10, tip ₹5 | 120 | 120.5 |
| `order-bill-payment` | Settlement on delivery ₹242 / ₹1999 | 242 | 2241 |

And confirm unchanged: `order_amount`, `tax_amount`, `gst_tax`, `vat_tax`, `service_tax`, `service_gst_tax_amount`, `tip_tax_amount`, `round_up`, `delivery_charge`, `payment_amount`, `grant_amount`, `printer_agent`, `cart` / `food_detail`.

---

## 5. Bucket 3 — Bill / Print / order-temp-store Payload Fix

### 5.1 Files / Functions

| File | Function / Block | Lines | Edit Type |
|---|---|---|---|
| `src/api/transforms/orderTransform.js` | `buildBillPrintPayload` — fallback Subtotal formula | L1549-1555 | Add `delivery` term to the IIFE |
| `src/components/order-entry/CollectPaymentPanel.jsx` | (live cashier print) | — | **No edit** — cascades from Bucket 1's `subtotal` change via L619 |
| `src/components/cards/OrderCard.jsx` | dashboard manual print | L134-137 | **No edit** — fallback reads `order.deliveryCharge` directly |
| `src/components/cards/TableCard.jsx` | dashboard manual print | L158-161 | **No edit** — same reason |
| `src/components/order-entry/RePrintButton.jsx` | re-print after settlement | L112-115 | **No edit** — same reason |
| `src/api/services/orderService.js` | `printOrder` API call | L126-158 | **No edit** — transparent passthrough |

**Net: 1 edit in Bucket 3, one file, ≤ 3 lines.**

### 5.2 Proposed Diff (Fallback Subtotal)

```js
// BEFORE — orderTransform.js:1549-1555
const finalOrderSubtotal = overrides.orderSubtotal !== undefined
  ? overrides.orderSubtotal
  : (() => {
      const itemBase = order.subtotalBeforeTax || order.subtotalAmount || computedSubtotal || 0;
      const tipAmt   = overrides.tip !== undefined ? overrides.tip : (parseFloat(order.tipAmount) || 0);
      return Math.round((itemBase + serviceChargeAmount + tipAmt) * 100) / 100;
    })();

// AFTER
const finalOrderSubtotal = overrides.orderSubtotal !== undefined
  ? overrides.orderSubtotal
  : (() => {
      const itemBase = order.subtotalBeforeTax || order.subtotalAmount || computedSubtotal || 0;
      const tipAmt   = overrides.tip !== undefined ? overrides.tip : (parseFloat(order.tipAmount) || 0);
      const delAmt   = overrides.deliveryCharge !== undefined
        ? overrides.deliveryCharge
        : (parseFloat(order.deliveryCharge) || 0);
      return Math.round((itemBase + serviceChargeAmount + tipAmt + delAmt) * 100) / 100;
    })();
```

### 5.3 Path Coverage

| Print Path | Caller | Goes through which branch? | After fix carries delivery? |
|---|---|---|---|
| Live cashier "Print Bill" (from Collect Payment screen) | `CollectPaymentPanel.handlePrintBill` (L611-643) → `OrderEntry.jsx:1274-1299` → `printOrder` → `buildBillPrintPayload` | **Override branch** (uses `overrides.orderSubtotal` = CollectPaymentPanel.subtotal) | **Yes** — automatically, via Bucket 1 cascade. No Bucket 3 work needed for this path. |
| Auto-print after Place+Pay | `OrderEntry.jsx:1308-onwards` (BUG-273 path) | Override branch (forwards CollectPaymentPanel overrides) | Yes, via Bucket 1 cascade |
| Dashboard order-card "Print Bill" | `OrderCard.jsx:134-137` | **Fallback branch** (no `orderSubtotal` in overrides) | Yes, via Bucket 3 edit reading `order.deliveryCharge` from socket-hydrated order |
| Dashboard table-card "Print Bill" | `TableCard.jsx:158-161` | Fallback branch | Yes, via Bucket 3 edit |
| "Re-print" button after settlement | `RePrintButton.jsx:112-115` | Fallback branch | Yes, via Bucket 3 edit |

`order.deliveryCharge` is hydrated on the socket-driven order object via `fromAPI.order` (not currently mapped — see Open Item 7.4 below).

### 5.4 Open Item: `fromAPI.order` Does Not Currently Map `delivery_charge`

**Verification needed during implementation:** Search `fromAPI.order` (orderTransform.js:153-378) for whether `delivery_charge` from the API response is parsed into `order.deliveryCharge`. If not, Bucket 3's fallback would read `undefined` and treat delivery as 0 — defeating the dashboard-reprint fix.

If missing, Bucket 3 grows by one additional one-line edit inside `fromAPI.order`:

```js
// PROPOSED if needed
deliveryCharge: parseFloat(api.delivery_charge) || 0,
```

If the field is already mapped (under a different name like `deliver_charge` or similar) the existing key just gets read. **This must be confirmed before merge.**

### 5.5 `delivery_charge` as a Separate Key — Preserved

The fix does **not** remove `delivery_charge` from any payload:

- Order payloads (placeOrder/updateOrder/placeOrderWithPayment/collectBillExisting): `delivery_charge` continues to be emitted as-is.
- Bill/print payload: `delivery_charge` (L1671) continues to be emitted as-is.

The change only means the *value of subtotal* now arithmetically contains delivery; the standalone `delivery_charge` key is still sent for backend itemisation / line rendering.

### 5.6 Printer-Agent Block — Untouched

`printer_agent` (set via `selectAgentsForKot(printerAgents, cartStationsToSet(items))`) is **metadata only**:
- Carries station-printer mapping (BAR / KITCHEN / etc.) for KOT routing.
- Carries no financial totals.
- Built independently from any subtotal/delivery logic.
- Not present on bill-print payload (only on place-order / update-order / cancel paths).

Bucket 3 makes zero changes to `printer_agent` or `selectAgentsForKot`.

### 5.7 Risk

- **Dashboard reprint becomes consistent with cashier print.** Before: dashboard reprint may have shown a Subtotal that mismatched what the cashier printed seconds earlier. After: both produce the same Subtotal. Net positive.
- **If `fromAPI.order` does not map `delivery_charge`** (Open Item 5.4), dashboard reprint silently treats delivery as 0. Implementation must confirm this before merge.
- **`order_subtotal` value increases for delivery orders** — backend bill template must render correctly with the new (higher) value. Confirm with backend (see Bucket 4 / Open Questions).

### 5.8 Acceptance Criteria — `order-temp-store` Payload Capture

For each print path, capture the payload sent to `/api/v1/vendoremployee/order-temp-store`:

| Print Path | Scenario | `order_item_total` | `order_subtotal` | `delivery_charge` |
|---|---|---|---|---|
| Cashier print, delivery ₹242 / ₹1999 | – | 242 | 2241 | 1999 |
| Cashier print, dine-in ₹120 SC 5% | – | 120 | 126 | 0 |
| Dashboard order-card reprint, delivery order | – | 242 | 2241 | 1999 |
| Dashboard table-card reprint, dine-in order | – | 120 | 126 | 0 |
| Re-print after settlement (delivery) | – | 242 | 2241 | 1999 |

Confirm unchanged: `payment_amount`, `grant_amount`, `gst_tax`, `cgst_amount`, `sgst_amount`, `vat_tax`, `Tip`, `discount_amount`, `serviceChargeAmount`, `roomRemainingPay`, `roomAdvancePay`, `associated_orders`, `billFoodList`.

---

## 6. Bucket 4 — QA & Regression Tests (Optional)

### 6.1 Tests Likely to Break (Code Trace)

**Verified search across `src/__tests__/`:**

| Test File | Line | Concern | Status After Fix |
|---|---|---|---|
| `orderTransformFinancials.test.js` | L88-110, L156-171, L259, L367 | Tests `fromAPI.order` (inbound, response side) mapping `order_sub_total_without_tax → subtotalBeforeTax`. | **Unaffected** — inbound mapping is untouched. |
| `orderTransform.orderFrom.test.js` | L29-30, L156 | Fixture supplies distinct values for the two API keys (`order_sub_total_without_tax: 200`, `order_sub_total_amount: 220`); asserts inbound split. | **Unaffected** — inbound mapping unchanged. |
| `updateOrderPayload.test.js` | L248-258 | Asserts `payload.order_sub_total_amount === payload.order_amount` in a no-tax fixture. | **Unaffected** — `order_sub_total_amount` (items-only) is unchanged; `order_amount` is unchanged. |

**No existing test will break.**

### 6.2 Tests Worth Adding (Optional, Focused — NOT a Sweep)

Only add if Bucket 4 is explicitly approved. Minimum useful additions:

| New Test | File | Asserts |
|---|---|---|
| Place-order outbound: dine-in (SC 5%, no delivery) | `updateOrderPayload.test.js` or new `placeOrderPayload.test.js` | `order_sub_total_amount = 120`, `order_sub_total_without_tax = 126`, `order_amount = 132` (or computed via fixture) |
| Place-order outbound: delivery (delivery=1999) | same | `order_sub_total_amount = 242`, `order_sub_total_without_tax = 2241`, `delivery_charge = 1999`, `order_amount = 2653` (or fixture) |
| Collect-bill payload outbound | new test | `subtotal` from paymentData propagates to `order_sub_total_without_tax` |
| `buildBillPrintPayload` fallback (delivery order, no overrides) | new test | `order_subtotal` includes `order.deliveryCharge` |
| Algebraic invariance: rawFinalTotal pre vs post | unit test in CollectPaymentPanel test (if exists) or new helper test | Same Grand Total for identical inputs |

### 6.3 Manual QA Payload Verification Steps

Before-and-after capture in DevTools → Network:

1. **Dine-in, ₹120, SC 5%** (no delivery):
   - place-order: `order_sub_total_amount=120, order_sub_total_without_tax=126`
   - order-bill-payment: same
   - order-temp-store: `order_item_total=120, order_subtotal=126`
2. **Delivery, ₹242, delivery ₹1999**:
   - place-order: `order_sub_total_amount=242, order_sub_total_without_tax=2241, delivery_charge=1999, order_amount=2653`
   - order-bill-payment: same
   - order-temp-store: `order_item_total=242, order_subtotal=2241, delivery_charge=1999, payment_amount=2653`
3. **Dashboard reprint of #2**: should match #2 print payload exactly.
4. **UI screenshot**: bill summary panel for #2 → Subtotal row reads "₹2241", Delivery Charge row reads "₹1999", Grand Total reads "₹2653".

---

## 7. Planning Questions — Answers

### 7.1 What exact files/functions need changes per bucket?

| Bucket | File | Function | Net Lines |
|---|---|---|---|
| 1 (UI) | `CollectPaymentPanel.jsx` | bill-summary calc | 2 lines (L446, L448) + comment hygiene on L1561 |
| 2 (Order payload) | `orderTransform.js` | `calcOrderTotals` | +1 local, change 1 returned key (~3 lines) |
| 2 (Order payload) | `orderTransform.js` | `collectBillExisting` | +1 destructured field, change 1 payload key (2 lines) |
| 3 (Bill/print) | `orderTransform.js` | `buildBillPrintPayload` fallback | +3 lines in IIFE |
| 3 (conditional) | `orderTransform.js` | `fromAPI.order` | +1 line **iff** `deliveryCharge` not already mapped (verify first) |

**Total: 2 files, ≤ 13 net code lines + comment updates.**

### 7.2 Current Variables for Each Concept

| Concept | Variable (current) | Location |
|---|---|---|
| Item Total | `itemTotal` (CollectPaymentPanel L347) / `subtotal` *inside `calcOrderTotals`* (L596-612) | UI / helper |
| Subtotal **excluding** delivery (today's `subtotal`) | `subtotal` (CollectPaymentPanel L446) | UI |
| Delivery Charge principal | `deliveryCharge` (CollectPaymentPanel L382) / `deliveryCharge` *extras* (calcOrderTotals L589) | UI / helper |
| Subtotal **including** delivery (target) | **does not exist yet** — to be the new `subtotal` (Bucket 1) and `subtotalWithoutTax` local (Bucket 2) | – |
| Grand Total | `finalTotal` (CollectPaymentPanel L453) / `orderAmount` (calcOrderTotals L651) | UI / helper |

### 7.3 New Local Variable vs Reuse?

**Bucket 1 (UI)**: **reuse `subtotal`** by updating its formula. Renaming would force edits at L1565 (display), L581 (paymentData export), L619 (print overrides). Pure-formula change keeps the surface area minimal.

**Bucket 2 (helper)**: **introduce `subtotalWithoutTax` as a new local** inside `calcOrderTotals`. Reasoning: the existing `subtotal` local at L612 means "items-only" (the `order_sub_total_amount` source) and is used by `postDiscount` math at L613. Repurposing `subtotal` to mean "with delivery" would cascade and risk subtle defects in the SC/discount/tax pipeline. A new local is cleaner.

**Bucket 3 (print fallback)**: stay inline inside the IIFE (no separate local needed). Three lines total.

### 7.4 Which Approach Is Safest and Least Invasive?

**Option A (recommended) — Algebraic rearrangement preserves Grand Total exactly.**

- Bucket 1 just shifts `+ deliveryCharge` from `rawFinalTotal` to `subtotal`.
- Bucket 2 introduces a separate local so the existing items-only `subtotal` is untouched (and continues to feed all downstream math).
- Bucket 3 makes the fallback formula symmetric with the live cashier path.

**Why not Option B (move Delivery row below Subtotal)?** Would require renaming labels, repositioning JSX, and re-litigating the BUG-281 mental model. Larger surface area, larger risk, fails the "minimal change" guard-rail.

### 7.5 How Do We Avoid Double-Counting Delivery in Grand Total?

Three protections, any one of which is sufficient:

1. **Bucket 1's edit removes `+ deliveryCharge` from `rawFinalTotal`.** This is the primary safeguard — delivery now enters Grand Total only via `subtotal`, never twice.
2. **`calcOrderTotals`'s `rawTotal` calc (L649)** uses `postDiscount + SC + tip + delivery + totalTax` — it does *not* read `subtotal` or the new `subtotalWithoutTax`. The new local is purely "additive metadata"; it cannot perturb `order_amount` or `round_up`.
3. **Backend independence**: backend recomputes Grand Total from `order_amount` (sent directly), not from `order_sub_total_without_tax + delivery_charge`. Even if backend chose to reconcile, the standalone `delivery_charge` key remains present so backend can pick either decomposition.

### 7.6 How Do We Preserve Delivery GST?

Delivery GST is **already** aggregated into `sgst + cgst` upstream of `rawFinalTotal`:
- `CollectPaymentPanel.jsx:415` — `const deliveryGst = deliveryCharge * delTaxRate;`
- `L417` — `const totalGst = itemGstPostDiscount + scGst + tipGst + deliveryGst;`

Similarly in `calcOrderTotals`:
- `L640` — `const delGstAmt = deliveryCharge * delTaxRate;`
- `L643` — `gstTax = itemGstPostDiscount + scGstAmt + tipGstAmt + delGstAmt;`

**Neither line is touched** by any bucket. Delivery GST flows through `gst_tax` (composite) on every payload exactly as today. The bill-print payload additionally splits `gst_tax` into `cgst_amount` + `sgst_amount` (L1668-1669) — unchanged.

### 7.7 How Do We Preserve `delivery_charge` as a Separate Key?

It's already emitted independently of subtotal:
- Order payloads — `delivery_charge: deliveryCharge` (placeOrder L837, updateOrder L949, placeOrderWithPayment L1070, collectBillExisting L1250).
- Bill-print payload — `delivery_charge: overrides.deliveryCharge ?? order.deliveryCharge` (L1671).

None of these lines are touched by any bucket. The keys remain.

### 7.8 Which Existing Tests May Break?

**None** — verified by grep across `src/__tests__/`. Section 6.1 details each candidate and why it's safe.

### 7.9 Which Tests Should Be Updated or Added?

Optional, only if Bucket 4 is approved. See §6.2 for the minimum useful additions. None of these are blockers for the production fix.

### 7.10 What QA Payload Examples Should Be Captured Before and After?

See §6.3. Four scenarios, three payload endpoints each (`place-order`, `order-bill-payment`, `order-temp-store`), plus one UI screenshot per scenario. Total: 12 payload captures + 4 screenshots, before and after.

---

## 8. Risk Matrix (Cross-Bucket)

| Risk | Severity | Trigger | Mitigation |
|---|---|---|---|
| Grand Total drifts by even 1 paisa for any flow | High | Wrong order of `+ deliveryCharge` move | Algebraic invariance proof (§3.7) + acceptance criteria payload capture for every scenario |
| Dashboard reprint reads `order.deliveryCharge` as undefined | Medium | `fromAPI.order` doesn't map `delivery_charge` | Verify before merge (Open Item §5.4); add 1-line inbound mapping if missing |
| Backend bill template rejects/misrenders the new `order_subtotal` value | Medium | Backend hard-coded to "items-only-pre-tax" semantic | Confirm with backend owner before merge |
| Reports module `OrderDetailSheet.jsx:751` computes `Tax = amount − subtotal − deliveryCharge` and would now double-subtract delivery if backend echoes new `order_subtotal` back through `displayData.subtotal` | Medium | Backend echoes new semantic AND reports sheet displays a delivery order detail | Bucket 4: include reports drawer verification; possibly require a follow-up edit to OrderDetailSheet `Tax` formula |
| BUG-281 comment cluster becomes misleading | Low | Comment hygiene missed | Bucket 1 includes comment updates at L446, L1561 |
| Cashier UX regression (sudden Subtotal jump) | Low | Operator habit | Release note for ops users |
| Existing test breakage | None | n/a | §6.1 sweep — no existing test breaks |

---

## 9. Cross-Bucket Risk Item — Reports Drawer (`OrderDetailSheet.jsx`)

Located outside the fix scope but warrants explicit flagging:

```js
// src/components/reports/OrderDetailSheet.jsx:751
{formatCurrency((displayData.amount || 0) - (displayData.subtotal || 0) - (Number(displayData.deliveryCharge) || 0))}
```

This computes Tax as `amount − subtotal − deliveryCharge`. Today, `subtotal` here likely sources from `order.sub_total` or `order.order_sub_total_amount` (read path), both of which are items-only on this codebase. After our fix, if backend persists `order_sub_total_without_tax` (now including delivery) and echoes it back via the response, **and** the reports sheet starts reading the new value, then `Tax` would be computed as `amount − (items + SC + tip + delivery) − delivery` which double-subtracts delivery and yields a wrong (negative) tax for delivery orders.

**Action for Bucket 4 / future**: capture an `OrderDetailSheet` view of a delivery order before and after the fix. If `displayData.subtotal` source is `order.sub_total` (today usually items-only echoed by backend) the reports view stays correct. If backend semantics shift in response too, this formula will need a follow-up patch.

This is **not a blocker** for Buckets 1-3 but is worth tracking.

---

## 10. Plan Summary (one-screen)

1. **Bucket 1** — `CollectPaymentPanel.jsx` L446-448: fold `deliveryCharge` into `subtotal`, remove from `rawFinalTotal`. Algebraic rearrangement. UI Subtotal becomes correct.
2. **Bucket 2** — `orderTransform.js`: in `calcOrderTotals` add `subtotalWithoutTax` local and assign to `order_sub_total_without_tax`; in `collectBillExisting` destructure `subtotal` from `paymentData` and assign to the same key. Covers place / update / place+pay / collect-bill flows.
3. **Bucket 3** — `orderTransform.js` `buildBillPrintPayload` fallback: add `+ delAmt` to the IIFE. Live cashier print path requires no edit (cascade from Bucket 1).
4. **(Conditional)** Add 1-line inbound mapping in `fromAPI.order` if `delivery_charge` isn't already parsed — verify first.
5. **Bucket 4** (optional) — focused tests on outbound payloads + manual payload capture sweep.
6. **No changes**: tax math, GST math, delivery GST math, BUG-009 round-off, `order_amount` math, payment_amount, grant_amount, KOT, printer_agent, transferToRoom, inbound mapping (except optional 1-liner), reports module (flagged as risk-track), `.env`, `package.json`, supervisor config.
7. **Open questions for backend owner before merge**:
   - Confirm `order_sub_total_without_tax` / `order_subtotal` should mean "pre-tax including delivery" (the recommended Option A semantic).
   - Confirm backend bill template renders correctly with the higher `order_subtotal` value.
   - Confirm `fromAPI.order` mapping of `delivery_charge` (Open Item §5.4).

**Total code delta across all required buckets: ≤ 13 net lines, 2 files (plus comment hygiene). Algebraic invariance proven for Grand Total. No existing test breaks.**

Awaiting explicit go-ahead before any code is written.
