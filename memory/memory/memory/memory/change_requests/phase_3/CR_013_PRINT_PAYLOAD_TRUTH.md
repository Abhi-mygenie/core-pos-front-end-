# CR-013 — Print Payload Truth (FE → BE `/order-temp-store`)

**Type:** Read-only audit / documentation. NO code, NO QA, NO tracker updates, NO backend.
**Agent:** CR-013 Print Payload Truth Agent
**Date:** 2026-05-05 (post-deployment session)
**Branch:** `6-may` (cloned this session into `/app`; equivalent to `5may` HEAD `5b85c2c` per source-of-truth docs)
**Status:** `documentation_only_no_code_change`
**Scope:** Document precisely what FE sends to backend on Print Bill / Re-Print Bill; map every field to its source; identify which component-wise GST values reach the print endpoint vs which do NOT; flag mismatch / double-count risks.

---

## 1. Executive summary

1. **Single FE entry into the backend print API** — `orderService.printOrder` → `POST /api/v1/vendoremployee/order-temp-store`. All 7 caller sites funnel through it.
2. **Print payload is built by `orderTransform.buildBillPrintPayload`** when `printType === 'bill'` and an `orderData` object is supplied. (KOT path is a 3-key payload `{order_id, print_type, station_kot}` — out of CR-013 scope.)
3. **The print payload does NOT carry component-wise GST keys.** It carries:
   - `gst_tax` (composite — item GST post-discount + SC GST + tip GST + delivery GST, all in one number)
   - `cgst_amount` (= `gst_tax / 2`, added by Phase 1.5 D-GST-4-PRINT-PAYLOAD)
   - `sgst_amount` (= `gst_tax / 2`, added by Phase 1.5 D-GST-4-PRINT-PAYLOAD)
   - `vat_tax`
   - **NO** `service_gst_tax_amount`, **NO** `tip_tax_amount`, **NO** `delivery_charge_gst_amount`. Not present on the print payload at all.
4. **BUT** SC GST / Tip GST DO reach the backend on the OTHER endpoints — `place-order`, `update-order`, `place-order-with-payment`, `BILL_PAYMENT` (`order-bill-payment`), `transferToRoom`. These endpoints persist `service_gst_tax_amount` and `tip_tax_amount` as separate columns on the order record. **Delivery GST has no dedicated payload key anywhere — folded into composite `gst_tax` everywhere.**
5. **Direct answer to the main question:** When the FE fires Print Bill / Re-Print Bill, **the print API call itself does NOT carry SC GST, Tip GST, or Delivery GST as separate fields**. The backend print template therefore CANNOT take SC/Tip/Delivery GST from the print payload — it must either (a) recompute, or (b) read the stored values written earlier by `place-order` / `update-order` / `order-bill-payment`. **The reverse-engineering in the existing print double-count handover (§3.4) strongly indicates option (b) — backend reads stored `service_gst_tax_amount` from the order record, NOT from the print payload, because `service_gst_tax_amount` is not in the print payload to begin with.** Backend source not available in this workspace; classified `backend_confirmation_required`.
6. **Asymmetry risk (already documented in print double-count handover):** Backend's stored-value path on the printed bill currently uses `service_gst_tax_amount` in two opposite-direction errors at once — over-counts on display CGST/SGST lines and under-counts on `payment_amount`. Phase 1.5 D-GST-3 unmasked this by switching the persisted `service_gst_tax_amount` from `0` to a real value. Owner-decision-pending Options A / B / C / D.
7. **Tip GST has the same exposure** as SC GST on the BILL_PAYMENT path (also persisted by D-GST-3); Tip GST has not been observed misbehaving on print today only because no order in the cited test set carried tip > 0. **Risk is symmetric.**
8. **Delivery GST has DIFFERENT exposure** — the print payload sends `delivery_charge` (gross), no GST split, and there is no `delivery_charge_gst_amount` persisted column. Delivery GST is folded into composite `gst_tax`. Backend can only render delivery GST by re-multiplying `delivery_charge × deliver_charge_gst%`, which the print template currently has no FE-supplied rate to do — it would need to read tenant config.

---

## 2. Files inspected (read-only)

| File | Lines of interest |
|---|---|
| `/app/frontend/src/api/services/orderService.js` | `printOrder` definition L120-139 |
| `/app/frontend/src/api/transforms/orderTransform.js` | `calcOrderTotals` return L595-639; `buildBillPrintPayload` L1226-1554; print-payload return object L1492-1553; D-GST-3 sites L770 / L860 / L961 / L1128-1130 / L1198-1199 (per QA report `5may` HEAD `5b85c2c`) |
| `/app/frontend/src/api/constants.js` | `PRINT_ORDER` endpoint string L60 |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | `paymentData` build L509-558; `handlePrintBill` overrides L574-606 |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | `onPrintBill` handler L1215-1240 (manual); `autoPrintNewOrderIfEnabled` L1266-1347 (auto, prepaid place+pay); `[AutoPrintCollectBill]` block L1511-1565 (auto, postpaid collect-bill) |
| `/app/frontend/src/components/cards/TableCard.jsx` | `handlePrintBill` L143-169 |
| `/app/frontend/src/components/cards/OrderCard.jsx` | `handlePrintBill` L120-145 |
| `/app/frontend/src/components/order-entry/RePrintButton.jsx` | `RePrintOnlyButton` (KOT-only) L11-84; `PrintBillButton` (Bill) L94-136; legacy default-export `RePrintButton` L178-228 (UI shell only — no `printOrder` call) |
| Backend / template source | **NOT present** in this workspace. Real backend at `https://preprod.mygenie.online/`. No template file readable here. |

Source-of-truth docs read first:
- `/app/memory/change_requests/qa_reports/CR_013_PHASE_1_5_RUNTIME_QA_REPORT.md`
- `/app/memory/change_requests/implementation_summaries/CR_013_PHASE_1_5_DGST3_DGST4_SUMMARY.md`
- `/app/memory/change_requests/phase_3/CR_013_P3_PRINT_TEMPLATE_PER_COMPONENT_TAX.md`
- `/app/memory/change_requests/implementation_handover/CR_013_PHASE_1_5_PRINT_DOUBLE_COUNT_HANDOVER_2026_05_05.md`
- `/app/memory/change_requests/requirements/CR_013_FROZEN_BUSINESS_LOGIC.md`

---

## 3. Print flow table — every entry point

All sites POST to `/api/v1/vendoremployee/order-temp-store`. Bill-print sites all flow through `orderTransform.buildBillPrintPayload`. KOT sites bypass the builder.

| # | File | Function / caller | Print kind | Calls `printOrder`? | Uses `buildBillPrintPayload`? | Order object passed | Overrides passed |
|---|---|---|---|---|---|---|---|
| 1 | `CollectPaymentPanel.jsx` (via OrderEntry's `onPrintBill` prop) | `handlePrintBill` L574-606 → `OrderEntry.onPrintBill` L1215-1240 | **Live print** (manual button on Collect Bill screen, BEFORE payment captured) | ✅ via parent | ✅ | `getOrderById(printOrderId) \|\| orderData` | **Full live overrides:** `orderItemTotal, orderSubtotal, paymentAmount, discountAmount, couponCode, loyaltyAmount, walletAmount, serviceChargeAmount, deliveryCharge, gstTax (= sgst+cgst), vatTax (=0), tip, runtimeComplimentaryFoodIds`, plus `deliveryAddress` for delivery |
| 2 | `OrderEntry.jsx` `autoPrintNewOrderIfEnabled` | `onPaymentComplete → autoPrintNewOrderIfEnabled` L1266-1347 | **Auto-print after FRESH new-order Place+Pay** (prepaid, BUG-273) | ✅ | ✅ | `await waitForOrderReady(newOrderId)` from OrderContext | Same shape as #1 — built from `paymentData` (`paymentData.itemTotal/subtotal/finalTotal/discounts/serviceCharge/deliveryCharge/printGstTax/printVatTax/tip` + `deliveryAddress`) |
| 3 | `OrderEntry.jsx` `[AutoPrintCollectBill]` block | inside `onPaymentComplete` L1511-1565 | **Auto-print after Collect Bill** (postpaid, BUG-002) | ✅ | ✅ | `getOrderById(Number(collectOrderId))` | Same shape as #2 + `runtimeComplimentaryFoodIds` |
| 4 | `RePrintButton.jsx` `PrintBillButton` | `handlePrintBill` L100-121 | **Re-print bill** from OrderEntry header chip | ✅ | ✅ | `getOrderById(orderId)` | Minimal — only `serviceChargeTaxPct`, `deliveryChargeGstPct` (no `gstTax` / `serviceChargeAmount` / `tip` / `deliveryCharge` / `discountAmount` overrides) → triggers default-branch self-recompute in `buildBillPrintPayload` |
| 5 | `TableCard.jsx` | `handlePrintBill` L143-169 | **Dashboard re-print** from a table card | ✅ | ✅ | `getOrderById(table.orderId)` | Same minimal shape as #4 (rate pcts only) |
| 6 | `OrderCard.jsx` | `handlePrintBill` L120-145 | **Dashboard re-print** from an order card | ✅ | ✅ | `order` (from props) | Same minimal shape as #4 (rate pcts only) |
| 7 | `RePrintButton.jsx` `RePrintOnlyButton` | `executePrintKot` L43-58 | **Re-print KOT** | ✅ (KOT path) | ❌ — KOT branch in `printOrder` builds 3-key payload directly | n/a | n/a |
| 8 | `RePrintButton.jsx` legacy `RePrintButton` (default export) | UI shell L178-228 | None — buttons are stubs, no `printOrder` call | ❌ | ❌ | n/a | n/a |

**No report-print path** and **no separate room-print path** were found. Room orders are printed through the same `printOrder` → `buildBillPrintPayload` flow; `buildBillPrintPayload` has a Room-specific branch (`isRoomPrint`, L1457-1490) that adds `associated_orders[]`, `roomRemainingPay`, `roomAdvancePay` and rolls room-side amounts into `payment_amount`/`grant_amount` on the override path.

**KOT path note:** `printOrder` short-circuits when `printType === 'kot'` or when no `orderData` is given — sends `{order_id, print_type, station_kot}` only. CR-013 financial fields are not in scope on KOT.

---

## 4. Exact print payload field table — what FE actually sends to `/order-temp-store`

Anchor: `orderTransform.js` L1492-1553. Every field below is sent on every Bill print (live, auto, re-print). Default-branch (no override) recompute applies on TableCard / OrderCard / PrintBillButton.

| # | Field name | Value source (override / default) | FE-computed or BE-owned? | BE template usage (provable here?) | Risk if BE recomputes / ignores |
|---|---|---|---|---|---|
| 1 | `order_id` | `order.orderId` | FE | Used as PK to fetch stored order on backend (presumed). | Low — identifier only. |
| 2 | `restaurant_order_id` | `order.orderNumber \|\| ''` | FE | Display. | None. |
| 3 | `print_type` | hardcoded `'bill'` | FE | Branch selector on backend. | None. |
| 4 | `payment_amount` | `overrides.paymentAmount ?? (order.amount \|\| 0)` (room: rolled with `associatedTotal` + `roomBalance` when override present) | FE-computed (live) / BE-echoed (default) | **Backend appears to recompute Total per print double-count handover §3.4** (`748 = subtotal + (gst_tax − service_gst_tax_amount)`). `payment_amount` from print payload is being IGNORED on the printed receipt's "Total" line. **`backend_confirmation_required`**. | HIGH — printed Total currently ≠ FE-supplied `payment_amount` on Bean Me Up Order #2. |
| 5 | `grant_amount` | mirrors `payment_amount` | FE-computed | Same as above. | HIGH — same exposure. |
| 6 | `order_item_total` | `overrides.orderItemTotal ?? (order.subtotalAmount \|\| computedSubtotal \|\| 0)` | FE-computed | Used by template per receipt observation (matches `Item Total : 650.00`). | Low. |
| 7 | `order_subtotal` | `overrides.orderSubtotal ?? itemBase + serviceChargeAmount + tip` | FE-computed | Used by template per receipt observation (matches `Sub Total : 715.00`). Discount NOT subtracted in default branch. | Low. |
| 8 | `discount_amount` | `overrides.discountAmount ?? 0` | FE | Display. | None confirmed. |
| 9 | `coupon_code` | `overrides.couponCode ?? ''` | FE | Display. | None. |
| 10 | `loyalty_dicount_amount` *(sic)* | `overrides.loyaltyAmount ?? 0` | FE | Display. | None — note typo preserved. |
| 11 | `wallet_used_amount` | `overrides.walletAmount ?? 0` | FE | Display. | None. |
| 12 | `Date` | `formatBillDate(order.createdAt)` (DD/MMM/YYYY HH:MM AM/PM) | FE | Display. | None. |
| 13 | `waiterName` | `order.waiter \|\| ''` | FE-from-BE (echo) | Display. | None. |
| 14 | `tablename` | derived from `isWalkIn` / `orderType` / `tableNumber` | FE | Display. | None. |
| 15 | `custName / custPhone / custGSTName / custGST` | `order.customerName / phone` (last two hardcoded `''`) | FE | Display. | None. |
| 16 | `billFoodList` | filtered + complimentary-zeroed `rawDetails` | FE (transformed from BE-supplied `rawOrderDetails`) | Used to render line items. | None major. |
| 17 | `orderNote` | `order.orderNote \|\| ''` | FE | Display. | None. |
| 18 | `serviceChargeAmount` | `overrides.serviceChargeAmount ?? scApplicable ? (sc% × postDiscountSubtotal) : 0` | FE | Used by template (matches `S.C (10%) : 65.00` on receipt). | **Backend appears to recompute** the printed `S.C` line if it shows a rate suffix `(10%)` not present in the FE payload — backend may be reading `serviceChargePercentage` from stored order, not from print payload. Low impact — value was correct on receipt. |
| 19 | `roomRemainingPay` | from `order.roomInfo.balancePayment` if `isRoom` else 0 | FE-computed | Display on room bills. | None. |
| 20 | `roomAdvancePay` | from `order.roomInfo.advancePayment` if `isRoom` else 0 | FE-computed | Display on room bills. | None. |
| 21 | `roomGst` | hardcoded `0` (Q-3E) | FE | Display. | None. |
| 22 | `associated_orders` | from `order.associatedOrders[]._raw` if `isRoom` else `[]` | FE-from-BE (echo `_raw`) | Display in room bills. | None. |
| 23 | `deliveryCustName / deliveryAddressType / deliveryCustAddress / deliveryCustPincode / deliveryCustPhone` | `overrides.deliveryAddress.*` ?? `order.deliveryAddress.*`; only when `orderType === 'delivery'` | FE | Display. | None. |
| 24 | `Tip` | `overrides.tip ?? (order.tipAmount \|\| 0)` | FE | Display (printed `Tip : 0` on receipt). | Low — gross tip; tip GST is the question, see §5. |
| 25 | `station_kot` | hardcoded `''` for bill | FE | Branch flag. | None. |
| 26 | `order_type` | `order.rawOrderType \|\| 'dinein'` | FE | Branch flag. | None. |
| 27 | **`gst_tax`** | `overrides.gstTax ?? gst_tax` (default: recomputed sum of item GST post-discount + SC GST + Tip GST + Delivery GST) | **FE** (composite — additive) | **Used by backend template** but not directly for the printed CGST/SGST lines per §3.4 reverse-engineering — backend appears to derive `(gst_tax − service_gst_tax_amount)` and split that, then add `service_gst_tax_amount` separately. **`backend_confirmation_required`**. | HIGH — see §5/§7. |
| 28 | **`cgst_amount`** | `Math.round((finalGstTax / 2) × 100) / 100` (Phase 1.5 D-GST-4-PRINT-PAYLOAD, additive) | FE | **Likely IGNORED by current backend template** — receipt shows `27.95` per side, but FE sent `22.10` per side on Bean Me Up Order #2. Receipt value matches the legacy `(gst_tax − service_gst_tax_amount)/2 + service_gst_tax_amount` formula derived from STORED `service_gst_tax_amount`, not from the FE-supplied `cgst_amount`. **`backend_confirmation_required` (BE-G10).** | HIGH — printed CGST ≠ FE-sent `cgst_amount` on the cited Bean Me Up Order #2. |
| 29 | **`sgst_amount`** | mirrors `cgst_amount` | FE | Same as #28 — ignored on the cited bill. | HIGH — same as #28. |
| 30 | `vat_tax` | `overrides.vatTax ?? vat_tax` | FE | Display (currently `0`). | None observed. |
| 31 | `delivery_charge` | `overrides.deliveryCharge ?? (order.deliveryCharge \|\| 0)` | FE | Display (gross delivery). | None observed (gross only). |

### 4.1 Fields explicitly NOT in the print payload (verified by reading L1492-1553 end-to-end)

| Missing field | Where it DOES exist | Implication |
|---|---|---|
| `service_gst_tax_amount` | `placeOrder` / `updateOrder` / `placeOrderWithPayment` / `BILL_PAYMENT` / `transferToRoom` payloads (D-GST-3) and persisted on the order record. | Backend template MUST be reading from the stored order record, NOT from the print payload. |
| `tip_tax_amount` | Same five payloads as above. Persisted. | Same — read from stored order record. |
| `delivery_charge_gst_amount` | **Nowhere.** Frozen rule §1 row 13 + Phase 3 BE-G9 — no payload key today. | Backend cannot get delivery GST as a separate value. Either folded into composite `gst_tax`, or backend recomputes from `delivery_charge × deliver_charge_gst%`. |
| `service_charge_tax_pct` (rate) | Not in print payload. | If backend renders `CGST on SC <pct/2>%` rate suffix it must read tenant config. |
| `deliver_charge_gst_pct` (rate) | Not in print payload. (Phase 3 BE-G11 row 50 lists it as "optional — for label rendering on backend side") | Same. |
| `tip_charge_tax_pct` (rate) | Not in print payload (tip rides SC rate per frozen rule §1 row 9 — no separate field exists or planned). | Same. |
| `total_service_tax_amount` | Echoed BACK by backend on socket / order-list responses; FE never sends this key on any payload. | Read-only from FE perspective. |
| `service_gst_tax_amount` from `paymentData` flows into `BILL_PAYMENT` payload (collectBillExisting) at `orderTransform.js:1128-1130`, NOT into the print payload. | — | BILL_PAYMENT happens **before** print on the auto-print-after-collect path. Stored value is fresh by the time the print fires. |

### 4.2 `payment_amount` round-off note

`payment_amount` in the print payload is the FE-computed `finalTotal` (= `effectiveTotal` from CollectPaymentPanel L511 → `paymentAmount` override) on the live / auto paths. On default-branch dashboard re-prints, it falls back to `order.amount` echoed by backend. The FE-side BUG-009 fractional rounding rule is applied to `order_amount` upstream (in `calcOrderTotals` L617-619), so `paymentAmount` carried into the print payload is already rounded. **Round-off is NOT applied to component values** (owner directive 2026-05-05).

---

## 5. Component GST truth table

| Component | Base amount key sent in PRINT payload | GST rate source (FE) | GST amount key sent in PRINT payload | Included in print payload's `gst_tax`? | Separate CGST/SGST sent in PRINT payload? | Backend template usage known? |
|---|---|---|---|---|---|---|
| **Item GST** | line items in `billFoodList` (`unit_price`, `quantity`, `food_details.tax`, `food_details.tax_calc`) | per-item `food_details.tax` % | None as a separate key | ✅ Yes — `gstTax * (1 − discountRatio)` is the item portion of composite `gst_tax`. Plus `cgst_amount = sgst_amount = gst_tax / 2` (Phase 1.5). | ❌ Only the COMPOSITE half-split (`cgst_amount` / `sgst_amount`) is sent. Per-component item halves NOT sent. | Backend renders ONE pair of CGST/SGST lines on receipt; observed value is wrong (`27.95` instead of FE-supplied `22.10`). `backend_confirmation_required`. |
| **Service Charge GST** | `serviceChargeAmount` (gross SC ₹) | `restaurant.serviceChargeTaxPct` (passed via `overrides.serviceChargeTaxPct` on default-branch re-print recompute path L1388) | **None.** No `service_gst_tax_amount` key on print payload. | ✅ Folded into composite `gst_tax` via override `gstTax = sgst+cgst` (live path) or recomputed inside `buildBillPrintPayload` (default branch L1391: `serviceChargeAmount × scTaxRate`). | ❌ Not sent separately. Composite halves only. | Reverse-engineered: backend READS STORED `service_gst_tax_amount` from the order record (set earlier by D-GST-3 on `BILL_PAYMENT` / `place-order`) and USES IT ASYMMETRICALLY (over-counts CGST/SGST display, under-counts Total). Source not readable here → `backend_confirmation_required`. |
| **Tip GST** | `Tip` (gross tip ₹) | `restaurant.serviceChargeTaxPct` (tip rides SC rate, frozen rule §1 row 9) | **None.** No `tip_tax_amount` key on print payload. | ✅ Folded into composite `gst_tax` (live: via `gstTax = sgst+cgst` override; default: `overrideTip × scTaxRate` L1392). | ❌ Not sent separately. | Same exposure as SC GST — backend reads stored `tip_tax_amount` from order record. Symptom not yet observed because tip = 0 on cited test orders. `backend_confirmation_required`. |
| **Delivery Charge GST** | `delivery_charge` (gross delivery ₹) | `restaurant.deliveryChargeGstPct` (passed via `overrides.deliveryChargeGstPct` L1389 on default-branch recompute) | **None and never persisted anywhere.** No `delivery_charge_gst_amount` key on FE payloads (Phase 3 BE-G9 to add). | ✅ Folded into composite `gst_tax` (live: same `gstTax = sgst+cgst`; default: `overrideDelivery × delTaxRate` L1393). | ❌ Not sent separately. | Backend has no separately-persisted delivery GST to read → must EITHER recompute from `delivery_charge × deliver_charge_gst%` (needs tenant config) OR derive from composite `gst_tax`. `backend_confirmation_required`. |

---

## 6. Backend print dependency findings

> Backend source / template files are NOT present in this workspace (`/app/backend/` here is a default scaffold; real backend at `https://preprod.mygenie.online/`). The findings below are inferences from FE source + the print double-count handover's reverse-engineering of an observed printed receipt + Phase 3 CR. All marked `backend_confirmation_required` where direct proof is unavailable.

| Question | Answer | Confidence |
|---|---|---|
| Does backend print directly from frontend payload? | **Partially.** Subtotal / Item Total / SC line / Tip line / Delivery line / customer fields / billFoodList — yes (matches receipt). Composite `gst_tax`, `cgst_amount`, `sgst_amount` — APPARENTLY NO (printed CGST/SGST values do not match FE-sent values on Bean Me Up Order #2). | Reverse-engineered from receipt — `backend_confirmation_required` (BE-G10). |
| Does backend recompute taxes? | **Yes — the printed CGST/SGST display formula appears to be `(stored gst_tax − stored service_gst_tax_amount)/2 + stored service_gst_tax_amount`, i.e. backend computes display-side values from stored persisted columns, NOT from the FE print payload.** | Reverse-engineered — `backend_confirmation_required` (BE-G10/G11). |
| Does backend use stored order values instead of payload values? | **Yes for tax.** `service_gst_tax_amount` and `tip_tax_amount` are persisted via `BILL_PAYMENT`/`place-order` (Phase 1.5 D-GST-3). Print receipt asymmetry on Bean Me Up Order #2 is consistent ONLY with backend reading those stored columns at print time — print payload doesn't carry them. | High inference — `backend_confirmation_required`. |
| Does backend read `cgst_amount` / `sgst_amount` (Phase 1.5 fields)? | **Apparently NO** (today). Receipt CGST/SGST = ₹27.95 each on Bean Me Up Order #2, FE-supplied `cgst_amount` = `sgst_amount` = ₹22.10. Phase 3 BE-G10 is "confirm template auto-renders these" + BE-G11 "extend template to consume them". | Reverse-engineered — `backend_confirmation_required`. |
| Does backend read `service_gst_tax_amount` / `total_service_tax_amount`? | **Yes — from stored order record, NOT from print payload.** Print payload doesn't contain either key. Stored `service_gst_tax_amount` (set by D-GST-3) maps to socket-echoed `total_service_tax_amount` on running-orders. | High inference. |
| Does backend read `tip_tax_amount`? | **Yes — same stored-record pathway as SC GST.** Symptom not observed yet because tip = 0 on cited test orders. | High inference. |
| Does backend have / read `delivery_charge_gst_amount`? | **NO — column does not exist** (frozen rule §1 row 13; Phase 3 BE-G9 is the open ask to add it). | High confidence — frozen rule. |
| Could backend double-count service charge GST? | **YES — already documented.** Print double-count handover §3.4 reverse-engineers the asymmetry: backend's printed CGST per-side = `(gst_tax − service_gst_tax_amount)/2 + service_gst_tax_amount` = ₹27.95 instead of ₹22.10. Effectively ADDS the FULL `service_gst_tax_amount` to BOTH the CGST and SGST display lines. **This is the Bean Me Up print double-count.** | High inference — `backend_confirmation_required`. |
| Could backend double-count tip GST? | **YES — same template logic shape**, untested in production because no tip > 0 test case has been printed since D-GST-3 shipped. Symmetric risk. | Medium inference — `backend_confirmation_required`. |
| Could backend double-count delivery charge GST? | **Different shape.** No `delivery_charge_gst_amount` column to over-add; if template recomputes `delivery_charge × deliver_charge_gst%` AND the composite `gst_tax` already includes delivery GST, then yes — additive recompute could double-count. Untested. | Low-medium inference — `backend_confirmation_required` (BE-G9 ties in here). |

---

## 7. Mismatch / double-count risks (consolidated)

| # | Risk | Component | Failure mode | Wire evidence |
|---|---|---|---|---|
| 1 | Printed CGST/SGST lines OVER-count SC GST | SC GST | `printedCGST = printedSGST = (gst_tax − service_gst_tax_amount)/2 + service_gst_tax_amount` per side. Total displayed GST = `2 × printedCGST = (gst_tax − service_gst_tax_amount) + 2 × service_gst_tax_amount = gst_tax + service_gst_tax_amount`. **Adds SC GST once extra.** | Bean Me Up Order #2: receipt shows `CGST = SGST = ₹27.95` instead of ₹22.10. |
| 2 | Printed `Total` UNDER-counts SC GST | SC GST | `printedTotal = subtotal + (gst_tax − service_gst_tax_amount)` instead of `subtotal + gst_tax`. **Drops SC GST entirely from the Total.** | Bean Me Up Order #2: `Total = 748` (= 715 + 33 = subtotal + item GST only) instead of 759. |
| 3 | Customer-visible inconsistency on the printed bill | SC GST | Sum of printed CGST + SGST = ₹55.90, but `(Total − Subtotal) = ₹33`. Mismatch ₹22.90 — bill is not internally reconcilable. | Same Order #2. |
| 4 | Tip GST has IDENTICAL exposure | Tip GST | Backend likely treats `tip_tax_amount` symmetrically. Will mis-display + mis-total the moment any tipped order is printed. | Untested — no tipped order printed in cited cohort. |
| 5 | Delivery GST exposure is ASYMMETRIC | Delivery GST | No persisted column. If template recomputes `delivery_charge × pct%` and ALSO uses composite `gst_tax`, delivery GST could be double-added in `gst_tax` line vs Subtotal arithmetic. | Untested — no delivery + non-zero `deliver_charge_gst` order printed in cited cohort. (Bean Me Up Order #4 had delivery=100 + delivery_gst=18%, but `total_service_tax_amount = 0` echoed back — the print observation is missing.) |
| 6 | FE-supplied `cgst_amount` / `sgst_amount` (Phase 1.5) ignored by current template | Item + composite | Receipt shows backend-computed value, not the FE-supplied half. Extra payload data is silently dropped. | Same Order #2. |
| 7 | `payment_amount` from print payload appears to be ignored on the printed Total line | Total | Backend's printed Total uses its own formula; FE-sent `payment_amount = 748` happens to match ONLY because the FE was forced to round to backend's flawed computation upstream. Independent verification of override path needed. | High inference. |
| 8 | Default-branch (no overrides) re-print recompute path is rate-driven | All 3 component GSTs | When TableCard / OrderCard / PrintBillButton re-print without overrides, `buildBillPrintPayload` self-recomputes `gst_tax` using `overrides.serviceChargeTaxPct` + `overrides.deliveryChargeGstPct` (L1388-1393). FE rate keys come from `restaurant.*` profile. If profile rates are 0 → component GSTs collapse to 0 (frozen rule §10 force-0). Backend re-print template still reads stored values unaltered. **Live re-print and dashboard re-print can therefore disagree on tax** if profile rates were updated between order placement and re-print. | Untested — flagged. |

**Pre-Phase-1.5 era:** Risk #1 / #2 / #3 / #4 were INVISIBLE because `service_gst_tax_amount` and `tip_tax_amount` were hardcoded `0` on every payload. `(gst_tax − 0)/2 + 0 = gst_tax/2` → printed CGST/SGST were correct; `subtotal + (gst_tax − 0) = subtotal + gst_tax` → printed Total was correct. **Phase 1.5 D-GST-3 unmasked latent backend logic. Both backend errors always existed.**

---

## 8. Backend questions (open — `backend_confirmation_required`)

For BE-G7 / BE-G8 / BE-G10 / BE-G11 (Phase 3 CR + print double-count handover §5):

1. **BE-G10 (autorender):** Does the `order-temp-store` print template auto-render any tax field present in the payload, or is the receipt template hardcoded to read only specific keys (`gst_tax`, plus stored `service_gst_tax_amount` / `tip_tax_amount` from the order record)?
2. **BE-G11 (per-component slots):** If hardcoded, will template be extended to consume `cgst_amount` + `sgst_amount` (already sent by Phase 1.5) and STOP reading stored `service_gst_tax_amount` for display?
3. **BE-G7 (Total formula):** Confirm the exact formula used for the printed `Total` line. Is it (a) `payment_amount` from the print payload, (b) re-computed from stored order columns `gst_tax − service_gst_tax_amount + subtotal`, or (c) something else?
4. **BE-G8 (Tip GST symmetry):** Confirm whether backend's print-template Total formula also subtracts `tip_tax_amount` from `gst_tax`, and whether the printed CGST/SGST display also adds the FULL `tip_tax_amount` to each side. Symmetric to BE-G7 risk.
5. **BE-G9 (delivery GST persistence):** Will `delivery_charge_gst_amount` be added as a persisted column? If not, what does the print template currently do with delivery GST — re-multiply `delivery_charge × deliver_charge_gst%` from tenant config, or fold into composite `gst_tax`? Either way, can it double-count?
6. **Display vs Total contract:** Does the backend template guarantee `printed CGST + printed SGST == printed Total − printed Subtotal − printed VAT`? If not, what reconciliation rule does it use?
7. **Stored vs payload precedence:** When BOTH stored order columns AND print payload carry the same conceptual value (e.g., FE sends `cgst_amount = 22.10` while stored `service_gst_tax_amount = 11.70` would imply a different display formula), which one wins?
8. **Re-print path:** When dashboard re-print fires WITHOUT live overrides, the FE `buildBillPrintPayload` self-recomputes `gst_tax` from rate pcts. Stored columns may still hold OLD values from when the order was placed (different SC % / different rates). Which one does the printed bill use?

---

## 9. Final recommendation

> Answer to the main question:
> **The FE print payload (`POST /order-temp-store`) does NOT carry `service_gst_tax_amount`, `tip_tax_amount`, or `delivery_charge_gst_amount` as separate fields.** Only composite `gst_tax`, `cgst_amount`, `sgst_amount` (50/50 of composite, additive Phase 1.5), `vat_tax`, and the gross component bases (`serviceChargeAmount`, `Tip`, `delivery_charge`) are sent.
>
> The backend print template therefore CANNOT take SC/Tip/Delivery GST from the print payload directly — it MUST either recompute or read stored persisted columns. The reverse-engineering of Bean Me Up Order #2 in the existing print double-count handover §3.4 strongly indicates the backend uses STORED `service_gst_tax_amount` (set by Phase 1.5 D-GST-3 on `BILL_PAYMENT` / `place-order`), not the FE print payload, for both the printed CGST/SGST display AND the printed Total — and uses it asymmetrically (over-counts on display, under-counts on Total).
>
> Direct backend source proof is unavailable in this workspace → **`backend_confirmation_required`** for all assertions about backend behaviour. Phase 3 backend asks BE-G7 / BE-G8 / BE-G10 / BE-G11 (and BE-G9 for delivery GST persistence) close this gap.

### What this document is NOT
- Not an implementation plan.
- Not a tracker update.
- Not a QA report.
- Does not declare Phase 3 complete.
- Does not edit `/app/memory/final/`.
- Does not pull / switch branches.

### What the next agent can use this document for
- Decide between Print Double-Count Options A / B / C / D once owner picks.
- Author the BE ticket — copy §6 / §7 / §8 verbatim.
- Plan Phase 3 BE-G11 FE follow-up patch (per-component fields on print payload — listed in Phase 3 CR §2 BE-G11 row table, NOT to be implemented before backend confirms).
- Plan BE-G9 FE follow-up patch (`delivery_charge_gst_amount` payload key on `placeOrder` / `updateOrder` / `placeOrderWithPayment` / `BILL_PAYMENT` — likewise gated on backend column).
- Cross-check any future Print-Bill bug report against §4 (field table) and §5 (component GST truth) before changing FE code.

---

**Stop. No code changed. No tracker updated. No `/app/memory/final/` edit. No QA executed. No backend touched.**

— End of CR-013 Print Payload Truth —
