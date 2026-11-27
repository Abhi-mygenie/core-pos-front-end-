# BUG-684 — Cart "Collect Bill" Button Shows ₹1 Different From Billed Amount (Round-Off Mismatch)
**Registered:** 2026-11-18
**Type:** BUG
**Sprint:** nov_cr_batch
**Priority:** P1
**Risk:** HIGH (financial display — cashier-quoted amount differs from billed amount; payload itself is correct)
**Status:** GATE_1_INTAKE_COMPLETE
**Client:** ALL (any restaurant with round-off ON — `total_round = Yes`)
**Reported on:** Restaurant ID 672, order #000784 (Walk-In / dine-in, postpaid)
**Assignee:** Abhishek (FE code error — OrderEntry.jsx local round-off helper)
**Routing reason:** FE display-only defect — no backend change, no payload change
---
## 1. Description
Before an order is placed, the green **Collect Bill ₹X** button on the cart screen shows a total that can differ by ₹1 from the amount actually sent to the backend and shown on the order card after placing.
**Current behaviour (owner smoke test):**
- Cart: `sin` ₹123.81 + `ddd` ₹114.29 (both GST 5%, exclusive)
- Collect Bill button shows **₹251**
- Place Order → payload sends `order_amount: 250`, `round_up: "0.00"`
- Order card after place shows **₹250**
**Expected behaviour:**
- Collect Bill button shows **₹250** — identical to the payload `order_amount` and to the Collect Payment screen Grand Total.
---
## 2. Classification
- **Type:** BUG
- **Severity:** P1 — cashier may quote the customer ₹1 more (or less) than what is billed. The amount recorded by the backend is correct.
- **Risk:** HIGH — money-facing display in an R5 hotspot file
- **Area:** Order Entry / Cart / Round-Off
- **Fast Lane:** Candidate (single file, display-only, no payload change) — owner to decide, since the area is financial
---
## 3. Duplicate Check
| Checked Against | Result |
|----------------|--------|
| CR-170 (Conditional Grand Total Round-Off: < 10 paise floor, ≥ 10 paise ceil) | **RELATED, not duplicate** — CR-170 introduced the shared helper `applyGrandTotalRoundOff` (`utils/roundOffUtils.js`) and wired it into `orderTransform.js` and `CollectPaymentPanel.jsx`. The cart button in `OrderEntry.jsx` was left on its own local helper. |
| BUG-666 (GST rounding parity CPP vs orderTransform) | **RELATED, not duplicate** — fixed per-item GST rounding parity in CollectPaymentPanel only; the cart button's tax sum was not touched. |
| BUG-051 / BUG-052 (always-ceil round-off / profile gate) | DISTINCT — superseded rule; different symptom. |
| BUG-647 / BUG-683 (GST / VAT toggle) | DISTINCT — toggle handling, not rounding. |
**Result: DISTINCT** — no existing item covers the cart button's local round-off helper.
---
## 4. Evidence
- **Source:** OWNER SMOKE TEST (2026-11-18) — 2 screenshots + place-order payload
- **Confidence:** HIGH for root cause (code-traced, and the app's own formulas were run with the payload numbers and reproduce 251 vs 250). **Not reproduced in the UI** — no login available for restaurant 672.
- **Payload (key fields):**
```
order_sub_total_amount: 238.1
tax_amount: 11.9      gst_tax: 11.9      vat_tax: 0
order_amount: 250     round_up: "0.00"   service_tax: 0
cart[0]: price 123.81, gst_amount "6.19"
cart[1]: price 114.29, gst_amount "5.71"
```
- **Formula run (node, same code as the app):**
```
Cart button : tax 11.905 (unrounded) → raw 250.01 → local applyRoundOff → 251
Payload     : tax 11.90 (per-item rounded) → raw 250.00 → applyGrandTotalRoundOff → 250
```
---
## 5. Root Cause
**CODE_ERROR — cart button uses its own total calculation instead of the shared one.** Two defects, both in `OrderEntry.jsx`:
### 5.1 Local round-off helper is inverted (primary cause)
```javascript
// OrderEntry.jsx L1192-1196
const applyRoundOff = (raw) => {
  const ceil = Math.ceil(raw);
  const diff = Math.round((ceil - raw) * 100) / 100;   // distance UP to next rupee
  return diff >= 0.10 ? ceil : Math.floor(raw);
};
```
It tests the distance up to the next rupee, not the paise part. Result is the opposite of the CR-170 rule used everywhere else:
| Raw total | Cart button (local helper) | CR-170 shared rule (payload / Collect Payment) |
|-----------|---------------------------|-----------------------------------------------|
| 250.01 | **251** | 250 |
| 250.50 | 251 | 251 |
| 250.95 | **250** | 251 |
Shared rule for reference (`utils/roundOffUtils.js`): paise < 10 → floor, otherwise ceil.
### 5.2 Item tax is not rounded per item (secondary cause)
```javascript
// OrderEntry.jsx L1144-1155 (localTax) and L1159-1170 (unplacedTax)
return sum + (isInclusive ? ... : linePrice * (taxPct / 100));   // unrounded accumulation
```
`orderTransform.js` `buildCartItem` rounds each item's tax to 2 decimals (`toFixed(2)`) before summing. The cart button sums unrounded values, giving a paise-level drift (11.905 vs 11.90 here). With the correct round-off rule this drift only matters near the 10-paise boundary, but it can still produce a ₹1 mismatch there.
### 5.3 Not affected
- `orderTransform.js` `calcOrderTotals` — correct (payload is right)
- `CollectPaymentPanel.jsx` — already uses `applyGrandTotalRoundOff`
- The local helper also ignores the restaurant round-off toggle (`restaurant.totalRound`); the shared helper honours it.
---
## 6. Blast Radius
| File | Change | Hotspot? |
|------|--------|----------|
| `components/order-entry/OrderEntry.jsx` L1192-1196, L1223-1227 | Replace local `applyRoundOff` with shared `applyGrandTotalRoundOff(raw, restaurant?.totalRound !== false)` | YES (R5) |
| `components/order-entry/OrderEntry.jsx` L1144-1170 | Round each item's tax to 2 decimals before summing (parity with `buildCartItem`) | YES (R5) |
- **Estimated scope:** SMALL (1 file, ~6 lines)
- **Payload change:** NONE
- **Backend change:** NONE
- **Affected display:** pre-place Collect Bill button; also the "unplaced items" portion of the button total when adding items to an already-placed order (same helper at L1225)
---
## 7. Open Questions
| # | Question | Recommended |
|---|----------|-------------|
| OD-684-01 | Fast Lane or full gate flow? | Fast Lane — single file, display-only, no payload change. Owner to confirm because area is financial. |
| OD-684-02 | When round-off is OFF for a restaurant, should the button show 2-decimal total (e.g. ₹250.01)? | Yes — match the shared helper and the Collect Payment screen. |
---
## 8. Dependencies
| # | Dependency | Status |
|---|-----------|--------|
| D1 | Shared helper `applyGrandTotalRoundOff` (CR-170) | SATISFIED — already in `utils/roundOffUtils.js` |
---
## 9. Suggested Verification (after fix)
| Case | Cart | Expected button | Expected payload `order_amount` |
|------|------|-----------------|--------------------------------|
| A (reported) | 123.81 + 114.29 @ GST 5% | ₹250 | 250 |
| B | Total with paise ≥ 10 (e.g. raw 250.50) | ₹251 | 251 |
| C | Total with paise 90–99 (e.g. raw 250.95) | ₹251 | 251 |
| D | Round-off OFF restaurant | 2-decimal total | same 2-decimal total |
| E | Add items to an already-placed order | Button = placed amount + correctly rounded new portion | matches update payload |
---
## 10. Related
- CR-170 (shared round-off rule)
- BUG-666 (GST rounding parity in CollectPaymentPanel)
- BUG-647 / BUG-683 (same L1144-1170 tax block also carries the GST/VAT toggle checks)
