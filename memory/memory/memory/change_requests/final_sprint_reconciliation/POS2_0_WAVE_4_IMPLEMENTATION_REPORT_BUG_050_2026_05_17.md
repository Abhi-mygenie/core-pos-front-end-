# POS2.0 Wave 4 Implementation Report — BUG-050 Bucket — 2026-05-17

## 1. Session Summary

Wave 4 bucket-by-bucket execution: **BUG-050 (Manual Bill Reprint Source-of-Truth — Option A: Collect Bill parity)** implemented on branch `17-may`.

- Code change: **3 surgical edits in 1 file** (`frontend/src/api/transforms/orderTransform.js`, +21 / -2 lines).
- Validation: ESLint clean, full Jest suite 34/34 suites — 496/496 tests pass, webpack compiled successfully, dev server HTTP 200.
- BUG-057 and BUG-059 are next buckets (not in this iteration).

---

## 2. Bug Implemented

| Bug | Title | Approach | Status |
|---|---|---|---|
| BUG-050 | Manual bill reprint source-of-truth after cancellation/discount/tip/SC | Inject stored `order.discount` into the default branch of `buildBillPrintPayload` (mirrors how `tipAmount` / `deliveryCharge` already cascade); add `discount` field to `fromAPI.order`. Override branch untouched. | ✅ Applied + tests green |

Owner approvals captured:
- Gate 5 (approach) — owner replied C (bucket-by-bucket).
- Gate 7 (exact diff) — owner replied A.

---

## 3. File Changed

| # | File | Insertions | Deletions | Change Summary |
|---|------|-----------:|----------:|----------------|
| 1 | `frontend/src/api/transforms/orderTransform.js` | +21 | -2 | (a) `fromAPI.order` exposes `discount` from `restaurant_discount_amount \|\| discount_value`. (b) `buildBillPrintPayload` `overrideDiscount` falls back to `order.discount` instead of 0 when no override. (c) emitted `discount_amount` field falls back to `order.discount` instead of 0 when no override. |

`git diff --stat`:
```
 frontend/src/api/transforms/orderTransform.js | 23 +++++++++++++++++++++--
 1 file changed, 21 insertions(+), 2 deletions(-)
```

---

## 4. BUG-050 Implementation Details

### Change 1 — `fromAPI.order` (~L210-217)
Added new field `discount` sourced from API `restaurant_discount_amount` (with legacy `discount_value` fallback). Field defaults to `0` when neither key is present → bit-identical to today's behavior for orders without a stored discount.

### Change 2 — `buildBillPrintPayload`, `overrideDiscount` computation (~L1505-1517)
`overrideDiscount` now falls back to `parseFloat(order.discount) || 0` when caller did not pass `overrides.discountAmount`. This is the value consumed by:
- L1513 — `postDiscountSubtotal` (drives SC computation per AD-101)
- L1550 — `discountRatio` (drives GST proration on dashboard reprint)

### Change 3 — `buildBillPrintPayload`, emitted `discount_amount` (~L1671)
Same fallback for the field emitted on the print payload to `/order-temp-store`.

### Files NOT touched
- `OrderCard.jsx`, `TableCard.jsx`, `RePrintButton.jsx`, `CollectPaymentPanel.jsx`, `OrderEntry.jsx`, `orderService.js` — no call-site changes needed.

### Override branch behavior
**Identical.** Collect Bill / OrderEntry auto-print paths pass `overrides.discountAmount` explicitly (CollectPaymentPanel.jsx L766, OrderEntry.jsx ~L1431), so they continue to win.

---

## 5. Validation Results

| Validation | Result |
|---|---|
| ESLint (`orderTransform.js`) | ✅ No issues found |
| Full Jest suite | ✅ 34 suites / 496 tests — all pass |
| Targeted transforms suite | ✅ 13 suites / 210 tests — all pass |
| Webpack compile | ✅ Compiled successfully |
| Dev server (`craco start`) via supervisor | ✅ RUNNING; local + external preview return HTTP 200 |

No tests required re-baselining — existing fixtures don't assert on `discount_amount=0` for discounted orders.

---

## 6. Business Rules Verification

| Rule | Status | Evidence |
|---|---|---|
| PAY-001/002/004/007/008 (payload contracts) | ✅ Preserved | Print payload schema unchanged; only the **value** of `discount_amount` corrects (0 → stored value). |
| TAX-001/002/003/005/008 (GST/VAT) | ✅ Preserved | Item-level GST/VAT math untouched. GST proration formula at L1550 unchanged — now simply receives a correct (non-zero) discount for orders that had one. |
| SC-001/002/003/006 (Service Charge) | ✅ Preserved | SC applicability gate (L1528-1529, BUG-023) untouched. |
| TIP-001/002 | ✅ Preserved | Tip cascade unchanged. |
| ROUND-002 | ✅ Preserved | Round-off applies only in `calcOrderTotals` — not in print path. |
| TOTALS-001/002 | ✅ Preserved | Item Total / Subtotal formulas untouched. |
| DEL-004/005 | ✅ Preserved | Delivery handling unchanged. |
| AD-101 (BUG-006) | ✅ Preserved | SC on post-discount subtotal — now correctly post-discount even on dashboard reprint. |
| REQ3 (room print) | ✅ Preserved | Room enrichment logic untouched. |
| BUG-018 / BUG-021 (complimentary) | ✅ Preserved | Complimentary detection untouched. |
| Wave 2 changes (BUG-051/054/055/083) | ✅ Preserved | All Wave 2 markers verified present and untouched. |

---

## 7. QA Smoke Plan (Owner-Driven)

Suggested smoke flow once owner has time:

1. **Discounted dine-in order parity** —
   - Place a dine-in order on a table.
   - At Collect Bill, apply a ₹50 (or 10%) discount + pay.
   - Capture the printed bill (Collect Bill path).
   - From dashboard, click the printer icon on the same order's card → capture the dashboard reprint bill.
   - **Expected:** `discount_amount`, `order_subtotal`, `gst_tax`, `cgst_amount`, `sgst_amount`, `payment_amount` identical to the rupee.

2. **No-discount regression** —
   - Place + pay a dine-in order with NO discount.
   - Reprint from dashboard.
   - **Expected:** Identical bill to today (no regression).

3. **Tip + Discount combo** —
   - Apply both a discount and a tip at Collect Bill.
   - Reprint from dashboard.
   - **Expected:** Both lines appear correctly; SC is computed on post-discount subtotal.

4. **Cancellation + Discount** —
   - Place order with multiple items → cancel one → apply discount → pay.
   - Reprint from dashboard.
   - **Expected:** Cancelled item not on bill, discount applied, totals match Collect Bill.

5. **Walk-in, takeaway, delivery** — repeat scenario 1 for each channel; takeaway/delivery must NOT show SC line (BUG-023 gate); delivery must show `delivery_charge_gst_amount` (BUG-083).

---

## 8. Repo State

| Item | Value |
|---|---|
| Repo | `https://github.com/Abhi-mygenie/core-pos-front-end-.git` |
| Branch | `17-may` |
| Base commit | `e0293f8c22339ae60eab8ff7e08dbc31cca0b29a` |
| Commit allowed | No (per owner directive) |

---

## 9. Next Bucket

**BUG-057** (Prepaid Print Bill on Collect Bill panel + order screen) — pending two owner decisions before code-diff preview:

- Gate 7 outstanding for BUG-057: pick (i) apply the missing `canPrintBill` permission gate at `OrderEntry.jsx` L1833 per the inline comment intent **OR** (ii) leave gate-less and document existing behavior as already-resolving BUG-057.

After BUG-057, **BUG-059** (Audit Report Print Bill on Paid tab) — code-diff preview will be produced on owner request.

---

## 10. Final Status

`wave_4_bug_050_implementation_complete_pending_owner_smoke_and_next_bucket_decision`

- BUG-050: ✅ implemented + tests pass + webpack green + dev server healthy
- BUG-057: ⏸ pending owner pick (i)/(ii) for diff preview
- BUG-059: ⏸ pending owner go-ahead for diff preview

---

*— End of POS2.0 Wave 4 Implementation Report — BUG-050 Bucket —*
