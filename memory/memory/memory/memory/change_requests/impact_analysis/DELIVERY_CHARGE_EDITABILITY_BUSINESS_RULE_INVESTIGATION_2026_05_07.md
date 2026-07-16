# Delivery Charge Editability — Business Rule Investigation 2026-05-07

**Type:** Read-only code-presence + investigation report. NO implementation, NO source edits, NO QA, NO tracker updates, NO `/app/memory/final/` access.
**Agent:** Delivery Charge Editability Investigation Agent
**Date:** 2026-05-07
**Branch:** `6-may`

---

## 1. Executive summary

> **Verdict: `partial_match_with_one_gap_and_one_detection_caveat`**

The frontend already enforces a delivery-charge editability gate for prepaid (scan/customer-app paid) delivery orders — `readOnly={isPrepaid}` at `CollectPaymentPanel.jsx:917`, where `isPrepaid = paymentType === 'prepaid'` (`OrderEntry.jsx:653-654`). The FE codebase explicitly treats "scan/customer-app" as a subset of "prepaid" (per comment trail at `OrderEntry.jsx:1172-1198`, `CollectPaymentPanel.jsx:27`).

Compared to the user's requested rule, the present implementation matches **3 of 4 quadrants** of the truth table. The single gap and the detection caveat below need owner sign-off before any code change.

| Quadrant | User's rule | Today's behaviour | Match? |
|---|---|---|---|
| Scan & Order + `delivery_charge > 0` | locked | locked (`isPrepaid` true) | ✅ |
| Scan & Order + `delivery_charge ∈ {0, null, blank, missing}` | **editable** | **locked** (`isPrepaid` ignores value) | ❌ **gap** |
| POS / manual postpaid + any `delivery_charge` | editable (status-quo) | editable | ✅ |
| POS / manual prepaid (cashier-flagged) + `delivery_charge > 0` | (not explicitly addressed by user — rule is scoped to "Scan & Order") | locked (`isPrepaid` true) | ⚠ **detection caveat** |

The math axes are already correct:
- Total includes `delivery_charge` exactly **once** at `orderTransform.js:615` (`rawTotal = postDiscount + serviceCharge + tipAmount + deliveryCharge + totalTax`).
- GST on delivery is computed exactly **once** at `orderTransform.js:606` (`delGstAmt = deliveryCharge * delTaxRate`) and folded into composite `gst_tax`.
- Backend `delivery_charge` is parsed safely at `orderTransform.js:246` (`parseFloat(api.delivery_charge) || 0`) — handles number, numeric string, `null`, `undefined`, and missing.
- CR-008 Sub-CR #1 Round-3 hotfix (May-2026) ensures `total` symmetry across paths — no double-count regression.

### 1.1 Net answer to the 5 investigation questions

| # | Question | Short answer |
|---|---|---|
| 1 | How to reliably detect Scan & Order? | **No direct signal in the dashboard order model today.** Closest proxy is `paymentType === 'prepaid'`, treated by the FE as the "scan/customer-app" subset. **Caveat:** also matches POS-side cashier-flagged prepaid orders (advance payment scenario). |
| 2 | Does backend response have an order-origin flag? | **YES, but only on the Audit-Report transform** — `api.order_from` ∈ `{'pos', 'web', null}` at `reportService.js:746-755`. **NOT propagated** to `orderTransform.fromAPI.order` (the dashboard / OrderEntry / CollectPaymentPanel pipeline). |
| 3 | Can current UI distinguish scanner delivery orders from POS delivery orders? | **Indirectly only** — via `isPrepaid` proxy. Indirect proxy works in practice for scan vs POS-postpaid, but cannot distinguish scan-prepaid from POS-prepaid. |
| 4 | What shape is `delivery_charge` from backend? | Tolerated as **number, numeric string, null, undefined, missing** by `parseFloat(api.delivery_charge) \|\| 0` at `orderTransform.js:246`. Always normalised to a number ≥ 0 downstream. |
| 5 | Does disabling the field affect only the correct case? | **Mostly yes, with one over-lock and one under-detection.** Over-locks Scan-with-`dc=0` and POS-prepaid-with-`dc>0`; underlying detection signal (`isPrepaid`) is a proxy, not the canonical `order_from`-derived flag. |

### 1.2 Key recommendation
- **No urgent FE rewrite needed for the typical scan-with-`dc>0` case** — current behaviour matches user spirit.
- **For the `dc=0` scan-order edit-allowed case**, FE change is small (≈3-line predicate change) but introduces a fresh decision: should the value-axis use `initialDeliveryCharge > 0` or the live `deliveryChargeInput`? See §6.
- **For canonical detection** (Scan & Order vs POS prepaid), backend must expose `order_from` on `orderTransform.fromAPI.order`. Cheap one-line backend echo + one-line FE map. **Required for non-ambiguous detection.**

---

## 2. Current implementation evidence

### 2.1 Where the lock is applied

**File:** `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`
**Line:** `917` — the input field's `readOnly` predicate

```jsx
<input
  type="number"
  placeholder="0"
  value={deliveryChargeInput}
  onChange={(e) => setDeliveryChargeInput(e.target.value)}
  min="0"
  // CR-008 / Bucket D1-Gate (May-2026): readOnly rule swapped from
  // BUG-019's `initialDeliveryCharge > 0` (which over-locked POS-
  // punched in-house delivery orders after CR-008 D1-Cap began
  // persisting their charges). The new rule ties the lock to the
  // actual concern — money already collected. Prepaid (scan /
  // customer-app paid) → locked. Non-prepaid → editable for
  // cashier corrections / waivers / forgotten-amount entry.
  readOnly={isPrepaid}
  title={
    isPrepaid
      ? (initialDeliveryCharge > 0
          ? 'Delivery charge already collected from customer — not editable'
          : 'Order is prepaid — delivery charge cannot be modified')
      : 'Enter or edit delivery charge'
  }
  className={`... ${isPrepaid ? 'bg-gray-100 cursor-not-allowed' : ''}`}
  data-testid="delivery-charge-input"
/>
```

> **Significant historical fact** (per the comment block above): The previous rule was `readOnly = initialDeliveryCharge > 0`. CR-008 / D1-Gate **explicitly removed the value-based axis** in May-2026 because POS-punched delivery orders that had a backend-persisted `delivery_charge > 0` were getting over-locked despite being editable by spec. The current `readOnly={isPrepaid}` rule was a deliberate replacement.
>
> The user's new business rule effectively asks to **re-introduce the value axis** — but only for Scan & Order, not for POS. This means **two axes** must combine, not just one.

### 2.2 How `isPrepaid` is derived

**File:** `/app/frontend/src/components/order-entry/OrderEntry.jsx`
**Lines:** `653-654`

```js
const orderPaymentType = liveOrder?.paymentType || orderData?.paymentType || '';
const isPrepaid = orderPaymentType === 'prepaid';
```

Source of `paymentType`: `api/transforms/orderTransform.js:191` — `paymentType: api.payment_type || ''`.

Source of `api.payment_type`: backend writes `'prepaid'` or `'postpaid'` to the order record. Scan / customer-app orders → `'prepaid'`; POS orders → `'postpaid'` (default at toAPI builders, `orderTransform.js:762, 855`); manual cashier-flagged prepaid POS orders → `'prepaid'` (e.g. `orderTransform.js:952` `placeOrderWithPayment` builds with `payment_type: 'prepaid'` on the cash-on-place flow).

> **Caveat:** `paymentType === 'prepaid'` is **not isomorphic** to "Scan & Order originated". A POS cashier who collects payment up-front (say, on a takeaway) marks the order `'prepaid'` via `placeOrderWithPayment`. That POS-prepaid order would also satisfy `isPrepaid === true` and would lock the delivery field. For 100% canonical detection, see §3.

### 2.3 Where the seed value comes from

**File:** `/app/frontend/src/components/order-entry/OrderEntry.jsx`
**Line:** `1199`

```js
initialDeliveryCharge={orderFinancials.deliveryCharge || (Number(deliveryCharge) || 0)}
```

- `orderFinancials.deliveryCharge` ← from backend echo (BUG-019) for re-engaged orders / scan orders
- `Number(deliveryCharge) || 0` ← OrderEntry-local state (CR-013 Phase 1.5 Fix-2 fallback for the **pre-place fresh-delivery** flow)

### 2.4 Where the value gets read (lazy-init)

**File:** `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`
**Line:** `~150` (BUG-019 lazy-init from backend-seeded value)

```js
// BUG-019 (Apr-2026): lazy-init from backend-seeded value (scan orders / re-engage).
const [deliveryChargeInput, setDeliveryChargeInput] = useState(
  initialDeliveryCharge > 0 ? String(initialDeliveryCharge) : ''
);
```

→ `deliveryChargeInput` (controlled input string) starts as the backend value if present, blank otherwise. This is the value that flows into `paymentData.deliveryCharge` on `Pay` click (`CollectPaymentPanel.jsx:~520`).

### 2.5 Where the math closes once

**File:** `/app/frontend/src/api/transforms/orderTransform.js`

| Line | Concern | Evidence |
|---|---|---|
| 246 | Backend → FE parse | `deliveryCharge: parseFloat(api.delivery_charge) \|\| 0` |
| 595-606 | GST-on-delivery once | `const delTaxRate = (deliveryChargeGstPct \|\| 0) / 100;` · `const delGstAmt = deliveryCharge * delTaxRate;` |
| 615 | Total once | `const rawTotal = postDiscount + serviceCharge + tipAmount + deliveryCharge + totalTax;` |
| 627 | `gst_tax` payload | `gst_tax: Math.round(gstTax * 100) / 100` (composite includes Item + SC + Tip + Delivery GST) |
| 777, 866, 966, 1131, 1552 | `delivery_charge` payload | Same key on placeOrder / updateOrder / placeOrderWithPayment / collectBillExisting / print payload |

**Round-3 hotfix verification** (CR-008 Sub-CR #1 Round-3):
- `OrderEntry.jsx:687-697` and `CartPanel.jsx:863-868` — `total` symmetry across paths. `+ deliveryCharge` was REMOVED from CartPanel's display total because `calcOrderTotals` already includes it. **No double-count.**

### 2.6 Where Scan & Order surfaces in the codebase

| File | Line | Purpose |
|---|---|---|
| `api/socket/socketHandlers.js` | 428-447 | `handleScanNewOrder` — fetches scan-new-order from socket, calls `addOrder` |
| `api/socket/useSocketEvents.js` | 25, 90 | Wires the handler |
| `api/socket/index.js` | 31 | Exports the handler |
| `components/cards/OrderCard.jsx` | 329 | `paymentType === 'prepaid'` → "PAID" badge (treated as scan/customer-app proxy) |
| `components/cards/TableCard.jsx` | 244, 401 | Same prepaid badge logic |
| `components/order-entry/CollectPaymentPanel.jsx` | 27 | Comment: `Prepaid (scan/customer-app paid) orders → field locked, money already collected` |
| `components/order-entry/OrderEntry.jsx` | 1175-1177 | Comment: `Prepaid orders (scan / customer-app paid) stay locked because the customer already paid` |

> **No direct `isScanOrder` flag, no `order_from` field, no `order_origin` field on the dashboard pipeline.** The whole codebase relies on `isPrepaid` as the proxy.

### 2.7 Where `order_from` IS captured (Audit Report only)

**File:** `/app/frontend/src/api/services/reportService.js`
**Lines:** `746-755`

```js
const orderFromRaw = (api.order_from || '').toString().toLowerCase();
let platform;
if (orderFromRaw === 'pos') {
  platform = 'pos';
} else if (orderFromRaw === 'web') {
  platform = 'web';
} else if (orderFromRaw) {
  // Unknown value — preserve as-is for filter dropdown surface
  platform = orderFromRaw;
} else {
  platform = null;
}
```

→ The Audit Report transform DOES expose `order_from` and converts it to `platform: 'pos' | 'web' | null`. The dashboard order transform DOES NOT. **One-liner fix on backend echo + transform if owner approves.**

---

## 3. Investigation answers (detailed)

### 3.1 How to reliably detect Scan & Order / customer-originated delivery orders?

| Detection method | Reliability | Where in code |
|---|---|---|
| `paymentType === 'prepaid'` (current proxy) | **Indirect.** Catches all customer-app paid orders + ALSO POS cashier-flagged prepaid orders. Distinguishes scan-vs-POS-postpaid correctly; cannot distinguish scan-vs-POS-prepaid. | `OrderEntry.jsx:653-654` |
| `order_from === 'web'` (canonical) | **Direct.** Backend tags `'web'` for QR / scan / customer-app, `'pos'` for cashier-originated. | NOT exposed on dashboard pipeline today. Available only on `reportService.js:746`. |
| Socket-event provenance (`scan-new-order` event arrived) | Available at receive-time (`handleScanNewOrder`) but NOT persisted on the order object; lost after first refresh. | `socketHandlers.js:428` |
| `razorpay_order_id !== null` | **Indirect.** Suggests payment-gateway-attempted order; correlated but not equivalent to scan origin. | Available on Audit-side only (`reportService.js:759-760`). Not on dashboard model. |
| `order_in === 'own'` | Captures the channel (vs swiggy/zomato/RM/SRM); does NOT distinguish own-POS from own-scan. | `orderTransform.js:218` |

**Recommendation for canonical detection:** Backend must add `order_from` (or equivalent `is_scan_order` boolean) to the order-list / single-order response that feeds `orderTransform.fromAPI.order`. Then FE one-line map at `~L191` followed by a one-line predicate at `OrderEntry.jsx:653-654`. **No business-logic refactor required.**

### 3.2 Does the backend response have a source / channel / order-origin flag?

| Field | Surface | Values | Exposed to dashboard? |
|---|---|---|---|
| `api.order_from` | Order list (Audit-side) | `'pos'` / `'web'` / null | **No** — captured only in `reportService.js:746` (Audit Report transform) |
| `api.order_in` | All surfaces | `'RM'` / `'SRM'` / aggregator name (`swiggy` / `zomato` / etc) / null / `'own'` | Yes (`orderTransform.js:163, 218`). But represents CHANNEL, not originator. |
| `api.payment_type` | All surfaces | `'prepaid'` / `'postpaid'` | Yes (`orderTransform.js:191`) |
| `api.razorpay_order_id` | Order list (Audit-side) | string / null | Audit only (`reportService.js:759`) |
| `api.snapshot_razorpay_status` | Order list | null today; populated post-BE-W2 ship | Audit only (`reportService.js:928`) |

**`order_from` is the only canonical answer to the user's detection question — and it's NOT in the dashboard pipeline today.**

### 3.3 Whether current UI can distinguish scanner delivery orders from normal POS delivery orders

| Scenario | Today's UI signal | Distinction quality |
|---|---|---|
| Scan delivery (Razorpay-paid) | `paymentType === 'prepaid'` → `isPrepaid = true` → locked | ✅ Correct |
| Scan delivery (Razorpay-pending — just placed via QR) | `paymentType === 'prepaid'` (assigned at place time) → locked | ✅ Correct |
| POS-postpaid delivery | `paymentType === 'postpaid'` → `isPrepaid = false` → editable | ✅ Correct (matches user's "POS/manual unchanged" intent) |
| POS-prepaid delivery (cashier collected cash up-front via `placeOrderWithPayment`) | `paymentType === 'prepaid'` → `isPrepaid = true` → **locked** | ⚠ **Locked even though user might consider this a "POS" order**. User's rule says POS = "unchanged"; today this case is locked. Owner clarification needed (§7). |
| Aggregator delivery (Swiggy / Zomato) | `paymentType` value depends on aggregator integration; typically `'prepaid'`. `order_in` = aggregator name. | Today: locked if `paymentType === 'prepaid'`. Adjacent to scan but a separate origin. |

### 3.4 Whether `delivery_charge` value comes from backend as number / string / null

**Single read site:** `orderTransform.js:246`
```js
deliveryCharge: parseFloat(api.delivery_charge) || 0,
```

`parseFloat` behaviour table:
| Backend sends | `parseFloat(...)` | `|| 0` | FE sees |
|---|---|---|---|
| `100` (number) | `100` | `100` | `100` ✅ |
| `"100"` (string) | `100` | `100` | `100` ✅ |
| `"100.50"` | `100.5` | `100.5` | `100.5` ✅ |
| `0` | `0` | `0` (because `0` is falsy) | `0` ✅ |
| `"0"` | `0` | `0` | `0` ✅ |
| `null` | `NaN` | `0` | `0` ✅ |
| `undefined` | `NaN` | `0` | `0` ✅ |
| `""` (empty string) | `NaN` | `0` | `0` ✅ |
| (key missing) | `NaN` | `0` | `0` ✅ |

> **All five "0/null/blank/missing" cases collapse to `0` cleanly.** No string survives downstream. The `> 0` predicate the user describes is safe.

**Caveat:** The fallback is `|| 0` (not `?? 0`). Means `0` becomes `0` (correct), but it also means a **legitimate** zero from backend cannot be distinguished from a missing field after this point. For the user's rule (`> 0` lock), this distinction does NOT matter — both → editable.

### 3.5 Whether disabling the field affects only the correct case

**Today's predicate:** `readOnly={isPrepaid}` (single axis — order-level flag).

**Truth table vs user's rule:**

| Origin | `dc` value | Today | User wants | Match? |
|---|---|---|---|---|
| Scan & Order | `> 0` | locked | locked | ✅ |
| Scan & Order | `0 / null / blank` | **locked** | **editable** | ❌ **gap** |
| POS postpaid | `> 0` | editable | editable | ✅ |
| POS postpaid | `0` | editable | editable | ✅ |
| POS-prepaid (cashier-flagged) | `> 0` | locked | (user's rule scopes only "Scan & Order"; POS unchanged → editable today's status-quo for postpaid; current code locks for prepaid) | ⚠ scope ambiguity |
| Aggregator (Swiggy/Zomato) prepaid | any | locked (if `paymentType === 'prepaid'`) | (out of user's scope) | ⚠ scope ambiguity |

→ The user's rule needs **two axes** (origin AND value), not one.

---

## 4. Backend response wire reality (live evidence)

> Sourced from `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` and the 2026-05-06 audit cohort (Bean Me Up tenant 742, 13 rows).

| Field | Schema present? | Sample non-null? | Notes |
|---|---|---|---|
| `delivery_charge` | ✅ | 1/13 (Order #4 = 100) | Number on the wire (`100` integer) |
| `delivery_charge_gst` | ✅ (rate %) | All 13 (≠ amount) | Don't confuse with BE-G9 `delivery_charge_gst_amount` ₹ — that doesn't exist yet |
| `delivery_charge_gst_amount` (₹) | ❌ NOT IN SCHEMA | n/a | BE-G9 — owner-promised, not yet shipped |
| `order_from` | Documented (Audit-side) | n/a in the cohort sample | Not exposed on dashboard order model |
| `order_in` | ✅ | 13/13 | Channel, not origin |
| `payment_type` | ✅ | 13/13 | `'prepaid'` / `'postpaid'` |
| `razorpay_order_id` | ✅ (Audit-side) | n/a | Audit only |

> **`delivery_charge` is canonically a number on the wire.** Defensive `parseFloat || 0` handles it plus all the missing-field cases.

---

## 5. Verification of the math axes (no double-count)

### 5.1 Total includes delivery once

**Single source:** `api/transforms/orderTransform.js:615` (inside `calcOrderTotals`)
```js
const rawTotal = postDiscount + serviceCharge + tipAmount + deliveryCharge + totalTax;
```

All 5 toAPI builders (`placeOrder`, `updateOrder`, `placeOrderWithPayment`, `collectBillExisting`, `transferToRoom`) compute totals via `calcOrderTotals` (or its sibling `calcCombinedTotals` for combined-paths), passing `deliveryCharge` exactly once.

### 5.2 GST on delivery once

**Single source:** `api/transforms/orderTransform.js:606`
```js
const delGstAmt = deliveryCharge * delTaxRate;
```

Folded into composite `gst_tax` at L627. The component is exposed in Collect Bill UI at `CollectPaymentPanel.jsx:378-380` for transparency, but the payload sends only the composite — there is no per-component `delivery_charge_gst_amount` payload key (BE-G9 not approved).

### 5.3 Round-3 hotfix evidence

**Symmetry guard:** `OrderEntry.jsx:687-697` (Round-3 hotfix May-2026):
> `// CR-008 Sub-CR #1 Round-3 hotfix (May-2026): make \`total\` symmetric across [paths]`

**Display deduplication:** `CartPanel.jsx:863-868`:
> `// CR-008 Sub-CR #1 Round-3 hotfix (May-2026): the \`+ deliveryCharge\`` was removed from CartPanel's display total because `calcOrderTotals` already includes it.

→ **No double-count regression risk.** The math is closed once at a single computation site.

### 5.4 Print payload echo

**Site:** `orderTransform.js:1311-1554` (`buildBillPrintPayload`)
- `delivery_charge` echoed at `L1552` from `overrides.deliveryCharge` or live `order.deliveryCharge`
- `gst_tax` re-computed inside the print builder using the same `delTaxRate * deliveryCharge` formula (`L1382-1394`)
- `cgst_amount` / `sgst_amount` halves emitted (Phase 1.5 D-GST-4-PRINT-PAYLOAD)

→ Print path consistent with main payload. Not a regression surface for this rule.

---

## 6. Implementation rails (for owner consideration only — no code change made)

> **Do NOT implement before owner sign-off on the §7 scope questions.**

If owner confirms the rule and chooses canonical detection, the FE change is a small predicate update. Sketch only:

### 6.1 Sketch — value-axis added to existing prepaid gate (minimal)

```js
// File: components/order-entry/CollectPaymentPanel.jsx :917
// CHANGE (sketch only — DO NOT EDIT WITHOUT OWNER APPROVAL):
readOnly={isPrepaid && Number(initialDeliveryCharge) > 0}
//                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ NEW value-axis
```

- Closes the user's `dc=0 + Scan & Order → editable` gap.
- Introduces no new detection signal — still uses the `isPrepaid` proxy.
- Does NOT separate POS-prepaid from Scan-prepaid (those would still both lock).
- Existing `initialDeliveryCharge` seed already on the wire — no transform change needed.
- Open question: should the predicate check `initialDeliveryCharge > 0` (frozen at mount) or live `deliveryChargeInput > 0` (toggles dynamically as cashier types)? Frozen is safer (no flicker on edit); live is more responsive. **Owner choice.**

### 6.2 Sketch — canonical `order_from` detection (more reliable, requires backend echo)

Backend (1-line addition in order-list / single-order response):
```python
# Backend response builder
'order_from': order.order_from,  # 'pos' | 'web' | None
```

FE transform (`orderTransform.js:191` adjacent):
```js
// CHANGE (sketch only):
orderFrom: api.order_from || null,   // 'pos' | 'web' | null
```

FE detection (`OrderEntry.jsx:653-654` adjacent):
```js
// CHANGE (sketch only):
const isScanOrder = (liveOrder?.orderFrom || orderData?.orderFrom) === 'web';
const isScanWithCharge = isScanOrder && Number(initialDeliveryCharge) > 0;
```

FE gate (`CollectPaymentPanel.jsx:917`):
```js
// CHANGE (sketch only):
readOnly={isScanWithCharge}   // ← matches user's rule literally
```

- Gives canonical "Scan & Order" detection — distinguishes scan-prepaid from POS-prepaid.
- POS-prepaid orders (cashier collected cash up-front) become **editable** under user's rule.
- Aggregator (Swiggy/Zomato) → `order_from = 'web'` ambiguity. Need backend to clarify whether aggregator orders carry `order_from = 'web'` or a separate value (e.g. `'aggregator'`).

### 6.3 Sketch — combined (recommended but bigger surface)

Combine §6.1 (value axis) + §6.2 (canonical detection):
```js
const isScanOrder = (liveOrder?.orderFrom || orderData?.orderFrom) === 'web';
const isPosPrepaid = isPrepaid && !isScanOrder;
const lockReason =
  isScanOrder && Number(initialDeliveryCharge) > 0 ? 'scan_with_charge'
  : isPosPrepaid ? 'pos_prepaid'   // existing behaviour preserved
  : null;
const readOnly = lockReason !== null;
```

This preserves the existing "POS-prepaid → locked" behaviour (per CR-008 D1-Gate spirit — money already collected) AND adds the value axis for Scan & Order. Owner needs to decide whether POS-prepaid should remain locked or become editable.

### 6.4 Tests / impact surface to inspect (before any owner-approved CR ships)

- `OrderEntry.jsx:1067, 1079` — Merge/Shift gate (uses `isPrepaid`). Should NOT inherit the new value axis.
- `OrderEntry.jsx:1208` — Split Bill gate (uses `!isPrepaid`). Should NOT change.
- `OrderEntry.jsx:1820` — `<CollectPaymentPanel isPrepaid={isPrepaid} />` second pass. Same predicate flow.
- `OrderEntry.jsx:550` — `if (isPrepaid && placedOrderId)` early-return on a placed-order rerun. Unrelated to delivery — leave untouched.
- `__tests__/api/transforms/orderTransformFinancials.test.js` — existing financial test fixtures (`payment_method: 'cash_on_delivery'`); add a test fixture for scan + dc=0 case if rule lands.
- Print payload — `buildBillPrintPayload` reads `order.deliveryCharge`, not `isPrepaid`. Untouched by this rule.

---

## 7. Owner clarifying questions (REQUIRED before any code change)

1. **POS-prepaid scope.** When a POS cashier flags an order as `'prepaid'` (e.g. cash-on-place via `placeOrderWithPayment`), the order's `paymentType === 'prepaid'`. Today this locks the delivery charge field (per CR-008 D1-Gate "money already collected" spirit). Your new rule says "POS/manual delivery — existing behaviour should remain unchanged." Does "existing behaviour" mean:
   - (a) Keep today's behaviour as-is — POS-prepaid stays locked, only fix the gap for Scan-with-`dc=0`?
   - (b) POS-prepaid becomes editable — only "Scan & Order" stays locked (with `dc>0`)?

2. **Detection canonicality.** Are you OK with the current `paymentType === 'prepaid'` proxy as the "Scan & Order" detector, or would you like backend to expose `order_from` ('pos' / 'web') on the dashboard pipeline so detection is unambiguous? Backend cost: ≈1 line of code; FE map: ≈1 line; total: small. Owner-time required: backend coordinator approval.

3. **Aggregator orders.** Swiggy / Zomato delivery orders (`order_in: 'swiggy'`/`'zomato'`) are typically `paymentType === 'prepaid'`. Today they lock with the `isPrepaid` rule. Should they:
   - (a) stay locked (treat as Scan-equivalent because money already in)?
   - (b) Be editable (cashier might need to adjust)?
   - (c) Out of scope for this rule (defer)?

4. **Value-axis trigger.** Should the value axis read from `initialDeliveryCharge` (the frozen-at-mount backend seed) or live `deliveryChargeInput` (changes dynamically as cashier types)?
   - **Frozen recommended** — predicate stable, no flicker; edge case "scan with `dc=0` and cashier types ₹50 → would the field re-lock at ₹50 mid-typing?" answered as "no" by frozen.
   - **Live** would re-lock the moment `deliveryChargeInput > 0` and is confusing UX.

5. **`dc=0` Scan & Order — what does the cashier need?** The user rule allows the cashier to enter delivery charge for Scan & Order with `dc=0`. Real-world frequency check:
   - Customer scanned + paid for items but ordered self-pickup → no delivery charge → `dc=0` ✅ valid case.
   - Customer scanned + paid for items + selected delivery but somehow `dc=0` slipped through → cashier wants to add delivery now → ✅ valid case.
   - Are these the cases you have in mind, or something else?

---

## 8. Strict-rules compliance certification

| Rule | Status |
|---|---|
| Read-only — no implementation | ✅ |
| No frontend / backend source edited | ✅ |
| No QA / tests run | ✅ |
| No tracker rewrite | ✅ — only this investigation report created |
| No `/app/memory/final/*` touched | ✅ |
| No code pulled / branch switched | ✅ |
| Stop after creating the investigation report | ✅ |

---

## 9. Final verdict

```yaml
verdict: partial_match_with_one_gap_and_one_detection_caveat
matches:
  - Scan & Order + delivery_charge > 0 → locked (✅ today's isPrepaid gate)
  - POS postpaid → editable (✅)
  - delivery_charge math closed once (✅ orderTransform.js:606, 615)
  - GST on delivery once (✅ same)
  - delivery_charge value safely parsed (✅ orderTransform.js:246)
  - No double-count regression (✅ Round-3 hotfix in place)
gaps:
  - Scan & Order + delivery_charge ∈ {0, null, blank} → today: locked, user wants editable
detection_caveat:
  - Today's "Scan & Order" detection uses `paymentType === 'prepaid'` as a proxy.
    Cannot distinguish scan-prepaid from POS-prepaid orders.
    For canonical detection, backend must expose `order_from` on the dashboard pipeline.
recommendation:
  - DO NOT implement until owner answers §7 questions 1-5.
  - If owner approves canonical detection, add `order_from` echo on backend + 1-line FE transform map.
  - If owner is OK with proxy, add value-axis to existing isPrepaid gate (~3 lines).
next_agent: New CR Planning Agent (only after owner reply)
```

---

— End of Delivery Charge Editability Investigation 2026-05-07 —
