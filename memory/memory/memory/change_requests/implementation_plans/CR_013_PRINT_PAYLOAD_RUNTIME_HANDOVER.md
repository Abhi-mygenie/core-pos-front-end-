# CR-013 — Handover for Print-Payload Runtime-Keys Investigation

**Type:** Handover note for the next agent (NOT implementation)
**Author:** CR-013 Bucket-Plan Agent
**Date:** 2026-05-05
**Branch:** `5may` (head — see `git log -1` at handover time)
**Status:** **`awaiting_print_payload_runtime_keys_audit`**

---

## 0. TL;DR for the next agent

CR-013 GST rate-source switch + double-count hotfix have shipped (FE-only). Owner has approved the **reference UX** for per-component tax breakdown on Collect Bill (see §4) and wants the **printed bill to match**.

**The print bill is rendered by a BACKEND service**, not by the frontend. FE only POSTs a payload to `API_ENDPOINTS.PRINT_ORDER` (built by `orderTransform.buildBillPrintPayload`).

**Your job:** audit that print payload at runtime + at code level, list every key it currently sends, identify which keys are missing for the reference-UX breakdown to print correctly, and surface backend questions (BE-G10 / BE-G11) for the owner to discuss with backend.

**DO NOT implement** D-GST-3 / D-GST-4 yet — owner wants to discuss the payload audit findings first.

---

## 1. CR-013 history at handover

| Stage | Status | Doc |
|---|---|---|
| Planning | DONE | `/app/memory/change_requests/impact_analysis/CR_013_GST_SERVICE_TIP_DELIVERY_PLANNING.md` |
| Owner Decision Sheet | DONE | `/app/memory/change_requests/requirements/CR_013_OWNER_DECISION_SHEET.md` |
| Frozen Business Logic | DONE | `/app/memory/change_requests/requirements/CR_013_FROZEN_BUSINESS_LOGIC.md` |
| Implementation Plan | DONE | `/app/memory/change_requests/implementation_plans/CR_013_IMPLEMENTATION_PLAN.md` |
| Bucket Approval doc | DONE | `/app/memory/change_requests/implementation_plans/CR_013_CODE_REVIEW_AND_BUCKET_APPROVAL.md` |
| **Bucket D-GST-1 (parse)** | ✅ SHIPPED | profileTransform.js — added `parseTaxPct` helper + `serviceChargeTaxPct` + `deliveryChargeGstPct` |
| **Bucket D-GST-2 (apply)** | ✅ SHIPPED | CollectPaymentPanel + orderTransform + OrderEntry — switched SC/Tip/Delivery GST to component-specific rates |
| **G3 — dashboard re-print plumbing** | ✅ SHIPPED | TableCard + OrderCard + RePrintButton — pass pcts via `overrides` |
| **CR-008 Sub-CR #1 Round-3 hotfix (delivery double-count)** | ✅ SHIPPED | OrderEntry L687-700 + CartPanel.jsx:867 |
| Display-Breakdown Plan (D-GST-3 + D-GST-4) | DONE | `/app/memory/change_requests/implementation_plans/CR_013_DISPLAY_BREAKDOWN_PLAN.md` |
| **D-GST-3 (persist real values in payload)** | ⏸ PENDING owner discussion | This handover |
| **D-GST-4 (display per-component breakdown UX)** | ⏸ PENDING owner discussion | This handover |
| **Print-payload runtime audit** (THIS DOC) | 🆕 YOU ARE HERE | This file |
| Frozen-doc addendum (G8) | ⏸ deferred | post-implementation |
| Round-3 handover note (G9) | ⏸ deferred | post-implementation |

---

## 2. The user's exact ask (verbatim, 2026-05-05)

> *"order temp some api we call for print in that payload we need to check if required runtime, please make a handover document for next agent to pick up this detail put all details, we will discuss with new agent"*

Translation:
- "order temp" = `orderTransform.js` (specifically `buildBillPrintPayload`).
- "some api we call for print" = `printOrder` in `orderService.js` → `POST API_ENDPOINTS.PRINT_ORDER`.
- "in that payload we need to check if required runtime" = **audit the print payload at runtime** to confirm it carries every key the backend's print template needs to render the reference-UX breakdown.
- "please make a handover document" = this file.
- "we will discuss with new agent" = next agent will discuss findings with owner before any code changes.

---

## 3. Reference UX (locked target — do not change without owner approval)

From the user's reference screenshot (Order #000076) — see §1 of `CR_013_DISPLAY_BREAKDOWN_PLAN.md` for the original screenshot reference:

```
Bill Summary
─────────────────────────────────────────
Item Total                       ₹6300.00
Service Charge (Optional)         ₹315.00
─────────────────────────────────────────
Subtotal                         ₹6615.00
   CGST 9%                          ₹67.50      ← item GST half
   SGST 9%                          ₹67.50      ← item GST half
   VAT 22%                        ₹1221.00      ← item VAT
   CGST on SC 9%                    ₹28.35      ← SC GST half
   SGST on SC 9%                    ₹28.35      ← SC GST half
─────────────────────────────────────────
Grand Total                      ₹8028.00
```

### Key UX rules
- **Always-visible breakdown** — no chevron, no hover reveal.
- **Each tax line carries source AND rate** — `CGST on SC 9%`, `SGST on Tip 9%`, `CGST on Delivery 2.5%`, `VAT 22%`, etc.
- **Subtotal line ABOVE tax breakdown** = `Items + SC + Tip + Delivery` (pre-tax).
- **Grand Total at the bottom** in accent colour.
- **Lines hidden when value = 0** (avoid clutter on low-config restaurants).
- **Print bill should mirror Collect Bill exactly** — that's the unresolved part.

### Extension for CR-013 (full set of possible lines)

| Line | Shown when | Value source |
|---|---|---|
| Items GST `CGST X%` / `SGST X%` | item GST > 0 | per-item `tax.percentage` (already in code) |
| Items VAT `VAT X%` | item VAT > 0 | per-item `vat_tax` (already in code) |
| `CGST on SC X%` / `SGST on SC X%` | SC GST > 0 | `serviceCharge × restaurant.serviceChargeTaxPct / 100 / 2` |
| `CGST on Tip X%` / `SGST on Tip X%` | Tip GST > 0 | `tip × restaurant.serviceChargeTaxPct / 100 / 2` (rides SC rate) |
| `CGST on Delivery X%` / `SGST on Delivery X%` | Delivery GST > 0 | `deliveryCharge × restaurant.deliveryChargeGstPct / 100 / 2` |
| `Round Off ±X.XX` | round_up != 0 | BUG-009 rounding rule |

---

## 4. Print-flow architecture (read carefully — this is the crux)

### 4.1 Where the print bill comes from

**The printed bill is rendered by the BACKEND**, not by the frontend.

Frontend flow:
1. User clicks "Print Bill" (CollectPaymentPanel manual, OrderEntry auto-print, TableCard, OrderCard, RePrintButton).
2. `orderService.printOrder(orderId, 'bill', null, order, scPct, overrides)` is called (`/app/frontend/src/api/services/orderService.js` L120-145).
3. `payload = orderTransform.buildBillPrintPayload(order, scPct, overrides)` builds the payload (`/app/frontend/src/api/transforms/orderTransform.js` L1196-1517 approx — verify line numbers at handover time).
4. `await api.post(API_ENDPOINTS.PRINT_ORDER, payload)` → backend.
5. **Backend's print service renders the actual bill** — physical printer, PDF, or thermal-printer escape codes.

### 4.2 Why this matters
- **FE-only changes** to the bill display (D-GST-4 in CollectPaymentPanel) make the **Collect Bill UI** match the reference UX.
- **They do NOT automatically make the printed bill match.** Printed bill rendering depends on what the backend's print template can do with the payload.

### 4.3 Two possible backend states (unknown at handover)
- **State A (smart template):** Backend renders any tax field present in the payload — e.g. has a generic `tax_breakdown` array or auto-detects `*_gst_*` keys. → Just FE sends new keys → ✅ print auto-matches.
- **State B (hardcoded template):** Backend has fixed slots for `gst_tax`, `vat_tax`, `service_tax`, etc., and ignores anything else. → Coordinated backend ticket needed to add slots for SC-GST / Tip-GST / Delivery-GST.

**You need to figure out whether backend is in State A or State B.** That's BE-G10 below.

---

## 5. Current `buildBillPrintPayload` output — exact key inventory

File: `frontend/src/api/transforms/orderTransform.js`
Function: `buildBillPrintPayload(order, serviceChargePercentage = 0, overrides = {})` — currently around L1196-1517 (verify on read; commits may have shifted line numbers slightly).

### 5.1 Existing keys in the print payload (verified at handover via L1462-1514)

| Key | Source | Purpose |
|---|---|---|
| `order_id` | `order.orderId` | Identifier |
| `restaurant_order_id` | `order.orderNumber` | Display identifier |
| `print_type` | `'bill'` | Discriminator |
| `payment_amount` / `grant_amount` | `overrides.paymentAmount` ?? `order.amount` | Grand Total |
| `order_item_total` | `overrides.orderItemTotal` ?? `order.subtotalAmount` | Items pre-discount sum |
| `order_subtotal` | `overrides.orderSubtotal` ?? computed `itemBase + serviceChargeAmount + tipAmt` | Pre-tax subtotal |
| `discount_amount` | `overrides.discountAmount` ?? 0 | Discount ₹ |
| `coupon_code` | `overrides.couponCode` | Coupon code |
| `loyalty_dicount_amount` | `overrides.loyaltyAmount` | Loyalty ₹ |
| `wallet_used_amount` | `overrides.walletAmount` | Wallet ₹ |
| `Date` | formatted `order.createdAt` | Bill date |
| `waiterName` / `custName` / `custPhone` / `custGSTName` / `custGST` / `orderNote` | from order/customer | Display fields |
| `roomRemainingPay` / `roomAdvancePay` / `roomGst` | room info | Room billing |
| `associated_orders` | room linked orders | Room billing |
| `deliveryCustName` / `deliveryAddressType` / `deliveryCustAddress` / `deliveryCustPincode` / `deliveryCustPhone` | delivery fields | Delivery display |
| `Tip` | `overrides.tip` ?? `order.tipAmount` | Tip ₹ |
| `station_kot` | `''` | KOT discriminator |
| `order_type` | `order.rawOrderType` ?? `'dinein'` | Order type |
| **`gst_tax`** | `overrides.gstTax` ?? recomputed `gst_tax` | **Composite GST (item + SC + tip + delivery)** ← single value |
| **`vat_tax`** | `overrides.vatTax` ?? `vat_tax` | **Composite VAT** ← single value |
| `delivery_charge` | `overrides.deliveryCharge` ?? `order.deliveryCharge` | Delivery ₹ |
| `serviceChargeAmount` | `overrides.serviceChargeAmount` ?? computed | SC ₹ (gated by `dineIn`/`isRoom`) |

### 5.2 What's MISSING for the reference-UX breakdown to print

| Reference-UX line | What payload key would be needed |
|---|---|
| `CGST on SC X%` / `SGST on SC X%` | `service_gst_tax_amount` (FE computes; today **not in print payload at all**) + rate (e.g. `service_charge_tax_pct`) |
| `CGST on Tip X%` / `SGST on Tip X%` | `tip_tax_amount` (today **not in print payload**) + rate (rides SC rate, so same `service_charge_tax_pct`) |
| `CGST on Delivery X%` / `SGST on Delivery X%` | `delivery_charge_gst_amount` (today **not in print payload**) + rate (e.g. `deliver_charge_gst_pct`) |
| Item GST/VAT rate labels (`CGST 9%`, `SGST 9%`, `VAT 22%`) | per-item GST/VAT rates (today emitted per-line inside `cart[]` or `billFoodList`; **need to verify if print template has access to render aggregated by-rate**) |

> **Note:** the place-order **request** payload already carries `service_gst_tax_amount` + `tip_tax_amount` (hardcoded to `0` today) — see `orderTransform.placeOrder` L755-757. The **print payload** does NOT carry these keys today. That's the gap.

---

## 6. Existing payload keys in `placeOrder` request (for cross-reference)

You'll find these helpful when comparing print payload vs place-order payload.

File: `frontend/src/api/transforms/orderTransform.js` `placeOrder` ~L711-790.

```
order_sub_total_amount              : computed (subtotal pre-tax)
order_sub_total_without_tax         : same
tax_amount                          : composite GST + VAT
gst_tax                             : composite GST
vat_tax                             : composite VAT
order_amount                        : grand total
round_up                            : rounding adjustment
service_tax                         : SC ₹ (NOT its GST)
service_gst_tax_amount              : 0  ← HARDCODED, would carry SC GST after D-GST-3
tip_amount                          : 0  ← place-order hardcodes; tip captured at Collect Bill
tip_tax_amount                      : 0  ← HARDCODED, would carry Tip GST after D-GST-3
delivery_charge                     : delivery ₹
... (discount/coupon/loyalty/wallet keys)
cart                                : array of line items (each with gst_amount, vat_amount, etc.)
delivery_address                    : object (CR-008 Sub-CR #1)
```

---

## 7. Existing socket-response keys (backend echo, verified from owner's payload sample 2026-05-05)

Backend already persists per-component tax columns:

| Backend response key | What it is | Today's value |
|---|---|---|
| `total_service_tax_amount` | SC GST in DB | echoes back what FE sent (currently `"0.00"`) |
| `tip_tax_amount` | Tip GST in DB | echoes back FE-sent (currently `"0.00"`) |
| `tip_amount` | Tip ₹ | `"0.00"` |
| `delivery_charge` | Delivery ₹ | `500` |
| ❌ `delivery_charge_gst_amount` | NOT EXIST | — |

**Owner's update (2026-05-05):** *"delivery_charge_gst_amount will get added by backend in socket"* → backend will add this column in a future release. Frontend should send the key forward-compatibly.

---

## 8. Owner-confirmed final UX & business decisions (locked)

### Frozen-rule deltas (owner-approved 2026-05-05; pending G8 doc addendum)
- **OD-D1** Print/Bill component-wise breakup: NO → **YES**
- **OD-D2** Reports component-wise display: **NO** (unchanged, MC-06 backend ownership)
- **OD-D3** Payload component-wise persistence: NO → **YES (in-place using existing keys + future `delivery_charge_gst_amount`)**

### Frozen rules still locked from earlier (do NOT change)
- §1 row 3 — SC GST source = `service_charge_tax`
- §1 row 6 — Delivery GST source = `deliver_charge_gst`
- §1 row 9 — Tip GST = SC rate; if SC = 0, tip GST = 0
- §1 row 10 — Missing/null/blank/non-numeric/negative → 0 (force-0 fallback)
- §1 row 13 — No new payload keys *needed* for shipping (existing keys suffice)
- §15 — FE = calculation authority

### CR-008 Sub-CR #1 (preserve verbatim)
- D1-Cap delivery-charge capture
- D1-Gate `readOnly={isPrepaid}` at CollectPaymentPanel L877
- Round-2 totals fold (delivery into `tax_amount`/`order_amount`/`round_up`)
- **Round-3 hotfix shipped 2026-05-05** — `OrderEntry.jsx` L687-700 + `CartPanel.jsx:867`. Backups: `*.bak.cr008r3`.

---

## 9. YOUR investigation tasks

### Task 9.1 — Runtime payload capture
1. Start the preview app (`sudo supervisorctl status`; should already be running).
2. Log in as a real tenant.
3. Place a **delivery order** with non-zero SC, tip, and delivery (use restaurant config that has `service_charge_tax > 0` and `deliver_charge_gst > 0` so all 3 GSTs are non-zero).
4. From Collect Bill, click **Print Bill** while DevTools Network panel is open.
5. Capture the **exact JSON payload** sent to `API_ENDPOINTS.PRINT_ORDER` (will be in `console.log('[PrintOrder] payload:', payload)` output too).
6. Cross-check the payload against §5.1 — confirm every listed key is present at runtime.
7. Capture the exact JSON for the **3 dashboard re-print paths** as well:
   - TableCard "Print Bill" button (dine-in or walk-in table)
   - OrderCard "Print Bill" button (takeaway or delivery card)
   - RePrintButton (inside an opened order)
8. Document the diffs between the 4 payload variants.

### Task 9.2 — Backend print-template state determination (BE-G10)
1. **Talk to backend team** (or check backend repo if accessible). Specifically ask:
   - Where is the print-bill template rendered? (Print service, lambda, escape-code generator, PDF generator?)
   - Is the template **hardcoded** (Scenario B) or **dynamic/data-driven** (Scenario A)?
   - What keys does it currently consume? (Likely answer: `gst_tax`, `vat_tax`, `service_tax`, `delivery_charge`, `Tip`, plus the customer/order header fields.)
   - Can it auto-render new tax keys like `service_gst_tax_amount`, `tip_tax_amount`, `delivery_charge_gst_amount` if FE sends them? Or do new template slots need to be added?
2. If backend confirms hardcoded (B) → estimate effort for BE-G11 (template update).

### Task 9.3 — Identify any other runtime-only keys
The owner's phrasing *"required runtime"* hints at concern that some keys are computed at runtime and may be missing. Specifically check:
- Does the print payload carry **rate labels** that the template needs to print percentages? (e.g. how does today's template know to print "GST 5%" vs "GST 18%"?)
- Is the rate label per-line or per-aggregate? If per-aggregate, is it derivable from the items, or is it sent explicitly?
- Are item-level GST/VAT rates included per-line in `cart[]` / `billFoodList[]`?

### Task 9.4 — Audit `printGstTax` and related overrides emitted by CollectPaymentPanel
File: `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` ~L515-577.
- `paymentData.printGstTax` (line ~L527) — confirm it's `Math.round((sgst + cgst) * 100) / 100` (post-CR-013 corrected).
- `handlePrintBill` overrides (line ~L545-577) — confirm `serviceChargeAmount`, `gstTax`, `deliveryCharge`, `tip` all present.
- For D-GST-4, this override block will need to ADD: `serviceGstTaxAmount`, `tipTaxAmount`, `deliveryGstTaxAmount`, plus rate labels.

### Task 9.5 — Audit auto-print paths in OrderEntry
File: `/app/frontend/src/components/order-entry/OrderEntry.jsx`
- Auto-print after place+pay (~L1300-1325) — `autoPrintOverrides`
- Auto-print after Collect Bill (~L1502-1539) — `collectBillOverrides`
Confirm both build the same shape as `handlePrintBill`.

---

## 10. Approval gates ahead of you

| Gate | Subject | Required before |
|---|---|---|
| **G6** | D-GST-3 (persist real values in payload) | Touching `orderTransform.js` placeOrder/updateOrder/placeOrderWithPayment to fill `service_gst_tax_amount` / `tip_tax_amount` / (forward-compatible) `delivery_charge_gst_amount` |
| **G7** | D-GST-4 (display per-component breakdown UX) | Touching `CollectPaymentPanel.jsx` Bill Summary section; touching `buildBillPrintPayload` to emit new keys |
| **G8** | Frozen-doc addendum (records OD-D1 / OD-D3 relaxation) | Editing `CR_013_FROZEN_BUSINESS_LOGIC.md` |
| **G9** | Round-3 handover note authoring | Authoring `CR_008_SUB_1_ROUND_3_DELIVERY_DOUBLE_COUNT_HOTFIX.md` (records the hotfix that shipped 2026-05-05) |
| **G10** | Print-template scenario determination + back-and-forth with backend team | Before D-GST-4 ships |
| **G11** | Backend print-template update (if Scenario B) | If owner pursues print parity in Phase 1 |

**Recommended sequence after this audit:**
1. Run §9 tasks → produce findings + payload diff doc
2. Discuss with owner — what gets addressed in FE-only Phase 1 vs deferred to backend coordination
3. Owner approves D-GST-3 (G6) → ship payload-fill bucket
4. Owner approves D-GST-4 (G7) → ship Collect Bill UI breakdown (print parity gated by G10/G11)
5. Owner approves G8 + G9 → write doc addendum + Round-3 handover

---

## 11. Files / functions / line numbers cheat-sheet (verify at handover-read time)

```
/app/frontend/src/api/transforms/orderTransform.js
  ├─ parseTaxPct helper                       ~L48 (CR-013 D-GST-1)
  ├─ calcOrderTotals                          ~L544-602 (CR-013 D-GST-2 — extras include serviceChargeTaxPct, deliveryChargeGstPct)
  ├─ placeOrder                               ~L713-790 (CR-013 D-GST-2 plumbing; service_gst_tax_amount=0, tip_tax_amount=0 ← targets for D-GST-3)
  ├─ updateOrder                              ~L800-860 (mirror)
  ├─ placeOrderWithPayment                    ~L880-960 (mirror)
  └─ buildBillPrintPayload                    ~L1196-1517 (D-GST-2 G3 fallback recompute; targets for D-GST-4 emission)

/app/frontend/src/api/transforms/profileTransform.js
  └─ parseTaxPct + serviceChargeTaxPct + deliveryChargeGstPct  ~L48, L135-136

/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx
  ├─ tax math block                           ~L335-395 (CR-013 D-GST-2)
  ├─ handlePrintBill overrides                ~L545-577 (D-GST-4 extension target)
  ├─ paymentData.printGstTax                  ~L527
  └─ D1-Gate readOnly={isPrepaid}             L877 — DO NOT TOUCH

/app/frontend/src/components/order-entry/OrderEntry.jsx
  ├─ Round-3 total fix                        ~L687-700 (shipped 2026-05-05)
  ├─ placeOrder/updateOrder/placeOrderWithPayment callers (D-GST-2 plumbing) ~L723-738, L786-792, L1369-1375
  ├─ autoPrintOverrides                       ~L1300-1325 (D-GST-4 extension target)
  └─ collectBillOverrides                     ~L1502-1539 (D-GST-4 extension target)

/app/frontend/src/components/order-entry/CartPanel.jsx
  └─ Collect Bill button label (Round-3 fix) ~L867 (shipped 2026-05-05)

/app/frontend/src/components/cards/TableCard.jsx
  └─ printOrder caller (G3)                   ~L154

/app/frontend/src/components/cards/OrderCard.jsx
  └─ printOrder caller (G3)                   ~L130

/app/frontend/src/components/order-entry/RePrintButton.jsx
  └─ printOrder caller (G3)                   ~L106

/app/frontend/src/api/services/orderService.js
  └─ printOrder                               ~L120-145
```

---

## 12. Backups inventory (do NOT delete)

```
/app/frontend/src/api/transforms/profileTransform.js.bak.cr013       (D-GST-1)
/app/frontend/src/api/transforms/orderTransform.js.bak.cr013         (D-GST-2)
/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx.bak.cr013       (D-GST-2)
/app/frontend/src/components/order-entry/OrderEntry.jsx.bak.cr013    (D-GST-2 plumbing)
/app/frontend/src/components/cards/TableCard.jsx.bak.cr013           (G3)
/app/frontend/src/components/cards/OrderCard.jsx.bak.cr013           (G3)
/app/frontend/src/components/order-entry/RePrintButton.jsx.bak.cr013 (G3)
/app/frontend/src/components/order-entry/OrderEntry.jsx.bak.cr008r3  (Round-3 hotfix)
/app/frontend/src/components/order-entry/CartPanel.jsx.bak.cr008r3   (Round-3 hotfix)
```

Plus pre-existing CR-008 Sub-CR #1 backups (`*.bak.d1cap`, `*.bak.d1gate`, etc.) — leave those alone.

---

## 13. Strict rules for the next agent

- **Do NOT implement D-GST-3 or D-GST-4 in your first turn.** Owner wants to discuss the audit findings first.
- **Do NOT modify** `/app/memory/final/` files. They are read-only baseline.
- **Do NOT touch** CR-008 Sub-CR #1 surface (D1-Cap capture UI, D1-Gate `readOnly={isPrepaid}` at CollectPaymentPanel L877, D1-Cap Round-2 totals fold).
- **Do NOT remove** the existing `printGstTax` calculation — D-GST-4 will ADD per-component values, not replace the composite.
- **Do verify** every line number cited in §11 — commits may have shifted them slightly.
- **Do produce** a runtime payload-capture document showing the exact JSON for all 4 print paths (Path A: live Collect Bill manual print; Path B: auto-print place+pay; Path C: auto-print after Collect Bill; Path D: dashboard re-print via TableCard/OrderCard/RePrintButton).
- **Do reach out** to the backend team for BE-G10/G11 — the answer determines D-GST-4's scope.

---

## 14. Quick-reference of acronyms / IDs in this thread

| ID | Meaning |
|---|---|
| OD-G* | Owner Decision — GST rules |
| OD-O* | Owner Decision — Order-type applicability |
| OD-C* | Owner Decision — Configurability |
| OD-Q* | Owner Decision — Edge-case fallback (Q-G1..Q-G5) |
| OD-A1 | Calculation authority (FE vs BE) |
| OD-D1/D2/D3 | Display / Reports / Payload component-wise breakup decisions |
| OD-CO | Cut-over date |
| BE-G1..BE-G6 | Backend confirmations from Implementation Plan |
| BE-G7..BE-G9 | Backend confirmations introduced in Display Breakdown plan |
| BE-G10..BE-G11 | Backend questions about the print template — **introduced by THIS handover** |
| D-GST-1 | Bucket: parse profile tax keys (✅ shipped) |
| D-GST-2 | Bucket: apply per-component rates (✅ shipped) |
| D-GST-3 | Bucket: persist real values in payload (⏸ pending owner discussion) |
| D-GST-4 | Bucket: render reference-UX breakdown (⏸ pending) |
| G1..G11 | Approval gates |
| Sub-CR #1 D1-Cap / D1-Gate | CR-008 delivery-charge capture / override gate (preserved verbatim) |
| Round-2 / Round-3 | Sub-CR #1 follow-up rounds; Round-3 hotfix shipped 2026-05-05 |

---

## 15. Where to find things

- **Frozen rules + owner answers:** `/app/memory/change_requests/requirements/CR_013_FROZEN_BUSINESS_LOGIC.md`
- **Implementation plan:** `/app/memory/change_requests/implementation_plans/CR_013_IMPLEMENTATION_PLAN.md`
- **Bucket approval:** `/app/memory/change_requests/implementation_plans/CR_013_CODE_REVIEW_AND_BUCKET_APPROVAL.md`
- **Display breakdown plan (D-GST-3 + D-GST-4):** `/app/memory/change_requests/implementation_plans/CR_013_DISPLAY_BREAKDOWN_PLAN.md`
- **THIS handover:** `/app/memory/change_requests/implementation_plans/CR_013_PRINT_PAYLOAD_RUNTIME_HANDOVER.md`
- **CR-008 Sub-CR #1 source docs:** `/app/memory/change_requests/CR_008_DELIVERY_AUDIT_DISPATCH_AND_NAVIGATION.md`, `implementation_handover/CR_BUCKET_D1_CAP_DELIVERY_CHARGE_CAPTURE_HANDOVER.md`, `implementation_handover/CR_BUCKET_D1_CAP_ROUND2_QA_NOTE.md`, `implementation_handover/CR_BUCKET_D1_GATE_OVERRIDE_RULE_HANDOVER.md`
- **Baseline (read-only):** `/app/memory/final/`

---

## 16. First things to ask the owner in your first turn

1. *"Confirm: do you want me to start with the runtime payload capture (Task 9.1) and bring back findings before I touch any code?"*
2. *"Should I reach out to the backend team for BE-G10/G11 in parallel, or wait?"*
3. *"After payload capture, in what order do you want to discuss: D-GST-3 first, or D-GST-4 first, or both together?"*
4. *"Is the Round-2 → Round-3 hotfix relationship documented to your satisfaction (CartPanel + OrderEntry change), or do you want me to author a separate `CR_008_SUB_1_ROUND_3_DELIVERY_DOUBLE_COUNT_HOTFIX.md` handover note now?"*

---

**Stop after producing the runtime payload audit. Do NOT implement D-GST-3 / D-GST-4 / G8 / G9 without owner approval.**

— End of CR-013 Print-Payload Runtime-Keys Handover —
