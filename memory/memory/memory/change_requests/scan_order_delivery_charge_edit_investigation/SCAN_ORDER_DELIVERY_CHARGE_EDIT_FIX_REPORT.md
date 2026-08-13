# Scan & Order — Delivery Charge Edit Lock — Fix Verification Report

> **Status:** Fix is already complete in the working tree at HEAD (`e382119`).
> Verification only — no further code changes were made in this session.

---

## 1. Outcome

The previous agent **completed the fix** before terminating. Both
`OrderEntry.jsx` (prop wiring) and `CartPanel.jsx` (predicate + lock UX)
already carry the full POS2-002 Phase 2 EXTENSION (2026-05-15) changes
described in the investigation memo. Lint is clean on both files.

No code edits were performed in this verification session.

---

## 2. Files Inspected (and confirmed already changed)

| File | Hunk | What is there |
|---|---|---|
| `frontend/src/components/order-entry/OrderEntry.jsx` | L1885–L1895 | Passes `isWebOrder` and `initialDeliveryCharge` to `<CartPanel/>` using **the exact same expressions** as the `<CollectPaymentPanel/>` wiring at L1237 / L1272. |
| `frontend/src/components/order-entry/OrderEntry.jsx` | L1912 | `isPrepaid={isPrepaid}` already passed (pre-existing). |
| `frontend/src/components/order-entry/CartPanel.jsx` | L272 / L280–L281 / L288–L289 | Props destructured with safe defaults: `isPrepaid=false`, `deliveryCharge=0`, `onDeliveryChargeChange`, `isWebOrder=false`, `initialDeliveryCharge=0`. |
| `frontend/src/components/order-entry/CartPanel.jsx` | L720–L766 | Inline delivery-charge row gated by `orderType === 'delivery'`, computes `deliveryLocked`, sets matching `title`, applies `readOnly`, and adds `bg-gray-100 cursor-not-allowed` styling when locked. `onChange` still calls `onDeliveryChargeChange` for the editable case. |

`git status` → only `frontend/yarn.lock` is untracked (deployment artefact,
unrelated). No modified files at HEAD. No unrelated files touched.

---

## 3. Exact Lock Predicate Used

`CartPanel.jsx:724`

```js
const deliveryLocked = isPrepaid || (isWebOrder && initialDeliveryCharge > 0);
```

This is **byte-identical** to the `CollectPaymentPanel.jsx:974` contract:

```js
readOnly={isPrepaid || (isWebOrder && initialDeliveryCharge > 0)}
```

Both surfaces consume the same prop names, the same expression order
(`isPrepaid` first to short-circuit prepaid layer), and rely on the **frozen**
`initialDeliveryCharge` prop (not the live `deliveryCharge` state) so typing
cannot unlock the field.

---

## 4. Symmetry Confirmation — CartPanel vs CollectPaymentPanel

| Aspect | CollectPaymentPanel.jsx | CartPanel.jsx | Match |
|---|---|---|---|
| Predicate | L974 `isPrepaid \|\| (isWebOrder && initialDeliveryCharge > 0)` | L724 same expression assigned to `deliveryLocked` | ✅ byte-identical |
| Tooltip — isPrepaid + DC>0 | "Delivery charge already collected from customer — not editable" | same string | ✅ |
| Tooltip — isPrepaid + DC=0 | "Order is prepaid — delivery charge cannot be modified" | same string | ✅ |
| Tooltip — web + DC>0 | "Delivery charge captured from web order — not editable" | same string | ✅ |
| Tooltip — editable | "Enter or edit delivery charge" | same string | ✅ |
| `readOnly` attribute | L974 | L757 | ✅ |
| Locked-state class | `bg-gray-100 cursor-not-allowed` (L984) | `bg-gray-100 cursor-not-allowed` (L759) | ✅ |
| onChange handler when editable | calls `setDeliveryChargeInput` | calls `onDeliveryChargeChange` | ✅ functional parity |
| Data source for `isWebOrder` | OrderEntry L1237 | OrderEntry L1890 (same expression) | ✅ |
| Data source for `initialDeliveryCharge` | OrderEntry L1272 | OrderEntry L1891 (same expression) | ✅ |
| Test ID | `delivery-charge-input` | `cart-delivery-charge-input` | distinct (correct — two surfaces) |

**Verdict:** CartPanel now mirrors CollectPaymentPanel for the lock contract;
the only intentional differences are the input's test-id, width class
(`w-20` vs `w-24`), and the local naming of the `onChange` handler.

---

## 5. QA / Static Check Matrix

Evaluated by tracing the predicate through OrderEntry's prop expressions and
through `orderTransform.fromAPI.order` mappings (`parseFloat(api.delivery_charge) || 0`,
`order_from === 'web'`).

| # | Scenario | `isPrepaid` | `isWebOrder` | `initialDeliveryCharge` | `deliveryLocked` | Field state | Result |
|---|---|---|---|---|---|---|---|
| 1 | Web/scan order, DC = 80 | false | true | 80 | **true** | readOnly, grey, "Delivery charge captured from web order — not editable" | ✅ Pass |
| 2 | Web/scan order, DC = 0 | false | true | 0 | false | editable, default tooltip | ✅ Pass |
| 3 | Web/scan order, DC = null / missing / undefined | false | true | 0 (parseFloat→NaN→0) | false | editable | ✅ Pass |
| 4 | Non-web POS delivery order, DC = 80 | false | false | 80 | false | editable (D1-Cap parity preserved) | ✅ Pass |
| 5 | Non-web POS delivery order, DC = 0 | false | false | 0 | false | editable | ✅ Pass |
| 6 | Prepaid order, any source, DC > 0 | true | * | >0 | **true** | readOnly, grey, "Delivery charge already collected from customer — not editable" | ✅ Pass |
| 7 | Prepaid order, any source, DC = 0 | true | * | 0 | **true** | readOnly, grey, "Order is prepaid — delivery charge cannot be modified" | ✅ Pass |
| 8 | Non-delivery order types (dineIn/walkIn/takeAway/room) | * | * | * | n/a | row hidden by outer `orderType === 'delivery'` gate | ✅ Pass |

The four scenarios called out in the brief specifically resolve as:

- **Web order, DC > 0** → locked ✅
- **Web order, DC = 0** → editable ✅
- **Web order, DC missing/null** → mapped to `0` by `orderTransform.js:280`, then editable ✅
- **Non-web delivery order** → editable ✅
- **Prepaid order** → locked (existing layer preserved) ✅

---

## 6. Lint / Syntax

- `ESLint frontend/src/components/order-entry/CartPanel.jsx` → ✅ No issues.
- `ESLint frontend/src/components/order-entry/OrderEntry.jsx` → ✅ No issues.

No other files were modified or required modification.

---

## 7. Files Changed in This Session

**None.** The required edits were already present in the working tree at HEAD
(`e382119`). This session performed:

- Read the investigation memo.
- Inspected `git status` and `git diff` (clean for both target files).
- Verified CartPanel destructures the new props with safe defaults.
- Verified OrderEntry passes `isWebOrder`, `initialDeliveryCharge`, and `isPrepaid`.
- Verified CartPanel predicate, tooltip, `readOnly`, and class match CollectPaymentPanel.
- Ran ESLint on both files.
- Wrote this report.

No commits were created.

---

## 8. Risks / Open Questions

1. **Live-edit echo behaviour (Scenario from investigation §9 item 9):** when a
   cashier edits DC on a web order that initially arrived with `DC = 0` and
   then places/updates the order, the backend will echo back `delivery_charge =
   <new value>`. On the next CartPanel re-mount with that order, the row will
   transition from editable → locked. This is by-design (matches
   CollectPaymentPanel) but may surprise cashiers if they expect to continue
   editing after place. Worth a one-line UX note for owner, no code change
   required.

2. **No new unit test was added for CartPanel's lock surface.** The existing
   `CollectPaymentPanel.deliveryLock.test.jsx` covers the predicate at the
   Collect Payment surface; an analogous file for CartPanel would lock the
   contract permanently. Out of scope for this verification task; recommended
   for a follow-up CR if owner agrees.

3. **`frontend/yarn.lock` is untracked** in `git status`. It is an artefact of
   an earlier deployment step in this pod, unrelated to this CR. No action
   needed for this task.

4. No risk to backend, VAT, service charge, tip, payload builders, or
   CollectPaymentPanel — none were touched.

— End of report.
