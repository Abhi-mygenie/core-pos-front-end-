# CR-013 · GST Config Correction — Service Charge, Delivery Charge, Tip

**Status:** Open · Backlog · NOT in current session scope
**Raised by:** Owner (Abhi)
**Raised on:** 2026-05-03
**Source conversation:** D1-Cap deep-dive after Round-2 ship
**Parent bucket reference:** Independent of CR-008 / D1-Cap (does NOT block D1-Cap or D1-Gate)

---

## 1. The problem in one line

GST on **Service Charge**, **Delivery Charge**, and **Tip** is currently computed using the average item GST rate (`avgGstRate`), but the restaurant profile API exposes dedicated configured rates that the frontend ignores entirely.

---

## 2. Profile API keys today (unused)

| Profile API key | Example | Intended meaning | Current usage in frontend |
|---|---|---|---|
| `deliver_charge_gst` | `"5.00"` | GST % to apply on the delivery-charge line | **Not parsed, not consumed anywhere** |
| `service_charge_tax` | `"0.00"` | GST % to apply on the service-charge line | **Not parsed, not consumed anywhere** |

Both keys verified absent from `profileTransform.js`, `RestaurantContext`, every component, every transform, every test fixture.

## 3. Owner-confirmed business rule (2026-05-03)

| Component | GST rate to use |
|---|---|
| Items | Per-product `tax.percentage` (already correct, no change) |
| **Service Charge** | `restaurant.service_charge_tax` (profile key) |
| **Delivery Charge** | `restaurant.deliver_charge_gst` (profile key) |
| **Tip** | **Same rate as Service Charge** (Owner: "tip GST of service charge will be considered") |

This makes Tip GST a derived field, not its own profile key.

## 4. Today's behaviour (incorrect)

`CollectPaymentPanel.jsx:353-360` and `orderTransform.js → calcOrderTotals()` L539-545:

```js
const avgGstRate = itemTotal > 0
  ? (taxTotals.sgst + taxTotals.cgst) / itemTotal
  : 0;

scGst       = serviceCharge  * avgGstRate;   // WRONG — should be SC × service_charge_tax
tipGst      = tip            * avgGstRate;   // WRONG — should be tip × service_charge_tax
deliveryGst = deliveryCharge * avgGstRate;   // WRONG — should be delivery × deliver_charge_gst
```

## 5. Divergence cases (why this matters)

| Scenario | Items GST | Profile says | Frontend computes today | Correct (per profile) | Variance |
|---|---|---|---|---|---|
| Pizza 18% + delivery ₹50 + SC ₹10 + tip ₹5 | 18% | `deliver_charge_gst=5`, `service_charge_tax=0` | delGST=9.00, scGST=1.80, tipGST=0.90 | delGST=2.50, scGST=0, tipGST=0 | **+₹9.20 over-charge** |
| Coffee 0% (exempt) + delivery ₹50 | 0% | `deliver_charge_gst=5` | delGST=0 | delGST=2.50 | **−₹2.50 under-charge** |
| Burger 5% + delivery ₹50 + SC ₹10 | 5% | `deliver_charge_gst=5`, `service_charge_tax=0` | delGST=2.50, scGST=0.50 | delGST=2.50, scGST=0 | **+₹0.50 over-charge** |
| Mixed 5% + 18% blended ~10% + delivery ₹50 | 10% | `deliver_charge_gst=5` | delGST=5.00 | delGST=2.50 | **+₹2.50 over-charge** |

Most likely real-world complaint: a restaurant with `service_charge_tax="0.00"` configured today still sees GST appear on every SC line.

## 6. Surfaces affected

- Collect Bill screen Grand Total (cashier-visible)
- Receipt / Bill print Grand Total
- Audit Report `tax_amount` / `service_tax` columns
- POS-side `gst_tax` and `order_amount` payload values sent to backend
- Dashboard tile `amount` (after CR-008 D1-Cap Round-2 fix; same `order_amount` pipeline)

## 7. Files in scope (when this ticket is implemented)

| # | File | Hotspot? | Change |
|---|---|---|---|
| 1 | `frontend/src/api/transforms/profileTransform.js` | No | Parse `api.deliver_charge_gst` → `restaurant.deliveryChargeGstPct`. Parse `api.service_charge_tax` → `restaurant.serviceChargeTaxPct`. |
| 2 | `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | **YES** | Replace `scGst = serviceCharge × avgGstRate` → `serviceCharge × (restaurant.serviceChargeTaxPct/100)`. `tipGst` → same rate as SC (per Owner). `deliveryGst = deliveryCharge × (restaurant.deliveryChargeGstPct/100)`. |
| 3 | `frontend/src/api/transforms/orderTransform.js → calcOrderTotals()` | **YES** | Mirror the same three rate switches so place-order / update-order / placeOrderWithPayment payloads use the configured rates. |

Estimated change size: ~30-50 lines added/modified, 2 hotspots, medium regression risk.

## 8. Open policy questions to close before coding

| # | Question | Owner default needed |
|---|---|---|
| Q-G1 | When a profile key is **missing entirely** (older restaurants), should we fall back to (a) `avgGstRate` (today's behaviour, backwards compatible), (b) hard 0 (no GST), or (c) restaurant-level `tax.gstPercentage`? | Owner to decide |
| Q-G2 | When `service_charge_tax = "0.00"` is **explicitly set**, treat as override (force 0) vs fallback (drop to avgGstRate). Owner intent is most likely **override** — please confirm. | Owner to confirm |
| Q-G3 | Same question for `deliver_charge_gst = "0.00"`. | Owner to confirm |
| Q-G4 | Tip-GST = SC-GST per Owner. Confirm: does this also apply when SC is hidden (takeaway/delivery) — i.e. tip-GST stays at SC-GST rate even if SC itself is ₹0? | Owner to confirm |
| Q-G5 | Do legacy orders need recomputation, or only new orders post-fix? | Owner to confirm — recommended: only new orders |

## 9. Risks / regression surfaces

- Every Collect Bill grand total in the system changes (potentially by ₹0–₹50 per bill).
- Every place-order / update-order payload's `gst_tax` and `order_amount` shifts.
- Tax reporting (Audit Report, end-of-day) will reflect the corrected numbers — auditors may notice.
- Need a clear cut-over date to delineate "old rule" vs "new rule" bills for GST filings.

## 10. Validation / QA notes (when implemented)

Test matrix must cover:
- Items: 0% / 5% / 12% / 18% / mixed-rate
- SC: 0%, 5%, 10% with `service_charge_tax` 0% / 5% / 18%
- Delivery: ₹0 / ₹50 / ₹100 with `deliver_charge_gst` 0% / 5% / 18%
- Tip: ₹0 / ₹10 / ₹50
- Order types: dineIn / walkIn / takeaway / delivery / room / scan
- Profile key states: present / missing / `"0.00"` / non-numeric

Each case → verify Collect Bill grand total + place-order payload + bill print + audit row.

## 11. Backend confirmations needed

- Confirm both keys are populated for all live restaurants (or fallback policy is agreed in Q-G1).
- Confirm whether backend trusts client-supplied `gst_tax` / `order_amount` or recomputes server-side. If server-side, frontend may need to align with whatever backend does.
- Confirm there isn't a third key (e.g. `tip_gst` or `tip_charge_tax`) that I've missed in the profile response — agreed in conversation that Tip rides SC.

## 12. Suggested implementation sequence

1. Owner closes Q-G1 through Q-G5.
2. Backend team confirms key population + recompute policy.
3. Open new bucket **D-GST-1 (parse)**: profile parse + RestaurantContext expose. Low-risk standalone ship.
4. Open new bucket **D-GST-2 (apply)**: switch CollectPaymentPanel + calcOrderTotals to consume the new fields. Hotspot ship — full regression checklist.
5. Cut-over communication to operators / accounts so old vs new bills are distinguishable.

## 13. Cross-references

- BUG-006 / AD-101 — established the current `avgGstRate` rule. This ticket supersedes that for SC / delivery / tip.
- CR-008 Sub-CR #1 / Bucket D1-Cap — independent ticket (delivery-charge capture). Round-2 fixed `order_amount` to include the delivery rupee value, but the GST sub-component on delivery still rides `avgGstRate` (will be fixed by this ticket).
- BUG-019 — scan-order delivery_charge round-trip. Unrelated to this ticket.

## 14. Status checkpoints

| Date | Note |
|---|---|
| 2026-05-03 | Ticket opened by Owner during D1-Cap Round-2 deep dive. Parked for backlog prioritisation. |
