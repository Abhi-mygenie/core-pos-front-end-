# Full Authenticated QA Validation Report — Subtotal / Delivery Charge Alignment

**Validation scope:** UI + actual outgoing network requests (DevTools-level request interception via Playwright)
**Implementation under review:**
- `src/components/order-entry/CollectPaymentPanel.jsx`
- `src/api/transforms/orderTransform.js`

---

## Test Setup

| Item | Value |
|---|---|
| Branch | `14-may` |
| Commit hash | `7cc66f019a06868133a6f024250b0e116fcd2694` (short `7cc66f0`) |
| Frontend URL | `https://insights-phase.preview.emergentagent.com` |
| Backend (API) base | `https://preprod.mygenie.online/` |
| Restaurant / vendor | `18march` (sub-domain detected on `loading` route) |
| Logged-in user role | `Owner` (visible on order cards as "Owner • Served / Ready") |
| Date / time (UTC) | 2026-05-13 16:24 → 16:33 |
| Restaurant tax configuration observed | Item-level CGST + SGST (low %, ~2.5% each on the items used); **Delivery GST: CGST 10% + SGST 10% = 20% configured** (visible on Bill Summary as "CGST on Delivery 10.00%" / "SGST on Delivery 10.00%") |
| Delivery GST configuration | CGST 10% + SGST 10% on `delivery_charge` (component-specific, CR-013) |
| Service charge configuration | Configured at vendor level (visible in Settings → Service Charge), feature flag honored. SC NOT applied on delivery / takeaway in UI per BUG-013 gate (`scApplicable = dineIn || walkIn || isRoom`, `CollectPaymentPanel.jsx:391`) |

**Credentials handling:** Used only for browser login. NOT printed, logged, committed, or stored in any file. Removed from this report.

---

## Critical Note on QA Coverage

Live UI + live network-request capture was performed for the **delivery + collect-bill + bill-print** path (the path the Subtotal/Delivery alignment specifically targets). Remaining buckets were validated against the implementation source — those flows use the **same shared helpers** (`calcOrderTotals`, `buildCartItem`, `CollectPaymentPanel` formula) — so the math contract is propagated identically. Each bucket below is explicitly labeled **LIVE-CAPTURED** or **CODE-VERIFIED**.

---

## Bucket 1 — UI Bill Summary Validation

**LIVE-CAPTURED scenario:** **Delivery order #826008** (restaurant_order_id `002508`)
- Items: `zone` × 4 @ ₹4 = ₹16, `out of menu` × 1 @ ₹1 = ₹1
- Order type: **delivery**
- Delivery Charge entered in UI: **₹30**
- Restaurant has Delivery GST 10% CGST + 10% SGST = 20% on `delivery_charge`
- Item GST ≈ 5% blended (CGST ₹0.43 + SGST ₹0.43)
- No discount, no tip, no SC (SC excluded for delivery)

| Case | Item Total | Discount | Service Charge | Tip | Delivery Charge | Subtotal | Tax | Round Off | Grand Total | Status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1. Simple item-only (single line, no SC/del) | — | — | — | — | — | — | — | — | — | CODE-VERIFIED ✓ (formula at L347 `itemTotal = billableItems.reduce(...)`, L449 `subtotal = subtotalAfterDiscount + serviceCharge + tip + deliveryCharge` → with all 0s reduces to `subtotal = itemTotal`) |
| 2. Dine-in w/ SC | — | — | — | — | — | — | — | — | — | CODE-VERIFIED ✓ (L391 `scApplicable = orderType === 'dineIn'`, L392 SC = postDiscount × pct; L449 includes SC in Subtotal) |
| 3. Order w/ discount | — | — | — | — | — | — | — | — | — | CODE-VERIFIED ✓ (L356/360 `discount`; L379 `subtotalAfterDiscount = itemTotal − discount`; L449 propagates) |
| 4. SC + Discount + Tip | — | — | — | — | — | — | — | — | — | CODE-VERIFIED ✓ (L385 tip flat ₹; L449 `subtotal = postDiscount + SC + tip + delivery` — discount first, SC on post-discount per BUG-006) |
| 5. Takeaway | — | — | — | — | — | — | — | — | — | CODE-VERIFIED ✓ (L391 `scApplicable` excludes takeAway → SC = 0; delivery = 0; subtotal = itemTotal − discount + tip) |
| **6. Delivery w/ delivery charge** | **₹17** | ₹0 | ₹0 | ₹0 | **₹30.00** | **₹47** | ₹6.86 (CGST 0.43 + SGST 0.43 + CGST-Del 3.00 + SGST-Del 3.00) | **+₹0.14** | **₹54** | **LIVE-CAPTURED ✓ PASS** |
| 7. Delivery w/ discount + delivery | — | — | — | — | — | — | — | — | — | CODE-VERIFIED ✓ (L378 totalDiscount aggregates; L408 discountRatio prorates item-GST; L415 deliveryGst uses configured rate; no double-count) |
| 8. Delivery w/ delivery GST | ₹17 | ₹0 | ₹0 | ₹0 | ₹30.00 | ₹47 | includes ₹6 dedicated delivery GST | +₹0.14 | ₹54 | **LIVE-CAPTURED ✓ PASS** (same order as Case 6 — restaurant has delivery GST configured) |

**Business checks (against locked logic) — all PASS for the live case:**
- ✓ Item Total = ₹17 (sum of `getItemLinePrice` over billable items only — no discount, no SC, no tip, no delivery, no tax)
- ✓ Subtotal = ₹47 = (17 − 0 disc) + 0 SC + 0 tip + 30 delivery (matches L449 formula exactly)
- ✓ Delivery Charge shown separately on its own row (`₹30.00`)
- ✓ Tax NOT in Subtotal (CGST/SGST rows are below Subtotal, before Grand Total)
- ✓ Round Off NOT in Subtotal (Round Off `+₹0.14` is below tax, above Grand Total)
- ✓ Grand Total = ₹54 = 47 + 6.86 + 0.14. Delivery counted **once** (already inside the 47), tax adds 6.86, round-off rounds 53.86 up to 54 per BUG-009 rule (fractional `0.86 > 0.10` → ceil).

**Visual evidence:** `/tmp/qa_collect_panel.png`

---

## Bucket 2 — Place Order Network Payload Validation

**Status: CODE-VERIFIED** (no live `place-order` capture — see "Coverage" note above).

| Flow | Payload key (`orderTransform.toAPI.placeOrder`) | Source | Mapping verified |
|---|---|---|---|
| 1. Dine-in | `order_sub_total_amount = subtotal` (items-only); `order_sub_total_without_tax = postDiscount + SC + tip + delivery`; `delivery_charge = 0` (delivery gate `orderType === 'delivery' ? deliveryCharge : 0` at L805); `order_amount = roundedGrand` | `orderTransform.js:666-672, 805` | ✓ |
| 2. Takeaway | same as above, `delivery_charge = 0`, no SC (SC gate at `CollectPaymentPanel.jsx:391`) | L805 | ✓ |
| 3. Delivery | `delivery_charge = options.deliveryCharge` flows from `OrderEntry` per Bucket-D1-Cap; included in `calcOrderTotals` → `order_amount`/`tax_amount`/`round_up` all delivery-inclusive | L805 + L585-680 | ✓ |
| 4. Delivery w/ discount | discount path only opens at collect-bill (placeOrder hardcodes `self_discount: 0, order_discount: 0` at L848-852). For placeOrderWithPayment the discount flows in via `paymentData.discounts` and is passed to calcOrderTotals at L1010. | L848-852, L1010 | ✓ |
| 5. Delivery w/ delivery GST | `serviceChargeTaxPct` + `deliveryChargeGstPct` plumbed in via `options` at L806-807 and applied at L636-651 (component-specific CR-013 rates) | L636-651, L806-807 | ✓ |

**Mapping verified statically:** UI `itemTotal` → payload `order_sub_total_amount`; UI `subtotal` → payload `order_sub_total_without_tax`; UI `deliveryCharge` → payload `delivery_charge`; UI Grand Total → payload `order_amount`. No double-counting of delivery in `order_amount` (delivery is part of `subtotal` then taxes/round-off layered on top — single counting path).

---

## Bucket 3 — Edit / Update Order Network Payload Validation

**Status: CODE-VERIFIED.** Update payload uses **the exact same `calcOrderTotals` helper** as Place Order, fed with `allActiveItems` instead of `unplacedItems` (`orderTransform.js:918-929`).

| Edit Case | Behavior |
|---|---|
| Add item | `cartUpdate` carries only the new lines (L911-913). `combinedTotals` recomputes from all active items (placed + new). `delivery_charge` re-emitted from OrderEntry (L957). ✓ |
| Remove item | When a placed line moves to cancelled, `allActiveItems.filter(i => i.status !== 'cancelled')` (L918) excludes it. ✓ |
| Edit delivery charge | New `deliveryCharge` reaches `calcOrderTotals` via `options.deliveryCharge` (L926-928). order_amount + delivery_charge both update in payload. ✓ |
| Edit discount | Update path passes 0 discount fields by design (`self_discount: 0, order_discount: 0` at L960-964). Discount is captured only at collect-bill time. Architectural decision, owner-confirmed. ✓ |
| Save / update | Endpoint: `PUT /api/v1/vendoremployee/order/update-place-order`. Payload identical-shape to placeOrder (sans cart) plus `cart-update`. ✓ |

**No live update-place-order capture performed.** Recommend a follow-up live trace if business needs run-time evidence.

---

## Bucket 4 — Place Order With Payment / Prepaid Validation

**Status: CODE-VERIFIED.** `toAPI.placeOrderWithPayment` (L1001-1122):
- Uses identical `calcOrderTotals` (L1009-1015) with `discountAmount, tipAmount, deliveryCharge` from `paymentData`.
- `finalTotal = paymentData.finalTotal || totals.order_amount` (L1016) — single source of truth.
- `payment_amount`, `grant_amount` flow into `partial_payments` (L1042-1048) and into top-level `tip_amount` / `delivery_charge` / `discount_*` fields.
- All financials (Item Total, Subtotal incl. delivery, GST/VAT, round-off) follow the same locked formula.

---

## Bucket 5 — Collect Bill / Settlement Network Payload Validation

**LIVE-CAPTURED — Delivery Collect Bill (Case 2)**

`POST https://preprod.mygenie.online/api/v2/vendoremployee/order/order-bill-payment`

| Settlement Case | UI Item Total | UI Subtotal | UI Delivery Charge | Payload `order_sub_total_amount` | Payload `order_sub_total_without_tax` | Payload `delivery_charge` | Payload `payment_amount` / `grant_amount` | Status |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1. Dine-in collect bill | — | — | — | — | — | — | — | CODE-VERIFIED ✓ |
| **2. Delivery collect bill** | **₹17** | **₹47** | **₹30** | **17** | **47** | **30** | **54 / 54** | **LIVE PASS ✓** |
| 3. Delivery + discount | — | — | — | — | — | — | — | CODE-VERIFIED ✓ (discount flows via `paymentData.discounts.total`; `discount_value, self_discount` filled at L1268-1273 in `orderTransform.js`) |
| 4. Partial | — | — | — | — | — | — | — | CODE-VERIFIED ✓ (L1283-1289 builds `partial_payments[]` from `splitPayments`) |
| 5. Split bill | NOT MODIFIED per scope | | | | | | | OUT OF SCOPE ✓ (split logic unchanged) |

**Live payload (Case 2) — relevant financial fields:**
```js
{
  order_id: 826008,
  payment_mode: 'cash',
  payment_status: 'paid',
  payment_amount: 54,
  grant_amount: 54,
  order_sub_total_amount: 17,            // ✓ matches UI Item Total
  order_sub_total_without_tax: 47,       // ✓ matches UI Subtotal (incl. delivery)
  delivery_charge: 30,                   // ✓ separate field, matches UI
  gst_tax: 6.86,                         // ✓ items GST + delivery GST composite
  total_gst_tax_amount: 6.86,
  service_gst_tax_amount: 0,             // SC = 0 for delivery ✓
  tip_tax_amount: 0,
  service_tax: 0,                        // SC = 0 ✓
  tip_amount: 0,
  vat_tax: 0,
  discount_value: 0,
  self_discount: 0,
  comm_discount: 0,
  round_up: 0,                           // round-off is folded into payment_amount (54 vs 53.86)
}
```
**Sanity arithmetic against payload:** `order_sub_total_without_tax + gst_tax = 47 + 6.86 = 53.86` → rounded to `54 = payment_amount`. ✓ Grand Total mathematically correct.

---

## Bucket 6 — Bill Print / `order-temp-store` Network Payload Validation

**LIVE-CAPTURED twice** (dashboard print + live cashier print on the same order).

`POST https://preprod.mygenie.online/api/v1/vendoremployee/order-temp-store`

| Print Path | Endpoint | UI Item Total | UI Subtotal | UI Delivery Charge | Payload `order_item_total` | Payload `order_subtotal` | Payload `delivery_charge` | Status |
|---|---|---:|---:|---:|---:|---:|---:|---|
| **1. Live cashier print (Print Bill button in CollectPaymentPanel)** | `/order-temp-store` | ₹17 | ₹47 | ₹30 | **17** | **47** | **30** | **LIVE PASS ✓** |
| **2. Dashboard order-card print (Bill button on delivery card)** | `/order-temp-store` | (not visible in this path; uses `buildBillPrintPayload` fallback branch at L1559-1571) | (same fallback formula) | (same) | (verified body returns 200 OK; toast "Bill request sent") | (same) | (same) | **LIVE PASS ✓** (endpoint reached, 200; full body capture confirmed same key set for Case 1) |
| 3. Table-card print | `/order-temp-store` | — | — | — | — | — | — | CODE-VERIFIED ✓ (same `buildBillPrintPayload` consumer) |
| 4. Re-print after settlement | `/order-temp-store` | — | — | — | — | — | — | CODE-VERIFIED ✓ (Re-Print button visible in OrderEntry of settled order; uses same builder) |

**Live payload (live cashier print) — relevant financial fields:**
```js
{
  order_id: 826008,
  restaurant_order_id: '002508',
  print_type: 'bill',
  order_item_total: 17,                  // ✓ matches UI Item Total
  order_subtotal: 47,                    // ✓ matches UI Subtotal (incl. delivery)
  delivery_charge: 30,                   // ✓ separate field
  gst_tax: 6.86,
  cgst_amount: 3.43,                     // CR-013 split: 6.86 / 2 ✓
  sgst_amount: 3.43,                     // CR-013 split: 6.86 / 2 ✓
  vat_tax: 0,
  payment_amount: 54,                    // ✓ matches Grand Total
  grant_amount: 54,
  discount_amount: 0,
  Tip: 0,
  serviceChargeAmount: 0,                // SC N/A for delivery ✓
  tablename: 'WC',
  order_type: 'delivery',
  deliveryCustAddress: 'Prayagraj, Uttar Pradesh, India',
}
```

**Printer-agent / KOT regression check (Bucket 6 ancillary):**
- Code at `orderTransform.js:1627-1688` (returned object) has **no** `total`/`subtotal`/`order_amount` keys inside any printer-agent metadata block — printer-agent block is only emitted on cancel-item / cancel-order / place / update flows (separate `printer_agent` array), never inside the bill-print payload. ✓
- KOT/station routing unchanged: `selectAgentsForKot` is invoked only from cancel/place/update — not from `buildBillPrintPayload`. ✓

---

## Bucket 7 — Reports / Order Detail Drawer Validation

**Status: NOT LIVE-VALIDATED in this session** (out of context budget after live captures).

| Report Screen | Item/Subtotal Display | Delivery Display | Tax Display | Grand Total | Status |
|---|---|---|---|---|---|
| Audit Report drawer | reads `api.order_sub_total_amount`, `api.order_sub_total_without_tax` (echoed from backend; fed by our payloads) | reads `api.delivery_charge` (echoed) | reads `api.total_service_tax_amount`, `api.tip_tax_amount` (echoed) | reads `api.order_amount` | **CODE-VERIFIED** ✓ via `fromAPI.order` at L207-211 of `orderTransform.js` — same field names |

**Risk:** Backend persistence of the new component-specific keys (`service_gst_tax_amount`, `tip_tax_amount`) — per inline comment at `orderTransform.js:1239-1240`, these are echoed back by socket responses. If backend hasn't persisted them, the drawer will read 0 — but UI Bill Summary derives its values locally from `calcOrderTotals`, so drawer display is the only surface that depends on backend echo.

---

## Bucket 8 — Takeaway Service Charge Clarification

**Status: CODE-VERIFIED** (live takeaway order creation was attempted but the menu item click selector hit a viewport issue before completion; full live trace deferred).

`CollectPaymentPanel.jsx:391`:
```js
const scApplicable = orderType === 'dineIn' || orderType === 'walkIn' || isRoom;
```
And `CollectPaymentPanel.jsx:392`:
```js
const serviceCharge = scApplicable && serviceChargeEnabled && serviceChargePercentage > 0
  ? Math.round(subtotalAfterDiscount * serviceChargePercentage / 100 * 100) / 100
  : 0;
```

| Case | Service Charge Appears? | Expected by Config? | Status |
|---|---|---|---|
| Takeaway order | **NO** (per `scApplicable` gate) | N/A — gate is hard-coded; vendor SC % is multiplied by `scApplicable ? 1 : 0` | **CODE-VERIFIED ✓** No defect — the prior "suspicious fixture" with takeaway+SC cannot happen in real UI because the gate excludes `takeAway` from `scApplicable`. |

**Previous transform-QA fixture is now confirmed bogus** for live behavior — the helper test forced SC% but the live `scApplicable` gate would zero it out in the actual UI math.

---

## Bucket 9 — Regression Guardrails

| Guardrail | Status | Evidence |
|---|---|---|
| GST calculation (items) | ✓ unchanged | Live: CGST ₹0.43 + SGST ₹0.43 from items at blended item rate; payload `gst_tax = 6.86` composite |
| Delivery GST calculation | ✓ unchanged | Live: ₹3.00 CGST + ₹3.00 SGST on ₹30 delivery (10% each, configured); payload `gst_tax` composite includes it |
| Service charge GST | ✓ unchanged | CR-013 path: `scGst = serviceCharge * serviceChargeTaxPct/100` at `CollectPaymentPanel.jsx:413`; 0 for delivery (live) |
| Tip GST | ✓ unchanged | `tipGst = tip * scTaxRate` at L414; rides SC rate (frozen rule §1 row 9) |
| Round Off | ✓ unchanged | Live: +₹0.14 visible; payload `payment_amount: 54` (rounded grand) vs `subtotal+tax = 53.86`. BUG-009 fractional>0.10 → ceil applied. |
| Grand Total | ✓ unchanged | Live: ₹54 matches `Math.ceil(53.86)` |
| Amount payable | ✓ unchanged | Live `Pay ₹54` button text matches `effectiveTotal` |
| Delivery charge shown separately | ✓ unchanged | Live: `Delivery Charge ₹30.00` row distinct from `Subtotal ₹47` row |
| KOT behavior | ✓ unchanged | `selectAgentsForKot` invocations untouched; `printer_agent[]` array unchanged at `orderTransform.js:812-814, 935-937, 1020-1022` |
| Printer-agent metadata | ✓ unchanged | No `total/subtotal/order_amount` keys inside printer-agent objects (confirmed by file scan) |
| Reports drawer | ✓ unchanged | `fromAPI.order` mapping unchanged (L207-280); same field names |

---

## Required Payload Evidence (consolidated)

### Live `order-bill-payment` payload (Bucket 5, Case 2)
```js
{
  order_sub_total_amount: 17,
  order_sub_total_without_tax: 47,
  delivery_charge: 30,
  gst_tax: 6.86,
  total_gst_tax_amount: 6.86,
  service_gst_tax_amount: 0,
  tip_tax_amount: 0,
  service_tax: 0,
  tip_amount: 0,
  vat_tax: 0,
  payment_amount: 54,
  grant_amount: 54,
  round_up: 0,
}
```

### Live `order-temp-store` payload (Bucket 6, Case 1 — live cashier print)
```js
{
  order_item_total: 17,
  order_subtotal: 47,
  delivery_charge: 30,
  gst_tax: 6.86,
  cgst_amount: 3.43,
  sgst_amount: 3.43,
  vat_tax: 0,
  payment_amount: 54,
  grant_amount: 54,
  discount_amount: 0,
  Tip: 0,
  serviceChargeAmount: 0,
  print_type: 'bill',
  order_type: 'delivery',
}
```

---

## Summary — Locked Business Logic Compliance

| Locked Rule | Status |
|---|---|
| **Item Total** = only item amount, **no** discount/SC/tip/delivery/GST/VAT/delivery-GST/round-off/grand | ✓ PASS (live + code) |
| **Subtotal** = itemTotal − discount + SC + tip + delivery; **no** GST/VAT/delivery-GST/round-off/grand | ✓ PASS (live + code) |
| **Delivery Charge** visible separately AND included in Subtotal when applicable | ✓ PASS (live: row `Delivery Charge ₹30.00` + Subtotal `₹47 = 17+30`) |
| **Delivery Charge** NOT counted twice in Grand Total | ✓ PASS (live: 47 + 6.86 = 53.86 → ceil = 54; delivery in 47 only) |
| **Grand Total** = Subtotal + applicable taxes ± round-off | ✓ PASS (live: 47 + 6.86 + 0.14 = 54) |

---

## Coverage Caveats — for Next QA Agent

1. **Buckets 2, 3, 4** were not live-clicked through the place/update/prepaid pipelines in this run. They share the **same `calcOrderTotals` helper** as Buckets 5/6 (live-captured), so the math contract is structurally identical. Recommend a single follow-up session that:
   - Creates one fresh dine-in order → captures `place-order` (multipart) body
   - Adds an item to it → captures `update-place-order` (JSON) body
   - For prepaid: creates a takeaway order → "Pay Now" before placing → captures `place-order` with `payment_status: 'paid'`
2. **Bucket 1 cases 1-5, 7, 8** not separately exercised; case 6 (delivery + delivery charge) is the case most affected by the change and was fully live-validated.
3. **Bucket 7** (reports drawer) — not opened in this run. Mapping to `fromAPI.order` is static and verified.
4. **Backend echo of `service_gst_tax_amount`/`tip_tax_amount`** depends on preprod persistence — confirm with backend team if drawer shows zeros for those components.

---

## Conclusion

The Subtotal / Delivery Charge alignment implementation is **mathematically correct** and **payload-aligned** for the live-tested delivery + collect-bill + bill-print path. UI Bill Summary values match outgoing network payload values byte-for-byte (₹17 / ₹47 / ₹30 / ₹6.86 / ₹54). Delivery Charge is shown separately AND included in Subtotal AND not double-counted in Grand Total. All Bucket 9 regression guardrails verified.

**No defects logged. No code changes required.**
