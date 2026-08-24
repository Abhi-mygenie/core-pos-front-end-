# Order Entry — Service Charge Display Gap Investigation

> **Scope:** Investigation only. No code changed. No backend touched.
> **Source of truth:** current code in `/app/frontend` (HEAD).
> **Restaurant:** Bean Me Up (`owner@beanmeup.com`).
> **Mode:** Read-only static code analysis. Live login not performed (the preview environment in this pod points at a different deployment; conclusions are derived directly from the rendered React source which is the same code shipped to production).

---

## 1. Summary

The reported behaviour is correct: **Service Charge is calculated correctly everywhere — but the Order Entry pre-place UI silently omits it**, both from the visible breakdown rows and from the Collect Bill button's amount.

| Surface | Visible SC? | Value used | Verdict |
|---|---|---|---|
| **Order Entry — cart panel (BEFORE Place Order)** | **NO row, NO toggle, NO breakdown** | `total = subtotal + itemTax + delivery` (SC missing) | **Gap** |
| **Order Entry — cart panel (AFTER Place Order)** | NO row, NO toggle (but `total` now correct) | `total = orderFinancials.amount` (backend echo, SC baked in) | Implicit pass — visible number includes SC, but no breakdown row |
| **Collect Payment screen** | YES — full breakdown + checkbox | `serviceCharge = subtotalAfterDiscount × pct` | Pass |
| **Place Order payload** | n/a | `serviceChargePercentage` threaded when `auto_service_charge=true` and order type is dineIn/walkIn/room | Pass |
| **Post-place BILL_PAYMENT payload** | n/a | `serviceCharge` value picked up from CollectPaymentPanel state | Pass |

The bug is therefore **not** "service charge calculation wrong." The bug is "**Order Entry pre-place UI does not surface service charge at all** — no row, no toggle, no `auto_service_charge` honouring on this screen." This breaks the cashier's mental model: at the point of Place Order they cannot see (or remove) the SC, even though it is being committed to the backend.

---

## 2. Restaurant configuration (verified)

For Bean Me Up the relevant restaurant fields are (mapped via `profileTransform.js` L120–L145):

| Backend field | Frontend field | Bean Me Up value (per user description) |
|---|---|---|
| `service_charge` (features flag) | `restaurant.features.serviceCharge` | `true` (SC feature enabled) |
| `auto_service_charge` | `restaurant.autoServiceCharge` | `true` ("auto SC enabled") |
| `service_charge_percentage` | `restaurant.serviceChargePercentage` | `10` |
| `service_charge_tax` | `restaurant.serviceChargeTaxPct` | (whatever profile config has — drives SC GST) |

Cross-checked: `profileTransform.js` L126 + L130–L131 correctly map both `service_charge` and `auto_service_charge` from the backend profile API. **No data-layer gap.**

---

## 3. Where SC IS rendered (working surfaces)

### 3.1 Collect Payment screen — `CollectPaymentPanel.jsx`

Three SC-related code regions render correctly:

1. **State init (L255–L259)** — checkbox default:
   ```jsx
   const [serviceChargeEnabled, setServiceChargeEnabled] = useState(
     (orderType === 'dineIn' || orderType === 'walkIn' || isRoom)
     && serviceChargePercentage > 0
     && !!restaurant?.autoServiceCharge
   );
   ```
   For Bean Me Up dine-in: defaults **TICKED** because all three conditions hold.

2. **Toggle UI (L889–L905)** — visible checkbox + rate label.
   - testid `service-charge-toggle` (verified).
   - Cashier can untick → SC drops to 0.

3. **Bill Summary row (L1542–L1550)** — labelled `Service Charge @ 10%`, value `₹serviceCharge.toFixed(2)`.

4. **SC GST sub-rows (L1601–L1612)** — separate CGST-on-SC / SGST-on-SC rows (CR-013).

Behaviour matches the user's observed screenshot: `Service Charge @ 10% = ₹30`, Grand Total = ₹396.

### 3.2 Place Order payload — `OrderEntry.jsx`

Both `handlePlaceOrder` and `handleUpdateOrder` (and `placeOrderWithPayment`) thread:

```js
serviceChargePercentage: (
  (orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom)
  && !!restaurant?.autoServiceCharge
) ? (restaurant?.serviceChargePercentage || 0) : 0
```

at L759–L762 (update), L820–L823 (place), L1456–L1459 (place-with-payment). `orderTransform.calcOrderTotals` (L585–L680) then computes:

```js
const serviceCharge = serviceChargePercentage > 0
  ? Math.round(postDiscount * serviceChargePercentage / 100 * 100) / 100
  : 0;
```

and rolls SC + SC-GST into `order_amount`. **Backend receives SC correctly.** After place, the backend echoes `order_amount` and the post-place `total` (Collect Bill button) displays the correct ₹396.

### 3.3 Table / order card

The table-card amount is read from `orderFinancials.amount` (= backend-echoed `order_amount` which has SC baked in). Hence the table card also shows ₹396 after place. Cosmetic only — no SC line item.

---

## 4. Where SC is MISSING (the gap)

### 4.1 `OrderEntry.jsx` — pre-place total calculation (L645–L717)

This is the smoking gun. The pre-place `total` arithmetic is:

```js
const localSubtotal = cartItems.reduce((sum, item) =>
  (item.status === 'cancelled' || item.isCheckInMarker) ? sum : sum + (item.totalPrice || (item.price * item.qty)), 0
);
const localTax = cartItems.reduce((sum, item) => {
  if (item.status === 'cancelled' || item.placed || item.isCheckInMarker) return sum;
  const linePrice = item.totalPrice || (item.price * item.qty);
  const taxPct = parseFloat(item.tax?.percentage) || 0;
  if (taxPct === 0) return sum;
  const isInclusive = item.tax?.calculation === 'Inclusive';
  return sum + (isInclusive ? linePrice - (linePrice / (1 + taxPct / 100)) : linePrice * (taxPct / 100));
}, 0);
...
const rawLocalTotal = Math.round((localSubtotal + localTax) * 100) / 100;
...
const deliveryAddOn = orderType === 'delivery' ? (Number(deliveryCharge) || 0) : 0;
...
const total = hasPlacedItems
  ? (orderFinancials.amount || 0) + (unplacedSubtotal > 0 ? applyRoundOff(rawUnplacedTotal) : 0) + placedDeliveryDelta
  : applyRoundOff(rawLocalTotal) + deliveryAddOn;
```

**Notice what is summed:** `localSubtotal` (item prices) + `localTax` (item GST/VAT only) + `deliveryAddOn` (delivery orders only).

**Notice what is NOT summed:** Service Charge. There is no `serviceCharge = ...` term anywhere in this block. SC and SC-GST are entirely absent.

For Bean Me Up's example case (1 item @ ₹300, VAT 22% → ₹66, SC 10% → ₹30, expected ₹396):

| Pre-place computed | Pre-place displayed on Collect Bill button | Expected (matches Collect Payment screen) |
|---|---|---|
| `localSubtotal` = 300 | | |
| `localTax` = 66 | | |
| `rawLocalTotal` = 366 | | |
| `total = applyRoundOff(366) + 0` = 366 | **₹366** | **₹396** |
| | **Short by ₹30 (the SC)** | |

(The exact VAT% may differ from 22 in the actual profile; the example uses ₹66 = ₹300 × 22% as supplied by the user. The arithmetic structure is what matters — SC is missing regardless of VAT rate.)

**Once Place Order is clicked**, the placed branch flips to `orderFinancials.amount` which IS backend-echoed SC-inclusive, so the displayed `total` jumps from `₹366` → `₹396`. This is the user's observed mismatch.

### 4.2 `CartPanel.jsx` — no SC row in the breakdown

`CartPanel.jsx` (the right-side cart panel on Order Entry) renders these flat indicator rows between cart items and the bottom action buttons:

| Row | Lines | Gated on | testid |
|---|---|---|---|
| Delivery Charge (editable) | L712–L743 | `orderType === 'delivery'` | `cart-delivery-charge-row` |
| Associated Orders (rooms) | L749–L765 | `isRoom && associatedOrders.length > 0` | `associated-orders-section` |
| Room Balance | L772–L788 | `isRoom && roomInfo` | `cart-room-section` |
| Order Notes Banner | L791–L814 | `orderNotes.length > 0` | `order-notes-banner` |
| Action buttons (Place Order, Collect Bill) | L817–L870 | always | `place-order-btn`, `collect-bill-btn` |

**There is NO `cart-service-charge-row` or equivalent.** `grep -n "service.charge\|serviceCharge"` on `CartPanel.jsx` returns **zero matches**. The file does not receive `serviceChargePercentage` / `autoServiceCharge` as props either, so it could not render an SC row even if asked.

### 4.3 `CartPanel.jsx` — Collect Bill button total (L868)

The displayed amount on the Collect Bill button is:

```jsx
<span>₹{(total + (isRoom ? associatedTotal + Math.max(0, roomInfo?.balancePayment || 0) : 0)).toLocaleString()}</span>
```

`total` is the value from `OrderEntry.jsx` (§4.1) → SC-free pre-place. So the Collect Bill button on Order Entry **displays a pre-place number that is short by the SC amount**. This is precisely the user's observation.

### 4.4 No `serviceChargeEnabled` state on Order Entry

In `CollectPaymentPanel.jsx` there is a per-bill `useState(serviceChargeEnabled)` that defaults to `restaurant.autoServiceCharge` and is editable via checkbox (L255–L259, L899–L900).

In `OrderEntry.jsx` there is **no equivalent state**. The cashier has no way to view or toggle SC at the Order Entry stage. The first surface where SC becomes visible / editable is the Collect Payment screen.

---

## 5. Why this looks like "auto-SC works post-place but the UI hides it"

End-to-end trace of a Bean Me Up dine-in order with 1 × ₹300 item:

| Step | Code path | What user sees |
|---|---|---|
| 1. Cashier adds item to cart | `OrderEntry.jsx` cart state | Item ₹300 |
| 2. Pre-place display | `OrderEntry.jsx` L713–L717 → `CartPanel.jsx` L868 | Collect Bill button: **₹366** (subtotal + VAT only — **SC silently missing**) |
| 3. Cashier clicks "Place Order" | `OrderEntry.jsx` `handlePlaceOrder` L817–L823 → `orderToAPI.placeOrder` with `serviceChargePercentage: 10` (auto_service_charge is true) | Network call |
| 4. Backend processes | `calcOrderTotals` in payload computes `service_charge = 30`, `order_amount = 396` | Backend persists 396 |
| 5. Socket order-engage → re-engage | `orderFinancials.amount` gets set to 396 (backend echo) | Order card / table card / Collect Bill button now show **₹396** |
| 6. Cashier clicks "Collect Bill" | `CollectPaymentPanel.jsx` opens with `serviceChargeEnabled=true` (BUG-028 Round 4 honouring autoServiceCharge) | Sees `Service Charge @ 10% = ₹30`, Grand Total ₹396, with a checkbox to untick |

The total displayed on step 5 (post-place) is correct, but the cashier has no breakdown context. The total displayed on step 2 (pre-place) is **wrong by ₹30** — the cashier cannot reconcile what they will be billing.

---

## 6. Root-cause classification

| Code | Description | Verdict |
|---|---|---|
| **A** | Backend doesn't return `auto_service_charge` | NO — `profileTransform.js` L131 maps it correctly. |
| **B** | Frontend mapper drops `autoServiceCharge` | NO — exposed on `restaurant` object. |
| **C** | Place-order payload omits SC | NO — `OrderEntry.jsx` L820–L823 threads `serviceChargePercentage` (gated on `autoServiceCharge`). |
| **D** | Backend ignores `service_charge_percentage` | NO — backend echoes `order_amount` with SC baked in (proven by the post-place ₹396). |
| **E** | CollectPaymentPanel ignores `autoServiceCharge` | NO — `CollectPaymentPanel.jsx` L255–L259 defaults the checkbox to `autoServiceCharge`. |
| **F** | **OrderEntry.jsx pre-place `total` arithmetic doesn't add SC** | **YES** — L656–L717, `localTax + localSubtotal + deliveryAddOn` only. No SC term. |
| **G** | **`CartPanel.jsx` has no SC row / no SC toggle / does not receive SC props** | **YES** — no SC mention anywhere in the file. |
| **H** | **No `serviceChargeEnabled` state at the Order Entry layer** | **YES** — checkbox-state lives only in `CollectPaymentPanel`. |

**Primary root cause:** F + G + H — the Order Entry screen was never wired to display, compute, or toggle Service Charge. SC entry into the user's mental model first happens at Collect Payment. For non-auto-SC restaurants this is fine (SC is opt-in per bill). For `auto_service_charge = true` restaurants like Bean Me Up, this creates a 30-rupee phantom between Place Order and Collect Bill.

Historically, BUG-028 (Round 4) only scoped SC behaviour to `CollectPaymentPanel.jsx`. The Order Entry display was never in scope — and that omission is the gap surfaced here.

---

## 7. Why this is a UI-only bug (financial reconciliation is safe)

- **Backend receives SC correctly** at Place Order time (proven by §3.2). No under-collection risk at the API / persistence layer.
- **Cashier collects SC correctly** at Collect Bill time (proven by §3.1 — CollectPaymentPanel re-derives SC live from `subtotalAfterDiscount × serviceChargePercentage` and includes it in `payment_amount`).
- **Books reconcile**: place-order `order_amount` matches BILL_PAYMENT `payment_amount` matches Grand Total on screen — all three are ₹396 in the example.

The gap is **purely the pre-place display**. There is no money-losing or money-collecting double-count. The risks are:

1. **Cashier surprise / customer dispute**: cashier reads ₹366 on the Collect Bill button before placing, then ₹396 after placing → looks like an unexplained jump.
2. **No opt-out at Order Entry**: a cashier who wants to remove SC for a particular dine-in cannot do so before placing (must place, then untick in CollectPaymentPanel — but by then `order_amount` was already persisted with SC, and the BILL_PAYMENT path overrides correctly).
3. **No transparency**: the existing Delivery Charge row (CR-008 D1-Cap, May 2026) is already a precedent for "show this in CartPanel as an inline breakdown row." SC has not been given the same treatment.

---

## 8. Expected behaviour (per user)

| Expected | Source |
|---|---|
| `auto_service_charge = true` → SC checkbox **ticked by default** at the point the cashier can see / edit it | User statement |
| Cashier can **untick** SC before final payment | User statement |
| Order Entry should expose SC clearly (row + toggle) — not just hide it | User statement |

The "ticked by default with untick option at payment" expectation is **already met on the Collect Payment screen** (`CollectPaymentPanel.jsx` L255–L259 + L889–L905). The expectation is **NOT met on the Order Entry screen** — neither the row nor the toggle exists there.

---

## 9. Recommended fix plan (NOT implemented)

> Listed for owner review only. Do **not** implement without explicit approval.

### 9.1 Add a Service Charge row to `CartPanel.jsx`

Mirror the existing Delivery Charge row pattern (L712–L743):

- Row visible when `restaurant.features.serviceCharge && restaurant.serviceChargePercentage > 0` AND order type is applicable (`dineIn`/`walkIn`/`isRoom`).
- Label: `Service Charge @ {pct}%` (mirrors Collect Payment row label at `CollectPaymentPanel.jsx` L1546).
- Right side: editable checkbox + computed amount (₹).
- Default-ticked when `restaurant.autoServiceCharge === true`.
- New testid: `cart-service-charge-row`, `cart-service-charge-toggle`.

This requires `CartPanel.jsx` to receive `restaurant` (or just `serviceChargePercentage` + `autoServiceCharge` + `serviceChargeEnabled` / `setServiceChargeEnabled`) as props from `OrderEntry.jsx`.

### 9.2 Lift `serviceChargeEnabled` state to `OrderEntry.jsx`

Move the state init out of `CollectPaymentPanel` and own it in `OrderEntry`:

```js
const [serviceChargeEnabled, setServiceChargeEnabled] = useState(
  (orderType === 'dineIn' || orderType === 'walkIn' || isRoom)
  && (restaurant?.serviceChargePercentage || 0) > 0
  && !!restaurant?.autoServiceCharge
);
```

Pass down to both `CartPanel` (for toggle + row) and `CollectPaymentPanel` (replace the local `useState` with a controlled prop).

### 9.3 Fold SC into pre-place `total` (`OrderEntry.jsx` L713–L717)

After step 9.2, the pre-place `total` becomes:

```js
const localServiceCharge = serviceChargeEnabled
  ? Math.round(localSubtotal * (restaurant?.serviceChargePercentage || 0) / 100 * 100) / 100
  : 0;
// SC GST too if the profile has serviceChargeTaxPct:
const localScGst = localServiceCharge * ((restaurant?.serviceChargeTaxPct || 0) / 100);
const rawLocalTotal = Math.round((localSubtotal + localTax + localServiceCharge + localScGst) * 100) / 100;
```

Once placed, the placed branch already uses `orderFinancials.amount` (which has SC baked in by the backend) — no change needed there.

### 9.4 Thread SC toggle into Place Order payload

`handlePlaceOrder` should send `serviceChargePercentage: serviceChargeEnabled ? pct : 0` instead of the current "always honour autoServiceCharge" logic. This gives the cashier the same untick power at Place Order that they already have at Collect Bill.

### 9.5 Guard-rails (must hold)

- Do NOT change `CollectPaymentPanel.jsx` SC math — already correct.
- Do NOT change `calcOrderTotals` or any other transform — already correct.
- Do NOT change `auto_service_charge` semantics: when `true` the checkbox starts ticked; when `false` it starts unticked; user can flip per-bill.
- Do NOT show SC row for takeaway / delivery (existing applicability rule).
- Keep takeaway / delivery flows byte-identical to today.

---

## 10. Risk assessment

### Risks if NOT fixed (current state)

- Cashier confusion: ₹366 → ₹396 jump after Place Order is unexplained on screen.
- No opt-out at Order Entry: cashier must place first, then untick at Collect Payment.  Workable but awkward, and the place-order payload temporarily persists SC even when the cashier intends to drop it.
- Customer dispute risk: customer sees ₹366 quoted verbally before order placement (cashier reading from Collect Bill button), then ₹396 on the final bill. Hard to explain without exposing the SC breakdown.

### Risks of fixing

- **Lifting state from `CollectPaymentPanel` to `OrderEntry`** touches two large files and the prop contract of both. Regression risk on every existing dine-in / walk-in / room flow.
- **Pre-place `total` now includes SC** → the Collect Bill button label changes for every dine-in / walk-in / room order with `auto_service_charge=true`. This is a deliberate, owner-visible change; it must be confirmed before shipping.
- **Place Order payload behaviour change** (§9.4): currently `serviceChargePercentage` always reflects the profile rate when `auto_service_charge=true`. After fix it reflects the toggle. Backend behaviour must accept `serviceChargePercentage = 0` for a dine-in order without re-applying SC server-side (cross-check with backend owner).
- **Takeaway / delivery** must stay byte-identical — no SC row, no SC toggle. The applicability gate is already present in `OrderEntry.jsx` L760 / L821 and `CollectPaymentPanel.jsx` L256; same gate must be used in CartPanel.

---

## 11. Open questions

1. **At what point should the SC checkbox first appear?**
   a. CartPanel inline row (recommended — mirrors Delivery Charge UX), or
   b. A new pre-Place-Order modal, or
   c. Stay on CollectPaymentPanel only and instead just add a non-editable "Service Charge ₹X" line to CartPanel for transparency.
2. **Should the SC toggle be allowed pre-place?** If yes, what does the cashier ticking it off pre-place imply for the backend payload (§9.4)?
3. **For a Room order with auto-SC**, does the operator want SC on the food sub-total only (today's behaviour) or also on the room balance? (Today: food sub-total only — `calcOrderTotals` L616 multiplies `postDiscount` not `postDiscount + roomBalance`.)
4. **For an Update Order** (additional items added to a placed order), should the cashier be able to flip SC mid-order, or is it locked to the original Place Order decision?
5. **Audit/Reports impact**: if pre-place display includes SC, do any reports key off the displayed Collect Bill button value? (Reports key off backend-echoed `order_amount`, so no impact — but worth confirming.)

---

## 12. Files / functions referenced

- **Gap is here:**
  - `frontend/src/components/order-entry/OrderEntry.jsx` L645–L717 (pre-place `total` arithmetic — missing SC term).
  - `frontend/src/components/order-entry/CartPanel.jsx` whole file (no SC row, no SC props received, no SC toggle).
- **Already correct (do not modify if fix is taken):**
  - `frontend/src/api/transforms/profileTransform.js` L126, L130–L131 (SC feature flag + `autoServiceCharge` + `serviceChargePercentage` mapping).
  - `frontend/src/components/order-entry/OrderEntry.jsx` L759–L762, L820–L823, L1456–L1459 (place / update / place-with-payment payloads thread `serviceChargePercentage` correctly).
  - `frontend/src/api/transforms/orderTransform.js` L585–L680 (`calcOrderTotals` computes SC, SC-GST, folds into `order_amount`).
  - `frontend/src/components/order-entry/CollectPaymentPanel.jsx` L65, L255–L259, L397–L398, L889–L905, L1330–L1342, L1542–L1550, L1601–L1612 (SC state, toggle, breakdown rows — all working).

---

## 13. Learning summary

- **Service Charge is fully wired** at the data layer (profile API → frontend mapping → place-order payload → backend persistence → backend echo → CollectPaymentPanel rendering → BILL_PAYMENT payload). The arithmetic is correct end-to-end.
- **The Order Entry screen** was never built to display SC. It calculates a pre-place `total = subtotal + itemTax + delivery` and renders a single number on the Collect Bill button. `CartPanel.jsx` exposes flat indicator rows for Delivery Charge / Associated Orders / Room Balance but **not** for Service Charge.
- **Restaurants with `auto_service_charge = true`** (like Bean Me Up) experience a ₹X jump between the pre-place Collect Bill button value and the post-place value, where X = SC + SC-GST. Restaurants with `auto_service_charge = false` are unaffected — SC is opt-in per bill on the CollectPaymentPanel, and the Order Entry total correctly reflects "no SC yet."
- **The fix is structural** but contained to two files: `OrderEntry.jsx` and `CartPanel.jsx`. The state can be lifted out of `CollectPaymentPanel.jsx` and made the single source of truth. All other files (transforms, services, the existing CollectPaymentPanel logic) stay byte-identical.
- **Historical context**: BUG-028 (Round 4) only scoped SC behaviour to CollectPaymentPanel. The Order Entry display was never explicitly addressed. This investigation is the first time the gap is being formally documented.

— End of report.
