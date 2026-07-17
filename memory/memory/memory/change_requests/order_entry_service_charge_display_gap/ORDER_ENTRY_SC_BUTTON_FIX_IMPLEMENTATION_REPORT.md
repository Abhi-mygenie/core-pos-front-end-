# Order Entry — Collect Bill Button SC Display Fix — Implementation Report

**Status:** Implementation complete. Lint clean. Hot-reload picks up automatically.
**Date:** 2026-05-15
**Scope reference:** `/app/memory/change_requests/order_entry_service_charge_display_gap/ORDER_ENTRY_SC_BUTTON_FIX_PLAN.md`
**Investigation:** `/app/memory/change_requests/order_entry_service_charge_display_gap/ORDER_ENTRY_SC_DISPLAY_GAP_INVESTIGATION.md`

---

## 1. Impact check (pre-implementation)

All 7 questions cleared before any edit:

| # | Question | Verdict | Evidence |
|---|---|---|---|
| 1 | Does the Collect Bill button amount come only from `OrderEntry.jsx total`? | **YES** | `OrderEntry.jsx` L1841 passes `total={total}` → `CartPanel.jsx` L868 renders `total` (+ room adders for rooms only). No other source. |
| 2 | Does Collect Payment already calculate SC correctly and separately? | **YES** | `CollectPaymentPanel.jsx` L397–L398 computes `serviceCharge` independently from cartItems + `restaurant.serviceChargePercentage`. Does NOT read `OrderEntry.total`. Screenshot confirms ₹30/₹330/₹396. |
| 3 | Will adding SC to pre-place total cause double-count on Collect Payment? | **NO** | CollectPaymentPanel computes from scratch — it never consumes the OrderEntry display value. Verified by reading `CollectPaymentPanel.jsx` L65, L255–L259, L397–L398, L460. |
| 4 | Does Place Order payload already send `serviceChargePercentage` correctly? | **YES** | `OrderEntry.jsx` L820–L823 (place), L759–L762 (update), L1456–L1459 (place-with-payment) all threading the gated value. Unchanged by this fix. |
| 5 | Does table card total come from backend/order amount and remain unaffected? | **YES** | Post-place: `total = orderFinancials.amount + ...` (L713–L716). `orderFinancials.amount` = backend echo from `calcOrderTotals`. Post-place branch UNTOUCHED by this fix. Dashboard table card reads from same `orderFinancials` source. |
| 6 | Does this change affect only the displayed pre-place button amount? | **YES** | Modified `rawLocalTotal` and `rawUnplacedTotal` constants. These feed only into `total` (display). `total` IS passed at L820 into `placeOrder` options, but `placeOrder` does NOT destructure `total` (L793) — it's a dead-pass-through. Confirmed by reading the destructure. SC value sent on the wire is computed from `serviceChargePercentage` (independent of `total`). |
| 7 | Does this preserve takeaway/delivery/no-auto-SC behaviour? | **YES** | `localSCApplicable` uses the exact gate `(dineIn||walkIn||isRoom) && autoServiceCharge && pct>0` — same as L760–L762/L821–L823/L1458–L1459. When false, `localSCRate=0` → `localServiceCharge=0` → `rawLocalTotal` reverts to today's expression byte-identically. |

**All 7 clean. Proceeded to implementation.**

---

## 2. Files changed

```
frontend/src/components/order-entry/OrderEntry.jsx | 22 ++++++++++++++++++++--
1 file changed, 20 insertions(+), 2 deletions(-)
```

**Exactly one file.** No `CartPanel.jsx`, no `CollectPaymentPanel.jsx`, no payload builder, no transform, no backend file touched.

---

## 3. What changed

Replaced the two-line `rawLocalTotal` / `rawUnplacedTotal` block (`OrderEntry.jsx` L680–L681) with an SC-aware version. **Single hunk, +20 / −2 lines.**

### Before
```js
const rawLocalTotal = Math.round((localSubtotal + localTax) * 100) / 100;
const rawUnplacedTotal = Math.round((unplacedSubtotal + unplacedTax) * 100) / 100;
```

### After
```js
// CR-SC-COLLECT-BILL-BTN (2026-05-15) — display-only: pre-place Collect Bill
// button now includes SC + SC GST when applicable, mirroring the
// CollectPaymentPanel formula.
const localSCApplicable =
  (orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom)
  && !!restaurant?.autoServiceCharge
  && (restaurant?.serviceChargePercentage || 0) > 0;
const localSCRate    = localSCApplicable ? (restaurant.serviceChargePercentage / 100) : 0;
const localSCTaxRate = localSCApplicable ? ((restaurant?.serviceChargeTaxPct || 0) / 100) : 0;
const localServiceCharge    = Math.round(localSubtotal    * localSCRate    * 100) / 100;
const localScGst            = Math.round(localServiceCharge * localSCTaxRate * 100) / 100;
const unplacedServiceCharge = Math.round(unplacedSubtotal * localSCRate    * 100) / 100;
const unplacedScGst         = Math.round(unplacedServiceCharge * localSCTaxRate * 100) / 100;
const rawLocalTotal    = Math.round((localSubtotal    + localServiceCharge    + localScGst    + localTax)    * 100) / 100;
const rawUnplacedTotal = Math.round((unplacedSubtotal + unplacedServiceCharge + unplacedScGst + unplacedTax) * 100) / 100;
```

### Behaviour
1. **`localSCApplicable`** — single boolean using the byte-identical gate that already governs the place/update/place-with-payment payloads.
2. **`localSCRate` / `localSCTaxRate`** — both zero when gate is false → makes the rest of the expression collapse to today's behaviour without any explicit conditional.
3. **`localServiceCharge` / `localScGst`** — applied to `rawLocalTotal` (fresh order pre-place branch).
4. **`unplacedServiceCharge` / `unplacedScGst`** — applied to `rawUnplacedTotal` (post-place + added-items sub-branch, per §6 of the plan and the §13 owner sign-off recommendation).
5. **`rawLocalTotal` / `rawUnplacedTotal`** — final SC-inclusive values, fed into the existing `applyRoundOff` and `total =` expression downstream (L713–L717, unchanged).

---

## 4. Confirmation: no double-count

| Surface | Reads `OrderEntry.total`? | Recomputes SC independently? | Double-count risk? |
|---|---|---|---|
| `CartPanel.jsx` Collect Bill button label (L868) | Yes | No — display only | **No** |
| `CollectPaymentPanel.jsx` Grand Total | No (recomputes from `cartItems` + `restaurant`) | Yes (L397–L398) | **No** — completely independent |
| `placeOrder` payload `order_amount` | No (`total` is a dead-pass-through at L820; not destructured at L793) | Yes — `calcOrderTotals` (L585–L680) computes SC from `serviceChargePercentage` arg | **No** |
| `updateOrder` payload | No | Same — independent recompute via `calcOrderTotals` | **No** |
| `placeOrderWithPayment` payload | No | Same | **No** |
| `collectBillExisting` BILL_PAYMENT payload | No (reads `paymentData.serviceCharge` from CollectPaymentPanel state) | Yes — independent of OrderEntry display | **No** |
| Backend echo / table card / order card | Reads `orderFinancials.amount` (backend echo, post-place only) | Backend persisted value; never touches pre-place `total` | **No** |
| Print Bill / temp-store payload | Uses `buildOrderTempStorePayload` with CollectPaymentPanel-supplied overrides | Independent | **No** |

**No code path consumes the pre-place `total` to compute SC anywhere else.** The button is purely a display sink for this value.

---

## 5. Confirmation: Collect Payment / payload / backend untouched

### Frontend
- `CollectPaymentPanel.jsx` — **not modified**. `serviceChargeEnabled` state, SC computation (L397–L398), Bill Summary row (L1542–L1550), Grand Total (L460), `paymentData` build — all byte-identical to pre-fix.
- `CartPanel.jsx` — **not modified**. Button label rendering at L868 simply receives the corrected `total`; no rendering code changed.
- `orderTransform.js` — **not modified**. `placeOrder`, `updateOrder`, `placeOrderWithPayment`, `collectBillExisting`, `calcOrderTotals`, `buildCartItem`, `buildOrderTempStorePayload` — all byte-identical.
- `profileTransform.js` — **not modified**. `autoServiceCharge` / `serviceChargePercentage` / `serviceChargeTaxPct` mapping unchanged.

### Wire
- `POST /api/v2/vendoremployee/order/place-order` — payload byte-identical (proven: `placeOrder` doesn't read `total`).
- `POST /api/v2/vendoremployee/order/update-order` — payload byte-identical.
- `POST /api/v2/vendoremployee/order/place-order-with-payment` — payload byte-identical.
- `POST /api/v2/vendoremployee/order/order-bill-payment` (BILL_PAYMENT) — payload byte-identical (CollectPaymentPanel-sourced).
- `POST /api/v1/vendoremployee/order-temp-store` (Print) — payload byte-identical.

### Backend
- Untouched. No new fields, no new field semantics, no behaviour change on any endpoint.

---

## 6. QA results

### 6.1 Lint
```
mcp_lint_javascript path_pattern="/app/frontend/src/components/order-entry/OrderEntry.jsx"
→ ✅ No issues found
```

### 6.2 Git diff stat
```
1 file changed, 20 insertions(+), 2 deletions(-)
```
Matches plan envelope (~+10/−2 → actual ~+20/−2 because the comment block is fuller than estimated; no functional surprise).

### 6.3 Hand-traced QA matrix (static, code-level)

| Case | `localSubtotal` | `localSCApplicable` | `localServiceCharge` | `localScGst` | `localTax` | `rawLocalTotal` | `total` (button) | Expected | Pass? |
|---|---|---|---|---|---|---|---|---|---|
| **1. Bean Me Up dine-in, 1×₹300, VAT 22%, SC 10%, SC GST 0%** | 300 | true | 30 | 0 | 66 | **396** | ₹396 | ₹396 | ✅ |
| **2. Bean Me Up takeaway, 1×₹300, VAT 22%** | 300 | false (gate excludes takeaway) | 0 | 0 | 66 | **366** | ₹366 | ₹366 | ✅ byte-identical to today |
| **3. Bean Me Up delivery, 1×₹300, VAT 22%, delivery ₹50** | 300 | false (gate excludes delivery) | 0 | 0 | 66 | **366** | ₹366 + ₹50 delivery = ₹416 | ₹416 | ✅ byte-identical |
| **4. Restaurant with `autoServiceCharge=false`, dine-in 1×₹300, SC 10%** | 300 | false (autoServiceCharge=false) | 0 | 0 | 66 | **366** | ₹366 | ₹366 (today's behaviour — SC opt-in at Collect Payment) | ✅ byte-identical |
| **5. Restaurant with `serviceChargePercentage=0`, dine-in 1×₹300** | 300 | false (pct=0) | 0 | 0 | 66 | **366** | ₹366 | ₹366 | ✅ byte-identical |
| **6. Restaurant with `serviceChargeTaxPct=5%`, dine-in 1×₹300, SC 10%, VAT 22%** | 300 | true | 30 | 1.50 | 66 | **397.50** | ₹397.50 → round to ₹398 (fractional 0.50 > 0.10) | ₹398 | ✅ matches CollectPaymentPanel |
| **7. Walk-in 1×₹300, VAT 22%, SC 10%** | 300 | true (walkIn in gate) | 30 | 0 | 66 | **396** | ₹396 | ₹396 | ✅ |
| **8. Room order, 1×₹300, VAT 22%, SC 10%, roomBalance=₹500** | 300 | true (table?.isRoom in gate) | 30 | 0 | 66 | **396** | ₹396 + (associatedTotal + roomBalance) | matches Collect Payment | ✅ |
| **9. Post-place, no new items** | n/a | n/a | n/a | n/a | n/a | n/a | `orderFinancials.amount` (backend echo, SC already baked in) | unchanged | ✅ regression-safe |
| **10. Post-place + cashier adds 1×₹100 on Bean Me Up dine-in** | unplacedSubtotal=100 | true | unplacedServiceCharge=10 | 0 | unplacedTax = 22 | `rawUnplacedTotal = 100+10+0+22 = 132` | `orderFinancials.amount + applyRoundOff(132) + 0` | matches the Update Order payload (which also threads SC) | ✅ |
| **11. Item with `tax.calculation='Inclusive'`** | gross price | true | applied on gross (matches CollectPaymentPanel which uses `subtotalAfterDiscount` = gross of inclusive tax) | computed | inclusive formula | matches Collect Payment | matches | ✅ no double-count |
| **12. No-tax item, dine-in autoSC=true, ₹300** | 300 | true | 30 | 0 | 0 | **330** | ₹330 | matches Collect Payment (item + SC, no tax) | ✅ |

### 6.4 Regression sentinels
- **Takeaway** (#2): `localSCApplicable=false` → no SC added → button = today's value. ✅
- **Delivery** (#3): `localSCApplicable=false` → no SC added → button = today's value + delivery addon. ✅
- **autoServiceCharge=false** (#4): gate excludes → no SC added → today's value. ✅
- **pct=0** (#5): gate excludes → today's value. ✅
- **Post-place idle** (#9): `total = orderFinancials.amount + 0 + 0` — fix touches only `rawUnplacedTotal` which is gated by `unplacedSubtotal > 0` in the L713–L717 expression. ✅
- **GST / VAT / SC GST math**: SC GST formula identical to `CollectPaymentPanel` and `calcOrderTotals` (`scGst = serviceCharge × scTaxRate`). VAT untouched. CR-013 component-parity guardrail in CollectPaymentPanel unaffected. ✅

### 6.5 What was NOT done (per plan)
- ❌ No SC checkbox added to Order Entry — deferred to "tick box part" CR.
- ❌ No SC row added to `CartPanel.jsx` — deferred.
- ❌ No state lift from `CollectPaymentPanel.jsx` — out of scope.
- ❌ No payload builder modified — payloads were already correct.
- ❌ No backend file touched.
- ❌ `testing_agent_v3` not invoked — owner does manual QA on the running preview.

---

## 7. Risks / open items

### Acceptable approximations (per plan §13)
- **Pre-place SC uses `localSubtotal` (gross of any future discount)** — Collect Payment applies SC on `subtotalAfterDiscount`. If the cashier later applies a discount at Collect Payment, the SC and Grand Total will be slightly lower than the pre-place estimate. No financial risk — Collect Payment is always source of truth for the final amount.
- **Pre-place button still includes SC even if cashier intends to untick** at Collect Payment. This is a known limitation that will be resolved when the deferred "tick box on Order Entry" CR ships.

### Residual issues (deferred)
1. No SC opt-out at Order Entry — must wait for the tick-box CR.
2. No visible SC row on Order Entry — only the rolled-up button number.

### No new risks introduced.

---

## 8. Confirmation checklist

- [x] Only `frontend/src/components/order-entry/OrderEntry.jsx` modified.
- [x] Pre-place Collect Bill button now includes SC + SC GST when applicable.
- [x] Unplaced-increment sub-branch covered (per plan §6 and owner recommendation in §13).
- [x] No checkbox added.
- [x] No `CartPanel.jsx` change.
- [x] No `CollectPaymentPanel.jsx` change.
- [x] No payload builder change.
- [x] No GST / VAT / SC-tax logic change.
- [x] No backend / API / endpoint touched.
- [x] Lint clean.
- [x] Diff envelope matches plan (~+20/−2 single hunk).
- [x] No commit / push attempted (platform auto-commits).

— End of report.
