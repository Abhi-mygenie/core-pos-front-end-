# BUG-647 — GST OFF: API Payload Still Sends GST Tax and Inflated order_amount

**Registered:** 2026-11-05  
**Classification:** BUG  
**Severity:** P0 — CRITICAL (money: payload tells backend to charge GST even though restaurant has GST disabled)  
**Risk:** CRITICAL (order flow, billing, tax, settlement — R5+R6)  
**Process required:** Full gate flow + regression. FAST LANE eligible? **NO**  
**Sprint:** TBD  

---

## Description

When a restaurant has GST disabled (`restaurant.tax.gstStatus === false`), the Collect Payment **UI** correctly hides the TAXES section (BUG-336 fix at CollectPaymentPanel L287). However, the **API payloads** from `placeOrder`, `updatePlaceOrder`, and `placeOrderWithPayment` still send non-zero `gst_tax`, per-item `gst_amount`, and an inflated `order_amount` that includes GST.

This means:
- Cashier sees Grand Total ₹239 (no tax)
- Backend receives `order_amount: 250` (with ₹11.90 GST baked in)
- Settlement / reports will show incorrect amounts

**Example from PDF:**
- Two items: food 1 (₹123.81) + food 2 (₹114.29), GST OFF
- UI: Item Total ₹238.10, no taxes shown, Round Off +₹0.90, Grand Total ₹239
- API payload: `gst_tax: 11.9`, `order_amount: 250`, per-item `gst_amount: "6.19"` and `"5.71"`

**Root cause:** `buildCartItem` (L770) and `calcOrderTotals` (L843) in `orderTransform.js` have **no `gstStatus` check**. They always compute GST from the item's tax config regardless of the restaurant setting.

Additionally:
- `collectBillExisting` food_detail builder (L1599) also lacks the check
- `OrderEntry.jsx` `localTax`/`unplacedTax` (L886-904) — no gstStatus check
- `CartPanel.jsx` taxTotals (L389-414) — no gstStatus check
- `CollectPaymentPanel.jsx` `scGst`/`tipGst`/`deliveryGst` (L785-787) — SC/tip/delivery GST still computed via scTaxRate when gstStatus is false

---

## Evidence

- **Screenshot:** Owner-submitted PDF `05_11_2026 12_55 bugs-frontend.pdf` — Page 4 shows Grand Total ₹239 (no tax); Page 5 shows API payload with `gst_tax: 11.9`, `order_amount: 250`
- **Steps to reproduce:**
  1. Log in to a restaurant with GST disabled (gstStatus = false)
  2. Add food items that have GST configured at item level
  3. Place order
  4. Inspect the network payload — `gst_tax` is non-zero, `order_amount` includes GST
- **Source:** OWNER-REPORTED (PDF) + AGENT-DISCOVERED (code trace)
- **Confidence:** CONFIRMED (code-traced — BUG-336 fix only covers CollectPaymentPanel L287)
- **Investigation report:** `/app/memory/evidence/BUG-TAX-INCL-GST-OFF/INVESTIGATION_REPORT_2026_11_05.md`

---

## Duplicate Check

**RELATED to BUG-336.**

- BUG-336 ("GST Applied on Bills Even When Disabled in Restaurant Settings"): Fixed the **UI display** side in CollectPaymentPanel L287. Status: GATE_5B_QA_PASS_AWAITING_OWNER_SMOKE. BUG-336 did NOT fix the **payload** side (buildCartItem, calcOrderTotals, OrderEntry localTax, CartPanel taxTotals, collectBillExisting food_detail, SC/tip/delivery GST rates).
- BUG-647 covers the **remaining payload gap** left by BUG-336.

---

## Blast Radius

- `gstStatus` referenced in **20 lines** across 6 files (but only 1 line gates tax calculation — CPP L287)
- `buildCartItem` called from **4 transform functions**
- `calcOrderTotals` called from **4 transform functions**
- `localTax` / `unplacedTax` in OrderEntry L886-904
- `taxTotals` in CartPanel L389-414
- Hotspot files touched: **YES** — CollectPaymentPanel.jsx (R5), orderTransform.js (R5), OrderEntry.jsx (R5), CartPanel.jsx
- Estimated scope: **LARGE (5 files, ~30-40 lines)**

---

## Open Questions

- **OD-647-01:** When GST is OFF, should per-item `gst_amount` in the payload be `"0.00"` (zeroed) or should it still carry the computed value for backend accounting (while only `gst_tax` and `order_amount` at order level are zeroed)?
- **OD-647-02:** When GST is OFF, should SC GST / Tip GST / Delivery GST also be zeroed? (Currently CollectPaymentPanel still computes them from scTaxRate even when item GST is gated off.)
