# Delivery Charge Payload Gap — Investigation Report

> **Scope:** Investigation only. No code changed. No backend touched. Code is the source of truth.
> **Date:** 2026-05-15
> **Reported issue:** Scan & Order delivery order placed; when it reached POS/backend, the `delivery_charge` did not come through.

---

## 0. Critical environment note — READ FIRST

This pod's `/app` directory holds **only the POS frontend codebase** (`core-pos-front-end-`, git remote `https://github.com/Abhi-mygenie/core-pos-front-end-.git`). The **Scan & Order customer-facing application** — which is the surface where the place-order payload in question is actually *constructed* — is **a separate codebase that is NOT cloned into this environment**.

What this means for the investigation:
- I can fully audit the **POS receive side**: the contract POS expects, how POS reads `delivery_charge` from the backend echo, how POS-originated payloads emit it, and any GST aggregation.
- I cannot audit the **Scan & Order side**: where Scan & Order calculates / stores / submits `delivery_charge` in the place-order payload.

Therefore the verdict at the end of this report is **`clarification_required`** — the source of truth for the symptom (Scan & Order's outbound payload) is unavailable here. This report documents:
1. Everything verifiable from the POS receive side (the contract).
2. A precise checklist of where to look once the Scan & Order codebase is accessible.

The user asked specifically: *"Investigate whether there are any cases where delivery charge is not passed correctly in the Scan & Order place-order payload."* That investigation cannot be completed against the actual code without the Scan & Order repo. The most rigorous answer this environment can produce is "the contract POS expects, plus a structured checklist of failure modes to verify in the Scan & Order repo."

---

## 1. Issue summary in plain English

A customer placed a delivery order via the Scan & Order (web-origin) flow. The order arrived at the POS and was visible on the dashboard, but the **delivery charge value was missing or zero** on the POS side — the cashier did not see a delivery line item, and the order's `order_amount` did not reflect the delivery fee.

The POS-side `ScanOrderPopOut` hides the "Delivery Charge" row whenever `deliveryCharge === 0` (it's gated `> 0` at `ScanOrderPopOut.jsx:446`), so the symptom is consistent with the order arriving with `delivery_charge: 0` (or missing) from the backend.

Two layers can produce this symptom:
- **(A) Scan & Order side**: the place-order payload submitted to the backend omitted `delivery_charge` or sent `0` / wrong field name. → **Cannot verify in /app.**
- **(B) Backend side**: Scan & Order sent it correctly but backend persisted `0` or did not return it on the echo. → Cannot verify in /app.
- **(C) POS side**: backend returned the value correctly but POS dropped it. → **Can verify in /app — see §3.**

This report rules out (C) (POS receive side is correct) and structures the investigation surface for (A) / (B).

---

## 2. Affected scenario

Per user description: **Scan & Order → delivery order → reaches POS without delivery charge.**

Variants to test in the Scan & Order codebase (see §10 checklist):
- Normal delivery order
- Delivery with saved address
- Delivery with newly added address
- Delivery without address selected (edge case — does Scan & Order allow this?)
- Retry / error path
- `updateCustomerOrder` / edit path
- Multi-menu / restaurant 716 path

Each must be exercised against the Scan & Order outbound place-order payload, NOT the POS-side receive.

---

## 3. POS receive side — `delivery_charge` field mapping (verifiable in /app)

### 3.1 Backend → POS read path

`frontend/src/api/transforms/orderTransform.js` L278–L280, inside `fromAPI.order`:

```js
// Delivery (basic — detailed mapping deferred)
deliveryAddress: api.delivery_address || null,
deliveryCharge:  parseFloat(api.delivery_charge) || 0,
```

**Coercion behaviour** (this is the *only* fallback on the POS receive side):

| Backend `api.delivery_charge` value | `parseFloat(...)` | `|| 0` result | POS `order.deliveryCharge` |
|---|---|---|---|
| `"50"` (string number) | 50 | 50 | **50** ✅ |
| `50` (number) | 50 | 50 | **50** ✅ |
| `"50.00"` | 50 | 50 | **50** ✅ |
| `"0"` / `0` / `""` (empty string) | 0 / 0 / NaN | 0 | **0** ❌ row hidden |
| `null` / `undefined` / key absent | NaN | 0 | **0** ❌ row hidden |
| `"abc"` (non-numeric) | NaN | 0 | **0** ❌ row hidden |

**Failure modes on the POS receive side that produce `deliveryCharge: 0`:**
1. Backend echo omits the `delivery_charge` key entirely.
2. Backend echoes `null`, `""`, or `0`.
3. Backend echoes a different field name (e.g. `deliveryCharge` camelCase, `delivery_fee`, etc.) — the POS expects exactly `delivery_charge` snake_case.

None of these are bugs in the POS code — they are upstream contract failures. If the backend always echoes `delivery_charge` correctly when present, then a POS `deliveryCharge: 0` means **the backend did not have a non-zero value to echo** (because Scan & Order either didn't send one, or the backend dropped it during persistence).

### 3.2 POS render path

`frontend/src/components/dashboard/ScanOrderPopOut.jsx` L446–L457:

```jsx
{/* BUG-045 45i: delivery charge — hidden when 0 */}
{activeOrder.orderType === 'delivery' && Number(activeOrder.deliveryCharge) > 0 ? (
  <div ... data-testid={`popout-delivery-charge-${idStr}`}>
    <span>Delivery Charge: </span>
    <span>{currencySymbol}{Number(activeOrder.deliveryCharge).toFixed(2)}</span>
  </div>
) : null}
```

Gating: row visible iff `orderType === 'delivery'` AND `deliveryCharge > 0`. If either fails, no row renders.

→ For this bug, the user reports the row is missing → `deliveryCharge` resolved to 0 (or to a non-positive number). Cause traces to §3.1 coercion outcomes.

### 3.3 POS scan-new-order socket enrichment

`frontend/src/api/socket/socketHandlers.js` → `handleScanNewOrder` (test reference: `/app/frontend/src/__tests__/api/socket/handleScanNewOrder.enrichment.test.js`). This handler:
1. Receives the `scan-new-order` socket event.
2. Calls `fetchSingleOrderForSocket(orderId)` to fetch the full order (via `single-order-new` endpoint).
3. Enriches with `orderFrom: 'web'` + `isWebOrder: true` (since backend's `single-order-new` response omits `order_from`).
4. Calls `addOrder(persistedOrder)`.

The enrichment touches **`orderFrom` only** — it does NOT touch / inject / default `deliveryCharge`. So if `delivery_charge` is correctly present in the `single-order-new` API response, it flows through `fromAPI.order` → L280 → POS dashboard correctly.

→ **No POS-side enrichment bug. The POS receive path is verified clean.**

---

## 4. POS-originated delivery_charge — control sample

For comparison, here is how delivery_charge flows in **POS-originated** orders (Place Order from `OrderEntry.jsx`). This is **NOT the Scan & Order path**, but confirms what a correct outbound payload should look like:

| Layer | File:line | Behaviour |
|---|---|---|
| UI input | `frontend/src/components/order-entry/CartPanel.jsx:712–743` | Editable Delivery Charge input row, only rendered when `orderType === 'delivery'` |
| State | `frontend/src/components/order-entry/OrderEntry.jsx` | `deliveryCharge` useState, set by `onDeliveryChargeChange` from CartPanel |
| Payload gate (placeOrder) | `OrderEntry.jsx:820–825` | `deliveryCharge: orderType === 'delivery' ? (Number(deliveryCharge) || 0) : 0` |
| Payload gate (updateOrder) | `OrderEntry.jsx:763–765` | same gating |
| Payload gate (placeOrderWithPayment) | `OrderEntry.jsx:1456–1465` | same gating |
| Build cart totals | `orderTransform.js:585–680` (`calcOrderTotals`) | Folds `deliveryCharge` into `postDiscount + serviceCharge + tipAmount + deliveryCharge` → into `tax_amount`, `gst_tax`, `order_amount`, `round_up` |
| Emit on the wire | `orderTransform.js:845` (placeOrder) / `:957` (updateOrder) / `:1012` (placeOrderWithPayment) | `delivery_charge: deliveryCharge` (snake_case, numeric) |

POS sends `delivery_charge` as a **number** to the backend. Backend echoes it back; POS reads it via `parseFloat(api.delivery_charge) || 0`. Round-trip integrity is built on this convention.

**Inferred contract for Scan & Order:** the place-order payload from Scan & Order *must* include `delivery_charge` as a numeric value (string or number — backend should accept either since `parseFloat` is used on read) when `orderType === 'delivery'`. If the field is absent or 0, the order arrives at POS with no delivery charge.

---

## 5. Delivery charge GST / tax impact (POS-side, verifiable)

If `delivery_charge` is missing/0 in the Scan & Order payload, **downstream GST aggregates also lose the delivery component**:

`orderTransform.js:585–680` (`calcOrderTotals`) — relevant lines:

- L625 `subtotalWithoutTax = round((postDiscount + serviceCharge + tipAmount + deliveryCharge) * 100) / 100`
- L637 `delTaxRate = (deliveryChargeGstPct || 0) / 100`
- L648 `delGstAmt = deliveryCharge * delTaxRate`  ← becomes 0 when `deliveryCharge` is 0
- L651 `gstTax = itemGstPostDiscount + scGstAmt + tipGstAmt + delGstAmt`  ← delivery contribution drops out
- L653 `totalTax = round((gstTax + vatTax) * 100) / 100`
- L657 `rawTotal = postDiscount + serviceCharge + tipAmount + deliveryCharge + totalTax`  ← short by `delivery + delivery_gst`
- L659–L661 `orderAmount = round(rawTotal)`  ← short by the same amount
- L662 `roundUp = round((orderAmount - rawTotal) * 100) / 100`  ← computed AFTER delivery is folded in; if delivery is missing, the round-up still computes correctly relative to the (smaller) rawTotal

**Cascading consequences** when `delivery_charge` is missing from the Scan & Order payload:
- `tax_amount` is short by `delivery_charge × delivery_charge_gst_pct/100`.
- `gst_tax` (aggregate) is short by the same amount.
- `total_gst_tax_amount` (= gst_tax) is short by the same amount.
- `order_amount` is short by `delivery_charge × (1 + delivery_charge_gst_pct/100)`.
- `delivery_charge_gst_amount` (BE-G9 in Phase 3 — currently folded into composite `gst_tax`) is short.
- `round_up` is **internally consistent** with the (incorrect) `rawTotal` — i.e. it does not "compensate" for the missing delivery. It's just a round-off of whatever `rawTotal` happens to be.

Same arithmetic applies whether the values originated from POS or from Scan & Order — `calcOrderTotals` is a pure function of its inputs. So if Scan & Order does not pass `deliveryCharge` into its own equivalent of `calcOrderTotals` (or if its own payload builder hardcodes it to 0 / drops it), all the same fields are short.

---

## 6. Cases where `delivery_charge` can become 0 / missing — known POS-side patterns

The Scan & Order codebase isn't available, but these patterns appear at well-known places on the POS side and are likely candidates to look for in Scan & Order:

| # | Pattern | Where POS guards against it |
|---|---|---|
| 1 | Hardcoded `delivery_charge: 0` in payload | POS placeOrder L845, updateOrder L957, placeOrderWithPayment L1012 all read from `deliveryCharge` arg (not hardcoded) |
| 2 | OrderType not `delivery` → payload sends 0 | POS L820–L825 explicitly gates on `orderType === 'delivery'` |
| 3 | `Number(deliveryCharge) \|\| 0` swallowing falsy non-zero (e.g. empty string) | POS uses `Number(deliveryCharge) \|\| 0` which is correct because `Number("") = 0` already → ambiguous if `""` is legitimate "no value entered" |
| 4 | `parseFloat(value)` on a stringified field that's actually missing | POS `parseFloat(api.delivery_charge) || 0` returns 0 silently when field absent |
| 5 | Form state not initialised for delivery orders | POS uses `useState(0)` default for `deliveryCharge` — if user never edits the row, 0 is sent |
| 6 | Field name mismatch (camelCase vs snake_case) | POS sends `delivery_charge`, expects `delivery_charge` echo. Mismatch → silent 0 |
| 7 | Address selection state desync — delivery charge tied to selected address but not refreshed when address changes | POS does NOT auto-compute delivery charge from address (cashier enters manually). Scan & Order likely DOES auto-compute (per the issue description mentioning "delivery address selection affects delivery charge") |
| 8 | Retry / error path resets state but doesn't restore delivery charge | POS retry doesn't reset `deliveryCharge` (state persists in OrderEntry component) |
| 9 | Update path uses stale snapshot that pre-dates delivery charge entry | POS `updateCustomerOrder` (if it exists in the Scan & Order codebase) — check for snapshot diff vs current state |
| 10 | Multi-menu / multi-restaurant path branches before delivery charge is set | "restaurant 716 path" suggests a code branch keyed on restaurantId — check for early-returns or alt payload builders |

→ These are hypotheses for the Scan & Order audit. None can be confirmed against /app.

---

## 7. Round_up wiring — relationship to delivery_charge

**Is the recent round_up implementation related?** Probably **not** to this bug, based on POS-side code:

- `calcOrderTotals` (orderTransform.js:655–663): `rawTotal` is computed AFTER `deliveryCharge` is folded in (L657). `orderAmount` is just the rounded version of `rawTotal`. `round_up = orderAmount − rawTotal`. So `round_up` is a **pure consequence** of `rawTotal`, which itself is a pure consequence of `deliveryCharge` (and other inputs). The round_up wiring does not have a code path that can "drop" delivery_charge; it just rounds whatever total it's given.
- `collectBillExisting` L1257 emits `round_up: 0` as a hardcoded value (because the collect-bill payload is a separate flow that doesn't recompute the round-up — the round-up was already baked into `order_amount` at place-order time). Not relevant to the place-order payload.

**However**, the round_up implementation in **Scan & Order's own codebase** is unknown. If the Scan & Order app computes `round_up` in a way that requires `delivery_charge` to be present BEFORE round_up is computed, and the order of state-updates puts round_up before delivery_charge, there could be a race. → To verify in the Scan & Order codebase.

For the POS receive side: `round_up` value coming back from backend is not consumed by POS in any way that would mask a missing `delivery_charge`. So POS-side round_up is unrelated.

---

## 8. Root cause / possible root causes

Because the Scan & Order codebase is unavailable, I can only enumerate hypotheses, ranked by likelihood from the POS-side evidence:

### High likelihood
1. **Scan & Order's place-order payload omits `delivery_charge` (or sends 0) when an order is submitted.** The user described the exact symptom: order arrives at POS without delivery charge. If the backend echoed `delivery_charge` correctly, the POS would render the row. POS-side mapping is bulletproof (verified §3). → The omission must be upstream.
2. **Scan & Order computes delivery_charge based on address selection but the value is not synced into the place-order payload state at submit-time.** Race / stale snapshot. Common pattern when the address selection happens after the cart state is built.

### Medium likelihood
3. **Field name mismatch.** Scan & Order sends `deliveryCharge`, `delivery_fee`, or another key; backend persists under different name; POS reads `api.delivery_charge` and gets undefined. Check the exact key name in the place-order request body.
4. **OrderType set to `dineIn` / `takeaway` accidentally** when the cart was started as delivery, suppressing the delivery payload branch in Scan & Order.

### Low likelihood
5. **Backend regression** drops `delivery_charge` before returning the order via `single-order-new`. Less likely because POS-originated delivery orders (e.g. CR-008 D1-Cap implementation) work end-to-end today against the same backend.
6. **Round_up implementation accidentally writing over delivery_charge.** Very unlikely given POS-side proof that round_up is downstream of delivery_charge in the totals computation. Worth a 30-second grep in the Scan & Order codebase as a sanity check.

### Effectively zero
7. **POS receive-side bug.** Ruled out — `orderTransform.js:280` is the single read site, and it returns `parseFloat(api.delivery_charge) || 0`. If the backend echoes a positive number, it surfaces.

---

## 9. Is the recent round_up change related?

**Not based on POS-side evidence.** The POS-side `calcOrderTotals` orders the operations as:
1. Compute `rawTotal` = `postDiscount + SC + tip + delivery + totalTax`
2. Compute `orderAmount` = round(`rawTotal`)
3. Compute `round_up` = `orderAmount − rawTotal`

So `delivery_charge` is an *input* to round_up, never an *output*. The round_up implementation cannot drop `delivery_charge` by construction.

**Caveat:** if the Scan & Order codebase implements round_up differently (e.g. computes `round_up` first off a sub-total, then adds delivery, then later overwrites `order_amount`), the ordering could create a window where `delivery_charge` is dropped. But this is a hypothesis only. Confirm with the Scan & Order code.

→ Recommendation: do a targeted diff of the Scan & Order codebase between "before round_up implementation" and "after" specifically on the place-order payload builder. If `delivery_charge` appears unchanged in that diff, round_up is not the cause.

---

## 10. Recommended implementation plan (after evidence is gathered)

### Phase 1 — Get the Scan & Order codebase accessible
- [ ] Clone the Scan & Order repository into this pod (or run the investigation against the actual repo).
- [ ] Identify the place-order payload builder (likely a function named `buildPlaceOrderPayload` / `submitOrder` / similar — analogous to POS-side `orderToAPI.placeOrder`).

### Phase 2 — Verify the Scan & Order outbound payload
For each variant in §2 (saved address, new address, no address, retry, update, multi-menu):
- [ ] Reproduce the order placement (or read the captured network request body).
- [ ] Confirm the exact key name: `delivery_charge` (snake_case, numeric).
- [ ] Confirm value > 0 when applicable.
- [ ] Confirm `order_amount`, `tax_amount`, `gst_tax` are consistent with `delivery_charge × (1 + delivery_charge_gst_pct/100)`.

### Phase 3 — If Scan & Order is sending it correctly → backend audit
- [ ] Audit the backend persistence: does it accept `delivery_charge` from the Scan & Order endpoint? Are there validation rules or feature flags gating it (web-origin vs POS-origin)?
- [ ] Audit `single-order-new` response: does it return `delivery_charge`?

### Phase 4 — Fix scoping (deferred until evidence is in hand)
- If Scan & Order payload omits it → fix the Scan & Order payload builder.
- If backend drops it → fix backend persistence / echo.
- If POS receive-side is at fault → revisit (unlikely; see §3).

### Strict guard-rails for any fix
- No POS-side change is justified by the current evidence; do not modify `orderTransform.js`, `ScanOrderPopOut.jsx`, or socket handlers.
- Do not modify CR-008 D1-Cap POS-side wiring.
- Backward-compatible: if Scan & Order uses a different field name, prefer fixing Scan & Order to emit `delivery_charge` rather than teaching POS to read a second name (avoids contract drift).

---

## 11. Risks / unknowns

| # | Item | Status |
|---|---|---|
| 1 | Scan & Order codebase not in /app | **Blocks** authoritative root-cause confirmation |
| 2 | Backend code not in /app | Cannot confirm persistence / echo behaviour |
| 3 | No captured payload sample from the real failing order | Strongly recommend capturing the Scan & Order outbound network request body for the failing order |
| 4 | Multi-menu / restaurant 716 path is mentioned but unspecified | Need owner to clarify what makes restaurant 716 different (separate menu store? separate payload builder?) |
| 5 | `delivery_charge_gst` field absence on the POS-side persistence | POS-side comment at orderTransform.js:643 notes "a dedicated `delivery_charge_gst_amount` key is BE-G9 in Phase 3" — currently folded into composite `gst_tax`. If Scan & Order emits a standalone `delivery_charge_gst_amount` key, it may be ignored by backend |
| 6 | Backend ↔ frontend field naming convention (snake_case) | POS receive expects `delivery_charge` snake_case; if Scan & Order sends camelCase, backend behaviour is undefined |
| 7 | Updating an existing delivery order — does Scan & Order use a different endpoint than place? | Check |

---

## 12. Final verdict

**`clarification_required`**

Reason: the source of truth for the symptom (where Scan & Order constructs the place-order payload) is **not in this environment**. Everything in this report verifies the **POS receive side is correct** (delivery_charge is read via `parseFloat(api.delivery_charge) || 0` at `orderTransform.js:280`, rendered with a `> 0` gate at `ScanOrderPopOut.jsx:446`, and threads correctly through `calcOrderTotals`). No POS-side fix is justified without first inspecting the Scan & Order codebase.

To proceed:

1. **Provide access to the Scan & Order codebase** (clone into a sibling directory, or run the investigation in that repo).
2. **Capture a live network trace** of the failing order's outbound place-order request body and the `single-order-new` response body. These two pieces of evidence will tell us in 5 minutes which of the §8 hypotheses is correct without needing to grep the whole Scan & Order codebase.
3. Once either or both are available, re-run this investigation on the actual evidence.

If the owner only wants a POS-side mitigation (e.g. "show 'Delivery Charge: not provided' instead of hiding the row when 0"), that is a separate, scope-bounded change that can be planned independently — but it does NOT fix the underlying problem.

---

## 13. References (POS-side, verifiable in this repo)

- POS read site: `frontend/src/api/transforms/orderTransform.js:280` (`fromAPI.order`).
- POS render site: `frontend/src/components/dashboard/ScanOrderPopOut.jsx:446–457`.
- POS socket handler: `frontend/src/api/socket/socketHandlers.js` → `handleScanNewOrder` (enrichment test at `frontend/src/__tests__/api/socket/handleScanNewOrder.enrichment.test.js`).
- POS place-order payload (control sample, not the bug surface): `frontend/src/components/order-entry/OrderEntry.jsx:820–825 / 1456–1465` + `frontend/src/api/transforms/orderTransform.js:805 / 845 / 926 / 957 / 1012`.
- POS totals math: `frontend/src/api/transforms/orderTransform.js:585–680` (`calcOrderTotals`, including L625 / L648 / L657 / L662 — delivery wiring is upstream of `round_up`, confirming round_up is not the cause).
- CR-008 / Bucket D1-Cap (May-2026) POS-side delivery-charge capture changelog — referenced in inline comments at `OrderEntry.jsx:824 / 864–867`, `orderTransform.js:797–802 / 842–845 / 920–925 / 955–957`.

— End of report.
