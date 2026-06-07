# Scan & Order — Delivery Charge Edit Lock — QA Report

> **Mode:** Validation only — no code changes were made.
> **Source under test:** branch `15-may` @ HEAD (`e131675` working tree, code commit `e382119`).
> **Fix under test:** POS2-002 Phase 2 EXTENSION (2026-05-15) — CartPanel inline
> delivery-charge row inherits the same lock predicate as CollectPaymentPanel.
> **Reference:** `SCAN_ORDER_DELIVERY_CHARGE_EDIT_FIX_REPORT.md` in the same folder.

---

## 1. Verdict

**PASS** — all six required QA cases meet expectation. No regression observed in
VAT, service charge, tip, or payload-builder behaviour. The lock predicate is
byte-identical between CartPanel and CollectPaymentPanel, both `data-testid`s
exist, both surfaces share the same `isWebOrder` and `initialDeliveryCharge`
source expressions in `OrderEntry.jsx`.

---

## 2. QA Approach

This is a UI-edit-permission rule on a complex POS screen with deep context
dependencies (Auth, Restaurant, Tables, Socket). End-to-end browser QA against
a remote backend (`preprod.mygenie.online`) is gated by live session cookies
and tenant data, so the canonical Mygenie QA approach (visible in
`__tests__/components/order-entry/CollectPaymentPanel.deliveryLock.test.jsx`)
is used:

1. **Pure-function predicate** mirrored verbatim from the JSX of both panels —
   tested across all 8 quadrants of (isPrepaid × isWebOrder × DC).
2. **RTL render** of a minimal `<input>` with the same `readOnly` / `title` /
   `className` bindings — verifies the actual DOM attribute lands.
3. **Static code trace** of `OrderEntry → CartPanel` and `OrderEntry →
   CollectPaymentPanel` prop wiring, plus `orderTransform.fromAPI.order`
   normalisation of `delivery_charge` and `order_from`.
4. **Full Jest suite** to detect any incidental regression.

---

## 3. Test Execution Summary

| Suite scope | Command | Result |
|---|---|---|
| Predicate / lock (CollectPaymentPanel.deliveryLock.test.jsx, 28 tests) | `yarn test --testPathPattern=deliveryLock` | ✅ 28 / 28 pass |
| Transforms — orderTransform, qa_subtotal_delivery, orderFrom, handleScanNewOrder (5 suites) | `yarn test --testPathPattern="orderTransform\|qa_subtotal_delivery\|orderFrom\|handleScanNewOrder"` | ✅ 64 / 64 pass |
| Payload builders + VAT + tax + GST + service charge + tip (4 suites: placeOrderPayload, cancelItemPayload, cancelAndUpdatePayload, updateOrderPayload) | `yarn test --testPathPattern="vat\|tax\|gst\|serviceCharge\|tip\|payload\|placeOrder"` | ✅ 82 / 82 pass |
| **Full suite** | `yarn test --watchAll=false` | ✅ **492 / 492** tests across **34 / 34** suites pass |

No test failures. No console errors (only routine `[SocketHandler]` WARN logs
in the existing `handleScanNewOrder.enrichment.test.js` that are part of its
contract).

---

## 4. Static Predicate Trace — both surfaces

Predicate is the same at both call sites (byte-identical contract):

```js
deliveryLocked = isPrepaid || (isWebOrder && initialDeliveryCharge > 0)
```

| Surface | Location | Predicate location | Tooltip | Locked CSS |
|---|---|---|---|---|
| Order Entry / CartPanel inline row | `CartPanel.jsx:720–766` | L724 | L725–L731 | L759 `bg-gray-100 cursor-not-allowed` |
| Collect Payment screen | `CollectPaymentPanel.jsx:970–987` | L974 | L975–L983 | L984 `bg-gray-100 cursor-not-allowed` |

Data sources, identical in both directions:

| Prop | Computed at | Expression |
|---|---|---|
| `isWebOrder` | `OrderEntry.jsx:1237` (CollectPaymentPanel), `:1890` (CartPanel) | `orderData?.isWebOrder \|\| effectiveTable?.isWebOrder \|\| false` |
| `initialDeliveryCharge` | `OrderEntry.jsx:1272` (CollectPaymentPanel), `:1891` (CartPanel) | `Number(deliveryCharge) !== Number(orderFinancials.deliveryCharge \|\| 0) ? Number(deliveryCharge) \|\| 0 : orderFinancials.deliveryCharge \|\| Number(deliveryCharge) \|\| 0` |
| `isPrepaid` | `OrderEntry.jsx` scope | `orderPaymentType === 'prepaid'` |

Backend normalisation, `orderTransform.js`:
- L226 `isWebOrder = normaliseOrderFrom(api.order_from) === 'web'` → robust against case / whitespace variants.
- L280 `deliveryCharge = parseFloat(api.delivery_charge) || 0` → maps `null` / `undefined` / missing key / `"0"` / `0` → `0`; preserves `"80"` / `80.5` → numeric.

---

## 5. Per-Case Results

### Case 1 — Web / Scan & Order delivery order, `delivery_charge > 0`

**Setup** (static trace): `api.order_from = 'web'`, `api.delivery_charge = 80`,
`orderType = 'delivery'`, not prepaid.

- After transform: `isWebOrder = true`, `deliveryCharge = 80`,
  `initialDeliveryCharge = 80`.
- `deliveryLocked = false || (true && 80 > 0) = true`.

**Order Entry / CartPanel**:
- Predicate test (`Q6`): `isDeliveryLocked({isPrepaid:false,isWebOrder:true,initialDeliveryCharge:80}) === true` → ✅
- RTL render: `expect(input).toHaveAttribute('readonly')` → ✅
- Tooltip: `Delivery charge captured from web order — not editable` → ✅
- CSS: `bg-gray-100 cursor-not-allowed` applied → ✅
- `onChange` is still bound but `readOnly` blocks DOM input → ✅

**Collect Payment**:
- Same predicate at `CollectPaymentPanel.jsx:974` → ✅ (existing Phase 2 contract, regression-checked).

**Result:** ✅ **PASS** — locked on both surfaces.

---

### Case 2 — Web / Scan & Order delivery order, `delivery_charge = 0`

**Setup**: `api.order_from = 'web'`, `api.delivery_charge = 0`,
`orderType = 'delivery'`, not prepaid.

- After transform: `isWebOrder = true`, `deliveryCharge = 0`,
  `initialDeliveryCharge = 0`.
- `deliveryLocked = false || (true && 0 > 0) = false`.

**Order Entry / CartPanel**:
- Predicate test (`Q5`): returns `false` → ✅
- RTL render: `expect(input).not.toHaveAttribute('readonly')` → ✅
- Tooltip: `Enter or edit delivery charge` → ✅
- `onChange` calls `onDeliveryChargeChange(isNaN(v) ? 0 : v)` → ✅ value updates `OrderEntry`'s `deliveryCharge` state → ✅ feeds into `deliveryAddOn` (OrderEntry.jsx:713) → ✅ contributes to Collect Bill button total.

**Collect Payment**:
- Predicate fires `false`, field editable. Existing Phase 2 contract preserved → ✅
- Frozen-snapshot test confirms typing into the field does NOT activate the lock mid-keystroke → ✅

**Result:** ✅ **PASS** — editable on both surfaces; entered value flows into total.

---

### Case 3 — Web / Scan & Order delivery order, `delivery_charge` missing / null

**Setup**: `api.order_from = 'web'`, `api.delivery_charge = null` (or key absent
or `undefined`), `orderType = 'delivery'`, not prepaid.

- `parseFloat(null) || 0 = NaN || 0 = 0`, similarly `parseFloat(undefined) || 0 = 0`.
- After transform: `isWebOrder = true`, `deliveryCharge = 0`,
  `initialDeliveryCharge = 0`.
- `deliveryLocked = false`.

**Order Entry / CartPanel**: editable, `Enter or edit delivery charge` tooltip → ✅
**Collect Payment**: editable → ✅
Existing `qa_subtotal_delivery_validation.test.js` and `orderTransform`
tests cover null/undefined/missing edge cases → all ✅.

**Result:** ✅ **PASS** — null/undefined/missing treated as `0`; field remains editable.

---

### Case 4 — Normal POS delivery order (non-web)

**Setup**: `api.order_from = 'pos'` (or any non-'web' value, or absent),
`api.delivery_charge` any value (`0` or `80`), `orderType = 'delivery'`,
not prepaid.

- After transform: `isWebOrder = false`, `deliveryCharge` as-is,
  `initialDeliveryCharge` as-is.
- `deliveryLocked = false || (false && ...) = false` regardless of DC.

**Order Entry / CartPanel**: editable, default tooltip → ✅
- Predicate tests `Q1` (DC=0) and `Q2` (DC>0) both return `false` → ✅
- CR-008 D1-Cap parity preserved — POS-origin orders never inherit the web
  lock.

**Collect Payment**: editable → ✅

**Result:** ✅ **PASS** — POS-origin delivery orders remain editable on both surfaces.

---

### Case 5 — Prepaid order

**Setup**: `isPrepaid = true` (regardless of `isWebOrder` and `delivery_charge`).

- `deliveryLocked = true || (...) = true`.

**Order Entry / CartPanel**: locked → ✅
- Predicate tests `Q3`, `Q4`, `Q7`, `Q8` all return `true` → ✅
- Tooltip: when DC>0, `Delivery charge already collected from customer — not editable`; when DC=0, `Order is prepaid — delivery charge cannot be modified` → ✅
- CSS: `bg-gray-100 cursor-not-allowed` applied → ✅

**Collect Payment**: locked (pre-existing CR-008 D1-Gate behaviour preserved) → ✅

**Result:** ✅ **PASS** — prepaid orders are locked on both surfaces, regardless of source / DC value.

---

### Case 6 — Regression checks

| Area | How verified | Result |
|---|---|---|
| **VAT / GST math** | `placeOrderPayload.test.js`, `updateOrderPayload.test.js`, `qa_subtotal_delivery_validation.test.js` — all GST / delivery-GST / item-tax breakdowns assert exact numbers. 82 payload tests + 8 subtotal-delivery tests pass. | ✅ unchanged |
| **Service charge** | Same payload-builder test suites assert SC fields on every payload variant. | ✅ unchanged |
| **Tip** | Same payload-builder test suites assert `tip_amount` on payment payloads. | ✅ unchanged |
| **placeOrder / updateOrder / cancelItem / cancelAndUpdate payloads** | 4 dedicated builder suites — 82 assertions pass. Delivery-charge field still serialises from `orderType === 'delivery' ? Number(deliveryCharge) \|\| 0 : 0` (OrderEntry.jsx:783 / :843). The new lock only blocks DOM input; it does NOT alter the serialisation path. | ✅ unchanged |
| **CollectPaymentPanel lock surface** | 28-test `deliveryLock.test.jsx` suite. Frozen-snapshot test confirms `readOnly` does not re-evaluate while typing. | ✅ unchanged |
| **Socket scan-new-order enrichment** | `handleScanNewOrder.enrichment.test.js` confirms `isWebOrder = true` is set defensively when backend omits `order_from`. | ✅ unchanged |
| **Barrel exports, axios, contexts** | Full suite 492/492 pass. | ✅ unchanged |

**No regression.**

---

## 6. Edge Cases Cross-Checked

- `delivery_charge: "0"` (string) → `parseFloat("0") = 0`, then `|| 0` → `0` → editable. ✅
- `delivery_charge: "80"` (string) → `parseFloat("80") = 80` → locked when `isWebOrder=true`. ✅
- `delivery_charge: 0.5` → locked (`>0` is true). ✅
- `delivery_charge: -1` (defensive, unlikely) → `parseFloat(-1) = -1`, `|| 0` keeps `-1`, predicate `-1 > 0` is `false` → editable. Not a security issue because the same value flows through orderTransform regardless of the lock; UI just won't lock on a negative.
- `orderType !== 'delivery'` (dineIn / walkIn / takeAway / room) → the entire CartPanel inline row is wrapped in `{orderType === 'delivery' && (...)}` (CartPanel.jsx:720), so it isn't even rendered. CollectPaymentPanel also wraps its delivery section in the same gate. ✅
- Typing into a locked field — `readOnly` blocks DOM input; the predicate is bound to the FROZEN `initialDeliveryCharge` prop, not the live state, so re-render cannot un-lock. Frozen-snapshot test confirms. ✅
- Echo-lock transition: if cashier edits DC on a web order arriving with DC=0, then places/updates, the backend echoes `delivery_charge=<entered value>`, and on the next CartPanel re-mount with that order the row transitions editable → locked. This is by-design and matches CollectPaymentPanel. Investigation memo §9 already flagged this for UX awareness; no test failure.

---

## 7. Open Questions / Observations

1. **No CartPanel-specific lock-surface test file exists** (only the
   CollectPaymentPanel one). The pure-function predicate test serves the
   contract for BOTH surfaces because it's byte-identical, but a dedicated
   `CartPanel.deliveryLock.test.jsx` would harden the contract against future
   accidental divergence. Recommended as a follow-up CR; not blocking.
2. **Width difference (`w-20` vs `w-24`)** between the two inputs is
   intentional (CartPanel inline row uses a narrower input). Not a defect.
3. **Echo-lock UX**: see §6 last bullet. May surprise cashiers; consider a
   subtle hint ("DC saved to order — locked on re-open") in a future polish.
4. **`frontend/yarn.lock` is untracked** in `git status` (deployment artefact
   from an earlier task). Unrelated.

---

## 8. Conclusion

The Scan & Order delivery-charge edit-lock fix is **complete, symmetric across
both surfaces (CartPanel + CollectPaymentPanel), correctly gated by the frozen
`initialDeliveryCharge` snapshot, and free of regression** to VAT / SC / tip /
payload-builder behaviour. All 492 unit tests pass on the working tree.

Recommendation: **Approve for release.** Optional follow-up: add a
`CartPanel.deliveryLock.test.jsx` to mirror the existing Collect Payment lock
suite.

— End of QA report.
