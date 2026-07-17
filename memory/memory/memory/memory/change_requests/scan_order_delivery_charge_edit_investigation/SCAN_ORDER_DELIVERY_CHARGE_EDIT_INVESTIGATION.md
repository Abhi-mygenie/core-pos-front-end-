# Scan Order Delivery Charge Edit Investigation

> **Scope:** Read-only static code analysis. No code changed. No backend touched.
> **Source of truth:** current code in `/app/frontend` (HEAD).
> **Focus:** Verify the "Scan & Order delivery-charge non-editability when DC>0" rule is currently in force on POS.

---

## 1. Summary

**The previous fix (POS2-002 Phase 2, owner-locked 2026-05-09) IS present in this branch.** The predicate `readOnly = isPrepaid || (isWebOrder && initialDeliveryCharge > 0)` is wired correctly at `CollectPaymentPanel.jsx:974`, plus the same condition styles the field (`bg-gray-100 cursor-not-allowed`) and tooltip at L977–L984. A dedicated unit-test file (`CollectPaymentPanel.deliveryLock.test.jsx`) exercises all 8 quadrants of the predicate.

However, **there is a SECOND delivery-charge input surface that the previous fix did NOT cover** — the inline delivery-charge row inside `CartPanel.jsx` (introduced by CR-008 / Bucket D1-Cap, May-2026, owned by OrderEntry / pre-place screen). That row is rendered as a plain editable `<input>` with no `readOnly`, no `disabled`, no `isWebOrder` check, and CartPanel does not even receive `isWebOrder` or `initialDeliveryCharge` as props.

So:
- If the user verified the rule on the **Collect Payment** screen → it is correctly enforced.
- If the user verified the rule on the **Order Entry** screen (the pre-place cart with the inline delivery row) → it is NOT enforced, hence the perception "the fix isn't reflected now."

The bug is **not a regression** of the previous fix — it is a **missed surface**. The lock was applied to the CollectPaymentPanel input only.

---

## 2. Expected Rule

(Per the task brief.)

1. Web / Scan & Order with delivery_charge > 0:
   - POS user **cannot** edit delivery charge.
2. Web / Scan & Order with delivery_charge missing / null / undefined / 0:
   - POS user **can** enter / add delivery charge.

Layer existing rules unchanged:
- Prepaid orders → locked (additive, irrespective of order source).
- Non-web orders → editable (CR-008 D1-Cap parity).

This matches the 8-quadrant predicate from `POS2-002 Phase 2`:

```js
isDeliveryLocked = isPrepaid || (isWebOrder && initialDeliveryCharge > 0)
```

| Quadrant | isPrepaid | isWebOrder | initialDC | Expected |
|---|---|---|---|---|
| Q1 | false | false | 0 | editable |
| Q2 | false | false | >0 | editable (D1-Cap parity) |
| Q3 | true | false | 0 | locked (isPrepaid) |
| Q4 | true | false | >0 | locked (isPrepaid) |
| Q5 | false | true | 0 | **editable** (owner rule 2) |
| **Q6** | **false** | **true** | **>0** | **LOCKED — main POS2-002 Phase 2 fix** |
| Q7 | true | true | 0 | locked (isPrepaid layer) |
| Q8 | true | true | >0 | locked (both layers) |

---

## 3. Current Code Flow

### Data path: Scan & Order → POS

```
Scan & Order backend
  ↓
GET running-orders / single-order  → `api.delivery_charge` (numeric, ₹)
  ↓                                  `api.order_from = "web"`
orderTransform.fromAPI.order
  L226 isWebOrder = (order_from === 'web')
  L280 deliveryCharge = parseFloat(api.delivery_charge) || 0
  ↓
OrderContext (cached order)
  ↓
OrderEntry.jsx
  L1237 isWebOrder={orderData?.isWebOrder || effectiveTable?.isWebOrder || false}
  L1272 initialDeliveryCharge={
          Number(deliveryCharge) !== Number(orderFinancials.deliveryCharge || 0)
            ? (Number(deliveryCharge) || 0)
            : (orderFinancials.deliveryCharge || (Number(deliveryCharge) || 0))
        }
  ↓
CollectPaymentPanel.jsx
  L974 readOnly={isPrepaid || (isWebOrder && initialDeliveryCharge > 0)}
  L977-L983 title (tooltip)
  L984 className -> `bg-gray-100 cursor-not-allowed` when locked
```

This is a complete, intact flow for the **Collect Payment** screen.

### Parallel data path: OrderEntry → CartPanel inline input

```
OrderEntry.jsx
  ┌─ deliveryCharge state (initialised from orderData.deliveryCharge)
  └─ setDeliveryCharge

  L1883 deliveryCharge={deliveryCharge}
  L1884 onDeliveryChargeChange={setDeliveryCharge}
        ↓ (no isWebOrder, no initialDeliveryCharge passed)
CartPanel.jsx L712–L743
  <input type="number" value={deliveryCharge} onChange={...} />
  ← NO readOnly, NO disabled, NO isWebOrder gate
```

This is the **gap**.

---

## 4. Delivery Charge Data Source

### Backend field name
Confirmed: `api.delivery_charge` (numeric ₹).

Mapped at `frontend/src/api/transforms/orderTransform.js:280`:
```js
deliveryCharge: parseFloat(api.delivery_charge) || 0,
```

### Zero-vs-non-zero handling

| Backend `delivery_charge` | Frontend `order.deliveryCharge` | `initialDeliveryCharge > 0` evaluation |
|---|---|---|
| `0` | `0` | `false` → editable |
| `null` | `0` (parseFloat(null) → NaN → `|| 0`) | `false` → editable |
| `undefined` | `0` | `false` → editable |
| `"0"` | `0` | `false` → editable |
| `"80"` | `80` | `true` → locked |
| `80.5` | `80.5` | `true` → locked |
| missing key | `0` | `false` → editable |

**Zero/null/undefined/missing all correctly resolve to `0`, which the predicate `> 0` correctly treats as "no DC supplied → POS may add."** No false-positive lock risk.

### `isWebOrder` data source
- Primary: `order.isWebOrder` derived from `api.order_from === 'web'` (L226 orderTransform.js).
- Fallback: `effectiveTable?.isWebOrder` (some scan paths annotate the table object).
- `socketHandlers.js:510` also sets `order.isWebOrder = true` defensively on scan-new-order arrivals when the backend omits `order_from` (covered by `handleScanNewOrder.enrichment.test.js`).

**`isWebOrder` derivation is robust** — multiple paths converge to `true` for scan orders.

---

## 5. UI Edit / Disable Logic

### 5.1 CollectPaymentPanel.jsx — **LOCK IS PRESENT** ✅

| Line | Code | Purpose |
|---|---|---|
| L17 | `initialDeliveryCharge = 0` (prop default) | frozen DC at panel-open |
| L45 | `isWebOrder = false` (prop default) | web-origin flag |
| L171–L174 | `useState(initialDeliveryCharge > 0 ? String(initialDeliveryCharge) : '')` | seed input from frozen DC |
| L387 | `const deliveryCharge = orderType === 'delivery' ? (parseFloat(deliveryChargeInput) || 0) : 0;` | live value (subject to lock) |
| **L974** | `readOnly={isPrepaid || (isWebOrder && initialDeliveryCharge > 0)}` | **predicate match** |
| L977–L983 | `title={...}` tooltip — "Delivery charge captured from web order — not editable" | UX hint |
| L984 | `className=\`... ${locked ? 'bg-gray-100 cursor-not-allowed' : ''}\`` | greyed-out style |

**Predicate uses the FROZEN `initialDeliveryCharge` prop, NOT the live `deliveryChargeInput` state** — so typing into the field cannot un-lock it. This is the explicit owner-locked design (POS2-002 Phase 2, comment block L33–L46 of the same file).

### 5.2 CartPanel.jsx — **NO LOCK** ❌ (the gap)

`frontend/src/components/order-entry/CartPanel.jsx:712–L743` — the inline pre-place delivery-charge row added by CR-008 / Bucket D1-Cap.

```jsx
{orderType === 'delivery' && (
  <div data-testid="cart-delivery-charge-row" ...>
    ...
    <input
      type="number"
      inputMode="decimal"
      min="0"
      step="0.01"
      value={deliveryCharge || ''}
      placeholder="0"
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (onDeliveryChargeChange) onDeliveryChargeChange(isNaN(v) ? 0 : v);
      }}
      className="w-20 px-2 py-1 text-xs text-right rounded border focus:outline-none focus:ring-2"
      style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
      data-testid="cart-delivery-charge-input"
    />
  </div>
)}
```

- No `readOnly`.
- No `disabled`.
- No `isWebOrder` / `initialDeliveryCharge` consumption.
- No lock-aware styling.
- Always editable when `orderType === 'delivery'`.

Furthermore, **OrderEntry does not pass `isWebOrder` or `initialDeliveryCharge` to CartPanel** (compared at OrderEntry.jsx L1883–L1884: only `deliveryCharge` and `onDeliveryChargeChange`). So CartPanel cannot enforce the rule today without a prop expansion.

### 5.3 Cross-screen summary

| Surface | Test ID | Lock applied? | Predicate |
|---|---|---|---|
| **Order Entry** (CartPanel inline row) | `cart-delivery-charge-input` | **NO** | n/a |
| **Collect Payment** (full payment screen) | `delivery-charge-input` (implied) | **YES** | `isPrepaid || (isWebOrder && initialDeliveryCharge > 0)` |
| Settings / admin panel | n/a | n/a — not a delivery-charge edit surface | n/a |

---

## 6. Branch / Fix Presence Check

### Evidence the fix EXISTS in this branch
1. **`CollectPaymentPanel.jsx` predicate at L974** — present, byte-matches the test contract.
2. **`__tests__/components/order-entry/CollectPaymentPanel.deliveryLock.test.jsx`** — 8 quadrant tests + RTL render assertion that the actual `<input>` gets `readOnly={true}` when the predicate fires.
3. **`__tests__/api/transforms/orderTransform.orderFrom.test.js`** — verifies `isWebOrder` derivation from `order_from` string variants.
4. **`__tests__/api/socket/handleScanNewOrder.enrichment.test.js`** — verifies scan-new-order socket path enriches `isWebOrder = true` even when backend omits `order_from`.
5. **OrderEntry.jsx L1222–L1276** — comment block explicitly references "POS2-002 Phase 2 web-lock behavior", with `isWebOrder` and `initialDeliveryCharge` correctly threaded into CollectPaymentPanel props.

### Evidence the fix is INCOMPLETE
- `CartPanel.jsx:712–L743` — the inline pre-place delivery row introduced by **CR-008 / Bucket D1-Cap** (May-2026) post-dates POS2-002 Phase 2 (also May-2026, 2026-05-09). The two CRs were authored in close succession and CR-008 D1-Cap apparently did NOT incorporate the same lock.
- OrderEntry → CartPanel prop spread (L1882–L1884) does not include `isWebOrder` or `initialDeliveryCharge`.
- No QA matrix entry exists for "scan-order DC lock on Order Entry inline input."

### Branch-level check
- `git log` shows recent commits are auto-commits; no manual revert / reset signal.
- `grep -rn "POS2-002" frontend/src/` shows the predicate and tests are intact in HEAD.
- No `.bak.deliveryLock` or rollback artefact is present.

**Conclusion:** the previous fix is **present and intact at HEAD** for the CollectPaymentPanel surface. It was never extended to the CartPanel surface.

---

## 7. Root Cause

| Code | Description | Verdict |
|---|---|---|
| **A** Backend doesn't return `delivery_charge` for scan orders | NO — confirmed numeric flow `api.delivery_charge` → `order.deliveryCharge`. |
| **B** `order_from` not set / `isWebOrder` not derived correctly | NO — `isWebOrder` derivation is robust (orderTransform L226 + socketHandlers.js L510 fallback). |
| **C** `initialDeliveryCharge` prop not wired into CollectPaymentPanel | NO — OrderEntry L1272 threads it correctly (with the live-vs-echo guard). |
| **D** CollectPaymentPanel predicate wrong / missing | NO — predicate at L974 byte-matches the locked contract. |
| **E** `0` vs `null` mis-handled | NO — `parseFloat(api.delivery_charge) || 0` normalises every null-like to `0`; `> 0` predicate correctly excludes them. |
| **F** Previous fix lost during a rebase / merge / revert | NO — predicate + tests + comment trail all intact at HEAD. |
| **G** **CartPanel inline delivery row not locked for web orders** | **YES** — the row was added by CR-008 / Bucket D1-Cap AFTER POS2-002 Phase 2 shipped; the lock was not extended. CartPanel does not receive `isWebOrder` or `initialDeliveryCharge` props. |

**Primary root cause: G.** The user is observing the unlocked input on the Order Entry / CartPanel surface, not the (correctly-locked) CollectPaymentPanel surface.

This is a **missed-surface gap, not a regression**. The original fix's contract was "lock at Collect Payment"; the inline pre-place row didn't exist when that contract was written, and CR-008 D1-Cap shipped without inheriting the lock.

---

## 8. Recommended Fix Plan (NOT implemented)

> Listed for owner review only. No code is being changed in this task.

### 8.1 Extend the predicate to CartPanel's inline input

`frontend/src/components/order-entry/CartPanel.jsx:712–743`

Add `readOnly` + locked styling + tooltip, mirroring the CollectPaymentPanel pattern at L974/L977/L984. Approximate shape:

```jsx
const deliveryLocked = isPrepaid || (isWebOrder && initialDeliveryCharge > 0);
...
<input
  ...
  value={deliveryCharge || ''}
  readOnly={deliveryLocked}
  title={
    isPrepaid
      ? (initialDeliveryCharge > 0
          ? 'Delivery charge already collected from customer — not editable'
          : 'Order is prepaid — delivery charge cannot be modified')
      : (isWebOrder && initialDeliveryCharge > 0
          ? 'Delivery charge captured from web order — not editable'
          : 'Enter or edit delivery charge')
  }
  className={`w-20 px-2 py-1 text-xs text-right rounded border focus:outline-none focus:ring-2 ${
    deliveryLocked ? 'bg-gray-100 cursor-not-allowed' : ''
  }`}
  ...
/>
```

### 8.2 Pass the two new props from OrderEntry to CartPanel

`frontend/src/components/order-entry/OrderEntry.jsx:1883`

Add the same two prop names already used at L1237 / L1272 for CollectPaymentPanel:

```jsx
<CartPanel
  ...
  deliveryCharge={deliveryCharge}
  onDeliveryChargeChange={setDeliveryCharge}
  isPrepaid={isPrepaid}                                 // already exists at OrderEntry scope
  isWebOrder={orderData?.isWebOrder || effectiveTable?.isWebOrder || false}
  initialDeliveryCharge={
    Number(deliveryCharge) !== Number(orderFinancials.deliveryCharge || 0)
      ? (Number(deliveryCharge) || 0)
      : (orderFinancials.deliveryCharge || (Number(deliveryCharge) || 0))
  }
  ...
/>
```

### 8.3 Strict guard-rails

- Do **not** introduce a different predicate for CartPanel. Reuse the CollectPaymentPanel contract verbatim so the two surfaces stay in sync forever.
- Do **not** touch CollectPaymentPanel.jsx — already correct.
- Do **not** touch orderTransform.js, socketHandlers.js, profileTransform.js.
- Do **not** touch backend / API.
- Do **not** touch Service Charge, VAT/GST, Tip math.
- Do **not** widen the lock to non-delivery order types (gate `orderType === 'delivery'` remains).

### 8.4 Estimated diff envelope
- `CartPanel.jsx`: ~+8 / −3 (one new const, three input prop additions).
- `OrderEntry.jsx`: ~+3 / 0 (three prop pass-throughs).
- **Two files, < 20 lines total.** Comparable to the VAT-COLLECT and SC-COLLECT-BILL-BTN fixes that shipped recently.

### 8.5 Future hardening (optional)
Once the CartPanel surface is locked, extract `isDeliveryLocked` into a tiny helper (e.g., `frontend/src/utils/deliveryLock.js`) imported by both panels. This avoids future divergence. Out of scope for the immediate fix.

---

## 9. QA Checklist

### Visibility / editability — `Order Entry` screen (CartPanel inline row)
1. Web/scan order, `delivery_charge: 80` arrives, orderType=delivery → row visible, input `readOnly`, greyed (`bg-gray-100 cursor-not-allowed`), tooltip "Delivery charge captured from web order — not editable".
2. Web/scan order, `delivery_charge: 0` arrives, orderType=delivery → row visible, input EDITABLE, default tooltip.
3. Web/scan order, `delivery_charge: null` (or missing) → mapped to 0 → editable.
4. POS-origin order, orderType=delivery → editable (CR-008 D1-Cap parity preserved).
5. Prepaid order, any source, any DC → `readOnly` (isPrepaid layer fires).

### Visibility / editability — `Collect Payment` screen
(Existing POS2-002 Phase 2 contract — regression check.)

6. Same 5 cases above; field at `delivery-charge-input` mirrors the CartPanel behaviour. **Pre-fix** these tests already pass.

### Cross-surface symmetry
7. Web order DC=80: CartPanel input locked AND CollectPaymentPanel input locked. Tooltips match.
8. POS order DC=80: both inputs editable (D1-Cap parity).
9. Web order DC=0: both inputs editable. Cashier enters ₹50 in CartPanel → Place Order / Update Order payload sends `delivery_charge: 50` → backend echoes back `delivery_charge: 50` → on a fresh re-open the field becomes locked (DC>0 + isWebOrder=true) — verify this transitional behaviour doesn't surprise the cashier.

### Payload safety
10. When locked, any DOM mutation forcing a value into the readonly input must NOT propagate to placeOrder/updateOrder/BILL_PAYMENT payloads. Verified by the existing `parseFloat(deliveryChargeInput) || 0` + `Number(deliveryCharge) || 0` patterns — the locked-then-edited bypass is contained.

### Negative
11. Non-delivery order types (dineIn / walkIn / takeaway / room) — row hidden by the `{orderType === 'delivery' && ...}` outer gate. No change.
12. Web order with `orderType !== 'delivery'` (rare, but possible if backend misclassifies) — row hidden by outer gate; CollectPaymentPanel also hides the input. Defense-in-depth holds.

---

## 10. References

- Predicate source of truth: `frontend/src/components/order-entry/CollectPaymentPanel.jsx:974` + comment block L33–L46.
- Test contract: `frontend/src/__tests__/components/order-entry/CollectPaymentPanel.deliveryLock.test.jsx` (8 quadrants + RTL render).
- `isWebOrder` derivation: `frontend/src/api/transforms/orderTransform.js:226` (`normaliseOrderFrom(api.order_from) === 'web'`); fallback at `socketHandlers.js:510`.
- `deliveryCharge` mapping: `orderTransform.js:280` (`parseFloat(api.delivery_charge) || 0`).
- Gap surface: `frontend/src/components/order-entry/CartPanel.jsx:712–L743` (CR-008 / Bucket D1-Cap inline input, introduced after POS2-002 Phase 2 — never locked).
- OrderEntry → CollectPaymentPanel wiring: `OrderEntry.jsx:1237 / 1272`.
- OrderEntry → CartPanel wiring: `OrderEntry.jsx:1883–1884` (missing `isWebOrder` / `initialDeliveryCharge`).

— End of report.
