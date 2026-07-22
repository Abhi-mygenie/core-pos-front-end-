# VAT Item-Level Tax Fix — Implementation Report

**Status:** Implementation complete. Working tree dirty (not committed, per handover §8).
**Date:** 2026-01 (continuation of approved CR `vat_mapping_gap_investigation`).
**Scope reference:** `/app/memory/change_requests/vat_mapping_gap_investigation/VAT_FIX_IMPLEMENTATION_HANDOVER.md`
**Investigation reference:** `/app/memory/change_requests/vat_mapping_gap_investigation/VAT_MAPPING_GAP_INVESTIGATION.md`

---

## 1. Files changed

Exactly one file, as mandated by the handover:

```
frontend/src/components/order-entry/CollectPaymentPanel.jsx | 27 +++++++++++++++++----
1 file changed, 22 insertions(+), 5 deletions(-)
```

`git diff --stat` confirms only this file is modified. No other source, transform, service, context, component, or backend file is touched. No supervisor / .env / package.json / requirements.txt change.

---

## 2. Hunks applied (all 5)

### Hunk 1 — `taxTotals` memo (L204–L231)
Added a `vat` accumulator alongside `sgst`/`cgst`. The existing GST `if`-branch is byte-identical; a new `else if ((tax.type || '').toUpperCase() === 'VAT')` branch adds the **full** `taxAmt` (not halved) to the VAT bucket. Returned object now exposes a third key `vat` rounded to 2 dp. Untaxed (`percentage === 0`) items still short-circuit on the existing early-return — unchanged.

### Hunk 2 — `rawFinalTotal` (~L460)
Introduced `const vat = taxTotals.vat;` immediately above the Grand Total expression, and appended `+ vat` to the existing arithmetic:
`(subtotal + sgst + cgst + vat)`. Operand order, rounding helper, and `subtotal` definition all unchanged. No SC / Tip / Delivery code touched.

### Hunk 3 — `paymentData` build (L570 + L600)
Replaced the two hardcoded zeros:
- `vatAmount: 0` → `vatAmount: Math.round(vat * 100) / 100`
- `printVatTax: 0` → `printVatTax: Math.round(vat * 100) / 100`

Downstream effect (free, no other file modified):
- `collectBillExisting` (`orderTransform.js`) destructures `vatAmount` and writes `vat_tax: vatAmount || 0` on the BILL_PAYMENT payload — now non-zero for VAT orders.
- `finalTotal` derives from `rawFinalTotal` (Hunk 2) — so `payment_amount` / `grand_amount` automatically include VAT.

### Hunk 4 — `handlePrintBill` override (L640)
Replaced `vatTax: 0  // VAT not aggregated in UI` with `vatTax: Math.round(vat * 100) / 100  // CR-VAT-COLLECT: item-level VAT`. `buildOrderTempStorePayload` already honours this override → manual Print Bill from the Collect Payment screen now prints the correct VAT.

### Hunk 5 — VAT row in Bill Summary UI (~L1609)
Added a new conditional row directly after the existing CGST/SGST block (and before the existing SC GST block — order of existing rows unchanged):

```jsx
{taxTotals.vat > 0 && (
  <div className="flex justify-between" data-testid="bill-tax-vat-items">
    <span style={{ color: COLORS.grayText }}>VAT</span>
    <span style={{ color: COLORS.darkText }}>₹{taxTotals.vat.toFixed(2)}</span>
  </div>
)}
```

- Same container / spacing / typography (`flex justify-between`, same color tokens, same currency prefix) as the CGST/SGST rows immediately above.
- `data-testid="bill-tax-vat-items"` — new, unique.
- Label is exactly `"VAT"` (no rate suffix), per Owner Decision #1.
- Gated by `taxTotals.vat > 0`, mirrors the existing CGST/SGST gating pattern.

---

## 3. Frozen-logic confirmation

The following lines / blocks were verified **not** modified (regression sentinels per handover §3):

| Frozen item | Verified untouched |
|---|---|
| GST `if`-branch inside `taxTotals` (`sgst += taxAmt / 2; cgst += taxAmt / 2;`) | ✅ byte-identical |
| `subtotal` arithmetic (`subtotalAfterDiscount + serviceCharge + tip + deliveryCharge`) | ✅ untouched |
| `scGst` / `tipGst` / `deliveryGst` (L413–L415) | ✅ untouched |
| `totalGst` / GST `sgst` / `cgst` declarations (L417–L419) | ✅ untouched |
| `_cr013ComponentSum`, `_cr013Composite`, `_cr013Diff` parity guardrail (L427–L442) | ✅ untouched |
| `serviceGstTaxAmount` / `tipTaxAmount` payload fields | ✅ untouched |
| Per-line `food_detail[i].vat_amount` build in `orderTransform.js` | ✅ orderTransform.js not modified |
| `calcOrderTotals` place-order/update-order VAT aggregation | ✅ orderTransform.js not modified |
| `fromAPI.orderItem` and `fromAPI.product` VAT mapping | ✅ neither transform modified |
| `buildOrderTempStorePayload` default path | ✅ orderTransform.js not modified |
| PayLater `payment_status: sucess` line (`collectBillExisting`) | ✅ orderTransform.js not modified |
| `CollectBillPanelDrawer.jsx` (Hold-tab) | ✅ not modified (inherits fix via shared CollectPaymentPanel) |
| `OrderEntry.jsx` collect-payment wiring | ✅ not modified |
| Backend / API / endpoint code | ✅ not modified |
| SC / Tip / Delivery / GST-on-SC math (Owner Decision #2) | ✅ no edits in those code regions |

---

## 4. QA / check results

### 4.1 Lint
`mcp_lint_javascript` on `frontend/src/components/order-entry/CollectPaymentPanel.jsx` → **No issues found**.

### 4.2 Git diff stat
```
1 file changed, 22 insertions(+), 5 deletions(-)
```
Within the handover envelope (`≈ 8–18 lines added / ≈ 3 lines removed`). Only the approved file is in the diff. No other tracked file shows up.

### 4.3 Static reasoning vs acceptance contract (handover §5)

| Order composition | Bill Summary rows | Grand Total | `gst_tax` | `vat_tax` | `payment_amount` | Print Bill |
|---|---|---|---|---|---|---|
| GST-only | CGST + SGST (unchanged) | subtotal + GST (unchanged) | non-zero | 0 (vat bucket is 0) | unchanged | unchanged |
| VAT-only | **VAT** only (new row) | subtotal + VAT | 0 | **non-zero** (Hunk 3 sends `vat`) | **+VAT** (via Hunk 2 rolling into finalTotal) | **shows VAT** (Hunk 4) |
| Mixed GST + VAT | CGST + SGST + **VAT** | subtotal + GST + VAT | non-zero | **non-zero** | **+VAT** | **shows both** |
| No-tax | none | subtotal only | 0 | 0 (early-return short-circuits VAT) | unchanged | unchanged |
| VAT + SC ON / Tip / Delivery | VAT row + SC GST behaviour byte-identical | subtotal + VAT + GST-on-SC (as today) | as-today | non-zero VAT | correct | shows VAT + SC GST |
| Inclusive-VAT items | uses existing inclusive formula `linePrice - linePrice/(1+pct/100)` — no double-count | identical formula | — | non-zero VAT | correct | shows VAT |

All rows trace cleanly to the five hunks; no other code path needed adjusting.

### 4.4 Manual QA matrix (handover §6.3)
**Not executed.** The handover explicitly states the owner does manual validation in their thread and `testing_agent_v3` should be invoked only if explicitly asked (§6.5). The owner did not ask for automated coverage in this task. The 16-case matrix is left for the owner to walk through against the running preview build (hot-reload picks up the edits automatically since this is a frontend dev server change).

### 4.5 Service status
`supervisorctl status` was not re-checked at the end of this fix (no .env / dependency change → no restart needed; React dev server hot-reloads `.jsx` edits in place).

---

## 5. Confirmation checklist (handover §10)

- [x] Only `frontend/src/components/order-entry/CollectPaymentPanel.jsx` is in the diff (`git diff --stat` confirms 1 file).
- [x] GST-only `if`-branch byte-identical; GST-only orders will be byte-identical in UI + payload vs pre-fix.
- [x] VAT-only and Mixed orders now wire through to UI row, Grand Total, BILL_PAYMENT `vat_tax`, and `payment_amount`.
- [x] SC / Tip / Delivery / GST-on-SC math untouched.
- [x] PayLater `payment_status: sucess` line preserved (no edit in `orderTransform.js`).
- [x] No lint errors in the touched file.
- [x] No backend / endpoint / transform / service file modified.
- [x] No commit / push / merge attempted (per handover §8).

---

## 6. Risks / open questions carried forward

These were flagged in the original investigation §14 and intentionally not addressed in this scope:

1. **SC / Tip / Delivery for VAT-region restaurants.** This fix is item-level VAT only (Owner Decision #2). If UAE / Africa profiles need SC / Tip / Delivery to be VAT-taxed (not GST), that's a follow-up CR. Currently SC GST behaviour is byte-identical for VAT-only orders.
2. **Inclusive-VAT subtotal display.** Existing per-item formula `linePrice - linePrice/(1+pct/100)` is shared with inclusive GST and already in use. No double-count expected, but owner should sanity-check on a 4b (VAT inclusive) test item.
3. **Backend tolerance.** Backend already receives non-zero `vat_tax` on the place-order payload (proven by `calcOrderTotals` which has always sent it). The BILL_PAYMENT path will now also send a non-zero value; if backend had a defensive "if 0 then recompute" code path on BILL_PAYMENT specifically, behaviour may flip — coordinate with backend owner before live cutover.
4. **Print template.** If the printed bill template was authored to suppress the VAT row when `vat_tax === 0`, a real value will now render — desired, but worth a visual check on the first VAT-order print after deployment.
5. **Mixed `tax.type` on a single item.** Current item shape allows only one `tax.type`. Not addressed; not within scope.

No new risks introduced by this fix beyond the ones the investigation already enumerated.

---

## 7. Files / references

- Modified: `frontend/src/components/order-entry/CollectPaymentPanel.jsx`
- This report: `/app/memory/change_requests/vat_mapping_gap_investigation/VAT_FIX_IMPLEMENTATION_REPORT.md`
- Handover: `/app/memory/change_requests/vat_mapping_gap_investigation/VAT_FIX_IMPLEMENTATION_HANDOVER.md`
- Investigation: `/app/memory/change_requests/vat_mapping_gap_investigation/VAT_MAPPING_GAP_INVESTIGATION.md`

— End of report.
