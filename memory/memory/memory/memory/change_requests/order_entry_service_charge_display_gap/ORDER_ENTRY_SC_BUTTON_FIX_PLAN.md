# Order Entry — Collect Bill Button SC Display Fix — Narrowed Implementation Plan

> **Scope:** Planning only. No code changed. No backend touched.
> **Owner clarification (2026-05-15):** "the only place where service charge is not added is shown is collect bill button … tick box part later."
> **Supersedes the broader fix shape** in §9 of `ORDER_ENTRY_SC_DISPLAY_GAP_INVESTIGATION.md`. That document's §1–§7 (gap diagnosis) remains valid; this plan replaces §9 with a much narrower scope.

---

## 1. What this plan covers (and what it does not)

### IN scope (this iteration)
- **Single symptom:** the `₹` value rendered on the **"Collect Bill"** button on the Order Entry screen shows a number that excludes Service Charge for restaurants with `auto_service_charge = true` (e.g. Bean Me Up).
- The fix is **display-only** and confined to the `total` arithmetic inside `OrderEntry.jsx`. The button label in `CartPanel.jsx` already reads `total` via the existing prop — no `CartPanel` change required.

### OUT of scope (deferred to a later CR — "we will come to tick box part later")
- **No new SC row** in `CartPanel.jsx`.
- **No SC checkbox** on the Order Entry screen.
- **No lifting of `serviceChargeEnabled` state** out of `CollectPaymentPanel.jsx`.
- **No change to the Place Order / Update Order payload** — they already thread `serviceChargePercentage` correctly when `autoServiceCharge=true`.
- **No change to `CollectPaymentPanel.jsx`** — already shows the correct breakdown and Grand Total.
- **No change to `calcOrderTotals` or any transform** — already correct.

This makes the implementation an order of magnitude smaller than the previous plan.

---

## 2. Symptom anchor (exact screen evidence)

| Surface | Today | Expected |
|---|---|---|
| Order Entry → Collect Bill button label (Bean Me Up, 1 × ₹300, VAT 22%, SC 10%) | **₹366** | **₹396** |
| Collect Payment → Grand Total | ₹396 ✅ | ₹396 |
| Collect Payment → Pay button | ₹396 ✅ | ₹396 |
| Order card / table card after Place Order | ₹396 ✅ | ₹396 |

The ₹30 SC is missing **only** on the pre-place Collect Bill button. All other displays match.

---

## 3. Exact code location

### 3.1 The bug

`frontend/src/components/order-entry/OrderEntry.jsx`, L656–L717.

The pre-place `total` is built from these terms:

```js
// L656–L658
const localSubtotal = cartItems.reduce((sum, item) =>
  (item.status === 'cancelled' || item.isCheckInMarker) ? sum : sum + (item.totalPrice || (item.price * item.qty)), 0
);

// L660–L667
const localTax = cartItems.reduce((sum, item) => {
  if (item.status === 'cancelled' || item.placed || item.isCheckInMarker) return sum;
  const linePrice = item.totalPrice || (item.price * item.qty);
  const taxPct = parseFloat(item.tax?.percentage) || 0;
  if (taxPct === 0) return sum;
  const isInclusive = item.tax?.calculation === 'Inclusive';
  return sum + (isInclusive ? linePrice - (linePrice / (1 + taxPct / 100)) : linePrice * (taxPct / 100));
}, 0);

// L668–L678 — analogous for the unplaced-increment branch
const unplacedSubtotal = cartItems.filter(...).reduce(...);
const unplacedTax       = cartItems.reduce(...);

// L680–L681
const rawLocalTotal     = Math.round((localSubtotal + localTax) * 100) / 100;
const rawUnplacedTotal  = Math.round((unplacedSubtotal + unplacedTax) * 100) / 100;

// L695
const deliveryAddOn = orderType === 'delivery' ? (Number(deliveryCharge) || 0) : 0;

// L713–L717 — final `total`
const total = hasPlacedItems
  ? (orderFinancials.amount || 0) + (unplacedSubtotal > 0 ? applyRoundOff(rawUnplacedTotal) : 0) + placedDeliveryDelta
  : applyRoundOff(rawLocalTotal) + deliveryAddOn;
```

**Service Charge does not appear anywhere in these terms** — `rawLocalTotal` and `rawUnplacedTotal` both sum only items + their tax.

### 3.2 What `total` flows into

- `OrderEntry.jsx` L1841 → passed to `CartPanel` as `total={total}`.
- `CartPanel.jsx` L868 → rendered on the Collect Bill button: `₹{(total + (isRoom ? associatedTotal + roomBalance : 0)).toLocaleString()}`.

No other consumer of pre-place `total`. Fixing the arithmetic upstream is sufficient.

### 3.3 Why post-place is already correct

When `hasPlacedItems` is true, `total = orderFinancials.amount + (unplaced delta) + placedDeliveryDelta`. `orderFinancials.amount` is the backend-echoed `order_amount` which has SC baked in (computed by `calcOrderTotals` at Place Order time using the threaded `serviceChargePercentage`). So the post-place number is already SC-inclusive. **The bug exists only on the pre-place branch and on the unplaced-increment sub-branch of the post-place branch.**

---

## 4. Applicability gate (mirror existing code)

The exact gate already used at:
- `OrderEntry.jsx` L760–L762 (update-order payload)
- `OrderEntry.jsx` L821–L823 (place-order payload)
- `OrderEntry.jsx` L1458–L1459 (place-with-payment payload)
- `CollectPaymentPanel.jsx` L256–L258 (SC default-tick)

is:

```js
(orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom)
&& !!restaurant?.autoServiceCharge
&& (restaurant?.serviceChargePercentage || 0) > 0
```

The pre-place fix MUST use this **identical** gate — so behaviour stays bit-identical to today on:
- Takeaway / delivery orders (gate excludes them).
- Restaurants with `autoServiceCharge = false` (gate excludes them — SC is opt-in per bill at Collect Payment, exactly as today).
- Restaurants with `serviceChargePercentage = 0` (gate excludes them).

---

## 5. Proposed arithmetic (matches `CollectPaymentPanel` formula)

Today the Grand Total math on Collect Payment is (paraphrased, lines noted):

```
subtotalAfterDiscount = localSubtotal (no discount applied at Order Entry stage)
serviceCharge         = subtotalAfterDiscount × pct/100        (CollectPaymentPanel L397–L398)
scGst                 = serviceCharge × scTaxRate              (CollectPaymentPanel L418)
itemGstPostDiscount   = sgst + cgst (item GST halves, post-discount, GST items only)  (L412)
vat                   = taxTotals.vat                          (L458; item VAT, full amt)
rawFinalTotal         = subtotalAfterDiscount + serviceCharge + tip + deliveryCharge + sgst + cgst + vat
                      = localSubtotal + serviceCharge + 0 + deliveryAddOn + itemGst + scGst + tipGst(=0) + deliveryGst(=0) + vat
```

Pre-place there is no discount, no tip, and delivery is already handled by `deliveryAddOn`. So the symmetric pre-place expression is:

```
localSCApplicable  = (gate from §4 above)
localServiceCharge = localSCApplicable
                       ? Math.round(localSubtotal × (restaurant.serviceChargePercentage / 100) × 100) / 100
                       : 0
localScGst         = localSCApplicable
                       ? localServiceCharge × ((restaurant.serviceChargeTaxPct || 0) / 100)
                       : 0
// localTax already computed (item-level GST + VAT, both inclusive and exclusive)
rawLocalTotal      = Math.round((localSubtotal + localServiceCharge + localScGst + localTax) * 100) / 100
```

For Bean Me Up's 1 × ₹300, VAT 22%, SC 10%, SC GST 0% example:
- `localSubtotal = 300`
- `localTax = 66`  (VAT 22% on 300)
- `localServiceCharge = 300 × 0.10 = 30`
- `localScGst = 30 × 0 = 0`
- `rawLocalTotal = round(300 + 30 + 0 + 66) = 396` ✅
- Button: `applyRoundOff(396) + 0 = ₹396` ✅

For a restaurant with `scTaxPct = 5%` (worked example):
- SC = `pct of localSubtotal`
- SC GST = `SC × 0.05`
- Both fold into `rawLocalTotal` → mirrors Collect Payment exactly.

For takeaway / `autoServiceCharge=false` / `serviceChargePercentage=0`:
- `localSCApplicable = false` → both `localServiceCharge` and `localScGst` are 0 → `rawLocalTotal` reverts to today's `subtotal + tax`. **Byte-identical to today.**

---

## 6. Secondary surface — unplaced-increment on a placed order

When the cashier adds new items to an already-placed order (post-place but before Update Order is hit), `total` is:

```
total = orderFinancials.amount + applyRoundOff(rawUnplacedTotal) + placedDeliveryDelta
```

Today `rawUnplacedTotal = unplacedSubtotal + unplacedTax` — also SC-free. The Update Order payload threads `serviceChargePercentage` (L759–L762), so the backend WILL apply SC on the new items at Update Order time. For the displayed button to match the backend behaviour, the same fix must be mirrored on `rawUnplacedTotal`:

```
unplacedServiceCharge = localSCApplicable
                          ? Math.round(unplacedSubtotal × (pct / 100) × 100) / 100
                          : 0
unplacedScGst         = localSCApplicable
                          ? unplacedServiceCharge × ((restaurant.serviceChargeTaxPct || 0) / 100)
                          : 0
rawUnplacedTotal      = Math.round((unplacedSubtotal + unplacedServiceCharge + unplacedScGst + unplacedTax) * 100) / 100
```

> **Decision needed from owner:** Include this secondary surface in the same patch, OR ship only the primary (fresh-order) surface now and treat the unplaced-increment case as a follow-up?
> Recommendation: ship both together. They share the same `localSCApplicable` constant and the same arithmetic; splitting them risks user confusion ("button updated for new orders but not for updates").

---

## 7. Single-file diff envelope (estimated)

| File | Hunks | Net lines | Risk |
|---|---|---|---|
| `frontend/src/components/order-entry/OrderEntry.jsx` | 3 (one `localSCApplicable` constant + amend `rawLocalTotal` + amend `rawUnplacedTotal`) | +10 / −2 | Low — pure arithmetic, no JSX, no state, no props |
| All other files | 0 | 0 | n/a |

Estimated diff size: comparable to the VAT fix that just shipped (≈22 / −5).

---

## 8. Acceptance contract

| Order composition | Today (button) | After fix (button) | Place Order payload | Collect Payment Grand Total | Reconciled? |
|---|---|---|---|---|---|
| Bean Me Up dine-in, 1 × ₹300, VAT 22% | ₹366 | **₹396** | unchanged (already sends pct=10) | ₹396 (unchanged) | ✅ |
| Bean Me Up dine-in, multi-item with discount-able items | items + VAT only | items + SC + SC-GST + VAT | unchanged | matches button after Collect Payment opens (no discount yet) | ✅ |
| Bean Me Up takeaway | items + VAT (no SC) | **same** (gate false) | unchanged (already sends pct=0) | unchanged (CollectPaymentPanel hides SC) | ✅ regression-safe |
| Restaurant with `autoServiceCharge=false`, dine-in | items + tax | **same** (gate false) | unchanged (already sends pct=0) | unchanged (SC checkbox starts unticked per BUG-028 Round 4) | ✅ regression-safe |
| Restaurant with `serviceChargePercentage=0` | items + tax | **same** (gate false) | unchanged | unchanged | ✅ regression-safe |
| Bean Me Up dine-in, AFTER Place Order, idle | `orderFinancials.amount` (already SC-inclusive) | **same** | n/a | unchanged | ✅ already correct |
| Bean Me Up dine-in, AFTER Place Order, cashier adds 1 more item ₹100 | `orderFinancials.amount + (100 + VAT-on-100)` (SC on new item missing) | `orderFinancials.amount + (100 + 10 + 0 + 22)` (SC on new item added) | already-correct Update Order payload | matches new total | ✅ if §6 included |
| Bean Me Up dine-in with discount (entered at Collect Payment) | n/a (no discount UI on Order Entry) | n/a | n/a | discount lowers SC base inside CollectPaymentPanel — pre-place SC was an estimate | ✅ acceptable approximation |

**Critical regression sentinels:**
- Takeaway/delivery orders → button value byte-identical to today.
- `autoServiceCharge=false` restaurants → button value byte-identical to today.
- `serviceChargePercentage=0` restaurants → button value byte-identical to today.
- Item-only no-SC orders (no applicable order types) → button value byte-identical.
- Post-place idle (no new items added) → `total = orderFinancials.amount + 0 + 0` byte-identical.

---

## 9. Edge cases / known approximations

| Edge case | Behaviour after fix | Owner sign-off needed? |
|---|---|---|
| Cashier opens Collect Payment and **unticks** the SC checkbox (BUG-028 Round 4 supports this for `autoServiceCharge=true` too — checkbox starts ticked but is unticked-able) | Pre-place button still shows SC-inclusive number; CollectPaymentPanel Grand Total drops to SC-free. The button is a pre-emptive estimate. This mismatch is unavoidable without the deferred toggle work. | Acknowledge; resolved when "tick box part" CR ships |
| Cashier applies a discount at Collect Payment | Pre-place button does not reflect discount (today's behaviour — discounts are post-place anyway). SC base is `localSubtotal`, while Collect Payment SC base is `subtotalAfterDiscount`. Numbers may diverge by `pct × discount`. | Acknowledge — discounts are Collect-Payment-only feature; no change today |
| Inclusive-tax items (`tax.calculation === 'Inclusive'`) | `localTax` already handles inclusive via the existing `linePrice - linePrice/(1+pct/100)` formula. SC is computed on `localSubtotal` (gross item price), same convention as `subtotalAfterDiscount` (which is also gross of inclusive tax). Matches CollectPaymentPanel — no double-count. | No |
| Room order with `roomBalance > 0` | Button shows `total + associatedTotal + roomBalance` (CartPanel L868). SC is applied on food sub-total only — not on roomBalance/associated — same convention as `calcOrderTotals` L616. No change. | No |
| Tip on Order Entry | Tip is a Collect-Payment-only input. Pre-place `total` correctly ignores it. After fix: still ignored. No change. | No |
| Round-off (BUG-009) | `applyRoundOff(rawLocalTotal)` at L717 applies on the now-SC-inclusive value. Same `applyRoundOff` helper, same threshold (0.10). Behaviour matches `finalTotal` rounding in CollectPaymentPanel L465–L468. | No |

---

## 10. File / function impact matrix

| File | Impact | Detail |
|---|---|---|
| `frontend/src/components/order-entry/OrderEntry.jsx` | **Modify** | 3 hunks (§7). Pre-place arithmetic only. |
| `frontend/src/components/order-entry/CartPanel.jsx` | **No change** | `total` prop value flows through unchanged; rendering at L868 already correct. |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | **No change** | Already shows correct breakdown. |
| `frontend/src/api/transforms/orderTransform.js` | **No change** | `calcOrderTotals`, `placeOrder`, `updateOrder`, `collectBillExisting` all already correct. |
| `frontend/src/api/transforms/profileTransform.js` | **No change** | `autoServiceCharge`, `serviceChargePercentage`, `serviceChargeTaxPct` already mapped. |
| Any backend / API / endpoint file | **No change** | Payload + persistence already correct. |

**Strict file-touch budget for the implementing agent:** exactly one file. If anything else shows up in the diff, abort and re-read this plan.

---

## 11. Verification protocol (for the implementing agent)

| # | Step | Expected |
|---|---|---|
| 1 | `mcp_lint_javascript` on `OrderEntry.jsx` | No issues |
| 2 | `git diff --stat` | 1 file, ≈ +10/−2 |
| 3 | Bean Me Up dine-in, 1 × ₹300 (VAT 22%, SC 10%) — Order Entry button | **₹396** |
| 4 | Bean Me Up dine-in, 1 × ₹300 — open Collect Payment | Grand Total ₹396 (matches) |
| 5 | Bean Me Up dine-in, 1 × ₹300 — Place Order, table card reloads | ₹396 (unchanged) |
| 6 | Bean Me Up dine-in, after placing, add 1 × ₹100 → button | `orderFinancials.amount + applyRoundOff(100 + 10 + 0 + VAT-on-100)` |
| 7 | Bean Me Up takeaway, 1 × ₹300 — button | **₹366** (no SC — gate excludes takeaway) |
| 8 | Bean Me Up delivery, 1 × ₹300 — button | **₹366 + delivery** (no SC — gate excludes delivery) |
| 9 | Different restaurant with `autoServiceCharge=false`, dine-in 1 × ₹300 | unchanged from today |
| 10 | Restaurant with `serviceChargeTaxPct=5%`, dine-in 1 × ₹300, SC 10% | `300 + 30 + 1.50 + tax` |
| 11 | Inclusive-VAT item — verify no double-count | matches CollectPaymentPanel exactly |
| 12 | Room order — button | unchanged (food-SC only; room balance untouched) |

---

## 12. Risk assessment

### Risks of the fix (low)
- **Pure arithmetic delta** in a non-rendering const block. No JSX, no props, no state, no transform. Smallest possible footprint.
- **Same applicability gate** as existing payload logic — no new condition introduced.
- **Symmetric formula** with `CollectPaymentPanel` and `calcOrderTotals` — no new tax convention introduced.

### Risks of NOT fixing
- Cashier reads ₹366 pre-place → ₹396 post-place. Unexplained ₹30 jump.
- Customer dispute risk if cashier verbally quotes the pre-place number.

### Residual issue NOT solved by this fix
- Cashier still cannot **untick** SC at Order Entry. They must place first, then untick at Collect Payment. This is the "tick box part" deferred per owner.

---

## 13. Sign-off checklist for owner

Before approving implementation, confirm:
- [ ] Scope is "fix the button label only" — no new row, no toggle, no state lift.
- [ ] Include the unplaced-increment surface (§6) in the same patch? (Recommendation: yes.)
- [ ] Pre-place SC computed on `localSubtotal` (gross, no discount) is acceptable — discounts at Collect Payment may shift the number by `pct × discount`. (Recommendation: acceptable; discounts are post-place anyway.)
- [ ] No code changes will be made until owner approves this plan.
- [ ] After implementation: 1-file diff envelope, lint clean, manual QA against the 12 cases in §11 (or one-shot Bean Me Up dine-in walk-through if the owner prefers).

---

## 14. References

- Original investigation: `/app/memory/change_requests/order_entry_service_charge_display_gap/ORDER_ENTRY_SC_DISPLAY_GAP_INVESTIGATION.md` (sections 1–7 remain valid; §9 superseded by this plan).
- Anchoring code:
  - `frontend/src/components/order-entry/OrderEntry.jsx` L656–L717 (the bug).
  - `frontend/src/components/order-entry/OrderEntry.jsx` L759–L762 / L820–L823 / L1456–L1459 (the gate to mirror).
  - `frontend/src/components/order-entry/CollectPaymentPanel.jsx` L255–L259 / L397–L398 / L412–L419 / L460 (the formula to mirror).
  - `frontend/src/components/order-entry/CartPanel.jsx` L868 (the rendered label — no change needed).
  - `frontend/src/api/transforms/orderTransform.js` L585–L680 (`calcOrderTotals` — confirms backend already SC-inclusive).
  - `frontend/src/api/transforms/profileTransform.js` L126 / L130–L131 / L145 (`autoServiceCharge`, `serviceChargePercentage`, `serviceChargeTaxPct` mapping).
- Owner clarification (2026-05-15): "the only place where service charge is not added is shown is collect bill button … tick box part later."

— End of plan.
